import { describe, it, expect, vi } from 'vitest';
import { adaptersApi } from './adapters.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('adaptersApi', () => {
  it('list calls GET /api/adapters', async () => {
    const client = mockClient([{ type: 'claude_local', label: 'Claude', source: 'builtin', modelsCount: 3, loaded: true, disabled: false }]);
    const api = adaptersApi(client as never);
    const result = await api.list();
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/adapters' });
    expect(result[0]).toMatchObject({ type: 'claude_local' });
  });

  it('install calls POST /api/adapters/install', async () => {
    const client = mockClient({ type: 'my-adapter', packageName: '@acme/adapter', installedAt: '2024-01-01T00:00:00Z' });
    const api = adaptersApi(client as never);
    await api.install({ packageName: '@acme/adapter' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/adapters/install',
      body: { packageName: '@acme/adapter' },
    });
  });
});
