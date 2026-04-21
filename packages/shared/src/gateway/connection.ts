import type { PendingRequest } from './protocol.js';
import { flushPending } from './protocol.js';

export interface ConnectionOptions {
  url: string;
  onMessage: (data: string) => void;
  onConnected: () => void;
  onDisconnected: (code: number, reason: string) => void;
}

export interface ConnectionState {
  ws: WebSocket | null;
  generation: number;
  pending: Map<string, PendingRequest>;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  backoffMs: number;
  closed: boolean;
}

/**
 * Create a fresh connection state.
 */
export function createConnectionState(): ConnectionState {
  return {
    ws: null,
    generation: 0,
    pending: new Map(),
    reconnectTimer: null,
    backoffMs: 800,
    closed: false,
  };
}

/**
 * Open a WebSocket connection with auto-reconnect on close.
 */
export function connect(state: ConnectionState, opts: ConnectionOptions): void {
  state.closed = false;

  // Close existing socket
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }

  try {
    const gen = ++state.generation;
    state.ws = new WebSocket(opts.url);

    state.ws.addEventListener('message', (ev) => {
      if (state.generation !== gen) return;
      opts.onMessage(String(ev.data ?? ''));
    });

    state.ws.addEventListener('close', (ev) => {
      if (state.generation !== gen) return;
      state.ws = null;
      flushPending(state.pending, new Error(`closed (${ev.code}): ${ev.reason}`));
      opts.onDisconnected(ev.code, ev.reason ?? '');
      scheduleReconnect(state, opts);
    });

    state.ws.addEventListener('error', () => {
      // close handler fires next
    });
  } catch {
    state.ws = null;
  }
}

/**
 * Gracefully disconnect and stop reconnecting.
 */
export function disconnect(state: ConnectionState): void {
  state.closed = true;
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  flushPending(state.pending, new Error('disconnected'));
  state.backoffMs = 800;
}

function scheduleReconnect(state: ConnectionState, opts: ConnectionOptions): void {
  if (state.closed) return;
  const delay = state.backoffMs;
  state.backoffMs = Math.min(state.backoffMs * 1.7, 15000);
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    connect(state, opts);
  }, delay);
}
