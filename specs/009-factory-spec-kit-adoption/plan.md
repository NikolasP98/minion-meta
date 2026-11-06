# Implementation Plan: Factory spec phase authors with Spec Kit

**Feature Dir**: `specs/009-factory-spec-kit-adoption` | **Spec**: `spec.md` | **Date**: 2026-10-15

## Summary
Make the factory's two-pass spec phase author Spec Kit artifacts (`specs/<id>/`) in the meta
clone before writing the flat board spec, expose the `/speckit-*` skills to the codex harness,
and hand `plan.md` + `tasks.md` to the develop phase. No new services, no schema, no auth change.

## Technical Context
- **Repo / PR base**: `NikolasP98/minion-factory` → `dev` (registry row `minion-factory`).
  Package manager: npm (runner, broker). Gates: `bash agent/spec-integrity.test.sh`,
  `cd runner && npx tsc --noEmit && npx vitest run <touched>.test.ts`, shellcheck (CI job).
- **Languages**: bash (agent scripts), TypeScript (runner, Express 5 + tsx).
- **Harnesses**: `claude -p` (project skills from the clone's `.claude/skills`), `codex exec`
  (skills from `~/.agents/skills` only → runtime symlink).
- **Spec Kit on the box**: bash scripts + markdown skills only; no `specify` CLI needed.
- **Meta side**: `.specify/` and `.claude/skills/speckit-*` are tracked on `dev` (#805); the
  factory clones `FACTORY_META_BRANCH` (= dev) so they are present.

## Constitution Check
| Principle | Status | Note |
|---|---|---|
| I Spec before code | PASS | this document |
| II AS-IS/TO-BE/DELTA with evidence | PASS | spec.md cites `spec.sh`, `Dockerfile`, runner lines |
| III Slice-scoped delivery | PASS | one factory PR (dev) + one meta docs PR (dev) |
| IV Required build steps | N/A — no UI, route, endpoint or user string | |
| V Security/data human gates | N/A — not tagged; the allowlist stays fail-closed | |
| Open-items ledger | the dual artifact (dir + flat stub) is an open end until 008 ships → `TODO(handoff)` in `spec.sh` + this spec's Assumptions | |
| Artifact layout | board stub for this feature: not created (docs-only PR, same as 001–008) | |

## Project Structure
### Documentation (this feature)
`specs/009-factory-spec-kit-adoption/{spec,plan,tasks}.md`
### Source Code (minion-factory)
```
agent/spec.sh                       # prompts, allowlist prefix, skill symlink, git add
agent/spec-integrity.test.sh        # prefix cases
agent/factory-develop.sh            # Spec Kit tasks section
agent/skills/minion-factory-engineering/SKILL.md
runner/src/index.ts                 # fetch plan/tasks at spec intake
runner/src/queue.ts                 # pass FACTORY_SPEC_TASKS to develop container
runner/src/containers.ts            # env allowlist entry
README.md
```

## Design decisions
- **Same id for dir and flat spec** (`specs/<date>-<slug>-spec/`): one identity, no mapping table.
- **Prefix allowlist** (`entry ends with /`) instead of enumerating files: Spec Kit may add
  `research.md`, `contracts/`, `checklists/`; enumerating would re-break on every template change.
- **Runtime symlink for codex** instead of installing Spec Kit's codex integration in meta:
  the skill files are harness-agnostic markdown; one mechanism, no second copy to drift.
- **Fold plan/tasks as a separate env** (`FACTORY_SPEC_TASKS`), not concatenated into
  `FACTORY_SPEC_CONTENT`: the spec SHA (`spec_sha` evidence trailer) must keep hashing the
  flat spec only, so existing identity/provenance checks are untouched.

## Complexity Tracking
None added: no new process, no new file format beyond what Spec Kit already defines.
