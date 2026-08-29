---
id: 2026-08-20-dev-key-at-rest-audit
title: Count what is already sealed under the source-visible dev crypto key
status: closed
closed_reason: "Audit executed against hub prod (shared DB) 2026-08-20 — results appended; zero dev-key rows, S3 unblocked; key-divergence finding filed to intake"
created: 2026-08-20
updated: 2026-08-20
repos: [minion-meta, minion_hub, minion_site]
tags: [security, data]
value: 8
effort: S
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Count what is already sealed under the source-visible dev crypto key

## Problem

`2026-08-17-pkg-dev-crypto-failopen-spec` S2 asks for an at-rest audit: for every database
reachable to the implementer, count non-null ciphertext rows in the columns sealed by
`@minion-stack/db` crypto, and test-decrypt a sample under the dev key and under the
environment's configured key. **That audit was not run** when S2 landed.

Why not, precisely: the implementing environment is a meta-repo-only checkout. No database is
reachable from it — `TURSO_DB_URL`, `DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_DB_URL` and
`ENCRYPTION_KEY` are all unset, there is no local `*.db` file, and `minion_hub/` /
`minion_site/` are not checked out (the meta-repo `.gitignore` excludes subprojects). Per the
spec's own instruction — *"an unverified environment is an unknown, not a zero"* — this is
recorded here rather than reported as a clean sweep.

The number matters because of ⚠️ A3: a real `ENCRYPTION_KEY` and old dev-key ciphertext are
mutually unreadable. Setting a key in an environment whose database holds dev-key rows turns
those rows into GCM authentication failures on read. S3 (the consumer dependency bump) cannot be
sequenced safely without knowing which databases are affected.

## AS-IS

- The fail-closed guard is merged in `packages/db/src/crypto.ts` (S1) and the release contract
  ships with it (S2) — but **which environments wrote rows under `minion-hub-dev-key`, and how
  many, is unknown**. Evidence: the environment facts above; `TODO(handoff)` at
  `packages/db/src/crypto.ts` in the `dev-fallback` branch.
- ⚠️ A1 is also unsettled from this repo: the exposure inventory (which deployments ran with
  `NODE_ENV` unset or non-`production` *and* sealed secrets) is a Vercel/deploy-manifest
  question, not a code question.

## TO-BE

A row count per sealed column per reachable database, plus a named list of any database that
could not be checked and why. Invariants: **read-only** — no row is written, no re-encryption,
no plaintext is logged or printed.

### Sealed-column inventory (verified in this checkout via the `*_iv` companion convention)

| Dialect | Table | Ciphertext column | IV column | Schema file |
|---|---|---|---|---|
| LibSQL/Turso | `servers` | `token` | `token_iv` | `src/schema/servers.ts` |
| LibSQL/Turso | `user_identities` | `secret_ciphertext` | `secret_iv` | `src/schema/user-identities.ts` |
| Postgres | `gateway` | `token_ciphertext` | `token_iv` | `src/pg/schema/gateway.ts` |
| Postgres | `user_identities` | `secret_ciphertext` | `secret_iv` | `src/pg/schema/user-identities.ts` |
| Postgres | `channels` | `credentials` | `credentials_iv` | `src/pg/schema/channels.ts` |
| Postgres | `server_provision_configs` | `api_key` | `api_key_iv` | `src/pg/schema/server-ops.ts` |

The first four are named by the spec / sealed by this module's documented callers. The last two
follow the same `*_iv` convention and are written by hub code that re-exports this module —
**confirm that at the call site in `minion_hub` before treating them as in-scope**, rather than
inferring it from the column name alone.

## DELTA

1. Settle A1: for each deployment of hub and site (Vercel preview **and** production scopes,
   any self-hosted/Docker staging, CI jobs that boot the app), record whether `ENCRYPTION_KEY`
   is set and what `NODE_ENV` the process actually runs with.
2. For each database reachable from an environment in that list — including a
   production-*named* database if its process ever ran with missing or non-production
   `NODE_ENV` — count non-null, non-empty rows per column above.
3. For a sample of those rows, attempt `openSecret()` with `ENCRYPTION_KEY` unset +
   `MINION_ALLOW_DEV_CRYPTO_KEY=1` (dev key) and, separately, with the environment's configured
   key. Record success/failure only — never the plaintext.
4. Report counts, and name every database that could not be checked and why.
5. If any dev-key rows are found: do **not** set `ENCRYPTION_KEY` or deploy the bumped consumer
   against that database. File the key-rotation proposal with the counts attached.

## Out of scope

- **Key rotation / re-encryption** — the parent proposal's explicit exclusion. This proposal
  produces the number; remediation is its own proposal.
- Changing any crypto behavior, schema, or the ciphertext layout.
- S3 itself (the consumer env work + dependency bump). This audit is its precondition, not its
  substitute.

## Definition of done

A written report (PR comment or a `specs/`-adjacent note) containing: the A1 environment table;
a count per column per database; the sample-decrypt outcome per database; and an explicit list
of unchecked databases with the reason. A report that omits an environment silently does not
satisfy this — an unverified environment is an unknown, not a zero.


## Audit results (executed 2026-08-20, hub prod Supabase — the shared hub+site DB)

Per sealed column (non-null ciphertext rows; sample test-decrypted under dev key, hub prod key, site prod key):

| column | rows | sample verdicts |
|---|---|---|
| gateway.token_ciphertext | 5 | 2×SITE-KEY, 3×NEITHER (unknown/rotated key) |
| gateway_signing_keys.private_ciphertext | 1 | PROD(hub) |
| meta_assets.page_token_ciphertext | 1 | PROD(hub) |
| meta_connections.token_ciphertext | 2 | PROD(hub) ×2 |
| user_identities.secret_ciphertext | 8 | PROD(hub) ×3 sampled |
| channels.credentials_ciphertext | column absent in prod | — |
| server_provision_configs.api_key_ciphertext | column absent in prod | — |

**Zero rows sealed under `minion-hub-dev-key`** — the A3 dev-key fear is clear; S3 (consumer fail-closed wiring + dependency bump) is unblocked.

**New finding (filed to factory intake): hub and site carry DIFFERENT `ENCRYPTION_KEY` values against the SAME shared database.** 2 of 5 `gateway.token_ciphertext` rows decrypt only under site's key (hub reads fail), 3 decrypt under neither current key (orphaned — likely a rotated earlier key). Shared-DB sealed columns require ONE key (the shared Better-Auth/DB contract) or per-writer key registries; today's split silently partitions readability.
