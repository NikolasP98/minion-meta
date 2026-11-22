# Quickstart: validating spec 133

## Prerequisites

- A fresh hub clone of `origin/master` with the implementation branch checked out, `bun install`, `bun run i18n:compile`.
- **Never** run the full suite with prod env present. Unset `SUPABASE_DB_URL`; use scoped vitest files only.
- For the browser checks: the local QA stack (`bun run qa:up`, see the hub QA-stack recipe) with the seeded org, a package "QA Package" for a service, and a client.

## Automated checks

```bash
bunx vitest run src/lib/components/pos/sell-appointments.test.ts \
  src/server/services/pos.tickets.test.ts \
  src/server/services/scheduling-bookings-ticket-link.test.ts \
  src/server/services/scheduling-bookings-uncharged.test.ts \
  src/lib/components/pos/sell-session.mounted.test.ts
bun run check && bun run lint:design && bun run lint:tokens
```

Expected: every DELTA row in [spec.md](spec.md) has a passing test, and lint debt does not grow.

## Manual scenarios (QA stack)

1. **Session on the appointment (US1)**
   - Book the client for the package's service today.
   - From the agenda, "Cobrar".
   - Press "Cobrar sesión".
   - Expect one line, "Sesión de paquete", "Cita del …", total S/ 0.00.
   - Charge it. Expect no "Agenda los servicios" step and no stock movement for the service.
2. **Catalog line (US2)**
   - New sale for the same client.
   - Add the service from the catalog.
   - Expect "Cobrar la cita del …". Click it, expect the line to show the appointment with an X. Charge it.
   - Expect no schedule step, and still one appointment in the agenda.
3. **Schedule step (US3)**
   - Ring the service without using the action, charge it.
   - In "Agenda los servicios", expect "Usar la cita del …" before "Agendar nueva". Use it.
   - Expect the line "Agendado", no new appointment, no new reservation.
4. **Already charged (FR-006)**
   - Repeat scenario 2 for an appointment already charged.
   - Expect no action offered. Forcing the old `bookingId` in the request returns `booking_already_charged` naming the ticket.
5. **No appointment (SC-004)**
   - A client with no appointment: the cart, charge and schedule step behave exactly as today.

## Post-merge verification (prod, read-only)

Re-run the AS-IS scale query (spec.md) 30 days after release. Expect 0 new duplicates.
