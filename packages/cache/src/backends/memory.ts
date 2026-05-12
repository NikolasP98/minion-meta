import type { Backend, CacheBackend, CacheEntry } from '../types.js';

export class MemoryBackend implements CacheBackend {
  name: Backend = 'memory';
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return (this.store.get(key) as CacheEntry<T> | undefined) ?? null;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.store.set(key, entry as CacheEntry<unknown>);
  }

  async del(keys: string[]): Promise<void> {
    for (const k of keys) this.store.delete(k);
  }

  async delByTag(_tags: string[]): Promise<void> {
    // Filled in Task 6
  }

  async mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]> {
    return keys.map((k) => (this.store.get(k) as CacheEntry<T> | undefined) ?? null);
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
