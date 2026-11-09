# Phase 1 Data Model: Spec Index / Spec Kit Directory Bridge

No database or persistent store is introduced. The only "entities" are shapes already
flowing through `scripts/spec-index.mjs`, extended per `research.md` Decisions 1-4.

## Entity: Spec source descriptor (new, internal to the scan loop)

Not persisted — an in-memory shape the widened scan loop produces per file, replacing the
bare `name` string the current loop iterates over.

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | Used in every error message; `specs/<id>.md` for top-level, `specs/<id>/spec.md` for directory specs. |
| `idFromPath` | string | What `fm.id` must equal: filename-minus-`.md` for top-level, directory name for directory specs (Decision 2). |
| `read()` | function | Returns raw file contents; defers the `readFileSync` call so a directory with no `spec.md` is never opened (FR-002). |

## Entity: `specs/index.json` row (existing, extended)

Extends the existing projected shape (`projectSpec()`, `REQUIRED_INDEX_FIELDS` +
`OPTIONAL_INDEX_FIELDS` + `DERIVED_INDEX_FIELDS`). Every existing field, type, and required/
optional status is unchanged (see `specs/TEMPLATE.md` for the full existing field table —
not reproduced here to avoid a second, driftable copy). One field is added:

| Field | Type | Required | Notes |
|---|---|---|---|
| `path` | string | no (absent on every top-level row; present on every directory row) | New. Added to `DERIVED_INDEX_FIELDS` (alongside the existing `review`), **not** `OPTIONAL_INDEX_FIELDS` — it is computed from which `readdirSync` branch produced the row, never authored in frontmatter, so it must never be validated as a frontmatter scalar/array field. `assertProjectionCoverage()`'s existing collision check (`derived field(s) also declared as frontmatter`) is the regression guard: if a future edit ever adds `path:` to `specs/TEMPLATE.md`'s frontmatter table, the build fails loudly rather than silently double-defining the field. |

**Validation rule** (new): `path` is set if and only if the row's source was a directory
spec; a top-level row with a `path` field, or a directory row without one, is a projection
bug — covered by a `projectSpec()` fixture in FR-012(g)'s test list (not a runtime check,
since `projectSpec()` has no branch that could produce the wrong combination once Decision 4
is implemented as described — the fixture exists to catch a future regression, not a
currently-reachable bad state).

## Entity: Heading-lint contract (existing top-level, new Spec-Kit-shaped parallel)

| Contract | Applies to | Required signals |
|---|---|---|
| `REQUIRED_HEADINGS` (existing, unchanged) | Top-level `specs/*.md` | `## 0. Product`; an out-of-scope heading or `**Out of scope:**` label; a verification heading or `**Verification:**` label. |
| `REQUIRED_SPEC_KIT_HEADINGS` (new) | Directory `specs/*/spec.md` | A `## Requirements` or `### Functional Requirements` heading; a `## Assumptions` heading; a `**Verification:**` label in `spec.md` **or** an `existsSync` sibling `tasks.md` in the same directory. |

Both contracts share the same grandfathering mechanism
(`scripts/spec-heading-lint-baseline.json`, keyed by `id` + body hash) — no new exemption
file. `findMissingRequiredHeadings(name, body)` becomes the single entry point that picks
the right contract by `name`'s shape (`.../spec.md` under a directory vs. a bare top-level
`.md`), so call sites don't need to know which contract applies.

## State transitions

None — this feature adds a read path (scan) and a derived field (`path`); it does not add or
change any `status`/`stage` transition. Clarifications Q2 explicitly keeps frontmatter
`status` authored by hand/by future features, not transitioned by this one.
