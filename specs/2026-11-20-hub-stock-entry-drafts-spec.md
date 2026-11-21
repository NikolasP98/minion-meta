---
id: 2026-11-20-hub-stock-entry-drafts-spec
title: Stock entry drafts you can act on — edit, register, duplicate, delete, with where they came from
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

# Stock entry drafts you can act on

## 0. Product

A stock entry draft can be edited in the same form that created it, registered, duplicated or deleted.
It shows where it came from (an appointment, a sale, an invoice or a person). An old draft, or one created by an
appointment, warns before registering, because the stock may already have been squared by a count.

The canonical [Spec Kit specification](141-stock-entry-drafts/spec.md) has the AS-IS evidence (FACES' 4 drafts),
TO-BE, DELTA and acceptance scenarios. FigCraft demo: [stock-entry-drafts.figcraft](141-stock-entry-drafts/stock-entry-drafts.figcraft).

## Verification

Per the DELTA table in the Spec Kit spec. Plan and tasks follow owner approval of the demo.

## Human gates

Tagged `data`: the owner approves this spec before code and merges the PR.
