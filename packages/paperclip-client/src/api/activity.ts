import type { PaperclipClientBase } from '../client.js';
import type { ActivityEvent } from '../types/activity.js';

// Local types copied from paperclip-minion/ui/src/api/activity.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503
export interface RunForIssue {
  runId: string;
  status: string;
  agentId: string;
  adapterType: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  invocationSource: string;
  usageJson: Record<string, unknown> | null;
  resultJson: Record<string, unknown> | null;
  logBytes?: number | null;
}

export interface IssueForRun {
  issueId: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
}

export function activityApi(client: PaperclipClientBase) {
  return {
    list(
      companyId: string,
      filters?: { entityType?: string; entityId?: string; agentId?: string },
    ): Promise<ActivityEvent[]> {
      return client.request<ActivityEvent[]>({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/activity`,
        query: {
          entityType: filters?.entityType,
          entityId: filters?.entityId,
          agentId: filters?.agentId,
        },
      });
    },

    forIssue(issueId: string): Promise<ActivityEvent[]> {
      return client.request<ActivityEvent[]>({
        method: 'GET',
        path: `/api/issues/${encodeURIComponent(issueId)}/activity`,
      });
    },

    runsForIssue(issueId: string): Promise<RunForIssue[]> {
      return client.request<RunForIssue[]>({
        method: 'GET',
        path: `/api/issues/${encodeURIComponent(issueId)}/runs`,
      });
    },

    issuesForRun(runId: string): Promise<IssueForRun[]> {
      return client.request<IssueForRun[]>({
        method: 'GET',
        path: `/api/heartbeat-runs/${encodeURIComponent(runId)}/issues`,
      });
    },
  };
}
