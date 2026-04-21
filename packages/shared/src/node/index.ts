// packages/shared/src/node/index.ts
// Node-runtime entry point for the gateway client.
// Consumers: paperclip-minion adapter (pnpm, Node 22+).
// Browser consumers (hub, site) import from '@minion-stack/shared' (main entry) — NOT this file.
// This file is the ONLY entry point in this package that imports 'ws'.
import { WebSocket } from 'ws';
import { GatewayClient, type GatewayClientOptions, PROTOCOL_VERSION } from '../gateway/client.js';

export interface NodeGatewayClientOptions
  extends Omit<GatewayClientOptions, 'WebSocketImpl' | 'wsConstructorArgs'> {
  /** Additional HTTP headers to send during the WebSocket upgrade (Node ws feature). */
  headers?: Record<string, string>;
  /** Max message payload in bytes. Default: 25 MiB. */
  maxPayload?: number;
}

/**
 * Create a GatewayClient instance backed by the `ws` npm package.
 *
 * Use this in Node.js environments (paperclip adapter, scripts).
 * Hub and site use `new GatewayClient(opts)` directly (browser globalThis.WebSocket).
 */
export function createNodeGatewayClient(options: NodeGatewayClientOptions): GatewayClient {
  const { headers, maxPayload, ...rest } = options;
  return new GatewayClient({
    ...rest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WebSocketImpl: WebSocket as unknown as any,
    wsConstructorArgs: [{ headers: headers ?? {}, maxPayload: maxPayload ?? 25 * 1024 * 1024 }],
  });
}

// Re-export shared surface so Node consumers can import everything from one subpath.
export { GatewayClient, PROTOCOL_VERSION } from '../gateway/client.js';
export type { GatewayClientOptions } from '../gateway/client.js';
export * from '../gateway/types.js';
export * from '../gateway/protocol.js';
export * from '../utils/index.js';
