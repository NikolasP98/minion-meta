---
id: 2026-11-14-hub-till-corrections-spec
title: Till corrections — stock follows the appointment, products on the agenda, product swap
stage: spec
status: review
pass: 1
created: 2026-11-14
updated: 2026-11-14
repos: [minion_hub]
proposal: 2026-11-13-faces-stock-follows-appointment-agenda-products-line-swap
verdict: pending
type: fix
tags: [data]
---

# Till corrections

## 0. Product

A treatment's supplies leave stock once, when its appointment is completed, never at the sale.
The agenda shows the products sold with a visit. Staff can swap a wrong product on a validated
sale, and when a swap is not enough the app voids and re-opens the sale pre-filled.

The canonical [Spec Kit specification](120-till-corrections/spec.md) contains the AS-IS evidence,
TO-BE invariants, DELTA, slices and acceptance scenarios.

## Plan and verification

- [Implementation plan](120-till-corrections/plan.md)
- [Tasks](120-till-corrections/tasks.md)

## Out of scope

Price or quantity changes after validation, credit notes, treatment-line swaps.

## Human gates

Tagged `data`: a one-time repair changes production stock. Owner approves this spec before code,
merges, and runs the repair.
