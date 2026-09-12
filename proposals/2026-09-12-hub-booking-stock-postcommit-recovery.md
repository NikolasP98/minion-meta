---
id: 2026-09-12-hub-booking-stock-postcommit-recovery
title: Durable booking stock effects after commit
status: draft
created: 2026-09-12
updated: 2026-09-12
repos: [minion-hub]
---

# Booking stock effects after commit

Status: open; separate from the combined PATCH rollback repair.

Booking updates and validation now share one transaction in deployed Hub PR269 (f97efb2d), retained by UI PR270 (77445c01). Stock accrual release and realization still execute after that transaction. A process failure after booking commit can leave the stock operation unapplied. A successful PATCH rollback test does not establish durable stock delivery.

Sites: `minion_hub/src/server/services/scheduling-bookings.service.ts` (`createBooking`, `setBookingStatus`, `patchBooking`) and `minion_hub/src/routes/api/scheduling/bookings/[id]/+server.ts` (completion realization). Keep the exact `TODO(handoff)` comments linked here.

Next bounded implementation: admit a durable stock intent in the same transaction as the booking transition, consume it through the existing fenced jobs/effect foundation, and preserve existing stock idempotency keys. Decide how product/accrual edits supersede pending intents before implementation. Do not migrate or replay customer stock history as a test.

Acceptance: a disposable real PostgreSQL test must prove process restart between booking commit and dispatch recovers the intent once; concurrent completion/retry creates at most one submitted stock issue; cancellation/reassignment follows the admitted revision policy; failed combined PATCH creates neither a booking mutation nor an effect intent. Operator UI must expose pending/failed stock work and an authorized retry.

Existing phase10 invoice issue/submission acceptance remains distinct from this booking-triggered effect expansion. No current production recovery claim is made.
