# Implementation Plan: Charging a service the client already has an appointment for

**Branch**: `fix/133-pos-session-existing-appointment` (hub, base `master`) | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/133-pos-session-existing-appointment/spec.md`

## Summary

A sale line that charges a service the client already has an appointment for must carry that appointment from the
start, so that nothing is issued at the sale, no schedule step appears, and no second appointment is created.

Four changes, one hub PR:
1. "Cobrar sesión" converts the cart's booked line instead of adding one.
2. The cart and the schedule step offer the client's uncharged appointment for that service.
3. Booking from the schedule step does not re-reserve supplies that already left at the sale.
4. The server validates every appointment a sale line claims.

Design detail: [research.md](research.md), [data-model.md](data-model.md),
[contracts/api.md](contracts/api.md). Validation guide: [quickstart.md](quickstart.md).
UI demo: [pos-session-existing-appointment.figcraft](pos-session-existing-appointment.figcraft).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 (hub)

**Primary Dependencies**: Drizzle ORM over postgres.js (`withOrgCore`), Paraglide i18n, hub UI kit (`Button`, `Badge`), lucide-svelte

**Storage**: Supabase Postgres, existing tables only: `pos_tickets`, `pos_ticket_lines`, `sched_bookings`, `stk_accruals`. No migration.

**Testing**: Vitest (bun), the hub's mocked-DB service tests (`pos.tickets.test.ts`, `scheduling-bookings-ticket-link.test.ts`), pure-helper unit tests, and the `*.mounted.test.ts` component tests

**Target Platform**: Hub on Vercel; the FACES till runs in desktop Chrome

**Project Type**: Web application (SvelteKit: server services + routes + Svelte components in one repo)

**Performance Goals**:
- The account fetch adds one indexed query of at most 20 rows.
- Ticket submit adds one locked row read per booked service line, with no extra round trip on sales without appointments.

**Constraints**:
- No new route, so the RBAC wiring and route-contract manifest stay untouched.
- Every user-facing string goes through `m.*()` (es, en).
- Use design tokens only; `lint:design` and `lint:tokens` may not regress.

**Scale/Scope**: FACES only: about 160 service sales per month; 97 lines were booked after their sale so far. 3 service files, 2 route files, 3 Svelte files, about 8 new i18n keys.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md (draft, meta #1055); this plan; tasks next; no code yet |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ in spec.md, with incident ids and the scale query (2/97) |
| III. Slice-scoped delivery | ✅ one hub PR from a fresh clone of `origin/master`, base `master` (registry PR base). Gates run in the foreground: `bun run check`, scoped vitest, `lint:design`, `lint:tokens`, `i18n:compile` |
| IV. Required build steps | ✅ No new page, route, endpoint or nav link, so RBAC/route-contract unchanged. Extending existing endpoints keeps their current gates (`/api/pos` write capability + explicit `scheduling:edit` on `/schedule`). i18n keys added (es, en). Design-token contract followed. |
| V. Data work keeps human gates | ✅ tagged `data`: the owner approves the spec before code and merges. No production data script in this feature. |
| FigCraft demo first (AGENTS.md) | ✅ 8 frames, as-is and to-be, linked from the spec |

Post-design re-check: ✅ unchanged. The design adds no table, no route and no migration.

## Project Structure

### Documentation (this feature)

```text
specs/133-pos-session-existing-appointment/
├── spec.md
├── plan.md                              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── pos-session-existing-appointment.figcraft
├── checklists/requirements.md
└── tasks.md                             # next: /speckit-tasks
```

### Source Code (hub repository, `minion_hub`)

```text
src/server/services/
├── scheduling-bookings.service.ts      # unchargedAppointmentsFor(); bookAndLinkTicketLine: link-existing mode + no re-reservation
├── pos.service.ts                      # submitTicket: validate line bookingId (lock + rules); getTicket: per-line candidates
└── pos/accounts/detail.ts              # account detail gains `appointments`
src/routes/api/pos/tickets/[id]/schedule/+server.ts   # body gains optional bookingId (link existing)
src/lib/components/pos/
├── sell-session.svelte.ts              # SellAccount.appointments
├── sell-appointments.ts                # NEW pure helpers: billSessionOnCart, matchAppointment
├── SellCart.svelte                     # booked-line marker + "Cobrar la cita del …" action + unlink
└── ScheduleStep.svelte                 # "Usar la cita del …" first
src/routes/(app)/pos/sell/PageBody.svelte            # billSession uses billSessionOnCart
messages/es.json, messages/en.json
```

Tests:
- `src/lib/components/pos/sell-appointments.test.ts` (new)
- `src/server/services/pos.tickets.test.ts`
- `src/server/services/scheduling-bookings-ticket-link.test.ts`
- `src/server/services/scheduling-bookings-uncharged.test.ts` (new)
- `src/lib/components/pos/sell-session.mounted.test.ts`

**Structure Decision**: the existing hub layout; one new pure module next to the cart helpers it serves.

## Complexity Tracking

No constitution violations.
