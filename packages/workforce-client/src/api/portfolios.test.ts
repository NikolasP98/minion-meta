import { describe, it, expect, vi } from 'vitest';
import { portfoliosApi } from './portfolios.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('portfoliosApi', () => {
  it('list calls GET /api/companies/:id/portfolios', async () => {
    const client = mockClient([{ id: 'pf1', name: 'Minion Code' }]);
    const api = portfoliosApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/portfolios' });
    expect(result[0]).toMatchObject({ id: 'pf1' });
  });

  it('create calls POST /api/companies/:id/portfolios with body', async () => {
    const client = mockClient({ id: 'pf2', name: 'Minion Code' });
    const api = portfoliosApi(client as never);
    await api.create('comp1', { name: 'Minion Code', objective: 'improve the codebase' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/portfolios',
      body: { name: 'Minion Code', objective: 'improve the codebase' },
    });
  });

  it('metrics calls GET /api/portfolios/:id/metrics', async () => {
    const client = mockClient({ rollup: {}, projects: [] });
    const api = portfoliosApi(client as never);
    await api.metrics('pf1');
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/portfolios/pf1/metrics',
      query: undefined,
    });
  });
});
