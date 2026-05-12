import type { Backend, CacheBackend } from './types.js';
import { MemoryBackend } from './backends/memory.js';
import { NoopBackend } from './backends/noop.js';

export interface CreateBackendOptions {
  backend: Backend;
  url?: string;
  password?: string;
  maxEntries?: number;
}

export async function createBackendAsync(opts: CreateBackendOptions): Promise<CacheBackend> {
  switch (opts.backend) {
    case 'memory':
      return new MemoryBackend({ maxEntries: opts.maxEntries });
    case 'noop':
      return new NoopBackend();
    case 'valkey': {
      if (!opts.url) throw new Error('valkey backend requires url');
      const mod = await import('./backends/valkey.js');
      return new mod.ValkeyBackend({ url: opts.url, password: opts.password });
    }
    default:
      throw new Error(`Unknown backend: ${String(opts.backend)}`);
  }
}

export function createBackend(opts: CreateBackendOptions): CacheBackend {
  if (opts.backend === 'valkey') {
    throw new Error('valkey backend must be created with createBackendAsync()');
  }
  switch (opts.backend) {
    case 'memory':
      return new MemoryBackend({ maxEntries: opts.maxEntries });
    case 'noop':
      return new NoopBackend();
    default:
      throw new Error(`Unknown backend: ${String(opts.backend)}`);
  }
}
