/** Only known public pages can contribute; queries and record IDs are never stored. */
export function isPublicPage(pathname: string): boolean {
  return /^\/(?:presentacion|criterios|como-citar|manuscritos|repertorio|busqueda)?\/?$/.test(pathname) ||
    /^\/(?:poemas|testimonios)\/[^/?#]{1,180}\/?$/.test(pathname);
}

export function acceptsConsultation(request: Request, origin: string, signedIn: boolean): boolean {
  const agent = request.headers.get('user-agent') || '';
  return !signedIn && request.method === 'POST' &&
    request.headers.get('origin') === origin &&
    !/bot|crawler|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp/i.test(agent) &&
    !/prefetch|prerender/i.test(`${request.headers.get('purpose') || ''} ${request.headers.get('sec-purpose') || ''}`);
}
