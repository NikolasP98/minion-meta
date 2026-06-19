import { describe, expect, it, vi } from 'vitest';
import { configureCache, resetConfig } from './config.js';
import { cached, invalidateTags } from './core.js';
import type { CacheBackend, CacheEntry } from './types.js';

/**
 * A backend whose every operation rejects — models Valkey being unreachable
 * (ECONNREFUSED / ETIMEDOUT / "max number of clients reached") in production.
 * The cache is a best-effort optimization, so a dead backend must degrade to
 * the source-of-truth loader, never fail the request. Regression guard for the
 * 2026-06-15 prod outage where a Valkey blip 500'd every cached read (/crm,
 * /api/flows, …).
 */
class ThrowingBackend implements CacheBackend {
  name = 'valkey' as const;
  get<T>(_key: string): Promise<CacheEntry<T> | null> {
    return Promise.reject(new Error('ECONNREFUSED: valkey unreachable'));
  }
  set<T>(_key: string, _entry: CacheEntry<T>): Promise<void> {
    return Promise.reject(new Error('ECONNREFUSED: valkey unreachable'));
  }
  del(_keys: string[]): Promise<void> {
    return Promise.reject(new Error('ECONNREFUSED: valkey unreachable'));
  }
  delByTag(_tags: string[]): Promise<void> {
    return Promise.reject(new Error('ECONNREFUSED: valkey unreachable'));
  }
  mget<T>(_keys: string[]): Promise<(CacheEntry<T> | null)[]> {
    return Promise.reject(new Error('ECONNREFUSED: valkey unreachable'));
  }
}

describe('cached() — backend failure resilience', () => {
  it('falls back to the loader when backend.get() throws', async () => {
    resetConfig();
    const errors: unknown[] = [];
    configureCache({
      backend: new ThrowingBackend(),
      namespace: 'test',
      logger: (e) => e.type === 'error' && errors.push(e.error),
    });
    const loader = vi.fn(async () => 'fresh-from-db');
    expect(await cached('k', { ttl: '1m' }, loader)).toBe('fresh-from-db');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(errors.length).toBeGreaterThan(0); // failure was logged, not swallowed silently
  });

  it('still returns the loader value when backend.set() throws', async () => {
    resetConfig();
    // get returns null (miss) so the write path runs and throws.
    const backend = new ThrowingBackend();
    backend.get = () => Promise.resolve(null);
    configureCache({ backend, namespace: 'test' });
    const loader = vi.fn(async () => 99);
    expect(await cached('k', { ttl: '1m' }, loader)).toBe(99);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('propagates loader errors (a real DB failure is still an error)', async () => {
    resetConfig();
    const backend = new ThrowingBackend();
    backend.get = () => Promise.resolve(null);
    configureCache({ backend, namespace: 'test' });
    await expect(cached('k', { ttl: '1m' }, () => Promise.reject(new Error('db down')))).rejects.toThrow(
      'db down',
    );
  });

  it('invalidateTags does not throw when the backend is down', async () => {
    resetConfig();
    configureCache({ backend: new ThrowingBackend(), namespace: 'test' });
    await expect(invalidateTags(['t:a'])).resolves.toBeUndefined();
  });
});

describe('cached() — not-configured resilience', () => {
  // Models the 2026-06-15 prod outage: a trailing newline in CACHE_BACKEND
  // ("valkey\n") made initCache() throw, so configureCache() never ran and
  // every cached() call hit getConfig()'s "Cache not configured" throw → 500.
  it('runs the loader uncached when configureCache() was never called', async () => {
    resetConfig();
    const loader = vi.fn(async () => 'fresh-from-db');
    expect(await cached('k', { ttl: '1m' }, loader)).toBe('fresh-from-db');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('invalidateTags is a no-op when not configured', async () => {
    resetConfig();
    await expect(invalidateTags(['t:a'])).resolves.toBeUndefined();
  });
});
