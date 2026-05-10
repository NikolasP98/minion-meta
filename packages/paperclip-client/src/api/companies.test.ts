import { describe, it, expect, vi } from 'vitest';
import { companiesApi } from './companies.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('companiesApi', () => {
  it('list calls GET /api/companies', async () => {
    const client = mockClient([{ id: 'c1', name: 'Acme' }]);
    const api = companiesApi(client as never);
    const result = await api.list();
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies' });
    expect(result[0]).toMatchObject({ id: 'c1' });
  });

  it('create calls POST /api/companies', async () => {
    const client = mockClient({ id: 'c2', name: 'NewCo' });
    const api = companiesApi(client as never);
    await api.create({ name: 'NewCo' });
    expect(client.request).toHaveBeenCalledWith({ method: 'POST', path: '/api/companies', body: { name: 'NewCo' } });
  });
});
