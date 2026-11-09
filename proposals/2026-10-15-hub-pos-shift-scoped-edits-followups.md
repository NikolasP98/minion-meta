---
id: 2026-10-15-hub-pos-shift-scoped-edits-followups
title: POS shift-scoped edits — open ends left by S1–S3 (hub #534, #535, #536)
status: draft
created: 2026-10-15
updated: 2026-10-15
repos: [minion_hub]
tags: [logic, data, ui]
value: 5
effort: S
source: 2026-10-15-hub-pos-shift-scoped-edits-and-emission-on-close-spec
---

# POS shift-scoped edits — open ends left by S1–S3

Ledger for what the three implementation slices of
`specs/2026-10-15-hub-pos-shift-scoped-edits-and-emission-on-close-spec.md` deliberately
left out or shipped with a known limit. Each item names the site so the maintenance
pipeline can pick it up without re-reading the PRs.

## Shipped with a known limit

1. **Unlocking a period leaves no audit row** (hub #536, `pos.service.ts` `setPeriodLock`).
   A lock row records who/when/note; an unlock deletes it, so the only trace is the
   server log. `doc_audit_log.ref_id` is a uuid and a period is not. Fix: a synthetic
   ref (`refType: 'pos_period'`, `refId` = a stable per-org uuid) or a small
   `pos_period_lock_events` table. Small.
2. **Till popover has no inline tender select** (hub #534, `pos/sell/+page.svelte`).
   The spec's T1 asked for "Cambiar inline select" in the recent-sales popover; the slice
   shows the tender chip and opens the ticket page (the popover's existing modal target)
   where the one edit dialog lives. Decide whether a second edit surface is worth its
   own code path; if yes, reuse the ticket page's dialog as a component.
3. **Calendar drawer "Pago" block untouched** (hub #534). The spec said it "now shows the
   method and links to the ticket page"; the hover card already lists methods and the chip
   already links, so nothing changed. Confirm with the owner that the hover card counts.
4. **Customer / document and note edits on an open shift** (spec T1 b/c) are not
   implemented — only the tender change is. Same guard chain (`assertTicketMutable`,
   `fiscal: true` for customer/document), one more PATCH field each.
5. **Serialized beta gate has no timing test** (hub #535, `pos-emission.service.ts`
   `betaRateLimit`). Four-line promise chain, verified by reading. A fake-timers test
   that fires three emissions and asserts ≥3 s spacing would close it.
6. **Shift-row lock icon keys on `openedAt`** (hub #536, `/pos/history`). A shift that
   straddles midnight on the last day of a locked month shows the lock from its opening
   month; the mutators themselves read each ticket's own `submittedAt`, so the refusal is
   always right — only the icon can be a day optimistic.
7. **Payment-policy revision hash changed once** when `documentDefault` left the
   projection (hub #535, `credit-method-policy.ts`). Any sale previewed before the deploy
   and charged after it gets `pos_settings_changed` (409) once and re-previews. Expected,
   not a bug; recorded so nobody chases it.

## Not started (spec S4)

8. **Nota de crédito / comunicación de baja** for an accepted emission. The ticket page
   says "Emitido a SUNAT: requiere nota de crédito" and refuses; the document itself is
   the SUNAT-prod cutover's work.

## Verification still owed on FACES prod

- S1: one real mis-tendered ticket corrected in an open shift (in place) and one in a
  closed shift (pair visible under today's shift on `/pos/history`), audit row present,
  closed shift's snapshot unchanged. Read-only probe done 2026-10-15 (PATCH route live,
  same-method refused 409 before any write); the real corrections are the owner's call.
- S2: first shift close after deploy → one `pos_emissions` row per live ticket, counts on
  the history row.
- S3: lock a past month, confirm 423 on a tender change and a void, unlock.
