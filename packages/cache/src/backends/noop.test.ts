import { describe, expect, it } from 'vitest';
import { NoopBackend } from './noop';

describe('NoopBackend', () => {
  it('always misses', async () => {
    const b = new NoopBackend();
    await b.set('k', { value: 'v', expiresAt: Date.now() + 1000, staleUntil: Date.now() + 1000, tags: [] });
    expect(await b.get('k')).toBeNull();
  });
  it('mget returns all nulls', async () => {
    const b = new NoopBackend();
    expect(await b.mget(['a', 'b'])).toEqual([null, null]);
  });
  it('del + delByTag are no-ops', async () => {
    const b = new NoopBackend();
    await expect(b.del(['a'])).resolves.toBeUndefined();
    await expect(b.delByTag(['t:x'])).resolves.toBeUndefined();
  });
});
