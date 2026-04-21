// packages/shared/src/node/index.test.ts
// Integration smoke test: spin up a real ws WebSocketServer, connect via createNodeGatewayClient,
// assert connect() resolves with canned helloOk payload.
import { describe, it, expect, afterAll } from 'vitest';
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import { createNodeGatewayClient, PROTOCOL_VERSION, GatewayClient } from './index.js';

let server: WebSocketServer;
let port: number;

// Spin up a minimal gateway mock server before tests.
function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    server = new WebSocketServer({ port: 0 }, () => {
      const addr = server.address();
      port = typeof addr === 'object' && addr !== null ? (addr as { port: number }).port : 0;
      resolve();
    });

    server.on('connection', (ws: WsWebSocket) => {
      // 1. Send connect.challenge immediately after connection.
      ws.send(JSON.stringify({
        type: 'event',
        event: 'connect.challenge',
        payload: { nonce: 'server-nonce-123' },
      }));

      // 2. Listen for client's 'connect' request and respond with helloOk.
      ws.on('message', (data: Buffer) => {
        let frame: Record<string, unknown>;
        try { frame = JSON.parse(data.toString()) as Record<string, unknown>; } catch { return; }
        if (frame['method'] === 'connect') {
          ws.send(JSON.stringify({
            type: 'res',
            id: frame['id'],
            ok: true,
            payload: {
              type: 'hello-ok',
              protocol: 3,
              server: { version: '1.0.0', connId: 'smoke-conn-1' },
              features: { methods: ['connect'], events: ['connect.challenge'] },
              snapshot: { presence: [], health: {}, stateVersion: { presence: 0, health: 0 }, uptimeMs: 0 },
              policy: { maxPayload: 1048576, maxBufferedBytes: 1048576, tickIntervalMs: 1000 },
            },
          }));
        }
      });
    });
  });
}

// Start server once for all tests in this file.
await startMockServer();

afterAll(() => {
  server?.close();
});

describe('createNodeGatewayClient (integration smoke)', () => {
  it('exports createNodeGatewayClient as a function', () => {
    expect(typeof createNodeGatewayClient).toBe('function');
  });

  it('exports GatewayClient class', () => {
    expect(typeof GatewayClient).toBe('function');
  });

  it('re-exports PROTOCOL_VERSION = 3', () => {
    expect(PROTOCOL_VERSION).toBe(3);
  });

  it('connect() resolves with hello-ok payload from a real WebSocketServer', async () => {
    const client = createNodeGatewayClient({
      url: `ws://127.0.0.1:${port}`,
      onChallenge: async (_nonce) => ({
        token: 'smoke-token',
        minProtocol: 3,
        maxProtocol: 3,
        client: { id: 'smoke-test', mode: 'backend' },
      }),
      autoReconnect: false,
    });

    const result = await client.connect() as Record<string, unknown>;
    expect(result).toMatchObject({ type: 'hello-ok', protocol: 3 });

    client.close();
  });

  it('createNodeGatewayClient injects ws as WebSocketImpl (returns GatewayClient instance)', () => {
    const client = createNodeGatewayClient({
      url: `ws://127.0.0.1:${port}`,
      onChallenge: async (_nonce) => ({}),
      autoReconnect: false,
    });
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });
});
