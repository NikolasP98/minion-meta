---
phase: 09-security-containment
plan: 01
subsystem: auth
tags: [sveltekit, postgres, assistant, authorization, credentials]
status: verification_pending
requires: []
provides:
  - Unconditional raw-SQL denial at route and legacy service boundaries
  - Current persisted personal-agent gateway/org assignment checks
  - Explicit denial of unassigned gateway brain delegation
  - Sanitized server create/update/delete diagnostics
  - Focused negative controls and a Phase 15 restoration proposal
affects: [15-structured-output-notification-intelligence, agent-governance, api-compatibility]
tech-stack:
  added: []
  patterns: [fail-closed capability retirement, uncached persisted assignment checks]
key-files:
  created:
    - minion_hub/src/server/auth/assistant-principal.pg.test.ts
    - minion_hub/src/routes/api/gateway/query/server.test.ts
    - minion_hub/src/routes/api/servers/server.test.ts
    - minion_hub/src/routes/api/servers/[id]/server.test.ts
    - proposals/2026-09-09-assistant-query-delegation-restoration.md
  modified:
    - minion_hub/src/server/services/assistant-query.service.ts
    - minion_hub/src/server/services/assistant-query.service.test.ts
    - minion_hub/src/server/auth/assistant-principal.ts
    - minion_hub/src/server/auth/assistant-principal.test.ts
    - minion_hub/src/routes/api/gateway/query/+server.ts
    - minion_hub/src/routes/api/servers/+server.ts
    - minion_hub/src/routes/api/servers/[id]/+server.ts
key-decisions:
  - Arbitrary SQL is unavailable with a stable non-retryable code; no flag bypass exists.
  - Existing personal_agents and gateway assignments are authority, not requested principal/org fields.
  - Ambiguous gateway aliases are denied before looking up the requested actor.
  - Brain delegation remains denied until an explicit persisted gateway assignment exists.
  - Server telemetry keeps the server_added event but drops request-derived properties.
requirements-completed: []
requirements-addressed: [SEC-01, SEC-02, SEC-03]
completed: 2026-09-09
---

# 09-01 — Hub assistant containment implementation

Raw assistant SQL is disabled, gateway personal actors require persisted assignment and membership, and server credential changes no longer echo request or backend values into diagnostics. Implementation and focused behavior tests are complete; independent parent verification and a clean final type check remain pending. Root requirement/state files were not changed.

## Source identity and preservation

Hub remained on `feat/level-2026-07-30`, HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`. The existing dirty checkout, staged changes, and unrelated work were preserved. Existing audit TODOs in the three assigned source files were either resolved by this implementation or replaced with precise restoration pointers. No commits, branch/worktree/stash changes, dependency edits, deployments, production requests, production database writes or migrations were performed by this worker. The parent separately restored declared dependencies with a frozen lockfile; the added PGlite fixture writes only its in-memory synthetic database.

## Implemented behavior

### SEC-01

`src/server/services/assistant-query.service.ts` has no runtime DB import or SQL executor. `runReadOnlyOrgQuery` preserves its legacy signature and always throws `QueryRejected` with code `ASSISTANT_SQL_DISABLED`, status 503 and `retryable:false`. `src/routes/api/gateway/query/+server.ts` returns the corresponding JSON contract without body parsing, principal resolution or DB construction. Existing module-specific `/query/*` routes are not removed.

### SEC-02

`src/server/auth/assistant-principal.ts` now:

- Reads current `gateway` rows matching canonical UUID or legacy server ID; zero or multiple matches deny access. Parent's read-only catalog confirmed `legacy_server_id` has no unique index, so actor assignment cannot disambiguate the authenticated alias.
- Requires gateway org to equal the token-resolved org. Requested org cannot select another membership.
- Reads an active `personal_agents` row for that exact gateway and a literal case-insensitive agent ID. The final lookup joins the current gateway and rechecks its org. Missing, ambiguous, inactive, moved or mismatched rows deny authority.
- Checks current owner organization membership before resolving capabilities. Identity backend failures return safe code `ASSISTANT_IDENTITY_UNAVAILABLE`, without exception details.
- Rejects gateway userId overrides and all gateway brain requests with `ASSISTANT_BRAIN_ASSIGNMENT_REQUIRED`. No persisted brain/gateway assignment exists in the current model; an org/brain_access match is insufficient.
- Preserves browser self/admin checks and brain-only capability behavior for an authenticated admin. Explicit unauthorized org requests are rejected rather than silently redirected to a different org.
- Uses persisted personal-agent ownership rather than writing denormalized profile identity pointers during authentication. No wildcard ILIKE identity matching remains.

### SEC-03

`src/routes/api/servers/+server.ts` removes body/email/environment/URL dumps. The `server_added` analytics event retains its actor/event identity but drops request-derived name/URL properties because URLs can contain credentials. SSRF and persistence failures return fixed safe text and log no exception payload.

The directly related `src/routes/api/servers/[id]/+server.ts` PUT/DELETE handlers also return/log safe fixed messages and a route template instead of raw request IDs and DB exceptions. Existing authentication, server-link gates and persistence behavior remain intact. This small scope expansion was reported to the parent because SEC-03 explicitly covers create/update.

## Red-green evidence

- SQL containment: **7 failed before implementation**, including benign SELECT reaching the forbidden transaction and the route resolving identity; **7 passed after**.
- Actor boundary: after configuring the fake old identity path to return a valid principal, **20 failed / 7 passed before implementation**. Negative cases demonstrated actual prior acceptance of missing/mismatched/stale gateway assignments, arbitrary gateway userId, cross-org selection and wildcard-shaped IDs. Initial incomplete-mock failures were corrected before relying on the red result.
- Initial actor implementation: **27 passed**. Expanded controls add ambiguous actor after unambiguous gateway, assignment movement, sanitized backend failure, absent brain, browser nonadmin brain denial and brain-org mismatch; **34 actor tests** form the final suite.
- Server creation: **4 failed before**, exposing a synthetic credential through body/URL/analytics/error paths; **4 passed after**.
- Server update/delete: **2 failed / 3 passed before**, returning synthetic bound credential details; **5 passed after**.

All credential values in tests are synthetic sentinels. No production exploitation or tenant-row test was performed.

## Commands and outcomes

1. `bun run vitest run src/server/services/assistant-query.service.test.ts src/routes/api/gateway/query/server.test.ts` — 2 files / 7 passed.
2. Expanded nearby suite, run from `minion_hub`:

   `bun run vitest run src/server/auth/assistant-principal.test.ts src/server/services/assistant-query.service.test.ts src/routes/api/gateway/query/server.test.ts src/routes/api/servers/server.test.ts src/routes/api/gateway/actions/actions.server.test.ts src/routes/api/gateway/brain-search/server.test.ts 'src/routes/api/servers/[id]/token/server.test.ts' src/server/services/server.service.test.ts src/server/services/ssrf-guard.test.ts src/server/services/rbac.service.test.ts src/server/services/personal-agent.service.test.ts src/server/services/gateway.pg.service.test.ts`

   **12 files / 206 passed.** This includes real consumer test suites, not only newly added containment tests.
3. After the PUT/DELETE change: `bun run vitest run 'src/routes/api/servers/[id]/server.test.ts' 'src/routes/api/servers/[id]/token/server.test.ts' src/routes/api/servers/server.test.ts` — **3 files / 14 passed**. These overlap the previous suite; do not add their totals as independent coverage.
4. Scoped Prettier write/check on owned files — initial formatting findings corrected; **check passed on all 10 TS files**; a subsequent check of the two files touched by the final type fixes also passed.
5. `node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure .planning/phases/09-security-containment/09-01-PLAN.md` — **valid, four tasks, no errors or warnings**.
6. `bun run check` — **failed with four errors, zero warnings**. Log: `/tmp/minion-360-2026-09-09/hub-security-check.log`. Two owned errors were corrected immediately: nullable gateway-org property captured in a query closure now uses the already validated immutable tokenOrg; test URL helper accepts optional case parameters and omits undefined values. The other two errors are outside this slice: missing `@electric-sql/pglite` imports in `crm-contacts.service.test.ts:3` and `crm-journey.atomic-write.test.ts:2`. No dependency change was made. A final standard check is owed by the integration/dependency owner; source fixes alone are not reported as a passing type check.
7. Final principal-only rerun after the type fixes: **1 file / 34 passed**; output `/tmp/minion-360-2026-09-09/hub-security-principal-final.log`. Session `37685` completed and was collected; no active or detached/untracked process remains.

8. Added real-engine acceptance: `bun run vitest run src/server/auth/assistant-principal.pg.test.ts` — **1 file / 20 passed**, log `/tmp/minion-360-2026-09-09/hub-security-principal-pg.log`. Session `81501` completed and was collected. This calls the actual principal resolver, Drizzle joins and RBAC capability resolver. The real Supabase client receives a constrained local HTTP transport that executes parameterized SELECTs against the same PGlite fixture; no fluent query mocks or network access are used. Canonical and legacy IDs, duplicate aliases (including canonical/legacy collisions), literal case-insensitive actors, other-gateway actors, provisioning, cross-org membership, revocation, browser self/admin and brain controls pass. No production source defect was found by these additional cases. After formatting and making the test URL helper omit optional parameters, combined unit/real-query rerun passed **2 files / 54 tests**; log `/tmp/minion-360-2026-09-09/hub-security-principal-combined.log`, session `22366` completed and collected. The new test file passes scoped Prettier; revised GSD plan structure remains valid with four tasks.

The initial SQL test invocation from meta root failed because that package has no vitest script; it was rerun correctly in Hub before interpreting test results.

## Read-only catalog evidence

Parent supplied `/tmp/minion-360-2026-09-09/assignment-catalog-final.json` after read-only inspection. It confirms personal_agents `profile_id` UUID NOT NULL/unique, `agent_id` text NOT NULL, `gateway_id` UUID nullable and `provisioning_status` text NOT NULL; gateway `id` UUID, nullable `legacy_server_id` and nullable `org_id`; brains has no gateway assignment column. No tenant records were collected. This supports the chosen existing assignment model but does not certify deployed runtime provisioning or fresh production behavior.

## Standards review

No `any`, ts-nocheck, credential logging, production mutation or new library introduced. Existing typed capability gates are reached only after the new shared actor boundary. Tests observe denial/success/no-DB/no-secret behavior and protect indirect callers. Whole-project type verification is owned by the parent following the corrected owned types and restoration of the declared PGlite dependency. Independent parent review remains required before completing requirement status.

## Spec review and limitations

The finite Phase 09 containment behavior is implemented. This is not full analytics restoration, brain delegation restoration or deployed security certification. Unit tests retain injected query fixtures; the additional real-query PGlite suite executes the complete principal and capability resolver against minimal synthetic tables through real Drizzle and Supabase query builders. Its local HTTP transport implements only the needed SELECT/equality/in subset and does not reproduce deployed PostgREST, JWT, pooler, RLS or provisioning. SQL is disabled entirely rather than claiming a new SQL sandbox. Historical log review and token rotation were not performed.

TODO(handoff) comments and `proposals/2026-09-09-assistant-query-delegation-restoration.md` track Phase 15 / SEC-06: typed tenant/module/owner/field datasets, bounded result contracts, persisted brain invocation delegation, gateway advertisement removal and seeded integration acceptance. Gateway `crm_query` is still advertised in the separate gateway repo; changing Hub's module-only permissions response would not remove that tool, so this cross-repo change was deliberately handed to its owner.

No task commits were created because the parent explicitly prohibited git mutation for this slice.
