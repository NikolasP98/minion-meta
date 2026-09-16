---
phase: 19-capacity-recovery
plan: "03"
artifact: recovery-verification
requirements: [CAP-03, DATA-03]
status: rehearsed-on-disposable-stores; closure blocked
policy_used: FIXTURE (synthetic; no decided policy exists) — see 19-RECOVERY-POLICY.md, 17 pending decisions
runner: scripts/qc/cross-store-recovery.mjs --disposable-only
identity:
  meta: origin/dev a018d6722904825d1c12fcb82d978448cde0265a
  node: v22.23.2 (node:sqlite, SQLite 3.51.3)
  hardware: Intel Core Ultra 9 185H, 22 CPUs, developer laptop, docker unavailable
evidence:
  - checks/gate-task2.log
  - checks/gate-task2-test.log
  - checks/cross-store-recovery-report.json
actual_adapters_exercised: [sqlite, filesystem]
fake_adapters_exercised: [vector-json]
unavailable: [postgres, qdrant, object-storage, libsql, managed-service]
---

# 19 — Cross-store erasure and restore rehearsal (disposable stores only)

No real store was opened. Every store below lives under one `mkdtemp` directory that is removed
when the run ends; the runner refuses any target argument and refuses to start when the environment
carries anything that looks like a store credential (`*DB_URL`, `QDRANT*`, `B2_*`, `TURSO*`,
`SUPABASE*`, `AWS_*`, `S3_*`). It reads `19-RECOVERY-POLICY.md` through `recovery-policy.mjs`
first; because that manifest is not certifiable, the rehearsal ran under the labelled fixture
policy (erasure unit contact, document tombstones kept, backup resurrection forbidden, no RPO/RTO
target). A fixture pass is evidence that the mechanism works on these adapters, not that the
requirement is met.

## What was exercised

| Inventory store class | Adapter used here | Actual? | What it models |
|---|---|---|---|
| postgres (copies 1–6) | `node:sqlite` file `hub.db`: `messages` → `knowledge_documents` (status tombstone) → `knowledge_chunks` (FK cascade) → `vector_outbox` (AFTER DELETE trigger enqueues the delete op) | actual SQL store, same lineage shape; **not PostgreSQL** | hops 1–4 of the deletion chain |
| qdrant (copy 14) | `qdrant-points.json`, one point per chunk with its content hash | fake (shape only) | hop 5, drained from the outbox |
| object-storage (copy 13) | `blobs/<subject>-<n>.bin` | filesystem stand-in | tenant files |
| filesystem (copy 16) | `sessions/<subject>.jsonl` | actual filesystem | session transcripts |
| sqlite (copy 17) | `node:sqlite` file `memory.db`, `memory_objects` with `ttl NULL` (permanent) | actual | typed memory |
| backup (copies 9/10/15/21/22) | `snapshot/` = `VACUUM INTO` of both databases + file copies | local file copy; **not a provider backup** | restore that resurrects |
| erasure ledger | `erasure-ledger.jsonl`, written before the first delete, deliberately outside the snapshot | proposed mechanism (not in source) | the thing RET-13 option 1 needs |

## Run at this identity (`checks/gate-task2.log`, receipt `checks/cross-store-recovery-report.json`)

| Step | Result |
|---|---|
| seed + trace | 3 subjects (`alpha`, `beta`, `gamma`); each traced to 2 messages, 1 live document, 2 chunks, 2 vector points, 2 blobs, 1 transcript, 1 memory object; outbox drained (0 pending) |
| snapshot | 5 entries: `blobs`, `hub.db`, `memory.db`, `qdrant-points.json`, `sessions`; ledger absent from it by design |
| post-snapshot write | 1 message for `alpha` (the RPO window) |
| erase `alpha`, vector drain interrupted after 1 op | after the crash: messages 0, live documents 0, tombstone 1, chunks 0, **outbox pending 1, vector points 1**, blobs 0, transcripts 0, memory 0 |
| replay drain | 1 op replayed; second drain is a no-op; erased subject has 0 live copies, tombstone 1, 0 pending |
| retained subjects | `beta`, `gamma` digests byte-identical before and after erasure |
| restore snapshot | 316 ms (run 2; 699 ms on run 1 — laptop, cold file cache); raw restore resurrected **11** copies of `alpha` |
| resurrection rule (`forbid`) | 1 ledger entry replayed → 0 live copies of `alpha`; `beta`/`gamma` digests still identical |
| RPO measured | 1 post-snapshot write lost; snapshot age at failure 678 ms; **no decided target** (REC-01/02/03) |
| RTO measured | 316 ms restore on 5 tiny files; **no decided target** |
| violations | 0 |
| exit | 0 (rehearsal), `CLOSURE: blocked` |

Negative cases (all in `cross-store-recovery.test.mjs`, 12/12 green): without the ledger the
restore leaves 11 live copies and the run fails; a crash without replay leaves the vector store
holding 1 point and 1 pending op and is reported as incomplete erasure; a store missing after
restore is reported as lost required state even though the erased subject is clean; a policy that
allows resurrection is measured (11 copies back, 0 ledger replays) without violation; the CLI
refuses a target, refuses without `--disposable-only`, refuses ambient credentials and refuses an
invalid policy manifest.

## Exact unavailable stores (closure blockers, not fixture failures)

| Store | Why not exercised | What would unblock |
|---|---|---|
| PostgreSQL (Supabase-shaped `messages`/`knowledge_*`/`brain_vector_outbox`) | docker daemon unavailable on this machine (17-02 exit 3, 19-02 DR-19-02-4); the meta snapshot carries no PGlite | DR-19-02-4 disposable PostgreSQL target, or a child plan that runs this lineage on the hub's PGlite dev dependency |
| Qdrant points and encrypted snapshots | no Qdrant process; the JSON point file only proves the outbox contract | disposable Qdrant container + `services/brain-vector` outbox worker (gateway files outside this plan) |
| B2 object storage | no bucket; lifecycle rules are not in source (RET-07) | RET-07 and a disposable S3-compatible target |
| Turso / LibSQL legacy tables | not rehearsed | RET-12 scope decision first |
| Managed provider backups (Supabase PITR, Turso) | provider-side; nothing local models them | RET-13 + REC-01 and a provider-plan check |

## What the rehearsal establishes and what it does not

Establishes, on disposable stores: a subject erasure can be traced across five store shapes; an
interrupted fan-out leaves receipts (pending rows, attempt counts) and converges on replay; a
pre-erasure restore resurrects every copy; keeping an erasure ledger outside the backup and
replaying it after restore removes the resurrected copies without touching retained subjects.

Does not establish: any behaviour of the actual Supabase, Qdrant, B2, Turso or provider-backup
adapters; any deletion path for `hub.messages` (none exists in source); any retention duration,
tombstone window, RPO or RTO — all 17 decisions in `19-RECOVERY-POLICY.md` remain pending and the
policy validator exits 2. CAP-03 and DATA-03 stay open.
