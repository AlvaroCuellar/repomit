import { listRecords, plain } from '$lib/server/content';
import { isKind, titleOf } from '$lib/editor/schema';
export const load = async ({ url }) => {
  const all = await listRecords();
  const kind = isKind(url.searchParams.get('kind') || '')
    ? url.searchParams.get('kind')!
    : 'testimonios';
  const query = (url.searchParams.get('q') || '').trim();
  const searchKey = (text: string) =>
    plain(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/\s+/g, ' ')
      .trim();
  const parent = url.searchParams.get('manuscrito') || '';
  const status = url.searchParams.get('estado') || '';
  const sort =
    url.searchParams.get('ordenar') || (kind === 'poemas' && parent ? 'catalogo' : 'recientes');
  const parentNames = new Map(
    all
      .filter((r) => r.kind === 'testimonios')
      .map((r) => [r.id, JSON.parse(r.draft).testimonio as string])
  );
  const rows = all.map((r) => {
    const c = JSON.parse(r.draft);
    return {
      id: r.id,
      kind: r.kind,
      title: plain(titleOf(r.kind, c)),
      search: searchKey(
        [
          titleOf(r.kind, c),
          r.id,
          parentNames.get(c.testimonio_id) || '',
          c.atribucion || '',
          c.folios || '',
          c.signatura || '',
          c.institucion || ''
        ].join(' ')
      ),
      parent: c.testimonio_id || '',
      order: c.orden || '',
      page: c.pagina || '',
      updated: r.updated_at,
      published: !!r.published,
      changed: r.draft !== r.published,
      transcribed:
        !!plain(c.transcripcion || '').trim() && plain(c.transcripcion || '').trim() !== '—',
      by: r.updated_by
    };
  });
  return {
    kind,
    citationSectionId: all.find((r) => {
      if (r.kind !== 'textos') return false;
      return [r.draft, r.published].filter(Boolean).some((value) => {
        const section = JSON.parse(value!);
        return (
          section.pagina === 'presentacion' && /\bcitar\b/.test(searchKey(section.title || ''))
        );
      });
    })?.id,
    query,
    parent,
    status,
    sort,
    rows: rows
      .filter(
        (r) =>
          r.kind === kind &&
          (!query ||
            searchKey(query)
              .split(' ')
              .every((term) => r.search.includes(term))) &&
          (!parent || r.parent === parent) &&
          (status !== 'draft' || r.changed) &&
          (status !== 'published' || r.published) &&
          (status !== 'untranscribed' || !r.transcribed)
      )
      .sort((a, b) =>
        sort === 'catalogo'
          ? kind === 'poemas'
            ? (parentNames.get(a.parent) || '').localeCompare(
                parentNames.get(b.parent) || '',
                'es',
                { numeric: true }
              ) || Number(a.order) - Number(b.order)
            : a.title.localeCompare(b.title, 'es', { numeric: true })
          : 0
      ),
    counts: {
      poemas: rows.filter((r) => r.kind === 'poemas').length,
      testimonios: rows.filter((r) => r.kind === 'testimonios').length,
      textos: rows.filter((r) => r.kind === 'textos').length
    },
    parents: rows
      .filter((r) => r.kind === 'testimonios')
      .sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true })),
    pending: rows.filter((r) => r.changed).length,
    pendingByKind: {
      testimonios: rows.filter((r) => r.kind === 'testimonios' && r.changed).length,
      poemas: rows.filter((r) => r.kind === 'poemas' && r.changed).length,
      textos: rows.filter((r) => r.kind === 'textos' && r.changed).length
    }
  };
};
