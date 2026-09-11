---
phase: 10-durable-jobs-stock
plan: "09"
status: independently_verified_scoped
plan_sha256: 46e62a27197dd92585af572b40bdb3c41dc99b982089737929d8c3a79484f1ca
requirements_completed: []
source_files_frozen: true
---

# Shared complete-manifest arbitration

The shared foundation and brain adoption are implemented and independently checked within their source scopes. Root reviewed and reran the foundation; the foundation executor separately reviewed root's brain changes. Neither reviewer labels their own implementation independent. Whole-Hub type checking is running; packaging and deployment remain unresolved.

## Result and boundaries

Two actual native regressions motivated this child: a delayed mutable module job could admit an extra embedding batch after another job published, and an empty URL duplicate could publish while an embedded manifest was in flight. Per-job cursors did not arbitrate whole-document intent. The complete ordered chunks, pipeline, embedded/disabled/empty mode and provider descriptor now bind once on the shared request head. Cursor remains progress, not authority.

The new additive904 migration adds a nullable head-only hash after frozen903. Existing rows and vector receipts survive unchanged. Null plus any prior effect is ambiguous and requires explicit reingest. A new/revoked/source-changed revision clears the current binding without deleting historical receipts. This is not an immutable archive of prior whole-manifest hashes.

The actual privately prepared provider descriptor is compared synchronously with the expected provider before admission; the same private request body is then dispatched. No prepared-object public API or embeddings implementation change was needed. Missing admission runs the domain-ready guard under the same owned head transaction. Existing admitted receipts stay indeterminate; ready does not mean a remote attempt never happened. Responses, commit and zero-batch publication reassert the manifest.

Brain publication requires every expected batch and vector. It preserves old chunks until atomic replacement. Duplicates finishing from an already-ready document set canonical complete progress, including a delayed ordinary URL loading failure after another job publishes. Indeterminate embedding outcomes retain their separate failure path.

## Evidence

- Foundation: root independently ran 27 unit cases across three files and 25 native cases, both exit 0, no skips. Logs `/tmp/minion-360-10-09-root-units.log` and `/tmp/minion-360-10-09-root-native.log`; durations 4.61 and 9.82 seconds.
- Native foundation preserves all prior 14 cases and adds manifest bind/reject/reset, actual903→904 upgrade, omitted/malformed contracts, synchronous provider pinning, held-transaction readiness ordering, late-response manifest assertion and callback input snapshots. Test expansion caught a missing late-response assertion during implementation; the corrected candidate passed.
- Brain: root's final 30 native cases passed in 6.38 seconds. A separate reviewer reran all 30 in 9.78 seconds and the 43 brain/embedding unit cases. See10-05-VERIFICATION.md. The two original failing probes now pass alongside the retained prior behavior.
- Review caught and corrected a five-argument call to the four-argument reingest API and the late ordinary loading failure terminal-state edge. A dedicated new regression verifies done status, null error, complete cursor, unchanged published chunks and exactly one provider POST.
- Finance regression: executor reran 47 unit/parser and 19 native cases. Finance source is unchanged; its native fixture adds only the904 migration entry. Removing that one line restores prior SHA `fa87e9be2a1590b574b3ffb757ac66508640bdc7827ba708a02406415a1b831e`.
- Tests use marked loopback PostgreSQL17.10 fixtures on55439 and55440; the latter has actual pgvector0.8.6 in the extensions namespace. Synthetic provider responses only. No driver fault injection or production SQL.

## Frozen identity

Nine owned files; the brain unit file is unchanged by this child and remains a regression input. Existing foundation before hashes are recorded in10-07-SUMMARY.md; the finance before hash is above and904 was absent. Brain before hashes identify the partially implemented10-05 candidate, not a pristine checkout.

| Brain file before10-09 | SHA-256 |
|---|---|
| src/server/services/brains.service.ts | `9583e4bfa38def833280f5bc5acb99b0f57c70774e6ba65c45721fa6c405fcbe` |
| src/server/services/brains.service.test.ts | `74c5690b9c80fc16dfaa075e531e8a2baa3513b77d00b5e02947b874a8aafdce` |
| src/server/services/brains.effect-ownership.sql.integration.test.ts | `fea7c00ba6f2da0b71da0ede6261d01e2be30516bf29ab2cb2563e5c8a769d55` |

| Owned file after10-09 | SHA-256 |
|---|---|
| src/server/db/pg-schema/job-effects.ts | `6af8106147054b5eda2c0e3e42e93cce5bd79a2340d1f2cd6dcd18025e3a1611` |
| supabase/migrations/20260909090400_job_request_manifest.sql | `ffff7d655e2eb743bde1f01b2426185dfaad5d0b25b0a0f47119dce6c189b323` |
| src/server/services/job-effects.service.ts | `39b2776f77cc2befa57ededf45c26945038c00a7ee421196dfac713181db0190` |
| src/server/services/job-effects.service.test.ts | `153c7d824bd85afc7357c1d826dff92cabdd3935de036739547b4e46c77bfc4f` |
| src/server/services/job-effects.sql.integration.test.ts | `16369c6e79c3e6a6c421705dfcaa8bf4664558c1a5949bae412165698697b51e` |
| src/server/services/brains.service.ts | `25540ef49705b0a9d52d8b4dd1ae9d15ae255345f624a006f052fe0414de37a5` |
| src/server/services/brains.service.test.ts | `74c5690b9c80fc16dfaa075e531e8a2baa3513b77d00b5e02947b874a8aafdce` |
| src/server/services/brains.effect-ownership.sql.integration.test.ts | `7f3413c3fe8d0dd96cc298027aa14135f0a4ee5a7351cca2d1c6ca32c39297a9` |
| src/server/services/finance-statements.effect-ownership.sql.integration.test.ts | `7eb0995ff7ee20e88588e1e8132c7e8ed5e0e00ae088c20881715ebc622ead77` |

## Open qualification

No requirement or phase is closed. Native brain tests cover PostgreSQL chunks, vectors and RLS, not the later Qdrant generation/outbox triggers;10-06 and phase15 retain that acceptance. Driver settlement testing remains incomplete after the earlier automatic safety-review stop. Full source typecheck, canonical native-lane admission for finance/brain, migration catalog, old-worker drain, packaging, release and operator indeterminate-recovery/retention policies remain separate gates.

Exact TODOs in904, job-effects.service.ts, brain registration and the native fixture point to the root QC proposal. No production migration, dependency update, paid call, commit, branch operation or deployment occurred.

## Root aggregate acceptance

The fresh current-source Hub type check passed0 errors/0 warnings. See10-09-VERIFICATION.md for exact snapshot/environment and comment-only differences. This supersedes the pending typecheck statements above; packaging, integration, operational and deployment gates remain open.
