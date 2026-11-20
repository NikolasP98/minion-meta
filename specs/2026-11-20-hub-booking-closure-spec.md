---
id: 2026-11-20-hub-booking-closure-spec
title: Closing appointments — "Por cerrar" after the day ends, Desagendar on every appointment, Archivar as the main close
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: approved
type: feature
tags: [ui, data]
---

# Closing appointments

## 0. Product

An appointment whose day has ended and that is still open shows as "Por cerrar" and is listed in
one "Pendientes" tray, where the receptionist completes it, unschedules it ("Desagendar", also used
for "No vino") or archives it. Unscheduled appointments keep the client, the payment, the package
session and the reserved supplies, and wait to be re-booked. "Archivar" is the main close;
"Anular cita" (today's cancel, which refunds the session) moves to a "Más…" submenu. The word
"Cancelar" (in Peru: "to pay") leaves appointment actions and statuses.

The canonical [Spec Kit specification](134-booking-closure/spec.md) contains the AS-IS evidence
(FACES: 101 open past appointments, 56 of 107 cancelled/no-show appointments followed by nothing),
TO-BE invariants, DELTA and acceptance scenarios.

## Verification

- Plan, research and FigCraft as-is/to-be demo: next (`/speckit-plan`). S1 depends on spec 135 (stock checkpoints).

## Out of scope

Money refunds (existing paid-cancel flow), auto-archiving, renaming generic dialog buttons, closing the
57 stale FACES appointments by hand (the tray replaces that list once live).

## Human gates

Tagged `data`: the owner approves this spec before code and merges each PR.
