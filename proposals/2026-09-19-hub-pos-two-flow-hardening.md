---
id: 2026-09-19-hub-pos-two-flow-hardening
title: Harden invoice-first and appointment-first POS flows
status: in-spec
spawned_spec: 2026-09-19-hub-pos-two-flow-hardening-spec
created: 2026-09-19
updated: 2026-09-19
repos: [minion_hub, minion]
tags: [logic, test]
effort: M
---

# Harden invoice-first and appointment-first POS flows

The user authorized implementation on September 19 and requested organization
configurability. The original reconnaissance below remains historical evidence;
implementation is governed by the linked hardening spec.

## Original reconnaissance scope and evidence

Requested outcome: `/pos/sell` invoices products/services, then schedules invoiced
services; deferred scheduling remains actionable from `/pos/accounts`. The other
flow books first, then charges the customer. The initial reconnaissance below
preceded implementation authorization. Its observations are historical; the
hardening verification section records the subsequently authorized changes.

Hub review began at `c0fd3a07` on `feat/pos-calendar-split-checkup`, including the
uncommitted split-calendar/checkup changes. Another actor advanced the shared
checkout to `master` at `0acd6282` during testing (#337–#339); this agent did not
switch branches. Rechecked finding sites at that revision. Gateway review covered
the recent CI commits at `db83e075556` and the working-tree changes in flows,
plugin UI bridge, brain-vector, message ledger, and shells. No gateway implementation
was identified as owning POS ticket/booking persistence; no gateway runtime claim
is made.

Runtime: existing `hub-qa-hub-1` mounts this Hub checkout at `/app`; browser origin
`http://127.0.0.1:5199`, seeded owner, real local GoTrue and PostgreSQL container
`supabase_db_minion-hub-qa`. No production records were used. Screenshots are local
ephemeral evidence under `/tmp/pos-recon-0919/`.

## AS-IS

### Verified paths

- Invoice first: selected QA Plain Service and QA DNI Verified, paid S/80 cash,
  received `POS-2026-00008` (`839ef844-bcfa-4f4d-884f-df22efc00d69`), and reached
  the schedule step. Schedule later left one pending line on that client's
  Accounts row. Resuming the schedule URL created booking
  `48e34c99-252d-4941-b624-35fc4c43c900` for September 21, 09:00 Lima, linked to
  the sold line. The step displayed Scheduled. Screenshots 01–04.
- Appointment first: created booking `d24c3b6e-0386-440d-a4e2-978341e1d3d1`
  for September 22, 09:30 Lima, with the same selected service/customer.
  Opened its drawer and clicked Take payment in POS. After a reload recovery
  described in F5, paid S/80 cash and persisted `POS-2026-00009`
  (`2188f39a-9acc-416a-8f79-828d013abe5a`). Its line references that booking;
  checkout did not request another appointment. Screenshots 05–08.

### Findings

1. **F1, high: duplicate booking charges are accepted.** Reposting an ordinary
   S/80 service line with the already-paid second booking ID returned HTTP 201,
   `POS-2026-00010` (`a596e3f0-851e-4dce-ac61-d8feae2af53a`). This ticket was then
   voided through the local API, HTTP 200. `submitTicket` copies `bookingId`
   into lines without validating/claiming the booking. PostgreSQL has no booking
   uniqueness/FK on these lines and no billing validation trigger. Package
   redemption claims protect a different path. The calendar's completed-booking
   Charge action also lacks a paid-state check.
2. **F2, high: booking creation loses customer identity.** Both browser-created
   bookings have null `party_id`, while their selected customer is party
   `3801db3f-7165-57af-963d-c93b4b02dcca`. `bookOccurrenceInTx` resolves a CRM
   contact but omits `partyId` from its insert. Appointment-first handoff therefore
   renders QA DNI Verified as Ticket only / No document. The resulting ticket
   `POS-2026-00009` has null `party_id` and null `crm_contact_id`.
3. **F3, high: void is displayed as paid and obstructs repayment.** The void API
   persisted `status: 'void'` for ticket 00010; the appointment drawer displays it
   as Paid S/80 alongside ticket 00009 (screenshot 09). Its template compares
   against `voided` and hides Take payment whenever any historical ticket exists.
   Rendering is runtime-confirmed; the all-void repayment case is source-confirmed.
4. **F4, high: cancellation strands an invoiced service.** Cancelled the first
   test booking through PATCH, HTTP 200. Its ticket line remains linked, so the
   pending queries exclude it. Reposting that line to its scheduling endpoint
   returned HTTP 409 `line_already_scheduled`. The customer still has a valid
   paid ticket, but the normal pending/reschedule path cannot recover it.
5. **F5, high: client-side booking handoff produced a broken sell page.** After
   Take payment in POS, the page contained two Sell headings and two rendered
   carts; the populated cart's Charge button did not navigate. A full reload
   restored one interactive page and preserved its cart. Screenshot 07 captures
   the broken state despite its historical filename `07-book-first-paid.png`;
   no payment had occurred at that screenshot. Root cause is unproven, and shared
   checkout changes/HMR are a possible confounder. Reproduce on a fixed revision
   before assigning this to production or choosing an implementation.
6. **F6, medium: sold-service correspondence is not enforced server-side.**
   `bookAndLinkTicketLine` reads line kind and booking ID, but not the sold
   product; it accepts the caller's event type and customer for booking creation.
   The form preselects the matching event type but allows changing it. Source
   finding; a mismatched-service mutation was not executed.
7. **F7, low: pending badge stays stale after inline scheduling.** The first
   test changed the schedule step to Scheduled but left the badge at 4. Navigating
   to the appointment form refreshed it to 3. `ScheduleStep.onbooked` reloads
   its ticket without invalidating the layout count.

Existing UX debt: clicking the account row opens a drawer with no pending-service
action. The list badge has a resume link in source; the browser run opened the
drawer and later resumed using the schedule URL directly, so list-badge navigation
is not claimed as tested. Reuse
`2026-09-16-hub-pos-accounts-drawer-pending-scheduling.md` for that known issue.
The remaining three seeded anonymous pending lines appear in the calendar tray,
while Accounts excludes anonymous tickets. Define how deferred walk-in services
get an actionable Accounts home; existing broader requirements are in
`2026-09-13-pos-packages-plans-s1-followups.md`.

The QA browser repeatedly showed Couldn't load the gateway token; the local token
endpoint logged 404. POS persistence continued to work. This is a QA integration
limitation, not evidence that the live gateway is broken.

## TO-BE

- Both paths preserve the canonical customer and sold service through ticket,
  booking, account, cancellation, and payment history.
- One ordinary booking cannot acquire a second live full charge through replay,
  stale tabs, concurrent cashiers, or the calendar action.
- Deferred or cancelled paid services remain discoverable and recoverable without
  another charge. Voids are visibly distinct and allow an authorized replacement
  charge while retaining history.
- Checkout navigation renders one working page; refresh is not part of the normal
  flow. Scheduling updates all relevant pending indicators.

## DELTA and acceptance

1. Define the ordinary-booking charge invariant and enforce it atomically with
   org, customer, product, status, and existing-payment checks. Prove two concurrent
   submissions produce one live charge, and replay is recoverable after a lost
   response. Preserve the separate package and instalment semantics.
2. Validate and persist booking party identity. Derive checkout identity from the
   authoritative booking/customer, including document details. Test both flows in
   the identity-required seeded org and test a foreign-org customer ID.
3. Use the persisted void enum and distinguish historical tickets from live paid
   coverage. Test only-void, live-plus-void, and replacement-charge histories.
4. Specify cancellation and rescheduling transitions for paid lines, keeping audit
   history and preventing simultaneous replacement bookings. Prove Accounts shows
   the recoverable obligation and rebooking clears it once.
5. Reproduce F5 against one pinned checkout with console/network capture and without
   concurrent HMR. Test appointment-to-checkout navigation with empty and existing
   carts, reload, and back navigation. Do not infer the root cause from the screenshot.
6. Reject incompatible event types/customer substitutions at the atomic schedule
   boundary; test the allowed matching case and the rejected mismatches.
7. Invalidate the layout's pending count after successful scheduling; test the
   step, Accounts row, and nav badge without a full reload.

## Original reconnaissance verification and limits

Passed: 85 tests across five files using:

```sh
bun run vitest run src/server/services/pos.tickets.test.ts src/server/services/pos-accounts.logic.test.ts src/lib/components/pos/schedule-lines.test.ts 'src/routes/api/pos/tickets/[id]/schedule/server.test.ts' 'src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts'
```

These focused tests do not prove the missing lifecycle invariants. Browser steps
plus authenticated local API probes and read-only SQL establish the runtime
findings above. Product stock races, service quantity greater than one, bundles,
package expiry, instalment concurrency, cross-role and cross-tenant adversarial
coverage, SUNAT emission, and gateway connectivity remain outside this executed
matrix; no end-to-end certification is claimed.

Standards review: `git diff --check` passed in both edited repositories;
`node scripts/proposal-index.mjs --check` passed; token integrity reported zero
violations. Design lint exited zero but reported existing global debt and skipped
its per-file ratchet because `origin/dev` is unavailable. Therefore that gate is
partial, not a clean design certification. The only Hub edits are comments.

Spec review: invoice-first payment-to-scheduling works for the tested single
service; appointment-first payment works after reload but fails identity
preservation. The cancellation and duplicate-billing invariants fail at runtime.

At that checkpoint only handoff comments, this proposal, and its generated index
were outputs. Test-created records remain in the disposable QA database. The
subsequent implementation below changes their recovery state.

## Hardening verification

Implemented locally after the user's explicit authorization, following the
two-pass spec review. No branch switch, commit, merge, production migration, or
deployment. Gateway reconnaissance found no required POS persistence change;
gateway WIP was preserved.

The new organization settings choose immediate scheduling prompts or deferral to
Accounts, and payment at any time or only after appointment completion. Settings
cannot disable customer/tenant validation or duplicate-charge prevention.

Seeded backend/browser results on September 19 (Lima):

| Check | Result and evidence |
| --- | --- |
| Duplicate ordinary charge | Two simultaneous posts for booking `ea8c878b-21cd-4ccb-8064-03a35b9ec128` returned 201 and 409 `booking_already_billed`; ticket 00011 was the sole charge. |
| Concurrent void and replacement | Two voids of 00011 returned 200 and 409 `already_void`. A replacement charge returned 201, ticket 00014. SQL confirms exactly one live ticket, with the void retained. |
| Cancelled paid appointment recovery | Browser rescheduled ticket 00008, without another charge, to booking `feeb5568-ea1b-47eb-aec0-87f3cf4fbaa7`. Pending badge changed 4 to 3 without reload; screenshot 23. |
| Concurrent replacement scheduling | Cancelled that replacement, then submitted twice. Both returned booking `bc2c21aa-4a3d-405a-8acc-c1a71e013e8f`, once `created:true`, once `false`. Old bookings remain history. |
| Appointment first, then charge | Created booking `7c94063c-fb08-4e7c-a148-b3421fc5b5ce` through the UI; drawer handoff rendered one interactive Sell page with DNI 10000001. UI payment created 00012 with party and CRM IDs preserved; screenshots 24-34. No extra scheduling prompt. |
| Deferred invoice-first flow | With `defer`, UI service sale 00013 returned to an empty cart. Accounts -> Unassigned services listed it and its link reopened scheduling; screenshots 35-40. Two schedule posts returned one booking, `9ba32807-2f83-4f51-8f95-63099a496aef`. |
| Void history UI | Drawer distinguishes voided 00010 from paid 00009; screenshot 12. |
| Policy validation/enforcement | Unsupported policy returned 400; `after_completion` rejected an accepted booking with 409 `booking_payment_timing`. Settings persisted and rendered in the UI; screenshot 41. Original `prompt`/`any_time` values restored and confirmed in SQL. |
| Anonymous pending discovery | Accounts displays the three original anonymous seeded services with scheduling links; screenshot 19. Query filters before paging. |

All screenshots are under `/tmp/pos-recon-0919/` and are ephemeral, not committed.
Blank intermediate captures during recompilation are not successful UI evidence.
The QA container exhausted its 3 GB memory limit during full typecheck; a failed
Paraglide module response also interrupted CSR bootstrap. Restarted the same
container and retested with source files stable. No data reset or resource-limit
change was made. Gateway-token 404 and missing shadow emitter remain seeded-stack
limitations, not production findings.

307 tests in 27 focused suites pass, covering `pos*.test.ts`,
`scheduling-bookings*.test.ts`, workflow policy, booking-checkout, schedule-lines,
checkout-money, and Sell/Accounts server-load tests. Token integrity: zero
violations. Design lint `--base-ref=0acd6282 --ci`: pass, no changed-file debt
increase; existing global debt remains. Full host svelte-check: one pre-existing
error at `src/server/services/job-effects.sql.integration.test.ts:521` (delete of
a required property), verified in base `0acd6282`; no changed-file diagnostics.

Remaining qualification is explicit: no identity-required-org/non-owner browser
matrix, no complete existing-cart conflict/back/reload browser matrix, and no
broader package/instalment concurrency certification. These have a test-site
handoff pointer in `src/lib/components/pos/booking-checkout.test.ts`. F5 did not
recur after hardening with stable files, but the original root cause remains
unproven. Existing older API callers still need to supply the required customer
identity before canonical booking inference; the new frontend does so. Existing
broader POS follow-up proposals remain open. Local acceptance is not release
approval, and the spec remains test/review.

## Follow-up qualification and release preparation

The user authorized the remaining items and deployment, including seeded
staff/viewer logins. The original qualification limits above are historical.

- `bun scripts/qa/seed-identity.ts` adds only deterministic identity-org fixtures;
  two applications preserved row counts. Ten matrix cases cover owner access,
  verified and missing-document customers, catalog and scheduling. Two seed unit
  tests pass; the complete seed contract remains a CI qualification lane, not a
  claim based on its locally skipped tests.
- Identity-org browser sale-first created ticket `2a0c90ee-a6de-4fe1-a396-a07941a72975`
  and scheduled booking `a853f73e-59df-4f1f-8bdb-ebb3aca3aea0`. Appointment-first
  used an API-created booking `40ce0b67-a6e0-4e58-b654-4ddebef59963`, then browser
  checkout/payment. Both tickets preserve verified party
  `d1a487fc-a92a-58f2-8fec-07dac32dfc36`; the documentless API attempt returned
  400 `identity_document_required`. The empty-document checkout was disabled.
  Screenshots 51-65 distinguish browser steps from API fixture setup.
- Staff completed browser appointment payment as ticket 00029; policy changes
  and void attempts returned 403. Viewer POS navigation displayed 403, and ticket,
  settings, and booking mutation probes all returned 403. A mixed-session probe
  was discarded and rerun sequentially before recording these results. Owner
  session and business org were restored afterward.
- Existing anonymous cart handoff required an explicit choice. Keep retained its
  cart and removed the booking query; Start replaced it with the booking/customer.
  Reload retained one Sell heading and one quantity-one appointment line with
  its document; back navigation was exercised. Screenshots 42-49.
- `bun --no-env-file scripts/qa/pos-concurrency.ts` independently passed run
  `pos-concurrency-8c329daf-3f63-4bad-88ce-63f0fea33ec4`: last-session draw 201/409;
  same-redemption billing 201/409; double void 200/409; restored session redraw;
  concurrent partial instalments, void/replacement, and overlapping submit/void
  retained SQL paid-to-date of S/80. Synthetic tickets were voided and entitlements
  deactivated; original seed obligations were preserved. Existing plan semantics
  permit overpayment; this change does not introduce an overpayment rejection.
- Full host svelte-check now reports zero errors/warnings. The test cleanup uses
  `Reflect.deleteProperty`, preserving removal rather than assigning undefined.
- The first full suite exposed a missing expected `workflow` schema column;
  its corrected four-test schema contract passes. A higher-parallelism full run
  then reported 4,327 passes and one unrelated ACI 5-second timeout. A clean-clone
  qualification with CI-style retries and lower concurrency is running; no clean
  full-suite result is claimed until it finishes.

Release preparation is isolated at
`/home/nikolas/.cache/minion-release/pos-hardening-Mvn33h/hub`, branch
`fix/pos-two-flow-hardening`, based on `0acd6282`. The canonical registry and live
GitHub repository both identify `master` as PR/release target, despite stale
Hub CLAUDE branch prose. Live branch protection requires one approving review.
The release must not bypass that gate. Production Vercel builds run the migration
runner before app build; deployment is not complete until its revision, migration
ledger receipt, and smoke result are verified. No production data writes yet.
