import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash
} from 'node:crypto';
import { promisify } from 'node:util';
import { one, run } from './database.ts';
const scrypt = promisify(scryptCallback);
export type User = { id: string; email: string; name: string; role: 'admin' | 'editor' };
export const sessionCookie = 'repomit_session';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 256)
    throw new Error('La contraseña debe tener entre 12 y 256 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  if (password.length > 256) return false;
  const [salt, expected] = hash.split(':');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const actual = Buffer.from(expected, 'hex');
  return actual.length === key.length && timingSafeEqual(key, actual);
}
export async function createUser(
  email: string,
  name: string,
  password: string,
  role: 'admin' | 'editor' = 'editor'
) {
  email = email.trim().toLowerCase();
  name = name.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !name ||
    name.length > 120 ||
    !['admin', 'editor'].includes(role)
  )
    throw new Error('Revisa el nombre, el correo y el perfil.');
  if (await one('SELECT id FROM users WHERE email=$1', [email]))
    throw new Error('Ya existe una cuenta con ese correo.');
  const hash = await hashPassword(password);
  await run(
    'INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), email, name, hash, role, new Date().toISOString()]
  );
}
export async function login(email: string, password: string, ip: string) {
  email = email.trim().toLowerCase();
  const now = Date.now();
  await run('DELETE FROM login_attempts WHERE expires_at<$1', [now]);
  const keys = [digest(`email:${email}`), digest(`ip:${ip}`)];
  for (const key of keys) {
    const attempt = await one<{ attempts: number }>(
      'SELECT attempts FROM login_attempts WHERE key=$1',
      [key]
    );
    if (attempt && Number(attempt.attempts) >= 10)
      throw new Error('Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.');
  }
  const user = await one<User & { password_hash: string }>(
    'SELECT * FROM users WHERE email=$1 AND active=1',
    [email]
  );
  const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
  const valid = await verifyPassword(password, user?.password_hash || dummy);
  if (!valid || !user) {
    for (const key of keys)
      await run(
        'INSERT INTO login_attempts(key,attempts,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET attempts=login_attempts.attempts+1,expires_at=excluded.expires_at',
        [key, now + 15 * 60 * 1000]
      );
    throw new Error('Correo o contraseña incorrectos.');
  }
  await run('DELETE FROM login_attempts WHERE key=$1', [keys[0]]);
  const token = randomBytes(32).toString('hex');
  await run('DELETE FROM sessions WHERE expires_at<$1', [now]);
  await run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
    digest(token),
    user.id,
    now + 8 * 60 * 60 * 1000
  ]);
  return token;
}
export async function getUser(token: string | undefined): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    (await one<User>(
      'SELECT u.id,u.email,u.name,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>$2 AND u.active=1',
      [digest(token), Date.now()]
    )) || null
  );
}
export async function logout(token: string | undefined) {
  if (token) await run('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]);
}
export async function changePassword(user: User, current: string, next: string) {
  const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id=$1', [
    user.id
  ]);
  if (!row || !(await verifyPassword(current, row.password_hash as string)))
    throw new Error('La contraseña actual no es correcta.');
  const hash = await hashPassword(next);
  await run('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, user.id]);
  await run('DELETE FROM sessions WHERE user_id=$1', [user.id]);
}
