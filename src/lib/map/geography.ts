import cities from './cities.json' with { type: 'json' };
import italy from './italy.json' with { type: 'json' };
export type Coordinates = { latitude: number; longitude: number };
export type MapSettings = { visible: boolean; cities: Record<string, Coordinates> };
export const normalizeCity = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const aliases: Record<string, string> = {
  napoles: 'naples',
  napoli: 'naples',
  roma: 'rome',
  florencia: 'florence',
  firenze: 'florence',
  bolonia: 'bologna',
  venecia: 'venice',
  venezia: 'venice',
  milano: 'milan',
  torino: 'turin',
  genova: 'genoa',
  ravena: 'ravenna'
};
export const cityKey = (value: string) => aliases[normalizeCity(value)] || normalizeCity(value);
const defaults = new Map(
  cities.map((c) => [cityKey(c.name), { latitude: c.latitude, longitude: c.longitude }])
);
export function coordinatesFor(city: string, settings?: MapSettings): Coordinates | undefined {
  return settings?.cities[cityKey(city)] || defaults.get(cityKey(city));
}
// Equirectangular projection at 42°N. Outline and points share exactly the same transform.
export const bounds = { west: 6, east: 19, south: 35, north: 48 };
export function project(c: Coordinates) {
  return { x: ((c.longitude - 6) / 13) * 300, y: ((48 - c.latitude) / 13) * 400 };
}
export function validCoordinates(c: Coordinates) {
  return (
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    c.latitude >= 35 &&
    c.latitude <= 48 &&
    c.longitude >= 6 &&
    c.longitude <= 19
  );
}
export const italyPath = italy
  .map((p) =>
    p
      .map(
        (r) =>
          r
            .map(([longitude, latitude], i) => {
              const { x, y } = project({ latitude, longitude });
              return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ') + 'Z'
      )
      .join(' ')
  )
  .join(' ');
