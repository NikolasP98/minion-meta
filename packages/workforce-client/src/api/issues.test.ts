import { describe, it, expect, vi } from 'vitest';
import { issuesApi } from './issues.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('issuesApi', () => {
  it('list calls GET /api/companies/:id/issues', async () => {
    const client = mockClient([{ id: 'i1', title: 'Fix bug' }]);
    const api = issuesApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', path: '/api/companies/comp1/issues' }));
    expect(result[0]).toMatchObject({ id: 'i1' });
  });

  it('create calls POST /api/companies/:id/issues', async () => {
    const client = mockClient({ id: 'i2', title: 'New issue' });
    const api = issuesApi(client as never);
    await api.create('comp1', { title: 'New issue' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/issues',
      body: { title: 'New issue' },
    });
  });

  it('addComment calls POST /api/issues/:id/comments', async () => {
    const client = mockClient({ id: 'c1', body: 'hello' });
    const api = issuesApi(client as never);
    await api.addComment('issue1', 'hello');
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/issues/issue1/comments',
      body: { body: 'hello' },
    });
  });
});
