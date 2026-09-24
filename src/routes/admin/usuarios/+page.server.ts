import { fail, redirect } from '@sveltejs/kit';
import { all, run } from '$lib/server/database';
import { createUser, changePassword, sessionCookie, hashPassword } from '$lib/server/auth';
export const load = async ({ locals }) => ({
  users:
    locals.user?.role === 'admin'
      ? ((await all('SELECT id,email,name,role,active FROM users ORDER BY name')) as {
          id: string;
          email: string;
          name: string;
          role: string;
          active: number;
        }[])
      : []
});
export const actions = {
  create: async ({ request, locals }) => {
    if (locals.user?.role !== 'admin')
      return fail(403, { error: 'Solo administración puede crear cuentas.' });
    const f = await request.formData();
    try {
      await createUser(
        String(f.get('email')),
        String(f.get('name')),
        String(f.get('password')),
        f.get('role') === 'admin' ? 'admin' : 'editor'
      );
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    return {
      success:
        'Cuenta creada. Facilita sus credenciales a la persona correspondiente por un canal privado.'
    };
  },
  password: async ({ request, locals, cookies }) => {
    const f = await request.formData();
    if (f.get('next') !== f.get('confirm'))
      return fail(400, { error: 'Las nuevas contraseñas no coinciden.' });
    try {
      await changePassword(locals.user!, String(f.get('current')), String(f.get('next')));
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    cookies.delete(sessionCookie, { path: '/' });
    redirect(303, '/admin/login');
  },
  deactivate: async ({ request, locals }) => {
    if (locals.user?.role !== 'admin') return fail(403, { error: 'Operación no permitida.' });
    const f = await request.formData();
    const id = String(f.get('id'));
    if (id === locals.user.id)
      return fail(400, { error: 'No puedes desactivar tu propia cuenta.' });
    await run('UPDATE users SET active=1-active WHERE id=$1', [id]);
    await run('DELETE FROM sessions WHERE user_id=$1', [id]);
    return { success: 'Estado de la cuenta actualizado.' };
  },
  reset: async ({ request, locals }) => {
    if (locals.user?.role !== 'admin') return fail(403, { error: 'Operación no permitida.' });
    const f = await request.formData();
    const id = String(f.get('id'));
    if (id === locals.user.id)
      return fail(400, { error: 'Para tu cuenta utiliza Cambiar mi contraseña.' });
    try {
      const hash = await hashPassword(String(f.get('password')));
      await run('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, id]);
      await run('DELETE FROM sessions WHERE user_id=$1', [id]);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    return { success: 'Contraseña restablecida. Todas las sesiones de esa cuenta se han cerrado.' };
  }
};
