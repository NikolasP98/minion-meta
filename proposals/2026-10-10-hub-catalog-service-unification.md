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
