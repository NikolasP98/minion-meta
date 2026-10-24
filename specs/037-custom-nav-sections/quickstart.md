# Quickstart: validate custom sections end to end (Amendment A)

Prerequisites: hub slices S1–S5 merged (or one worktree with all five branches merged locally); Docker for the QA stack; a real `bun install --frozen-lockfile` in the worktree (symlinked `node_modules` hangs Vite); `.env` present (copy `.env.example` if `bun run check` complains about `$env/static/public`).

## 1. Unit lane (no DB)
```bash
cd <hub worktree>
bun run i18n:compile
timeout 900 bun run check; echo "check exit=$?"
bun x vitest run src/lib/nav src/lib/access src/lib/routes src/hooks.tenant.test.ts \
  'src/routes/(app)/layout.server.test.ts' src/routes/api/nav src/routes/api/roles \
  src/server/services/rbac.service.test.ts src/server/services/permissions.service.test.ts \
  src/lib/components/layout/sections.test.ts src/lib/components/layout/topbar-parity.test.ts \
  src/lib/state/ui/nav-mode.test.ts src/lib/components/layout/NavContextMenu.mounted.test.ts
bun run lint:design && bun run lint:tokens
```
Expected: 0 check errors/warnings; every listed suite green; design/token debt unchanged or lower.

## 2. QA stack + seeds
```bash
bun run qa:status
bun run dev:local            # seeded backend on loopback + Vite on http://localhost:5199
bun run qa:seed:verify       # contract test incl. tenancy.nav.staff-section + tenancy.nav.staff-sell-viewer-rule
```
Personas (email/password) are printed by `qa:up`/`dev:local` and live in `.env.qa.local`: `tenancy.user.owner`, `tenancy.user.staff`, `tenancy.user.viewer`, `tenancy.user.manager`.

Browser: use the browser-harness skill against `http://localhost:5199` only (never production).

## 3. Scenarios (record a screenshot per step under `specs/037-custom-nav-sections/evidence/`)
| # | As | Do | Expect |
|---|---|---|---|
| Q1 | owner | full sidebar: right-click the empty area under the items | general menu: New section… · Paste into › (disabled, clipboard empty) · Not shown › (empty) |
| Q2 | owner | New section… → label `Front desk`, slug auto `front-desk`; then try slug `pos` | `Front desk` header appears (admin sees empty sections); `pos` shows "reserved" inline and Save stays disabled; `PUT /api/nav/config` with slug `pos` (curl, owner cookie) → 400 `slug.reserved` |
| Q3 | owner | module mode → POS → right-click `Sell` | item menu: Set as home page · Copy · Move… · Rename… · Hide (no Duplicate, no Delete: built-in section) |
| Q4 | owner | Copy `Sell`; right-click `Front desk` header → Paste | `Front desk › Sell` appears linking `/front-desk/sell`; POS still lists Sell; `GET /api/nav/config` has a `kind: 'link'` entry |
| Q5 | owner | right-click POS `Catalog` → Move… → `Front desk` | Catalog leaves POS; `Front desk › Catalog` opens `/es/front-desk/catalog`; typing `/es/pos/catalog` lands on `/es/front-desk/catalog` (address replaced, same screen); `/es/front-desk/catalog/new` renders the new-item form |
| Q6 | owner | right-click `Front desk › Sell` → Rename… → slug `till` | `/es/front-desk/till` works; `/es/front-desk/sell` → 404 |
| Q7 | owner | right-click `Front desk › Sell` → Permissions… | lands on `/settings/roles`; "Custom pages" shows `Front desk › Sell` with a view-only, indeterminate checkbox per role |
| Q8 | owner | keyboard: Tab to a sidebar item, press Shift+F10 | the same item menu opens anchored at the item; Escape closes and returns focus |
| Q9 | staff | open `/es/staff/sell` (seeded link) by typing the URL | URL unchanged; POS till renders with shift banner; sidebar highlights Staff → Sell; PosNav highlights Sell |
| Q10 | staff | open a shift, sell one item | ticket posts (`/api/pos/*`), toast success |
| Q11 | staff | open `/es/staff/appointments` (seeded moved main) then `/es/staff/appointments/new` | both render at those URLs; POS module list no longer shows Appointments; `/es/pos/appointments` client-replaces to `/es/staff/appointments` |
| Q12 | staff | switch nav mode to module, pick `Staff` | sidebar shows Staff pages only; POS shift strip visible |
| Q13 | viewer | open `/es/staff/sell` | 404 (seeded `can_view=false` row); the sidebar never listed it |
| Q14 | owner → viewer | Settings → Roles: tick view for `viewer` on `Staff › Sell`; viewer opens `/es/staff/sell` | till renders read-only: no "Open shift" button; "Charge" disabled with the no-permission title; `curl -X POST /api/pos/tickets` with the viewer cookie → 403 |
| Q15 | owner → custom role | create role `kiosk` (no POS caps), tick view on `Staff › Sell`, assign to a test member; open `/es/staff/sell` | 403 "You do not have access to this module." (floor); network tab shows no `/pos/sell/__data.json` payload with sellables |
| Q16 | owner | Settings → Modules: toggle POS off; staff opens `/es/staff/sell` and `/es/staff/appointments` | 404 both; toggle POS back on |
| Q17 | owner | right-click `Front desk › Sell` → Hide; then empty area → Not shown › | item gone from every nav (check mobile sheet at <768px); `/es/front-desk/till` still opens for staff; "Not shown ›" lists it with Show |
| Q18 | owner | right-click `Front desk › Catalog` → Restore to /pos/catalog; right-click `Front desk` header → Delete section… | POS lists Catalog again; `/es/front-desk/*` → 404; `permission_rules` has no `nav.%` rows for the deleted link (psql on the QA db) |
| Q19 | any (phone emulation) | long-press a mobile sheet item ~600 ms | item menu opens; a scroll gesture does not open it |
| Q20 | owner | check the page title/header on `/es/staff/sell` | identical to `/es/pos/sell` (research R8 open check) |

## 4. Evidence to commit (meta PR for S6)
- `evidence/vitest-<date>.log` (section 1 output), `evidence/q01..q20-*.png`, `evidence/README.md` listing commit SHAs of the hub PRs qualified.
