# Feature Specification: Data-source permissions — roles grant view/add/edit/remove per dataset, enforced on reads

**Feature Branch**: `spec/039-data-source-rbac` (meta, → `dev`) · hub slices `feat/data-rbac-s1..s6` → `master`
**Created**: 2026-10-23 | **Status**: Draft — **security + data tag** (RBAC enforcement on every tenant read): the owner approves this spec before code AND merges every hub slice (constitution Principle V).
**Companion**: spec 037 Amendment B (`specs/037-custom-nav-sections/spec.md`) owns *page* roles ("may navigate here"); this spec owns *data* roles. The two share one constant, `DATASET_ENFORCED`, which flips 037's transition floor per module as this spec lands.
**Input**: Owner (verbatim, 2026-10-23): "I do want to simplify the role/access logic. Adding roles to everything and forgetting one over the other is kind of complicated. I was thinking roles for database actions (can this role view/add/edit/remove items in this dataset?) and roles for pages. Page roles give you access to navigate into the link. If a user lacks the data role to VIEW the database table(s), then any visual that uses that data-source will appear "broken" or disabled. So there would be access to the data source and access to pages. If the acting user has permission/access roles (to make role rules and assign roles to groups, then they can right-click a page in the sidemenu and view access permission actions in the context menu per page/section)"

## Owner decisions (answer before `/speckit-implement`; recommended answers are the spec's defaults)

| # | Question | Recommendation (= what this spec assumes) |
|---|---|---|
| K1 | **Where do today's `export` and `manage` verbs go?** The owner names four verbs (view/add/edit/remove); the matrix has six (`ACTIONS`: view/create/edit/delete/export/manage). | **Keep both as "Advanced" columns behind a toggle in the Roles matrix; semantics unchanged.** `manage` gates module settings/registers (e.g. `pos:manage` closes a shift, `settings:manage` edits org config) and `export` gates bulk exports — folding either into view/edit would silently widen roles. Labels only: `create`→"Add", `delete`→"Remove"; stored columns (`can_create`, `can_delete`) stay, so no data migration. |
| K2 | **Layout-level visuals when a dataset is denied** — e.g. the POS shift banner (`pos/+layout.server.ts` reads shifts for every POS page). Show a compact denied state in the banner's slot, or hide the banner? | **Show the denied state** (`AsyncBoundary` `forbidden`, compact): the owner's rule is "appear broken or disabled", and a silently missing banner hides *why* the till cannot open a shift. Hiding is a one-line change per host if the owner prefers. |
| K3 | **In-page `fetch('/api/<module>/…')` reads when the dataset is denied** — API GETs answer 403 today. Keep 403, or make the API return the denied marker too? | **Keep 403 at the API** (writes and third-party callers rely on it); the hub's shared fetch helpers map a 403 on a GET to the same `DatasetDenied` state client-side, so a visual that loads lazily lands in the identical denied visual. Changing API semantics is a bigger contract than this spec needs. |

No `[NEEDS CLARIFICATION]` markers remain in the body.

## AS-IS (evidence; every anchor is `minion_hub` `origin/master` @ `7d06cdd4` unless stated)

### The matrix: modules × actions, roles, overrides
- `MODULES` (24 keys: `overview`, 13 business — `crm finance sales scheduling support projects memberships comms brains stock ads pos pulse` —, 10 platform/admin — `agents channels flows marketplace reliability workspace settings users tools`; `rbac.service.ts:40-66`), `ACTIONS = ['view','create','edit','delete','export','manage']` (`:69`), `MODULE_LABELS` (`:74-99`), `BUSINESS_MODULES` / `ADMIN_MODULES` (`:101-120`).
- `defaultCaps(roleKey, module)` (`:165-186`): owner/admin ALL; manager RWXE(M on pos) on business, VIEW on admin; staff RWX on `crm scheduling support comms pos stock`, VIEW on `finance sales projects memberships`; viewer VIEW on every business module; unknown module/role NONE.
- Overrides: `permission_rules (org_id, role_key, module, can_view, can_create, can_edit, can_delete, can_export, can_manage, if_owner, field_level)` (`CapabilityOverrideRow`, `:250-261`); dotted sub-resource keys (`pos.sell`) inherit the parent module (`buildCapabilities.effective`, `:287-292`). `resolveCapabilities(orgId, profileId)` cached 2 m / SWR 30 s (`:340-351`), `invalidateRbac(orgId)` (`:319`).
- Role management capability = **`users:manage`**: `settings/roles/+page.server.ts:20` (`requireOrgCapability(locals,'users','manage')`), `api/roles/+server.ts:19`, `api/roles/overrides/+server.ts:27,49`, `api/roles/[key]`. The matrix UI is `src/lib/components/users/RbacRolesSection.svelte` (action grid `:440-466`, module levels `:255-300`, sub-resource "Sections" rows `:609-650`, owner-scope and sensitive-field toggles `:309-…`).
- Finer tiers that already exist and travel with the data: owner scope (`OWNER_SCOPABLE_MODULES = { crm, sales, support }`, `:445-449`, applied via `app.current_profile_id` GUC in `withOrgCore`/RLS) and field level (`FIELD_LEVEL_MODULES = { crm, finance, scheduling }`, `src/lib/permissions.ts:123-127`), consumed by the gateway query endpoints (`api/gateway/query/{bookings,finance,orders,tickets}`) and `brains.service.ts:79-89`.

### Writes are enforced centrally; reads are not
- Writes: `apiWriteCapability(path, method)` maps `/api/<module>/*` POST/PUT/PATCH/DELETE to `(module, action)` (`rbac.service.ts:1100-1153`, prefixes `:1112-1153`), enforced in `hooks.server.ts` (`:432-444`, 403 JSON); handlers add `requireOrgCapability(locals, module, action)` (e.g. `api/pos/categories/+server.ts:32` edit, `accounts/topup:36` manage). Message convention: `${module}: ${action} required` (`:1287-1290`).
- API reads: every `GET` under `src/routes/api/pos/**` calls `requireOrgCapability(locals, 'pos', 'view')` (`accounts/+server.ts:20`, `appointments/+server.ts:52`, `categories/+server.ts:24`, `slots/+server.ts:10`, …). `apiWriteCapability` deliberately skips GET/HEAD ("pages gate their own view access", `:1104-1108`).
- **Page server loads read tenant data with only the route guard in front.** Method (run against `origin/master`): list `src/routes/(app)/**/+page.server.ts` and `+layout.server.ts`; count files that obtain a tenant handle (`getCoreCtx|requireCoreCtx|getTenantCtx|requireTenantCtx|getCoreDb(|withOrgCore`); subtract files containing any capability call (`requireOrgCapability|hasOrgCapability|resolveCapabilities|requireAdmin|caps.can`). Result: **126 loads; 73 touch tenant data; 11 have a capability call; 62 do not.** By module (file counts): pos 10 (incl. `pos/+layout.server.ts`), scheduling 9 (incl. layout), stock 8, socials 6, finances 6, crm 5, workforce 3, brains 3, support 2, sales 2, agents 2, work 1, overview 1, memberships 1, home/settings 1, channels/gmail 1, `(app)/+layout.server.ts` 1 (user-scoped bundle). The 11 guarded ones are admin/settings pages (`brains/settings`, `brains/template`, `notifications`, `notifications/daily`, `pos/settings`, `pulse`, `settings/backups`, `settings/modules`, `settings/pulse`, `settings/workflows`, `team`). There are **70** `getCoreCtx(locals)` / `requireCoreCtx(locals)` call sites across those loads.
- Representative: `pos/sell/+page.server.ts:19-27` ("View perm (`pos.sell:view`) is enforced centrally by the root layout guard — this load only fetches the tab's data") then `listSellables`, `listTickets`, `listShifts`, `listPaymentsFor`; `pos/+layout.server.ts:14-22` then `getPosSettings`, `getOpenShift`, `listOpenShifts`, `countPosPendingWork`.
- Services carry no access logic by design: **158** `src/server/services/*.service.ts`; **99** use `withOrgCore` (RLS tenant scope); **5** mention capabilities — `brains.service.ts` (uses `visibleModules`/`ownerScoped`/`fieldLevel` to scope retrieval, `:45-89`), `brain-hybrid-retrieval.service.ts` (field levels), and comments in `brain-agents`, `brain-corpus`, `crm-relationship-inference` — so **94** tenant-scoped services trust their caller.
- `withOrgCore(scope: OrgScope, fn)` (`src/server/db/with-org-core.ts:158`; `OrgScope = { db, tenantId, profileId? }`, `:14-23`) is the single RLS entry point for tenant SQL; `CoreCtx` (`src/server/auth/core-ctx.ts:17-27`) is what `getCoreCtx(locals)` returns and what every service takes.

### Consequence (the gap this spec closes)
Whoever passes the **route** policy of a page receives that page's **data**. Today the two coincide because the route prefix rules are `<module>:view` (`route-access-registry.ts:170-197`), so a member who can open `/pos/*` has `pos:view`. Spec 037 (custom pages) breaks the coincidence on purpose — a page role may open a page for a role that lacks the module's view — and the owner's model wants exactly that, with the data visuals disabled rather than the page refused. Reads must therefore be enforced at the data boundary, not inferred from the URL.

### UI states that already exist for "denied"
- `CollectionState` (spec 013 FR-005): states `initial-load refreshing stale empty no-results denied partial failed recovered` (`src/lib/components/data-view/data-view.ts:29-45`); `denied` replaces the rows (`collectionShowsRows`, `:48-56`); component `src/lib/components/data-view/CollectionState.svelte` takes `state`, `message` ("`denied` → what the role can't view", `:33`), `onRetry`, `view`.
- `AsyncBoundary` (`src/lib/components/ui/foundations/AsyncBoundary.svelte:2-9`): `{ kind: 'forbidden'; title?; description? }` plus `forbiddenAction` snippet (`:23`).
- `EmptyState` (`src/lib/components/ui/EmptyState.svelte:8-19`): `title`, `description`, `icon`, `action` snippet.
- Button-level: `canAct(module, action)` (`src/lib/access/can.svelte.ts:39-42`) reads `<module>:<action>` strings; 60 call sites; pattern `disabled={!canAct('crm','edit')} title={m.no_permission()}` (`crm/[contactId]/+page.svelte:623-624`).
- Memory rule (meta): a 403 must say "your role can't", never a generic failure.

### The ratchet pattern the hub already uses
`scripts/design-lint.mjs` + `scripts/.design-lint-baseline.json` (`scripts/DESIGN-LINT.md:1-13`): repository totals are governed counts that may only decrease; changed files are compared with `DESIGN_LINT_BASE_REF` / `origin/master`; `--update-baseline` is decrease-only and refuses to raise a ceiling. `scripts/qa/check-baseline.ts` is a second baseline-style gate.

## TO-BE

Roles say two things: which **pages** a member may open (spec 037) and which **datasets** a member may **view / add / edit / remove** (this spec). A dataset is one of today's modules (`pos`, `crm`, `stock`, …). Every page load that reads tenant data declares the dataset it reads; when the member's role lacks `view` on it, the load returns a typed *denied* value instead of the data and the page still renders, with each visual bound to that dataset shown as disabled ("Your role can't view POS data"). Writes keep failing at the API as today, and write controls stay disabled through `canAct()`. Enforcement arrives module by module; a ratchet test stops any new unguarded read from being added, and the modules already enforced are listed in one constant that spec 037 reads to drop its transition floor.

### Invariants
- **J1 — One read boundary.** In `src/routes/(app)/**/+page.server.ts` and `+layout.server.ts`, tenant data is read only through `readDataset(locals, module, fn)` or a `datasetCtx(locals, module)` handle. For modules in `DATASET_ENFORCED`, zero bare `getCoreCtx`/`requireCoreCtx`/`getTenantCtx`/`getCoreDb`/`withOrgCore` calls remain in those files; for the others, the count per file may only decrease (ratchet baseline). A new load file starts at zero.
- **J2 — Denial is a value, not an error.** A denied dataset read returns `{ denied: <module>, verb: 'view' }` (type `DatasetDenied`) in the data slot. The load never throws 403 for data; the page renders; page roles alone decide navigation (037 I1′).
- **J3 — The four verbs are today's capabilities.** `view ↔ view`, `add ↔ create`, `edit ↔ edit`, `remove ↔ delete`; `export`/`manage` unchanged behind "Advanced" (K1). Nothing in `permission_rules`, `defaultCaps`, `apiWriteCapability` or `requireOrgCapability` changes semantics; only labels do.
- **J4 — Platform admins bypass; tiers unchanged.** `user.role === 'admin'` reads everything (as `requireOrgCapability` does today); owner scope and field masking keep applying inside services and the gateway query endpoints.
- **J5 — Day one is byte-identical for every existing URL.** Because today's route prefix rules already require `<module>:view` to open a module's pages, no member who can open a page today sees a denied visual on it after enforcement — the proof is the per-module quickstart run with every seeded persona.
- **J6 — Same visual everywhere.** A denied dataset renders through one component (`DataSource`) over `AsyncBoundary forbidden` / `CollectionState denied`; the message names the dataset and says "your role can't view"; never a blank panel, never a toast, never a generic error.
- **J7 — Writes unchanged.** `apiWriteCapability` + `requireOrgCapability` keep gating every mutation; API GETs keep `requireOrgCapability(module,'view')` and answer 403 (K3); client fetch helpers map that 403 to the same denied state.

### Mechanism (summary; evaluation in `research.md` R2–R5)
`src/server/auth/dataset-ctx.ts` exports `datasetCtx(locals, module): Promise<CoreCtx | DatasetDenied>` (platform admin → ctx; else `resolveCapabilities(tenantId, supabaseId)` cached → `caps.can(module,'view')` → ctx or the marker) and `readDataset(locals, module, fn)` (sugar: `const c = await datasetCtx(…); return isDenied(c) ? c : fn(c)`). Loads replace `const ctx = await getCoreCtx(locals)` with one `datasetCtx` per dataset they read; multi-dataset loads (the till reads `pos` and `scheduling`) call it once per dataset. Services are untouched. The client wraps each data-bound region in `<DataSource value={data.x}>{#snippet children(rows)}…{/snippet}</DataSource>`, which renders the denied state when `isDenied(value)`. A vitest ratchet (`src/server/auth/dataset-read.ratchet.test.ts`) scans the load files, compares bare-ctx counts with `scripts/.dataset-read-baseline.json`, and enforces zero for `DATASET_ENFORCED` modules. The Roles matrix relabels columns and gains an "Advanced" toggle (K1); after 037 S5 ships the Access dialog, the matrix drops its "Sections" page rows.

## DELTA (each transition → slice → proof)

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `datasetCtx` / `readDataset` / `DatasetDenied` / `isDenied` in `src/server/auth/dataset-ctx.ts`; `DATASET_ENFORCED = []` + `DATA_VERBS` label map in `src/lib/permissions.ts` | S1 | `dataset-ctx.test.ts`: admin → ctx; member with `pos:view` → ctx; without → `{ denied:'pos', verb:'view' }`; no tenant → 401 (as `requireCoreCtx`); `readDataset` short-circuits without calling `fn` |
| D2 | Ratchet `src/server/auth/dataset-read.ratchet.test.ts` + `scripts/.dataset-read-baseline.json` (62 files, bare-ctx counts) + `scripts/dataset-read-baseline.mjs --update` (decrease-only) | S1 | the test is green at the baseline, red when a fixture file with a bare `getCoreCtx` is added under `src/routes/(app)/_fixture/` (test creates and removes it), red when a baseline count is raised by hand |
| D3 | `DataSource.svelte` (+ `isDenied` client re-export) over `AsyncBoundary forbidden`; `CollectionState denied` message helper; i18n `data_denied_title` / `data_denied_hint`; `fetchJson` helper maps GET 403 → `DatasetDenied` | S1 | `DataSource.mounted.test.ts`: denied value renders the forbidden state with the module label; ready value renders children; `lint:design && lint:tokens` no new debt |
| D4 | POS rollout: 10 loads converted (`pos/+layout.server.ts`, `sell`, `appointments`, `appointments/new`, `catalog`, `catalog/new`, `catalog/[productId]/edit`, `history`, `accounts`, `tickets/[id]`); POS pages wrap their visuals in `DataSource`; `DATASET_ENFORCED += 'pos'` | S2 | ratchet green with `pos` files at zero; `pos/sell/page.server.test.ts` (new): viewer-without-`pos:view` gets `{ denied:'pos' }` for sellables/tickets/shifts and no service call; quickstart P1–P6; 037 `transition-floor.test.ts` flips for `pos` |
| D5 | scheduling (9) + stock (8) rollout; `DATASET_ENFORCED += 'scheduling','stock'` | S3 | ratchet green; per-module load tests; quickstart P7 |
| D6 | crm (5), finances (6), sales (2), support (2), memberships (1), socials/ads (6) rollout | S4 | ratchet green; load tests; quickstart P8 |
| D7 | workforce/projects (3+1), brains (3), agents (2), overview (1), home/settings (1), channels/gmail (1), `(app)/+layout.server.ts` (user-scoped — declares `overview`); API GET bucket added to the ratchet (GET handlers under `src/routes/api/**` without `requireOrgCapability`/`requireAuth`) | S5 | ratchet green with every module enforced; `DATASET_ENFORCED` = all business + platform modules with app prefixes |
| D8 | Roles matrix = data editor: columns "View · Add · Edit · Remove" + "Advanced ▸ Export · Manage"; "Sections" sub-resource rows removed (page rules live in 037's Access dialog); hub `AGENTS.md` RBAC checklist; ledger | S6 (after 037 S5) | `RbacRolesSection.mounted.test.ts` (labels, advanced toggle, no Sections block); `settings/roles` screenshot; `lint:design` |

## User Scenarios & Testing

### US1 — A viewer opens the till through a page link and sees it disabled (P1)
1. **Given** a `viewer` with the page role for `/staff/sell~k3x9q2` (037) and `pos ∈ DATASET_ENFORCED`, **When** they open it, **Then** the page renders: the sellable grid, today's activity and the shift banner each show "Your role can't view POS data" in place of their content; "Charge" and "Open shift" are disabled with the no-permission title.
2. **Given** the owner grants `viewer` **View** on POS in Settings → Roles, **When** the viewer reloads, **Then** every POS visual shows data; writes stay disabled.

### US2 — Nothing changes for members who could already open a page (P1)
1. **Given** the seeded `staff` persona (RWX on pos/crm/scheduling/stock), **When** POS, scheduling and stock are enforced, **Then** every page they could open yesterday shows the same data today (J5), verified page by page on the QA stack.
2. **Given** the `manager` persona (VIEW on admin modules), **Then** `/brains`, `/agents/autonomous` render as before after S5.

### US3 — A new unguarded read cannot ship (P1)
1. **Given** a developer adds `src/routes/(app)/pos/returns/+page.server.ts` with `const ctx = await getCoreCtx(locals)`, **When** CI runs the targeted vitest, **Then** the ratchet fails naming the file and the fix (`datasetCtx(locals, 'pos')`).
2. **Given** a developer raises a count in `.dataset-read-baseline.json` by hand, **Then** the test fails ("baseline may only decrease").

### US4 — The matrix speaks the owner's verbs (P2)
1. **Given** Settings → Roles, **Then** each module row shows View · Add · Edit · Remove, with Export · Manage under an "Advanced" toggle; ticking "Add" writes `can_create` (network tab).
2. **Given** 037's Access dialog is live, **Then** the matrix shows no "Sections" rows; page access is edited from the sidebar.

### Edge cases
- A load reads two datasets (the till reads `scheduling` resources/event types when scheduling is on): each gets its own `datasetCtx`; one may be denied while the other returns data.
- A layout load (`pos/+layout.server.ts`) denied: the layout still renders; the shift banner shows the compact denied state (K2); child pages decide their own visuals.
- A `DatasetDenied` value reaches a component that does not use `DataSource` (e.g. passes `data.sellables.length`): TypeScript rejects it (`T | DatasetDenied`), which is the point — the compiler finds every consumer.
- Platform admin: never denied (J4).
- `resolveCapabilities` cache (2 m): a role change takes effect within the cache window as today; `invalidateRbac` on role edits already flushes it.
- A module toggled off for the org: the route guard 404s before any load runs (unchanged).
- API GET 403 from a lazy in-page fetch: `fetchJson` returns the denied marker; the host renders `DataSource` the same way (K3).
- The ratchet's module attribution uses `MODULE_MANIFEST.appPrefixes` (`src/lib/modules/availability.ts`); loads outside every prefix (`/home`, `/overview`, `(app)/+layout.server.ts`) are attributed to `overview`.

## Requirements

### Functional
- **FR-001** `datasetCtx(locals, module)` and `readDataset(locals, module, fn)` exist, are the only sanctioned tenant-read entry points in `(app)` loads, and return `DatasetDenied` when the member lacks `view` on the module.
- **FR-002** A ratchet test enforces J1 with a decrease-only baseline and a zero ceiling for `DATASET_ENFORCED` modules; an update script lowers the baseline, never raises it.
- **FR-003** `DataSource` renders a denied dataset with the module label through existing primitives; `CollectionState denied` is used for lists; every string is a Paraglide message.
- **FR-004** Enforcement rolls out module by module; each rollout PR converts every load under the module's prefixes, wraps the affected visuals, adds the module to `DATASET_ENFORCED`, and proves J5 on the QA stack.
- **FR-005** The Roles matrix labels the four verbs, keeps export/manage under "Advanced", and (after 037 S5) drops the "Sections" rows; `users:manage` remains the editing gate.
- **FR-006** Writes keep their current gates; API GETs keep `requireOrgCapability(module,'view')`; the client fetch helper maps GET 403 to `DatasetDenied`.
- **FR-007** Hub `AGENTS.md` documents the rule: new loads use `datasetCtx`; the ratchet is part of the targeted vitest lane.

### Key entities
- **Dataset** — a `Module` key (24 today). No new table.
- **DatasetDenied** — `{ denied: Module; verb: 'view' }`.
- **DATASET_ENFORCED** — `readonly Module[]` in `src/lib/permissions.ts`, shared with spec 037.
- **Baseline** — `scripts/.dataset-read-baseline.json`: `{ "<load file>": <bare ctx call count> }`.

## Success Criteria
- **SC-001** After S5, zero bare tenant-handle calls remain in `(app)` loads (baseline file is empty or deleted); the ratchet test is green with `--strict`.
- **SC-002** J5 holds: the per-module persona matrix (owner/manager/staff/viewer on every converted page) shows no new denied visual except where the role lacks `<module>:view` today — recorded as a table in `evidence/`.
- **SC-003** US1 passes end to end on the QA stack with the 037 seeded link once both S2s are merged.
- **SC-004** `bun run check` 0/0 on every slice; `lint:design && lint:tokens` debt does not increase; only targeted vitest is run.
- **SC-005** Settings → Roles shows the four verbs; no behaviour change in what each checkbox writes (network assertions in the mounted test).

## Assumptions
- Dataset granularity = module. Table-level datasets are not needed by any current UI and would multiply the matrix (99 services, dozens of tables); the dotted sub-resource keys (`pos.sell`) are page keys, not datasets, and migrate to 037's page rules.
- `resolveCapabilities` is cheap enough to call once per dataset per load (cached 2 m; already called 3×+ per navigation).
- The existing `requireOrgCapability` 403 message style stays for APIs; the denied visual carries the user-facing wording.

## Out of scope (named cuts)
- Table/column-level datasets; per-record ACLs beyond today's owner scope.
- Changing `permission_rules` columns or `defaultCaps`.
- Making services self-guarding (the load boundary is the single point; services remain callable by trusted servers/jobs).
- Enforcing reads inside gateway/background jobs (they run as the server, not as a member).
- A denied marker from API GETs (K3).

## Verification (end-to-end, run by the implementer of each rollout slice and of S6)
`quickstart.md` — unit lane + ratchet; QA stack personas on every converted page (J5 table); US1 with the 037 link; US3 by adding/removing a fixture load; matrix labels and network writes. Evidence under `specs/039-data-source-rbac/evidence/`.
