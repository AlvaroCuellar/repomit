import poemasRaw from '../../../data/generated/poemas.json';
import testimoniosRaw from '../../../data/generated/testimonios.json';

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
  search_general: string;
  sort_incipit: string;
  incipit_html: string;
  segundo_verso_html: string;
  explicit_html: string;
  incipit_desarrollo_html: string;
  incipit_interno_html: string;
  estribillo_entero_html: string;
  transcripcion_html: string;
};

export type Testimonio = {
  id: string;
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

export const poemas = poemasRaw as Poema[];
export const testimonios = testimoniosRaw as Testimonio[];

export function getPoema(id: string) {
  return poemas.find((poema) => poema.id === id);
}

export function getTestimonio(id: string) {
  return testimonios.find((testimonio) => testimonio.id === id);
}

export function getTestimoniosByPoema(poemaId: string) {
  const poema = getPoema(poemaId);
  return poema ? testimonios.filter((testimonio) => testimonio.id === poema.testimonio_id) : [];
}

export function getPoemasByTestimonio(testimonioId: string) {
  return poemas.filter((poema) => poema.testimonio_id === testimonioId);
}
