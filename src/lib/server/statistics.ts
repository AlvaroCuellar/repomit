import { all, one, run } from './database.ts';

let initialized: Promise<unknown> | undefined;
function initialize() {
  // Compatible with SQLite and PostgreSQL; counts survive application restarts.
  return initialized ??= run(`CREATE TABLE IF NOT EXISTS page_consultations (
    day TEXT PRIMARY KEY,
    total BIGINT NOT NULL DEFAULT 0,
    first_seen TEXT NOT NULL
  )`).catch((error) => { initialized = undefined; throw error; });
}

export async function recordConsultation(now = new Date()) {
  await initialize();
  const timestamp = now.toISOString();
  await run(`INSERT INTO page_consultations (day,total,first_seen) VALUES ($1,1,$2)
    ON CONFLICT(day) DO UPDATE SET total = page_consultations.total + 1`,
    [timestamp.slice(0, 10), timestamp]);
}

export async function consultationStatistics(now = new Date()) {
  await initialize();
  const today = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 29);
  const since = start.toISOString().slice(0, 10);
  const summary = await one<{ total: number | string; first_seen: string | null }>(
    'SELECT COALESCE(SUM(total),0) AS total, MIN(first_seen) AS first_seen FROM page_consultations');
  const days = await all<{ day: string; total: number | string }>(
    'SELECT day,total FROM page_consultations WHERE day >= $1 AND day <= $2 ORDER BY day DESC', [since, today]);
  return {
    total: Number(summary?.total || 0),
    firstSeen: summary?.first_seen || null,
    today: Number(days.find((day) => day.day === today)?.total || 0),
    last30Days: days.reduce((sum, day) => sum + Number(day.total), 0),
    days: days.map((day) => ({ day: day.day, total: Number(day.total) }))
  };
}
