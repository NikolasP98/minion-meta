import { describe, it, expect, vi } from 'vitest';
import { createPaperclipClient } from './client.js';

describe('createPaperclipClient', () => {
  it('issues GET with the configured baseUrl', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const client = createPaperclipClient({ baseUrl: 'http://x:3200', fetch });
    const result = await client.request<{ ok: boolean }>({ method: 'GET', path: '/api/dashboard/summary' });
    expect(fetch).toHaveBeenCalledWith('http://x:3200/api/dashboard/summary', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual({ ok: true });
  });

  it('throws on non-2xx with the response payload', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    const client = createPaperclipClient({ baseUrl: 'http://x', fetch });
    await expect(client.request({ method: 'GET', path: '/api/x' })).rejects.toMatchObject({
      status: 500,
    });
  });
});
