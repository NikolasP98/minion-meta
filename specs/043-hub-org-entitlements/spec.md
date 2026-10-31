---
id: 043-hub-org-entitlements
title: Hub org entitlements — plans gate AI per org
stage: spec
status: approved
verdict: approved
created: 2026-10-29
updated: 2026-10-30
repos: [minion_hub, minion, minion-meta]
tags: [security, data, permissions, ui]
---

# Feature Specification: Org entitlements (premium orgs)

**Feature Branch**: `docs/043-hub-org-entitlements` (meta) · slices S1–S5 in hub (`master`), gateway (`DEV`) and meta `langgraph-server/` (`dev`); see plan.md §Slices
**Created**: 2026-10-29
**Status**: Spec — awaiting owner approval. **Security + data tag**: S1 adds tables with RLS and an admin write path, S2 and S4 change who may reach AI and the gateway, and S5 writes production plan rows. The owner approves this spec before any code and merges every PR.
**Input**: Owner rule 2026-10-26: AI features are premium; the base offering is the method plus the platform. Owner framing: "RBAC for the cloud server" — plans gate orgs the way roles gate members.
**Source of truth**: [design.md](./design.md) (final, goldfish-reviewed 2026-10-29; review in [review/](./review/consolidated_review_report.md)). This file states WHAT and WHY; design.md holds HOW, file anchors and the full risk table.

## Product framing

Minion's order is ERP → CRM → RPA, with data as the foundation. AI sits on top of that method and is sold separately. A Base org keeps the full method and platform: CRM, POS, stock, scheduling, channels, non-AI flows, the message history and the cloud workstation. It does not see or reach AI. Nothing in the product looks locked; selling Premium is the site's job.

## AS-IS (evidence)

Anchors: hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a, meta `langgraph-server/`. Detail in design.md §The Problem.

### A. No plan concept exists
No plan, tier, subscription or entitlement exists in the hub or the shared database. Every org can use every AI feature. The only org-level gates are module on/off rows (`app_modules`, missing row = enabled) and the business/personal split (`ORG_KIND_POLICY`, `MODULE_MANIFEST.kinds`).

### B. AI runs on five paths the hub does not uniformly control
1. Hub server model calls through `getOpenRouterModel()` (`src/server/llm.ts`, `usageMiddleware`), two raw OpenRouter fetches (`embeddings.ts`, `assistant-router.service.ts`), one ElevenLabs fetch (`/api/voice/tts`), and AI gateway calls on the shared token (`media.transcribe`, `playground.complete`).
2. Hub cron ticks and background jobs that call models per org.
3. Chat and agent methods sent from the browser straight to the gateway over WebSocket; the hub never sees those turns.
4. Gateway channel auto-replies, crons, heartbeats and webhooks.
5. The flows runner (`langgraph-server/`), which executes LLM and agent nodes.

### C. The hub usage scope usually has no org
`hooks.server.ts:675-676` opens every request scope with `orgId: null`. `src/server/ai-usage.ts` learns the org only when a route calls `getTenantCtx` or a tick wraps work in `withAiUsageOrg`, so most user-facing AI routes run with no org in scope.

### D. The gateway knows the org only from the hub JWT, and every browser also holds the shared admin token
The gateway has no Postgres access. Its org knowledge is the hub-signed JWT (`gateway-jwt.service.ts`, 3600 s, claims `userId, role, agentIds, orgId`). Every hub browser session also fetches the shared operator token (`POST /api/servers/[id]/token`), which alone gives `operator.admin` with no org. The gateway rejects a JWT-only connect today: `message-handler.ts:515-533` requires a device when shared auth did not pass, and `:709` rejects failed shared auth before the JWT block at `:908`.

### E. Unused tier machinery
The gateway carries a dormant tier system (`capability_tiers`, `middleware/quota.ts`) and a separate free-tier user system whose JWT uses a `planTier` claim. Neither is wired to hub orgs.

**Result**: AI cannot be sold separately, a non-paying org cannot be stopped from spending on AI, and the server has no single answer to "may this org use this feature".

## TO-BE (observable behavior and invariants)

- Every org resolves to exactly one plan (Premium or Base at launch). A missing plan row means Base.
- The server decides, on every AI path listed in AS-IS B (except the deferred gateway background paths), whether the org's AI runs. A platform admin changes the plan on one admin page and the effect lands within stated bounds (design.md G9).
- A Base org's members see no AI anywhere: no tag, no locked button, no upgrade message. AI pages 404 like a disabled module.
- Direct calls to gated APIs return a machine refusal `premium_required` naming the feature.
- **Invariants**: FACES (`21e0601b-f632-43fd-8414-d644af4271f4`) sees no change at any step. With `ENTITLEMENTS_ENFORCED` off, every org on every surface behaves exactly as today. Base orgs keep channels (inbound, staff replies, plain reminders, notifications, door follow-ups), non-AI flows, the message ledger and the cloud workstation. RBAC checks are unchanged and still run after the plan check.

## DELTA

| Transition | From → to | Proof (test or check) |
|---|---|---|
| Plan storage | none → `org_plans` + append-only `org_plan_events`, RLS forced, no app-role writes | S1 RLS integration test against the QA DB |
| Evaluation | none → one pure evaluator + typed `PLAN_DEFAULTS` | S1 `evaluate.test.ts` table tests |
| Admin control | none → `/orgs/plans` (platform admins) with audit | S1 `page.server.test.ts`; CUJ 1 walk |
| Hub AI routes | open → 403 `premium_required` when enforced | S2 per-route-family tests; CI `ai-call-inventory.test.ts` |
| Hub model chokepoint | no org on most requests → org set per request; authenticated + no org = denied | S2 chokepoint tests |
| Ticks and AI jobs | run for every org → skip non-entitled orgs, count `skipped_by_entitlement` | S2 tick and `bg-runtime` tests |
| Shared token | every browser → refused to orgs without `ai`; those sessions connect JWT-only | S2 token test; S3 `gateway.svelte.ts` test; S4 `jwt-only-connect.test.ts` |
| Gateway methods | all allowed by scope → Base sessions limited to `BASE_PLAN_GATEWAY_METHODS` | S4 `server-methods.test.ts` |
| Channel replies | always run the agent → `aiEnabled: false` from the mirror ends dispatch after the message is stored | S4 dispatch and ledger tests |
| Flows | AI nodes always run → AI nodes end their branch; no reply delivered from a cut branch | runner `compile-flow.test.ts` |
| UI | AI always rendered → not rendered, pages 404 | S3 guard, availability, nav and component tests |
| Launch data | no rows → every org Premium except Bernibites (Base) | S5 backfill dry run + apply assertions |

## User Scenarios & Testing *(mandatory)*

### User Story 1: A platform admin sets an org's plan (Priority: P1, security/data)
A platform admin opens `/orgs/plans`, picks a test org, changes Premium to Base and saves. The page shows the new plan, each feature with allowed/reason, and an audit line with who, when, from and to. New orgs start on Base with no row and can be upgraded here. (design.md CUJ 1, CUJ 5)

**Why this priority**: Every other story reads the plan this page writes.
**Independent Test**: As a QA platform admin on `dev:local`, change a seeded org's plan and check the row, the features panel and the audit list; as a non-admin, open the page and get refused.

**Acceptance Scenarios**:
1. **Given** a platform admin and a Premium test org, **When** they set Base, **Then** the row shows Base, `ai`, `ai.chat`, `ai.proactive` and `marketplace` show off with reason `not_in_plan`, and one audit row names the admin.
2. **Given** a user without `orgs.all`, **When** they open `/orgs/plans` or post the action, **Then** the server refuses (403) and the link is not in navigation.
3. **Given** an org created through `/api/organizations/provision`, **Then** it resolves to Base with "Base (no plan row)" and its workstation provisioning (`shells.*`) still succeeds.
4. **Given** the flag is off, **Then** the features panel still shows what the plan would grant.

### User Story 2: A Base org member sees no AI in the hub (Priority: P1)
A member of a Base org opens the hub, My Agent, an email, a note and the CRM. There is no assistant orb, no AI page in navigation, no email summary or draft reply, no note polish/transcription/voice, no AI CRM widgets, and nothing hints at a lock. Every non-AI module works as before. (CUJ 2)

**Why this priority**: The owner rule is that disabled AI is not rendered.
**Independent Test**: With the flag on, sign in as a member of a seeded Base org and open every visible nav item; type an AI page URL.

**Acceptance Scenarios**:
1. **Given** the flag on and a Base org, **When** the member opens `/agents`, `/pulse` or `/marketplace` by URL, **Then** the normal not-found page renders.
2. **Given** the same member, **When** they open an email, **Then** no summary is rendered and none is fetched.
3. **Given** a tab rendered before a downgrade, **When** an AI control is used, **Then** it shows "no result" with no toast.
4. **Given** the flag off, or the flag on with a failing plan lookup, **Then** everything renders as today.

### User Story 3: AI and marketplace APIs refuse a Base org (Priority: P1, security)
A member of a Base org with `marketplace:view` calls `POST /api/marketplace/install`, `/api/notes/polish` or `/api/voice/tts` directly. (CUJ 4)

**Why this priority**: The server is the authority; hiding the UI alone stops nothing.
**Independent Test**: Call each gated route family with a Base-org session and check status and body.

**Acceptance Scenarios**:
1. **Given** the flag on, **Then** each call returns 403 `{code: 'premium_required', feature}` before any model call or stream starts.
2. **Given** the flag off, **Then** each call behaves as today and the server logs `entitlement.would_deny`.
3. **Given** a route that is also role-restricted, **Then** the module check (404) runs first, then the plan (403 premium), then RBAC (403 "your role can't").

### User Story 4: Background AI skips a Base org; reminders still go out (Priority: P2)
The Pulse, jobs and reminders ticks run for a Base org that has Pulse on and reminders with personalization and AI confirmation inference on. A patient replies "sí, confirmo". (CUJ 3)

**Independent Test**: Run each tick on `dev:local` with one Premium and one Base org.

**Acceptance Scenarios**:
1. **Then** no model call is made for the Base org and each tick reports `skipped_by_entitlement` including it.
2. **Then** reminders go out with the plain template and the keyword confirmation prompt, and the reply confirms the booking through the keyword parser.
3. **Given** an AI background job of a Base org, **Then** it ends with error `skipped_by_entitlement` and is not re-leased; a finance job is unaffected.
4. Premium orgs, FACES included, are processed as before.

### User Story 5: A Base org's dashboard uses the gateway without AI (Priority: P2, security)
A Base-org member reloads the hub, opens `/channels` and a flow; a platform admin acting in the org pairs WhatsApp from `/settings?s=comms`; the member sends `chat.send` from devtools. (CUJ 7)

**Independent Test**: Against a gateway with `oidcIssuers` configured, connect as a Base-org session and call allowed and refused methods.

**Acceptance Scenarios**:
1. **Then** the shared-token request returns 403 `premium_required` and the dashboard connects with its JWT only, with no shared-token fallback.
2. **Then** bootstrap reads (`agents.list`, `sessions.list`, `cron.list`, `system-presence`) succeed and channel status shows.
3. **Then** `/channels` cards link to `/settings?s=comms`, `/channels/[id]` is not-found, and the admin can pair WhatsApp there.
4. **Then** `chat.send` returns `FORBIDDEN` with `details {reason: 'premium_required', feature: 'ai'}`, also for an admin-scoped connection.

### User Story 6: A Base org's WhatsApp message gets no agent reply (Priority: P2)
A customer writes to a Base org's WhatsApp account served from the gateway mirror. (CUJ 8)

**Independent Test**: Gateway unit tests on dispatch and the ledger; live check after the next mirror refresh.

**Acceptance Scenarios**:
1. **Then** the message is in the hub inbox and the gateway message ledger, the `message_received` hook fires, no agent runs and no reply is sent, and the gateway logs `skipped_by_entitlement {channel, accountId, orgId}`.
2. **Given** a plan change, **Then** it reaches channel replies at the next mirror refresh (at most 5 minutes) with no channel restart.
3. **Given** an account with no owning org, or a hub outage, **Then** replies behave as before (not enforced, logged).

### User Story 7: Non-AI flows keep running for a Base org (Priority: P2)
A Base org opens the flow editor and runs a triggered flow that has one AI branch and one non-AI branch.

**Independent Test**: Runner tests with `aiEnabled: false`.

**Acceptance Scenarios**:
1. **Then** the palette lists no AI node types or AI plugin actions, the router offers only `rule` mode, and the copilot panel is absent.
2. **Then** at run time the non-AI branch runs, the AI branch ends with no output, and nothing is sent back to the customer from the cut branch, even with `deliverResponse` on.
3. **Then** a handoff node opens the human relay with no AI suggestions.

### User Story 8: Launch without disruption (Priority: P1, data)
S1–S4 ship with the flag off and an empty `org_plans`. The owner runs the backfill (dry run, then apply), checks the gateway preconditions, then turns the flag on. (CUJ 6)

**Independent Test**: Run the backfill against the QA DB twice; walk FACES before and after.

**Acceptance Scenarios**:
1. **Given** the flag off and no rows, **Then** FACES sees every AI page and control.
2. **When** the dry run executes, **Then** it prints the resolved Bernibites id and reports exactly one org that will not be Premium.
3. **When** `--apply --expect-base <id>` runs, **Then** every org except Bernibites is Premium, Bernibites is Base, FACES is Premium, and each change has an audit row with a null actor and note `launch-backfill`. A failed assertion rolls back.
4. **When** it runs again, **Then** it writes nothing and exits 0.

### Edge Cases
- A plan lookup fails with the flag on: UI and route guard render as entitled; request gates fail closed; ticks skip and count the org. Two named exceptions (design.md G1, R5): the JWT issuer omits the claims, and the token endpoint uses its last cached answer or else returns the token.
- An unknown `plan_key` in a row resolves to Base with a warning.
- A future plan that lists a child key (`ai.chat`) without its parent grants nothing; inheritance only removes.
- A platform admin whose active org is Base is restricted on the gateway too; the gate follows the org, not the person.
- An open dashboard socket keeps its old features until it reconnects (no periodic JWT refresh).
- With `CACHE_BACKEND=memory`, other hub instances see a plan change only after the 5-minute cache TTL.
- A flow with a null `tenant_id`, or a channel account with no `tenantId`, is not enforced and is logged.
- One-off AI jobs skipped while an org was Base are not redone after an upgrade; tick-driven re-scans catch up.
- Existing personal agents of a downgraded org stay provisioned; their chat and channel paths are gated.
- Model calls with no request and no org (scripts, platform jobs) are not enforced, only logged.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** Plan per org: every org resolves to exactly one plan. Missing row → Base (`planSource: 'default'`). Unknown key → Base plus a warning.
- **FR-002** Feature catalog in code: dotted keys `ai`, `ai.chat`, `ai.proactive`, `marketplace`. Premium grants `ai` and `marketplace`; Base grants nothing. A child key is granted only when its parent is granted. An optional per-feature rule may combine plan, org kind and earlier features with all/any/not; none exists at launch. Changing plans or rules is a pull request.
- **FR-003** One server evaluator returns `{allowed, reason}` with reason `granted | not_in_plan | rule_false`; the resolver adds `lookup_error`. Everything else (UI, JWT) receives the expanded list of granted keys, so no second evaluator exists.
- **FR-004** One switch, `ENTITLEMENTS_ENFORCED` (hub server env, default off). Off: every org is entitled to every feature on every surface (UI, route guard, `aiEnabled`, JWT claims); would-be refusals are logged only.
- **FR-005** Failure policy with the flag on, per design.md §Resolution: UI and route guard fail open; request gates fail closed except the two named exceptions; ticks and jobs skip and count.
- **FR-006** Refusal contract: hub HTTP 403 `{code: 'premium_required', feature}`; gateway `FORBIDDEN` with `details {reason: 'premium_required', feature}`. It is distinct from the role 403 and is never shown in the UI.
- **FR-007** Check order on a request: module/kind availability (404) → entitlement (403 premium) → RBAC capability (403 role).
- **FR-008** Hub `ai`: every AI route checks the feature before any work or stream starts (route list in design.md S2). The model-call chokepoint knows the org on every authenticated request and denies an authenticated call with no org.
- **FR-009** Hub `ai.proactive`: every AI tick and AI background job skips non-entitled orgs and reports `skipped_by_entitlement`. Reminders still send with the plain template and keyword confirmation. `ai.chat` gates the assistant route.
- **FR-010** `marketplace`: install, generate-agent and catalog APIs refuse; platform catalog sync stays ungated.
- **FR-011** Shared gateway token: with the flag on, an org without `ai` is refused the token, and its browser connects with the JWT only, with no shared-token fallback. Premium orgs keep today's behavior.
- **FR-012** Gateway accepts a JWT-only connect when `oidcIssuers` is configured, without counting it as a failed shared-secret attempt. Without `oidcIssuers`, behavior is unchanged.
- **FR-013** Gateway method gate: a connection whose `features` claim is present and lacks `ai` may call only `BASE_PLAN_GATEWAY_METHODS` (design.md §Gateway access). The gate runs before the admin-scope bypass, never grants, and leaves the existing scope checks in force.
- **FR-014** JWT claims `plan` and `features` are added only by `/api/gateway/jwt` with the flag on; the provisioning JWT never carries them. Malformed `features` → `[]`; absent → not enforced. `auth.refresh` replaces them; `/mcp` JWT identities carry them; impersonation never widens them.
- **FR-015** Channel replies: each mirrored account carries `aiEnabled` from its owning org. `false` ends dispatch before the agent runs, after the message is stored, ledgered and hooked. A plan change reaches it at the next 5-minute mirror refresh; no channel runtime restarts.
- **FR-016** Flows: AI node types and AI plugin actions are not offered to orgs without `ai`. At run time each AI node ends its branch, non-AI branches run, no reply is delivered from a cut branch, and the human relay opens with no AI suggestions.
- **FR-017** UI: disabled AI is not rendered. AI pages 404 like a disabled module and leave navigation; AI controls on visible pages are absent and their endpoints are not called. Plugin UIs that need the shared token are hidden for orgs without `ai`; channel setup for WhatsApp, Telegram and Discord stays reachable at `/settings?s=comms`.
- **FR-018** Admin page `/orgs/plans` under the existing `orgs.all` capability: list orgs with plan, source, kind and members; change the plan; show effective features with reasons; list plan events. Org members may read their own plan row and never write it.
- **FR-019** Data: `org_plans` (one row per org, cascade on org delete) and `org_plan_events` (append-only, outlives the org). Forced RLS, no app-role write grant, explicit revoke from `anon` and `authenticated`. Schema-only migration; no data in it.
- **FR-020** Org provisioning writes no plan row. Personal-agent provisioning creates nothing for an org without `ai` when enforced.
- **FR-021** A CI test lists every hub AI call site with its gate and fails on an unlisted site, a listed route without a feature check, or a stale row.
- **FR-022** Owner-run backfill: dry run by default; apply requires the expected Base org id; snapshot before writing; one transaction; asserts exactly one non-Premium org (Bernibites) and FACES Premium; idempotent; refuses when the QA and prod DB variables are both set.
- **FR-023** Required build steps: route contract for `/orgs/plans`, RBAC registration, Paraglide strings in both locales, design-token lint, and seed pairing for the migration.
- **FR-024** Logging: every denial and `lookup_error` logs `{feature, orgId, plan, reason, surface}`. PostHog `entitlement_denied` is sent for request denials only.

### Key Entities
- **Plan**: a named bundle (`base`, `premium`; later others) defined in code.
- **Feature**: a dotted key with label, description and an optional rule, defined in code.
- **Org plan** (`org_plans`): the plan assigned to one org, with who set it, when and an optional note. No row = Base.
- **Plan event** (`org_plan_events`): an append-only audit line (org, from, to, actor or null, note, time).
- **Entitlement snapshot**: `{plan, planSource, features, enforced}` resolved per org and cached 5 minutes.

## Success Criteria *(mandatory)*
- **SC-001** With S1–S4 deployed and the flag off, the FACES acceptance walk finds 0 differences from before deploy (every AI page and control present).
- **SC-002** The backfill dry run reports exactly 1 non-Premium org (Bernibites); after apply the assertions pass; a second run writes 0 rows.
- **SC-003** With the flag on and a test org on Base, 100% of sampled AI and marketplace routes return 403 `premium_required`, and the org gets 0 new `ai_usage` rows during the acceptance window.
- **SC-004** Within 5 minutes of the plan change, a WhatsApp message to the test org is stored in the inbox and the ledger with no agent reply, and the gateway log shows no channel restart.
- **SC-005** Adding an unlisted AI call site makes `ai-call-inventory.test.ts` fail in CI.
- **SC-006** Unsetting `ENTITLEMENTS_ENFORCED` and redeploying the hub restores every feature for new sessions with no data change.

## Assumptions
- **Launch preconditions (design.md Q4, owner check)**: `PUBLIC_GATEWAY_JWT_AUTH=true` in hub production; every gateway sets `multiTenant.oidcIssuers` and `hubMetrics`; the S4 gateway image is running. If any is false, Base-org sessions cannot reach the gateway or the mirror enforces nothing.
- Bernibites is the only Base org at launch and is found by name; its id is in no repo.
- Hub production uses the `noop` or `valkey` cache backend, so plan changes are immediate on the hub.
- The gateway checks only the `ai` group until a second paid plan exists.
- The flows runner binds loopback and is reached only by the co-located gateway, which makes "absent `aiEnabled` = true" safe.

**Out of scope:** billing, checkout or automatic plan changes; per-plan spend caps; a rule editor in the admin page; site pricing copy; the gateway agent → org binding (spec 042 S1) and therefore gateway crons, heartbeats, webhook agent runs, gateway Pulse generation and the alert-watcher; channel types outside the mirror; the Gmail auto-labeler; fixing that any member can read the shared gateway token today (only Base orgs stop receiving it); removing the dormant gateway tier system and `planTier`; per-method gateway tiers. Each deferred item is in `proposals/2026-10-29-hub-org-entitlements-followups.md`.

**Verification:** each slice's tests are listed in plan.md §Slices and tasks.md. The live acceptance walk is design.md §Launch order step 5 (tasks.md T090).
