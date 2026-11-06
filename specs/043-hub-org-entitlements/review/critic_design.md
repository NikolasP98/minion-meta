# Design Critic review: 043 org entitlements (design.md lines 1–391)

*   **Reviewer:** EGM Design Critic Goldfish (REVIEW mode)
*   **Standard:** feature-spec-standard.md
*   **Code checked:** hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a, read-only (`git show` / `git grep`).
*   **Counts:** 🔴 2 Blocker · 🟡 8 Major · 🟢 7 Nit

The structure is sound: the hub owns the data and the evaluator, the evaluator is pure, writes are admin-only and
audited, the backfill is owner-run, and alternatives are recorded for most decisions. The weak point is the
enforcement claims. Several "every X goes through one chokepoint" statements are false on the current code,
and one rollout step would hide AI from FACES. Details below.

---

## 🔴 Blockers

### B1. The hub "one chokepoint" lets through every request that has no org in scope, and the notes AI routes have none (lines 55, 120–122, 231)

The design says every hub model call is refused at `usageMiddleware`, keyed on `currentAiUsageScope().orgId`,
and that "No org in scope → not enforced, logged" (line 231). On `origin/master` that org is set in only two
ways:

*   `getTenantCtx()` (`src/server/auth/tenant-ctx.ts:15`, `setAiUsageOrg`), or
*   `withAiUsageOrg()` in five ticks (brains reconcile, CRM analyze / vectorize / relationship, reminders).

The hook opens the scope with `orgId: null` (`hooks.server.ts:675-676`). Routes that authenticate with
`requireAuth` alone never fill it in. Counting tenant-resolution calls in every route that calls a model gives
**0** for:

*   `api/notes/{polish,autocomplete,refine,spelling}`. These are the "AI polish on notes" that CUJ 2 promises is
    refused server-side.
*   `api/assistant/route`. This one gets an explicit `requireFeature`.
*   `api/marketplace/generate-agent`. This one also gets an explicit `requireFeature`.

So the notes AI stays open to any Base-org user who calls it directly. Hiding the UI (G7) is the only thing in
the way, and line 74 says the UI is not the authority.

Two more AI paths sit outside both the chokepoint and the gateway gate:

*   `api/notes/transcribe` forwards to the gateway `media.transcribe` (Whisper) through `gatewayCall`. That call
    uses the shared token, so it carries no `features` claim (line 259).
*   `api/voice/tts` calls ElevenLabs directly.

Neither appears in the enforcement table. The Pulse tick and `jobs/tick` set no org scope either. The chokepoint
is therefore not a backstop there, and any per-org check the explicit tick gating misses fails open.

**Recommendation:**
*   When enforcement is on, treat "authenticated request, no org in scope" as a denial, not as "not enforced".
    Alternatively, set the scope org in `hooks.server.ts` as soon as `locals.tenantCtx` resolves, rather than
    lazily in `getTenantCtx`.
*   Add transcription and TTS to the enforcement table.
*   Add a CI test that lists every `getOpenRouterModel`, raw `openrouter.ai` / ElevenLabs fetch and AI
    `gatewayCall` method, and checks that each one runs with an org in scope or has an explicit gate.

### B2. Release 1 hides AI from every org, FACES included, unless the UI reads the flag (lines 75–76, 144–149, 303–313, 327–329)

"No row = Base" (line 181), and no rows exist until the backfill runs (step 2). The UI section (lines 305–313)
does three things:

*   It builds the layout's `features` from `resolveEntitlements`.
*   It makes `isAppRouteBlocked` treat a missing feature like a disabled module.
*   It makes inline controls check `hasFeature`.

None of that is conditioned on `ENTITLEMENTS_ENFORCED`. Line 328 says "every gate is behind
`ENTITLEMENTS_ENFORCED`", but the UI is described as rendering, not gating. Read literally, deploying Release 1
gives every org (FACES included) an empty feature list. Their AI pages then 404 and their AI controls disappear
until the owner runs the backfill. This breaks G8 ("FACES sees no change") and CUJ 6.

Slice S3, outside this review's range, makes it worse. It returns "Base-shaped features" from the layout on any
lookup error, so after launch a database blip hides AI from paying orgs too. That conflicts with line 219
("request path: loader errors propagate").

**Recommendation:**
*   State that, with the flag off, the layout returns the full feature list (or the UI ignores entitlements).
*   Decide how the layout fails when the flag is on. Failing the page, or keeping the last known value, both
    beat demoting a paying org for the length of an outage.
*   Add "FACES still sees the AI pages after Release 1, before the backfill" to CUJ 6.

---

## 🟡 Majors

### M1. The "at most one JWT lifetime, 1 h" gateway staleness bound has no support in the code (lines 78, 297–299, 334–335)

*   The gateway checks the JWT `exp` only during the connect handshake (`ws-jwt-auth.ts` `resolveJwtAuth`). No
    code under `src/gateway` drops or re-checks an open connection when its token expires.
*   Line 299 says "the hub already refreshes via `auth.refresh`". It does not: `git grep auth.refresh` finds no
    caller in hub `src/`. The only renewal is a reconnect.

A dashboard tab or PWA that stays open therefore keeps its Premium `features` until it reconnects, which can
take days. The acceptance step "after JWT refresh, a dashboard chat is refused" has no trigger. Also, the
current `auth.refresh` handler copies only userId, role, orgId and agentIds; S4 covers that part.

**Recommendation:** pick one bound and implement it:
*   the hub calls `auth.refresh` on a timer shorter than `exp`, or
*   the gateway closes connections whose JWT has expired, or
*   the acceptance criteria say "until the next reconnect".

### M2. Anyone holding the shared token bypasses the gateway gate, and the design does not state what the gate depends on (lines 63–65, 99–102, 297–298)

*   The dashboard always sends the shared operator token; the JWT "only adds identity"
    (`gateway.svelte.ts:208-214`).
*   A connection with the token and no JWT resolves to admin scopes with no claims (`ws-jwt-auth.ts`, case 2).
    Under the policy at line 297 it is not enforced.
*   Base-org browsers already receive that token (`/api/servers/[id]/token`, see comment at
    `gateway.svelte.ts:399-402`). So skipping the gate takes one devtools edit, not "a determined user".
*   The gate also does nothing unless two things hold, and the design names neither as a precondition:
    `PUBLIC_GATEWAY_JWT_AUTH === 'true'` in hub prod (`gateway.svelte.ts:226`), and every gateway has
    `oidcIssuers` set.

This is a security- and data-tagged spec, and the gateway is the only place chat can be stopped
(concepts_brief #6). Leaving Q2 as a "draft default" is not enough.

**Recommendation:**
*   Either stop issuing the shared token to sessions whose active org is Base while enforcement is on (connect
    with the JWT only), or record Q2 as a risk the owner has explicitly accepted.
*   Add a metric that counts token-only connections from browser origins.
*   List both preconditions in Rollout step 3.

### M3. Gateway AI that starts in the background or on an inbound message is outside every gate (lines 53–61, 79, 233, 264–275)

G4 says AI is "closed for Base orgs everywhere", and the acceptance says "its background AI skips". The design
gates only dashboard WS methods and `dispatchReplyFromConfig`. On gateway DEV, these AI paths go through neither:

*   **Cron and heartbeat.** `server-core/server-cron.ts` runs `runCronIsolatedAgentTurn` and
    `runHeartbeatOnce`. Cron jobs an org created while Premium keep spending after a downgrade.
*   **Flow channel triggers.** `channels/fire-message-inbound.ts:59` `fireInboundTriggerHook` fires flows on every
    inbound message, "regardless of agent dispatch" (comment at lines 13–15). Flows with LLM or agent nodes run
    before the reply gate and are not affected by it.
*   **HTTP surfaces.** `openai-http.ts`, `openresponses-http.ts`, `acp-messages-http.ts` and
    `tools-invoke-http.ts` accept the shared token.
*   **Gateway Pulse proposals.** The hub refuses `/api/gateway/pulse/proposals`, but the gateway agent has
    already spent the tokens producing them.

**Recommendation:** either gate these paths or narrow G4 and the acceptance to "hub AI, dashboard methods and
channel auto-replies", and list the rest as known gaps with `TODO(handoff)` plus a proposal entry. Gating cron
and heartbeat needs the agent→org binding that spec 042 owns, so name that dependency. The flow trigger can
check the same `aiEnabled` value in the mirror.

### M4. The listen-only switch that already exists is not evaluated as an alternative, and the mirror covers only three channel types (lines 233, 264–275, 350–365)

**An existing switch.** The hub's `channels.replies` column (`'none' | 'bound'`) already travels in the mirror
projection (`channel-publish.service.ts:44,65`). The gateway already acts on it:

*   `web/inbound/access-control.ts:85`: "`replies:'none'` ⇒ ingest but NEVER emit".
*   `listenOnly` in `channels/telegram/accounts.ts:179` and `channels/discord/accounts.ts:73`.

The design adds a second field, `aiEnabled`, with a new check in dispatch, and does not mention `replies`. It
needs one of two things:

*   an alternative that projects `replies:'none'` for Base-org accounts in `toResolvedChannels` without touching
    the stored row, or
*   a documented reason not to do that. Valid reasons exist: `replies` works only in
    `CHANNEL_CONFIG_SOURCE=db` mode, and it blocks only sending, not running the agent.

**Coverage.** `channel-hydrate.ts` `HYDRATABLE_TYPES` is whatsapp, telegram and discord only. Every other
channel extension (Slack, Signal, iMessage, Line, …) is a permanent mirror miss, which line 274 treats as "not
enforced". State this, or confirm that no Base org can run those channels.

### M5. Two base features quietly break when the chokepoint throws (lines 54–60, 124–129)

*   **Booking confirmations.** `reminders.service.ts:298-310`: when `config.inferConfirmation` is on, replies go
    through `inferConfirmationReply`, which is an AI call. That function catches every error and returns
    `'unclear'` (`reminder-compose.ts:52-54`). Under enforcement, a Base org's patient replies ("sí, confirmo")
    therefore never confirm or cancel the booking. The keyword parser `parseYesNo` exists but is used only when
    the flag is off. G4's reminder exception covers only personalization.
*   **Miscounted skips.** Other services swallow model errors the same way. A premium refusal then turns into
    "no result" or an error count rather than `skipped_by_entitlement`, and that makes CUJ 3's reporting wrong.

**Recommendation:** for Base orgs, fall back to the keyword path. List the base features that call AI
internally (confirmation inference is one) as part of G4's "unless a non-AI feature needs the path" rule.

### M6. Base orgs cannot set up or change channels from the dashboard (lines 245–262)

Line 250 lists "pairing and checking channel accounts" as something Base orgs keep. Lines 259–262 take away
`config.*` writes. The hub's channel UI writes through browser `config.patch`:

*   `ChannelSetupWizard.svelte:216`
*   `ChannelCard.svelte:319,389` (receive-only / bound mode)
*   `ChannelGroup.svelte:67`
*   `HistorySyncControl.svelte:98`
*   `state/config/config.svelte.ts:301,326`

So Bernibites could not add a WhatsApp account or change its reply mode. The `TODO(handoff)` waits on spec
042, which is not scheduled here.

**Recommendation:** move those writes to a hub server route that calls `gatewayCall('config.patch')`. That path
already exists server-side and is not gated. Alternatively, allow a channel-scoped patch for Base orgs. Add
"Base org pairs and configures WhatsApp" to the acceptance criteria.

### M7. The document has no Risks & Mitigations section and no measurable success signal (standard: "Risks & Limits", "Requirements")

Risks are spread across Open Questions and parentheticals, and several of them (M1–M6, B1) are missing. The
standard requires failure modes, security implications and limits to be called out explicitly, each with a
mitigation. Acceptance (lines 77–80) relies on someone watching. A direct measure already exists:
`ai_usage` rows per org (`usageMiddleware` already records an org). "0 rows for the test org after enforcement"
would make an objective acceptance check and a production monitor.

**Recommendation:** add a "Risks & Limits" section (bypass paths, staleness, fail-open cases, base-feature
regressions, cache backend) and an `ai_usage`-based success metric.

### M8. Filing flows, builder and sessions under `ai` removes non-AI automation; the owner needs to confirm (lines 306–310)

The flow editor builds automations whose nodes include `trigger`, `schedule`, `channel`, `transform`, `router`
and `reaction` (see the copilot system prompt). Many of those flows contain no AI. The owner's rule (line 53)
keeps paths that non-AI features need, and the mission orders ERP→CRM→RPA. Hiding the page also does not stop
flows that already exist (see M3).

**Recommendation:** have the owner confirm whether non-AI flows are Base or Premium. If they are Base, gate AI
node types, not the whole editor.

---

## 🟢 Nits

*   **N1 (lines 77–78, 214–217).** "Hub: immediate" depends on the cache backend. `src/lib/server/cache.ts`
    defaults production to `noop` unless `CACHE_BACKEND` is set. With `memory` on Vercel, a tag invalidation
    reaches only one instance. Name the production backend.
*   **N2 (lines 63, 231).** I believe SvelteKit's `handleError` cannot change the status of an unexpected error,
    which stays 500. Slice S2 relies on `handleError` to produce the 403. Please verify this against SvelteKit
    2.70. Separately, streaming routes (for example `structured-stream`) have already sent a 200 by the time the
    stream's model call runs. The 403 `premium_required` contract only holds when the check runs before the
    response starts.
*   **N3 (lines 221–222).** The `42P01` wording is unclear ("resolve to 'no row' = Base only after enforcement is
    deployed"). State what happens before enforcement and what happens after.
*   **N4 (lines 180–185, 204–208).**
    *   `set_by uuid` conflicts with S5's `set_by = 'launch-backfill'`.
    *   `plan_key` has no CHECK constraint or catalog validation, so behaviour for an unknown or retired plan key
        is undefined. Say it resolves to Base.
    *   A feature `rule` can call `has()` on another feature, so two rules can call each other forever. Add a
        cycle guard or forbid it.
*   **N5 (lines 230, 241–256).** The allowlist check runs before the admin-scope bypass. A platform admin whose
    active org is Base therefore loses agent and config access on a shared gateway. That is acceptable if it is
    intended, but say so.
*   **N6 (line 182).** `plan_features` sits beside the existing customer-facing `membership_plans` and
    `pos_payment_plans` tables. A prefix such as `org_plan_features` would avoid confusion.
*   **N7 (line 223–224).** A PostHog `entitlement_denied` event fires on every denial, including each model call
    and each tick for each org. Deduplicate per org, feature and day so the event volume stays low.

---

## Verified as stated

*   JWT claims and lifetime: `userId, role, agentIds, orgId`, 3600 s.
*   `authorizeGatewayMethod` at `server-methods.ts:205`, admin bypass inside it.
*   `extractUserClaims` at `auth-jwt.ts:89`.
*   `errorShape` accepts `details`; `ErrorCodes.FORBIDDEN` exists.
*   `/api/internal/channels/resolved` is pulled on boot and every 5 minutes, and keeps the last good copy on
    failure.
*   `myAgent.*` method names exist.
*   `App.Error.code` exists.
*   `requireAdmin` checks `profiles.role`.
*   `listAllOrganizationsWithMemberCounts` exists.
*   `vercel-build` runs `db-migrate`.
*   `app_modules` grants `ALL` to `authenticated`.
*   `organizations.id` is a uuid.
*   `planTier` is used only by the free-tier code.
