# Phase 1 Data Model: Sellable card view

No database schema changes. Entities below are in-memory / browser-storage shapes only.

## Sellable (existing entity, read-only here)

Already defined by the catalog/POS services. Fields this feature reads:
`name, code, unitPrice, kind (product|service|bundle), stockQty (nullable, must be
pre-aggregated for bundles), category, taxonomy{zone,line}, tags, inheritedTags, active`.

**Invariant this feature adds**: `stockQty` as read by a card on ANY surface MUST be the
output of the same bundle-aggregation fold — a card must never receive the raw
pre-aggregation value on one surface and the folded value on another.

## CardField (new, static)

| Field | Type | Notes |
|---|---|---|
| key | string | stable id, e.g. `price`, `stock`, `kind`, `code`, `category`, `zone`, `line`, `tags`, `active` |
| label | string (localized) | resolved through Paraglide at render/catalog-build time, not baked at module scope (SSR-locale gotcha) |

Not persisted; defined once in code as the field catalog, filtered per surface.

## ViewerFieldPreference (new, browser-storage only)

| Field | Type | Notes |
|---|---|---|
| surfaceNamespace | string | e.g. `pos-sell-gallery`, `pos-catalog-board` — the storage key suffix |
| hidden | Set\<string\> | subset of CardField keys this viewer has turned off for this surface |
| order | string[] | full ordering of CardField keys (hidden keys stay in `order`, just filtered from render) |

**Merge rule** (on load, when the surface's available-field catalog has changed since the
viewer last saved): keep the viewer's stored order for keys still in the catalog, drop keys
no longer in the catalog, append any catalog key the stored order never mentioned (so a
newly-added field renders for everyone, satisfying FR-009). Hidden set is NOT merged with
defaults once the viewer has saved any preference — their choice fully replaces the surface
default, otherwise "hide X" could never stick across a release that adds a new field.

**Relationships**: Keyed by (browser profile, surfaceNamespace) implicitly — no explicit
viewer id, since this is local-only storage (Clarify Q4 assumption), not a per-account
server record.
