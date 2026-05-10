import { describe, it, expect, vi } from 'vitest';
import { createPaperclipClient } from '../client.js';
import { dashboardApi } from './dashboard.js';

describe('dashboardApi', () => {
  it('GETs /api/companies/:companyId/dashboard', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = createPaperclipClient({ baseUrl: 'http://x', fetch });
    const api = dashboardApi(client);
    await api.summary('c123');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/companies/c123/dashboard',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
