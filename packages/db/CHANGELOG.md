# @minion-stack/db

## 0.3.0

### Minor Changes

- fb4ad05: Add `./pg` export: Postgres-dialect identity schema (`profiles`, `user_identities`) plus identity helpers (`mapGoogleIdentity`, `sealSecret`/`openSecret`) for the Supabase auth migration (Phase 1a). The crypto helper's byte layout matches `minion_hub`'s AES-256-GCM scheme so hub and the site decrypt identity secrets interchangeably.

## 0.2.0

### Minor Changes

- a247371: Initial release: Drizzle ORM schema for the Minion shared database (LibSQL/Turso). Exports schema types, relations, and utilities extracted from minion_hub.
