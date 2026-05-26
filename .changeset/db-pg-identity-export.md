---
"@minion-stack/db": minor
---

Add `./pg` export: Postgres-dialect identity schema (`profiles`, `user_identities`) plus identity helpers (`mapGoogleIdentity`, `sealSecret`/`openSecret`) for the Supabase auth migration (Phase 1a). The crypto helper's byte layout matches `minion_hub`'s AES-256-GCM scheme so hub and the site decrypt identity secrets interchangeably.
