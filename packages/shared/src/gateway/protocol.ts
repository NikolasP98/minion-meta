import { uuid } from '../utils/uuid.js';
import { newTraceparent } from './traceparent.js';
import type { RequestFrame } from './types.js';
import { CLIENT_ERROR_CODES, GatewayError } from './envelope-contract.js';

/** Pending request tracker */
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Send a request over a WebSocket and track the pending response.
 * Returns a promise that resolves with the response payload.
 */
export function sendRequest(
  ws: WebSocket,
  pending: Map<string, PendingRequest>,
  method: string,
  params?: unknown,
  timeoutMs = 15000,
  parentTraceparent?: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return reject(GatewayError.client(CLIENT_ERROR_CODES.NOT_CONNECTED, 'not connected'));
    }
    const id = uuid();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(GatewayError.client(CLIENT_ERROR_CODES.TIMEOUT, `request '${method}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    const frame: RequestFrame = { type: 'req', id, method, params, traceparent: newTraceparent(parentTraceparent) };
    try {
      ws.send(JSON.stringify(frame));
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(GatewayError.client(
        CLIENT_ERROR_CODES.SEND_FAILED,
        `request '${method}' send failed`,
        error instanceof Error ? error.message : String(error),
      ));
    }
  });
}

/**
 * Handle an incoming response frame by resolving/rejecting the matching pending request.
 * Returns true if the frame was handled.
 */
export function handleResponseFrame(
  frame: Record<string, unknown>,
  pending: Map<string, PendingRequest>,
): boolean {
  if (frame.type !== 'res' || typeof frame.id !== 'string') return false;
  const p = pending.get(frame.id);
  if (!p) return false;
  pending.delete(frame.id);
  if (frame.ok === true) {
    p.resolve(frame.payload);
  } else {
    // Carries the server's code/details/retryable; message falls back to 'request failed'.
    p.reject(GatewayError.fromServer(frame.error));
  }
  return true;
}

/**
 * Flush all pending requests with an error (e.g. on disconnect).
 */
export function flushPending(pending: Map<string, PendingRequest>, err: Error): void {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}
