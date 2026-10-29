# Readiness review: codebase details (EGM Goldfish, codebase_details persona)

* Target: `design.md`. In scope: lines 392–586 (Detailed Implementation) and every code claim in lines 151–391.
* Standard: implementation-readiness-standard.md (Zero-Decision Rule).
* Code refs: hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a. These are the local refs. I did not fetch, and they match the design's AS-IS commits.
* Counts: 🔴 7 · 🟡 13 · 🟢 7

---

## 🔴 Blockers

### R1. The gateway allowlist can be bypassed. Every hub browser session holds the shared operator token.

* **Design:** 172, 252–257, 297–298 (`claims absent (shared-token operator connections…) → not enforced`), S4 521–534.
* **Evidence:**
  * `minion_hub/src/routes/api/servers/[id]/token/+server.ts:16-49` returns the decrypted gateway token to any authenticated member of the org.
  * `minion_hub/src/lib/services/gateway.svelte.ts:397-452`: the browser connect frame always sends `auth: {token}`. The JWT is only added when `PUBLIC_GATEWAY_JWT_AUTH === 'true'` (`:226`).
  * When a JWT is rejected, the client drops back to token-only auth for 60 s (`:515-526`).
  * `minion/src/gateway/server/ws-jwt-auth.ts` (Case 2, around lines 115–140): no JWT plus a valid token gives `userRole: "admin"` and `scopes: mapRoleToScopes("admin")`, with no orgId and no features.
* **Impact:**
  * A Base-org user who opens a socket without the `jwt` field (devtools, or any deployment where the flag is off) gets the full gateway, AI included.
  * The same token also authenticates the HTTP `/v1/*` endpoints (`openai-http.ts` and `openresponses-http.ts` both use `authorizeGatewayBearerRequestOrReply`).
  * Q2's "not enforced when claims are absent" is therefore not an operator-only edge. It is the default bypass for every Base-org browser.
* **Required:** the plan must say how a browser session without a JWT is treated once enforcement is on. Options: refuse token-only auth for `minion-control-ui` clients, or stop handing the shared token to the browser. It must also cover the 60 s fallback and the `PUBLIC_GATEWAY_JWT_AUTH` dependency.

### R2. The MCP `/mcp` JWT path builds its client without `features`, so it bypasses the gate.

* **Design:** S4 521–531, which lists only `auth-jwt.ts`, `ws-jwt-auth.ts`, `auth-refresh.ts` and `types.ts`.
* **Evidence:**
  * `minion/src/gateway/server.impl.ts:1643-1655` (`buildMcpClient`) copies `role, scopes, userId, userRole, orgId, assignedAgentIds` from the identity.
  * `:1695-1707`: the JWT identity resolver returns the same fields.
  * `tools/call` then goes through `handleGatewayRequest` → `authorizeGatewayMethod`.
* **Impact:** a Base-org JWT that calls `/mcp` `tools/call` reaches every curated gateway tool with `client.features === undefined`, which the design treats as "not enforced".
* **Required:** add `server.impl.ts` (`McpClientIdentity`, `buildMcpClient` and the resolver) to S4, plus a test.

### R3. The hub creates orgs itself, then calls the gateway with a JWT. Every new (Base) org's provisioning will be refused.

* **Design:** 192–194 says organisations are created outside the hub. 259 says hub server-to-gateway calls carry no `features` claim. 291–292 adds `features` to every `issueGatewayJwt` token.
* **Evidence:**
  * `minion_hub/src/server/services/organization-provision.service.ts:107-108` inserts `organizations`, reached from `src/routes/api/organizations/provision/+server.ts`.
  * `:185` (`mintOrgGatewayJwt` → `issueGatewayJwt`) and `:300-345` use that JWT for `shells.provision`, `shells.list` and `shells.access`.
* **Impact:**
  * A new org has no row, so it resolves to Base.
  * Its JWT will carry `features` without `ai`.
  * `shells.*` is not in `BASE_GATEWAY_METHODS`, so the "workstation" provisioning step fails for every org created after enforcement.
  * The design states the opposite of the code on both points.
* **Required:** choose one:
  * `mintOrgGatewayJwt` omits entitlement claims, or
  * `shells.*` joins the allowlist, or
  * provisioning writes a plan row.

  Also correct the statement on line 193.

### R4. The hub chokepoint usually cannot see the org, so most hub AI is "not enforced, logged".

* **Design:** 231 ("org from `currentAiUsageScope().orgId` … No org in scope → not enforced"), 446–449 ("covers every hub model call (notes, … Pulse, reminders…)"), acceptance 578–579 ("note AI … return 403").
* **Evidence:**
  * `minion_hub/src/hooks.server.ts:675-676` opens the scope with `orgId: null`.
  * Only `getTenantCtx` fills it (`src/server/auth/tenant-ctx.ts:15` → `setAiUsageOrg`).
  * `src/routes/api/notes/{polish,spelling,autocomplete,refine}/+server.ts` call only `requireAuth(locals)` (for example polish:31). No org is ever set.
  * `src/routes/api/marketplace/generate-agent/+server.ts:35` reads `locals.tenantCtx` directly, not through `getTenantCtx`.
  * `src/routes/api/pulse/tick/+server.ts` → `src/server/services/pulse-tick.ts:17` and `jobs/tick` (pulse_digest, groupchat and brain handlers) never call `withAiUsageOrg`. Only five ticks do: brains/reconcile:41, analyze:47, vectorize:39, relationship:53 and reminders:31.
* **Impact:** the "one chokepoint" silently allows notes AI, marketplace generation and Pulse/jobs AI for Base orgs.
* **Required:** choose one:
  * the chokepoint falls back to `locals`, by having `aiUsageScopeHandle` or `appHandle` call `setAiUsageOrg` once `tenantCtx` resolves, or
  * every listed route switches to `getTenantCtx`.

  Name that file in S2.

### R5. `handleError` cannot turn `EntitlementError` into a 403, and every AI route catches model errors anyway.

* **Design:** 231 ("request handlers turn into 403"), 454–456, 480–481 ("Audit each hub caller…").
* **Evidence:**
  * `minion_hub/src/hooks.server.ts:820-852` is a `HandleServerError`. SvelteKit's `handleError` only shapes the `App.Error` body, and the status of an unexpected error stays 500.
  * All 15 `getOpenRouterModel` routes have a local `catch` that returns their own 500 or 502: builder/ai ×5, crm/cleanup/review, funnel/analyze, tags/[id]/evaluate, flows/[id]/copilot, marketplace/generate-agent, notes ×4 and structured-stream.
  * Streaming calls (`structured-stream`) surface a `wrapStream` throw inside the stream, not as an HTTP status.
* **Impact:** G5's 403 contract is unreachable through the described mechanism. Line 480 leaves the set of files and the pattern to the implementer, which breaks the Zero-Decision Rule.
* **Required:**
  * Name each route.
  * Give the exact pattern, for example `if (e instanceof EntitlementError) throw error(403, …)` before the generic catch, or a `requireFeature(locals,'ai')` at the top of each route.
  * Drop the `handleError` mapping, or limit it to logging.

### R6. "Hidden from navigation through `canViewPath`" is false, and the 404 guard runs in a hook the plan does not touch.

* **Design:** 305–310, S3 485–499 (497: "No change beyond what `canViewPath` already filters").
* **Evidence:**
  * `minion_hub/src/lib/access/can.svelte.ts:53-74`: `canViewPath` is kind-only ("Kind-only (no moduleStates) — the toggle-state gate stays server-side"). It never reads `MODULE_MANIFEST` toggles.
  * `src/lib/components/layout/sections.ts:427-429` hides disabled modules through `enabledByPluginId`, not `canViewPath`.
  * The 404 is thrown in `src/hooks.server.ts:367-395` (`applyModuleAvailabilityGuard` → `isAppRouteBlocked`). It builds its own `{kind, moduleStates}` context and runs before the `(app)` layout load, so features returned by `+layout.server.ts` arrive too late.
* **Impact:** with S3 as written, AI pages remain in the nav and still load by URL. G7 and acceptance 578 fail.
* **Required:**
  * S3 must modify `hooks.server.ts` (resolve entitlements in `applyModuleAvailabilityGuard` and pass `features`).
  * S3 must modify `canViewPath`, which needs `page.data.entitlements`.
  * S3 must also cover `sections.ts`'s plugin and module filter, or state that they are covered.
  * `ModuleAvailabilityContext` in `availability.ts:156-159` also needs `features`, because `isModuleAvailable` receives it, not `RouteGuardContext` alone.

### R7. The backfill writes a column that does not exist, with a value of the wrong type.

* **Design:** 180 (`org_plans.set_by uuid (profile)`), 185 (`org_plan_events … actor_profile_id`), 553 ("writing `org_plan_events` with `set_by = 'launch-backfill'`").
* **Evidence:** this is internal to the design. `org_plan_events` has no `set_by`. `'launch-backfill'` is not a uuid for either `set_by` or `actor_profile_id`.
* **Impact:** the owner-run apply fails, or the implementer invents a schema change.
* **Required:** specify the actor for system writes, for example a nullable `actor_profile_id` plus `note = 'launch-backfill'`.

---

## 🟡 Major

### M1. Hub AI paths: what the design gets right, and the bypasses it misses (priority 1)

* **Path:** design 452 cites `src/server/embeddings.ts`. The real file is `src/server/services/embeddings.ts`.
* **Confirmed:** `getOpenRouterModel` is the only AI SDK factory. The two raw OpenRouter fetches are `services/embeddings.ts:30,171` and `assistant-router.service.ts:29,164`, as the design says.
* **AI calls it does not list:**
  * `src/routes/api/voice/tts/+server.ts:38-47`: ElevenLabs, a paid AI voice.
  * `src/routes/api/notes/transcribe/+server.ts:34`: Whisper through `gatewayCall('media.transcribe')` on the shared token. Per design 259 this is never gated, and neither chokepoint sees it.
  * `src/routes/api/workforce/[...path]/+server.ts`: the proxy to Workforce/Paperclip (AI agent companies), plus the `/workforce` module (`availability.ts:122-125`).

### M2. Gateway AI outside both gates

* **Design:** G4 says "everywhere", against S4.
* **Evidence:**
  * `minion/src/infra/heartbeat-runner.ts:1088` calls `getReplyFromConfig` directly, bypassing `dispatchReplyFromConfig`.
  * Cron agent runs: `src/gateway/server-core/server-cron.ts` and `src/platform/cron/isolated-agent/run.ts`.
  * Webhook agent runs: `src/gateway/server/hooks.ts`.
* **Impact:** a Base org's existing agents keep their heartbeats, crons and hooks. The design should either gate these or list them as a recorded open end.

### M3. Channel mirror: coverage gaps, and a push path the design says does not exist (priority 3)

* **Design:** 267–275.
* **Confirmed:**
  * The mirror is hydrated in both `CHANNEL_CONFIG_SOURCE` modes: `server.impl.ts:1384-1399` seeds it unconditionally (unless `minimalTestGateway`) and starts the 5-min tick (`channel-mirror.ts:21,169`).
  * `getMirrorEntry` is synchronous and anchored on `globalThis` (`:98-110`).
  * An empty hydrate keeps the last good copy (`:156-165`).
* **Gaps:**
  * Only `whatsapp | telegram | discord` are ever hydrated (`channel-hydrate.ts:29`, `channel-publish.service.ts:103`). Slack, Signal, iMessage, LINE and every extension channel are permanent mirror misses, so they are never gated.
  * If `gateway.hubMetrics` is unset, the mirror is empty (`channel-hydrate.ts:69-75`).
  * A partial non-empty hydrate replaces the mirror.
* **Push path:** "the hub … cannot push" is contradicted. `channel-publish.service.ts:193-208` (`invalidateTags([channel:type:acct])`) → HttpBroadcaster → gateway `events-http.ts:75` → `seedMirror()` (`channel-mirror-compare.ts:120`). `setOrgPlan` can reuse `signalChannelChange` for the org's accounts and get near-immediate effect instead of ≤ 5 min.

### M4. The JWT staleness bound and the "hub already refreshes" claim are unsupported

* **Design:** 297–299, 333–335, 581.
* **Evidence:**
  * The hub source has no `auth.refresh` caller. The JWT is fetched only at handshake (`gateway.svelte.ts:229-239, 421-423`).
  * I found no WebSocket session expiry at JWT `exp` in `message-handler.ts`, `ws-jwt-auth.ts` or `server.impl.ts`.
* **Impact:** the real bound is "until reconnect", not ≤ 1 h.

### M5. Ledger write sites (priority 4)

* **Design:** 282–283, 542–543.
* **Evidence:**
  * WhatsApp inbound ledger rows are written in `src/web/inbound/monitor.ts:171`, before dispatch.
  * `web/auto-reply/monitor/process-message.ts:741` is the outbound/reply write.
  * Other channels record through `fireMessageInbound` (`fire-message-inbound.ts:27`), called from each channel handler (discord, slack, signal, telegram, imessage) before dispatch.
* **Conclusion:** the ledger does record before `dispatchReplyFromConfig`. But the cited WhatsApp file is wrong, and the pinned test (`fire-message-inbound.test.ts`) does not cover WhatsApp, the CUJ channel. Name a `src/web/inbound/*` test.

### M6. Gateway claim plumbing misses files

* **Design:** 523–525.
* **Evidence:**
  * `ws-jwt-auth.ts:43-105` only returns `JwtAuthResult`. The claims are copied onto the client in `src/gateway/server/ws-connection/message-handler.ts:931,1110`.
  * The client type also lives in `src/gateway/server/ws-types.ts:14-18`.
  * `JwtUserClaims` in `auth/auth-jwt.ts` needs the fields.
  * Impersonation swaps identity through `_originalIdentity` (`server-methods/types.ts:33-38`). Whose `features` apply during impersonation is undecided.

### M7. Allowlist gaps (priority 2)

* **Confirmed:**
  * `authorizeGatewayMethod` (`server-methods.ts:205`) runs for every WebSocket request (`message-handler.ts:1221` → `handleGatewayRequest:368`) and for every MCP call.
  * An admin-scope JWT client reaches it. Admin-role JWTs get `operator.admin` and return at `:233`, so a check inserted before `:233` covers them.
  * `!client.connect` returns early at `:210`, but WebSocket and MCP clients always have `connect`.
* **Gaps:**
  * The hub client calls `agents.list`, `sessions.list`, `system-presence` and `cron.list` on every connect and poll (`src/lib/services/gateway/session-bootstrap.ts:34-39, 90-107`), plus `flows.trigger.register` (`:69`). None are allowlisted, and S3 only softens `my-agent-rpc.ts`, so Base orgs get repeated FORBIDDEN errors on `agentsError` (`gateway.svelte.ts:1644`).
  * "Copy names from `server-methods-list.ts`" does not work. The file is `src/gateway/server-core/server-methods-list.ts`, and its `BASE_METHODS` (`:7`) lacks `myAgent.*`, `web.login.*`, `channels.send`, `channels.directory.list` and `channels.*.validateToken`. Those are only in handler files.
  * Decide `presence`, `system-presence`, `last-heartbeat`, `whoami`, `shells.*` (non-AI cloud workstation) and `channels.whatsapp.pair` explicitly.

### M8. The S3 client-caller list is incomplete (priority 6)

* **Design:** 500–514.
* **Missing:**
  * `src/lib/components/artifacts/ArtifactCreateModal.svelte` and `ArtifactRegenerateModal.svelte` (`/api/artifacts/generate` and `/[id]/regenerate` → `src/lib/server/artifacts/builder.ts`).
  * `src/routes/(app)/crm/[contactId]/PageBody.svelte` (`/journey/analyze`).
  * `src/lib/components/crm/CrmSimilarWins.svelte` (`/similar-wins`).
  * `src/routes/(app)/crm/insights/PageBody.svelte` (`/win-index`, `/api/crm/insights/sentiment`).
  * `src/lib/components/my-agent/TranscribeButton.svelte` (`/api/notes/transcribe`).
  * `src/lib/state/features/voice-call.svelte.ts` (`/api/voice/tts` plus agent chat).
  * `src/lib/components/agents/AgentMemoryPanel.svelte` (`/api/agent-memories`, embeddings).
  * "the doors FAQ-draft action" is unnamed: it is `src/lib/components/doors/faq/Editor.svelte`.
* **Server side:** S2's list also omits the matching routes (artifacts, journey, similar-wins, win-index, sentiment, faq-draft). Given R4 and R5, each needs an explicit gate.

### M9. Route-contract files are wrong, and the plan overlaps an existing admin page

* **Design:** 319–323, 438–440.
* **Evidence:**
  * Paths are registered in `src/lib/routes/route-access-registry.ts` (for example `'/orgs': 'capability:orgs.all'` :129, `'/settings/organizations': 'role:admin'` :145) and `route-design-manifest.ts:398,408`, not `route-access-policies.ts`.
  * The "six count sites" are not named.
  * `src/routes/(app)/orgs/+page.server.ts` already lists every org through `listAllOrganizationsWithMemberCounts` behind `can('orgs.all')`. The design does not say whether `/admin/plans` replaces it or links to it.

### M10. The autonomous-agent server files have no actions

* **Design:** 469–470.
* **Evidence:** `src/routes/(app)/agents/autonomous/+page.server.ts:8` and `[id]/+page.server.ts:9` export only `load`.
* **Required:** name where autonomous agents are created and run, or drop the bullet.

### M11. `/api/marketplace/sync` is platform-wide

* **Design:** 235, 459–461.
* **Evidence:** `src/routes/api/marketplace/sync/+server.ts:8-14` is `requireAdmin` + `getCoreDb()`: a platform-admin catalog sync, the same nature as `sync/tick`.
* **Impact:** gating it by the admin's active-org plan blocks a platform operation whenever the admin happens to sit in a Base org.

### M12. Decisions left to the implementer (Zero-Decision Rule)

* **Design 234 and 463:** "AI handlers in `jobs/tick`" is unnamed. The registered handlers are `groupchat`, `brain_ingest`, the brain corpus ×2, the business corpus, `finance statements`, `pulse_digest` and `pulse_dispatch` (`registerJobHandler` sites).
* **Design 490–491:** agent-studio prefixes are deferred "to implementation time". Other AI-centric `(app)` directories exist and are undecided: `brains`, `prompt`, `tools`, `capabilities`, `sandbox`, `workforce`, `shells`, `terminal`.
* **Design 187 and 401:** the RLS "own org" predicate is unspecified. `app_modules` uses the GUC `app.current_org_id` (baseline `schema.sql:8434`).
* **Design 473–476:** `toResolvedChannels` is a pure synchronous mapper (`channel-publish.service.ts:108`). How the per-org `ai` result is batch-loaded and passed in is unspecified.
* **Design 515:** "the hub HTTP error helper" is unnamed (`src/lib/api/fetch-json.ts` exists, but most AI callers use raw `fetch`).

### M13. `App.Error` lacks `feature`

* **Design:** 237, 419.
* **Evidence:** `src/app.d.ts` `App.Error` declares only `code?`. `error(403, {code, feature, message})` needs `feature?: string` there, and `app.d.ts` is not in any slice.

---

## 🟢 Nits

* **N1. Design 26:** `llm.ts:120-136`. `getOpenRouterModel` actually spans 122–137 (`usageMiddleware` 65–111).
* **N2. Design 404:** "the schema barrel export" does not exist. There is no `src/server/db/pg-schema/index.ts`, and services import per file (`$server/db/pg-schema/ai-usage`). There is a second convention, `src/server/db/pg-*-schema.ts`.
* **N3. Design 462:** the Pulse per-org loop lives in `src/server/services/pulse-tick.ts:17`, not the route.
* **N4. Design 434–435:** `utilityLinks(canViewPath)` (`utility-links.ts:6-13`) receives no user. The admin-only visibility should come from a `role:admin` registry policy, not a `user.role` check in that file.
* **N5. Design 214–217:** use `tags.tenantDomain(...)` from `@minion-stack/cache`. In production the cache backend defaults to `noop` unless `CACHE_BACKEND` is set, and `memory` invalidations do not reach other Vercel instances (`src/lib/server/cache.ts:86-99`).
* **N6. Design 526:** `BASE_GATEWAY_METHODS` sits next to an existing, unrelated `BASE_METHODS` export. Pick a distinct name, such as `BASE_PLAN_GATEWAY_METHODS`.
* **N7. Design 474:** user-scoped channel accounts (`ownerProfileId`, `channel-publish.service.ts:87-98`) make "owning org" ambiguous. State that `tenantId` decides.

## Verified correct (no action)

* `authorizeGatewayMethod` @ `server-methods.ts:205`, with the admin bypass at `:233`.
* `extractUserClaims` @ `auth-jwt.ts:88-89`.
* `JWT_EXPIRY_SECONDS = 3600` and claims `{userId, role, agentIds, orgId}` (`gateway-jwt.service.ts:26,170`).
* `dispatchReplyFromConfig`: the `message_received` hook is at :267 and the agent runs at :431. An existing fail-open per-org gate, `isChannelEnabledForAccount` at :211, is a usable precedent.
* `currentAiUsageScope` (`ai-usage.ts:64`).
* `listAllOrganizationsWithMemberCounts`, `requireAdmin` (`authorize.ts:35`), `createOptimistic` (`src/lib/utils/optimistic.ts:16`), `captureServerEvent` (`posthog.ts:35`), `HUB_TEST_DB_URL` (`src/server/test-utils/test-db-url.ts`).
* `organizations.kind`, and `app_modules` granting ALL to `authenticated` and `anon` (baseline 10392-10393).
* `getMirrorEntry` and the 5-min refresh.
* `planTier` exists only in the gateway free-tier subsystem.
* The `capability-api.ts` path is `src/gateway/capability-api.ts`.
