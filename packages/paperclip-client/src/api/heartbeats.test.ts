import { describe, it, expect, vi } from 'vitest';
import { heartbeatsApi } from './heartbeats.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('heartbeatsApi', () => {
  it('list calls GET /api/companies/:id/heartbeat-runs', async () => {
    const client = mockClient([{ id: 'run1', status: 'succeeded' }]);
    const api = heartbeatsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/companies/comp1/heartbeat-runs',
      query: { agentId: undefined, limit: undefined },
    });
    expect(result[0]).toMatchObject({ id: 'run1' });
  });

  it('cancel calls POST /api/heartbeat-runs/:id/cancel', async () => {
    const client = mockClient(undefined);
    const api = heartbeatsApi(client as never);
    await api.cancel('run1');
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/heartbeat-runs/run1/cancel',
      body: {},
    });
  });
});
