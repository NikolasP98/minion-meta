# Org entitlements (premium orgs)

*   **Author:** Nikolas Pinon (owner) · drafted by Claude via EGM
*   **Status:** Final draft, pending egm-review. Revised after goldfish review 2026-10-29 (two rounds; round 2 = stages 8 and 9).
*   **Date:** 2026-10-28 (revised 2026-10-29)
*   **Predecessor:** [concepts_brief.md](./concepts_brief.md) (decisions A–F resolved 2026-10-28). Where this
    design departs from the brief, the departure is listed under "Departures from the concepts brief".

--------------------------------------------------------------------------------

## Overview

Minion has no record of which organizations pay for AI. The owner rule of 2026-10-26 says AI features are
premium and the base offering is the method plus the platform. This design adds a **plan** to every org
(Premium, Base; later others such as Premium-lite) and a code-defined catalog of **gated features** with a
typed plan → feature table in code. Platform admins assign plans by hand on a new platform-admin page. The
owner's framing: "RBAC for the cloud server" — plans gate orgs the way roles gate members.

Enforcement is server-side: hub API routes, hub cron ticks and background jobs, hub server model calls, the
gateway (which reads the org's plan and features from the JWT the hub signs), the gateway's channel replies
(through a per-account `aiEnabled` field), and the flows runner (through a per-flow `aiEnabled` field). The
browser only renders what the server resolved, and never renders disabled AI.

### Names used in this document

*   **FACES** — the production clinic org, `organizations.id = 21e0601b-f632-43fd-8414-d644af4271f4`, slug
    `faces-sculptors` (the id appears in several `minion_hub/scripts/*.ts` constants). It must see no change.
*   **Bernibites** — the one org that is Base at launch. Its id is not in any repo; the backfill resolves it by
    name (see S5).
*   **Pulse** — the hub's proactive-agent pipeline (`/api/pulse/tick`, `pulse_digest` and `pulse_dispatch` jobs).
*   **Doors** — the CRM lead-capture forms (spec 041); "door FAQ drafts" are AI-drafted FAQ answers.
*   **My Agent** — the hub `/home` page: the personal inbox (email feed, notes) served by `myAgent.*` gateway
    methods.
*   **Spec 042** — the meta spec that owns the gateway agent → org binding (`personal_agents.gateway_id`).
*   Code paths are prefixed with their repo: `minion_hub/` (hub, base `master`), `minion/` (gateway, base `DEV`),
    `langgraph-server/` (the flows runner, tracked in this meta repo, base `dev`).

### Departures from the concepts brief

*   **Reason values.** The brief's `no_plan_default` and `org_unknown` reasons are dropped. A missing row is
    reported as plan Base with `planSource: 'default'`, which the admin page shows as "Base (no plan row)".
*   **Org creation writes no plan row.** The brief's decision C said creation writes a Base row. A missing row
    already means Base, so provisioning writes nothing.
*   **`plan_features` table dropped.** The brief's decision B kept a DB mapping table. The mapping is the typed
    `PLAN_DEFAULTS` table in code; DB-editable overrides are a later additive step (Alternatives).
*   **No Premium tag, no upgrade message.** The brief's decision 9 rendered a Premium tag. Owner 2026-10-29:
    disabled AI is not rendered at all.
*   **Missing tables are a lookup error.** The brief's settled point 2 said missing tables mean all features.
    Here, with the flag off every feature is granted anyway; with it on, missing tables are a `lookup_error`.
*   **Flows are Base.** The brief and the first draft hid the flow editor; owner rule 2026-10-29 keeps non-AI
    automation open and gates only AI node types.

## The Problem

AS-IS (hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a):

*   No plan, tier, subscription or entitlement concept exists in the hub or the shared database. Every org can use
    every AI feature. The only org-level gates are module on/off rows (`app_modules`, missing row = enabled) and
    the business/personal split (`ORG_KIND_POLICY`, `MODULE_MANIFEST.kinds`).
*   AI runs on five paths the hub does not uniformly control:
    1.  Hub server model calls through `getOpenRouterModel()` (`minion_hub/src/server/llm.ts`, middleware
        `usageMiddleware`), plus two raw OpenRouter fetches (`src/server/services/embeddings.ts`,
        `src/server/services/assistant-router.service.ts`), one ElevenLabs fetch (`/api/voice/tts`) and AI
        gateway calls made with the shared token (`media.transcribe`, `playground.complete`).
    2.  Hub cron ticks and background jobs that call models per org.
    3.  Chat and agent methods, which go from the browser straight to the gateway over WebSocket; the hub never
        sees those turns.
    4.  Gateway channel auto-replies, crons, heartbeats and webhooks.
    5.  The flows runner (`langgraph-server/`), which executes LLM and agent nodes.
*   The hub AI usage scope (`src/server/ai-usage.ts`) knows the org only when a route calls `getTenantCtx` or a
    tick wraps work in `withAiUsageOrg`. `hooks.server.ts:675-676` opens every request scope with `orgId: null`,
    so most user-facing AI routes run with no org in scope.
*   The gateway has no Postgres access. It knows a connection's org only from the hub-signed JWT
    (`minion_hub/src/server/services/gateway-jwt.service.ts`, 3600 s lifetime, claims
    `userId, role, agentIds, orgId`). Every hub browser session also holds the shared operator token
    (`POST /api/servers/[id]/token`), which on its own gives admin scope with no org.
*   The gateway carries an unused tier system (`capability_tiers`, `middleware/quota.ts`) and a live but separate
    free-tier user system whose own JWT uses a `planTier` claim.

The result: there is no way to sell AI separately, no way to stop a non-paying org from running AI spend, and
no consistent server answer to "may this org use this feature".

TO-BE: an org's plan decides, on the server, whether its AI features run. A platform admin changes the plan in
one place and the effect lands within the bounds in G9. Server refusals carry `premium_required` and the
feature key; the UI renders nothing for disabled AI (G7).

DELTA: the transitions and the tests that prove each are in Detailed Implementation, slices S1–S5.

## Goals

*   **G1 — Plan per org.** Every org resolves to exactly one plan. A missing plan row resolves to **Base**. An
    unknown `plan_key` resolves to Base with a logged warning. A failed lookup never grants on a server gate,
    with two named exceptions accepted in R5: the gateway JWT issuer omits the claims, and the shared-token
    endpoint uses the cached answer or else allows (both log `lookup_error`).
*   **G2 — Plan → feature mapping in code.** `PLAN_DEFAULTS` lists the top-level features each plan grants.
    Feature keys are dotted (`ai`, `ai.chat`, `ai.proactive`, `marketplace`). Inheritance only removes: a child
    key is granted only when its parent is granted and nothing disables it. An optional per-feature rule in
    server TypeScript can combine plan, org kind and other features with all / any / not; no feature has a rule
    at launch.
*   **G3 — One server evaluator.** One pure hub function returns `{allowed, reason}` with
    `reason ∈ {granted, not_in_plan, rule_false}`; the resolver adds `lookup_error`. The server sends the fully
    expanded list of granted keys everywhere else (UI, JWT), so no second evaluator exists.
*   **G4 — Gates, enforced server-side.** Rule (owner, 2026-10-29): Base orgs cannot reach any AI code path; a
    shared path stays open only where a non-AI feature depends on it. What this spec gates:
    *   `ai`, hub: every AI route calls `requireFeature` first; the model-call chokepoint is the backstop and
        knows the org on every authenticated request.
    *   `ai`, gateway dashboard: a Base-org session connects with its JWT only and may call only the named
        allowlist (`BASE_PLAN_GATEWAY_METHODS`).
    *   `ai`, gateway channel replies: switched off for Base orgs' WhatsApp, Telegram and Discord accounts by a
        config field, not a live check.
    *   `ai`, flows: AI nodes are not offered in the editor; at run time an AI node ends its branch (no output,
        no reply delivered), and branches without an AI node still run.
    *   `ai.proactive`: every hub tick and AI background job skips non-entitled orgs and reports
        `skipped_by_entitlement`. Reminders still send, with the plain template and keyword confirmation.
    *   `ai.chat`: `/api/assistant/route` refuses up front.
    *   `marketplace`: the marketplace install, generate-agent and catalog APIs refuse.

    Not gated here (listed in Risks & Mitigations): gateway crons, heartbeats, webhook agent runs and gateway
    Pulse generation, which need spec 042's agent → org binding; channel types outside the mirror; the Gmail
    auto-labeler.
*   **G5 — One machine refusal contract.** Hub: HTTP 403 with body `{code: 'premium_required', feature}`.
    Gateway: a `FORBIDDEN` frame with `details: {reason: 'premium_required', feature}`. (Hub `code` and gateway
    `details.reason` carry the same value.) It exists for logs, debugging and direct API callers; the UI never
    shows it (G7). It is distinct from the role 403 ("your role can't").
*   **G6 — Admin control with audit.** A platform-admin page in the existing platform-admin surface (`/orgs/plans`,
    gated by the existing `orgs.all` capability like `/orgs`) lists orgs with their plan, lets an admin change it, shows each org's effective
    features with the reason, and lists plan changes (who, when, from, to). Org members can read their own plan,
    never write it.
*   **G7 — Disabled AI is not rendered (owner, 2026-10-29).** Nothing looks blocked: no "Premium" tag, no locked
    button, no upgrade message. Pages whose purpose is AI disappear from navigation and 404 like a disabled
    module; AI controls inside other pages are absent and the client does not call their endpoints. The server
    stays the authority; the UI only reads the server-resolved feature list.
*   **G8 — Safe launch.** While `ENTITLEMENTS_ENFORCED` is off, every org is treated as entitled to every
    feature on every surface (UI, route guard, `aiEnabled`, JWT claims). Every existing org except Bernibites is
    Premium and Bernibites is Base before the flag is turned on. FACES sees no change at any step. With the flag
    on and a lookup failing, the UI and route guard render as entitled (a paying org is never demoted by an
    outage); server gates keep G1's rule.
*   **G9 — Acceptance.** A platform admin moves a test org to Base. Within these bounds the org's AI is gone:
    *   hub: immediate on the `noop` or `valkey` cache backend; up to the 5-minute cache TTL on other Vercel
        instances if `CACHE_BACKEND=memory`;
    *   gateway dashboard: at the next WebSocket reconnect (page reload, network drop or gateway restart). No
        periodic JWT refresh exists, and the gateway does not drop a socket when its JWT expires;
    *   channel replies: at the next mirror refresh, at most 5 minutes (no push; a push would restart channel
        runtimes, see Alternatives);
    *   flows: at the next run (the runner loads the flow from the hub on every run).

    Checks: AI pages and controls are gone; AI and marketplace APIs return 403 `premium_required`; background
    AI skips the org; a WhatsApp message is stored but gets no agent reply; no new `ai_usage` rows appear for the
    org; FACES is unaffected throughout.

## Non-Goals

*   Billing, checkout, payment providers, or automatic plan changes.
*   Per-plan token or spend ceilings (usage is already metered per org; a cap is a follow-up).
*   A rule language editable from the admin page (rules and the plan table change by pull request).
*   Changing site pricing copy (the Personal "one agent" conflict is an owner decision tracked separately).
*   Fixing the gateway agent → org binding (`personal_agents.gateway_id`, bearer → gateway row flips; spec 042 S1).
    Gating gateway crons, heartbeats and webhook agent runs depends on it.
*   Fixing that any member of any org can read the shared gateway token today (pre-existing; recorded as a
    `TODO(handoff)` and proposal item). This spec only stops Base-org sessions from receiving it.
*   Removing or reusing the gateway's dormant `capability_tiers` / `quota.ts` or the free-tier `planTier` system
    (decision F: left untouched, logged for retirement).
*   Per-method premium tiers inside the gateway (Premium-lite with chat but no flows, etc.); the gateway checks
    the `ai` group only until a second paid plan exists.

## Open Questions

### Resolved

*   **Q1 — Channel agents. RESOLVED (owner, 2026-10-29): gate them in this spec.** A Base org still receives
    and stores inbound channel messages, but its agent does not reply. The gateway already maps each channel
    account to its org, so this does not depend on spec 042.
*   **Q2 — Connections without a hub JWT. RESOLVED (review decision 4, 2026-10-29).** With the flag on, a
    Base-org browser never receives the shared token: `POST /api/servers/[id]/token` refuses, and the dashboard
    connects with its JWT only, with no shared-token fallback. Premium orgs keep today's behavior. Hub
    server-to-gateway calls keep the shared token; the hub gates those itself.
*   **Q3 — Upgrade destination. RESOLVED (owner, 2026-10-29): none in the product.** Disabled AI is not
    rendered, so there is no upgrade message to point anywhere; selling Premium is the site's job.
*   **Q5 — Flows. RESOLVED (owner rule, 2026-10-29): Base.** Non-AI automation is a non-AI need. The flow editor
    and triggers stay open; AI node types are Premium.

### Open

*   **Q4 — Is `PUBLIC_GATEWAY_JWT_AUTH=true` in hub production, and does every gateway set
    `gateway.multiTenant.oidcIssuers` and `gateway.hubMetrics`?** These are launch preconditions (Launch
    order step 4). If any is false, Base-org sessions cannot reach the gateway, or the mirror enforces nothing.
    The owner checks them before turning the flag on.

## Critical User Journeys (CUJs)

### CUJ 1: Platform admin restricts an org

*   **Given**: a platform admin (`profiles.role = 'admin'`) and a test org on Premium.
*   **When**: the admin opens `/orgs/plans`, selects the test org, changes its plan to Base, and saves.
*   **Then**: the org's row shows Base; the effective-features view shows `ai`, `ai.chat`, `ai.proactive` and
    `marketplace` off with reason `not_in_plan`; the audit list shows the change with the admin's name and time;
    the hub cache tag for that org is cleared; within 5 minutes the gateway's next mirror refresh carries
    `aiEnabled: false` for the org's WhatsApp, Telegram and Discord accounts. No channel runtime restarts.

### CUJ 2: Member of a Base org opens the hub

*   **Given**: a user in the test org (Base), flag on.
*   **When**: they open the hub, My Agent, an email and a note, and the CRM.
*   **Then**: there is no assistant orb, no AI pages in navigation, no AI summary or "draft reply" on emails, no
    AI polish, transcription or voice on notes, and no AI widgets in the CRM; nothing hints at a lock. Typing an
    AI page's URL gives the normal not-found page. Email bodies, notes, CRM, POS, channels, flows and every
    non-AI module work as before.

### CUJ 3: Background AI skips a Base org

*   **Given**: the test org is Base and has Pulse enabled and reminders configured with personalization and
    AI confirmation inference on.
*   **When**: the Pulse tick, the jobs tick and the reminders tick run, and a patient replies "sí, confirmo".
*   **Then**: no model call is made for that org; reminders go out with the plain template and the keyword
    confirmation prompt; the reply confirms the booking through the keyword parser; each tick's response and
    log report `skipped_by_entitlement` including that org; FACES and other Premium orgs are processed as before.

### CUJ 4: Marketplace and AI APIs refuse a Base org

*   **Given**: a member of the Base org with the `marketplace:view` permission.
*   **When**: they call `POST /api/marketplace/install`, `/api/notes/polish` or `/api/voice/tts` directly.
*   **Then**: each returns 403 `{code: 'premium_required', feature}`; the marketplace link is not in the
    sidebar and `/marketplace` returns not-found for that org.

### CUJ 5: New org starts on Base

*   **Given**: plans are live.
*   **When**: a platform admin provisions an organization through `/api/organizations/provision`.
*   **Then**: the org resolves to Base with no plan row; its cloud workstation provisioning (`shells.*`) still
    succeeds; an admin can upgrade it from `/orgs/plans`.

### CUJ 6: Launch without disruption

*   **Given**: S1–S4 are deployed and the flag is off; `org_plans` is empty.
*   **When**: FACES uses the hub; then the owner runs the backfill (dry run, then apply).
*   **Then**: before the backfill FACES still sees every AI page and control (flag off ⇒ every feature
    granted); the dry run prints the resolved Bernibites id and reports that exactly one org will not be
    Premium; after the apply the assertions pass; only then is the flag turned on; FACES keeps chat, Pulse and
    marketplace.

### CUJ 7: Base-org dashboard uses the gateway without AI

*   **Given**: the test org is Base, flag on, and a member reloads the hub.
*   **When**: the dashboard connects to the gateway, loads its bootstrap lists, and the member opens `/channels`
    and a flow; a platform admin acting in the org adds a WhatsApp account from `/settings?s=comms`; then the
    member sends `chat.send` from devtools.
*   **Then**: the token request returns 403 `premium_required`, the dashboard connects with the JWT only, the
    bootstrap calls (`agents.list`, `sessions.list`, `cron.list`, `system-presence`) succeed, channel status
    shows, and the `/channels` cards link to `/settings?s=comms` instead of the per-channel plugin pages
    (`/channels/[id]` returns not-found for this org). The admin pairs WhatsApp by QR there over the JWT-only
    connection (`channels.whatsapp.pair`, `config.patch`). `chat.send` returns `FORBIDDEN` with
    `details {reason: 'premium_required', feature: 'ai'}`.

### CUJ 8: A Base org's WhatsApp message gets no agent reply

*   **Given**: the test org is Base, flag on, and it owns a WhatsApp account served from the mirror.
*   **When**: a customer sends a WhatsApp message to that account.
*   **Then**: the message appears in the hub inbox and in the gateway message ledger; the `message_received`
    hook fires; no agent runs and no reply is sent; the gateway logs `skipped_by_entitlement {channel,
    accountId, orgId}`.

## Technical Plan (Architecture)

RBAC decides what a *member* may do inside an org; entitlements decide what an *org* may use at all. The shape
copies RBAC (a typed table in code, a pure evaluator, a tagged cache), and the two checks run one after the
other.

### Shape

```text
 hub (minion_hub, SvelteKit on Vercel)
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ platform admin ─▶ /orgs/plans ─▶ setOrgPlan() ─▶ org_plans + org_plan_events (audit)      │
 │                                     │ invalidate target org tag (no channel push)        │
 │                                     ▼                                                    │
 │  resolveEntitlements(orgId) ◀── cached 5 m ── PLAN_DEFAULTS + rules (entitlements/)      │
 │     │ flag off ⇒ every feature granted                                                   │
 │     ├─▶ hooks.server.ts: route guard 404 + locals.entitlements ─▶ (app) layout ─▶ UI     │
 │     ├─▶ requireFeature() first line of every AI / marketplace route ─▶ 403               │
 │     ├─▶ usageMiddleware + embeddings + assistant-router + TTS (backstop, org in scope)   │
 │     ├─▶ ticks + bg-runtime advanceJob ─▶ skip, count skipped_by_entitlement              │
 │     ├─▶ POST /api/servers/[id]/token ─▶ 403 for orgs without `ai` (no shared token)      │
 │     ├─▶ GET /api/gateway/jwt ─▶ claims plan, features[] (flag on only)                   │
 │     ├─▶ /api/internal/channels/resolved ─▶ aiEnabled per account                         │
 │     └─▶ /api/internal/flows/[id] ─▶ aiEnabled per flow                                   │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
        │ JWT on WS connect           │ mirror pull every 5 m             │ flow load per run
        ▼                             ▼                                   ▼
 gateway authorizeGatewayMethod   gateway dispatchReplyFromConfig      flows runner compile-flow
 features lacks `ai` ⇒ only       aiEnabled false ⇒ no agent run       aiEnabled false ⇒ an AI node
 BASE_PLAN_GATEWAY_METHODS        (message stored + ledgered first)    ends its branch; no reply sent
```

### Data model (hub Postgres, one schema-only migration)

*   `org_plans` — `org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE`,
    `plan_key text NOT NULL`, `set_by_profile_id uuid NULL`, `set_note text NULL`,
    `set_at timestamptz NOT NULL DEFAULT now()`. One row per org at most. **No row = Base.** No CHECK on
    `plan_key`, so adding a plan needs no migration; an unknown key resolves to Base with a warning.
*   `org_plan_events` — `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `org_id uuid NOT NULL` (no foreign key,
    so the audit trail outlives a deleted org), `from_plan text NULL`, `to_plan text NOT NULL`,
    `actor_profile_id uuid NULL`, `note text NULL`, `created_at timestamptz NOT NULL DEFAULT now()`. Index
    `(org_id, created_at DESC)`. Append-only.
*   System writes use a null actor plus a note, for example `note = 'launch-backfill'`.
*   Security (house pattern from `20261025100000_crm_doors.sql`): `ENABLE` and `FORCE ROW LEVEL SECURITY` on
    both tables. `org_plans` gets one `org_plans_org_guc` policy `FOR SELECT USING (org_id::text =
    current_setting('app.current_org_id', true))` and `GRANT SELECT` to `app_ledger`; no INSERT, UPDATE or
    DELETE grant to any app role. `org_plan_events` gets no policy and no grant (service connection only).
    Supabase default privileges grant ALL on every new `public` table to `anon` and `authenticated`
    (`supabase/qa/baseline/schema.sql:11835-11843`), so the migration runs an explicit
    `REVOKE ALL ON org_plans, org_plan_events FROM anon, authenticated` (house precedent:
    `20260723010000_brain_vector_outbox.sql:88-90`). Reads and writes in this design run on
    `getCoreDb()` (the owner connection) behind the admin checks. This is deliberately unlike `app_modules`,
    whose grants let any org write its own rows.

No column is added to `organizations` (it predates `supabase/migrations`; the baseline lives only in
`supabase/qa/baseline/schema.sql`). Organizations are created by hub provisioning
(`minion_hub/src/server/services/organization-provision.service.ts`, reached from
`/api/organizations/provision`), by site sign-up and by hand. Provisioning writes no plan row, because a missing
row already means Base. The 2026-10-28 module-packages proposal
(`proposals/2026-10-28-hub-org-module-packages-tenancy-nav-home`) is a sibling: a future install package could
set a plan, but nothing in it is needed now.

### Catalog and rules (`minion_hub/src/server/entitlements/`)

*   `PLANS` — `base`, `premium` (label, description). A new plan such as `premium-lite` is a PR adding an entry
    and its `PLAN_DEFAULTS` row.
*   `FEATURES` — ordered entries `ai`, `ai.chat`, `ai.proactive`, `marketplace`. Each has a label, a
    description and an optional `rule(ctx) → boolean`, with `ctx = { plan, kind, has(featureKey) }` and helpers
    `all / any / not / plan(...) / kind(...) / has(...)`. No feature has a rule at launch.
*   `PLAN_DEFAULTS` — `premium: ['ai', 'marketplace']`, `base: []`. This is the reviewed, typed mapping table.
*   Evaluation for `(snapshot, feature)`, walking `FEATURES` in order:
    1.  A top-level key is granted when `PLAN_DEFAULTS[plan]` lists it; otherwise `not_in_plan`.
    2.  A child key (`ai.chat`) is granted only when its parent is granted. Listing a child without its parent
        grants nothing. Inheritance only removes.
    3.  If granted and the key has a `rule`, evaluate it; false → `rule_false`. `has()` inside a rule reads only
        keys earlier in `FEATURES` order, so rules cannot loop.
    4.  Unknown feature key → `not_in_plan` and a logged warning.
*   `isEntitled` is pure (no I/O). `expandFeatures(snapshot)` returns every key whose result is allowed, for
    example Premium → `['ai', 'ai.chat', 'ai.proactive', 'marketplace']`. That expanded list is what the UI and
    the JWT carry, so the client check is `features.includes(key)` and the gateway check is
    `features.includes('ai')`.

### Resolution, caching and failure policy

*   `resolveEntitlements(orgId)` loads `{plan, planSource, kind}` through `cached(keys.hub('entitlements',
    {t: orgId}), {ttl: '5m', swr: '1m', tags: tags.tenantDomain(orgId, 'entitlements')})` from
    `@minion-stack/cache`, and returns `{plan, planSource, features, enforced}`. `setOrgPlan` invalidates the
    **target** org's tag, not the caller's `ctx.tenantId`. Cross-instance freshness depends on
    `CACHE_BACKEND` (G9).
*   **Flag off** (`ENTITLEMENTS_ENFORCED` unset or not `true`): `features` is the full catalog for every org,
    on every surface. The pure evaluator still runs, and `requireFeature` writes a server log line
    `entitlement.would_deny` for what it would refuse. No PostHog event.
*   **Flag on, lookup succeeds:** `features` is the expanded result for the org's plan.
*   **Flag on, lookup fails** (any DB or cache error, including Postgres `42P01` for missing tables):
    *   UI and route guard: render as entitled (full catalog) and log `lookup_error`. A paying org is never
        demoted by an outage, and the server gates below still hold.
    *   Request gates (`requireFeature`, the chokepoint, the token endpoint's refusal): the request fails
        closed, except the two issuers below.
    *   `/api/gateway/jwt`: issues the JWT without entitlement claims and logs `lookup_error`. That connection is
        then not enforced on the gateway (fail-open for the dashboard gateway); hub AI stays gated by the hub.
    *   `POST /api/servers/[id]/token`: on a lookup error it uses the last cached answer when one exists;
        otherwise it allows (returns the token as today) and logs `lookup_error`. This is a stated exception to
        G1's "a failed lookup never grants", accepted in R5, and it is wider than the JWT case: the token is an
        org-less `operator.admin` credential.
    *   Ticks and jobs: skip that org, log `lookup_error`, count it.
*   Logging: every denial and every `lookup_error` logs `{feature, orgId, plan, reason, surface}`. PostHog
    `entitlement_denied` is sent for request denials only (`requireFeature`, chokepoint denials inside an
    authenticated request, the token endpoint). Tick and job skips are counted in the tick response and logs,
    not sent as events.

### Enforcement points

| Feature | Surface | Gate |
|---|---|---|
| `ai` | every AI hub route (list in S2) | `requireFeature(locals, 'ai')` as the first line, before any work or stream starts |
| `ai` | backstop for every hub model call: `usageMiddleware` (`minion_hub/src/server/llm.ts`), `src/server/services/embeddings.ts`, `src/server/services/assistant-router.service.ts`, `/api/voice/tts` | org from the AI usage scope; not entitled → throw `EntitlementError`. Authenticated request with no org in scope → denied. No request and no org (scripts, platform jobs) → not enforced, logged |
| `ai` | the shared gateway token (`POST /api/servers/[id]/token`) | org without `ai` → 403 `premium_required`; the browser then connects with its JWT only |
| `ai` | every gateway method, at `authorizeGatewayMethod` (`minion/src/gateway/server-core/server-methods.ts:205`), right after the `!client?.connect` return and before the admin-scope bypass at `:233` | `client.features` defined and lacking `ai` → only `BASE_PLAN_GATEWAY_METHODS` pass; anything else → `FORBIDDEN` with `details {reason: 'premium_required', feature: 'ai'}` |
| `ai` | gateway channel auto-replies (`minion/src/auto-reply/reply/dispatch-from-config.ts`) | per-account `aiEnabled` from the mirror, read synchronously; `false` → no agent run, log `skipped_by_entitlement` |
| `ai` | flows runner (`langgraph-server/src/flow/compile-flow.ts`) | per-flow `aiEnabled` from the hub (or from the client's `features` for a manual test run); `false` → each AI node ends its branch, and the run returns an empty reply |
| `ai.chat` | `/api/assistant/route` | `requireFeature(locals, 'ai.chat')` first |
| `ai.proactive` | `/api/pulse/tick`, `/api/scheduling/reminders/tick` (personalization and confirmation inference only), `/api/brains/reconcile/tick`, `/api/crm/conversations/analyze/tick`, `/api/crm/conversations/vectorize/tick`, `/api/crm/relationship/tick`, AI job types in `bg-runtime` `advanceJob`, `/api/gateway/pulse/proposals` | per org: not entitled → skip, count `skipped_by_entitlement` |
| `marketplace` | `/api/marketplace/{agents, agents/[id], install, generate-agent}` | `requireFeature(locals, 'marketplace')` first. `sync` (platform-admin) and `sync/tick` (cron) are platform catalog operations and stay ungated |

`requireFeature(locals, feature)` throws SvelteKit `error(403, {code: 'premium_required', feature, message})`
(`App.Error` gains `feature?: string`). With the flag on and no `locals.tenantCtx` it throws 401, because it
cannot know the org; with the flag off it only logs, so flag-off behavior stays as today (G8).
`requireOrgFeature(orgId, feature)` is the same check for routes that resolve their org another way (the
gateway agent-callback routes). Order on a request: module/kind availability (404) → entitlement (403 premium)
→ RBAC capability (403 "your role can't").

`hooks.server.ts` `handleError` is not changed and only logs. SvelteKit cannot change an unexpected error's
status there, so the 403 comes from the up-front `requireFeature`. If a route reaches the chokepoint anyway, the
`EntitlementError` lands in that route's existing catch, which logs and returns its usual error; that is
acceptable because the UI never offers the action.

### The hub chokepoint knows the org

*   `appHandle` in `minion_hub/src/hooks.server.ts`, right after `resolveIdentity` assigns `locals`, calls
    `setAiUsageOrg(locals.tenantCtx.tenantId)` when a tenant resolved, and marks the scope `authenticated: true`
    when `locals.user` resolved. `AiUsageScope` gains that `authenticated` field, and `withAiUsageOrg` and
    `withAiUsageFeature` (`ai-usage.ts:47-61`) copy it into the child scopes they build. This covers routes that never
    call `getTenantCtx` (the notes routes, `structured-stream`, `flows/[id]/copilot`, `builder/ai/*`,
    `marketplace/generate-agent`) and gateway-bearer routes that set `locals.tenantCtx`.
*   With the flag on, the chokepoint denies a model call when the scope is `authenticated` and has no org.
*   The Pulse tick and the AI job handlers run their work inside `withAiUsageOrg(job.tenantId, ...)`, through
    the single `handler.advance` call in `bg-runtime.ts` `advanceAdmittedJob` (around `:383`), which both
    `advanceJob` and `runSelectedTick` reach.
*   A CI test (`src/server/entitlements/ai-call-inventory.test.ts`) scans `src/**` (including `src/lib/state/**`;
    test files excluded; `scripts/**` excluded by rule) for every file that calls `getOpenRouterModel`, fetches
    `openrouter.ai` or ElevenLabs, or calls an AI gateway method through `gatewayCall`, `gatewayCallToInstance` or
    the browser `sendRequest` (`media.transcribe`, `playground.complete`, `agents.create`, `agents.delete`). It
    fails when a file is not in the checked-in table `AI_CALL_SITES` (file → how it is covered: `route-gate`,
    `service-gate` (the service checks the feature itself), `tick`, `job:<type>`, `browser-gateway` (a browser
    call the gateway allowlist refuses for Base sessions), `backstop-only` with a one-line reason, or
    `platform`), when a listed route file lacks `requireFeature(` or
    `requireOrgFeature(`, or when a table row no longer matches a file. A new AI call site therefore fails CI
    until someone decides its gate.

### Gateway access for Base orgs

The gateway is also the channel transport, and Base orgs keep it for:

*   inbound WhatsApp / channel messages (the gateway posts them to the hub ingest; `messages.service.ts`),
*   staff replies from the CRM inbox (`crm-send.service.ts` → `channels.send`),
*   plain booking reminders and notifications (`reminders.service.ts`, `notif.service.ts` → `channels.send`),
*   door follow-ups (`doors-followup.service.ts`),
*   pairing, configuring and checking channel accounts from the dashboard,
*   non-AI flows, and the cloud workstation (`shells.*`).

So the gate is an **allowlist, not a blocklist**. The rule: AI execution is denied; reads and non-AI
configuration are allowed. `BASE_PLAN_GATEWAY_METHODS` (defined once, in
`minion/src/gateway/server-core/server-methods.ts`) is:

| Group | Methods |
|---|---|
| Handshake and session | `connect` and `connect.challenge` run before `authorizeGatewayMethod` and need no entry; `health`, `status`, `whoami`, `system-presence`, `last-heartbeat`, `auth.refresh` |
| Channels | every `channels.*` method (including `channels.send`, `channels.status`, `channels.logout`, `channels.directory.list`, `channels.plugins.list`, `channels.whatsapp.pair` (the hub's WhatsApp QR pairing), `channels.discord.validateToken`, `channels.telegram.validateToken`) and every `web.login.*` method |
| Configuration | every `config.*` method. Channel setup writes config, and agents configured there cannot run, because every agent, chat and cron-write method is refused |
| Workstation | every `shells.*` method except `shells.invoke` and `shells.invoke_durable`, which send a prompt to the workstation's agent harness (default `hermes acp`, `minion/src/shells/manager.ts:1551`) and are AI |
| Personal inbox | `myAgent.feedToday`, `myAgent.emailBody` (`myAgent.emailSummary` and `myAgent.emailDraftReply` are AI and stay out) |
| Dashboard bootstrap reads | `agents.list`, `sessions.list`, `cron.list` (polled by `minion_hub/src/lib/services/gateway/session-bootstrap.ts`) |
| Flows | every `flows.*` method, including `flows.trigger.register`, `flows.run` and `flows.relay.open` (AI nodes are handled by the runner; relay suggestions are switched off for Base callers, see Flows) |

Notes on the list: there is no separate `presence` method on gateway `DEV`; `system-presence` is the one the
dashboard calls. `server-core/server-methods-list.ts` `BASE_METHODS` lacks the handler-only names (`myAgent.*`,
`web.login.*`, `channels.send`, `channels.directory.list`, `channels.*.validateToken`, `flows.*`, `shells.*`), so
the list is written by hand and pinned by a test, not copied from that file. Every other method is refused,
including agents writes, chat, tools, prompts, skills, models, memory, cron writes and any method added later.

The plan gate runs before the admin-scope bypass, so a platform admin whose active org is Base is restricted
too; that is intended (the gate follows the org, not the person). The plan gate never grants. The existing
scope checks still run after it. A JWT connection's scopes come from
its JWT role (`message-handler.ts` around line 929), with or without the shared token: `profiles.role = 'admin'`
gives `operator.admin`, and `'user'` gives `operator.read` + `operator.write`. Methods outside the read/write
sets (all `config.*` writes, `config.schema`, `web.login.*`, `channels.send`, `channels.logout`,
`channels.whatsapp.pair`, `channels.*.validateToken`, `flows.*`, `shells.*` except `shells.get_outcome`) need
`operator.admin`, so for a non-admin member they stay refused exactly as they are today whenever
`PUBLIC_GATEWAY_JWT_AUTH` is on. This spec does not change who may configure channels from the dashboard.

Hub server-to-gateway calls (`gatewayCall`, shared token) carry no `features` claim, so the hub's own channel
sends are never blocked; the hub gates its AI gateway calls (`media.transcribe`, `playground.complete`) itself.

### Gateway connections without the shared token (review decision 4)

*   With the flag on, `POST /api/servers/[id]/token` returns 403 `premium_required` for an org without `ai`, so
    a Base-org browser never holds the shared operator token. That also covers the gateway HTTP surfaces that
    accept the token (`/v1/*` in `openai-http.ts` and `openresponses-http.ts`, `acp-messages-http.ts`,
    `tools-invoke-http.ts`, and the `/mcp` default admin identity).
*   `minion_hub/src/lib/services/gateway.svelte.ts`: when the token request answers 403 `premium_required`, the
    session is JWT-only: the connect frame sends `jwt` and no `auth.token`, and the 60-second shared-token
    fallback (`JWT_RETRY_COOLDOWN_MS`) is disabled for it. If the JWT fetch or validation fails, the gateway is
    unavailable for that session and channel pages show their normal "gateway unreachable" state.
*   Gateway verification (2026-10-29, `minion/` `origin/DEV`): **the gateway does not accept a JWT-only connect
    today.** `resolveJwtAuth` (`ws-jwt-auth.ts`, Case 1) would accept a JWT alone, but
    `ws-connection/message-handler.ts` only reaches it after shared-credential auth: a client with no token and
    no device is rejected with "device identity required" (`:515-533`, `canSkipDevice = sharedAuthOk`), and a
    failed shared auth is rejected at `:709` before the JWT block at `:908`. S4 adds the JWT-only path.
*   Premium orgs keep today's behavior (token plus JWT, with the fallback).
*   Gateway plugin UIs fetch the shared token in the browser (`fetchHostToken`) and cannot work for a Base org:
    `PluginControlCenter.svelte` (used by `/plugins/[id]` and `/channels/[id]`, per
    `src/lib/server/plugin-control-center.ts`), `/settings/plugins`, and `PluginSlotHost.svelte` iframe entries on
    `/account/connections` (`ChannelLinking.svelte:298-300`). They are hidden for Base orgs for that transport
    reason, not because they are AI (UI section; R8).
*   Channel setup stays available to Base orgs without those pages (verified 2026-10-29). The native setup at
    `/settings?s=comms` (`ChannelsTab.svelte` → `ChannelSetupWizard.svelte`, `ChannelCard.svelte`,
    `WhatsAppQrPairing.svelte`) uses only hub HTTP (`/api/servers/[id]/channels`, no token) and dashboard
    WebSocket methods (`channels.whatsapp.pair`, `channels.telegram.validateToken`,
    `channels.discord.validateToken`, `config.patch`), all in the allowlist. It covers WhatsApp, Telegram and
    Discord, the three channel types the mirror gates. For Base orgs the `/channels` cards and `ChannelsNav`
    links point there instead of `/channels/[id]`. The scope rule above still applies: on a JWT connection these
    methods need `operator.admin` (R10).

### Channel AI is configuration, not a live check (owner, 2026-10-29)

For WhatsApp and other channels, AI is "simply disabled" for a Base org. The gateway never asks the hub per
message. The hub already serves each gateway its channel accounts (`/api/internal/channels/resolved`, pulled
into the gateway's channel mirror on start and every 5 minutes). Each account gets one more field, `aiEnabled`,
computed from the owning org's `ai` entitlement (always `true` while the flag is off). The dispatch path reads
it synchronously from the mirror (`getMirrorEntry`).

*   No push: a plan change reaches channel replies on the existing 5-minute mirror tick only. `setOrgPlan`
    deliberately does not call `signalChannelChange`, because that path restarts channel runtimes (see
    Alternatives).
*   Owning org: the account's `tenantId`. An account with no `tenantId` gets `aiEnabled: true` (not enforced,
    logged). User-scoped accounts (`ownerProfileId`) are decided by their `tenantId` too.
*   Hub outage: an empty hydrate keeps the last good copy (`channel-mirror.ts:156-165`), so an outage does not
    change which accounts get replies. A partial non-empty hydrate replaces the mirror (existing behavior).
*   Coverage: the mirror holds only `whatsapp`, `telegram` and `discord` accounts (`HYDRATABLE_TYPES`,
    `channel-hydrate.ts:29`, `channel-publish.service.ts:103`). Every other channel type is a permanent mirror
    miss and is not enforced. If `gateway.hubMetrics` is unset the mirror is empty and nothing is enforced.
    Both are listed in Risks.
*   Why not the existing `replies: 'none'` switch: see Alternatives.

### Flows (owner rule 2026-10-29: non-AI automation is Base)

*   The flow editor (`/flow-editor`, except `/flow-editor/skills`, which edits agent skills), flow triggers and
    `flows.*` gateway methods stay open for Base orgs.
*   AI node types: `agent`, `llm`, `structured`, `toolAgent`, `memory` (agent memory recall), and `router` when
    its `mode` is `llm` or `hybrid`. They are defined in `langgraph-server/src/flow/types.ts:249` and offered in
    the hub palette in `minion_hub/src/lib/components/flow-editor/FlowSidebar.svelte` (`CATEGORIES`).
*   `pluginAction` nodes call a plugin's gateway method, so they are AI only when that method is. On gateway
    `DEV` the plugins that contribute flow nodes are alert-watcher, flow-example, meta-graph and whatsapp
    (`extensions/*/minion.plugin.json` `flowNodes`). Two action methods call a model and are AI:
    `alertWatcher.classify` ("LLM-classify a message") and `alertWatcher.suggest` (owner reply suggestions).
    `alertWatcher.gate`, `alertWatcher.sendAlert` and `flowExample.echo` are not AI; the others are triggers.
    The manifests carry no AI flag, so the runner and the palette share one named list,
    `AI_PLUGIN_ACTION_METHODS`, with a `TODO(handoff)` to move it into the manifest when a third AI action appears.
*   `handoff` nodes open a human relay (`flows.relay.open`), which is not AI, but the relay then generates reply
    suggestions with a model (`extensions/flows/src/relay/index.ts:414-416` → `relay/suggestions.ts`). For an
    org without `ai` the relay opens with no suggestions: the runner sends `suggestionCount: 0`, the relay
    skips `generateSuggestions` when the count is 0, and a `flows.relay.open` call from a WebSocket client whose
    `features` lack `ai` is forced to 0.
*   Editor: for an org without `ai`, the palette does not list the AI types or the two AI plugin actions, the
    router offers only `rule` mode, the handoff node hides its suggestion settings, and `FlowCopilotPanel.svelte`
    is not rendered.
*   Run time: flows have an org source. Each flow row has `flows.tenant_id`, and the runner loads every flow from
    the hub (`GET /api/internal/flows/[id]`, `langgraph-server/src/flow/server.ts:64-77`) for trigger, schedule
    and subflow runs. That endpoint adds `aiEnabled` from the flow's `tenant_id` entitlement (`true` while the
    flag is off; `true` and logged when `tenant_id` is null). Manual test runs (`flows.run`, inline nodes, no
    flow id) get `aiEnabled` from the calling client's `features` in `minion/src/gateway/server-methods/flows-run.ts`.
    When `aiEnabled` is absent the runner treats it as `true`. That default is safe only because the runner binds
    `127.0.0.1` by default (`langgraph-server/src/flow/server.ts`) and is reached only by the co-located gateway;
    exposing it would need this default revisited.
*   With `aiEnabled: false`, an AI node **ends its branch**: it produces no message, its outgoing edges are not
    followed, and `compile-flow.ts` logs `skipped_by_entitlement {flowId, nodeId, nodeType}`. A router in `llm`
    mode selects no branch; in `hybrid` mode it uses only its rule fast-path. Branches that do not pass through
    an AI node still run. A skipped node never forwards its input, so a customer's message or internal data is
    never sent on unprocessed.
*   No reply is delivered from a cut branch. `/flows/run-triggered` returns `{reply: ''}` when the last message
    in the run state was not produced by a node (for example, only the trigger's inbound text is there), and the
    gateway's existing `reply &&` guard (`minion/src/flows/trigger-manager.ts:297`) then sends nothing, even with
    `deliverResponse` on.
*   Agents, autonomous agents, the agent builder, the workshop and sessions remain AI and are hidden.

### The message ledger is not an AI feature (owner, 2026-10-29)

The gateway's message ledger (`minion/src/infra/message-ledger.ts`, switched by `gateway.messageLedger.enabled` /
`MINION_MESSAGE_LEDGER`) and the hub's message ingest record every inbound and outbound message. They are
outside the entitlement system and keep their own configuration. Base orgs keep a full message history. The
ledger records on arrival, before agent dispatch: WhatsApp in `minion/src/web/inbound/monitor.ts:171`, other
channels through `fireMessageInbound` (`src/channels/fire-message-inbound.ts:27`). The reply gate cannot reach
it, and a WhatsApp test pins that.

The Gmail auto-labeler (`minion/src/hooks/gmail-auto-label.ts`) is AI, and the email-ledger rows it writes hold
its AI summary and labels. An operator sets it up per mailbox in gateway config, so no Base org can switch it on
by itself; it is left out of the automatic gate and recorded as a `TODO(handoff)`.

### Gateway JWT claims (decision A)

*   Hub `issueGatewayJwt` (`minion_hub/src/server/services/gateway-jwt.service.ts`) adds `plan: string` and
    `features: string[]` (the expanded list) **only when called from `/api/gateway/jwt` with the flag on**.
    With the flag off the claims are omitted, which the gateway treats as not enforced, the same effect as every
    feature granted. `mintOrgGatewayJwt` in `organization-provision.service.ts` omits the claims always: the
    hub server decides for itself, and provisioning (`shells.provision`, `shells.list`, `shells.access`) must
    work for new Base orgs. Names avoid the gateway's existing `planTier`.
*   Gateway `extractUserClaims` (`minion/src/gateway/auth/auth-jwt.ts:88`) parses both. A present but malformed
    `features` claim is treated as `[]` (enforced as Base, fail-closed); a malformed `plan` is ignored. An absent
    `features` claim means not enforced.
*   The claims travel with `orgId` onto every client the JWT builds: the WebSocket client
    (`message-handler.ts`, the `nextClient` built around line 1101), `auth.refresh`
    (`server-methods/auth-refresh.ts`, which assigns `features` unconditionally so a refresh without claims
    clears them), and the `/mcp` JWT identity (`server.impl.ts` `buildMcpClient` around 1643-1655 and the JWT
    identity resolver around 1695-1707, type `McpClientIdentity` in `src/gateway/mcp/registry.ts:33`).
*   Impersonation (`server-methods/types.ts` `_originalIdentity`) does not swap `features`: the connection's own
    features stay in force, so impersonation never widens what an org may use.
*   Staleness: the hub fetches a fresh JWT on every WebSocket handshake (`gateway.svelte.ts` `onChallenge`, around
    line 423, "auto-reconnect handshakes fetch fresh"). The hub never calls `auth.refresh`, and the gateway checks
    `exp` only at the handshake. The bound is therefore the next reconnect.
*   Protocol: the error uses the existing `FORBIDDEN` code with `details.reason = 'premium_required'`; no new
    `ErrorCodes` entry, so older clients still render a forbidden error.

### UI (does not render disabled AI)

*   **Where the entitlements come from.** `applyModuleAvailabilityGuard` in `minion_hub/src/hooks.server.ts`
    (`:367-395`) resolves the UI entitlements once per request (flag and outage rules above), stores them in
    `locals.entitlements`, and passes `features` into the guard context. The `(app)` layout returns
    `entitlements: {plan, features}` from `locals.entitlements` without a second lookup.
*   **Whole pages** reuse the module guard. `MODULE_MANIFEST` (`src/lib/modules/availability.ts`) gains an
    optional `feature` per entry; `ModuleAvailabilityContext` gains `features`; `isModuleAvailable` returns
    false when the entry's feature is missing; `isAppRouteBlocked` (`route-guard.ts`) then 404s it like a
    disabled module.
*   **Navigation.** `canViewPath` (`src/lib/access/can.svelte.ts`) returns false when the path's manifest entry
    has a `feature` that is not in `page.data.entitlements.features`. The sidebar (`Sidebar.svelte:361`), the
    utility row (`utilityLinks`), GNav hotkeys and the command palette all filter through `canViewPath`, so the
    static agent items and the dynamic plugin items in `sections.ts` are covered with no change to that file.
*   **AI page prefixes** (feature in brackets):
    *   `[ai]` `/agents` (copilots, AI brains archetype, `/agents/autonomous`, `/agents/workshop`,
        `/agents/builder`), `/builder`, `/workshop`, `/sessions`, `/brains`, `/prompt`, `/capabilities`,
        `/tools`, `/flow-editor/skills`, `/workforce` (set `feature` on the existing `workforce` entry;
        Paperclip AI agent companies), `/reliability` (it reports agent and LLM run reliability, usage and cost,
        which a Base org does not have);
    *   `[ai.proactive]` `/pulse`, `/settings/pulse` (existing `pulse` entry);
    *   `[marketplace]` `/marketplace`.
*   **Hidden for the shared-token reason, not because they are AI** (R8): `/plugins` and `/settings/plugins`
    (manifest entries keyed `ai`, because `ai` is exactly "this session holds the shared token"; a comment in
    `availability.ts` points at R8 so the key comes off when plugin UIs get a JWT path); `/channels/[id]`
    (404 from its `+page.server.ts`, because `/channels` and `/channels/gmail` stay visible and a manifest prefix
    cannot select only the `[id]` pages); and the `PluginSlotHost` iframe entries on `/account/connections`
    (not rendered; the `qr` and `form` link modes stay).
*   **Pages that stay visible**, with the reason: `/account`, `/changelog`, `/notifications`, `/overview`,
    `/home` (My Agent; inline AI gated), `/team`, `/users`, `/settings` (except the two above; its `ai` and
    `agents` gateway-config tabs are not rendered for orgs without `ai` and the default tab becomes `comms`) — org
    and account administration; `/crm`, `/finances`, `/pos`, `/stock`, `/sales`, `/memberships`, `/support`,
    `/scheduling`, `/socials` (and the `/ads` redirect), `/work`, `/sandbox` — non-AI modules; `/channels` and
    `/channels/gmail` — channel transport (for orgs without `ai` the cards and `ChannelsNav` link to
    `/settings?s=comms`); `/flow-editor` — non-AI automation (AI nodes gated); `/cloud` (including
    `/cloud/terminal`, which uses `shells.access` over the dashboard WebSocket), `/shells` — the cloud
    workstation; `/terminal` — a redirect to `/cloud/terminal` (`terminal/+page.server.ts`), no change;
    `/orgs`, `/config`, `/killswitches` — platform-admin super views, not org features.
*   **Controls inside visible pages** check `hasFeature(key)` (new, beside `canViewPath`), which is
    `page.data.entitlements.features.includes(key)` with no evaluator copy. They are not rendered when it is
    false, and their client code does not call the endpoint.
*   **Stale tabs.** Only a control that was already rendered before a downgrade can still call a gated endpoint;
    every other path is unreachable because the control is not rendered. So `premium_required` is handled at the
    call sites in the S3 inline-control list only (each drops it silently as "no result", like the email
    summary's existing best-effort path, with no toast). The generic `src/lib/api/fetch-json.ts` is not changed.

### Admin page (platform-admin surface)

*   Route `(app)/orgs/plans`, next to the existing `/orgs` ("All Orgs") page. It reuses the existing `orgs.all`
    capability (a `SUPER_VIEWS` key, platform admins only); no new capability. It is registered in
    `route-access-registry.ts` as `'/orgs/plans': 'capability:orgs.all'`, so `can()` and `canViewPath` decide
    visibility. The server load and action check `can('orgs.all', locals.user)` like `/orgs`, and `setOrgPlan`
    itself calls `requireAdmin`.
*   Lists every org (`listAllOrganizationsWithMemberCounts`) with plan, plan source, kind and member count; a plan
    select per org; an effective-features panel (feature, allowed, reason) computed with the pure evaluator,
    so it shows what the plan grants even while the flag is off; and the `org_plan_events` list.
*   Entry points: the sidebar utility row (`utilityLinks()` gains `/orgs/plans`, filtered by `canViewPath` like
    `/killswitches`), a link on `/orgs`, and a link on `/settings/organizations` (the utility row is hidden in
    module mode). No plan badge on `/settings/organizations`; plan state lives on `/orgs/plans`.

### Rollout

*   `ENTITLEMENTS_ENFORCED` (hub server env, default off) is the only switch. With it off, every surface behaves
    as today (G8), even with the gateway and runner changes deployed and with plan rows present.
*   The gateway and runner act only on what the hub sends (`features` claims, `aiEnabled: false`), and the hub
    sends those only while the flag is on. The flag is turned on only after the backfill.
*   Preconditions before turning the flag on: Q4 (`PUBLIC_GATEWAY_JWT_AUTH=true`, `oidcIssuers` and
    `hubMetrics` on every gateway), and the gateway release with the JWT-only connect path deployed.
*   Rollback: unset the flag and redeploy the hub. New JWTs carry no claims; sockets that call `auth.refresh`
    clear their features; other sockets keep them until they reconnect. Tables can stay.
*   The step-by-step sequence is the Launch order at the end of Detailed Implementation.

## Risks & Mitigations

Severity: High = AI spend or data exposure for a Base org, or a regression for paying orgs; Medium = a partial
gate or a degraded Base experience; Low = noise or an edge case. "Accepted" means not fixed in this spec.

| # | Risk | Sev. | Mitigation or status | Pointer |
|---|---|---|---|---|
| R1 | Gateway background AI is not gated: cron agent runs (`server-core/server-cron.ts`, `platform/cron/isolated-agent/run.ts`), heartbeats (`infra/heartbeat-runner.ts:1088` calls `getReplyFromConfig` directly; `web/auto-reply/heartbeat-runner.ts:162`), webhook agent runs (`gateway/server/hooks.ts`), gateway Pulse generation, and the alert-watcher plugin. Crons and agents created while Premium keep running after a downgrade. A Base admin can also write heartbeat or cron config through `config.*` | High | Accepted until spec 042 S1 binds agents to orgs. Base orgs cannot create new ones through cron and agent write methods, and the pages are hidden. The hub still refuses `/api/gateway/pulse/proposals` | `TODO(handoff)` in `server-cron.ts`, `heartbeat-runner.ts`, `hooks.ts`; proposal item |
| R2 | Channel types outside the mirror (Slack, Signal, iMessage, LINE, WATI, meta-graph, every extension channel) are never gated | High | Accepted. Only whatsapp, telegram and discord are hydrated | `TODO(handoff)` in `channel-hydrate.ts`; proposal item |
| R3 | `gateway.hubMetrics` unset leaves the mirror empty, so no channel reply is gated | High | Launch precondition Q4 | proposal item |
| R4 | Dashboard gateway staleness: an open socket keeps its old `features` until it reconnects | Medium | Accepted; G9 states the bound and acceptance reloads the page. A periodic `auth.refresh` is a follow-up | proposal item |
| R5 | G1's two named exceptions. JWT issuer lookup error → no claims → that dashboard session is not enforced on the gateway. Token endpoint lookup error with no cached answer → the browser gets the shared token, which is wider: an org-less `operator.admin` credential | Medium | Accepted (review decision 16; round 2). The token endpoint uses the last cached answer first; hub AI stays gated by the hub; `lookup_error` is logged | — |
| R6 | Any member of any org can read the shared gateway token today; Premium orgs still receive it | High (pre-existing) | Not fixed here; Base orgs stop receiving it | `TODO(handoff)` in `api/servers/[id]/token/+server.ts`; proposal item |
| R7 | New gateway path: a valid hub JWT alone now opens a connection | Medium | Only when `oidcIssuers` is configured AND the JWT's `aud` is in `multiTenant.jwtOnlyAudiences` (spec 045 decision 18; empty list = disabled, so a JWT minted for another gateway is refused); JWKS verification, revocation check and role-derived scopes still apply; covered by tests in S4 | — |
| R8 | Gateway plugin UIs need the shared token in the browser (`/plugins/[id]`, `/channels/[id]`, `/settings/plugins`, iframe slots on `/account/connections`), so they cannot work for Base orgs; any plugin-only setting is out of reach for them | Medium | Hidden for Base orgs; channel setup for WhatsApp, Telegram and Discord moves to `/settings?s=comms`, which needs no token. Giving plugin UIs a JWT path is a follow-up | `TODO(handoff)` in `hosts.svelte.ts` and `availability.ts`; proposal item |
| R9 | A page left visible to Base orgs calls a gateway method outside the allowlist and shows an error | Medium | The allowlist test in S4; the acceptance walk opens every visible nav item as the Base test org | — |
| R10 | Channel setup from the dashboard needs `operator.admin` for JWT sessions; non-admin members of any org cannot run it when `PUBLIC_GATEWAY_JWT_AUTH` is on | Medium (pre-existing) | Not changed here; platform admins configure channels as today | proposal item |
| R11 | Embeddings (decision E): Base orgs get no new embeddings, so brain search and CRM similarity cover only data indexed before a downgrade. After an upgrade the tick-driven re-scans (vectorize, reconcile) catch up, but one-off AI jobs that were skipped while Base (a specific `brain_ingest` or corpus job) were closed and are not redone; the user re-runs them | Low | Accepted | — |
| R20 | AI plugin flow actions are recognised by a named method list (`AI_PLUGIN_ACTION_METHODS`), not a manifest flag; a new AI plugin action is missed until added | Low | Accepted; the list is shared by runner and palette and pinned by tests | `TODO(handoff)` in `compile-flow.ts`; proposal item |
| R21 | Existing personal agents of a downgraded org stay provisioned on the gateway | Low | Their chat and channel paths are gated; the provisioner creates no new ones for orgs without `ai` | — |
| R22 | The agent-memories ingest and recall routes are authenticated by the gateway's server token, so `requireFeature` checks the gateway's owning org, not the agent's org | Low | Accepted; agent runs for Base orgs are already gated upstream | — |
| R12 | Model calls with no request and no org (scripts) are not enforced | Low | Logged; the CI inventory test forces every call site to declare its gate | — |
| R13 | Flows with a null `tenant_id` run AI nodes | Low | Logged as not enforced | `TODO(handoff)` in `api/internal/flows/[id]/+server.ts` |
| R14 | The Gmail auto-labeler is AI and not gated | Low | Operator-configured per mailbox; no Base org can enable it alone | `TODO(handoff)` in `gmail-auto-label.ts`; proposal item |
| R15 | Hub cache: with `CACHE_BACKEND=memory` on Vercel, a plan change reaches other instances only after the 5-minute TTL | Low | G9 states it; prod default is `noop` | — |
| R16 | Booking confirmations used AI inference; refusing it would leave replies `unclear` | Medium | For orgs without `ai.proactive`, `inferConfirmation` is treated as off: the confirmation prompt and the keyword parser `parseYesNo` are used | — |
| R17 | A future plan that lists `ai.chat` without `ai` would grant nothing, because inheritance only removes and the gateway and chokepoint check `ai` | Low | Stated in G2 and pinned by an evaluator test | — |
| R18 | A partial non-empty mirror hydrate replaces the mirror | Low | Existing behavior, unchanged | — |
| R19 | The dormant gateway tier system and the free-tier `planTier` stay in the codebase | Low | Decision F | `TODO(handoff)` in `capability-api.ts`; proposal item |

## Alternatives Considered

Labels: **Rejected** (not doing it), **Deferred** (a later additive step), **Replaced** (an earlier draft of
this design, superseded).

### Where the evaluation logic lives

*   **A Postgres function shared by hub and gateway.** Rejected. The gateway has no Postgres client; it reads hub
    data over HTTP. A SQL function would add a third place where rules live, next to TypeScript and RLS.
*   **A shared `@minion-stack/*` evaluator package.** Deferred. The gateway would still need the plan data over
    HTTP, so today the package only duplicates a code path. Worth doing if the gateway ever gets DB access.
*   **The gateway's own SQLite `capability_tiers` as the source of truth.** Rejected. It lives on one gateway,
    the hub cannot see it, and other gateways would disagree.

### How the gateway learns an org's plan

*   **Refuse to issue the gateway JWT to Base orgs.** Rejected. The same token powers non-AI gateway use
    (channels, flows, the workstation), so this would break things Base orgs keep.
*   **Reuse the gateway's existing `planTier` claim (decision F).** Rejected. That claim already means a
    gateway-native free-tier user; log lines carrying `planTier` would become ambiguous.

### How much of the gateway Base orgs reach

*   **Block the whole gateway for Base orgs.** Rejected after the owner asked for it: the gateway is also the
    WhatsApp transport for the inbox, staff replies, reminders, notifications and door follow-ups.
*   **Block only `chat.send`.** Replaced. It leaves agents, tools and every future AI method open.
*   **Keep "no claim → not enforced" for browser sessions (first draft's Q2 default).** Replaced. Every browser
    held the shared token, so any Base-org user could skip the gate by dropping the JWT.
*   **The gateway asks the hub per message, cached 5 minutes.** Replaced (owner, 2026-10-29: "simply
    disabled"). It made customer replies depend on a live hub call and needed its own failure policy.
*   **Project the existing `replies: 'none'` switch for Base-org accounts.** Rejected. It blocks only sending
    (`web/inbound/access-control.ts:85`, `listenOnly` in the Telegram and Discord account code), so the agent
    still runs and spends tokens, and it works only in `CHANNEL_CONFIG_SOURCE=db` mode.
*   **Push a plan change to the gateway via `signalChannelChange`.** Replaced (round 2). That path does more than
    refresh the mirror: `events-http.ts:75` → `channel-mirror-compare.ts:139-144` calls `applyChannelRestart(type)`,
    and `channel-mirror.ts:74-85` stops and starts the whole channel type when `CHANNEL_CONFIG_SOURCE=db` and
    runtime apply are on (a WhatsApp restart drops the Baileys session for every org on that gateway), once per
    account. Channel AI therefore waits for the 5-minute mirror tick. A refresh-only signal is a possible
    follow-up.
*   **Turn a skipped AI flow node into a pass-through.** Replaced (round 2). It forwarded the node's input
    unchanged, so a triggered flow with `deliverResponse` sent the customer's own message back to them, and a
    downstream channel node could send content the LLM was meant to summarise or redact.
*   **Tie the message ledger to the AI plan.** Rejected (owner): message history is not an AI feature.
*   **Gate gateway crons and heartbeats in this spec.** Deferred to spec 042, which owns the agent → org binding
    these paths need.

### How plans map to features (decision B)

*   **Plain plan → feature lists, no operators.** Rejected. Cannot express the owner's requirement that a feature
    depend on org type or combine conditions with and / or / not.
*   **A `plan_features` table of DB overrides.** Deferred. Nothing would write it at launch, and it would be a
    second answer to "does Premium include X". It can be added with an editor in the PR that first needs a
    no-deploy change.
*   **A nested `all / any / not` rule tree stored as data.** Rejected for now. The hub has no precedent for
    logic in the DB; it needs a validator, an editor and a debugger, and one bad row changes every org at once.

### How the hub reads the plan

*   **One left join to `org_plans` in `loadCanonicalMemberships`, putting `plan` in `locals`.** Deferred. It is
    cheaper per request, but ticks, jobs, the JWT issuer and the channel and flow endpoints run outside that
    loader and would still need the cached lookup.

### How hub routes return the 403

*   **Map `EntitlementError` to 403 in `handleError`.** Rejected. SvelteKit's `handleError` shapes the error body
    but cannot change an unexpected error's status, and most AI routes catch model errors themselves. Each AI
    route checks up front instead.

### What an org without a plan gets (decision C)

*   **"No plan = every feature".** Rejected. Orgs are created by provisioning, site sign-up and by hand, so every
    new org would get Premium with no review step.
*   **Write Premium onto every org in a SQL migration.** Rejected. Hub prod builds run migrations automatically,
    so a data write would reach prod without a dry run or snapshot. The owner-run backfill script replaces it.
*   **Write a Base row at org creation.** Rejected. A missing row already resolves to Base.

### How Base orgs see disabled AI (owner, 2026-10-29)

*   **Keep AI controls visible with a "Premium" tag and an upgrade message.** Rejected: the owner wants nothing
    to look blocked.
*   **Hide the whole flow editor.** Replaced (owner rule 2026-10-29): non-AI flows are Base; only AI node types
    are Premium.

### Where admins manage plans (decision D)

*   **A plan column on `/settings/organizations` only.** Rejected. The owner wants a separate admin page as the
    start of an admin module.
*   **A new `/admin` segment.** Replaced. The hub already has a platform-admin surface (`/orgs` and
    `SUPER_VIEWS`); the plans page joins it.

## Detailed Implementation

Paths are relative to each repo root: hub = `minion_hub/` (base `master`), gateway = `minion/` (base `DEV`),
meta = this repo (base `dev`, which includes `langgraph-server/`). Five slices. Each slice is one branch and one
draft PR per repo it touches. Security- and data-tagged, so the owner approves and merges every PR.

### Slice S1 — hub: schema, catalog, evaluator, platform-admin page (inert)

*   **`supabase/migrations/20261029100000_org_entitlements.sql`** (new). Creates `org_plans` and
    `org_plan_events` exactly as in the Data model, with the RLS policy, the `app_ledger` grant and the explicit
    `REVOKE ALL … FROM anon, authenticated` described there. Schema only, no data.
*   **`src/server/db/pg-schema/entitlements.ts`** (new). Drizzle definitions for both tables, imported directly
    like the other `pg-schema/*.ts` files (there is no barrel).
*   **`src/server/entitlements/catalog.ts`** (new). `PLANS`, `FEATURES` (ordered), `PLAN_DEFAULTS`, and the rule
    helpers `all` / `any` / `not` / `plan(...)` / `kind(...)` / `has(...)`.
*   **`src/server/entitlements/evaluate.ts`** (new). Pure `isEntitled(snapshot, feature) → {allowed, reason}` and
    `expandFeatures(snapshot) → string[]`, following the evaluation steps in the Technical Plan.
*   **`src/server/entitlements/evaluate.test.ts`** (new). Table tests: Base grants nothing; Premium expands to
    `['ai','ai.chat','ai.proactive','marketplace']`; a child listed without its parent is not granted; a rule on
    org kind; `has()` cannot read a later key; an unknown feature key; an unknown plan key resolves as Base.
*   **`src/server/services/entitlements.service.ts`** (new):
    *   `resolveEntitlements(orgId)` — cached as described, returns `{plan, planSource, features, enforced}`,
        applying the flag-off and outage rules;
    *   `setOrgPlan(adminLocals, orgId, planKey, note?)` — `requireAdmin`; writes `org_plans` and
        `org_plan_events` in one transaction on `getCoreDb()`; invalidates the target org's tag. It does not call
        `signalChannelChange` (channel AI follows on the 5-minute mirror tick);
    *   `listOrgPlans()`, `listPlanEvents(limit)`, `isEnforced()` (reads `ENTITLEMENTS_ENFORCED`);
    *   `requireFeature(locals, feature)` and `requireOrgFeature(orgId, feature)` — throw
        `error(403, {code:'premium_required', feature, message})` only when enforced; 401 with no tenant only
        when enforced; log `would_deny` when not enforced; send PostHog `entitlement_denied` through `captureServerEvent`
        (`src/lib/server/posthog.ts`) on a real denial.
*   **`src/server/services/entitlements.service.test.ts`** (new). Mocked-SQL unit tests: invalidation of the
    TARGET org; `setOrgPlan` triggers no channel signal or restart; audit row contents including a null actor
    with a note; flag off returns the full catalog with
    no row; flag on with a lookup error returns the full catalog to the UI path and fails `requireFeature`;
    `lookup_error` comes from the service, not the evaluator; no PostHog event on a tick skip.
*   **`src/server/services/entitlements.sql.integration.test.ts`** (new). Runs only against the local QA DB
    (`HUB_TEST_DB_URL`). Proves the RLS policy lets a member read its own `org_plans` row and denies writes and
    other orgs' rows. A mocked test cannot prove SQL (spec 041: mocked SQL hid an `unnest(${arr})` 22P02 error).
*   **`src/routes/(app)/orgs/plans/+page.server.ts`** (new). `can('orgs.all', locals.user)` in load and in the
    `setPlan` action; loads orgs with plans, effective features from the pure evaluator, and recent events.
*   **`src/routes/(app)/orgs/plans/+page.svelte`** (new). Org table with a plan select using `createOptimistic()`
    (`src/lib/utils/optimistic.ts`; owner rule: database-backed controls update optimistically with a pending
    state), the effective-features panel and the events list. Design tokens only; run `bun run lint:design`
    and `bun run lint:tokens`.
*   **`src/routes/(app)/orgs/plans/page.server.test.ts`** (new). A non-admin gets 403; an admin's change writes
    the plan and an audit row.
*   **`src/routes/(app)/orgs/+page.svelte`**, **`src/routes/(app)/settings/organizations/+page.svelte`**. A link
    to `/orgs/plans`, shown through `canViewPath`.
*   **`src/lib/components/layout/utility-links.ts`**. Add `/orgs/plans` (shield icon) with a new `m.nav_orgPlans()`
    label (utility links render `nav_*` messages); `canViewPath` decides visibility. `topbar-parity.test.ts`
    gets the new link.
*   **Route contract for `/orgs/plans`.** Update, in the same commit:
    1.  `src/lib/routes/route-access-registry.ts` — `'/orgs/plans': 'capability:orgs.all'`;
    2.  `src/lib/routes/route-design-manifest.ts` — `screen('/orgs/plans', 'Plans', 'organization', 'collection')`;
    3.  `src/lib/routes/route-design-validation.ts` — `ROUTE_CONTRACT_EXPECTATIONS.endpoints` and `.screens` +1;
    4.  `src/lib/routes/route-design-contracts.test.ts` — the migration-wave count for the wave
        `migrationWaveForRoute('/orgs/plans', 'organization')` returns (`route-design-manifest.ts:270`), +1;
    5.  `src/server/ui-audit/frontend-contract-scanner.test.ts` — `report.pages` +1;
    6.  `scripts/ui-audit-inventory.test.ts` — `summary.endpoints` and `summary.screens` +1.

    `src/lib/routes/business-route-shells.ts` and its test change only for business-module routes, and
    `/orgs/plans` is not one. Update `docs/artifacts/UI-ROUTE-CONTRACT.md`. Run the full hub suite or those
    six files explicitly; a green `src/lib/routes/` run does not cover items 5 and 6.
*   **`messages/en.json`, `messages/es.json`**. Add `nav_orgPlans` and `admin_plans_*` keys for this page only, append-only, then
    `bun run i18n:compile`.

### Slice S2 — hub: server gates (behind `ENTITLEMENTS_ENFORCED`)

*   **`src/server/ai-usage.ts`**. `AiUsageScope` gains `authenticated: boolean` (false by default);
    `withAiUsageOrg` and `withAiUsageFeature` copy it from the parent scope.
*   **`src/hooks.server.ts`** (`appHandle`). After `resolveIdentity` assigns `locals`: call
    `setAiUsageOrg(locals.tenantCtx.tenantId)` when a tenant resolved, and mark the scope `authenticated` when
    `locals.user` resolved. `handleError` is not changed.
*   **`src/server/entitlements/errors.ts`** (new). `EntitlementError {feature, reason}`.
*   **`src/server/llm.ts`** (`usageMiddleware.wrapGenerate` and `wrapStream`), **`src/server/services/embeddings.ts`**,
    **`src/server/services/assistant-router.service.ts`**. Before the provider call, when enforced: org in scope
    and `ai` not allowed → throw `EntitlementError`; scope `authenticated` with no org → throw; no scope or an
    unauthenticated scope with no org → allow and log.
*   **`src/app.d.ts`**. `App.Error` gains `feature?: string`.
*   **AI routes — `requireFeature(locals, 'ai')` as the first line of each handler:**
    *   `src/routes/api/builder/ai/{analyze-run,dry-run,suggest-chapter,suggest-prompts,suggest-skill}/+server.ts`
    *   `src/routes/api/notes/{autocomplete,polish,refine,spelling,transcribe}/+server.ts`
    *   `src/routes/api/voice/tts/+server.ts`
    *   `src/routes/api/structured-stream/+server.ts` (streaming: the check runs before the stream starts)
    *   `src/routes/api/flows/[id]/copilot/+server.ts`
    *   `src/routes/api/crm/cleanup/review/+server.ts`, `crm/contacts/[id]/funnel/analyze/+server.ts`,
        `crm/contacts/[id]/journey/analyze/+server.ts`, `crm/contacts/[id]/similar-wins/+server.ts`,
        `crm/insights/win-index/+server.ts`, `crm/insights/sentiment/+server.ts`,
        `crm/tags/[id]/evaluate/+server.ts`, `crm/doors/[id]/faq-draft/+server.ts`
    *   `src/routes/api/artifacts/generate/+server.ts`, `artifacts/[id]/regenerate/+server.ts`
    *   `src/routes/api/agent-memories/+server.ts` (POST semantic search), `agent-memories/ingest/+server.ts`,
        `agent-memories/recall/+server.ts` (these two are gateway server-token routes, so the check reads the
        gateway's owning org; accepted, R22)
    *   every handler under `src/routes/api/brains/` except `reconcile/tick`
    *   every handler under `src/routes/api/workshop/` and `src/routes/api/workforce/`
    *   `src/routes/api/builder/agents/[id]/+server.ts` (publishes builder agents through
        `builder-agent-publisher.ts`, `agents.create`)
    *   `src/routes/api/personal-agent/create/+server.ts`
*   **Gateway agent-callback routes — `requireOrgFeature(orgId, 'ai')` with the org from
    `resolveAssistantPrincipal`:** `src/routes/api/gateway/{brain-search,brain-remember,search-crm-conversations}/+server.ts`.
*   **`src/routes/api/assistant/route/+server.ts`**. `requireFeature(locals, 'ai.chat')` first.
*   **`src/routes/api/marketplace/{agents,agents/[id],install,generate-agent}/+server.ts`**.
    `requireFeature(locals, 'marketplace')` first. `agents` and `agents/[id]` are reached only from the hub
    marketplace page; with the flag on and no tenant they return 401 (with the flag off, unchanged). `sync`
    (`requireAdmin`) and `sync/tick` (cron) are unchanged.
*   **`src/server/services/personal-agent-provisioner.ts`** (`ensureActivePersonalAgent`, `:189`, called from
    `(app)/+layout.server.ts:220` on every app load). When enforced and the org lacks `ai`, it provisions nothing
    and reports no pending provisioning, so `src/lib/state/features/personal-agent.svelte.ts` never sends its
    browser `agents.create`. Existing personal agents stay (R21).
*   **`src/routes/api/servers/[id]/token/+server.ts`** (POST). After the existing org gate: when enforced and
    the resolved org lacks `ai` → 403 `premium_required`. On a lookup error it uses the last cached answer when
    one exists, otherwise returns the token and logs `lookup_error` (G1 exception, R5). Add a `TODO(handoff)`
    for R6.
*   **`src/server/services/gateway-jwt.service.ts`** and **`src/routes/api/gateway/jwt/+server.ts`**. The route
    asks the issuer to add `plan` and `features` when enforced; on a lookup error it issues without them and
    logs. `organization-provision.service.ts` `mintOrgGatewayJwt` never adds them.
*   **Ticks (`ai.proactive`, per org, before work starts; skips counted in the response):**
    *   `src/routes/api/brains/reconcile/tick`, `crm/conversations/analyze/tick`, `crm/conversations/vectorize/tick`,
        `crm/relationship/tick` — these already wrap each org in `withAiUsageOrg`; add the check inside it.
    *   `src/routes/api/scheduling/reminders/tick` and **`src/server/services/reminders.service.ts`** — for an
        org without `ai.proactive`, `personalize` and `inferConfirmation` are treated as false: the plain
        template, the confirmation prompt (`:180`) and the keyword parser `parseYesNo` (`:309`) are used.
    *   `src/routes/api/scheduling/reminders/preview/+server.ts` — forces `personalize: false` for such an org.
    *   `src/routes/api/gateway/pulse/proposals/+server.ts` — returns 403 `{code:'premium_required',
        feature:'ai.proactive'}` for such an org.
*   **`src/server/services/bg-runtime.ts`**. `JobHandler` gains an optional `feature` key. The check sits in
    `advanceAdmittedJob` (around `:383`), which both `advanceJob` and `runSelectedTick` reach; it runs
    `handler.advance` inside `withAiUsageOrg(job.tenantId, job.type, ...)`. When enforced and the handler's
    feature is not allowed for `job.tenantId`, it returns `{done: true, error: 'skipped_by_entitlement'}` without
    calling the handler. That finishes the job with status `failed` (`bg-runtime.ts:447-449`), which is intended:
    the job is not re-leased and its error names the reason. `advanceJob` keeps returning `Promise<boolean>`;
    the internal admitted-job result gains a `skipped` flag, and `runTick` and `runSelectedTick` add a
    `skippedByEntitlement` count to their result object. This covers `/api/pulse/tick` (`pulse-tick.ts` →
    `runSelectedTick`), `/api/jobs/tick` (`runTick`) and the direct `advanceJob` callers
    (`/api/workshop/groupchat/[id]/advance`, the brain corpus services). Handler features:
    *   `ai.proactive`: `pulse_digest` (`pulse-digest.worker.ts`), `pulse_dispatch` (`pulse-dispatch.worker.ts`),
        `brain_ingest` (`brains.service.ts`), `brain_corpus_conversations` and `brain_corpus_whatsapp`
        (`brain-corpus-jobs.service.ts`), `brain_corpus_business` (`brain-business-corpus-jobs.service.ts`);
    *   `ai`: `groupchat` (`groupchat.service.ts`, `playground.complete`);
    *   none: `statement_ingest` (`finance-statements.service.ts`) and every other job type.
*   **`src/server/services/channel-publish.service.ts`** (`toResolvedChannels`) and
    **`src/routes/api/internal/channels/resolved/+server.ts`**. The route resolves entitlements once per distinct
    `tenantId` and passes a `tenantId → aiEnabled` map into `toResolvedChannels`, which stays a pure mapper and
    sets `aiEnabled` on each item (`true` when not enforced or when `tenantId` is null).
*   **`src/routes/api/internal/flows/[id]/+server.ts`**. Adds `aiEnabled` to the response from the flow's
    `tenant_id` (`true` when not enforced; `true` plus a log and a `TODO(handoff)` when null).
*   **`src/server/entitlements/ai-call-inventory.test.ts`** (new) with the `AI_CALL_SITES` table, as described in
    the Technical Plan. Initial rows:
    *   `route-gate`: every route above;
    *   `service-gate`: `src/server/services/personal-agent-provisioner.ts`;
    *   `tick`: the four `withAiUsageOrg` ticks and the reminders services;
    *   `job:<type>`: the AI job services, including `groupchat.service.ts` (`playground.complete`);
    *   `browser-gateway`: `src/lib/state/features/personal-agent.svelte.ts` (`agents.create`) and
        `src/lib/state/workshop/experiments.svelte.ts` (`playground.complete`), both refused by the gateway
        allowlist for Base sessions (and the workshop page is hidden);
    *   `backstop-only`, each with the route or job that reaches it: `src/lib/server/artifacts/builder.ts`,
        `crm-*` services, `doors-faq-draft.service.ts`, `pulse-digest.reasoning.ts`, `reminder-compose.ts`,
        `embeddings.ts`, `brain-*` services, `brain-agents.service.ts` (`agents.create` / `agents.delete`, reached
        only from `api/brains/*` routes and the hidden `/brains/template` page) and `builder-agent-publisher.ts`
        (reached from `api/builder/agents/[id]`).

    `scripts/**` is excluded from the scan by rule (owner-run scripts, for example `scripts/qa/gateway-bootstrap.ts`).
*   **Tests.**
    *   Chokepoint: not enforced; enforced and denied; authenticated with no org (denied); no scope (allowed and
        logged); the `appHandle` hook sets the org for a route that never calls `getTenantCtx`.
    *   One test per gated route family that the 403 body is `{code:'premium_required', feature}`, and that
        `structured-stream` refuses before streaming.
    *   Ticks: a Base org is skipped and counted; reminders still send plain and confirm by keyword.
    *   `bg-runtime`: an AI job of a Base org ends `skipped_by_entitlement` and is not re-leased; a finance job
        is unaffected.
    *   Token endpoint: 403 for a Base org only when enforced; on a lookup error the cached answer, else the token.
    *   Personal-agent provisioner: no provisioning for an org without `ai` when enforced; unchanged when not.
    *   Marketplace catalog GETs: 401 with no tenant only when enforced.
    *   JWT: claims present only when enforced; absent from `mintOrgGatewayJwt`; absent on a lookup error.
    *   `aiEnabled` is `false` for a Base org's account and flow only when enforced; `true` for a null tenant.

### Slice S3 — hub: do not render disabled AI

*   **`src/hooks.server.ts`** (`applyModuleAvailabilityGuard`). Resolve the UI entitlements (flag-off and
    outage rules), store them in `locals.entitlements`, and pass `features` to `isAppRouteBlocked`. Add
    `entitlements` to `App.Locals` in `src/app.d.ts`.
*   **`src/routes/(app)/+layout.server.ts`**. Return `entitlements: {plan, features}` from `locals.entitlements`,
    falling back to the full catalog when the guard did not run for this request.
*   **`src/lib/modules/availability.ts`**. Optional `feature` on `ModuleAvailability`; `features` on
    `ModuleAvailabilityContext`; `isModuleAvailable` returns false when the entry's feature is not in
    `features`. Set `feature` on the existing `pulse` (`ai.proactive`) and `workforce` (`ai`) entries (a second
    entry with the same prefix would be ignored: `resolveModuleForPath` keeps the first equal-length match), and
    add entries for the other prefixes in the Technical Plan's AI page list and for `/plugins` and
    `/settings/plugins`, the last two with a comment pointing at R8.
*   **`src/routes/(app)/channels/[id]/+page.server.ts`**. 404 when `locals.entitlements.features` lacks `ai`
    (the `PluginControlCenter` page needs the shared token; R8). `/channels` and `/channels/gmail` stay.
*   **`src/routes/(app)/channels/+page.svelte`**, **`src/lib/components/channels/ChannelsNav.svelte`**. For
    orgs without `ai`, the gateway channel cards and nav items link to `/settings?s=comms` instead of
    `/channels/${pluginId}`.
*   **`src/lib/components/users/ChannelLinking.svelte`** (`/account/connections`). For orgs without `ai`, entries
    whose `link.mode` is `iframe` (`PluginSlotHost`, `:298-300`) are not rendered; `qr` and `form` entries stay.
*   **`src/routes/(app)/settings/+page.svelte`**. For orgs without `ai`, the `ai` and `agents` gateway-config
    tabs are not rendered and the default tab (`:115`) is `comms` instead of `ai`.
*   **`src/lib/modules/route-guard.ts`**. `RouteGuardContext` carries `features` through to `isModuleAvailable`.
*   **`src/lib/access/can.svelte.ts`**. `canViewPath` also returns false when the path's manifest entry has a
    `feature` missing from `page.data.entitlements.features`. New `hasFeature(key)` =
    `features.includes(key)`.
*   **`src/lib/state/features/hosts.svelte.ts`**, **`src/lib/services/gateway.svelte.ts`**. A 403
    `premium_required` from the token request marks the session JWT-only: connect with `jwt` and no
    `auth.token`, and disable the `JWT_RETRY_COOLDOWN_MS` fallback for it. Add a `TODO(handoff)` for R8 in
    `hosts.svelte.ts`.
*   **Inline AI controls on visible pages, each wrapped in `{#if hasFeature(...)}` with its fetch skipped:**
    *   `src/lib/components/layout/FloatingAssistant.svelte` (the assistant orb, mounted in
        `src/routes/(app)/+layout.svelte`), `src/lib/state/features/assistant.svelte.ts` and
        `src/lib/assistant/turn-router.ts` (`ai.chat`);
    *   `src/lib/state/features/voice-call.svelte.ts` (TTS and agent chat), used by `FloatingAssistant.svelte`
        and `src/routes/(app)/home/+page.svelte`;
    *   `src/lib/components/my-agent/EmailModal.svelte`: the summary banner, the draft-reply button and the
        `getEmailSummary` / `draftEmailReply` calls;
    *   `src/lib/components/my-agent/NoteEditor.svelte`, `src/lib/components/my-agent/tiptap-autofill.ts`,
        `src/lib/state/features/notes-autocomplete.ts`: spelling, autocomplete, polish, refine;
    *   `src/lib/components/my-agent/TranscribeButton.svelte` (used in `NotesPanel.svelte` and `ZenMode.svelte`);
    *   `src/lib/components/crm/CrmHygiene.svelte` (AI review), `src/lib/components/crm/CrmFunnel.svelte`
        (funnel analyze), `src/lib/components/crm/CrmInsightsChat.svelte`,
        `src/lib/components/crm/CrmSimilarWins.svelte`;
    *   `src/routes/(app)/crm/[contactId]/PageBody.svelte` (journey analyze), `src/routes/(app)/crm/insights/PageBody.svelte`
        (win index, sentiment scoring), `src/routes/(app)/crm/settings/PageBody.svelte` (tag evaluate);
    *   `src/lib/components/doors/faq/Editor.svelte` (FAQ draft);
    *   `src/routes/(app)/scheduling/reminders/PageBody.svelte`: the personalization and AI-confirmation toggles
        (`ai.proactive`);
    *   `src/lib/components/flow-editor/FlowSidebar.svelte` (AI node types, the two AI plugin actions from
        `AI_PLUGIN_ACTION_METHODS`, router `llm`/`hybrid` modes, the handoff node's suggestion settings) and
        `src/lib/components/flow-editor/FlowCopilotPanel.svelte`.

    Each listed control also treats a `premium_required` answer at its own call site as "no result" with no
    toast (HTTP 403 with body `code: 'premium_required'`, or a gateway `FORBIDDEN` with
    `details.reason: 'premium_required'`). That covers a tab rendered before a downgrade; no other path can reach
    a gated endpoint because its control is not rendered.

    Not in the list, because their page is hidden: `ChapterEditor.svelte` and `skill-editor.*.svelte.ts`
    (`/flow-editor/skills`), `AgentMemoryPanel.svelte` (`/agents`), the artifact modals in
    `AutonomousAgentCard.svelte` (`/agents/autonomous`), the brains components (`/brains`), the Pulse settings
    (`/settings/pulse`). `src/lib/components/marketplace/AgentCreatorWizard.svelte` has no importer on
    `origin/master` (dead code) and is left alone. The `ai-call-inventory` test from S2 keeps the server side
    from drifting; S3's PR re-runs the client grep for fetches to the gated routes and adds any new caller.
*   **`src/lib/services/my-agent-rpc.ts`**. `getEmailSummary` and `draftEmailReply` return `null` on a gateway
    `FORBIDDEN` with `details.reason: 'premium_required'` (the "no result" path the summary already uses)
    instead of throwing. The generic `src/lib/api/fetch-json.ts` is not changed.
*   **Tests.**
    *   Layout load and hook guard: flag off with no row (everything visible); flag off with a lookup error
        (everything visible); flag on with Base (AI pages 404, `features` empty); flag on with a lookup error
        (everything visible).
    *   `availability.test.ts`, `route-guard.test.ts`: every AI prefix blocked for Base, open for Premium.
    *   `canViewPath` hides a feature-gated page; `sections.test.ts` and `topbar-parity.test.ts` get a Base-org
        case so a future link cannot leak.
    *   `hasFeature` is exact membership.
    *   `EmailModal`: the summary is neither rendered nor fetched without `ai`.
    *   `my-agent-rpc.ts` returns `null` on `premium_required`.
    *   `gateway.svelte.ts`: a 403 token response leads to a JWT-only connect frame and no fallback timer.
    *   `/channels/[id]` 404s for an org without `ai`; `ChannelsNav` links to `/settings?s=comms`;
        `ChannelLinking` renders no iframe entry; `/settings` defaults to `comms` without `ai`.

### Slice S4 — gateway and flows runner: JWT-only connect, claims, method allowlist, reply and flow gates

Gateway PR (`minion/`):

*   **`src/gateway/server/ws-connection/message-handler.ts`**.
    *   JWT-only connect: when the connect frame carries `jwt`, presents no shared credential, and
        `multiTenant.oidcIssuers` is configured, validate the JWT before the shared-auth rejection (`:709`) and
        the no-device branch (`:515-533`). A valid JWT counts as the connect credential (`authOk`, method `jwt`,
        allowed to skip the device). It must not count as a failed shared-secret attempt: today a connect with
        no token is recorded as a failure in the primary `authorizeGatewayConnect` call (around `:429`, which
        passes `rateLimiter`; `auth.ts:406` `token_missing` → `recordFailure`), before the anchors above, so the
        JWT-only path must skip the rate limiter there. Otherwise Base browsers could rate-limit a clinic IP that
        Premium users share. Without `oidcIssuers`, behavior is unchanged.
    *   Copy `plan` and `features` from the JWT result onto `nextClient` (around line 1101), next to `orgId`.
*   **`src/gateway/server/ws-jwt-auth.ts`**. `JwtAuthResult` carries `plan` and `features`.
*   **`src/gateway/auth/auth-jwt.ts`**. `JwtUserClaims` gains `plan?` and `features?`; `extractUserClaims` parses
    them (malformed `features` → `[]`; malformed `plan` → ignored).
*   **`src/gateway/server/ws-types.ts`**, **`src/gateway/server-methods/types.ts`**. Client types gain
    `plan?: string` and `features?: string[]`; impersonation keeps the connection's own `features`.
*   **`src/gateway/server-methods/auth-refresh.ts`**. Assign `client.plan` and `client.features` from the new
    claims unconditionally (so `undefined` clears them).
*   **`src/gateway/mcp/registry.ts`** (`McpClientIdentity`) and **`src/gateway/server.impl.ts`** (`buildMcpClient`
    and the JWT identity resolver). Carry `plan` and `features` like `orgId`.
*   **`src/gateway/server-core/server-methods.ts`**. `BASE_PLAN_GATEWAY_METHODS` as listed in the Technical Plan
    (exact names plus the prefixes `channels.`, `web.login.`, `config.`, `shells.`, `flows.`, with
    `shells.invoke` and `shells.invoke_durable` excluded). In
    `authorizeGatewayMethod`, right after the `!client?.connect` return: if `client.features` is defined, lacks
    `ai`, and the method is not allowed by that list → `FORBIDDEN` with
    `details {reason:'premium_required', feature:'ai'}`.
*   **`src/gateway/server-methods/flows-run.ts`**. Send `aiEnabled` to the runner: `true` when
    `client.features` is undefined, otherwise `features.includes('ai')`.
*   **`src/gateway/channel-hydrate.ts`**. `HydrationItem.aiEnabled?: boolean`; `parseHydrationBody` (`:34-55`)
    copies it (absent → `true`, so an older hub changes nothing). Add a `TODO(handoff)` for R2.
*   **`src/auto-reply/reply/dispatch-from-config.ts`**. After the `message_received` hook (around `:267`) and
    before the agent runs (around `:431`), next to the existing `isChannelEnabledForAccount` skip:
    `getMirrorEntry(channelId, accountId)?.aiEnabled === false` → end without an agent run or reply and log
    `skipped_by_entitlement {channel, accountId, orgId}`. Synchronous; no network call.
*   **`extensions/flows/src/relay/index.ts`** (`flows.relay.open`, `:275`, count at `:323`). The count is 0 when
    `params.suggestionCount === 0` or when the calling `client.features` is defined and lacks `ai`; with a count
    of 0 the background `generateSuggestions` call (`:414-416`) is skipped. The relay itself still opens.
*   **`TODO(handoff)` comments only:** `src/gateway/server-core/server-cron.ts`, `src/infra/heartbeat-runner.ts`,
    `src/web/auto-reply/heartbeat-runner.ts`, `src/gateway/server/hooks.ts` (R1); `src/hooks/gmail-auto-label.ts`
    (R14); `src/gateway/capability-api.ts` (R19).
*   **Tests.**
    *   `src/gateway/server/ws-connection/jwt-only-connect.test.ts` (new, beside `service-account-auth.test.ts`):
        JWT-only connect accepted with `oidcIssuers`, rejected without them, rejected with an invalid or revoked
        JWT; scopes come from the JWT role.
    *   `src/gateway/auth/auth-jwt.test.ts`: `features` parsed; malformed → `[]`; absent → undefined.
    *   `src/gateway/server-core/server-methods.test.ts`: a Base client may call every listed method and is
        refused `chat.send`, `agents.create`, `cron.add`, `models.list`, `myAgent.emailSummary`,
        `shells.invoke`, `shells.invoke_durable` and an unknown method, including with admin scope; a client without `features` is unchanged; the plan gate never
        lets through a method the scope check refuses.
    *   `auth.refresh` clears `features` when the new token has none.
    *   `/mcp`: a Base JWT identity is refused `tools/call` for an AI tool.
    *   `src/auto-reply/reply/dispatch-from-config.test.ts`: `aiEnabled:false` → the hook fires and no agent
        runs; `true`, absent or a mirror miss → unchanged.
    *   `src/web/inbound/monitor.ledger-entitlement.test.ts` (new): a WhatsApp message to an `aiEnabled:false`
        account still writes its ledger row.
    *   `src/gateway/channel-hydrate.test.ts`: `aiEnabled` survives `parseHydrationBody`.
    *   Relay: `flows.relay.open` with `suggestionCount: 0`, or from a Base client, opens the relay and never
        calls `generateSuggestions`.

Flows runner PR (meta `langgraph-server/`):

*   **`src/flow/server.ts`**. Read `aiEnabled` from the hub flow response (absent → `true`; safe only while the
    runner binds loopback) for `/flows/run-triggered` and subflows, and from the request body for the manual
    `/flows/run`. `/flows/run-triggered` returns `{reply: ''}` when the last message in the run state was not
    produced by a node.
*   **`src/flow/compile-flow.ts`**. With `aiEnabled: false`: an AI node (the node types listed in the Technical
    Plan, a `pluginAction` whose method is in `AI_PLUGIN_ACTION_METHODS`) produces no message and its outgoing
    edges are not followed; a `router` in `llm` mode selects no branch, in `hybrid` mode only rule branches; a
    `handoff` node sends `suggestionCount: 0`. Each skip logs `skipped_by_entitlement {flowId, nodeId, nodeType}`.
    `AI_PLUGIN_ACTION_METHODS` (`alertWatcher.classify`, `alertWatcher.suggest`) lives here with a
    `TODO(handoff)` (R20); the hub palette carries the same two names.
*   **`src/flow/compile-flow.test.ts`**. With `aiEnabled:false`:
    *   `trigger → llm → channel`: no model call, the `channel` node does not run, and `run-triggered` returns
        `reply: ''`, so a trigger with `deliverResponse` sends nothing (no outbound message at all);
    *   a flow with one AI branch and one non-AI branch runs the non-AI branch only;
    *   a `pluginAction` with `alertWatcher.classify` ends its branch; one with `alertWatcher.gate` runs;
    *   a `handoff` node calls `flows.relay.open` with `suggestionCount: 0`;
    *   a `router` in `llm` mode selects no branch; in `hybrid` mode only rule branches match;
    *   `aiEnabled` absent → unchanged.

### Slice S5 — data launch and docs

*   **hub `scripts/entitlements/backfill-launch-plans.ts`** (new), run with `bun`:
    *   Database: `SUPABASE_DB_URL` (the owner's prod connection, set only for this run); refuses to run if
        `HUB_TEST_DB_URL` is also set, so test and prod targets cannot mix.
    *   Inputs: FACES by literal id `21e0601b-f632-43fd-8414-d644af4271f4`; Bernibites resolved by
        `organizations.name` matching `Bernibites` case-insensitively (its slug may be null), asserting exactly
        one match.
    *   Dry run by default: prints the resolved Bernibites id, the planned row per org, and the assertion results.
    *   `--apply --expect-base <uuid>`: refuses unless `<uuid>` equals the resolved Bernibites id. Snapshots
        `org_plans` to `scripts/entitlements/snapshots/org_plans-<timestamp>.json`, then in one transaction
        upserts Premium for every org except Bernibites and Base for Bernibites, writing `org_plan_events` with
        `actor_profile_id = NULL` and `note = 'launch-backfill'` for each changed row.
    *   After the write it asserts that exactly one org is not Premium, that it is Bernibites, and that FACES is
        Premium. A failed assertion rolls the transaction back and exits 1.
    *   Idempotent: a second run writes nothing and exits 0.
*   **hub `.env.example`**. Document `ENTITLEMENTS_ENFORCED` (default off).
*   **meta `specs/043-hub-org-entitlements/{spec.md,plan.md,tasks.md}`** (Spec Kit, from this design), plus a
    `specs/index.json` board stub, because the meta spec index ignores `specs/NNN-*/` subdirectories.
*   **meta `proposals/2026-10-29-hub-org-entitlements-followups.md`** (new). It records the open ends:
    *   R1 gateway crons, heartbeats, webhooks, gateway Pulse and alert-watcher, waiting on spec 042;
    *   R2 channel types outside the mirror; R3 the `hubMetrics` precondition;
    *   R4 a periodic `auth.refresh` from the dashboard;
    *   R6 any member of any org can read the shared gateway token;
    *   R8 a JWT path for gateway plugin UIs (`/plugins/[id]`, `/channels/[id]`, `/settings/plugins`, iframe
        slots), and stop handing the shared token to any browser;
    *   a refresh-only channel signal, so a plan change can reach channel replies without the 5-minute wait or a
        channel restart;
    *   R20 an `ai` flag on plugin flow-node manifests;
    *   R10 channel setup needs `operator.admin` for JWT sessions;
    *   R13 flows with a null `tenant_id`; R14 the Gmail auto-labeler; R19 the dormant tier system;
    *   per-method gateway tiers for a future Premium-lite; DB-editable plan overrides; spend caps; the site's
        "one agent" copy.

    Each open end with a code site also gets a matching `TODO(handoff)` there (listed in S2–S4).

### Launch order

1.  Merge S1, S2 and S3, then deploy the hub. The flag is off: every org keeps every feature (CUJ 6), and
    `/orgs/plans` works.
2.  Merge S4 and release the gateway; deploy the runner change. They change nothing while the hub sends no
    `features` claims and no `aiEnabled: false`.
3.  The owner runs the backfill: dry run, then `--apply --expect-base <id>`, then checks the assertions.
4.  The owner checks Q4 (`PUBLIC_GATEWAY_JWT_AUTH=true` in hub prod; `multiTenant.oidcIssuers` and
    `hubMetrics` on every gateway; the S4 gateway image running), then sets `ENTITLEMENTS_ENFORCED=true` and
    redeploys the hub.
5.  Acceptance (G9): move a test org to Base on `/orgs/plans`, then, as a member of that org:
    *   reload the hub; AI pages are gone from navigation and 404 by URL; every visible nav item opens without
        an error; the email summary, draft reply, note AI, transcription and voice are not rendered;
    *   direct calls to an AI route and a marketplace route return 403 `premium_required`;
    *   the dashboard connects with its JWT only; `chat.send` from devtools is refused;
    *   the `/channels` cards lead to `/settings?s=comms`, `/channels/whatsapp` is not-found, and a platform admin
        acting in the org can pair or edit a WhatsApp account from `/settings?s=comms`;
    *   background AI skips the org; a reminder goes out plain and a keyword reply confirms it;
    *   wait up to 5 minutes for the next mirror refresh, then confirm no channel restart happened in the gateway
        log and that a WhatsApp message to the org's account is stored in the inbox and the message ledger but
        gets no agent reply;
    *   a triggered flow with an LLM node sends nothing back; a non-AI branch of the same flow still runs;
    *   no new `ai_usage` rows appear for the org;
    *   FACES is unchanged.

    Then move the test org back.
6.  Rollback: unset `ENTITLEMENTS_ENFORCED` and redeploy the hub (Rollout).
