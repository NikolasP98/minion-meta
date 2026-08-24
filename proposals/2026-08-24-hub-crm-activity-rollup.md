---
id: 2026-08-24-hub-crm-activity-rollup
title: Replace CRM per-request message aggregation with a validated incremental activity rollup
status: draft
created: 2026-08-24
updated: 2026-08-24
repos: [minion_hub]
tags: [crm, data, logic]
value: 7
effort: L
source: crm-customers-scale-next
---

# Replace CRM per-request message aggregation with a validated incremental activity rollup

## AS-IS

`rankContactsPage` still derives contact message counts and interaction timestamps from
`crm_contact_identities JOIN messages` on each cold query. The production covering index and
autovacuum tuning made that read acceptable, but the work still scales with ledger history.

The live `crm_contact_stats` object is a plain view, not a stored rollup. Its definition performs
the same identity-to-message aggregation and the only non-internal trigger on `messages` is the
Realtime broadcast trigger. Replacing the query with the view would therefore reorganize SQL
without reducing work.

A naive `AFTER INSERT ON messages` counter is incorrect in this system. Messages usually exist
before `syncContactsFromLedger` creates the matching contact identity, and `mergeContacts` later
moves identities from loser contacts to a survivor. An insert-only trigger would miss historical
messages and leave merged totals attached to the wrong contact.

## TO-BE

The CRM customer query reads an org-scoped, incrementally maintained activity projection whose
results are demonstrably identical to the current ledger aggregation. Message ingestion, delayed
identity creation, identity removal, and contact merging must preserve that parity without changing
the messages ledger or the hub's Postgres/RLS source-of-truth boundary.

## DELTA

- Add an org-scoped `crm_contact_activity_stats` table with message count, inbound/outbound count,
  channel count, first/last contact, and last inbound/outbound timestamps.
- Ship an idempotent rebuild function for a supplied contact-id set and a full-org backfill job.
- Refresh affected contacts after identity insert, update, or delete. Contact merge must rebuild
  the survivor and remove loser rows in the same transaction.
- Increment the table after newly inserted messages only when an identity already exists; use the
  rebuild path after post-ingest harvesting to cover the normal messages-before-identity order.
- Validate table-versus-live-query parity before switching `rankContactsPage`,
  `crm_contact_stats`, or detail/journey consumers to the table.
- Measure ingest write amplification and rank-query latency on a production-sized fixture. Keep
  the current indexed aggregation if the read gain does not justify the write cost.

## Definition of done

- Migration is additive, RLS is forced, and the backfill is resumable and idempotent.
- Fixtures cover: message before identity, message after identity, duplicate message upsert,
  identity reassignment during merge, identity deletion, bot exclusion, and multiple channels.
- A parity test compares every rollup field with the current live aggregation for all fixture
  contacts before the reader is switched.
- Production dry-run reports zero parity mismatches and records p50/p95 cold rank-query timing plus
  message-ingest overhead.
- Rollback is a reader-only switch back to the indexed live aggregation; no source ledger data is
  removed.

## Out of scope

Finance rollups, DuckDB adoption, and replacing Postgres as the transactional source of truth.
