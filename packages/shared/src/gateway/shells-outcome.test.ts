import { describe, expect, it } from 'vitest';
import * as shells from './shells.js';
import type { ShellsRegisterResponse } from './shells.js';
import { normalizeShellRunAdmission, normalizeShellRunOutcome, shellRunOutcomeText, normalizeShellOutcomeReceipt, normalizeShellRunObservation, normalizeShellsGetOutcomeParams, normalizeShellsGetOutcomeResponse, type ShellsInvokeParams, type ShellFinalPayload, type ShellsRegisterParams } from './shells.js';

const limits = { identifierBytes: 128, textBytes: 256, recordBytes: 2048 };
const admission = { version: 1, shellId: 'shell', runId: 'run', sessionId: 'session', invocationId: 'invoke', inputDigest: 'a'.repeat(64), startedAt: 1 };
const outcome = { version: 1, shellId: 'shell', runId: 'run', sessionId: 'session', invocationId: 'invoke', inputDigest: 'a'.repeat(64), eventId: 'event', state: 'final', durationMs: 2, outcomeDigest: 'b'.repeat(64) };

describe('durable Shells contract', () => {
  it('normalizes fresh admission and terminal objects idempotently', () => {
    expect(normalizeShellRunAdmission(admission, limits)).toEqual(admission);
    const normalized = normalizeShellRunOutcome(outcome, limits);
    expect(normalizeShellRunOutcome(normalized, limits)).toEqual(normalized);
    expect(normalized).not.toBe(outcome);
  });
  it('fixes digest projection order independently of object order', () => {
    expect(shellRunOutcomeText(outcome, limits)).toBe(JSON.stringify(['minion.shells.outcome', 1, 'shell', 'run', 'session', 'invoke', 'a'.repeat(64), 'event', 'final', 2, null, null]));
    expect(shellRunOutcomeText({ ...outcome, outcomeDigest: 'c'.repeat(64) }, limits)).toBe(shellRunOutcomeText(outcome, limits));
  });
  it.each([null, [], { ...outcome, version: 2 }, { ...outcome, state: 'cancel_acknowledged' }, { ...outcome, durationMs: -1 }, { ...outcome, durationMs: Infinity }, { ...outcome, durationMs: 0.5 }, { ...outcome, usage: {} }, { ...outcome, result: 'secret' }, { ...outcome, shellId: '' }, { ...outcome, outcomeDigest: 'B'.repeat(64) }, { ...outcome, errorMessage: '\ud800' }])('rejects malformed or extra terminal fields %#', (value) => {
    expect(() => normalizeShellRunOutcome(value, limits)).toThrow();
  });
  it('rejects accessors without executing them', () => {
    let called = false;
    const value = { ...outcome, get errorMessage() { called = true; return 'no'; } };
    expect(() => normalizeShellRunOutcome(value, limits)).toThrow();
    expect(called).toBe(false);
  });
  it('measures UTF-8 byte limits and rejects missing or invalid policy', () => {
    expect(() => normalizeShellRunOutcome({ ...outcome, errorMessage: 'é'.repeat(129) }, limits)).toThrow();
    expect(() => normalizeShellRunOutcome(outcome, undefined)).toThrow();
    expect(() => normalizeShellRunOutcome(outcome, { ...limits, identifierBytes: 0 })).toThrow();
    expect(() => normalizeShellRunOutcome(outcome, { ...limits, recordBytes: 10 })).toThrow();
  });
  it('normalizes negative zero without normalizing Unicode', () => {
    expect(Object.is(normalizeShellRunOutcome({ ...outcome, durationMs: -0 }, limits).durationMs, 0)).toBe(true);
    expect(shellRunOutcomeText({ ...outcome, stopReason: 'é' }, limits)).not.toBe(shellRunOutcomeText({ ...outcome, stopReason: 'e\u0301' }, limits));
  });
  it('keeps cancellation separate from immutable terminal vocabulary', () => {
    expect(normalizeShellRunObservation({ version: 1, kind: 'cancel_acknowledged', at: 4 }, limits).kind).toBe('cancel_acknowledged');
    expect(() => normalizeShellRunObservation({ version: 1, kind: 'final', at: 4 }, limits)).toThrow();
  });
  it('validates receipt identity and excludes outcome data', () => {
    const receipt = { version: 1, shellId: 'shell', runId: 'run', eventId: 'event', outcomeDigest: 'b'.repeat(64), receiptId: 'receipt', committedAt: 3 };
    expect(normalizeShellOutcomeReceipt(receipt, limits)).toEqual(receipt);
    expect(() => normalizeShellOutcomeReceipt({ ...receipt, committedAt: NaN }, limits)).toThrow();
    expect(() => normalizeShellOutcomeReceipt({ ...receipt, state: 'final' }, limits)).toThrow();
  });
  it('preserves the original invoke, final and capability-absent registration shapes', () => {
    const invoke: ShellsInvokeParams = { shellId: 'shell', sessionId: 'session', input: { kind: 'text', text: 'hello' } };
    const final: ShellFinalPayload = { shellId: 'shell', runId: 'run', sessionId: 'session', state: 'aborted', durationMs: 0, usage: { tokens: 1 } };
    const registration: ShellsRegisterParams = { shellId: 'shell', deviceToken: 'synthetic', harness: 'hermes', harnessVersion: 'test', bridgeVersion: 'test', capabilities: { acpMethods: [], streaming: true, backupKind: 'test', maxConcurrentRuns: 1 } };
    expect(invoke.invocationKey).toBeUndefined(); expect(final.usage).toEqual({ tokens: 1 }); expect(registration.capabilities.durableOutcomeVersion).toBeUndefined();
  });
  it('validates query/result variants and receipt-to-outcome identity', () => {
    const query = { version: 1, shellId: 'shell', runId: 'run' };
    expect(normalizeShellsGetOutcomeParams(query, limits)).toEqual(query);
    expect(normalizeShellsGetOutcomeResponse({ ...query, status: 'unresolved' }, limits).status).toBe('unresolved');
    expect(() => normalizeShellsGetOutcomeParams({ ...query, orgId: 'caller-authority' }, limits)).toThrow();
    const receipt = { version: 1, shellId: 'shell', runId: 'run', eventId: 'event', outcomeDigest: 'b'.repeat(64), receiptId: 'receipt', committedAt: 3 };
    expect(normalizeShellsGetOutcomeResponse({ version: 1, status: 'committed', outcome, receipt }, limits).status).toBe('committed');
    expect(() => normalizeShellsGetOutcomeResponse({ version: 1, status: 'committed', outcome, receipt: { ...receipt, runId: 'other' } }, limits)).toThrow();
  });
});


describe('bilateral durable outcome negotiation', () => {
  it.each([
    [undefined, undefined, undefined],
    [1, undefined, undefined],
    [undefined, 1, undefined],
    [1, 1, 1],
  ])('selects only explicit bilateral version 1 (%s, %s)', (sender, receiver, expected) => {
    expect(shells.negotiateShellDurableOutcomeVersion(sender, receiver)).toBe(expected);
  });

  it.each([null, false, true, 0, -0, -1, 2, 1.5, NaN, Infinity, -Infinity, '1', '', {}, [], 1n, Symbol('synthetic'), () => 1, Object(1)])(
    'rejects explicit malformed version %# even beside legacy absence',
    (invalid) => {
      for (const supported of [undefined, 1]) {
        for (const pair of [[invalid, supported], [supported, invalid]]) {
          expect(() => shells.negotiateShellDurableOutcomeVersion(pair[0], pair[1]))
            .toThrow(shells.ShellOutcomeValidationError);
          expect(() => shells.negotiateShellDurableOutcomeVersion(pair[0], pair[1]))
            .toThrow('INVALID_SHELL_OUTCOME');
        }
      }
    },
  );

  it('does not coerce advertised values or expose their contents', () => {
    let coercions = 0;
    const hostile = {
      [Symbol.toPrimitive]() { coercions++; throw new Error('synthetic-private-canary'); },
      toString() { coercions++; return 'synthetic-private-canary'; },
      valueOf() { coercions++; return 1; },
    };
    for (const pair of [[hostile, undefined], [1, hostile]]) {
      try {
        shells.negotiateShellDurableOutcomeVersion(pair[0], pair[1]);
        expect.fail('malformed advertised version accepted');
      } catch (error) {
        expect(error).toBeInstanceOf(shells.ShellOutcomeValidationError);
        expect((error as Error).message).toBe('INVALID_SHELL_OUTCOME');
      }
    }
    expect(coercions).toBe(0);
  });

  it('keeps a typed legacy response and an explicit receiver acceptance distinct', () => {
    const legacy: ShellsRegisterResponse = { shellId: 'shell', heartbeatMs: 15000 };
    const accepted: ShellsRegisterResponse = { ...legacy, durableOutcomeVersion: 1 };
    expect(legacy).not.toHaveProperty('durableOutcomeVersion');
    expect(shells.negotiateShellDurableOutcomeVersion(1, accepted.durableOutcomeVersion)).toBe(1);
  });
});


describe('required durable invocation contract', () => {
  const response = { version: 1, durability: 'required', runId: 'run', startedAt: 42 };
  const normalize = (value: unknown) => shells.normalizeShellsInvokeDurableResponse(value);

  it('adds a distinct method and preserves typed legacy and durable request shapes', () => {
    expect(shells.SHELLS_METHODS.invokeDurable).toBe('shells.invoke_durable');
    expect(shells.SHELLS_METHODS.invoke).toBe('shells.invoke');
    const durable: shells.ShellsInvokeDurableParams = {
      shellId: 'shell', sessionId: 'session', input: { kind: 'text', text: 'hello' },
    };
    const legacy: shells.ShellsInvokeParams = {
      shellId: 'shell', sessionId: 'session', input: { kind: 'multimodal', parts: [] },
    };
    const legacyResponse: shells.ShellsInvokeResponse = { runId: 'run', startedAt: 42 };
    const required: shells.ShellsInvokeDurableResponse = { ...legacyResponse, version: 1, durability: 'required' };
    expect(durable.input.kind).toBe('text');
    expect(legacy.input.kind).toBe('multimodal');
    expect(legacyResponse).not.toHaveProperty('durability');
    expect(normalize(required)).toEqual(required);
    const typeOnly = () => {
      // @ts-expect-error Durable invocation supports only the existing text input member.
      const invalid: shells.ShellsInvokeDurableParams['input'] = { kind: 'multimodal', parts: [] };
      return invalid;
    };
    void typeOnly;
  });

  it('returns a fresh exact ordered response and accepts own null-prototype data', () => {
    const input = { startedAt: 42, runId: 'run', durability: 'required', version: 1 };
    const value = normalize(input);
    expect(value).toEqual(response);
    expect(value).not.toBe(input);
    expect(JSON.stringify(value)).toBe('{"version":1,"durability":"required","runId":"run","startedAt":42}');
    expect(normalize(Object.assign(Object.create(null), input))).toEqual(response);
    expect(normalize(value)).toEqual(value);
  });

  it.each([undefined, null, false, true, 0, -0, 2, -1, 1.5, NaN, Infinity, -Infinity, '1', 1n, [], {}, Object(1), () => 1, Symbol('v')])(
    'rejects explicit invalid required-response version %#', (version) => {
      expect(() => normalize({ ...response, version })).toThrow(shells.ShellOutcomeValidationError);
    },
  );

  it.each([undefined, null, '', 'optional', 'disabled', 'REQUIRED', true, 1, {}, ['required']])(
    'rejects an absent or non-required durability literal %#', (durability) => {
      expect(() => normalize({ ...response, durability })).toThrow(shells.ShellOutcomeValidationError);
    },
  );

  it.each(['version', 'durability', 'runId', 'startedAt'] as const)(
    'rejects missing and explicit undefined required %s', (key) => {
      const missing: Record<string, unknown> = { ...response };
      delete missing[key];
      expect(() => normalize(missing)).toThrow(shells.ShellOutcomeValidationError);
      expect(() => normalize({ ...response, [key]: undefined })).toThrow(shells.ShellOutcomeValidationError);
    },
  );

  it.each([null, undefined, [], 'response', 1, { ...response, orgId: 'forged' }, { ...response, outcome: {} }, { ...response, [Symbol('hidden')]: true }, Object.create(response), Object.assign(Object.create({ extra: true }), response)])(
    'rejects unsupported response objects or extra properties %#', (value) => {
      expect(() => normalize(value)).toThrow(shells.ShellOutcomeValidationError);
    },
  );

  it('rejects hidden fields and getters without executing them', () => {
    let calls = 0;
    const getter = { ...response, get runId() { calls++; return 'run'; } };
    expect(() => normalize(getter)).toThrow(shells.ShellOutcomeValidationError);
    const hidden = Object.defineProperty({ ...response }, 'runId', { value: 'run', enumerable: false });
    expect(() => normalize(hidden)).toThrow(shells.ShellOutcomeValidationError);
    expect(calls).toBe(0);
  });

  it('does not read a required identifier inherited from Object.prototype', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'runId');
    let calls = 0;
    try {
      Object.defineProperty(Object.prototype, 'runId', {
        configurable: true, get() { calls++; return 'forged'; },
      });
      expect(() => normalize({ version: 1, durability: 'required', startedAt: 42 })).toThrow(shells.ShellOutcomeValidationError);
      expect(calls).toBe(0);
    } finally {
      if (descriptor) Object.defineProperty(Object.prototype, 'runId', descriptor);
      else Reflect.deleteProperty(Object.prototype, 'runId');
    }
  });

  it('never coerces hostile values or echoes them in errors', () => {
    let calls = 0;
    const hostile = { toString() { calls++; return 'private-canary'; }, valueOf() { calls++; return 1; } };
    for (const key of ['version', 'durability', 'runId', 'startedAt']) {
      try {
        normalize({ ...response, [key]: hostile });
        expect.fail('accepted a hostile field');
      } catch (error) {
        expect(error).toBeInstanceOf(shells.ShellOutcomeValidationError);
        expect((error as Error).message).toBe('INVALID_SHELL_OUTCOME');
      }
    }
    expect(calls).toBe(0);
  });

  it.each(['', '\ud800', '\udc00', 'a'.repeat(257), '😀'.repeat(65), null, 4])(
    'rejects invalid required response identifiers %#', (runId) => {
      expect(() => normalize({ ...response, runId })).toThrow(shells.ShellOutcomeValidationError);
    },
  );

  it('preserves valid identifier bytes and canonical timestamp boundaries', () => {
    for (const runId of ['a'.repeat(256), '😀'.repeat(64), 'e\u0301', 'é', ' ']) {
      expect(normalize({ ...response, runId }).runId).toBe(runId);
    }
    for (const startedAt of [0, Number.MAX_SAFE_INTEGER]) {
      expect(normalize({ ...response, startedAt }).startedAt).toBe(startedAt);
    }
    expect(Object.is(normalize({ ...response, startedAt: -0 }).startedAt, 0)).toBe(true);
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '42', null, 1n])(
    'rejects invalid admission timestamps %#', (startedAt) => {
      expect(() => normalize({ ...response, startedAt })).toThrow(shells.ShellOutcomeValidationError);
    },
  );
});

describe('immutable fixed durable v1 profile', () => {
  it('keeps explicit input and outcome policies separate with stable shared references', () => {
    expect(shells.SHELL_DURABLE_V1_INPUT_POLICY).toEqual({
      contract: { identifierBytes: 256, textBytes: 65536, recordBytes: 524288 },
      organizationBytes: 256, invocationKeyBytes: 256, envelopeBytes: 524288,
    });
    expect(shells.SHELL_DURABLE_V1_OUTCOME_LIMITS).toEqual({ identifierBytes: 256, textBytes: 4096, recordBytes: 65536 });
    const profile = shells.SHELL_DURABLE_V1_PROFILE;
    expect(profile).toEqual({
      version: 1, input: shells.SHELL_DURABLE_V1_INPUT_POLICY, outcome: shells.SHELL_DURABLE_V1_OUTCOME_LIMITS,
      maxOutcomeBytes: 57344, maxReceiptBytes: 8192, maxCombinedOutcomeBytes: 65536,
      maxAdmissionMetadataBytes: 16384, reservedRunBytes: 81920,
    });
    expect(profile.input).toBe(shells.SHELL_DURABLE_V1_INPUT_POLICY);
    expect(profile.outcome).toBe(shells.SHELL_DURABLE_V1_OUTCOME_LIMITS);
    expect(shells.normalizeShellOutcomeLimits(profile.input.contract)).toEqual(profile.input.contract);
    expect(shells.normalizeShellOutcomeLimits(profile.outcome)).toEqual(profile.outcome);
  });

  it('freezes every runtime layer and keeps readonly declarations', () => {
    const profile = shells.SHELL_DURABLE_V1_PROFILE;
    for (const value of [profile, profile.input, profile.input.contract, profile.outcome]) {
      const before = JSON.stringify(value);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Reflect.set(value, Object.keys(value)[0]!, -1)).toBe(false);
      expect(Reflect.defineProperty(value, 'injected', { value: true })).toBe(false);
      expect(JSON.stringify(value)).toBe(before);
    }
    const typeOnly = () => {
      // @ts-expect-error The public profile is readonly.
      profile.version = 2;
      // @ts-expect-error The nested input policy is readonly.
      profile.input.envelopeBytes = 1;
      // @ts-expect-error The nested input contract is readonly.
      profile.input.contract.textBytes = 1;
      // @ts-expect-error The outcome policy is readonly.
      profile.outcome.textBytes = 1;
    };
    void typeOnly;
  });

  it('fits the complete maximum-escaped aggregate and verifies exact record boundaries', () => {
    const profile = shells.SHELL_DURABLE_V1_PROFILE;
    const policy = profile.outcome;
    const id = '\u0000'.repeat(256), text = '\u0000'.repeat(4096);
    const outcome = shells.normalizeShellRunOutcome({
      version: 1, shellId: id, runId: id, sessionId: id, invocationId: id,
      inputDigest: 'a'.repeat(64), eventId: id, state: 'aborted', durationMs: Number.MAX_SAFE_INTEGER,
      stopReason: text, errorMessage: text, outcomeDigest: 'b'.repeat(64),
    }, policy);
    const receipt = shells.normalizeShellOutcomeReceipt({
      version: 1, shellId: id, runId: id, eventId: id, outcomeDigest: outcome.outcomeDigest,
      receiptId: id, committedAt: Number.MAX_SAFE_INTEGER,
    }, policy);
    const combined = shells.normalizeShellsGetOutcomeResponse({ version: 1, status: 'committed', outcome, receipt }, policy);
    const bytes = (value: unknown) => shells.shellOutcomeByteLength(JSON.stringify(value));
    expect(bytes(outcome)).toBe(57161);
    expect(bytes(receipt)).toBe(6323);
    expect(bytes(combined)).toBe(63540);
    expect(bytes(combined) - bytes(outcome) - bytes(receipt)).toBe(56);
    expect(bytes(outcome)).toBeLessThanOrEqual(profile.maxOutcomeBytes);
    expect(bytes(receipt)).toBeLessThanOrEqual(profile.maxReceiptBytes);
    expect(bytes(combined)).toBeLessThanOrEqual(profile.maxCombinedOutcomeBytes);
    expect(profile.maxCombinedOutcomeBytes + profile.maxAdmissionMetadataBytes).toBe(profile.reservedRunBytes);
    for (const [value, normalize] of [
      [outcome, shells.normalizeShellRunOutcome],
      [receipt, shells.normalizeShellOutcomeReceipt],
      [combined, shells.normalizeShellsGetOutcomeResponse],
    ] as const) {
      expect(normalize(value, { ...policy, recordBytes: bytes(value) })).toEqual(value);
      expect(() => normalize(value, { ...policy, recordBytes: bytes(value) - 1 })).toThrow(shells.ShellOutcomeValidationError);
    }
    expect(() => shells.normalizeShellRunOutcome({ ...outcome, errorMessage: text + 'x' }, policy)).toThrow(shells.ShellOutcomeValidationError);
    expect(() => shells.normalizeShellRunOutcome({ ...outcome, eventId: id + 'x' }, policy)).toThrow(shells.ShellOutcomeValidationError);
  });

  it('uses actual UTF-8 outcome limits without restricting existing parameterized normalizers', () => {
    const policy = shells.SHELL_DURABLE_V1_OUTCOME_LIMITS;
    expect(shells.normalizeShellRunOutcome({ ...outcome, errorMessage: '😀'.repeat(1024) }, policy).errorMessage).toHaveLength(2048);
    expect(() => shells.normalizeShellRunOutcome({ ...outcome, errorMessage: '😀'.repeat(1025) }, policy)).toThrow(shells.ShellOutcomeValidationError);
    expect(() => shells.normalizeShellRunOutcome({ ...outcome, errorMessage: '\ud800' }, policy)).toThrow(shells.ShellOutcomeValidationError);
    expect(shells.normalizeShellRunOutcome({ ...outcome, errorMessage: 'x'.repeat(4097) }, { ...policy, textBytes: 4097 }).errorMessage).toHaveLength(4097);
  });
});
