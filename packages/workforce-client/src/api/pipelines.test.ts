import { describe, it, expect, vi } from 'vitest';
import { pipelinesApi } from './pipelines.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('pipelinesApi', () => {
  it('list calls GET /api/companies/:id/pipelines with optional projectId', async () => {
    const client = mockClient([{ id: 'pl1', name: 'bugs' }]);
    const api = pipelinesApi(client as never);
    await api.list('comp1', { projectId: 'proj1' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/companies/comp1/pipelines',
      query: { projectId: 'proj1' },
    });
  });

  it('create calls POST /api/companies/:id/pipelines with body', async () => {
    const client = mockClient({ id: 'pl2', name: 'bugs' });
    const api = pipelinesApi(client as never);
    const steps = [{ key: 'fix', kind: 'work', label: 'Fix', participant: { type: 'agent', agentId: 'a1' } }];
    await api.create('comp1', { name: 'bugs', steps });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/pipelines',
      body: { name: 'bugs', steps },
    });
  });

  it('preserves role-scoped human stage participants', async () => {
    const client = mockClient({ id: 'pl-role', name: 'delivery' });
    const api = pipelinesApi(client as never);
    const steps = [
      {
        key: 'approval',
        kind: 'approval',
        label: 'Approval',
        participant: { type: 'role', roleKeys: ['owner', 'release-manager'] },
      },
    ];
    await api.create('comp1', { name: 'delivery', steps });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/pipelines',
      body: { name: 'delivery', steps },
    });
  });

  it('archive calls PATCH /api/pipelines/:id with archivedAt', async () => {
    const client = mockClient({ id: 'pl1', archivedAt: '2026-07-11T00:00:00.000Z' });
    const api = pipelinesApi(client as never);
    await api.archive('pl1');
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/api/pipelines/pl1',
        body: expect.objectContaining({ archivedAt: expect.any(String) }),
      }),
    );
  });
});
