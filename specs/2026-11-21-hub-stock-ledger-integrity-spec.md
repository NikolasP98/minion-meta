---
id: 2026-11-21-hub-stock-ledger-integrity-spec
title: Stock value always adds up — engine books residuals, a gap shows on the overview, unit-vs-total cost warning
stage: spec
status: draft
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
verdict: pending
type: fix
tags: [ui, data]
---

# Stock value always adds up

## 0. Product

An item's movements always add up to its stock value:
- The engine books any leftover value it cannot carry.
- A one-off repair script that broke 9 FACES items is removed.
- The stock overview warns the day a gap appears.
- "Last purchase cost" reads only real purchases.
- A unit cost that looks like a line total is flagged before saving, with a one-click "Es el total".

The canonical [Spec Kit specification](144-stock-ledger-integrity/spec.md) has the AS-IS evidence, TO-BE, DELTA and acceptance scenarios. FigCraft demo: [stock-ledger-integrity.figcraft](144-stock-ledger-integrity/stock-ledger-integrity.figcraft).

## Verification

Per the DELTA table in the Spec Kit spec.

## Human gates

Tagged `data`: the owner approves this spec before code and merges the PR.
