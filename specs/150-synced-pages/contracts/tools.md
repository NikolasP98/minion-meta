# Contract — agent tools
| In-page | MCP | Input | Effect |
|---|---|---|---|
| `sandbox.block_filter` | `sandbox_block_filter` | `{ id?, title, var, control, options?, default? }` | create/update a filter element (from `filterToolSchema()`) |
| `sandbox.block_kpi|chart|table|list` | `sandbox_block_*` | existing + `listens?` | create sets `listens`; update without `listens` keeps stored (merged spec re-validated) |
| `sandbox.wire` | `sandbox_element_write` with `listens` | `{ id, listens }` | replaces only the block's `listens` |
| `sandbox.list_elements` | `sandbox_elements` | — / `{ page? }` | `{ elements, wiring }` |
| `sandbox.arrange` | — | existing | filter ids reported in `failed` |
