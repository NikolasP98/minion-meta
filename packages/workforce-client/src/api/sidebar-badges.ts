import type { WorkforceClientBase } from '../client.js';
import type { SidebarBadges } from '../types/sidebar-badges.js';

export function sidebarBadgesApi(client: WorkforceClientBase) {
  return {
    get(companyId: string): Promise<SidebarBadges> {
      return client.request<SidebarBadges>({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/sidebar-badges`,
      });
    },
  };
}
