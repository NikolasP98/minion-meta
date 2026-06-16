// VENDORED FROM paperclip-minion/ui/src/api/secrets.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type { CompanySecret, SecretProvider, SecretProviderDescriptor } from '../types/secrets.js';

export function secretsApi(client: WorkforceClientBase) {
  return {
    list(companyId: string): Promise<CompanySecret[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/secrets` });
    },

    providers(companyId: string): Promise<SecretProviderDescriptor[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/secret-providers` });
    },

    create(
      companyId: string,
      data: {
        name: string;
        value: string;
        provider?: SecretProvider;
        description?: string | null;
        externalRef?: string | null;
      },
    ): Promise<CompanySecret> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/secrets`, body: data });
    },

    rotate(id: string, data: { value: string; externalRef?: string | null }): Promise<CompanySecret> {
      return client.request({ method: 'POST', path: `/api/secrets/${id}/rotate`, body: data });
    },

    update(
      id: string,
      data: { name?: string; description?: string | null; externalRef?: string | null },
    ): Promise<CompanySecret> {
      return client.request({ method: 'PATCH', path: `/api/secrets/${id}`, body: data });
    },

    remove(id: string): Promise<{ ok: true }> {
      return client.request({ method: 'DELETE', path: `/api/secrets/${id}` });
    },
  };
}
