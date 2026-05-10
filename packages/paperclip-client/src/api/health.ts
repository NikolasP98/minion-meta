import type { PaperclipClientBase } from '../client.js';
import type { HealthStatus } from '../types/health.js';

export function healthApi(client: PaperclipClientBase) {
  return {
    get(): Promise<HealthStatus> {
      return client.request<HealthStatus>({
        method: 'GET',
        path: '/api/health',
      });
    },
  };
}
