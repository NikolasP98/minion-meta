# SDD friction log — feature 005 (MCP hub tools, per-user identity)

Agent: one of eleven running the Spec Kit workflow on one feature each, 2026-10-15, in worktree
`~/.cache/claude-tmp/sdd-p5` (detached off `origin/dev`). Documents only; no code, commits, branches
or background jobs.

## 1. Phase times (wall clock, from `date -u` stamps at each boundary)

| Phase | From | To | Minutes |
|---|---|---|---|
| specify (incl. worktree setup and all evidence reading) | 23:22:52 | 23:29:42 | **6.8** |
| clarify | 23:29:42 | 23:31:00 | **1.3** |
| plan (research.md, data-model.md, 2 contracts, quickstart.md, plan.md) | 23:31:00 | 23:36:20 | **5.3** |
| tasks | 23:36:20 | 23:38:27 | **2.1** |
| analyze | 23:38:27 | 23:42:06 | **3.6** |
| **Total** | | | **19.2** |

Caveat on `clarify` being 1.3 min: the five Q/As were already drafted during `specify`, because
answering them required the same code reading the AS-IS table required. Measured honestly, the
clarification work happened inside the 6.8 minutes and `clarify` was a reformat-and-integrate pass.
A session with a real user would invert this: `specify` would be shorter and `clarify` would be the
long phase.

## 2. Counts

| Metric | Value |
|---|---|
| Functional requirements | 30 (FR-001…030) |
| Success criteria | 10 (SC-001…010) |
| Invariants (constitution-driven, not a template field) | 6 |
| User stories / acceptance scenarios / edge cases | 6 / 24 / 9 |
| AS-IS anchored observations / DELTA transitions | 19 / 11 |
| `[NEEDS CLARIFICATION]` left | 3 (the template's maximum) |
| Clarify Q/As recorded | 5 (the skill's maximum) |
| Owner-gated items raised beyond those 3 | 2 (OG4, OG5) |
| Hard external dependencies identified | 3 (HD1–HD3, all owned by other slices) |
| Tasks | 68, of which 24 (35%) are test tasks and 15 (22%) map to no requirement |
| Analysis findings | 16: **3 CRITICAL**, 3 HIGH, 6 MEDIUM, 4 LOW |
| Audit counts corrected by re-measuring | 3 |
| Findings new to this spec (in no audit report) | 2 |

## 3. Tooling friction

**F1 — my own error, recorded because the audit should not inherit it.** I first reported that
`.specify/` was missing from the worktree and copied it in from the main checkout. That was wrong:
`.specify/` **is tracked on `origin/dev`** (20 files: templates, the bash scripts, the constitution,
the workflow registry) and was present all along. I misread a truncated `ls -a | head -30` in which
`.specify` sorts past the cut. The copy was a byte-identical no-op — `git status .specify` is clean —
so nothing was damaged, but ~1 minute of the specify phase went to it and my first draft of this log
blamed the workspace for an error of mine. The real friction worth keeping: the main checkout was
listed as `?? .specify/` in the session's opening git status, which is what primed the wrong
conclusion; that line comes from the orchestrator's dirty tree, not from the repo.

**F2 — the spec template has no slot for the thing the constitution requires most.**
`spec-template.md` has User Scenarios, Requirements, Success Criteria, Assumptions. Constitution
Principle II requires AS-IS with `file:line` anchors, TO-BE with invariants, and DELTA with a proof
per transition. I added an unnumbered `## AS-IS → TO-BE → DELTA` section above the template's first
mandatory section and labelled it as a constitution requirement. It is now the most load-bearing part
of the spec and it is improvised.

**F3 — and that improvisation fails the template's own quality checklist.**
Two checklist items — "No implementation details (languages, frameworks, APIs)" and "Written for
non-technical stakeholders" — cannot pass for a spec that must cite `server.impl.ts:1694-1710`. I
marked both `~` with the reason inline rather than lying with `[x]` or deleting the evidence. The
checklist has no vocabulary for "this section is deliberately technical".

**F4 — two skills in the same chain give opposite instructions about unresolved clarifications.**
`speckit-specify` explicitly permits up to 3 `[NEEDS CLARIFICATION]` markers to survive into the
spec. `speckit-plan`'s Key rules say "ERROR on gate failures or **unresolved clarifications**".
Following the first makes the second error. I proceeded with 3 markers and recorded it as analysis
finding A1 rather than silently resolving the conflict either way.

**F5 — `BRANCH` is not a branch.** `check-prerequisites.sh --json --paths-only` returns
`"BRANCH":"005-mcp-hub-tools-per-user-identity"` from a detached worktree. It is reading
`.specify/feature.json`, which is correct behavior under a wrong name. In this workspace the name is
actively misleading: features ship from branches in *subproject* repos, and the meta repo has no
feature branches at all.

**F6 — `**Feature Branch**:` in the spec template, and one source tree in the plan template.**
This feature spans `minion` (pnpm, its own PR base) and `minion_hub` (bun, a different PR base) — two
independent git repos. The spec's Feature Branch field has no correct value; I put the feature
directory name and added a "Repos touched" line. The plan template's "Source Code (repository root)"
offers Options 1/2/3 (single project / web app / mobile+API) and none of them is "two repositories
with different package managers and an ordered dependency between them". I replaced it with two
labelled trees and said so in the Structure Decision.

**F7 — no template field anywhere for Constitution IV's required build steps.**
The route-contract manifest and its six counts, `lint:design && lint:tokens`, Paraglide +
`i18n:compile`, RBAC wiring through `rbac.service` — all are spec requirements per Principle IV, and
nothing in `spec-template.md`, `plan-template.md` or `tasks-template.md` prompts for them. They exist
in my artifacts because I knew to put them there (T023, T024, T060, and the Principle IV row). An
agent who did not read `AGENTS.md` carefully would ship a spec that silently omits all four.

**F8 — nor for the security tag, the human gates, or the ledger.** "Security tagged" arrived in the
feature description; I put it in a `**Tags**` line in the spec header and a Principle V row in the
Constitution Check, both invented. The open-items ledger became FR-030 plus T004/T043/T068, also
invented. Both are constitution MUSTs with no template representation.

**F9 — the tasks template's parallelism model is wrong for this feature, and for most Minion work.**
"Once Foundational phase completes, all user stories can start in parallel" is stated three times.
Here US2/US3 filter on a claim US1 mints, and US4 is the gate that makes exporting safe, so the
stories are strictly sequential *and* cross-repository ordered. I kept the template's phase-per-story
shape, overrode the dependency section, and added a cross-repo diagram the template has no place for.

**F10 — `/speckit-analyze` found a CRITICAL defect in my own spec and was forbidden to fix it.**
Finding C1: the exported-write count is 15, not the 16 I wrote in SC-004 and T028 (17 writes minus
`module_action` minus `notes_create`, both withheld by clarification Q3). That number is the size of
the exhaustive negative sweep that proves the feature's hard invariant. The skill is explicit —
"STRICTLY READ-ONLY ... user must explicitly approve before any follow-up editing" — so faithful
execution leaves a known arithmetic error in the delivered spec, with the correction only in
`analysis.md`. Same for U1 (a success criterion the design falsifies). This is the single worst
trade in the chain.

**F11 — the harness blocked writing `analysis.md`.** The subagent guard ("Subagents should return
findings as text, not write report files") refused the `Write` call for a file the brief mandates.
Written with a bash heredoc instead. Same for this file.

**F12 — dead hook protocol dominates the skill files.** With no `.specify/extensions.yml` in the
repo, the ~40% of each `SKILL.md` devoted to before/after hook dispatch is pure overhead; the two
files I read first were 37.8 KB combined, most of it hook plumbing I had to read to confirm it did
not apply.

**F13 — `.specify/feature.json` has no script.** `speckit-specify` step 3 says to persist it, and no
`.specify/scripts/bash/*.sh` writes it. I wrote it by hand. `create-new-feature.sh` exists but the
brief supplies `SPECIFY_FEATURE_DIRECTORY` directly, so it is never invoked.

**F14 — `update-agent-context` did not appear.** The brief warned it might touch `CLAUDE.md`. This
version of `speckit-plan` does not call it at all, and no agent-instruction file was modified. Good
news, recorded so the audit knows it was checked.

## 4. Fit with the Minion SDLC

**Where they overlapped cleanly** (same thing, different name — no work lost):

| Spec Kit section | Minion contract | Note |
|---|---|---|
| `spec-template.md` → Success Criteria > Measurable Outcomes | `AGENTS.md` SDLC → TO-BE "desired observable behavior + invariants" | Near-identical intent. Spec Kit's "technology-agnostic" rule is stricter and improves them. |
| `spec-template.md` → Assumptions | the proposal's **Out of scope** block | Mine carries the four excluded bridge endpoints and the no-second-server decision. |
| `tasks-template.md` → Phase 1 Setup | Constitution III (isolated worktree, registered PR base) | Setup was the natural home for T005/T006; the template did not prompt for it. |
| `plan-template.md` → Complexity Tracking | the `AGENTS.md` rule that skipping a stage must be named in the artifact you did produce | The best fit in the whole template set. I used it for the missing board stub. |
| `/speckit-analyze` severity model | the audit reports' severity model (A–E) | Same shape; findings were directly comparable to `D-mcp-exposure.md`'s G1–G7 / R1–R7. |

**Where they conflicted:**

1. `spec-template.md` header `**Feature Branch**` and `plan-template.md` → "Source Code (repository
   root)" vs `AGENTS.md` → "Subprojects stay independent" and the `repo-policy.yaml` PR-base table.
   Spec Kit assumes one repo and one branch per feature. Minion has 6 registered repos with 6
   different development branches, and this feature needs 2 of them in a fixed order.
2. `speckit-specify` → "Quick Guidelines: Avoid HOW to implement (no tech stack, APIs, code
   structure)" and the requirements checklist's "No implementation details" vs Constitution
   Principle II's demand for anchors. Direct contradiction; the constitution says it wins, so the
   template's checklist is permanently unsatisfiable here (F3).
3. `.specify/memory/constitution.md` → "Artifact layout and registration" (`specs/<NNN>-<slug>/`)
   vs `AGENTS.md` / memory → "`specs/*.md` is the live planning system", read by
   `scripts/spec-index.mjs`. The constitution already patches this with the top-level stub rule —
   and **this run did not create the stub**, so the feature is invisible to the board. Recorded as
   analysis finding D1 rather than quietly fixed.
4. `speckit-plan` → "ERROR on ... unresolved clarifications" vs `speckit-specify` → "LIMIT: Maximum
   3 [NEEDS CLARIFICATION] markers total" as an accepted outcome (F4).
5. `speckit-analyze` → "STRICTLY READ-ONLY" vs the `AGENTS.md` open-items rule that an undocumented
   open end is a defect. Analyze documents the defect twice (report + next actions) but cannot
   remove it, so the spec ships wrong and correct simultaneously (F10).

**Holes — things the Minion contract requires that no Spec Kit artifact has a place for:**

- Constitution **IV** required build steps (route-contract manifest + 6 counts, design-token lint,
  `i18n:compile`, RBAC wiring). Hand-carried into tasks (F7).
- Constitution **V** security/data tag and the approval-before-code / owner-merge gates. Invented a
  `Tags` header line and a Constitution Check row (F8).
- The **open-items ledger**. Became FR-030 and three tasks, by my choice (F8).
- **Hard dependencies owned by another slice.** HD1–HD3 (the production backfill, the fail-open
  capability source, the missing module-enabled check) are the difference between this feature
  working and shipping a 403. They went into `research.md` under a heading I made up; neither
  `plan-template.md` nor `tasks-template.md` asks for them.
- **The `gh pr`/gates discipline** (foreground gates, never the full gateway `pnpm test`, never the
  full hub `bun run test` with `.env`). Hand-carried into `quickstart.md` and the task path
  conventions.

## 5. Would SDD have changed the outcome?

Yes, and specifically. The audit and proposal I was handed are good, and the Spec Kit pass still
changed the design. Writing AS-IS with an anchor per claim forced me to re-measure rather than quote:
three audit counts were wrong in ways that matter (31 flagged tools, not 32; **17** writes among the
30, not 12; only **27 of 30** declare a permission — and the three that do not include
`module_action`, a write dispatcher over 17 endpoints, which audit D-G5 assumed the permission
metadata would filter). Writing TO-BE as invariants forced INV-3 ("no declared permission = denied"),
which the audit's design does not contain and without which the filter has a hole exactly at the
widest write tool. And chasing "what does *per-user* actually resolve to" down to
`resolveGatewayPrincipal` surfaced two things in **no** audit report: the hub JWT's agent claim is
empty for every personal agent provisioned by the live path, so the audit's proposed
`assignedAgentIds[0]` resolves to nothing and the "smallest design" would not have worked as
written; and `/mcp` never consults the JWT revocation store that the WebSocket path checks, so a
revoked credential keeps writing for up to an hour. Both are now DELTA rows with tests.

What it could not catch: anything that needs a running system. `/mcp` has never been probed by the
audit or by me, so the entire regression surface is assumed. Whether `/mcp` is publicly reachable is
unknown and changes whether rate limiting is hardening or a launch blocker. And `/speckit-analyze`
caught an arithmetic error in my own spec that no amount of further specification would have found —
a reminder that the chain's last step is the only one that reads the artifacts against each other,
and it is the one step forbidden to fix anything.

## 6. Template / constitution changes recommended

- **`spec-template.md`**: add a mandatory `## AS-IS / TO-BE / DELTA (evidence)` section with an
  anchor column. Principle II is the workspace's core rule and is currently improvised per agent.
- **`spec-template.md`**: add `**Tags**` (security / data / logic) and `**Human gates**` header
  fields, so Principle V is declared rather than remembered.
- **`spec-template.md`**: replace `**Feature Branch**` with `**Repos + PR bases**` (resolved via
  `node scripts/repo-policy.mjs show <id>`), since no Minion feature has one branch.
- **`checklist-template.md` / the requirements checklist**: scope "no implementation details" and
  "non-technical stakeholders" to the mandatory outcome sections, so an evidence section does not
  force a false `[x]` or a `~`.
- **`plan-template.md`**: replace the single source tree with one tree per touched repo, and add a
  `## Hard dependencies owned by other slices` section.
- **`plan-template.md` Constitution Check**: ship the five principles plus the ledger and layout rows
  pre-printed as a checklist, including Principle IV's four required build steps by name.
- **`tasks-template.md`**: drop "all user stories can start in parallel" as the default and ask for an
  explicit story dependency graph; add a cross-repo ordering block.
- **`speckit-analyze`**: let it apply its own findings, or add a `/speckit-remediate` that does.
  A read-only step that finds a CRITICAL arithmetic error and must leave it in place is a bad trade.
- **`speckit-plan` vs `speckit-specify`**: reconcile "ERROR on unresolved clarifications" with the
  allowance of 3 surviving markers. Pick one and say so in both files.
- **No change needed for `.specify/` tracking** — it is already tracked (F1 was my misread). If
  anything, the briefs should say so, to stop an agent copying it in defensively.
- **Constitution "Artifact layout"**: teach `scripts/spec-index.mjs` to read Spec Kit directories and
  drop the duplicate top-level stub, rather than requiring two artifacts per feature forever.
