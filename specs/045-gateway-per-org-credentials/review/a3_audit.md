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
