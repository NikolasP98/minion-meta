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
  private tagSet(t: string) { return `tag:${t}`; }
  private keyTagsKey(k: string) { return `kt:${k}`; }

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

    const prior = await this.client.smembers(this.keyTagsKey(key));

    const tx = this.client.multi();
    if (prior.length) {
      for (const t of prior) tx.srem(this.tagSet(t), key);
      tx.del(this.keyTagsKey(key));
    }
    tx.set(this.dataKey(key), JSON.stringify(entry), 'PX', ttlMs);
    if (entry.tags.length) {
      for (const t of entry.tags) tx.sadd(this.tagSet(t), key);
      tx.sadd(this.keyTagsKey(key), ...entry.tags);
      tx.pexpire(this.keyTagsKey(key), ttlMs);
    }
    await tx.exec();
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const tx = this.client.multi();
    for (const k of keys) tx.smembers(this.keyTagsKey(k));
    const results = await tx.exec();

    const tx2 = this.client.multi();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]!;
      const tagsForKey = (results?.[i]?.[1] as string[] | undefined) ?? [];
      for (const t of tagsForKey) tx2.srem(this.tagSet(t), k);
      tx2.del(this.dataKey(k), this.keyTagsKey(k));
    }
    await tx2.exec();
  }

  async delByTag(tags: string[]): Promise<void> {
    if (tags.length === 0) return;
    const keys = new Set<string>();
    for (const t of tags) {
      const members = await this.client.smembers(this.tagSet(t));
      for (const k of members) keys.add(k);
    }
    if (keys.size === 0) return;
    await this.del([...keys]);
    await this.client.del(...tags.map((t) => this.tagSet(t)));
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
