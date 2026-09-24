import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
mkdirSync('.local/e2e', { recursive: true });
const path = resolve('.local/e2e/test.sqlite');
for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
const source = new DatabaseSync(resolve('.local/repomit.sqlite'));
await backup(source, path);
source.close();
process.env.REPOMIT_DB = path;
const { db } = await import('../src/lib/server/database.ts');
if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='import_batches'").get())
  db.exec('DELETE FROM import_batches');
db.exec('DELETE FROM sessions; DELETE FROM users; DELETE FROM login_attempts;');
const { createUser } = await import('../src/lib/server/auth.ts');
await createUser('tests@repomit.local', 'Equipo de pruebas', 'Local-test-password-1234', 'admin');
db.close();
