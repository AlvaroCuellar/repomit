import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPublicPage, acceptsConsultation } from '../src/lib/consultation-policy.ts';
const folder = mkdtempSync(join(tmpdir(), 'repomit-statistics-'));
process.env.REPOMIT_DB = join(folder, 'test.sqlite');
if (process.env.DATABASE_URL) throw new Error('Run this test without DATABASE_URL.');
const { db } = await import('../src/lib/server/database.ts');
const { recordConsultation, consultationStatistics } = await import('../src/lib/server/statistics.ts');
after(() => { db.close(); rmSync(folder, { recursive: true, force: true }); });

test('only known public paths qualify; no query terms or administration', () => {
  for (const path of ['/', '/presentacion', '/repertorio', '/poemas/M001', '/testimonios/A-1']) assert.ok(isPublicPage(path));
  for (const path of ['/admin', '/admin/login', '/api/consultas', '/favicon.ico', '/busqueda?q=nombre', '/unknown', '/poemas/a/b']) assert.equal(isPublicPage(path), false);
});

test('same-origin browser events only; exclude robots, prefetch and editors', () => {
  const request = (extra: Record<string,string> = {}) => new Request('https://example.org/api/consultas', {
    method: 'POST', headers: { origin: 'https://example.org', 'user-agent': 'Mozilla/5.0', ...extra }
  });
  assert.equal(acceptsConsultation(request(), 'https://example.org', false), true);
  assert.equal(acceptsConsultation(request(), 'https://example.org', true), false);
  for (const headers of [{ origin: 'https://elsewhere.org' }, { 'user-agent': 'Googlebot' }, { purpose: 'prefetch' }, { 'sec-purpose': 'prefetch;prerender' }]) {
    assert.equal(acceptsConsultation(request(headers), 'https://example.org', false), false);
  }
});

test('persistent daily aggregation starts empty and computes calendar window without invented history', async () => {
  const now = new Date('2026-09-24T15:00:00Z');
  assert.deepEqual(await consultationStatistics(now), { total: 0, firstSeen: null, today: 0, last30Days: 0, days: [] });
  await recordConsultation(new Date('2026-08-25T23:59:00Z')); // outside last 30 calendar days
  await recordConsultation(new Date('2026-08-26T00:00:00Z'));
  await recordConsultation(now);
  await recordConsultation(now);
  const stats = await consultationStatistics(now);
  assert.equal(stats.total, 4);
  assert.equal(stats.today, 2);
  assert.equal(stats.last30Days, 3);
  assert.equal(stats.firstSeen, '2026-08-25T23:59:00.000Z');
  assert.equal(stats.days.length, 2);
  assert.equal(db.prepare('SELECT total FROM page_consultations WHERE day = ?').get('2026-09-24')?.total, 2);
  assert.deepEqual(db.prepare('PRAGMA table_info(page_consultations)').all().map(row => row.name), ['day', 'total', 'first_seen']);
});
