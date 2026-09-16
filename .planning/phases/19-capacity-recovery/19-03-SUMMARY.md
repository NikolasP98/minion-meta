---
phase: 19-capacity-recovery
plan: "03"
requirements: ["CAP-03", "DATA-03"]
requirements-completed: []
requirements-partial: ["CAP-03", "DATA-03"]
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/19-03-865a8852
snapshot_bases:
  minion-meta: origin/dev a018d6722904825d1c12fcb82d978448cde0265a
  read_only_roots_for_source_reference_checks (removed after the run): hub origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285; gateway origin/DEV 03239087c550853bc9a93a79bb3c709fea1f8513; site origin/master 0ed4e1b16cef4ca9287314df5af58a8af17f537c
checks: /home/nikolas/.cache/claude-tmp/19-03-865a8852/checks
verified_at: 2026-09-11
owned_files:
  - path: scripts/qc/recovery-policy.mjs
    before: absent
    after: a18d5f494111998eca1bccf1fddef0f9919dfce280fdbd3f226b69ac6d054a03
  - path: scripts/qc/recovery-policy.test.mjs
    before: absent
    after: 615f95172cc7315af08e769fc0839ca099b3fb05a810654525b2541b9ebed332
  - path: .planning/phases/19-capacity-recovery/19-RECOVERY-POLICY.md
    before: absent
    after: 4a63225ffe2aca7b0a7ce87c7ac2da3c591f65af5618683b1a5e5223319a0dae
  - path: scripts/qc/cross-store-recovery.mjs
    before: absent
    after: bab7aa7e16af4dd7a656f642a7d148ba2d9a323c66b9726f4c7b1ca5d2f93ada
  - path: scripts/qc/cross-store-recovery.test.mjs
    before: absent
    after: d3171d876877bc12e357c3b70395fd2ffceb290b46aaaac44e1617b0f3cd9ecb
  - path: .planning/phases/19-capacity-recovery/19-RECOVERY-VERIFICATION.md
    before: absent
    after: 1cc85d3452e4da8699b3d847e2254b47216b6d7ca13811a4df1b4ba9d7b11daf
decision_requests: [RET-01, RET-02, RET-03, RET-04, RET-05, RET-06, RET-07, RET-08, RET-09, RET-10, RET-11, RET-12, RET-13, RET-14, REC-01, REC-02, REC-03]
---

# 19-03: Policy validator refuses to certify; erasure/restore rehearsed on disposable stores only

Status is **partial**. Task 1 delivered a policy validator that joins the 15-03 inventory (23 copies) with a per-copy contract manifest and, at this identity, reports **0 errors, 17 pending decisions blocking 97 contract fields, exit 2, `REFUSED TO CERTIFY`** — exactly the root gate note: no retention duration, tombstone window, backup-resurrection rule, RPO or RTO exists with authority, and none was invented. Task 2 delivered a rehearsal that seeds a synthetic lineage, traces it across a real SQLite store, two filesystem stores, a second SQLite memory store and a JSON vector stand-in, erases with one store interrupted, replays, restores and re-erases through an erasure ledger: **0 violations, exit 0, `CLOSURE: blocked`** because the policy is a labelled fixture and the actual Postgres/Qdrant/B2/Turso/provider-backup adapters cannot run here. CAP-03 and DATA-03 stay open. Nothing was committed, staged, pushed or deployed; no real store, credential, `.env` or production/staging endpoint was touched; the only network calls were `git fetch origin <base>` (meta, hub, gateway, site) and `pnpm install --frozen-lockfile --ignore-scripts` in the snapshot.

## Identities

Meta snapshot `origin/dev` `a018d672` (detached worktree; the 19-02 snapshot was on `d3aab3b`; `scripts/qc/` on this base holds only `package-consumer-matrix` and `package-provenance` — the `release-evidence`/`repo-truth` scripts in the main checkout are branch-local). Runtime node v22.23.2 with `node:sqlite` (SQLite 3.51.3), pnpm 10.15.0, no dependency added (`checks/freeze.json`). Docker unavailable. The 15-03 inventory is untracked on `origin/dev`; it was copied into the snapshot and hash-verified against 15-03's after-hash `8b13bb00…` (`checks/15-inputs.sha256`). Source references in the policy were verified against read-only detached worktrees of hub `1df0a921`, gateway `0323908` (moved since the inventory's `8499d8f`; all referenced paths still resolve) and site `0ed4e1b`, removed after the run (`checks/roots.txt`).

## Task 1 — retention/recovery decisions as testable store contracts

`scripts/qc/recovery-policy.mjs` (node builtins; exports `evaluate`, `extractManifest`, `main`) reads the inventory's JSON manifest and the policy manifest embedded in `19-RECOVERY-POLICY.md`:

- **Obligation is derived, not declared**: a copy whose inventory `contains` holds customer content, identifiers, derived content, embeddings, financial source documents, auth tables or credential material must state `retention`, `erasure` (unit + mechanism), `backupResurrection` (when covered by a backup or itself a backup), `rpo` and `rto`; metadata-only copies need `retention` only.
- A field is `{ decision: ID }` (pending → reported with question, decider, options with impact, and the exact `copy.field` list it blocks) or `{ value, reference }` (reference = verified source path inside its repo root, or a *decided* decision id). Errors: value ahead of a pending decision (invented policy); contract still pointing at a decided decision (half-applied); dangling/duplicate/unknown ids; inventory decision not carried; malformed decided/pending records; credential-looking strings; `.env` references; malformed value shapes.
- **Deletion-propagation identity**: a derived copy declares `lineage { derivedFrom, identity, mechanism }`; a derived retention longer than its source, or an erasure unit that differs from its source, is an error; a backup covering an obligated copy without a resurrection rule, or allowing resurrection the copy forbids, is an error.
- Exit 0 certifiable / 2 pending / 1 invalid. It never fills a value, never selects a default, never opens a store.

`19-RECOVERY-POLICY.md` carries 23 contracts (one per inventory copy), the 14 RET decisions from 15-03 each with 2–3 concrete options whose impact names the copies affected, plus three new recovery decisions: **REC-01** RPO/RTO for managed databases, **REC-02** for gateway state restored from snapshot files, **REC-03** for rebuildable stores. Values quoted from source with references: `hub.email_ledger` 180 d, `hub.server_backups`/`hub.gateway_snapshot_files` count 7, `gateway.session_transcripts` 30 d, `hub.brain_vector_outbox` row ACK-delete, `site.legacy_conversation_tables` Meta-callback purge. The lineage table shows that the chain head `hub.messages` has no delete path in source, hop 2 leaves a tombstone, hop 4 leaves dead rows and every backup can resurrect — so a subject erasure today is a description, not a mechanism.

Run with roots (`checks/recovery-policy-run.log`): `23 contracts over 23 copies; 0 errors; 17 pending decisions blocking 97 contract fields; certifiable=false`, 36 option lines printed, exit 2.

## Task 2 — cross-store erasure and restore in disposable stores

`scripts/qc/cross-store-recovery.mjs --disposable-only [--out receipt.json]` (exports every step for the tests): refuses any target argument, refuses without `--disposable-only`, refuses when the environment holds `*DB_URL|QDRANT|B2_|TURSO|SUPABASE|AWS_|S3_` keys, refuses an invalid policy manifest; otherwise evaluates the real policy and, since it is not certifiable, runs under `FIXTURE_POLICY` (labelled on every line of output) in a `mkdtemp` directory removed afterwards. Flow and result at this identity (`checks/gate-task2.log`, receipt `checks/cross-store-recovery-report.json`):

| Step | Result |
|---|---|
| seed 3 subjects, trace | each: 2 messages, 1 live document, 2 chunks, 2 vector points, 2 blobs, 1 transcript, 1 permanent memory object |
| snapshot (`VACUUM INTO` ×2 + file copies; erasure ledger kept outside) | 5 entries |
| post-snapshot write | 1 message (RPO window) |
| erase `alpha`, vector drain interrupted after 1 op | outbox pending 1, vector points 1, everything else 0, tombstone 1 |
| replay | 1 op; converges; second drain no-op; `beta`/`gamma` digests unchanged |
| restore | 316 ms (699 ms on the first run); 11 copies of `alpha` resurrected |
| ledger replay (`forbid`) | 0 live copies; retained subjects byte-identical |
| RPO / RTO | 1 lost write, snapshot age 678 ms / 316 ms — **no decided target** |
| violations / exit | 0 / 0; `CLOSURE: blocked — pending 17 decisions; actual postgres/qdrant/object-storage/libsql/managed-service adapters not exercised` |

`19-RECOVERY-VERIFICATION.md` tabulates the adapters (actual: `node:sqlite`, filesystem; fake: JSON vector file), the exact unavailable stores with what unblocks each, and what the rehearsal does and does not establish.

## Gate results (logs under `checks/`; every exit code captured, nothing piped through `tail`)

| Gate | Command (from the snapshot root, `env -i PATH HOME TMPDIR`) | Result | Log |
|---|---|---|---|
| Task 1 verify | `node --test scripts/qc/recovery-policy.test.mjs` | 11 tests, 11 pass, 0 fail, 0 skipped; exit 0 | `gate-task1.log` |
| Task 1 real run | `node scripts/qc/recovery-policy.mjs --root hub=… --root gateway=… --root site=…` | 23 contracts, 0 errors, 17 pending, 97 blocked fields; exit 2 (refuses to certify, as required) | `recovery-policy-run.log` |
| Task 2 unit | `node --test scripts/qc/cross-store-recovery.test.mjs` | 12 tests, 12 pass, 0 fail, 0 skipped; exit 0 | `gate-task2-test.log` |
| Task 2 verify (plan command) | unit test `&&` `node scripts/qc/cross-store-recovery.mjs --disposable-only --out …` | 12/12 then `REHEARSED … violations 0`, `CLOSURE: blocked`; exit 0 | `gate-task2.log` |
| Whitespace / diff-check | trailing-whitespace + tab grep on 6 owned files; `git diff --no-index --check`; `git diff --check` | 0 findings each; exit 0 | `whitespace-check.log` |
| Scope | `git status --porcelain` in the snapshot | only the 6 owned files, the copied inventory and this phase's docs | `snapshot-status.txt` |
| Install | `pnpm install --frozen-lockfile --ignore-scripts` | exit 0 | `install.log` |

Red-then-green kept: `gate-task1.log` first failed twice on test fixtures that referenced RET-01 for recovery fields while making RET-01 pending — the validator correctly flagged them as invented values; the fixtures were corrected, not the validator. `cross-store-run-try1.log` shows the first live run with a wrong step index in the summary line (`replayed undefined`), fixed before the gate. The Task 2 test file first failed to load on a misplaced import (`DEFAULT_POLICY` lives in `recovery-policy.mjs`).

## Deviations

- **Prerequisites absent.** Task 2's `read_first`/`key_links` name `scripts/qc/fixture-restore.mjs` and `17-RESTORE-RESULTS.md` (plan 17-04, requirement OPS-04). Neither exists in any checkout or snapshot: 17-04 was never executed. The rehearsal is therefore self-contained (snapshot/restore implemented with `VACUUM INTO` + file copies) and does not consume 17-04's restore harness. The plan's key link to `fixture-restore.mjs` is unmet by construction; `retention-inventory.mjs` (15-03) likewise exists only in that plan's snapshot `checks/`, so `extractManifest` is re-implemented (3 lines) rather than imported.
- `19-BOTTLENECKS.md` and `19-CAPACITY-REPAIR-PLANS.md` exist only in the 19-02 snapshot, not in the main checkout; they were read there. This plan's two owned planning documents were copied into the main checkout's `.planning/phases/19-capacity-recovery/` (hash-identical to the snapshot) so downstream plans do not hit the same gap; nothing else in the main checkout was touched.
- Docker unavailable (as in 17-02/19-02): no PostgreSQL, Qdrant or S3-compatible target; stores are `node:sqlite` and filesystem. `node:sqlite` prints an `ExperimentalWarning` on Node 22; it is a builtin, not a dependency.
- Read-only worktrees of hub/gateway/site were added under the snapshot for source-reference verification and removed (`git worktree remove --force` + `prune`) afterwards; those repositories are as found.

## Gaps and what unblocks them

| Gap | Reason | Unblocked by |
|---|---|---|
| Policy not certifiable | 14 RET + 3 REC decisions pending; no authority has decided a duration, tombstone/dead-row window, resurrection rule, RPO or RTO | Owner decisions RET-01…RET-14, REC-01…REC-03 recorded in DECISIONS.md, then `19-RECOVERY-POLICY.md` updated per its "How a decision lands" section; validator exit 0 |
| Actual adapters not exercised | No PostgreSQL/Qdrant/B2/Turso/provider backup on this machine; the hub/gateway adapter files are outside `files_modified` | DR-19-02-4 disposable PostgreSQL; child plans owning `minion_hub/src/server/services/brain-corpus.service.ts` (documents tombstone → chunks), `services/brain-vector/src/outbox.ts` (Qdrant delete), `storage/blob.ts` (B2 delete) to run this lineage against real adapters |
| No delete path for `hub.messages` | Source has none (inventory copy 1); this plan owns no hub file | RET-01 decision + a hub child plan adding the purge/erasure executor and the erasure ledger (RET-13 option 1) |
| 17-04 restore harness absent | Plan never executed | Execute 17-04; then re-point this rehearsal's snapshot/restore step at `fixture-restore.mjs` |
| RPO/RTO qualification | Measured only (1 lost write, 316 ms restore on tiny files); no target | REC-01/02/03 |

No `TODO(handoff)` was placed in hub/gateway source because none was edited; the open items live in the two owned planning documents. Root owns any `proposals/` entry.

## Next gated plan

Decisions first: RET-01 and RET-13 unblock the most contract fields (8 and 13 respectively) and together define whether an erasure can be declared complete. After them, a hub-owned child plan for the `hub.messages` erasure executor + erasure ledger is the smallest source change that turns hop 1 of the chain from "none found" into a mechanism; the rehearsal here already pins the ledger's contract (written before the first delete, kept outside the backup, replayed after restore).
