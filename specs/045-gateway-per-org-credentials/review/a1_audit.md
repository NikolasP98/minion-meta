# Spec 045 A1 — adversarial audit (gateway `b4072205d84` on `45e34c02583`, draft PR #363)

Date: 2026-10-30. Worktree `/home/nikolas/.cache/claude-tmp/gw-043-s4`, branch `feat/entitlements-s4-gateway`.

## Verdict: FIX-FIRST

The connect path holds. It is inert by default, and all four of its new checks resisted every input I tried. Two of the new paths fail their invariants under probing, and both fixes are small:

- **F-1:** `auth.refresh` re-arms a JWT-only socket with a JWT that the JWT-only connect path refuses.
- **F-2:** the new `sessions.patch` label exception picks the agent differently from the handler, so it lets a user write another agent's session.

The `/mcp` hole (F-3) existed before this change, but it contradicts I2 as the spec states it. It is a 5-line fix with no callers to break, so fold it into A1.

Probe method: throwaway vitest files ran the real `message-handler.ts`, `resolveJwtAuth` and `auth-refresh.ts` against real `jose` verification. Each probe used two Ed25519 issuers, injected through `_jwksOverride`, and signed real JWTs. The probes also covered the real `authorizeGatewayMethod` and `resolveGatewaySessionStoreTarget`.

- Probe copies are in `/tmp/claude-1000/-home-nikolas-Documents-CODE-MINION/b31dac90-5266-4618-a3fb-d1e58a03a469/scratchpad/probes/`. They are deleted from the worktree, and `git status` matches the start.
- Gates:
  - the 5 targeted test files pass (81 tests);
  - the `plugin-ui-bridge` contract suite passes (32);
  - `test/ci/` passes (212);
  - `pnpm tsgo` reports 1 error. It is the missing generated `baml_client` module, which this worktree does not have and A1 does not touch.

---

## Findings (ranked)

### F-3 — HIGH (pre-existing on `DEV`, contradicts I2) — `/mcp` Bearer JWT ignores audience binding and revocation
`src/gateway/server.impl.ts:1701`

- **Input.** Any hub user of any org calls `GET /api/gateway/jwt`. Today that returns `aud='openclaw-gateway'`, and after A2 it still does when `gatewayId` is omitted. The user sends the JWT as `Authorization: Bearer` to `/mcp` on any gateway that trusts the hub issuer, with no shared token.
- **Confirmed by execution.**
  - `resolveJwtAuth` accepts a legacy-only `aud` (probe C2d/F1 path).
  - For an identity built exactly the way the `/mcp` resolver builds it (`user` scopes, `orgId: "other-org"`, `assignedAgentIds: []`), `authorizeGatewayMethod` returns ALLOW for `gw.sessions → sessions.list`, `gw.agents → agents.list`, `gw.events → events.list`, `gateway.health` and `gateway.whoami`.
  - It refuses `reliability.summary` and `artifacts.*` (admin), and plugin RPCs fall to admin.
- **Confirmed by reading only.**
  - `sessions.list` (`server-methods/sessions.ts:143-157`) has no org or agent filter. It returns every session on the gateway: keys such as `agent:x:whatsapp:dm:+51…`, labels and origin metadata.
  - No jti or userId revocation check runs on `/mcp`.
  - Nothing in hub or paperclip calls `/mcp` (grep found zero hits), so enforcing the check breaks no client.
- **Impact.** A member of org X can read org Y's session list from Y's gateway until launch step 7 removes `'openclaw-gateway'` from the audience lists. After that, a JWT for any `gw:` host listed on a shared process still works. A1 does not make this worse, but §2 I2 says "refused by every other gateway", and while this hole exists that claim is false.
- **Minimal fix.** Inside the `if (jwt.ok)` branch, apply the same check as `message-handler.ts:494-500`: `aud ∩ loadConfig().gateway?.multiTenant?.jwtOnlyAudiences` is non-empty and `exp` is set. Also add the jti/userId `isRevoked` check. With the default `[]` this turns off JWT access to `/mcp`, which matches the current lack of callers. **Must land before launch step 4 (acceptance)**, and is easiest in A1.

### F-1 — MEDIUM — `auth.refresh` accepts a JWT that JWT-only connect refuses (audience bypass on renewal)
`src/gateway/server-methods/auth-refresh.ts:44-86`

- **Input (confirmed by execution, probe F1).**
  - Setup: a JWT-only socket admitted with `aud=gw:a.example.com`.
  - Action: `auth.refresh` with a real JWT, same user and org, `aud='openclaw-gateway'` only.
- **Observed:** `ACCEPT`, `jwtExp` set, and the timer is re-armed with the legacy JWT's `exp`. The same JWT on connect gets `REFUSE 1008 jwt_audience_not_allowed` (probe C2d).
- **Also observed (F3):** a refresh with an issuer-2 JWT is accepted, which is correct per spec.
- **Impact.**
  - The JWT-only socket can live indefinitely on legacy-aud JWTs, which I2 allows "only alongside the shared token".
  - Rollback does not end existing sockets: emptying `jwtOnlyAudiences` disables new JWT-only connects, but live ones keep renewing.
  - It is not a cross-org escalation, because the identity check (userId/orgId equality) holds.
- **Minimal fix.** In `auth-refresh.ts`, after the identity check, refuse when the socket is JWT-only and the new JWT names none of this gateway's JWT-only audiences:
  ```ts
  if (client.jwtExp !== undefined && !result.aud?.some((a) => jwtOnlyAudiences().includes(a))) {
    respondError(respond, ErrorCodes.FORBIDDEN, "token refresh refused: jwt_audience_not_allowed");
    return;
  }
  ```
  Inject `jwtOnlyAudiences: () => loadConfig().gateway?.multiTenant?.jwtOnlyAudiences ?? []` through `AuthRefreshDeps`, next to `resolveJwt` in `server.impl.ts:1615-1627`. Add a test that uses the legacy aud.

### F-2 — MEDIUM — `sessions.patch` label exception resolves the agent differently from the handler
`src/gateway/server-core/server-methods.ts:248-265`

The authorization check uses `resolveAgentIdFromSessionKey(key)`, which falls back to the constant `DEFAULT_AGENT_ID = "main"` and ignores `session.scope`. The handler uses `resolveGatewaySessionStoreTarget`, which falls back to the **configured** default agent and maps main aliases to `global` under `session.scope=global`.

Confirmed by execution (operator.read+write, `userRole: "user"`):

| Assigned | Params | Auth | Handler target (`resolveGatewaySessionStoreTarget`) |
|---|---|---|---|
| `["main"]`, default agent `faces` | `{key:"main",label}` | ALLOW | `agentId=faces`, `agent:faces:main` |
| `["main"]`, default `faces` | `{key:"global",label}` | ALLOW | `agentId=faces`, `global` |
| `["main"]`, default `faces` | `{key:"whatsapp:dm:+51",label}` | ALLOW | `agentId=faces`, `agent:faces:whatsapp:dm:+51` |
| `["a"]`, `session.scope=global` | `{key:"agent:a:main",label}` | ALLOW | `agentId=faces`, `global` |
| `["faces"]`, default `faces` | `{key:"main",label}` | DENY (false deny) | `agent:faces:main` |

- **Impact.**
  - A user writes the label of, or **creates** (`applySessionsPatchToStore` creates missing entries, `sessions-patch.ts:81-87`), a session in an agent they are not assigned.
  - The response returns that session's full `entry` (`sessions.ts:262-272`). That is a read of another agent's session metadata.
  - It needs a user assigned an agent with id `main` on a gateway whose default agent is not `main`, or `session.scope=global`.
- **Minimal fix.** Decide on the handler's own target:
  ```ts
  const t = resolveGatewaySessionStoreTarget({ cfg: loadConfig(), key: params.key, scanLegacyKeys: false, store: {} });
  if (t.canonicalKey === "global" || t.canonicalKey === "unknown") return false;
  return client.assignedAgentIds.some((id) => normalizeAgentId(id) === t.agentId);
  ```
  The alternative is to keep only the `{key,label}` shape gate in `authorizeGatewayMethod` and do the agent check in the `sessions.patch` handler against `target.agentId`. Add the five rows above as tests.

The other `sessions.patch` probes behaved correctly. All were confirmed by execution:
- `{key,label,model:null}` and extra keys → DENY. JSON cannot carry `undefined`, so that case is moot on the wire.
- `{key}` with no label → DENY.
- A read-only socket → DENY.
- `assignedAgentIds: []` → DENY.
- A label holding a nested object → auth ALLOW, but `validateSessionsPatchParams` rejects it, so it never reaches the store.
- `agent:A:s1` (uppercase) → ALLOW, and the target is agent `a`, which is consistent.
- `agent:a:../../x` → ALLOW. This is harmless: the key is a map key, and the store path comes from the normalized agentId.
- `agent:a b:s` normalizes to `a-b` in both the check and the handler, which is consistent.

### F-4 — LOW — non-JWT write sockets get label-patch on any agent
`server-methods.ts:260`

- `assignedAgentIds` unset → ALLOW for `agent:zzz:s1` (confirmed by execution).
- JWT sockets always carry an array, because `extractUserClaims` requires `agentIds`. So this branch only reaches non-JWT `operator.write` sockets, such as paired devices.
- On `DEV` this method needed admin. T017a accepts it ("admin, or in assignedAgentIds when set"), so I record it, not block on it. If you want no widening for non-JWT sockets, replace `!client.assignedAgentIds` with `return false`.

### F-5 — LOW — a refresh that resolves after the socket closed re-arms a timer
`auth-refresh.ts:84-86`

- **Confirmed by execution (F10):** `ws-connection.ts:246` clears the timer on close. A refresh still awaiting `resolveJwt` then sets a new timer on the dead client.
- The timer holds the client until `exp`+60 s (at most about 16 min at TTL 900), then calls `close` on a closed socket, which is a no-op. It never closes a different socket, because each client owns its own `socket`. Repeated and concurrent refreshes do not stack timers (F11: the timer count is unchanged).
- **Fix:** after the `await`, `if (client.socket.readyState !== client.socket.OPEN) return;` (or the same guard inside `armJwtExpiryClose`).

### F-6 — LOW / INFO — JWT-only audience check is global, not per issuer
`message-handler.ts:494-500`

- **Confirmed by execution (C3):**
  - Setup: issuer 2 is configured with `audience: "openclaw-gateway"` only.
  - Input: issuer 2 signs `aud: ["openclaw-gateway", "gw:a…"]`.
  - Observed: ADMIT (JWT-only), because jose matches the legacy aud and `jwtOnlyAudiences` matches the `gw:` aud.
- This matters only if a second, less-trusted issuer is configured; today there is one hub issuer.
- **Fix (optional):** return the matched issuer from `resolveJwtAuth` and require the admitted aud to be in that issuer's own `audience` list.

### INFO — multi-valued `aud`
`aud: ["gw:a", "gw:other"]` → ADMIT (C1). This is standard any-match behaviour, and only the hub can mint such a token. The hub must never mint multi-host JWTs (A2 note).

---

## Invariants that held

### Confirmed by execution
- **I1 connect matrix (real jose):**
  - `GW:A`, `gw:a ` (trailing space) and `gw:a:443` → `1008 jwt_audience_not_allowed`.
  - A legacy-only aud with JWT-only → 1008.
  - A **wrong** shared token plus a valid `gw:A` JWT → 1008 `unauthorized: gateway token mismatch`. It never falls into the JWT-only path, because `hasSharedAuth` excludes it.
  - An empty-string token plus a JWT → treated as JWT-only: `gw:A` is admitted, legacy is refused. This is correct.
  - An invalid device plus a JWT → 1008 `device identity mismatch`.
  - No `exp` → `jwt_missing_exp`.
  - `exp` 30 s in the past, inside jose's 60 s tolerance → admitted, and the timer fires within about 30 s.
  - `exp` one year out → the timer is clamped to 2^31-1 ms (closes early, which is safe).
- **I2 legacy plus a good token:** admitted with method `token`, `jwtExp` unset, no timer. The same holds without `exp`.
- **I7 inertness (`jwtOnlyAudiences` absent):**
  - JWT-only → refused.
  - Token plus legacy JWT → admitted, read+write, no timer.
  - Token only → admitted with all five scopes, no timer.
  - The per-userId revocation check added on token+JWT connects reads only a store that `hub.token.revoked` fills, and the hub never sends it, so the check is inert.
- **Refresh:**
  - Another orgId or userId → refused, socket not closed.
  - A user socket presenting an admin-role JWT → refused (`reconnect to widen`). `user` → `org_admin` is accepted (same scopes).
  - A revoked userId → refused.
  - JWT-only without `exp` → refused.
  - A `gw:other` aud that is not in the issuer list → refused by jose.
  - The event goes through `broadcastToConnIds(…, Set(["c1"]))` only, and `broadcast` is never called.
  - A token-only admin socket → refused (identity mismatch), where `DEV` used to accept it. No client depends on that: hub, paperclip, site, `@minion-stack/shared` and the native apps have zero `auth.refresh` or `auth.token.refreshed` references.
- **`hub.token.revoked`:**
  - Callable only with `operator.admin`: the shared token, a platform-admin JWT, or an admin device. It is refused for JWT `user` and `org_admin` (the `hub.` prefix sits in `ADMIN_METHOD_PREFIXES`).
  - The sweep closes only sockets whose jti or userId matches (existing test plus reading). Token-only sockets have `userId` undefined and are never matched.
  - A platform admin can revoke anyone. That is acceptable, since admin is already a master key.
- **Plugin bridges:** all 7 edits are `msg.authToken ?? ""`. Every plugin's `connectRpc(_url, _token)` is a no-op stub, and no plugin UI opens a WebSocket, so the edits are harmless. The bridge contract suite passes.

### By reading only
- The timer is armed only after `setClient`, and there is no `await` between the last admission check (line 1086) and `armJwtExpiryClose` (line 1176). Close clears the timer (`ws-connection.ts:246`).
- Tailscale or trusted-proxy plus a JWT without a device skips the JWT-only branch but still hits `device identity required`, so there is no audience bypass there.

## Not checked
- Live gateways: whether `oidcIssuers` is configured in prod, and the default agent id on FACES and netcup. These decide whether F-2 and F-3 are reachable today.
- Real `ws` socket behaviour on `close` after close (assumed a no-op, as `ws` documents).
- `pnpm check` (lint) was not run.

---

## Re-audit (d1f131a84ca)

Date: 2026-10-30. One adversarial pass over `git diff b4072205d84 d1f131a84ca`: 5 source files and 4 test files. Draft PR #363.

### Verdict: SHIP

F-1, F-2, F-3 and F-5 are fixed, and I confirmed each fix by execution against real `jose` verification with two Ed25519 issuers. The fix introduced no regressions. The connect matrix C1–C11 and D1–D3 returned exactly what it returned at A1, so moving the check into the shared `jwtOnlyRefusal` did not change connect behaviour. The open items below are LOW or INFO and existed before this fix; none of them blocks the merge.

**Method.** I adapted the A1 probes and ran them inside the worktree:
- `reaudit-a1-connect.audit.test.ts` covers connect, refresh and `/mcp`.
- `reaudit-a1-sessions.audit.test.ts` covers `sessions.patch` with a switchable `loadConfig` mock that can also throw.
- `reaudit-a1-oldtiming.test.ts` is the A1 version of `jwt-only-connect.test.ts`, run against the fix code.

All three files are deleted. `git status` shows only the 20 `node_modules/.bin` entries that were there at the start.

**Gates:**
- The 4 changed test files pass (79 tests).
- `jwt-only-connect.test.ts` passed 3 times in a row.
- `test/ci/` passes (212).
- `pnpm tsgo` reports 1 error, the same missing `baml_client` module as at A1.

### 1. F-3 `/mcp` Bearer JWT: FIXED
`resolveMcpJwtIdentity` is in `ws-jwt-auth.ts:222` and is called from `server.impl.ts:1700`.

Executed against the real `resolveMcpJwtIdentity`:

| Input | Result |
|---|---|
| M1: legacy `aud` only, list `[A]` | refused (`null`) |
| M2 / M2b: `aud` A, list `[]` or undefined (`?? []`) | refused (`null`) |
| M3: no `exp` | refused (`null`) |
| M4: revoked userId | refused (`null`) |
| M5: revoked jti | refused (`null`) |
| M7: `[legacy, GW:A]` (uppercase) | refused (`null`) |
| M9: garbage token | refused (`null`) |
| M10: expired 120 s ago | refused (`null`) |
| M6: `aud` A | admitted with `operator.read,write` |
| M6b: `aud` A, admin role | admitted with admin scopes, the same as a WS connect |

**Shared-token and OAuth branches (`server.impl.ts:1683-1695`):** the diff does not touch them, so their behaviour is byte-for-byte unchanged. They still run before the JWT branch. Failed JWT validation still returns `null` (401), as before. `scopes: jwt.scopes ?? []` became `result.scopes`, which is always an array on the `ok` branch, so this is a no-op.

**Liveness:**
- `jwtOnlyAudiences` is read live: `loadConfig()` runs on each request, behind the 200 ms config cache. Emptying the list stops `/mcp` JWT access at once.
- `oidcIssuers` is still captured as `cfgAtStart` at `server.impl.ts:1697`. That predates this fix. Changes under `gateway.*` are `kind: "restart"` in `config-reload.ts:88`, so a restart refreshes it. Not a finding.

**Other JWT-accepting HTTP paths:** I grepped `resolveJwtAuth`, `validateGatewayJwt`, `jwtVerify`, `verifyJwt` and `oidcIssuers` across `src` and `extensions`. The only callers that verify hub-issuer JWTs are the WS connect (`message-handler.ts:481,963`), `auth.refresh` (`server.impl.ts:1620`) and `/mcp`. The other `jwtVerify` users are separate gateway-secret schemes that hub JWTs cannot satisfy:
- `users/user-jwt.ts`: free-tier HS256 with `FREE_TIER_JWT_SECRET`, used by `free-tier/users-http.ts` and `middleware/quota.ts`.
- `auth/delegation-token.ts`.

The other Bearer HTTP endpoints go through `authorizeGatewayBearerRequestOrReply`, which checks the shared token only.

### 2. F-1 refresh audience: FIXED
`auth-refresh.ts:74` now applies the shared `jwtOnlyRefusal` to JWT-only sockets. Executed:

| Case | Input | Result |
|---|---|---|
| R1 | JWT-only socket, refresh with a legacy-only `aud` (the JWT also carried plan and features claims) | **REFUSE** `jwt_audience_not_allowed`. `jwtExp`, `jwtJti`, `userRole`, scopes, `assignedAgentIds`, `plan`, `features` and the timer object are all identical before and after. |
| R1b | refresh with `[legacy, GW:A]` | REFUSE, state unchanged |
| R6 | `aud` A, no `exp` | REFUSE `jwt_missing_exp`, state unchanged |
| R7 | `aud` A | ACCEPT |
| R2 | token plus legacy-JWT socket (`jwtExp` unset), refresh with legacy `aud` | ACCEPT, no timer (unaffected) |
| R2b | the same socket, refresh without `exp` | ACCEPT (unaffected) |
| R3 | issuer audience `[legacy, A, B]`, `jwtOnlyAudiences` `[A, B]`, socket opened with A, refresh with `aud` B | **ACCEPT** |
| R4 | live JWT-only socket after `jwtOnlyAudiences` was emptied at runtime, refresh with `aud` A | **REFUSE** |

- **R3 note.** This is acceptable only because `jwtOnlyAudiences` is, by definition, this gateway's own list, so every entry names this gateway. If an operator ever lists another host's `gw:` aud there, both connect and refresh would admit it. That is a config-hygiene rule for the A3 runbook, not a code bug.
- **R4 note.** The rollback gap from A1 is closed: a live socket now stops renewing once the list is emptied.
- **Wire change.** The missing-`exp` refusal code changed from `INVALID_REQUEST` to `FORBIDDEN`. No client consumes `auth.refresh`, as established in A1, so nothing breaks.

### 3. F-2 `sessions.patch`: FIXED
`server-methods.ts:263` now resolves the session target the same way the handler does. Executed with a mocked `loadConfig` and compared with the handler's own `resolveGatewaySessionStoreTarget`:

| Assigned | Config | Key | Auth decision | Handler target (agent / key) |
|---|---|---|---|---|
| `[main]` | default agent `faces` | `main` | **DENY** | `faces` / `agent:faces:main` |
| `[main]` | default agent `faces` | `global` | **DENY** | `faces` / `global` |
| `[main]` | default agent `faces` | `whatsapp:dm:+51` | **DENY** | `faces` / `agent:faces:…` |
| `[a]` | `session.scope=global` | `agent:a:main` | **DENY** | `faces` / `global` |
| `[faces]` | default agent `faces` | `main` | **ALLOW** (the A1 false deny is gone) | `faces` / `agent:faces:main` |

Legitimate label patches are still allowed, and in every case the decision matches the handler's target agent:
- `agent:a:s1`, `agent:A:s1` and the padded `" agent:a:s1 "` → ALLOW for assigned `[a]`.
- `agent:b:s1` → DENY for assigned `[a]`.
- `agent:faces:x` → ALLOW for assigned `[faces]`.
- `agent:main:x` → ALLOW for assigned `[main]`.
- `agent:a:s1` under `scope=global` → ALLOW for assigned `[a]`.
- An unconfigured `agent:zzz:s` → ALLOW for assigned `[zzz]`.
- An empty key → DENY.

**`loadConfig()` cost and failure modes:**
- It runs only on the label-only path. A non-label patch, an admin-scoped patch or `sessions.list` makes 0 calls (P1).
- 1000 label patches took 23 ms in total (P2), and the real function sits behind a 200 ms cache.
- Malformed config: `io.loadConfig` returns `{}` for `INVALID_CONFIG` and for read errors (`config/io.ts:733-743`). The auth check then uses the same `{}` the handler sees, so the two stay consistent and both fall back to `main`.
- The only error it throws is `DuplicateAgentDirError`. In that case `authorizeGatewayMethod` throws (T1) and `handleGatewayRequest` rejects without responding (T2). The WS caller maps that to `UNAVAILABLE` (`message-handler.ts:1298-1301`), and the `/mcp` dispatcher does the same through `.catch`. The result is a refusal, never a crash and never an allow. The handler calls `loadConfig()` itself, so that config state would break it anyway.

**Side effect (narrowing, fine).** A `global` or `unknown` key is now denied before the admin and unset-assignment shortcuts. U1 (unset assignment, `global`) and U3 (`userRole` admin without the admin scope, `global`) moved from ALLOW to DENY. Real admins still pass through the `operator.admin` bypass. **F-4 remains as accepted:** U2, a write socket with no assignment list, is still ALLOWed on `agent:zzz:s1`, and the fix now documents this with a comment at `:272`.

### 4. F-5 late refresh: FIXED
`ws-jwt-auth.ts:40` adds a `readyState` guard. Executed:

| Case | Input | Result |
|---|---|---|
| R5 | refresh after close, `readyState` 2 (closing) | no timer |
| R5 | refresh after close, `readyState` 3 (closed) | no timer |
| R5b | close lands while `resolveJwt` is still in flight | no re-arm |

I checked that the real `ws` WebSocket exposes `OPEN` on the instance through its prototype (`proto OPEN 1`), so the guard works on real sockets and not only on mocks.

Mocks without `readyState` compare `undefined !== undefined`, which is false, so they still arm. The existing tests therefore stay valid. The handler still responds `ACCEPT` and mutates the dead client, which is harmless.

### 5. New regressions: none found
- **Connect semantics.** C1–C11 and D1–D3 are identical to A1:
  - Uppercase, padded or `:443` audiences and a legacy-only `aud` → 1008 `jwt_audience_not_allowed`.
  - No `exp` → `jwt_missing_exp`.
  - A wrong token → token mismatch.
  - An empty token treated as JWT-only works.
  - A token plus legacy JWT is admitted.
  - With the default config, a JWT-only connect is refused.
- **The rewritten timing test** (`jwt-only-connect.test.ts`, "closes … at exp + 60 s"):
  - I ran the A1 version against the fix code, and it passes in isolation (3/3).
  - Its fixed margins (−1 s, then +2 s) could flake: `nowS()` floors `exp` to the second, and `vi.waitFor` advances the fake clock during connect.
  - The new version measures `jwtExp*1000 + GRACE − Date.now()` and asserts the socket is not closed at −10 ms and is closed at +10 ms. That is still meaningful, and tighter: a timer without the grace period would already have fired at −10 ms, and an unarmed timer never fires.
  - The new late-refresh test fails without the guard, because `jwtExpiryTimer` would be set.

### Remaining (non-blocking)
- **F-6 (LOW, open, now also on `/mcp`).**
  - Input: issuer 2 is configured with a legacy-only audience and signs `[legacy, A]`.
  - Observed: `/mcp` ADMIT (M8), and connect ADMIT (C3).
  - It matters only if a second, less-trusted issuer is ever configured. The fix from A1 still applies: bind the admitted aud to the matching issuer's own list.
- **INFO (pre-existing, not introduced by the fix).** On `/mcp`, `authorizeGatewayConnect` (`server.impl.ts:1683`) runs first with the Bearer JWT as `token` and `rateLimiter`. Every legitimate JWT request records a shared-secret failure for the caller's IP (`auth/auth.ts:406-434`). The WS path avoids this, as the comment at `message-handler.ts:436` notes.
  - Inert while `jwtOnlyAudiences` is `[]`.
  - Once `/mcp` JWT use is enabled, heavy callers could rate-limit their own IP, including for the shared token.
  - Fix: try `resolveMcpJwtIdentity` before `authorizeGatewayConnect` when the token looks like a JWS, or call `authorizeGatewayConnect` without `rateLimiter` for JWT-shaped tokens.
- **INFO.** `loadConfig()` is read twice per label patch, once in auth and once in the handler. A config reload between the two calls could change the default agent. The 200 ms cache makes that window tiny, and both reads are fresh.

### Not checked
- A real-socket `/mcp` HTTP round trip: the resolver function was exercised directly, not through `mcp-http.ts`.
- `pnpm check` (lint).
- Live gateway configs: `oidcIssuers`, default agent ids.
