import { describe, it, expect, vi } from 'vitest';
import { agentsApi } from './agents.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('agentsApi', () => {
  it('list calls GET /api/companies/:id/agents', async () => {
    const client = mockClient([{ id: 'a1', name: 'Bot' }]);
    const api = agentsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/agents' });
    expect(result[0]).toMatchObject({ id: 'a1' });
  });

  it('wakeup calls POST /api/agents/:id/wakeup', async () => {
    const client = mockClient({ id: 'run1', status: 'queued' });
    const api = agentsApi(client as never);
    await api.wakeup('agent1', { source: 'on_demand', reason: 'test' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/agents/agent1/wakeup',
      body: { source: 'on_demand', reason: 'test' },
      query: undefined,
    });
  });
});
