---
phase: 03-adopt-foundation-in-subprojects
plan: 06
subsystem: infra
tags: [minion_plugins, deferral, markdown-catalog, d-12, d-27, adoption-na]

# Dependency graph
requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig, @minion-stack/lint-config, @minion-stack/env, @minion-stack/cli"
  - phase: 03-adopt-foundation-in-subprojects
    provides: "D-12 escape clause (skip tsconfig/lint when no TS/JS exists) + D-27 deferral rules"
provides:
  - "Formal full-deferral record for minion_plugins (ADOPT-06 closed as N/A, ADOPT-07 N/A)"
  - "Infisical minion-plugins project state documented (0 secrets, placeholder)"
  - "Phase 8 revisit triggers captured (gains-TS or gains-secrets conditions)"
affects: [phase-08-polish, adopt-06, adopt-07, minion-doctor-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-deferral pattern for no-code subprojects — documented + committed + no subproject branch/PR"
    - "Three-signal evidence gathering for Infisical state (memory reference + backup file absence + repo structure)"

key-files:
  created:
    - .planning/phases/03-adopt-foundation-in-subprojects/03-06-CHECKPOINT.md
    - .planning/phases/03-adopt-foundation-in-subprojects/03-06-SUMMARY.md
  modified:
    - .planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md

key-decisions:
  - "minion_plugins fully deferred from Phase 3 adoption per D-27 — markdown+YAML catalog with zero TS/JS, zero Infisical secrets, no CI to gate"
  - "Task 1 checkpoint auto-resolved to empty via 3 independent signals (memory, backup-file absence, repo structure) — auto-mode selected Branch A"
  - "No subproject branch, no PR on NikolasP98/minion_plugins — there is literally nothing to change in the repo"
  - "minion doctor 'no @minion-stack/* installed' for plugins row is expected/correct, not drift"

patterns-established:
  - "No-code subproject deferral: checkpoint-probe → deferred-items entry → meta-repo commit only. Zero artifacts land in subproject."
  - "Revisit trigger clauses: explicit conditions (gains-TS OR gains-secrets) recorded in deferred-items for Phase 8 scoping"

requirements-completed: [ADOPT-06, ADOPT-07]

# Metrics
duration: 2min
completed: 2026-04-21
---

# Phase 03 Plan 06: minion_plugins Adoption Summary

**Full D-27 deferral of minion_plugins from Phase 3 adoption — markdown+YAML catalog with zero TS/JS/package.json and a 0-secret placeholder Infisical project means nothing exists to adopt. ADOPT-06 and ADOPT-07 closed as N/A with Phase 8 revisit triggers documented.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T02:43:37Z
- **Completed:** 2026-04-21T02:45:15Z
- **Tasks:** 2 (Task 1 checkpoint auto-resolved + Task 2A deferral execution)
- **Files modified:** 2 (1 created, 1 appended)
- **Files in minion_plugins/ modified:** 0 (by design — full deferral)

## Accomplishments

- **Task 1 checkpoint auto-resolved to "empty"** in auto mode, driven by three independent converging signals
- **Full D-27 deferral logged** in `deferred-items.md` with rationale, revisit conditions, and Phase 3 success-criteria impact
- **Zero changes to minion_plugins/** — the repo stays clean (it has nothing to adopt)
- **Phase 3 closes** with all 6 plans complete (5 with adoption PRs, 1 with documented deferral)

## Task Commits

1. **Task 1: Checkpoint (auto-resolved "empty")** — recorded in `03-06-CHECKPOINT.md`, committed alongside Task 2A
2. **Task 2A: Full deferral logged** — commit `1e4395f` — `docs(03-06): full deferral of minion_plugins adoption per D-27`

**Plan metadata:** (forthcoming — covers SUMMARY.md + STATE.md + ROADMAP.md updates)

## Files Created/Modified

- `.planning/phases/03-adopt-foundation-in-subprojects/03-06-CHECKPOINT.md` (new) — Task 1 checkpoint outcome record (auto-resolution, 3-signal evidence, Branch A selection)
- `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` (appended) — `## From Plan 03-06 (minion_plugins adoption)` section with "FULL DEFERRAL" entry
- `.planning/phases/03-adopt-foundation-in-subprojects/03-06-SUMMARY.md` (new, this file)

## Task 1 Checkpoint Outcome

**Resolution: "empty"** → Branch A (full deferral)

Three independent signals confirmed Infisical `minion-plugins` has ZERO secrets:

1. **Memory reference** (`reference_infisical_setup.md`): Table row for `minion-plugins` lists *"UUID: capture on first use"*, *"Secret count: 0"*, *"NEW — placeholder, UUID to capture via CLI/dashboard when Phase 3 plugins consume it"*
2. **Local backup directory** (`~/.infisical/secrets-backup/`): Contains backup files for all 5 projects that have ever been queried via CLI (minion-core, minion-gateway, minion-hub, minion-site, minion-paperclip). **No file for minion-plugins or minion-pixel-agents** — these projects have never been consumed.
3. **Repo structure** (`ls -la minion_plugins/`): No `package.json`, no `.ts/.tsx/.js` files, no `.github/workflows/`, no existing `.env*`. Pure markdown + YAML catalog.

### Probe attempts

- `node packages/cli/dist/index.js infisical plugins` — opens dashboard URL (CLI has no "list projects" command)
- `infisical secrets --projectSlug=minion-plugins --env=dev` — CLI rejects flag; requires `--projectId` UUID (which is unset because project has never been populated)
- `curl http://100.80.222.29:8080/api/v1/workspace` — 401 Token missing (no service token in session)

Per auto-mode critical rules: "Branch A is first option (recommended default)" + "If you can't determine the project ID, log as deferred and go Branch A." Auto-selected Branch A based on converging evidence.

## Deferral Branch Taken

**Branch A — FULL D-27 deferral**

- No files created in `minion_plugins/`
- No subproject branch on `NikolasP98/minion_plugins`
- No PR opened
- Meta-repo only: CHECKPOINT record + deferred-items entry + SUMMARY

### Why not Branch B (env-files-only partial adoption)?

Branch B requires Infisical `minion-plugins` to have ≥1 secret. It has 0. Adding an empty `.env.example` with no var names (or a placeholder `.env.defaults`) provides zero signal to future operators and only creates maintenance noise. D-27 explicitly allows full deferral in this case.

## Link-Drift Status for `plugins` Row

`node packages/cli/dist/index.js doctor` for the `plugins` row reports:

```
plugins       108               (...)  no @minion-stack/* installed
```

This is the **expected and correct state** per D-12:
- No `package.json` in minion_plugins → nothing to install
- No `@minion-stack/*` dependencies → `no @minion-stack/* installed` is accurate
- This is **NOT drift** — it's the baseline for a no-code subproject

## Phase 3 Impact on ADOPT-06 + ADOPT-07

| Requirement | Status | Rationale |
|-------------|--------|-----------|
| **ADOPT-06** (subproject adopts `@minion-stack/tsconfig` + `@minion-stack/lint-config`) | **CLOSED as N/A** for minion_plugins | Per D-12: no TS/JS code exists → nothing to configure. D-27 valid deferral candidate with explicit reason logged. |
| **ADOPT-07** (subproject's own CI passes) | **N/A** for minion_plugins | No CI workflow exists, no runtime to validate. Markdown+YAML catalogs have nothing to CI-gate beyond markdown lint (out of scope per §Pitfall 8). |

Both requirements remain SATISFIED across Phase 3 — the other 5 subprojects (minion, hub, site, paperclip, pixel-agents) each have adoption PRs. minion_plugins is the documented exception, per D-27's explicit allowance.

## Revisit Conditions (Phase 8 candidate)

Logged in `deferred-items.md`:

1. **If `minion_plugins` ever gains TypeScript/JavaScript code** → re-open ADOPT-06 and adopt `@minion-stack/tsconfig` (likely `library.json` variant) + `@minion-stack/lint-config`
2. **If Infisical project `minion-plugins` ever gains secrets** → add `.env.example` + `.env.defaults` at that time (partial adoption, tsconfig still N/A until trigger #1 fires)

Until one of those triggers: this subproject legitimately has nothing to adopt and should not be forced through the pipeline.

## Decisions Made

- **Branch A (full deferral) over Branch B (env-files-only)** — empty Infisical project means Branch B would ship empty placeholder files with no real var names. D-27 explicitly permits full deferral with rationale.
- **Three-signal evidence gathering** — rather than block on CLI auth to directly query Infisical, combined memory reference + local backup-file absence + repo structure. All three converge, overconstraining the conclusion.
- **Meta-repo main commit (not feature branch)** per D-25 — Phase 3 meta-repo changes land on main; only subproject adoption work uses feature branches. Since there's no subproject work here, main-only.

## Deviations from Plan

None — plan executed exactly as written.

The plan anticipated auto-mode handling for the `autonomous: false` checkpoint via the orchestrator's critical-rule guidance, and the Infisical probe converged cleanly on Branch A.

## Issues Encountered

**None.** Probe converged without ambiguity; no blockers.

**Minor observation (not an issue):** Infisical CLI v0.43.76 has no "list projects" command, so direct project enumeration isn't possible from the CLI. Three-signal approach compensates cleanly. Upstream fix not in scope.

## User Setup Required

None. Full deferral means no env files to populate, no dashboard config, no verification commands.

## Next Phase Readiness

- **Phase 3 CLOSES** with this plan — all 6 adoption plans complete (5 PRs + 1 documented deferral)
- **Phase 4 (fold minion-shared)** unblocked
- **Phase 8 (Polish) backlog** expanded:
  - Transitional `noUncheckedIndexedAccess` / `noImplicitOverride` removals (from 03-01, 03-02, 03-03, 03-04, 03-05)
  - `@minion-stack/lint-config@0.1.2` upgrade (`files` scoping for nested node_modules)
  - minion_plugins revisit (if/when it gains code or secrets)
- **`minion doctor --all`** reports plugins as "no @minion-stack/* installed" — correct per D-12; do NOT treat as drift

## Self-Check: PASSED

- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-06-CHECKPOINT.md` exists
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` modified (7 `minion_plugins` matches, FULL DEFERRAL present, ADOPT-06 + ADOPT-07 present)
- [x] `minion_plugins/.env.defaults` NOT created (by design)
- [x] `minion_plugins/.env.example` NOT created (by design)
- [x] Commit `1e4395f` exists: `git log --oneline -3` includes it
- [x] `git diff HEAD -- minion_plugins/` empty (no changes inside subproject)
- [x] `minion doctor` for plugins row reports expected "no @minion-stack/* installed"

---
*Phase: 03-adopt-foundation-in-subprojects*
*Completed: 2026-04-21*
