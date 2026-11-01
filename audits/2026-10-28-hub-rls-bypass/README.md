# Hub RLS-bypass inventory (spec 048 H2)

Files in `minion_hub/src/` that call `getCoreDb(`, `getDb(` or `supabaseAdmin(` (excluding tests and the three client modules), i.e. paths that do not run under per-request forced RLS.

Generated with (from `minion_hub/`):

```
bun scripts/rls-bypass-inventory.ts > src/server/db/rls-bypass-inventory.json
bun scripts/rls-bypass-inventory.ts --check   # CI: exit 1 on drift
```

`inventory.json` here is a mirror of that file as of hub PR for slices H1+H2. Existing `class` values are preserved on regeneration; new files get a first-pass class.

Counts (132 files): todo 109, cross-org-by-design 20, user-scoped 3.
