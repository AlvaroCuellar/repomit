import { acceptsConsultation, isPublicPage } from '$lib/consultation-policy';
import { recordConsultation } from '$lib/server/statistics';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url, locals }) => {
  const empty = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (!acceptsConsultation(request, url.origin, Boolean(locals.user))) return empty();
  if (!request.headers.get('content-type')?.startsWith('text/plain')) return empty();
  if (Number(request.headers.get('content-length') || 0) > 512) return empty();
  const pathname = await request.text();
  if (pathname.length > 200 || !isPublicPage(pathname)) return empty();
  try {
    await recordConsultation();
  } catch {
    // Best-effort aggregate: database outages must not break the public website.
    console.error('No se pudo actualizar el contador de consultas.');
  }
  return empty();
};
