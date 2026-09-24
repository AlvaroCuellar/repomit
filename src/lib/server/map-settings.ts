import { one, run, transaction } from './database.ts';
import { cityKey, validCoordinates, type MapSettings } from '../map/geography.ts';
export const MAP_SETTINGS_KEY = 'map_settings';
export async function getMapSettings() {
  const row = await one<{ value: string }>('SELECT value FROM metadata WHERE key=$1', [
    MAP_SETTINGS_KEY
  ]);
  return {
    settings: row ? (JSON.parse(row.value) as MapSettings) : { visible: true, cities: {} },
    version: row?.value || ''
  };
}
export function validateMapSettings(input: unknown): MapSettings {
  if (!input || typeof input !== 'object')
    throw new Error('La configuración del mapa no es válida.');
  const value = input as MapSettings;
  if (
    typeof value.visible !== 'boolean' ||
    !value.cities ||
    typeof value.cities !== 'object' ||
    Array.isArray(value.cities)
  )
    throw new Error('La configuración del mapa no es válida.');
  const cities: MapSettings['cities'] = {};
  for (const [key, c] of Object.entries(value.cities)) {
    if (
      !key.trim() ||
      key.length > 120 ||
      !c ||
      typeof c.latitude !== 'number' ||
      typeof c.longitude !== 'number' ||
      !validCoordinates(c)
    )
      throw new Error(
        `Revisa las coordenadas de ${key}: deben estar dentro del mapa de Italia (latitud 35–48; longitud 6–19).`
      );
    cities[cityKey(key)] = { latitude: c.latitude, longitude: c.longitude };
  }
  return { visible: value.visible, cities };
}
export async function saveMapSettings(input: unknown, version: string) {
  const settings = validateMapSettings(input);
  await transaction(async () => {
    // Lock an existing metadata row first; the initial insert is also protected by its unique key.
    const row = await one<{ value: string }>('SELECT value FROM metadata WHERE key=$1 FOR UPDATE', [
      MAP_SETTINGS_KEY
    ]);
    if ((row?.value || '') !== version)
      throw new Error('Otra persona ha modificado el mapa. Recarga la página antes de guardar.');
    if (row)
      await run('UPDATE metadata SET value=$1 WHERE key=$2', [
        JSON.stringify(settings),
        MAP_SETTINGS_KEY
      ]);
    else
      await run('INSERT INTO metadata(key,value) VALUES($1,$2)', [
        MAP_SETTINGS_KEY,
        JSON.stringify(settings)
      ]);
  });
}
