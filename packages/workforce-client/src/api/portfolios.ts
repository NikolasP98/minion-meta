// Mirrors src/api/projects.ts conventions. See specs/2026-07-11-universal-projects-module.md §2.7.

import type { WorkforceClientBase } from '../client.js';
import type { Portfolio, PortfolioMetrics } from '../types/portfolio.js';
import type { Project } from '../types/project.js';

export function portfoliosApi(client: WorkforceClientBase) {
  return {
    list(companyId: string): Promise<Portfolio[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/portfolios` });
    },

    get(id: string, companyId?: string): Promise<Portfolio> {
      return client.request({
        method: 'GET',
        path: `/api/portfolios/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Portfolio> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/portfolios`, body: data });
    },

    update(id: string, data: Record<string, unknown>, companyId?: string): Promise<Portfolio> {
      return client.request({
        method: 'PATCH',
        path: `/api/portfolios/${encodeURIComponent(id)}`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    metrics(id: string, companyId?: string): Promise<PortfolioMetrics> {
      return client.request({
        method: 'GET',
        path: `/api/portfolios/${encodeURIComponent(id)}/metrics`,
        query: companyId ? { companyId } : undefined,
      });
    },

    projects(id: string, companyId?: string): Promise<Project[]> {
      return client.request({
        method: 'GET',
        path: `/api/portfolios/${encodeURIComponent(id)}/projects`,
        query: companyId ? { companyId } : undefined,
      });
    },

    remove(id: string, companyId?: string): Promise<Portfolio> {
      return client.request({
        method: 'DELETE',
        path: `/api/portfolios/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },
  };
}
