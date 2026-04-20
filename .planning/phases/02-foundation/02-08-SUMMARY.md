---
phase: 02-foundation
plan: 08
subsystem: docs
tags: [docs, onboarding, claude-md, readme, deprecation-shim, meta-repo, phase-close]
status: complete
completed_at: 2026-04-20
requirements-completed: [FOUND-10, FOUND-12]

# Dependency graph
dependency_graph:
  requires:
    - "@minion-stack/cli@0.1.0 published (02-06)"
    - "@minion-stack/env@0.1.0 published (02-05)"
    - "Infisical projects renamed to minion-<name> convention (02-07)"
  provides:
    - "Root CLAUDE.md with Meta-repo Workflow section (discoverable workflow doc for future sessions)"
    - "Root README.md onboarding quickstart (138 lines, under 200-line soft target)"
    - "infisical-dev.sh deprecation shim (5 lines, exits 1, no longer fetches secrets)"
    - "Phase 2 closure — ready for /gsd-verify-phase 2"
  affects:
    - "Phase 3 ADOPT-* plans (developer-facing docs now reflect meta-repo workflow)"
    - "Any new developer onboarding (README + CLAUDE.md are the entry points)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docs-only plan closure: no code changes, no publishes — three file edits + three atomic commits"
    - "Scope substitution (@minion → @minion-stack) applied throughout docs per 02-02 decision"

key-files:
  created:
    - README.md
    - .planning/phases/02-foundation/02-08-SUMMARY.md
  modified:
    - CLAUDE.md
    - infisical-dev.sh

decisions:
  - "Committed each task atomically (3 commits) instead of one combined close-out — aligns with GSD per-task-commit protocol; plan's original single-commit suggestion superseded by executor mandate"
  - "Used @minion-stack/* scope throughout (per 02-02-NPM-SCOPE-DECISION.md fallback) — plan authorized the substitution in its scope-switcher note"
  - "No changes required to the subproject map (per D12) — kept all 9 rows including ai-studio/ and docs/ symlinks"

metrics:
  duration_minutes: 8
  tasks_completed: 3
  commits: 3
  files_modified: 3
  lines_added: 426  # CLAUDE.md +283, README.md +138, infisical-dev.sh +5
  lines_removed: 21  # infisical-dev.sh old content
  readme_line_count: 138
  claude_md_final_line_count: 517
  shim_line_count: 5
---

# Phase 02 Plan 08: Phase-2 Documentation Close-Out Summary

**One-liner:** Three docs deliverables close Phase 2 — root CLAUDE.md gains a Meta-repo Workflow section, new 138-line README.md serves as onboarding quickstart, and infisical-dev.sh becomes a 5-line deprecation shim (FOUND-10 + FOUND-12 satisfied, Phase 2 ready for verification).

## Performance

- **Duration:** ~8 minutes (fast — three docs edits, zero code, zero infra)
- **Started:** 2026-04-20T20:16Z
- **Completed:** 2026-04-20T20:24Z
- **Tasks:** 3 of 3 (all autonomous)
- **Files modified:** 3 (CLAUDE.md, README.md new, infisical-dev.sh)
- **Commits:** 3 atomic (one per task) + push to origin/main

## Accomplishments

1. **CLAUDE.md** — Renamed header "OpenClaw Orchestrator Hub" → "Minion Meta-Repo Orchestrator Hub", updated intro paragraph to describe meta-repo + shared packages, inserted new **"Meta-repo Workflow"** section between the existing Project Map and Architecture Overview. The new section covers:
   - Core `minion` CLI commands (list, dev, build, test, check, status, doctor, sync-env, branch) with a command-purpose table
   - 6-layer env hierarchy (root defaults → minion-core Infisical → subproject defaults → minion-* Infisical → .env.local → shell)
   - Infisical Universal Auth setup pointers (env vars or `~/.config/minion/infisical-auth.json`)
   - Shared packages table (`@minion-stack/cli`, `/env`, `/tsconfig`, `/lint-config`) + future M3+ packages
   - Subproject independence note + link to design spec

   Subproject map and every downstream section untouched (per D12).

2. **README.md (NEW)** — 138-line onboarding quickstart at meta-repo root, well under the 200-line soft target and 250-line hard limit. Sections:
   - Intro (what the meta-repo is + design-spec link)
   - Prerequisites (Node 22+, pnpm 10+, bun, gh, infisical ≥0.33, git)
   - Quickstart (clone → `pnpm install` → install `@minion-stack/cli` → configure Infisical Universal Auth → `minion list` → optionally clone subproject repos → `minion doctor` → `minion dev hub`)
   - Commands reference (all 15 verbs + D9 exit-code map)
   - Env hierarchy (same 6 layers, numbered)
   - Registry pointer (minion.json + Ajv schema)
   - Shared packages table with versions
   - Subproject repo-link table (7 rows)
   - Contributing workflow (changesets, Phase 8 CI roadmap)
   - Links (spec, ROADMAP, REQUIREMENTS, CLAUDE.md)

3. **infisical-dev.sh → deprecation shim (5 lines)** per D11:
   ```bash
   #!/usr/bin/env bash
   # DEPRECATED: infisical-dev.sh has been absorbed into @minion-stack/env + @minion-stack/cli (Phase 2 FOUND-10).
   # See AI/README.md for migration steps.
   echo "⚠ infisical-dev.sh is deprecated. Use 'minion dev <subproject>' or 'minion sync-env <subproject>' instead. See AI/README.md." >&2
   exit 1
   ```
   Executable bit preserved. Running it emits the warning to stderr and exits 1 (confirmed with `bash infisical-dev.sh; echo $?` → `1`). File kept (not deleted) so users with shell aliases pointing at it see the deprecation message instead of "command not found" for one release cycle.

4. **I2 (ROADMAP Phase 2 success criterion #6)** — `pnpm exec changeset status` reports "NO packages to be bumped" at all three levels (patch/minor/major). All four Phase-2 packages (`@minion-stack/tsconfig`, `/lint-config`, `/env`, `/cli`) were released via `changeset publish` in their own plans (02-03, 02-04, 02-05, 02-06) — none queued. I2 verified.

5. **Phase 2 closure** — Three atomic commits (`5d78bce`, `adea47f`, `b79fec5`) pushed to `origin/main`. Working tree clean. Ready for `/gsd-verify-phase 2`.

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `5d78bce` | `docs(02-08): CLAUDE.md — meta-repo header + Meta-repo Workflow section` |
| 2 | `adea47f` | `docs(02-08): add root README.md — onboarding quickstart (138 lines)` |
| 3 | `b79fec5` | `docs(02-08): infisical-dev.sh — deprecation shim (per D11, FOUND-10)` |

Plan-closure metadata commit (STATE.md + ROADMAP.md + REQUIREMENTS.md + this SUMMARY.md) follows separately.

## CLAUDE.md diff summary

**Line 1 (header):** `# CLAUDE.md — OpenClaw Orchestrator Hub` → `# CLAUDE.md — Minion Meta-Repo Orchestrator Hub`

**Line 3 (intro paragraph):** Updated to describe the Minion meta-repo + shared `@minion-stack/*` packages + 7 independent subprojects.

**Inserted section (~50 lines)** between the "Always read the sub-project's CLAUDE.md" line and the "## Architecture Overview" heading:

```
## Meta-repo Workflow

The `minion` CLI (`@minion-stack/cli` npm package, binary `minion`) orchestrates every subproject with resolved env vars. Install once: `npm install -g @minion-stack/cli` (or `pnpm add -g @minion-stack/cli`).

### Core commands
... (command-purpose table) ...

### Env hierarchy (6 layers, lowest → highest precedence)
1. `AI/.env.defaults`
2. Infisical project `minion-core`
3. `<subproject>/.env.defaults`
4. Infisical project `minion-<name>`
5. `<subproject>/.env.local`
6. Shell `process.env`

### Shared packages (`@minion-stack/*`)
... (package-purpose table) ...

### Subprojects stay independent
... (independence note) ...

Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md).
```

**Everything else** (Project Map, Architecture Overview, Subproject Details, all command tables, deployment/env sections, Orchestration Guide, Cross-Project Impact Zones, Key Conventions, Environment variables) — untouched.

Final CLAUDE.md line count: 517 (was 234; +283).

## README.md outline

```
# Minion Meta-Repo                                             (title)
   intro paragraph + design-spec link                          (L1–L7)
## Prerequisites                                               (L9–L16)
## Quickstart                                                  (L18–L50)
## Commands                                                    (L52–L78)
## Env hierarchy                                               (L80–L91)
## Subproject registry (`minion.json`)                         (L93–L97)
## Shared packages                                             (L99–L110)
## Subprojects                                                 (L112–L124)
## Contributing                                                (L126–L133)
## Links                                                       (L135–L138)
```

Total: 138 lines. Under the 200-line soft target.

## Scope substitution (applied throughout)

Per the 02-08 plan's scope-switcher allowance ("substitute `@minion` with the fallback scope name if 02-02 locked one") and the authoritative decision in `02-02-NPM-SCOPE-DECISION.md`:

- Every `@minion/` → `@minion-stack/`
- Every `@minion` (without slash) → `@minion-stack`
- Install commands updated to `npm install -g @minion-stack/cli`
- Package-table rows list `@minion-stack/cli`, `@minion-stack/env`, `@minion-stack/tsconfig`, `@minion-stack/lint-config`

Unchanged (intentionally):
- `bin: minion` (CLI binary name stays `minion`)
- Product branding "minion" at root (meta-repo dir name, shell commands, infisical-project slugs `minion-*`)
- `.env.defaults` naming convention

## Decisions Made

1. **Atomic per-task commits instead of one combined close-out.** Plan's Task 3 suggested a single commit for all three files; GSD executor protocol mandates one commit per task. Made three commits (`5d78bce`, `adea47f`, `b79fec5`) — cleaner for verifier + traceability.

2. **Scope substitution @minion → @minion-stack applied consistently.** Per 02-02 lock, `@minion` was unavailable on npm and the project was cascaded to `@minion-stack` (dedicated org). Updated all docs references.

3. **Kept `ai-studio/` and `docs/` rows in the subproject map.** D12 mandates "KEEP its subproject map" without restricting which rows. Per the existing CLAUDE.md, both rows are symlinks (per `.gitignore` L108–L110) pointing at `~/Documents/VAULT/MINION/*`. Leaving them preserves the map's full scope; future docs-restructure can remove them if needed.

## Deviations from Plan

None qualifying for Rule 1/2/3/4 deviation flags. Three minor executor-level adjustments:

1. **Per-task commits (3) instead of single close-out commit.** Plan's Task 3 action block suggested one combined commit; executor protocol mandates one commit per task. Applied the mandate — one commit per task.

2. **Scope literal substitution.** Plan's source text used `@minion/*`; substituted to `@minion-stack/*` throughout CLAUDE.md and README.md per 02-02 scope decision. Plan explicitly allowed this in Task 2's bracketed instruction.

3. **Subproject-map rows retained unchanged.** D12 says "keep subproject map"; plan did not require trimming or editing any map rows, so left all 9 rows exactly as authored. No deviation.

## Authentication Gates

None. No Infisical, npm, or GitHub auth required for this plan — docs-only, no publishes. Push to `origin/main` succeeded on existing credentials (gateway was open).

## Issues Encountered

None. Clean execution.

## Known Stubs

None. README.md is a complete onboarding doc; CLAUDE.md Meta-repo Workflow section documents current-state commands (all implemented in 02-06); shim is a complete deprecation message. No placeholders.

## Threat Flags

None. Plan produced three docs artifacts with no new attack surface. Shim writes nothing, executes nothing beyond `echo` + `exit 1`.

## Requirements Completed

- **FOUND-10:** "Existing `infisical-dev.sh` logic is absorbed into `@minion/env`; the old script is deprecated with a shim that prints a deprecation notice" — **SATISFIED**. Shim in place, exits 1, points to `@minion-stack/env` + `@minion-stack/cli` replacements.
- **FOUND-12:** "Root `CLAUDE.md` updated to document the new meta-repo workflow; meta-repo `README.md` describes onboarding" — **SATISFIED**. CLAUDE.md Meta-repo Workflow section added; README.md created at 138 lines.

FOUND-01 (frontmatter references) was already satisfied by prior Phase 2 work (meta-repo git repo + remote) — this plan did not need to re-satisfy it. Listed in plan frontmatter for traceability.

## Next Phase Readiness

- **Ready for `/gsd-verify-phase 2`** — all 12 FOUND-* requirements satisfied, all four `@minion-stack/*` packages released, zero pending changesets, docs complete.
- **Ready for Phase 3 ADOPT-*** — subprojects can now adopt `@minion-stack/tsconfig`, `@minion-stack/lint-config`, and ship `.env.defaults` + `.env.example`.
- **Deferred items remaining for Phase 02 (carried forward to later phases):**
  - Infisical CLI `--projectSlug` flag drift in `@minion-stack/env` (tracked in `deferred-items.md`; suggested fix: re-check `infisical secrets --help`, patch wrapper, bump env package to 0.1.1)
  - Voice-call smoke test (user deferred 2026-04-20)

---
*Phase: 02-foundation*
*Completed: 2026-04-20T20:24Z*

## Self-Check

**Files verified on disk:**

- FOUND: CLAUDE.md (modified, 517 lines)
- FOUND: README.md (created, 138 lines)
- FOUND: infisical-dev.sh (replaced, 5 lines, executable)
- FOUND: .planning/phases/02-foundation/02-08-SUMMARY.md (this file)

**Commits verified in git log:**

- FOUND: `5d78bce` — Task 1 CLAUDE.md
- FOUND: `adea47f` — Task 2 README.md
- FOUND: `b79fec5` — Task 3 infisical-dev.sh shim

**Pushed to origin/main:**

- FOUND: HEAD == origin/main (verified with `git rev-parse`)

**I2 Phase-level verification:**

- FOUND: `pnpm exec changeset status` reports "NO packages to be bumped" at patch/minor/major

## Self-Check: PASSED
