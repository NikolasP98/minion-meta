import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryBackend } from './backends/memory.js';
import { configureCache, resetConfig } from './config.js';
import { cached, invalidateTags, invalidateKey } from './core.js';

describe('cached()', () => {
  beforeEach(() => {
    resetConfig();
    configureCache({ backend: new MemoryBackend(), namespace: 'test' });
  });

  it('runs loader on miss and returns its value', async () => {
    const loader = vi.fn(async () => 42);
    expect(await cached('k', { ttl: '1m' }, loader)).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on hit (no loader call)', async () => {
    const loader = vi.fn(async () => 42);
    await cached('k', { ttl: '1m' }, loader);
    expect(await cached('k', { ttl: '1m' }, loader)).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent misses', async () => {
    let calls = 0;
    const loader = async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return calls; };
    const [a, b, c] = await Promise.all([
      cached('k', { ttl: '1m' }, loader),
      cached('k', { ttl: '1m' }, loader),
      cached('k', { ttl: '1m' }, loader),
    ]);
    expect([a, b, c]).toEqual([1, 1, 1]);
    expect(calls).toBe(1);
  });

  it('SWR: returns stale value and refreshes in background', async () => {
    let n = 0;
    const loader = async () => ++n;
    await cached('k', { ttl: 1, swr: '1m' }, loader);
    await new Promise((r) => setTimeout(r, 10));
    const got = await cached('k', { ttl: 1, swr: '1m' }, loader);
    expect(got).toBe(1);
    await new Promise((r) => setTimeout(r, 30));
    expect(n).toBe(2);
  });

  it('invalidateTags drops matching keys', async () => {
    const loader = vi.fn(async () => 'v');
    await cached('k', { ttl: '1m', tags: ['t:a'] }, loader);
    await invalidateTags(['t:a']);
    await cached('k', { ttl: '1m', tags: ['t:a'] }, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('invalidateKey drops one key', async () => {
    const loader = vi.fn(async () => 'v');
    await cached('k', { ttl: '1m' }, loader);
    await invalidateKey('k');
    await cached('k', { ttl: '1m' }, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
