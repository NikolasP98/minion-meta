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

/** Codes the gateway emits in `res.error.code`. */
export const GATEWAY_ERROR_CODES = {
  NOT_LINKED: 'NOT_LINKED',
  NOT_PAIRED: 'NOT_PAIRED',
  AGENT_TIMEOUT: 'AGENT_TIMEOUT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  CONFLICT: 'CONFLICT',
} as const;

/** Codes the shared client raises locally. Never sent on the wire. */
export const CLIENT_ERROR_CODES = {
  /** Inbound frame/challenge/hello failed structural validation (discarded or handshake failed). */
  MALFORMED_FRAME: 'MALFORMED_FRAME',
  /** Gateway protocol outside the range the connect params advertised. */
  UNSUPPORTED_PROTOCOL: 'UNSUPPORTED_PROTOCOL',
  /** Outbound request larger than the gateway's announced `policy.maxPayload`; not sent. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** Outbound request rejected locally (empty method, unserializable params). */
  INVALID_REQUEST: 'INVALID_REQUEST',
  NOT_CONNECTED: 'NOT_CONNECTED',
  /** Socket closed / superseded while the call was pending. Effect state unknown. */
  DISCONNECTED: 'DISCONNECTED',
  /** No response inside the timeout. Effect state unknown. */
  TIMEOUT: 'TIMEOUT',
  /** `ws.send` threw. The frame never left; pending bookkeeping was released. */
  SEND_FAILED: 'SEND_FAILED',
} as const;

export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[keyof typeof GATEWAY_ERROR_CODES];
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

/** `res.error` as the gateway emits it (ErrorShapeSchema). */
export interface GatewayErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

/** Codes where the frame never reached the server: effect definitely did not happen. */
const NOT_SENT_CODES: ReadonlySet<string> = new Set([
  CLIENT_ERROR_CODES.NOT_CONNECTED,
  CLIENT_ERROR_CODES.SEND_FAILED,
]);
/** Codes where the effect state is unknown: retry only if the call is idempotent. */
const EFFECT_UNKNOWN_CODES: ReadonlySet<string> = new Set([
  CLIENT_ERROR_CODES.DISCONNECTED,
  CLIENT_ERROR_CODES.TIMEOUT,
]);

/**
 * Every rejection the shared client produces. `source: 'server'` carries the gateway's own
 * code/message/details verbatim; `source: 'client'` is a local decision with a CLIENT_ERROR_CODES code.
 * `message` keeps the legacy strings consumers already match on ('not connected', 'closed (…)', …).
 */
export class GatewayError extends Error {
  readonly code: string;
  readonly source: 'server' | 'client';
  readonly details?: unknown;
  readonly retryAfterMs?: number;
  /** Server-declared `retryable`, or (client) whether the effect may be retried when idempotent. */
  readonly retryable: boolean;

  constructor(source: 'server' | 'client', shape: GatewayErrorShape) {
    super(shape.message);
    this.name = 'GatewayError';
    this.source = source;
    this.code = shape.code;
    this.details = shape.details;
    this.retryAfterMs = shape.retryAfterMs;
    this.retryable = shape.retryable === true;
  }

  static client(code: ClientErrorCode, message: string, details?: unknown): GatewayError {
    const retryable = NOT_SENT_CODES.has(code) || EFFECT_UNKNOWN_CODES.has(code);
    return new GatewayError('client', { code, message, details, retryable });
  }

  /** Map a `res.error` (any shape — the server is not trusted to be well-formed) to a GatewayError. */
  static fromServer(error: unknown): GatewayError {
    const e = isRecord(error) ? error : {};
    return new GatewayError('server', {
      code: isNonEmptyString(e['code']) ? e['code'] : 'UNKNOWN',
      message: typeof e['message'] === 'string' ? e['message'] : 'request failed',
      details: e['details'],
      retryable: e['retryable'] === true,
      retryAfterMs: isNonNegInt(e['retryAfterMs']) ? e['retryAfterMs'] : undefined,
    });
  }
}

/**
 * Retry classification. The client never replays automatically; this is the single rule a caller
 * must consult before doing so. Non-idempotent calls are never retryable: a DISCONNECTED/TIMEOUT
 * call may already have taken effect on the server.
 */
export function canRetry(err: unknown, opts: { idempotent: boolean }): boolean {
  if (!(err instanceof GatewayError)) return false;
  if (err.source === 'client' && NOT_SENT_CODES.has(err.code)) return true;
  return opts.idempotent && err.retryable;
}

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
