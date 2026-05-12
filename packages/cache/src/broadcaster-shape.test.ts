import { describe, it } from 'vitest';
import type { CacheInvalidatePayload as CachePayload } from './broadcaster';
import type { CacheInvalidatePayload as SharedPayload } from '@minion-stack/shared/gateway';

// Compile-time assertion: each type assignable to the other.
type AssertAssignable<A, B> = A extends B ? (B extends A ? true : never) : never;
type _CompatA = AssertAssignable<CachePayload, SharedPayload>;
type _CompatB = AssertAssignable<SharedPayload, CachePayload>;

describe('CacheInvalidatePayload shape parity', () => {
  it('compiles — types are structurally identical', () => {
    // If the two payloads drift, this file fails typecheck before vitest runs.
    const _a: _CompatA = true;
    const _b: _CompatB = true;
    void _a;
    void _b;
  });
});
