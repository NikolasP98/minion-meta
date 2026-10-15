# SDD friction log: Assistant Launcher Stays in Its Corner (retro, KEY=r3)

## 1. Phase times (wall-clock, agent time, from `date -Iseconds` boundaries)

| Phase | Start | End | Duration |
|---|---|---|---|
| specify | 18:25:01 | 18:26:42 | 1m41s |
| clarify | 18:26:42 | 18:27:21 | 0m39s |
| plan | 18:27:21 | 18:29:23 | 2m02s |
| tasks | 18:29:23 | 18:30:35 | 1m12s |
| analyze | 18:30:35 | 18:32:35 | 2m00s |
| **Total** | | | **7m34s** |

Clarify is short because both clarification Q/As were resolved and written into `spec.md`
during the specify pass itself (there is no owner to run an interactive loop against — see
friction item below), so the "clarify" phase here is really a confirmation/re-validation
pass over clarifications already drafted, not a from-scratch ambiguity scan.

## 2. Counts

- Functional Requirements: 6 (FR-001..FR-006)
- Success Criteria: 4 (SC-001..SC-004)
- `[NEEDS CLARIFICATION]` markers left unresolved: 0 — both candidate ambiguities were
  resolved into the Clarifications section, each tagged `(ASSUMPTION — owner to confirm)`
  per the retro brief's instruction (there being no live owner to answer in real time)
- Clarify Q/As: 2
- Tasks: 15 (T001-T015)
- Analysis findings by severity: CRITICAL 1 (D1), HIGH 0, MEDIUM 1 (E1), LOW 4 (E2, C1, B1, F1)

## 3. Tooling friction

- **No `.specify/extensions.yml`** — every hook-check step in all five skills reduced to "skip
  silently." Zero friction, but also zero signal that the hook system is wired up at all in
  this workspace.
- **Branch-per-feature mismatch**: `spec-template.md`'s header field is `**Feature Branch**:
  [###-feature-name]`, and `/speckit-specify`'s "Branch creation" step assumes a
  `before_specify` git hook creates/switches a branch. This workspace has neither the hook
  nor a branch to create: the feature already shipped and merged in a *different* git
  repository (`minion_hub`) than the one this Spec Kit tree lives in (`minion-meta`). I left
  the frontmatter's branch field as the spec-directory slug (`103-retro-assistant-launcher-
  position`) since no real branch exists or should be created for a retrospective — this is
  a workable fallback but the template gives no guidance for the "describing an already-
  shipped change in a different repo" case.
- **`check-prerequisites.sh` not run**: `/speckit-clarify` and `/speckit-analyze` both
  specify running `.specify/scripts/bash/check-prerequisites.sh --json ...` to resolve
  `FEATURE_DIR`/`FEATURE_SPEC`/etc. I already had `SPECIFY_FEATURE_DIRECTORY` set and
  `.specify/feature.json` written from the specify step, so I read files directly instead of
  invoking the script — functionally equivalent here, but it means the script's own
  validation (e.g., confirming `tasks.md` actually exists before `/speckit-analyze` runs) was
  never exercised. Not a defect found, just an unexercised path.
- **Board-visibility stub not created**: the constitution's "Artifact layout and
  registration" section requires a feature that must appear on the meta-repo board to also
  get a top-level stub `specs/<date>-<slug>-spec.md` with `TEMPLATE.md`'s frontmatter,
  because `scripts/spec-index.mjs` only reads flat `specs/*.md` files, not Spec Kit
  directories. I did not create this stub — the retro task's scope was the Spec Kit
  directory artifacts and `retro-scorecard.md` only. This is itself an open end: as written,
  this retrospective's existence is invisible to the board that is supposed to track all
  spec-shaped work.
- **`repo-policy.mjs show minion_hub` not run**: the common brief marks this optional and
  it requires a `node_modules` symlink; I instead read the already-known branch/PR-base
  values straight from `AGENTS.md`'s Project Map table (`master`/`master` for `minion_hub`),
  which matches. Skipped the live check since the static table was sufficient and the step
  was explicitly optional.
- **`update-agent-context`-style step**: Spec Kit's usual command set includes a step that
  syncs agent context files (e.g., rewriting `CLAUDE.md`/`AGENTS.md` summaries) after
  planning; it is not among the five skills the brief authorized, and I did not invoke it —
  correctly, since touching `AGENTS.md`/`CLAUDE.md` from inside a worktree whose job is to
  produce read-only retrospective documents would itself be scope creep.

## 4. Fit with the Minion SDLC

- **AS-IS/TO-BE/DELTA with evidence (constitution Principle II) vs. `spec-template.md`**:
  direct conflict. The Spec Kit template has no AS-IS section at all — User Stories and
  Functional Requirements are pure TO-BE. I relocated the AS-IS evidence (the diff's removed
  `localStorage` read and resize re-snap) into `plan.md` under a hand-added "AS-IS evidence"
  heading that is not part of the official `plan-template.md` structure either. This is
  `analysis.md` finding D1 — flagged CRITICAL by the analyze skill's own "constitution
  conflicts are always CRITICAL" rule, even though the evidence itself is not missing, just
  misplaced relative to where Principle II says it should live.
- **repo-policy branch roles (AGENTS.md Project Map) vs. `plan-template.md`'s generic
  "Project Type" field**: no conflict — I filled Technical Context/Project Structure with the
  real `minion_hub` path and cited the registered PR base (`master`) directly; the template's
  generic placeholders accommodated this fine.
- **Required build steps (constitution Principle IV: `lint:design && lint:tokens`, RBAC,
  i18n, route contract) vs. Constitution Check table**: fits cleanly as one row per
  principle — the plan-template's Constitution Check section is exactly the right shape for
  this, and I was able to mark RBAC/i18n/route-contract N/A honestly (no new route, no new
  string) rather than having to force-fit them.
- **Security/data human gates (Principle V) vs. template**: N/A for this feature, no
  friction — the template has no dedicated slot for this, but the Constitution Check table
  absorbed it as a one-line N/A row without awkwardness.
- **Open-items ledger (in-code `TODO(handoff)` + `proposals/` entry) vs.
  `tasks-template.md`**: the tasks template's "Polish & Cross-Cutting Concerns" phase has no
  native slot for "write the ledger entry" as a task — I added T015 by hand, outside any
  pattern the template suggests. The template assumes `/speckit-implement` will run and that
  ledger-writing is something that happens informally during/after implementation, not a
  planned, numbered task.

## 5. Would SDD have changed the outcome?

The spec made one real thing explicit that the owner's raw ask left implicit and
contradictory: whether a dragged position should survive a hard refresh at all, given the
ask literally asks for both "stored in local/sessionstorage" (survives reload) and "hard
refreshes moves it back to its corner spot" (does not survive reload) in consecutive
sentences. The shipped PR resolved this silently — correctly, by picking the interpretation
that resets on reload — but left no trace that a judgment call was ever made; a reviewer or
the owner reading the PR body would not learn that the ask contained a contradiction at all.
`/speckit-clarify`'s structured ambiguity scan is built exactly to catch this (Terminology &
Consistency / Completion Signals categories), and would have forced a one-line owner
confirmation before any code was written. What it still could not catch: anything about
runtime correctness (e.g., whether the fraction math actually behaves at extreme viewport
sizes, or whether a different page genuinely remounts the component the way `savedFrac`'s
module-scope trick assumes) — that requires either a test or a human in a browser, not a
specification.

## 6. Template/constitution changes recommended

- Add an "AS-IS (current behavior)" subsection to this workspace's `spec-template.md` fork,
  directly satisfying constitution Principle II without relocating evidence into `plan.md`.
- Amend the constitution's Artifact layout section to state explicitly whether every Spec
  Kit feature needs a top-level board stub, or only ones the author wants tracked — as
  written it reads as universal but following it for every retrospective/audit feature would
  spam the board.
- Give `tasks-template.md` a named, numbered slot for "open-items ledger entry" in the Polish
  phase so it is not an ad-hoc addition per feature.
- Clarify in the constitution (or the clarify skill) how to handle a feature whose "owner" is
  not available synchronously: this retro used `(ASSUMPTION — owner to confirm)` tags per the
  calling brief, but that convention lives only in the brief, not in `.specify/memory/
  constitution.md` or the clarify skill itself.
- State in the constitution (or a new principle) a size/risk threshold below which the
  5-artifact Spec Kit cycle may compress to spec.md-only (as Principle I already permits for
  hotfixes) — today the "may compress" language exists but `/speckit-plan`, `/speckit-tasks`,
  and `/speckit-analyze` have no corresponding "skip if hotfix" branch in their own skill
  files, so following the letter of the workflow produces the full 5-document tree regardless
  of change size.
