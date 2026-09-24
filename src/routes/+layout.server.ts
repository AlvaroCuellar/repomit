import { consultationStatistics } from '$lib/server/statistics';
import { publicData } from '$lib/server/content';
export const load = async ({ url, depends }) => {
  depends('repomit:published');
  // Reading pathname makes client navigation refresh the published catalogue.
  const statistics = await consultationStatistics().catch(() => null);
  return {
    ...(await publicData()),
    pathname: url.pathname,
    publicStatistics: statistics
      ? { total: statistics.total, firstSeen: statistics.firstSeen }
      : null
  };
};
