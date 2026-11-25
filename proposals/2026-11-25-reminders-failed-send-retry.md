---
id: 2026-11-25-reminders-failed-send-retry
title: Reminders — a send that failed because the channel was down must be retried, not consumed
status: draft
created: 2026-11-25
updated: 2026-11-25
source: owner-request-2026-11-25
repos: [minion_hub]
tags: [data]
related: [139-reminder-negation-followup]
---

# Reminders: retry sends that failed because the channel was down

## AS-IS (observed 2026-11-25, prod)

- On 2026-11-25 the owner approved scheduling `/api/scheduling/reminders/tick` on netcup (`health-gated-tick reminders`, `1-59/5`). Its first run was at 06:41Z.
- FACES WhatsApp `+51906090526` was not linked. Every send failed with `gateway channels.send failed: UNAVAILABLE — No active WhatsApp Web listener`. The run wrote 25 `failed` rows for 13 bookings, and no client received anything.
- `processOrgReminders` dedups on every recorded `(booking, stage, channel, role)`, whatever its status. A failed send is therefore never retried, and each run permanently uses up the reminders of up to 25 bookings.
- I paused the crontab line the same day (it is commented out, with a note). Hub #734 marks the tick `paused`.

## TO-BE

- A send that fails because the channel is unavailable (gateway `UNAVAILABLE`, or the account is not linked) does not use up the stage. It is retried on a later run while the stage is still useful: confirmation until the appointment, 24h/2h until the appointment starts.
- Before any send, an org whose reminder channel is not linked is skipped, and the skip is reported once to staff. This is the "WhatsApp desconectado" notice from spec 139 S2.
- Real failures (bad number, opted out) stay `failed` and are never retried.

## DELTA

| Transition | Proof |
|---|---|
| A failed `UNAVAILABLE` send used up the stage → the next run retries it | reminders service test with a mocked gateway |
| Unlinked channel: 25 failed rows per run → zero rows, one staff notice | test |

## Open data decision

The 25 `failed` rows from 2026-11-25 06:41Z (13 FACES bookings, mostly within 24 h) block those bookings' reminders. Once the number is linked, delete them, with owner OK, so the next run sends them. Otherwise leave them; most of those appointments will already be over.

## Re-enable checklist

1. Link FACES WhatsApp `+51906090526`.
2. Ship the retry fix above, or accept the risk.
3. Un-comment the crontab line on netcup.
4. Flip `wiring` to `netcup` in `system-automations.ts`.
