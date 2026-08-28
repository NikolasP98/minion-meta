---
id: 2026-08-28-shared-db-encryption-key-convergence
title: Converge Hub and Site shared-database encryption with an explicit legacy-key migration
status: in-spec
spawned_spec: 2026-08-28-shared-db-encryption-key-convergence-spec
created: 2026-08-28
updated: 2026-08-28
repos: [minion-meta, minion-hub, minion-site]
tags: [security, data, migrations, logic, test]
value: 10
effort: L
---

# Converge Hub and Site shared-database encryption with an explicit legacy-key migration

## Decision

Hub and Site share one database and therefore must use one active key for new ciphertext.
Do not preserve the current per-writer key split. Add an explicit, bounded legacy-key ring only
for migration reads, identify ciphertext by key id, re-seal every row readable by a known legacy
key under the shared active key, and then remove legacy write authority.

Ciphertext that cannot be opened by any explicitly configured legacy key is not guessed, erased,
or reported as migrated. Quarantine the affected credential record and require the owner to
re-enter or rotate that credential.

## AS-IS

The read-only production audit in
`proposals/2026-08-20-dev-key-at-rest-audit.md` inspected the Hub production Supabase database,
which Hub and Site share. Of five non-empty `gateway.token_ciphertext` rows, two opened only with
Site's current key and three opened with neither Hub's nor Site's current key. Hub and Site carry
different `ENCRYPTION_KEY` values, so a row's writer silently determines which application can
read it. The current ciphertext layout stores no key id.

The canonical `@minion-stack/db` crypto helper uses AES-256-GCM and must preserve its existing
wire layout while rows are migrated. Authentication failures are currently indistinguishable
from a wrong active key at the call site.

## TO-BE

- Hub and Site production deployments receive the same active shared-database encryption key
  and a stable non-secret active key id.
- Every newly sealed shared-database value records the active key id with the ciphertext. No
  application may choose a writer-specific key.
- A migration-only key ring maps explicit legacy key ids to secret key material. Runtime reads
  select by recorded key id; they never try every key on ordinary requests.
- Legacy rows without a key id are inventoried in a read-only preflight. A migration command may
  probe only the explicitly named Hub/Site legacy keys, records counts and row identities without
  plaintext, then re-seals readable values under the active key in bounded transactions.
- The three currently unreadable gateway rows, and any other row unreadable by all known legacy
  keys, become a typed `credential_reentry_required` state. Their ciphertext remains preserved
  until the owner rotates it; it is never silently blanked or treated as migrated.
- Migration is resumable and idempotent. A backup, dry run, per-table counts, and post-migration
  decrypt verification are mandatory before legacy keys can be removed.
- Hub and Site fail closed at startup when their active key id or active-key fingerprint differs
  for the same database environment. Logs expose only key ids/fingerprints, never key material,
  plaintext, ciphertext, IVs, or auth tags.

## DELTA

1. Extend the shared DB schemas for every app-encrypted column with a key-id companion and add a
   typed credential-read state for unrecoverable legacy rows. The spec must inventory all actual
   call sites rather than infer encryption solely from column names.
2. Extend `@minion-stack/db` crypto APIs to seal with the active key id and open only the row's
   declared id. Preserve a narrowly scoped migration API for unversioned legacy rows.
3. Add startup/config validation shared by Hub and Site so both deployments attest the same
   active key id/fingerprint for the shared database.
4. Add a dry-run-first migration command with backup confirmation, bounded batches, resumable
   checkpoints, audit counts, and a no-plaintext output contract.
5. Deploy reader compatibility first, run the audited migration, converge both deployment
   environments on the shared active key, verify all readable rows, then disable legacy writes
   and remove migration keys only after the rollback window.
6. Add application behavior for `credential_reentry_required`: the affected gateway connection
   is disabled and the user is prompted to replace its credential.

## Invariants

- No plaintext secret, key material, ciphertext, IV, or authentication tag enters logs, Git,
  issue comments, migration reports, or analytics.
- A wrong or missing key id fails closed; it never falls back to the active key or loops over the
  key ring during an ordinary request.
- The migration never deletes or overwrites a source row until the newly sealed value has been
  opened successfully and the transaction can commit.
- The existing AES-256-GCM byte layout remains readable during the compatibility window.
- Production key changes are a supervised deployment step with an exact rollback revision and
  database backup, not an autonomous dev-run side effect.

## Out of scope

- Recovering the three unknown-key plaintexts by brute force or by searching historical secrets.
- A permanent per-writer key registry for Hub versus Site.
- Rotating unrelated Better Auth signing/session secrets.
- Logging or exporting credential values for manual migration.

## Definition of done

- Schema and crypto unit tests cover active-key writes, declared legacy-key reads, unknown key
  ids, GCM authentication failure, idempotent retry, and cross-app compatibility.
- Migration integration tests cover mixed Hub/Site legacy rows, already-migrated rows, a crash
  between batches, rollback before cutover, and preservation of an unreadable source row.
- A production dry run reports the exact non-secret row counts by table and key classification.
- A supervised backup and migration re-seal every readable row; verification opens the new value
  under the shared key before cutover.
- Hub and Site production revisions attest the same active key id/fingerprint and can both read
  the migrated rows.
- Unknown-key rows are disabled with `credential_reentry_required`, remain preserved, and have an
  owner-facing rotation path.
- Legacy keys are removed only after the rollback window and a final zero-legacy-readable-row
  report.
