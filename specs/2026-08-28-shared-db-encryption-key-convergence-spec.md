---
id: 2026-08-28-shared-db-encryption-key-convergence-spec
title: Converge Hub and Site shared-database encryption with an explicit legacy-key migration
stage: spec
status: draft
pass: 1
created: 2026-08-28
updated: 2026-08-28
proposal: 2026-08-28-shared-db-encryption-key-convergence
verdict: pending
repos: [minion-meta, minion_hub, minion_site]
tags: [security, data, migrations, logic, test]
type: fix
relationship: extends
related: [2026-08-17-pkg-dev-crypto-failopen-spec, 2026-08-20-dev-key-at-rest-audit]
---

# Converge Hub and Site shared-database encryption with an explicit legacy-key migration

**Owner surface:** `packages/db/src/crypto.ts` + `packages/db/src/pg/crypto.ts` (the single
key-derivation path, extended with a key id and a migration-only legacy ring), every PG schema
file in `packages/db/src/pg/schema/` that carries an app-encrypted column, and a new migration
command. **Consumer surface:** `minion_hub` and `minion_site`, which both read/write the shared
Supabase database through this module and must attest the same active key.

**Relationship to existing artifacts (recommend-only):**

- **extends** [`2026-08-17-pkg-dev-crypto-failopen-spec`](2026-08-17-pkg-dev-crypto-failopen-spec.md)
  — same owner file (`packages/db/src/crypto.ts`), same `cryptoKeyMode()`/`sealSecret`/`openSecret`
  surface. That spec's S1+S2 shipped (fail-closed dev key, `assertCryptoKeyConfigured()`,
  changeset `db-crypto-fail-closed-dev-key.md`, package still `0.9.4`); its S3 (consumer boot-time
  assertion + dependency bump in hub/site) is recorded unlanded via the `TODO(handoff):` markers at
  `packages/db/src/crypto.ts:73-90` and its own `reconcile_ignore_reason`. Its §4 already named the
  exact fact this proposal now legislates — *"hub and site share a database and must derive the
  same key or they cannot read each other's rows"* — but treated that as a **rollout-mode**
  concern (pick one mode, one key, per shared-DB group) with no key-id, no ring, and no migration
  of rows already split across two keys. This spec is the direct continuation: it adds the id/ring/
  migration machinery the prior spec explicitly excluded ("no re-encryption... key rotation is out
  of scope" — its §5) and that S3 cannot safely proceed without, per its own ⚠️A3.
- **related** (evidence, not extended) [`2026-08-20-dev-key-at-rest-audit`](../proposals/2026-08-20-dev-key-at-rest-audit.md)
  — closed proposal; its executed audit (2026-08-20, hub prod Supabase) is the AS-IS evidence this
  spec's Problem section quotes verbatim (5 `gateway.token_ciphertext` rows, 2 site-only, 3
  unreadable by either current key; the "hub and site carry DIFFERENT `ENCRYPTION_KEY`" finding
  filed to intake is what became this proposal). Nothing further to extend — the finding was
  already consumed into the approved proposal this spec implements.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — `security` and `data` tags mean **human gates at approval AND merge**, and the score can warn
but never auto-pass, regardless of how green the command lists below come back. This spec also
carries `migrations`, `logic`, `test` — no tag implies design/token lint on slices that touch zero
`.svelte` files (only S6 does).

**Branch note (verify before opening any hub PR):** AGENTS.md's project map lists `minion_hub` on
branch `dev`, but the `hub-deploy-workflow` operator memory (★★★, 2026-08-16) records `dev` was
**deleted** (PR #83) and hub now branches off `master`; `2026-08-13-crm-customers-server-pagination-spec`
independently reports the same. Trust `git -C minion_hub branch -r` over the table in every slice
below that touches hub.

---

## 0. Product

From the approved proposal `2026-08-28-shared-db-encryption-key-convergence`, verbatim:

> ## Decision
>
> Hub and Site share one database and therefore must use one active key for new ciphertext.
> Do not preserve the current per-writer key split. Add an explicit, bounded legacy-key ring only
> for migration reads, identify ciphertext by key id, re-seal every row readable by a known legacy
> key under the shared active key, and then remove legacy write authority.
>
> Ciphertext that cannot be opened by any explicitly configured legacy key is not guessed, erased,
> or reported as migrated. Quarantine the affected credential record and require the owner to
> re-enter or rotate that credential.

And the audit finding that triggered it (`2026-08-20-dev-key-at-rest-audit`, executed against hub
prod Supabase — the shared hub+site DB):

> Per sealed column... `gateway.token_ciphertext` | 5 rows | 2×SITE-KEY, 3×NEITHER (unknown/rotated
> key)... **New finding: hub and site carry DIFFERENT `ENCRYPTION_KEY` values against the SAME
> shared database.** 2 of 5 rows decrypt only under site's key (hub reads fail), 3 decrypt under
> neither current key (orphaned).

## 1. AS-IS → TO-BE → DELTA

### AS-IS (verified in this checkout)

- `packages/db/src/crypto.ts:34-96` derives exactly **one** key per process from
  `scryptSync(ENCRYPTION_KEY, 'minion-hub-salt', 32)` (or the gated dev-fallback). There is **no
  key id concept anywhere in this module or its callers** — `sealSecret()` returns
  `{ ciphertext, iv }` only, and `openSecret(ciphertext, iv)` always tries the *one* key the
  calling process happens to have configured. `openSecret` cannot select a key; a wrong key is a
  GCM auth-tag failure, indistinguishable at the call site from "this ciphertext is corrupt."
- `packages/db/src/pg/crypto.ts` is a stable re-export of the same module (no PG-specific logic).
- Sealed-column inventory verified in this checkout by the `*_iv`/`*Iv` companion convention (no
  `key_id` companion exists on any of them today):
  | Table (file) | Ciphertext col | IV col |
  |---|---|---|
  | `gateway` (`pg/schema/gateway.ts:20-21`) | `token_ciphertext` | `token_iv` |
  | `user_identities` (`pg/schema/user-identities.ts:20-21`) | `secret_ciphertext` | `secret_iv` |
  | `channels` (`pg/schema/channels.ts`, `credentials`/`credentialsIv` cols) | `credentials` | `credentials_iv` |
  | `server_provision_configs` (`pg/schema/server-ops.ts`, `apiKey`/`apiKeyIv`) | `api_key` | `api_key_iv` |
  | `servers` (LibSQL, `schema/servers.ts:10-11`) | `token` | `token_iv` |
- **⚠️ Confirmed schema drift, both directions — S0 must resolve before S1 finalizes the column
  list:**
  1. The 2026-08-20 audit test-decrypted rows in `gateway_signing_keys.private_ciphertext`,
     `meta_assets.page_token_ciphertext`, and `meta_connections.token_ciphertext` against hub
     **prod**. None of these three tables exist anywhere in this checkout's
     `packages/db/src/pg/schema/`. Either hub owns a schema/migration path for them that this
     package never mirrored, or they are sealed by code outside this module entirely (a
     byte-compatible but separately-implemented seal). Either way, "every app-encrypted column"
     (TO-BE, below) is **not yet a closed list** from this repo alone.
  2. The same audit reports `channels.credentials_ciphertext` and
     `server_provision_configs.api_key_ciphertext` **absent in prod** even though both are defined
     in this checkout's schema — i.e. drift in the opposite direction (schema ahead of deployed
     DDL). These two are out of migration scope until they exist in prod (nothing to migrate).
- No `credential_reentry_required` state, typed or otherwise, exists anywhere in this checkout —
  confirmed by `grep -rn "credential_reentry_required" packages/ specs/` returning zero hits.
- No key-ring, legacy-key, or migration-command code exists (`grep -rn "keyRing\|legacyKey\|key_id"
  packages/db/src` returns zero hits beyond this spec).
- Hub's actual DDL apply path (`2026-07-07-hub-db-migration-pipeline`, shipped) is hub-owned,
  hand-written idempotent SQL in `minion_hub/supabase/migrations/*.sql`, applied by
  `scripts/db-migrate.ts` against a `public.hub_migrations` ledger, gated on the Vercel
  **production** build (`vercel-build = db:migrate && build`) — **not** `drizzle-kit push`
  (per the `hub-db-schema-management` operator memory: "NEVER drizzle-kit push"). Any schema slice
  below that adds a `key_id` column must produce a file in that directory, not a Drizzle push.
- A reproducible isolated test environment exists and is proven: the `hub-local-qa-stack-recipe`
  operator memory (verified 2026-08-19, ran a full POS/SUNAT UI e2e) documents cloning hub prod's
  schema (`pg_dump --schema-only`) onto local Supabase (ports 54321/54322), re-granting
  `anon`/`authenticated`/`service_role`/`app_ledger`, and seeding a QA org — this is the sanctioned
  place to run S4/S5's integration tests against realistic (not synthetic) row shapes, never
  against hub prod directly.

### TO-BE (target behavior + invariants — quoted from the proposal, restated as system properties)

- Every newly sealed shared-database value carries a non-secret **active key id** alongside its
  ciphertext; no application chooses a writer-specific key.
- `openSecret`-family reads select the key **by the row's recorded id**; an ordinary request never
  iterates a key ring. A wrong or missing key id fails closed.
- A **migration-only** key ring (explicit legacy key ids → key material) exists solely for the
  bounded migration command; it is never consulted on an ordinary read/write path.
- Rows unreadable by every explicitly configured legacy key become a typed
  `credential_reentry_required` state — ciphertext preserved, never guessed/erased/reported-migrated.
- Hub and Site fail closed at startup when their active key id/fingerprint diverge for the same
  database environment.
- The existing AES-256-GCM byte layout (`scryptSync(key,'minion-hub-salt',32)`,
  `hex(encrypted||authTag)`, 12-byte IV) is unchanged; only a key-id companion is added alongside it.
- No plaintext, key material, ciphertext, IV, or auth tag ever reaches logs, migration reports, or
  this repo.

### DELTA (numbered transitions → slice → proving test)

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| 1 | Extend every app-encrypted column with a `key_id` companion; add typed `credential_reentry_required` state; close the schema-drift unknown above | S1 | Schema unit test asserts `key_id` NOT NULL-after-backfill on each column; hub SQL migration applies cleanly on the QA-stack clone; S0 recon note resolving the 3 unmirrored prod tables attached to the PR |
| 2 | `sealSecret` writes the active key id; `openSecret` opens only the row's declared id; narrow migration-only legacy-ring API added | S2 | Crypto unit tests: active-key write, declared-legacy-key read, unknown key id (typed error, no fallback), GCM auth failure, idempotent re-seal retry, cross-app (hub↔site) roundtrip |
| 3 | Hub and Site attest the same active key id/fingerprint at boot for the same DB env; diverge ⇒ fail closed | S3 | Boot test: same id/fingerprint on both ⇒ both start; either differs ⇒ both refuse to start with a named error |
| 4a | Read-only dry-run inventory: counts by table × key-classification (active / each named legacy id / unreadable), no plaintext, no row touched | S4 | Integration test against the QA-stack clone with seeded mixed rows; report asserted byte-for-byte free of plaintext/ciphertext/key material |
| 4b | Bounded, resumable, idempotent re-seal of every row readable by a named legacy key; unreadable rows become `credential_reentry_required`, never touched destructively | S5 | Integration tests: mixed hub/site legacy rows, already-migrated rows (idempotent no-op), simulated crash between batches (resumes from checkpoint, no double-seal), rollback executed before cutover (source rows intact), unreadable row preserved verbatim |
| 5 | Reader compatibility ships first; migration runs; both deployments converge on the active key id/fingerprint; legacy write authority and migration keys are removed only after the rollback window | S7 | Production dry-run report (row counts by table/classification) attached to the PR; supervised backup + migration execution log; post-migration decrypt verification report; final zero-legacy-readable-row report before legacy-key removal |
| 6 | `credential_reentry_required` disables the affected gateway connection and exposes an owner-facing rotation path | S6 | Service-level test: a connection whose row is quarantined is excluded from active-connection queries; hub UI smoke check shows the rotation affordance (governed by `ui-design-governance`) |

## 2. Approach — vertical slices

```
S0 (recon, uncounted) ─▶ S1 (schema+state) ─▶ S2 (crypto core+ring) ─▶ S3 (boot attestation)
                                                    │
                                                    ▼
                                    S4 (dry-run inventory) ─▶ S5 (bounded re-seal)
                                                    │
                                                    ▼
                                    S6 (reentry-required app behavior) ─▶ S7 (supervised rollout)
```

S1–S3 are meta-repo/`@minion-stack/db`-only and can land without hub/site checked out, mirroring
the precedent in `2026-08-17-pkg-dev-crypto-failopen-spec` (its ⚠️A2). S4–S7 need real access to
the shared database (via the QA-stack clone for tests, and supervised prod access for S7) and, for
S3's consumer half and S6, the `minion_hub`/`minion_site` working trees — **if those are not
checked out in the implementing session, land S1/S2 (the package-only halves), stop, and file the
AGENTS.md open-items ledger entry** (`TODO(handoff):` in `crypto.ts` + an appended note on the
source proposal) naming exactly which slices are blocked and why, rather than guessing at hub/site
internals from this repo.

### Slice 0 — recon (≤ 60 min, prepend to S1, not counted as a slice)

**Topics:** `security`, `data`

```bash
cd /home/agent/work
# resolve the schema-drift unknown (AS-IS ⚠️) before touching any schema file
rg -n 'gateway_signing_keys|meta_assets|meta_connections' packages/ minion_hub/src minion_hub/supabase 2>/dev/null
# confirm hub's live branch (do not trust AGENTS.md's table — see Branch note above)
git -C minion_hub branch -r 2>/dev/null || echo "minion_hub not checked out — note in PR"
git -C minion_site branch -r 2>/dev/null || echo "minion_site not checked out — note in PR"
# confirm no key-id/ring code already exists under a different name
rg -n 'keyRing|legacyKey|key_id|keyId|credential_reentry' packages/db/src minion_hub/src minion_site/src 2>/dev/null
# confirm hub's actual migration ledger convention still matches the 2026-07-07 design
cat minion_hub/scripts/db-migrate.ts 2>/dev/null | head -40
```

Record the three-table drift resolution and the hub/site branch facts in the PR description before
S1 changes any file.

---

### S1 — Schema: key-id companion + `credential_reentry_required` state

**Tags:** `data`, `migrations` · **Estimate:** 6–8 h · **Repos:** `minion-meta`, `minion_hub`

**Topics:** `data`, `migrations`

**Goal:** every app-encrypted column gains a nullable `key_id` companion (nullable so existing rows
are legal pre-migration) and a place to record `credential_reentry_required` without deleting the
original ciphertext.

**Do:**

- Add `keyId: text('key_id')` (nullable) next to each `*_ciphertext`/`*_iv` pair identified in
  AS-IS, in both `packages/db/src/pg/schema/*.ts` (Drizzle type-level model) **and** a new
  hand-written SQL file in `minion_hub/supabase/migrations/` (`ALTER TABLE ... ADD COLUMN key_id
  text`), following the existing idempotent-migration style (`IF NOT EXISTS`) so a re-run is a
  no-op — do **not** use `drizzle-kit push`.
- Add a `credentialStatus` (or per-table equivalent) enum/text column with at minimum `'active'`
  and `'credential_reentry_required'`, defaulting to `'active'`, on every table above that backs a
  live credential a user can rotate (`gateway`, `user_identities` — confirm `channels` and
  `server_provision_configs` need it too once S0 resolves whether they hold live, rotatable
  credentials or provisioning-time secrets).
- Resolve the S0 schema-drift finding: either add schema files for the three prod-only tables (if
  S0 finds they belong to this module's contract) or document in the PR, with evidence, that they
  are out of this migration's reach and file the follow-up per the AGENTS.md ledger rule.
- Do not backfill `key_id` here — that is S5's job under a migration, not a schema-time default.

**Files:** `packages/db/src/pg/schema/gateway.ts`, `user-identities.ts`, `channels.ts`,
`server-ops.ts`, `packages/db/src/schema/servers.ts` (LibSQL side, if S0 confirms it is still
written to), `minion_hub/supabase/migrations/<timestamp>_add_key_id_and_reentry_state.sql`.

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run          # schema shape unit tests: key_id nullable, credentialStatus default 'active'
cd ../../minion_hub && bun run db:status   # new migration listed pending, not yet applied
# on the QA-stack clone (hub-local-qa-stack-recipe), NOT prod:
FORCE_DB_MIGRATE=1 bun run db:migrate      # applies cleanly, idempotent on second run
```

---

### S2 — Crypto core: active key id + narrow migration-only legacy ring

**Tags:** `security`, `logic`, `test` · **Estimate:** 6–8 h · **Repos:** `minion-meta`

**Topics:** `security`, `logic`, `test`

**Goal:** `sealSecret` records which key sealed a value; `openSecret` opens only that declared key;
a separate, narrowly-scoped module lets the migration command (and nothing else) try named legacy
keys.

**Do:**

- Introduce a stable, non-secret **active key id** (an env var, e.g. `ENCRYPTION_KEY_ID`, resolved
  alongside `ENCRYPTION_KEY` — never derived from the key material itself, so it can be attested
  without exposing a fingerprint of the secret).
- Change `sealSecret()` to return `{ ciphertext, iv, keyId }` (additive — existing callers that
  ignore the third field keep compiling; S1's schema makes room for it).
- Change `openSecret()` to require the row's declared `keyId` and open **only** with the key that
  id maps to: the active key if `keyId` matches `ENCRYPTION_KEY_ID`, otherwise throw a typed,
  named error (`UnknownKeyIdError` or equivalent) — no fallback, no trying the active key anyway.
  A row with a **null** `keyId` (pre-migration legacy row) is a distinct, explicitly typed case,
  not folded into "unknown."
- Add a separate export, e.g. `openWithLegacyKeyRing(ciphertext, iv, ring)`, that accepts an
  explicit `Record<legacyKeyId, keyMaterial>` map and tries only those entries — never the active
  key search space, never called from `sealSecret`/`openSecret`. Document in one line that this
  export exists **only** for the migration command (S5) and must never be imported by application
  read/write paths — enforce with the same anti-recurrence pattern as the existing
  `crypto-guard.test.ts` (source-text assertion on the import graph).
- Preserve every existing invariant from `2026-08-17-pkg-dev-crypto-failopen-spec`: fail-closed
  `cryptoKeyMode()`, the dev-key opt-in gate, the unchanged production error string, the byte
  layout. This slice is additive to that module, not a rewrite.

**Files:** `packages/db/src/crypto.ts`, `packages/db/src/pg/crypto.ts` (re-export the new
symbols), `packages/db/src/crypto.test.ts`, a new `packages/db/src/crypto-key-id.test.ts`, a new
`packages/db/src/crypto-legacy-ring.test.ts`, `packages/db/src/crypto-guard.test.ts` (extend the
import-graph assertion to cover the legacy-ring export).

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run
#   - sealSecret() on an active key returns keyId === ENCRYPTION_KEY_ID
#   - openSecret() with matching keyId roundtrips
#   - openSecret() with a foreign/unknown keyId throws UnknownKeyIdError, never falls back
#   - openSecret() with keyId=null is a distinct typed outcome (legacy-unversioned), not an error string match
#   - openWithLegacyKeyRing() opens only against the ring passed in, ignores ENCRYPTION_KEY entirely
#   - GCM auth-tag failure (wrong key material for a matching id — corruption) is distinguishable
#     from UnknownKeyIdError (wrong id) in the thrown error type
#   - idempotent: sealing an already-active-key value with the same key produces a byte-different
#     ciphertext (fresh IV) but the same keyId — re-seal is safe to retry
#   - hub-shaped and site-shaped call patterns (encrypt/decrypt aliases, sealSecret/openSecret)
#     both carry keyId through unchanged
rg -n 'openWithLegacyKeyRing' packages/db/src --glob '!*.test.ts'   # → defined once, imported nowhere but the migration command (S5)
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
```

---

### S3 — Shared startup attestation (Hub + Site fail closed on divergence)

**Tags:** `security`, `infra`, `test` · **Estimate:** 5–7 h · **Repos:** `minion-meta`,
`minion_hub`, `minion_site`

**Topics:** `security`, `infra`, `test`

**Goal:** both apps refuse to boot against a shared database if they disagree on which key is
active — closing exactly the gap the 2026-08-20 audit found (hub and site silently ran with
different keys against the same rows).

**Do:**

- Add `assertSharedKeyAttestation(): void` to `packages/db` (alongside the existing
  `assertCryptoKeyConfigured()`): reads `ENCRYPTION_KEY_ID` and a non-secret fingerprint (e.g. a
  keyed hash of a fixed known plaintext under the active key — never the key bytes themselves, never
  logged) and compares against a value the *other* app of the pair last recorded for this DB
  environment (a small `key_attestation` table or a single row keyed by environment — S0 confirms
  which shared-DB metadata table is appropriate; do not create a whole new schema surface for one
  row if `gateway` or a settings table already has room).
- Call it once at boot in both `minion_hub` and `minion_site` server entry/hooks, immediately after
  `assertCryptoKeyConfigured()`. Guard server-side only, same as the precedent spec's S3.
- Divergence throws a named error identifying both key ids (never the fingerprints' preimage,
  never key material) and refuses to boot.

**Files:** `packages/db/src/crypto.ts` (or a new `crypto-attestation.ts` if the file is getting
large — implementer's call), `packages/db/src/index.ts`, `minion_hub`'s server boot/hooks file,
`minion_site`'s server boot/hooks file, each repo's `.env.example`.

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run          # same id/fingerprint → passes; different → throws named error
# per consumer repo, on the QA-stack clone:
ENCRYPTION_KEY_ID=k1 ENCRYPTION_KEY=... <bun|pnpm> run build && <start cmd>   # boots, records attestation
# then in the OTHER app, same DB, different key:
ENCRYPTION_KEY_ID=k2 ENCRYPTION_KEY=... <start cmd>                            # → fails to boot, named error
```

---

### S4 — Migration command: read-only dry-run inventory

**Tags:** `data`, `migrations`, `test` · **Estimate:** 5–7 h · **Repos:** `minion-meta`

**Topics:** `data`, `migrations`, `test`

**Goal:** a command that counts, by table and by key-classification (active / each named legacy
id / unreadable-by-any-known-key), without opening a single write transaction or printing a single
byte of plaintext, ciphertext, IV, or key material. Per the `prod-data-migration-script-pattern`
operator feedback memory, **dry-run is the default mode**, not a flag someone has to remember.

**Do:**

- New `packages/db/src/migrate-legacy-keys.ts` (or `scripts/` if this repo's convention for
  operator-run, non-published tooling differs — check `packages/db/package.json`'s `bin`/`files`
  first) exporting an `inventory(ring: Record<legacyKeyId, keyMaterial>): Promise<InventoryReport>`
  that, per sealed column: counts non-null ciphertext rows with `keyId === active`, per named
  legacy id (test-decrypted via `openWithLegacyKeyRing`, S2), and rows unreadable by all of the
  above. Row **identities** (primary keys) may be recorded for the readable/unreadable
  classification bookkeeping S5 needs; **row values never are**.
- CLI entry defaults to dry-run; requires an explicit flag to do anything else (S5 wires that flag
  to itself, not this slice).
- Report shape is a plain object/JSON — no console table with byte previews.

**Files:** `packages/db/src/migrate-legacy-keys.ts` (new), `packages/db/src/migrate-legacy-keys.test.ts` (new).

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run
#   - seeds rows sealed under active key, under 2 distinct fake "legacy" keys, and under neither
#   - inventory() returns exact counts per table × classification
#   - assert the returned report, JSON.stringify'd, contains no substring equal to any seeded
#     plaintext, ciphertext hex, IV hex, or key material used in the test
#   - inventory() opens zero write transactions (spy on the db client's write methods)
# against the QA-stack clone (hub-local-qa-stack-recipe), read-only, with a real (test) legacy key:
node --loader ... packages/db/src/migrate-legacy-keys.ts --dry-run   # exits 0, prints counts only
```

---

### S5 — Migration command: bounded, resumable re-seal

**Tags:** `data`, `migrations`, `security`, `test` · **Estimate:** 7–8 h · **Repos:** `minion-meta`

**Topics:** `data`, `migrations`, `security`, `test`

**Goal:** re-seal every row S4 classified as readable-by-a-named-legacy-key under the active key,
in bounded batches, resumable after a crash, idempotent on retry, and never destructive to a row
whose new ciphertext hasn't been verified to open first. Rows S4 classified unreadable become
`credential_reentry_required` (S1's column) — ciphertext untouched.

**Do:**

- Extend `migrate-legacy-keys.ts` with `migrate(ring, { batchSize, resumeFrom }):
  Promise<MigrationReport>`. Per batch, per row: open with the legacy ring, `sealSecret()` under
  the active key, **open the new ciphertext to confirm it round-trips**, then write
  `ciphertext/iv/key_id` in one transaction with a checkpoint marker (e.g. last-migrated id per
  table) written in the same transaction — so a crash mid-run resumes exactly where it left off
  without re-touching completed rows or losing progress on a partial batch. Never delete/overwrite
  the source row until the new value has been opened successfully and the transaction can commit,
  per the proposal's own invariant.
- Rows unreadable by every ring entry: set `credentialStatus = 'credential_reentry_required'`
  (S1's column), leave `ciphertext`/`iv`/`key_id` exactly as found. Never write a guessed value,
  never null out the ciphertext.
- Require an explicit `--confirm-backup <backup-reference>` argument before any write path runs —
  the command refuses to execute without one, in keeping with the
  `prod-data-migration-script-pattern` memory's "dry-run default + snapshot" rule. This is a
  string/reference the operator supplies (e.g. a Supabase PITR timestamp or backup id); the tool
  does not take the backup itself.
- Idempotency: re-running `migrate()` against already-migrated rows (keyId already === active) is
  a no-op count, not a re-seal.

**Files:** `packages/db/src/migrate-legacy-keys.ts` (extend), `packages/db/src/migrate-legacy-keys.test.ts` (extend).

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run
#   - mixed hub-legacy-key rows + site-legacy-key rows in one run → both re-sealed to active key
#   - already-migrated rows (keyId === active) → migrate() reports them as skipped, zero writes
#   - simulated crash: kill the process mid-batch (throw after N writes in a test double), re-run
#     → resumes from the checkpoint, no row is re-sealed twice (assert via a per-row seal counter)
#   - migrate() invoked without --confirm-backup → refuses, zero writes, exits non-zero
#   - a row unreadable by every ring entry → credentialStatus flips to 'credential_reentry_required',
#     original ciphertext/iv/key_id byte-identical before and after
#   - rollback-before-cutover: run migrate() on a scratch copy, discard it, assert the source DB's
#     original rows are what a fresh dry-run inventory (S4) still reports pre-migration
# against the QA-stack clone, with REAL seeded legacy-shaped rows (hub-local-qa-stack-recipe):
node ... migrate-legacy-keys.ts --confirm-backup local-qa-snapshot-<ts>   # per the memory's
                                                                            # "run TWICE" rule —
                                                                            # execute it twice here
                                                                            # and assert identical
                                                                            # final counts both times
```

---

### S6 — `credential_reentry_required` application behavior

**Tags:** `logic`, `ui`, `test` · **Estimate:** 5–7 h · **Repos:** `minion_hub`

**Topics:** `logic`, `ui`, `test`

**Goal:** a gateway connection whose credential row is quarantined stops being treated as usable,
and its owner sees a path to fix it. Before touching any `.svelte` file, invoke the
`ui-design-governance` skill per AGENTS.md — semantic tokens only, and `bun run lint:design &&
bun run lint:tokens` after.

**Do:**

- Wherever hub resolves an active gateway/channel connection for use (S0 locates the exact
  service — likely near `server.service.ts` / the connection-resolution path referenced by
  `2026-08-18-hub-updateserver-tenant-scope-spec`), exclude rows with
  `credentialStatus === 'credential_reentry_required'` from the usable set, without deleting the
  row or its ciphertext.
- Surface a minimal, reused-component rotation affordance (a status badge + "reconnect" action) on
  the existing gateway/connection settings surface — do not build a new page for this; extend
  whatever list/detail view already renders connection health.
- The rotation action itself (re-entering a credential) reuses hub's existing credential-write path
  — that path already calls `sealSecret()` and, after S2, will naturally record the active key id
  on the new value, which is what clears the quarantine (a fresh write is not a "migration," so no
  legacy-ring involvement here).

**Files:** the connection-resolution service (path from S0), its existing settings/connection UI
route + component, corresponding test files.

**Definition of done (machine-checkable):**

```bash
cd minion_hub
bun run test   # service test: quarantined row excluded from active-connection resolution;
               # re-entering a credential clears credentialStatus back to 'active'
bun run check
bun run lint:design && bun run lint:tokens   # debt may only decrease (ui-design-governance)
```

---

### S7 — Supervised rollout and final verification

**Tags:** `security`, `infra` · **Estimate:** 6–8 h (coordination + verification, not raw coding) ·
**Repos:** `minion-meta`, `minion_hub`, `minion_site`

**Topics:** `security`, `infra`

**Goal:** the sequence the proposal's Decision requires, in order, with a human gate at the
irreversible steps: reader compatibility (S2/S3, which understand `key_id` and can attest) ships
to **both** apps first; the production dry run (S4) is reviewed by a human; the supervised backup +
migration (S5) runs; both deployments' attestation (S3) confirms convergence; legacy write
authority and the migration-only key ring are removed **only after** the rollback window closes.

**Do:**

1. Deploy S1+S2+S3+S6 to both hub and site (reader/writer compatible with both old
   keyless-legacy rows and new keyed rows — `openSecret` on a `null` keyId row is the explicit
   legacy-unversioned case from S2, not an error).
2. Run S4's dry-run against production; a human reviews the counts before authorizing S5.
3. Take the backup S5 requires a reference to; run S5 in production, batch-bounded, with the
   checkpoint visible to the operator.
4. Run S4's dry-run again post-migration: assert **zero** rows remain classified under any named
   legacy key (only "active" and "credential_reentry_required" remain).
5. Confirm both hub and site's boot-time attestation (S3) shows the same key id/fingerprint in
   production.
6. Hold the rollback window (human-defined duration, per the proposal's invariant — this spec does
   not set the number). After it closes: remove legacy write authority (there was never any legacy
   *write* path added by this spec, so this step is confirming none was reintroduced) and delete
   the legacy key material from wherever S5's `--confirm-backup`-gated run read it (an operator
   secret store entry, never this repo).

**Files:** none new — this slice is a runbook + the final verification report, not code. If a
runbook file is wanted for the ledger, `specs/2026-08-28-shared-db-encryption-key-convergence-spec.rollout.md`
is a reasonable sidecar, not required by this spec.

**Definition of done:** the production dry-run report (step 2), the migration execution log
(step 3), the post-migration zero-legacy-row report (step 4), and the dual-attestation
confirmation (step 5) are all attached to the tracking PR/issue; the DoD's "supervised deployment
step with an exact rollback revision and database backup" is satisfied by name, not by inference;
a human has signed off per the `security`/`data` tag gate before legacy key deletion.

## 3. Cross-repo impact assessment

Checked against AGENTS.md's Cross-Project Impact Zones ("DB schema change" row) and the precedent
spec's §4 shape.

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `@minion-stack/db` (S1, S2) | Additive schema (`key_id`, `credentialStatus` nullable/defaulted) and additive crypto exports — no existing caller breaks | Roundtrip + backward-compat cases in S2's matrix; S1's columns are nullable so pre-migration rows stay valid |
| Shared hub↔site database | **The entire point of this spec** — converging two divergent keys into one, with a migration in between | S7's ordering (reader-compat first, migration second, converge third) is the mitigation; S3 makes divergence a boot failure instead of a silent split, closing the exact gap the audit found |
| `minion_hub`, `minion_site` boot path | New required attestation call; a misconfigured pair now fails to boot instead of silently mis-reading rows | Same availability-for-confidentiality trade as the precedent spec's ⚠️A4 — already an accepted trade in this lineage |
| `minion_hub` connection-resolution + settings UI (S6) | A `.svelte` surface change — the only slice in this spec that does | `ui-design-governance` skill invoked explicitly in S6; `lint:design`/`lint:tokens` in its DoD |
| Prod tables not mirrored in this schema (`gateway_signing_keys`, `meta_assets`, `meta_connections`) | **Unresolved from this repo alone** — S0/S1 must either bring them into scope or explicitly exclude them with evidence | ⚠️ Alert, not silently assumed either way — see AS-IS |
| `minion` gateway | None — the "sole key holder" decision already excludes the gateway from ever holding `ENCRYPTION_KEY` (`2026-05-24-unified-user-identities-design`); this spec does not change that | Re-grep the gateway repo at PR time, per the precedent spec's §4 table |
| `packages/auth`, other meta packages, `paperclip-minion`, `pixel-agents`, `Minion Docs/` | None — no crypto import, no shared-DB dependency | Re-run the repo-wide grep at PR time |
| Public npm (`@minion-stack/db`) | A `minor` version bump for the additive crypto/schema surface, same convention as the precedent spec's changeset | New changeset in S2, naming the new exports and the nullable columns as backward-compatible |

## 4. Out of scope (explicit, from the proposal)

- Recovering the three currently-unreadable `gateway.token_ciphertext` rows (or any other
  unreadable row) by brute force or by searching historical secrets.
- A permanent per-writer key registry for Hub versus Site — the whole point is one active key.
- Rotating unrelated Better Auth signing/session secrets.
- Logging or exporting credential values for manual migration, at any slice.
- A KMS/secret-manager integration for `ENCRYPTION_KEY`/`ENCRYPTION_KEY_ID` themselves (Infisical
  already fronts these per AGENTS.md's env hierarchy; this spec adds variables to that hierarchy,
  it does not change the hierarchy).
- Building a general-purpose key-rotation feature beyond this one bounded legacy-to-active
  convergence — the legacy ring is explicitly migration-only and is deleted after S7.
- A new full settings page or redesign for credential health in S6 — reuse existing surfaces.

## 5. End-to-end verification

Run with S1–S6 merged in their owning repos and S7 executed and signed off.

```bash
cd /home/agent/work
pnpm run ci                                   # build-all, typecheck-all, lint-all, test-all, changeset:status
git diff --name-only <base>...HEAD -- minion_hub | grep -E '\.svelte$'   # → only S6's files, if any

# package-level proof (S2/S4/S5 combined story), on the QA-stack clone:
cd packages/db
node ... migrate-legacy-keys.ts --dry-run                              # counts: N active, M per legacy id, K unreadable
node ... migrate-legacy-keys.ts --confirm-backup <qa-snapshot-ref>      # re-seal
node ... migrate-legacy-keys.ts --dry-run                              # counts: (N+M) active, 0 per legacy id, K unreadable (unchanged)

# cross-app proof — the audit's exact failure mode, inverted:
# 1. seal a value as "hub" (ENCRYPTION_KEY_ID=k-active), read it back as "site" (same env) → succeeds
# 2. boot "hub" and "site" against the QA clone with DELIBERATELY different ENCRYPTION_KEY_ID → both refuse to boot

# S6 proof:
cd ../../minion_hub && bun run test -- --grep "credential_reentry_required"
```

**Ship gate:** the table above all green; the proposal's Decision checked clause by clause (one
active key, bounded legacy ring, no silent guessing/erasure, quarantine + owner path for
unreadable rows); S7's four artifacts (dry-run report, migration log, post-migration zero-legacy
report, dual-attestation confirmation) attached; and — per the `security`/`data` tag rule — a
**human** approval on record before S7 step 6 (legacy key deletion), because a green command list
is evidence, not a decision.
