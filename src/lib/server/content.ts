import sanitizeHtml from 'sanitize-html';
import { decodeHTML } from 'entities';
import { randomUUID } from 'node:crypto';
import { all, one, run, transaction } from './database.ts';
import { findForm } from './vocabulary.ts';
import { fields, richFields, conditions, type Content, type Kind } from '../editor/schema.ts';
import type { Poema, Testimonio, SiteContent } from '../data/repomit';

export function cleanHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ['em', 'strong', 'br', 'a', 'p', 'ul', 'ol', 'li', 'sup', 'sub'],
    transformTags: { i: 'em', b: 'strong', div: 'p' },
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false
  });
}
export function plain(value: string): string {
  return decodeHTML(
    sanitizeHtml(value.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div)>/gi, '\n'), {
      allowedTags: [],
      allowedAttributes: {}
    })
  );
}
export function normalized(value: string): string {
  return plain(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export type RecordRow = {
  id: string;
  kind: Kind;
  draft: string;
  published: string | null;
  version: number;
  updated_at: string;
  updated_by: string;
};
export async function listRecords(kind?: Kind): Promise<RecordRow[]> {
  return kind
    ? all<RecordRow>('SELECT * FROM records WHERE kind=$1 ORDER BY updated_at DESC,id', [kind])
    : all<RecordRow>('SELECT * FROM records ORDER BY updated_at DESC,id');
}
export async function getRecord(id: string): Promise<RecordRow | undefined> {
  return one<RecordRow>('SELECT * FROM records WHERE id=$1', [id]);
}
export async function history(id: string) {
  return all<{ id: number; action: string; author: string; created_at: string }>(
    'SELECT id,action,author,created_at FROM history WHERE record_id=$1 ORDER BY id DESC',
    [id]
  );
}
export class ContentError extends Error {}
export function sanitizeContent(kind: Kind, input: Content): Content {
  const result: Content = {};
  for (const [key] of fields[kind]) {
    const value = String(input[key] ?? '').trim();
    if (value.length > 200000)
      throw new ContentError('Un campo supera el límite de 200.000 caracteres.');
    result[key] = richFields.has(key) ? cleanHtml(value) : value;
  }
  return result;
}
async function validate(kind: Kind, id: string, value: Content, publishing: boolean) {
  const required =
    kind === 'poemas'
      ? publishing
        ? ['incipit', 'testimonio_id', 'orden', 'forma']
        : ['incipit', 'testimonio_id', 'orden']
      : kind === 'testimonios'
        ? publishing
          ? ['testimonio', 'ciudad', 'institucion', 'signatura']
          : ['testimonio']
        : ['pagina', 'orden', 'texto'];
  for (const key of required)
    if (!plain(value[key] || '').trim())
      throw new ContentError(`Completa el campo «${fields[kind].find((f) => f[0] === key)?.[1]}».`);
  if (kind === 'poemas' || kind === 'textos') {
    if (!/^[1-9]\d{0,5}$/.test(value.orden))
      throw new ContentError('El orden debe ser un número entero entre 1 y 999999.');
  }
  if (kind === 'poemas') {
    const parent = await getRecord(value.testimonio_id);
    if (!parent || parent.kind !== 'testimonios')
      throw new ContentError('Selecciona un manuscrito existente.');
    if (publishing && !parent.published)
      throw new ContentError('Publica primero el manuscrito de esta ficha.');
    for (const row of (await listRecords('poemas')).filter((r) => r.id !== id)) {
      for (const source of [row.draft, row.published].filter(Boolean)) {
        const other = JSON.parse(source!);
        if (
          other.testimonio_id === value.testimonio_id &&
          Number(other.orden) === Number(value.orden)
        )
          throw new ContentError('Este número de orden ya existe en el manuscrito.');
      }
    }
    if (
      value.forma &&
      value.forma !== '—' &&
      !(await findForm(value.forma)) &&
      JSON.parse((await getRecord(id))?.draft || '{}').forma !== value.forma
    )
      throw new ContentError('Selecciona una forma del vocabulario del repertorio.');
    for (const [flag, dependent] of Object.entries(conditions)) {
      if (!['', 'sí', 'no', '—'].includes(value[flag]))
        throw new ContentError('Selecciona Sí, No o Sin determinar en los campos de estructura.');
      if (publishing && value[flag] === 'sí' && !plain(value[dependent]).trim())
        throw new ContentError(
          `Completa «${fields[kind].find((f) => f[0] === dependent)?.[1]}» o corrige la estructura.`
        );
      if (
        publishing &&
        value[flag] === 'no' &&
        plain(value[dependent]).trim() &&
        value[dependent] !== '—'
      )
        throw new ContentError(
          `Hay texto en «${fields[kind].find((f) => f[0] === dependent)?.[1]}», pero has seleccionado No.`
        );
    }
  }
  if (kind === 'testimonios') {
    if (value.enlace && value.enlace !== '—' && !/^https?:\/\/[^\s]+$/i.test(value.enlace))
      throw new ContentError('El enlace debe comenzar por https:// o http://.');
    for (const row of (await listRecords('testimonios')).filter((r) => r.id !== id)) {
      for (const source of [row.draft, row.published].filter(Boolean))
        if (normalized(JSON.parse(source!).testimonio) === normalized(value.testimonio))
          throw new ContentError('Ya existe un manuscrito con esta sigla.');
    }
  }
  if (kind === 'textos') {
    if (!['home', 'manuscritos', 'presentacion', 'criterios'].includes(value.pagina))
      throw new ContentError('Selecciona una página válida.');
    if (value.pagina === 'manuscritos' && Number(value.orden) > 3)
      throw new ContentError(
        'Manuscritos tiene tres bloques: introducción (1), título del mapa (2) y descripción del mapa (3).'
      );
    for (const row of (await listRecords('textos')).filter((r) => r.id !== id))
      for (const source of [row.draft, row.published].filter(Boolean)) {
        const other = JSON.parse(source!);
        if (other.pagina === value.pagina && Number(other.orden) === Number(value.orden))
          throw new ContentError('Ya existe una sección en esa posición de la página.');
      }
  }
}
export async function saveRecord(
  kind: Kind,
  id: string,
  input: Content,
  version: number,
  action: 'draft' | 'publish',
  author: string
) {
  return transaction(async () => {
    const existing = await getRecord(id);
    if (existing && existing.kind !== kind)
      throw new ContentError('La ficha pertenece a otro apartado.');
    if ((existing?.version ?? 0) !== version)
      throw new ContentError(
        'Otra persona ha cambiado esta ficha. Recarga la página antes de guardar; copia tus cambios para no perderlos.'
      );
    const draft = sanitizeContent(kind, input);
    if (kind === 'poemas' && draft.forma)
      draft.forma = (await findForm(draft.forma)) || draft.forma;
    await validate(kind, id, draft, action === 'publish');
    const date = new Date().toISOString();
    const old = JSON.parse(existing?.draft || '{}');
    if (kind !== 'textos') {
      draft.fecha_creacion = existing ? old.fecha_creacion || '' : date.slice(0, 10);
      draft.fecha_revision =
        action === 'publish'
          ? new Date().toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })
          : old.fecha_revision || '';
    }
    const json = JSON.stringify(draft);
    const recordId = existing?.id || (id === 'nuevo' ? randomUUID() : id);
    await run(
      `INSERT INTO records(id,kind,draft,published,version,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7)
   ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,published=excluded.published,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by`,
      [
        recordId,
        kind,
        json,
        action === 'publish' ? json : (existing?.published ?? null),
        version + 1,
        date,
        author
      ]
    );
    await run(
      'INSERT INTO history(record_id,content,action,author,created_at) VALUES($1,$2,$3,$4,$5)',
      [recordId, json, action === 'publish' ? 'Publicación' : 'Borrador', author, date]
    );
    return recordId;
  });
}
export async function restoreRecord(id: string, revision: number, version: number, author: string) {
  const row = await getRecord(id);
  const previous = await one<{ content: string }>(
    'SELECT content FROM history WHERE id=$1 AND record_id=$2',
    [revision, id]
  );
  if (!row || !previous) throw new ContentError('No se encuentra esa versión.');
  return saveRecord(row.kind, id, JSON.parse(previous.content), version, 'draft', author);
}
export function unpublishRecord(id: string, version: number, author: string) {
  return transaction(async () => {
    const row = await getRecord(id);
    if (!row || row.version !== version)
      throw new ContentError('La ficha ha cambiado. Recarga la página.');
    if (
      row.kind === 'testimonios' &&
      (await listRecords('poemas')).some(
        (p) => p.published && JSON.parse(p.published).testimonio_id === id
      )
    )
      throw new ContentError('Retira primero los poemas publicados de este manuscrito.');
    await run(
      'UPDATE records SET published=NULL,version=version+1,updated_at=$1,updated_by=$2 WHERE id=$3',
      [new Date().toISOString(), author, id]
    );
    await run(
      'INSERT INTO history(record_id,content,action,author,created_at) VALUES($1,$2,$3,$4,$5)',
      [id, row.draft, 'Retirada de publicación', author, new Date().toISOString()]
    );
  });
}

export function deleteRecord(id: string, version: number) {
  return transaction(async () => {
    const row = await getRecord(id);
    if (!row || row.version !== version)
      throw new ContentError('La ficha ha cambiado. Recarga la página antes de eliminarla.');
    if (row.published)
      throw new ContentError('Retira primero esta ficha de la web pública.');
    const ids = [id];
    if (row.kind === 'testimonios') {
      const children = (await listRecords('poemas')).filter(
        (poem) => JSON.parse(poem.draft).testimonio_id === id
      );
      if (children.some((poem) => poem.published))
        throw new ContentError('Retira primero los poemas publicados de este manuscrito.');
      ids.push(...children.map((poem) => poem.id));
    }
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    await run(`DELETE FROM history WHERE record_id IN (${placeholders})`, ids);
    await run(`DELETE FROM records WHERE id IN (${placeholders})`, ids);
    return { kind: row.kind, deleted: ids.length };
  });
}
export async function publicData(preview?: { kind: Kind; id: string; content: Content }) {
  const rows = await listRecords();
  if (preview?.kind === 'poemas') {
    const parent = rows.find((r) => r.id === preview.content.testimonio_id);
    if (parent && !parent.published) parent.published = parent.draft;
  }
  if (preview?.kind === 'testimonios')
    for (const row of rows) {
      if (row.kind === 'poemas' && JSON.parse(row.draft).testimonio_id === preview.id)
        row.published = row.draft;
    }
  const contents = (kind: Kind) =>
    rows
      .filter((r) => r.kind === kind && (r.published || preview?.id === r.id))
      .map((r) => ({
        id: r.id,
        ...JSON.parse(preview?.id === r.id ? JSON.stringify(preview.content) : r.published!)
      })) as (Content & { id: string })[];
  if (preview && !rows.some((r) => r.id === preview.id))
    rows.push({
      id: preview.id,
      kind: preview.kind,
      draft: JSON.stringify(preview.content),
      published: null,
      version: 0,
      updated_at: '',
      updated_by: ''
    });
  const testimonios = contents('testimonios').map((t) => ({
    ...t,
    source_file: '',
    source_row: 0,
    contenido: '',
    contenido_html: '',
    bibliografia_html: cleanHtml(t.bibliografia).replace(/\n/g, '<br>'),
    bibliografia: plain(t.bibliografia)
  })) as unknown as Testimonio[];
  const parents = new Map(testimonios.map((t) => [t.id, t]));
  const poemas = contents('poemas')
    .filter((p) => parents.has(p.testimonio_id))
    .map((p) => {
      const result: Record<string, unknown> = { ...p, source_file: '', source_row: 0 };
      for (const [key] of fields.poemas)
        if (richFields.has(key)) {
          result[key + '_html'] = cleanHtml(p[key] || '').replace(/\n/g, '<br>');
          result[key] = plain(p[key] || '');
        }
      result.testimonio = parents.get(p.testimonio_id)!.testimonio;
      result.testimonio_original = result.testimonio;
      result.item = `${result.testimonio}-${p.orden}`;
      result.title = result.incipit;
      result.sort_incipit = normalized(p.incipit);
      result.search_incipit = normalized(p.incipit);
      result.search_verso = normalized(
        [
          p.incipit,
          p.segundo_verso,
          p.explicit,
          p.incipit_desarrollo,
          p.incipit_interno,
          p.estribillo_entero,
          p.transcripcion
        ].join(' ')
      );
      result.search_autor = normalized([p.epigrafe, p.atribucion].join(' '));
      result.search_epigrafe = normalized(p.epigrafe);
      result.search_estribillo = normalized(p.estribillo_entero);
      result.search_general = normalized(Object.values(p).join(' '));
      return result;
    }) as unknown as Poema[];
  const texts = contents('textos').sort((a, b) => Number(a.orden) - Number(b.orden));
  const page = (name: string) => texts.filter((t) => t.pagina === name);
  const manuscript = page('manuscritos');
  const site: SiteContent = {
    home: { intro: page('home').map((t) => cleanHtml(t.texto)) },
    manuscritos: {
      intro: cleanHtml(manuscript.find((t) => t.orden === '1')?.texto || ''),
      mapTitle: plain(manuscript.find((t) => t.orden === '2')?.texto || ''),
      mapDescription: cleanHtml(manuscript.find((t) => t.orden === '3')?.texto || '')
    },
    presentacion: [],
    criterios: []
  };
  for (const name of ['presentacion', 'criterios'] as const)
    site[name] = page(name).map((t) => ({
      key: t.id,
      title: t.title,
      paragraphs: [cleanHtml(t.texto).replace(/\n/g, '<br>')]
    }));
  return { poemas, testimonios, site };
}

export function publishManuscript(
  id: string,
  version: number,
  childrenVersions: string,
  author: string
) {
  return transaction(async () => {
    const row = await getRecord(id);
    if (!row || row.kind !== 'testimonios' || row.version !== version)
      throw new ContentError('La ficha del manuscrito ha cambiado. Recarga la página.');
    const children = (await listRecords('poemas')).filter(
      (r) => JSON.parse(r.draft).testimonio_id === id
    );
    const snapshot = JSON.stringify(
      children
        .map((r) => [r.id, r.version])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    );
    if (snapshot !== childrenVersions)
      throw new ContentError(
        'Los poemas han cambiado desde que abriste esta página. Recarga y revisa el conjunto antes de publicar.'
      );
    await saveRecord('testimonios', id, JSON.parse(row.draft), version, 'publish', author);
    for (const child of children) {
      try {
        await saveRecord(
          'poemas',
          child.id,
          JSON.parse(child.draft),
          child.version,
          'publish',
          author
        );
      } catch (e) {
        if (e instanceof ContentError)
          throw new ContentError(
            `Poema ${JSON.parse(child.draft).orden}: ${e.message} No se ha publicado ningún cambio del conjunto.`
          );
        throw e;
      }
    }
  });
}
