import { escapeText, type Poema, type Testimonio } from '../data/repomit.ts';

export const repertoryTitle =
  'RePoMIt. Repertorio de la poesía en castellano en manuscritos italianos';
const repertoryDirector = 'Antonietta Molinaro (dir.)';
const present = (value?: string) => value?.trim() && !['—', '-'].includes(value.trim());

export function recordCitation(
  kind: 'poemas' | 'testimonios',
  record: Poema | Testimonio,
  origin: string,
  consulted: string
) {
  const author = present(record.autores_ficha) ? `${record.autores_ficha.trim()}. ` : '';
  const title = kind === 'poemas'
    ? (record as Poema).incipit
    : `${record.testimonio}: ${(record as Testimonio).ciudad}, ${(record as Testimonio).institucion}, ${(record as Testimonio).signatura}`;
  const item = kind === 'poemas' ? `Ítem ${(record as Poema).item}. ` : '';
  const revision = present(record.fecha_revision)
    ? `Última revisión: ${record.fecha_revision}. `
    : '';
  const url = new URL(`/${kind}/${encodeURIComponent(record.id)}`, origin).href;
  return `${author}«${title}», ${item}en ${repertoryDirector}, ${repertoryTitle}. ${revision}${url} [consulta: ${consulted}].`;
}

/** Editable proposal: actual ficha authors are distinct from the poem's attribution. */
export function citationSection(origin: string) {
  const url = new URL('/', origin).href;
  return {
    pagina: 'presentacion',
    title: 'Cómo citar el repertorio',
    texto: [
      '<p>Para citar el repertorio en su conjunto, se recomienda indicar su título completo, su dirección electrónica y la fecha de consulta:</p>',
      `<p><em>${repertoryTitle}</em>, <a href="${escapeText(url)}">${escapeText(url)}</a> [consulta: día, mes y año].</p>`,
      '<p>Para citar una ficha, se recomienda indicar sus responsables, tal como aparecen en la ficha, el íncipit del poema o la sigla del manuscrito, el título del repertorio, el ítem cuando corresponda, la fecha de última revisión si consta, el enlace directo y la fecha de consulta. Los responsables de la ficha no deben confundirse con el autor al que se atribuye el poema.</p>',
      '<p>Modelo: Apellidos, Nombre [responsable de la ficha], «Íncipit del poema», en <em>RePoMIt. Repertorio de la poesía en castellano en manuscritos italianos</em>, ítem [identificador], última revisión: [fecha], [enlace directo a la ficha] [consulta: día, mes y año]. Si no consta responsable o fecha de revisión, se omite ese dato.</p>',
      '<p>Cada ficha ofrece una propuesta en «Cómo citar esta ficha». Conviene conservar el enlace directo además del ítem: el enlace se mantiene aunque se corrija la sigla del manuscrito. Si se cita específicamente una transcripción, deben reconocerse también sus responsables cuando consten.</p>'
    ].join('')
  };
}
