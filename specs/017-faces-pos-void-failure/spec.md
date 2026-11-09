# Feature Specification: POS void refusal must name its reason (FACES "No se pudo anular el cobro")

**Feature Branch**: `docs/spec-017-faces-pos-void-failure` | **Repos & PR bases**: minion_hub → `master` (fix `fix/pos-void-role-reason`) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic + security-adjacent (an RBAC refusal is surfaced, no capability changes) | **Human gates**: owner merges the hub PR; owner decides whether FACES `staff` should hold `pos:manage`

**Input**: Owner, 2026-10-16, photo of production: cancelling a booking's charge (`#POS-2026-00040`, "Reserva de Consulta", refund "Devolver en efectivo") fails with the generic toast "No se pudo anular el cobro". "Why can't the user cancel/void invoices in production? Check PostHog."

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (evidence: prod DB read-only `2026-10-17 03:2x UTC`, PostHog project 129899, hub `origin/master` @ `606b363c`).

- The actor is `customersupport@facesculptors.net` (profile `2225a6f4…`), FACES role_key `staff` (`member_roles`). PostHog `$autocapture`: "Cancelar y anular" 00:09:16Z, then the confirm "Anular y cancelar" at 00:09:20Z, 00:09:25Z, 00:10:37Z (session `01a1469d-48a1-7031-8c60-aa02ab3ad1ef`); `$rageclick` on the same page at 00:13:41Z and 00:30:09Z.
- `POST /api/pos/tickets/:id/void` requires `pos:manage` (`minion_hub/src/routes/api/pos/tickets/[id]/void/+server.ts:19`). FACES overrides `staff`/`pos` to `view,create,edit = t; delete,export,manage = f` (`permission_rules` row `6d1e66b2…`, 2026-09-26) — and the global default for `staff` is the same `RWX` (`src/server/services/rbac.service.ts:176`, test `rbac.service.test.ts:186`). So the route throws SvelteKit `error(403, 'pos: manage required')` (`rbac.service.ts:1273`), body `{message}`.
- The client reads only `j.error` (`src/routes/(app)/pos/appointments/+page.svelte:832-834`), so the toast shows "No se pudo anular el cobro — HTTP 403" and the ConfirmDialog's failure line is the static generic string. Nothing names the role.
- The ticket itself is voidable: `status=submitted`, no `invoice_provider_ref`, no `pos_period_locks` for the org, no stock entry, one `transfer` payment of 50.00 PEN on shift `389236ed…` — which is OPEN and belongs to the same user, so `no_open_shift` would not have fired for her.
- The menu offers `cancel-paid` to anyone with `pos:edit` (`calendar-context-menu.ts:133-138`), unlike `charge`, which is gated on the capability its endpoint checks.
- Observability: Vercel runtime logs carry nothing for the route (a 403 `error()` logs no line); PostHog has no `$exception`/`server_error` for it (an HttpError is not an unexpected error). Only autocapture + rage clicks show the failure. No ticket in FACES has `voided_at` set in the last 14 days.

**TO-BE.**
- A host without `pos:manage` is not offered "Cancelar y anular" (paid event: no destructive entry; unscheduled-paid tray: no menu), mirroring the `charge`/`pos:edit` gate.
- If the void is refused anyway (stale capability cache, direct call), the dialog's failure line and the toast name the reason: 403 → "Tu rol no puede anular cobros. Pide a un administrador el permiso de caja «gestionar»."; `no_open_shift` → "Abre tu caja para registrar la devolución."; any other pos refusal → the server's `error` text (`message` for SvelteKit errors).
- Operational answer for FACES today: a member holding `pos:manage` (owner/admin/manager: Renzo GT, Faces Sculptors, Leiva, Martin, Nikolas) voids `#POS-2026-00040` — opening THEIR OWN register first if the refund is cash, since the refund row lands on the refunding user's open shift (hub #517). Alternatively the owner grants FACES `staff` → POS `manage` in Settings → Roles (that also unlocks shift close for others, POS settings, top-ups, emission).

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 | `calendarMenuEntries({…, canVoid})`: paid + `canEdit` + `!canVoid` ⇒ no destructive entry; page passes `canAct('pos','manage')`; tray `oncontextmenu` is a no-op without it | `calendar-context-menu.test.ts` "offers no destructive entry on a paid event when the host cannot void" + "keeps delete on an unpaid event" |
| S2 | `voidRefusalKey(status, body)` → `forbidden` / `no_open_shift` / `other`; `voidTickets` maps it to `pos_appt_cancel_paid_forbidden` / `pos_appt_cancel_paid_no_shift` / server text, sets `voidFailure`, which the ConfirmDialog shows as `failureMessage` | `voidRefusalKey` tests (403, 409 no_open_shift, other); es/en keys |

## User Scenarios & Testing

1. **FACES staff right-clicks a paid event** → menu shows Detail/Charge/Split only; no 403 is ever produced. Proof: unit test S1; owner check on prod after deploy.
2. **A manager without an open register voids with cash refund** → dialog line "Abre tu caja para registrar la devolución."; after opening the register the void succeeds and the refund row sits on the manager's shift. Proof: S2 test + the existing route test for `no_open_shift`.
3. **Stale cache: the entry is shown but the server refuses 403** → dialog line names the role. Proof: S2 test.

## Requirements

- FR-001 The UI MUST NOT offer a destructive void entry to a role that cannot perform it; the gate MUST read the same capability the route enforces (`pos:manage`).
- FR-002 A 403 from the void route MUST be shown as a role limitation, never as a generic failure.
- FR-003 No change to RBAC defaults, FACES overrides, or the void service.

## Out of scope / open ends (ledger)

- **Out of scope:** whether FACES `staff` should hold `pos:manage` (owner's product decision); a role-aware disabled entry with tooltip instead of hiding (would need `ContextMenuItem` disabled support); translating the remaining raw pos refusal strings (`reconciled`, `period_locked`, …) in this dialog — they pass through in English as before.
- Observability gap: an RBAC 403 leaves no server trace (Vercel, PostHog `server_error`); only autocapture/rage clicks exist. A `server_denied` crumb from `requireOrgCapability` is a separate proposal.
