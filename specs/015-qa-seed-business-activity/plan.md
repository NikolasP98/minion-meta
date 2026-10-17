# Implementation Plan: QA seed — 90 days of realistic business activity

**Spec**: `spec.md` | **Date**: 2026-10-16 | **Repo**: minion_hub, branch `feat/qa-seed-business-activity` off `origin/master`, worktree `~/.cache/claude-tmp/hub-seed`

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS |
| II AS-IS/TO-BE/DELTA with evidence | PASS (diagnosis numbers from the live QA DB) |
| III Slice-scoped | PASS — S1 generator + contract assertion, S2 apply to the live stack; one PR |
| IV Required build steps | prettier, `vitest run scripts/qa/seed`, `bun run check`; no routes, i18n, migrations or UI |
| V Security gates | not tagged security: loopback-only seed, QA org only, no prod path |

## Design decisions
- **D1 One new module, no new tables, no new helpers in other modules.** `activity.ts` imports the exported ids it needs (`ORG_BUSINESS`, `userId`, `PRODUCT_*`, `CONTACT_*`, `EVENT_TYPE_*`, `RESOURCE_*`, `KIND_DEFAULT`) and writes with the same `sql` template style as its siblings.
- **D2 Per-day PRNG.** `mulberry32(hash(seed + dayISO))`: a past day's rows never change between runs or across days; only the window slides. Simpler than a global sequence that would reshuffle history on every reseed.
- **D3 Delete-then-insert of the tagged set** instead of `ON CONFLICT`: the number of rows per day depends on the date, so stale ids from a previous window would otherwise linger. Deletion is scoped by `org_id` + `ACT-` prefix; `pos_ticket_lines`/`pos_payments`/`fin_invoice_items` cascade from their parents. Shifts are deleted after their tickets.
- **D4 Shifts.** `pos_tickets.shift_id` is NOT NULL and `pos_shifts_one_open_per_user` forbids a second open shift per user, so every generated shift is `closed` (opened 08:30, closed 20:30 Lima) and never collides with `pos.shift.open`.
- **D5 Counts.** Weekday 1–4 bookings, Saturday 1–3 (≈190 over 77 trading days); tickets 0–3/day (≈115); invoices every ~2 days (≈40). Within the owner's ranges without tuning knobs.
- **D6 Lima time.** Hours are chosen in local time and stored as `-05:00` offsets, matching the `America/Lima` resources already seeded.

## Files
```
scripts/qa/seed/activity.ts            (new)
scripts/qa/seed/index.ts               (+1 MODULES entry)
scripts/qa/seed/matrix.ts              (+'activity' domain, +3 ids)
scripts/qa/seed/README.md              (+1 table row)
scripts/qa/seed/seed.contract.test.ts  (+1 it)
```
