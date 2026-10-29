# Org entitlements (premium orgs)

* **Author:** Nikolas Pinon (owner) · drafted by Claude (elephant) from six goldfish reviews
* **Date:** 2026-10-28
* **Input:** [hypothesis.md](./hypothesis.md)

## Overview

Minion has no way to say "this org pays for AI". The owner rule (2026-10-26) is that AI is premium and the
base offering is the method plus the platform. This feature adds a per-org **plan** (Premium, Base, later
Premium-lite and others), a list of **gated features**, and a mapping of which plans unlock which features.
Platform admins set an org's plan by hand on a new admin-only page. Enforcement is server-side only (hub APIs,
cron ticks, server AI, and the gateway via a plan claim in its JWT). An org with no plan row is on Base; every
existing org except Bernibites is backfilled to Premium before enforcement ships.

First gates: **proactive (background) AI**, **AI chat**, and the **/marketplace**. A blocked feature stays
visible with a "Premium" tag and an upgrade message; any server refusal says "premium", never a generic error.
At launch every org except Bernibites is Premium; Bernibites is Base.

## Analysis

Six reviewers (design, codebase details, zoom-out, comprehension, implementation readiness, structural) read
the hypothesis cold. Deduplicated findings, most severe first:

### Facts the hypothesis got wrong

1. **The gateway has no Postgres.** It stores its own data in SQLite (`free-tier.db`) and reads hub data over
   HTTP (`/api/gateway/*`, e.g. contract C2 `GET /api/gateway/query/tool-permissions`). So "the gateway reads
   the same tables" is impossible today. The hub must own the entitlement data and the evaluator; the gateway
   asks the hub (HTTP, cached) or receives the answer in its connect JWT. A Postgres function would be a
   third home for logic that nobody can call. (structural, codebase, design, readiness — all four)
2. **The gateway already has a tier system.** Gateway DEV has `capability_tiers` (free / pro / enterprise),
   `tenant_capabilities`, `capability_audit_log` (MIN-458, `src/db/migrations/003_capability_tiers.sql`),
   `plan_limits`/`plan_tier` (`004_free_tier_users.sql`), and `src/middleware/quota.ts` which reads a
   `planTier` JWT claim and links to `${HUB_BASE_URL}/billing`. It looks mostly unwired, but it exists. Left
   alone, Minion ends up with two plan vocabularies in two stores. (design, codebase)
3. **The sidebar icon row is not what we assumed.** `utilityLinks()` (`src/lib/components/layout/utility-links.ts`)
   holds `/reliability` (the pulse-looking icon), `/marketplace`, `/cloud`, `/killswitches`. The row is hidden in
   module mode, and `topbar-parity.test.ts` pins it. A cross-org admin page already exists:
   `(app)/settings/organizations`. (codebase, zoom-out, comprehension)
4. **There is no `/my-agent` route.** The personal agent lives on `/home`. AI chat entry points are:
   FloatingAssistant, the personal agent on `/home`, `CrmInsightsChat`, and the Jev router `/api/assistant/route`.
   All chat turns go browser → gateway WebSocket `chat.send`; the hub server never sees them. (codebase)
5. **`/marketplace` is not a module.** The module guard does not cover it, and its APIs
   (`/api/marketplace/{agents,install,generate-agent,sync,sync/tick}`) are reachable separately;
   `generate-agent` is itself an AI call. (codebase, comprehension, readiness)

### Design risks

6. **AI chat can only be truly blocked in the gateway.** A hub gate hides the button but anyone with the
   WebSocket token can still send `chat.send`. The gateway only knows a connection's org when the hub sent a JWT
   (`PUBLIC_GATEWAY_JWT_AUTH==='true'`); on shared-token connections `orgId` is undefined and a check keyed on it
   would let everything through. The gateway→org binding is also known-broken (`personal_agents.gateway_id`
   NULL; bearer→gateway rows flip per boot — spec 042 S1). (all six)
7. **"No plan = every feature" fails open forever.** Every org created after launch gets premium free until an
   admin acts, and a failed lookup that is treated like "no plan" silently grants everything — the house pattern
   `isModuleEnabled` does exactly that (`states[id] ?? true`). "No plan" and "lookup failed" must be different
   results. (design, structural, comprehension, readiness)
8. **The rule language is heavier than the need.** Two plans, three features, one restricted org. A nested
   `all / any / not` tree stored as JSON needs validation, depth limits, an editor and a debugger, and a bad row
   can grant or deny everything. The owner's own example (Premium-lite lacks B) is a plain set: each plan lists
   its features. Org kind is already gated by `ORG_KIND_POLICY` / `MODULE_MANIFEST.kinds`; putting kind inside
   plan rules makes a third copy. (zoom-out, structural, design, comprehension)
9. **Anyone could grant themselves premium** if the new tables copy `app_modules`, whose RLS lets any org write
   its own rows. Plan assignment must be writable only through a platform-admin path, with an audit row. (structural)
10. **The launch data must not go in a SQL migration.** Hub prod builds run `db:migrate` automatically, so a data
    statement there is an unreviewed prod write. Since "no plan" already means everything, only the Bernibites
    row matters; it should be set by id, through the admin page or a dry-run script. Bernibites' `slug` may be
    NULL. (readiness, design)
11. **Cache lag breaks the acceptance test.** Copying the module cache (5 min TTL) means a flip shows up up to
    5 minutes later. `setModuleEnabled` busts the *caller's* tenant tag; an admin flipping another org must bust
    the *target* org's tag. The gateway needs its own stated max staleness. (all but zoom-out)
12. **"Proactive agents" is broader than three jobs.** Cron ticks that call AI: `/api/pulse/tick` (global; gate
    inside the per-org loop), `/api/scheduling/reminders/tick` (`composeReminder`), `/api/brains/reconcile/tick`,
    `/api/crm/conversations/{analyze,vectorize}/tick`, `/api/crm/relationship/tick`, `/api/jobs/tick`; plus the
    gateway's `pulse-tools` posting `/api/gateway/pulse/proposals` and `/agents/autonomous`. Blocking reminders
    outright would take a base feature away; a non-premium org should probably get the plain template instead of
    AI personalization. (codebase, design)
13. **No shared refusal shape.** The module guard returns 404, the access guard 403 "no access to this module".
    Premium needs its own machine-readable code (e.g. 403 `{code:'premium_required', feature}`) used by hub
    pages, APIs, ticks and gateway frames, plus one i18n message. The "upgrade" link has nowhere to go: no
    checkout, and the site pricing page is lead forms only. (all)
14. **Debuggability.** Every decision should return `{allowed, reason}` with reason ∈
    `no_plan_default | not_in_plan | org_unknown | lookup_error`; log denials and fail-opens; ticks report
    how many orgs they skipped; the admin page shows "why is feature X on/off for org Y" and a plan-change audit
    trail. (codebase, comprehension)
15. **No spend ceiling.** Premium is a yes/no; one premium org can drive unlimited OpenRouter spend.
    `usageMiddleware` already meters per org, so a cap is cheap later. (design)
16. **Product contradiction.** The site's free Personal card promises "one agent" while AI is premium. The
    Premium tag copy should not ship contradicting the pricing page. (zoom-out, design, readiness)

## Goals vs. Non-Goals

* **In-Scope Goals**
  * Per-org plan, stored in hub Postgres, set by platform admins only, with an audit trail.
  * A feature registry and a plan → feature mapping that can express "Premium-lite lacks B".
  * One hub evaluator returning `{allowed, reason}`; hub pages, hub APIs and hub cron ticks use it.
  * First gates: proactive AI, AI chat, /marketplace (page + APIs).
  * UI reflects server decisions only: "Premium" tag + upgrade message; one refusal contract and message.
  * Admin page reachable from the sidebar, the seed of a future admin module.
  * Acceptance: flip a test org to Base → the three features are blocked with a clear message; FACES unaffected.
* **Out-of-Scope Non-Goals**
  * Billing, checkout, Stripe, automatic plan changes.
  * Per-plan token or spend ceilings.
  * Site pricing copy changes (owner decision tracked separately).
  * Fixing the gateway→org binding itself (spec 042 S1 owns it).

## Alternatives Weighed

* **Postgres function as the shared evaluator** — rejected: the gateway has no Postgres client; it would add a
  third home for logic alongside TypeScript and RLS.
* **Shared `@minion-stack/*` evaluator package used by hub and gateway** — deferred: the gateway would still need
  the data over HTTP, so today it only duplicates code paths. Revisit if the gateway gains DB access.
* **Reuse the gateway's SQLite `capability_tiers` as the source of truth** — rejected as the source (local to
  one gateway, invisible to the hub and to other gateways); its vocabulary and audit-log shape are worth reusing.
* **Gate by refusing to issue the gateway JWT** — rejected: the same token powers non-AI gateway admin.
* **Write "Premium" onto every org in a SQL migration** — rejected: runs unreviewed on prod deploy, and is
  functionally identical to "no plan".
* **Nested `all / any / not` rule tree stored as data** — rejected for now (decision B): no hub precedent for
  logic in the DB; needs validator, editor, debugger; one bad row affects every org. Additive later.
* **Plain plan → feature sets with no operators** — rejected (decision B): cannot express the owner's
  org-kind / logical-operator requirement.
* **"No plan = every feature"** — rejected (decision C): new orgs would get premium free forever.
* **Reuse the gateway `planTier` claim** — rejected (decision F): already means a gateway-native free-tier user.
* **Plan column on the existing `(app)/settings/organizations` only** — rejected (decision D): owner wants a
  dedicated admin page as the seed of an admin module; the existing page links to it.

## Key Decisions & Staging for Next Steps

Settled by the review (mechanical, one defensible answer):

1. The hub owns entitlement data and the only evaluator. The gateway never re-implements rules.
2. "No plan" (`reason: no_plan_default`) and "lookup failed" (`reason: lookup_error`) are separate results.
   Request path: DB errors propagate (the request fails, nothing is silently granted). Background ticks: skip the
   org and log on error. Entitlement tables missing (deploy ahead of migration) = no plan = all features.
3. Plan writes go only through a `requireAdmin` service path with an audit row; org members read only.
4. Launch data: schema-only migration; Bernibites set to Base by `organizations.id` via the admin page (which
   doubles as the acceptance test). Other orgs stay "no plan" or are labelled Premium in the same admin flow —
   it is a label, not a behaviour change.
5. Cache under its own tag keyed by the target org; admin writes invalidate it immediately.
6. Feature keys get their own namespace (`ai.chat`, `ai.proactive`, `marketplace`), separate from module ids.
7. Final check = existing module/kind availability **and** entitlement, as two functions, so the denial can say
   "premium" instead of "not found".
8. Refusal contract: HTTP 403 `{code:'premium_required', feature}` and the matching gateway error frame; one
   i18n message.

9. **Premium is a backend concern (owner, 2026-10-28).** Enforcement happens only server-side: hub API
   endpoints / form actions, cron ticks, server AI calls, and gateway methods (`chat.send`, proactive runs) via
   the JWT claim (decision A). The evaluator and rules live in `src/server/`. The frontend never decides; it only
   reads the server-resolved feature list to render the "Premium" tag, so removing the tag unlocks nothing.
   Feature keys name backend capabilities (gateway methods, APIs, ticks), not pages: "marketplace" = its
   install / generate-agent / sync APIs, not the `/marketplace` page.

Owner decisions (all resolved 2026-10-28):

* **A. DECIDED 2026-10-28 → (ii) plan claim in the gateway JWT.** Was: Gateway enforcement for AI chat in this spec? (i) hub-only now, chat gate labelled "UI-only" until
  spec 042 S1 fixes org binding; (ii) gateway checks a `plan`/`features` claim added to the existing hub-signed
  connect JWT (no gateway DB read; a downgrade lands when the token expires; shared-token connections stay
  ungated); (iii) gateway asks a new hub endpoint per org, cached with a stated TTL.
* **B. DECIDED 2026-10-28 → (ii) sets + typed TypeScript rules** (owner delegated; rationale: identical DB to (i) — `org_plans`, `plan_features`, dotted feature keys mirroring `permission_rules`/`crm.insights` inheritance; optional per-feature all/any/not rule in code beside `MODULE_MANIFEST`, changed by PR; (iii) stays an additive later step — a jsonb column + editor — only if non-engineers must create plan variants without deploys). Was: Rule model. (i) plain sets: plan → features, optional feature tags, no operators; (ii) sets plus a
  typed TypeScript rule per feature (operators in code, reviewed and tested); (iii) the original nested
  `all / any / not` tree stored as data and edited on the admin page.
* **C. DECIDED 2026-10-28 → (ii) new orgs default to Base.** Consequences (mechanical): a missing `org_plans` row resolves to Base (fail-closed; lookup errors never grant); org creation writes a Base row; rollout = (1) schema-only migration, (2) owner-run backfill script — dry-run default, snapshot, invariant `exactly one org (Bernibites, by id) is not Premium` — (3) enforcement deploy. Enforcement must never ship before (2). Was: Plan for new orgs. (i) no plan = everything (owner's literal words, fails open forever);
  (ii) new orgs default to Base and an admin upgrades them; (iii) one global "enforce plans" switch — off means
  everything on, on means a missing plan = Base.
* **D. DECIDED (owner's original answer) → new admin-only page in the sidebar utility row** (`utilityLinks()`), seed of a future admin module; also linked from `(app)/settings/organizations` because the row is hidden in module mode; route manifest + route-access registry + `topbar-parity.test.ts` updated. Was: Admin page placement. New admin page from the sidebar row (note: row hidden in module mode) vs. a plan
  column on the existing `(app)/settings/organizations` linked from a new sidebar entry.
* **E. DECIDED 2026-10-28 → all background AI is premium** (`ai.proactive`): Pulse tick + gateway Pulse proposals, reminder personalization (`composeReminder`; Base orgs get the plain template, reminders still send), brain reconcile, CRM analyze / vectorize / relationship ticks, AI jobs on `/api/jobs/tick`, autonomous agents. Gate inside each tick's per-org loop; every tick reports `skipped_by_entitlement`. Known consequence: Base orgs stop getting new embeddings, so brain search / CRM similarity cover only data indexed before. Was: Proactive scope. Which ticks are "proactive agents", and whether a non-premium org loses reminders or
  gets the non-AI template.
* **F. DECIDED 2026-10-28 → leave dormant, document** (owner delegated). Verified on gateway origin/DEV: `capability-api.ts` / `src/capabilities/*` and `middleware/quota.ts` have no runtime importer (dead code); the free-tier API (`server.impl.ts:675-679`, `free-tier.db`, `createFreeTierApiHandler`) IS live but is a separate gateway-native user/auth system whose own JWT carries `planTier`. Hub claims therefore use new names (`plan`, `features`) to avoid two meanings for `planTier`; gateway tier code untouched; TODO(handoff) + proposal to retire the dead capability-tier code and decide the free-tier routes' future. Was: Gateway's dormant `capability_tiers`. Retire it, or map its free/pro/enterprise onto the hub plans.
