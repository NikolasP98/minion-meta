---
phase: 17-container-runtime
plan: "01"
verified: 2026-09-11
status: partial
requirements_verified_in_scope: [OPS-01]
requirements_completed: []
snapshot: /home/nikolas/.cache/claude-tmp/17-01-d9de7bf3/MINION
---

# 17-01 goal-backward verification

Executor self-check; independent verifier still owes the phase verification.

## Must-have truths

| Truth | Result | Evidence |
|---|---|---|
| Collector rejects identity drift | verified (synthetic) | `runtime-posture.test.mjs` "compareIdentity admits only full agreement…" and "evaluate blocks admission on drift…": marker moved → `sha-mismatch`, wrong image → `image-mismatch`, `.env` ≠ container → `flag-drift`, single source → not admitted; CLI exit 2. `checks/runtime-posture.test.log` 9/9. |
| Collector excludes secrets | verified (synthetic) | Three synthetic tokens in `Config.Env` and one in `env-flags.txt`; serialized output contains none; non-allowlisted `.env` key throws `disallowed-key`; `Cmd` and run titles absent. |
| Collector distinguishes actual process uid from Config.User | verified (synthetic) | `processIdentity`: empty Config.User + uid 0 → `root:true`; empty + uid 1000 → `root:false`; `1000:1000` declared + uid 0 → `matchesConfigUser:false`; no proc file → `source:'unobserved'`. |
| Packet fixes target image/flags | verified | `validateGatePacket`: `expected.imageId` must be `sha256:<64hex>`, override image must equal it or be a digest ref, flags must be exactly `{AUTOMERGE:0, AUTOPROMOTE:0, DISPATCH_PAUSED:1}`; 28/28 in `checks/operator-gate-contract.test.log`. |
| Packet preserves queued work | verified | `queue.preserve:true` required; `queueCounts` postcondition required; reconcile clause present. |
| Known race and needed maintenance authority explicit | verified | `race.disclosed:true` + non-empty window; `authority.granted:false` + `required` mentioning maintenance; `drainBarrier:'none'`; `emptySnapshotIsDrainProof:false`; prose "no in-process drain barrier". Red proof: flipping the drain claim fails 1/28 (`checks/operator-gate-red.log`, exit 1). |

## Artifacts

| Artifact | Present | Substantive |
|---|---|---|
| `scripts/qc/runtime-posture.mjs` | snapshot only, sha256 `912ab47f…` | parse/compare/evaluate/gate functions + CLI; no network, no exec |
| `scripts/qc/runtime-posture.test.mjs` | snapshot only, `d4b0d744…` | 9 tests incl. negatives |
| `scripts/qc/operator-gate-contract.test.mjs` | snapshot only, `59c4a32e…` | 28 tests incl. 25 rejections |
| `.planning/phases/17-container-runtime/17-RUNTIME-IDENTITY.md` | main checkout + snapshot, `e545438c…` | recorded identities (stale-labelled), allowlist, blocked commands |
| `.planning/phases/17-container-runtime/17-OPERATOR-GATE.md` | main checkout + snapshot, `2f55807e…` | validated packet + limits |

## Key links

- Collector ↔ `.planning/research/360-infrastructure-verification.md`: field allowlist, flag keys, identity sources (`/trigger-health.runningSha`, marker, candidate-sha, revision label), Docker-socket/limits posture and the "Config.User empty is not proof" caveat are implemented as parsed fields and tests.
- Packet ↔ research "Reviewable minimal gating packet": three-flag target, flock contract, override-only recreation command, keys-only rollback, 90/120 s sweep-window postcondition and the admission-limitation/race language are carried into JSON fields the validator enforces.

## Not verified / open

- No live host value was observed in this plan; OPS-01 remains open until the operator capture is evaluated (`17-RUNTIME-IDENTITY.md` "Blocked").
- Engine acceptance of a local image ID in a Compose override is untested.
- The packet was not dry-run on any host. No authority is granted or implied.
