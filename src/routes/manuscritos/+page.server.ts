import { getMapSettings } from '$lib/server/map-settings';
export const load = async () => ({ mapSettings: (await getMapSettings()).settings });
