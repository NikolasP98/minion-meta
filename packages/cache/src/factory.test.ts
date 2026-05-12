import { describe, expect, it } from 'vitest';
import { createBackend } from './factory';
import { MemoryBackend } from './backends/memory';
import { NoopBackend } from './backends/noop';

describe('createBackend', () => {
  it('returns MemoryBackend for "memory"', () => {
    expect(createBackend({ backend: 'memory' })).toBeInstanceOf(MemoryBackend);
  });
  it('returns NoopBackend for "noop"', () => {
    expect(createBackend({ backend: 'noop' })).toBeInstanceOf(NoopBackend);
  });
  it('throws for unknown backend', () => {
    expect(() => createBackend({ backend: 'wat' as 'memory' })).toThrow();
  });
});
