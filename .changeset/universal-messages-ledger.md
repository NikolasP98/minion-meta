---
"@minion-stack/db": minor
---

Add the universal, org-scoped `messages` ledger table (Postgres) with database-enforced row-level security: a non-bypass `app_ledger` role plus an `app.current_org_id` GUC org-isolation policy (fail-closed). This is the canonical store every comms channel writes to via the gateway outbox → hub ingest path; channel-specific fields live in a `metadata` jsonb column.
