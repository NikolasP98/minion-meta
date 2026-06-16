import { describe, it, expect, vi } from 'vitest';
import { secretsApi } from './secrets.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('secretsApi', () => {
  it('list calls GET /api/companies/:id/secrets', async () => {
    const client = mockClient([{ id: 's1', name: 'API_KEY', provider: 'local_encrypted' }]);
    const api = secretsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/secrets' });
    expect(result[0]).toMatchObject({ id: 's1' });
  });

  it('create calls POST /api/companies/:id/secrets', async () => {
    const client = mockClient({ id: 's2', name: 'DB_PASSWORD' });
    const api = secretsApi(client as never);
    await api.create('comp1', { name: 'DB_PASSWORD', value: 'hunter2' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/secrets',
      body: { name: 'DB_PASSWORD', value: 'hunter2' },
    });
  });
});
