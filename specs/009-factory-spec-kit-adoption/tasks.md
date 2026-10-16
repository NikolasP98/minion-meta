# Tasks: Factory spec phase authors with Spec Kit

**Input**: `spec.md`, `plan.md` | **Repo**: minion-factory (`dev`) unless noted

## Phase 1: Gates & prerequisites
- [X] T001 Spec and plan written (this directory). No owner gate: not security/data tagged.
- [X] T002 Worktree `feat/spec-kit-spec-phase` off `origin/dev` of minion-factory.

## Phase 2: Spec phase (US1, US2)
- [X] T003 `agent/spec.sh`: `require_exact_changes` — an allowed entry ending in `/` matches by prefix. (FR-003)
- [X] T004 `agent/spec.sh`: after clone, symlink `work/.claude/skills/speckit-*` into `~/.agents/skills/` idempotently. (FR-006)
- [X] T005 `agent/spec.sh`: pass-1 prompt — Spec Kit sequence with `SPECIFY_FEATURE_DIRECTORY=specs/${SPEC_ID}`, unattended clarify, `analysis.md`, then the flat spec linking the directory. (FR-001, FR-002)
- [X] T006 `agent/spec.sh`: pass-1 and pass-2 allowlists include `specs/${SPEC_ID}/`; pass-1 `require_files` adds `spec.md`, `plan.md`, `tasks.md`; both `git add` the directory. (FR-004, FR-005)
- [X] T007 `agent/spec.sh`: pass-2 prompt reviews the directory too and may correct it.
- [X] T008 `agent/spec-integrity.test.sh`: prefix pass case + foreign-prefix fail case with named note. (FR-008)

## Phase 3: Develop phase (US3)
- [X] T009 `runner/src/index.ts`: at spec intake, also fetch `specs/<id>/plan.md` and `tasks.md` at `specCommitSha` (missing ⇒ empty); persist beside `spec.md` as `spec-tasks.md`. (FR-007)
- [X] T010 `runner/src/queue.ts` + `containers.ts`: pass `FACTORY_SPEC_TASKS` to the develop container. (FR-007)
- [X] T011 `agent/factory-develop.sh`: render "## Spec Kit plan and tasks" + task-order instruction when set. (FR-007)

## Phase 4: Docs
- [X] T012 `agent/skills/minion-factory-engineering/SKILL.md` §Spec: Spec Kit discipline. (FR-009)
- [X] T013 README: spec phase artifacts and the codex skill exposure. (FR-009)
- [X] T014 meta: this spec directory + memory note; `TODO(handoff)` for the dual artifact until 008. Factory PR: NikolasP98/minion-factory#197.

## Phase 5: Gates
- [X] T015 `bash agent/spec-integrity.test.sh` (SC-001); `cd runner && npx tsc --noEmit`; targeted vitest; shellcheck on touched scripts (SC-002).
- [ ] T016 Operator: publish images + self-update on the box; verify SC-003 on the next real spec run.

## Dependencies
T003–T008 independent of T009–T011; T015 after all; T016 after merge (operator).
