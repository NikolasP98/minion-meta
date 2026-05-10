// VENDORED FROM paperclip-minion/ui/src/api/inboxDismissals.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type { InboxDismissal } from '../types/inbox-dismissal.js';

export function inboxDismissalsApi(client: PaperclipClient) {
  return {
    list(companyId: string): Promise<InboxDismissal[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/inbox-dismissals` });
    },

    dismiss(companyId: string, itemKey: string): Promise<InboxDismissal> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${companyId}/inbox-dismissals`,
        body: { itemKey },
      });
    },
  };
}
