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

d('ValkeyBackend (containerized)', () => {
  let container: StartedTestContainer;
  let backend: ValkeyBackend;
  let url: string;

  beforeAll(async () => {
    container = await new GenericContainer('valkey/valkey:8-alpine')
      .withExposedPorts(6379)
      .start();
    url = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  }, 60_000);

  afterAll(async () => {
    await backend?.close?.();
    await container?.stop();
  });

  beforeEach(async () => {
    if (backend) await backend.close?.();
    backend = new ValkeyBackend({ url });
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
    expect(out.map((e) => e === null ? null : e.value)).toEqual([1, null, 3]);
  });
});
