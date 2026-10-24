# Quickstart: validate custom sections end to end

Prerequisites: all hub slices S1–S4 merged (or one worktree with all four branches merged locally); Docker for the QA stack; a real `bun install --frozen-lockfile` in the worktree (symlinked `node_modules` hangs Vite); `.env` present (copy `.env.example` if `bun run check` complains about `$env/static/public`).

## 1. Unit lane (no DB)
```bash
cd <hub worktree>
bun run i18n:compile
timeout 900 bun run check; echo "check exit=$?"
bun x vitest run src/lib/nav src/lib/access src/lib/routes src/hooks.tenant.test.ts \
  'src/routes/(app)/layout.server.test.ts' src/routes/api/nav src/server/services/rbac.service.test.ts \
  scripts/ui-audit-inventory.test.ts src/server/ui-audit/frontend-contract-scanner.test.ts \
  src/lib/components/layout/sections.test.ts src/lib/state/ui/nav-mode.test.ts
bun run lint:design && bun run lint:tokens
```
Expected: 0 check errors/warnings; every listed suite green; design/token debt unchanged or lower.

## 2. QA stack + seeds
```bash
bun run qa:status
bun run dev:local            # seeded backend on loopback + Vite on http://localhost:5199
bun run qa:seed:verify       # contract test incl. tenancy.nav.staff-section
```
Personas (email/password) are printed by `qa:up`/`dev:local` and live in `.env.qa.local`: `tenancy.user.owner`, `tenancy.user.staff`, `tenancy.user.viewer`, `tenancy.user.manager`.

Browser: use the browser-harness skill against `http://localhost:5199` only (never production).

## 3. Scenarios (record a screenshot per step under `specs/037-custom-nav-sections/evidence/`)
| # | As | Do | Expect |
|---|---|---|---|
| Q1 | owner | open `/es/settings/navigation` | the seeded `Staff` section with `Sell → /pos/sell`, `Appointments → /pos/appointments`, roles chip `staff`; Settings nav shows the "Navigation" tab |
| Q2 | owner | add section slug `pos` | inline "reserved" error, Save disabled; `PUT /api/nav/config` with that body (curl with the owner cookie) → 400 `slug.reserved` |
| Q3 | owner | add page target via picker — confirm `/pos` (redirect) and `/pos/catalog/[productId]/edit` are NOT offered | picker lists static screens only |
| Q4 | owner | create section `Front desk` (slug `front`, roles `staff`, `manager`), page `Till → /pos/sell`; Save | sidebar shows "Front desk → Till" immediately (no reload); `GET /api/nav/config` shows the new section |
| Q5 | staff | open `/es/staff/sell` by typing the URL | URL unchanged; the POS till renders with shift banner; sidebar highlights Staff → Sell; PosNav highlights Sell |
| Q6 | staff | open a shift, sell one item | ticket posts (API calls go to `/api/pos/*`), toast success |
| Q7 | staff | click sidebar `Appointments` under Staff, then browser back | `/es/staff/appointments` renders the appointments board; back returns to `/es/staff/sell` with the cart intact |
| Q8 | staff | switch nav mode to module, pick `Staff` in the module switcher | sidebar shows only Staff pages; POS shift strip visible (module-mode branch) |
| Q9 | viewer | open `/es/staff/sell` | 404 page; the sidebar never listed Staff |
| Q10 | owner | Settings → Roles: remove POS `create` from `staff`; staff opens `/es/staff/sell` | 403 "You do not have access to this module." (same as `/es/pos/sell`); restore the capability afterwards |
| Q11 | owner | Settings → Modules: toggle POS off; staff opens `/es/staff/sell` | 404; toggle POS back on |
| Q12 | owner | rename `staff` → `team-desk`; staff refreshes `/es/staff/sell` | 404; `/es/team-desk/sell` works |
| Q13 | staff | set `/team-desk/sell` as home page (sidebar right-click), open `/` | lands on `/es/team-desk/sell` |
| Q14 | any | open `/es/team-desk/sell/anything` and `/es/team-desk` | 404 both |
| Q15 | owner | check the page title/header on `/es/team-desk/sell` | identical to `/es/pos/sell` (research R8 open check) |

## 4. Evidence to commit (meta PR for S5)
- `evidence/vitest-<date>.log` (section 1 output), `evidence/q01..q15-*.png`, `evidence/README.md` listing commit SHAs of the hub PRs qualified.
