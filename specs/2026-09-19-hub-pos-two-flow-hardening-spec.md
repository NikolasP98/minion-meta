---
id: 2026-09-19-hub-pos-two-flow-hardening-spec
title: Configurable POS flows with consistent billing and scheduling
stage: test
status: review
pass: 2
verdict: approved
created: 2026-09-19
updated: 2026-09-19
repos: [minion_hub]
proposal: 2026-09-19-hub-pos-two-flow-hardening
type: fix
tags: [logic, test]
---

# Configurable POS flows with consistent billing and scheduling

## 0. Product

Support selling then scheduling, or scheduling then charging, without duplicate
charges, lost customer identity, or stranded paid services. The user authorized
hardening on September 19 and requested a highly configurable Hub. Configuration
belongs to the organization; consistency and tenant isolation are mandatory.

## 1. AS-IS

The linked proposal records seeded-browser/API reproductions at Hub `0acd6282`:
ordinary appointments can be charged twice; creation omits party identity;
void tickets render paid; cancelled appointments strand their paid lines; booking
handoff sometimes duplicates the sell page; pending badges are not refreshed.
`bookAndLinkTicketLine` also does not validate sold-product correspondence.
Existing POS settings configure payment methods, identity requirements, currency,
and price overrides. Both workflows already exist and remain the defaults.

## 2. TO-BE and invariants

- Ordinary booking billing is an atomic, tenant-scoped claim. Duplicate live
  charges fail before money commits. Voiding preserves history and permits a
  later replacement charge. Package redemptions and instalments retain their
  separate claim rules.
- Booking/customer/product identities agree across server and UI. Caller input
  cannot substitute another organization's or another customer's record.
- Cancellation preserves the paid obligation and allows a replacement appointment
  through the same atomic scheduling endpoint, without charging again.
- Ticket status `void` is canonical, with legacy `voided` read compatibility where
  needed. Payment actions consider live coverage, not existence of history.
- Checkout handoff does not perform irreversible reads or mutations during render;
  its customer/document state is recovered from authoritative data.
- Organization workflow settings may choose scheduling prompts and booking-payment
  timing. Defaults preserve prompt-after-sale and payment-before-or-after-attendance.
  No setting disables duplicate-charge protection or tenant isolation.

## 3. DELTA and slices

1. Billing: serialize ordinary booking claims by sorted booking-row locks within
   the money transaction; validate booking existence, customer, product, and live
   coverage. Reject duplicate booking IDs in one request. Coordinate lock ordering
   with ticket scheduling and booking status changes. Verify serial and concurrent
   duplicate submissions, foreign booking, mismatched product/customer, and void
   then replacement. Request-retry handling must not create a second charge.
2. Scheduling: validate/persist party identity on creation. Lock ticket before
   scheduling and reject sold-service/customer mismatches. Recover lines attached
   to cancelled/rejected bookings atomically while retaining booking history;
   reflect the same predicate in Accounts and calendar pending queries. Verify
   cancellation/rebooking and two concurrent replacement requests.
3. Frontend: use authoritative booking handoff and safe component lifecycle;
   correct void/live-payment rendering and calendar charge affordances; refresh
   pending counts and expose actionable pending scheduling from Accounts. Verify
   both workflows with reload/back navigation and account identity requirements.
4. Configuration: extend the existing organization-scoped settings contract with
   typed, validated workflow settings and a settings UI. Preserve existing defaults
   and normalize older settings. Enforce business-rule settings at the server and
   mirror them in the UI. Exact option names follow the review and user steering;
   avoid adding speculative unrelated settings.

## 4. Verification

Review clarifications: scheduling locks existing ticket, then line, then prior
booking; billing locks sorted bookings before inserting a new ticket. A pending
line is unlinked or linked to an org-scoped cancelled/rejected booking (not
no-show, completed, or missing). Preserve old booking history and audit the line
replacement. Validate UID replays before attaching them. Different-customer
nonempty carts require an explicit keep/start-booking choice. Ordinary charge
actions require pending/accepted/completed and no live ticket, grant, or plan.

Run focused failing behavior tests before each implementation slice, then the
relevant POS/scheduling suites, typecheck and design/token gates. Exercise the
current checkout against the seeded container backend at loopback 5199, including
real concurrent API submissions and persisted-record checks. Use isolated QA
records and restore any test-changed organization settings. Review standards and
spec conformance independently before handoff. Record exact evidence and limits.

## 5. Scope and lifecycle

**Out of scope:** gateway changes without an identified dependency, production data
repair, schema backfills, release/deployment, unrelated Hub configurability, and
changing the legal invoice/emission model. Changes to shared checkout are scoped;
the shared checkout must not be switched, reset, or blanket-staged.
The user subsequently authorized the remaining qualification, publication, and
deployment. Publication uses a clean release clone and scoped commits. The
required GitHub approval and production verification gates remain mandatory.
Two independent review passes precede implementation; their evidence is recorded
in the review sidecar. The root agent coordinates billing/configuration and reviews
the independently assigned scheduling and frontend slices.

## 6. Local implementation and verification

Implemented in the Hub working tree, not committed or released. Gateway files
were not changed. The additive workflow-policy migration was applied only to the
seeded QA database; its seed companion restores both QA organizations to defaults.

Organization policy is `workflow.postSaleScheduling` (`prompt` or `defer`) and
`workflow.appointmentPayment` (`any_time` or `after_completion`). The defaults are
`prompt` and `any_time`. The settings API validates writes, reads normalize older
rows, and the money transaction enforces payment timing. Anonymous pending lines
have an Accounts view filtered before pagination. Concurrent voids now lock the
ticket before reversing payments, following an independent review finding.

Verification on September 19 (Lima): 307 tests in 27 focused suites pass. Real
seeded-browser flows and authenticated concurrency probes pass; details, record
IDs, and screenshots are in the proposal's hardening verification section.
Token integrity has zero violations; design lint with `--base-ref=0acd6282 --ci`
passes its changed-file debt gate. Full host svelte-check reports one existing
error in `job-effects.sql.integration.test.ts:521`, also present at the base SHA;
no changed-file diagnostics. Container typecheck exceeded its 3 GB memory limit;
the same QA container was restarted without resetting data.

The follow-up qualification closed the identified matrix: separate seeded
identity-required org with document-positive/negative customers; staff payment
and denied management actions; viewer denied reads/writes; existing-cart
keep/replace, reload, and back navigation; real package/instalment races. The
proposal records the exact coverage and commands. F5 did not recur in stable-file
runs, but its original root cause remains unproven. Full typecheck now passes
after preserving the integration test's environment cleanup with
`Reflect.deleteProperty`. Release status stays test/review until approval,
deployment, migration receipt, and production smoke verification are complete.
