import { describe, it, expect, vi } from 'vitest';
import { inboxDismissalsApi } from './inbox-dismissals.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('inboxDismissalsApi', () => {
  it('list calls GET /api/companies/:id/inbox-dismissals', async () => {
    const client = mockClient([{ id: 'd1', itemKey: 'join-request:r1' }]);
    const api = inboxDismissalsApi(client as never);
    await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/inbox-dismissals' });
  });

  it('dismiss calls POST /api/companies/:id/inbox-dismissals', async () => {
    const client = mockClient({ id: 'd2', itemKey: 'join-request:r2' });
    const api = inboxDismissalsApi(client as never);
    await api.dismiss('comp1', 'join-request:r2');
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/inbox-dismissals',
      body: { itemKey: 'join-request:r2' },
    });
  });
});
