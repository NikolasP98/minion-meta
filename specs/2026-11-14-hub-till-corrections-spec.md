---
id: 2026-11-14-hub-till-corrections-spec
title: Till corrections — stock follows the appointment, products on the agenda, product swap
stage: deploy
status: shipped
pass: 1
created: 2026-11-14
updated: 2026-11-18
repos: [minion_hub]
proposal: 2026-11-13-faces-stock-follows-appointment-agenda-products-line-swap
verdict: approved
type: fix
tags: [data]
---

# Till corrections

## 0. Product

A treatment's supplies leave stock once, when its appointment is completed, never at the sale.
The agenda shows the products sold with a visit. Staff can swap a wrong product on a validated
sale, and when a swap is not enough the app voids and re-opens the sale pre-filled.

The canonical [Spec Kit specification](120-till-corrections/spec.md) contains the AS-IS evidence,
TO-BE invariants, DELTA, slices and acceptance scenarios.

## Plan and verification

- [Implementation plan](120-till-corrections/plan.md)
- [Tasks](120-till-corrections/tasks.md)

## Out of scope

Price or quantity changes after validation, credit notes, treatment-line swaps.

## Human gates

Tagged `data`: a one-time repair changes production stock. Owner approves this spec before code,
merges, and runs the repair.

## Shipped (2026-11-16)

All five hub slices are merged to `master` and deployed (`c6c2d573`, commit status
`Vercel: success`): #669 (S1), #670 (S2), #673 (S3), #671 (S4), #674 (S5). The owner directed the
merges ("keep going until all's live", 2026-11-14 and 2026-11-16); `verdict: approved` records
that.

Stage stays `deploy`, not `done`, because one step is open: the owner runs the one-time repair
(`scripts/repair-service-sale-stock.ts --org <FACES org id> --apply`) after confirming the two
no-show syringes are on the shelf. A read-only check on 2026-11-16 found 13 affected sales, all
from before S1 went live, and no submitted sale after it yet, so S1 has not been exercised in
production. Details and the remaining tasks are in `specs/120-till-corrections/tasks.md`.

Repair applied 2026-11-18 at the owner's request: 13 sales, 13 sale movements cancelled, second preview empty. With the default pool sizes `--apply` stalled before writing (one open read transaction, terminated); it ran with `SUPABASE_DB_POOL_SIZE=4 SUPABASE_DB_RLS_POOL_SIZE=2`.
