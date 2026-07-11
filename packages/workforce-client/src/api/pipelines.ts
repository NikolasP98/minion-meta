// Mirrors src/api/projects.ts conventions. See specs/2026-07-11-universal-projects-module.md §2.7.
// Pipelines are archived (archivedAt), never hard-deleted — no `remove`, use `archive`.

import type { WorkforceClientBase } from '../client.js';
import type { Pipeline } from '../types/pipeline.js';

export function pipelinesApi(client: WorkforceClientBase) {
  return {
    list(companyId: string, filters?: { projectId?: string }): Promise<Pipeline[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/pipelines`,
        query: { projectId: filters?.projectId },
      });
    },

    get(id: string, companyId?: string): Promise<Pipeline> {
      return client.request({
        method: 'GET',
        path: `/api/pipelines/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Pipeline> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/pipelines`, body: data });
    },

    update(id: string, data: Record<string, unknown>, companyId?: string): Promise<Pipeline> {
      return client.request({
        method: 'PATCH',
        path: `/api/pipelines/${encodeURIComponent(id)}`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    archive(id: string, companyId?: string): Promise<Pipeline> {
      return client.request({
        method: 'PATCH',
        path: `/api/pipelines/${encodeURIComponent(id)}`,
        body: { archivedAt: new Date().toISOString() },
        query: companyId ? { companyId } : undefined,
      });
    },
  };
}
