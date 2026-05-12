import { describe, expect, it } from 'vitest';
import { parseDuration } from './ttl';

describe('parseDuration', () => {
  it('passes through numbers unchanged (treated as ms)', () => {
    expect(parseDuration(500)).toBe(500);
    expect(parseDuration(0)).toBe(0);
  });

  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30_000);
    expect(parseDuration('1s')).toBe(1_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(300_000);
    expect(parseDuration('1m')).toBe(60_000);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('parses days', () => {
    expect(parseDuration('1d')).toBe(86_400_000);
  });

  it('throws on garbage input', () => {
    expect(() => parseDuration('foo')).toThrow(/duration/i);
    expect(() => parseDuration('5x')).toThrow();
    expect(() => parseDuration('')).toThrow();
  });

  it('rejects negative durations', () => {
    expect(() => parseDuration(-1)).toThrow();
    expect(() => parseDuration('-5m')).toThrow();
  });
});
