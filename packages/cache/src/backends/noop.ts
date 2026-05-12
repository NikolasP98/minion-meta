import type { Backend, CacheBackend, CacheEntry } from '../types.js';

export class NoopBackend implements CacheBackend {
  name: Backend = 'noop';
  async get<T>(_k: string): Promise<CacheEntry<T> | null> { return null; }
  async set<T>(_k: string, _e: CacheEntry<T>): Promise<void> {}
  async del(_keys: string[]): Promise<void> {}
  async delByTag(_tags: string[]): Promise<void> {}
  async mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]> { return keys.map(() => null); }
}
