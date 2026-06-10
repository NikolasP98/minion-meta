---
"@minion-stack/db": minor
---

Add `gateway.org_id` (soft uuid ref → organizations.id) for server-token ingest tenant resolution, and make `built_agents.tenant_id` NOT NULL for the org-shared builder set. Companion org_guc RLS migrations for the hub tables ship separately in the hub repo. Additive to the `@minion-stack/db/pg` exports.
