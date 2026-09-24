export type Kind = 'poemas' | 'testimonios' | 'textos';
export type Content = Record<string, string>;
export const labels: Record<Kind, string> = {
  testimonios: 'Manuscritos',
  poemas: 'Poemas',
  textos: 'Textos de la web'
};
export const fields: Record<Kind, [string, string][]> = {
  poemas: [
    ['testimonio_id', 'Manuscrito'],
    ['orden', 'Orden topográfico'],
    ['folios', 'Folios / páginas'],
    ['incipit', 'Íncipit'],
    ['segundo_verso', 'Segundo verso'],
    ['explicit', 'Éxplicit'],
    ['epigrafe', 'Epígrafe'],
    ['atribucion', 'Atribución'],
    ['forma', 'Forma métrico-poética'],
    ['esquema_metrico', 'Esquema métrico'],
    ['estructura_cabeza', '¿Tiene estrofas de desarrollo?'],
    ['incipit_desarrollo', 'Íncipit del desarrollo'],
    ['estructura_interna', '¿Tiene composiciones internas?'],
    ['incipit_interno', 'Íncipit interno'],
    ['estribillo', '¿Tiene estribillo?'],
    ['estribillo_entero', 'Estribillo completo'],
    ['transcripcion', 'Transcripción'],
    ['autores_ficha', 'Responsables de la ficha'],
    ['autores_transcripcion', 'Responsables de la transcripción']
  ],
  testimonios: [
    ['testimonio', 'Sigla del manuscrito'],
    ['ciudad', 'Ciudad'],
    ['institucion', 'Institución'],
    ['signatura', 'Signatura'],
    ['recopilador', 'Recopilador'],
    ['fecha', 'Fecha'],
    ['enlace', 'Enlace al manuscrito'],
    ['bibliografia', 'Bibliografía'],
    ['autores_ficha', 'Responsables de la ficha']
  ],
  textos: [
    ['pagina', 'Página'],
    ['orden', 'Orden de la sección'],
    ['title', 'Título'],
    ['texto', 'Texto']
  ]
};
export const richFields = new Set([
  'incipit',
  'segundo_verso',
  'explicit',
  'esquema_metrico',
  'incipit_desarrollo',
  'incipit_interno',
  'estribillo_entero',
  'transcripcion',
  'bibliografia',
  'texto'
]);
export const longFields = new Set([
  ...richFields,
  'epigrafe',
  'atribucion',
  'autores_ficha',
  'autores_transcripcion'
]);
export const conditions: Record<string, string> = {
  estructura_cabeza: 'incipit_desarrollo',
  estructura_interna: 'incipit_interno',
  estribillo: 'estribillo_entero'
};
export function isKind(value: string): value is Kind {
  return Object.hasOwn(fields, value);
}
export function titleOf(kind: Kind, content: Content) {
  return (
    content.incipit ||
    content.testimonio ||
    content.title ||
    (kind === 'textos' ? content.pagina : '') ||
    'Sin título'
  );
}
export const formas = [
  'canción (otras formas)',
  'canción en arte menor',
  'canción en arte mayor',
  'canción petrarquista',
  'estribote',
  'glosa',
  'letra/mote',
  'madrigal',
  'octava real',
  'ovillejo',
  'pareados',
  'polimetría',
  'sextina',
  'soneto',
  'silva',
  'tercetos encadenados',
  'romance',
  'romancillo',
  'romance/romancillo con desfecha',
  'villancico'
];
export const help: Record<string, string> = {
  testimonio:
    'Ejemplo: NaNB V.A.16. Al publicar una corrección de sigla, se actualiza en todos sus poemas sin cambiar los enlaces.',
  orden:
    'Respeta la posición original. Se permiten saltos de numeración por composiciones en otras lenguas.',
  folios:
    'Ejemplos: 3v-5r, 6rv o [3r-4v]. Sin f., fol. ni p. Conserva los corchetes de las conjeturas.',
  incipit:
    'Primer verso con inicial mayúscula y ortografía modernizada. Conserva las particularidades con valor métrico.',
  segundo_verso:
    'Segundo verso conforme a los criterios de transcripción. No fuerces la mayúscula inicial.',
  explicit:
    'Último verso de la composición completa. Usa corchetes para las reconstrucciones por conjetura.',
  epigrafe: 'Transcribe el epígrafe completo. Si no existe, utiliza [anepígrafo].',
  atribucion:
    'Apellidos, Nombre. Entre corchetes si procede de estudios: [Góngora y Argote, Luis de]. Separa varias atribuciones con ;. Si no consta, [anónimo].',
  esquema_metrico:
    'Ejemplo: ABBAABBACDECDE (14). Puedes poner en cursiva el estribillo o los versos de cita de una glosa.',
  incipit_interno:
    'Si hay varias composiciones, separa sus íncipits con una barra vertical: verso | verso.',
  estribillo_entero:
    'Separa los versos con / y las variantes significativas con |. Usa corchetes para reconstrucciones.',
  autores_ficha:
    'Apellidos, Nombre. Separa varias personas con punto y coma. La fecha de revisión se actualiza al publicar.',
  transcripcion:
    'Facultativa. Conserva los saltos de verso, las estrofas y las cursivas. Se puede añadir o completar más adelante.',
  bibliografia:
    'Añade las fuentes de catalogación y los estudios que justifican las atribuciones. Indica aquí si se ha utilizado una edición moderna.',
  fecha: 'Texto libre para respetar las dataciones: siglo XVII, ca. 1620 o [1600-1650].',
  texto:
    'Escribe y da formato directamente. Puedes pegar texto, añadir párrafos, cursivas, negritas y enlaces.'
};
export const groups: Record<Kind, { title: string; keys: string[] }[]> = {
  poemas: [
    { title: '1. Localización en el manuscrito', keys: ['testimonio_id', 'orden', 'folios'] },
    {
      title: '2. Identificación del poema',
      keys: ['incipit', 'segundo_verso', 'explicit', 'epigrafe', 'atribucion']
    },
    {
      title: '3. Forma y estructura',
      keys: [
        'forma',
        'esquema_metrico',
        'estructura_cabeza',
        'incipit_desarrollo',
        'estructura_interna',
        'incipit_interno',
        'estribillo',
        'estribillo_entero'
      ]
    },
    {
      title: '4. Transcripción y responsables',
      keys: ['transcripcion', 'autores_transcripcion', 'autores_ficha']
    }
  ],
  testimonios: [
    {
      title: '1. Identificación del manuscrito',
      keys: ['testimonio', 'ciudad', 'institucion', 'signatura']
    },
    {
      title: '2. Descripción y fuentes',
      keys: ['recopilador', 'fecha', 'enlace', 'bibliografia', 'autores_ficha']
    }
  ],
  textos: [{ title: 'Sección de la web', keys: ['pagina', 'orden', 'title', 'texto'] }]
};
