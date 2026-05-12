import type { CacheConfig } from './types.js';

let current: CacheConfig | null = null;

export function configureCache(cfg: CacheConfig): void {
  current = cfg;
}

export function getConfig(): CacheConfig {
  if (!current) {
    throw new Error('Cache not configured. Call configureCache() at boot.');
  }
  return current;
}

export function resetConfig(): void {
  current = null;
}
