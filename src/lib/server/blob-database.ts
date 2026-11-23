import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

export const blobDatabasePathname = process.env.REPOMIT_BLOB_PATH || 'repomit/database.sqlite';

export interface BlobDatabaseTransport {
  read(): Promise<{ bytes: Uint8Array; etag: string } | null>;
  write(bytes: Uint8Array, etag: string): Promise<void>;
}

let cachedBlob: { bytes: Uint8Array; etag: string } | undefined;
const defaultTransport: BlobDatabaseTransport = {
  async read() {
    // Every read still validates against origin. Capture the exact immutable
    // bytes associated with this conditional request: another read or writer
    // may replace the warm-instance cache while this request is in flight.
    const captured = cachedBlob;
    const result = await get(blobDatabasePathname, {
      access: 'private',
      useCache: false,
      ...(captured ? { ifNoneMatch: captured.etag } : {})
    });
    if (!result) {
      if (cachedBlob === captured) cachedBlob = undefined;
      return null;
    }
    if (result.statusCode === 304) {
      if (!captured) throw new Error('Unexpected conditional database response.');
      return captured;
    }
    const downloaded = {
      bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
      etag: result.blob.etag
    };
    cachedBlob = downloaded;
    return downloaded;
  },
  async write(bytes, etag) {
    const result = await put(blobDatabasePathname, Buffer.from(bytes), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: etag,
      contentType: 'application/vnd.sqlite3'
    });
    cachedBlob = { bytes: new Uint8Array(bytes), etag: result.etag };
  }
};

interface Snapshot {
  db: DatabaseSync;
  path: string;
  etag: string;
  close(): void;
}

interface RequestContext {
  snapshot?: Promise<Snapshot>;
  owned: Set<Snapshot>;
  pending: Set<Promise<Snapshot>>;
}

// PostgreSQL placeholders can repeat or occur out of order. Rebind each SQLite
// placeholder from its original index instead of relying on encounter order.
function statement(sql: string, params: unknown[]) {
  const bindings: SQLInputValue[] = [];
  const rewritten = sql
    .replace(/\s+FOR UPDATE\b/gi, '')
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\$(\d+)/g, (_, index: string) => {
      const offset = Number(index) - 1;
      if (offset < 0 || offset >= params.length) throw new Error('Missing SQL parameter.');
      bindings.push(params[offset] as SQLInputValue);
      return '?';
    });
  return { sql: rewritten, params: bindings.length ? bindings : (params as SQLInputValue[]) };
}

/**
 * SQLite snapshots durably committed to a private Blob using ETag compare-and-swap.
 * The local file is an isolated working copy, never the durable source of truth.
 */
export class BlobDatabase {
  private readonly transport: BlobDatabaseTransport;
  private readonly maxAttempts: number;
  private readonly active = new AsyncLocalStorage<Snapshot>();
  private readonly requests = new AsyncLocalStorage<RequestContext>();

  constructor(options: { transport?: BlobDatabaseTransport; maxAttempts?: number } = {}) {
    this.transport = options.transport ?? defaultTransport;
    this.maxAttempts = options.maxAttempts ?? 6;
    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1)
      throw new Error('maxAttempts must be a positive integer.');
  }

  private async load(): Promise<Snapshot> {
    const source = await this.transport.read();
    // Never silently bootstrap an empty database or restore an obsolete local
    // corpus when the durable source is absent or unavailable.
    if (!source) throw new Error('The persistent RePoMIt database is unavailable.');
    const directory = mkdtempSync(join(tmpdir(), 'repomit-db-'));
    const path = join(directory, 'database.sqlite');
    let db: DatabaseSync | undefined;
    try {
      writeFileSync(path, source.bytes, { mode: 0o600 });
      db = new DatabaseSync(path);
      db.exec('PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      let closed = false;
      return {
        db,
        path,
        etag: source.etag,
        close() {
          if (closed) return;
          closed = true;
          try {
            db!.close();
          } finally {
            rmSync(directory, { recursive: true, force: true });
          }
        }
      };
    } catch (error) {
      try {
        db?.close();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
      throw error;
    }
  }

  async withRequest<T>(fn: () => Promise<T>): Promise<T> {
    if (this.requests.getStore()) return fn();
    const context: RequestContext = { owned: new Set(), pending: new Set() };
    try {
      return await this.requests.run(context, fn);
    } finally {
      // A caller may have started a read alongside another awaited operation.
      // Wait for its file creation before removing request-local working copies.
      await Promise.allSettled(context.pending);
      for (const snapshot of context.owned) snapshot.close();
    }
  }

  private async read<T>(fn: (snapshot: Snapshot) => T): Promise<T> {
    const active = this.active.getStore();
    if (active) return fn(active);
    const request = this.requests.getStore();
    if (request) {
      if (!request.snapshot) {
        request.snapshot = this.load().then((snapshot) => {
          request.owned.add(snapshot);
          return snapshot;
        });
        request.pending.add(request.snapshot);
      }
      return fn(await request.snapshot);
    }
    const snapshot = await this.load();
    try {
      return fn(snapshot);
    } finally {
      snapshot.close();
    }
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const query = statement(sql, params);
    return this.read((snapshot) => snapshot.db.prepare(query.sql).all(...query.params) as T[]);
  }

  async run(sql: string, params: unknown[] = []): Promise<number> {
    const active = this.active.getStore();
    if (!active) return this.transaction(() => this.run(sql, params));
    const query = statement(sql, params);
    return Number(active.db.prepare(query.sql).run(...query.params).changes);
  }

  isInTransaction(): boolean {
    return Boolean(this.active.getStore());
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active.getStore()) return fn();
    const operationId = randomUUID();
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const snapshot = await this.load();
      try {
        snapshot.db.exec('BEGIN IMMEDIATE');
        let result: T;
        try {
          const changesBefore = Number((snapshot.db.prepare('SELECT total_changes() AS total')
            .get() as { total: number }).total);
          const schemaBefore = Number((snapshot.db.prepare('PRAGMA schema_version')
            .get() as { schema_version: number }).schema_version);
          result = await this.active.run(snapshot, fn);
          const changesAfter = Number((snapshot.db.prepare('SELECT total_changes() AS total')
            .get() as { total: number }).total);
          const schemaAfter = Number((snapshot.db.prepare('PRAGMA schema_version')
            .get() as { schema_version: number }).schema_version);
          if (changesAfter === changesBefore && schemaAfter === schemaBefore) {
            // In particular, repeated CREATE TABLE IF NOT EXISTS at cold start
            // must not upload the complete database when nothing changed.
            snapshot.db.exec('COMMIT');
            return result;
          }
          snapshot.db.exec(`CREATE TABLE IF NOT EXISTS _blob_operations (
            id TEXT PRIMARY KEY, created_at INTEGER NOT NULL
          )`);
          snapshot.db.exec('CREATE INDEX IF NOT EXISTS _blob_operations_created_at ON _blob_operations(created_at)');
          snapshot.db.prepare('INSERT INTO _blob_operations(id,created_at) VALUES (?,?)')
            .run(operationId, Date.now());
          // Keep enough committed operation IDs to resolve lost upload responses,
          // including when other writers have committed before verification.
          snapshot.db.prepare('DELETE FROM _blob_operations WHERE created_at < ?')
            .run(Date.now() - 7 * 24 * 60 * 60 * 1000);
          snapshot.db.exec('COMMIT');
        } catch (error) {
          if (snapshot.db.isTransaction) snapshot.db.exec('ROLLBACK');
          throw error;
        }
        const bytes = readFileSync(snapshot.path);
        try {
          await this.transport.write(bytes, snapshot.etag);
        } catch (error) {
          // The server may have stored the snapshot even if its response was
          // lost. Check the durable operation ledger before replaying any work.
          let committed = false;
          let verified = false;
          try {
            const latest = await this.load();
            try {
              const ledger = latest.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='_blob_operations'"
              ).get();
              committed = Boolean(ledger && latest.db.prepare(
                'SELECT id FROM _blob_operations WHERE id=?'
              ).get(operationId));
              verified = true;
            } finally {
              latest.close();
            }
          } catch {
            // Preserve the original upload error if verification is unavailable.
          }
          if (!committed) {
            if (verified && error instanceof BlobPreconditionFailedError && attempt + 1 < this.maxAttempts)
              continue;
            throw error;
          }
        }
        const request = this.requests.getStore();
        if (request) request.snapshot = undefined;
        return result;
      } finally {
        snapshot.close();
      }
    }
    throw new Error('The database changed repeatedly. Please try saving again.');
  }
}
