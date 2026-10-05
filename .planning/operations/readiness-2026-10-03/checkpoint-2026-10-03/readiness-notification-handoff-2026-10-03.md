# Notification Slice 5 readiness handoff — 2026-10-03

## State at pause

**Outcome: PAUSED / PARTIAL / NOT ACCEPTANCE-READY.**

The user asked to pause until next week. No new implementation or test was started after that request. The required CI-shaped PostgreSQL lane is not green: its retained run reports 275 passed, 10 failed and 13 pending out of 298 tests. Focused fixes were subsequently qualified in isolation, but the full 298-test lane was intentionally not rerun after the pause.

- Hub repository: `hub/`
- Branch: `fix/readiness-hub`
- HEAD at checkpoint: `875fb04369a3787aa93fb8d35f72f89c7946d460`
- Staged paths: **0**
- Commit/push during this checkpoint: **none**
- Production writes: **0**
- Current full worktree status snapshot: `readiness-notification-worktree-status-2026-10-03.txt`
  - SHA-256: `6f5d7cb1d1ccd0997d2780871619db4bb2e0f62d14cc19d2979ecbe7ae051d41`
- Other agents' HC036/UI/runtime changes are present in the same worktree. Do not clean, reset, stash, stage broadly or infer that every dirty path belongs to Slice 5.

## Exact current source bytes

The exact current S5 worktree bytes are frozen in:

- `readiness-notification-s5-source-2026-10-03.sha256`
- Manifest SHA-256: `62767c39b05d7a535945297c93c121fdea59833b824782064e6e7a1bd935145d`
- Entries: **48 files**

The manifest contains:

- **28 S5-owned new files**
  - `supabase/migrations/20261003170000_notification_audience_projection.sql`
  - `src/lib/notifications/projection-manifest.{ts,test.ts}`
  - `src/server/services/notifications/audience-projection.sql.integration.test.ts`
  - every file under `src/server/services/notifications/projection/`
  - every file under `tests/fixtures/notification-audience/`
- **20 shared notification/QC compatibility files**
  - `scripts/qc/jobs-postgres-contract.test.ts`
  - `scripts/qc/native-postgres-manifest.{ts,test.ts}`
  - `src/server/services/notifications/event-envelope.test.ts`
  - `src/server/services/notifications/outbox-{claim,settlement}.ts`
  - `src/server/services/notifications/worker-transaction.ts`
  - scheduler admission, discovery, loop, projector-contract and qualification-projector files
  - `tests/fixtures/notification-outbox/quarantine-cases.ts`
  - seven `tests/fixtures/notification-scheduler/` compatibility files

The three QC manifest files are shared with the root-owned HC039 seven-case entry. Preserve that entry and the current expected totals: 34 discovered native files, 18 jobs-lane files and 298 semantic tests.

The retained evidence-byte manifest is:

- `readiness-notification-s5-evidence-2026-10-03.sha256`
- SHA-256: `d99bae4f8cce9f6f140bdd98aac46937fd7daa4ee3790f40eaf1e51026ba55fc`
- Entries: **20 artifacts**

Some green receipts predate final formatting or later compatibility edits. They are historical proof for the named snapshot, not a claim that the 48 current bytes have passed every gate together.

## Approved contracts

Canonical metadata currently has approved frontmatter.

### Audience projection

- Canonical spec: `meta/specs/2026-10-03-notification-slice5-audience-projection-spec.md`
  - current canonical SHA-256: `cba12183e6f653691ab600f59b31a8b4355d184780ace80b2a9f882139ca01b5`
  - approved authored v11 SHA-256: `425eb193f6cf86f3f27b721a474362653f8133602f108e8ee374bc07b1268fe6`
- Canonical review: `meta/specs/2026-10-03-notification-slice5-audience-projection-spec.review.md`
  - current SHA-256: `4ffa36ffd4e0983984441cc30cf1e27bd7165b039f672454bfa3e415211ed1af`
- Parent v11 receipt: `notification-slice5-v11-parent-review.md`
  - SHA-256: `e64c0cc70e470f28208c52c9849dc4b620f53fd3dd8c0b3906988a911f387cd9`
- Independent Gateway receipt: `notification-slice5-v11-gateway-standards-review.md`
  - SHA-256: `6283fc9c71073a8743582695c502d6b21d2261e53ac9af0ee7d32e4250ef4c61`

### Integrity quarantine amendment

- Canonical spec: `meta/specs/2026-10-03-notification-slice5-integrity-quarantine-definer-amendment.md`
  - current canonical SHA-256: `8752f437006963495fe45a0a0da39a20f6e575860008b9741e33e054ab6e7150`
  - approved authored v4 SHA-256: `86f53356d8376e912a379286499114b55c1fc34d6a223f5cd4945607e54f44e0`
  - approved recon SHA-256: `067ef35a7db6fa653598391e9fd16b8c837665221ec05d7df457da7c8116404b`
- Canonical review: `meta/specs/2026-10-03-notification-slice5-integrity-quarantine-definer-amendment.review.md`
  - current SHA-256: `c6e36ed78e07172388be5fa83377bfe362c0cb3538d659b3806798cf8f04e47c`
- Parent v4 receipt: `notification-slice5-integrity-quarantine-parent-review-v4.md`
  - SHA-256: `c9a3ab68f3aaa9e5418da3500f910f14a70fbcabdf8833d5759066e0d92829b9`
- Independent Gateway v4 receipt: `notification-slice5-integrity-quarantine-independent-review-v4.md`
  - SHA-256: `632049da8871ed19097fc5af6a95390150c7b1b55ed8ff010a10611403a02727`

These contracts authorize local implementation and qualification only. They do not authorize production migration, external delivery, merge or release.

## Retained green evidence

| Scope | Result | Receipt |
|---|---:|---|
| Audience projection native | 23/23 passed | `notification-slice5-native-final-v3.log` SHA `d3c78bdf…`; JSON SHA `66ef4ed3…` |
| Audience cleanup | no child DBs/roles, 0 production writes | `notification-slice5-native-final-v3-cleanup.log` SHA `d8f020c8…` |
| Scheduler compatibility after routing-column fix | 16/16 passed | `notification-slice5-scheduler-compatibility-v3.log` SHA `3239bfb0…`; JSON SHA `dc8a1baf…` |
| Projection units | 4 files, 8/8 passed | `notification-slice5-focused-unit-final.log` SHA `a28c47e9…` |
| Native/QC manifest units | 2 files, 6/6 passed | `notification-slice5-native-manifest-final.log` SHA `60010a56…` |
| Quarantine native focus | 13/13 passed | `notification-slice5-quarantine-focused-v6.log` SHA `58a7556f…` |
| PostgreSQL 18 full migration | 10/10 passed | `notification-slice5-pg18-full-migration.log` SHA `1d36547d…`; cleanup SHA `b883e1d8…` |
| PostgreSQL 17.6 full runner | `ok:true`, 17 migrations applied, pending 0 | `notification-slice5-v11-pg17-actual-runner.stdout.log`; stderr and cleanup retained |
| Earlier configured Hub check | 0 errors, 0 warnings | `hub-coherent-check-hc039-v2.log` SHA `fc94e40f…` |

The audience plan receipt uses the captured production authority statement through the app role at 10,001 members. It recorded seven production statements, the required authority-source indexes, maximum source rows-times-loops 10,001 and a removed-`idx_org_members_org` negative. The scheduler plan receipt covers 100,001 pending plus 1,000 processing rows and four removed-index negatives.

The catalog fingerprint unit contains 21 named authority mutation classes inside its rejection case, plus exact PostgreSQL 17 and 18 admitted modes. The current migration also has pinned PG17.6 bridge/owner-transfer, semantic quarantine and cleanup artifacts under the `notification-slice5-pg17-*` and `notification-slice5-v11-pg17-actual-*` prefixes.

## Required CI-shaped lane: retained failure

Command used for the failed attempt:

```bash
env -i PATH="$PATH" HOME="$HOME" TMPDIR=/tmp \
  MINION_QC_DISPOSABLE=1 REQUIRE_JOBS_POSTGRES=1 \
  MINION_QC_DATABASE_URL=postgresql://minion_qc:disposable-parent-only@127.0.0.1:55461/minion_qc_vectors \
  node node_modules/vitest/vitest.mjs run \
  --config vitest.jobs-postgres.config.ts \
  --reporter=default --reporter=json \
  --outputFile.json=../notification-slice5-final-results/jobs-postgres.json
```

Retained receipts:

- `notification-slice5-jobs298-final.log`
  - SHA-256: `db538c06f1ad2e8f705cbee165699945c4b98fda1947db89ea68930e94fd2c73`
- `notification-slice5-final-results/jobs-postgres.json`
  - SHA-256: `ca8d77dd8f59773af897c45c8aae60789c4b904b83ce8011d455b722f5bc2474`

Console/file summary:

- 18 admitted test files
- 16 files passed
- 2 files failed
- 275 tests passed
- 10 tests failed
- 13 tests pending/skipped
- 298 tests total
- duration 311.02 seconds

Vitest JSON separately reports 55 internal suite groups, 52 passed and 3 failed. Those are internal describe/file-load groups, not the 18 manifest file count. The console summary above is the file-level result required by the QC contract.

### Failed file 1: brain corpus fixture admission

`src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts` failed during setup because the supplied database was `minion_qc_vectors`, while the fixture requires `minion_qc_corpus`. Its 13 semantic cases were therefore pending/skipped:

1. publishes a dirty conversation with receipts, health and exact progress in one owned commit
2. legacy WhatsApp and current job types share one semantic admission for the same conversation
3. dirty and reconcile scheduling of one conversation converge on one paid request and one revision
4. a taken-over job cannot publish, change source health or advance after its response arrives
5. cancellation between batches fences later admission and stops the second response
6. a lost provider response leaves an admitted receipt; retries never pay again
7. an older prepared snapshot never publishes over a newer source and re-prepares from the ledger
8. a rollback between publication and progress keeps received vectors; the retry publishes without paying
9. reconcile tombstones deleted conversations, keeps verified-empty sources healthy and commits the final cursor
10. Qdrant-owned mode publishes canonical text without any embedding call and rejects a mismatched active generation
11. tenant scoping holds under forced RLS and the restricted role never touches bg_jobs
12. two business jobs share one admission, publish the sales domain once and reconcile deletions
13. a stale business page cannot publish or advance over a record that changed after preparation

This was an invocation error, not a brain-corpus source failure. The correct marked disposable parent exists at `minion_qc_corpus`.

### Failed file 2: scheduler fixture compatibility

Ten scheduler cases failed because the isolated Slice4 fixture stopped at migration 160000 while current S5 discovery SQL reads `notification_outbox.kind` and `schema_version` from migration 170000:

1. fences organization renewal and settlement by live runtime owner and monotonic generation
2. waits through a held runtime row for heartbeat, organization renewal and completion without reporting lease loss
3. enforces exact coordinator and health-reader role, RLS, column and generation boundaries
4. alternates pending and expired discovery fairly under the four-claim and sixteen-candidate ceilings
5. returns coordinator busy for a held cursor and advances past a separately held organization row
6. rolls back pre-aborted discovery and explicitly abandons only an exact unstarted organization claim
7. rolls back an in-flight aborted discovery without advancing its cursor or stranding a claim
8. reconciles a failed unstarted-claim abandon through exact live receipt expiry before releasing global ownership
9. rejects bigint generation exhaustion for runtime, admission, organization and cursor state without resetting history
10. uses bounded production discovery and health SQL plans across one hundred thousand rows and fails when required indexes are removed

After that failure, the fixture gained an explicit test-only routing compatibility step: it adds/backfills the two columns, restores the S5 tuple indexes, grants the exact coordinator columns and replaces the fixture enqueue function with the exact routing body. The focused scheduler rerun then passed 16/16. The full 298-case lane was not rerun after this correction.

## Current unresolved qualification

1. **The 298-case lane must be rerun and pass with zero skips.** Use the correct disposable parent:
   `postgresql://minion_qc:disposable-parent-only@127.0.0.1:55461/minion_qc_corpus`.
2. Validate its JSON with:
   `bun scripts/qc/jobs-postgres-contract.ts ../notification-slice5-final-results/jobs-postgres-final.json`.
   Expected contract: `{files:18, passed:298, skipped:0}`.
3. Do not edit source while that lane runs. If it fails, retain the new raw log/JSON before debugging.
4. Run a fresh configured Hub `svelte-check` after all source settles. The earlier 0/0 receipt is not a final-current-byte proof. Two later fixture parameter type errors were corrected to `postgres.ParameterOrJSON<never>`, but no post-correction full check was run.
5. Run Prettier check on the exact S5 TS/JSON list and `git diff --check`. Shared scheduler compatibility files still need final-current-byte format qualification.
6. Rerun focused projection units and QC manifest tests after any change. The full jobs lane includes the audience native test, but retain its compact plan receipt.
7. Regenerate the source SHA manifest after any byte change.
8. Obtain parent source/blast-radius review against that final manifest. Do not stage or commit before coordination with the other worktree owners.

## Cleanup at pause

Cleanup receipt:

- `readiness-notification-s5-cleanup-2026-10-03.log`
- SHA-256: `4c25ca24d4d09480bb6305a828a5a1ca9c76600d51292fdbfff07c74f1d386b4`

Verified at `2026-10-03T23:14:22Z`:

- no owned Vitest/jobs process
- no S5 child database
- no `qc_%` fixture schema
- no transient notification/app-notification role
- no S5 fixture session
- no S5 container
- staged index empty
- production writes 0

The shared loopback parent remains running and was not mutated or stopped:
`minion_qc_corpus|minion_qc|minion-360-disposable:v1`.

