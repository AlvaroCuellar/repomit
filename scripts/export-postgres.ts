import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import pg from 'pg';

// Deliberately independent of database.ts: importing it can modify PostgreSQL.
const definitions = [
  ['users', 'id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN (\'admin\',\'editor\')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL'],
  ['records', 'id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN (\'poemas\',\'testimonios\',\'textos\')),draft TEXT NOT NULL,published TEXT,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL'],
  ['history', 'id INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT NOT NULL REFERENCES records(id),content TEXT NOT NULL,action TEXT NOT NULL,author TEXT NOT NULL,created_at TEXT NOT NULL'],
  ['metadata', 'key TEXT PRIMARY KEY,value TEXT NOT NULL'],
  ['metric_forms', 'normalized_name TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL'],
  ['sessions', 'token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at BIGINT NOT NULL'],
  ['login_attempts', 'key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at BIGINT NOT NULL'],
  ['import_batches', 'id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,payload TEXT NOT NULL,plan TEXT NOT NULL,created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,result TEXT'],
  ['page_consultations', 'day TEXT PRIMARY KEY,total BIGINT NOT NULL DEFAULT 0,first_seen TEXT NOT NULL'],
  ['site_visits', 'day TEXT PRIMARY KEY,total BIGINT NOT NULL DEFAULT 0,first_seen TEXT NOT NULL']
] as const;

class ExportError extends Error {}
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

async function main() {
  if (process.argv.length !== 3)
    throw new ExportError('Uso: node --experimental-strip-types scripts/export-postgres.ts RUTA_NUEVA.sqlite');
  const destination = resolve(process.argv[2]);
  let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString && existsSync('.env.local')) {
    const local = parseEnv(readFileSync('.env.local', 'utf8'));
    connectionString = local.DATABASE_URL_UNPOOLED || local.DATABASE_URL;
  }
  if (!connectionString) throw new ExportError('Falta DATABASE_URL en el entorno o en .env.local.');

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000
  });
  let sqlite: DatabaseSync | undefined;
  let created = false;
  let complete = false;
  let connected = false;
  let sourceTransaction = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    sourceTransaction = true;
    // Discover tables before copying; an unknown table must never be silently lost.
    const found = await client.query<{ name: string }>(`
      SELECT c.relname AS name FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','f') ORDER BY c.relname
    `);
    const tables = new Set(found.rows.map((row) => row.name));
    const known = new Set<string>(definitions.map(([name]) => name));
    if ([...tables].some((name) => !known.has(name)))
      throw new ExportError('Hay tablas públicas desconocidas. Revisa el esquema antes de exportar.');
    for (const required of ['users', 'records', 'history', 'metadata', 'metric_forms'])
      if (!tables.has(required)) throw new ExportError(`Falta la tabla requerida ${required}.`);

    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    // wx prevents replacing a pre-existing backup or database, including symlinks.
    closeSync(openSync(destination, 'wx', 0o600));
    created = true;
    sqlite = new DatabaseSync(destination);
    sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; BEGIN IMMEDIATE;');
    for (const [name, definition] of definitions)
      sqlite.exec(`CREATE TABLE ${quote(name)} (${definition});`);
    sqlite.exec('CREATE INDEX records_kind ON records(kind);');

    const counts: Record<string, number> = {};
    for (const [name] of definitions) {
      if (!tables.has(name)) continue; // Optional counters may never have been initialized.
      const columnsResult = await client.query<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position
      `, [name]);
      const columns = columnsResult.rows.map((row) => row.column_name);
      const targetColumns = sqlite.prepare(`PRAGMA table_info(${quote(name)})`).all()
        .map((row) => String(row.name));
      if (columns.length !== targetColumns.length || columns.some((column) => !targetColumns.includes(column)))
        throw new ExportError(`El esquema de ${name} no coincide. No se ha completado la exportación.`);
      const projection = columns.map(quote).join(',');
      const result = await client.query(`SELECT ${projection} FROM public.${quote(name)}`);
      const insert = sqlite.prepare(`INSERT INTO ${quote(name)} (${projection}) VALUES (${columns.map(() => '?').join(',')})`);
      for (const row of result.rows)
        insert.run(...columns.map((column) => row[column] as SQLInputValue));
      const sourceCount = await client.query<{ total: string }>(`SELECT COUNT(*) AS total FROM public.${quote(name)}`);
      const targetCount = sqlite.prepare(`SELECT COUNT(*) AS total FROM ${quote(name)}`).get();
      if (String(targetCount?.total) !== sourceCount.rows[0].total || result.rows.length !== Number(targetCount?.total))
        throw new ExportError(`No coincide el recuento de ${name}.`);
      counts[name] = result.rows.length;
    }
    // Preserve the history high-water mark even if its latest rows were deleted.
    const historySequence = await client.query<{ name: string | null }>(
      "SELECT pg_get_serial_sequence('public.history','id') AS name"
    );
    if (historySequence.rows[0].name) {
      const sequence = await client.query<{ value: string | null }>(
        'SELECT pg_sequence_last_value($1::regclass)::text AS value',
        [historySequence.rows[0].name]
      );
      if (sequence.rows[0].value !== null) {
        const value = BigInt(sequence.rows[0].value);
        const existing = sqlite.prepare("SELECT seq FROM sqlite_sequence WHERE name='history'").get();
        if (existing)
          sqlite.prepare("UPDATE sqlite_sequence SET seq=MAX(seq,?) WHERE name='history'").run(value);
        else sqlite.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run('history', value);
      }
    }
    if (sqlite.prepare('PRAGMA foreign_key_check').all().length)
      throw new ExportError('La copia no supera la comprobación de relaciones.');
    const integrity = sqlite.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok')
      throw new ExportError('La copia no supera la comprobación de integridad.');
    await client.query('COMMIT');
    sourceTransaction = false;
    sqlite.exec('COMMIT');
    sqlite.close();
    sqlite = undefined;
    complete = true;
    console.log(JSON.stringify({ destination, counts, integrity: 'ok' }, null, 2));
  } finally {
    if (sqlite) {
      try { if (sqlite.isTransaction) sqlite.exec('ROLLBACK'); } finally { sqlite.close(); }
    }
    if (sourceTransaction) await client.query('ROLLBACK').catch(() => {});
    if (created && !complete) {
      rmSync(destination, { force: true });
      rmSync(`${destination}-journal`, { force: true });
    }
    if (connected) await client.end();
  }
}

main().catch((error: unknown) => {
  // Provider errors can contain connection details. Only our own messages are safe to print.
  if (error instanceof ExportError) console.error(error.message);
  else {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    console.error(`Exportación cancelada; no se conserva una copia incompleta.${/^[A-Z0-9_]+$/.test(code) ? ` Código: ${code}.` : ''}`);
  }
  process.exitCode = 1;
});
