---
id: 2026-11-19-hub-pos-session-existing-appointment-spec
title: Charging a service the client already has an appointment for — no second appointment, no stock at the sale
stage: spec
status: draft
pass: 1
created: 2026-11-19
updated: 2026-11-19
repos: [minion_hub]
verdict: pending
type: fix
tags: [ui, data]
---

# Charging a service the client already has an appointment for

## 0. Product

When a client pays for a treatment she already has an appointment for, the sale takes that
appointment instead of creating a second one, and the treatment's supplies leave stock once.
"Cobrar sesión" turns the appointment's line into the package session. A line rung from the
catalog offers "Cobrar la cita del …", and the schedule step offers "Usar la cita del …" first.

The canonical [Spec Kit specification](133-pos-session-existing-appointment/spec.md) contains the
AS-IS evidence (FACES POS-2026-00161 and POS-2026-00116), TO-BE invariants, DELTA and acceptance
scenarios.

## Verification

- [Implementation plan](133-pos-session-existing-appointment/plan.md), [research](133-pos-session-existing-appointment/research.md), [API deltas](133-pos-session-existing-appointment/contracts/api.md)
- [Validation guide](133-pos-session-existing-appointment/quickstart.md)
- FigCraft demo: [pos-session-existing-appointment.figcraft](133-pos-session-existing-appointment/pos-session-existing-appointment.figcraft)

## Out of scope

Repairing past sales, stamping appointments on counter-drawn redemptions, the 57 stale FACES appointments.

## Human gates

Tagged `data`: the owner approves this spec before code and merges the PR.
