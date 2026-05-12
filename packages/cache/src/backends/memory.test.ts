import { afterEach, describe, expect, it } from 'vitest';
import { MemoryBackend } from './memory';
import type { CacheEntry } from '../types';

const entry = <T>(value: T, opts: Partial<CacheEntry<T>> = {}): CacheEntry<T> => ({
  value,
  expiresAt: opts.expiresAt ?? Date.now() + 60_000,
  staleUntil: opts.staleUntil ?? Date.now() + 60_000,
  tags: opts.tags ?? [],
});

describe('MemoryBackend get/set/del', () => {
  let backend: MemoryBackend;
  afterEach(() => backend.close?.());

  it('returns null for missing keys', async () => {
    backend = new MemoryBackend();
    expect(await backend.get('missing')).toBeNull();
  });

  it('round-trips a value', async () => {
    backend = new MemoryBackend();
    await backend.set('k1', entry('v1'));
    expect((await backend.get('k1'))?.value).toBe('v1');
  });

  it('deletes by key', async () => {
    backend = new MemoryBackend();
    await backend.set('k1', entry('v1'));
    await backend.del(['k1']);
    expect(await backend.get('k1')).toBeNull();
  });

  it('mget returns aligned array', async () => {
    backend = new MemoryBackend();
    await backend.set('a', entry(1));
    await backend.set('c', entry(3));
    const out = await backend.mget<number>(['a', 'b', 'c']);
    expect(out.map((e) => (e === null ? null : e.value))).toEqual([1, null, 3]);
  });
});
