import { describe, it, expect, vi } from 'vitest';
import { accessApi } from './access.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('accessApi', () => {
  it('getInvite calls GET /api/invites/:token', async () => {
    const client = mockClient({ id: 'inv1', companyId: 'c1', inviteType: 'company_join', allowedJoinTypes: 'agent', expiresAt: '2030-01-01T00:00:00Z' });
    const api = accessApi(client as never);
    const result = await api.getInvite('tok123');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/invites/tok123' });
    expect(result).toMatchObject({ id: 'inv1' });
  });

  it('createCompanyInvite calls POST /api/companies/:id/invites', async () => {
    const client = mockClient({ id: 'inv2', token: 'abc', inviteUrl: 'https://x', expiresAt: '2030-01-01T00:00:00Z', allowedJoinTypes: 'agent' });
    const api = accessApi(client as never);
    await api.createCompanyInvite('comp1', { allowedJoinTypes: 'agent' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/invites',
      body: { allowedJoinTypes: 'agent' },
    });
  });
});
