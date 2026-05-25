# Auth → Supabase Cloud + PG-First Data Migration

**Date:** 2026-05-25
**Status:** Draft (design approved in brainstorm; pending spec review)
**Supersedes direction of:** the unwritten "promote Better Auth into a standalone IdP" recommendation (user chose Supabase instead)
**Related:** `specs/2026-05-24-unified-user-identities-design.md` (credential vault / `user_identities` this builds on), `specs/2026-05-24-unified-user-identities-p3-wiring-plan.md`
**Subprojects touched:** `packages/db` (PG schema + migrations), `packages/auth` (retired/replaced), `minion_hub`, `minion_site` (auth clients + queries), `minion` (gateway JWKS verify + credential broker)
**Supabase project:** `gxvsaskbohavnurfvshr` (`https://gxvsaskbohavnurfvshr.supabase.co`) — Cloud/managed, 50k MAU free tier

## Problem

Minion auth is a **library, not a service**. `@minion-stack/auth` is a Better Auth *factory* (`packages/auth/src/factory.ts`) mounted in-process by hub and site as SvelteKit route handlers, both pointing at one shared Turso (libsql/SQLite) DB. Hub additionally runs the `oidcProvider` and issues EdDSA JWTs (`audience: openclaw-gateway`, 1h, issuer = baseURL); the gateway verifies them via JWKS (`minion/src/gateway/auth/auth-jwt.ts`, `minion/src/users/user-jwt.ts`, `minion/src/auth/delegation-token.ts`). Auth therefore only exists where a SvelteKit server runs, is duplicated across two apps, and concentrates no secret material in one hardened place.

The user wants **all auth to be a self-contained microservice**, and has chosen **Supabase Cloud** as the platform, **PG-first** for data.

## Goals (the four drivers)

1. **Single source of truth** — one service owns identity, sessions, tokens; everyone else is a client.
2. **Security isolation** — secret material (signing keys, refresh tokens) concentrated in one hardened, purpose-built service.
3. **Independent deploy/scale** — auth deploys and scales on its own, decoupled from hub/site Vercel deploys and the gateway VPS lifecycle.
4. **Decouple from SvelteKit** — auth is language-agnostic HTTP, usable uniformly by gateway, paperclip, and future clients.

## Decisions (resolved during brainstorm)

| Decision | Choice | Rationale |
|---|---|---|
| Platform | **Supabase Cloud (managed GoTrue)** | Purpose-built auth microservice; 50k MAU free tier; OAuth 2.1 server fits "apps as clients"; PG unlocks RLS. User chose over "promote Better Auth" (which was the lower-migration-risk option). |
| Session model | **Central auth server, apps are clients** | True SSO; apps redirect to IdP, exchange code → session. |
| Data layer | **Single datastore: Supabase Postgres** (all 39 tables) | Volume is modest/unknown; a two-DB split would fight the single-source-of-truth driver and add lost atomicity + app-layer joins + dual tooling for unmeasured throughput gains. "Make it work, then make it fast." |
| Turso | **Retired from runtime; documented escape hatch only** | Demote a specific table to a dedicated Turso DB *only* when measured write contention demands it (criteria below). |
| Migration pipeline | **A: Drizzle authors → emits SQL → Supabase applies** | Keeps the existing Drizzle/TS-first workflow + typed client; gains Supabase CI + per-PR preview branches. RLS/partitioning authored as hand-written SQL migrations alongside. |
| Gateway role | **Resource server, not a Supabase client** | Verifies JWTs (JWKS) + brokers credential fetch via hub; **service-role key never on the VPS.** Minimizes blast radius. |
| Mongo / NoSQL | **Rejected** | Data is relational and joined; auth forces PG anyway; JSONB columns cover any schemaless need without a third engine. |

## Architecture

```
            ┌────────────────────────────────────────────────┐
            │  Supabase Cloud  (gxvsaskbohavnurfvshr)          │
            │  ┌────────────┐   ┌────────────────────────────┐│
            │  │ GoTrue IdP │   │ Postgres — single datastore ││
            │  │ auth.users │   │  public.* (39 app tables)   ││
            │  │ OAuth 2.1  │   │  + RLS (from workspace_*)   ││
            │  │ JWKS       │   │  + partitioned event tables ││
            │  └─────┬──────┘   │  user_identities (vault)    ││
            │        │          └────────────────────────────┘│
            └────────┼─────────────────────────────────────────┘
   OIDC (auth code)  │  JWT (EdDSA or ES256, verified via JWKS)
   ┌─────────────────┼───────────────────┬───────────────────┐
   │                 │                   │                   │
┌──▼───┐         ┌───▼───┐           ┌───▼────┐         ┌─────▼────┐
│ hub  │         │ site  │           │gateway │         │paperclip │
│client│         │client │           │resource│         │ client   │
│@supa │         │@supa  │           │ server │         │          │
│/ssr  │         │/ssr   │           │JWKS +  │         │          │
└──────┘         └───────┘           │broker  │         └──────────┘
                                     └────────┘
  Migrations: packages/db (Drizzle) ──drizzle-kit generate──▶ supabase/migrations/*.sql
              ──Supabase GitHub integration──▶ apply to prod + preview branch per PR
```

Three roles: **Supabase** = central IdP + sole relational store; **apps** = OIDC clients + PG readers/writers; **gateway** = thin JWT resource server + hub-brokered credential consumer.

## Data layer — single Postgres

All 39 tables move to Supabase Postgres. The previously-contemplated 29-PG / 10-Turso split is **dropped** in favor of one store.

- **`@minion-stack/db` becomes single-dialect PG.** Port every `sqliteTable` → `pgTable`; SQLite→PG type mapping (text→text, integer timestamps→`timestamptz` or `bigint`, JSON text→`jsonb` where appropriate); the typed Drizzle client stays the query layer for hub/site.
- **High-write event tables get declarative partitioning** (time-ranged): `connection_events`, `reliability_events`, `unified_events`, `gateway_heartbeats`, `activity_bins`, `credential_health`, `skill_execution_stats`. Pair with a retention/drop-old policy (e.g. `pg_partman` or scheduled partition drops). This is how PG absorbs the volume Turso was meant to handle.
- **RLS from day one**, derived from `workspace_membership` — authorization pushed into the database as defense-in-depth, not only app-layer checks.
- **JSONB** for any genuinely schemaless field (config blobs, flexible event payloads, agent metadata).

### Auth schema ownership

GoTrue **owns the `auth` schema** — Supabase manages those migrations. Drizzle **excludes `auth.*`** and treats `auth.users.id` as a read-only foreign reference. `public.profiles` (app-facing user fields) FKs to `auth.users.id`. We never generate or alter `auth` tables.

### Connection pooling (Vercel serverless)

Hub/site run serverless on Vercel → many short-lived connections. Use **Supabase Supavisor**:
- **Runtime (hub/site):** pooled DSN, port **6543**, transaction mode. Drizzle configured **without named prepared statements** (incompatible with transaction pooling) — `prepare: false` on the postgres-js client.
- **Migrations:** direct DSN, port **5432**.

## Migration pipeline — Drizzle authors, Supabase applies (Option A)

- `packages/db` remains the schema source of truth in TypeScript.
- `drizzle-kit generate` emits SQL into a root-level **`supabase/migrations/`** directory (with `supabase/config.toml`). The meta-repo is the repo Supabase attaches to (it tracks `packages/`).
- **RLS policies + partitioning DDL** are authored as hand-written SQL migrations in the same directory (Drizzle can't express them).
- The **Supabase GitHub integration** applies migrations to production on merge and creates an **ephemeral preview database per PR** (Supabase Branching) with migrations + seed applied — complements the existing meta-repo `ci.yml`.
- Discipline: schema changes flow `edit Drizzle schema → generate SQL → commit → PR → preview branch verifies → merge applies to prod`.

## Auth — GoTrue as central IdP

- **Apps become `@supabase/ssr` clients** (SvelteKit): redirect-based login against the Supabase project; session via Supabase cookies/JWT. Better Auth client/factory usage in hub + site is removed; `@minion-stack/auth` is retired (or reduced to a thin Supabase wrapper).
- **OAuth 2.1 server / OIDC**: Supabase issues the JWTs the gateway already expects. Configure the project's signing keys to **EdDSA** if supported (so the gateway's existing EdDSA verify is unchanged) — else **ES256/RS256** with a claim-mapping update in `auth-jwt.ts`/`user-jwt.ts`. Issuer/JWKS URL point at the Supabase project's `/auth/v1/.well-known/jwks.json`.
- **Org / multi-tenant** (`workspace_membership`) is modeled in PG + enforced via RLS (no Better Auth `organization` plugin equivalent).
- **Credential vault** (`user_identities`, encrypted Google refresh tokens): rows live in PG. Encryption either via the existing AES-256-GCM scheme (portable, no new dep) **or** Supabase Vault — decided in Phase 1 planning. **Hub remains the sole key broker**; the gateway fetches credentials over the authenticated WS as today (no service-role key on the VPS).

### User migration (the sharp edge)

- **Google OAuth users** carry over cleanly (no password hash).
- **Email/password users**: import into GoTrue with a placeholder, store the legacy Better Auth scrypt hash aside, and install a **GoTrue password-verify auth hook** that on first login verifies against the legacy scrypt hash (reimplementing Better Auth's exact scrypt params — to be confirmed from better-auth source during Phase 1 planning) and transparently re-hashes to bcrypt. **No forced password resets.**

## Gateway — thin resource server

- Continues to **verify** JWTs via JWKS; only the issuer/JWKS URL (and possibly the algorithm/claim mapping) changes.
- Continues to **broker** credential fetches through hub over the authenticated WS.
- **Never holds the Supabase service-role key.** This is the single most important safety constraint in the design.

## Decomposition — 2 phases

### Phase 1 — Auth IdP cutover (strangler-fig)
1. Stand up GoTrue config on the Supabase project (providers: email/password + Google; signing keys; OAuth clients for hub + site).
2. Add `@supabase/ssr` to site; implement redirect login **behind a flag**, running alongside the existing embedded Better Auth path.
3. Migrate users (Google carries over; email/password via lazy scrypt-verify hook).
4. **Cut over site first, then hub** to Supabase login; keep the embedded path as instant rollback.
5. Repoint the gateway JWKS verify at the Supabase issuer (**last**).
6. Bring `user_identities` vault to PG; keep hub as key broker.
7. Establish the RLS foundation from `workspace_membership`.
8. Decommission embedded Better Auth only after both apps run green on the IdP for a sustained window.

### Phase 2 — Full data migration to PG
1. Restructure `@minion-stack/db` to single-dialect PG (port all 39 `sqliteTable` → `pgTable`).
2. Author partitioning + RLS as hand-written SQL migrations.
3. Wire the `supabase/` dir + GitHub integration + Branching.
4. Configure Supavisor pooling (runtime vs migration DSNs; `prepare: false`).
5. Backfill data Turso → Postgres.
6. Update hub/site queries for PG (native joins now available).
7. Retire Turso from the runtime; leave the schema package structured so a table *could* later be split back out.

## Escape hatch — Turso (documented, not built)

If a table later shows **measured** write contention, demote it to a dedicated Turso DB. Qualifying criteria — all three must hold: (a) losing a write silently is tolerable, (b) never in a transaction with a PG row, (c) never joined at read time. When demoting: make event rows **self-contained** (denormalize the entity labels reported on — no cross-DB joins), batch the writer (buffer + async flush), set a TTL.

## Risks / honest flags

- **User/password migration** is the sharpest edge — the scrypt-verify hook must replicate Better Auth's exact params; verify before writing it.
- **Vendor lock-in** to Supabase Auth (RLS, GoTrue, supabase-js) is deeper than Better Auth was — accepted.
- **50k MAU free-tier ceiling**; beyond it is paid.
- **Single DB** means event-write volume must stay within partitioned-PG capacity; the Turso escape hatch covers the tail risk.
- **MCP safety:** `.mcp.json` was repointed from `fsdaqawhzvlphcbxzzji` (a different, populated project — the facesculptors clinic app) to `gxvsaskbohavnurfvshr`. Never run Minion DDL against the clinic project.

## Open items to confirm during Phase 1 planning

- Does the Supabase project support **EdDSA** signing keys (keeps gateway verify unchanged), or do we map to ES256/RS256?
- Better Auth's exact scrypt parameters (N, r, p, keylen, salt encoding) for the verify hook.
- Vault choice for `user_identities`: existing AES-256-GCM vs Supabase Vault.
- Seed strategy for Supabase preview branches.
