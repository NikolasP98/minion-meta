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

describe('MemoryBackend TTL expiry', () => {
  it('returns null after staleUntil', async () => {
    const backend = new MemoryBackend();
    const past = Date.now() - 1_000;
    await backend.set('k', { value: 'v', expiresAt: past, staleUntil: past, tags: [] });
    expect(await backend.get('k')).toBeNull();
  });

  it('keeps fresh entries', async () => {
    const backend = new MemoryBackend();
    const future = Date.now() + 60_000;
    await backend.set('k', { value: 'v', expiresAt: future, staleUntil: future, tags: [] });
    expect((await backend.get('k'))?.value).toBe('v');
  });
});

describe('MemoryBackend delByTag', () => {
  it('drops all keys carrying a tag', async () => {
    const b = new MemoryBackend();
    await b.set('a', entry('A', { tags: ['d:groups', 't:1'] }));
    await b.set('b', entry('B', { tags: ['d:groups', 't:2'] }));
    await b.set('c', entry('C', { tags: ['d:sessions', 't:1'] }));

    await b.delByTag(['d:groups']);

    expect(await b.get('a')).toBeNull();
    expect(await b.get('b')).toBeNull();
    expect((await b.get('c'))?.value).toBe('C');
  });

  it('handles multiple tags (union)', async () => {
    const b = new MemoryBackend();
    await b.set('a', entry('A', { tags: ['t:1'] }));
    await b.set('b', entry('B', { tags: ['t:2'] }));
    await b.delByTag(['t:1', 't:2']);
    expect(await b.get('a')).toBeNull();
    expect(await b.get('b')).toBeNull();
  });

  it('updates tag index when a key is overwritten', async () => {
    const b = new MemoryBackend();
    await b.set('a', entry('A', { tags: ['t:1'] }));
    await b.set('a', entry('A2', { tags: ['t:2'] }));
    await b.delByTag(['t:1']);
    expect((await b.get('a'))?.value).toBe('A2');
    await b.delByTag(['t:2']);
    expect(await b.get('a')).toBeNull();
  });

  it('removes tag index entries on del', async () => {
    const b = new MemoryBackend();
    await b.set('a', entry('A', { tags: ['t:1'] }));
    await b.del(['a']);
    await b.set('b', entry('B', { tags: ['t:1'] }));
    await b.delByTag(['t:1']);
    expect(await b.get('b')).toBeNull();
  });
});
