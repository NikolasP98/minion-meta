# SDD friction log — `004-generic-agent-action-dispatcher`

Agent: one of eleven running the new Spec Kit workflow on one feature each, documents only.
Worktree `~/.cache/claude-tmp/sdd-p4` at `origin/dev` (detached). No code, commits, branches or
background jobs. All times are wall-clock from `date -Is` stamps taken at each phase boundary.

## 1. Phase times

| Phase | From → To | Minutes |
|---|---|---|
| Setup (worktree, read the skill, constitution, templates) + **specify** (incl. reading audits A/E/synthesis, the hub RBAC/bridge/forms code, the gateway tools, and measuring the write surface) | 18:22:38 → 18:29:00 | **6.4** |
| **clarify** | 18:29:00 → 18:30:23 | **1.4** |
| **plan** (research.md → 18:32:55, then data-model, 3 contracts, quickstart, plan) | 18:30:23 → 18:36:08 | **5.8** |
| **tasks** | 18:36:08 → 18:38:08 | **2.0** |
| **analyze** | 18:38:08 → 18:40:18 | **2.2** |
| **Total** | 18:22:38 → 18:40:18 | **17.7** |

The clarify number is misleadingly small and the specify number misleadingly large: see §3.1.
Roughly 4 of the 6.4 specify minutes were evidence work (reading two codebases and running the
enumeration script), not writing. That ratio is the honest cost signal — the template is cheap,
the evidence Principle II demands is not.

## 2. Counts

| Measure | Count |
|---|---|
| Functional requirements | 25 (FR-001…FR-025) |
| Success criteria | 10 (SC-001…SC-010) |
| `[NEEDS CLARIFICATION]` markers left | 3 (the template's maximum) |
| Clarify Q/As recorded | 5 (the skill's maximum), all 5 carrying `(ASSUMPTION — owner to confirm)` on at least part of the answer |
| Tasks | 46 (T001…T046) across 9 phases |
| Analysis findings | 15 — **1 CRITICAL, 3 HIGH, 7 MEDIUM, 4 LOW** |
| Requirement coverage found by analyze | FR 23/25 with a task (92%), SC 6/10 fully covered (60%) |
| Artifacts produced | 9 files (spec, plan, research, data-model, quickstart, 3 contracts, tasks, analysis, checklist, these notes) |

## 3. Tooling friction

### 3.1 The interactive phases collapse into one when there is no user

The brief told me to answer clarify's questions myself from the evidence. The practical effect is
that `specify` and `clarify` **are one phase**: while drafting FRs I already knew which five
decisions were load-bearing, so I wrote the Clarifications section inside `spec.md` during
specify and then spent the clarify phase *reformatting* it to the skill's mandated
`- Q: … → A: …` bullet form and moving it to where the skill wants it (just after the overview,
not after Success Criteria). 1.4 minutes of real clarify work was 1.4 minutes of layout
compliance. For an unattended agent the two skills should be one, or clarify should be defined as
"re-read your own assumptions adversarially" rather than "ask the user".

### 3.2 The clarify skill's heading rule conflicts with carrying unresolved markers

Step 7 says "only allowed new headings: `## Clarifications`, `### Session YYYY-MM-DD`", but the
spec needs a place to list the three deliberately unresolved markers with their rationale. I used
a bolded paragraph lead-in (`**Deliberately unresolved**`) instead of a heading. Works, reads
worse than a heading would.

### 3.3 `setup-tasks.sh` does not create `tasks.md`

`setup-plan.sh` copies the plan template into the feature directory and says so. `setup-tasks.sh`
returns `TASKS_TEMPLATE_CONTENT` as a single JSON string (≈6 KB of escaped markdown dumped into
the transcript) and writes nothing. Asymmetric, and the escaped blob is the least readable way to
hand over a template that is already on disk at the path the same JSON gives me.

### 3.4 `repo-policy.mjs` cannot run in a worktree

`node scripts/repo-policy.mjs show hub` → `ERR_MODULE_NOT_FOUND: Cannot find package 'ajv'`. The
brief's suggested fix (`ln -sfn …/node_modules node_modules`) did not help: the symlinked
`node_modules` is the meta root's, which does not contain `ajv` either. I read `repo-policy.yaml`
directly with `grep`, which contradicts `AGENTS.md`'s instruction to never restate branch roles
from memory and always use the script. The registry is a flat JSON-in-YAML file, so reading it is
safe; the instruction is unenforceable in a fresh worktree.

### 3.5 `check-prerequisites.sh` reports `BRANCH` = the feature directory name

In a detached worktree it prints `"BRANCH":"004-generic-agent-action-dispatcher"`. Harmless here
(I ignored it), but anything downstream that trusts `BRANCH` to be a git branch will be wrong,
and in this workspace the branch genuinely differs per subproject (`master` for hub, `DEV` for
gateway) — so a single `BRANCH` field is the wrong shape regardless.

### 3.6 Template placeholders I could not fill as intended

- **`**Feature Branch**: \`[###-feature-name]\``** (spec and plan). This feature spans three
  repositories with three different PR bases. I replaced the single field with a three-row table
  and said why. The template assumes one repo per feature; this workspace has seven.
- **Plan "Source Code (repository root)" tree** offers "Option 1 single project / Option 2 web
  application / Option 3 mobile + API". None matches "two existing services plus a browser
  surface, nothing new". I deleted the options and wrote the three real trees.
- **Tasks template "Phase 1: Setup — initialize project, configure linting"** assumes a
  greenfield project. There is nothing to initialise; I used Phase 1 for the owner gate, the
  board stub and the worktrees, which is the honest analogue.
- **`quickstart.md`** is described as "runnable validation scenarios". Mine opens with two
  blocking human/other-slice prerequisites, so it is not runnable today. I said so at the top
  rather than writing a guide that silently cannot be followed.

### 3.7 `/speckit-analyze` says read-only, the brief says write a file

The skill's Operating Constraints are explicit: "**STRICTLY READ-ONLY**: Do not modify any files.
Output a structured analysis report" and step 6 says "(no file writes)". The brief required
`analysis.md`. I wrote the file and recorded the contradiction at the top of it. Also: step 8
asks the user whether to apply remediations — with no user, I stated that nothing was applied.

### 3.8 Nothing checks the spec directory into the board

`.specify/feature.json` and the `specs/<NNN>-<slug>/` layout are Spec Kit's. The meta board reads
only top-level `specs/*.md` via `scripts/spec-index.mjs`. The constitution anticipates this and
requires a stub, but no Spec Kit step produces one, so it only happens if the agent remembers.
I did not write it (documents-only scope read strictly) and logged it as finding E8 against
myself.

### 3.9 Non-issues worth recording

- No `.specify/extensions.yml` exists, so every skill's long pre/post hook section was a no-op —
  roughly 40% of each SKILL.md's text. Cheap to skip, expensive to read five times.
- `.specify/scripts/bash/check-prerequisites.sh` and `setup-plan.sh` both worked first try.
- `update-agent-context` is referenced in the brief as a known hazard; this version of the
  skills never invoked it, and no `CLAUDE.md` was touched.

## 4. Fit with the Minion SDLC

**Overlaps (same intent, different words)**

| Spec Kit | Minion contract | Verdict |
|---|---|---|
| spec → plan → tasks → implement | `AGENTS.md` "SDLC Contract": proposal → spec → dev → merge → deploy → post-merge verification | Compatible, but Spec Kit has **no proposal stage and no post-merge verification stage**. This feature *came from* a proposal (`2026-10-15-agent-harness-restoration.md`) that Spec Kit has nowhere to point at except prose, and nothing in `tasks.md` would exist if I had not added T045/T046 myself. |
| `spec.md` User Scenarios + Success Criteria | `specs/TEMPLATE.md` + Principle II AS-IS/TO-BE/DELTA | **Conflict** (see below). |
| plan "Constitution Check" | Principles I–V as a gate | Genuine win: the table forced me to state Principle V as a blocker in writing rather than noting it. |
| tasks phases | Principle III slices (one PR per slice, registry PR base, foreground gates) | Partial. Spec Kit's phases are *story*-shaped; Minion's slices are *PR*-shaped. They are not the same partition, and I had to carry both (`plan.md` §Slices vs `tasks.md` Phases) and then reconcile them — analyze flagged the duplication as F3. |

**Conflicts**

1. **Spec Kit §Quick Guidelines: "Avoid HOW to implement (no tech stack, APIs, code structure) …
   written for business stakeholders" vs Constitution Principle II: "anchors (file:line, query,
   screenshot, transcript)".** Direct and unavoidable. A Minion-compliant spec cannot pass Spec
   Kit's own quality checklist item "No implementation details". I resolved it by quarantining
   anchors in AS-IS/DELTA/Clarifications/Assumptions and keeping FRs and SCs behavioural, and by
   marking the checklist items as reasoned deviations instead of silently ticking them. Two of the
   16 checklist items are unfixable this way.
2. **"Success criteria must be technology-agnostic" vs a feature whose whole point is removing a
   per-route code cost.** SC-002/SC-003 count API routes and repositories. There is no
   user-facing phrasing of "no gateway deploy needed". Declared as a deviation.
3. **One `Feature Branch` field vs per-repo branch roles.** §3.6. Spec Kit assumes the spec lives
   in the repo it describes; here the spec lives in `minion-meta` and the code lives in two
   others.
4. **`/speckit-analyze` read-only vs the Minion habit of committing state to artifacts.** §3.7.
   The constitution says "work that exists only in chat … does not exist", which makes a
   print-only analysis the wrong default for this workspace.

**Holes (neither side covers)**

- **No stage owns "the gates I must run before the PR".** Principle III names them, the plan
  template has no field for them, `tasks.md` has no required field for them. I put a table in
  `tasks.md`'s header by hand. A `/speckit-tasks` that emitted the repository's own gate commands
  per slice would eliminate a whole class of "I committed a type error" mistakes.
- **No stage owns the open-items ledger.** The constitution demands a `TODO(handoff)` plus a
  `proposals/` entry; Spec Kit's nearest thing is `/speckit-converge`'s leftover list, which the
  constitution explicitly says is not a substitute. I added T003 and T044. An agent following
  Spec Kit literally would ship the feature and lose the three open ends.
- **Nothing links a spec to the audit that justified it.** I used prose. A frontmatter
  `evidence:` list (like `specs/TEMPLATE.md`'s `id`) would make the link machine-checkable.

## 5. Would SDD have changed the outcome?

Yes, in one specific and measurable way, and it is not the way the ceremony advertises. The
proposal's slice S3 reads "one hub `actions/dispatch` deferring to `apiWriteCapability` + one
gateway tool with a route manifest; retire the 17-string allowlist; forms gain `submit`" — which
sounds like "the agent can then do anything the user's RBAC allows". Writing the spec forced two
numbers out of the code that the proposal and the audit both leave implicit: **193 of 364** write
pairs are capability-mapped, so the dispatcher's ceiling is 53% of the write surface, not 100%;
and the **171** that are not mapped include the whole of gap #10 (team and access admin), which
would therefore have been "finished" and still broken. It also surfaced, from a 2-minute read of
`@sveltejs/kit`'s `fetch.js`, that `event.fetch` runs the real route through the whole hooks
pipeline — which converts the hardest part of the job (re-applying module-enabled, owner scope
and masking, the three checks the current bridge lacks) from 193 re-implementations into zero
lines. Neither number nor that mechanism is in the audit, the proposal, or my own first instinct.

What the spec still could not catch: whether the ALS handoff survives every async path in a real
request (only running it will tell), whether the eight form pages can actually expose a
programmatic submit (unverified per page, stated as an assumption), and the honest fact that this
whole feature is unobservable through any channel until slice S0 restores the bridge — the spec
*records* that, but recording it is not the same as the 403 being gone. And it did not stop me
from writing a success criterion (SC-002, ~150 operations) that my own task list misses by a
factor of five; `/speckit-analyze` caught that, four phases later, which is an argument for
running analyze earlier rather than for the spec having worked.

## 6. Template / constitution changes I recommend

- **Spec template**: add `## AS-IS / TO-BE / DELTA` as mandatory sections, and change the quality
  checklist item "No implementation details" to "No implementation details **outside AS-IS,
  DELTA and Assumptions**" — otherwise every Minion spec fails its own checklist.
- **Spec template**: replace the single `**Feature Branch**` field with a `**Repos & PR bases**`
  table; most Minion features touch two or more subprojects.
- **Spec template**: add an `**Evidence**` frontmatter list (audit/proposal/PR ids) so the link
  from a spec to what justified it is machine-checkable, not prose.
- **Plan template**: add a `**Gates before PR**` field per slice, populated from
  `repo-policy.yaml` `commands`, and a `**Blocked by**` field for cross-slice dependencies like S0.
- **Tasks template**: Phase 1 should be "Gates & prerequisites" (owner approval, blocking slices,
  worktrees), not "initialize project" — Minion has no greenfield features.
- **Tasks template**: require a final "Open items" phase that emits the `TODO(handoff)` + a
  `proposals/` entry; the constitution's ledger is otherwise agent-memory-dependent.
- **Constitution II**: distinguish "unverified claim" (blocks `/speckit-plan`) from "open owner
  decision" (blocks `/speckit-implement` only). Today the plan phase needs a self-granted
  exemption to run with any `[NEEDS CLARIFICATION]` left — finding E7.
- **Constitution, artifact layout**: make the top-level board stub a step of `/speckit-specify`
  (or teach `scripts/spec-index.mjs` to read `specs/*/spec.md`), instead of an obligation the
  agent must remember.
- **`/speckit-analyze`**: allow writing the report to `<feature dir>/analysis.md`. A read-only
  report contradicts "work that exists only in chat does not exist".
- **`/speckit-clarify`**: define an unattended mode — "answer from evidence, tag every answer that
  is an assumption" — so it is a distinct phase rather than a reformatting pass (§3.1).
- **`setup-tasks.sh`**: copy `tasks-template.md` into the feature directory the way
  `setup-plan.sh` does, instead of returning 6 KB of escaped JSON.
