---
id: 148-caja-automatica
title: Automatic cash register — the day opens with the first sale and closes itself at midnight
stage: live
status: approved
verdict: approved
pass: 1
created: 2026-11-24
updated: 2026-11-24
repos: [minion_hub]
tags: [pos, money]
related: [147-agenda-closures]
---

# Feature Specification: Automatic cash register ("Caja automática")

**Feature Branch**: `feat/148-caja-automatica` (hub, base `master`), one slice

**Created**: 2026-11-24

**Status**: Approved by the owner on 2026-11-24 (chose "Automatic daily (Recommended)": org setting; first sale opens; midnight job closes with counted = expected and sends the day's tickets; Abrir/Cerrar hidden; manual close still possible. "Spec Kit + audit, then live").

**Input**: FACES front desk, WhatsApp voice note, 2026-11-24 (transcribed):

> "¿te acuerdas de lo de cierre de caja y abrir caja? … anula esa vaina, por las puras, ni lo uso. ¿Me lo puedes hacer como el SUSII? … el SUSII es automático, no tengo que abrir la caja, sino desde hoy medianoche ya comienza a correr y solito se abre el día, y solito se cierra aunque yo no haga nada … me olvidé de cerrar hace cinco días."

## AS-IS (hub `origin/master`, FACES prod read-only, 2026-11-24)

- **A sale needs a shift the cashier opened.**
  - `createTicket` locks the actor's open shift and refuses without one (`pos.service.ts:2285-2291`, `no_open_shift`).
  - Refunds (`:2612`) and corrections (`:2992`) need it too.
  - Shifts are per user: there is one open shift per user (`pos_shifts_one_open_per_user`).
- **Closing a shift is the SUNAT commit point.**
  - `closeShift` (`pos.service.ts:385-466`) computes the expected amount per payment method.
  - For methods that don't take tendered cash, the counted amount is set to the expected amount.
  - The close then calls `emitShiftTickets`, which sends the tickets to SUNAT, because FACES runs in `emission.mode = 'shadow'`.
- **FACES shifts stay open for days.** In prod: 20/11 → 24/11, 17/11 → 18/11, 6/11 → 7/11. The owner's own shift was open from 9/11 with 0 sales until it was closed by hand on 24/11. Tickets reach SUNAT only when somebody remembers to close.
- **Cash is rarely counted.** Almost every close has `counted == expected`. Cash is 0 on most days. On 16/11 the expected cash was 1900 but 0 was counted.
- **Infra exists.**
  - Scheduled jobs: `vercel.json` `crons` (e.g. `/api/finances/sync/daily`), with `CRON_SECRET` bearer auth through the `isCronAuthPath` allowlist (`src/lib/server/cron-auth-path.ts`).
  - Settings: `pos_settings` row, read through `getPosSettings` (`pos/settings.ts:69,210`).

## TO-BE

1. **Setting (P1).** POS settings get **Caja automática** (on/off; default off, so every other org keeps today's behaviour). FACES is switched on after deploy (owner-approved).
2. **Opens itself (P1).** With the setting on, a sale, refund or correction with no open shift for the actor opens one in the same transaction, with a zero float. No dialog, and no `no_open_shift`. *Acceptance*: a first sale of the day with no shift succeeds and the ticket carries a new shift.
3. **Closes itself (P1).** An hourly job (`0 * * * *`) closes, within the hour after each org's local midnight, every open shift of every automatic org that opened before that local midnight. It uses the normal close path, with `counted = expected` for every method and the note "Cierre automático". This sends the shift's tickets to SUNAT exactly as a manual close does. *Acceptance*: the job closes yesterday's shift; a second run is a no-op; a shift opened after midnight is untouched.
4. **Nothing to do (P1).** In automatic mode the POS banner reads "Caja automática · hoy" with the day's income, and does not ask to open. "Cerrar caja" stays available as a secondary action for a manual cash count. The open-shift-after-hours inbox rule is silent for automatic orgs.

### Invariants

- Manual mode (default) is byte-for-byte today's behaviour.
- Auto-open happens inside the same transaction and lock (`FOR SHARE`) as the sale. Concurrent first sales by the same user create at most one shift (the existing unique index); a losing insert re-reads the winner.
- The auto-close reuses `closeShift` (no second close implementation). Emission stays post-commit and error-tolerant.
- The job route accepts only the `CRON_SECRET` bearer. It processes orgs with the setting on, and each org independently, so one failure never stops the others.
- Toggling the setting needs the same right as editing other POS settings.

### Out of scope

- Removing shifts or the per-user model.
- Per-org close times (FACES = Lima midnight; the job uses each org's POS timezone if one exists, otherwise America/Lima).
- Retro-closing past shifts (none are open after the owner's 9/11 shift was closed by hand).
- FigCraft proposal: bypassed for speed at the owner's "then live"; the banner change is copy-level.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | `pos_settings.shift_mode text not null default 'manual' check in ('manual','auto')` migration + Drizzle + `PosSettings.shiftMode` + update validation | settings unit test; migration-seed pairing check |
| D2 | `openShiftOf` callers in sale/refund/correction: in auto mode, insert a shift when none (in-tx, conflict-safe) | unit test: auto org first sale opens a shift; manual org still `no_open_shift`; race → one shift |
| D3 | `GET /api/pos/shifts/auto-close` (cron, `isCronAuthPath`) + `vercel.json` cron `0 5 * * *`; closes via `closeShift({counted: expected, note: 'Cierre automático', shiftId})` | route test: 401 without secret; closes only pre-midnight shifts of auto orgs; idempotent |
| D4 | Settings UI toggle; ShiftBanner auto copy (no open prompt, secondary close); `shift-open-after-hours` rule skips auto orgs; i18n es/en | mounted test for banner in auto mode |
| D5 | After deploy: set FACES `shift_mode = 'auto'` | read-back |

## Definition of done

Hub PR green, independent code audit (money/SUNAT-tagged) fixed, merged, deployed, cron visible in Vercel, FACES switched on, and a first automatic open verified on prod.
