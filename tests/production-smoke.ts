import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import ExcelJS from 'exceljs';

const folder = mkdtempSync(join(tmpdir(), 'repomit-production-'));
const database = join(folder, 'test.sqlite');
const source = new DatabaseSync(resolve('.local/repomit.sqlite'));
await backup(source, database);
source.close();
process.env.REPOMIT_DB = database;
const { createUser } = await import('../src/lib/server/auth.ts');
const { db } = await import('../src/lib/server/database.ts');
await createUser('smoke@repomit.local', 'Prueba de producción', 'Production-test-password-1234');
db.close();
const origin = 'http://127.0.0.1:5180';
let server: ChildProcess | undefined;
let output = '';
async function start() {
  server = spawn(process.execPath, ['scripts/start.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '5180', ORIGIN: origin },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stderr?.on('data', (chunk) => (output += chunk));
  server.stdout?.on('data', (chunk) => (output += chunk));
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('No arranca el servidor compilado: ' + output);
}
async function stop() {
  if (server && server.exitCode === null) {
    const closed = once(server, 'exit');
    server.kill('SIGTERM');
    await closed;
  }
  server = undefined;
}
try {
  await start();
  const response = await fetch(origin + '/admin/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { origin, accept: 'text/html', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: 'smoke@repomit.local',
      password: 'Production-test-password-1234'
    })
  });
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie')!.split(';')[0];
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/i);
  const admin = await fetch(origin + '/admin', { headers: { cookie } });
  assert.match(await admin.text(), /Tu mesa de trabajo/);
  const workbook = new ExcelJS.Workbook();
  const manuscript = workbook.addWorksheet('Testimonios');
  manuscript.addRow(['testimonio', 'ciudad', 'institucion', 'signatura']);
  manuscript.addRow(['PRODUCTION IMPORT', 'Roma', 'Biblioteca de prueba', '001']);
  const notes = workbook.addWorksheet('Instrucciones');
  for (let i = 0; i < 30; i++) notes.addRow([randomBytes(24000).toString('base64')]);
  const excel = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.ok(excel.length > 512000, 'Exercise uploads above adapter-node default body limit');
  const upload = new FormData();
  upload.set('archivo', new Blob([excel]), 'production.xlsx');
  const staged = await fetch(origin + '/admin/importar?/analyze', {
    method: 'POST',
    headers: { origin, cookie, accept: 'text/html' },
    body: upload,
    redirect: 'manual'
  });
  assert.equal(staged.status, 303);
  const location = staged.headers.get('location')!;
  const batchId = new URL(location, origin).searchParams.get('lote')!;
  const preview = await fetch(origin + location, { headers: { cookie } });
  assert.match(await preview.text(), /PRODUCTION IMPORT/);
  const confirmed = await fetch(origin + '/admin/importar?/confirm', {
    method: 'POST',
    headers: { origin, cookie, accept: 'text/html' },
    body: new URLSearchParams({ lote: batchId, revisado: 'on' }),
    redirect: 'manual'
  });
  assert.equal(confirmed.status, 303);
  const imported = new DatabaseSync(database, { readOnly: true });
  const row = imported
    .prepare("SELECT id,published FROM records WHERE draft LIKE '%PRODUCTION IMPORT%'")
    .get()!;
  assert.equal(row.published, null);
  imported.close();
  assert.equal((await fetch(origin + '/testimonios/' + row.id)).status, 404);
  const marker = 'Publicación persistente de prueba ' + Date.now();
  const publish = await fetch(origin + '/admin/textos/nuevo?/publish', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin,
      cookie,
      accept: 'text/html',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      version: '0',
      pagina: 'home',
      orden: '999999',
      title: 'Prueba aislada',
      texto: marker
    })
  });
  assert.equal(publish.status, 303);
  assert.ok((await (await fetch(origin)).text()).includes(marker));
  await stop();
  await start();
  assert.ok(
    (await (await fetch(origin)).text()).includes(marker),
    'El contenido debe persistir tras reiniciar'
  );
  const logout = await fetch(origin + '/admin/logout', {
    method: 'POST',
    redirect: 'manual',
    headers: { origin, cookie }
  });
  assert.equal(logout.status, 303);
  assert.equal(
    (await fetch(origin + '/admin', { redirect: 'manual', headers: { cookie } })).status,
    303
  );
  console.log(
    'Servidor compilado: acceso, importación Excel >500 KB como borrador, publicación, persistencia tras reinicio y cierre de sesión correctos. Base de trabajo intacta.'
  );
} finally {
  await stop();
  rmSync(folder, { recursive: true, force: true });
}
