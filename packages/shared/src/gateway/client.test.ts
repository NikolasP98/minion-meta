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

  __simulateError(err: unknown): void {
    this.__emit('error', err);
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
    WebSocketImpl: makeMockImpl(mockWs),
    connectTimeoutMs: 999_999,
    requestTimeoutMs: 999_999,
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Helper: perform the full connect handshake synchronously with fake timers
// ---------------------------------------------------------------------------
// Flushes the microtask queue. `connect()` returns a `new Promise` from inside an async function,
// which needs an extra microtask tick for promise-adoption beyond whatever ticks the event itself
// takes to settle — a single `await Promise.resolve()` is not always enough headroom.
async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

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
    const sentReq = JSON.parse(lastMsg) as { id: string; method: string; traceparent?: string };
    expect(sentReq.method).toBe('agents.list');
    // Outgoing frames carry a W3C traceparent for distributed-trace stitching.
    expect(sentReq.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

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

    const MultiImpl = function (_url: string, ..._args: unknown[]): MockWebSocket {
      const next = instances[instanceIdx++];
      if (!next) throw new Error('unexpected extra socket');
      return next;
    };

    const reconnectDelays: number[] = [];
    const client = new GatewayClient({
      url: 'ws://mock-host/gateway',
      onChallenge: async (_nonce) => ({ token: 'x' }),
      WebSocketImpl: MultiImpl,
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
      // The success path resolves through request<T>()'s inner Promise, then sendConnect()'s own
      // await, then the async connect()'s Promise-adoption tick — give it enough headroom before
      // asserting the backoffMs reset landed.
      await flushMicrotasks();
    }

    // --- Trigger close again → the second connect() SUCCEEDED (hello-ok above), and sendConnect()
    // resets backoffMs to 800 on every successful handshake, so the next scheduled delay is 800
    // again, not the pre-reset 1360. Only CONSECUTIVE failed reconnects advance the delay.
    ws2.__simulateClose(1006, 'gone again');

    expect(reconnectDelays).toEqual([800, 800]);
  });

  it('consecutive failed reconnects (no successful handshake in between) advance the backoff to ~1360ms', async () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const instances = [ws1, ws2];
    let instanceIdx = 0;
    const MultiImpl = function (_url: string, ..._args: unknown[]): MockWebSocket {
      const next = instances[instanceIdx++];
      if (!next) throw new Error('unexpected extra socket');
      return next;
    };

    const reconnectDelays: number[] = [];
    const reconnectErrors: unknown[] = [];
    const client = new GatewayClient({
      url: 'ws://mock-host/gateway',
      onChallenge: async (_nonce) => ({ token: 'x' }),
      WebSocketImpl: MultiImpl,
      autoReconnect: true,
      connectTimeoutMs: 999_999,
      requestTimeoutMs: 999_999,
      onReconnectScheduled: (delay) => { reconnectDelays.push(delay); },
      onReconnectError: (err) => { reconnectErrors.push(err); },
    });

    await performConnect(client, ws1);
    ws1.__simulateClose(1006, 'gone');
    expect(reconnectDelays).toEqual([800]);

    vi.advanceTimersByTime(800);
    await Promise.resolve();
    await Promise.resolve();

    // ws2 (the reconnect attempt) closes BEFORE hello completes — that attempt failed.
    ws2.__simulateClose(1006, 'gone before hello');
    await Promise.resolve();
    await Promise.resolve();

    // Exactly one report for the failed attempt, and the next delay advances (~1360ms),
    // since no successful handshake happened in between to reset backoffMs.
    expect(reconnectErrors).toHaveLength(1);
    expect(reconnectDelays).toHaveLength(2);
    expect(reconnectDelays[0]).toBe(800);
    expect(reconnectDelays[1]).toBeCloseTo(1360, -1);
  });

  describe('onEvent handler failures are reported, never discarded', () => {
    it('async onEvent that rejects, no onEventError supplied → console.error fallback fires once', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const thrown = new Error('handler exploded');
      const client = makeClient(mockWs, { onEvent: async () => { throw thrown; } });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'agent.status', payload: {} }));
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [first, second] = consoleErrorSpy.mock.calls[0]!;
      expect(String(first)).toContain('[GatewayClient]');
      expect(String(first)).toContain('agent.status');
      expect(second).toBe(thrown);
    });

    it('sync-throwing onEvent, no onEventError → does not escape, console.error fires once', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs, {
        onEvent: () => { throw new Error('sync boom'); },
      });
      await performConnect(client, mockWs);

      expect(() => {
        mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'chat.message', payload: {} }));
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('async rejection with onEventError supplied → hook called, console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const thrown = new Error('handler exploded');
      const seen: Array<[unknown, unknown]> = [];
      const client = makeClient(mockWs, {
        onEvent: async () => { throw thrown; },
        onEventError: (err, frame) => { seen.push([err, frame.event]); },
      });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'chat.message', payload: {} }));
      await Promise.resolve();
      await Promise.resolve();

      expect(seen).toEqual([[thrown, 'chat.message']]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('sync throw with onEventError supplied → hook called, console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const thrown = new Error('sync boom');
      const seen: Array<[unknown, unknown]> = [];
      const client = makeClient(mockWs, {
        onEvent: () => { throw thrown; },
        onEventError: (err, frame) => { seen.push([err, frame.event]); },
      });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'chat.message', payload: {} }));
      await Promise.resolve();
      await Promise.resolve();

      expect(seen).toEqual([[thrown, 'chat.message']]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('onEventError that itself throws → does not escape, no unhandled rejection, console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs, {
        onEvent: () => { throw new Error('sync boom'); },
        onEventError: () => { throw new Error('reporter also broken'); },
      });
      await performConnect(client, mockWs);

      expect(() => {
        mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'chat.message', payload: {} }));
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('onEventError that rejects (async reporter) → contained, no unhandled rejection, console.error not called', async () => {
      // Real timers on purpose: Node only runs its unhandled-rejection sweep at a real macrotask
      // boundary, which faked setTimeout never reaches. performConnect() clears every timer it
      // arms, so this test leaves nothing pending behind.
      vi.useRealTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandled);
      try {
        const client = makeClient(mockWs, {
          onEvent: () => { throw new Error('sync boom'); },
          onEventError: async () => { throw new Error('async reporter broken'); },
        });
        await performConnect(client, mockWs);

        expect(() => {
          mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'chat.message', payload: {} }));
        }).not.toThrow();

        // Two macrotask boundaries — Node emits unhandledRejection between them if one escaped.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(unhandled).toEqual([]);
        // Fallback behavior for a failed reporter is deliberate silence — there is no second reporter.
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });

    it('fallback console.error output does not contain the event payload', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs, { onEvent: () => { throw new Error('sync boom'); } });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(
        JSON.stringify({ type: 'event', event: 'chat.message', payload: { secret: 'PAYLOAD-CANARY' } }),
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain('PAYLOAD-CANARY');
    });

    it('non-throwing onEvent → console.error not called, handler received the frame (happy path intact)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const received: unknown[] = [];
      const client = makeClient(mockWs, { onEvent: (frame) => { received.push(frame); } });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'agent.status', payload: { ok: true } }));
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(received).toHaveLength(1);
    });

    it('onEvent omitted entirely → no report, no throw (optional handler still optional)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs);
      await performConnect(client, mockWs);

      expect(() => {
        mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'agent.status', payload: {} }));
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('connect.challenge frame with a throwing onEvent → onEvent not invoked (handshake path unchanged)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onEvent = vi.fn(() => { throw new Error('should never run'); });
      const client = makeClient(mockWs, { onEvent });
      const connectPromise = client.connect();
      mockWs.__simulateOpen();
      mockWs.__simulateMessage(
        JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'test-nonce' } }),
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(onEvent).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Drain the handshake so the client doesn't leave a dangling connect() promise.
      const connectMsg = mockWs.sentMessages.find((m) => {
        try { return (JSON.parse(m) as { method?: string }).method === 'connect'; } catch { return false; }
      });
      if (connectMsg) {
        const req = JSON.parse(connectMsg) as { id: string };
        mockWs.__simulateMessage(
          JSON.stringify({ type: 'res', id: req.id, ok: true, payload: { type: 'hello-ok' } }),
        );
      }
      await connectPromise;
    });

    it('two synchronously failing events in a row → exactly two reports, one per event, in arrival order', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs, {
        onEvent: () => { throw new Error('boom'); },
      });
      await performConnect(client, mockWs);

      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'event.one', payload: {} }));
      mockWs.__simulateMessage(JSON.stringify({ type: 'event', event: 'event.two', payload: {} }));
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(String(consoleErrorSpy.mock.calls[0]![0])).toContain('event.one');
      expect(String(consoleErrorSpy.mock.calls[1]![0])).toContain('event.two');
    });
  });

  describe('reconnect-attempt failures are reported, never discarded', () => {
    function makeThrowingReconnectImpl(ws1: MockWebSocket, err: Error) {
      let calls = 0;
      const impl = function (_url: string, ..._args: unknown[]): MockWebSocket {
        calls++;
        if (calls === 1) return ws1;
        throw err;
      };
      return { impl, callCount: () => calls };
    }

    it('reconnect attempt whose connect() rejects → onReconnectError called once with (err, { delayMs }); console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ws1 = new MockWebSocket();
      const thrown = new Error('ws construction failed');
      const { impl, callCount } = makeThrowingReconnectImpl(ws1, thrown);

      const reconnectDelays: number[] = [];
      const reconnectErrors: Array<[unknown, { delayMs: number }]> = [];
      const client = new GatewayClient({
        url: 'ws://mock-host/gateway',
        onChallenge: async (_nonce) => ({ token: 'x' }),
        WebSocketImpl: impl,
        autoReconnect: true,
        connectTimeoutMs: 999_999,
        requestTimeoutMs: 999_999,
        onReconnectScheduled: (delay) => { reconnectDelays.push(delay); },
        onReconnectError: (err, attempt) => { reconnectErrors.push([err, attempt]); },
      });

      await performConnect(client, ws1);
      ws1.__simulateClose(1006, 'gone');
      expect(reconnectDelays).toEqual([800]);

      vi.advanceTimersByTime(800);
      await flushMicrotasks();

      expect(reconnectErrors).toEqual([[thrown, { delayMs: 800 }]]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      // Reporting-only: no further retry invented beyond the two connect() attempts made so far.
      expect(callCount()).toBe(2);
    });

    it('reconnect attempt whose connect() rejects, no onReconnectError supplied → console.error fires once, retains the exact Error, no throw escapes', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ws1 = new MockWebSocket();
      const thrown = new Error('ws construction failed');
      const { impl, callCount } = makeThrowingReconnectImpl(ws1, thrown);

      const client = new GatewayClient({
        url: 'ws://mock-host/gateway',
        onChallenge: async (_nonce) => ({ token: 'x' }),
        WebSocketImpl: impl,
        autoReconnect: true,
        connectTimeoutMs: 999_999,
        requestTimeoutMs: 999_999,
      });

      await performConnect(client, ws1);
      ws1.__simulateClose(1006, 'gone');

      expect(() => {
        vi.advanceTimersByTime(800);
      }).not.toThrow();
      await flushMicrotasks();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [first, second] = consoleErrorSpy.mock.calls[0]!;
      expect(String(first)).toContain('[GatewayClient]');
      expect(String(first).toLowerCase()).toContain('reconnect');
      expect(second).toBe(thrown);
      expect(callCount()).toBe(2);
    });

    it('onReconnectError that throws → contained, no unhandled rejection, console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ws1 = new MockWebSocket();
      const thrown = new Error('ws construction failed');
      const { impl } = makeThrowingReconnectImpl(ws1, thrown);

      const client = new GatewayClient({
        url: 'ws://mock-host/gateway',
        onChallenge: async (_nonce) => ({ token: 'x' }),
        WebSocketImpl: impl,
        autoReconnect: true,
        connectTimeoutMs: 999_999,
        requestTimeoutMs: 999_999,
        onReconnectError: () => { throw new Error('reporter also broken'); },
      });

      await performConnect(client, ws1);
      ws1.__simulateClose(1006, 'gone');

      expect(() => {
        vi.advanceTimersByTime(800);
      }).not.toThrow();
      await flushMicrotasks();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('onReconnectError that rejects (async reporter) → contained, no unhandled rejection, console.error not called', async () => {
      vi.useRealTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandled);
      try {
        const ws1 = new MockWebSocket();
        const thrown = new Error('ws construction failed');
        const { impl } = makeThrowingReconnectImpl(ws1, thrown);

        const client = new GatewayClient({
          url: 'ws://mock-host/gateway',
          onChallenge: async (_nonce) => ({ token: 'x' }),
          WebSocketImpl: impl,
          autoReconnect: true,
          connectTimeoutMs: 999_999,
          requestTimeoutMs: 999_999,
          onReconnectError: async () => { throw new Error('async reporter broken'); },
        });

        await performConnect(client, ws1);
        ws1.__simulateClose(1006, 'gone');

        // Real macrotask boundaries: fake timers never reach Node's unhandled-rejection sweep.
        await new Promise((resolve) => setTimeout(resolve, 850));
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(unhandled).toEqual([]);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });
  });

  describe('socket "error" events are reported, never silently discarded', () => {
    it('ws emits "error" → onSocketError called once with the exact emitted value', async () => {
      const emitted = new Error('socket boom');
      const seen: unknown[] = [];
      const client = makeClient(mockWs, { onSocketError: (err) => { seen.push(err); } });
      await performConnect(client, mockWs);

      mockWs.__simulateError(emitted);
      await Promise.resolve();
      await Promise.resolve();

      expect(seen).toEqual([emitted]);
    });

    it('ws emits "error" without onSocketError → console.error fires once naming the socket error, carries the exact value', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const emitted = new Error('socket boom');
      const client = makeClient(mockWs);
      await performConnect(client, mockWs);

      mockWs.__simulateError(emitted);
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [first, second] = consoleErrorSpy.mock.calls[0]!;
      expect(String(first)).toContain('[GatewayClient]');
      expect(String(first).toLowerCase()).toContain('socket');
      expect(second).toBe(emitted);
    });

    it('ws emits "error" on a stale socket (generation already advanced by a newer connect()) → not reported', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const instances = [ws1, ws2];
      let instanceIdx = 0;
      const MultiImpl = function (_url: string, ..._args: unknown[]): MockWebSocket {
        const next = instances[instanceIdx++];
        if (!next) throw new Error('unexpected extra socket');
        return next;
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const seen: unknown[] = [];
      const client = new GatewayClient({
        url: 'ws://mock-host/gateway',
        onChallenge: async (_nonce) => ({ token: 'x' }),
        WebSocketImpl: MultiImpl,
        connectTimeoutMs: 999_999,
        requestTimeoutMs: 999_999,
        onSocketError: (err) => { seen.push(err); },
      });

      await performConnect(client, ws1);

      // Start a second connect() directly (not via reconnect) — generation advances, ws1 is stale.
      const secondConnectPromise = client.connect();
      ws1.__simulateError(new Error('stale socket error'));
      await Promise.resolve();
      await Promise.resolve();

      expect(seen).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Drain the second connect() so it doesn't leave a dangling promise behind.
      ws2.__simulateOpen();
      ws2.__simulateMessage(
        JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'n2' } }),
      );
      await Promise.resolve();
      await Promise.resolve();
      const connectMsg2 = ws2.sentMessages.find((m) => {
        try { return (JSON.parse(m) as { method?: string }).method === 'connect'; } catch { return false; }
      });
      if (connectMsg2) {
        const req2 = JSON.parse(connectMsg2) as { id: string };
        ws2.__simulateMessage(
          JSON.stringify({ type: 'res', id: req2.id, ok: true, payload: { type: 'hello-ok' } }),
        );
      }
      await secondConnectPromise;
    });

    it('ws "error" does not close the socket, flush pending requests, or schedule a reconnect', async () => {
      let implCalls = 0;
      const CountingImpl = function (_url: string, ..._args: unknown[]): MockWebSocket {
        implCalls++;
        return mockWs;
      };
      const client = new GatewayClient({
        url: 'ws://mock-host/gateway',
        onChallenge: async (_nonce) => ({ token: 'x' }),
        WebSocketImpl: CountingImpl,
        autoReconnect: true,
        connectTimeoutMs: 999_999,
        requestTimeoutMs: 999_999,
      });
      await performConnect(client, mockWs);
      expect(implCalls).toBe(1);

      const reqPromise = client.request<unknown>('pending.method');
      let settled = false;
      reqPromise.then(() => { settled = true; }, () => { settled = true; });

      mockWs.__simulateError(new Error('boom'));
      await Promise.resolve();
      await Promise.resolve();

      // Not closed, not flushed: the pending request is still unsettled and the socket still OPEN.
      expect(settled).toBe(false);
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);

      // Not a reconnect trigger: advancing well past the backoff cap constructs no new socket.
      vi.advanceTimersByTime(20_000);
      await Promise.resolve();
      await Promise.resolve();
      expect(implCalls).toBe(1);
    });

    it('onSocketError that throws → contained, no unhandled rejection, console.error not called', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = makeClient(mockWs, { onSocketError: () => { throw new Error('reporter also broken'); } });
      await performConnect(client, mockWs);

      expect(() => {
        mockWs.__simulateError(new Error('boom'));
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('onSocketError that rejects (async reporter) → contained, no unhandled rejection, console.error not called', async () => {
      vi.useRealTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandled);
      try {
        const client = makeClient(mockWs, {
          onSocketError: async () => { throw new Error('async reporter broken'); },
        });
        await performConnect(client, mockWs);

        expect(() => {
          mockWs.__simulateError(new Error('boom'));
        }).not.toThrow();

        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(unhandled).toEqual([]);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });
  });
});

// Real-client session tests: only socket delivery is synthetic. No network server.
class BrowserSocket {
  private socket = new MockWebSocket();
  get readyState() { return this.socket.readyState; }
  set readyState(value: number) { this.socket.readyState = value; }
  get sentMessages() { return this.socket.sentMessages; }
  send(data: string) { this.socket.send(data); }
  close(code?: number, reason?: string) { this.socket.close(code, reason); }
  addEventListener(event: string, listener: (value: unknown) => void) {
    this.socket.on(event, (...args) => {
      listener(event === 'message' ? { data: args[0] } : event === 'close'
        ? { code: args[0], reason: args[1] } : args[0]);
    });
  }
  __simulateOpen() { this.socket.__simulateOpen(); }
  __simulateMessage(data: string) { this.socket.__simulateMessage(data); }
  __simulateClose(code: number, reason: string) { this.socket.__simulateClose(code, reason); }
}
type SessionSocket = MockWebSocket | BrowserSocket;
type AuthObserver = (hello: unknown, session: { readonly generation: number }) => void | Promise<void>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function startSession(client: GatewayClient) {
  const promise = client.connect();
  void promise.catch(() => {}); // Tests assert the outcome; cleanup must not create an unhandled rejection.
  return promise;
}
function challenge(socket: SessionSocket) {
  socket.__simulateMessage(JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'offline' } }));
}
function requests(socket: SessionSocket, method = 'connect') {
  return socket.sentMessages.map((text) => JSON.parse(text) as { id: string; method: string })
    .filter((frame) => frame.method === method);
}
function helloReply(socket: SessionSocket, payload: unknown) {
  const req = requests(socket).at(-1);
  expect(req).toBeDefined();
  const frame = JSON.stringify({ type: 'res', id: req!.id, ok: true, payload });
  socket.__simulateMessage(frame);
  return frame;
}

describe.each(['node', 'browser'] as const)('authenticated sessions (%s socket delivery)', (mode) => {
  const clients: GatewayClient[] = [];
  const makeSocket = (): SessionSocket => mode === 'node' ? new MockWebSocket() : new BrowserSocket();
  function setup(extra: Partial<ConstructorParameters<typeof GatewayClient>[0]> & { onAuthenticated?: AuthObserver } = {}) {
    const sockets: SessionSocket[] = [];
    const options = {
      url: 'ws://offline.invalid',
      WebSocketImpl: function () { const socket = makeSocket(); sockets.push(socket); return socket; },
      onChallenge: async () => ({ minProtocol: 3, maxProtocol: 3 }),
      connectTimeoutMs: 100,
      requestTimeoutMs: 100,
      ...extra,
    };
    const client = new GatewayClient(options);
    clients.push(client);
    return { client, sockets };
  }
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(async () => {
    for (const client of clients.splice(0)) client.close();
    await flushMicrotasks(12);
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('publishes once after authentication, before caller then, and never for duplicate challenge/response', async () => {
    const auth = deferred<Record<string, unknown>>();
    const onChallenge = vi.fn(() => auth.promise);
    const seen: string[] = [];
    const observer = vi.fn<AuthObserver>(() => { seen.push('observer'); });
    const { client, sockets } = setup({ onChallenge, onAuthenticated: observer });
    const connected = startSession(client);
    void connected.then(() => { seen.push('promise'); });
    const socket = sockets[0]!;
    socket.__simulateOpen();
    challenge(socket); challenge(socket);
    expect(observer).not.toHaveBeenCalled();
    expect(onChallenge).toHaveBeenCalledOnce();
    expect(requests(socket)).toHaveLength(0);
    auth.resolve({ minProtocol: 3, maxProtocol: 3 });
    await flushMicrotasks();
    expect(requests(socket)).toHaveLength(1);
    const hello = { type: 'hello-ok', server: { version: 'first' } };
    const frame = helloReply(socket, hello);
    await expect(connected).resolves.toEqual(hello);
    socket.__simulateMessage(frame); challenge(socket);
    await flushMicrotasks();
    expect(observer).toHaveBeenCalledOnce(); expect(observer).toHaveBeenCalledWith(hello, { generation: 1 });
    expect(onChallenge).toHaveBeenCalledOnce();
    expect(requests(socket)).toHaveLength(1);
    expect(seen).toEqual(['observer', 'promise']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('publishes fresh hello after internal reconnect on the same client, with no request replay', async () => {
    const observer = vi.fn<AuthObserver>();
    const { client, sockets } = setup({ autoReconnect: true, onAuthenticated: observer });
    const connected = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks(); helloReply(sockets[0]!, { version: 'first' });
    await connected;
    const request = client.request('mutation');
    const rejected = expect(request).rejects.toThrow('closed');
    sockets[0]!.__simulateClose(1006, 'offline'); await rejected;
    await vi.advanceTimersByTimeAsync(800);
    const next = sockets[1]!;
    next.__simulateOpen();
    expect(observer).toHaveBeenCalledTimes(1);
    challenge(next); await flushMicrotasks(); helloReply(next, { version: 'second' });
    await flushMicrotasks(12);
    expect(observer.mock.calls).toEqual([[{ version: 'first' }, { generation: 1 }], [{ version: 'second' }, { generation: 2 }]]);
    expect(requests(next, 'mutation')).toHaveLength(0);
    client.close(); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['resolve', 'reject'] as const)('fences delayed old challenge %s and settles superseded promise', async (outcome) => {
    const auth = deferred<Record<string, unknown>>();
    const onChallenge = vi.fn().mockImplementationOnce(() => auth.promise).mockResolvedValue({ fresh: true });
    const observer = vi.fn<AuthObserver>();
    const { client, sockets } = setup({ onChallenge, onAuthenticated: observer });
    const old = startSession(client);
    const oldSettled = vi.fn(); void old.then(oldSettled, oldSettled);
    challenge(sockets[0]!);
    const current = startSession(client);
    await flushMicrotasks();
    expect(oldSettled).toHaveBeenCalledOnce();
    if (outcome === 'resolve') auth.resolve({ stale: true }); else auth.reject(new Error('old challenge failed'));
    await flushMicrotasks(12);
    expect(requests(sockets[1]!)).toHaveLength(0);
    expect(sockets[1]!.readyState).toBe(1);
    challenge(sockets[1]!); await flushMicrotasks(); helloReply(sockets[1]!, { fresh: true });
    await expect(current).resolves.toEqual({ fresh: true });
    expect(observer.mock.calls).toEqual([[{ fresh: true }, { generation: 2 }]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])('fences old response continuation (ok=%s) before replacement', async (ok) => {
    const observer = vi.fn<AuthObserver>();
    const { client, sockets } = setup({ onAuthenticated: observer });
    const old = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks();
    sockets[0]!.__simulateMessage(JSON.stringify({ type: 'res', id: requests(sockets[0]!)[0]!.id, ok, payload: { stale: true }, error: { message: 'old failure' } }));
    const current = startSession(client); // Replace before sendConnect's await resumes.
    await flushMicrotasks(12);
    expect(observer).not.toHaveBeenCalled();
    expect(sockets[1]!.readyState).toBe(1);
    challenge(sockets[1]!); await flushMicrotasks(); helloReply(sockets[1]!, { fresh: true });
    await expect(current).resolves.toEqual({ fresh: true });
    await expect(old).rejects.toThrow();
    expect(observer.mock.calls).toEqual([[{ fresh: true }, { generation: 2 }]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('invalidates explicit close before native close delivery and preserves one close callback', async () => {
    const auth = deferred<Record<string, unknown>>();
    const observer = vi.fn<AuthObserver>(); const onClose = vi.fn();
    const { client, sockets } = setup({ onChallenge: () => auth.promise, onAuthenticated: observer, onClose, autoReconnect: true });
    const connected = startSession(client);
    challenge(sockets[0]!);
    vi.spyOn(sockets[0]!, 'close').mockImplementation(() => { sockets[0]!.readyState = 2; });
    client.close();
    await expect(connected).rejects.toThrow();
    auth.resolve({ stale: true }); await flushMicrotasks(12);
    expect(requests(sockets[0]!)).toHaveLength(0);
    expect(observer).not.toHaveBeenCalled();
    sockets[0]!.__simulateClose(1000, 'done');
    expect(onClose).toHaveBeenCalledOnce(); expect(onClose).toHaveBeenCalledWith(1000, 'done');
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['throw', 'reject', 'diagnostic-throws'] as const)('contains observer %s with fixed nonpayload reporting', async (kind) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => { if (kind === 'diagnostic-throws') throw new Error('sink'); });
    const onReconnectError = vi.fn(), onSocketError = vi.fn(), onEventError = vi.fn();
    const observer: AuthObserver = () => { if (kind === 'reject') return Promise.reject(new Error('private detail')); throw new Error('private detail'); };
    const { client, sockets } = setup({ onAuthenticated: observer, onReconnectError, onSocketError, onEventError });
    const connected = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks(); helloReply(sockets[0]!, { auth: 'synthetic-private' });
    await expect(connected).resolves.toEqual({ auth: 'synthetic-private' });
    await flushMicrotasks(12);
    expect(diagnostic).toHaveBeenCalledOnce(); expect(diagnostic).toHaveBeenCalledWith('[GatewayClient] onAuthenticated observer failed');
    expect(onReconnectError).not.toHaveBeenCalled(); expect(onSocketError).not.toHaveBeenCalled(); expect(onEventError).not.toHaveBeenCalled();
    expect(sockets[0]!.readyState).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['close', 'connect'] as const)('allows observer to %s without corrupting handshake bookkeeping', async (action) => {
    let successor: Promise<unknown> | undefined;
    const observer = vi.fn<AuthObserver>((_hello, session) => {
      if (session.generation !== 1) return;
      if (action === 'close') client.close(); else successor = startSession(client);
    });
    const { client, sockets } = setup({ onAuthenticated: observer });
    const connected = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks(); helloReply(sockets[0]!, { first: true });
    await expect(connected).resolves.toEqual({ first: true });
    if (action === 'connect') {
      expect(successor).toBeDefined();
      challenge(sockets[1]!); await flushMicrotasks(); helloReply(sockets[1]!, { second: true });
      await expect(successor).resolves.toEqual({ second: true });
      expect(observer).toHaveBeenCalledTimes(2);
    } else expect(sockets[0]!.readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['rejection', 'timeout', 'send-throw'] as const)('never publishes failed handshake (%s) and clears timers', async (failure) => {
    const observer = vi.fn<AuthObserver>();
    const { client, sockets } = setup({ onAuthenticated: observer,
      onChallenge: async () => { if (failure === 'rejection') throw new Error('auth rejected'); return {}; },
    });
    const connected = startSession(client);
    const rejected = expect(connected).rejects.toThrow();
    const close = vi.spyOn(sockets[0]!, 'close');
    if (failure === 'send-throw') vi.spyOn(sockets[0]!, 'send').mockImplementation(() => { throw new Error('send failed'); });
    if (failure === 'timeout') await vi.advanceTimersByTimeAsync(100);
    else { challenge(sockets[0]!); await flushMicrotasks(12); }
    await rejected;
    expect(observer).not.toHaveBeenCalled();
    expect(sockets[0]!.readyState).toBe(3);
    if (failure === 'timeout') expect(close).toHaveBeenCalledWith();
    else expect(close).toHaveBeenCalledWith(4008, 'connect failed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the attempt timer if construction throws', async () => {
    const observer = vi.fn<AuthObserver>();
    const { client } = setup({ onAuthenticated: observer,
      WebSocketImpl: function () { throw new Error('constructor failed'); },
    });
    await expect(startSession(client)).rejects.toThrow('constructor failed');
    expect(observer).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not schedule a second reconnect when onClose starts the successor', async () => {
    let successor: Promise<unknown> | undefined;
    const observer = vi.fn<AuthObserver>();
    const { client, sockets } = setup({ autoReconnect: true, onAuthenticated: observer,
      onClose: () => { if (sockets.length === 1) successor = startSession(client); },
    });
    const connected = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks(); helloReply(sockets[0]!, { first: true });
    await connected;
    sockets[0]!.__simulateClose(1006, 'offline');
    challenge(sockets[1]!); await flushMicrotasks(); helloReply(sockets[1]!, { second: true });
    await expect(successor).resolves.toEqual({ second: true });
    await vi.advanceTimersByTimeAsync(1600);
    expect(sockets).toHaveLength(2);
    expect(observer).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('honors close from reconnect scheduling without leaving a timer', async () => {
    const { client, sockets } = setup({ autoReconnect: true, onReconnectScheduled: () => client.close() });
    const connected = startSession(client);
    challenge(sockets[0]!); await flushMicrotasks(); helloReply(sockets[0]!, {});
    await connected;
    sockets[0]!.__simulateClose(1006, 'offline');
    await vi.advanceTimersByTimeAsync(1600);
    expect(sockets).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

});
