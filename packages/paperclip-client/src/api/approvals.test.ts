import { describe, it, expect, vi } from 'vitest';
import { approvalsApi } from './approvals.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('approvalsApi', () => {
  it('list calls GET /api/companies/:id/approvals', async () => {
    const client = mockClient([{ id: 'ap1', status: 'pending' }]);
    const api = approvalsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/approvals', query: undefined });
    expect(result[0]).toMatchObject({ id: 'ap1' });
  });

  it('approve calls POST /api/approvals/:id/approve', async () => {
    const client = mockClient({ id: 'ap1', status: 'approved' });
    const api = approvalsApi(client as never);
    await api.approve('ap1', 'LGTM');
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/approvals/ap1/approve',
      body: { decisionNote: 'LGTM' },
    });
  });
});
