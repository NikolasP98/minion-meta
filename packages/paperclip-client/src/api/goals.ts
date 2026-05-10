// VENDORED FROM paperclip-minion/ui/src/api/goals.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClientBase } from '../client.js';
import type { Goal } from '../types/goal.js';

export function goalsApi(client: PaperclipClientBase) {
  return {
    list(companyId: string): Promise<Goal[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/goals` });
    },

    get(id: string): Promise<Goal> {
      return client.request({ method: 'GET', path: `/api/goals/${id}` });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Goal> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/goals`, body: data });
    },

    update(id: string, data: Record<string, unknown>): Promise<Goal> {
      return client.request({ method: 'PATCH', path: `/api/goals/${id}`, body: data });
    },

    remove(id: string): Promise<Goal> {
      return client.request({ method: 'DELETE', path: `/api/goals/${id}` });
    },
  };
}
