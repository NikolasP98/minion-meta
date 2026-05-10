import type { PaperclipClient } from '../client.js';
import type { HealthStatus } from '../types/health.js';

export function healthApi(client: PaperclipClient) {
  return {
    get(): Promise<HealthStatus> {
      return client.request<HealthStatus>({
        method: 'GET',
        path: '/api/health',
      });
    },
  };
}
