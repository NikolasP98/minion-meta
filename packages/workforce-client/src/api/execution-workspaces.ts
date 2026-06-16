// VENDORED FROM paperclip-minion/ui/src/api/execution-workspaces.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type {
  ExecutionWorkspace,
  ExecutionWorkspaceCloseReadiness,
  WorkspaceOperation,
} from '../types/workspace-runtime.js';

export function executionWorkspacesApi(client: WorkforceClientBase) {
  return {
    list(
      companyId: string,
      filters?: {
        projectId?: string;
        projectWorkspaceId?: string;
        issueId?: string;
        status?: string;
        reuseEligible?: boolean;
      },
    ): Promise<ExecutionWorkspace[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/execution-workspaces`,
        query: {
          projectId: filters?.projectId,
          projectWorkspaceId: filters?.projectWorkspaceId,
          issueId: filters?.issueId,
          status: filters?.status,
          reuseEligible: filters?.reuseEligible,
        },
      });
    },

    get(id: string): Promise<ExecutionWorkspace> {
      return client.request({ method: 'GET', path: `/api/execution-workspaces/${id}` });
    },

    getCloseReadiness(id: string): Promise<ExecutionWorkspaceCloseReadiness> {
      return client.request({ method: 'GET', path: `/api/execution-workspaces/${id}/close-readiness` });
    },

    listWorkspaceOperations(id: string): Promise<WorkspaceOperation[]> {
      return client.request({ method: 'GET', path: `/api/execution-workspaces/${id}/workspace-operations` });
    },

    controlRuntimeServices(
      id: string,
      action: 'start' | 'stop' | 'restart',
    ): Promise<{ workspace: ExecutionWorkspace; operation: WorkspaceOperation }> {
      return client.request({
        method: 'POST',
        path: `/api/execution-workspaces/${id}/runtime-services/${action}`,
        body: {},
      });
    },

    update(id: string, data: Record<string, unknown>): Promise<ExecutionWorkspace> {
      return client.request({ method: 'PATCH', path: `/api/execution-workspaces/${id}`, body: data });
    },
  };
}
