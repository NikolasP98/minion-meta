import { describe, it, expect, vi } from 'vitest';
import { goalsApi } from './goals.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('goalsApi', () => {
  it('list calls GET /api/companies/:id/goals', async () => {
    const client = mockClient([{ id: 'g1', title: 'Ship v2' }]);
    const api = goalsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/goals' });
    expect(result[0]).toMatchObject({ id: 'g1' });
  });

  it('create calls POST /api/companies/:id/goals', async () => {
    const client = mockClient({ id: 'g2', title: 'New Goal' });
    const api = goalsApi(client as never);
    await api.create('comp1', { title: 'New Goal' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/goals',
      body: { title: 'New Goal' },
    });
  });
});
