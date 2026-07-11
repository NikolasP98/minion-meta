// VENDORED FROM paperclip-minion/ui/src/api/issues.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type {
  Issue,
  IssueComment,
  IssueLabel,
  IssueDocument,
  IssueDocumentSummary,
  IssueAttachment,
  IssueWorkProduct,
  IssueExecutionDecision,
  DocumentRevision,
  UpsertIssueDocument,
  FeedbackVote,
  FeedbackTrace,
  FeedbackTargetType,
} from '../types/issue.js';
import type { Approval } from '../types/approval.js';

export type IssueUpdateResponse = Issue & { comment?: IssueComment | null };

export function issuesApi(client: WorkforceClientBase) {
  return {
    list(
      companyId: string,
      filters?: {
        status?: string;
        projectId?: string;
        parentId?: string;
        assigneeAgentId?: string;
        participantAgentId?: string;
        assigneeUserId?: string;
        touchedByUserId?: string;
        inboxArchivedByUserId?: string;
        unreadForUserId?: string;
        labelId?: string;
        executionWorkspaceId?: string;
        originKind?: string;
        originId?: string;
        includeRoutineExecutions?: boolean;
        q?: string;
        limit?: number;
      },
    ): Promise<Issue[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/issues`,
        query: {
          status: filters?.status,
          projectId: filters?.projectId,
          parentId: filters?.parentId,
          assigneeAgentId: filters?.assigneeAgentId,
          participantAgentId: filters?.participantAgentId,
          assigneeUserId: filters?.assigneeUserId,
          touchedByUserId: filters?.touchedByUserId,
          inboxArchivedByUserId: filters?.inboxArchivedByUserId,
          unreadForUserId: filters?.unreadForUserId,
          labelId: filters?.labelId,
          executionWorkspaceId: filters?.executionWorkspaceId,
          originKind: filters?.originKind,
          originId: filters?.originId,
          includeRoutineExecutions: filters?.includeRoutineExecutions,
          q: filters?.q,
          limit: filters?.limit,
        },
      });
    },

    listLabels(companyId: string): Promise<IssueLabel[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/labels` });
    },

    createLabel(companyId: string, data: { name: string; color: string }): Promise<IssueLabel> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/labels`, body: data });
    },

    deleteLabel(id: string): Promise<IssueLabel> {
      return client.request({ method: 'DELETE', path: `/api/labels/${id}` });
    },

    get(id: string): Promise<Issue> {
      return client.request({ method: 'GET', path: `/api/issues/${id}` });
    },

    markRead(id: string): Promise<{ id: string; lastReadAt: Date }> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/read`, body: {} });
    },

    markUnread(id: string): Promise<{ id: string; removed: boolean }> {
      return client.request({ method: 'DELETE', path: `/api/issues/${id}/read` });
    },

    archiveFromInbox(id: string): Promise<{ id: string; archivedAt: Date }> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/inbox-archive`, body: {} });
    },

    unarchiveFromInbox(id: string): Promise<{ id: string; archivedAt: Date } | { ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/issues/${id}/inbox-archive` });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Issue> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/issues`, body: data });
    },

    update(id: string, data: Record<string, unknown>): Promise<IssueUpdateResponse> {
      return client.request({ method: 'PATCH', path: `/api/issues/${id}`, body: data });
    },

    remove(id: string): Promise<Issue> {
      return client.request({ method: 'DELETE', path: `/api/issues/${id}` });
    },

    checkout(id: string, agentId: string): Promise<Issue> {
      return client.request({
        method: 'POST',
        path: `/api/issues/${id}/checkout`,
        body: { agentId, expectedStatuses: ['todo', 'backlog', 'blocked', 'in_review'] },
      });
    },

    release(id: string): Promise<Issue> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/release`, body: {} });
    },

    listComments(
      id: string,
      filters?: { after?: string; order?: 'asc' | 'desc'; limit?: number },
    ): Promise<IssueComment[]> {
      return client.request({
        method: 'GET',
        path: `/api/issues/${id}/comments`,
        query: { after: filters?.after, order: filters?.order, limit: filters?.limit },
      });
    },

    listFeedbackVotes(id: string): Promise<FeedbackVote[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/feedback-votes` });
    },

    listFeedbackTraces(id: string, filters?: Record<string, string | boolean | undefined>): Promise<FeedbackTrace[]> {
      return client.request({
        method: 'GET',
        path: `/api/issues/${id}/feedback-traces`,
        query: filters as Record<string, string | number | boolean | undefined>,
      });
    },

    upsertFeedbackVote(
      id: string,
      data: {
        targetType: FeedbackTargetType;
        targetId: string;
        vote: 'up' | 'down';
        reason?: string;
        allowSharing?: boolean;
      },
    ): Promise<FeedbackVote> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/feedback-votes`, body: data });
    },

    addComment(id: string, body: string, reopen?: boolean, interrupt?: boolean): Promise<IssueComment> {
      return client.request({
        method: 'POST',
        path: `/api/issues/${id}/comments`,
        body: {
          body,
          ...(reopen === undefined ? {} : { reopen }),
          ...(interrupt === undefined ? {} : { interrupt }),
        },
      });
    },

    listDocuments(id: string): Promise<IssueDocumentSummary[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/documents` });
    },

    getDocument(id: string, key: string): Promise<IssueDocument> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/documents/${encodeURIComponent(key)}` });
    },

    upsertDocument(id: string, key: string, data: UpsertIssueDocument): Promise<IssueDocument> {
      return client.request({ method: 'PUT', path: `/api/issues/${id}/documents/${encodeURIComponent(key)}`, body: data });
    },

    listDocumentRevisions(id: string, key: string): Promise<DocumentRevision[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/documents/${encodeURIComponent(key)}/revisions` });
    },

    restoreDocumentRevision(id: string, key: string, revisionId: string): Promise<IssueDocument> {
      return client.request({
        method: 'POST',
        path: `/api/issues/${id}/documents/${encodeURIComponent(key)}/revisions/${revisionId}/restore`,
        body: {},
      });
    },

    deleteDocument(id: string, key: string): Promise<{ ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/issues/${id}/documents/${encodeURIComponent(key)}` });
    },

    listAttachments(id: string): Promise<IssueAttachment[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/attachments` });
    },

    deleteAttachment(id: string): Promise<{ ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/attachments/${id}` });
    },

    listExecutionDecisions(id: string): Promise<IssueExecutionDecision[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/execution-decisions` });
    },

    listApprovals(id: string): Promise<Approval[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/approvals` });
    },

    linkApproval(id: string, approvalId: string): Promise<Approval[]> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/approvals`, body: { approvalId } });
    },

    unlinkApproval(id: string, approvalId: string): Promise<{ ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/issues/${id}/approvals/${approvalId}` });
    },

    listWorkProducts(id: string): Promise<IssueWorkProduct[]> {
      return client.request({ method: 'GET', path: `/api/issues/${id}/work-products` });
    },

    createWorkProduct(id: string, data: Record<string, unknown>): Promise<IssueWorkProduct> {
      return client.request({ method: 'POST', path: `/api/issues/${id}/work-products`, body: data });
    },

    updateWorkProduct(id: string, data: Record<string, unknown>): Promise<IssueWorkProduct> {
      return client.request({ method: 'PATCH', path: `/api/work-products/${id}`, body: data });
    },

    deleteWorkProduct(id: string): Promise<IssueWorkProduct> {
      return client.request({ method: 'DELETE', path: `/api/work-products/${id}` });
    },
  };
}
