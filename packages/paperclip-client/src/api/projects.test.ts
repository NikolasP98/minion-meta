import { describe, it, expect, vi } from 'vitest';
import { projectsApi } from './projects.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('projectsApi', () => {
  it('list calls GET /api/companies/:id/projects', async () => {
    const client = mockClient([{ id: 'proj1', name: 'Alpha' }]);
    const api = projectsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/projects' });
    expect(result[0]).toMatchObject({ id: 'proj1' });
  });

  it('create calls POST /api/companies/:id/projects', async () => {
    const client = mockClient({ id: 'proj2', name: 'Beta' });
    const api = projectsApi(client as never);
    await api.create('comp1', { name: 'Beta' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/projects',
      body: { name: 'Beta' },
    });
  });
});
