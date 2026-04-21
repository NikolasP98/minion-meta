---
phase: 05-db-extraction
plan: 05
subsystem: database
tags: [drizzle-orm, drizzle-kit, turso, libsql, production-cutover, meta-repo]

requires:
  - phase: 05-04
    provides: "drizzle.config.ts at meta-repo root; A2=CONFIRMED; staging dry-run passed; checkpoint approved 2026-04-21"

provides:
  - "Hub migration scripts removed (db:push, db:generate, db:migrate, db:studio) from minion_hub/package.json"
  - "drizzle-kit devDep removed from minion_hub"
  - "minion_hub/drizzle.config.ts deleted"
  - "Production Turso push: 'No changes detected', exit 0 (2026-04-21)"
  - "PR #18 open on NikolasP98/minion_hub chore/remove-migration-scripts-step2"
  - "VERIFICATION.md written at .planning/phases/05-db-extraction/VERIFICATION.md — all DB-01..DB-07 satisfied"
  - "Phase 5 COMPLETE"

affects: [06-auth-extraction]

tech-stack:
  removed:
    - drizzle-kit devDep from minion_hub/package.json
    - minion_hub/drizzle.config.ts
  patterns:
    - "Hub retains db:seed (bun run src/server/seed.ts) — not a drizzle-kit script"
    - "Meta-repo is now the only migration runner: pnpm run db:push at AI/ root"
    - "Infisical: TURSO_DB_URL + TURSO_DB_AUTH_TOKEN added to minion-hub Infisical dev env"

key-files:
  deleted:
    - minion_hub/drizzle.config.ts
  modified:
    - minion_hub/package.json
    - minion_hub/bun.lock
  created:
    - .planning/phases/05-db-extraction/VERIFICATION.md

key-decisions:
  - "Production Turso push: 'No changes detected' — 0 DDL changes. Schema was already fully in sync (4 additive columns applied in staging verification during plan 05-04)"
  - "Hub PR #18 (chore/remove-migration-scripts-step2) open on NikolasP98/minion_hub targeting dev"
  - "Infisical: TURSO_DB_URL + TURSO_DB_AUTH_TOKEN added to minion-hub project (dev env) for minion sync-env hub workflow"

requirements-completed: [DB-05, DB-06, DB-07]

duration: ~10min
completed: 2026-04-21
---

# Phase 05 Plan 05: Migration Ownership Cutover + Production Push Summary

**Hub migration scripts removed (PR #18). Production Turso push: "No changes detected", exit 0. Phase 5 COMPLETE — all DB-01..DB-07 requirements satisfied. VERIFICATION.md written.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-21
- **Tasks:** 3/3 complete (Task 2 was checkpoint — approved by human per "approved — production cutover complete")
- **Files modified:** 3 (minion_hub/package.json, bun.lock modified; drizzle.config.ts deleted; VERIFICATION.md created)

## Accomplishments

- Removed migration scripts from `minion_hub/package.json`:
  - `db:push` (drizzle-kit push)
  - `db:generate` (drizzle-kit generate)
  - `db:studio` (drizzle-kit studio)
  - `drizzle-kit` devDependency
- Deleted `minion_hub/drizzle.config.ts`
- Hub's `db:seed` retained (runs `src/server/seed.ts` — not a drizzle-kit command)
- PR #18 opened on NikolasP98/minion_hub against `dev` branch
- Production Turso push confirmed: "No changes detected", exit 0 (human-verified 2026-04-21)
- Infisical: `TURSO_DB_URL` + `TURSO_DB_AUTH_TOKEN` added to minion-hub Infisical project (dev env)
- Wrote `VERIFICATION.md` documenting all DB-01..DB-07 requirements as satisfied

## Task 1: Hub Script Removal

**Hub PR #18:** https://github.com/NikolasP98/minion_hub/pull/18

**Branch:** `chore/remove-migration-scripts-step2` → dev

**Commit:** `a3f3f58` — chore: remove migration scripts — meta-repo takes ownership (Phase 5 Step 2)

**Verification:**
```bash
grep -c "drizzle-kit\|db:push\|db:generate\|db:migrate\|db:studio" minion_hub/package.json
# → 0 (no matches)
```

**Retained:**
- `db:seed` — hub-owned; seeds initial data via `bun run src/server/seed.ts`

## Task 2 (Checkpoint): Production Turso Push

**Human-verified 2026-04-21. Resume signal received: "approved — production cutover complete"**

**Result:**
```
> @minion-stack/root@0.0.0 db:push
> drizzle-kit push --verbose

No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/nikolas/Documents/CODE/AI/drizzle.config.ts'
[✓] Pulling schema from database...

[i] No changes detected
```

**Exit code:** 0

**DDL changes:** None. The 4 additive columns (user_id/tenant_id on workshop_saves/flows) that appeared in the local dev DB push (plan 05-04) were already present in production Turso. Zero schema drift.

**Infisical additions (during checkpoint):**
- `TURSO_DB_URL` added to minion-hub Infisical project dev env
- `TURSO_DB_AUTH_TOKEN` added to minion-hub Infisical project dev env
- `minion sync-env hub` will now include Turso credentials going forward

## Task 3: VERIFICATION.md

Written at: `.planning/phases/05-db-extraction/VERIFICATION.md`

All 7 requirements (DB-01..DB-07) documented as satisfied. Both assumption verdicts (A1=FAILED, A2=CONFIRMED) recorded. All 3 PR URLs recorded. Architecture decision notes for Option B augmented documented.

## Deviations from Plan

None — all tasks executed exactly as planned. Task 2 checkpoint approved on first pass.

## Threat Surface Scan

- **T-05-11 (Dual runner on prod Turso):** MITIGATED. Hub's db:push was removed before meta-repo ran against production. Physical ordering enforced.
- **T-05-12 (Production db:push fails):** MITIGATED. Staging gate (plan 05-04) confirmed zero drift. Production push result matched staging prediction: "No changes detected".
- **T-05-13 (TURSO_DB_AUTH_TOKEN in shell history):** ACCEPTED. Token now stored in Infisical; `minion sync-env hub` eliminates need to paste in shell going forward.

## Phase 5 Completion Summary

| Plan | Description | Status |
|------|-------------|--------|
| 05-01 | Create @minion-stack/db package (38 schema files, @0.2.0) | DONE |
| 05-02 | minion_site consumes @minion-stack/db (PR #4) | DONE |
| 05-03 | minion_hub consumes @minion-stack/db — Step 1 (PR #17) | DONE |
| 05-04 | Meta-repo drizzle.config.ts + staging dry-run (A2 CONFIRMED) | DONE |
| 05-05 | Production cutover + hub script removal (PR #18) + VERIFICATION.md | DONE |

**All DB-01..DB-07 requirements: SATISFIED**

**Phase 5: COMPLETE**

## Known Stubs

None. Hub retains local schema files (`src/server/db/schema/` — 38 files) for drizzle-kit reads only (Option B augmented constraint). This is intentional and documented in VERIFICATION.md.

## Self-Check: PASSED

Files verified:
- Hub `package.json` — drizzle-kit scripts removed (grep count = 0)
- `minion_hub/drizzle.config.ts` — DELETED
- `minion_hub/bun.lock` — updated
- `.planning/phases/05-db-extraction/VERIFICATION.md` — CREATED, 7 requirements documented

Commits verified:
- `a3f3f58` — chore: remove migration scripts (hub PR #18)
- VERIFICATION.md + 05-05-SUMMARY.md — to be committed at meta-repo

Production push: exit 0, "No changes detected" — CONFIRMED by human.

---
*Phase: 05-db-extraction*
*Completed: 2026-04-21*
*Production push: exit 0, zero DDL*
*Phase 5 status: COMPLETE*
