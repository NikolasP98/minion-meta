---
"@minion-stack/db": patch
---

Add `auth_ref` (explicit creds pointer) and `settings` jsonb to `channels` —
Phase 0 of the gateway.json → DB channel-config migration.

(This is the Supabase PG `channels` table — the legacy empty Turso `channels`
schema is removed separately in the dead-Turso-schema cleanup changeset.)
