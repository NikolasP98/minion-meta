import type { PaperclipClient } from '../client.js';
import type { SidebarBadges } from '../types/sidebar-badges.js';

export function sidebarBadgesApi(client: PaperclipClient) {
  return {
    get(companyId: string): Promise<SidebarBadges> {
      return client.request<SidebarBadges>({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/sidebar-badges`,
      });
    },
  };
}
