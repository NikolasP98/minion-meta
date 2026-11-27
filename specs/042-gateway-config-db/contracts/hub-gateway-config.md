# Contracts: hub ⇄ gateway config

All hub endpoints under `/api/internal/*` are server-to-server, authenticated with the gateway metrics bearer **and** the `x-minion-server-id` header; `hooks.server.ts` already bypasses the session gate for this prefix.

## 1. Channel hydration (existing, tightened in S1)

`GET /api/internal/channels/resolved`
- Headers: `authorization: Bearer <hubMetrics.apiKey>`, `x-minion-server-id: <hubMetrics.serverId>` (**required** from S1; 401 `{error:"missing server id"}` without it).
- Response `200 {channels: HydrationItem[]}` where `HydrationItem = {accountId, type, orgId, projection: {enabled, allowFrom[], groupAllowFrom[], requireMention, replies:'none'|'bound', settings{}, authRef|null}}`, rows filtered `channels.gateway_id = resolveGatewayId(serverId)`.
- Never includes `credentials*`.

## 2. Change signal (existing endpoint, per-gateway targeting from S1/S3)

`POST https://<gateway-host>[:port]/events/cache-invalidate`
- Headers: `authorization: Bearer <gateway row token>`.
- Body: `{type:"cache.invalidate", payload:{tags: string[]}}` (unchanged shape).
- Tags: `channel:<type>:<accountId>` (existing) and `gateway-settings:<gatewayId>:<section>:<version>` (S6).
- Gateway behaviour: `204`; detached re-pull of the affected store; mirror compare log line.
- Hub target resolution: `channels.gateway_id` / `gateway_settings.gateway_id` → `gateway.url` → scheme `wss→https`, `ws→http`; one `HttpBroadcaster` per distinct url.

## 3. Settings hydration (new, S6)

`GET /api/internal/gateways/settings`
- Same auth + header as §1.
- Response `200 {gatewayId, sections: [{section, value, version, updatedAt}]}` for `gateway_settings.gateway_id = resolveGatewayId(serverId)`.

## 4. Settings write (new, S5)

`PUT /api/gateways/{gatewayId}/settings/{section}` (hub session auth, `requireOrgCapability('gateways','edit')` on the gateway's org)
- Body: `{value: object, expectedVersion?: number}`.
- 400 when `section` is bootstrap/secret or `value` fails the JSON schema for that section; 409 when `expectedVersion` mismatches; 200 `{section, version, updatedAt}` on success, then §2 signal.

`GET /api/gateways/{gatewayId}/settings` → `{sections: [...]}` for the editor.

## 5. Gateway observable (existing `health` RPC, extended; S1 and S6)

```jsonc
"channelConfig": {
  "source": "json" | "db",
  "orgScopeSource": "json" | "db",
  "runtimeApply": boolean,
  "mirrorSize": number,
  "mirrorLastHydratedAt": number | null,
  "lastSignalAt": number | null,
  "jsonFallbacks": number,          // mirror misses since boot
  "accountOrgsFromMirror": number
},
"settingsConfig": {                 // S6
  "source": "json" | "db",
  "sections": string[],
  "versions": { "<section>": number },
  "lastHydratedAt": number | null,
  "snapshotAt": number | null,
  "pendingRestart": string[],
  "invalid": { "<section>": "<reason>" }
}
```

## 6. Operator chat commands (S4)

`/allowlist add|remove …`, `/config set|unset channels.*`, owners commands on channel keys → reply `Managed in the hub: <hubUrl>/settings/channels` and no file write. Exit code/semantics of other paths unchanged.

## 7. `minion config shrink` CLI (S4)

`minion config shrink [--apply]` → prints removed paths; with `--apply` writes `gateway.json.bak-042-<ISO>` then the shrunk file; refuses when `CHANNEL_CONFIG_SOURCE!=db` or the mirror is empty.
