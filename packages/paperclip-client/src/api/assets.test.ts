import { describe, it, expect, vi } from 'vitest';
import { assetsApi } from './assets.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('assetsApi', () => {
  it('uploadImage calls POST /api/companies/:id/assets/images', async () => {
    const client = mockClient({ assetId: 'img1', companyId: 'c1', provider: 'b2', objectKey: 'k', contentType: 'image/png', byteSize: 100, sha256: 'abc', originalFilename: null, createdByAgentId: null, createdByUserId: null, createdAt: new Date(), updatedAt: new Date(), contentPath: '/p' });
    const api = assetsApi(client as never);
    const fakeFile = new File([''], 'test.png', { type: 'image/png' });
    await api.uploadImage('comp1', fakeFile);
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/assets/images',
      body: {},
    });
  });
});
