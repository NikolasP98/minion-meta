---
"@minion-stack/db": patch
---

Scope message-ledger idempotency to `(org_id, client_id)` so the same channel message can be imported independently by multiple organizations.
