import { describe, it, expect, vi } from 'vitest';
import { createPaperclipClient } from '../client.js';
import { sidebarBadgesApi } from './sidebar-badges.js';

describe('sidebarBadgesApi', () => {
  it('GETs /api/companies/:companyId/sidebar-badges', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = createPaperclipClient({ baseUrl: 'http://x', fetch });
    const api = sidebarBadgesApi(client);
    await api.get('c123');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/companies/c123/sidebar-badges',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
