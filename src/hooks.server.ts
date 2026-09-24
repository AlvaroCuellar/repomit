import { redirect, error } from '@sveltejs/kit';
import { getUser, sessionCookie } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await getUser(event.cookies.get(sessionCookie));
  const privatePath = event.url.pathname.startsWith('/admin');
  if (
    privatePath &&
    event.request.method !== 'GET' &&
    event.request.method !== 'HEAD' &&
    event.request.headers.get('origin') !== event.url.origin
  )
    error(403, 'Origen de solicitud no permitido.');
  if (privatePath && event.url.pathname !== '/admin/login' && !event.locals.user)
    redirect(303, '/admin/login');
  const response = await resolve(event);
  if (privatePath) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
};
