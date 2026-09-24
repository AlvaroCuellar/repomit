import { backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { db } from '../src/lib/server/database.ts';
mkdirSync('.local/backups', { recursive: true, mode: 0o700 });
const path = `.local/backups/repomit-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
await backup(db, path);
chmodSync(path, 0o600);
db.close();
console.log(`Copia verificada por SQLite: ${path}`);
