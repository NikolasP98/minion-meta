# Data model — Synced pages S1

No schema migration: everything lives in `sandbox_elements.spec` (jsonb) or in the URL.

## Filter element (`spec.type = 'filter'`)
| Field | Type | Rules |
|---|---|---|
| `var` | string | `/^[a-z][a-z0-9_]{0,31}$/` |
| `control` | `date_range` \| `select` \| `multi_select` | |
| `options` | `{ dataset, col }` | pickers only; `col` exists; not PII (labels in S2) |
| `default` | `PageValue` matching `control` | optional |
Title = element `title`. Ordered by element `position` in the filter bar; excluded from grid layout and `arrange`.

## Connection (`spec.listens[]` on kpi/chart/table/list)
| Field | Rules |
|---|---|
| `var` | as above; unique within the block; ≤ 6 entries |
| `col` | exists on the block's dataset; not PII |
Save also enforces: own filters + period (2) + connections (date 2, other 1) ≤ 20 where entries.

## PageValue (URL / memory only)
`{kind:'date', range: Range}` · `{kind:'select', value}` · `{kind:'multi', values[≤100]}` (custom day pairs in S2).
S1: kept in memory per open page, starting from the filter `default`, else empty. S2: link (URL) first.

## Wiring report (derived, server)
`publishers[]`, per block `bindings[]`, `problems[]` (`no_publisher` | `kind_mismatch` | `conflicting_publishers`), `duplicates[]` (candidate columns in S4). See contracts/api.md.
