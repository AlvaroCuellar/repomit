import { getMapSettings } from '$lib/server/map-settings';
import { error } from '@sveltejs/kit';
import { getRecord, publicData } from '$lib/server/content';
export const load = async ({ params }) => {
  const row = await getRecord(params.id);
  if (!row || row.kind !== params.kind) error(404, 'Ficha no encontrada.');
  const content = JSON.parse(row.draft);
  return {
    ...(await publicData({ kind: row.kind, id: row.id, content })),
    mapSettings: (await getMapSettings()).settings,
    kind: row.kind,
    recordId: row.id,
    previewPage: content.pagina
  };
};
