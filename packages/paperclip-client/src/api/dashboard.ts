import type { PaperclipClientBase } from '../client.js';
import type { DashboardSummary } from '../types/dashboard.js';

export function dashboardApi(client: PaperclipClientBase) {
  return {
    summary(companyId: string): Promise<DashboardSummary> {
      return client.request<DashboardSummary>({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/dashboard`,
      });
    },
  };
}
