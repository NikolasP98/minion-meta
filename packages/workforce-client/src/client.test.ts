import { describe, it, expect, vi } from 'vitest';
import { createWorkforceClient } from './client.js';

describe('createWorkforceClient', () => {
  it('issues GET with the configured baseUrl', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x:3200', fetch });
    const result = await client.request<{ ok: boolean }>({ method: 'GET', path: '/api/dashboard/summary' });
    expect(fetch).toHaveBeenCalledWith('http://x:3200/api/dashboard/summary', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual({ ok: true });
  });

  it('throws on non-2xx with the response payload', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toMatchObject({
      status: 500,
    });
  });

  it('exposes all domain namespaces as objects with methods', () => {
    const fetch = vi.fn();
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    expect(typeof client.dashboard.summary).toBe('function');
    expect(typeof client.issues.list).toBe('function');
    expect(typeof client.agents.list).toBe('function');
    expect(typeof client.plugins.list).toBe('function');
    expect(typeof client.projects.list).toBe('function');
    expect(typeof client.portfolios.list).toBe('function');
    expect(typeof client.pipelines.list).toBe('function');
    expect(typeof client.companies.list).toBe('function');
    expect(typeof client.routines.list).toBe('function');
    expect(typeof client.goals.list).toBe('function');
    expect(typeof client.heartbeats.list).toBe('function');
    expect(typeof client.secrets.list).toBe('function');
  });
});
