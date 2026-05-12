import type { Backend, CacheBackend, CacheEntry } from '../types.js';

export class MemoryBackend implements CacheBackend {
  name: Backend = 'memory';
  private store = new Map<string, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<string>>();

  constructor(private opts: { maxEntries?: number } = {}) {}
  private maxEntries() { return this.opts.maxEntries ?? 1_000; }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const e = this.store.get(key) as CacheEntry<T> | undefined;
    if (!e) return null;
    if (Date.now() > e.staleUntil) {
      this.dropKey(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, e as CacheEntry<unknown>);
    return e;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.dropKey(key);
    this.store.set(key, entry as CacheEntry<unknown>);
    for (const t of entry.tags) {
      let set = this.tagIndex.get(t);
      if (!set) { set = new Set(); this.tagIndex.set(t, set); }
      set.add(key);
    }
    while (this.store.size > this.maxEntries()) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.dropKey(oldest);
    }
  }

  async del(keys: string[]): Promise<void> {
    for (const k of keys) this.dropKey(k);
  }

  async delByTag(tags: string[]): Promise<void> {
    const keys = new Set<string>();
    for (const t of tags) {
      const set = this.tagIndex.get(t);
      if (set) for (const k of set) keys.add(k);
    }
    for (const k of keys) this.dropKey(k);
  }

  async mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async close(): Promise<void> {
    this.store.clear();
    this.tagIndex.clear();
  }

  private dropKey(key: string): void {
    const e = this.store.get(key);
    if (!e) return;
    for (const t of e.tags) {
      const set = this.tagIndex.get(t);
      if (set) {
        set.delete(key);
        if (set.size === 0) this.tagIndex.delete(t);
      }
    }
    this.store.delete(key);
  }
}
