import type { PaperclipClientBase } from '../client.js';
import type { SidebarBadges } from '../types/sidebar-badges.js';

export function sidebarBadgesApi(client: PaperclipClientBase) {
  return {
    get(companyId: string): Promise<SidebarBadges> {
      return client.request<SidebarBadges>({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/sidebar-badges`,
      });
    },
  };
}
