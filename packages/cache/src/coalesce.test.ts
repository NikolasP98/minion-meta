import { describe, expect, it, vi } from 'vitest';
import { createCoalescer } from './coalesce';

describe('createCoalescer', () => {
  it('runs a single loader for concurrent same-key calls', async () => {
    const c = createCoalescer<string>();
    const loader = vi.fn(async () => 'value');
    const results = await Promise.all([
      c.run('k', loader),
      c.run('k', loader),
      c.run('k', loader),
    ]);
    expect(results).toEqual(['value', 'value', 'value']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('runs different keys independently', async () => {
    const c = createCoalescer<string>();
    const loader = vi.fn(async (k: string) => `v:${k}`);
    const [a, b] = await Promise.all([c.run('a', () => loader('a')), c.run('b', () => loader('b'))]);
    expect(a).toBe('v:a');
    expect(b).toBe('v:b');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('clears in-flight entry after completion', async () => {
    const c = createCoalescer<number>();
    let calls = 0;
    const loader = async () => ++calls;
    expect(await c.run('k', loader)).toBe(1);
    expect(await c.run('k', loader)).toBe(2);
  });

  it('clears in-flight entry on error', async () => {
    const c = createCoalescer<number>();
    let calls = 0;
    const loader = async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return calls;
    };
    await expect(c.run('k', loader)).rejects.toThrow('boom');
    expect(await c.run('k', loader)).toBe(2);
  });
});
