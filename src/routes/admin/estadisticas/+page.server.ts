import { consultationStatistics } from '$lib/server/statistics';
export const load = async () => ({ statistics: await consultationStatistics() });
