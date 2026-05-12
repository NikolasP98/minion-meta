import { describe, expect, it } from 'vitest';
import { configureCache, getConfig, resetConfig } from './config.js';
import { MemoryBackend } from './backends/memory.js';
import { NoopBroadcaster } from './broadcaster.js';

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

describe('configureCache — broadcaster field', () => {
  it('stores broadcaster + source + sourceId', () => {
    resetConfig();
    const backend = new MemoryBackend();
    const broadcaster = new NoopBroadcaster();
    configureCache({
      backend, namespace: 'hub',
      broadcaster, source: 'hub', sourceId: 'fn-1',
    });
    const c = getConfig();
    expect(c.broadcaster).toBe(broadcaster);
    expect(c.source).toBe('hub');
    expect(c.sourceId).toBe('fn-1');
  });

  it('broadcaster is optional', () => {
    resetConfig();
    configureCache({ backend: new MemoryBackend(), namespace: 'hub' });
    expect(getConfig().broadcaster).toBeUndefined();
  });
});
