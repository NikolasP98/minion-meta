---
'@minion-stack/crm-sdk': patch
'@minion-stack/db': patch
---

Stop treating a shared email address as person identity, add caller-keyed lead delivery idempotency, and require claimed DNI authority before enrichment writes. Add the missing Supabase migration for user-scoped channel ownership.
