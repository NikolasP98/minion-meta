# Research: data-source permissions enforced on reads

All hub anchors `origin/master` @ `7d06cdd4`.

## R1 — Inventory: how widespread are unguarded reads?

Method (reproducible, run from `minion_hub/`):
```bash
L=$(git ls-tree -r --name-only origin/master 'src/routes/(app)' | grep -E '\+(page|layout)\.server\.ts$')      # 126
CTX=$(for f in $L; do git show origin/master:"$f" | grep -q -E "getCoreCtx|requireCoreCtx|getTenantCtx|requireTenantCtx|getCoreDb\(|withOrgCore" && echo "$f"; done)   # 73
for f in $CTX; do git show origin/master:"$f" | grep -q -E "requireOrgCapability|hasOrgCapability|resolveCapabilities|requireAdmin|caps\.can" || echo "$f"; done | wc -l  # 62
git grep -c -E "getCoreCtx\(locals\)|requireCoreCtx\(locals\)" origin/master -- 'src/routes/(app)/**/+page.server.ts' 'src/routes/(app)/**/+layout.server.ts' | wc -l   # 70 files with call sites
S=$(git ls-tree -r --name-only origin/master src/server/services | grep -E '\.service\.ts$' | grep -v test)   # 158
for f in $S; do git show origin/master:"$f" | grep -q -E "withOrgCore|withOrg\(" && echo "$f"; done | wc -l   # 99
```
Results: **126** `(app)` loads · **73** touch tenant data · **11** with a capability call (all admin/settings pages) · **62 unguarded**, by module: pos 10, scheduling 9, stock 8, socials 6, finances 6, crm 5, workforce 3, brains 3, support 2, sales 2, agents 2, work 1, overview 1, memberships 1, home/settings 1, channels/gmail 1, `(app)/+layout.server.ts` 1. Services: **158** files, **99** tenant-scoped through `withOrgCore`, **5** mention capabilities (only `brains.service.ts` applies them, to scope retrieval), **94** trust the caller.

Why the guard is absent by design: `apiWriteCapability` docs say reads are not gated centrally because "pages gate their own view access" (`rbac.service.ts:1104-1108`), and page loads say the opposite — "enforced centrally by the root layout guard" (`pos/sell/+page.server.ts:19`). Both are true only while route policy ≡ module view. Spec 037 breaks that equivalence on purpose.

## R2 — What is a "dataset"?

**Decision: dataset = `Module` (today's 24 keys). The four owner verbs map onto the existing `ACTIONS` (view/create/edit/delete); `export` and `manage` stay as "Advanced" (K1).**

| Option | Catalog size | Matches "view/add/edit/remove items in this dataset" | Cost | Verdict |
|---|---|---|---|---|
| Module (`pos`, `crm`, …) | 24 | yes — a module IS a dataset family the UI already names | zero migration; `apiWriteCapability` already enforces writes at this grain, so reads and writes agree | **chosen** |
| Module + dotted sub-resources (`pos.sell`) | 24 + 29 | no — the dotted keys are *routes* (`SubResource.route`, `route-access-registry.ts:17-28`), i.e. page rules; 037 Amendment B moves them to `page:` keys | mixes axes the owner wants separated | rejected |
| Table-level (`pos_tickets`, `stk_items`, …) | ~120 tables across 99 services | finer than any UI asks for; the matrix becomes unusable; every service call must name a table | large; a schema catalog to maintain (and the hub schema is not reproducible from the repo — meta memory) | rejected (ledger: revisit if a module ever needs split visibility) |

Verb mapping: `view`→View, `create`→Add, `edit`→Edit, `delete`→Remove (labels in `DATA_VERBS`, `src/lib/permissions.ts`); `export`/`manage` unchanged. Rejected: folding `export` into `view` (a viewer could bulk-export PII) or `manage` into `edit` (`pos:manage` closes registers, `settings:manage` edits org config — far wider than edit).

## R3 — ONE enforcement point

**Decision: the tenant-handle acquisition in page/layout loads. `datasetCtx(locals, module)` replaces `getCoreCtx(locals)`; a ratchet forbids the bare call.**

Options:
| Point | Mechanical? | Denied = value? | Touches | Verdict |
|---|---|---|---|---|
| **Load boundary** (`datasetCtx`/`readDataset`) | yes — one call per dataset where `getCoreCtx` sits today (70 sites); the ratchet makes forgetting impossible | yes — the load returns the marker in the data slot | 62 load files, 0 services | **chosen** |
| `withOrgCore(scope, fn)` requiring a dataset argument | yes (type error at 99 services' call sites) | no — a service cannot return a page-level marker; it would throw, and a throw kills the whole page | 99 services + every caller incl. jobs/gateway | rejected: wrong layer for "appear broken", and jobs run as the server |
| Postgres GUC `app.datasets_allowed` + RLS policies | fully mechanical | no — rows silently vanish (empty ≠ denied), the owner's "broken or disabled" needs a reason | every RLS policy (schema not reproducible from repo) | rejected |
| Route-manifest `datasets: [...]` per screen + central hook 403 | mechanical | no — 403 refuses the page, contradicting the owner's model | manifest | rejected (but the manifest may later declare datasets for the capture matrix — ledger) |
| Per-call `assertCan(ctx, module, 'view')` discipline | no | yes | every call | rejected: the owner's "forgetting one over the other" |

Shape (`src/server/auth/dataset-ctx.ts`):
```ts
export interface DatasetDenied { denied: Module; verb: 'view' }
export const isDenied = (v: unknown): v is DatasetDenied => !!v && typeof v === 'object' && 'denied' in v;
export async function datasetCtx(locals: App.Locals, module: Module): Promise<CoreCtx | DatasetDenied>;  // 401 without tenant (like requireCoreCtx); admin → ctx; caps.can(module,'view') → ctx : marker
export async function readDataset<T>(locals, module, fn: (ctx: CoreCtx) => Promise<T>): Promise<T | DatasetDenied>;
```
Cost: `resolveCapabilities` is cached 2 m (`rbac.service.ts:340-351`) and already runs for the layout permissions; one extra cache hit per dataset per load.

Why `T | DatasetDenied` rather than `{ ok, data }`: the union makes every consumer a compile error until it handles denial (`data.sellables.length` fails type-check), which is the mechanical pressure the owner asked for on the client side too.

## R4 — The denied-visual contract

**Decision: `DataSource.svelte` (`src/lib/components/ui/DataSource.svelte`), props `{ value: T | DatasetDenied; module?: Module; children: Snippet<[T]>; compact?: boolean }`; denied → `AsyncBoundary state={{ kind:'forbidden', title: m.data_denied_title({ dataset }), description: m.data_denied_hint() }}`; lists use `CollectionState state="denied" message=…` through `DataView` (already wired for `denied`, spec 013).**

- Reuse, not invention: `AsyncBoundary` already has `forbidden` (`foundations/AsyncBoundary.svelte:7`), `CollectionState` already has `denied` (`data-view.ts:40`, message doc `:33`), `EmptyState` is what `AsyncBoundary` renders. `DataSource` is ~25 lines: a type guard and a branch.
- Wording (memory rule: "your role can't", never generic): `data_denied_title` = "Your role can't view {dataset}" / "Tu rol no puede ver {dataset}", `data_denied_hint` = "Ask an admin for View on this dataset" / "Pide a un administrador el permiso Ver sobre estos datos". `{dataset}` = `MODULE_LABELS[module]` (hub labels are English constants today — follow that; ledger to localise).
- Compact variant for layout slots (K2: the POS shift banner) = same component with `compact` → one line + lock icon (`iconSizes.sm`), tokens only.
- Lazy in-page fetches (K3): `fetchJson` (or the existing fetch helper the page uses — check `$lib/api` / `toastAsync` call sites) returns `DatasetDenied` for a GET 403 whose body matches `/: view required$/` (the `requireOrgCapability` message, `rbac.service.ts:1287`), so the host renders the same `DataSource`.

## R5 — Ratchet design

**Decision: a vitest (`src/server/auth/dataset-read.ratchet.test.ts`) with a JSON baseline, modelled on `scripts/design-lint.mjs` + `.design-lint-baseline.json` (`DESIGN-LINT.md:1-13`).**
- Scan: `src/routes/(app)/**/+page.server.ts|+layout.server.ts`; count matches of `/\b(getCoreCtx|requireCoreCtx|getTenantCtx|requireTenantCtx|getCoreDb\(|withOrgCore)\b/` per file (comments stripped).
- Rules: (1) file under an `appPrefixes` of a module ∈ `DATASET_ENFORCED` ⇒ count must be 0; (2) otherwise count ≤ baseline[file]; (3) file absent from baseline ⇒ must be 0; (4) baseline keys that no longer exist are reported as stale (fail — forces `--update`).
- Update: `scripts/dataset-read-baseline.mjs --update` rewrites the JSON only when every count is ≤ the old one (decrease-only, like `--update-baseline`); CI never runs it.
- Second bucket (S5): `src/routes/api/**/+server.ts` files exporting `GET` with no `requireOrgCapability|requireAuth|requireAdmin` — baseline the same way; today's count is measured in S5 (unknown now; AS-IS shows POS GETs are gated).
- Why a vitest, not a lint script: it joins the targeted lane every slice already runs (`bun x vitest run src/server/auth`), needs no new npm script, and `DATASET_ENFORCED` is importable.

## R6 — Roles matrix as the data editor

- `RbacRolesSection.svelte` action grid iterates `actions` (`:440-466`) with `capitalize` of the raw key; S6 maps labels through `DATA_VERBS` and splits `['export','manage']` behind a `SegmentedControl`/toggle "Advanced". The module-level "set level" buttons (`:255-300`) keep writing the same `ActionSet`.
- "Sections" rows (`:609-650`, from `listRbacRoles` `subResources`) are *page* rules; they go once 037 S5's Access dialog exists. `listRbacRoles` keeps returning `subResources` until then (one flag `includeSubResources` to drop them from the UI without breaking tests).
- Editing gate stays `users:manage` (`settings/roles/+page.server.ts:20`).

## R7 — Day-one safety (J5) and the 037 coupling
- Route prefix rules are `<module>:view` for every business module (`route-access-registry.ts:170-197`); exact overrides only *raise* requirements. Hence a member who can open a module page today has `view` on that module ⇒ no denied visual appears for them after enforcement. Exceptions to verify per module in the quickstart: pages under `authenticated`-only paths that read business data (`/home/settings`, `/overview`, `(app)/+layout.server.ts`) — `overview` is VIEW for every role (`defaultCaps`, `:166`), so attributing those to `overview` keeps them visible.
- `DATASET_ENFORCED` lives in `src/lib/permissions.ts` (client-safe) so 037's `floorApplies` and this spec's ratchet import the same array. Whichever of 037 S2 / 039 S1 lands first creates it as `[]`.

## R8 — Rejected: a `page.datasets` declaration in the route manifest as the source of truth
Tempting (one table of screen → datasets), but it duplicates what the load already states by calling `datasetCtx`, and it drifts the moment a load adds a read. Ledger: derive the manifest's dataset list FROM the loads (static scan) for the Spec Kit capture matrix.
