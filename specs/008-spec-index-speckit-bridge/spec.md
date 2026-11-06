---
id: 008-spec-index-speckit-bridge
title: Spec Index / Spec Kit Directory Bridge
stage: spec
status: draft
pass: 1
created: 2026-10-15
updated: 2026-10-15
repos: [minion-meta]
type: infra
tags: [infra]
---

# Feature Specification: Spec Index / Spec Kit Directory Bridge

**Feature Branch**: `008-spec-index-speckit-bridge`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Make Spec Kit feature directories first-class in the minion-meta
planning board. Spec Kit (installed 2026-10-15, meta #805) writes features to
`specs/<NNN>-<slug>/spec.md|plan.md|tasks.md`, but `scripts/spec-index.mjs` reads only
top-level `specs/*.md` (line ~623), validates `specs/TEMPLATE.md` frontmatter, and
regenerates the committed `specs/index.json` that the board and CI gate
(`pnpm run index:check`) consume. The constitution currently requires a top-level stub spec
per Spec Kit feature as a bridge. Deliver: (1) `.specify/templates/spec-template.md` gains
the TEMPLATE.md frontmatter block so `spec.md` is SDLC-compliant from birth (id = directory
name); (2) spec-index scans `specs/*/spec.md` in addition to top-level files, maps Spec
Kit's status vocabulary to the index enum, and emits index rows that point at the directory;
(3) the CI gate, `spec-index.test.mjs`, heading-lint baseline and `proposal-index.mjs` keep
passing; (4) remove the stub rule from the constitution and AGENTS.md section. Not security
tagged."

## Clarifications

### Session 2026-10-15

- Q: Spec Kit's native `spec.md` body (User Scenarios & Testing / Requirements / Success
  Criteria) does not contain a `## 0. Product` heading, an out-of-scope label, or a
  verification label — the three sections `missingRequiredHeadings()` currently requires on
  every non-grandfathered spec (`scripts/spec-index.mjs` `REQUIRED_HEADINGS`, lines ~155-165).
  Does the heading lint apply to directory `spec.md` files unchanged, or does it need a
  parallel contract for Spec Kit's own body shape? → A: Directory `spec.md` files get a
  **parallel, Spec-Kit-shaped heading contract**, not the flat-file one verbatim: require the
  `## Requirements` (or `### Functional Requirements`) heading Spec Kit's own template always
  emits, plus a `## Assumptions` section (Spec Kit's native home for scope boundaries — the
  functional equivalent of "out of scope" here), and a verification anchor satisfied by
  `tasks.md` existing in the same directory with at least one completed/defined task OR a
  `**Verification:**` label in `spec.md` itself. This avoids forcing Spec Kit's generator to
  emit a flat-file-shaped heading it was never designed to produce, while still requiring
  *some* machine-checkable scope and verification signal. *(ASSUMPTION — owner to confirm: this
  is a new, additive lint branch, not a relaxation of the existing flat-file rule.)*
- Q: Spec Kit's own `**Status**: Draft` field in the body is free text chosen by whichever
  skill last wrote the file (`Draft`, and by convention after `/speckit-clarify`/`/speckit-plan`
  informally "Planned", "Tasks Generated", etc. — there is no enforced enum in any Spec Kit
  template read during this feature's research). The board's `status` enum
  (`scripts/spec-frontmatter.mjs` `STATUSES`) has 13 values with specific meanings (`review`,
  `approved`, `implementing`, …). What is the source of truth for a directory spec's indexed
  `status` — the free-text body field, or the frontmatter this feature adds to `spec.md`? → A:
  **The frontmatter is the source of truth**, exactly as it already is for every top-level
  spec. The body's `**Status**: Draft` line is Spec Kit's own cosmetic field and is never read
  by the index; FR-005 below pre-fills the frontmatter `status: draft` at creation time so the
  two labels start in sync, and later phases (`/speckit-plan`, `/speckit-tasks`) are
  responsible for advancing the frontmatter `status`, not the body line.
  *(ASSUMPTION — owner to confirm: no automated sync between the two is in scope for this
  feature; a human or a future hook updates frontmatter `status` by hand as the Spec Kit
  lifecycle advances.)*
- Q: `specs/TEMPLATE.md`'s `id` field doc says "filename sans `.md`; stable forever, the join
  key for links." For a directory spec the natural analogue is the directory name
  (`008-spec-index-speckit-bridge`), not `spec.md` sans extension (which would collide across
  every feature). Is directory-name-as-id correct, and how does the uniqueness/collision check
  (`fmById` in `scripts/spec-index.mjs`) treat an id that matches a directory-sourced spec and
  an id that happens to match an existing top-level filename? → A: **Directory-name-as-id is
  correct** (feature description says so explicitly: "id = directory name"). The existing
  `fmById` duplicate-id check already walks every scanned file regardless of source, so
  extending the scan loop to also walk `specs/*/spec.md` makes a same-id collision between a
  top-level file and a directory automatically fail the gate with the existing
  `"duplicate id ... already used by another spec"` message — no new collision logic needed,
  only the broadened `readdirSync` input FR-002 describes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spec Kit feature appears on the board without a stub (Priority: P1)

An agent runs `/speckit-specify` inside a subproject or the meta repo, producing
`specs/042-foo/spec.md` with the new frontmatter block already filled in. Without the agent
hand-authoring a separate top-level `specs/<date>-foo-spec.md` stub, `node
scripts/spec-index.mjs` picks up the directory spec on its next run and the resulting row
appears in `specs/index.json`, and therefore on the base.minion-ai.org board, linking to
`specs/042-foo/spec.md`.

**Why this priority**: This is the whole point of the feature — the stub-spec workaround the
constitution currently mandates is the friction being removed. Nothing else in this spec
matters if this story doesn't work.

**Independent Test**: Create a fixture directory spec with valid frontmatter, run
`node scripts/spec-index.mjs`, and assert the computed `specs/index.json` contains exactly one
new row with the directory's id, no top-level stub file involved.

**Acceptance Scenarios**:

1. **Given** a new `specs/042-foo/spec.md` with complete, valid TEMPLATE.md frontmatter
   (`id: 042-foo`, `status: draft`, etc.), **When** `node scripts/spec-index.mjs` runs,
   **Then** `specs/index.json` gains a row with `id: "042-foo"` and no error is raised.
2. **Given** the same fixture, **When** `node scripts/spec-index.mjs --check` runs in CI,
   **Then** the check passes (the committed index already reflects the directory spec).

---

### User Story 2 - Invalid or missing directory frontmatter fails the same gate a bad top-level spec would (Priority: P1)

A directory `spec.md` is missing a required field, uses an invalid `status`, or its `id`
doesn't match its directory name. The CI gate fails with a file-and-reason message exactly as
it would for a malformed top-level spec — no silent skip, no second, weaker code path for
directory specs.

**Why this priority**: Without this, directory specs become either invisible (fail-closed,
bad for adoption) or a parallel, unvalidated path into a committed artifact the board trusts
(fail-open, worse). Parity with the existing top-level validation is the whole value of
"first-class," not an add-on.

**Independent Test**: Create a fixture directory spec with `id` not matching its directory
name; assert `node scripts/spec-index.mjs` exits 1 with a message naming the file and the
mismatch, in the same format as the existing top-level `"id" ... must match filename` check.

**Acceptance Scenarios**:

1. **Given** `specs/042-foo/spec.md` with `id: 043-bar`, **When** the script runs, **Then** it
   exits 1 with an error naming `specs/042-foo/spec.md` and the id/directory mismatch.
2. **Given** `specs/042-foo/spec.md` missing the `pass` field, **When** the script runs,
   **Then** it exits 1 with the same `missing required field "pass"` message shape used for
   top-level specs.
3. **Given** two specs — one top-level `specs/foo.md` and one directory
   `specs/042-foo/spec.md` — that both declare `id: foo`, **When** the script runs, **Then**
   it exits 1 with a duplicate-id error naming both sources.

---

### User Story 3 - Every new Spec Kit feature is board-ready from birth (Priority: P2)

An agent runs `/speckit-specify`; the resulting `spec.md` already carries valid frontmatter
(correct `id`, a sane default `status: draft`, today's `created`/`updated` dates, `repos`)
without a manual retrofit step, because the Spec Kit template itself was updated to emit it.

**Why this priority**: User Story 1 only pays off if specs are born compliant — otherwise
every feature still needs a manual frontmatter-authoring step, which is most of today's
friction.

**Independent Test**: Run `/speckit-specify` end to end (or the equivalent template-resolution
step) against a fresh feature description and assert the produced `spec.md` starts with a
frontmatter block that `node scripts/spec-index.mjs` accepts without modification.

**Acceptance Scenarios**:

1. **Given** a feature description and no existing feature directory, **When**
   `/speckit-specify` creates `specs/<NNN>-<slug>/spec.md` from the updated
   `.specify/templates/spec-template.md`, **Then** the file's frontmatter has `id` equal to
   `<NNN>-<slug>`, `status: draft`, `stage: spec`, `pass: 1`, today's `created`/`updated`, and
   a non-empty `repos` array.
2. **Given** the produced file, **When** `node scripts/spec-index.mjs` runs immediately after,
   **Then** it is accepted with no frontmatter errors.

---

### User Story 4 - The stub-spec instruction is gone, not just unused (Priority: P2)

An agent reading the constitution or `AGENTS.md` after this feature ships is never told to
create a top-level stub spec for a Spec Kit feature; the instruction that exists today is
removed and replaced with the real mechanism (directory scanning).

**Why this priority**: Stale instructions are worse than no instructions — leaving the stub
rule in place after the scanner makes it unnecessary means some agents keep doing double
work (or, worse, a future agent "fixes" what looks like a contradiction by reverting this
feature's behavior). This is a documentation-only story but it is the delta's exit condition.

**Independent Test**: Grep `.specify/memory/constitution.md` and `AGENTS.md` for the stub
instruction text after the change; assert zero matches, and assert each file still correctly
describes where Spec Kit artifacts live.

**Acceptance Scenarios**:

1. **Given** the updated constitution, **When** its "Artifact layout and registration"
   section is read, **Then** it describes directory scanning as the board-visibility
   mechanism and contains no instruction to create a top-level stub.
2. **Given** the updated `AGENTS.md` "Spec-driven workflow (Spec Kit)" section, **When** read,
   **Then** the same is true, and the section's description of what
   `scripts/spec-index.mjs` reads is corrected (no longer "only top-level `specs/*.md`").

### Edge Cases

- A directory under `specs/` that has no `spec.md` at all (e.g. only `plan.md`, or an empty
  directory, or an `audits/`/`evidence`/`research` support directory that already lives under
  `specs/` today) — MUST be silently skipped, not treated as an error, since several
  non-feature directories already exist under `specs/` (`audits`, `evidence`, `research`,
  `hub-erp-roadmap`).
- A directory `spec.md` that is itself a Markdown file named `spec.md` but under a directory
  that doesn't follow the `<NNN>-<slug>` naming convention (hand-created, renamed, or from an
  older Spec Kit version) — the id-matches-directory-name rule (User Story 2) still applies
  using whatever the actual directory name is; the feature does not require `<NNN>-<slug>`
  shape, only id/directory agreement.
- `specs/<id>.review.md` sidecars (G2 gate) are currently resolved by top-level filename
  stem. A directory spec's review sidecar location is out of scope for this feature (see Out
  of Scope) — no sidecar resolution is added for directory specs.
- Two different directories whose names collide only after stripping a numeric prefix (e.g.
  `specs/008-foo/` and a hypothetical renumbered `specs/019-foo/`) are different ids
  (`008-foo` vs `019-foo`) and are not a collision — the id is the literal directory name, not
  a normalized slug.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `scripts/spec-index.mjs` MUST, in addition to its existing top-level
  `specs/*.md` scan (excluding `TEMPLATE.md` and `*.review.md`), scan every `specs/*/spec.md`
  file and feed it through the same frontmatter parsing and validation pipeline
  (`parseFrontmatter`, required-field checks, enum checks, scalar/array-shape checks, id
  uniqueness) used for top-level specs.
- **FR-002**: A directory under `specs/` with no `spec.md` file MUST be skipped without error
  (see Edge Cases); only the presence of `spec.md` makes a directory feature-bearing for this
  scan.
- **FR-003**: For a directory-sourced spec, the required `id` field MUST equal the directory
  name (not `spec.md` sans extension, which is identical for every feature and would collide
  universally). A mismatch MUST fail with a message naming the file and the expected id, in
  the same style as the existing top-level `"id" must match filename` check.
- **FR-004**: The id-uniqueness check MUST treat top-level and directory-sourced ids as one
  namespace: a top-level spec and a directory spec declaring the same `id` MUST fail the gate
  with a duplicate-id error naming both sources.
- **FR-005**: `.specify/templates/spec-template.md` MUST start with the TEMPLATE.md frontmatter
  block (`id`, `title`, `stage: spec`, `status: draft`, `pass: 1`, `created`, `updated`,
  `repos`) above its existing Spec Kit body, so every `spec.md` created by `/speckit-specify`
  is frontmatter-complete without a manual retrofit step. `id`, `created`, and `updated` are
  placeholders the `/speckit-specify` skill fills in at creation time (directory name and
  today's date respectively), matching how it already fills `[FEATURE NAME]` and `[DATE]`
  elsewhere in the same template.
- **FR-006**: The index projection (`projectSpec`, `REQUIRED_INDEX_FIELDS` /
  `OPTIONAL_INDEX_FIELDS`) MUST emit, for every directory-sourced row, a pointer to its
  source file distinguishable from the top-level convention (`specs/<id>.md`), so the board
  can construct the correct link. This is a new field (see Key Entities) — `assertProjection
  Coverage()`'s validated/projected-field-coverage contract (lines ~320-395) MUST be updated
  to include it or the build fails loudly per its own designed behavior.
- **FR-007**: Spec Kit's own body-level `**Status**: <free text>` line MUST NOT be read as
  the source of truth for the index `status` field (Clarifications, Q2); only the frontmatter
  `status` is validated and projected, identical to the existing top-level behavior.
- **FR-008**: The heading-lint gate (`missingRequiredHeadings`, `--check` only) MUST apply a
  parallel, Spec-Kit-shaped set of required sections to directory `spec.md` bodies (per
  Clarifications Q1) instead of literally requiring the flat-file `## 0. Product` heading:
  a `## Requirements` or `### Functional Requirements` heading, a `## Assumptions` heading,
  and a verification signal satisfied by either a `**Verification:**` label in `spec.md` or
  the presence of a sibling `tasks.md` in the same directory. A directory spec missing any of
  these MUST fail `--check` with a message naming the file and which signal is missing, using
  the same wording style as the existing heading-lint errors.
- **FR-009**: The per-slice `**Topics:**` lint (`findSliceTopicViolations`) MUST run against
  directory spec bodies too, unless the directory's id is listed in
  `specs/topics.json`'s existing `sliceTopicValidation.grandfatheredSpecIds` (same exemption
  mechanism, same "by exact id" rule — no new exemption list).
- **FR-010**: The committed `specs/index.json` staleness check (`--check` comparing computed
  vs. on-disk) MUST reflect directory-sourced rows: adding, editing, or removing a directory
  `spec.md` and not regenerating the index MUST fail `--check` exactly as an unregenerated
  top-level change does today.
- **FR-011**: All existing top-level `specs/*.md` scanning, validation, enum checks, link
  integrity (`revises`/`supersedes`), baseline ratchets, and the review-sidecar pipeline MUST
  continue to behave exactly as before for every one of the 286 existing specs — this feature
  is additive scanning, not a rewrite of the existing pipeline. (Non-regression, proven by
  `node scripts/spec-index.mjs --check` passing against the unmodified corpus before and
  after.)
- **FR-012**: `scripts/spec-index.test.mjs` MUST gain fixture coverage for: (a) a valid
  directory spec being picked up and projected with its pointer field; (b) a directory spec
  with a directory/id mismatch failing; (c) a directory spec missing a required field failing
  with the same message shape as a top-level miss; (d) a top-level/directory id collision
  failing; (e) a directory with no `spec.md` being silently skipped; (f) the new heading-lint
  branch (FR-008) passing and failing cases; (g) `assertProjectionCoverage()` catching the new
  pointer field if it's validated-but-unprojected or vice versa.
- **FR-013**: `.specify/memory/constitution.md`'s "Artifact layout and registration" section
  and `AGENTS.md`'s "Spec-driven workflow (Spec Kit)" section MUST be rewritten to remove the
  top-level-stub instruction and describe directory scanning as the mechanism by which a
  Spec Kit feature becomes board-visible (User Story 4).
- **FR-014**: `node scripts/proposal-index.mjs --check` and the repository-policy validator
  (`pnpm run repo-policy:validate`) MUST continue to pass unmodified — this feature touches
  `specs/` tooling only; `proposals/` tooling and `repo-policy.yaml` are out of scope and MUST
  show zero behavior change.

### Key Entities

- **Directory spec row**: a `specs/index.json` entry sourced from `specs/<id>/spec.md` rather
  than `specs/<id>.md`. Carries every field a top-level row carries (FR-001) plus one new
  field recording its source path (e.g. a `path` or `dir` key — the exact name is a plan-level
  decision bound by FR-006's coverage-assertion requirement, not fixed here) so the board can
  link correctly; absent on every existing top-level row (backward compatible — the field is
  additive-optional per `OPTIONAL_INDEX_FIELDS` or entirely implicit from `id` shape, a
  plan-level choice).
- **Spec Kit feature directory**: `specs/<NNN>-<slug>/` containing `spec.md` (required for
  this feature to notice it), optionally `plan.md`, `tasks.md`, `research.md`,
  `data-model.md`, `contracts/`, `checklists/` (per the constitution's existing "Artifact
  layout" list) — only `spec.md`'s presence and content are read by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent can run `/speckit-specify` and, without hand-authoring any additional
  file, see the resulting feature represented in `specs/index.json` after the next
  `node scripts/spec-index.mjs` run — zero manual stub-authoring steps, down from one today.
- **SC-002**: `node scripts/spec-index.mjs --check` run against the existing 286-spec corpus
  plus any number of added directory specs produces identical pass/fail verdicts to today's
  behavior for every pre-existing spec (100% non-regression, verified by running `--check`
  before and after on the unmodified corpus).
- **SC-003**: A malformed directory spec (bad id, missing field, invalid status, duplicate id
  against any other spec) is rejected by `--check` with a message a human can act on without
  reading the script source — same bar as today's top-level error messages.
- **SC-004**: Zero instructions in `.specify/memory/constitution.md` or `AGENTS.md` tell an
  agent to create a top-level stub spec for a Spec Kit feature (grep-verifiable, SC for User
  Story 4).
- **SC-005**: `scripts/spec-index.test.mjs`'s self-test suite (`pnpm run test:scripts`) passes
  with the new fixtures included, and the CI workflow's three relevant steps ("Spec index
  gate self-test", "Spec index check", "Proposal index check" — `.github/workflows/ci.yml`)
  all stay green.

## Assumptions

- Spec Kit's own templates (`.specify/templates/*.md`) are editable project files, not
  vendored/regenerated artifacts — editing `spec-template.md` is a supported customization
  point, not something a future `specify` CLI upgrade silently reverts. (ASSUMPTION — owner to
  confirm; not verified against the Spec Kit upstream project in this research pass.)
- `plan.md`, `tasks.md`, and other sibling files in a feature directory are out of scope for
  board indexing in this feature — only `spec.md` becomes a row. Representing plan/task
  progress on the board is a separate, later feature.
- The existing `<date>-<slug>-spec.md` stub files already created for earlier Spec Kit
  features (if any exist in this corpus) are not retroactively migrated or deleted by this
  feature; a follow-up cleanup (noted in the open-items ledger) removes them once directory
  scanning is live and proven.
- "Not security tagged" (feature description) is accurate: this feature touches no auth, RBAC,
  credentials, tenant data, or migrations — Constitution Principle V's human-gate requirement
  does not apply.

## Out of Scope

- Migrating or deleting any pre-existing top-level stub spec files created under the old
  constitution rule.
- Indexing `plan.md`, `tasks.md`, `research.md`, `data-model.md`, or `contracts/` content onto
  the board.
- Any change to `proposals/`, `rankings/`, or `repo-policy.yaml` tooling.
- Automated two-way sync between Spec Kit's body `**Status**` line and the frontmatter
  `status` field (Clarifications Q2) — frontmatter is authored/updated by hand or by a future
  feature, not by this one.
- Supporting `.specify/init-options.json`'s `"timestamp"` feature-numbering mode specifically —
  the scan is by directory-containing-`spec.md`, which works under either numbering scheme
  without special-casing either, so no dedicated timestamp-mode test is required, but this
  spec does not claim to have exercised it.

## Verification

End-to-end check for this feature, runnable by a reviewer: (1) create a fixture directory
`specs/999-fixture/spec.md` with valid frontmatter (`id: 999-fixture`, `repos: [minion-meta]`,
etc.) and the FR-008 heading set; (2) run `node scripts/spec-index.mjs` and confirm a new row
with `id: "999-fixture"` and the new pointer field appears in `specs/index.json`; (3) run
`node scripts/spec-index.mjs --check` and confirm it passes; (4) corrupt the fixture (wrong
id, then missing field, then duplicate an existing top-level id) and confirm each corruption
fails `--check` with a message naming the file and the specific problem; (5) run
`pnpm run test:scripts` and confirm the new fixtures in `scripts/spec-index.test.mjs` pass;
(6) delete the fixture, regenerate, confirm `specs/index.json` returns to its prior committed
state (no leftover row).
