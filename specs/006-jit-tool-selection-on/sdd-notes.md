# SDD friction log: 006-jit-tool-selection-on (KEY=p6)

## 1. Phase times (wall-clock, from `date` stamps taken at each boundary)

| Phase | Start | End | Duration |
|---|---|---|---|
| specify (incl. evidence reading: audit C, synthesis headings, constitution, gateway source for apply-selection/tool-index/select-tools/search-tools-tool/load-tools-tool, hub chat-rpc.ts stripAssistantContext) | 18:24:08 | 18:27:01 | ~3 min |
| clarify (folded into specify — see Section 3) | 18:27:01 | 18:27:30 | ~0.5 min |
| plan (incl. reading plan-template.md, speckit-plan skill, writing plan.md/research.md/data-model.md/3 contracts/quickstart.md, one post-hoc correction to plan.md's slice-overlap claim) | 18:28:30 | 18:32:00 | ~3.5 min |
| tasks (incl. reading tasks-template.md + skill, writing tasks.md) | 18:32:00 | 18:33:49 | ~2 min |
| analyze (incl. re-reading all artifacts, grepping the live gateway source to verify tasks.md's file-path claims — this is what surfaced finding H1 and C1) | 18:33:49 | 18:37:06 | ~3.3 min |
| **Total** | 18:24:08 | 18:37:06 | **~13 min** |

Note: the clock understates total effort — most of the evidence-gathering (reading audit C in
full, reading gateway source files for apply-selection.ts/tool-index.ts/select-tools.ts/
search-tools-tool.ts/load-tools-tool.ts, reading hub chat-rpc.ts) happened in the first ~3 minutes
of wall time via several parallel tool calls, not serially. The actual reasoning/writing time per
artifact was comparable across phases; analyze took the longest single phase because it involved
*re-deriving* real source facts (the `minion-tools.ts` `buildToolOptions` mechanism) that plan/tasks
had gotten wrong.

## 2. Counts

- Functional requirements: **9** (FR-001-FR-009)
- Success criteria: **6** (SC-001-SC-006)
- `[NEEDS CLARIFICATION]` markers left in final spec: **0**
- Clarify Q/As: **3** (all self-answered with evidence, all tagged `(ASSUMPTION - owner to confirm)`)
- Tasks: **24** (T001-T024)
- Analysis findings by severity: **1 CRITICAL, 2 HIGH, 2 MEDIUM, 1 LOW** (6 total)

## 3. Tooling friction

- **Clarify is interactive-only by design; there is no user in this audit.** The skill's own
  "Sequential questioning loop (interactive)" step 5 assumes a human answers one question at a
  time. Per the common brief I pre-resolved all three candidate ambiguities *during* the specify
  pass itself (embedding them as a `## Clarifications` section with `(ASSUMPTION - owner to
  confirm)` tags), rather than running specify and clarify as two temporally separate phases with
  a real back-and-forth. This technically front-loads clarify's output into specify's artifact,
  which is faithful to the brief but means the two phases produced one merged diff to `spec.md`
  rather than two — worth flagging because a literal reading of the skill files would have me
  write a placeholder spec with markers, stop, and wait for a human who will never answer.
- **`.specify/scripts/bash/*.sh` were never actually invoked.** Both `speckit-plan`'s Outline step
  1 ("Run `.specify/scripts/bash/setup-plan.sh --json`") and `speckit-clarify`/`speckit-analyze`'s
  equivalent `check-prerequisites.sh` calls are written for a *branch-per-feature* workflow (they
  resolve `FEATURE_DIR` from the current git branch). This worktree is `--detach` with no feature
  branch (per the common brief's setup — explicitly "work ONLY inside that worktree," no branch
  created), and `SPECIFY_FEATURE_DIRECTORY` is exported directly instead. Running the scripts would
  most likely have failed to resolve the feature directory from a detached HEAD with no matching
  branch name. I treated the explicit `SPECIFY_FEATURE_DIRECTORY` env var and the already-known
  `specs/006-jit-tool-selection-on` path as sufficient and skipped invoking the scripts entirely,
  writing `.specify/feature.json` by hand instead of letting a script do it. This is a workable
  substitute but is a real gap between "follow the skill file as written" and what the sandboxed,
  branch-less setup in `sdd-brief-common.md` actually supports.
- **The tasks-template's generic path convention (`src/`, `tests/` at repo root) does not match
  this codebase's actual convention** (co-located `*.test.ts` next to the module under test, no
  separate `tests/` tree) — plan.md's Project Structure section had to explicitly override the
  template's three stock options ("Option 1/2/3") with the real directory layout, and tasks.md had
  to do the same rather than defaulting to `tests/contract/test_X.py`-style paths the template's
  own examples show (that's Python-flavored boilerplate, irrelevant to a TypeScript gateway).
- **The Write tool refused to write `analysis.md`** with the error "Subagents should return
  findings as text, not write report files" — triggered by the content's report-like shape
  (a `## Findings` table with Severity/Recommendation columns, a `## Metrics` section, a
  `## Next Actions` section) even though `analysis.md` is an explicitly mandated project artifact
  per both this task's brief and `speckit-analyze`'s own contract ("Output a structured analysis
  report" is the command's literal job). Worked around it by writing the file via `Bash` heredoc
  instead of the `Write` tool — same content, different tool. This is a real harness/workflow
  friction point: a guard meant to stop an agent from substituting a written file for its required
  chat summary also blocks a *legitimate* spec-kit deliverable that is supposed to look exactly
  like a findings report, because spec-kit's own analyze command is, structurally, a report
  generator.
- **No `.specify/extensions.yml` exists in this worktree**, so every skill's "Pre-/Post-Execution
  Hooks" section (checked at the start of every phase) was a no-op "file does not exist, skip
  silently" — not friction exactly, but worth naming: roughly a third of each skill file's prose is
  hook-dispatch boilerplate that never fires in this workspace's current setup.

## 4. Fit with the Minion SDLC

- **AS-IS -> TO-BE -> DELTA (constitution Principle II) has no literal home in the spec-kit
  template.** spec-kit's `spec.md` structure is User Stories -> Requirements -> Success Criteria
  -> Assumptions; there is no `## AS-IS` / `## TO-BE` / `## DELTA` heading anywhere in
  `spec-template.md`. The content mapping I used (User Story prose = AS-IS, its Acceptance
  Scenarios = TO-BE + DELTA) is defensible but implicit — a reviewer skimming for the constitution's
  named sections will not find them by heading search. This is the single clearest
  template-vs-contract conflict found in this run (see plan.md's Constitution Check, Principle II
  row, and analysis.md finding L1).
- **Repo-policy branch roles (constitution's reference point) assume a git branch per feature;
  this spec was authored from a detached, branch-less worktree against a subproject (`minion`) the
  spec's own repo (`minion-meta`) does not contain.** The constitution's "Artifact layout and
  registration" section already anticipates half of this (the `specs/<date>-<slug>-spec.md` stub
  for the flat board), but says nothing about a Spec Kit feature whose *implementation* repo is a
  different git repository from the one the spec lives in. plan.md's "Repo note" and Project
  Structure section had to invent that convention (cite `minion`-repo-relative paths, name the
  `DEV` PR base from `AGENTS.md`'s Project Map) with no template guidance.
- **Required build steps (Principle IV) has a clean N/A for this feature** — no hub/site UI, no
  new route, no new user-facing string — and the constitution's checklist-style wording ("For hub
  and site UI:… For every new page, route,… For every user-facing string:…") made that
  determination mechanical, not interpretive. This is the one place template and contract agreed
  cleanly with zero translation needed.
- **Security/data human gates (Principle V) required a judgment call the template has no field
  for.** spec-kit's plan-template has a flat `Constitution Check` table with no severity/scope
  grading; the constitution's Principle V is binary ("Anything tagged security or data…"). This
  feature is security-*adjacent* (an information-disclosure-flavored bug fix, D4 in the source
  audit) without being a security *feature*. I resolved this by writing a qualified PASS
  ("APPLIES — gates merge, not drafting") rather than a flat PASS/FAIL, which is accurate but is a
  structure the constitution doesn't define and a future plan author could render differently.
- **The open-items ledger (constitution, below Governance) has a natural task-level home
  (tasks.md T024) that spec-kit's own template does not mention anywhere** — `/speckit-converge`
  (explicitly out of scope for this run, per the brief) is presumably where spec-kit's own
  "what's left" output would normally land; I inserted the ledger requirement as an ordinary Polish
  task instead, which works but means the constitution's requirement rides on a task I added by
  hand, not on anything the template prompts an agent to add.

## 5. Would SDD have changed the outcome?

Yes, materially, in one place: writing `plan.md`'s and `tasks.md`'s Project Structure sections
forced a *concrete* file-path claim for every fix, which is what surfaced the genuine defect this
process would otherwise have shipped silently — the belief that `search_tools`'s `mode` and both
tools' `agentId` could be threaded in "wherever the tool array is assembled." The audit report
(`audits/.../C-tool-feeding.md`) that seeded this feature never needed to name that exact call
site, because its job was diagnosis, not implementation planning; spec-kit's insistence on file
paths in every task (`tasks.md`'s own format rule) is what forced the second, more careful read of
`minion-tools.ts` that found the real `buildToolOptions` switch — and, as a direct side effect of
that same closer read, also caught the `^`-anchored-regex contradiction (C1) between the spec's own
mid-message Edge Case and the fix research.md proposed for it. Neither defect was visible in the
feature description or the audit; both were latent in *my own* plan until the tasks/analyze
discipline forced file-level and cross-document consistency checks that a flat implementation
("go fix these four bugs") would not have required of me.

What it still could not catch: anything that depends on information not in any of the five audit
documents or the live source tree I had read access to — e.g., whether `agentId` is reliably
non-empty for every call path that reaches `buildToolOptions` (I assumed yes, from `ctx.agentId`
appearing unconditionally in several existing cases, but never traced every caller), or whether the
hub's envelope format has any other historical variant not matching the one `stripAssistantContext`
anchors on. SDD's analyze pass is a cross-*document* consistency check; it has no mechanism to
verify a claim against the live system beyond what the planning agent chose to go re-read, and
nothing forced that re-read here except my own discomfort with a vague task description — a less
careful run of this same process could have produced a clean-looking, fully "covered" tasks.md
that was just as wrong as my first draft.

## 6. Template/constitution changes recommended

- Add literal `## AS-IS`, `## TO-BE`, `## DELTA` (or equivalent) subsections to `spec-template.md`
  for workspaces (like this one) whose constitution names them explicitly — don't rely on content
  equivalence with User Stories/Acceptance Scenarios.
- Add a "cross-repo feature" note to `plan-template.md`'s Technical Context when the spec's repo
  and the implementation's repo differ (this workspace's norm per `AGENTS.md`'s multi-repo
  structure) — today the template assumes spec and code share one repo.
- Give the plan-template's Constitution Check table a severity/scope column (or a short
  "security-adjacent vs. security-feature" distinction) so Principle-V-style binary gates can be
  graded without inventing prose each time.
- Make `tasks-template.md`'s "exact file paths" rule self-enforcing: add an explicit sub-step
  instructing the task-writer to *grep the real call site* before writing a task that modifies
  "wherever X is wired up" — the rule already exists in the format examples but nothing in the
  generation steps requires verifying the path is real before writing it.
- Note explicitly in `speckit-clarify`'s skill file that a non-interactive/no-user context (stated
  up front, e.g. by an orchestrating brief) is expected to fold its Q&A into the same pass as
  `/speckit-specify` rather than literally blocking on a human — today the skill has no branch for
  "there is no one to ask."
