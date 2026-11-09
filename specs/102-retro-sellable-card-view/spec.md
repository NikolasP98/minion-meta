# Feature Specification: Sellable card view — aligned, populated, configurable

**Feature Branch**: `102-retro-sellable-card-view`

**Created**: 2026-10-15

**Status**: Draft

**Input**: Owner (verbatim, 2026-10-15): "improve the card layouts (use subgrids or similar,
align their content to top), make sure the properties populate correctly (stock, price,
type, etc). Allow the user to configure what they can see in the card."

## Clarifications

### Session 2026-10-15

- **Q1**: Which screens does "the card layouts" cover — is this every card-shaped list in
  the app, or a specific pair? → **A**: The two POS sellable-card surfaces: the till gallery
  (`pos/sell`) and the catalog board (`pos/catalog`) — the only two places a sellable
  renders as a card today. (ASSUMPTION — owner to confirm)
- **Q2**: What should each surface show by default, before any viewer configures anything?
  → **A**: Till: price, stock, type (the three properties the owner named). Catalog board:
  price, type, stock, code, tags — a denser default since the board already carries more
  columns in its table view. (ASSUMPTION — owner to confirm)
- **Q3**: When a configured field has no value for an item (e.g. a service has no stock),
  should the row still render as "—" so cards keep the same shape, or should that surface
  skip the empty row entirely? → **A**: **[NEEDS CLARIFICATION: no default is obvious —
  "always show the row" serves alignment (Story 1) but "skip empty rows" serves density on
  a board with many optional fields; the owner did not say, and reasonable implementers
  could default either way per surface]**.
- **Q4**: Does the per-viewer field choice need to sync across devices/roles, or is a
  local-only (this browser, this viewer) preference acceptable? → **A**: Local-only —
  lowest-cost default for a cosmetic viewer preference with no stated multi-device
  requirement. (ASSUMPTION — owner to confirm)
- **Q5**: Is "type" a new classification to build, or the product/service/bundle kind
  already computed for the catalog table's kind column/badge? → **A**: Reuse the existing
  kind — the owner's "etc." after "stock, price, type" reads as "the properties already on
  the table row," not a new concept. (ASSUMPTION — owner to confirm)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cards line up as a grid, not a ragged stack (Priority: P1)

A staff member opens the POS till (gallery view) or the catalog (board view) and scans a
row of sellable cards to compare price and stock across items. Today the cards' content
floats inconsistently — a short name centers differently than a two-line name, and a card's
rows don't land on the same horizontal band as its neighbors — so comparing two cards means
re-reading each one fully instead of scanning one row at a time.

**Why this priority**: This is the owner's first-named complaint and the one most visible on
every visit to these two screens; it is also a precondition for Story 2 (a configurable set
of rows is only legible if those rows always align).

**Independent Test**: Load the till gallery and the catalog board with a mix of short and
long sellable names and a mix of items with/without stock tracking. Every card's content
starts flush at the top of the card, and the price row of every card in the same band sits
at the same height as the price row of its neighbors.

**Acceptance Scenarios**:

1. **Given** a gallery band with a one-line-name item next to a two-line-name item, **When**
   the gallery renders, **Then** both cards' first content row starts at the same y-position
   (content pinned to the top, not vertically centered).
2. **Given** two cards in the same band, one tracked (has a stock row) and one bundled
   (derived stock), **When** the gallery renders, **Then** the price row of both cards is at
   the same height as every other card's price row in that band.
3. **Given** a single-column (narrow viewport) layout, **When** the gallery renders, **Then**
   each card's rows still start at the top and align with no horizontal neighbor to align to
   (self-consistent, not dependent on band width).

### User Story 2 - Price, type, and stock always show the real value (Priority: P1)

A staff member relies on the card's price/stock/type to make a sale without opening the
item. Today some combinations of item (notably bundled/package items) show a blank or
"—" for stock on one screen while showing a number on another screen for the same item,
and type is not visible on the card at all — so staff cannot trust the card and must
cross-check the catalog table before selling a package.

**Why this priority**: Equal to Story 1 — this is the second half of the owner's complaint,
and selling against a wrong or missing stock number is a direct selling-floor error, not a
cosmetic one.

**Independent Test**: Pick a plain (non-bundle) item and a bundle/package item. Confirm the
stock, price, and type values shown on the till gallery card match the values shown for the
same item on the catalog board/table.

**Acceptance Scenarios**:

1. **Given** a non-bundle sellable with a tracked stock quantity, **When** it is shown as a
   card on either surface, **Then** the card shows that exact quantity.
2. **Given** a bundle/package sellable whose stock is derived from its component items,
   **When** it is shown as a card on the till AND on the catalog, **Then** both cards show
   the same derived number (not blank on one and populated on the other).
3. **Given** any sellable, **When** it is shown as a card, **Then** the card shows its price
   (or "—" if the item has no price) and a visible indicator of its type (product / service
   / bundle).

### User Story 3 - Viewer picks which fields a card shows (Priority: P2)

A staff member wants to see tags or category on the card without the catalog admin changing
what everyone else sees, or wants a denser card showing only price and stock.

**Why this priority**: Explicitly asked for by the owner, but it is a per-viewer convenience
on top of Stories 1–2, which must be correct regardless of which fields are chosen.

**Independent Test**: Open the field-configuration control on one surface, toggle a field
off and reorder two fields, reload the page, and confirm the same viewer sees the same
configuration while a different browser profile still sees the surface's defaults.

**Acceptance Scenarios**:

1. **Given** the default card fields, **When** the viewer opens the card-fields control and
   hides a field, **Then** that field's row no longer renders on any card on that surface.
2. **Given** a viewer has hidden a field and reordered the rest, **When** they reload the
   page, **Then** the same hidden/order choice is restored for them (and only them).
3. **Given** a surface gains a new configurable field in a later release, **When** a viewer
   who already has a saved configuration opens the surface, **Then** the new field appears
   for them (does not silently vanish because it's absent from their saved list).

### Edge Cases

- What happens when a sellable has no price, no stock tracking, and no tags — does the card
  still render a consistent set of rows, or collapse to just the title? (Gallery keeps the
  configured rows with "—" placeholders so bands keep aligning; board/other dense surfaces
  may skip empty rows — ASSUMPTION, owner to confirm per surface.)
- How does the system handle a viewer's saved field order that references a field key that
  has since been removed from the catalog? (Dropped silently; the rest of the saved order is
  kept.)
- What happens on the narrowest viewport where a band has exactly one card? (Alignment must
  still hold for that single card against itself — see Story 1 Scenario 3.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cards on the till gallery and the catalog board MUST render their content
  (title and field rows) starting at the top of the card, not vertically centered.
- **FR-002**: Cards in the same row-band of a surface MUST have their corresponding rows
  (e.g., every card's price row) land at the same vertical position as their neighbors in
  that band.
- **FR-003**: The till gallery and the catalog board MUST present a sellable's price, stock,
  and type using the same values and the same derivation rules, for every sellable kind
  including bundles/packages whose stock is computed from component items.
- **FR-004**: A sellable card MUST show a visible type indicator (product / service /
  bundle).
- **FR-005**: A sellable card MUST show "—" (or an equivalent explicit placeholder) rather
  than a blank space when a configured field has no value for that item.
- **FR-006**: The system MUST let a viewer choose which of a defined set of fields a
  sellable card shows, and in what order, independently on each surface (till gallery,
  catalog board).
- **FR-007**: A viewer's field choice MUST persist across reloads for that viewer and MUST
  NOT change what other viewers see.
- **FR-008**: Field choices MUST be scoped per surface — hiding "tags" on the till gallery
  MUST NOT hide "tags" on the catalog board.
- **FR-009**: If the set of available fields changes in a later release, a viewer's existing
  saved choice MUST still render (new fields appear, removed fields are dropped) rather than
  erroring or resetting to defaults.
- **FR-010**: The card's visual field-row recipe (label/value styling, badges for stock/type)
  MUST be defined once and reused by both surfaces, so the two surfaces cannot visually
  diverge for the same field.

### Key Entities

- **Sellable**: A catalog item sellable at the till (product, service, or bundle/package).
  Attributes relevant to the card: name, code, unit price, kind, stock quantity (direct or
  derived), category/taxonomy, tags, active flag.
- **Card field**: One named, orderable, hide-able row a sellable card can show (e.g. price,
  stock, type, code, category, tags, active). Has a label and a per-item render rule.
- **Viewer field preference**: One viewer's per-surface choice of which card fields are
  visible and in what order. Scoped to (viewer, surface).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a gallery/board view mixing short and long sellable names, 100% of cards in
  the same band have matching row positions for every shared field (visually auditable via
  screenshot comparison).
- **SC-002**: For every bundle/package sellable, the stock number shown at the till is
  identical to the stock number shown in the catalog for the same item, with zero
  discrepancies across a full catalog pass.
- **SC-003**: A viewer can change which fields a card shows and see the new layout applied
  immediately, with the choice still in effect after closing and reopening the page.
- **SC-004**: Staff report (qualitatively) that they no longer need to open the catalog table
  to confirm a package's stock before selling it.

## Assumptions

- Card field configuration is a per-viewer, per-browser-profile convenience (not synced
  across devices or roles) — localStorage-equivalent persistence is acceptable.
  (ASSUMPTION — owner to confirm)
- The till gallery and the catalog board are the only two surfaces in scope; other sellable
  list surfaces (if any) are out of scope for this change. (ASSUMPTION — owner to confirm)
- "Type" means the existing product/service/bundle kind taxonomy already used elsewhere in
  the catalog, not a new classification. (ASSUMPTION — owner to confirm)
- Alignment ("subgrids or similar") is a visual/CSS concern with no required behavior change
  to data loading or filtering.
