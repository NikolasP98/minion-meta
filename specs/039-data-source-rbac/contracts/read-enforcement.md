# Contracts: read enforcement, denied visual, ratchet, matrix

## Load contract (every `(app)` `+page.server.ts` / `+layout.server.ts` that reads tenant data)
Before:
```ts
const ctx = await getCoreCtx(locals);
if (!ctx) throw error(401, 'Authentication required');
const [sellables, tickets] = await Promise.all([listSellables(ctx), listTickets(ctx, …)]);
return { sellables, tickets };
```
After:
```ts
const pos = await datasetCtx(locals, 'pos');                       // CoreCtx | DatasetDenied (401 without tenant)
const sellables = isDenied(pos) ? pos : await listSellables(pos);
const tickets   = isDenied(pos) ? pos : await listTickets(pos, …);
return { sellables, tickets };                                      // each slot: T | DatasetDenied
```
Rules: one `datasetCtx` per dataset read (the till also calls `datasetCtx(locals, 'scheduling')` for resources/event types); never call a service with a denied handle; never throw for denial; keep `depends(...)` and every other behaviour. Admin-only pages that already `requireOrgCapability(locals, m, 'manage')` keep that call AND switch their handle to `datasetCtx` (the ratchet counts bare handles, not capability calls).

## Page contract
Every consumer of a `T | DatasetDenied` slot renders through `DataSource`:
```svelte
<DataSource value={data.sellables} module="pos">
  {#snippet children(sellables)}<SellableGrid {sellables} />{/snippet}
</DataSource>
```
Lists inside `DataView`: pass `state="denied"` with `message={m.data_denied_title({ dataset })}` when `isDenied(rows)`. Write controls: `canAct(module, DATA_VERBS[verb].action)` as today.

## Ratchet (`src/server/auth/dataset-read.ratchet.test.ts`)
- Inputs: file list via `fast-glob`/`fs` over `src/routes/(app)/**/+{page,layout}.server.ts`; regex `/\b(getCoreCtx|requireCoreCtx|getTenantCtx|requireTenantCtx|getCoreDb\(|withOrgCore)\b/g` after stripping `//` and `/* */` comments; `DATASET_ENFORCED` from `$lib/permissions`; `moduleForLoadPath` from `data-model.md`.
- Assertions (one `it` per rule so failures name the rule): enforced-module files at 0; other files ≤ baseline; unknown files at 0; no stale baseline keys.
- Failure message template: `"<file>: <n> bare tenant read(s) — use datasetCtx(locals, '<module>') / readDataset (spec 039 J1)"`.
- `scripts/dataset-read-baseline.mjs` (`node`, no deps): `--print` shows current counts; `--update` writes the JSON iff every count ≤ old (exit 1 otherwise, naming the raised files).

## Matrix (`RbacRolesSection.svelte`, S6)
- Column labels from `DATA_VERBS` (`View · Add · Edit · Remove`); `export`, `manage` rendered only when the "Advanced" toggle (`SegmentedControl` or `Button variant="ghost"` with `aria-expanded`) is on; default off; persisted per user in `localStorage` key `hub-roles-advanced` (try/catch).
- Payloads to `/api/roles/overrides` unchanged (`caps: { view, create, edit, delete, export, manage }`).
- "Sections" block removed when `page.data.pageAccessDialogLive === true`? No flag: S6 is sequenced after 037 S5 merges; the block is deleted outright and `listRbacRoles` gains `{ includeSubResources = false }` so its tests keep a path that returns them.

## Hub `AGENTS.md` (S6)
RBAC gating checklist item: "Page server loads read tenant data only through `datasetCtx`/`readDataset` (`src/server/auth/dataset-ctx.ts`); a denied dataset is a value rendered by `DataSource`, never a 403. `bun x vitest run src/server/auth` runs the ratchet; `node scripts/dataset-read-baseline.mjs --update` after a migration lowers it."
