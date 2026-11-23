import { publicVisitStatistics } from '$lib/server/visits';
import { publicData } from '$lib/server/content';
import { error } from '@sveltejs/kit';
export const load = async ({ url, depends }) => {
  depends('repomit:published');
  depends('repomit:visits');
  // Reading pathname makes client navigation refresh the published catalogue.
  let catalogue;
  try {
    catalogue = await publicData();
  } catch {
    error(503, 'El repertorio no está disponible temporalmente. Vuelve a intentarlo más tarde.');
  }
  const statistics = await publicVisitStatistics().catch(() => null);
  return {
    ...catalogue,
    pathname: url.pathname,
    publicStatistics: statistics
      ? { total: statistics.total, firstSeen: statistics.firstSeen }
      : null
  };
};
