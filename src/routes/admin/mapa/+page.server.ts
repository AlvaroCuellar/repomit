import { fail, redirect } from '@sveltejs/kit';
import { getMapSettings, saveMapSettings } from '$lib/server/map-settings';
import { listRecords } from '$lib/server/content';
import { cityKey } from '$lib/map/geography';
export const load = async () => {
  const cities = new Map<string, string>();
  for (const row of await listRecords('testimonios'))
    for (const source of [row.draft, row.published]) {
      const city = source && JSON.parse(source).ciudad?.trim();
      if (city && city !== '—' && city !== '-') cities.set(cityKey(city), city);
    }
  return {
    ...(await getMapSettings()),
    cities: [...cities.values()].sort((a, b) => a.localeCompare(b, 'es'))
  };
};
export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    try {
      await saveMapSettings(
        JSON.parse(String(form.get('settings'))),
        String(form.get('version') || '')
      );
    } catch (e) {
      return fail(400, {
        error: e instanceof Error ? e.message : 'No se ha podido guardar el mapa.'
      });
    }
    redirect(303, '/admin/mapa?guardado=1');
  }
};
