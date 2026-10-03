// packages/shared/src/gateway/envelope-contract.ts
// Frozen wire contract for gateway protocol 3 — the validators the shared client applies at its
// inbound (frame, challenge, hello) and outbound (request) boundaries, plus the stable error model.
//
// Server truth this mirrors (minion gateway):
//   src/gateway/protocol/schema/frames.ts        req/res/event, ConnectParams, HelloOk, ErrorShape
//   src/gateway/protocol/schema/error-codes.ts   ErrorCodes
//   src/gateway/server-core/server-constants.ts  MAX_PAYLOAD_BYTES (ws closes 1009 above it)
//   src/gateway/server/ws-connection/message-handler.ts  handshake + post-handshake rejection paths
//
// Identity rule: everything a caller puts in `connect` params (`userId`, `scopes`, `role`, `client`)
// is an ASSERTION. The only server-established identity is what comes back in `hello-ok`
// (`server.connId`, `auth.role`, `auth.scopes`) — see `validateHelloOk().hello.identity`.
import type { GatewayFrame } from './types.js';

/** Newest gateway protocol this package speaks. Hub/Site/Paperclip advertise min=max=3. */
export const PROTOCOL_VERSION = 3;

/** Mirror of the gateway's ws `maxPayload`. A frame above it is closed with 1009 by the server. */
export const MAX_FRAME_BYTES = 25 * 1024 * 1024;

export { GATEWAY_ERROR_CODES, CLIENT_ERROR_CODES, GatewayError, canRetry } from './errors.js';
export type { GatewayErrorCode, ClientErrorCode, GatewayErrorShape } from './errors.js';

// ---------------------------------------------------------------------------
// Primitive guards
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
function isNonNegInt(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0;
}
function isPosInt(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 1;
}

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** W3C traceparent: version 00, lowercase hex, non-zero trace id AND non-zero parent span id. */
export function isValidTraceparent(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = TRACEPARENT_RE.exec(v);
  return m !== null && /[1-9a-f]/.test(m[1]!) && /[1-9a-f]/.test(m[2]!);
}

/** UTF-8 byte length — what the server's `maxPayload` counts. */
export function frameByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

// ---------------------------------------------------------------------------
// Frame validation
// ---------------------------------------------------------------------------

/** Structural defect of a parsed value as a protocol-3 frame, or null when it is a valid frame. */
export function frameDefect(value: unknown): string | null {
  if (!isRecord(value)) return 'frame is not an object';
  switch (value['type']) {
    case 'req':
      if (!isNonEmptyString(value['id'])) return 'req.id must be a non-empty string';
      if (!isNonEmptyString(value['method'])) return 'req.method must be a non-empty string';
      if (value['traceparent'] !== undefined && typeof value['traceparent'] !== 'string') {
        return 'req.traceparent must be a string';
      }
      return null;
    case 'res': {
      if (!isNonEmptyString(value['id'])) return 'res.id must be a non-empty string';
      if (typeof value['ok'] !== 'boolean') return 'res.ok must be a boolean';
      const error = value['error'];
      if (error !== undefined) {
        if (!isRecord(error)) return 'res.error must be an object';
        if (!isNonEmptyString(error['code'])) return 'res.error.code must be a non-empty string';
        if (!isNonEmptyString(error['message'])) return 'res.error.message must be a non-empty string';
        if (error['retryable'] !== undefined && typeof error['retryable'] !== 'boolean') {
          return 'res.error.retryable must be a boolean';
        }
        if (error['retryAfterMs'] !== undefined && !isNonNegInt(error['retryAfterMs'])) {
          return 'res.error.retryAfterMs must be a non-negative integer';
        }
      }
      return null;
    }
    case 'event': {
      if (!isNonEmptyString(value['event'])) return 'event.event must be a non-empty string';
      if (value['seq'] !== undefined && !isNonNegInt(value['seq'])) {
        return 'event.seq must be a non-negative integer';
      }
      const sv = value['stateVersion'];
      if (sv !== undefined) {
        if (!isRecord(sv) || typeof sv['presence'] !== 'number' || typeof sv['health'] !== 'number') {
          return 'event.stateVersion must be { presence: number, health: number }';
        }
      }
      return null;
    }
    default:
      return 'frame.type must be req, res or event';
  }
}

export type ParsedFrame =
  | { ok: true; frame: GatewayFrame }
  | { ok: false; code: 'MALFORMED_FRAME' | 'PAYLOAD_TOO_LARGE'; reason: string };

/**
 * Parse one inbound text message into a validated frame. Never throws. Size is checked before
 * JSON.parse so an oversized message is rejected without allocating its object graph.
 */
export function parseFrame(raw: unknown, maxBytes: number = MAX_FRAME_BYTES): ParsedFrame {
  if (typeof raw !== 'string') return { ok: false, code: 'MALFORMED_FRAME', reason: 'message is not text' };
  // UTF-16 length is a lower bound on UTF-8 bytes: exceeding it in units already exceeds it in bytes.
  if (raw.length > maxBytes || frameByteLength(raw) > maxBytes) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE', reason: `frame exceeds ${maxBytes} bytes` };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'MALFORMED_FRAME', reason: 'invalid JSON' };
  }
  const defect = frameDefect(value);
  if (defect) return { ok: false, code: 'MALFORMED_FRAME', reason: defect };
  return { ok: true, frame: value as GatewayFrame };
}

// ---------------------------------------------------------------------------
// Handshake validation
// ---------------------------------------------------------------------------

export interface ConnectChallenge {
  nonce: string;
  /** Protocol the gateway announced on its first frame (absent on older gateways). */
  protocol?: number;
}

/** `connect.challenge` payload: `{ nonce, ts?, protocol?, version? }`. Null when unusable. */
export function validateConnectChallenge(payload: unknown): ConnectChallenge | null {
  if (!isRecord(payload) || !isNonEmptyString(payload['nonce'])) return null;
  const protocol = payload['protocol'];
  if (protocol !== undefined && !isPosInt(protocol)) return null;
  return protocol === undefined ? { nonce: payload['nonce'] } : { nonce: payload['nonce'], protocol };
}

export interface ProtocolRange {
  min: number;
  max: number;
}

/**
 * The `[minProtocol, maxProtocol]` a connect params object advertises (default: PROTOCOL_VERSION for
 * both, matching `buildConnectParams`). Null when the params advertise an invalid range.
 */
export function protocolRange(params: unknown): ProtocolRange | null {
  if (!isRecord(params)) return null;
  const min = params['minProtocol'] ?? PROTOCOL_VERSION;
  const max = params['maxProtocol'] ?? PROTOCOL_VERSION;
  if (!isPosInt(min) || !isPosInt(max) || min > max) return null;
  return { min, max };
}

export function protocolInRange(protocol: number, range: ProtocolRange): boolean {
  return protocol >= range.min && protocol <= range.max;
}

/** Server-established identity — the only identity a consumer may act on. */
export interface ServerIdentity {
  connId: string | null;
  role: string | null;
  scopes: string[];
}

export interface HelloOkView {
  protocol: number;
  identity: ServerIdentity;
  /** `policy.maxPayload` the gateway will accept from us, when announced. */
  maxPayload?: number;
}

/**
 * Validate a `connect` response payload as `hello-ok`. Requires `type: 'hello-ok'` and an integer
 * `protocol`; every other field is optional but, when present, must have the gateway's shape.
 * Known synthetic consumer fixtures (Hub 14-09, Site 14-10/14-18) send at least these two fields.
 */
export function validateHelloOk(value: unknown): { ok: true; hello: HelloOkView } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: 'hello is not an object' };
  if (value['type'] !== 'hello-ok') return { ok: false, reason: 'hello.type must be "hello-ok"' };
  const protocol = value['protocol'];
  if (!isPosInt(protocol)) return { ok: false, reason: 'hello.protocol must be a positive integer' };

  const server = value['server'];
  if (server !== undefined && !isRecord(server)) return { ok: false, reason: 'hello.server must be an object' };
  const connId = server?.['connId'];
  if (connId !== undefined && !isNonEmptyString(connId)) {
    return { ok: false, reason: 'hello.server.connId must be a non-empty string' };
  }

  const auth = value['auth'];
  let role: string | null = null;
  let scopes: string[] = [];
  if (auth !== undefined) {
    if (!isRecord(auth)) return { ok: false, reason: 'hello.auth must be an object' };
    if (auth['role'] !== undefined && !isNonEmptyString(auth['role'])) {
      return { ok: false, reason: 'hello.auth.role must be a non-empty string' };
    }
    if (auth['scopes'] !== undefined) {
      const s = auth['scopes'];
      if (!Array.isArray(s) || !s.every(isNonEmptyString)) {
        return { ok: false, reason: 'hello.auth.scopes must be an array of non-empty strings' };
      }
      scopes = s;
    }
    role = isNonEmptyString(auth['role']) ? auth['role'] : null;
  }

  const policy = value['policy'];
  let maxPayload: number | undefined;
  if (policy !== undefined) {
    if (!isRecord(policy)) return { ok: false, reason: 'hello.policy must be an object' };
    if (policy['maxPayload'] !== undefined) {
      if (!isPosInt(policy['maxPayload'])) return { ok: false, reason: 'hello.policy.maxPayload must be a positive integer' };
      maxPayload = policy['maxPayload'];
    }
  }

  return {
    ok: true,
    hello: { protocol, identity: { connId: connId ?? null, role, scopes }, maxPayload },
  };
}
