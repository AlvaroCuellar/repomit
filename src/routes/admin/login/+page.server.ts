import { fail, redirect } from '@sveltejs/kit';
import { login, sessionCookie } from '$lib/server/auth';
export const load = ({ locals }) => {
  if (locals.user) redirect(303, '/admin');
};
export const actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    const data = await request.formData();
    try {
      const token = await login(
        String(data.get('email') || ''),
        String(data.get('password') || ''),
        getClientAddress()
      );
      cookies.set(sessionCookie, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        maxAge: 8 * 60 * 60
      });
    } catch (e) {
      return fail(400, {
        error: e instanceof Error ? e.message : 'No se ha podido iniciar sesión.'
      });
    }
    redirect(303, '/admin');
  }
};
