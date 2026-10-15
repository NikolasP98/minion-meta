# SDD Friction Log: Spec Index / Spec Kit Directory Bridge (KEY=p8)

## 1. Phase times (wall-clock, from `date` stamps taken at each boundary)

| Phase | Start | End | Duration |
|---|---|---|---|
| Setup (worktree + evidence reading, not a Spec Kit phase) | 18:23:33 | 18:24:20 | ~0m47s *(undercounts — most evidence reading, including the full `spec-index.mjs`, `TEMPLATE.md`, `constitution.md`, `AGENTS.md` section, `ci.yml`, `topics.json`, and a baseline `--check` run, happened in tool calls before the first `date` stamp was taken; see §3)* |
| Specify (spec.md + checklist) | 18:24:20 | 18:27:21 | **3m01s** |
| Clarify (merged into specify's write — Q/As were authored directly into spec.md's Clarifications section per the audit brief's explicit instruction; this stamped interval is re-confirming the skill's expectations, not fresh Q&A work) | 18:27:21 | 18:28:30 | **1m09s** |
| Plan (plan.md + research.md + data-model.md + quickstart.md) | 18:28:30 | 18:32:16 | **3m46s** |
| Tasks (tasks.md) | 18:32:16 | 18:33:21 | **1m05s** |
| Analyze (analysis.md) | 18:33:21 | 18:34:42 | **1m21s** |
| **Total (specify→analyze)** | 18:24:20 | 18:34:42 | **10m22s** |

The upfront research (reading `scripts/spec-index.mjs` in full, `scripts/spec-frontmatter.mjs`,
`specs/TEMPLATE.md`, `.specify/memory/constitution.md`, the `AGENTS.md` Spec Kit section,
`.github/workflows/ci.yml`, `specs/topics.json`, a sample `specs/index.json` row, and the
`.specify/templates/{spec,plan,tasks}-template.md` files, plus the `speckit-specify`/
`speckit-plan`/`speckit-tasks`/`speckit-analyze` skill files themselves) is the majority of
the real effort and is not cleanly attributable to one Spec Kit phase — it's prerequisite
reading no skill file tells you to do explicitly, but which `/speckit-specify`'s "Make
informed guesses" instruction implicitly requires if the guesses are to be any good. The
phase-time table above should be read as "time to author the artifact once the evidence was
in hand," not "time including discovery" — discovery took roughly as long again as all five
authoring phases combined, unstamped.

## 2. Counts

- **Functional requirements**: 14 (FR-001 … FR-014)
- **Success criteria**: 5 (SC-001 … SC-005)
- **`[NEEDS CLARIFICATION]` markers left unresolved**: 0 (all 3 raised during drafting were
  resolved in the Clarifications section, each tagged with its confidence level)
- **Clarify Q/As**: 3 (all answered by the agent from evidence, 2 of 3 tagged
  `(ASSUMPTION — owner to confirm)`, 1 not tagged because it was directly stated by the
  feature description itself, not inferred)
- **Tasks**: 19 (T001 … T019), across 7 phases, organized by 4 user stories (2 of which,
  US1+US2, share almost all implementation surface and are deliberately not split into
  separate task sub-lists)
- **Analysis findings by severity**: CRITICAL 0, HIGH 1, MEDIUM 1, LOW 2 (one of the two LOW
  findings is informational/pre-existing and explicitly not actionable within this feature)

## 3. Tooling friction

- **No script error, but one real environment gap**: `node scripts/repo-policy.mjs show
  minion-meta` failed with `ERR_MODULE_NOT_FOUND: ajv` because the brief's suggested
  `ln -sfn .../node_modules node_modules` symlink doesn't make every transitive dependency
  resolvable the way a real `pnpm install` would (pnpm's node_modules layout is itself a
  symlink farm keyed to the *installing* project's lockfile; borrowing another checkout's
  `node_modules` works for flat deps like `ajv` only if that checkout hoisted it the same
  way). This blocked confirming `minion-meta`'s own registered PR base with certainty —
  recorded as Constitution Check Principle III's one open assumption (flagged ASSUMPTION
  in `plan.md`, re-surfaced as analysis finding A2) rather than silently guessed past.
- **Template placeholder I did not know how to fill**: the `plan-template.md` "Technical
  Context" block (Language/Version, Primary Dependencies, Storage, Target Platform, Project
  Type, Performance Goals, Constraints, Scale/Scope) is written for an application feature
  with a frontend/backend/mobile shape. This feature is a one-file build-script change with
  no runtime, no storage beyond a committed JSON file, and no "platform" beyond "Node on a CI
  runner." I filled every field honestly rather than leaving placeholders, but several
  answers are "N/A" or "the same answer as every other field" (e.g. Target Platform =
  Performance Goals' qualifier), which suggests the template's implicit assumption (this
  produces an app with distinguishable tiers) doesn't hold for meta-repo tooling work. Same
  issue, worse, for `plan-template.md`'s "Project Structure → Source Code" block, which
  offers three structural options (single project w/ `src/services/cli`, web app
  frontend+backend, mobile+API) — none fit "modify one existing script in place"; I wrote a
  fourth, ad-hoc structure and said so explicitly rather than forcing the feature into
  `src/models/`.
- **Step whose instructions contradicted this workspace**: the plan skill's template has NO
  section for AS-IS→TO-BE→DELTA (the Minion constitution's Principle II, NON-NEGOTIABLE), and
  no section maps each functional requirement to a proving test by number the way the Minion
  spec template's "DELTA" convention demands. I added a "Constitution Check → AS-IS → TO-BE →
  DELTA" subsection inside `plan.md` that the stock Spec Kit template doesn't have a slot
  for, because omitting it would have meant silently dropping a NON-NEGOTIABLE principle to
  stay template-shaped. This is the single largest structural accommodation this run made.
- **`update-agent-context` / CLAUDE.md touching**: not encountered — this workflow run never
  invoked `/speckit-implement` or any step that writes to `CLAUDE.md`/root `AGENTS.md` beyond
  this feature's own *proposed* edit to `AGENTS.md`'s Spec Kit section (captured as task
  T014, not actually executed — this run produces documents only, per the audit brief).
- **`specs/` layout vs. the flat `specs/*.md` board**: this is not incidental friction, it
  IS this feature's subject — see §4.
- **Git branches vs. subproject repos**: not encountered as friction. This feature's scope is
  entirely `minion-meta` tooling; no subproject branch/worktree questions arose. The one
  branch-identity question that *did* arise (minion-meta's own PR base) is the `ajv` gap
  above, a tooling/environment problem, not a conceptual branch-vs-repo confusion.
- **Checklist self-honesty**: `/speckit-specify`'s mandated quality checklist
  (`checklists/requirements.md`) has two items ("written for non-technical stakeholders,"
  "success criteria are technology-agnostic") that this feature's nature makes impossible to
  satisfy honestly — the "user" of a build-script-tooling feature is another agent/developer,
  and the acceptance criteria necessarily name scripts and npm commands. Rather than reword
  around this to force green checkmarks, the checklist records both as failed with a
  one-paragraph justification. This is itself a friction data point: the checklist template
  has no "N/A, see note" state, only pass/fail, for a criterion that doesn't actually apply
  to an internal-tooling feature.

## 4. Fit with the Minion SDLC

- **`specs/` layout vs. the flat `specs/*.md` board** (the core conflict this feature
  exists to resolve): `specs/TEMPLATE.md` and `AGENTS.md`'s Project Map section describe one
  committed artifact, `specs/index.json`, generated from a flat `specs/*.md` scan; Spec Kit's
  own convention (`specs/<NNN>-<slug>/{spec,plan,tasks}.md`) is a second, incompatible
  layout the constitution bridges today with a manual stub rule. This feature's `spec.md`
  itself had to decide, mid-draft, whether it IS one of these "first-class directory
  features" or needs its own top-level stub under the *current, unmodified* rule — since the
  common audit brief's `SPECIFY_FEATURE_DIRECTORY=specs/008-spec-index-speckit-bridge` already
  places it in the new layout, and since this run produces documents only (no code change
  ships), no stub was created; under today's *actual, unmodified* constitution this spec is
  therefore currently invisible to the real board until either (a) this feature's own code
  ships, or (b) someone manually stubs it — a small, concrete illustration of the exact
  chicken-and-egg problem the feature describes.
- **AS-IS/TO-BE/DELTA with evidence anchors (Minion §Principle II) vs. Spec Kit's spec
  template**: no overlap at all — Spec Kit's spec-template has User Scenarios/Requirements/
  Success Criteria/Assumptions, none of which is "AS-IS." This is the single biggest
  structural gap between the two contracts (see §3's note on where it was added to `plan.md`
  instead). The Minion template's own convention note ("A slice that doesn't trace to a
  DELTA entry is scope creep; a DELTA entry with no proving test is an open end") has no Spec
  Kit equivalent at all — Spec Kit's FR→task traceability is present (via `[Story]` tags) but
  is requirement→task, not requirement→*test-that-proves-it*, which is a narrower claim.
- **repo-policy branch roles**: Spec Kit has no concept of a target repository's PR base at
  all — `plan-template.md`'s "Technical Context"/"Project Structure" never asks which repo or
  branch the change lands on. The Minion constitution's Principle III folds this in
  explicitly ("the repository's registered PR base... from an isolated worktree"), and this
  run had to add a Constitution Check row to carry it since nothing in the stock plan
  template would have surfaced the question otherwise.
- **Required build steps (Principle IV)**: clean overlap, not a conflict — this feature
  legitimately has none of the triggering conditions (no hub/site UI, no new route, no
  user-facing string), so the Constitution Check row is a one-line "not applicable" rather
  than friction. Would not generalize to a hub/site feature, where Spec Kit's template has no
  slot at all for "run `lint:design && lint:tokens`" or "wire RBAC" — those would need the
  same ad-hoc Constitution Check accommodation this run gave Principle II.
- **Security/data human gates (Principle V)**: clean overlap — Spec Kit's `spec-template.md`
  has no security/compliance section by default, but the Minion topics taxonomy
  (`specs/topics.json`'s `security`/`data`/`permissions` tags with `riskTier: high`) sits one
  level below the spec and was checked against during Assumptions-writing without needing a
  template change.
- **Open-items ledger**: Spec Kit has no equivalent concept at all (no "TODO(handoff)" or
  "proposals/" convention in any skill file read during this feature). `tasks.md`'s T019 is
  this run's own addition, bridging Spec Kit's task list to the Minion ledger convention —
  not prompted by any Spec Kit template section.

## 5. Would SDD have changed the outcome?

Running this feature through Spec Kit's discipline — rather than, say, an agent reading the
feature description and jumping straight to editing `scripts/spec-index.mjs` — made three
things explicit that the raw feature description left implicit: (1) exactly what `id` means
for a directory spec and how it interacts with the existing cross-file duplicate check
(Clarifications Q3; the feature description's one-line "id = directory name" doesn't by
itself address the collision case, which only surfaced once the spec's Edge Cases and FR-004
forced the question); (2) that Spec Kit's own `**Status**` body field and the frontmatter
`status` field are two different things with no sync mechanism, which an implementer moving
fast might have conflated, silently reading the wrong one (Clarifications Q2); and (3), the
most concrete catch, that a literal, full-line-anchored heading-lint regex for "## Requirements"
would reject the real heading text `## Requirements *(mandatory)*` that Spec Kit's own
template always produces — found not during specify or plan, but during `/speckit-analyze`'s
dedicated ambiguity pass (finding A1), specifically *because* the process forced writing out
the exact pattern design in `data-model.md` and then separately, adversarially, re-reading it
against the actual template text already sitted in this repo. A developer moving directly to
code very plausibly writes that same over-strict regex, runs it against their own hand-typed
test fixture (which they'd naturally write without the `*(mandatory)*` suffix), sees it pass,
and ships a lint that silently rejects every real Spec-Kit-authored spec — exactly the kind
of bug that only shows up once real users hit it, which is what the analyze phase is for.

What SDD still could not catch: the plan-vs-reality gap on `minion-meta`'s own PR base (A2)
is an *environment* limitation (read-only worktree, partial `node_modules`), not something
more process would have surfaced — no amount of careful spec-writing produces a working `ajv`
resolution. And the deeper structural mismatch (§4, Spec Kit's template has no AS-IS/TO-BE/
DELTA slot) was caught by *this reviewer's* familiarity with the Minion constitution, not by
Spec Kit's own analyze pass, which checks internal consistency among `spec.md`/`plan.md`/
`tasks.md` and the *installed* constitution file, not whether the constitution's own template
contract is expressible in Spec Kit's upstream templates at all — that gap is invisible to
the tool from the inside.

## 6. Template/constitution changes recommended

- Add an "AS-IS / TO-BE / DELTA" section to `.specify/templates/plan-template.md` (or
  `spec-template.md`) directly, rather than leaving every Minion-workspace plan to improvise
  where it goes, as this run did.
- Add a repo/branch-target field to `plan-template.md`'s Technical Context (e.g. "Target
  Repo" / "PR Base"), since Principle III requires it on every slice-scoped plan and the
  stock template has nowhere to put it.
- Give `.specify/templates/spec-template.md`'s eventual TEMPLATE.md-frontmatter block (this
  feature's own FR-005/T010) a documented default `tags`/`type` convention so agents don't
  each independently guess, as this run did, which `specs/topics.json` tag fits a given
  feature.
- Add an explicit "N/A — not applicable to this feature, see note" state to the
  `requirements.md` quality checklist for the two items ("non-technical stakeholders,"
  "technology-agnostic success criteria") that cannot both be true and honest for a
  tooling/infra feature whose user IS the tooling.
- Once this feature ships, remove the stub-spec sentence from both
  `.specify/memory/constitution.md`'s "Artifact layout and registration" section and
  `AGENTS.md`'s "Spec-driven workflow (Spec Kit)" section (this feature's own FR-013/T013-T015
  — restated here because it is the one constitution change this whole feature exists to
  produce, not a side observation).
