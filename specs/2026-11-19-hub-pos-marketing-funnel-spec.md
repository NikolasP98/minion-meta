---
id: 2026-11-19-hub-pos-marketing-funnel-spec
title: PDV marketing funnel — ad spend to paying customer, LTV/CAC, and the customers Meta can reach
stage: spec
status: shipped
pass: 1
created: 2026-11-19
updated: 2026-11-20
repos: [minion_hub]
verdict: approved
type: feature
tags: [ui, data]
---

# PDV marketing funnel

## 0. Product

A read-only page, enabled for FACES only through its navigation settings, showing the path from ad
spend to repeat customer, the money metrics (cost per new customer, lifetime spend, return on ad
spend, average ticket, repeat rate) and every paying customer with the channels Meta can match.

The canonical [Spec Kit specification](132-pos-marketing-funnel/spec.md) holds AS-IS, TO-BE, DELTA
and the acceptance scenarios. Shipped as hub #691 on 2026-11-19, together with the sync fix hub #690.

## Verification

- Hub CI on #691; the page's queries run by hand, read-only, on FACES production data.
- Not done: FigCraft as-is/to-be.

## Out of scope

Sending anything to Meta, consent, contact merging (proposal slices S1, S3, S4).

## Human gates

Owner reviewed the page locally and asked for the merge on 2026-11-19.
