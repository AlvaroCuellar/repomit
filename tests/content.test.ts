import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const folder = mkdtempSync(join(tmpdir(), 'repomit-test-'));
process.env.REPOMIT_DB = join(folder, 'test.sqlite');
if (process.env.DATABASE_URL) throw new Error('Run this test without DATABASE_URL.');
const { db } = await import('../src/lib/server/database.ts');
const {
  saveRecord,
  getRecord,
  publicData,
  restoreRecord,
  history,
  unpublishRecord,
  cleanHtml,
  plain,
  publishManuscript,
  listRecords
} = await import('../src/lib/server/content.ts');
const { createUser, login, getUser, logout, changePassword } =
  await import('../src/lib/server/auth.ts');
const { fields } = await import('../src/lib/editor/schema.ts');
const blank = (kind: 'poemas' | 'testimonios' | 'textos') =>
  Object.fromEntries(fields[kind].map(([key]) => [key, '']));
const manuscript = {
  ...blank('testimonios'),
  testimonio: 'PrB 1',
  ciudad: 'Roma',
  institucion: 'Biblioteca',
  signatura: '1'
};
let parent = '',
  poem = '';
const sample = () => ({
  ...blank('poemas'),
  testimonio_id: parent,
  orden: '1',
  incipit: '<em>Árbol</em> de esperanza',
  forma: 'soneto',
  estructura_cabeza: 'no',
  estructura_interna: 'no',
  estribillo: 'no',
  transcripcion: 'Primer verso<br><em>Segundo verso</em>'
});
after(() => {
  db.close();
  rmSync(folder, { recursive: true, force: true });
});

test('drafts are private and new manuscript IDs remain stable', async () => {
  parent = await saveRecord('testimonios', 'nuevo', manuscript, 0, 'draft', 'Editor');
  assert.equal((await publicData()).testimonios.length, 0);
  await assert.rejects(
    async () => await saveRecord('poemas', 'nuevo', sample(), 0, 'publish', 'Editor'),
    /Publica primero/
  );
  assert.equal(await saveRecord('testimonios', parent, manuscript, 1, 'publish', 'Editor'), parent);
  poem = await saveRecord('poemas', 'nuevo', sample(), 0, 'publish', 'Editor');
  const published = (await publicData()).poemas[0];
  assert.equal(published.id, poem);
  assert.equal(published.item, 'PrB 1-1');
  assert.equal(published.search_incipit, 'arbol de esperanza');
  assert.equal(published.transcripcion, 'Primer verso\nSegundo verso');
  assert.match(published.transcripcion_html, /<em>Segundo verso<\/em>/);
  assert.ok(published.fecha_revision);
});
test('draft isolation, rename propagation, duplicate validation and optimistic locking', async () => {
  await saveRecord(
    'poemas',
    poem,
    { ...sample(), atribucion: 'Secreto en borrador' },
    1,
    'draft',
    'Editor'
  );
  assert.equal((await publicData()).poemas[0].atribucion, '');
  await assert.rejects(
    async () => await saveRecord('poemas', poem, sample(), 1, 'publish', 'Editor'),
    /Otra persona/
  );
  await assert.rejects(
    async () => await saveRecord('poemas', 'nuevo', sample(), 0, 'draft', 'Editor'),
    /ya existe/
  );
  await saveRecord(
    'testimonios',
    parent,
    { ...manuscript, testimonio: 'PrB 2' },
    2,
    'publish',
    'Editor'
  );
  assert.equal((await publicData()).poemas[0].item, 'PrB 2-1');
  assert.equal((await publicData()).poemas[0].id, poem);
  await assert.rejects(async () => await unpublishRecord(parent, 3, 'Editor'), /Retira primero/);
});
test('restore recovers historical data as a private draft', async () => {
  const original = (await history(poem)).at(-1)!;
  await restoreRecord(poem, original.id, 2, 'Editor');
  assert.equal(JSON.parse((await getRecord(poem))!.draft).atribucion, '');
  assert.equal((await getRecord(poem))!.version, 3);
  assert.equal((await history(poem))[0].author, 'Editor');
});
test('incomplete drafts are allowed but inconsistent structure cannot be published', async () => {
  const content = { ...sample(), orden: '7', estructura_cabeza: 'sí', incipit_desarrollo: '' };
  const id = await saveRecord('poemas', 'nuevo', content, 0, 'draft', 'Editor');
  await assert.rejects(
    async () => await saveRecord('poemas', id, content, 1, 'publish', 'Editor'),
    /desarrollo/
  );
  await assert.rejects(
    async () =>
      await saveRecord('poemas', 'nuevo', { ...sample(), orden: '0' }, 0, 'draft', 'Editor'),
    /entero/
  );
  await assert.rejects(
    async () =>
      await saveRecord(
        'poemas',
        'nuevo',
        { ...sample(), orden: '8', testimonio_id: 'missing' },
        0,
        'draft',
        'Editor'
      ),
    /existente/
  );
});
test('whole-manuscript publication rolls back every change on error and checks revisions', async () => {
  const before = (await getRecord(parent))!;
  const children = (await listRecords('poemas')).filter(
    (r) => JSON.parse(r.draft).testimonio_id === parent
  );
  const snapshot = JSON.stringify(
    children.map((r) => [r.id, r.version]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  );
  await assert.rejects(
    async () => await publishManuscript(parent, before.version, '[]', 'Editor'),
    /han cambiado/
  );
  await assert.rejects(
    async () => await publishManuscript(parent, before.version, snapshot, 'Editor'),
    /No se ha publicado/
  );
  assert.deepEqual(await getRecord(parent), before);
  const incomplete = children.find((r) => JSON.parse(r.draft).orden === '7')!;
  await saveRecord(
    'poemas',
    incomplete.id,
    { ...JSON.parse(incomplete.draft), incipit_desarrollo: 'Empieza la estrofa' },
    incomplete.version,
    'draft',
    'Editor'
  );
  const next = (await listRecords('poemas')).filter(
    (r) => JSON.parse(r.draft).testimonio_id === parent
  );
  await publishManuscript(
    parent,
    before.version,
    JSON.stringify(
      next.map((r) => [r.id, r.version]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    ),
    'Editor'
  );
  assert.equal((await publicData()).poemas.length, 2);
});
test('sanitization preserves scholarly formatting and removes executable content', () => {
  const html = cleanHtml(
    '<i>cursiva</i><b>negrita</b><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">clic</a><div>estrofa</div>'
  );
  assert.match(html, /<em>cursiva<\/em>/);
  assert.match(html, /<strong>negrita<\/strong>/);
  assert.doesNotMatch(html, /script|onerror|javascript|<img/);
  assert.match(html, /<p>estrofa<\/p>/);
  assert.equal(plain('Uno<br>Dos &amp; tres'), 'Uno\nDos & tres');
});
test('text sections publish without a build and do not leak drafts', async () => {
  const value = {
    pagina: 'presentacion',
    orden: '1',
    title: 'Equipo',
    texto: '<em>Texto original</em>'
  };
  const id = await saveRecord('textos', 'nuevo', value, 0, 'publish', 'Editor');
  await saveRecord('textos', id, { ...value, texto: 'BORRADOR PRIVADO' }, 1, 'draft', 'Editor');
  assert.equal((await publicData()).site.presentacion[0].paragraphs[0], '<em>Texto original</em>');
  await assert.rejects(
    async () => await saveRecord('textos', 'nuevo', value, 0, 'publish', 'Editor'),
    /Ya existe/
  );
  await assert.rejects(
    async () =>
      await saveRecord(
        'textos',
        'nuevo',
        { ...value, pagina: 'desconocida' },
        0,
        'draft',
        'Editor'
      ),
    /válida/
  );
});
test('password hashing, failed login, sessions, password change and deactivation', async () => {
  await createUser('test@example.org', 'Editor', 'Test-password-1234');
  const row = db.prepare('SELECT * FROM users WHERE email=?').get('test@example.org')!;
  assert.notEqual(row.password_hash, 'Test-password-1234');
  await assert.rejects(login('test@example.org', 'incorrect', 'test-ip'), /incorrectos/);
  const token = await login('test@example.org', 'Test-password-1234', 'test-ip');
  const user = (await getUser(token))!;
  assert.equal(user.email, 'test@example.org');
  assert.equal(await getUser('fake'), null);
  assert.equal(db.prepare('SELECT token_hash FROM sessions').get()!.token_hash === token, false);
  await changePassword(user, 'Test-password-1234', 'Different-password-1234');
  assert.equal(await getUser(token), null);
  const newToken = await login('test@example.org', 'Different-password-1234', 'test-ip');
  await logout(newToken);
  assert.equal(await getUser(newToken), null);
  const last = await login('test@example.org', 'Different-password-1234', 'test-ip');
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(user.id);
  assert.equal(await getUser(last), null);
});
test('login rate limit is enforced for repeated failures', async () => {
  for (let i = 0; i < 10; i++)
    await assert.rejects(login('missing@example.org', 'bad', 'rate-limit-test'), /incorrectos/);
  await assert.rejects(
    login('missing@example.org', 'bad', 'rate-limit-test'),
    /Demasiados intentos/
  );
});

test('manuscript preview includes saved draft works without exposing them publicly', async () => {
  const id = await saveRecord(
    'poemas',
    'nuevo',
    { ...sample(), orden: '33', incipit: 'Solo en vista previa' },
    0,
    'draft',
    'Editor'
  );
  assert.equal(
    (await publicData()).poemas.some((p) => p.id === id),
    false
  );
  const preview = await publicData({
    kind: 'testimonios',
    id: parent,
    content: JSON.parse((await getRecord(parent))!.draft)
  });
  assert.equal(
    preview.poemas.some((p) => p.id === id),
    true
  );
  assert.equal(
    (await publicData()).poemas.some((p) => p.id === id),
    false
  );
});

test('editing a migrated record does not invent an unknown original creation date', async () => {
  const row = (await getRecord(poem))!;
  const legacy = { ...JSON.parse(row.draft), fecha_creacion: '' };
  db.prepare('UPDATE records SET draft=? WHERE id=?').run(JSON.stringify(legacy), poem);
  await saveRecord('poemas', poem, legacy, row.version, 'publish', 'Editor');
  assert.equal(JSON.parse((await getRecord(poem))!.draft).fecha_creacion, '');
  assert.ok(JSON.parse((await getRecord(poem))!.draft).fecha_revision);
});

test('new metric forms persist, prevent spelling duplicates and validate published poems', async () => {
  const { addForm, listForms, findForm } = await import('../src/lib/server/vocabulary.ts');
  const name = await addForm('  DÉCIMA   experimental  ', 'Editora');
  assert.equal(name, 'décima experimental');
  assert.equal(await findForm('DECIMA experimental'), name);
  await assert.rejects(
    async () => await addForm('decima experimental', 'Otra cuenta'),
    /Ya existe/
  );
  assert.equal((await listForms()).filter((n) => n === name).length, 1);
  await assert.rejects(
    async () => await addForm('<script>algo</script>', 'Editora'),
    /sin etiquetas/
  );
  await assert.rejects(async () => await addForm('—', 'Editora'), /nombre/);
  const id = await saveRecord(
    'poemas',
    'nuevo',
    { ...sample(), orden: '987', forma: 'DECIMA EXPERIMENTAL' },
    0,
    'publish',
    'Editora'
  );
  assert.equal((await publicData()).poemas.find((p) => p.id === id)!.forma, name);
  assert.equal(
    db.prepare('SELECT created_by FROM metric_forms WHERE name=?').get(name)!.created_by,
    'Editora'
  );
  const { DatabaseSync } = await import('node:sqlite');
  const reopened = new DatabaseSync(process.env.REPOMIT_DB!);
  assert.equal(
    reopened.prepare('SELECT name FROM metric_forms WHERE name=?').get(name)!.name,
    name
  );
  reopened.close();
});
