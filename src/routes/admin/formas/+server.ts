import { json } from '@sveltejs/kit';
import { addForm, VocabularyError } from '$lib/server/vocabulary';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Inicia sesión para añadir una forma.' }, { status: 401 });
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }
  if (typeof input?.name !== 'string')
    return json({ error: 'Escribe el nombre de la forma.' }, { status: 400 });
  try {
    return json(
      { name: await addForm(input.name, `${locals.user.name} <${locals.user.email}>`) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof VocabularyError)
      return json(
        { error: error.message, existing: error.existing },
        { status: error.existing ? 409 : 400 }
      );
    throw error;
  }
};
