import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { resolve } from 'node:path';

const url=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
if(!url)throw new Error('Falta DATABASE_URL_UNPOOLED o DATABASE_URL.');
const sourcePath=resolve(process.argv[2]||'.local/deploy/repomit.sqlite');
const source=new DatabaseSync(sourcePath,{readOnly:true});
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});
await client.connect();
const tables=['users','records','history','metadata','metric_forms'] as const;
try{
 await client.query('BEGIN');
 await client.query(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','editor')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('poemas','testimonios','textos')),draft TEXT NOT NULL,published TEXT,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
  CREATE TABLE IF NOT EXISTS history (id BIGSERIAL PRIMARY KEY,record_id TEXT NOT NULL REFERENCES records(id),content TEXT NOT NULL,action TEXT NOT NULL,author TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS metric_forms (normalized_name TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),filename TEXT NOT NULL,payload TEXT NOT NULL,plan TEXT NOT NULL,created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,result TEXT);
 `);
 await client.query('TRUNCATE import_batches,sessions,login_attempts,history,records,metric_forms,metadata,users RESTART IDENTITY CASCADE');
 for(const table of tables){
  const rows=source.prepare(`SELECT * FROM ${table}`).all() as Record<string,unknown>[];
  for(const row of rows){
   const columns=Object.keys(row),values=Object.values(row);
   await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')})`,values);
  }
 }
 await client.query("SELECT setval(pg_get_serial_sequence('history','id'),COALESCE((SELECT MAX(id) FROM history),1),true)");
 await client.query('COMMIT');
 const counts=await client.query("SELECT kind,COUNT(*)::int total,COUNT(published)::int published FROM records GROUP BY kind ORDER BY kind");
 const admins=await client.query("SELECT email,role FROM users WHERE active=1 ORDER BY email");
 console.log(JSON.stringify({source:sourcePath,counts:counts.rows,users:admins.rows},null,2));
}catch(error){await client.query('ROLLBACK');throw error;}finally{source.close();await client.end();}
