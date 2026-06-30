import { describe, expect, it } from 'vitest';
import { newTraceparent } from './traceparent.js';

const W3C_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

describe('newTraceparent', () => {
  it('produces a well-formed W3C traceparent', () => {
    expect(newTraceparent()).toMatch(W3C_RE);
  });

  it('mints a fresh trace and span id each call', () => {
    const a = newTraceparent();
    const b = newTraceparent();
    expect(a).not.toBe(b);
    // trace id (2nd field) must differ — randomness, not a constant
    expect(a.split('-')[1]).not.toBe(b.split('-')[1]);
  });

  it('never emits the all-zero (invalid) trace id', () => {
    for (let i = 0; i < 50; i++) {
      expect(newTraceparent().split('-')[1]).not.toBe('00000000000000000000000000000000');
    }
  });
});
