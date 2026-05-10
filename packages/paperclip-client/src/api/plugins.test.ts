import { describe, it, expect, vi } from 'vitest';
import { pluginsApi } from './plugins.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('pluginsApi', () => {
  it('list calls GET /api/plugins', async () => {
    const client = mockClient([{ id: 'p1', pluginKey: 'linear', status: 'ready' }]);
    const api = pluginsApi(client as never);
    const result = await api.list();
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/plugins', query: undefined });
    expect(result[0]).toMatchObject({ id: 'p1' });
  });

  it('install calls POST /api/plugins/install', async () => {
    const client = mockClient({ id: 'p2', pluginKey: 'new-plugin', status: 'ready' });
    const api = pluginsApi(client as never);
    await api.install({ packageName: '@acme/plugin-linear' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/plugins/install',
      body: { packageName: '@acme/plugin-linear' },
    });
  });
});
