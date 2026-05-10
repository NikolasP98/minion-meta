import { describe, it, expect, vi } from 'vitest';
import { budgetsApi } from './budgets.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('budgetsApi', () => {
  it('overview calls GET /api/companies/:id/budgets/overview', async () => {
    const client = mockClient({ companyId: 'c1', policies: [], activeIncidents: [], pausedAgentCount: 0, pausedProjectCount: 0, pendingApprovalCount: 0 });
    const api = budgetsApi(client as never);
    const result = await api.overview('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/budgets/overview' });
    expect(result).toMatchObject({ companyId: 'c1' });
  });

  it('upsertPolicy calls POST /api/companies/:id/budgets/policies', async () => {
    const client = mockClient({ policyId: 'p1', companyId: 'c1' });
    const api = budgetsApi(client as never);
    await api.upsertPolicy('comp1', { scopeType: 'company', scopeId: 'comp1', amount: 10000 });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/budgets/policies',
      body: { scopeType: 'company', scopeId: 'comp1', amount: 10000 },
    });
  });
});
