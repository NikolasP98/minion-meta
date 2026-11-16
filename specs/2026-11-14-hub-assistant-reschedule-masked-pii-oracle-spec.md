---
id: 2026-11-14-hub-assistant-reschedule-masked-pii-oracle-spec
title: Assistant reschedule cannot be used to guess a client's masked email, phone or notes
stage: dev
status: implementing
pass: 1
created: 2026-11-14
updated: 2026-11-14
repos: [minion_hub]
type: fix
---

# Assistant reschedule: close the masked-PII guessing oracle

Owner request (2026-11-14), in reply to a security finding: "fix". The automated push
security review flagged it on 2026-11-12. This is a security fix, so the owner stays the
gate at approval and at merge.

## 0. Product

A role that may only see masked client contact details must not be able to recover them
by asking the assistant to reschedule with a guess. Clinics trust the masking only if it
cannot be worked around.

## AS-IS

`POST /api/gateway/actions/booking-reschedule`
(`minion_hub/src/routes/api/gateway/actions/booking-reschedule/+server.ts`):

- A principal whose scheduling field level is below `SENSITIVE_FIELD_LEVEL` (`src/lib/permissions.ts`,
  value 1) sees the attendee email and phone masked with `maskPii`. The receipt never
  includes notes.
- The body still accepts the legacy fields `attendeeEmail`, `attendeePhone` and `notes`.
  `previewAssistantReschedule` compares each one with the stored booking and answers
  **409** on a mismatch.
- So a masked principal can send a guess and learn from 409 versus success whether the
  stored email, phone or notes equal it. Sending `null` reveals whether a value is empty.
  The test "allows identical legacy identity fields" proved this: it sent the real email,
  phone and notes at field level 0 and got a preview.

## TO-BE

- A masked principal that sends any of `attendeeEmail`, `attendeePhone` or `notes`
  (including `null`) gets **403** before any booking is read. The message names the
  fields its role can't see. The answer is the same for a right guess and a wrong one.
- Invariant: a principal at or above `SENSITIVE_FIELD_LEVEL` keeps the legacy equality
  checks unchanged (identical values pass, different values give 409).
- Invariant: omitting the fields keeps working for every principal. The gateway tool
  (`minion/src/agents/tools/hub/booking-reschedule-tool.ts`) sends them only when the model
  fills them in, so normal rescheduling is unaffected.
- `attendeeName`, `crmContactId` and `eventTypeId` are not masked anywhere, so they stay
  as they are.

## DELTA

1. Route: a `SENSITIVE_MATCH_FIELDS` guard right after `maskSensitive` is computed.
2. Tests, in `src/server/services/scheduling-bookings-assistant-reschedule.test.ts`:
   - new `it.each` "refuses %s from a masked principal so it cannot probe the stored value"
     checks that a right guess, a wrong guess and `null` all give 403;
   - the existing mismatch-409 cases and "allows identical legacy identity fields" now run
     at field level 1, the only level where those checks are still reachable.

## Verification

- The new 403 tests fail on the old route and pass on the new one.
- Gates: the targeted vitest file passes 38/38, and `bun run check` reports 0 errors.

## Out of scope

Dropping the legacy fields from the schema and from the gateway tool altogether. That
needs a matching gateway release and is not required to close the oracle.
