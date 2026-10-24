# Quickstart: validate data-source enforcement

Prerequisites: slice branches merged (or merged locally); real `bun install --frozen-lockfile`; `.env` from `.env.example` if needed; QA stack via `bun run dev:local`; personas from `.env.qa.local` (`tenancy.user.owner|manager|staff|viewer`). Browser work against `http://localhost:5199` only (browser-harness).

## 1. Unit lane
```bash
bun run i18n:compile
timeout 900 bun run check; echo "check exit=$?"
bun x vitest run src/server/auth src/lib/components/ui/DataSource.mounted.test.ts src/lib/components/users \
  'src/routes/(app)/pos' src/server/services/rbac.service.test.ts
node scripts/dataset-read-baseline.mjs --print
bun run lint:design && bun run lint:tokens
```

## 2. Ratchet proof (US3)
```bash
mkdir -p 'src/routes/(app)/pos/_zz' && printf "import { getCoreCtx } from '\$server/auth/core-ctx';\nexport const load = async ({ locals }) => ({ x: await getCoreCtx(locals) });\n" > 'src/routes/(app)/pos/_zz/+page.server.ts'
bun x vitest run src/server/auth/dataset-read.ratchet.test.ts   # expect RED naming pos/_zz
rm -r 'src/routes/(app)/pos/_zz'
```

## 3. J5 persona matrix (every rollout slice, every converted page)
For each converted page and each persona (owner, manager, staff, viewer): open the page; record `data shown | denied visual | 403 | 404`. Expected: identical to the same table captured on `master` before the slice, except cells where the persona lacks `<module>:view` today (those were 403 on `master` and stay 403 — the route guard runs first). Save as `evidence/<slice>-j5.md`.

## 4. Scenarios
| # | As | Do | Expect |
|---|---|---|---|
| P1 | owner | Settings → Roles → `viewer` → POS: untick View | viewer loses `pos:view` |
| P2 | viewer | open `/es/staff/sell~k3x9q2` (037 seeded link, page role allowed) with `pos ∈ DATASET_ENFORCED` | page renders; sellable grid, today's activity and shift banner show "Your role can't view Point of Sale"; Charge/Open shift disabled with no-permission title; network shows `__data.json` with `{ "denied": "pos" }` slots and no sellable rows |
| P3 | viewer | same, after the owner re-ticks View | data renders; writes still disabled |
| P4 | staff | open `/es/pos/sell`, `/es/pos/history`, `/es/pos/accounts`, `/es/pos/catalog` | identical to before S2 (J5) |
| P5 | viewer | force `POST /api/pos/tickets` (curl, viewer cookie) | 403 (J7) |
| P6 | viewer | open `/es/pos/sell` directly (canonical, route policy `pos:create`) | 403 as before — page roles unchanged (037 default) |
| P7 | viewer without `scheduling:view` | open `/es/staff/appointments~a1b2c3` (037 moved main; page allowed) after S3 | page renders with the calendar in the denied state; POS parts (if any) show data |
| P8 | staff without `finance:view` (default) | open a 037 link to `/finances` after S4 | denied visual, not 403 |
| P9 | owner | Settings → Roles after S6 | columns View · Add · Edit · Remove; Advanced toggle reveals Export · Manage; ticking Add on `viewer × crm` sends `caps.create=true`; no "Sections" block |
| P10 | manager | `/es/brains`, `/es/agents/autonomous` after S5 | unchanged (J5) |

## 5. Evidence
`evidence/<slice>-j5.md`, `evidence/vitest-<date>.log`, screenshots `p01..p10-*.png`, `evidence/README.md` with hub merge SHAs.
