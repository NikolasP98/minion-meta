# Phase 0 Research: Spec Index / Spec Kit Directory Bridge

All three `[NEEDS CLARIFICATION]` markers raised during `/speckit-specify` were resolved
during `/speckit-clarify` and are recorded in `spec.md`'s Clarifications section (not
repeated here as unknowns). This file covers the remaining technical unknowns needed before
design (Phase 1), each framed as Decision / Rationale / Alternatives considered, per the
plan skill's required format.

## 1. Where does the directory scan slot into the existing loop?

- **Decision**: Build one combined list of `{ name, read() }` descriptors — one per top-level
  `specs/*.md` file (existing `readdirSync('specs')` filter, unchanged) and one per
  `specs/*/spec.md` file found by a second `readdirSync('specs', { withFileTypes: true })`
  pass that keeps only directory entries and checks `existsSync(join('specs', dirent.name,
  'spec.md'))` — then feed both into the single existing `for (const name of ...)` validation
  loop (`scripts/spec-index.mjs` lines ~623-730) unchanged, with `name` becoming a relative
  path (`specs/<id>/spec.md`) instead of a bare filename for directory entries.
- **Rationale**: Every validation rule in that loop (required fields, enum checks, id/filename
  agreement, duplicate-id tracking via `fmById`, heading lint, slice-topic lint) is written
  once and is source-agnostic once it has `{ fm, body }` and a display name for error
  messages — the cheapest, lowest-risk change is widening the input list, not forking the
  loop. FR-004 (cross-source duplicate-id detection) falls out for free this way, with zero
  new code, because `fmById` already spans every iteration regardless of where `name` came
  from.
- **Alternatives considered**: (a) A fully separate scan+validate pass for directory specs,
  merged into `specs`/`errors` at the end — rejected: duplicates ~150 lines of validation
  logic and risks the two paths drifting (exactly the "two validated contracts for the same
  shape" problem specs/TEMPLATE.md's whole design avoids). (b) A glob library
  (`fast-glob`/`globby`) replacing `readdirSync` for pattern `specs/{*.md,*/spec.md}` —
  rejected: this script deliberately has zero dependencies beyond Node builtins (confirmed:
  no `import` in `spec-index.mjs` besides `node:fs`-family and sibling `.mjs` files); adding a
  dependency for one glob is disproportionate to the one-line `readdirSync` extension needed.

## 2. What does `id` match for a directory spec, and does the filename-match check still fit?

- **Decision**: For a directory entry, the "name used in error messages and matched against
  `id`" is the directory name (`specs/042-foo/spec.md` → compare `fm.id` against `"042-foo"`,
  not against `"spec"`). The existing line
  `const idFromFilename = name.slice(0, -3);` (stripping `.md`) is replaced with a function
  that, given the resolved relative path, returns the directory name for a `.../spec.md` path
  and the existing filename-minus-extension for a top-level path.
- **Rationale**: Confirmed directly by the feature description ("id = directory name") and by
  Clarifications Q3. `spec.md` sans extension (`"spec"`) would be identical for all ~N
  directory features and is useless as a join key; the directory name already carries the
  Spec Kit numbering/slug convention and is already unique by construction (Spec Kit itself
  increments `NNN` to avoid directory collisions).
- **Alternatives considered**: Requiring an explicit `id:` in frontmatter that need not match
  anything — rejected: breaks the single invariant ("id matches where the file lives") every
  other spec in the corpus already relies on, and removes the collision-detection safety net
  FR-004 depends on.

## 3. How does the heading lint apply to a body shape it wasn't designed for?

- **Decision**: Add a second branch to the heading-lint call site, selected by source (`name`
  ends with `/spec.md` and is not the literal string `TEMPLATE.md`'s sibling): run the
  existing `missingRequiredHeadings()` for top-level specs unchanged; run a new
  `missingRequiredSpecKitHeadings()` for directory specs, checking the three signals fixed in
  Clarifications Q1 (`## Requirements`/`### Functional Requirements`, `## Assumptions`,
  verification via `**Verification:**` label or a sibling `tasks.md`). Both share
  `stripNonDocumentMarkdown()` (unchanged, format-agnostic) and the same
  `headingBaseline`/grandfathering mechanism (a directory spec id can be grandfathered by
  hash exactly like a top-level one — the baseline is already keyed by `id`, not by source).
- **Rationale**: The two body shapes are genuinely different documents serving the same
  governance intent (scope boundary + testable requirements + a way to prove it's done); a
  single regex set tuned for one will always either false-fail the other or be loose enough
  to stop catching real omissions. Reusing the baseline/grandfather plumbing means this
  feature adds one new array of patterns, not a new exemption system.
  **Risk flagged for the plan's Constitution Check**: this is the one place this feature
  could be read as *weakening* Principle II (AS-IS → TO-BE → DELTA, with evidence) if the new
  branch is ever looser than intended — Phase 1's data model fixes the exact three patterns so
  this isn't left to implementation-time judgment.
- **Alternatives considered**: (a) Do nothing — directory specs never get heading-linted,
  only frontmatter-validated — rejected: FR-008 and Clarifications Q1 explicitly ask for a
  parallel contract, and leaving directory specs permanently lint-free while top-level specs
  are lint-enforced is exactly the two-tier trust problem User Story 2 exists to prevent.
  (b) Require Spec Kit's generated body to literally contain `## 0. Product` by changing the
  Spec Kit template's section name — rejected: it's not Spec Kit's job to rename its own
  well-known template section to satisfy one downstream consumer, and doing so would diverge
  this fork from upstream Spec Kit's own command/template contracts for no safety gain.

## 4. What is the new pointer field's name and shape?

- **Decision**: `path` (optional string, e.g. `"specs/042-foo/spec.md"`), added to
  `OPTIONAL_INDEX_FIELDS`, populated by `projectSpec()` only when the source is a directory
  spec (top-level rows stay exactly as they are today — no `path` field, preserving every
  existing `specs/index.json` row byte-for-byte for the 286 unmodified specs, which is what
  SC-002's non-regression claim requires). The board's existing `specs/<id>.md` link
  convention for rows *without* `path` is untouched.
- **Rationale**: Minimal, additive, and keeps `assertProjectionCoverage()`'s existing
  validated/projected symmetry check meaningful — `path` is a genuinely new, validated
  (derived-from-source, not frontmatter) field, same category as `review` (`DERIVED_INDEX_
  FIELDS`), not a frontmatter field. It is added to `DERIVED_INDEX_FIELDS` alongside `review`,
  not `OPTIONAL_INDEX_FIELDS` — it isn't user-authored frontmatter, so it would be wrongly
  validated against `SCALAR_FIELDS`/`ARRAY_FIELDS` if put in the frontmatter-coverage lists.
- **Alternatives considered**: (a) Encode the directory in `id` itself (e.g. prefix
  `dir:042-foo`) — rejected: breaks every existing consumer's assumption that `id` is a clean
  join key matching a `revises`/`supersedes`/`related` reference, and breaks Clarifications
  Q3's directory-name-as-id answer. (b) Always derive the path from `id` client-side
  (`specs/<id>.md` vs `specs/<id>/spec.md`, tried in order) with no new field — rejected:
  pushes a filesystem-shape assumption onto every consumer (the board, any future script)
  instead of stating it once in the artifact the whole point of `specs/index.json` is to be
  the one place that shape is settled.

## 5. Technical Context resolution (plan template fields)

The plan template's "Technical Context" section (Language/Version, Primary Dependencies,
Storage, Testing, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope)
is written for an application feature and does not map cleanly onto a build-script change —
recorded here rather than left as unmodified template prose in `plan.md`:

- **Language/Version**: Node.js (ESM `.mjs`), matching `scripts/spec-index.mjs`'s existing
  runtime; no version pin beyond what the repo's root already requires (Node 22+ per
  `AGENTS.md`'s `minion/` row — the meta root itself runs the same CI Node version per
  `.github/workflows/ci.yml`'s `node-version: 22`).
- **Primary Dependencies**: none (zero-dependency script; see Decision 1 above).
- **Storage**: N/A — reads/writes one committed JSON file (`specs/index.json`) and Markdown
  files on disk; no database.
- **Testing**: `node --test` via `scripts/spec-index.test.mjs` (existing harness; this
  feature adds fixtures, not a new test runner).
- **Target Platform**: GitHub Actions `ubuntu-latest` runner (CI) + any contributor's local
  shell (dev) — same as today, unchanged.
- **Project Type**: CLI/build-script (single file, no frontend/backend split) — closest fit
  among the plan template's offered options is "Option 1: Single project," and even that is
  an overstatement for one script; documented as a plan-fit gap in `sdd-notes.md`.
- **Performance Goals**: N/A — not latency-sensitive; today's script scans 286 files in well
  under a second locally, and CI's 10-minute job timeout (`.github/workflows/ci.yml`) is the
  only real budget, shared across the whole `verify` job, not this step alone.
- **Constraints**: must stay dependency-free (Decision 1); must not change any byte of an
  existing top-level row (SC-002); must keep `assertProjectionCoverage()`'s fail-loud
  behavior intact for the new field (Decision 4).
- **Scale/Scope**: 286 existing top-level specs + an unbounded, currently-small number of
  Spec Kit directories (one, `specs/008-spec-index-speckit-bridge/`, as of this research
  pass — this feature's own directory).
