import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { BlobDatabase, type BlobDatabaseTransport } from '../src/lib/server/blob-database.ts';

// A shared, private object with atomic conditional replacement. Each database
// instance gets its own transport, just as independent Vercel invocations do.
function fixture() {
  const folder = mkdtempSync(join(tmpdir(), 'repomit-blob-contract-'));
  const path = join(folder, 'seed.sqlite');
  const seed = new DatabaseSync(path);
  seed.exec(`
    CREATE TABLE counters (id TEXT PRIMARY KEY,value INTEGER NOT NULL,version INTEGER NOT NULL);
    INSERT INTO counters VALUES ('catalogue',0,1);
    CREATE TABLE revisions (id TEXT PRIMARY KEY,value INTEGER NOT NULL);
  `);
  seed.close();
  let bytes = new Uint8Array(readFileSync(path));
  rmSync(folder, { recursive: true, force: true });
  let revision = 1;
  let writes = 0;
  let reads = 0;
  let failBeforeWrite = false;
  let loseAcknowledgement = false;
  let afterLostWrite: (() => Promise<void>) | undefined;
  const transport: BlobDatabaseTransport = {
    async read() {
      reads++;
      return { bytes: bytes.slice(), etag: `revision-${revision}` };
    },
    async write(next, etag) {
      if (failBeforeWrite) {
        failBeforeWrite = false;
        throw new Error('Network failed before storing the object');
      }
      if (etag !== `revision-${revision}`) throw new BlobPreconditionFailedError();
      bytes = next.slice();
      revision++;
      writes++;
      if (loseAcknowledgement) {
        loseAcknowledgement = false;
        await afterLostWrite?.();
        throw new Error('Object stored, but the response was lost');
      }
    }
  };
  return {
    open: (maxAttempts?: number) => new BlobDatabase({ transport, maxAttempts }),
    transport,
    get writes() { return writes; },
    get reads() { return reads; },
    failNextWrite() { failBeforeWrite = true; },
    loseNextAcknowledgement(afterCommit?: () => Promise<void>) {
      loseAcknowledgement = true;
      afterLostWrite = afterCommit;
    }
  };
}

async function counter(database: BlobDatabase) {
  return (await database.all<{ value: number; version: number }>(
    "SELECT value,version FROM counters WHERE id=$1", ['catalogue']
  ))[0];
}

test('a write persists for independent database instances', async () => {
  const store = fixture();
  await store.open().run("UPDATE counters SET value=$1 WHERE id=$2", [7, 'catalogue']);
  assert.equal((await counter(store.open())).value, 7);
  assert.equal(store.writes, 1);
});

test('read-only transactions and existing schema checks avoid uploads; new schema persists', async () => {
  const store = fixture();
  const database = store.open();
  await database.run('CREATE TABLE IF NOT EXISTS counters (id TEXT PRIMARY KEY,value INTEGER NOT NULL,version INTEGER NOT NULL)');
  await database.transaction(async () => {
    assert.equal((await counter(database)).value, 0);
  });
  assert.equal(store.writes, 0, 'A read-only transaction must not upload the complete database');
  await database.run('CREATE TABLE new_setting (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  assert.equal(store.writes, 1, 'A real schema change must be committed');
  assert.deepEqual(await store.open().all('SELECT * FROM new_setting'), []);
});

test('SQL parameter indexes preserve repeated and out-of-order bindings', async () => {
  const store = fixture();
  const database = store.open();
  await database.run('UPDATE counters SET value=$2 WHERE id=$1', ['catalogue', 7]);
  const rows = await database.all<{ doubled: number }>(
    'SELECT value+$2 AS doubled FROM counters WHERE id=$1 AND value=$2', ['catalogue', 7]
  );
  assert.equal(rows[0].doubled, 14);
});

test('a failed transaction leaks neither content nor nested writes', async () => {
  const store = fixture();
  const database = store.open();
  await assert.rejects(database.transaction(async () => {
    await database.run("UPDATE counters SET value=8 WHERE id='catalogue'");
    await database.transaction(async () => {
      await database.run("INSERT INTO revisions VALUES ('private-draft',8)");
    });
    throw new Error('Reject publication');
  }), /Reject publication/);
  assert.equal(store.writes, 0);
  const fresh = store.open();
  assert.equal((await counter(fresh)).value, 0);
  assert.deepEqual(await fresh.all('SELECT * FROM revisions'), []);
});

test('concurrent invocations retry a conditional conflict without losing either update', async () => {
  const store = fixture();
  let entered = 0;
  let release!: () => void;
  const bothRead = new Promise<void>((resolve) => { release = resolve; });
  const attempts = [0, 0];
  async function increment(index: number) {
    const database = store.open();
    return database.transaction(async () => {
      attempts[index]++;
      const before = await counter(database);
      if (++entered === 2) release();
      await bothRead;
      await database.run("UPDATE counters SET value=$1 WHERE id='catalogue'", [before.value + 1]);
      await database.run('INSERT INTO revisions VALUES ($1,$2)', [`editor-${index}`, before.value + 1]);
    });
  }
  await Promise.all([increment(0), increment(1)]);
  const fresh = store.open();
  assert.equal((await counter(fresh)).value, 2);
  assert.equal((await fresh.all('SELECT * FROM revisions')).length, 2);
  assert.equal(store.writes, 2);
  assert.ok(attempts[0] + attempts[1] >= 3, 'A stale snapshot must be retried');
});

test('retrying an optimistic edit rejects an obsolete editor version', async () => {
  const store = fixture();
  let entered = 0;
  let release!: () => void;
  const bothRead = new Promise<void>((resolve) => { release = resolve; });
  async function edit(value: number) {
    const database = store.open();
    return database.transaction(async () => {
      const current = await counter(database);
      if (current.version !== 1) throw new Error('Obsolete editor version');
      if (++entered === 2) release();
      await bothRead;
      await database.run("UPDATE counters SET value=$1,version=version+1 WHERE id='catalogue'", [value]);
    });
  }
  const outcomes = await Promise.allSettled([edit(10), edit(20)]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = outcomes.find((result) => result.status === 'rejected');
  assert.equal(rejected?.status, 'rejected');
  if (rejected?.status === 'rejected') assert.match(String(rejected.reason), /Obsolete editor version/);
  assert.equal((await counter(store.open())).version, 2);
  assert.equal(store.writes, 1);
});

test('a committed write with a lost response is acknowledged exactly once', async () => {
  const store = fixture();
  const database = store.open();
  let calls = 0;
  store.loseNextAcknowledgement();
  const result = await database.transaction(async () => {
    calls++;
    await database.run("UPDATE counters SET value=value+1 WHERE id='catalogue'");
    await database.run("INSERT INTO revisions VALUES ('publication',1)");
    return 'published';
  });
  assert.equal(result, 'published');
  assert.equal(calls, 1, 'An uncertain acknowledgement must not replay a successful edit');
  assert.equal(store.writes, 1);
  assert.equal((await counter(store.open())).value, 1);
});

test('the operation ledger resolves a lost response even after another writer commits', async () => {
  const store = fixture();
  const database = store.open();
  let calls = 0;
  store.loseNextAcknowledgement(async () => {
    await store.open().run("UPDATE counters SET value=value+1 WHERE id='catalogue'");
  });
  await database.transaction(async () => {
    calls++;
    await database.run("UPDATE counters SET value=value+1 WHERE id='catalogue'");
  });
  assert.equal(calls, 1);
  assert.equal(store.writes, 2);
  assert.equal((await counter(store.open())).value, 2);
});

test('an unsuccessful upload reports failure and leaves the previous object intact', async () => {
  const store = fixture();
  store.failNextWrite();
  await assert.rejects(
    store.open().run("UPDATE counters SET value=99 WHERE id='catalogue'"),
    /Network failed before storing/
  );
  assert.equal(store.writes, 0);
  assert.equal((await counter(store.open())).value, 0);
});

test('request snapshots are reused only within a request and refreshed after local writes', async () => {
  const store = fixture();
  const database = store.open();
  const other = store.open();
  await database.withRequest(async () => {
    assert.equal((await counter(database)).value, 0);
    const firstReads = store.reads;
    assert.equal((await counter(database)).value, 0);
    assert.equal(store.reads, firstReads, 'Repeated page reads share one request snapshot');
    await other.run("UPDATE counters SET value=4 WHERE id='catalogue'");
    assert.equal((await counter(database)).value, 0, 'The active request retains its read snapshot');
  });
  await database.withRequest(async () => {
    assert.equal((await counter(database)).value, 4, 'A new request fetches current content');
    await database.run("UPDATE counters SET value=5 WHERE id='catalogue'");
    assert.equal((await counter(database)).value, 5, 'A local write invalidates the request snapshot');
  });
  assert.equal((await counter(store.open())).value, 5);
});

test('a missing private object fails closed rather than publishing an empty replacement', async () => {
  let writes = 0;
  const database = new BlobDatabase({ transport: {
    async read() { return null; },
    async write() { writes++; }
  } });
  await assert.rejects(database.all('SELECT * FROM counters'));
  assert.equal(writes, 0);
});
