import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ValkeyBackend } from './valkey';
import { isDockerAvailable } from '../test-helpers/docker';
import type { CacheEntry } from '../types';

const entry = <T>(value: T, opts: Partial<CacheEntry<T>> = {}): CacheEntry<T> => ({
  value,
  expiresAt: opts.expiresAt ?? Date.now() + 60_000,
  staleUntil: opts.staleUntil ?? Date.now() + 60_000,
  tags: opts.tags ?? [],
});

const d = isDockerAvailable() ? describe : describe.skip;

let sharedContainer: StartedTestContainer | undefined;
let sharedUrl = '';

beforeAll(async () => {
  if (!isDockerAvailable()) return;
  sharedContainer = await new GenericContainer('valkey/valkey:8-alpine')
    .withExposedPorts(6379).start();
  sharedUrl = `redis://${sharedContainer.getHost()}:${sharedContainer.getMappedPort(6379)}`;
}, 60_000);

afterAll(async () => {
  await sharedContainer?.stop();
});

d('ValkeyBackend (containerized)', () => {
  let backend: ValkeyBackend;

  afterAll(async () => { await backend?.close?.(); });

  beforeEach(async () => {
    if (backend) await backend.close?.();
    backend = new ValkeyBackend({ url: sharedUrl });
    await backend.flushAll();
  });

  it('round-trips a value', async () => {
    await backend.set('k1', entry('v1'));
    expect((await backend.get<string>('k1'))?.value).toBe('v1');
  });

  it('returns null on miss', async () => {
    expect(await backend.get('missing')).toBeNull();
  });

  it('deletes by key', async () => {
    await backend.set('k', entry('v'));
    await backend.del(['k']);
    expect(await backend.get('k')).toBeNull();
  });

  it('mget returns aligned array', async () => {
    await backend.set('a', entry(1));
    await backend.set('c', entry(3));
    const out = await backend.mget<number>(['a', 'b', 'c']);
    expect(out.map((e) => (e === null ? null : e.value))).toEqual([1, null, 3]);
  });
});

d('ValkeyBackend delByTag', () => {
  let backend: ValkeyBackend;
  afterAll(async () => { await backend?.close?.(); });

  beforeEach(async () => {
    if (backend) await backend.close?.();
    backend = new ValkeyBackend({ url: sharedUrl });
    await backend.flushAll();
  });

  it('drops all keys carrying a tag', async () => {
    await backend.set('a', entry('A', { tags: ['d:groups', 't:1'] }));
    await backend.set('b', entry('B', { tags: ['d:groups', 't:2'] }));
    await backend.set('c', entry('C', { tags: ['d:sessions'] }));
    await backend.delByTag(['d:groups']);
    expect(await backend.get('a')).toBeNull();
    expect(await backend.get('b')).toBeNull();
    expect((await backend.get('c'))?.value).toBe('C');
  });

  it('updates tag set on re-set with different tags', async () => {
    await backend.set('a', entry('A', { tags: ['t:1'] }));
    await backend.set('a', entry('A2', { tags: ['t:2'] }));
    await backend.delByTag(['t:1']);
    expect((await backend.get('a'))?.value).toBe('A2');
    await backend.delByTag(['t:2']);
    expect(await backend.get('a')).toBeNull();
  });
});
