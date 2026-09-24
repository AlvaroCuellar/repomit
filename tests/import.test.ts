import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
const folder = mkdtempSync(join(tmpdir(), 'repomit-import-'));
process.env.REPOMIT_DB = join(folder, 'test.sqlite');
if (process.env.DATABASE_URL) throw new Error('Run this test without DATABASE_URL.');
const { db } = await import('../src/lib/server/database.ts');
const { parseExcel, planImport, stageImport, getImport, commitImport } =
  await import('../src/lib/server/import-excel.ts');
const { listRecords, getRecord, saveRecord, publicData } =
  await import('../src/lib/server/content.ts');
const { findForm } = await import('../src/lib/server/vocabulary.ts');
db.prepare(
  'INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)'
).run('import-user', 'test@example.test', 'Test', 'unused', 'editor', new Date().toISOString());
after(() => {
  db.close();
  rmSync(folder, { recursive: true, force: true });
});
async function workbook(sigla: string, poems = 1, form = 'soneto') {
  const wb = new ExcelJS.Workbook();
  const ms = wb.addWorksheet('Testimonios');
  ms.addRow(['testimonio', 'ciudad', 'institucion', 'signatura']);
  ms.addRow([sigla, 'Roma', 'Biblioteca', '001']);
  const ps = wb.addWorksheet('Poemas');
  ps.addRow([
    'testimonio',
    'orden',
    'incipit',
    'forma',
    'estructura_cabeza',
    'estructura_interna',
    'estribillo'
  ]);
  for (let i = 1; i <= poems; i++)
    ps.addRow([sigla, i, `Verso de prueba ${i}`, form, 'no', 'no', 'no']);
  return wb;
}
async function parse(wb: ExcelJS.Workbook) {
  return parseExcel(Buffer.from(await wb.xlsx.writeBuffer()), 'prueba.xlsx');
}
const errors = (plan: Awaited<ReturnType<typeof planImport>>) =>
  plan.issues.filter((i) => i.level === 'error');

test('downloadable blank template and filled example match the real importer', async () => {
  const blank = await parseExcel(
    readFileSync('static/plantillas/repomit-plantilla.xlsx'),
    'plantilla.xlsx'
  );
  assert.equal(blank.rows.length, 0);
  assert.match(blank.issues.at(-1)!.message, /No hay fichas/);
  const example = await planImport(
    await parseExcel(readFileSync('static/plantillas/repomit-ejemplo.xlsx'), 'ejemplo.xlsx')
  );
  assert.deepEqual(errors(example), []);
  assert.equal(example.manuscripts, 1);
  assert.equal(example.poems, 2);
  assert.match(example.rows[1].content.incipit, /<em>/);
  assert.equal((await listRecords()).length, 0);
});
test('preview is read-only; confirms new forms; atomically imports drafts; replay is idempotent', async () => {
  const parsed = await parse(await workbook('LOTE 1', 3, 'forma de ensayo nueva'));
  const id = await stageImport(parsed, 'prueba.xlsx', 'import-user');
  assert.equal((await listRecords()).length, 0);
  assert.equal(await findForm('forma de ensayo nueva'), undefined);
  assert.deepEqual(errors((await getImport(id, 'import-user'))!.plan), []);
  assert.equal(await getImport(id, 'other'), null);
  await assert.rejects(async () => await commitImport(id, 'other', 'Test', true), /cuenta/);
  await assert.rejects(async () => await commitImport(id, 'import-user', 'Test', false), /formas/);
  assert.equal((await listRecords()).length, 0);
  const result = await commitImport(id, 'import-user', 'Test', true);
  assert.equal(result.manuscripts.length, 1);
  assert.equal(result.poems.length, 3);
  assert.equal((await publicData()).poemas.length, 0);
  assert.equal((await publicData()).testimonios.length, 0);
  assert.ok((await listRecords()).every((r) => r.published === null));
  assert.equal(await findForm('forma de ensayo nueva'), 'forma de ensayo nueva');
  assert.deepEqual(await commitImport(id, 'import-user', 'Test', true), result);
  assert.equal((await listRecords()).length, 4);
  assert.match(
    db.prepare('SELECT action FROM history WHERE record_id=?').get(result.poems[0])!
      .action as string,
    /Importación: prueba.xlsx/
  );
});
test('existing manuscript is a reference, never overwritten; duplicate poems block entire batch', async () => {
  const wb = await workbook('LOTE 1');
  wb.getWorksheet('Testimonios')!.getCell('B2').value = 'NO SOBRESCRIBIR';
  wb.getWorksheet('Poemas')!.getCell('B2').value = 4;
  const parsed = await parse(wb),
    plan = await planImport(parsed);
  assert.equal(plan.references, 1);
  assert.equal(plan.manuscripts, 0);
  assert.deepEqual(errors(plan), []);
  const id = await stageImport(parsed, 'extra.xlsx', 'import-user');
  const result = await commitImport(id, 'import-user', 'Test', true);
  assert.equal(result.poems.length, 1);
  const parent = (await listRecords('testimonios'))[0];
  assert.equal(JSON.parse(parent.draft).ciudad, 'Roma');
  const before = (await listRecords()).length;
  const duplicate = await stageImport(await parse(wb), 'duplicate.xlsx', 'import-user');
  await assert.rejects(
    async () => await commitImport(duplicate, 'import-user', 'Test', true),
    /errores/
  );
  assert.equal((await listRecords()).length, before);
});
test('concurrent manuscript changes and expiration require a fresh preview without partial writes', async () => {
  const wb = await workbook('LOTE 1');
  wb.getWorksheet('Poemas')!.getCell('B2').value = 5;
  const id = await stageImport(await parse(wb), 'concurrent.xlsx', 'import-user');
  const parent = (await listRecords('testimonios'))[0];
  await saveRecord(
    'testimonios',
    parent.id,
    { ...JSON.parse(parent.draft), ciudad: 'Milán' },
    parent.version,
    'draft',
    'Other'
  );
  const before = (await listRecords()).length;
  await assert.rejects(async () => await commitImport(id, 'import-user', 'Test', true), /cambiado/);
  assert.equal((await listRecords()).length, before);
  const expired = await stageImport(
    await parse(await workbook('EXPIRED')),
    'expired.xlsx',
    'import-user'
  );
  db.prepare('UPDATE import_batches SET expires_at=0 WHERE id=?').run(expired);
  await assert.rejects(
    async () => await commitImport(expired, 'import-user', 'Test', true),
    /caducado/
  );
  assert.equal((await listRecords()).length, before);
});
test('legacy headers, reordered columns, italic runs and blank numbered rows are supported', async () => {
  const wb = new ExcelJS.Workbook(),
    ms = wb.addWorksheet('Manuscritos');
  ms.addRow([
    'Testimonio',
    'Ciudad',
    'Institución',
    'Signatura',
    'Contenido: folios y primer verso'
  ]);
  ms.addRow(['LEGACY', 'Roma', 'Biblioteca', '2', 'se genera']);
  const ps = wb.addWorksheet('Poemas');
  ps.addRow([
    'orden topográfico de la composición en el testimonio',
    'Íncipit',
    'Testimonio',
    'Forma',
    'Responsable(s) de la ficha',
    '[íncipit de la(s) composición(es) interna(s)/final(es)]'
  ]);
  ps.addRow([
    3,
    { richText: [{ text: 'Verso ', font: { italic: true } }, { text: 'sin cursiva' }] },
    'LEGACY',
    'soneto',
    'Ejemplo, Persona',
    ''
  ]);
  ps.addRow([4]);
  const parsed = await parse(wb),
    plan = await planImport(parsed);
  assert.equal(plan.poems, 1);
  assert.equal(parsed.skipped, 1);
  assert.deepEqual(errors(plan), []);
  assert.equal(plan.rows[1].content.incipit, '<em>Verso </em>sin cursiva');
  assert.equal(plan.rows[1].content.autores_ficha, 'Ejemplo, Persona');
  assert.ok(plan.issues.some((i) => i.message.includes('genera')));
});
test('bad dates, formulas, missing parents, duplicate orders and invalid boolean values locate exact rows', async () => {
  const wb = await workbook('INVALID', 2);
  const ps = wb.getWorksheet('Poemas')!;
  ps.getCell('C2').value = { formula: '1+1', result: 2 };
  ps.getCell('B3').value = 1;
  ps.getCell('E3').value = 'quizá';
  wb.getWorksheet('Testimonios')!.getCell('B2').value = new Date('2020-01-01');
  const plan = await planImport(await parse(wb));
  assert.ok(
    errors(plan).some((i) => i.row === 2 && i.field === 'incipit' && i.message.includes('fórmulas'))
  );
  assert.ok(errors(plan).some((i) => i.field === 'ciudad' && i.message.includes('fecha')));
  assert.ok(errors(plan).some((i) => i.row === 3 && i.field === 'orden'));
  assert.ok(errors(plan).some((i) => i.row === 3 && i.field === 'estructura_cabeza'));
  const orphan = await workbook('ORPHAN');
  orphan.removeWorksheet('Testimonios');
  assert.ok(errors(await planImport(await parse(orphan))).some((i) => i.field === 'testimonio'));
});
test('invalid files, size and row limits are rejected', async () => {
  await assert.rejects(parseExcel(Buffer.from('bad'), 'bad.xls'), /xlsx/);
  await assert.rejects(parseExcel(Buffer.from('bad'), 'bad.xlsx'), /leer/);
  await assert.rejects(parseExcel(Buffer.alloc(5 * 1024 * 1024 + 1), 'large.xlsx'), /5 MB/);
  const wb = await workbook('TOO MANY', 2001);
  await assert.rejects(parse(wb), /2.000/);
});
test('a larger batch imports completely while malformed member prevents all changes', async () => {
  const parsed = await parse(await workbook('BULK', 100));
  const before = (await listRecords()).length;
  const bad = structuredClone(parsed);
  bad.rows[50].content.orden = '0';
  const id = await stageImport(bad, 'bad-batch.xlsx', 'import-user');
  await assert.rejects(async () => await commitImport(id, 'import-user', 'Test', true), /errores/);
  assert.equal((await listRecords()).length, before);
  const good = await stageImport(parsed, 'bulk.xlsx', 'import-user');
  const result = await commitImport(good, 'import-user', 'Test', true);
  assert.equal(result.poems.length, 100);
  assert.equal((await listRecords()).length, before + 101);
  const imported = await Promise.all(result.poems.map((id) => getRecord(id)));
  assert.ok(imported.every((record) => record?.published === null));
});

test('compressed oversized workbooks and macro content are rejected before loading', async () => {
  const large = new JSZip();
  large.file('xl/workbook.xml', 'x'.repeat(33 * 1024 * 1024));
  await assert.rejects(
    parseExcel(
      await large.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
      'compressed.xlsx'
    ),
    /demasiados datos/
  );
  const macro = new JSZip();
  macro.file('xl/workbook.xml', 'test');
  macro.file('xl/vbaProject.bin', 'macro');
  await assert.rejects(
    parseExcel(await macro.generateAsync({ type: 'nodebuffer' }), 'macro.xlsx'),
    /macros/
  );
});
test('HTML-looking cell text stays literal, merged cells and duplicate headers identify problems', async () => {
  const wb = await workbook('LITERAL');
  const ps = wb.getWorksheet('Poemas')!;
  ps.getCell('C2').value = '<img src=x onerror=alert(1)> & verso';
  const plan = await planImport(await parse(wb));
  assert.deepEqual(errors(plan), []);
  assert.ok(!plan.rows[1].content.incipit.includes('<img'));
  assert.match(plan.rows[1].content.incipit, /&lt;img/);
  ps.getCell('H1').value = 'Íncipit';
  ps.getCell('H2').value = 'duplicado';
  assert.ok(
    errors(await planImport(await parse(wb))).some(
      (i) => i.row === 1 && i.message.includes('dos columnas')
    )
  );
  ps.getCell('H1').value = '';
  ps.mergeCells('C2:D2');
  assert.ok(
    errors(await planImport(await parse(wb))).some(
      (i) => i.row === 2 && i.message.includes('combinadas')
    )
  );
});
