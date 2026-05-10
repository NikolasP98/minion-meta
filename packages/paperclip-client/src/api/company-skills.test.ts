import { describe, it, expect, vi } from 'vitest';
import { companySkillsApi } from './company-skills.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('companySkillsApi', () => {
  it('list calls GET /api/companies/:id/skills', async () => {
    const client = mockClient([{ id: 's1', name: 'git', companyId: 'c1' }]);
    const api = companySkillsApi(client as never);
    const result = await api.list('comp1');
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/companies/comp1/skills' });
    expect(result[0]).toMatchObject({ id: 's1' });
  });

  it('create calls POST /api/companies/:id/skills', async () => {
    const client = mockClient({ id: 's2', name: 'new-skill', companyId: 'c1' });
    const api = companySkillsApi(client as never);
    await api.create('comp1', { name: 'new-skill' });
    expect(client.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/companies/comp1/skills',
      body: { name: 'new-skill' },
    });
  });
});
