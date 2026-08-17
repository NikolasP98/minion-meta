---
id: 2026-08-17-hub-pos-appointments-fork
title: Collapse /pos/appointments (732-line fork) into /scheduling/bookings
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [ui, logic, duplication]
value: 7
effort: L
source: debt-sweep-2026-08-17
---

# Collapse /pos/appointments (732-line fork) into /scheduling/bookings

## Problem

Two independent implementations of the same booking domain: pos/appointments/+page.svelte (732 lines) vs scheduling/bookings/+page.svelte (663). Drift guaranteed.

## Definition of done

/pos/appointments is a thin filtered view or redirect over the scheduling component; route-contract manifest + 6 counts updated; both routes smoke-tested.

## Out of scope

Booking feature changes; schema.
