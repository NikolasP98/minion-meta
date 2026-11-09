# A3 audit: hub client, per-gateway JWT (hub PR #623)

- **Scope:** `git diff origin/feat/045-gateway-jwt-issuance...HEAD` (`0fb2d8ef`, `594da277`, `88df9b80`). Worktree `hub-045-a3`.
- **Compared against:** gateway A1 `gw-043-s4` HEAD `13f8fe97e8a` (includes `d1f131a84ca`).
- **Date:** 2026-10-30.

## Verdict: FIX-FIRST

- **Merging with the flag unset is safe.** Nothing found breaks today's client.
- **Do not take T037 to the owner's step-2a sign-off as it stands.**
  - The inventory misses real admin calls: the whole reliability dashboard, the secrets "clear" calls and every plugin RPC.
  - After the switch, one page every user can open (`/account/connections`) freezes the browser tab.
- **Fix F1 and F2 before step 2a.** F3 to F6 are small.

## Tests run

**Suites (all green):**
- The 6 A3 test files: 44/44.
- `src/lib/routes`, `src/lib/plugins`, `src/lib/services` and every changed test file: 40 files, 461 tests.
- `gateway-jwt-probe-core.test.ts`: green.

**Every run** used `env -u SUPABASE_DB_URL -u DATABASE_URL` and touched no integration test or real DB/gateway. All throwaway probes were deleted, and `git status` is clean, as it was at the start.

## Findings, by severity

### F1 (High): T037's admin list is incomplete, so the owner would accept the wrong list

**Where:** `src/lib/services/gateway/method-inventory.test.ts:107-125`.

**The scanner only finds:**
- a literal method passed as the first argument of `sendRequest(…)` or `.request(…)`;
- a non-literal first argument of `sendRequest`, which it reports as a dynamic call site.

**Robustness probes (executed: throwaway files under `src/lib`, then the test was run):**

| Probe | Caught? |
|---|---|
| `sendRequest('agents.delete')` in a new `.ts` file | caught |
| `getClient()?.request('cron.remove')` | caught |
| `sessions.patch` with an extra field, in a `.svelte` file | caught |
| a variable method (`sendRequest(m)`) | caught, but only as "unknown dynamic site" |
| `` sendRequest(`update.${x}`) `` | **missed** (test stays green) |
| a wrapper with the method in a later argument: `rel.load(owner, 'agents.delete')` | **missed** |
| `client.request(m)` with a variable | **missed** |
| a ternary inside an allowlisted dynamic site | **missed** |

**Real misses found by executing a sweep.** The sweep took every gateway method name from A1's sources and searched all browser files for it as a quoted string. The admin-scope calls missing from `PLATFORM_ADMIN_ONLY`:
- **Reliability dashboard:** `reliability.summary`, `.events`, `.timeline`, `.flow`, `.usage`, `.activity`, `.perf` (`state/reliability/reliability.svelte.ts:174-242`, via `resources.x.load(owner, '<method>')`).
  - Their errors go through `owner.request`, which bypasses the `sendRequest` "your role can't" guard.
- **Secrets:** `secrets.clear` and `secrets.clear_scoped` (`SecretsSection.svelte:175-176`). They are a ternary inside an allowlisted dynamic site, so the scanner's `SECRETS_METHODS.x` resolution never runs.
- **Plugins:** every plugin RPC forwarded by `PluginIframe.forwardRpc` (`PluginIframe.svelte:76`).
  - The `plugins.*` prefix is admin on A1 (`ADMIN_METHOD_PREFIXES`). Plugin-specific methods (`studio.generate` etc.) fall through to admin.
  - The plugin settings and control centres fail for members and org admins.
- **ChannelLinking:** its form `submitMethod`, a plugin-declared method.

**The copied rule set is faithful.** I diffed READ, WRITE, APPROVAL and PAIRING against A1 HEAD: 0 differences either way.

**Minimal fix:**
- Add the reliability methods and `secrets.clear*` to the list, or gate those panels with `gatewayMethodAllowed`.
- Classify `PluginIframe` and `ChannelLinking` as "admin for members" in the sign-off text.
- Widen the scanner to catch any quoted string that equals a gateway method name, which is what my sweep did.

### F2 (High, after the switch): `/account/connections` hangs the tab for members

**Where:** `src/lib/components/users/ChannelLinking.svelte:114-134`. Pre-existing code; A3 makes it fatal.

**The loop:** `channels.plugins.list` is in `PLATFORM_ADMIN_ONLY`, so with the flag `false` the guard refuses it client-side. The `$effect` (`conn.connected && plugins.length === 0 && !loading`) then calls `loadPlugins()` again every time `loading` drops back to false.

**Executed (happy-dom mount):**
- Real `gateway-rpc` guard, flag `false`, `role: 'user'`: the test never reached its 1 s timer or its 30 s timeout. vitest was killed at 200 s, so the event loop was starved.
- Control, the same component with a 20 ms network refusal: 49 attempts per second. Without the guard, it hammers the gateway instead.

**Fix:** add `&& !loadError` to the effect condition, and skip `loadPlugins` when `!gatewayMethodAllowed('channels.plugins.list')`.

**Unchecked:** I did not sweep the rest of `src` for other "retry while empty" effects.

### F3 (Medium): T037 does not model A1's `sessions.patch` label rule after `d1f131a84ca`

**Where:** `method-inventory.test.ts:61-73` checks only the `{key,label}` shape.

**What A1 also requires** (`server-methods.ts:262-276`):
- the key resolves to a non-global, non-unknown session;
- for any socket that has `assignedAgentIds`, the agent is in that list. Every hub JWT carries an array, possibly `[]`.

**Consequence:** a member whose JWT `agentIds` lacks the chat's agent cannot use "New chat" (`chat-rpc.ts:60`). `resetChat` throws. Auto-rename also fails.

**Confirmed by reading only.** It depends on prod `user_agents` data.

**Fix:**
- Add a member `sessions.patch {key,label}` case to the T040 probe matrix.
- State the assignment condition in the step-2a text.

### F4 (Low to Medium): the auto-provision path now writes `config.patch` and can blank the personality

**Where:**
- `personal-agent.svelte.ts:89` posts `{}` to `/api/personal-agent/create`.
- For a non-active row the route passes `identity{name: displayName, personality: ''}`. The existing test `create/server.test.ts:25-31` shows this.
- `activatePersonalAgent` then sends `config.patch` with `personality.text: ''` (`personal-agent-provisioner.ts:146-166`).

**The risk:** an `error`-state agent that already exists on the gateway with a personality gets it wiped. Before, the browser did `agents.create` only.

**Rare, because:** the layout self-heal (`(app)/+layout.server.ts:210-226`) runs first, without identity, and usually wins.

**Otherwise this matches today's behaviour:**
- It is the same capability for admins and members: own pending agent only, server credential.
- It targets the org's gateway (`resolveOrgChannelTarget`), not the browser's active host. That is better.

**Fix:** pass `identity` only when the body names one.

### F5 (Low): an issuance outage at initial connect gets no retry

**Where:** `gateway.svelte.ts:757-797`.

**Behaviour:** with the flag `false`, a 503 from `/api/gateway/jwt` shows the "could not load gateway token" toast and stops.
- The legacy `fetchHostToken` retried a 503 once, honouring Retry-After (`hosts.svelte.ts:95-99`).
- A2 maps pool pressure to 503.

**Reconnects are fine:** an outage during auto-reconnect throws in `onChallenge`, then gets `failHandshake` (4008) and the client's exponential backoff. Confirmed in the shared client code.

**Fix:** one retry on a 503 in `requestGatewayJwt`.

### F6 (Low): the probe script's "read-only" and cross-gateway claims have gaps

**Where:** `scripts/qa/gateway-jwt-probe.ts`.

1. **`assertSigningKeyUsable` only tries `openSecret`.**
   - `loadActiveSigningKey` also needs `JSON.parse` and `importJWK` to succeed.
   - On a row that decrypts but is malformed, issuance still inserts a new key.
2. **`getDb()` falls back to a local file when `TURSO_DB_URL` is unset.**
   - It uses `file:./data/minion_hub.db`, which creates a local file.
   - It then mints with empty `agentIds` without saying so.
   - Fix: fail when `TURSO_DB_URL` is unset.
3. **The foreign-audience check counts ANY connect failure as `refused`.**
   - That includes a timeout or network error, so the cross-gateway line can falsely pass.
   - Fix: accept only a 1008 close.
4. **What holds:**
   - `auth.refresh` with the socket's own JWT is a valid write probe under A1: it is in `WRITE_METHODS`, and it passes the identity, scope and audience checks.
   - A refusal for any non-scope reason is classified `error`, which reports FAIL, not a false pass.
   - Exit codes are correct: 0, 1 on a mismatch or an invalid row, 2 on bad usage (executed).
   - `--list-audiences` uses `gatewayAudience` itself.
   - Nothing prints a token. Gateway error text is cut to 160 characters.
   - The import graph resolves with an empty env and opens no DB at import (executed). Sample normalisations (executed): `wss://Netcup…:10000/` → `gw:netcup.donkey-agama.ts.net:10000`, and a URL with no port has no port.

### F7 (Info)

1. **Removal bound:** the worst case for a removed member is about 16 minutes (refresh at T, `exp` at T+900, close at `exp`+60), not 15. This is spec and A1 wording.
2. **`/terminal`:** deleting it also removes the legacy `/terminal` → `/cloud/terminal` redirect, so old bookmarks get a 404. No remaining links or imports (grep).
3. **Plugin pages with no active host:** they now render the iframe instead of the "no server" panel. Cosmetic.

## Confirmed clean

**Inertness, flag unset:**
- **Plugin `authToken` is unused.** No plugin UI (`minion/extensions/*/ui`) uses it. `connectRpc` has been a no-op since 2026-05-19, and every RPC goes through the bridge. `minion_plugins` has no UIs. So `authToken: ''` is safe before A1 (read).
- **Token route:** it answers 410 only when the flag is `false` (test).
- **Connect frame:** byte-identical (snapshot test).

**Flag `false`** (tests plus my throwaway churn test, executed):
- No `fetchHostToken`, `auth.token` or token-route call.
- The prefetch is keyed by gateway and dropped after 5 minutes.
- Cutover mints its own JWT for the new gateway.
- An issuance 403 shows the permission toast with no reconnect loop. During a reconnect it closes the client, which stops the loop.
- 4401 leads to one auto-reconnect with a fresh JWT.
- Renewal runs every 600 s. After 3 reconnect cycles, a double hello-ok, cutover A→B→A and a fresh `wsConnect`, there is exactly one renewal per live socket. A replaced client's timer stops itself on its next tick, even without `onClose`.
- No `jwtAuthDisabled` fallback.

**The `sendRequest` guard is UX only:**
- Its role comes from SSR `page.data.user.role`, which is `locals.user`, the same profile role the issuance uses.
- No hub server route proxies an admin method without RBAC:
  - gateway update: `requireAdmin`;
  - brains, channels PUT/DELETE, builder publish: `requireOrgCapability`;
  - plugin toggle: `settings:manage`;
  - personal-agent create: own pending agent only.

**Shared shim** (`scripts/_sveltekit-bun-shim.ts`):
- It adds a virtual `$server/db/pg-pool` that re-exports a spread of the real module.
- `pg-pool` exports only functions and consts, with its state module-internal, so the snapshot is safe.
- The change only adds a resolution, so other scripts are unaffected.

## Member-visible breakage after the switch (for owner step 2a)

1. **`/account/connections` (every user):** the tab freezes (F2). Even after the fix, members cannot list or link the "other" channel plugins. I did not check whether the WhatsApp QR card uses an admin method.
2. **Chat titles:** auto-titles are silently never generated (`drones.session-title`). They are retried on every history open.
3. **New chat and rename:** they fail for a member whose JWT agent list lacks that agent (F3; read, not executed).
4. **Reliability dashboard** (`/reliability`) and the plugin health panel: every panel fails with a gateway "missing scope" error, not "your role can't".
5. **Plugin pages** (`/plugins/[id]`, `/channels/[id]`, and `/settings/plugins` for org owners and admins): plugin settings don't load or save (`plugins.*`), and plugin actions fail.
6. **Channel setup** (re-auth, remove, pair, logout): hidden, which is intended.
7. **"Your role can't" toasts:**
   - agent files and skills;
   - tools;
   - flow editor (trigger register, run, templates, schedule);
   - prompt sections;
   - secrets: list and set, while clear gets a raw gateway error;
   - cloud shells;
   - model enable and playground;
   - dream and drones lists;
   - debug and kill switches;
   - session usage;
   - gateway config editor.
8. **Flow triggers:** a newly activated flow's trigger is not registered until a platform admin connects. Existing triggers persist on the gateway.
9. **Personal-agent provisioning:** unaffected, because it runs server-side.

## Re-audit (817f1ec8)

- **Scope:** `git diff 88df9b80 817f1ec8` (fix commits `568a2486` F1/F2/F5/F7, `a9a2057d` F4, `817f1ec8` F3/F6). Worktree `hub-045-a3`. Compared against gateway A1 `gw-043-s4` `13f8fe97e8a`.
- **Date:** 2026-10-30.

### Verdict: SHIP

- Every original finding is fixed, and I confirmed each fix by running it.
- **The flag left unset changes nothing that matters.** Run under both roles, the guard, the reliability transport, the bootstrap, plugin RPCs and ChannelLinking all reach the gateway exactly as before. The connect frame is unchanged.
- **One real behaviour change with the flag unset is a bug fix.** ChannelLinking's old loop on an empty list is gone.
- **What's left is Low or Info.**
  - R1 is a robustness gap: the scanner is weaker than the old one for *future* code. The current list is complete, confirmed by two independent sweeps.
  - It is not a security issue. The gateway enforces scope; the scanner only protects the owner's step-2a list.
  - The fix is about 4 lines. Do it before T037 sign-off if convenient; it does not block merge.

### Tests run

- **Baseline:** 28 files, 377/377 green.
  - Covered: `src/lib/services/gateway/*`, `gateway.jwt-only`, `ChannelLinking.mounted`, `personal-agent/create`, `gateway-jwt-probe-core`, `src/lib/routes`, `frontend-contract-scanner`, `scripts/ui-audit-inventory`.
- **Throwaway probes:** 4 files named `reaudit-a3-*`, results below. All were deleted afterwards. `git status` is clean, and HEAD is still `817f1ec8`.
- **Every run** used `env -u SUPABASE_DB_URL -u DATABASE_URL`. No integration test, no DB and no gateway were touched.

### 1. F1 scanner and the PLUGIN_RPC gate

**Evasion probes.** Each was run through the committed `sweepSource` and `violations`.

| Input | Result |
|---|---|
| `METHODS.del` map lookup | caught |
| `.svelte` `<script module>` constant | caught |
| `.svelte.ts` store string | caught |
| `gatewayCall('agents.delete')` | caught |
| `fetch('/rpc', …{method:'agents.delete'})` | caught |
| constant imported from another swept module | caught (its string is swept where it is defined) |
| `sendRequest('agents.' + 'delete')` | **missed** |
| `['agents','delete'].join('.')` | **missed** |
| `` `${ns}.delete` `` | **missed** |
| `'agents\x2edelete'` | **missed** |
| `sendRequest('studio.generate')` (namespace not in `NAMESPACES`) | **missed** |
| `sendRequest('restart')` (single word; A1 `:393` defaults to admin) | **missed** |
| `rel.load(owner,'sessions.patch',{key,model})` (wrapper; `:249` skips `sessions.patch` strings) | **missed** |
| `'a//b'; sendRequest('agents.delete')` on one line | **missed** (`stripComments` `:203` treats the `//` inside a string as a comment) |
| a string containing `/*` | **missed** (same cause) |

**Current tree is complete:**
- No literal call in `src` needs admin outside `PLATFORM_ADMIN_ONLY`.
- An independent Python sweep of the 226 A1 method names against the browser files found nothing unclassified.
- Every string `stripComments` removes from the tree today is inside a real comment. I listed and checked all 30.

**R1 (Low): the new sweep is weaker than the old scanner for future code.**
- **Where:** `violations()` at `method-inventory.test.ts:246` no longer checks `tree.calls`.
  - So a literal call to an unknown-namespace or single-word method (both admin on A1) passes.
  - The old call-shape scan caught it.
- **The allowlist is abusable.** `NOT_RPC` is file-agnostic, and two of its entries are real A1 admin methods:
  - `'channels.send'` (`:156`, gw `server-methods/channels.ts:263`);
  - `'memory.recall'` (`:118`, gw `server-methods/memory.ts:28`).
  - Executed: `sendRequest('channels.send', {})` in a new file → `[]`.
- `DYNAMIC_CALL_SITES` (`:173`) and `NOT_RPC_TEMPLATES` are file-wide.
  - Executed: `getClient()!.request(m)` added to `gateway.svelte.ts` → `[]`.
  - Executed: `` sendRequest(`agents.${verb}`) `` in `AgentSettingsPanel.svelte` → `[]`.
- **The `PLUGIN_RPC` assertion is too loose.** At `:341` it only checks that *one* gated call exists per file. A second, ungated dynamic call in `PluginIframe` or `ChannelLinking` would pass.
- **Minimal fix (executed and confirmed):** in `violations()` add:
  ```ts
  for (const c of sweep.calls)
    if (!['read','write'].includes(requiredScope(c.method, c.args)) && !PLATFORM_ADMIN_ONLY.has(c.method))
      out.add(`${c.method} literal call needs admin (${c.file})`);
  ```
  - The tree stays `[]`.
  - It now catches the concat, `studio.generate`, `restart`, `channels.send`, `memory.recall` and `sessions.patch {key,model}` probes.
  - `chat.history` still passes.
  - Optionally, key `NOT_RPC` by `file value`, as `NOT_RPC_TEMPLATES` is.

**PLUGIN_RPC enforcement is complete.**
- **Plugin forward paths:**
  - Every plugin slot host goes through `PluginIframe.forwardRpc`: `PluginSlotHost`, `PluginControlCenter` and `/settings/plugins`. It gates as `PLUGIN_RPC` at `:78`.
  - The `ChannelLinking` submit gates as `PLUGIN_RPC` at `:176`.
  - `ArtifactHost.forwardRpc` never reaches the gateway: it answers only `hub.artifact.context.get` from the hub API.
  - `plugins.users.list` is answered by the hub before any forward.
- **On the wire (executed):** with `PLUGIN_RPC`, the wire carries the real method (`studio.generate`), never `$PLUGIN_RPC`.

### 2. Guard coverage and inertness (executed with a mocked client)

| Flag | Role | Bootstrap `flows.trigger.register` | Owner transport `reliability.summary` | Plugin RPC | Bootstrap reads |
|---|---|---|---|---|---|
| unset | user | 1 | sent | sent | 1,1,1,1,1 |
| unset | admin | 1 | sent | sent | 1,1,1,1,1 |
| `false` | user | 0 | `GatewayRoleError` | refused | 1,1,1,1,1 |
| `false` | admin | 1 | sent | sent | 1,1,1,1,1 |

- Platform admins are unaffected.
- With the flag unset, `guardedRequest` is identical to `client.request`.
- For members with the flag `false`: the gateway already refused these calls before this fix, so only the error type changes, not the outcome.

### 3. F2: ChannelLinking (executed, happy-dom)

- **Flag unset, member, empty list:** 1 call, and Refresh is shown.
  - The old code looped on an empty list even with the flag unset, so this is a fix, not a regression.
- **Flag unset, member, gateway refusal:** 1 call.
- **Flag `false`, platform admin:** 1 call.
- **Reconnect:** 1 → 2 calls.
- **Host switch through `wsConnect`** (which sets `conn.connected=false`, `gateway.svelte.ts:722`): → 3 calls.
- **Unmount while a load is in flight, then reconnect:** no further call. Effect cleanup is correct.
- **Info:** a cutover (`cutoverToHost`) keeps `conn.connected` true, so the list is not reloaded (`calls=1` after the host id changes). The old code behaved the same, because none of its effect dependencies change on a cutover. Not a regression.

### 4. F4: the personal-agent route (read plus the existing tests)

**No intended identity edit can be dropped:**
- An explicit `name`, `personality` or `personalityText` still applies for an `error` row. The test covers it.
- The only caller (`personal-agent.svelte.ts:89`) posts `{}`.
- The route has no role branch, so admins and members behave the same.

**Info: an error-state agent that never reached the gateway is now created without a display name.**
- `create()` still runs, but there is no `config.patch`. The gateway name defaults to `agent_id`.
- This matches the layout self-heal path, which already provisions without an identity.
- The user can rename the agent in `/home/settings`.

### 5. F5: first-connect issuance outage (executed with the real `GatewayClient` and a fake WebSocket, fake timers, 60 s)

**Persistent outage** (issuance 503, 500 or a network error):
- 9 sockets and 10 JWT fetches in 60 s. The backoff runs 0.8 s × 1.7, up to 15 s; no tight loop.
- Every handshake closes with 4008.
- 0 connect frames were sent.
- `fetchHostToken` was called 0 times.
- 0 frames contained `"auth"` or the shared-token sentinel.
- One `gateway-connect-failed` toast and one `revalidateChannel` call per `wsConnect`.

**Other cases:**
- **503, then 200:** one socket, and the connect frame carries `jwt-ok` with no `auth`.
- **Flag unset:** the token is fetched, no JWT is fetched, and the frame carries the token, as before.

**No fallback can come back** (`gateway.svelte.ts:766-774`):
- With the flag `false`, `prefetchGatewayJwt` always sets `prefetchedJwt`, and `fetched` is always `''`, so `auth` is omitted.
- `onChallenge` throws on any result that is not a string.

### 6. F6: the probe script

**The one write is acceptable and documented.**
- It is a label-only `sessions.patch` on `agent:<id>:jwt-probe`, documented in the header and in the `probeMatrix` doc.
- A1's handler upserts that session entry, so a "jwt-probe" session will appear in that member's session list. Members cannot delete it (`sessions.delete` is admin).
- **Info:** `agentIds(jwt)[0]` (`gateway-jwt-probe-core.ts:182`) is drawn tenant-wide, not per gateway. If that agent lives on another of the org's gateways, the probe writes a stray session store for it there, or reports a false FAIL. It never gives a false pass.
- **Optional:** pick an agent bound to this gateway (`user_agents.serverId === gatewayId`).

**The signing-key pre-check mirrors issuance exactly.** It does open, then `JSON.parse`, then `importJWK(jwk, row.alg)`, the same as `loadActiveSigningKey` in `gateway-jwt.service.ts:82-90`. The only remaining gap is a key deactivated between the check and the mint, which I consider negligible.

**The foreign-audience check is correct:**
- It accepts only a 1008 close with reason `jwt_audience_not_allowed` or `jwt_validation_failed` (`:140`).
- Both reasons are genuine A1 audience refusals, depending on config:
  - `ws-jwt-auth.ts:213` (`jwtOnlyRefusal`) gives `jwt_audience_not_allowed`;
  - an issuer `audience` list that excludes `gw:…invalid` fails jose verification first, which gives `jwt_validation_failed` (`ws-jwt-auth.ts:96`, `message-handler.ts:495`).
- A1's own test expects `{1008, jwt_audience_not_allowed}` (`jwt-only-connect.test.ts:200`).
- `jwt_validation_failed` could also mean a bad signature or issuer. But the same mint already passed the own-audience connect, and if that connect failed the run is FAIL anyway. So there is no false pass.
- A timeout, a network error, another reason or a non-1008 close is `error`, which gives FAIL. The tests cover this.

**`TURSO_DB_URL` unset** now makes the script throw.

### 7. F7: `/terminal`

- `+page.server.ts` is byte-identical to the pre-A3 redirect: 307 to `/cloud/terminal${url.search}`.
- `+page.svelte` is a comment only, with no token fetch and no PTY or terminal import.
- These files are byte-identical to `0fb2d8ef^`: `route-design-manifest.ts`, `route-design-validation.ts` and `ui-audit-inventory.mjs`.
- All count sites agree on 163 / 152 / 11. The count suites are green:
  - `src/lib/routes` (including `route-access-authority`);
  - `frontend-contract-scanner.test.ts`;
  - `scripts/ui-audit-inventory.test.ts`.

### F3

- The member `sessions.patch` cases are in the probe matrix.
- The assignment condition is stated in the probe docs, and the "no agent" case is reported as `skip`.

### Not checked

- Svelte runtime warnings in a real browser.
- The `createReadFailureMonitor` telemetry volume for members whose reliability panels are refused after the switch. The outcome is the same as before the fix; only the error type changed.
