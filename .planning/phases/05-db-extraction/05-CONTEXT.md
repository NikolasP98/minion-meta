# Phase 5: DB Extraction — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Orchestrator-derived from session conversation and CLAUDE.md

<domain>
## Phase Boundary

Extract the 35+ Drizzle schema tables from `minion_hub/src/server/db/schema/` into a new
`packages/db/` workspace package published as `@minion-stack/db`. Both `minion_hub` and
`minion_site` become schema consumers only. Migration ownership transitions to the meta-repo
via a two-step staged cutover (staging dry-run → production flip).

This phase does NOT cover: auth extraction (Phase 6), WS consolidation (Phase 7), or any
changes to the gateway/channel system.

</domain>

<decisions>
## Implementation Decisions

### Package scope — LOCKED
- Package name: `@minion-stack/db` (NOT `@minion/db` — scope locked to `@minion-stack` in Phase 2 when `@minion` org was unavailable on npm)
- Published to npm under the `@minion-stack` org (owner: nikolasp98)
- Version: `0.1.0` initial release via Changesets

### Source of truth — LOCKED
- All 35+ Drizzle schema tables currently live in `minion_hub/src/server/db/schema/`
- `minion_site` currently has NO local schema (it is already consume-only via shared DB connection)
- Schema covers: agents, sessions, chat-messages, servers, channels, skills, reliability-events, missions, tasks, marketplace, workshop-saves, users, settings, and more
- Better Auth 1.4.19 schema tables are included in hub's schema — must be co-located or properly re-exported

### Database stack — LOCKED
- ORM: Drizzle ORM
- Local dev: SQLite file at `file:./data/minion_hub.db`
- Production: Turso (LibSQL)
- Both hub and site connect to the SAME database (shared DB, multi-tenant)
- `@minion-stack/db` exports: schema types, table definitions, migration runner helper

### Migration ownership strategy — LOCKED (two-step cutover)
- **Step 1 (Phase 5, plans 05-01..05-04):** `@minion-stack/db` holds schema types; `minion_hub` retains migration runner temporarily for safety. Hub still runs `db:push` during transition.
- **Step 2 (Phase 5, plan 05-05):** Meta-repo takes over `db:push` / migrations. Hub's `db:push` script removed or redirected.
- Rationale: Zero-risk cutover — never leave both runners active simultaneously.

### Consumer migration pattern — LOCKED
- `minion_hub` import change: `../schema/` → `@minion-stack/db`
- `minion_site` import change: wherever it imports DB types (likely via hub re-export or direct Turso client)
- Neither hub nor site should define schema tables after this phase
- minion_site was already consume-only; migration is expected to be minimal

### Staging gate — LOCKED
- A dry-run against a staging Turso DB (or SQLite clone) must pass before production cutover
- Dry-run validates: no data loss, no schema drift, all table counts match
- Production cutover is gated on staging dry-run success

### Build pattern — follow Phase 4 precedent
- `packages/db/` mirrors `packages/shared/` structure from Phase 4
- `tsconfig.json` extends `@minion-stack/tsconfig/library`
- Build: `tsc`
- Changeset: `"@minion-stack/db": minor` for initial `0.1.0`

### Scope correction for ROADMAP.md
- ROADMAP.md says `@minion/db` — this is a stale reference from before the scope lock
- Plans should use `@minion-stack/db` exclusively
- ROADMAP.md success criteria referencing `@minion/db` should be treated as `@minion-stack/db`

### Claude's Discretion
- Exact export API shape for `@minion-stack/db` (schema-only vs schema + connection factory)
- Whether to export a `createClient()` helper or leave connection setup to consumers
- Exact file layout within `packages/db/src/schema/` (one file per domain vs monolithic)
- Whether Better Auth tables get a separate sub-export path (e.g., `@minion-stack/db/auth`)
- pnpm workspace wiring for `packages/db`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema source
- `minion_hub/src/server/db/schema/` — all 35+ table definitions to copy verbatim
- `minion_hub/src/server/db/index.ts` — current DB client setup (Drizzle + LibSQL)
- `minion_hub/package.json` — current Drizzle/LibSQL dep versions to pin in `@minion-stack/db`

### Prior phase precedents
- `packages/shared/package.json` — exact structure to replicate for `packages/db`
- `packages/shared/tsconfig.json` — extends `@minion-stack/tsconfig/library`
- `.planning/phases/04-fold-minion-shared/04-01-SUMMARY.md` — Phase 4 workspace package creation pattern

### Meta-repo config
- `pnpm-workspace.yaml` — `packages/*` glob (db/ will be auto-included)
- `.changeset/config.json` — baseBranch main, access public

### Requirements
- `.planning/REQUIREMENTS.md` — DB-01..07 definitions
- `.planning/ROADMAP.md` — Phase 5 success criteria (note: `@minion/db` in roadmap = `@minion-stack/db`)

### Project instructions
- `./CLAUDE.md` — meta-repo orchestrator conventions
- `minion_hub/CLAUDE.md` — hub-specific conventions
- `minion_site/CLAUDE.md` — site-specific conventions

</canonical_refs>

<specifics>
## Specific Ideas

- Hub has 35+ tables — copy ALL verbatim, do not restructure at this phase
- Better Auth 1.4.19 creates its own tables (users, sessions, accounts, verifications) — these live in hub schema and must transfer
- Turso connection string env vars: `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN` (already in Infisical `minion-hub`)
- Local SQLite path: `file:./data/minion_hub.db` — the data file stays in hub; only schema types move
- `minion_hub/bun run db:push` is the current migration command; `bun run db:seed` seeds initial data
- Both hub and site use the same Turso DB in production — schema must be compatible for both consumers simultaneously

</specifics>

<deferred>
## Deferred Ideas

- Auth schema separation into `@minion-stack/auth` — Phase 6
- WS type extraction — Phase 7
- Automated migration CI — Phase 8 (Polish)
- Connection pooling / multi-DB support — post-M1

</deferred>

---

*Phase: 05-db-extraction*
*Context gathered: 2026-04-21 via orchestrator (session-derived)*
