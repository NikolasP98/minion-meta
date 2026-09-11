# Migration drift gaps

Generated 2026-09-10T05:43:45.099Z by `node scripts/qc/migration-drift-gate.mjs`. Fail-closed preflight: recomputed fresh from the current filesystem, never from a cached document. 10 conflict(s) require an owned child plan before DATA-02 can close.

1. **legacy-libsql / two-writers-same-prefix** — numeric prefix `0012` independently owned by hub-legacy-drizzle, packages-db-legacy-drizzle, packages-db-legacy-drizzle
   - Owner: @minion-stack/db + minion_hub (Hub CLAUDE.md owns run-migrations.ts)
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `legacy-libsql`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
2. **legacy-libsql / two-writers-same-prefix** — numeric prefix `0013` independently owned by hub-legacy-drizzle, packages-db-legacy-drizzle, packages-db-legacy-drizzle
   - Owner: @minion-stack/db + minion_hub (Hub CLAUDE.md owns run-migrations.ts)
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `legacy-libsql`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
3. **legacy-libsql / two-writers-same-prefix** — numeric prefix `0014` independently owned by hub-legacy-drizzle, packages-db-legacy-drizzle
   - Owner: @minion-stack/db + minion_hub (Hub CLAUDE.md owns run-migrations.ts)
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `legacy-libsql`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
4. **legacy-libsql / two-writers-same-prefix** — numeric prefix `0015` independently owned by hub-legacy-drizzle, packages-db-legacy-drizzle
   - Owner: @minion-stack/db + minion_hub (Hub CLAUDE.md owns run-migrations.ts)
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `legacy-libsql`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
5. **hub-postgres / divergent-hash** — filename `20260610180600_pending_channel_claims.sql` hashes diverge across hub-supabase, meta-root-supabase
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
6. **hub-postgres / divergent-hash** — filename `20260611003100_org_areas.sql` hashes diverge across hub-supabase, meta-root-supabase
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
7. **hub-postgres / divergent-hash** — filename `20260611005800_org_areas_integrations.sql` hashes diverge across hub-supabase, meta-root-supabase
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
8. **hub-postgres / schema-gap** — table `organizations` has no CREATE in any inventoried hub-postgres tree
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
9. **hub-postgres / schema-gap** — table `flows` has no CREATE in any inventoried hub-postgres tree
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.
10. **hub-postgres / schema-gap** — table `organization_members` has no CREATE in any inventoried hub-postgres tree
   - Owner: minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner
   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for `hub-postgres`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.

## Serialization note

Per ROADMAP D360-06/phase10, any additive-SQL change to a conflicting schema must serialize with phase10's additive-only ownership; this gate does not itself apply or reconcile a migration.
