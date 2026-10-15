# SDD friction log — 101-retro-pos-shift-scoped-edits (retrospective run)

This feature is **already live** (hub #534/#535/#536, merged 2026-10-15). The Spec Kit artifacts
were written from the originating request, the original flat spec's AS-IS recon and the PR
intent — never from the shipped code — so the friction below is the friction of the workflow,
not of the feature.

## 1. Phase times (wall clock, from `date -Is` at each boundary)

| Phase | From → to | Minutes |
|---|---|---|
| (reading inputs: brief, flat spec, proposal, 3 PR bodies, 3 diffs, skills, templates, constitution) | 18:23:44 → 18:25:05 | 1.5 |
| specify (dir, template, spec.md, requirements checklist) | 18:25:05 → 18:27:14 | 2.2 |
| clarify (taxonomy scan, 5 Q/A, FR/INV integration, checklist re-validation) | 18:27:14 → 18:29:40 | 2.4 |
| plan (setup-plan.sh, plan.md, research.md, data-model.md, contracts/, quickstart.md) | 18:29:49 → 18:32:30 | 2.7 |
| tasks (setup-tasks.sh, 53 tasks) | 18:32:30 → 18:34:02 | 1.5 |
| analyze (prerequisites, 11 findings, coverage table, analysis.md) | 18:34:02 → 18:35:31 | 1.5 |
| **total (specify → analyze)** | | **10.3** |

Reading the three PR diffs (2.9k lines) dominated nothing — the phases are cheap; the inputs
are the cost. The retro-scorecard, not part of the Spec Kit flow, took about as long as all
five phases together because it needs the merged diffs read per requirement.

## 2. Counts

- Functional requirements: **23** (FR-001…FR-023) + 2 deferred (`FR-011a`, `FR-021a`)
- Invariants: **6** · Success criteria: **6** · User stories: **4** · Edge cases: **7**
- `[NEEDS CLARIFICATION]` markers left: **2**
- Clarify Q/As: **5** (2 tagged `(ASSUMPTION — owner to confirm)`)
- Tasks: **53** across 7 phases, mapped to 3 PR-sized slices
- Analysis findings: **1 CRITICAL, 2 HIGH, 5 MEDIUM, 3 LOW** (11 total)
- Coverage: FR 22/23 with ≥1 task (96%), INV 5/6, SC 5/6

## 3. Tooling friction

1. **No script errors.** `check-prerequisites.sh --json --paths-only`, `setup-plan.sh --json`
   and `setup-tasks.sh --json` all worked in a **detached-HEAD worktree**, which is the shape
   every Minion agent works in. `common.sh` falls back to the feature-directory basename when
   there is no branch, so `BRANCH` came back as `101-retro-pos-shift-scoped-edits` — a lie that
   is harmless here but would be confusing in a report.
2. **`setup-tasks.sh` does not copy a template**, unlike `setup-plan.sh`; it returns the whole
   template inline in JSON (a ~6 KB blob in the tool output). Mild context tax, no action taken.
3. **The specify checklist and the clarify quota contradict each other.** Specify's embedded
   checklist requires "No [NEEDS CLARIFICATION] markers remain" to pass; clarify caps the
   session at 5 questions and tells you to flag the rest as Deferred. With two genuinely open
   product questions, one of the two rules must break. I left the markers and unchecked the
   item with a note (`checklists/requirements.md` Notes), because deleting an open question to
   green a checklist is the exact failure mode this audit is looking for.
4. **"No implementation details" vs. the constitution's evidence anchors.** The spec template's
   Content Quality item forbids implementation detail; constitution Principle II *requires*
   AS-IS with `file:line` anchors. I resolved it by confining anchors to a non-template
   "Current behavior (AS-IS)" section and keeping Requirements / Success Criteria clean. The
   template has no slot for that section at all — I had to invent the heading.
5. **The plan template's "Project Structure" tree assumes a greenfield single repo** (Option 1
   `src/models|services|cli|lib`, Option 2 `backend/ + frontend/`). None fits a SvelteKit app
   where routes, server services and UI live in one `src/`. I replaced the whole block; the
   "delete unused Options" instruction was the only part that applied.
6. **No `.specify/extensions.yml`**, so both skills' long hook preambles (≈40 lines each, in
   every skill) are dead text in this workspace. They are the single largest part of each skill
   file and the first thing a reader must skip.
7. **`/speckit-analyze` is declared STRICTLY READ-ONLY ("Output a structured analysis report …
   do not modify any files")**, while this audit's brief requires writing it to `analysis.md`.
   I wrote the file. If the file-writing variant becomes the norm, the skill text should say so,
   or every run of it is a deliberate rule break.
8. **`update-agent-context` never came up** — no skill in the five I ran invokes it, so nothing
   touched `CLAUDE.md`/`AGENTS.md`. Good.
9. **The feature number is manual.** `feature_numbering: "sequential"` means "next 3-digit
   number after scanning `specs/`", but `specs/` here holds ~200 flat `YYYY-MM-DD-*.md` files
   and no numbered directories, so the scan yields nothing and the number is whatever the
   orchestrator assigns (101 for me). Eleven agents running at once would all compute the same
   "next" number if they trusted the script.

## 4. Fit with the Minion SDLC

**Overlaps (Spec Kit section ↔ Minion contract):**

- Spec Kit `spec.md` *Functional Requirements* + *Success Criteria* ↔ `AGENTS.md` SDLC "TO-BE
  (desired observable behavior + invariants)". Clean fit; Spec Kit is stricter about
  measurability, and that is exactly where the original flat spec was weakest (scored 2/5).
- Spec Kit `tasks.md` phases ↔ the contract's "slice-scoped branch + draft PR". Fits once you
  accept that a "phase" is not a PR: I had to say so explicitly (US1+US2 = one PR) because the
  template's dependency section claims all user stories can proceed in parallel after
  Foundational. In one repo with one shared service file and a one-PR-at-a-time release train,
  they cannot.
- `plan.md` *Constitution Check* ↔ the contract's required build steps. This is the best fit of
  all: Principle IV forced route-contract counts, the frozen export inventory, Paraglide both
  locales and design/token lint into `tasks.md` as numbered tasks (T011, T013, T017, T034, T042)
  instead of tribal knowledge. The stock Spec Kit template would have produced none of them.

**Conflicts:**

- **Artifact location.** Spec Kit wants `specs/<NNN>-<slug>/`; the meta board's indexer
  (`scripts/spec-index.mjs`) reads only top-level `specs/*.md`. The constitution already
  patches this with a "board stub" rule, and I had to make that patch a task (T053). Until the
  indexer learns directories, every Spec Kit feature is two artifacts in two formats.
- **Branches.** Spec Kit's whole identity model is "one feature = one git branch in this repo".
  Minion features live in *subproject* repos (this one in `minion_hub`, PR base `master`) while
  the spec lives in minion-meta. `SPECIFY_FEATURE_DIRECTORY` + `feature.json` sidesteps it
  cleanly — but `BRANCH` in every script's output remains meaningless, and `spec.md`'s
  mandatory **Feature Branch** header field is a field with no true value.
- **Frontmatter.** `specs/TEMPLATE.md` (the flat format) carries `id/status/stage/pass/repos/
  type/tags` that the board, the factory and the proposal index all read. Spec Kit's `spec.md`
  has a prose header instead (`**Status**: Draft`) that nothing machine-reads. Two state models
  for one feature; the stub is the only bridge.

**Holes neither covers:**

- **No stage for the 2-pass spec review** the contract names (`specs/*.review.md`). The original
  artifact skipped it too (`pass: 1`, no review file), so nothing in either process caught that.
  `/speckit-analyze` is self-review by the same author and cannot substitute.
- **The open-items ledger has no artifact slot.** The constitution demands `TODO(handoff)` +
  `proposals/` entry; Spec Kit's nearest thing is `/speckit-converge` output, which the
  constitution explicitly says is not a substitute. I had to carry it as plan prose + two tasks
  (T048, T051). The shipped work shows exactly why this needs teeth: 8 ledger items,
  **1** in-code `TODO(handoff)`.
- **Nothing ties a task to its commit.** The flat spec's "Shipped" block (PR number + SHA +
  date in the spec itself) is strictly better than anything Spec Kit offers, and I kept it only
  by writing it into the retro scorecard by hand.

## 5. Would SDD have changed the outcome?

Marginally, and in a specific way. The flat spec was already strong where it matters most here —
AS-IS evidence (5/5), invariants, and slice→PR→commit traceability (5/5) — so SDD did not
rescue a bad artifact. What the Spec Kit pass made explicit that the inputs left implicit is
narrow but real: the month's timezone as a *requirement* rather than an implementer's lucky
catch (FR-018); the unlock's auditability *before* it became the only `TODO(handoff)` in the
diffs (FR-022/INV-6); rejection-handling as a visible open question instead of a sentence in a
PR body (FR-011a); measurable criteria at all (SC-001…SC-006, absent from the original); and
two coverage facts that a prose spec hides — that T1(b)(c) had no slice (shipped missing, found
later in the ledger) and that invariant I3 has no test in any of the three PRs. The
requirements-to-tasks table is the mechanism for the last two: a row with no task id and a row
with no test name are both unmissable. What it could not catch is everything the code knows:
the dead `documentDefault` setting and its revision-hash side effect, the mock-db fixtures that
every new guard read breaks, the hand-built integration schema — and it actively *added* one
false requirement (the route-contract manifest, which does not apply to API-only routes). A
spec can make an omission visible; it cannot make a codebase legible.

## 6. Template / constitution changes I recommend

- **Add an `## AS-IS (evidence)` section to `spec-template.md`**, and soften the checklist item
  to "no implementation detail *outside AS-IS*". Today the template and Principle II contradict.
- **Add a `## Traceability` table to `tasks.md`** (task → PR → commit), filled at merge. The
  flat spec's "Shipped" block already does this and is the single best thing it has.
- **Add an `## Open items` section to the spec template** with two required columns, *in-code
  marker* and *proposal entry*. The constitution's ledger rule needs a slot, not prose.
- **Reconcile the specify checklist with clarify's 5-question cap**: allow ≤3 surviving
  `[NEEDS CLARIFICATION]` markers when each is listed under a *Deferred* heading with a reason.
- **Make the human gate a task, not a principle.** Require `tasks.md` to open with a
  `T000 owner approves this spec` when the feature is security/data-tagged; `analysis.md`'s only
  CRITICAL finding in this run was that I forgot it, and so did the real work.
- **Drop the hook preambles** (or move them to one shared file). With no `.specify/extensions.yml`
  they are ~80 dead lines per skill and they bury each skill's actual outline.
- **Make the feature number explicit.** With a flat `specs/` board, "next sequential" resolves
  to nothing; the constitution should say the orchestrator assigns `<NNN>`, as it did here.
- **Replace the plan template's project-structure Options** with "paste the real tree"; none of
  the three options fits a SvelteKit app, a pnpm monorepo gateway, or a VS Code extension.
