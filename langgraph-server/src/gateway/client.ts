import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDeviceAuthPayload,
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
  type DeviceIdentity,
} from './device-identity.js';

// ── Frame protocol (mirrors minion gateway frame types) ──────────────────────
// Response frames carry `ok` + `payload`, with `error` as an object {code,message}.

type RequestFrame = { id: string; type: 'req'; method: string; params?: unknown };
type ResponseFrame = {
  id: string;
  type: 'res';
  ok?: boolean;
  payload?: unknown;
  error?: { code?: string; message?: string };
};
type EventFrame = { type: 'event'; event: string; payload?: unknown };
type Frame = RequestFrame | ResponseFrame | EventFrame;

// ── Singleton WS connection ───────────────────────────────────────────────────

const GATEWAY_URL = process.env.GATEWAY_URL ?? '';
// Must match the gateway's PROTOCOL_VERSION (minion protocol-schemas.ts).
const GATEWAY_PROTOCOL_VERSION = 3;
// Connect identity — must satisfy the gateway's GATEWAY_CLIENT_NAMES / MODES /
// role / scope enums. `operator` + `operator.admin` is the broad backend role
// the canonical minion GatewayClient uses by default.
const CLIENT_ID = 'gateway-client';
const CLIENT_MODE = 'backend';
const CLIENT_ROLE = 'operator';
const CLIENT_SCOPES = ['operator.admin'];

/**
 * Resolve the gateway shared-secret token. Prefer GATEWAY_TOKEN, but fall back to
 * reading it out of the gateway's own config on the same host so the secret never
 * has to be duplicated into the runner's environment. The gateway's auth.mode is
 * `token`, so a token is required even over loopback.
 */
function resolveGatewayToken(): string {
  const fromEnv = process.env.GATEWAY_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const stateDir = process.env.MINION_STATE_DIR?.trim() || path.join(os.homedir(), '.minion');
  try {
    const raw = fs.readFileSync(path.join(stateDir, 'gateway.json'), 'utf8');
    const token = (JSON.parse(raw) as { gateway?: { auth?: { token?: unknown } } })?.gateway?.auth
      ?.token;
    return typeof token === 'string' ? token : '';
  } catch {
    return '';
  }
}

const GATEWAY_TOKEN = resolveGatewayToken();
const deviceIdentity: DeviceIdentity = loadOrCreateDeviceIdentity();

let ws: WebSocket | null = null;
let authed = false;
let reconnectDelay = 1_000;
const pending = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function buildConnectParams(nonce: string | null): Record<string, unknown> {
  const signedAtMs = Date.now();
  const token = GATEWAY_TOKEN || null;
  const payload = buildDeviceAuthPayload({
    deviceId: deviceIdentity.deviceId,
    clientId: CLIENT_ID,
    clientMode: CLIENT_MODE,
    role: CLIENT_ROLE,
    scopes: CLIENT_SCOPES,
    signedAtMs,
    token,
    nonce,
  });
  return {
    minProtocol: GATEWAY_PROTOCOL_VERSION,
    maxProtocol: GATEWAY_PROTOCOL_VERSION,
    client: {
      id: CLIENT_ID,
      version: 'dev',
      platform: 'node',
      mode: CLIENT_MODE,
      instanceId: randomUUID(),
    },
    role: CLIENT_ROLE,
    scopes: CLIENT_SCOPES,
    ...(GATEWAY_TOKEN ? { auth: { token: GATEWAY_TOKEN } } : {}),
    // Signed device identity — the gateway auto-pairs local (loopback) devices
    // silently, so presenting a valid signature is sufficient over 127.0.0.1.
    device: {
      id: deviceIdentity.deviceId,
      publicKey: publicKeyRawBase64UrlFromPem(deviceIdentity.publicKeyPem),
      signature: signDevicePayload(deviceIdentity.privateKeyPem, payload),
      signedAt: signedAtMs,
      ...(nonce ? { nonce } : {}),
    },
  };
}

function connect() {
  if (!GATEWAY_URL) return;
  authed = false;
  ws = new WebSocket(GATEWAY_URL);

  ws.on('message', (raw) => {
    let frame: Frame;
    try { frame = JSON.parse(raw.toString()) as Frame; } catch { return; }

    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      const payload = frame.payload as { nonce?: unknown } | undefined;
      const nonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
      const id = randomUUID();
      // Track the connect request so we learn whether the handshake (hello-ok)
      // actually succeeded, rather than assuming connection on socket-open.
      pending.set(id, {
        resolve: () => {
          authed = true;
        },
        reject: (e) => {
          authed = false;
          console.error(`[gateway] connect handshake failed: ${e.message}`);
          ws?.close(1008, 'connect failed');
        },
      });
      ws!.send(
        JSON.stringify({
          id,
          type: 'req',
          method: 'connect',
          params: buildConnectParams(nonce),
        } satisfies RequestFrame),
      );
      return;
    }

    if (frame.type === 'res') {
      const p = pending.get(frame.id);
      if (!p) return;
      pending.delete(frame.id);
      if (frame.ok === false || (frame.ok === undefined && frame.error)) {
        p.reject(new Error(frame.error?.message ?? 'unknown gateway error'));
      } else {
        p.resolve(frame.payload);
      }
    }
  });

  ws.on('open', () => { reconnectDelay = 1_000; });

  ws.on('close', () => {
    ws = null;
    authed = false;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    if (GATEWAY_URL) setTimeout(connect, reconnectDelay);
  });

  ws.on('error', () => { /* 'close' fires after 'error' */ });
}

if (GATEWAY_URL) connect();

// ── Public helpers ─────────────────────────────────────────────────────────────

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN && authed;
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
  // Canonical agent session key is `agent:<agentId>:<rest>` — the gateway
  // resolves which agent to run from that prefix. Ephemeral runs still need the
  // agent encoded (the rest stays unique per run/node so they don't share
  // history); a bare `flow-run:...` key has no agent and chat.send can't route it.
  return sessionMode === 'ephemeral'
    ? `agent:${agentId}:flow-run:${runId}:${nodeId}`
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

  // NB: chat.send's schema is `additionalProperties: false` and has no agentId —
  // the agent is derived from the sessionKey prefix above. Passing agentId here
  // makes the gateway reject the whole call ("unexpected property 'agentId'").
  const result = await request('chat.send', {
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

/** Result of one channel-node delivery attempt. */
export type ChannelSendResult = { ok: boolean; messageId?: string; error?: string };

/**
 * Deliver a message to one channel destination via the built-in gateway `send`
 * RPC (channel-agnostic; the gateway routes to the right channel plugin). Unlike
 * callGatewayMethod this does NOT expect a text reply — `send` returns a delivery
 * receipt ({messageId, channel, …}) — and it never throws: a failed delivery is
 * reported as `{ok:false, error}` so a channel node can report per-destination
 * success without aborting the whole flow.
 */
export async function sendChannelMessage(
  channel: string,
  to: string,
  message: string,
  accountId: string | undefined,
  runId: string,
  nodeId: string,
  index: number,
): Promise<ChannelSendResult> {
  try {
    const result = await request('send', {
      to,
      message,
      channel,
      ...(accountId ? { accountId } : {}),
      // Stable per-destination key so the gateway dedupes retries of the same run.
      idempotencyKey: `flow:${runId}:${nodeId}:${index}`,
    });
    const messageId = (result as { messageId?: unknown } | null)?.messageId;
    return { ok: true, messageId: typeof messageId === 'string' ? messageId : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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
