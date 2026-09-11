---
phase: 15-data-pipelines
plan: "04"
status: inventory_and_drift_gate_shipped_conflicts_open
requirements_completed: []
---

# Migration authority inventory and drift gate

Branch `feat/qc-migration-authority-handoff-ledger`, private worktree `/home/nikolas/.cache/claude-tmp/meta-15-04-18-03`, base `origin/dev` @ `8be40586a58f2b94dd0fbd954273de150d4cda3c`.

## Requirements completed

None. DATA-02 requires every discovered conflict to be independently resolved by an owned child plan and re-verified; this plan is the admission gate (per `closure_policy`), not the closure. It ships real, fresh evidence and a fail-closed preflight — nothing here is a report-only success standing in for a fix.

## What was built

- `scripts/qc/migration-authority.mjs` — read-only filesystem inventory of six known migration trees (`hub-legacy-drizzle`, `packages-db-legacy-drizzle`, `hub-supabase`, `meta-root-supabase`, `gateway-sqlite`, `paperclip-postgres`), grouped by a `schemaGroup` sharing hypothesis. Detects (a) two present trees in one schema group with a divergent hash for the same filename, (b) two independently-numbered sequential trees claiming the same schema group even with no filename collision ("two writers, same prefix"), and (c) a declared table with no `CREATE TABLE <name> (` in any inventoried tree for its schema group — distinguished from "no tree present to check" (`unavailable-environment`). Never opens a network or database connection; `checkAppliedCatalogAvailability()` always reports `available:false` and only echoes which env-var *names* are set, never their values.
- `scripts/qc/migration-drift-gate.mjs` — recomputes the inventory fresh on every run (never trusts a cached document) and fails closed (`--check` exits 1) on any duplicate-authority conflict or verified-absent schema gap. Without `--check`, writes `15-MIGRATION-GAPS.md` naming an owner and "create a bounded child PLAN … do not apply, stamp or delete any migration" for every conflict, and explicitly states it does not close DATA-02.
- `.planning/phases/15-data-pipelines/15-MIGRATION-AUTHORITY.md`, `15-MIGRATION-GAPS.md` — generated from a real run against the live checkout (see Commands).

## Real findings (evidence, not simulation)

Run with `--root /home/nikolas/Documents/CODE/MINION` (read-only filesystem read of the actual subprojects; no mutation):

- **legacy-libsql two-writer collision (real, pre-existing):** `minion_hub/drizzle/` and `packages/db/drizzle/` are both consumed by `@minion-stack/db/schema` (imported by both `minion_hub` and `minion_site`) against the same Turso/LibSQL physical DB. They share identical files `0000`…`0011`, then diverge: `minion_hub/drizzle` continues `0012_user_alias_role.sql … 0016_user_identity_user_provider.sql`, while `packages/db/drizzle` continues `0012_drop_personal_agents_display_name.sql`, `0012_workspace_membership.sql`, `0013_drop_personal_agents_personality.sql`, `0013_join_requests.sql`, `0014_perf_indexes_events_bugs.sql`, `0015_drop_dead_event_indexes.sql`. Two independent writers picked the same next migration number for different content — a genuine duplicate authority, flagged 4 times (prefixes `0012`–`0015`).
- **hub-postgres divergent hash (real, pre-existing):** `minion_hub/supabase/migrations/` and the meta-root `supabase/migrations/` (target of `packages/db/drizzle.pg.config.ts`'s `out: ../../supabase/migrations`, linked to Supabase project `gxvsaskbohavnurfvshr` via the root `supabase/config.toml`) share exactly 3 filenames — `20260610180600_pending_channel_claims.sql`, `20260611003100_org_areas.sql`, `20260611005800_org_areas_integrations.sql` — and all 3 have **different SQL bodies** under the identical timestamp filename (confirmed independently via `diff`). `minion_hub/supabase/migrations/` has no local `config.toml`, so which Supabase project it actually targets is unconfirmed from source alone — recorded as an authority gap, not assumed.
- **Schema gaps, corrected from memory:** the prior QC note claimed `organizations`, `flows`, `organization_members`, `member_roles` have no `CREATE` anywhere. A first regex pass (matching any `create table … <name>` including inside a 1000+-char statement body) produced a **false positive**: it counted a `references public.organizations(id)` foreign-key clause inside an unrelated `create table org_areas (...)` as "creating" `organizations`. Tightened to require the table name be the immediate `CREATE TABLE [IF NOT EXISTS] [schema.]<name> (` target (regression test added). Correct, verified result: **`organizations`, `flows`, `organization_members` are genuinely absent** from every inventoried migration file; **`member_roles` is NOT** — it is created in `supabase/migrations/20260625190000_permissions_framework.sql`. The prior claim was 3-for-4, not 4-for-4.

## Commands and results

```
node --test scripts/qc/migration-authority.test.mjs scripts/qc/migration-drift-gate.test.mjs   # 15/15 pass (9 + 6)
node --test scripts/qc/*.test.mjs                                                               # 26/26 pass, all three new suites together
node --test scripts/qc/                                                                          # FAILS: bare-directory form throws MODULE_NOT_FOUND on Node v22.23.2
                                                                                                   # (matches the known "dir-form node --test" gotcha) — use the explicit-file
                                                                                                   # or glob form above as the real gate, not this literal command.
node scripts/qc/migration-authority.mjs --root /home/nikolas/Documents/CODE/MINION
  → {"root":"...MINION","trees":6,"present":6,"duplicateAuthorities":7,"schemaGaps":3}, exit 0
node scripts/qc/migration-drift-gate.mjs --root /home/nikolas/Documents/CODE/MINION
  → {"wrote":".planning/.../15-MIGRATION-GAPS.md","pass":false,"failures":10}, exit 0 (write mode)
node scripts/qc/migration-drift-gate.mjs --check --root /home/nikolas/Documents/CODE/MINION
  → {"pass":false,"failures":10}, exit 1  — fails CLOSED on real, currently-unresolved conflicts. Correct behavior, not a bug.
node scripts/qc/migration-authority.mjs / migration-drift-gate.mjs --check   (no --root, i.e. against this worktree alone)
  → present:2 (only packages/db/drizzle + root supabase/migrations are tracked in origin/dev; hub/site/paperclip
     checkouts are gitignored subprojects, absent here by design), schemaGaps:3 (organizations/flows/organization_members
     reproduce even from committed dev content alone), duplicateAuthorities:0 (only one tree per group present here).
     drift-gate --check exits 1 — same genuine gaps, evidence-consistent with the full-repo run.
```

## Files and hashes (exact, this worktree)

| File | SHA-256 |
|---|---|
| `scripts/qc/migration-authority.mjs` | `b61d0d21553a59e0d2585cc864b95c64bb612b28644508e2bb2c88496193ddc5` |
| `scripts/qc/migration-authority.test.mjs` | `357e70b6996d3e601375fe3a32602da01e1064fb18de7cb6ff5334a8f214a4bb` |
| `scripts/qc/migration-drift-gate.mjs` | `43445f84aed65393836ebeeb76d0400e9ffb0e29c30d3443d2614c312097c02c` |
| `scripts/qc/migration-drift-gate.test.mjs` | `8e09333f23105067dc592b9de467616375adac3895d15f427944867b4c20d6b6` |
| `.planning/phases/15-data-pipelines/15-MIGRATION-AUTHORITY.md` | `c81098c3eff26bd342057675372e767382e5fd2ee71dfa036e62401dbef05955` |
| `.planning/phases/15-data-pipelines/15-MIGRATION-GAPS.md` | `944eff012aedb0aa04b46a1cad4af93d7b21af77dde4aa770207eb63f073620e` |

## Evidence limits / what this plan does NOT establish

- **No applied-migration catalog was read.** Per program boundary (no network, no database connections in this task), `checkAppliedCatalogAvailability()` is filesystem-only by construction and always reports `available:false`. Whether the divergent-hash files were actually both applied to production, or which one "won", is unverified. This is the literal "distinguishes verified catalog from unavailable environment" behavior the plan requires — it is an honest gap, not a pass.
- **No migration was applied, stamped, deleted or reconciled.** `migration-drift-gate.mjs` only ever reads and reports.
- **`minion_hub/supabase/migrations/` project identity is unconfirmed** — no local `config.toml` links it to a specific Supabase project; it is plausible, not proven, that it targets `gxvsaskbohavnurfvshr` (the meta-root's linked project).
- **10 conflicts remain genuinely open** (4 legacy-libsql prefix collisions, 3 hub-postgres divergent-hash files, 3 hub-postgres schema gaps). `15-MIGRATION-GAPS.md` names an owning repo/CLAUDE.md for each and states the exact next step ("create a bounded child PLAN … selecting ONE authority"); none of those child plans were created, added to ROADMAP, or executed here — per boundary, root owns ROADMAP admission and this task does not fabricate authority to pick a winning tree or delete a migration.
- **`pnpm run lint-all` was not run.** `scripts/qc/` is plain ESM outside any pnpm workspace package (root `package.json` has no bare `lint` script; `lint-all` fans out to `pnpm -r --parallel --if-present run lint` across workspace packages only) and there is no `node_modules`/`oxlint` in this worktree. Running `pnpm install` to obtain it is an install, which this task's boundary forbids. Recorded as not-applicable / not-run rather than assumed clean.

## Open items

- `TODO(handoff)`-style open end (not placed in source, since this plan owns no source file outside `scripts/qc/`): the 4 legacy-libsql prefix collisions and 3 hub-postgres divergent-hash files each need one bounded child PLAN, admitted to ROADMAP by root, selecting a single authority and adding a disposable migration test — tracked in `15-MIGRATION-GAPS.md` items 1–7.
- The 3 schema gaps (`organizations`, `flows`, `organization_members` — hub-postgres) need the same treatment — tracked in `15-MIGRATION-GAPS.md` items 8–10.
- Applied-catalog verification (which hash actually landed in production for the 3 divergent hub-postgres files) requires live, credentialed DB access this task does not have. Next gate: a plan with explicit read-only DB credential authority.
- DATA-02 stays open per `closure_policy` until every one of the above executes and is independently verified.
