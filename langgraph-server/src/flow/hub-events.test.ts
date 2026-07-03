import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextBackoffMs, parseHubEventPayload, dispatchHubEvent } from './hub-events.js';

describe('nextBackoffMs', () => {
  it('starts at 1s and doubles', () => {
    expect(nextBackoffMs(0)).toBe(1000);
    expect(nextBackoffMs(1)).toBe(2000);
    expect(nextBackoffMs(2)).toBe(4000);
  });
  it('caps at 30s', () => {
    expect(nextBackoffMs(10)).toBe(30_000);
  });
});

describe('parseHubEventPayload', () => {
  it('parses valid JSON', () => {
    expect(parseHubEventPayload('{"type":"booking.created"}')).toEqual({ type: 'booking.created' });
  });
  it('returns undefined and logs on bad JSON instead of throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(parseHubEventPayload('not json')).toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('dispatchHubEvent', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.HUB_URL = 'http://hub.test';
    process.env.HUB_API_TOKEN = 'secret-token';
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('POSTs the event to the hub callback endpoint with the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const event = { type: 'finance.invoices_upserted', orgId: 'org_1', created: 3, updated: 0 };
    await dispatchHubEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://hub.test/api/internal/events/handle');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(event);
  });

  it('logs but does not throw when the hub responds non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(dispatchHubEvent({ type: 'ticket.status_changed' })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs but does not throw when fetch itself rejects (no retry loop)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(dispatchHubEvent({ type: 'booking.created' })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
