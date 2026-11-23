import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { get, put } from '@vercel/blob';

// Run only on a completed, immutable export after freezing production writes.
async function main() {
  if (process.argv.length !== 3) throw new Error('Indica una copia SQLite exportada y verificada.');
  const source = resolve(process.argv[2]);
  const database = new DatabaseSync(source, { readOnly: true });
  let counts;
  try {
    const integrity = database.prepare('PRAGMA integrity_check').get();
    if (!integrity || Object.values(integrity)[0] !== 'ok') throw new Error('La copia no supera la comprobación de integridad.');
    if (database.prepare('PRAGMA foreign_key_check').all().length) throw new Error('La copia tiene relaciones inválidas.');
    counts = database.prepare('SELECT kind,COUNT(*) AS total,COUNT(published) AS published FROM records GROUP BY kind ORDER BY kind').all();
  } finally { database.close(); }
  const pathname = process.env.REPOMIT_BLOB_PATH || 'repomit/database.sqlite';
  const existing = await get(pathname, { access: 'private', useCache: false });
  if (existing) {
    if (existing.statusCode === 200) await existing.stream.cancel();
    throw new Error('El destino ya existe: no se sobrescribe una base persistente.');
  }
  const bytes = readFileSync(source);
  await put(pathname, bytes, {
    access: 'private', addRandomSuffix: false, allowOverwrite: false,
    contentType: 'application/vnd.sqlite3'
  });
  const saved = await get(pathname, { access: 'private', useCache: false });
  if (!saved || saved.statusCode !== 200) throw new Error('No se puede verificar la copia guardada.');
  const downloaded = Buffer.from(await new Response(saved.stream).arrayBuffer());
  const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
  if (digest(bytes) !== digest(downloaded)) throw new Error('La copia remota no coincide con el original.');
  console.log(JSON.stringify({ pathname, bytes: bytes.length, sha256: digest(bytes), counts, verified: true }));
}

main().catch(() => {
  console.error('No se ha completado la inicialización y verificación del almacén privado. Revisa el destino antes de reintentar.');
  process.exitCode = 1;
});
