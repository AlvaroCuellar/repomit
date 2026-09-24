import { redirect } from '@sveltejs/kit';
import { logout, sessionCookie } from '$lib/server/auth';
export const POST = async ({ cookies }) => {
  await logout(cookies.get(sessionCookie));
  cookies.delete(sessionCookie, { path: '/' });
  redirect(303, '/admin/login');
};
