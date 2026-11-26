# Contract — HTTP
- `GET /api/sandbox/elements?page=` → `{ elements, wiring }` (wiring = report from `pageWiring`, computed with the full registry).
- `POST /api/sandbox/elements` → accepts `spec` with `type:'filter'` and `listens` on data blocks.
- `PATCH /api/sandbox/elements/[id]` → new optional `listens: Array<{var,col}>`; in one transaction with `select … for update`: merged with the stored spec, validated (`validateListens`), written with `updated_at` and `written_by_key`. A `spec` without `listens` for a data block keeps the stored `listens`; `listens: []` clears; body `listens` overrides `spec.listens`; spec-null or filter rows ⇒ `400 {field:'listens'}`.
- Refusals: `400 { error, field }` — `spec.listens.<i>.col` unknown / PII / stale after a dataset change; `spec.options.col` unknown / PII; `spec.var` invalid; `spec.default` not matching `control`; `listens` on a custom element (`listens`); where-budget exceeded (`spec.listens`).
- `POST /api/sandbox/query`: comparison / `in` values type-checked against the column → `400 { field: 'where.<i>.value' }`. The route also accepts `bucket` (fixes trend/time-series 400s on master).
