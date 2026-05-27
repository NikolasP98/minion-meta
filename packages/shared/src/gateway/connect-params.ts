// Shared builder for the WebSocket `connect` handshake params (R8 of
// specs/2026-05-26-auth-token-simplification.md).
//
// The gateway protocol carries auth in the `connect` request params, not in the
// frame types — so every client (hub, site, paperclip) hand-rolled the same
// object shape inside its `onChallenge` callback (protocol version, role,
// scopes, auth.token, userId). This centralizes that shape so protocol-version
// bumps and field renames happen in one place. Returns `Record<string, unknown>`
// to drop straight into `GatewayClientOptions.onChallenge`.

import { PROTOCOL_VERSION } from "./client.js";

export interface ConnectClientInfo {
  id: string;
  displayName?: string;
  version?: string;
  platform?: string;
  mode?: string;
}

export interface BuildConnectParamsInput {
  /** Identifying info for this client (id, version, platform, …). */
  client: ConnectClientInfo;
  /** Connection role, e.g. "operator" | "node". */
  role: string;
  /** Requested scopes. Defaults to []. */
  scopes?: string[];
  /** Capability tags. Defaults to []. */
  caps?: string[];
  /** Shared-secret token (goes in `auth.token`). */
  token?: string | null;
  /** Shared-secret password (goes in `auth.password`). */
  password?: string | null;
  /** Hub-issued OIDC JWT for multi-tenant identity. */
  jwt?: string | null;
  /** User id for per-user RPC scoping. */
  userId?: string | null;
  /** Override the advertised min/max protocol (defaults to PROTOCOL_VERSION). */
  minProtocol?: number;
  maxProtocol?: number;
}

/**
 * Build the params object for the `connect` request. Omits `auth`, `jwt`, and
 * `userId` when not provided so the gateway sees a clean frame.
 */
export function buildConnectParams(input: BuildConnectParamsInput): Record<string, unknown> {
  const auth: { token?: string; password?: string } = {};
  if (input.token) auth.token = input.token;
  if (input.password) auth.password = input.password;
  const hasAuth = auth.token !== undefined || auth.password !== undefined;

  return {
    minProtocol: input.minProtocol ?? PROTOCOL_VERSION,
    maxProtocol: input.maxProtocol ?? PROTOCOL_VERSION,
    client: input.client,
    role: input.role,
    scopes: input.scopes ?? [],
    caps: input.caps ?? [],
    ...(hasAuth ? { auth } : {}),
    ...(input.jwt ? { jwt: input.jwt } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
  };
}
