// packages/shared/src/gateway/client.ts
// Runtime-agnostic GatewayClient — browser uses globalThis.WebSocket, Node uses ws via ./node subpath.
import { flushPending, handleResponseFrame, type PendingRequest } from './protocol.js';
import type { EventFrame } from './types.js';
import { uuid } from '../utils/uuid.js';
import { newTraceparent } from './traceparent.js';

export const PROTOCOL_VERSION = 3;

export interface GatewayClientOptions {
  /** WebSocket URL to connect to. */
  url: string;
  /**
   * Optional WebSocket constructor injection (defaults to globalThis.WebSocket).
   * Pass ws's WebSocket class when running in Node.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WebSocketImpl?: any;
  /** Second arg to WebSocket constructor (Node ws accepts headers/maxPayload record). */
  wsConstructorArgs?: [] | [Record<string, unknown>];
  /**
   * Called when server sends connect.challenge.
   * Must return the params object to send with the 'connect' request.
   */
  onChallenge: (nonce: string) => Promise<Record<string, unknown>>;
  /** Called for every inbound event frame except connect.challenge. */
  onEvent?: (frame: EventFrame) => void | Promise<void>;
  /**
   * Called when the `onEvent` handler above throws or rejects.
   * Default when omitted: `console.error` with the event NAME (never the payload — see below).
   * Pass `() => {}` to opt into silence explicitly; the client never discards these errors by default.
   * SHOULD NOT throw or reject: it is invoked from a catch on a fire-and-forget promise. A reporter
   * that fails either way is contained silently (a failed reporter has no second reporter to call)
   * and never escapes as an unhandled rejection.
   */
  // TODO(handoff): hub, site and paperclip still run the console.error default and are unbumped;
  // adoption tracked in proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md.
  // Qualifying all three consumer reporting hooks and the exact installed declarations/archives is
  // tracked in proposals/2026-09-08-platform-qc-remediation.md and the 14-09/14-10/14-02 plans.
  onEventError?: (err: unknown, frame: EventFrame) => void | Promise<void>;
  /**
   * Called when an auto-reconnect attempt fails (the rejection from that attempt's `connect()`).
   * Default when omitted: `console.error`. `attempt.delayMs` is the exact scheduled delay already
   * passed to `onReconnectScheduled` for that attempt.
   * SHOULD NOT throw or reject: a reporter that fails either way is contained silently and never
   * escapes as an unhandled rejection — same discipline as `onEventError`.
   */
  onReconnectError?: (err: unknown, attempt: { delayMs: number }) => void | Promise<void>;
  /**
   * Called on a socket 'error' event (an `Error` under Node's `ws`, typically an `Event` in
   * browsers). Default when omitted: `console.error`. Reporting only — `close` still drives all
   * lifecycle control flow; see the comment at the `error` listener in `wireEvents()`.
   * SHOULD NOT throw or reject: contained silently, same discipline as `onEventError`.
   */
  onSocketError?: (err: unknown) => void | Promise<void>;
  /**
   * Observes each successful current connect handshake, including automatic reconnects.
   * Generation identifies the socket attempt within this client, not a server identity.
   * The connect promise is settled first; observer failures are contained and reported
   * with a fixed message, without exposing the hello or exception payload.
   */
  // TODO(handoff): Hub/Site must publish every accepted session before plugin capability gating;
  // see proposals/2026-09-08-platform-qc-remediation.md and 14-09/14-10/14-06 plans.
  onAuthenticated?: (hello: unknown, session: { readonly generation: number }) => void | Promise<void>;
  /** Called when the socket opens (before challenge handshake completes). */
  onOpen?: () => void;
  /** Called when the socket closes. */
  onClose?: (code: number, reason: string) => void;
  /** Called just before a reconnect delay starts (useful for UI toasts). */
  onReconnectScheduled?: (delayMs: number) => void;
  /**
   * true  = exponential backoff auto-reconnect (browser UX).
   * false = single-shot; close() is final (Node adapter default).
   * Default: false.
   */
  autoReconnect?: boolean;
  /** Timeout for the connect() promise (ms). Default: 10000. */
  connectTimeoutMs?: number;
  /** Default timeout for request<T>() (ms). Default: 15000. */
  requestTimeoutMs?: number;
  /**
   * Optional source of a parent W3C `traceparent`. When it returns one, outgoing
   * request frames descend from that trace (child span id) instead of minting a
   * fresh root — lets a SvelteKit server span parent the gateway RPCs.
   */
  getParentTraceparent?: () => string | undefined | null;
}

/** Handshake ownership stays local to one socket even across asynchronous auth work. */
interface ConnectionAttempt {
  generation: number;
  socket: unknown;
  active: boolean;
  connectSent: boolean;
  resolve: ((value: unknown) => void) | null;
  reject: ((error: Error) => void) | null;
}

export class GatewayClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ws: any = null;
  /** Increments per connect() call to fence stale socket event handlers. */
  private generation = 0;
  private pending = new Map<string, PendingRequest>();
  private attempt: ConnectionAttempt | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 800;
  private closed = false;
  /** Imperatively-set parent traceparent; takes precedence over opts.getParentTraceparent. */
  private parentTraceparent: string | undefined;

  constructor(private readonly opts: GatewayClientOptions) {}

  /** Set (or clear) the parent traceparent that outgoing requests descend from. */
  setParentTraceparent(traceparent: string | undefined | null): void {
    this.parentTraceparent = traceparent ?? undefined;
  }

  /**
   * Open the WebSocket and complete the connect.challenge handshake.
   * Resolves with the HelloOk payload from the server.
   */
  async connect(): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Impl = this.opts.WebSocketImpl ?? (globalThis as any).WebSocket;
    if (!Impl) throw new Error('No WebSocket implementation available. Pass WebSocketImpl or run in a browser.');

    const gen = ++this.generation;
    this.closed = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const previousSocket = this.ws;
    this.ws = null;
    if (this.attempt) {
      this.attempt.active = false;
      this.attempt.reject?.(new Error('connection superseded'));
    }
    flushPending(this.pending, new Error('connection superseded'));
    // Its event handlers are already fenced by the new generation.
    previousSocket?.close();

    const args: unknown[] = this.opts.wsConstructorArgs ?? [];
    return new Promise<unknown>((resolve, reject) => {
      const attempt: ConnectionAttempt = {
        generation: gen, socket: null, active: true, connectSent: false,
        resolve: null, reject: null,
      };
      this.attempt = attempt;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const clearHandshake = () => {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        attempt.resolve = attempt.reject = null;
      };
      attempt.resolve = (value) => { clearHandshake(); resolve(value); };
      attempt.reject = (error) => { clearHandshake(); reject(error); };
      const timeoutMs = this.opts.connectTimeoutMs ?? 10000;
      timer = setTimeout(() => {
        if (!this.isLiveAttempt(attempt)) return;
        this.failHandshake(attempt, new Error(`connect timed out after ${timeoutMs}ms`), true);
      }, timeoutMs);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ws = new (Impl as any)(this.opts.url, ...args);
        attempt.socket = this.ws;
        this.wireEvents(attempt);
      } catch (error) {
        attempt.active = false;
        attempt.reject?.(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Send a gateway request and resolve with the response payload.
   * Rejects if not connected or if the request times out.
   */
  async request<T>(method: string, params?: unknown, opts?: { timeoutMs?: number }): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws: any = this.ws;
    if (!ws || ws.readyState !== 1 /* OPEN */) throw new Error('not connected');
    const id = uuid();
    const timeoutMs = opts?.timeoutMs ?? this.opts.requestTimeoutMs ?? 15000;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v as T); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      const parent = this.parentTraceparent ?? this.opts.getParentTraceparent?.() ?? undefined;
      // TODO(handoff): Generic request send/serialization failures need pending-map cleanup in 14-01;
      // handshake failure cleanup here does not qualify every request. See proposals/2026-09-08-platform-qc-remediation.md.
      ws.send(JSON.stringify({ type: 'req', id, method, params, traceparent: newTraceparent(parent) }));
    });
  }

  /**
   * Gracefully close the connection and cancel any pending reconnect timers.
   * All pending requests are rejected.
   */
  close(code = 1000, reason = 'client close'): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.ws;
    this.ws = null;
    if (this.attempt) {
      this.attempt.active = false;
      this.attempt.reject?.(new Error('disconnected'));
    }
    flushPending(this.pending, new Error('disconnected'));
    this.backoffMs = 800;
    // Keep the attempt identity until the native close event delivers onClose.
    // Any reentrant connect from onClose owns its own fields after this point.
    socket?.close(code, reason);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private wireEvents(attempt: ConnectionAttempt): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws: any = this.ws!;

    // Normalize Node ws (.on) vs browser WebSocket (addEventListener).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const on = (ev: string, fn: (...args: any[]) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (ws as any).on === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ws as any).on(ev, fn);
      } else {
        ws.addEventListener(ev, (e: Event) => fn(e));
      }
    };

    on('open', () => {
      if (!this.isLiveAttempt(attempt)) return;
      this.opts.onOpen?.();
    });

    on('message', (evOrData: unknown) => {
      if (!this.isLiveAttempt(attempt)) return;
      // Node ws fires message(data, isBinary); browser fires MessageEvent.
      let raw: string;
      if (
        typeof evOrData === 'object' &&
        evOrData !== null &&
        'data' in (evOrData as Record<string, unknown>)
      ) {
        raw = String((evOrData as { data: unknown }).data ?? '');
      } else {
        raw = String(evOrData ?? '');
      }
      this.handleMessage(raw, attempt);
    });

    on('close', (evOrCode: unknown, reasonBuf?: unknown) => {
      if (!this.ownsAttempt(attempt)) return;

      // Node ws close(code, reason: Buffer); browser fires CloseEvent.
      let code: number;
      let reason: string;
      if (typeof evOrCode === 'object' && evOrCode !== null && 'code' in (evOrCode as Record<string, unknown>)) {
        const ev = evOrCode as { code: number; reason?: string };
        code = Number(ev.code);
        reason = ev.reason != null ? String(ev.reason) : '';
      } else {
        code = Number(evOrCode ?? 1006);
        reason = reasonBuf != null ? String(reasonBuf) : '';
      }

      this.ws = null;
      attempt.active = false;
      flushPending(this.pending, new Error(`closed (${code}): ${reason}`));
      attempt.reject?.(new Error(`closed before hello (${code})`));
      this.opts.onClose?.(code, reason);

      // onClose can synchronously close or replace this client connection.
      if (this.ownsAttempt(attempt) && this.opts.autoReconnect && !this.closed) {
        this.scheduleReconnect();
      }
    });

    on('error', (err: unknown) => {
      if (!this.ownsAttempt(attempt)) return;
      // close handler fires next — no control-flow action here; reporting only.
      this.reportSocketError(err);
    });
  }

  private handleMessage(raw: string, attempt: ConnectionAttempt): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Malformed JSON — silently discard (T-07-02 mitigation).
      return;
    }

    // TODO(handoff): Validate parsed envelopes/hello payloads in 14-01 before claiming runtime authority;
    // this session notification preserves current wire acceptance. See proposals/2026-09-08-platform-qc-remediation.md.
    if (frame['type'] === 'event') {
      if (frame['event'] === 'connect.challenge') {
        const payload = frame['payload'] as { nonce?: unknown } | undefined;
        const nonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
        if (nonce) {
          void this.sendConnect(nonce, attempt);
        }
        return;
      }
      // The handler may throw synchronously OR return a rejecting promise; both are reported once.
      try {
        void Promise.resolve(this.opts.onEvent?.(frame as unknown as EventFrame))
          .catch((err) => this.reportEventError(err, frame as unknown as EventFrame));
      } catch (err) {
        this.reportEventError(err, frame as unknown as EventFrame);
      }
      return;
    }

    handleResponseFrame(frame, this.pending);
  }

  private reportEventError(err: unknown, frame: EventFrame): void {
    const hook = this.opts.onEventError;
    if (!hook) {
      console.error(`[GatewayClient] onEvent handler failed for event '${frame?.event ?? 'unknown'}':`, err);
      return;
    }
    this.containHook(() => hook(err, frame));
  }

  private reportReconnectError(err: unknown, attempt: { delayMs: number }): void {
    const hook = this.opts.onReconnectError;
    if (!hook) {
      console.error('[GatewayClient] reconnect attempt failed:', err);
      return;
    }
    this.containHook(() => hook(err, attempt));
  }

  private reportSocketError(err: unknown): void {
    const hook = this.opts.onSocketError;
    if (!hook) {
      console.error('[GatewayClient] socket error:', err);
      return;
    }
    this.containHook(() => hook(err));
  }

  /**
   * Shared never-throw containment for a lifecycle-error reporter hook: a sync throw lands in the
   * catch below, a rejection in the .catch. Both arms are silent by design — a failed reporter has
   * no second reporter to escalate to, and must never become an unhandled rejection.
   */
  private containHook(invoke: () => void | Promise<void>): void {
    try {
      void Promise.resolve(invoke()).catch(() => {});
    } catch {
      // A throwing reporter must not escape the caller — this catch's silence is deliberate.
    }
  }

  private ownsAttempt(attempt: ConnectionAttempt): boolean {
    return this.attempt === attempt && this.generation === attempt.generation;
  }

  private isLiveAttempt(attempt: ConnectionAttempt): boolean {
    return this.ownsAttempt(attempt) && attempt.active && !this.closed && this.ws === attempt.socket;
  }

  private failHandshake(attempt: ConnectionAttempt, error: Error, timedOut = false): void {
    if (!this.isLiveAttempt(attempt)) return;
    const socket = this.ws;
    attempt.active = false;
    attempt.reject?.(error);
    flushPending(this.pending, error);
    if (timedOut) socket?.close();
    else socket?.close(4008, 'connect failed');
  }

  private async sendConnect(nonce: string, attempt: ConnectionAttempt): Promise<void> {
    if (!this.isLiveAttempt(attempt) || attempt.connectSent) return;
    attempt.connectSent = true;
    try {
      const params = await this.opts.onChallenge(nonce);
      if (!this.isLiveAttempt(attempt)) return;
      const hello = await this.request<unknown>('connect', params);
      if (!this.isLiveAttempt(attempt)) return;
      this.backoffMs = 800;
      // Settlement clears attempt bookkeeping before an observer can close/reconnect.
      attempt.resolve?.(hello);
      this.notifyAuthenticated(hello, attempt.generation);
    } catch (error) {
      if (!this.isLiveAttempt(attempt)) return;
      this.failHandshake(attempt, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private notifyAuthenticated(hello: unknown, generation: number): void {
    const report = () => {
      try { console.error('[GatewayClient] onAuthenticated observer failed'); }
      catch { /* A broken diagnostic sink must not change transport control flow. */ }
    };
    try {
      void Promise.resolve(this.opts.onAuthenticated?.(hello, { generation })).catch(report);
    } catch {
      report();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = this.backoffMs;
    // Exponential backoff capped at 15000ms (T-07-04 mitigation).
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    const generation = this.generation;
    this.opts.onReconnectScheduled?.(delay);
    if (this.closed || this.generation !== generation) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed || this.generation !== generation) return;
      void this.connect().catch((err) => this.reportReconnectError(err, { delayMs: delay }));
    }, delay);
  }
}
