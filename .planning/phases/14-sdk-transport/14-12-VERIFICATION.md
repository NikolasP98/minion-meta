# Gateway durable receiver verification (14-12)

Scope: six-file private candidate in /tmp/minion-14-12-receiver-foox9ehr/minion (inherited branch fix/ci-cost-remaining-gaps, credential-free copy, 101 read-only dependency links, fresh complete shared artifact `f6a3c237…`, qualified 14-14 facade `114feca0…`/`3978f4a9…`, unchanged parser `b69a8256…`).

Root independently repeated the frozen commands on 2026-09-09 (receipts in `checks/root/`): `node qc-run-receiver.mjs` exit 0 — 69/69 passed, 0 skipped, 0 unhandled (run-store 16, manager 40 = 29 existing + 11 durable, bridge-ws 13 = 9 existing mock-manager controls + 4 real-manager/native-store); collected set equals the selected set; private cache `qc-cache/vitest/da39a3ee…`; loopback guard 13 listens / 21 connects / 0 denied, residue 0 servers / 0 ports / 0 clients; `qc-db/` empty afterwards. `tsc -p qc-types.json --noEmit` exit 0 with empty output. `oxlint --type-aware` 0 warnings / 0 errors (134 rules, 6 files). `oxfmt --check` exit 0. Root accepted the executor-added `qc-types.json` (mirrors the 14-14 profile config with the six owned files; the full tsconfig fails only on `test/` helpers excluded from the snapshot). Runner, config and network guard bytes are unchanged from root's review.

Frozen identities (root rehash matches the executor):

- `src/shells/run-store.ts`: `fe5181fba64baf4ee80e8d3c20364f48177cf73e11a491a8f3b485df4b2f6ae5`
- `src/shells/run-store.test.ts`: `b349b8c71171f59b9f72ecfa0a35de699c672d48e4377b7b3b0eabf55d5fd461`
- `src/shells/manager.ts`: `5543ffdc6af8b369372c20a588f74d0db5b28f844371625f26cc52a23e4cf1ad`
- `src/shells/manager.test.ts`: `230eaccebc6fb8f7cc1868f003e7bb49dc9a3df4b5151ac913471abfd22a77b4`
- `src/shells/bridge-ws.ts`: `e7f30b924e150dbc75b9fc9e76ae95e545a537cbb09f33a355365445bf3cc7f9`
- `src/shells/bridge-ws.test.ts`: `760bd94a365adeb224cb5ce7bdb880054612a94b7e444d07b70dfb5de4585686`

Executor rehashed all 4,499 unowned inputs, the private package, 101 links and the recorded active gateway files: zero drift. The active `minion/src/shells` working tree carries only the pre-existing dirty state recorded at session start.

Accepted deviations from a literal reading of the plan's verify lists: (1) `TOO_LARGE` at the 81,920-byte reservation is unreachable for canonically valid v1 records (max escaped outcome ≈57,146 B against 57,344; metadata+aggregate ≈72.8 KiB) — the executor tests a reachable oversize refusal at canonical validation (4,097-byte text) that leaves the obligation unresolved, plus measured feasibility assertions; (2) no observer/broadcast exists on the durable commit path, so the tested equivalent is a post-COMMIT ACK send failure with the receipt retained and readable from a second handle; (3) "suppressed stale post-commit ACK" is covered by superseded-open-socket denial at the endpoint plus post-COMMIT send failure, not a mid-flight replacement race; (4) two fixture repairs in owned test files (await socket closes — a pre-existing leak exposed by the guard — and mock-manager stubs for the new endpoint checks) with no existing 09-06 control weakened.

Not claimed: caller routing/authorization, production config/open/close wiring, sender 11-03, package/lock/image adoption, failed-COMMIT/process/power-loss injection, exact Node 22.13.0 or unsupported-distribution runtimes; same-UID pathname/inode replacement between opens remains unguarded (11-07 limitation, stated in code). SDK-01, SDK-02 and AGT-04 stay open. Nothing was adopted into the active checkout.
