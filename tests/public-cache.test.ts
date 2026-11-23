import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const folder = mkdtempSync(join(tmpdir(), 'repomit-public-cache-'));
process.env.REPOMIT_DB = join(folder, 'test.sqlite');
if (process.env.DATABASE_URL) throw new Error('Run this test without DATABASE_URL.');
const { db, transaction } = await import('../src/lib/server/database.ts');
const { saveRecord, publicData, unpublishRecord } = await import('../src/lib/server/content.ts');
const statements: string[] = [];
const prepare = db.prepare.bind(db);
db.prepare = (sql: string) => {
  statements.push(sql);
  return prepare(sql);
};
const text = { pagina: 'presentacion', orden: '1', title: 'Equipo', texto: 'Publicación original' };
let id: string;

after(() => {
  db.close();
  rmSync(folder, { recursive: true, force: true });
});

test('warm public reads transfer only a revision, and draft saves keep the published cache', async () => {
  id = await saveRecord('textos', 'nuevo', text, 0, 'publish', 'Editor');
  statements.length = 0;
  const first = await publicData();
  const catalogueQuery = statements.find((sql) => /FROM records/i.test(sql));
  assert.ok(catalogueQuery);
  assert.doesNotMatch(catalogueQuery, /SELECT\s+\*|\bdraft\b/i);
  statements.length = 0;
  assert.strictEqual(await publicData(), first);
  assert.equal(statements.filter((sql) => /FROM records/i.test(sql)).length, 0);
  await saveRecord('textos', id, { ...text, texto: 'Borrador privado' }, 1, 'draft', 'Editor');
  assert.strictEqual(await publicData(), first);
  assert.equal(first.site.presentacion[0].paragraphs[0], text.texto);
});

test('a publication from another instance invalidates the local cache', async () => {
  const before = await publicData();
  // Emulate a different Vercel instance committing published data and its revision.
  await transaction(async () => {
    db.prepare('UPDATE records SET published=? WHERE id=?')
      .run(JSON.stringify({ ...text, texto: 'Publicado desde otra instancia' }), id);
    db.prepare('UPDATE metadata SET value=? WHERE key=?')
      .run('external-publication', 'published-catalogue-revision');
  });
  const afterPublication = await publicData();
  assert.notStrictEqual(afterPublication, before);
  assert.equal(afterPublication.site.presentacion[0].paragraphs[0], 'Publicado desde otra instancia');
});

test('preview bypasses the cache without exposing draft content in subsequent public reads', async () => {
  const before = await publicData();
  const preview = await publicData({ kind: 'textos', id, content: { ...text, texto: 'Vista previa privada' } });
  assert.equal(preview.site.presentacion[0].paragraphs[0], 'Vista previa privada');
  assert.strictEqual(await publicData(), before);
});

test('uncommitted publication reads cannot poison the shared cache after rollback', async () => {
  const before = await publicData();
  await assert.rejects(transaction(async () => {
    await saveRecord('textos', id, { ...text, texto: 'No debe publicarse' }, 2, 'publish', 'Editor');
    assert.equal((await publicData()).site.presentacion[0].paragraphs[0], 'No debe publicarse');
    throw new Error('Cancelación de la transacción');
  }), /Cancelación/);
  assert.strictEqual(await publicData(), before);
});

test('publication and withdrawal change the cache immediately after commit', async () => {
  const before = await publicData();
  await saveRecord('textos', id, { ...text, texto: 'Nueva publicación' }, 2, 'publish', 'Editor');
  const published = await publicData();
  assert.notStrictEqual(published, before);
  assert.equal(published.site.presentacion[0].paragraphs[0], 'Nueva publicación');
  await unpublishRecord(id, 3, 'Editor');
  assert.equal((await publicData()).site.presentacion.length, 0);
});
