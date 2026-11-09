// Stable transport errors shared by current source and the reviewed compatibility artifact.
/** Codes the gateway emits in `res.error.code`. */
export const GATEWAY_ERROR_CODES = {
  NOT_LINKED: "NOT_LINKED",
  NOT_PAIRED: "NOT_PAIRED",
  AGENT_TIMEOUT: "AGENT_TIMEOUT",
  INVALID_REQUEST: "INVALID_REQUEST",
  FORBIDDEN: "FORBIDDEN",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  CONFLICT: "CONFLICT",
  METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
} as const;

/** Codes the shared client raises locally. Never sent on the wire. */
export const CLIENT_ERROR_CODES = {
  /** Inbound frame/challenge/hello failed structural validation (discarded or handshake failed). */
  MALFORMED_FRAME: "MALFORMED_FRAME",
  /** Gateway protocol outside the range the connect params advertised. */
  UNSUPPORTED_PROTOCOL: "UNSUPPORTED_PROTOCOL",
  /** Outbound request larger than the gateway's announced `policy.maxPayload`; not sent. */
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  /** Outbound request rejected locally (empty method, unserializable params). */
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_CONNECTED: "NOT_CONNECTED",
  /** Socket closed / superseded while the call was pending. Effect state unknown. */
  DISCONNECTED: "DISCONNECTED",
  /** No response inside the timeout. Effect state unknown. */
  TIMEOUT: "TIMEOUT",
  /** `ws.send` threw. Injected transports may throw after dispatch; effect is unknown. */
  SEND_FAILED: "SEND_FAILED",
} as const;

export type GatewayErrorCode =
  (typeof GATEWAY_ERROR_CODES)[keyof typeof GATEWAY_ERROR_CODES];
export type ClientErrorCode =
  (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

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
]);
/** Codes where the effect state is unknown: retry only if the call is idempotent. */
const EFFECT_UNKNOWN_CODES: ReadonlySet<string> = new Set([
  CLIENT_ERROR_CODES.SEND_FAILED,
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
  readonly source: "server" | "client";
  /** Transport evidence only; a response does not itself prove business rollback. */
  readonly dispatch: "not-sent" | "unknown" | "responded";
  readonly details?: unknown;
  readonly retryAfterMs?: number;
  /** Server-declared `retryable`, or (client) whether the effect may be retried when idempotent. */
  readonly retryable: boolean;

  constructor(source: "server" | "client", shape: GatewayErrorShape) {
    super(shape.message);
    this.name = "GatewayError";
    this.source = source;
    this.code = shape.code;
    this.dispatch =
      source === "server"
        ? "responded"
        : [
              CLIENT_ERROR_CODES.NOT_CONNECTED,
              CLIENT_ERROR_CODES.INVALID_REQUEST,
              CLIENT_ERROR_CODES.PAYLOAD_TOO_LARGE,
            ].some((code) => code === shape.code)
          ? "not-sent"
          : "unknown";
    this.details = shape.details;
    this.retryAfterMs = shape.retryAfterMs;
    this.retryable = shape.retryable === true;
  }

  static client(
    code: ClientErrorCode,
    message: string,
    details?: unknown,
  ): GatewayError {
    const retryable =
      NOT_SENT_CODES.has(code) || EFFECT_UNKNOWN_CODES.has(code);
    return new GatewayError("client", { code, message, details, retryable });
  }

  /** Map a `res.error` (any shape — the server is not trusted to be well-formed) to a GatewayError. */
  static fromServer(error: unknown): GatewayError {
    const e = isRecord(error) ? error : {};
    return new GatewayError("server", {
      code: isNonEmptyString(e["code"]) ? e["code"] : "UNKNOWN",
      message:
        typeof e["message"] === "string" ? e["message"] : "request failed",
      details: e["details"],
      retryable: e["retryable"] === true,
      retryAfterMs: isNonNegInt(e["retryAfterMs"])
        ? e["retryAfterMs"]
        : undefined,
    });
  }
}

/**
 * Retry classification. The client never replays automatically; this is the single rule a caller
 * must consult before doing so. Non-idempotent calls are never retryable: a SEND_FAILED/DISCONNECTED/TIMEOUT
 * call may already have taken effect on the server.
 */
export function canRetry(err: unknown, opts: { idempotent: boolean }): boolean {
  if (!(err instanceof GatewayError)) return false;
  if (err.source === "client" && NOT_SENT_CODES.has(err.code)) return true;
  return opts.idempotent && err.retryable;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function isNonNegInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
