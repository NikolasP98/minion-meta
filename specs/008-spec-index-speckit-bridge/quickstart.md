# Quickstart: Spec Index / Spec Kit Directory Bridge

Validation guide for a reviewer confirming the implemented feature works end-to-end.
References `spec.md`'s Verification section and `data-model.md` for field shapes — no
implementation code is duplicated here.

## Prerequisites

- Worktree with the implemented slices (D1-D7 in `plan.md`) applied.
- `node` 22+ on PATH; no other dependency (feature stays zero-dependency, research.md
  Decision 1).

## Steps

1. **Baseline**: `node scripts/spec-index.mjs --check` passes against the unmodified corpus
   (confirms SC-002 before making any fixture change).
2. **Add a fixture directory spec**: create `specs/999-fixture/spec.md` with valid
   TEMPLATE.md frontmatter (`id: 999-fixture`, `repos: [minion-meta]`, `stage: spec`,
   `status: draft`, `pass: 1`, today's `created`/`updated`) and a body containing `##
   Requirements`, `## Assumptions`, and a `**Verification:**` label (data-model.md's
   `REQUIRED_SPEC_KIT_HEADINGS`).
3. **Regenerate**: `node scripts/spec-index.mjs` — expect a new row with `id:
   "999-fixture"` and `path: "specs/999-fixture/spec.md"` in `specs/index.json`, and every
   pre-existing row unchanged (`git diff specs/index.json` shows only the one new row added).
4. **Check**: `node scripts/spec-index.mjs --check` passes.
5. **Negative cases** (each run, then revert the one change before the next):
   - Change `id: 999-fixture` to `id: 998-wrong` → `--check` fails naming the file and the
     id/directory mismatch (FR-003).
   - Remove the `pass` field → fails with the same `missing required field "pass"` wording
     used for top-level specs (FR-012c).
   - Add a second file `specs/other.md` with `id: 999-fixture` → fails with a duplicate-id
     error naming both sources (FR-004, FR-012d).
   - Remove the `## Requirements` heading from the fixture body → `--check` fails naming the
     missing Spec-Kit heading signal (FR-008).
6. **Template check**: run `/speckit-specify` (or the equivalent template-resolution step)
   against a throwaway feature description; confirm the produced `spec.md` already has valid
   frontmatter and is accepted by step 4's `--check` with zero manual edits (User Story 3).
7. **Self-tests**: `pnpm run test:scripts` passes, including the new fixtures (FR-012).
8. **Docs**: `grep -ri "stub spec" .specify/memory/constitution.md AGENTS.md` returns no
   matches (SC-004).
9. **Cleanup**: delete `specs/999-fixture/` and `specs/other.md`, rerun
   `node scripts/spec-index.mjs`, confirm `specs/index.json` returns to its prior committed
   state (no leftover fixture row).

## Expected outcome

All nine steps pass without manual intervention beyond the fixture authoring in step 2 — the
feature's entire value is that step 2's fixture needed no further massaging to be
board-visible.
