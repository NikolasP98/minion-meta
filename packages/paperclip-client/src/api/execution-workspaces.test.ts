import { describe, it, expect, vi } from 'vitest';
import { executionWorkspacesApi } from './execution-workspaces.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('executionWorkspacesApi', () => {
  it('list calls GET /api/companies/:id/execution-workspaces', async () => {
    const client = mockClient([{ id: 'ws1' }]);
    const api = executionWorkspacesApi(client as never);
    await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/companies/comp1/execution-workspaces',
      query: {},
    });
  });

  it('controlRuntimeServices calls POST /api/execution-workspaces/:id/runtime-services/:action', async () => {
    const client = mockClient({ workspace: { id: 'ws1' }, operation: { id: 'op1' } });
    const api = executionWorkspacesApi(client as never);
    await api.controlRuntimeServices('ws1', 'start');
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/execution-workspaces/ws1/runtime-services/start',
      body: {},
    });
  });
});
