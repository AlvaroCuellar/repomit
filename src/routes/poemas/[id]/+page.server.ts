import { error } from '@sveltejs/kit';
import { resolveRecordId } from '$lib/data/repomit';
export const load = async ({ params, parent }) => {
  const data = await parent();
  if (!data.poemas.some((row) => row.id === resolveRecordId(params.id)))
    error(404, 'Ficha no publicada o inexistente.');
  return {};
};
