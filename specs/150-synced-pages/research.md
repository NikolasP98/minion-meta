# Research — Synced pages S1

Each decision was settled by EGM review (stages 5–7) or by reading hub master `133c4154`.

| # | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| R1 | Connections (`listens`) per data block, operator derived from the filter kind | One visible list per block; agent and Connections view edit the same thing | Expression bindings anywhere in a spec (hard to show/toggle); `op` per entry (redundant) |
| R2 | Date values use block `RANGES` + `periodWindow` (browser-local day) or an inclusive day pair | Same vocabulary the agent already learns; links stay relative | `DateRangeControls` RangeIds + business TZ + per-user storage (two vocabularies, frozen dates in links) |
| R3 | Wiring report computed on the server from the full registry | One report for page, assistant, MCP, S4; available at first paint; fail-closed | Client catalog (RBAC-filtered, async, can show unfiltered data under a set filter) |
| R4 | `listens` has its own PATCH write with row lock + `jsonb_set`; spec updates without `listens` keep stored | Agent edits never drop wiring; concurrent writes safe; matches "never read-modify-write" invariant in `sandbox.service.ts:240-242` | Client read-modify-write of the whole spec |
| R5 | URL values typed per publisher column; compiler type-checks comparison/`in` values (400) | Bad links otherwise raise Postgres 22P02 → 500 or browser RangeError | Apply as given |
| R6 | Filters stored as elements, rendered in a bar outside `EditableGrid` | No migration; library/remove/agent tools work; a bar, not 220 px cards | Separate table; grid cells |
| R7 | Page renderer + values source pluggable, page name an input | S3 draft (scratch page) reuses it | Logic inside `+page.svelte` |
| R8 | `service_name` on `scheduling.bookings` = `fin_products.name` via `t.product_id` (registry-owned join, like `pos.ticket_lines.product_name`) | A service picker can narrow bookings and sales by the same names | New dataset / user joins (out of scope) |
| R9 | (S2) `replaceState`, repeated keys for multi, `f.x=` for cleared | Shareable + reload, no history noise, commas safe | `pushState` (history flood), comma lists |
| R10 | `listens` ≤ 6, unique var, where-budget ≤ 20 at save; multi ≤ 100 | Endpoint limits (`query/+server.ts:19-22`, `MAX_IN_VALUES`) would otherwise fail at runtime | Runtime-only errors |
| R11 | S1 trimmed by stage 8: link state, custom ranges, id labels, page-name input, candidate columns, search beyond 200 move to S2–S4 | Smallest slice that gives a working synced page | Shipping everything in S1 |
| R12 | FilterBar: remove + save-to-library; edits via the assistant until S4 | No hand editor exists for any element today | A popover editor in S1 |
