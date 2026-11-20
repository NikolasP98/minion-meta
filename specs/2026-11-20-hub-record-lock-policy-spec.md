---
id: 2026-11-20-hub-record-lock-policy-spec
title: Record lock policy — after X days, month close, SUNAT, or webhook
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: pending
type: feature
tags: [data, security]
---

# Record lock policy — after X days, month close, SUNAT, or webhook

## 0. Product

Each organization sets when past records stop being editable: after X days, at month close (today), after SUNAT acceptance, or when an external system calls a lock webhook. Locked records name the rule and who can unlock; owners can unlock one record with a reason; everything is audit-logged. Purchases first (spec 135 corrections).

The canonical [Spec Kit specification](140-record-lock-policy/spec.md) contains AS-IS evidence, TO-BE invariants, DELTA and acceptance scenarios.

## Verification

- Plan: next (`/speckit-plan`) after owner approval.

## Human gates

Tagged `data`: the owner approves this spec before code and merges each PR.
