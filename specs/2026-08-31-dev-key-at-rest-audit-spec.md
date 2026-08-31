---
id: 2026-08-31-dev-key-at-rest-audit-spec
title: Complete the source-visible dev-key at-rest audit
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
proposal: 2026-08-20-dev-key-at-rest-audit
verdict: pending
repos: [minion-meta, minion_hub, minion_site]
relationship: extends
related: [2026-08-17-pkg-dev-crypto-failopen-spec, 2026-08-28-shared-db-encryption-key-convergence-spec]
tags: [security, data, infra, test]
type: research
---

# Complete the source-visible dev-key at-rest audit

**Owner surface:** `minion-meta` owns the read-only audit runner, its tests, and the durable audit
report. `minion_hub` and `minion_site` are target repos because their deployments and databases are
the subjects of the audit; this spec does not authorize application-code or environment changes in
either consumer.

**Relationship to existing artifacts (recommend-only):**

- **extends** [`2026-08-17-pkg-dev-crypto-failopen-spec`](2026-08-17-pkg-dev-crypto-failopen-spec.md)
  — this spec completes that spec's deferred S2 at-rest audit and supplies the evidence required
  before its S3 consumer activation; it does not repeat the shipped fail-closed crypto change.
- **extends** [`2026-08-28-shared-db-encryption-key-convergence-spec`](2026-08-28-shared-db-encryption-key-convergence-spec.md)
  — that draft consumes the partial 2026-08-20 findings and requires a complete preflight; this
  spec closes the narrower inventory/classification gap without implementing key convergence or
  migration.

**Human gates:** `security` and `data` keep human approval and merge gates. Access to deployment
configuration and production databases is read-only. No autonomous step may change a deployment,
secret, database row, or key.

**Memory evidence:** `/memory/MINION/factory/2026-08-20-3688d941.md` establishes that a previously
published `@minion-stack/db` package can be packed and executed in an isolated process, which is the
compatibility technique reused by the runner. `/memory/MINION/MEMORY.md` supplies the hard rule that
`count(*)`, not planner estimates such as `reltuples`, proves a production row count. The read-only
Claude-memory search returned encryption observations about unrelated CEF cookie storage only, so
none shapes this spec.

## 0. Product

The approved proposal states:

> `2026-08-17-pkg-dev-crypto-failopen-spec` S2 asks for an at-rest audit: for every database
> reachable to the implementer, count non-null ciphertext rows in the columns sealed by
> `@minion-stack/db` crypto, and test-decrypt a sample under the dev key and under the
> environment's configured key. **That audit was not run** when S2 landed.

Its 2026-08-29 reopening makes the acceptance bar stricter and authoritative: all eight non-null
`user_identities.secret_ciphertext` rows in the shared production database must be classified, an
A1 deployment inventory must be present, and every unchecked database must be named with a reason.
The audit answers whether source-visible dev-key ciphertext exists and which environments remain
unknown. It does not claim that an omitted or inaccessible environment is clean.

## 1. AS-IS → TO-BE → DELTA

### AS-IS

- `packages/db/src/crypto.ts:26-59` exposes `cryptoKeyMode()` and gates the built-in
  `minion-hub-dev-key` behind `MINION_ALLOW_DEV_CRYPTO_KEY=1`. `key()` caches the first derived key
  for the process, so different candidate keys cannot be tested reliably in one module instance.
- `packages/db/src/crypto.ts:71-123` carries a `TODO(handoff)` that correctly calls the result
  unknown: five of eight production `user_identities.secret_ciphertext` rows were not classified;
  the A1 deployment inventory and unchecked-database list are absent.
- The proposal records one read-only run against Hub production Supabase. It reports non-null row
  counts for seven observed columns, but only partial per-row key classification and no proof that
  the seven columns are the complete call-site-owned inventory.
- The checked-out shared schemas expose five candidate ciphertext/IV pairs:
  `servers.token`/`token_iv` in `packages/db/src/schema/servers.ts`, plus
  `gateway.token_ciphertext`/`token_iv`, `user_identities.secret_ciphertext`/`secret_iv`,
  `channels.credentials`/`credentials_iv`, and `server_provision_configs.api_key`/`api_key_iv` in
  `packages/db/src/pg/schema/`. The proposal also observed three production-only pairs
  (`gateway_signing_keys.private_ciphertext`, `meta_assets.page_token_ciphertext`, and
  `meta_connections.token_ciphertext`). Because the Hub and Site trees are absent, ownership of
  the latter columns and the two schema-only candidates is not yet verified at real call sites.
- `minion_hub/` and `minion_site/` are absent from this checkout. Their instructions, deployment
  manifests, current branches, encryption call sites, and database targets are evidence to collect
  in Slice 1, not assumptions to encode now.

### TO-BE

- A committed machine-readable manifest names every Hub and Site deployment scope that can seal or
  open app secrets, records observed `NODE_ENV` and whether `ENCRYPTION_KEY` is configured as
  booleans/categories only, maps each deployment to a stable non-secret database identifier, and
  names every inaccessible deployment or database with a reason and evidence timestamp.
- The sealed-column inventory is derived from actual `sealSecret`, `openSecret`, `encrypt`,
  `decrypt`, `encryptToken`, and `decryptToken` call sites plus deployed schema inspection. A column
  inferred only from an `*_iv` name remains `candidate-unverified`, never silently becomes in-scope.
- Every non-null, non-empty row in every reachable in-scope column receives exactly one outcome for
  each applicable candidate key: `opened`, `auth-failed`, `malformed`, or `key-unavailable`.
  Aggregate counts must sum to the exact SQL `count(*)`; a sample is not sufficient.
- The dev key is tested only in an isolated process explicitly opted into the already-shipped
  compatibility path. Configured keys are supplied at runtime and are never copied into arguments,
  files, reports, logs, or process output.
- The audit is strictly read-only. It emits only deployment/database aliases, table and column
  names, counts, outcome categories, timestamps, and evidence references. It never emits plaintext,
  key material, ciphertext, IVs, auth tags, row payloads, connection strings, or credential values.
- An unreachable environment is reported as `unchecked`, not zero. A database can be declared
  clean of dev-key rows only when all its in-scope non-empty ciphertext rows were tested and none
  opened under the dev key.
- The existing AES-256-GCM layout, runtime crypto behavior, schemas, deployed configuration, and
  database contents remain unchanged.

### DELTA

1. **D1 / Slice 1:** replace the missing A1 evidence with a call-site-backed deployment, database,
   and sealed-column inventory. `node scripts/check-dev-key-at-rest-audit.mjs` proves every known
   deployment and database has either an audited target or an explicit unchecked reason.
2. **D2 / Slice 2:** replace sampled decryption with all-row, per-key classification in read-only
   transactions. Runner unit tests prove key-process isolation, output redaction, exact-count
   reconciliation, and refusal of write-capable SQL; the real manifest proves classified totals
   equal `count(*)` for every reachable column.
3. **D3 / Slice 3:** publish the durable finding, distinguish clean/affected/unchecked databases,
   and clear the source `TODO(handoff)` only if its three named preconditions are evidenced.
   The checker, repository gates, and a human security review prove the final report is complete
   and contains no forbidden secret material.

## 2. Approach — vertical slices

### Slice 1 — Close the deployment and sealed-column inventories

**Topics:** `security`, `data`, `infra`, `test`

**Estimate:** 4–6 focused hours.

Trace both consumers from server entry points through crypto calls to stored columns. Read each
consumer's local instructions before inspection. Enumerate Vercel preview and production scopes,
self-hosted/Docker staging, local/shared development environments, and CI jobs that boot either app.
For each deployment, record the effective `NODE_ENV` category, whether `ENCRYPTION_KEY` exists, and
the database alias it reaches. Inspect provider metadata and manifests without retrieving secret
values. Deduplicate Hub and Site deployments that reach the same physical database under one
database alias while retaining both deployment-to-database edges.

Create a JSON manifest whose schema separates `deployments`, `databases`, `columns`, and
`unchecked`. Each column records its repository call-site symbol and deployed schema evidence.
Treat columns found only by naming convention as `candidate-unverified`. Seed the report from this
manifest rather than hand-maintaining a second inventory.

**Exact files:**

- `scripts/dev-key-at-rest-audit.mjs` (new; read-only inventory/audit runner)
- `scripts/dev-key-at-rest-audit.test.mjs` (new)
- `scripts/check-dev-key-at-rest-audit.mjs` (new; structural and reconciliation gate)
- `specs/audits/2026-08-31-dev-key-at-rest-audit.json` (new; non-secret evidence manifest)
- `specs/audits/2026-08-31-dev-key-at-rest-audit.md` (new; generated/updated human report)

**Machine-checkable definition of done:**

```bash
node --test scripts/dev-key-at-rest-audit.test.mjs
node scripts/check-dev-key-at-rest-audit.mjs
```

The checker exits non-zero for a deployment without a database edge or unchecked reason, a database
with neither an audit target nor unchecked reason, a verified column without a real call-site and
schema anchor, duplicate physical database aliases, secret-shaped manifest fields, or placeholder
values such as `TBD`/`unknown` without a reason.

### Slice 2 — Classify every reachable ciphertext row without writing

**Topics:** `security`, `data`, `infra`, `test`

**Estimate:** 6–8 focused hours.

Extend the runner with LibSQL/Turso and Postgres read adapters selected from the manifest. Before
reading rows, open a read-only transaction and verify the database dialect's read-only state. Use
explicit `SELECT count(*)` and paginated primary-key/ciphertext/IV reads; never use planner
estimates. Feed candidate keys to isolated child processes through inherited environment variables,
never command-line arguments. Load a fresh module instance per candidate key so `cachedKey` cannot
reuse the previous key. The child returns only row identity hashes and outcome categories; the
parent discards ciphertext and IV values after classification.

Classify every non-null, non-empty row, including all eight currently reported
`user_identities.secret_ciphertext` rows. Record `key-unavailable` rather than skipping a configured
key that the operator cannot access. A malformed value is distinct from a GCM authentication
failure. Abort the report update if pagination count, classified-row count, and `count(*)` disagree
or if the database changes during the read window. Execute against each reachable database only
after a human confirms the resolved aliases and read-only credentials.

**Exact files:**

- `scripts/dev-key-at-rest-audit.mjs`
- `scripts/dev-key-at-rest-audit.test.mjs`
- `scripts/check-dev-key-at-rest-audit.mjs`
- `specs/audits/2026-08-31-dev-key-at-rest-audit.json`
- `specs/audits/2026-08-31-dev-key-at-rest-audit.md`

**Machine-checkable definition of done:**

```bash
node --test scripts/dev-key-at-rest-audit.test.mjs
node scripts/dev-key-at-rest-audit.mjs --manifest specs/audits/2026-08-31-dev-key-at-rest-audit.json --dry-run
# After human confirmation, run once per reachable database with credentials supplied only in env.
node scripts/check-dev-key-at-rest-audit.mjs
```

Tests use synthetic ciphertext and throwaway databases to prove: SELECT-only enforcement; configured
key, dev key, wrong key, malformed ciphertext, and unavailable-key outcomes; fresh-process isolation;
pagination; a row-count race abort; no plaintext/ciphertext/IV/key leakage in stdout, stderr, JSON,
or Markdown; and failure when classified totals do not equal `count(*)`. The final checker requires
all reachable verified columns to reconcile and the eight production identity rows to total eight
classified rows.

### Slice 3 — Publish the decision-grade report and clear only satisfied handoffs

**Topics:** `security`, `data`, `infra`, `test`

**Estimate:** 4–6 focused hours.

Render the final report with four explicit tables: deployment/A1 inventory, verified sealed-column
inventory, per-database count and key-outcome totals, and unchecked databases with reasons. Mark each
database `clean`, `affected`, or `unchecked` using the invariants above. Link evidence by provider
resource name or deployment/database alias without copying sensitive URLs or values. Record the UTC
execution time and package/build identity used by the isolated classifier.

If any row opens under the dev key, stop: keep the consumer activation blocked and file a separate
key-rotation proposal carrying counts only. If no row opens but any database remains unchecked, do
not call the fleet clean; preserve the unchecked list and keep any handoff whose wording requires
fleet-wide completion. Remove the audit-specific `TODO(handoff)` block in `crypto.ts` only when the
report proves all three conditions named there: all shared-production rows classified, A1 complete,
and every other database either audited or explicitly unchecked. Do not remove or weaken the
separate S3 consumer/convergence/release gates.

**Exact files:**

- `specs/audits/2026-08-31-dev-key-at-rest-audit.json`
- `specs/audits/2026-08-31-dev-key-at-rest-audit.md`
- `packages/db/src/crypto.ts` (only the audit-specific handoff text; preserve unrelated gates)
- `proposals/2026-08-20-dev-key-at-rest-audit.md` (append final evidence and lifecycle result; do
  not rewrite the historical partial audit)
- `proposals/2026-08-31-dev-key-at-rest-remediation.md` (conditional, create only when dev-key
  rows are found; carry counts and affected aliases, never secret material)

**Machine-checkable definition of done:**

```bash
node --test scripts/dev-key-at-rest-audit.test.mjs
node scripts/check-dev-key-at-rest-audit.mjs
node scripts/spec-index.mjs --check
pnpm --filter @minion-stack/db vitest run
pnpm run typecheck-all
pnpm run lint-all
```

The checker rejects a report with missing A1 rows, omitted databases, sampled/partial columns,
unreconciled counts, forbidden values, or an unsupported `clean` conclusion. Human security review
confirms provider coverage and authorizes any handoff removal. No application or environment change
is part of this slice.

## 3. Cross-repo impact assessment

| Surface | Impact | Mitigation or alert |
|---|---|---|
| `@minion-stack/db` crypto | The runner must reproduce the exact deployed AES-256-GCM/key derivation path; `cachedKey` makes in-process key switching unsafe. | Import the built package in one isolated process per key. Do not change layout or runtime behavior. Run package crypto tests after editing only the handoff comment. |
| Hub + Site shared Postgres | Both apps may map to one physical database while using different configured keys. Double-counting it would misstate exposure. | Model deployments and databases separately; deduplicate by operator-approved non-secret database identity. Test each applicable key against every row. |
| LibSQL/Turso | The shared package still declares encrypted LibSQL columns even if no current deployment reaches them. | Audit reachable instances; list every absent credential/instance as unchecked with a reason. Never infer zero from lack of a local `.db`. |
| Deployment providers/CI/self-hosting | A1 depends on runtime settings outside Git. Merely reading repository manifests cannot prove effective values. | Record provider/runtime evidence timestamps and boolean/category results only. Missing access becomes an explicit unchecked entry. |
| Shared schema drift | Production has encrypted columns absent from the checked-out shared schema, while two shared-schema candidates were absent in the prior production query. | Resolve ownership from real Hub/Site call sites and deployed catalogs. Report drift; do not add migrations or infer crypto ownership from names. |
| Downstream convergence work | The convergence draft uses the audit as preflight evidence. Partial results could trigger an unsafe key cutover. | This spec performs no bump, deploy, key convergence, migration, or re-encryption. Keep activation blocked unless the complete report supports it and the separate spec is approved. |

There is no gateway protocol, shared wire-format, auth-session, UI, or DB-schema change. Therefore
`minion`, `paperclip`, design-token checks, and migration tooling are unaffected.

## 4. Out of scope

- Setting, rotating, converging, exporting, or recovering any encryption key.
- Re-encrypting, updating, deleting, quarantining, or otherwise mutating a database row.
- Adding key ids, legacy-key rings, migrations, startup assertions, consumer dependency bumps, or
  deploying Hub/Site; those belong to the related specs.
- Brute-forcing ciphertext or searching secret history for unknown keys.
- Treating a sample, an inaccessible database, a schema convention, or missing local checkout as a
  clean result.
- Logging or committing plaintext, key material, ciphertext, IVs, auth tags, database URLs, or
  provider credentials.

## 5. End-to-end verification

From a clean `minion-meta` checkout with no database credentials in tracked files:

1. Run `node --test scripts/dev-key-at-rest-audit.test.mjs` and confirm every synthetic safety,
   classification, isolation, and reconciliation case passes.
2. Run `node scripts/dev-key-at-rest-audit.mjs --manifest specs/audits/2026-08-31-dev-key-at-rest-audit.json --dry-run`.
   Confirm it prints the resolved deployment/database/column aliases and planned read-only queries,
   but no environment values or row data.
3. After human confirmation, execute the runner once for each reachable database with credentials
   supplied only through the environment. Repeat the checker after every run.
4. Run `node scripts/check-dev-key-at-rest-audit.mjs`; it must prove inventory coverage, exact count
   reconciliation, all eight production identity rows classified, explicit unchecked reasons, and
   valid clean/affected/unchecked conclusions.
5. Inspect the JSON and Markdown diff manually for forbidden material, then run
   `node scripts/spec-index.mjs --check`, `pnpm --filter @minion-stack/db vitest run`,
   `pnpm run typecheck-all`, and `pnpm run lint-all`.
6. A human security reviewer compares the A1 table with provider, CI, and self-hosted inventories.
   The reviewer confirms that no environment or database was silently omitted and decides whether
   the separate consumer activation/convergence work may proceed. Green automation alone does not
   authorize that security/data transition.
