import { fail, redirect, error } from '@sveltejs/kit';
import {
  parseExcel,
  stageImport,
  getImport,
  commitImport,
  ImportError,
  recentImports
} from '$lib/server/import-excel';
import { listRecords } from '$lib/server/content';
import { MAX_IMPORT_BYTES } from '$lib/editor/import-schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const id = url.searchParams.get('lote');
  const batch = id ? await getImport(id, locals.user!.id) : null;
  if (id && !batch) error(404, 'Vista previa no encontrada para esta cuenta.');
  const parents = (await listRecords('testimonios')).map((r) => ({
    id: r.id,
    title: JSON.parse(r.draft).testimonio
  }));
  return { batch, parents, recent: await recentImports(locals.user!.id) };
};
async function limitedForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ImportError('Selecciona un archivo.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMPORT_BYTES + 1024 * 1024) {
        await reader.cancel();
        throw new ImportError('El archivo supera el límite de 5 MB.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = Buffer.concat(chunks);
  try {
    return await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body
    }).formData();
  } catch {
    throw new ImportError('No se ha podido leer el archivo adjunto. Selecciónalo de nuevo.');
  }
}
export const actions: Actions = {
  analyze: async ({ request, locals }) => {
    let id: string;
    try {
      const data = await limitedForm(request);
      const file = data.get('archivo');
      if (!(file instanceof File)) throw new ImportError('Selecciona un archivo Excel .xlsx.');
      if (file.size > MAX_IMPORT_BYTES)
        throw new ImportError('El archivo supera el límite de 5 MB.');
      const parsed = await parseExcel(Buffer.from(await file.arrayBuffer()), file.name);
      id = await stageImport(parsed, file.name, locals.user!.id);
    } catch (e) {
      if (e instanceof ImportError) return fail(400, { error: e.message });
      throw e;
    }
    redirect(303, `/admin/importar?lote=${id}`);
  },
  confirm: async ({ request, locals }) => {
    const data = await request.formData();
    const id = String(data.get('lote') || '');
    if (data.get('revisado') !== 'on')
      return fail(400, {
        error: 'Confirma que has revisado las fichas y los avisos de la vista previa.'
      });
    try {
      await commitImport(
        id,
        locals.user!.id,
        `${locals.user!.name} <${locals.user!.email}>`,
        data.get('formas') === 'on'
      );
    } catch (e) {
      if (e instanceof ImportError) return fail(409, { error: e.message });
      throw e;
    }
    redirect(303, `/admin/importar?lote=${id}`);
  }
};
