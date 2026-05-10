import { describe, it, expect, vi } from 'vitest';
import { createPaperclipClient } from '../client.js';
import { activityApi } from './activity.js';

describe('activityApi', () => {
  function makeClient(fetch: typeof globalThis.fetch) {
    return createPaperclipClient({ baseUrl: 'http://x', fetch });
  }

  function mockFetch() {
    return vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
  }

  it('GETs /api/companies/:companyId/activity', async () => {
    const fetch = mockFetch();
    const api = activityApi(makeClient(fetch));
    await api.list('c123');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/companies/c123/activity',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('GETs /api/companies/:companyId/activity with query params', async () => {
    let capturedUrl = '';
    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      capturedUrl = url.toString();
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const api = activityApi(makeClient(fetch as typeof globalThis.fetch));
    await api.list('c123', { entityType: 'issue', agentId: 'a1' });
    expect(capturedUrl).toContain('/api/companies/c123/activity');
    expect(capturedUrl).toContain('entityType=issue');
    expect(capturedUrl).toContain('agentId=a1');
  });

  it('GETs /api/issues/:issueId/activity', async () => {
    const fetch = mockFetch();
    const api = activityApi(makeClient(fetch));
    await api.forIssue('i42');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/issues/i42/activity',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('GETs /api/issues/:issueId/runs', async () => {
    const fetch = mockFetch();
    const api = activityApi(makeClient(fetch));
    await api.runsForIssue('i42');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/issues/i42/runs',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('GETs /api/heartbeat-runs/:runId/issues', async () => {
    const fetch = mockFetch();
    const api = activityApi(makeClient(fetch));
    await api.issuesForRun('r99');
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/heartbeat-runs/r99/issues',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
