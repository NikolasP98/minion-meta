---
id: 2026-10-10-hub-catalog-service-unification
title: Catalog is the only list of services — stored kind, one composition, auto-scheduled services, products on events
status: in-spec
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [data, ui, billing]
value: 9
effort: L
spawned_spec: 2026-10-10-hub-catalog-service-unification-spec
---

# Catalog is the only list of services

## Problem (FACES, WhatsApp 2026-10-10 13:55)

> "cuando busco este servicio, no me aprece en las opciones para agregarlo … lips Sculpt Saypha … igual con bioestimulador … pero en el catalogo veo que si están activos"

Root cause (diagnosed the same day): a catalog service and its scheduling row
(`sched_event_types`) carry two independent names. The appointment drawer's "Agregar
servicio" picker searches the scheduling title only; a catalog rename never reaches it.
Prod state for FACES: 9 active services with diverging names, 4 active services with no
scheduling row (never bookable), 25 active scheduling rows whose catalog service is retired
(the picker offers dead services). "Bioestimulador" is a product, which today can never be
part of an appointment.

## Owner ask (verbatim)

> "its time to UNIFY the catalog items with the SERVICES to avoid this mismatch. Every item in
> the catalog with type "SERVICE" should automatically appear on the SERVICE list. Also, allow
> products to be added to events as well (events need at least 1 service item, however)"

> "Catalog item type (Service vs. Product) should be a manual SELECT-type picker IMO.
> Service-types should get their own schedule-able event and can be composed of products
> and/or other services. The Product-types can only be composed by one or more products. The
> catalog is just a recipe book where each is composed of one or more products and/or
> services" — plus "improve the catalog dropdown" (the expanded row that today shows
> "Composición del paquete" and "Receta" as two unrelated editors).

## Definition of done

1. `fin_products.kind` is a stored, user-chosen `service | product`; the wizard and the
   table edit it with a Select. "Paquete" is a caption on a service with service
   components, not a third kind.
2. The catalog expanded row is ONE "Composición" list with one "Agregar componente" picker,
   filtered by the parent's kind (service → products and services; product → products).
3. Every active catalog service has exactly one active scheduling row whose title equals
   the catalog name; create/rename/deactivate flow through; a backfill fixes existing orgs.
4. An appointment can carry product lines; it always keeps at least one service; product
   lines ride into the POS cart with the services and show as paid afterwards.

Spec: `specs/2026-10-10-hub-catalog-service-unification-spec.md`.

## Open ends — Slices 3 & 4 (minion_hub PR #465, branch `feat/catalog-service-sync`)

Slices 3 (catalog ⇒ scheduling row) and 4 (products on an event) are implemented and
gate-clean (`bun run check` 0/0, `lint:design`/`lint:tokens` clean, targeted vitest all
green — 10 files / 163 tests directly, 47 files / 450 tests on the broader scheduling
regression sweep), but three things were **not** verified and need owner/agent follow-up
before merge:

1. **QA stack migration proof not run.** `bun run qa:up` failed — port 54422 was held by
   an unrelated, already-running stack (`supabase_db_minion-readiness-20261003`) from a
   different session; it was not stopped. Both migrations
   (`20261010130000_event_types_follow_catalog.sql`,
   `20261010140000_sched_booking_products.sql`) are idempotent by construction (CTEs that
   re-check `not exists` before inserting, invariant `raise exception` asserts) but have
   **never executed against a live Postgres**. Re-run `bun run qa:up` on a free port and
   confirm `bun run qa:reset` stays green before merging.
2. **Prod dry-run not attempted** (spec Slice 3 DoD: "on FACES prod data … the result is
   49 active rows named exactly like the catalog"). Needs the owner's `psql`/Supabase
   access, same as prior prod dry-runs in this repo's history.
3. **`addProductToVisit`'s duplicate-product 23505 → `'product already on this event'`
   mapping is implemented but not unit-tested** — the mock-db test harness used elsewhere
   in this file can't easily simulate a thrown unique-violation from an insert chain.
   Covered by code review and the real `isUniqueViolation` helper (already used the same
   way in `pos.service.ts`), not by an automated test.

`TODO(handoff)` left in `scheduling-bookings.service.ts` (`ungroupBooking`): the
anchor-product-move update could theoretically violate `sched_booking_products`'
`(booking_id, product_id)` unique index if the new anchor already independently carries
the same product — unreachable through this module today, flagged rather than defended
against with a merge-qty fallback.

Also flagged in the PR body: `visit.products` (spec wording) is implemented as a
top-level `BookingDetail.products` field, not nested under the nullable `visit` — `visit`
is `null` for the common single-service event, which would make products invisible
exactly when I4 (≥1 service, but products are independent) matters most.
