import { getConfig } from './config.js';
import { parseDuration } from './ttl.js';
import { createCoalescer } from './coalesce.js';
import type { CacheEntry, CacheOptions } from './types.js';

const coalescer = createCoalescer<unknown>();

export async function cached<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> {
  const { backend, logger } = getConfig();
  const t0 = Date.now();

  const hit = await backend.get<T>(key);
  if (hit) {
    if (Date.now() <= hit.expiresAt) {
      logger?.({ type: 'hit', key, ms: Date.now() - t0 });
      return hit.value;
    }
    logger?.({ type: 'stale-hit', key, ms: Date.now() - t0 });
    void refreshInBackground(key, opts, loader);
    return hit.value;
  }

  logger?.({ type: 'miss', key });
  return loadAndStore(key, opts, loader);
}

export async function remember<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> {
  return cached(key, opts, loader);
}

export async function invalidateTags(tags: string[]): Promise<void> {
  const { backend, logger } = getConfig();
  await backend.delByTag(tags);
  logger?.({ type: 'invalidate', tags });
}

export async function invalidateKey(key: string): Promise<void> {
  const { backend, logger } = getConfig();
  await backend.del([key]);
  logger?.({ type: 'invalidate', key });
}

export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  const { backend } = getConfig();
  const entries = await backend.mget<T>(keys);
  return entries.map((e) => (e ? e.value : null));
}

async function loadAndStore<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> {
  const useCoalesce = opts.coalesce !== false;
  const run = async (): Promise<T> => {
    const value = await loader();
    await writeEntry(key, opts, value);
    return value;
  };
  if (!useCoalesce) return run();
  return coalescer.run(key, run) as Promise<T>;
}

async function refreshInBackground<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<void> {
  try {
    await loadAndStore(key, opts, loader);
  } catch {
    // swallow — stale value already returned
  }
}

async function writeEntry<T>(key: string, opts: CacheOptions, value: T): Promise<void> {
  const { backend, logger } = getConfig();
  const ttlMs = parseDuration(opts.ttl);
  const swrMs = opts.swr ? parseDuration(opts.swr) : 0;
  const now = Date.now();
  const entry: CacheEntry<T> = {
    value,
    expiresAt: now + ttlMs,
    staleUntil: now + ttlMs + swrMs,
    tags: opts.tags ?? [],
  };
  await backend.set(key, entry);
  logger?.({ type: 'set', key, tags: entry.tags });
}
