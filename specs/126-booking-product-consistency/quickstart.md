# Quickstart validation: Consistent booking product projections

## Preconditions

Owner approval is pending. These instructions are for a future isolated Hub candidate. Read Hub AGENTS.md and docs/qa-stack.md; verify the candidate HEAD and registry master and Bun. Use synthetic data and guarded loopback QA only, never a production-backed `bun run dev`. Inspect `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack.

## Focused test command

This is the single focused command for the feature. It lists every ordinary Vitest file in [implementation-inventory.md](implementation-inventory.md); files marked Create exist only after their task runs. Run it from the Hub checkout:

```bash
bunx vitest run \
  'src/server/services/pos-accounts-booking-links.test.ts' \
  'src/server/services/scheduling-bookings-products.test.ts' \
  'src/server/services/scheduling-bookings-visit.test.ts' \
  'src/server/services/scheduling-bookings-money.test.ts' \
  'src/server/services/calendar-window.service.test.ts' \
  'src/server/services/stock-accruals.service.test.ts' \
  'src/server/auth/scheduling-read.test.ts' \
  'src/lib/components/scheduling/booking-product-facets.test.ts' \
  'src/lib/components/scheduling/visit.test.ts' \
  'src/lib/components/scheduling/calendar-window.test.ts' \
  'src/lib/components/scheduling/calendar-context-menu.test.ts' \
  'src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts' \
  'src/lib/components/scheduling/consumption-lines.test.ts' \
  'src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts' \
  'src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts' \
  'src/routes/(app)/pos/appointments/page.products.mounted.test.ts' \
  'src/routes/(app)/scheduling/calendar/page.products.mounted.test.ts' \
  'src/routes/api/scheduling/bookings/_handlers.test.ts' \
  'src/routes/api/scheduling/bookings/[id]/server.test.ts' \
  'src/routes/api/scheduling/bookings/[id]/complete/server.test.ts' \
  'src/routes/api/scheduling/calendar/server.test.ts' \
  'src/routes/api/pos/appointments/server.test.ts' \
  'src/routes/api/pos/appointments/[id]/server.test.ts' \
  'src/routes/api/pos/appointments/[id]/complete/server.test.ts'
```

A US1-only candidate drops the US2-only file `src/routes/api/pos/appointments/[id]/complete/server.test.ts` if it has not been created yet. The native case extended in `stock-corrections.sql.integration.test.ts` does not run here: ordinary Vitest excludes `*.sql.integration.test.ts`, so it runs only through the full qa-native lane and report in [F3 native-qualification.md](../124-stock-correction-workflow/contracts/native-qualification.md).

A passing baseline test is not a reproduced fix: first capture a failing assertion or counterexample for the missing behavior, then run it on the candidate.

## Scenario and oracle

Use synthetic visits for ticket-only Faja M, planned-only Faja L, planned and sold, and neither. Include a grouped visit with the same sale on two members, two identical descriptions with different line IDs, a zero-total product (gift, with finance admitted and denied), a `void` ticket and a `voided` ticket on the same visit, and an unrelated second sale product. Place sale D1 outside the calendar window of appointment D2. Inspect the POS hover and the drawer together; the scheduling calendar hover shows no sold rows (spec decision 2). Simulate failed stock realization, reopen and reload, recover fixture stock, retry twice and concurrently; assert one linked stock entry and no stock-posted claim before evidence. Compare restricted dataset, owner and masked personas and network payloads.

For each allowed journey also run direct API and navigation attempts for denied, owner and foreign controls. Capture status, actual loader outcome and redacted payload assertions. A 200 document shell alone does not prove route authorization or a successful data load. For mutation scenarios compare before and after authoritative records and retry outcomes; do not rely on a success toast.

## Browser acceptance

Read and use browser-harness. Use a unique named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390 px, Spanish and English, light and dark, keyboard-only operation and fresh reload. Observe accessible labels and focus, empty, error and denied states, row and link behavior and persisted preference scope. A login, MFA or account ambiguity stops actions until the account is confirmed; keep private session access details outside committed docs.

## Full qualification and result recording

Run Hub `bun run check`, `bun run test` and `bun run build`. For UI edits run `bun run lint:design && bun run lint:tokens`; for message edits run `bun run i18n:compile`. Route and RBAC manifest checks are part of the candidate's current scripts; read package.json rather than inventing a command. Record commands, exit codes, candidate hash, fixture matrix, screenshots and unresolved gates in `validation.md` beside this feature. Do not mark implementation done until its scoped outcomes pass. Production release and affected-account checks are separate owner-gated evidence.

## Recovery and relation acceptance

Run every decision-table row in contracts/behavior.md. One ticket contains direct, same-authorized-group, null-unassigned and outside-visit product lines; hover and detail keep only the first three and never request the outside booking. A deleted or outside link is omitted by ID comparison, not resolved as an unassigned row. The reported-style null Faja M remains visible.

Use a completed group with draft/open, submitted/open, realized, released and no-evidence members. Assert that only the first two plus confirmed no-source/open members are targets. Saved-source requests are `{}`; open-row confirmation uses `completionLinesFor` without current defaults; confirmed zero sends `[]`, while denied, failed or empty reads never do. Record request paths and bodies: one sequential individual `/complete` per admitted member through the POS or scheduling `apiBase`, zero group PATCH and zero repeated status-log entries. Inject a stock warning, a non-2xx response and response loss; preserve committed partial results, stop on error or unknown and re-read before another attempt. Reload and reopen must not target already resolved members. Repeated and concurrent execution must keep one source-owned submitted issue; if the existing engine fails this proof, release waits for F3's shared retry fix.

Confirm that both host UIs always include `recovery` for `confirm_open` and refuse to POST without freshness metadata, and that a stale confirmation receives HTTP 409 before any effect ([admission-recovery.md](contracts/admission-recovery.md)). Keep a separate legacy no-recovery compatibility case: its existing behavior is retained and is not proof of fingerprint protection for old clients.

Run the billing-versus-unqualified-stock-cost JSON and formatter matrices in [wire.md](contracts/wire.md) on detail, the POS hover and both calendar hosts.
