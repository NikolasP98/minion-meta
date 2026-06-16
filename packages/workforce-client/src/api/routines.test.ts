import { describe, it, expect, vi } from 'vitest';
import { routinesApi } from './routines.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('routinesApi', () => {
  it('list calls GET /api/companies/:id/routines', async () => {
    const client = mockClient([{ id: 'r1', title: 'Daily standup' }]);
    const api = routinesApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/routines' });
    expect(result[0]).toMatchObject({ id: 'r1' });
  });

  it('run calls POST /api/routines/:id/run', async () => {
    const client = mockClient({ id: 'rr1', status: 'received' });
    const api = routinesApi(client as never);
    await api.run('r1', { payload: 'test' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/routines/r1/run',
      body: { payload: 'test' },
    });
  });
});
