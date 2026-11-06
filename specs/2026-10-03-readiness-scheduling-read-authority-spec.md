---
id: 2026-10-03-readiness-scheduling-read-authority-spec
title: Scheduling read authority and POS slot compatibility
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, data, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Scheduling read authority

## 0. Product

Scheduling reads must enforce the same view authority as their pages, while existing POS booking forms retain their authorized slot-discovery path. Team read failures must be visible and retryable.

## Out of scope

Changing scheduling write permissions, public booking policy, schema or production data is outside this slice. Calendar timezone work is separately owned.

## AS-IS

MR-OP-001: authenticated members can read bookings, event/resource configuration,
links and HR records with module-enabled checks but without scheduling:view.
Calendar already checks the capability. The shared AppointmentForm uses the
scheduling slots endpoint even when its booking endpoint belongs to POS, so a
blanket read guard would break POS-only booking users. POS already has its own
appointments collection/detail routes with POS capabilities.

## TO-BE

Every non-public scheduling GET requires scheduling:view before domain reads.
The only exceptions are the exact public slug slots handler and the exact
reminders tick handler, which retains its authenticated scheduler contract.
HEAD inherits the same GET handler guard. Public booking remains unchanged.
The POS-only collection caller POST /api/pos/appointments uses a dedicated POS
slots route, with pos:view plus either
pos:create or pos:edit, and both POS and scheduling modules enabled. Domain slot
computation is shared so bounds, grouped visit length and response shape agree.
No scheduling permission is implicitly granted to POS users.

## DELTA

Add explicit view checks to each scheduling GET (including HR GETs), retaining
all existing module, PII and org guards. Remove the resolved detail TODO. Extract
the internal slot response parser/calculator for the scheduling and POS wrappers.
AppointmentForm selects the slot endpoint from its existing booking endpoint.
An inventory test parses exported handlers with the TypeScript AST; every
scheduling GET must have an explicit policy, with exact exceptions. Behavioral
tests invoke all protected handlers with a real capability resolver and a
restricted member; no domain DB/function may run. Authorized list/detail/calendar
and POS-only slots exercise real handler dispatch with external boundaries mocked.
Public slug slots and scheduler secret behavior retain positive/negative tests.
HR guards go in each GET, never the shared hrCtx used by writes.
Tests prove the POST/PATCH/DELETE handlers were not accidentally broadened or
restricted by a shared read guard. Run focused regressions, full Hub check and UI
governance checks for the shared form change.

## Blast radius

POS detail already uses /api/pos/appointments/[id]; its policy stays intact.
Only slot lookup requires a new POS route. Team timeline/HR consume scheduling
business data and therefore require scheduling:view; their page/navigation gates
and error behavior must be reviewed so denied data does not appear as empty.
No real provider calls or production writes are required.


## Pass-2 corrections and route consumers

The exact ticket caller `/api/pos/tickets/[id]/schedule` still requires
`scheduling:edit` at its write handler. Selecting POS slots for its form does not
remove that requirement or prove POS-only ticket scheduling. Test both endpoint
shapes and the actual POS-only collection shape. The new POS wrapper resolves
`requireOrgCapability(pos,view)`, then uses that same resolved capability snapshot for create OR edit
before any domain read; platform-admin behavior remains the canonical resolver's.
Test view+create, view+edit, view-only, create/edit-without-view, no permissions,
anonymous and either module disabled.

| Scheduling GET family | Existing consumer and access boundary |
|---|---|
| bookings collection | Team timeline (`/team` already requires scheduling:view); Bookings SSR |
| booking detail | Scheduling drawer; POS drawer already uses its separate guarded POS detail route |
| calendar | Scheduling calendar page, already scheduling:view; POS window has its own route |
| slots | BookingCreateForm and AppointmentForm; POS AppointmentForm gets new POS slots wrapper |
| event-kinds, event-types collection/detail | Scheduling settings/editor SSR, scheduling:view page boundary |
| resources and resource availability | Team resource/availability editor seeded by SSR, /team scheduling:view |
| links | Scheduling links SSR, scheduling:view page boundary |
| reminder config | Scheduling reminders SSR, scheduling:view page boundary |
| HR employees/holidays/types/allocations/settings | Team SSR, /team scheduling:view |
| HR leave-requests | Team SSR and TimeOffView balance fetch, /team scheduling:view |

Mid-session revocation remains possible even behind matching page gates. The
three direct read-fetch families must show unavailable/permission errors rather
than empty business data: slot loaders (both forms), Team timeline expansion,
and TimeOffView balance. Preserve prior successful results only when visibly
stale, keep retry available, and prevent older responses overwriting current
selections. These UI corrections are required for final MR-OP-001 acceptance;
the related Team findings are also tracked separately to preserve evidence.

The AST inventory recognizes exported variable/function declarations, exported
aliases and named re-exports; wildcard exports fail classification rather than
silently escaping the inventory. Pin exact route identities for the two allowed
GET exceptions. Exercise unset, wrong and exact CRON_SECRET; an authenticated
ordinary member is not scheduler authorization. Explicit HEAD exports must be
classified too; SvelteKit's absent-HEAD fallback runs the same guarded GET.
Internal slot parsing rejects invalid/reversed windows and caps to 62 days, on
both wrappers, retaining grouped service-count limits and response shape.


## Verification

Run the behavior and failure-path checks in DELTA against actual handlers or runtime boundaries. Record focused test receipts and independent review in the readiness ledger. Full typecheck, native runtime acceptance, hosted CI, merge and deployment remain separate qualification gates.
