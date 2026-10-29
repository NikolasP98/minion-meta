# Implementation Readiness review: 043 org entitlements, Detailed Implementation (design.md lines 392–586)

Reviewer: EGM Implementation Readiness Goldfish (Mode: REVIEW)
Standard: implementation-readiness-standard.md (Zero-Decision Rule, phasing, target scope, actionable steps, test plan)
Code checked: hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a

Verdict: **not ready.** 2 Blockers, 13 Majors, 11 Nits. Most of the slice structure is sound and most named paths exist. The blockers are a launch-safety hole (flag-off UI) and an error-mapping mechanism SvelteKit cannot provide.

---

## 🔴 Blockers

### B1. The S3 UI gate is not behind `ENTITLEMENTS_ENFORCED`, so Release 1 hides AI from every org, FACES included
*Lines 485–494, 572; contradicts 327–329 ("every gate is behind `ENTITLEMENTS_ENFORCED`") and G8.*

S2 makes each gate flag-aware: `requireFeature` throws only when enforced (419), JWT claims only when enforced (471), `aiEnabled` is `true` while not enforced (475). S3 never mentions the flag. The layout returns `resolveEntitlements` output, the route guard blocks on a missing feature, and `hasFeature` hides controls. The migration runs at hub deploy (launch step 1), and the backfill runs only at step 3, so in between every org has no `org_plans` row and resolves to Base (G1). With S3 as written, step 1 would 404 `/pulse`, `/agents/*` and `/marketplace` and hide the assistant, email summary and note AI for every org. That contradicts "The flag is off, so no behaviour changes" (572).

The layout fallback ("On error, return Base-shaped features", 486–487) has the same effect during migration lag (`42P01`). It also conflicts with 221–222 ("resolve to Base only after enforcement is deployed").

**Fix to specify:** when `!isEnforced()`, the layout load and the hook guard return the full catalog (Premium-shaped `features`), whatever rows exist. Only an enforced deploy uses the resolved snapshot. State what the error fallback returns in each mode. Add tests for flag-off with no row (everything visible) and flag-off with a lookup error (everything visible).

### B2. `handleError` cannot turn `EntitlementError` into a 403, and streaming and generic-catch callers swallow it
*Lines 454–456, 446–449, 480–481.*

- The hub runs `@sveltejs/kit` 2.70.2. A SvelteKit `handleError` hook can only shape the `App.Error` body. It cannot change the status, which stays 500 for an unexpected error. Today's hook (`src/hooks.server.ts:822–852`, `serverErrorHandler` wrapped by `Sentry.handleErrorWithSentry`) returns `{ message: 'Internal Error' }`. The promise "never a 500" therefore cannot be met the way the design describes.
- Streaming: `src/routes/api/structured-stream/+server.ts:40` uses `streamObject`. An error thrown inside `wrapStream` reaches the stream or `onError` after the response has started, so no status mapping is possible.
- Generic catches already exist. For example, `src/routes/api/flows/[id]/copilot/+server.ts:109–110` rethrows as `error(502, ...)`, and `src/routes/api/crm/tags/[id]/evaluate/+server.ts:76` swallows the error with a bare `catch {}`.
- The bullet "Audit each hub caller that catches model errors generically" (480–481) hands the design decision to the implementer.

**Fix to specify:** choose one mechanism. Options: have `EntitlementError` be a SvelteKit `HttpError` (thrown via `error(403, {code:'premium_required', feature})` from the middleware), or wrap each route. Then list the files that need a rethrow guard (`if (e instanceof EntitlementError) throw e`). The candidate set is mechanical: every file using `getOpenRouterModel` or `OPENROUTER_API_KEY`, about 28 on master. Also say what a streaming route does: check the entitlement up front with `requireFeature(locals,'ai')` before the stream starts.

---

## 🟡 Majors

### M1. Features never reach the route guard, and `canViewPath` does not filter by module availability
*Lines 488–499, and 309–310 in the Technical Plan.*

`isAppRouteBlocked` is called from only one place, `applyModuleAvailabilityGuard` in `src/hooks.server.ts` (around lines 367–394). That function builds its context from `event.locals.orgKind` and `listModuleStates(...)`. S3 changes `route-guard.ts` and the layout load, but not `hooks.server.ts`. Nothing says who resolves entitlements in the hook or where they are stored (`locals.entitlements`?).

Client side, `canViewPath` (`src/lib/access/can.svelte.ts`) checks only `isModuleVisibleForKind(m.moduleId, kind)`. It never calls `isModuleAvailable`, so a manifest `feature` will not hide anything from navigation. Line 497 says "No change beyond what `canViewPath` already filters", which is wrong.

**Specify:**
1. Add a `resolveEntitlements` call to `applyModuleAvailabilityGuard`, with its own failure policy and the flag rule from B1.
2. Add a `features` read inside `canViewPath`, from `page.data.entitlements`.
3. Add `src/hooks.server.ts` to the S3 file list.

### M2. The AI page list is incomplete and left to the implementer
*Lines 488–491 ("Exact prefixes are taken from `sections.ts` and `GNav.svelte` at implementation time").*

This is a decision deferred to the implementer. `(app)/` on master also contains `brains` (AI-Brains knowledge bases and embeddings), `prompt`, `tools`, `shells`, `capabilities`, `config`, `terminal`, `sandbox` and `killswitches`. It has both `/builder` and `/agents/builder`, and both `/workshop` and `/agents/workshop`. Many of these pages call gateway methods outside `BASE_GATEWAY_METHODS` (for example `tools.status`, `skills.status`, `models.list`, `config.patch`). For a Base org they would render errors instead of disappearing, which breaks G7.

**Specify:** the full prefix list with the feature each maps to, and for each `(app)` route not listed, a one-line reason why it stays visible.

### M3. Base-org channel setup breaks, and the dashboard bootstrap polls refused methods
*Lines 526–531 and 500–517; contradicts 250 ("pairing and checking channel accounts from the dashboard").*

The hub browser code writes channel config with `config.patch`:
- `src/lib/components/channels/ChannelSetupWizard.svelte:216`
- `ChannelCard.svelte:319,389`
- `ChannelGroup.svelte:67`
- `HistorySyncControl.svelte:98`

S4 lets only `config.get` and `config.schema` through. A Base org therefore cannot add or edit a WhatsApp account, and the wizard shows a FORBIDDEN error. That breaks G7, and S3 gives no instruction for it.

Separately, `src/lib/services/gateway/session-bootstrap.ts:34–39,89–106` calls `agents.list`, `sessions.list`, `cron.list` and `system-presence` on connect and then every 30 or 60 seconds. For a Base org every call is refused, forever. They are only `console.error`-logged, but they produce a steady stream of gateway denials.

**Specify:**
- Either allow the channel-config writes, scoped to channel keys, or state that channel setup for Base orgs is out of scope until spec 042 and hide those controls. Name the components.
- Whether `session-bootstrap.ts` skips non-allowlisted reads when the AI feature is absent.

### M4. `hasFeature` with a dotted-parent walk is wrong on a resolved list, and the contents of `features` are not defined
*Lines 495–496, 471–472, 292.*

`features` is described as "the resolved allowed keys". If it lists every catalog key that is allowed after evaluation, a parent walk is wrong in one case. Suppose an override disables `ai.chat` while `ai` stays allowed. `hasFeature('ai.chat')` would then find `ai` and return true, while the server says `not_in_plan`. If instead `features` lists only granted roots, rules and overrides are lost.

**Specify:** `features` = `Object.keys(FEATURES).filter(k => isEntitled(snapshot, k).allowed)`, and `hasFeature` = exact membership with no parent walk. The gateway's `includes('ai')` check is unaffected.

### M5. The gateway client plumbing names the wrong files and misses some
*Lines 521–525, 535–536.*

- `src/gateway/server/ws-jwt-auth.ts` returns a result object (lines 65–90). The client is built in `src/gateway/server/ws-connection/message-handler.ts` (around line 1101, `nextClient` with `orgId: mtOrgId`) and in a second auth path at `src/gateway/server.impl.ts` (around line 1707). Both must carry `plan` and `features`.
- The `JwtUserClaims` interface (`auth-jwt.ts` around line 19) needs both fields.
- `parseHydrationBody` (`channel-hydrate.ts:34–55`) rebuilds each item field by field, so `aiEnabled` is dropped unless it is copied there explicitly.
- `auth-refresh.ts:56–61` must assign `client.features = claims.features` even when that is `undefined`. Otherwise, after a rollback (flag off, 337) a long-lived socket keeps stale `features` and stays restricted until it reconnects.

**Specify** these files and the unconditional assignment.

### M6. Malformed `features` and `plan` claims fail open
*Lines 521–522 ("ignore malformed values rather than reject the token").*

If the claim is ignored, the gateway treats the client as "claims absent → not enforced" (297). A hub bug that emits, say, a string instead of an array would silently ungate Base orgs. That contradicts G1 ("a failed lookup never resolves to an allowing answer").

**Specify:** if the key is present but malformed, treat it as `[]`, which means enforced Base. If the key is absent, the client is not enforced.

### M7. The JWT issuer's behaviour on an entitlement lookup error is unspecified and fails open in practice
*Lines 471–472.*

`issueGatewayJwt` is served by `/api/gateway/jwt/+server.ts` and also called from `organization-provision.service.ts:185`. Under the request-path policy ("loader errors propagate", 219), a cache or DB failure fails JWT issuance. The dashboard then falls back to shared-token auth (Q2, `JWT_RETRY_COOLDOWN_MS`), which carries no claims and is not enforced.

**Specify:** what issuance does on a lookup error. Options: issue without claims and log a `lookup_error`, issue Base claims, or fail. Also say whether provisioning must keep working when entitlements are down.

### M8. The data model is underspecified and contradicts itself
*Lines 400–403, 551–554 (schema in 180–190).*

- `org_plans.set_by` is `uuid` (a profile), but the backfill writes `set_by = 'launch-backfill'` (553). `org_plan_events` has `actor_profile_id`, not `set_by`. The insert fails as written, or the implementer has to pick a nullable column plus a sentinel.
- Unspecified: types and defaults for `org_plan_events.id`, `at`, `note`, `plan_features.updated_by`; foreign keys and `ON DELETE` behaviour (org deletion); a `CHECK` or enum on `plan_key`; an index for `listPlanEvents` (`org_id, at desc`).
- RLS: the design grants to `authenticated` / `anon`, but the hub's house pattern is a `<table>_org_guc` policy on `current_setting('app.current_org_id', true)` with grants to `app_ledger` and `app_assistant_ro`. See `supabase/migrations/20261025100000_crm_doors.sql:74–87` and the `app_modules` policy in `supabase/qa/baseline/schema.sql:8434`. `org_plans.org_id` is uuid while the GUC is text, so the policy needs a cast.

**Specify:** the exact DDL, policy SQL and grants, and which connection `resolveEntitlements` and `setOrgPlan` use. `getCoreDb()` (a bypass role) is the obvious choice; say it.

### M9. The backfill script is missing the literal data it needs
*Lines 551–555.*

"Bernibites (matched by id)" and "FACES is Premium" both need the two org UUIDs, and the design gives neither. Also unspecified:
- the snapshot file path,
- the database URL environment variable (memory note: never run against prod without the `HUB_TEST_DB_URL` / `SUPABASE_DB_URL` discipline),
- the runner (`bun scripts/...`),
- how `--apply` is guarded (a `try/finally` restore, or none),
- the exit code when an assertion fails.

### M10. The `jobs/tick` AI handlers are unnamed, the skip semantics for bg-jobs are undefined, and the chokepoint claim does not hold for Pulse
*Lines 462–468, 446–449.*

`jobs/tick` registers these `bg-runtime` handlers: `brain_ingest`, the brain corpus jobs (two types plus the legacy one), business corpus, `groupchat`, `pulse_digest`, `pulse_dispatch` and the finance statements job. The design does not say which of them are AI. "Skip" also has no meaning for a leased bg-job. If the handler returns without finishing, `runTick` will re-lease the job every tick. The design must say: cancel, fail with a reason, or leave pending.

Line 448 says the chokepoint covers Pulse. But `withAiUsageOrg` is opened only in the brains reconcile, CRM analyze, vectorize, relationship and reminders ticks. `pulse/tick` (`runPulseTick`) and `jobs/tick` run with `orgId: null`, so the middleware does not enforce there (231: "No org in scope → not enforced"). Either wrap them in `withAiUsageOrg(job.tenantId, ...)` or drop the claim.

### M11. Some marketplace endpoints have no org, and one is a platform operation
*Lines 459–461.*

`src/routes/api/marketplace/agents/+server.ts` and `agents/[id]/+server.ts` are unauthenticated GETs: they take `({ url })` / `({ params })` and never touch `locals`. `/api/marketplace` is also listed in `API_HANDLER_AUTH_PATHS` as allowed without a tenant. `requireFeature(locals, ...)` with no tenant is undefined: does it throw 401, pass, or deny? `sync/+server.ts` is `requireAdmin` platform catalog sync, the same class as `sync/tick`, which the design leaves ungated.

**Specify** `requireFeature` behaviour with no tenant, and whether the public catalog reads and `sync` are gated.

### M12. Gateway AI paths outside `dispatchReplyFromConfig` are neither gated nor recorded
*Lines 537–539, 544–547, 559–566; G4 says "AI is closed for Base orgs everywhere".*

These run agents without going through dispatch:
- `src/web/auto-reply/heartbeat-runner.ts:162` and `src/infra/heartbeat-runner.ts` (proactive WhatsApp heartbeats)
- the gateway cron isolated agent (`src/platform/cron/isolated-agent/run.ts`, `src/gateway/server-core/server-cron.ts`)
- `src/gateway/server/hooks.ts`

Cron jobs that already exist keep running for a Base org, because the allowlist only stops new `cron.*` calls.

The mirror covers only `whatsapp`, `telegram` and `discord` (`HYDRATABLE_TYPES`, `channel-hydrate.ts`). WATI, meta-graph and other channel accounts therefore miss the mirror and stay unenforced, and WATI and meta-graph are WhatsApp transports.

None of this appears in the S4 TODOs or the S5 follow-ups proposal. Either gate these paths or add them to both the `TODO(handoff)` list and the proposal.

### M13. The S3 test plan is thin
*Lines 483–517.*

Only `availability.test.ts`, `route-guard.test.ts`, `topbar-parity.test.ts` and `sections.test.ts` are named. Missing:
- layout load: flag off, flag on with Base, lookup error (B1)
- `hasFeature` with exact membership and an override case (M4)
- `canViewPath` hiding a feature-gated page (M1)
- `my-agent-rpc.ts` returning `null` on `premium_required`
- at least one inline-control test (for example `EmailModal`: the summary is neither rendered nor fetched when `ai` is absent)

---

## 🟢 Nits

- **N1 (452).** The path is wrong: the file is `src/server/services/embeddings.ts`, not `src/server/embeddings.ts`.
- **N2 (404–405).** "Plus the schema barrel export": there is no local barrel. `pg-schema/*.ts` files are imported directly (for example `$server/db/pg-schema/pulse`). The Drizzle `schema:` barrel is the external `@minion-stack/db/pg`, which would mean a cross-repo release. Drop the instruction or say which one.
- **N3 (434–435).** `utilityLinks(canViewPath)` filters only through `canViewPath`, and its own header comment says "authority stays in canViewPath". The admin-only rule belongs in `route-access-policies.ts` (role admin), not in a `user.role` check inside `utility-links.ts`.
- **N4 (436–437).** The plan badge on `/settings/organizations` needs that route's `+page.server.ts` to load plans, and it is not listed. An admin `/orgs` page already exists (`(app)/orgs/+page.server.ts`, `can('orgs.all')`, also built on `listAllOrganizationsWithMemberCounts`). Say how `/admin/plans` relates to it.
- **N5 (438–440).** The six route-contract count sites are not named, including the two outside `src/lib/routes/`. List them.
- **N6 (413–414).** "Every reason value" in `evaluate.test.ts` includes `lookup_error`, which the pure evaluator cannot produce. Move that case to the service test.
- **N7 (415–416).** The global tag for `plan_features` is unnamed, and nothing writes `plan_features`. Name the tag, or drop it until a writer exists.
- **N8 (462).** Pulse's per-org loop lives in `$server/services/pulse-tick` (`runPulseTick`), not in the route file.
- **N9 (473–476).** `aiEnabled` for accounts whose `tenantId` is null (unscoped) is unspecified. `true` fits "not enforced"; say so.
- **N10 (419–421 vs 329).** In shadow mode (flag off), does `requireFeature` still log and send PostHog `entitlement_denied` for would-be denials? Line 329 implies yes; line 419 is silent.
- **N11 (526–528).** "Handshake" in `BASE_GATEWAY_METHODS` is ambiguous (`connect` / `connect.challenge` are handled before `authorizeGatewayMethod`). Say where the new check sits relative to the `!client?.connect` early return and the role checks, not only "before the admin-scope bypass".

---

## What is ready

- The slices are partitioned sensibly: S1 and S2 are inert behind the flag, S4 acts only on claims, and S5 is data. Once B1 is fixed, every phase leaves the build green.
- These anchors check out:
  - `authorizeGatewayMethod` at `server-methods.ts:205`, with a single caller at line 368;
  - `errorShape(code, msg, {details})`, and `ErrorCodes.FORBIDDEN` already exists;
  - `extractUserClaims` at `auth-jwt.ts:89`;
  - `usageMiddleware.wrapGenerate` / `wrapStream` and `currentAiUsageScope` (an AsyncLocalStorage scope);
  - `requireAdmin`;
  - `cached` / `keys.hub` / `tags.tenantDomain` / `invalidateTags` from `@minion-stack/cache`;
  - `toResolvedChannels` and the `/api/internal/channels/resolved` endpoint;
  - `getMirrorEntry`, with the 5-minute refresh (`DEFAULT_TICK_MS`);
  - the `message_received` hook in `dispatch-from-config.ts`, next to the existing `isChannelEnabledForAccount` skip, which is a good precedent for the `aiEnabled` check;
  - `createOptimistic` (`src/lib/utils/optimistic.ts`);
  - `App.Error.code`.
- WhatsApp web dispatch (`process-message.ts` → `dispatchReplyWithBufferedBlockDispatcher` → `dispatchInboundMessage` → `dispatchReplyFromConfig`) does funnel through the gated function.
