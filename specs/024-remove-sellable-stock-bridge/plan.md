# Plan — 024
1. Migration (D1), idempotent, data-only (seed unaffected ⇒ `seed-unaffected` label).
2. Server readers (D2, D3) — delete the bridge branch in each; no new abstraction.
3. UI (D4, D5) — product composes like a service; wizard keeps its three product sources with new server semantics.
4. Gates: `bun run check`, targeted vitest (pos/stock/item-cost/tag-links/composition), lint:design/tokens, prettier.
5. Prod dry-run of the migration in a rolled-back transaction before merge; owner merges; verify on prod (BC flips to service; 4 products have a recipe row).
