import { describe, expect, it } from 'vitest';
import { configureCache, getConfig, resetConfig } from './config.js';
import { MemoryBackend } from './backends/memory.js';

describe('configureCache', () => {
  it('throws if used before configuration', () => {
    resetConfig();
    expect(() => getConfig()).toThrow(/configureCache/);
  });

  it('stores backend, namespace, logger', () => {
    resetConfig();
    const backend = new MemoryBackend();
    configureCache({ backend, namespace: 'hub' });
    const c = getConfig();
    expect(c.backend).toBe(backend);
    expect(c.namespace).toBe('hub');
  });

  it('is idempotent — second call replaces', () => {
    resetConfig();
    const b1 = new MemoryBackend();
    const b2 = new MemoryBackend();
    configureCache({ backend: b1, namespace: 'hub' });
    configureCache({ backend: b2, namespace: 'gateway' });
    expect(getConfig().backend).toBe(b2);
    expect(getConfig().namespace).toBe('gateway');
  });
});
