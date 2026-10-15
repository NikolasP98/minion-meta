# Implementation Plan: Spec Index / Spec Kit Directory Bridge

**Branch**: `008-spec-index-speckit-bridge` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-spec-index-speckit-bridge/spec.md`

## Summary

`scripts/spec-index.mjs` only scans top-level `specs/*.md`, so a Spec Kit feature directory
(`specs/<NNN>-<slug>/spec.md`) is invisible to the board until an agent hand-authors a
redundant top-level stub — a rule the constitution currently mandates as a bridge. This plan
widens the existing scan/validate/project loop to also read `specs/*/spec.md`, using the
directory name as `id` (research.md Decision 2), adds a derived `path` field so the board can
link directory rows correctly (Decision 4), adds a parallel heading-lint contract shaped for
Spec Kit's own body (Decision 3), pre-fills new `spec.md` files with compliant frontmatter at
the template level (FR-005), and retires the now-unnecessary stub instruction from the
constitution and `AGENTS.md` (FR-013). The approach is additive widening of one existing
loop, not a rewrite — chosen specifically to keep the 286-spec existing corpus's behavior
byte-identical (SC-002).

## Technical Context

**Language/Version**: Node.js, ESM (`.mjs`) — matches `scripts/spec-index.mjs`; Node 22+ (CI
pins `node-version: 22` in `.github/workflows/ci.yml`).

**Primary Dependencies**: None — zero-dependency script today (only `node:fs`/`node:path`/
sibling `.mjs` imports); this feature introduces no new dependency (research.md Decision 1).

**Storage**: N/A. Reads Markdown files under `specs/`; writes the single committed
`specs/index.json`. No database.

**Testing**: `node --test scripts/*.test.mjs` (`pnpm run test:scripts`), extending the
existing `scripts/spec-index.test.mjs` CLI-fixture harness (temp git repos, see research).

**Target Platform**: GitHub Actions `ubuntu-latest` (CI) and any contributor shell (local) —
unchanged from today.

**Project Type**: Single build-script / CLI tool. The plan template's Option 1/2/3 structure
(src/services/cli, frontend/backend, mobile+API) does not fit a one-file Node script; see
`research.md` §5 and `sdd-notes.md` §3 for the template-fit gap this surfaced.

**Performance Goals**: N/A (not latency-sensitive; shares CI's 10-minute job budget with
every other `verify` step, not a dedicated budget).

**Constraints**: Stay zero-dependency; zero byte-level change to any existing top-level
`specs/index.json` row (SC-002); `assertProjectionCoverage()` must keep failing loudly on any
field mismatch it already catches today (FR-006).

**Scale/Scope**: 286 existing top-level specs + this feature's own directory (currently the
only Spec Kit directory in the corpus, as of this research pass).

## Constitution Check

*GATE: Evaluated against `.specify/memory/constitution.md` v1.0.0, both before Phase 0 and
re-checked after Phase 1 design below — no changes to the verdicts between passes.*

| Principle | Verdict | Evidence |
|---|---|---|
| I. Spec before code (NON-NEGOTIABLE) | **PASS** | This plan follows `spec.md` (already written) and precedes `tasks.md`/implementation; no code has been touched in producing this plan. |
| II. AS-IS → TO-BE → DELTA, with evidence | **PASS, with a named gap** | AS-IS/TO-BE/DELTA mapping is below in this section (the Spec Kit `plan-template.md` has no dedicated section for it, so it is added here rather than omitted — see `sdd-notes.md` §3/§4 for the template-fit note). Every DELTA row cites a FR and the fixture/test that proves it (FR-012, SC-002/SC-003). The one unverified claim is flagged explicitly in Assumption 1 below (Spec Kit template customization durability) rather than stated as fact. |
| III. Slice-scoped delivery | **PASS, with an open question** | Tasks (next phase) are sized slice-scoped (see Project Structure below — one script + one template + two docs + test fixtures, decomposable into independently-shippable slices). The repository's registered PR base for `minion-meta` could not be confirmed with certainty in this worktree: `node scripts/repo-policy.mjs show minion-meta` failed here with `ERR_MODULE_NOT_FOUND: ajv` (the `node_modules` symlink used for read-only exploration does not resolve every transitive dependency `repo-policy.mjs` needs). Taken from `.github/workflows/ci.yml` instead (`pull_request`/`push` on `[main, dev]`) plus this worktree's own `git status` (current branch `dev`, "Main branch... main"): **ASSUMPTION — owner to confirm** — feature branches target `dev` as the integration branch for minion-meta, same convention as every CLI-registered subproject's dev branch in the Project Map. |
| IV. Required build steps are spec requirements | **PASS (not applicable)** | No hub/site UI, no new route/endpoint/nav link, no user-facing string — this feature touches only meta-repo tooling (`scripts/`, `.specify/templates/`, `.specify/memory/constitution.md`, `AGENTS.md`). |
| V. Security and data work keeps human gates | **PASS (not applicable)** | Not security/data tagged (spec.md Assumptions, confirmed against `specs/topics.json`'s `security`/`data`/`permissions`/`auth`/`migrations` topics — none apply; `infra` is the only tag, and its `requiredEvidence: ["self-test"]` is satisfied by FR-012's test fixtures). |

### AS-IS → TO-BE → DELTA (Principle II)

**AS-IS** (verified, with anchors):
- `scripts/spec-index.mjs` line ~623 scans only `readdirSync('specs').filter(f =>
  f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))` — directories are
  invisible to the scan (confirmed by reading the loop directly; no directory-handling branch
  exists anywhere else in the file's 836 lines).
- `specs/index.json` currently has 286 rows, zero of which have a `path` field (confirmed:
  `python3 -c "import json; d=json.load(open('specs/index.json')); print(any('path' in s for
  s in d['specs']))"` → `False` during this research pass).
- `.specify/memory/constitution.md`'s "Artifact layout and registration" section and
  `AGENTS.md`'s "Spec-driven workflow (Spec Kit)" section both currently instruct creating a
  top-level stub spec per Spec Kit feature (quoted verbatim in `spec.md`'s feature
  description and User Story 4).
- `.specify/templates/spec-template.md` currently has no YAML frontmatter block — it starts
  directly with `# Feature Specification: [FEATURE NAME]` (confirmed by reading the file in
  full; 131 lines, no `---` fence anywhere).
- `node scripts/spec-index.mjs --check` passes today against the unmodified 286-spec corpus
  (`spec-index --check passed: 286 specs, specs/index.json up to date`, run during this
  research pass) — the baseline this feature must not regress.

**TO-BE** (desired, with invariants):
- The scan covers both sources; every validation rule that applies to a top-level spec
  applies identically (same error vocabulary) to a directory spec, with one exception by
  design: the heading-lint contract is shaped differently (Decision 3), because the two body
  shapes cannot both satisfy one regex set without forcing an artificial heading onto one of
  them.
- `specs/index.json`'s 286 existing rows are byte-identical after the change when no
  directory spec exists in a given run (invariant proven by running `--check` before/after on
  the unmodified corpus — SC-002).
- Every new `spec.md` created via `/speckit-specify` is accepted by the gate without manual
  frontmatter authoring (SC-001).
- Neither the constitution nor `AGENTS.md` instructs stub creation any longer (SC-004).

**DELTA** (numbered transitions, each slice-scoped and test-proven):

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Scan loop widened to also walk `specs/*/spec.md`, directory-skip-if-absent | Slice 1 | FR-012(a), FR-012(e) fixtures |
| D2 | `id` comparison uses directory name for directory specs | Slice 1 | FR-012(b) fixture |
| D3 | Cross-source duplicate-id detection (no new code, per research Decision 1) | Slice 1 | FR-012(d) fixture |
| D4 | `path` derived field added to `DERIVED_INDEX_FIELDS`, projected only for directory rows | Slice 1 | FR-012(g) fixture + `assertProjectionCoverage()`'s existing self-check |
| D5 | Parallel Spec-Kit-shaped heading-lint contract (`REQUIRED_SPEC_KIT_HEADINGS`) | Slice 2 | FR-012(f) fixtures (pass + fail cases) |
| D6 | `.specify/templates/spec-template.md` gains TEMPLATE.md frontmatter block | Slice 3 | FR-012 equivalent at the template level — a fresh `/speckit-specify` run's output is accepted by Slice 1's gate with zero manual edits (User Story 3's Independent Test) |
| D7 | Constitution + AGENTS.md stub instruction removed, directory scanning documented instead | Slice 4 | Grep-verifiable (SC-004); no automated test — a documentation-only transition |
| D8 | `scripts/spec-index.test.mjs` fixtures for D1-D5 | Slice 1 & 2 (co-delivered with the code they prove) | `pnpm run test:scripts` green |

Every FR in `spec.md` maps to exactly one DELTA row above (cross-checked manually during this
plan: FR-001/002/003/004 → D1-D3; FR-005 → D6; FR-006/007 → D4; FR-008/009 → D5; FR-010/011 →
proven by the "byte-identical on unmodified corpus" invariant, not a separate code change;
FR-012 → D8; FR-013 → D7; FR-014 → proven by *not* touching `proposal-index.mjs` or
`repo-policy.yaml` in any slice). No FR is unmapped; no DELTA row lacks an FR.

## Project Structure

### Documentation (this feature)

```text
specs/008-spec-index-speckit-bridge/
├── spec.md              # Feature spec (this feature's /speckit-specify output)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this plan)
```

No `contracts/` directory: this feature exposes no external interface (API, CLI flag
contract, UI). Its "interface" is the shape of a committed JSON file and a set of error
messages, both already fully specified by `data-model.md` and `spec.md`'s acceptance
scenarios — a `contracts/` directory would duplicate those without adding information, and
the plan skill explicitly permits skipping it for a purely internal build-script change.

### Source code (repository root, existing paths — modified, not created, except where noted)

```text
scripts/
├── spec-index.mjs           # MODIFIED: widened scan loop (D1-D4), new heading-lint branch (D5)
├── spec-index.test.mjs      # MODIFIED: new fixtures (D8)
└── spec-frontmatter.mjs     # UNCHANGED (STAGES/STATUSES/VERDICTS/parseFrontmatter untouched —
                              # confirmed no new enum value is needed; Spec Kit's body-level
                              # status text is never parsed as frontmatter, per Clarifications Q2)

.specify/templates/
└── spec-template.md         # MODIFIED: frontmatter block prepended (D6)

.specify/memory/
└── constitution.md          # MODIFIED: "Artifact layout and registration" section rewritten (D7)

AGENTS.md                    # MODIFIED: "Spec-driven workflow (Spec Kit)" section rewritten (D7)
```

**Structure Decision**: No new files or directories in `scripts/` or `.specify/` — every
change is a modification of an existing file, consistent with "additive widening of one
loop," not a new subsystem. This is the Spec Kit plan template's "purely internal tool"
case; none of its three offered project-structure options (single project w/ src/services,
web app frontend+backend, mobile+API) apply, and forcing the plan into one of them would add
fictional directories this feature never creates (see `sdd-notes.md` §3).

## Complexity Tracking

*No entries.* The Constitution Check above has no unjustified violation — Principle III's
open question is a fact-finding gap (which PR base to target), not a constitutional
violation, and is already flagged as an owner-confirm assumption rather than worked around.
