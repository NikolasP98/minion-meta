import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../gateway/src/logging/tool-tracking.js', () => ({
  wrapToolWithTracking: (tool: unknown) => tool,
}));
vi.mock('../gateway/src/agents/tools/hub/hub-common.js', () => ({
  hubToolsAvailable: () => true,
  ORG_ID_FIELD: { type: 'string' },
  hubGet: fixture.get,
}));
import { createBookingsQueryTool } from '../gateway/src/agents/tools/hub/bookings-query-tool';
import { createFinanceQueryTool } from '../gateway/src/agents/tools/hub/finance-query-tool';
beforeEach(() => {
  vi.clearAllMocks();
  fixture.get.mockResolvedValue({ ok: true });
});
describe('C04/C05 actual gateway adapter contract', () => {
  it('forwards bounded list/count options and signal', async () => {
    const tool = createBookingsQueryTool({ agentId: 'personal-synthetic' })!;
    const signal = new AbortController().signal;
    await tool.execute(
      'synthetic',
      {
        limit: 20,
        mode: 'count',
        dateFrom: '2030-01-07T00:00:00Z',
        orgId: 'synthetic-org',
      },
      signal,
    );
    expect(fixture.get).toHaveBeenCalledWith(
      'query/bookings',
      'personal-synthetic',
      expect.objectContaining({
        limit: '20',
        mode: 'count',
        from: '2030-01-07T00:00:00Z',
        orgId: 'synthetic-org',
      }),
      signal,
    );
    expect(tool.parameters).toMatchObject({
      properties: {
        limit: { maximum: 500 },
        mode: { enum: ['list', 'count'] },
      },
    });
  });
  it('forwards explicit all-time without dates, uses provider compatible enum schemas', async () => {
    const tool = createFinanceQueryTool({ agentId: 'personal-synthetic' })!;
    await tool.execute('synthetic', { range: 'all', bucket: 'month' });
    expect(fixture.get).toHaveBeenCalledWith(
      'query/finance',
      'personal-synthetic',
      expect.objectContaining({ range: 'all', from: undefined, to: undefined }),
      undefined,
    );
    expect(tool.parameters).toMatchObject({
      properties: {
        range: { enum: ['all'] },
        bucket: { enum: ['day', 'week', 'month'] },
      },
    });
    expect(JSON.stringify(tool.parameters)).not.toContain('anyOf');
  });
});
