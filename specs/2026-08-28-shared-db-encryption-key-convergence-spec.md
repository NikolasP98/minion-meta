---
id: 2026-08-28-shared-db-encryption-key-convergence-spec
title: Converge Hub and Site shared-database encryption with an explicit legacy-key migration
stage: spec
status: draft
pass: 2
created: 2026-08-28
updated: 2026-08-28
proposal: 2026-08-28-shared-db-encryption-key-convergence
verdict: changes_requested
repos: [minion-meta, minion_hub, minion_site]
tags: [security, data, migrations, logic, test]
type: fix
relationship: extends
related: [2026-08-17-pkg-dev-crypto-failopen-spec, 2026-08-20-dev-key-at-rest-audit]
---

# Converge Hub and Site shared-database encryption with an explicit legacy-key migration

**Owner surface:** `packages/db/src/crypto.ts` + `packages/db/src/pg/crypto.ts` (the single
key-derivation path, extended with a key id and a migration-only legacy ring), every owning schema
and SQL migration for an app-encrypted shared-Postgres column, and a Hub-owned operator command
that uses Hub's database connection conventions. **Consumer surface:** `minion_hub` and
`minion_site`, which both read/write the shared Supabase database through this module and must
attest the same active key. The Hub and Site working trees are absent from this checkout, so their
call sites, instructions, and exact file paths remain S0 evidence requirements rather than facts
verified here.

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

**Memory evidence used in this review:** `/memory/MINION/MEMORY.md` (lines 26, 46, and 48)
supplies the dry-run-default/snapshot/run-twice/invariant rules and the Hub SQL-migration warning;
`/memory/MINION/hub-local-qa-stack-recipe.md` supplies the isolated clone and grant requirements;
`/memory/MINION/hub-deploy-workflow.md` supplies the ★★★ `master` branch and
`DESIGN_LINT_BASE_REF=origin/master` corrections. The read-only observation searches for this
failure class returned no directly relevant prior observation, so none is used as design evidence.

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

### AS-IS (verified in this checkout unless explicitly attributed to the audit or operator memory)

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
- No `credential_reentry_required` state, typed or otherwise, exists in the checked-out code —
  confirmed by `rg -n "credential_reentry_required" packages/` returning zero hits.
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
| 1 | Extend every app-encrypted column with a per-column key-id companion; add typed `credential_reentry_required` state; close the schema-drift unknown above | S1 | Schema unit test asserts every inventoried encrypted column has its nullable companion and every rotatable credential has the state column; Hub SQL migration applies twice on the QA-stack clone; S0 inventory names the owner and disposition of every audited production table |
| 2 | `sealSecret` writes the active key id; `openSecret` opens only the row's declared id; narrow migration-only legacy-ring API added | S2 | Crypto unit tests: active-key write, declared-legacy-key read, unknown key id (typed error, no fallback), GCM auth failure, idempotent re-seal retry, cross-app (hub↔site) roundtrip |
| 3 | Hub and Site compare their local active key id/fingerprint to one operator-provisioned expected value in the shared DB; missing or divergent ⇒ that process fails closed | S3a–S3b | Package test covers match/missing/mismatch; each consumer boot test proves its own process refuses on mismatch, without mutating the expected row |
| 4a | Read-only dry-run inventory: counts by table × key-classification (active / each named legacy id / unreadable), no plaintext, no row touched | S4 | Integration test against the QA-stack clone with seeded mixed rows; report asserted byte-for-byte free of plaintext/ciphertext/key material |
| 4b | Bounded, resumable, idempotent re-seal of every row readable by a named legacy key; unreadable rows become `credential_reentry_required`, never touched destructively | S5 | Integration tests: mixed hub/site legacy rows, already-migrated rows (idempotent no-op), simulated crash between batches (resumes from checkpoint, no double-seal), rollback executed before cutover (source rows intact), unreadable row preserved verbatim |
| 5 | Execute the human-selected cutover contract; migrate while preventing incompatible old/new readers and concurrent credential overwrites; remove migration keys only after the rollback window | S7 | Approved cutover contract; exact revisions + backup; quiescence evidence; migration and post-invariant reports; per-app attestation and cross-app reads; human approval before key removal |
| 6 | `credential_reentry_required` disables each affected credential and exposes its owner-facing rotation path | S6a–S6b | Gateway service/UI tests plus equivalent guard-and-fresh-write tests for every other credential type retained by S0 |

## 2. Approach — vertical slices

```
S0 (recon, uncounted) ─▶ S1 (schema+state) ─▶ S2 (crypto core+ring) ─▶ S3a (attestation contract)
                                                                         │
                                                                         ▼
                                                               S3b (consumer boots)
                                                    │
                                                    ▼
                                    S4 (dry-run inventory) ─▶ S5 (bounded re-seal)
                                                    │
                                                    ▼
                              S6a/S6b (reentry-required behavior) ─▶ S7 (supervised rollout)
```

Only S2 and the package half of S3a are meta-repo-only. S1 requires Hub's SQL migration tree; S3b
requires both consumers; S4/S5 require Hub's real database client and the QA clone; S6 requires
Hub. The breaking S2 API may land in the package repo, but its release must not be consumed by
either app until S3b updates every caller. If a required working tree is unavailable, stop that
slice and use the AGENTS.md open-items ledger rule rather than guessing at consumer internals.

### Slice 0 — recon (≤ 60 min, prepend to S1, not counted as a slice)

**Topics:** `security`, `data`

```bash
cd /home/agent/work
# resolve the schema-drift unknown (AS-IS ⚠️) before touching any schema file
rg -n 'gateway_signing_keys|meta_assets|meta_connections' packages/ minion_hub/src minion_hub/supabase 2>/dev/null
# mandatory subproject instructions before work in either consumer
sed -n '1,260p' minion_hub/CLAUDE.md
sed -n '1,260p' minion_site/CLAUDE.md
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

**Goal:** every app-encrypted column gains a nullable, unambiguous key-id companion (nullable so
existing rows are legal pre-migration) and each rotatable credential row gains a place to record
`credential_reentry_required` without deleting the original ciphertext.

**Do:**

- Add a nullable companion named for the encrypted field (for example
  `tokenKeyId: text('token_key_id')` beside `token_ciphertext`/`token_iv`, and
  `secretKeyId: text('secret_key_id')` beside the identity secret). Do not use one generic
  `key_id` if a table can carry more than one encrypted field. Mirror the exact names in a new
  hand-written SQL file in `minion_hub/supabase/migrations/`, following the existing idempotent
  migration style (`ADD COLUMN IF NOT EXISTS`) so a re-run is a no-op — do **not** use
  `drizzle-kit push`.
- Add a `credentialStatus` (or per-table equivalent) enum/text column with at minimum `'active'`
  and `'credential_reentry_required'`, defaulting to `'active'`, on every table above that backs a
  live credential a user can rotate (`gateway`, `user_identities` — confirm `channels` and
  `server_provision_configs` need it too once S0 resolves whether they hold live, rotatable
  credentials or provisioning-time secrets).
- Resolve the S0 schema-drift finding for all three prod-only tables. For each table, name the
  owning repo/file and sealing helper. If it uses this crypto contract, include its key-id/state
  DDL and migration adapter in this spec's owning slice even if the Drizzle model lives outside
  `packages/db`. Exclusion is allowed only with code evidence that the column is not sealed by
  this contract; an ownership gap is not evidence of non-impact and must be recorded as an open
  ledger item before development continues.
- Do not backfill the field-specific key-id companions here — that is S5's job under the
  data-migration command, not a schema-time default.

**Files:** `packages/db/src/pg/schema/gateway.ts`, `user-identities.ts`, `channels.ts`,
`server-ops.ts`, `packages/db/src/schema/servers.ts` (LibSQL side, if S0 confirms it is still
written to), `minion_hub/supabase/migrations/<timestamp>_add_key_id_and_reentry_state.sql`.

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run          # every S0-inventory entry has a nullable, field-specific key-id companion
cd ../../minion_hub && bun run db:status   # new migration listed pending, not yet applied
# on the QA-stack clone (hub-local-qa-stack-recipe), NOT prod:
FORCE_DB_MIGRATE=1 bun run db:migrate
FORCE_DB_MIGRATE=1 bun run db:migrate      # second run: zero pending/applied; schema invariant unchanged
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
- Change `sealSecret()` to return `{ ciphertext, iv, keyId }`. The returned field is additive, but
  the overall API change is **breaking** because `openSecret` and the Hub-compatible decrypt
  aliases below gain a required key id. Publish a minor changeset under this 0.x package's existing
  convention and do not describe the consumer bump as backward-compatible.
- Change `openSecret()` to require the row's declared `keyId` and open **only** with the key that
  id maps to: the active key if `keyId` matches `ENCRYPTION_KEY_ID`, otherwise throw a typed,
  named error (`UnknownKeyIdError` or equivalent) — no fallback, no trying the active key anyway.
  A row with a **null** `keyId` (pre-migration legacy row) is a distinct, explicitly typed case,
  not folded into "unknown."
- Update `decrypt`, `encryptToken`, and `decryptToken` so key id is carried through their result and
  required on decrypt. S3b must inventory and update every Hub/Site call site before either app
  consumes this package version; a successful package build alone is not compatibility proof.
- Add a separate export, e.g. `openWithLegacyKeyRing(ciphertext, iv, ring)`, that accepts an
  explicit `Record<legacyKeyId, keyMaterial>` map and tries only those entries — never the active
  key search space, never called from `sealSecret`/`openSecret`. Document in one line that this
  export exists **only** for the migration command (S5) and must never be imported by application
  read/write paths — enforce with the same anti-recurrence pattern as the existing
  `crypto-guard.test.ts` (source-text assertion on the import graph).
- Preserve every existing invariant from `2026-08-17-pkg-dev-crypto-failopen-spec`: fail-closed
  `cryptoKeyMode()`, the dev-key opt-in gate, the unchanged production error string, the byte
  layout. This slice extends that module but intentionally changes its read contract.

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
#   - two seals of the same active-key plaintext produce byte-different ciphertext (fresh IV) and
#     the same keyId; migration idempotency itself is proved by S5's database-state tests
#   - hub-shaped and site-shaped call patterns (encrypt/decrypt aliases, sealSecret/openSecret)
#     both carry keyId through unchanged
rg -n 'openWithLegacyKeyRing' packages/db/src minion_hub/src minion_site/src --glob '!*.test.ts'
# → defined once; application runtime imports zero; only the Hub-owned migration command may import it after S4
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
```

---

### S3a — Shared attestation contract and expected-policy row

**Tags:** `security`, `data`, `migrations`, `test` · **Estimate:** 4–6 h · **Repos:**
`minion-meta`, `minion_hub`

**Topics:** `security`, `data`, `migrations`, `test`

**Goal:** define one deterministic expected active-key policy per database environment. Apps only
verify it; they never elect a winner by writing "my last-seen value," which would make success
depend on boot order and permit the first misconfigured app to bless itself.

**Do:**

- Add a dedicated singleton policy table keyed by an explicit, non-secret database-environment id,
  with `active_key_id`, `active_key_fingerprint`, and `phase`. Do not overload a tenant gateway or
  settings row: the policy is database-wide and must not inherit tenant RLS semantics. The Hub SQL
  migration owns the DDL; the shared PG schema mirrors it.
- Define the fingerprint exactly as HMAC-SHA-256 over the fixed public context string
  `minion-shared-db-key-attestation-v1`, keyed by the already-derived 32-byte crypto key and encoded
  as lowercase hex. It is a verifier, not key material; it may be stored in the policy table but
  must not be printed by routine app logs or migration reports.
- Add asynchronous `assertSharedKeyAttestation(db, environmentId): Promise<void>`. It derives the
  local id/fingerprint, reads the expected row, and succeeds only on an exact match. Missing row,
  duplicate rows, id mismatch, or fingerprint mismatch throw typed errors. This function has no
  insert/update authority.
- Provisioning or changing the expected row is an explicit operator action in S7, protected by the
  security/data human gate and recorded with the backup/cutover evidence; ordinary app boot cannot
  create or repair it.

**Files:** `packages/db/src/crypto-attestation.ts`, its tests and exports, the shared PG schema,
and `minion_hub/supabase/migrations/<timestamp>_shared_crypto_key_policy.sql`.

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run
# exact match passes; missing/multiple/mismatched rows throw distinct typed errors; assertion performs zero writes
cd ../../minion_hub
bun run db:status
FORCE_DB_MIGRATE=1 bun run db:migrate
FORCE_DB_MIGRATE=1 bun run db:migrate       # second run is a no-op
```

---

### S3b — Consumer boot wiring and breaking-call-site migration

**Tags:** `security`, `infra`, `test` · **Estimate:** 4–6 h · **Repos:** `minion_hub`,
`minion_site`

**Topics:** `security`, `infra`, `test`

**Goal:** both consumers pass key ids through every encrypted-field read/write and independently
fail their own startup when local configuration differs from the operator-provisioned DB policy.

**Do:**

- Read each consumer's instructions first; inventory every `sealSecret`/`openSecret` and
  encrypt/decrypt alias call. Update writes to persist the returned field-specific key id and reads
  to supply it. No consumer bump is complete while an old two-argument decrypt call remains.
- Call `assertCryptoKeyConfigured()` and then await `assertSharedKeyAttestation(...)` in each
  server-only boot path before accepting traffic. A mismatch in one app proves that app refuses;
  no test may claim the already-running peer is retroactively stopped.
- Add `ENCRYPTION_KEY_ID` and the database-environment id to both `.env.example` files. Never put
  key material, fingerprints, or real environment identifiers in fixtures or logs.

**Files:** exact boot, crypto-call-site, test, and env-doc paths recorded by S0 in each consumer.

**Definition of done (machine-checkable):**

```bash
cd minion_hub && bun run test && bun run check
cd ../minion_site && bun run test && bun run check
rg -n 'openSecret\([^,]+,[^,]+\)|decryptToken\([^,]+,[^,]+\)' minion_hub/src minion_site/src
# → zero legacy two-argument calls (or a maintained AST-based equivalent with zero findings)
# On the QA clone, each app boots against a matching expected policy and its own process exits
# non-zero with the named mismatch error when either local id or key material is changed.
```

---

### S4 — Migration command: read-only dry-run inventory

**Tags:** `data`, `migrations`, `test` · **Estimate:** 5–7 h · **Repos:** `minion_hub`

**Topics:** `data`, `migrations`, `test`

**Goal:** a command that counts, by table and by key-classification (active / each named legacy
id / unreadable-by-any-known-key), without opening a single write transaction or printing a single
byte of plaintext, ciphertext, IV, or key material. Per the `prod-data-migration-script-pattern`
operator feedback memory, **dry-run is the default mode**, not a flag someone has to remember.

**Do:**

- Add `minion_hub/scripts/migrate-shared-db-keys.ts`, because Hub owns the Supabase connection and
  operator-script conventions while `@minion-stack/db` has neither a Postgres client nor a `bin`
  export. It exports an inventory function that, per S0-inventoried encrypted column, attempts an
  authenticated open and counts `active-readable`, each named `legacy-readable`, and
  `unreadable-by-any-known-key`. A matching active key id is not enough to count as readable: GCM
  verification must succeed, otherwise S5 quarantines the row. Row primary keys may be held in
  process for S5 bookkeeping but are omitted from the default report; secret column values never
  enter the report.
- Reject a ring with duplicate ids or duplicate key material before querying rows, so a successful
  decrypt has exactly one named classification. Load legacy key material from the approved secret
  source through environment/stdin or an operator-only file descriptor, never command-line values.
- CLI entry defaults to dry-run; requires an explicit flag to do anything else (S5 wires that flag
  to itself, not this slice).
- Report shape is a plain object/JSON — no console table with byte previews.

**Files:** `minion_hub/scripts/migrate-shared-db-keys.ts` and its Hub test file(s).

**Definition of done (machine-checkable):**

```bash
cd minion_hub && bun run test
#   - seeds rows sealed under active key, under 2 distinct fake "legacy" keys, and under neither
#   - inventory() returns exact counts per table × classification
#   - assert the returned report, JSON.stringify'd, contains no substring equal to any seeded
#     plaintext, ciphertext hex, IV hex, or key material used in the test
#   - inventory() opens zero write transactions (spy on the db client's write methods)
# against the QA-stack clone (hub-local-qa-stack-recipe), read-only, with fake QA keys only:
bun scripts/migrate-shared-db-keys.ts                 # default dry-run; exits 0, prints counts only
bun scripts/migrate-shared-db-keys.ts --dry-run      # explicit synonym; byte-identical report
```

---

### S5 — Migration command: bounded, resumable re-seal

**Tags:** `data`, `migrations`, `security`, `test` · **Estimate:** 7–8 h · **Repos:** `minion_hub`

**Topics:** `data`, `migrations`, `security`, `test`

**Goal:** re-seal every row S4 classified as readable-by-a-named-legacy-key under the active key,
in bounded batches, resumable after a crash, idempotent on retry, and never destructive to a row
whose new ciphertext hasn't been verified to open first. Rows S4 classified unreadable become
`credential_reentry_required` (S1's column) — ciphertext untouched.

**Do:**

- Extend `migrate-shared-db-keys.ts` with `migrate(ring, { batchSize, resumeFrom }):
  Promise<MigrationReport>`. Per batch, per row: open with the legacy ring, `sealSecret()` under
  the active key, **open the new ciphertext to confirm it round-trips**, then write
  `ciphertext/iv/<field>_key_id` in one transaction with a checkpoint marker (e.g. the last
  committed primary-key cursor per
  table) written in the same transaction — so a crash resumes after the last **committed** batch
  without re-touching committed rows or losing committed progress. Work performed inside a rolled
  back batch may repeat; database state must not expose a partial batch. Never delete/overwrite
  the source row until the new value has been opened successfully and the transaction can commit,
  per the proposal's own invariant.
- Rows unreadable by every ring entry: set `credentialStatus = 'credential_reentry_required'`
  (S1's column), leave `ciphertext`/`iv`/field-specific key id exactly as found. Never write a guessed value,
  never null out the ciphertext.
- Require an explicit `--confirm-backup <backup-reference>` argument before any write path runs —
  the command refuses to execute without one, in keeping with the
  `prod-data-migration-script-pattern` memory's "dry-run default + snapshot" rule. This is a
  string/reference the operator supplies (e.g. a Supabase PITR timestamp or backup id); the tool
  does not take the backup itself.
- Idempotency: re-running `migrate()` against already-migrated rows is a no-op only after the row
  successfully opens under the active key. An active id with failed authentication is unreadable,
  is preserved, and receives `credential_reentry_required` rather than being silently skipped.
- Protect every update with a compare-and-swap predicate over primary key plus the source
  ciphertext/IV/key-id values read for that row. A concurrent credential rotation therefore wins;
  the migration reports a conflict for re-inventory instead of overwriting newer ciphertext.

**Files:** `minion_hub/scripts/migrate-shared-db-keys.ts` and its tests (extend).

**Definition of done (machine-checkable):**

```bash
cd minion_hub && bun run test
#   - mixed hub-legacy-key rows + site-legacy-key rows in one run → both re-sealed to active key
#   - already-migrated rows (keyId === active) → migrate() reports them as skipped, zero writes
#   - simulated crash before commit: whole batch rolls back; re-run may seal it again but produces
#     exactly one committed replacement per row and advances one checkpoint
#   - crash after a committed batch: resumes after that checkpoint; committed rows receive zero writes
#   - migrate() invoked without --confirm-backup → refuses, zero writes, exits non-zero
#   - a row unreadable by every ring entry → credentialStatus flips to 'credential_reentry_required',
#     original ciphertext/iv/field-specific key id byte-identical before and after
#   - rollback-before-cutover: run migrate() on a scratch copy, discard it, assert the source DB's
#     original rows are what a fresh dry-run inventory (S4) still reports pre-migration
#   - concurrent source-row change makes the compare-and-swap affect zero rows, reports conflict,
#     and preserves the newer value
# against the QA-stack clone, with seeded legacy-shaped rows and fake QA keys:
bun scripts/migrate-shared-db-keys.ts --execute --confirm-backup local-qa-snapshot-<ts>
bun scripts/migrate-shared-db-keys.ts --execute --confirm-backup local-qa-snapshot-<ts>
bun scripts/migrate-shared-db-keys.ts --dry-run
# second execute performs zero credential rewrites; final dry-run proves the invariant counts
```

---

### S6a — Gateway `credential_reentry_required` behavior

**Tags:** `logic`, `ui`, `test` · **Estimate:** 5–7 h · **Repos:** `minion_hub`

**Topics:** `logic`, `ui`, `test`

**Goal:** a quarantined gateway credential stops being treated as usable and its owner sees the
existing path that replaces it. Before touching any `.svelte` file, invoke the
`ui-design-governance` skill per AGENTS.md — semantic tokens only, and `bun run lint:design &&
bun run lint:tokens` after.

**Do:**

- Wherever Hub resolves an active gateway/channel connection for use (S0 locates the exact
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
**Files:** the Hub connection-resolution service and existing settings UI found by S0, plus their
tests.

**Definition of done (machine-checkable):**

```bash
cd minion_hub
bun run test   # service test: quarantined row excluded from active-connection resolution;
               # re-entering a credential clears credentialStatus back to 'active'
bun run check
DESIGN_LINT_BASE_REF=origin/master bun run lint:design && bun run lint:tokens
```

---

### S6b — Other retained credential types

**Tags:** `logic`, `ui`, `test` · **Estimate:** 4–6 h per owning repo · **Repos:** determined by
S0 from `minion_hub`, `minion_site`

**Topics:** `logic`, `ui`, `test`

**Goal:** no non-gateway row retained in the migration inventory is left with a quarantine state
that its owning runtime ignores or its owner cannot clear.

**Do:**

- For every non-gateway table S0 keeps in migration scope, identify the owning runtime and existing
  replacement/reconnect path. Add the unusable-state guard and prove a successful fresh write
  stores the active key id and returns status to `active`.
- Group work by owning repo; if both Hub and Site own affected paths, implement them as separate
  4–6 h PR slices rather than one cross-repo development run.
- If no owner-facing replacement path exists, stop and amend this spec rather than declaring the
  row migrated/quarantined with no way to recover service.

**Files:** the owning service/UI/tests recorded in S0 (including Site if it owns OAuth identity
reconnection).

**Definition of done (machine-checkable):** for each retained table, an inventory-derived test
case proves quarantined rows are unusable, ciphertext is preserved, and a fresh credential write
restores `active` with the active key id. Run `bun run test && bun run check` in each owning repo;
for any Svelte change, run that repo's required design-governance gates.

---

### S7 — Supervised rollout and final verification

**Tags:** `security`, `infra` · **Estimate:** 6–8 h (coordination + verification, not raw coding) ·
**Repos:** `minion-meta`, `minion_hub`, `minion_site`

**Topics:** `security`, `infra`

**Goal:** execute one human-approved cutover sequence with an exact old-app revision, new-app
revision, database backup reference, write-quiescence rule, rollback trigger, and expected-policy
row. Legacy key material is removed only after the rollback window closes.

**⚠️ Human decision required before approval:** the current proposal simultaneously requires
"reader compatibility first," missing key ids to fail closed, and the legacy ring to be
migration-only. Those constraints do not define a live-traffic sequence for existing null-key-id
rows: activating S2/S3b before migration makes those rows unreadable, while migrating them to the
new shared key before both apps cut over makes them unreadable to the old revisions. Choose and
record exactly one of these rollout contracts:

1. **Maintenance cutover:** quiesce both applications' credential reads/writes, take the backup,
   run S4/S5 with the final shared key, provision the expected policy row, deploy both new
   revisions, verify, then reopen traffic. Rollback restores the backup **and** both old revisions
   with their old environment keys.
2. **Bounded runtime compatibility:** amend the proposal/spec to authorize a temporary,
   explicitly expiring runtime compatibility mode, define exactly how null-key-id rows select one
   key without iterating the legacy ring, and add removal tests. This is currently out of contract
   because the ring is migration-only and a missing key id must fail closed.

Until the human records that choice, the numbered rollout below is intentionally not executable
and this pass remains `changes_requested`.

**Do:**

1. Record the selected rollout contract and exact rollback procedure in the tracking artifact.
2. Run S4's production dry-run; a human reviews counts and the list of in-scope tables before S5.
3. Quiesce writes as required by the selected contract, take the named backup, and run S5 in
   bounded batches with checkpoint/conflict counts visible to the operator.
4. Run S4 again: assert every non-quarantined row is `active-readable`, zero rows are
   legacy-readable, and every unreadable row is preserved and marked
   `credential_reentry_required`. This is the memory-mandated invariant check, not merely a claim
   that every SQL statement ran.
5. Provision the expected attestation policy only at the selected cutover point; start Hub and
   Site, prove each matches it, and exercise cross-app reads of migrated QA-shaped records.
6. Resume traffic only after S6a/S6b's unusable-state and reconnect checks pass. Execute the rollback
   procedure if any declared trigger fires.
7. Hold the rollback window (human-defined duration, per the proposal's invariant — this spec does
   not set the number). After it closes: remove legacy write authority (there was never any legacy
   *write* path added by this spec, so this step is confirming none was reintroduced) and delete
   the legacy key material from wherever S5's `--confirm-backup`-gated run read it (an operator
   secret store entry, never this repo).

**Files:** none new — this slice is a runbook + the final verification report, not code. If a
runbook file is wanted for the ledger, `specs/2026-08-28-shared-db-encryption-key-convergence-spec.rollout.md`
is a reasonable sidecar, not required by this spec.

**Definition of done:** the approved rollout-contract record, preflight report, exact old/new
revisions, backup reference, write-quiescence evidence, migration log, post-migration invariant
report, per-app attestation result, cross-app read result, rollback-window end, and human approval
before legacy-key deletion are attached to the tracking PR/issue. Reports contain counts and ids
only where explicitly allowed; never secret values or crypto bytes.

## 3. Cross-repo impact assessment

Checked against AGENTS.md's Cross-Project Impact Zones ("DB schema change" row) and the precedent
spec's §4 shape.

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `@minion-stack/db` (S1, S2, S3a) | Additive nullable schema companions plus a **breaking** decrypt signature and attestation exports | Minor changeset; consumers do not bump until S3b updates every call site; package tests do not substitute for consumer typechecks |
| Shared hub↔site database | Converges two divergent keys, adds a database-wide policy row, and mutates credential ciphertext/state | S7 must resolve the old-reader/new-reader incompatibility before approval; backup, quiescence, compare-and-swap, and post-state invariants are mandatory |
| `minion_hub`, `minion_site` boot path | Each process now verifies a read-only expected policy; mismatch or missing policy fails that process | S3a removes boot-order election; S3b proves each app independently. Availability impact is explicit in the selected S7 cutover |
| `minion_hub` operator tooling | Owns the executable dry-run/migration command because it owns the shared Supabase client and migration conventions | S4/S5 use Hub scripts and the isolated QA clone; no unpublished DB client is assumed inside `@minion-stack/db` |
| Credential resolution/reconnect UI in Hub and possibly Site (S6) | Every retained credential type needs an unusable-state guard and owner replacement path; `.svelte` changes may occur in either consumer | S0 ownership matrix closes the list; each affected Svelte repo invokes its own design governance and gates |
| Prod tables not mirrored in this schema (`gateway_signing_keys`, `meta_assets`, `meta_connections`) | **Unresolved from this repo alone** — S0/S1 must either bring them into scope or explicitly exclude them with evidence | ⚠️ Alert, not silently assumed either way — see AS-IS |
| `minion` gateway | None — the "sole key holder" decision already excludes the gateway from ever holding `ENCRYPTION_KEY` (`2026-05-24-unified-user-identities-design`); this spec does not change that | Re-grep the gateway repo at PR time, per the precedent spec's §4 table |
| `packages/auth`, other meta packages, `paperclip-minion`, `pixel-agents`, `Minion Docs/` | None — no crypto import, no shared-DB dependency | Re-run the repo-wide grep at PR time |
| Public npm (`@minion-stack/db`) | A `minor` version bump under the repo's 0.x convention for a breaking decrypt-call contract plus additive schema/attestation exports | Changeset must name required consumer call-site migration and coordinated bump; it must not call the release backward-compatible |

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
cd minion_hub && bun run test && bun run check
DESIGN_LINT_BASE_REF=origin/master bun run lint:design && bun run lint:tokens
cd ../minion_site && bun run test && bun run check

# Migration proof on the QA-stack clone, with only fake QA keys:
cd ../minion_hub
bun scripts/migrate-shared-db-keys.ts --dry-run
bun scripts/migrate-shared-db-keys.ts --execute --confirm-backup local-qa-snapshot-20260828
bun scripts/migrate-shared-db-keys.ts --execute --confirm-backup local-qa-snapshot-20260828
bun scripts/migrate-shared-db-keys.ts --dry-run
# Assert first run converges readable rows, second run writes zero credential rows, and final
# inventory has only active-readable or preserved+quarantined rows.

# cross-app proof — the audit's exact failure mode, inverted:
# 1. seal a value as "hub" (ENCRYPTION_KEY_ID=k-active), read it back as "site" (same env) → succeeds
# 2. for each app independently, change local ENCRYPTION_KEY_ID or key material → that process exits non-zero
# 3. neither boot assertion inserts or updates the expected-policy row

# S6 proof:
cd ../minion_hub && bun run test -- --grep "credential_reentry_required"
```

**Ship gate:** the human rollout choice in S7 is recorded and the table above is green; the
proposal's Decision is checked clause by clause (one
active key, bounded legacy ring, no silent guessing/erasure, quarantine + owner path for
unreadable rows); all S7 evidence artifacts are attached; and — per the `security`/`data` tag rule
— a **human** approval is on record before S7 step 7 (legacy key deletion), because a green command
list is evidence, not a decision.
