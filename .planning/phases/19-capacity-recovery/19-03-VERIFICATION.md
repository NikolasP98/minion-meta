---
phase: 19-capacity-recovery
plan: "03"
verified: 2026-09-11T17:35:00Z
status: gaps_found
slice_status: partial
score: 2/2 plan truths verified at the fixture/policy boundary; 0/2 requirements closed
requirements_verified_in_scope: [CAP-03, DATA-03]
requirements_completed: []
snapshot: /home/nikolas/.cache/claude-tmp/19-03-865a8852
gaps:
  - truth: "Deletion/restore is qualified against decided retention and recovery policy"
    status: blocked
    reason: "No decision exists for any retention duration, tombstone/dead-row window, backup resurrection rule, RPO or RTO; the validator reports 17 pending decisions blocking 97 contract fields and exits 2. The rehearsal ran under a labelled fixture policy."
    missing:
      - "RET-01…RET-14 (15-03) and REC-01…REC-03 (this plan) decided with authority"
  - truth: "Actual cross-store adapters satisfy the policy"
    status: blocked
    reason: "Docker unavailable; no PostgreSQL, Qdrant, B2 or Turso target; hub/gateway adapter files are outside files_modified. Exercised: node:sqlite (actual SQL), filesystem (actual), JSON vector file (fake)."
    missing:
      - "DR-19-02-4 disposable PostgreSQL; child plans owning brain-corpus.service.ts, brain-vector outbox.ts, storage/blob.ts"
  - truth: "Rehearsal consumes the 17-04 restore harness"
    status: blocked
    reason: "scripts/qc/fixture-restore.mjs and 17-RESTORE-RESULTS.md do not exist anywhere; plan 17-04 was never executed."
    missing:
      - "Execute 17-04"
---

# 19-03 verification (goal-backward)

## Must-have truth 1 — "Policy manifest either validates actual decided values or precisely reports missing decisions before mutation."

| Check | Evidence | Result |
|---|---|---|
| Validates decided values when they exist | `recovery-policy.test.mjs` test 1: a fully decided synthetic policy (retention/erasure/resurrection/RPO/RTO with decided references) → 0 errors, 0 missing, `certifiable: true`; test 10 verifies source references inside a supplied root and rejects `../outside.ts` and a missing file | Verified (`checks/gate-task1.log`, 11/11) |
| Reports missing decisions precisely | Test 2: pending RET-01 → `missing[0].blocks == ['x.source.retention','x.source.erasure','x.derived.retention','x.derived.erasure']`, options carried, 0 errors, not certifiable. Real run: 17 pending decisions, 97 blocked fields, each printed with decider, question, blocked `copy.field` list and options with impact | Verified (`checks/recovery-policy-run.log`, exit 2) |
| Refuses before mutation, never auto-selects | `main()` returns 2 and prints `REFUSED TO CERTIFY` (test 11 on the real manifests); `cross-store-recovery.mjs` reads this result first and labels its run FIXTURE; no code path writes a value into a contract | Verified |
| Rejects invented policy | Test 3: value referencing a pending decision → `value set ahead of pending decision RET-01 (invented policy)`. Test 4: contract still pointing at a decided decision → rejected (half-applied) | Verified |
| Deletion-propagation identity across stores | Contracts carry `lineage { derivedFrom, identity, mechanism }` for hops 1–5 (messages → sources → documents → chunks → outbox → Qdrant); test 6 rejects a derived copy outliving its source and an erasure-unit mismatch; test 7 rejects a backup covering an obligated copy without a resurrection rule and a forbid/allow conflict | Verified at manifest level; the real chain's hop 1 mechanism is `none-found` and is reported as such, not filled |
| Required values where obligations exist | Obligation derived from inventory `contains`; test 5: obligated copy without `rpo`/`erasure` → errors; metadata-only copy needs `retention` only | Verified |
| Negative/unsafe manifests | Test 8: unknown copy, duplicate contract, unknown `coveredBy`, empty lineage identity/mechanism, dangling decision, missing contract. Test 9: bad `decidedAt`, empty reference, malformed id/status, <2 options, impact naming no copy, credential-looking string, `.env` reference, inventory decision not carried | Verified |
| Plan gate | `node --test scripts/qc/recovery-policy.test.mjs` | 11 pass / 0 fail, exit 0 |

## Must-have truth 2 — "Actual disposable stores satisfy deletion/retry/restore policy with receipts and no lost required state; unresolved stores block closure."

| Check | Evidence | Result |
|---|---|---|
| One synthetic source, all copies traced | `trace()` counts 9 copy classes per subject; seed asserts every store holds the subject (test 1 exact counts) | Verified |
| Delete under policy | Fixture policy only (no decided policy exists) — labelled on every output line and in the receipt `policy.label` | Verified as fixture; **not** decided policy |
| Interrupt one store, replay | Vector drain throws after 1 op leaving `outbox_pending 1, vector_points 1` with `attempts` incremented; replay applies 1 op, second replay 0; negative test 7 shows the violation when no replay happens | Verified (tests 3, 5, 7; live run) |
| Restore prior snapshot, tombstone/erasure rules prevent unauthorized resurrection | Raw restore resurrects 11 copies; ledger (outside the snapshot, asserted absent from it) replayed once → 0 copies; negative test 6: without the ledger 11 copies remain and the run fails; test 9: an `allow-within-window` policy is measured (11 back) without violation | Verified on disposable stores |
| No lost required state | Retained subjects' digests (rows, hashes, points, blob contents, transcript, memory) equal before/after erasure and after restore; negative test 8 detects a store dropped on restore | Verified |
| Receipts | `checks/cross-store-recovery-report.json`: per-step traces, timings, store table with `actual` flags, unavailable map, RPO/RTO measurements, pending decision ids, script/policy/inventory hashes, node version | Verified |
| Measured against decided targets | RPO 1 lost write / RTO 316 ms reported with verdict `no decided target (REC-01/02/03 pending)` | Measured only — blocked on REC-01/02/03 |
| Exact unavailable stores reported | `UNAVAILABLE:` line and `19-RECOVERY-VERIFICATION.md` table: postgres, qdrant, object-storage, libsql, managed-service with reason and unblocking condition | Verified |
| Unresolved stores block closure | `CLOSURE: blocked — pending 17 decisions; actual … adapters not exercised`; `closure` becomes `rehearsed-under-decided-policy` only when `evaluate()` certifies and violations are 0 (test 9 exercises that branch synthetically) | Verified |
| Never runs against live storage | Refuses any target argument, refuses without `--disposable-only`, refuses ambient `*DB_URL|QDRANT|B2_|TURSO|SUPABASE|AWS_|S3_` env keys (test 10), stores under `mkdtemp` removed after the run (test 12 asserts the directory count returns to baseline) | Verified |
| Plan gate | `node --test scripts/qc/cross-store-recovery.test.mjs && node scripts/qc/cross-store-recovery.mjs --disposable-only` | 12/12, then `violations 0`, exit 0 (`checks/gate-task2.log`) |

## Requirement status

**CAP-03** "Restore and cross-store deletion are verified against decided retention/recovery policy": the mechanism is verified on disposable stores against a *fixture* policy; no decided policy exists to verify against, and the actual adapters were not exercised. Open.

**DATA-03** "Every retained copy … has an explicit retention/deletion owner": every copy has a contract and an owner (from 15-03) and the validator can certify once values are decided; today it refuses. Open.

## Scope check

Only the six `files_modified` paths are new in the meta snapshot, plus the hash-verified copy of the 15-03 inventory (unmodified) and this phase's planning documents (`checks/snapshot-status.txt`, `before.txt`, `after.txt`, `15-inputs.sha256`). Main checkout writes: this SUMMARY/VERIFICATION pair and hash-identical copies of the two owned planning documents. No commit, stage, push, deploy, credential, `.env`, production or staging contact; network calls were `git fetch origin <base>` ×4 and the snapshot `pnpm install`. Read-only hub/gateway/site worktrees were removed after use.
