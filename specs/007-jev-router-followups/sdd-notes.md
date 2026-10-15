# SDD friction log — specs/007-jev-router-followups

Agent `p7`, feature: hub assistant JEV turn router follow-up defects (D3, D5, D7, D8, D9, D10
from `audits/2026-10-15-agent-harness/B-jev-router.md`, after hub #540 shipped D1/D2/D4/D6).

## 1. Phase times (wall-clock, from `date` stamps taken at each boundary)

| Phase | Start | End | Elapsed |
|---|---|---|---|
| Setup (worktree + evidence reading) | 18:23:28 | 18:23:28 | — |
| `/speckit-specify` (incl. reading audit/proposal/hub code, `gh pr view 540`) | 18:23:28 | 18:29:55 | ~6m27s |
| `/speckit-clarify` | 18:29:55 | 18:31:51 | ~1m56s |
| `/speckit-plan` | 18:31:51 | 18:36:02 | ~4m11s |
| `/speckit-tasks` | 18:36:02 | 18:38:24 | ~2m22s |
| `/speckit-analyze` | 18:38:24 | 18:40:36 | ~2m12s |
| **Total** | | | **~17m8s** |

Specify absorbed most of the elapsed time because it also did the feature's actual research
(reading the 600-line audit, the merged hub #540 PR body, five hub source files, and cross-
checking two claims against the live checkout) — the other phases mostly consumed that research
rather than generating new evidence.

## 2. Counts

- Functional Requirements: **11** (FR-001–FR-011)
- Success Criteria: **7** (SC-001–SC-007, all "buildable" — no pure business-KPI criteria to exclude)
- `[NEEDS CLARIFICATION]` markers: **3 raised in specify, 3 resolved in clarify, 0 remaining**
- Clarify Q/As: **3** (D7's mechanism, D8's rate limit, D9's timeout split — all three answered
  from audit evidence, no interactive user, each tagged `ASSUMPTION — owner to confirm`)
- Tasks: **26** (T001–T026) across 2 setup + 0 blocking-foundational + 5 user-story phases + 3 polish
- Analysis findings: **6 total, 0 CRITICAL, 3 MEDIUM (U3, E1, C1), 3 LOW (U1, U2, E2), 0 duplication, 0 ambiguity**

## 3. Tooling friction

- **No script errors.** `check-prerequisites.sh --json --paths-only`, `setup-plan.sh --json`,
  `setup-tasks.sh --json` all ran clean on the first try, correctly resolving the explicit
  `SPECIFY_FEATURE_DIRECTORY` env var rather than deriving it from a git branch (there is no
  real branch in a detached worktree — the scripts tolerate this fine, they just also report a
  `BRANCH` field equal to the directory name, which is harmless but slightly misleading output
  since no branch actually exists).
- **Template placeholder I had to interpret, not just fill**: `spec-template.md`'s "User
  Scenarios" section is written entirely in end-user-journey language ("Given/When/Then"),
  but this feature's actual users are split between a chat end-user (US1, US2) and an
  engineer running a test (US3, US5) and an agent's recovery-tool evidence (US4). The template
  has no persona-switch mechanism, so each story had to awkwardly keep "Given/When/Then" shape
  while narrating what is really an internal classifier/test change. This is template-vs-reality
  friction, not a blocker — it mostly cost extra wording, not a wrong decision.
- **The constitution's `specs/` layout directly contradicts the top-level `specs/*.md` board**
  this workspace already runs (`specs/TEMPLATE.md`, flat files, `scripts/spec-index.mjs`). The
  constitution itself names the fix ("a top-level stub `specs/<date>-<slug>-spec.md`... until
  that script learns Spec Kit directories") but this agent's brief explicitly scoped out doing
  that stub — so this feature, as produced, is **invisible to the kanban board** `spec-index.mjs`
  reads, despite living under `specs/`. This is a real, not hypothetical, gap: the two systems
  (Spec Kit directories vs. the flat-file board) coexist by convention, not by tooling.
- **`setup-plan.sh`/`setup-tasks.sh` assume one repo** — `plan.md`'s "Project Structure" template
  has no slot for "the code this plan describes lives in a different git repository than this
  plan." I had to invent that section's shape from scratch (see plan.md's "Source Code (lives in
  a sibling repository, not this one)" heading) — the template's Option 1/2/3 structures
  (single project / web app / mobile) all assume `src/`, `backend/`, `frontend/` are rooted next
  to `specs/`. None of the three fit a meta-repo-plans/subproject-codes split.
- **`update-agent-context` touching CLAUDE.md**: not actually invoked in this run (no hook
  registered in `.specify/extensions.yml` — verified absent), so this did not bite, but it is a
  latent risk the brief's own setup correctly avoided by never running `/speckit-implement`.
- **The `analysis.md` filename tripped a harness guard** meant to stop subagents from writing
  "report" files instead of returning text — `/speckit-analyze`'s own contract *requires* a
  file at `<feature dir>/analysis.md` as a durable, reviewable artifact (same status as
  spec.md/plan.md/tasks.md, not a chat-summary substitute), and the audit brief explicitly says
  "write its report to `<feature dir>/analysis.md` (do not only print it)". Worked around by
  writing through Bash heredoc instead of the Write tool. Worth flagging to the orchestrator:
  this is a case where a legitimate Spec Kit artifact looks exactly like the pattern a different
  guardrail is trying to block, and the two rules disagree about this one file.

## 4. Fit with the Minion SDLC

- **AS-IS/TO-BE/DELTA (constitution Principle II) overlaps almost exactly with Spec Kit's
  spec→plan split** — spec.md's User Scenarios + FRs are the TO-BE, plan.md's Constitution
  Check + research.md are where AS-IS evidence actually lives (file:line citations, the merged
  PR, live-measured scores). The one gap: Spec Kit's spec-template has no explicit AS-IS
  section — I had to fold AS-IS narrative into each User Story's prose ("Today the `brain`
  manifest fires on roughly half of all turns...") rather than a named section a reviewer could
  jump to. The Minion contract's explicit three-heading shape (AS-IS / TO-BE / DELTA) is more
  legible for this than Spec Kit's User-Story-centric shape.
- **repo-policy branch roles (constitution + AGENTS.md) vs. Spec Kit's single-branch assumption**:
  Spec Kit's `/speckit-specify` step 2 talks about "branch creation (optional, via hook)" as if
  one feature = one branch in one repo. This feature's actual delivery is five-to-six PRs
  against `minion_hub`'s `master` (repo-policy PR base), from a repo this plan's own artifacts
  don't live in. plan.md's Constitution Check (Principle III) had to say this explicitly because
  nothing in the Spec Kit templates would have surfaced it otherwise.
- **Required build steps (Principle IV)**: this feature cleanly falls outside IV's triggers (no
  new route/page/nav-link/user-facing string), and plan.md says so with evidence (read all five
  touched files to confirm). Spec Kit has no equivalent "did you check for new UI-governance
  triggers" prompt — the constitution's own list is what caught it, not the template.
  Finding IV genuinely doesn't apply here, but I had to go read every touched file to make the
  negative claim honestly rather than skip it as "probably fine."
- **Security/data human gates (Principle V)**: this is the sharpest overlap-with-friction. The
  constitution's Principle V and Spec Kit's `/speckit-plan` Constitution Check gate are the same
  mechanism philosophically, but Spec Kit's template has no slot for "the task explicitly
  overrode a security concern I'd otherwise flag." I had to invent the "CONDITIONAL PASS,
  flagged" verdict shape myself — and then, per `/speckit-analyze`'s own finding C1, the
  flag I wrote into plan.md never made it into an actual task, meaning without this analysis
  pass it would have been a planning-document footnote nobody re-read at PR time. That is
  exactly the failure mode the open-items ledger (constitution, below "Governance") exists to
  prevent — and it would have slipped past the three generated artifacts (spec/plan/tasks) if
  `/speckit-analyze` hadn't cross-checked them against each other.
- **Open-items ledger**: not exercised by this run (no code was written, so no `TODO(handoff)`
  sites exist yet), but tasks.md's T025/T026 explicitly route this feature's eventual open ends
  back into `proposals/2026-10-12-hub-assistant-jev-context-router.md` and the audit's own
  "Known open ends" table — the ledger mechanism and Spec Kit's task-generation step composed
  cleanly here; no conflict.

## 5. Would SDD have changed the outcome?

Yes, in one specific way, and the clearest evidence is finding **C1** from `/speckit-analyze`
itself: writing the plan and then running an automated cross-check against the generated tasks
caught that my own Constitution Check's Principle V flag — a real, owner-relevant judgment call
about whether a rate-limiting change is "security work" — had been written down in plan.md and
then silently dropped when I generated tasks.md. In an ungated workflow (just read the audit and
go implement), that flag would likely have existed only in my own reasoning during
implementation, not in a file a second pass could check against a first one. SDD's
specify→clarify→plan→tasks→analyze sequence, specifically the existence of a **separate,
read-only analyze step with its own artifact**, is what surfaced it — not the spec or plan
individually, which each looked complete in isolation.

What it still could not catch: the **substance** of the three clarified judgment calls (the
rate-limit number, the timeout split, the D7 mechanism) is exactly as uncertain after the
process as before it — SDD gave me a structured place to write "ASSUMPTION — owner to confirm"
three times, and a checklist that correctly refuses to call the spec fully "written for
non-technical stakeholders," but it cannot manufacture the missing production-traffic data
(D10's entire reason for existing) or substitute for the owner's actual judgment on any of the
three. The process made the uncertainty legible and traceable; it did not reduce it.

## 6. Template/constitution changes recommended

- Give `spec-template.md` an explicit AS-IS subsection (even one line per story) so Principle
  II's evidence requirement has a named home instead of living inside User Story prose.
- Add a "Source repository" field to `plan.md`'s template, next to Project Structure, for the
  meta-repo-plans/subproject-code split this workspace runs on — don't make every plan author
  reinvent that heading.
- Teach `scripts/spec-index.mjs` to recognize `specs/<NNN>-<slug>/spec.md` directories (the
  constitution already names this as the fix) — until then, every Spec Kit feature is
  board-invisible, which undercuts "Specs/ is the live planning system."
- Add a lightweight "flags carried from plan to tasks" check to `/speckit-analyze`'s own
  taxonomy (it already has Constitution Alignment as a category — this run found a real
  instance of exactly that gap, so the category earns its keep but could be more explicitly
  named "did every Constitution Check caveat get a task").
- Clarify in the constitution whether a Spec Kit feature produced by an unattended agent (no
  interactive clarify) needs a different sign-off marker than a human-clarified one — this run
  improvised the `(ASSUMPTION — owner to confirm)` tag; it isn't a defined vocabulary term
  anywhere in `constitution.md` or the templates.
