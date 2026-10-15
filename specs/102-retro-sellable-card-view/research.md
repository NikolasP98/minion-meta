# Phase 0 Research: Sellable card view

## Unknowns from Technical Context

None marked NEEDS CLARIFICATION in Technical Context — the open clarify-phase unknown (Q3,
empty-field render rule) is a product decision, not a technical unknown, and is carried
forward into tasks.md as a task-level decision point rather than resolved here.

## Decision: alignment mechanism

- **Decision**: CSS Grid subgrid (`grid-template-rows: subgrid`) on the card, with the band
  container declaring the row template once and each card spanning N rows.
- **Rationale**: The owner named "subgrids or similar" directly. Subgrid lets heterogeneous
  cards (different field counts before configuration, different name lengths) align per-row
  without JS measurement, and keeps rows matching 1:1 with the configured field list.
- **Alternatives considered**: (a) Fixed-height rows via JS measurement — rejected, adds a
  resize-observer dependency for a CSS-solvable problem. (b) Flexbox with `align-items:
  flex-start` only — rejected, flexbox has no per-row alignment across siblings, only
  top-pinning within one card; it would satisfy FR-001 but not FR-002.

## Decision: shared stock derivation

- **Decision**: Both surfaces must run sellables through the same bundle/package stock
  aggregation before computing the card's stock field — whatever single function the
  catalog board already uses for its table/board stock column.
- **Rationale**: FR-003 requires identical values across surfaces; the only way to guarantee
  that without duplicating aggregation logic is to call the one existing function from both
  load paths.
- **Alternatives considered**: Re-deriving stock independently per surface — rejected
  outright, this is exactly the kind of divergence Story 2 exists to eliminate.

## Decision: field-preference persistence

- **Decision**: `localStorage`, one key per surface namespace, read on mount with try/catch,
  written on every toggle/reorder.
- **Rationale**: Per-viewer, per-browser is the stated scope (Clarify Q4); no backend schema
  change needed; matches the "viewer convenience, not shared state" rule the workspace
  already applies to similar per-viewer UI preferences.
- **Alternatives considered**: A server-persisted per-user setting — rejected as
  over-scoped for a cosmetic toggle; would add a DB migration and an RBAC surface for no
  stated multi-device requirement (Clarify Q4 assumption).

## Decision: field catalog shape

- **Decision**: A fixed, ordered array of `{ key, label }` entries shared by both surfaces;
  each surface selects a subset (its "available fields") and its own default
  visible/hidden split.
- **Rationale**: Keeps "add a field later" (FR-009) to one array edit; per-surface subsets
  let the board show fields the till doesn't (e.g. tags) without duplicating the catalog.
