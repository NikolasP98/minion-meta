// VENDORED FROM paperclip-minion/ui/src/api/approvals.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type { Approval, ApprovalComment } from '../types/approval.js';
import type { Issue } from '../types/issue.js';

export function approvalsApi(client: PaperclipClient) {
  return {
    list(companyId: string, status?: string): Promise<Approval[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/approvals`,
        query: status ? { status } : undefined,
      });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Approval> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/approvals`, body: data });
    },

    get(id: string): Promise<Approval> {
      return client.request({ method: 'GET', path: `/api/approvals/${id}` });
    },

    approve(id: string, decisionNote?: string): Promise<Approval> {
      return client.request({ method: 'POST', path: `/api/approvals/${id}/approve`, body: { decisionNote } });
    },

    reject(id: string, decisionNote?: string): Promise<Approval> {
      return client.request({ method: 'POST', path: `/api/approvals/${id}/reject`, body: { decisionNote } });
    },

    requestRevision(id: string, decisionNote?: string): Promise<Approval> {
      return client.request({ method: 'POST', path: `/api/approvals/${id}/request-revision`, body: { decisionNote } });
    },

    resubmit(id: string, payload?: Record<string, unknown>): Promise<Approval> {
      return client.request({ method: 'POST', path: `/api/approvals/${id}/resubmit`, body: { payload } });
    },

    listComments(id: string): Promise<ApprovalComment[]> {
      return client.request({ method: 'GET', path: `/api/approvals/${id}/comments` });
    },

    addComment(id: string, body: string): Promise<ApprovalComment> {
      return client.request({ method: 'POST', path: `/api/approvals/${id}/comments`, body: { body } });
    },

    listIssues(id: string): Promise<Issue[]> {
      return client.request({ method: 'GET', path: `/api/approvals/${id}/issues` });
    },
  };
}
