import { describe, it, expect, vi } from 'vitest';
import { costsApi } from './costs.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('costsApi', () => {
  it('summary calls GET /api/companies/:id/costs/summary', async () => {
    const client = mockClient({ companyId: 'c1', spendCents: 500, budgetCents: 10000, utilizationPercent: 5 });
    const api = costsApi(client as never);
    const result = await api.summary('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/costs/summary', query: undefined });
    expect(result).toMatchObject({ companyId: 'c1' });
  });

  it('byAgent passes date query params', async () => {
    const client = mockClient([]);
    const api = costsApi(client as never);
    await api.byAgent('comp1', '2024-01-01', '2024-01-31');
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/companies/comp1/costs/by-agent',
      query: { from: '2024-01-01', to: '2024-01-31' },
    });
  });
});
