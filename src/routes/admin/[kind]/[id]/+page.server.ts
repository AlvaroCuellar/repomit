import { citationSection } from '$lib/citations';
import { listForms } from '$lib/server/vocabulary';
import { error, fail, redirect } from '@sveltejs/kit';
import { fields, isKind, type Content } from '$lib/editor/schema';
import {
  getRecord,
  listRecords,
  history,
  saveRecord,
  restoreRecord,
  unpublishRecord,
  deleteRecord,
  sanitizeContent,
  publishManuscript,
  ContentError
} from '$lib/server/content';
function kindOf(kind: string) {
  if (!isKind(kind)) error(404, 'Apartado no encontrado.');
  return kind;
}
export const load = async ({ params, url }) => {
  const kind = kindOf(params.kind);
  const row = await getRecord(params.id);
  if (params.id !== 'nuevo' && (!row || row.kind !== kind)) error(404, 'Ficha no encontrada.');
  const parent = url.searchParams.get('manuscrito') || '';
  const manuscriptId =
    kind === 'poemas' && row ? JSON.parse(row.draft).testimonio_id : row?.id || parent;
  const poems = await listRecords('poemas');
  const occupied = poems.flatMap((p) =>
    [p.draft, p.published].filter(Boolean).map((source) => JSON.parse(source!))
  );
  const nextOrder = (id: string) =>
    Math.max(
      0,
      ...occupied.filter((c) => c.testimonio_id === id).map((c) => Number(c.orden) || 0)
    ) + 1;
  const children = poems
    .filter((r) => JSON.parse(r.draft).testimonio_id === manuscriptId)
    .map((r) => ({
      id: r.id,
      content: JSON.parse(r.draft) as Content,
      published: !!r.published,
      changed: r.draft !== r.published,
      version: r.version
    }))
    .sort((a, b) => Number(a.content.orden) - Number(b.content.orden));
  const content = row
    ? JSON.parse(row.draft)
    : Object.fromEntries(fields[kind].map(([key]) => [key, '']));
  if (!row && kind === 'poemas') {
    content.testimonio_id = parent;
    content.orden = String(nextOrder(parent));
  }
  if (!row && kind === 'textos') {
    content.pagina = 'presentacion';
    if (url.searchParams.get('plantilla') === 'cita') {
      Object.assign(content, citationSection(url.origin));
    }
    content.orden = String(
      Math.max(
        0,
        ...(await listRecords('textos'))
          .flatMap((r) => [r.draft, r.published].filter(Boolean).map((c) => JSON.parse(c!)))
          .filter((c) => c.pagina === 'presentacion')
          .map((c) => Number(c.orden))
      ) + 1
    );
  }
  return {
    kind,
    formas: await listForms(),
    id: params.id,
    content: content as Content,
    version: row?.version || 0,
    published: !!row?.published,
    changed: row?.draft !== row?.published,
    history: row ? await history(row.id) : [],
    childrenVersions: JSON.stringify(
      children
        .map((r) => [r.id, r.version])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    ),
    parents: (await listRecords('testimonios'))
      .map((r) => ({
        id: r.id,
        title: JSON.parse(r.draft).testimonio,
        published: !!r.published,
        nextOrder: nextOrder(r.id)
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true })),
    children,
    saved: url.searchParams.has('guardado'),
    previous: children[children.findIndex((c) => c.id === row?.id) - 1]?.id,
    next:
      kind === 'poemas' && row
        ? children[children.findIndex((c) => c.id === row.id) + 1]?.id
        : undefined
  };
};
async function submit(
  event: Parameters<import('@sveltejs/kit').Action>[0],
  mode: 'draft' | 'publish' | 'next'
) {
  const kind = kindOf(event.params.kind!);
  const form = await event.request.formData();
  const input: Content = {};
  for (const [key] of fields[kind]) input[key] = String(form.get(key) || '');
  let id: string;
  try {
    id = await saveRecord(
      kind,
      event.params.id!,
      input,
      Number(form.get('version')),
      mode === 'publish' ? 'publish' : 'draft',
      `${event.locals.user!.name} <${event.locals.user!.email}>`
    );
  } catch (e) {
    if (e instanceof ContentError)
      return fail(400, { error: e.message, values: sanitizeContent(kind, input) });
    throw e;
  }
  if (mode === 'next' && kind === 'poemas')
    redirect(
      303,
      `/admin/poemas/nuevo?manuscrito=${encodeURIComponent(input.testimonio_id)}&guardado=1`
    );
  if (mode === 'next' && kind === 'testimonios')
    redirect(303, `/admin/poemas/nuevo?manuscrito=${encodeURIComponent(id)}&guardado=1`);
  redirect(303, `/admin/${kind}/${id}?guardado=1`);
}
export const actions = {
  publishAll: async ({ params, request, locals }) => {
    const f = await request.formData();
    try {
      await publishManuscript(
        params.id,
        Number(f.get('version')),
        String(f.get('childrenVersions')),
        `${locals.user!.name} <${locals.user!.email}>`
      );
    } catch (e) {
      if (e instanceof ContentError) return fail(400, { error: e.message });
      throw e;
    }
    redirect(303, `/admin/testimonios/${params.id}?guardado=1`);
  },
  draft: (event) => submit(event, 'draft'),
  publish: (event) => submit(event, 'publish'),
  next: (event) => submit(event, 'next'),
  restore: async ({ params, request, locals }) => {
    const f = await request.formData();
    try {
      await restoreRecord(
        params.id,
        Number(f.get('revision')),
        Number(f.get('version')),
        `${locals.user!.name} <${locals.user!.email}>`
      );
    } catch (e) {
      if (e instanceof ContentError) return fail(400, { error: e.message });
      throw e;
    }
    redirect(303, `/admin/${params.kind}/${params.id}?guardado=1`);
  },
  unpublish: async ({ params, request, locals }) => {
    const f = await request.formData();
    try {
      await unpublishRecord(
        params.id,
        Number(f.get('version')),
        `${locals.user!.name} <${locals.user!.email}>`
      );
    } catch (e) {
      if (e instanceof ContentError) return fail(400, { error: e.message });
      throw e;
    }
    redirect(303, `/admin/${params.kind}/${params.id}?guardado=1`);
  },
  delete: async ({ params, request }) => {
    const f = await request.formData();
    if (f.get('confirmDelete') !== 'on')
      return fail(400, { error: 'Confirma que quieres eliminar esta ficha.' });
    try {
      await deleteRecord(params.id, Number(f.get('version')));
    } catch (e) {
      if (e instanceof ContentError) return fail(400, { error: e.message });
      throw e;
    }
    redirect(303, `/admin?kind=${params.kind}`);
  }
};
