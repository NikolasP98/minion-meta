import { Redis, type RedisOptions } from 'ioredis';
import type { Backend, CacheBackend, CacheEntry } from '../types.js';

export interface ValkeyBackendOptions {
  url: string;
  password?: string;
  redisOptions?: RedisOptions;
}

export class ValkeyBackend implements CacheBackend {
  name: Backend = 'valkey';
  private client: Redis;

  constructor(opts: ValkeyBackendOptions) {
    this.client = new Redis(opts.url, {
      password: opts.password,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      ...opts.redisOptions,
    });
  }

  private dataKey(k: string) { return `c:${k}`; }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await this.client.get(this.dataKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.staleUntil) {
      await this.del([key]);
      return null;
    }
    return entry;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const ttlMs = entry.staleUntil - Date.now();
    if (ttlMs <= 0) return;
    await this.client.set(this.dataKey(key), JSON.stringify(entry), 'PX', ttlMs);
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys.map((k) => this.dataKey(k)));
  }

  async delByTag(_tags: string[]): Promise<void> {
    // Filled in Task 16
  }

  async mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]> {
    if (keys.length === 0) return [];
    const raws = await this.client.mget(...keys.map((k) => this.dataKey(k)));
    return raws.map((raw: string | null) => {
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return Date.now() > entry.staleUntil ? null : entry;
    });
  }

  async flushAll(): Promise<void> {
    await this.client.flushdb();
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
