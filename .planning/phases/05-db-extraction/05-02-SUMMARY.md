---
phase: 05-db-extraction
plan: 02
subsystem: database
tags: [drizzle-orm, libsql, turso, @minion-stack/db, schema-migration, better-auth, sveltekit]

requires:
  - phase: 05-01
    provides: "@minion-stack/db@0.2.0 published on npm with 38 schema files and src/ in files array"
  - phase: 04-fold-minion-shared
    provides: "feat/migrate-to-minion-stack-shared branch as base (shared package migration already applied)"

provides:
  - "minion_site consumes @minion-stack/db schema — no local schema files"
  - "6 import sites updated from local $server/db/schema to @minion-stack/db/schema"
  - "PR #4 open on NikolasP98/minion-site against master"
  - "bun run check: 0 errors confirmed"

affects: [05-03-hub-migration-cutover]

tech-stack:
  added: ["@minion-stack/db@0.2.0 (runtime dependency in minion_site)"]
  patterns:
    - "client.ts: import schema + relations from @minion-stack/db separately; spread allSchema for drizzle(); pass only schema to drizzleAdapter"
    - "Named table imports (userServers, deviceIdentities, etc.) resolved directly from @minion-stack/db/schema"
    - "Branch stacking: feat/consume-minion-stack-db stacked on feat/migrate-to-minion-stack-shared (Phase 4 shared migration must merge first)"

key-files:
  created: []
  modified:
    - minion_site/src/server/db/client.ts
    - minion_site/src/lib/auth/auth.ts
    - minion_site/src/hooks.server.ts
    - minion_site/src/routes/(app)/members/+layout.server.ts
    - minion_site/src/routes/api/device-identity/sign/+server.ts
    - minion_site/src/server/services/device-identity.service.ts
    - minion_site/package.json
    - minion_site/bun.lock
  deleted:
    - minion_site/src/server/db/schema/auth.ts
    - minion_site/src/server/db/schema/servers.ts
    - minion_site/src/server/db/schema/user-servers.ts
    - minion_site/src/server/db/schema/user-agents.ts
    - minion_site/src/server/db/schema/device-identities.ts
    - minion_site/src/server/db/schema/index.ts

key-decisions:
  - "Stacked on feat/migrate-to-minion-stack-shared instead of branching from master — Phase 4 shared migration is a prerequisite already committed on that branch"
  - "allSchema = {...schema, ...relations} passed to drizzle() for relational query API; only schema passed to drizzleAdapter (T-05-03 threat mitigation)"
  - "3 additional import sites found beyond plan's 2 (hooks.server.ts, +layout.server.ts, device-identity.service.ts) — all updated"

patterns-established:
  - "Pattern: SvelteKit consumers import named Drizzle tables directly from @minion-stack/db/schema; no local re-export needed"
  - "Pattern: drizzle() gets allSchema (schema+relations); drizzleAdapter gets only schema — never mix"

requirements-completed: [DB-03, DB-07]

duration: ~15min
completed: 2026-04-21
---

# Phase 05 Plan 02: minion_site DB Schema Migration Summary

**minion_site local schema deleted (6 files) and replaced with @minion-stack/db imports across 6 files; bun run check passes 0 errors; PR #4 open on minion-site.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-21T~16:35:00Z
- **Completed:** 2026-04-21
- **Tasks:** 2/2 complete
- **Files modified:** 8 (6 source + package.json + bun.lock); 6 deleted

## Accomplishments

- Deleted 6 local schema files from `minion_site/src/server/db/schema/` (auth, servers, user-servers, user-agents, device-identities, index)
- Installed `@minion-stack/db@0.2.0` as runtime dependency in minion_site
- Updated all 6 import sites to use `@minion-stack/db/schema` (found 3 additional sites beyond plan's estimate of 2)
- `bun run check` passes with 0 TypeScript errors
- PR #4 opened on NikolasP98/minion-site targeting master

## Task Commits

1. **Task 1: Install @minion-stack/db and delete local schema** — `051e9e1` (chore)
2. **Task 2: Update imports, verify type check, open PR** — `5d1a6e6` (feat)

## Files Created/Modified

- `minion_site/package.json` — Added @minion-stack/db@0.2.0 to dependencies
- `minion_site/bun.lock` — Updated with new dependency
- `minion_site/src/server/db/client.ts` — Import schema + relations from @minion-stack/db; allSchema for drizzle()
- `minion_site/src/lib/auth/auth.ts` — Import schema from @minion-stack/db/schema (only schema to drizzleAdapter)
- `minion_site/src/hooks.server.ts` — Import user + organization from @minion-stack/db/schema
- `minion_site/src/routes/(app)/members/+layout.server.ts` — Import userServers, userAgents, servers from @minion-stack/db/schema
- `minion_site/src/routes/api/device-identity/sign/+server.ts` — Import organization from @minion-stack/db/schema
- `minion_site/src/server/services/device-identity.service.ts` — Import deviceIdentities from @minion-stack/db/schema

**Deleted:**
- `minion_site/src/server/db/schema/auth.ts` — Stale subset of hub's auth tables (missing OIDC tables)
- `minion_site/src/server/db/schema/servers.ts`
- `minion_site/src/server/db/schema/user-servers.ts`
- `minion_site/src/server/db/schema/user-agents.ts`
- `minion_site/src/server/db/schema/device-identities.ts`
- `minion_site/src/server/db/schema/index.ts`

## Decisions Made

- **Branch stacking:** Created `feat/consume-minion-stack-db` from `feat/migrate-to-minion-stack-shared` (Phase 4 shared migration already committed there). The Phase 4 branch must be merged to master before this PR can cleanly merge without conflicts.
- **allSchema separation:** `drizzle()` receives `allSchema = {...schema, ...relations}` for full relational query API; `drizzleAdapter` receives only `schema` to avoid confusing Better Auth's schema detection (T-05-03 threat explicitly mitigated).
- **3 extra import sites:** Plan estimated 2 files to update (client.ts + auth.ts). Actual count was 6 (+ hooks.server.ts, +layout.server.ts, device-identity +server.ts, device-identity.service.ts). All updated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated 4 additional import sites beyond plan's 2**
- **Found during:** Task 2 (after deleting schema directory, grep revealed 6 broken imports not 2)
- **Issue:** Plan listed only client.ts and auth.ts as files to update. grep found 4 more: hooks.server.ts, +layout.server.ts, device-identity/sign/+server.ts, device-identity.service.ts — all importing named table exports from the deleted local schema
- **Fix:** Updated all 6 import sites to resolve from @minion-stack/db/schema
- **Files modified:** hooks.server.ts, +layout.server.ts, +server.ts, device-identity.service.ts
- **Verification:** bun run check exits 0 (no resolution errors)
- **Committed in:** 5d1a6e6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing import updates required for correctness)
**Impact on plan:** Essential fix — leaving 4 import sites broken would have failed bun run check. No scope creep.

## Issues Encountered

None — type check passed first attempt after updating all import sites.

## PR Details

- **PR URL:** https://github.com/NikolasP98/minion-site/pull/4
- **Branch:** feat/consume-minion-stack-db → master
- **Status:** Open
- **Note:** This PR is stacked on feat/migrate-to-minion-stack-shared (Phase 4). Merge Phase 4 PR first (PR #3 if open), or rebase this branch onto master before merging.

## Verification Results

1. `bun run check` — PASS (0 errors, 1 pre-existing a11y warning in LeadFormDialog.svelte — unrelated)
2. `grep -r "server/db/schema" minion_site/src/` — PASS (0 matches)
3. `grep -r "@minion-stack/db" minion_site/src/` — PASS (7 matches across 6 files)
4. PR open on NikolasP98/minion-site against master — PASS (PR #4)

## Known Stubs

None — all schema imports are fully wired to @minion-stack/db. No placeholder or mock data.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The drizzleAdapter threat (T-05-03) was explicitly mitigated: `auth.ts` passes `schema` (not `allSchema`) to drizzleAdapter. Confirmed in final code.

## Next Phase Readiness

- **Ready:** minion_site now consumes @minion-stack/db as single source of truth for all schema types
- **Plan 05-03** (hub migration cutover): uses Option B — hub keeps thin local re-export stubs pointing at @minion-stack/db. This plan (05-02) provides the consumer template that hub will follow.
- **Merge order:** Phase 4 shared PR must merge to minion-site master first, then this PR can merge cleanly.

## Self-Check: PASSED

Files verified:
- `minion_site/src/server/db/client.ts` — FOUND, contains @minion-stack/db imports
- `minion_site/src/lib/auth/auth.ts` — FOUND, contains @minion-stack/db/schema import
- `minion_site/src/hooks.server.ts` — FOUND, contains @minion-stack/db/schema import
- `minion_site/package.json` — FOUND, contains @minion-stack/db dependency
- `minion_site/src/server/db/schema/` — CONFIRMED DELETED

Commits verified:
- 051e9e1 — FOUND (chore: install + delete schema)
- 5d1a6e6 — FOUND (feat: migrate all imports)

bun run check: 0 errors confirmed

---
*Phase: 05-db-extraction*
*Completed: 2026-04-21*
*PR: https://github.com/NikolasP98/minion-site/pull/4*
