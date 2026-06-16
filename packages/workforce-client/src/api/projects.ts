// VENDORED FROM paperclip-minion/ui/src/api/projects.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type { Project, ProjectWorkspace } from '../types/project.js';
import type { WorkspaceOperation } from '../types/workspace-runtime.js';

export function projectsApi(client: WorkforceClientBase) {
  return {
    list(companyId: string): Promise<Project[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/projects` });
    },

    get(id: string, companyId?: string): Promise<Project> {
      return client.request({
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Project> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/projects`, body: data });
    },

    update(id: string, data: Record<string, unknown>, companyId?: string): Promise<Project> {
      return client.request({
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(id)}`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    listWorkspaces(projectId: string, companyId?: string): Promise<ProjectWorkspace[]> {
      return client.request({
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/workspaces`,
        query: companyId ? { companyId } : undefined,
      });
    },

    createWorkspace(projectId: string, data: Record<string, unknown>, companyId?: string): Promise<ProjectWorkspace> {
      return client.request({
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/workspaces`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    updateWorkspace(
      projectId: string,
      workspaceId: string,
      data: Record<string, unknown>,
      companyId?: string,
    ): Promise<ProjectWorkspace> {
      return client.request({
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    controlWorkspaceRuntimeServices(
      projectId: string,
      workspaceId: string,
      action: 'start' | 'stop' | 'restart',
      companyId?: string,
    ): Promise<{ workspace: ProjectWorkspace; operation: WorkspaceOperation }> {
      return client.request({
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}/runtime-services/${action}`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    removeWorkspace(projectId: string, workspaceId: string, companyId?: string): Promise<ProjectWorkspace> {
      return client.request({
        method: 'DELETE',
        path: `/api/projects/${encodeURIComponent(projectId)}/workspaces/${encodeURIComponent(workspaceId)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    remove(id: string, companyId?: string): Promise<Project> {
      return client.request({
        method: 'DELETE',
        path: `/api/projects/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },
  };
}
