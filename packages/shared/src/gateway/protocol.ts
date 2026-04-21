import { uuid } from '../utils/uuid.js';
import type { RequestFrame, ResponseFrame } from './types.js';

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
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('not connected'));
    }
    const id = uuid();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`request '${method}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    const frame: RequestFrame = { type: 'req', id, method, params };
    ws.send(JSON.stringify(frame));
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
  if (frame.type !== 'res') return false;
  const p = pending.get(frame.id as string);
  if (!p) return false;
  pending.delete(frame.id as string);
  if (frame.ok) {
    p.resolve(frame.payload);
  } else {
    const err = frame.error as { message?: string } | undefined;
    p.reject(new Error(err?.message ?? 'request failed'));
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
