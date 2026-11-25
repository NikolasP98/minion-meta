---
id: 140-record-lock-policy
title: Record lock policy — each org decides when past records stop being editable (after X days, after a webhook, after SUNAT/period close)
stage: deploy
status: shipped
verdict: approved
pass: 1
created: 2026-11-20
updated: 2026-11-25
repos: [minion_hub]
tags: [data, security]
related: [135-stock-checkpoints, 124-stock-correction-workflow]
---

# Feature Specification: Record lock policy

> **Shipped 2026-11-25 (S1–S4), hub master `133c4154`.**
> - The slices: S1 #723 (tables), S2 #731 (policy, refusals, audit, cancel guard), S3 #732 (owner one-shot unlock), S4 #733 (webhook + `locks` key scope, per-key lock indexes, migration `20261125120000`).
> - Three Opus audit rounds were run; the last was clean.
> - S5 (sales/SUNAT) and S6 (manual entries) are NOT built: each needs owner confirmation, as the Assumptions section says.
> - Open ends: `proposals/2026-11-25-specs-139-140-open-ends.md`.

**Feature Branch**: `feat/140-record-lock-policy` (hub, base `master`)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-20: "The staff should be able to correct the qty of any past purchase. It should always be audit logged, though so that we know how qtys changed over time. The org can set this: lock after X days, lock after a webhook is run, after SUNAT is locked, etc."

Go-ahead, owner 2026-11-23: "address all items without overlap first. When they're live, list out the items with overlap with their updated status in case another session addressed them and what your recommended approach is." This spec was reported as having no overlap with other work (overlap check of 2026-11-23, spec 134 PR #1056).

UI approval, owner 2026-11-25 (after the FigCraft demo preview https://claude.ai/artifact/MLm5NPbN3mNfXbriMkVxd4): "I love the UI demos. Implement all and lmk when live."

## AS-IS (hub `origin/master` `63c4313b`)

- **Monthly money locks**: `pos_period_locks` (`src/server/db/pg-pos-schema.ts:455`), one row per org and month.
- **Spec 124's receipt-period policy** (`stock-corrections.logic.ts:249`, `receipt_period_v1`) refuses value-changing purchase corrections when the original or current month is locked, and requires the owner (`owner_required`).
- Corrections of tickets check "emitted" documents (non-error, non-beta SUNAT emissions) through `assertTicketMutable` (spec 120).
- None of this is configurable per organization. There is no lock by age, no lock triggered from outside (for example by an accounting export), and no single place that says "this record is locked because…".

## TO-BE

### 1. One policy per organization

An owner sets, in organization settings, the rules that lock past records. A record is locked when **any** enabled rule applies:

| Rule | Locks a record when… |
|---|---|
| **Después de X días** | it is older than X days (X set by the org) |
| **Al cerrar el mes** | its month is closed (today's `pos_period_locks`) |
| **Tras SUNAT** | an accepted electronic document exists for it, or its SUNAT period is closed |
| **Por webhook** | an external system called the lock endpoint for it, or for a date up to which everything is locked (e.g. "exportado a contabilidad hasta el 31/10") |

### 2. What it applies to

- **Slice 1**: purchase (receipt) quantity and cost corrections (spec 135 FR-007b, spec 124).
- **Later slices**: sale corrections (spec 120 swaps, voids) and manual stock entries. Each record type opts in explicitly in the plan; nothing is locked by surprise.

### 3. Being locked

- A locked record shows a lock with the reason: "Bloqueado: exportado a contabilidad el 05/11 (webhook)" or "Bloqueado: más de 30 días".
- Correcting a locked record is refused with the reason and who can unlock it.
- **Unlock**: an owner can unlock one record for one correction, with a required reason. The unlock and the correction are both audit-logged. Admins and staff cannot unlock.

### 4. Webhook

- An org API key (spec 121) with a `locks` scope can call one endpoint. It locks records up to a date, or a list of record ids, with a label ("Contabilidad", "Auditoría").
- Locks set by webhook can be lifted only by another webhook call or by the owner (audited).

### 5. Audit

Every lock, unlock and refused correction is logged: record, rule, actor (person, webhook key name, or system), reason and time. An owner can see the log in organization settings.

### Invariants

- A locked record never changes without an owner unlock that is logged.
- The default for a new org is "Al cerrar el mes" only, which is today's behaviour.
- Stock checkpoints (spec 135) are independent: a lock governs edits to records, while a checkpoint governs whether a stock quantity moves.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Purchase correction: month lock only (spec 124) → org policy (days, month, SUNAT, webhook) evaluated by one function | policy unit tests per rule and combination |
| Locked record: generic refusal → refusal naming the rule and who can unlock | route test |
| No unlock → owner one-shot unlock with reason, audited | service test; admin refused |
| No external lock → webhook endpoint with `locks` scope (by date or ids), audited | route test with an API key; wrong scope refused |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Lock after the accountant exports (Priority: P1)

The clinic's accounting tool calls the webhook after each monthly export. Purchases up to 31/10 become locked. An assistant who tries to correct a 15/10 purchase sees "Bloqueado: exportado a contabilidad el 05/11" and who can unlock it.

### User Story 2 — Lock by age (Priority: P2)

The owner sets "Después de 60 días". A purchase from 70 days ago cannot be corrected; one from 20 days ago can, with a reason and an audit row (spec 135).

### User Story 3 — One-time unlock (Priority: P2)

The owner unlocks one locked purchase to fix a typo, writing why. The correction goes through, and both the unlock and the correction appear in the audit log.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Owners MUST be able to enable and configure the lock rules (days, month close, SUNAT, webhook) per organization.
- **FR-002**: One server function MUST decide whether a record is locked and return every rule that applies.
- **FR-003**: Purchase corrections MUST be refused when locked, naming the rule and who can unlock.
- **FR-004**: Owners MUST be able to unlock one record for one correction with a reason; both events MUST be audit-logged.
- **FR-005**: An API key with a `locks` scope MUST be able to lock records up to a date or by ids, with a label; the call MUST be audit-logged.
- **FR-006**: New organizations MUST default to "Al cerrar el mes" only.

### Key Entities

- **Lock policy** (per org): enabled rules and their parameters.
- **External lock**: label, up-to date or record ids, key name, time.
- **Lock audit row**: record, rule, actor, action (lock, unlock, refused), reason, time.

## Success Criteria *(mandatory)*

- **SC-001**: No purchase changes after a lock applies without an owner unlock in the audit log.
- **SC-002**: An org can switch from month-only to "60 days + webhook" without code changes.

## Assumptions

- The SUNAT rule reuses the spec-120 definition of "emitted" (accepted, non-beta), plus `pos_period_locks` for the period.
- Slices after purchases (sales, manual entries) are planned here but each needs owner confirmation before it ships.
