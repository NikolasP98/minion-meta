import type { Duration } from './ttl.js';
import type { CacheBroadcaster } from './broadcaster.js';

export type Backend = 'memory' | 'valkey' | 'noop';

export interface CacheOptions {
  ttl: Duration;
  tags?: string[];
  swr?: Duration;
  coalesce?: boolean;
  backend?: Backend;
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  staleUntil: number;
  tags: string[];
}

export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'stale-hit'
  | 'set'
  | 'invalidate'
  | 'error';

export interface CacheEvent {
  type: CacheEventType;
  key?: string;
  tags?: string[];
  ms?: number;
  error?: Error;
}

export type CacheLogger = (evt: CacheEvent) => void;

export interface CacheBackend {
  name: Backend;
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  del(keys: string[]): Promise<void>;
  delByTag(tags: string[]): Promise<void>;
  mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]>;
  close?(): Promise<void>;
}

export interface CacheConfig {
  backend: CacheBackend;
  namespace: string;
  logger?: CacheLogger;
  /** Optional broadcaster — emits cache.invalidate events on tag/key busts. Default: no-op. */
  broadcaster?: CacheBroadcaster;
  /** Required when `broadcaster` is set — identifies the runtime emitting. */
  source?: 'hub' | 'gateway' | 'paperclip' | 'browser' | 'site';
  /** Required when `broadcaster` is set — unique per-process id for self-dedup. */
  sourceId?: string;
}
