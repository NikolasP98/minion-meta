// VENDORED FROM paperclip-minion/ui/src/api/companies.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type { Company } from '../types/company.js';
import type {
  CompanyPortabilityExportRequest,
  CompanyPortabilityExportPreviewResult,
  CompanyPortabilityExportResult,
  CompanyPortabilityImportRequest,
  CompanyPortabilityImportResult,
  CompanyPortabilityPreviewRequest,
  CompanyPortabilityPreviewResult,
} from '../types/company-portability.js';

export type CompanyStats = Record<string, { agentCount: number; issueCount: number }>;

export interface UpdateCompanyBranding {
  brandColor?: string | null;
  logoAssetId?: string | null;
}

export function companiesApi(client: WorkforceClientBase) {
  return {
    list(): Promise<Company[]> {
      return client.request({ method: 'GET', path: '/api/companies' });
    },

    get(companyId: string): Promise<Company> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}` });
    },

    stats(): Promise<CompanyStats> {
      return client.request({ method: 'GET', path: '/api/companies/stats' });
    },

    create(data: { name: string; description?: string | null; budgetMonthlyCents?: number }): Promise<Company> {
      return client.request({ method: 'POST', path: '/api/companies', body: data });
    },

    update(
      companyId: string,
      data: Partial<
        Pick<
          Company,
          | 'name'
          | 'description'
          | 'status'
          | 'budgetMonthlyCents'
          | 'requireBoardApprovalForNewAgents'
          | 'feedbackDataSharingEnabled'
          | 'brandColor'
          | 'logoAssetId'
        >
      >,
    ): Promise<Company> {
      return client.request({ method: 'PATCH', path: `/api/companies/${companyId}`, body: data });
    },

    updateBranding(companyId: string, data: UpdateCompanyBranding): Promise<Company> {
      return client.request({ method: 'PATCH', path: `/api/companies/${companyId}/branding`, body: data });
    },

    archive(companyId: string): Promise<Company> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/archive`, body: {} });
    },

    remove(companyId: string): Promise<{ ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/companies/${companyId}` });
    },

    exportBundle(companyId: string, data: CompanyPortabilityExportRequest): Promise<CompanyPortabilityExportResult> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/export`, body: data });
    },

    exportPreview(companyId: string, data: CompanyPortabilityExportRequest): Promise<CompanyPortabilityExportPreviewResult> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/exports/preview`, body: data });
    },

    exportPackage(companyId: string, data: CompanyPortabilityExportRequest): Promise<CompanyPortabilityExportResult> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/exports`, body: data });
    },

    importPreview(data: CompanyPortabilityPreviewRequest): Promise<CompanyPortabilityPreviewResult> {
      return client.request({ method: 'POST', path: '/api/companies/import/preview', body: data });
    },

    importBundle(data: CompanyPortabilityImportRequest): Promise<CompanyPortabilityImportResult> {
      return client.request({ method: 'POST', path: '/api/companies/import', body: data });
    },
  };
}
