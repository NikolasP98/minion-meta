// packages/shared/src/gateway/envelope-contract.test.ts
// Deterministic rejection fixtures for the protocol-3 wire contract.
import { describe, expect, it } from 'vitest';
import {
  canRetry,
  CLIENT_ERROR_CODES,
  frameByteLength,
  frameDefect,
  GATEWAY_ERROR_CODES,
  GatewayError,
  isValidTraceparent,
  MAX_FRAME_BYTES,
  parseFrame,
  PROTOCOL_VERSION,
  protocolInRange,
  protocolRange,
  validateConnectChallenge,
  validateHelloOk,
} from './envelope-contract.js';

const TP = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

describe('constants', () => {
  it('freezes protocol 3 and the 25 MiB server maxPayload mirror', () => {
    expect(PROTOCOL_VERSION).toBe(3);
    expect(MAX_FRAME_BYTES).toBe(25 * 1024 * 1024);
  });
  it('lists exactly the gateway error codes from error-codes.ts', () => {
    expect(Object.values(GATEWAY_ERROR_CODES).sort()).toEqual(
      ['AGENT_TIMEOUT', 'CONFLICT', 'FORBIDDEN', 'INVALID_REQUEST', 'NOT_IMPLEMENTED', 'NOT_LINKED', 'NOT_PAIRED', 'UNAVAILABLE'],
    );
  });
});

describe('parseFrame / frameDefect', () => {
  it('rejects a non-text message', () => {
    expect(parseFrame(undefined)).toEqual({ ok: false, code: 'MALFORMED_FRAME', reason: 'message is not text' });
    expect(parseFrame(new Uint8Array([1]))).toEqual({ ok: false, code: 'MALFORMED_FRAME', reason: 'message is not text' });
  });

  it.each<[string, string]>([
    ['invalid JSON', '{'],
    ['frame is not an object', 'null'],
    ['frame is not an object', '[]'],
    ['frame is not an object', '"res"'],
    ['frame is not an object', '42'],
    ['frame.type must be req, res or event', '{}'],
    ['frame.type must be req, res or event', '{"type":"hello"}'],
    ['frame.type must be req, res or event', '{"type":1}'],
    ['res.id must be a non-empty string', '{"type":"res","ok":true}'],
    ['res.id must be a non-empty string', '{"type":"res","id":7,"ok":true}'],
    ['res.id must be a non-empty string', '{"type":"res","id":"","ok":true}'],
    ['res.ok must be a boolean', '{"type":"res","id":"a"}'],
    ['res.ok must be a boolean', '{"type":"res","id":"a","ok":"true"}'],
    ['res.error must be an object', '{"type":"res","id":"a","ok":false,"error":"boom"}'],
    ['res.error.code must be a non-empty string', '{"type":"res","id":"a","ok":false,"error":{"message":"m"}}'],
    ['res.error.message must be a non-empty string', '{"type":"res","id":"a","ok":false,"error":{"code":"X"}}'],
    ['res.error.retryable must be a boolean', '{"type":"res","id":"a","ok":false,"error":{"code":"X","message":"m","retryable":"yes"}}'],
    ['res.error.retryAfterMs must be a non-negative integer', '{"type":"res","id":"a","ok":false,"error":{"code":"X","message":"m","retryAfterMs":-1}}'],
    ['event.event must be a non-empty string', '{"type":"event"}'],
    ['event.event must be a non-empty string', '{"type":"event","event":""}'],
    ['event.seq must be a non-negative integer', '{"type":"event","event":"tick","seq":-1}'],
    ['event.seq must be a non-negative integer', '{"type":"event","event":"tick","seq":1.5}'],
    ['event.stateVersion must be { presence: number, health: number }', '{"type":"event","event":"tick","stateVersion":{"presence":1}}'],
    ['req.id must be a non-empty string', '{"type":"req","method":"m"}'],
    ['req.method must be a non-empty string', '{"type":"req","id":"a","method":""}'],
    ['req.traceparent must be a string', '{"type":"req","id":"a","method":"m","traceparent":5}'],
  ])('rejects malformed: %s', (reason, raw) => {
    expect(parseFrame(raw)).toEqual({ ok: false, code: 'MALFORMED_FRAME', reason });
  });

  it('rejects oversized frames before parsing, counting UTF-8 bytes', () => {
    const ascii = JSON.stringify({ type: 'event', event: 'x'.repeat(100) });
    expect(parseFrame(ascii, ascii.length)).toMatchObject({ ok: true });
    expect(parseFrame(ascii, ascii.length - 1)).toEqual({ ok: false, code: 'PAYLOAD_TOO_LARGE', reason: `frame exceeds ${ascii.length - 1} bytes` });
    // 'é' is 1 UTF-16 unit but 2 UTF-8 bytes: the byte count is what the server enforces.
    const multi = JSON.stringify({ type: 'event', event: 'é'.repeat(10) });
    expect(frameByteLength(multi)).toBe(multi.length + 10);
    expect(parseFrame(multi, multi.length)).toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
    expect(parseFrame(multi, multi.length + 10)).toMatchObject({ ok: true });
    expect(parseFrame('x'.repeat(MAX_FRAME_BYTES + 1))).toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
  });

  it.each<[string, string]>([
    ['minimal req', '{"type":"req","id":"a","method":"connect"}'],
    ['req with params + traceparent', `{"type":"req","id":"a","method":"m","params":null,"traceparent":"${TP}"}`],
    ['ok res', '{"type":"res","id":"a","ok":true,"payload":{"x":1}}'],
    ['ok res without payload', '{"type":"res","id":"a","ok":true}'],
    ['failed res without error', '{"type":"res","id":"a","ok":false}'],
    ['failed res with full error', '{"type":"res","id":"a","ok":false,"error":{"code":"INVALID_REQUEST","message":"m","details":{"expectedProtocol":3},"retryable":false,"retryAfterMs":0}}'],
    ['event', '{"type":"event","event":"connect.challenge","payload":{"nonce":"n"}}'],
    ['event with seq + stateVersion', '{"type":"event","event":"presence","seq":0,"stateVersion":{"presence":1,"health":2}}'],
  ])('accepts %s', (_name, raw) => {
    const r = parseFrame(raw);
    expect(r.ok).toBe(true);
    expect(frameDefect(JSON.parse(raw))).toBeNull();
  });
});

describe('isValidTraceparent', () => {
  it.each([
    TP,
    '00-ffffffffffffffffffffffffffffffff-0000000000000001-00',
  ])('accepts %s', (v) => expect(isValidTraceparent(v)).toBe(true));
  it.each([
    undefined, null, 42, '',
    '00-00000000000000000000000000000000-b7ad6b7169203331-01', // zero trace id
    `00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01`, // zero span id
    '01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', // wrong version
    '00-0AF7651916CD43DD8448EB211C80319C-b7ad6b7169203331-01', // uppercase
    `${TP} `, // whitespace
    '00-0af7651916cd43dd8448eb211c80319c-b7ad6b71692033-01', // short span
  ])('rejects %s', (v) => expect(isValidTraceparent(v)).toBe(false));
});

describe('validateConnectChallenge', () => {
  it('accepts the gateway shape and legacy nonce-only', () => {
    expect(validateConnectChallenge({ nonce: 'n', ts: 1, protocol: 3, version: '1.0' })).toEqual({ nonce: 'n', protocol: 3 });
    expect(validateConnectChallenge({ nonce: 'n' })).toEqual({ nonce: 'n' });
  });
  it.each([undefined, null, 'n', {}, { nonce: '' }, { nonce: 1 }, { nonce: 'n', protocol: '3' }, { nonce: 'n', protocol: 0 }, { nonce: 'n', protocol: 2.5 }])(
    'rejects %j', (p) => expect(validateConnectChallenge(p)).toBeNull(),
  );
});

describe('protocolRange / protocolInRange', () => {
  it('defaults both bounds to PROTOCOL_VERSION like buildConnectParams', () => {
    expect(protocolRange({})).toEqual({ min: 3, max: 3 });
    expect(protocolRange({ minProtocol: 1, maxProtocol: 3 })).toEqual({ min: 1, max: 3 });
  });
  it.each([null, 'x', { minProtocol: 4, maxProtocol: 3 }, { minProtocol: 0 }, { maxProtocol: '3' }, { minProtocol: 1.5 }])(
    'rejects %j', (p) => expect(protocolRange(p)).toBeNull(),
  );
  it('checks inclusive bounds', () => {
    expect(protocolInRange(3, { min: 3, max: 3 })).toBe(true);
    expect(protocolInRange(4, { min: 3, max: 3 })).toBe(false);
    expect(protocolInRange(2, { min: 3, max: 3 })).toBe(false);
  });
});

describe('validateHelloOk', () => {
  const full = {
    type: 'hello-ok', protocol: 3,
    server: { version: '1.0', connId: 'c1' },
    features: { methods: [], events: [] }, snapshot: {},
    auth: { deviceToken: 't', role: 'operator', scopes: ['operator.read'] },
    policy: { maxPayload: 26214400, maxBufferedBytes: 52428800, tickIntervalMs: 30000 },
  };
  it('extracts server-established identity and maxPayload from a full hello', () => {
    expect(validateHelloOk(full)).toEqual({
      ok: true,
      hello: { protocol: 3, identity: { connId: 'c1', role: 'operator', scopes: ['operator.read'] }, maxPayload: 26214400 },
    });
  });
  it('accepts the minimal consumer-fixture shape', () => {
    expect(validateHelloOk({ type: 'hello-ok', protocol: 3 })).toEqual({
      ok: true, hello: { protocol: 3, identity: { connId: null, role: null, scopes: [] }, maxPayload: undefined },
    });
  });
  it('never derives identity from caller assertions: only hello.auth counts', () => {
    const r = validateHelloOk({ ...full, auth: undefined, userId: 'victim', scopes: ['operator.admin'], role: 'operator' });
    expect(r).toMatchObject({ ok: true, hello: { identity: { connId: 'c1', role: null, scopes: [] } } });
  });
  it.each<[string, unknown]>([
    ['hello is not an object', null],
    ['hello is not an object', 'hello-ok'],
    ['hello.type must be "hello-ok"', { protocol: 3 }],
    ['hello.type must be "hello-ok"', { type: 'hello', protocol: 3 }],
    ['hello.protocol must be a positive integer', { type: 'hello-ok' }],
    ['hello.protocol must be a positive integer', { type: 'hello-ok', protocol: '3' }],
    ['hello.protocol must be a positive integer', { type: 'hello-ok', protocol: 0 }],
    ['hello.server must be an object', { type: 'hello-ok', protocol: 3, server: 'x' }],
    ['hello.server.connId must be a non-empty string', { type: 'hello-ok', protocol: 3, server: { connId: 1 } }],
    ['hello.auth must be an object', { type: 'hello-ok', protocol: 3, auth: 'operator' }],
    ['hello.auth.role must be a non-empty string', { type: 'hello-ok', protocol: 3, auth: { role: '' } }],
    ['hello.auth.scopes must be an array of non-empty strings', { type: 'hello-ok', protocol: 3, auth: { scopes: 'operator.admin' } }],
    ['hello.auth.scopes must be an array of non-empty strings', { type: 'hello-ok', protocol: 3, auth: { scopes: [''] } }],
    ['hello.policy must be an object', { type: 'hello-ok', protocol: 3, policy: 1 }],
    ['hello.policy.maxPayload must be a positive integer', { type: 'hello-ok', protocol: 3, policy: { maxPayload: 0 } }],
  ])('rejects: %s', (reason, value) => {
    expect(validateHelloOk(value)).toEqual({ ok: false, reason });
  });
});

describe('GatewayError + canRetry', () => {
  it('maps a server error shape verbatim and defaults retryable to false', () => {
    const e = GatewayError.fromServer({ code: 'INVALID_REQUEST', message: 'protocol mismatch', details: { expectedProtocol: 3 } });
    expect(e).toBeInstanceOf(Error);
    expect(e).toMatchObject({ name: 'GatewayError', source: 'server', code: 'INVALID_REQUEST', message: 'protocol mismatch', retryable: false, details: { expectedProtocol: 3 } });
    expect(GatewayError.fromServer({ code: 'UNAVAILABLE', message: 'busy', retryable: true, retryAfterMs: 250 })).toMatchObject({ retryable: true, retryAfterMs: 250 });
  });
  it('tolerates a missing or malformed server error shape', () => {
    expect(GatewayError.fromServer(undefined)).toMatchObject({ code: 'UNKNOWN', message: 'request failed', retryable: false });
    expect(GatewayError.fromServer({ code: 7, message: 9, retryable: 'yes', retryAfterMs: -1 })).toMatchObject({ code: 'UNKNOWN', message: 'request failed', retryable: false, retryAfterMs: undefined });
  });
  it('keeps the legacy messages consumers match on', () => {
    expect(GatewayError.client(CLIENT_ERROR_CODES.NOT_CONNECTED, 'not connected').message).toBe('not connected');
    expect(GatewayError.client(CLIENT_ERROR_CODES.DISCONNECTED, 'closed (1006): gone', { code: 1006 })).toMatchObject({ source: 'client', details: { code: 1006 } });
  });

  const server = (retryable?: boolean) => GatewayError.fromServer({ code: 'UNAVAILABLE', message: 'm', retryable });
  const local = (code: keyof typeof CLIENT_ERROR_CODES) => GatewayError.client(CLIENT_ERROR_CODES[code], 'm');
  it.each<[string, unknown, boolean, boolean]>([
    // [what, error, idempotent, expected]
    ['plain Error', new Error('x'), true, false],
    ['server retryable, idempotent', server(true), true, true],
    ['server retryable, NON-idempotent', server(true), false, false],
    ['server non-retryable, idempotent', server(false), true, false],
    ['server INVALID_REQUEST', GatewayError.fromServer({ code: 'INVALID_REQUEST', message: 'm' }), true, false],
    ['DISCONNECTED, idempotent', local('DISCONNECTED'), true, true],
    ['DISCONNECTED, NON-idempotent (effect unknown)', local('DISCONNECTED'), false, false],
    ['TIMEOUT, idempotent', local('TIMEOUT'), true, true],
    ['TIMEOUT, NON-idempotent (effect unknown)', local('TIMEOUT'), false, false],
    ['NOT_CONNECTED never sent — safe even when non-idempotent', local('NOT_CONNECTED'), false, true],
    ['SEND_FAILED never sent — safe even when non-idempotent', local('SEND_FAILED'), false, true],
    ['PAYLOAD_TOO_LARGE is not transient', local('PAYLOAD_TOO_LARGE'), true, false],
    ['UNSUPPORTED_PROTOCOL is not transient', local('UNSUPPORTED_PROTOCOL'), true, false],
    ['MALFORMED_FRAME is not transient', local('MALFORMED_FRAME'), true, false],
    ['INVALID_REQUEST (local) is not transient', local('INVALID_REQUEST'), true, false],
  ])('canRetry: %s → %s', (_what, err, idempotent, expected) => {
    expect(canRetry(err, { idempotent })).toBe(expected);
  });
});
