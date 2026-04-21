// packages/shared/src/gateway/client.ts
// Runtime-agnostic GatewayClient — browser uses globalThis.WebSocket, Node uses ws via ./node subpath.
import { flushPending, handleResponseFrame, type PendingRequest } from './protocol.js';
import type { EventFrame } from './types.js';
import { uuid } from '../utils/uuid.js';

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
}

export class GatewayClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ws: any = null;
  /** Increments per connect() call to fence stale socket event handlers. */
  private generation = 0;
  private pending = new Map<string, PendingRequest>();
  private connectNonce: string | null = null;
  private connectSent = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 800;
  private closed = false;
  private helloResolve: ((value: unknown) => void) | null = null;
  private helloReject: ((err: Error) => void) | null = null;

  constructor(private readonly opts: GatewayClientOptions) {}

  /**
   * Open the WebSocket and complete the connect.challenge handshake.
   * Resolves with the HelloOk payload from the server.
   */
  async connect(): Promise<unknown> {
    this.closed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Impl = this.opts.WebSocketImpl ?? (globalThis as any).WebSocket;
    if (!Impl) throw new Error('No WebSocket implementation available. Pass WebSocketImpl or run in a browser.');

    const args: unknown[] = this.opts.wsConstructorArgs ?? [];
    const gen = ++this.generation;
    this.connectSent = false;
    this.connectNonce = null;

    return new Promise<unknown>((resolve, reject) => {
      this.helloResolve = resolve;
      this.helloReject = reject;

      let connectTimer: ReturnType<typeof setTimeout> | null = null;
      const connectTimeoutMs = this.opts.connectTimeoutMs ?? 10000;
      connectTimer = setTimeout(() => {
        connectTimer = null;
        if (this.generation === gen) {
          this.helloReject?.(new Error(`connect timed out after ${connectTimeoutMs}ms`));
          this.helloResolve = this.helloReject = null;
          this.ws?.close();
        }
      }, connectTimeoutMs);

      const origReject = reject;
      this.helloReject = (err: Error) => {
        if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
        origReject(err);
      };
      this.helloResolve = (value: unknown) => {
        if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
        resolve(value);
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ws = new (Impl as any)(this.opts.url, ...args);
        this.wireEvents(gen);
      } catch (err) {
        if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
        this.helloResolve = this.helloReject = null;
        reject(err instanceof Error ? err : new Error(String(err)));
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
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
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
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
    flushPending(this.pending, new Error('disconnected'));
    this.backoffMs = 800;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private wireEvents(gen: number): void {
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
      if (this.generation !== gen) return;
      this.opts.onOpen?.();
    });

    on('message', (evOrData: unknown) => {
      if (this.generation !== gen) return;
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
      this.handleMessage(raw);
    });

    on('close', (evOrCode: unknown, reasonBuf?: unknown) => {
      if (this.generation !== gen) return;

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
      flushPending(this.pending, new Error(`closed (${code}): ${reason}`));
      this.opts.onClose?.(code, reason);

      // If connect() promise is still pending (closed before hello completed):
      if (this.helloReject) {
        this.helloReject(new Error(`closed before hello (${code})`));
        this.helloResolve = this.helloReject = null;
      }

      if (this.opts.autoReconnect && !this.closed) {
        this.scheduleReconnect();
      }
    });

    on('error', () => {
      // close handler fires next — no action needed here.
    });
  }

  private handleMessage(raw: string): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Malformed JSON — silently discard (T-07-02 mitigation).
      return;
    }

    if (frame['type'] === 'event') {
      if (frame['event'] === 'connect.challenge') {
        const payload = frame['payload'] as { nonce?: unknown } | undefined;
        const nonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
        if (nonce) {
          void this.sendConnect(nonce);
        }
        return;
      }
      void Promise.resolve(this.opts.onEvent?.(frame as unknown as EventFrame)).catch(() => {});
      return;
    }

    handleResponseFrame(frame, this.pending);
  }

  private async sendConnect(nonce: string): Promise<void> {
    if (this.connectSent) return;
    this.connectSent = true;
    try {
      const params = await this.opts.onChallenge(nonce);
      const hello = await this.request<unknown>('connect', params);
      // Successful connect — reset backoff.
      this.backoffMs = 800;
      this.helloResolve?.(hello);
      this.helloResolve = this.helloReject = null;
    } catch (err) {
      this.helloReject?.(err instanceof Error ? err : new Error(String(err)));
      this.helloResolve = this.helloReject = null;
      // Close the socket to trigger reconnect logic if autoReconnect is true.
      this.ws?.close(4008, 'connect failed');
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = this.backoffMs;
    // Exponential backoff capped at 15000ms (T-07-04 mitigation).
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    this.opts.onReconnectScheduled?.(delay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => {});
    }, delay);
  }
}
