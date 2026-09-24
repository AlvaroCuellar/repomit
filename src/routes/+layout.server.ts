import { visitStatistics } from '$lib/server/visits';
import { publicData } from '$lib/server/content';
export const load = async ({ url, depends }) => {
  depends('repomit:published');
  depends('repomit:visits');
  // Reading pathname makes client navigation refresh the published catalogue.
  const statistics = await visitStatistics().catch(() => null);
  return {
    ...(await publicData()),
    pathname: url.pathname,
    publicStatistics: statistics
      ? { total: statistics.total, firstSeen: statistics.firstSeen }
      : null
  };
};
