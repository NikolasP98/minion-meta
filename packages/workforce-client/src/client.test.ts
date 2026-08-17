import { describe, it, expect, vi } from 'vitest';
import { createWorkforceClient, WorkforceApiError } from './client.js';

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

  it('rejects a 502 HTML body with a typed WorkforceApiError, not a SyntaxError', async () => {
    const fetch = vi.fn(async () => new Response('<html><body>Bad Gateway</body></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    const promise = client.request({ method: 'GET', path: '/api/x' });
    await expect(promise).rejects.toBeInstanceOf(WorkforceApiError);
    await expect(promise).rejects.not.toBeInstanceOf(SyntaxError);
    await expect(promise).rejects.toMatchObject({
      status: 502,
      bodyKind: 'text',
      message: 'paperclip 502',
    });
    await expect(promise).rejects.toHaveProperty('body.raw');
    const err = await promise.catch((e) => e as WorkforceApiError);
    expect((err.body as { raw: string }).raw).toContain('<html');
  });

  it('throws WorkforceApiError on a non-JSON 2xx body', async () => {
    const fetch = vi.fn(async () => new Response('<html>…login…</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toMatchObject({
      status: 200,
      bodyKind: 'text',
    });
  });

  it('classifies by whether the body parses, not by content-type (client.test.ts:17 case)', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toMatchObject({
      status: 500,
      bodyKind: 'json',
      body: { error: 'nope' },
    });
  });

  it('resolves the happy path unchanged', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).resolves.toEqual({ ok: true });
  });

  it('resolves 204 empty body to null', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).resolves.toBeNull();
  });

  it('throws WorkforceApiError with bodyKind empty on a non-ok empty body', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 500 }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toMatchObject({
      status: 500,
      bodyKind: 'empty',
      body: null,
    });
  });

  it('truncates a large non-JSON body to 2048 chars with a truncation marker', async () => {
    const huge = 'a'.repeat(50_000);
    const fetch = vi.fn(async () => new Response(huge, {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    const err = await client.request({ method: 'GET', path: '/api/x' }).catch((e) => e as WorkforceApiError);
    const body = err.body as { raw: string; truncated: boolean };
    expect(body.raw.length).toBeLessThanOrEqual(2048);
    expect(body.raw).toMatch(/… \[truncated \d+ of \d+ chars\]$/);
    expect(body.truncated).toBe(true);
  });

  it('preserves a non-JSON body of exactly 2048 chars without truncation', async () => {
    const exact = 'b'.repeat(2048);
    const fetch = vi.fn(async () => new Response(exact, {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    const err = await client.request({ method: 'GET', path: '/api/x' }).catch((e) => e as WorkforceApiError);
    const body = err.body as { raw: string; truncated: boolean };
    expect(body.raw).toBe(exact);
    expect(body.truncated).toBe(false);
  });

  it('records contentType as metadata on a non-JSON body', async () => {
    const fetch = vi.fn(async () => new Response('<html></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    const err = await client.request({ method: 'GET', path: '/api/x' }).catch((e) => e as WorkforceApiError);
    expect((err.body as { contentType: string | null }).contentType).toBe('text/html');
  });

  it('lets a fetch rejection propagate as-is, not laundered into WorkforceApiError', async () => {
    const boom = new TypeError('fetch failed');
    const fetch = vi.fn(async () => {
      throw boom;
    });
    const client = createWorkforceClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toBe(boom);
  });

  it('does not leak request body, identity headers, or URL into the thrown error', async () => {
    const fetch = vi.fn(async () => new Response('<html>oops</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    const client = createWorkforceClient({
      baseUrl: 'http://x',
      fetch,
      headers: { 'x-hub-identity': 'secret-jwt' },
    });
    const err = await client
      .request({ method: 'POST', path: '/api/x', body: { secret: 'request-payload' } })
      .catch((e) => e as WorkforceApiError);
    const serialized = JSON.stringify(Object.getOwnPropertyNames(err).map((k) => [k, (err as unknown as Record<string, unknown>)[k]]));
    expect(serialized).not.toContain('secret-jwt');
    expect(serialized).not.toContain('request-payload');
    expect(serialized).not.toContain('http://x/api/x');
  });
});
