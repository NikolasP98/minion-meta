import { describe, expect, it } from 'vitest';
import { isCacheInvalidateEvent, type CacheInvalidateEvent } from './cache-events.js';

describe('CacheInvalidateEvent', () => {
  it('isCacheInvalidateEvent returns true for a valid event', () => {
    const evt: CacheInvalidateEvent = {
      type: 'event',
      event: 'cache.invalidate',
      payload: {
        tags: ['t:abc:agent-groups'],
        keys: [],
        source: 'hub',
        sourceId: 'vercel-fn-1',
        tenantId: 'ten_abc',
        ts: 1715500000000,
      },
    };
    expect(isCacheInvalidateEvent(evt)).toBe(true);
  });

  it('isCacheInvalidateEvent returns false for the wrong name', () => {
    const evt = {
      type: 'event',
      event: 'chat.message',
      payload: { tags: [], keys: [], source: 'hub', sourceId: 'x', tenantId: 't', ts: 0 },
    };
    expect(isCacheInvalidateEvent(evt)).toBe(false);
  });

  it('isCacheInvalidateEvent returns false for non-objects', () => {
    expect(isCacheInvalidateEvent(null)).toBe(false);
    expect(isCacheInvalidateEvent('event')).toBe(false);
    expect(isCacheInvalidateEvent({})).toBe(false);
  });

  it('isCacheInvalidateEvent allows missing optional keys', () => {
    const evt = {
      type: 'event',
      event: 'cache.invalidate',
      payload: {
        tags: ['t:abc'],
        source: 'gateway',
        sourceId: 'gw-1',
        tenantId: 'ten_abc',
        ts: 0,
      },
    };
    expect(isCacheInvalidateEvent(evt)).toBe(true);
  });
});
