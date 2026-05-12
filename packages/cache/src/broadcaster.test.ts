import { describe, expect, it, vi } from 'vitest';
import { HttpBroadcaster, NoopBroadcaster } from './broadcaster';

describe('NoopBroadcaster', () => {
  it('emit resolves without side effects', async () => {
    const b = new NoopBroadcaster();
    await expect(
      b.emit({ tags: ['t:1'], source: 'hub', sourceId: 'x', tenantId: 'ten_1', ts: Date.now() })
    ).resolves.toBeUndefined();
  });
});

describe('HttpBroadcaster', () => {
  it('POSTs the payload as JSON to the configured URL with auth header', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const b = new HttpBroadcaster({
      url: 'https://gateway.example/events/cache-invalidate',
      token: 'sekret',
      fetch: fetchMock,
    });
    const payload = { tags: ['t:1'], source: 'hub' as const, sourceId: 'x', tenantId: 'ten_1', ts: 1 };
    await b.emit(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://gateway.example/events/cache-invalidate');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: 'Bearer sekret',
    });
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it('omits authorization header when token is absent', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const b = new HttpBroadcaster({ url: 'https://gateway.example/x', fetch: fetchMock });
    await b.emit({ tags: ['t'], source: 'hub', sourceId: 'x', tenantId: 't', ts: 0 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('does not throw on non-2xx — logs via onError', async () => {
    const fetchMock = vi.fn(async () => new Response('bad', { status: 500 }));
    const onError = vi.fn();
    const b = new HttpBroadcaster({ url: 'https://gateway.example/x', fetch: fetchMock, onError });
    await expect(
      b.emit({ tags: ['t'], source: 'hub', sourceId: 'x', tenantId: 't', ts: 0 })
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0]![0] as Error;
    expect(err.message).toMatch(/500/);
  });

  it('does not throw on network error', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('econnrefused'); });
    const onError = vi.fn();
    const b = new HttpBroadcaster({ url: 'https://gateway.example/x', fetch: fetchMock, onError });
    await expect(
      b.emit({ tags: ['t'], source: 'hub', sourceId: 'x', tenantId: 't', ts: 0 })
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('aborts after timeout', async () => {
    let abortReason: unknown;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortReason = (init.signal as AbortSignal).reason;
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });
    const onError = vi.fn();
    const b = new HttpBroadcaster({
      url: 'https://gateway.example/x', fetch: fetchMock, onError, timeoutMs: 20,
    });
    await b.emit({ tags: ['t'], source: 'hub', sourceId: 'x', tenantId: 't', ts: 0 });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(abortReason)).toMatch(/timeout|abort/i);
  });
});
