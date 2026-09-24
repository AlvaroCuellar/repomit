import { consultationStatistics } from '$lib/server/statistics';
import { visitStatistics } from '$lib/server/visits';
export const load = async () => ({ statistics: await consultationStatistics(), visits: await visitStatistics() });
