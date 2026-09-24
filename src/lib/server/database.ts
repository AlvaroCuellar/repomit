import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';

export const usingPostgres = Boolean(process.env.DATABASE_URL);
export const databasePath = resolve(process.env.REPOMIT_DB || '.local/repomit.sqlite');
let sqlite: DatabaseSync | undefined;
if (!usingPostgres) {
  mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  sqlite = new DatabaseSync(databasePath);
  chmodSync(databasePath, 0o600);
}
export const db = sqlite!;
const pool = usingPostgres
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: { rejectUnauthorized: false }
    })
  : undefined;
const active = new AsyncLocalStorage<pg.PoolClient>();
const sqliteSql = (sql: string) =>
  sql
    .replace(/\s+FOR UPDATE\b/gi, '')
    .replace(/\$\d+/g, '?')
    .replace(/\bNOW\(\)/gi, "datetime('now')");

export async function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (usingPostgres) return (await (active.getStore() || pool!).query(sql, params)).rows as T[];
  return sqlite!.prepare(sqliteSql(sql)).all(...(params as SQLInputValue[])) as T[];
}
export async function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  return (await all<T>(sql, params))[0];
}
export async function run(sql: string, params: unknown[] = []) {
  if (usingPostgres) return (await (active.getStore() || pool!).query(sql, params)).rowCount;
  return Number(sqlite!.prepare(sqliteSql(sql)).run(...(params as SQLInputValue[])).changes);
}
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (!usingPostgres) {
    if (sqlite!.isTransaction) return fn();
    sqlite!.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn();
      sqlite!.exec('COMMIT');
      return result;
    } catch (error) {
      sqlite!.exec('ROLLBACK');
      throw error;
    }
  }
  if (active.getStore()) return fn();
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    const result = await active.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const schema = `
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','editor')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('poemas','testimonios','textos')),draft TEXT NOT NULL,published TEXT,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
 CREATE TABLE IF NOT EXISTS history (id ${usingPostgres ? 'BIGSERIAL' : 'INTEGER'} PRIMARY KEY ${usingPostgres ? '' : 'AUTOINCREMENT'},record_id TEXT NOT NULL REFERENCES records(id),content TEXT NOT NULL,action TEXT NOT NULL,author TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS metric_forms (normalized_name TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,payload TEXT NOT NULL,plan TEXT NOT NULL,created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,result TEXT);
`;
if (usingPostgres) await pool!.query(schema);
else {
  sqlite!.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sqlite!.exec(schema);
}
