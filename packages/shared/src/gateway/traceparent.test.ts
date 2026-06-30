import { describe, expect, it } from 'vitest';
import { newTraceparent, traceIdOf } from './traceparent.js';

const W3C_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;
const PARENT = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
const PARENT_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

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

  it('inherits the parent trace id but mints a fresh span id (child)', () => {
    const child = newTraceparent(PARENT);
    expect(child).toMatch(W3C_RE);
    expect(child.split('-')[1]).toBe(PARENT_TRACE_ID); // same trace
    expect(child.split('-')[2]).not.toBe(PARENT.split('-')[2]); // new span
  });

  it('falls back to a fresh root for a missing/malformed/all-zero parent', () => {
    expect(traceIdOf(newTraceparent(undefined))).not.toBe(PARENT_TRACE_ID);
    expect(newTraceparent('garbage').split('-')[1]).not.toBe(PARENT_TRACE_ID);
    const zeroParent = '00-00000000000000000000000000000000-b7ad6b7169203331-01';
    expect(newTraceparent(zeroParent).split('-')[1]).not.toBe('0'.repeat(32));
  });
});

describe('traceIdOf', () => {
  it('extracts a valid trace id and rejects junk', () => {
    expect(traceIdOf(PARENT)).toBe(PARENT_TRACE_ID);
    expect(traceIdOf(undefined)).toBeUndefined();
    expect(traceIdOf('nope')).toBeUndefined();
    expect(traceIdOf('00-00000000000000000000000000000000-b7ad6b7169203331-01')).toBeUndefined();
  });
});
