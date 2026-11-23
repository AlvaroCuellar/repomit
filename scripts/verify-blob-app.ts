import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { put, get, del } from '@vercel/blob';

assert.ok(process.env.BLOB_READ_WRITE_TOKEN, 'BLOB_READ_WRITE_TOKEN is required');
const pathname = `verification/${randomUUID()}.sqlite`;
// Set storage routing before importing any application server module.
process.env.REPOMIT_STORAGE = 'vercel-blob';
process.env.REPOMIT_BLOB_PATH = pathname;
const source = resolve('.local/backups/production-frozen-2026-11-23.sqlite');
let created = false;
try {
  await put(pathname, readFileSync(source), {
    access: 'private', addRandomSuffix: false, allowOverwrite: false,
    contentType: 'application/vnd.sqlite3'
  });
  created = true;
  const { usingBlob, usingPostgres, all } = await import('../src/lib/server/database.ts');
  assert.equal(usingBlob, true);
  assert.equal(usingPostgres, false);
  const { createUser, login, getUser, logout } = await import('../src/lib/server/auth.ts');
  const { publicData, saveRecord, getRecord, unpublishRecord } = await import('../src/lib/server/content.ts');
  const baseline = await publicData();
  assert.equal(baseline.poemas.length, 522, 'The production clone must contain the complete published corpus');
  const originalPoems = JSON.stringify(baseline.poemas);
  const originalManuscripts = JSON.stringify(baseline.testimonios);
  const originalAccounts = Number((await all<{ total: number }>('SELECT count(*) AS total FROM users'))[0].total);

  const email = `blob-smoke-${randomUUID()}@repomit.local`;
  const password = randomBytes(24).toString('hex');
  await createUser(email, 'Synthetic integration editor', password, 'editor');
  const token = await login(email, password, 'synthetic-verification');
  const user = await getUser(token);
  assert.equal(user?.email, email);
  assert.equal(user?.role, 'editor');

  const marker = `Synthetic publication ${randomUUID()}`;
  const text = { pagina: 'home', orden: '999998', title: 'Synthetic integration', texto: marker };
  const id = await saveRecord('textos', 'nuevo', text, 0, 'draft', user!.name);
  assert.equal((await getRecord(id))?.version, 1);
  assert.ok(!(await publicData()).site.home.intro.some((value) => value.includes(marker)), 'Draft must remain private');
  await saveRecord('textos', id, text, 1, 'publish', user!.name);
  assert.ok((await publicData()).site.home.intro.some((value) => value.includes(marker)), 'Publication must be visible immediately');
  await assert.rejects(saveRecord('textos', id, { ...text, texto: 'Obsolete edit' }, 1, 'publish', user!.name), /Otra persona/);
  assert.equal((await getRecord(id))?.version, 2);
  await unpublishRecord(id, 2, user!.name);
  assert.ok(!(await publicData()).site.home.intro.some((value) => value.includes(marker)), 'Withdrawal must remove published text');

  await logout(token);
  assert.equal(await getUser(token), null, 'Logout must revoke the durable session');
  const final = await publicData();
  assert.equal(final.poemas.length, 522);
  assert.equal(JSON.stringify(final.poemas), originalPoems, 'No existing poem may change');
  assert.equal(JSON.stringify(final.testimonios), originalManuscripts, 'No existing manuscript may change');
  assert.equal(Number((await all<{ total: number }>('SELECT count(*) AS total FROM users'))[0].total), originalAccounts + 1);
  console.log('Real application integration passed on a private clone: editor creation, login/session/logout, private draft, publication, stale-version rejection, withdrawal, and all 522 poems unchanged.');
} finally {
  if (created) {
    await del(pathname);
    assert.equal(await get(pathname, { access: 'private', useCache: false }), null);
    console.log('Private clone deleted. Production database and production accounts were never accessed.');
  }
}
