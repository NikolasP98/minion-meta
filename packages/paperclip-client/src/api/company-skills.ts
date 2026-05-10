// VENDORED FROM paperclip-minion/ui/src/api/companySkills.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type {
  CompanySkill,
  CompanySkillCreateRequest,
  CompanySkillDetail,
  CompanySkillFileDetail,
  CompanySkillImportResult,
  CompanySkillListItem,
  CompanySkillProjectScanRequest,
  CompanySkillProjectScanResult,
  CompanySkillUpdateStatus,
} from '../types/company-skill.js';

export function companySkillsApi(client: PaperclipClient) {
  return {
    list(companyId: string): Promise<CompanySkillListItem[]> {
      return client.request({ method: 'GET', path: `/api/companies/${encodeURIComponent(companyId)}/skills` });
    },

    detail(companyId: string, skillId: string): Promise<CompanySkillDetail> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}`,
      });
    },

    updateStatus(companyId: string, skillId: string): Promise<CompanySkillUpdateStatus> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}/update-status`,
      });
    },

    file(companyId: string, skillId: string, relativePath: string): Promise<CompanySkillFileDetail> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}/files`,
        query: { path: relativePath },
      });
    },

    updateFile(companyId: string, skillId: string, path: string, content: string): Promise<CompanySkillFileDetail> {
      return client.request({
        method: 'PATCH',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}/files`,
        body: { path, content },
      });
    },

    create(companyId: string, payload: CompanySkillCreateRequest): Promise<CompanySkill> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills`,
        body: payload,
      });
    },

    importFromSource(companyId: string, source: string): Promise<CompanySkillImportResult> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/import`,
        body: { source },
      });
    },

    scanProjects(companyId: string, payload: CompanySkillProjectScanRequest = {}): Promise<CompanySkillProjectScanResult> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/scan-projects`,
        body: payload,
      });
    },

    installUpdate(companyId: string, skillId: string): Promise<CompanySkill> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}/install-update`,
        body: {},
      });
    },

    delete(companyId: string, skillId: string): Promise<CompanySkill> {
      return client.request({
        method: 'DELETE',
        path: `/api/companies/${encodeURIComponent(companyId)}/skills/${encodeURIComponent(skillId)}`,
      });
    },
  };
}
