import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { get, put, del } from '@vercel/blob';
import { BlobDatabase, type BlobDatabaseTransport } from '../src/lib/server/blob-database.ts';

// Always use a disposable synthetic object. The production database pathname is
// deliberately inaccessible through this verifier's command-line interface.
const childReadPath = process.argv[2] === '--read' ? process.argv[3] : undefined;
if (childReadPath && !/^verification\/[0-9a-f-]+\.sqlite$/.test(childReadPath)) {
  throw new Error('The verifier only accepts its own disposable object path.');
}
const pathname = childReadPath ?? `verification/${randomUUID()}.sqlite`;
const transport: BlobDatabaseTransport = {
  async read() {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return {
      bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
      etag: result.blob.etag
    };
  },
  async write(bytes, etag) {
    await put(pathname, Buffer.from(bytes), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true,
      ifMatch: etag, contentType: 'application/vnd.sqlite3'
    });
  }
};

if (childReadPath) {
  const database = new BlobDatabase({ transport });
  const rows = await database.all<{ value: number }>('SELECT value FROM smoke_counter');
  process.stdout.write(JSON.stringify({ value: rows[0].value }));
} else {
  assert.ok(process.env.BLOB_READ_WRITE_TOKEN, 'BLOB_READ_WRITE_TOKEN is required');
  const folder = mkdtempSync(join(tmpdir(), 'repomit-live-blob-'));
  let created = false;
  try {
    const localPath = join(folder, 'synthetic.sqlite');
    const seed = new DatabaseSync(localPath);
    seed.exec('CREATE TABLE smoke_counter(value INTEGER NOT NULL); INSERT INTO smoke_counter VALUES(0);');
    seed.close();
    await put(pathname, readFileSync(localPath), {
      access: 'private', addRandomSuffix: false, allowOverwrite: false,
      contentType: 'application/vnd.sqlite3'
    });
    created = true;
    const first = new BlobDatabase({ transport });
    const second = new BlobDatabase({ transport });
    assert.equal((await first.all<{ value: number }>('SELECT value FROM smoke_counter'))[0].value, 0);

    let entered = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    let attempts = 0;
    async function increment(database: BlobDatabase) {
      return database.transaction(async () => {
        attempts++;
        const row = (await database.all<{ value: number }>('SELECT value FROM smoke_counter'))[0];
        if (++entered === 2) release();
        await bothRead;
        await database.run('UPDATE smoke_counter SET value=$1', [row.value + 1]);
      });
    }
    await Promise.all([increment(first), increment(second)]);
    assert.ok(attempts >= 3, 'Independent remote snapshots must encounter and retry a CAS conflict');
    assert.equal((await first.all<{ value: number }>('SELECT value FROM smoke_counter'))[0].value, 2);

    await assert.rejects(first.transaction(async () => {
      await first.run('UPDATE smoke_counter SET value=99');
      throw new Error('Synthetic rollback');
    }), /Synthetic rollback/);
    assert.equal((await second.all<{ value: number }>('SELECT value FROM smoke_counter'))[0].value, 2);

    const child = await promisify(execFile)(process.execPath, [
      '--experimental-strip-types', fileURLToPath(import.meta.url), '--read', pathname
    ], { env: process.env, maxBuffer: 1024 * 1024 });
    assert.deepEqual(JSON.parse(child.stdout), { value: 2 });
    console.log('Private Blob verified: SDK uncached reads, conditional concurrent writes, CAS retry, rollback, and separate-process persistence.');
  } finally {
    rmSync(folder, { recursive: true, force: true });
    if (created) {
      await del(pathname);
      assert.equal(await transport.read(), null, 'Disposable verification object must be removed');
      console.log('Disposable verification object removed. Production database was never accessed.');
    }
  }
}
