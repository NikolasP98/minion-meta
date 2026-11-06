# Feature Specification: Factory spec phase authors with Spec Kit

**Feature Dir**: `specs/009-factory-spec-kit-adoption` | **Repos & PR bases**: minion-factory → `dev`; minion-meta → `dev` (this spec)
**Created**: 2026-10-15 | **Status**: Draft | **Tags**: logic | **Human gates**: none (no security/data surface)
**Input**: Owner (verbatim, 2026-10-15): "make sure that spec kit is also used in the minion-base/factory PLEASE"

## AS-IS / TO-BE / DELTA (evidence)

**AS-IS.** The factory's spec phase (`minion-factory` `agent/spec.sh`) clones minion-meta at
`FACTORY_META_BRANCH`, and pass 1 prompts the planner (claude `-p` or `codex exec`) to "Write ONE new
file: specs/${SPEC_ID}.md — … YAML frontmatter exactly per specs/TEMPLATE.md" (`spec.sh:342-347`).
Pass 2 is a fresh reviewer that corrects the same file and writes `specs/${SPEC_ID}.review.md`
(`spec.sh:379-412`). A write allowlist (`require_exact_changes`, `spec.sh:66-100`) rejects any
changed or untracked path not named explicitly, so a Spec Kit feature directory would fail the
phase today. The develop phase receives only the flat spec text as `FACTORY_SPEC_CONTENT`
(`runner/src/index.ts:779`, `queue.ts:1274`, `agent/factory-develop.sh:51-53`). The agent image
exposes curated skills to both harnesses by symlinking `/opt/minion-skills/*` into
`~/.agents/skills` (codex) and `~/.claude/skills` (claude) (`agent/Dockerfile:63-69`); the
meta clone's own `.claude/skills/speckit-*` (meta #805) is visible to claude as project skills
but not to codex. The base dashboard's gates read the flat spec's frontmatter (unchanged here).

**TO-BE.** Pass 1 runs the Spec Kit workflow inside the meta clone with
`SPECIFY_FEATURE_DIRECTORY=specs/${SPEC_ID}` and produces `specs/${SPEC_ID}/spec.md`, `plan.md`,
`tasks.md` and `analysis.md`, then writes the flat `specs/${SPEC_ID}.md` per `TEMPLATE.md` as the
board-registered spec of record whose AS-IS/TO-BE/DELTA summarizes the directory and links it.
Pass 2 reviews both. The `/speckit-*` skills are visible to both harnesses. The develop phase
receives `plan.md` and `tasks.md` alongside the flat spec and is told to implement in task order.
All existing validations (allowlist, required files, index regeneration, sidecar verdict,
integrity test) still hold, extended to the directory.

**DELTA.** (1) `spec.sh`: codex skill exposure, pass-1 and pass-2 prompts, allowlist prefix
support, required files, `git add`. (2) `spec-integrity.test.sh`: directory-prefix cases.
(3) runner: fold `specs/<id>/plan.md` + `tasks.md` into the develop prompt when present.
(4) `factory-develop.sh`: "Spec Kit tasks" section + task-order instruction.
(5) `agent/skills/minion-factory-engineering/SKILL.md` §Spec: Spec Kit discipline. (6) README.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pass 1 produces Spec Kit artifacts plus the board spec (Priority: P1)
A proposal approved on the base board is sent to the spec phase; the planner produces
`specs/<id>/{spec,plan,tasks,analysis}.md` and `specs/<id>.md`; indexes regenerate; the phase
commits and pushes all of them.
**Acceptance**: Given an approved proposal, when pass 1 completes, then the four directory
artifacts and the flat spec exist, `require_exact_changes` passes, `spec-index --check` passes,
and the commit contains the directory.

### User Story 2 - Both harnesses can invoke `/speckit-*` (Priority: P1)
Whether the stage harness is claude or codex, the planner can invoke the skills.
**Acceptance**: Given `FACTORY_STAGES` selects codex for develop, when pass 1 runs, then
`~/.agents/skills/speckit-specify` resolves to the meta clone's skill.

### User Story 3 - Develop phase follows the task list (Priority: P2)
**Acceptance**: Given a spec commit that contains `specs/<id>/tasks.md`, when the develop
phase prompt is built, then it contains a "## Spec Kit plan and tasks" section with both
files and the instruction to implement in task order.

### Edge Cases
- Spec Kit skill missing from the clone (older meta branch): pass 1 must still produce the
  flat spec; the prompt says the directory is required only when the skills exist.
- Pass 2 reviewer edits a directory file: allowed, same prefix.
- `.specify/feature.json` is gitignored; the allowlist survey (`--untracked-files=all`) does not
  list ignored files, so it needs no entry.

## Requirements *(mandatory)*

- **FR-001** Pass 1 prompt instructs the Spec Kit sequence with `SPECIFY_FEATURE_DIRECTORY`
  pinned to `specs/${SPEC_ID}`, unattended clarify (answer from evidence, tag assumptions),
  and `analysis.md` written to the directory.
- **FR-002** Pass 1 still writes the flat `specs/${SPEC_ID}.md` with TEMPLATE frontmatter, whose
  AS-IS/TO-BE/DELTA links the directory; the proposal frontmatter edit is unchanged.
- **FR-003** `require_exact_changes` accepts an allowed entry ending in `/` as a path prefix.
- **FR-004** `require_files` for pass 1 includes `specs/${SPEC_ID}/spec.md`, `plan.md`, `tasks.md`.
- **FR-005** Pass 1 and pass 2 `git add` include the directory.
- **FR-006** Before pass 1, `spec.sh` symlinks `work/.claude/skills/speckit-*` into
  `~/.agents/skills/` (idempotent; skipped when absent).
- **FR-007** Runner folds `plan.md` and `tasks.md` from the spec commit into a new env
  `FACTORY_SPEC_TASKS` when present; develop prompt renders it with task-order instruction.
- **FR-008** Integrity test covers: untracked file under allowed prefix passes; file under
  another `specs/x/` prefix fails with the named note.
- **FR-009** Skill §Spec gains the Spec Kit discipline paragraph; README names the artifacts.

## Success Criteria *(mandatory)*
- **SC-001** `bash agent/spec-integrity.test.sh` passes with the new cases.
- **SC-002** Runner unit tests pass (`npm test` in `runner/`, or the targeted files).
- **SC-003** The next real spec run on the box produces a `specs/<id>/` directory in meta dev.

## Assumptions
- Board visibility continues through the flat spec until meta feature 008 ships (ASSUMPTION —
  owner to confirm that the dual artifact is acceptable in the interim).
- Image rebuild/publish is operator-owned (`scripts/publish-images.sh`, `self-update.sh`).
