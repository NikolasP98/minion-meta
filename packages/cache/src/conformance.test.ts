import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CacheBackend, CacheEntry } from './types';
import { MemoryBackend } from './backends/memory';
import { ValkeyBackend } from './backends/valkey';
import { isDockerAvailable } from './test-helpers/docker';

const entry = <T>(value: T, opts: Partial<CacheEntry<T>> = {}): CacheEntry<T> => ({
  value,
  expiresAt: opts.expiresAt ?? Date.now() + 60_000,
  staleUntil: opts.staleUntil ?? Date.now() + 60_000,
  tags: opts.tags ?? [],
});

type Factory = () => Promise<{ backend: CacheBackend; teardown: () => Promise<void> }>;

const factories: Array<[string, Factory]> = [
  ['memory', async () => {
    const b = new MemoryBackend();
    return { backend: b, teardown: async () => { await b.close?.(); } };
  }],
];

let sharedContainer: StartedTestContainer | undefined;
let sharedUrl = '';

beforeAll(async () => {
  if (!isDockerAvailable()) return;
  sharedContainer = await new GenericContainer('valkey/valkey:8-alpine')
    .withExposedPorts(6379).start();
  sharedUrl = `redis://${sharedContainer.getHost()}:${sharedContainer.getMappedPort(6379)}`;
}, 60_000);

afterAll(async () => { await sharedContainer?.stop(); });

if (isDockerAvailable()) {
  factories.push(['valkey', async () => {
    const b = new ValkeyBackend({ url: sharedUrl });
    await b.flushAll();
    return { backend: b, teardown: async () => { await b.close?.(); } };
  }]);
}

for (const [name, factory] of factories) {
  describe(`backend conformance — ${name}`, () => {
    let backend: CacheBackend;
    let teardown: () => Promise<void>;
    beforeEach(async () => {
      ({ backend, teardown } = await factory());
    });

    it('round-trips a value', async () => {
      await backend.set('k', entry('v'));
      expect((await backend.get<string>('k'))?.value).toBe('v');
      await teardown();
    });

    it('honors TTL via staleUntil', async () => {
      await backend.set('k', entry('v', { expiresAt: Date.now() - 1, staleUntil: Date.now() - 1 }));
      expect(await backend.get('k')).toBeNull();
      await teardown();
    });

    it('delByTag wipes tagged keys', async () => {
      await backend.set('a', entry('A', { tags: ['t:x'] }));
      await backend.set('b', entry('B', { tags: ['t:x'] }));
      await backend.set('c', entry('C', { tags: ['t:y'] }));
      await backend.delByTag(['t:x']);
      expect(await backend.get('a')).toBeNull();
      expect(await backend.get('b')).toBeNull();
      expect((await backend.get('c'))?.value).toBe('C');
      await teardown();
    });
  });
}
