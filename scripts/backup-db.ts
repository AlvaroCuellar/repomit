import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, writeFileSync, rmSync } from 'node:fs';
import { get } from '@vercel/blob';
import { db, usingBlob, usingPostgres } from '../src/lib/server/database.ts';
import { blobDatabasePathname } from '../src/lib/server/blob-database.ts';
if (usingPostgres) throw new Error('Para PostgreSQL utiliza scripts/export-postgres.ts.');
mkdirSync('.local/backups', { recursive: true, mode: 0o700 });
const path = `.local/backups/repomit-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
if (usingBlob) {
  const source = await get(blobDatabasePathname, { access: 'private', useCache: false });
  if (!source || source.statusCode !== 200) throw new Error('No se puede descargar la base privada.');
  writeFileSync(path, Buffer.from(await new Response(source.stream).arrayBuffer()), { flag: 'wx', mode: 0o600 });
  const copy = new DatabaseSync(path, { readOnly: true });
  try {
    if (Object.values(copy.prepare('PRAGMA integrity_check').get() || {})[0] !== 'ok' || copy.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('La copia no supera la verificación de integridad.');
  } catch (error) {
    copy.close();
    rmSync(path);
    throw error;
  }
  copy.close();
} else {
  await backup(db, path);
  db.close();
}
chmodSync(path, 0o600);
console.log(`Copia verificada por SQLite: ${path}`);
