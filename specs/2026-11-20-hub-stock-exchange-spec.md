---
id: 2026-11-20-hub-stock-exchange-spec
title: Trade products with a supplier (canje) — one movement, products out and in, value carried over
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: pending
type: feature
tags: [ui, data]
---

# Trade products with a supplier (canje)

## 0. Product

A new stock entry type, "Canje", records giving products to a supplier and getting others back in one movement.
What comes in carries the value of what left; it never counts as a purchase or a consumption. It can be prepared as a
draft and registered the day the trade happens.

The canonical [Spec Kit specification](142-stock-exchange/spec.md) has the AS-IS evidence, TO-BE, DELTA and acceptance
scenarios. FigCraft demo: [stock-exchange.figcraft](142-stock-exchange/stock-exchange.figcraft).

## Verification

Per the DELTA table in the Spec Kit spec. Plan and tasks follow owner approval of the demo.

## Human gates

Tagged `data`: the owner approves this spec before code and merges the PR.
