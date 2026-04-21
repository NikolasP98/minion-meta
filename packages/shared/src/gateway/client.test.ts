// packages/shared/src/gateway/client.test.ts
// Unit tests for GatewayClient using a hand-rolled mock WebSocket.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayClient, PROTOCOL_VERSION } from './client.js';

// ---------------------------------------------------------------------------
// Mock WebSocket
// Supports Node ws style (.on()) — that's what the client uses for the mock.
// ---------------------------------------------------------------------------

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.OPEN; // Start as OPEN so send() works immediately after construction
  sentMessages: string[] = [];

  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  // Node ws API
  on(event: string, fn: (...args: unknown[]) => void): this {
    (this.listeners[event] ??= []).push(fn);
    return this;
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.__emit('close', code ?? 1000, reason ?? '');
  }

  private __emit(event: string, ...args: unknown[]): void {
    for (const fn of this.listeners[event] ?? []) fn(...args);
  }

  // Simulation helpers
  __simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.__emit('open');
  }

  __simulateMessage(data: string): void {
    this.__emit('message', data);
  }

  __simulateClose(code: number, reason: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.__emit('close', code, reason);
  }
}

// ---------------------------------------------------------------------------
// Factory: build a GatewayClient with injected MockWebSocket
// connectTimeoutMs set very high so fake timers don't fire the connect timeout.
// requestTimeoutMs set high for the connect sub-request too.
// ---------------------------------------------------------------------------

function makeMockImpl(instance: MockWebSocket) {
  return function MockImpl(_url: string, ..._args: unknown[]) {
    return instance;
  };
}

function makeClient(
  mockWs: MockWebSocket,
  opts: Partial<Omit<ConstructorParameters<typeof GatewayClient>[0], 'WebSocketImpl'>> = {},
) {
  return new GatewayClient({
    url: 'ws://mock-host/gateway',
    onChallenge: async (_nonce) => ({ token: 'test-token', minProtocol: 3, maxProtocol: 3 }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WebSocketImpl: makeMockImpl(mockWs) as any,
    connectTimeoutMs: 999_999,
    requestTimeoutMs: 999_999,
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Helper: perform the full connect handshake synchronously with fake timers
// ---------------------------------------------------------------------------
async function performConnect(client: GatewayClient, mockWs: MockWebSocket): Promise<unknown> {
  const connectPromise = client.connect();
  // Simulate open + challenge
  mockWs.__simulateOpen();
  mockWs.__simulateMessage(
    JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'test-nonce' } }),
  );
  // Let the onChallenge async callback resolve
  await Promise.resolve();
  await Promise.resolve();
  // Find the connect request id from sent messages
  const connectMsg = mockWs.sentMessages.find((m) => {
    try { return (JSON.parse(m) as { method?: string }).method === 'connect'; } catch { return false; }
  });
  if (!connectMsg) throw new Error('connect request not sent');
  const connectReq = JSON.parse(connectMsg) as { id: string };
  const helloPayload = { type: 'hello-ok', protocol: 3, server: { connId: 'conn-1' } };
  mockWs.__simulateMessage(
    JSON.stringify({ type: 'res', id: connectReq.id, ok: true, payload: helloPayload }),
  );
  return connectPromise;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GatewayClient', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exports PROTOCOL_VERSION = 3', () => {
    expect(PROTOCOL_VERSION).toBe(3);
  });

  it('resolves connect() with hello payload after challenge handshake', async () => {
    const client = makeClient(mockWs);
    const connectPromise = client.connect();

    // Socket opens → server sends connect.challenge
    mockWs.__simulateOpen();
    mockWs.__simulateMessage(
      JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'abc-nonce' } }),
    );

    // Let async onChallenge resolve
    await Promise.resolve();
    await Promise.resolve();

    // The client should have sent the 'connect' request
    const connectMsg = mockWs.sentMessages.find((m) => {
      try { return (JSON.parse(m) as { method?: string }).method === 'connect'; } catch { return false; }
    });
    expect(connectMsg).toBeDefined();
    const connectReq = JSON.parse(connectMsg!) as { id: string };

    const helloPayload = { type: 'hello-ok', protocol: 3, server: { connId: 'conn-1' } };
    mockWs.__simulateMessage(
      JSON.stringify({ type: 'res', id: connectReq.id, ok: true, payload: helloPayload }),
    );

    const result = await connectPromise;
    expect(result).toEqual(helloPayload);
  });

  it('request<T>() matches response by id and resolves', async () => {
    const client = makeClient(mockWs);
    await performConnect(client, mockWs);

    // Now send a real request
    const reqPromise = client.request<{ value: number }>('agents.list', { page: 1 });
    const lastMsg = mockWs.sentMessages.at(-1)!;
    const sentReq = JSON.parse(lastMsg) as { id: string; method: string };
    expect(sentReq.method).toBe('agents.list');

    // Simulate matching response
    mockWs.__simulateMessage(
      JSON.stringify({ type: 'res', id: sentReq.id, ok: true, payload: { value: 42 } }),
    );
    const result = await reqPromise;
    expect(result).toEqual({ value: 42 });
  });

  it('request<T>() rejects after requestTimeoutMs', async () => {
    // Use a short requestTimeoutMs for this specific test
    const client = makeClient(mockWs, { requestTimeoutMs: 500 });
    await performConnect(client, mockWs);

    const reqPromise = client.request<unknown>('slow.method');
    // Advance timers past the request timeout (not connect timeout — that's 999999)
    vi.advanceTimersByTime(600);

    await expect(reqPromise).rejects.toThrow("request 'slow.method' timed out after 500ms");
  });

  it('close() flushes pending requests with disconnect error', async () => {
    const client = makeClient(mockWs);
    await performConnect(client, mockWs);

    // Queue a request (no response will come)
    const reqPromise = client.request<unknown>('pending.method');
    // close() should flush it immediately
    client.close();

    // Pending requests are flushed by the close event handler with the close code/reason.
    // (MockWebSocket.close() fires synchronously, so the close handler runs before our explicit flush.)
    await expect(reqPromise).rejects.toThrow(/closed|disconnected/);
  });

  it('does not reconnect when autoReconnect is false (default)', async () => {
    const client = makeClient(mockWs); // autoReconnect not set → defaults to false
    await performConnect(client, mockWs);

    const sentCountBefore = mockWs.sentMessages.length;
    // Simulate unexpected server close
    mockWs.__simulateClose(1006, 'network gone');

    // Advance timers — no reconnect should fire
    vi.advanceTimersByTime(5000);

    // No new messages on the same socket (reconnect would make a new socket)
    expect(mockWs.sentMessages.length).toBe(sentCountBefore);
  });

  it('schedules reconnect with exponential backoff when autoReconnect is true', async () => {
    const instances: MockWebSocket[] = [];
    let instanceIdx = 0;

    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    instances.push(ws1, ws2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MultiImpl = function (_url: string, ..._args: unknown[]): any {
      return instances[instanceIdx++];
    };

    const reconnectDelays: number[] = [];
    const client = new GatewayClient({
      url: 'ws://mock-host/gateway',
      onChallenge: async (_nonce) => ({ token: 'x' }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WebSocketImpl: MultiImpl as any,
      autoReconnect: true,
      connectTimeoutMs: 999_999,
      requestTimeoutMs: 999_999,
      onReconnectScheduled: (delay) => { reconnectDelays.push(delay); },
    });

    // --- First connect ---
    await performConnect(client, ws1);

    // --- Trigger close (unexpected) → should schedule reconnect at 800ms ---
    ws1.__simulateClose(1006, 'gone');
    expect(reconnectDelays).toEqual([800]);

    // Advance 800ms → second connect() fires on ws2
    vi.advanceTimersByTime(800);
    // Let the reconnect's connect() promise start and its async onChallenge run
    await Promise.resolve();
    await Promise.resolve();

    // ws2 should have been opened and gotten the challenge
    ws2.__simulateOpen();
    ws2.__simulateMessage(JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'n2' } }));
    await Promise.resolve();
    await Promise.resolve();

    const connectMsg2 = ws2.sentMessages.find((m) => {
      try { return (JSON.parse(m) as { method?: string }).method === 'connect'; } catch { return false; }
    });
    if (connectMsg2) {
      const req2 = JSON.parse(connectMsg2) as { id: string };
      ws2.__simulateMessage(JSON.stringify({ type: 'res', id: req2.id, ok: true, payload: { type: 'hello-ok' } }));
      await Promise.resolve();
    }

    // --- Trigger close again → backoff should be ~1360ms (800 * 1.7) ---
    ws2.__simulateClose(1006, 'gone again');

    // The second reconnect delay should be 1360 (800 * 1.7)
    expect(reconnectDelays.length).toBeGreaterThanOrEqual(2);
    expect(reconnectDelays[1]).toBeCloseTo(1360, -1);
  });
});
