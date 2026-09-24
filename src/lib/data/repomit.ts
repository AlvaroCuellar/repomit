export type Poema = {
  id: string;
  item: string;
  item_original?: string;
  title: string;
  testimonio_id: string;
  fecha_creacion?: string;
  fecha_revision?: string;
  source_file: string;
  source_row: number;
  incipit: string;
  segundo_verso: string;
  explicit: string;
  testimonio: string;
  testimonio_original: string;
  orden: string;
  folios: string;
  epigrafe: string;
  atribucion: string;
  forma: string;
  esquema_metrico: string;
  estructura_cabeza: string;
  incipit_desarrollo: string;
  estructura_interna: string;
  incipit_interno: string;
  estribillo: string;
  estribillo_entero: string;
  autores_ficha: string;
  transcripcion: string;
  autores_transcripcion: string;
  search_incipit: string;
  search_verso: string;
  search_autor: string;
  search_epigrafe: string;
  search_estribillo: string;
  search_general: string;
  sort_incipit: string;
  incipit_html: string;
  segundo_verso_html: string;
  explicit_html: string;
  esquema_metrico_html: string;
  incipit_desarrollo_html: string;
  incipit_interno_html: string;
  estribillo_entero_html: string;
  transcripcion_html: string;
};

export type Testimonio = {
  id: string;
  fecha_revision?: string;
  source_file: string;
  source_row: number;
  testimonio: string;
  ciudad: string;
  institucion: string;
  signatura: string;
  recopilador: string;
  fecha: string;
  contenido: string;
  enlace: string;
  bibliografia: string;
  autores_ficha: string;
  contenido_html: string;
  bibliografia_html: string;
};

export type SiteSection = {
  key: string;
  title: string;
  paragraphs: string[];
};

export type SiteContent = {
  home: {
    intro: string[];
  };
  manuscritos: {
    intro: string;
    mapTitle: string;
    mapDescription: string;
  };
  presentacion: SiteSection[];
  criterios: SiteSection[];
};

export function resolveRecordId(id: string) {
  const previousId = 'rolc-44a16', currentId = 'rolc-625';
  return id === previousId || id.startsWith(`${previousId}-`) ? `${currentId}${id.slice(previousId.length)}` : id;
}

export function escapeText(value: string | undefined) { return (value ?? '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
