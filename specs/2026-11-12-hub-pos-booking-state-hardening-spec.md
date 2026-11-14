---
id: 2026-11-12-hub-pos-booking-state-hardening-spec
title: POS and appointments state hardening (void, shift close, booking status, charge replay)
stage: spec
status: review
pass: 2
created: 2026-11-12
updated: 2026-11-14
repos: [minion_hub]
type: fix
tags: [logic, ux, test]
---

# POS and appointments state hardening

Board stub. The Spec Kit artifacts are the source of truth:
[`specs/116-pos-booking-state-hardening/`](116-pos-booking-state-hardening/spec.md)
(`spec.md`, `plan.md`, `tasks.md`). No proposal preceded this spec: the owner asked for the
audit directly on 2026-11-11 and for specs on 2026-11-12; the audit is the investigation.

## 0. Product

Staff must be able to trust that a void refunds once, a shift closes once with the count they
typed, a closed appointment stays closed, a cancelled paid appointment frees its service, and
a button never acts on data that is not on screen yet.

## 1. AS-IS, TO-BE, DELTA

See `116-pos-booking-state-hardening/spec.md` (AS-IS rows A1–A21, invariants I1–I7, DELTA D1–D17 each mapped to a slice and a proving test).

## 2. Slices

Pass 2 (after the EGM review of 2026-11-14, reports in `116-pos-booking-state-hardening/egm/`):
six slices in shipping order, no schema change.

### Slice 1 — actions wait for the data they act on
**Topics:** `ux`, `test`

### Slice 2 — a void refunds once
**Topics:** `logic`, `test`

### Slice 3 — a voided instalment reopens its plan
**Topics:** `logic`, `test`

### Slice 4 — a shift closes once
**Topics:** `logic`, `ux`, `test`

### Slice 5 — closed appointments stay closed and free their paid service
**Topics:** `logic`, `ux`, `test`

### Slice 6 — a repeated charge returns the first ticket
**Topics:** `logic`, `test`

## 3. Out of scope

Reminders, tax emission, join, sales-order and leave requests (separate spec), flow editor, config editor, chat, WhatsApp QR card, voice, cancelled-plan refund
policy, every gateway finding (the privacy one is spec 117).

## 4. Verification

Each slice's failing-then-green tests (plan.md "Detailed Implementation Plan"), CI's Postgres
lane for the `*.sql.integration.test.ts` files, then on prod with the QA account: void a cash
ticket twice quickly, close a shift from two tabs, cancel a paid appointment and find its
service in the tray, click between two appointments and press cancel immediately.
