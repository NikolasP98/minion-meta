// VENDORED FROM paperclip-minion/ui/src/api/heartbeats.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClientBase } from '../client.js';
import type { HeartbeatRun, HeartbeatRunEvent, InstanceSchedulerHeartbeatAgent } from '../types/heartbeat.js';
import type { WorkspaceOperation } from '../types/workspace-runtime.js';

export interface ActiveRunForIssue extends HeartbeatRun {
  agentId: string;
  agentName: string;
  adapterType: string;
}

export interface LiveRunForIssue {
  id: string;
  status: string;
  invocationSource: string;
  triggerDetail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  issueId?: string | null;
}

export function heartbeatsApi(client: PaperclipClientBase) {
  return {
    list(companyId: string, agentId?: string, limit?: number): Promise<HeartbeatRun[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/heartbeat-runs`,
        query: { agentId, limit },
      });
    },

    get(runId: string): Promise<HeartbeatRun> {
      return client.request({ method: 'GET', path: `/api/heartbeat-runs/${runId}` });
    },

    events(runId: string, afterSeq = 0, limit = 200): Promise<HeartbeatRunEvent[]> {
      return client.request({
        method: 'GET',
        path: `/api/heartbeat-runs/${runId}/events`,
        query: { afterSeq, limit },
      });
    },

    log(
      runId: string,
      offset = 0,
      limitBytes = 256000,
    ): Promise<{ runId: string; store: string; logRef: string; content: string; nextOffset?: number }> {
      return client.request({
        method: 'GET',
        path: `/api/heartbeat-runs/${runId}/log`,
        query: { offset, limitBytes },
      });
    },

    workspaceOperations(runId: string): Promise<WorkspaceOperation[]> {
      return client.request({ method: 'GET', path: `/api/heartbeat-runs/${runId}/workspace-operations` });
    },

    workspaceOperationLog(
      operationId: string,
      offset = 0,
      limitBytes = 256000,
    ): Promise<{ operationId: string; store: string; logRef: string; content: string; nextOffset?: number }> {
      return client.request({
        method: 'GET',
        path: `/api/workspace-operations/${operationId}/log`,
        query: { offset, limitBytes },
      });
    },

    cancel(runId: string): Promise<void> {
      return client.request({ method: 'POST', path: `/api/heartbeat-runs/${runId}/cancel`, body: {} });
    },

    liveRunsForIssue(issueId: string): Promise<LiveRunForIssue[]> {
      return client.request({ method: 'GET', path: `/api/issues/${issueId}/live-runs` });
    },

    activeRunForIssue(issueId: string): Promise<ActiveRunForIssue | null> {
      return client.request({ method: 'GET', path: `/api/issues/${issueId}/active-run` });
    },

    liveRunsForCompany(companyId: string, minCount?: number): Promise<LiveRunForIssue[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/live-runs`,
        query: minCount !== undefined ? { minCount } : undefined,
      });
    },

    listInstanceSchedulerAgents(): Promise<InstanceSchedulerHeartbeatAgent[]> {
      return client.request({ method: 'GET', path: '/api/instance/scheduler-heartbeats' });
    },
  };
}
