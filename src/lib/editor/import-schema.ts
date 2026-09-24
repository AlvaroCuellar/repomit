import { fields } from './schema.ts';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const importFields = {
  testimonios: fields.testimonios,
  poemas: fields.poemas.map(
    ([key, label]) => [key === 'testimonio_id' ? 'testimonio' : key, label] as [string, string]
  )
};
export const importRequired = {
  testimonios: ['testimonio'],
  poemas: ['testimonio', 'orden', 'incipit']
};
export function headerKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
export function importHeader(value: string, kind: 'poemas' | 'testimonios'): string | undefined {
  const key = headerKey(value);
  for (const [name, label] of importFields[kind])
    if (key === headerKey(name) || key === headerKey(label)) return name;
  // Historical RePoMIt workbooks used these long headers. Match meaning, not column position.
  if (key.startsWith('contenido')) return '_contenido';
  if (key.startsWith('enlace')) return 'enlace';
  if (
    key.startsWith('responsable') ||
    key.startsWith('autoresdelaficha') ||
    key.startsWith('autordelaficha')
  )
    return key.includes('transcripcion') ? 'autores_transcripcion' : 'autores_ficha';
  if (key.startsWith('autoresdelatranscripcion') || key.startsWith('autordelatranscripcion'))
    return 'autores_transcripcion';
  if (kind === 'poemas') {
    if (key.startsWith('ordentopografico')) return 'orden';
    if (key.startsWith('estructuracabeza')) return 'estructura_cabeza';
    if (key.startsWith('estructuracomposicionprincipal')) return 'estructura_interna';
    if (key.startsWith('incipitdelaprimeraestrofa')) return 'incipit_desarrollo';
    if (key.startsWith('incipitdelascomposiciones') || key.startsWith('incipitdelacomposicion'))
      return 'incipit_interno';
    if (key.startsWith('encasosi') && key.includes('estribillo')) return 'estribillo_entero';
    if (key.startsWith('estribillo'))
      return key.includes('entero') || key.includes('completo')
        ? 'estribillo_entero'
        : 'estribillo';
    if (key.startsWith('transcripcion')) return 'transcripcion';
    if (key === 'testimonioid') return 'testimonio';
  }
}
