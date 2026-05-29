import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

// ── Frame protocol (mirrors minion gateway frame types) ──────────────────────

type RequestFrame = { id: string; type: 'req'; method: string; params?: unknown };
type ResponseFrame = { id: string; type: 'res'; result?: unknown; error?: string };
type EventFrame = { type: 'event'; event: string; payload?: unknown };
type Frame = RequestFrame | ResponseFrame | EventFrame;

// ── Singleton WS connection ───────────────────────────────────────────────────

const GATEWAY_URL = process.env.GATEWAY_URL ?? '';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN ?? '';
// Must match the gateway's PROTOCOL_VERSION (minion protocol-schemas.ts).
const GATEWAY_PROTOCOL_VERSION = 3;

let ws: WebSocket | null = null;
let reconnectDelay = 1_000;
const pending = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function connect() {
  if (!GATEWAY_URL) return;
  ws = new WebSocket(GATEWAY_URL);

  ws.on('message', (raw) => {
    let frame: Frame;
    try { frame = JSON.parse(raw.toString()) as Frame; } catch { return; }

    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      const id = randomUUID();
      // Connect frame must match the gateway's ConnectParamsSchema
      // (protocol/schema/frames.ts, PROTOCOL_VERSION = 3): minProtocol/maxProtocol
      // at root, a required `client` object {id,version,platform,mode}, and the
      // token (if any) nested under `auth`. The challenge is NOT echoed back —
      // additionalProperties:false rejects unknown keys. Omit `auth` entirely
      // for localhost no-auth (gateway bound to 127.0.0.1 needs no token).
      ws!.send(JSON.stringify({
        id, type: 'req', method: 'connect',
        params: {
          minProtocol: GATEWAY_PROTOCOL_VERSION,
          maxProtocol: GATEWAY_PROTOCOL_VERSION,
          client: {
            id: 'gateway-client',
            version: 'dev',
            platform: 'node',
            mode: 'backend',
            instanceId: randomUUID(),
          },
          ...(GATEWAY_TOKEN ? { auth: { token: GATEWAY_TOKEN } } : {}),
        },
      } satisfies RequestFrame));
      return;
    }

    if (frame.type === 'res') {
      const p = pending.get(frame.id);
      if (!p) return;
      pending.delete(frame.id);
      if (frame.error) p.reject(new Error(frame.error));
      else p.resolve(frame.result);
    }
  });

  ws.on('open', () => { reconnectDelay = 1_000; });

  ws.on('close', () => {
    ws = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    if (GATEWAY_URL) setTimeout(connect, reconnectDelay);
  });

  ws.on('error', () => { /* 'close' fires after 'error' */ });
}

if (GATEWAY_URL) connect();

// ── Public helpers ─────────────────────────────────────────────────────────────

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export async function request(method: string, params?: unknown): Promise<unknown> {
  if (!isConnected()) {
    throw new Error(
      `Gateway not connected — check GATEWAY_URL (${GATEWAY_URL || 'not set'}) and GATEWAY_TOKEN.`,
    );
  }
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    pending.set(id, { resolve, reject });
    ws!.send(JSON.stringify({ id, type: 'req', method, params } satisfies RequestFrame));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Gateway RPC timed out after 30s: ${method}`));
      }
    }, 30_000);
  });
}

// Exported for tests.
export function extractReply(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  // IMPORTANT: narrow this to the actual shape after verifying sendVoiceTurn
  // in minion_hub/src/lib/services/gateway.svelte.ts.
  if (typeof r.content === 'string') return r.content;
  if (typeof r.reply === 'string') return r.reply;
  if (typeof r.message === 'string') return r.message;
  if (typeof r.text === 'string') return r.text;
  if (Array.isArray(r.messages)) {
    const last = r.messages[r.messages.length - 1] as { content?: unknown } | null;
    if (last && typeof last.content === 'string') return last.content;
  }
  return null;
}

// Exported for tests.
export function deriveSessionKey(
  sessionMode: 'ephemeral' | 'shared',
  agentId: string,
  runId: string,
  nodeId: string,
): string {
  return sessionMode === 'ephemeral'
    ? `flow-run:${runId}:${nodeId}`
    : `agent:${agentId}:main`;
}

export async function sendAgentTurn(
  agentId: string,
  prompt: string,
  sessionMode: 'ephemeral' | 'shared',
  runId: string,
  nodeId: string,
): Promise<string> {
  const sessionKey = deriveSessionKey(sessionMode, agentId, runId, nodeId);

  const result = await request('chat.send', {
    agentId,
    message: prompt,
    sessionKey,
    deliver: false,
    idempotencyKey: runId,
  });

  const reply = extractReply(result);
  if (reply === null) {
    throw new Error(
      `Agent "${agentId}" returned no recognisable reply. Raw: ${JSON.stringify(result)}`,
    );
  }
  return reply;
}

export async function callGatewayMethod(
  method: string,
  params: Record<string, unknown>,
): Promise<string> {
  const result = await request(method, params);
  const reply = extractReply(result);
  if (reply === null) {
    throw new Error(
      `Gateway method "${method}" returned no recognisable reply. Raw: ${JSON.stringify(result)}`,
    );
  }
  return reply;
}
