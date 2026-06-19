import { getConfig } from './config.js';
import { parseDuration } from './ttl.js';
import { createCoalescer } from './coalesce.js';
import type { CacheEntry, CacheOptions } from './types.js';

const coalescer = createCoalescer<unknown>();

const toError = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)));

/**
 * Config accessor that never throws. `getConfig()` throws when the cache was
 * never configured (e.g. a misconfigured `CACHE_BACKEND` made `initCache()`
 * fail). The cache is an optimization, not a hard dependency — so callers
 * degrade to the source loader rather than 500 the request. Returns null when
 * unconfigured.
 */
function tryGetConfig(): ReturnType<typeof getConfig> | null {
  try {
    return getConfig();
  } catch {
    return null;
  }
}

export async function cached<T>(
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> {
  const cfg = tryGetConfig();
  if (!cfg) return loader(); // cache not configured — run uncached
  const { backend, logger } = cfg;
  const t0 = Date.now();

  // The cache is a best-effort optimization, never a hard dependency. If the
  // backend (e.g. Valkey) is unreachable, degrade to the loader and serve fresh
  // data from the source rather than failing the request.
  let hit: CacheEntry<T> | null;
  try {
    hit = await backend.get<T>(key);
  } catch (err) {
    logger?.({ type: 'error', key, error: toError(err) });
    return loadAndStore(key, opts, loader);
  }
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

export async function invalidateTags(tags: string[]): Promise<void> {
  const cfg = tryGetConfig();
  if (!cfg) return; // cache not configured — nothing to invalidate
  const { backend, logger, broadcaster, source, sourceId } = cfg;
  try {
    await backend.delByTag(tags);
    logger?.({ type: 'invalidate', tags });
  } catch (err) {
    // Best-effort: a failed bust must not fail the mutation that triggered it.
    // The data is already written to the source; stale entries expire by TTL.
    logger?.({ type: 'error', tags, error: toError(err) });
  }
  if (broadcaster) {
    try {
      await broadcaster.emit({
        tags,
        source: source ?? 'hub',
        sourceId: sourceId ?? 'unknown',
        tenantId: '',
        ts: Date.now(),
      });
    } catch (err) {
      logger?.({ type: 'error', tags, error: err instanceof Error ? err : new Error(String(err)) });
    }
  }
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
  try {
    await backend.set(key, entry);
    logger?.({ type: 'set', key, tags: entry.tags });
  } catch (err) {
    // Best-effort store — the value is already computed and returned to the
    // caller; a failed cache write must not turn a successful load into a 500.
    logger?.({ type: 'error', key, error: toError(err) });
  }
}
