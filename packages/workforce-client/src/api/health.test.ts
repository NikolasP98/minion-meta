import { describe, it, expect, vi } from 'vitest';
import { createWorkforceClient } from '../client.js';
import { healthApi } from './health.js';

describe('healthApi', () => {
  it('GETs /api/health', async () => {
    const fetch = vi.fn(async () => new Response('{"status":"ok"}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    const api = healthApi(client);
    await api.get();
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
