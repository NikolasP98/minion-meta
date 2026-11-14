---
id: 2026-11-14-hub-stuck-states-and-unguarded-decisions-spec
title: Stuck sends and unguarded decisions (reminders, follow-ups, tax emission, join, leave, assistant actions)
stage: spec
status: review
pass: 2
created: 2026-11-14
updated: 2026-11-14
repos: [minion_hub]
type: fix
tags: [logic, data, migrations, test]
---

# Stuck sends and unguarded decisions

Board stub. The Spec Kit artifacts are the source of truth:
[`specs/118-hub-stuck-states-and-unguarded-decisions/`](118-hub-stuck-states-and-unguarded-decisions/spec.md).
No proposal preceded this spec: it is the second tier of the audit the owner requested on
2026-11-11, added to scope by the owner on 2026-11-14.

## 0. Product

A decision (deny, approve, status change) applies once and follows the same rules for people
and for the assistant; a send interrupted by a redeploy ends visibly failed instead of staying
in progress forever; a sale has one live tax document.

## 1. AS-IS, TO-BE, DELTA

See `118-hub-stuck-states-and-unguarded-decisions/spec.md` (rows A1–A8 at hub `21825676`,
production counts read 2026-11-14: none of the defects has fired).

## 2. Slices

### Slice 1 — decisions apply once and the assistant follows workflow rules
**Topics:** `logic`, `permissions`, `test`

### Slice 2 — a send that died no longer stays in progress
**Topics:** `logic`, `test`

### Slice 3 — one live tax document per ticket
**Topics:** `data`, `migrations`, `logic`

## 3. Out of scope

Leave-request creation race, reminder re-send policy after a reschedule, live tax emission,
stuck backups, and everything in specs 116, 117 and 119.

## 4. Verification

Each slice's failing-then-green tests (plan.md), then the production count query of SC-004
thirty days after the last slice ships.
