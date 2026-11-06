# Digest E02 correction handoff

The two authorized E01 findings are corrected and frozen for independent review. Full Hub gates, quiet full native qualification and the 170-cell browser matrix remain parent-owned pending work. No further author jobs will start before allocation. No delivery operation, paid inference, browser session or F edit occurred.

The actual E development HEAD is `493a01261341abc2898d7a889f0af43059dcde8e`. The full source packet is `../freeze-e02/`: 61 owned paths, with eight changed paths from E01. The existing E01 packet and all six F reader files retain their bytes and modes. `source-continuity.json` verifies the frozen source after testing.

- Manifest `e-owned-files.json`: SHA-256 `63774c49bffa72923336143b45d364b09b96b984198340602d2719be71651a8d`.
- Full source archive `e-owned-source.tar.gz`: SHA-256 `02bd666fd3e0fe3cd43ff41f7a426622febace256e08dd4935186c45d3b19ca6`.
- `e02-delta-from-e01.json` records old/new hashes and modes. `packet-sha256.json` pins the packet members.
- Node 22.23.3, Bun 1.3.4 and lock SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` remain unchanged.

`pulse-tick.ts` performs housekeeping after validating the retained scope and policy/scope agreement, before policy and authority early returns. It invokes each existing family once: dispatch20, runs50 plus sources10, feedback20. It checks the existing monotonic deadline between families. Missing, malformed and mismatching scope deny all maintenance. No scope is discovered from the database or request. Module disablement, approval expiry and missing policy no longer prevent expiry cleanup.

`pulse-digest.store.ts` stores bound positive receipt/billing facts after payload expiry without restoring a raw response body. An age-expired response becomes indeterminate, retains its attempt/reservation, and preserves the unknown exposure fence. The durable PostgreSQL test exercises receipt arrival both before and after cleanup.

The existing contract and gateway route tests now cover 22 reserved-field/source/key attacks each, including nested array metadata, mixed-batch rejection and no upsert on denial. Existing machine identity, legacy tenant checks and external informational digest compatibility remain tested. No production ingress guard changed.

The changed native collection tests exercise the actual authenticated GET route and disposable PostgreSQL. They prove the three disabled/expired/missing-policy cases independently, invalid scope denial before database access, late billing preservation, and the global raw-record cap: exactly100 cleared on the first tick, with the remaining32 cleared on the next. The native manifest requires all12 collection cases. The runbook describes the corrected expiry behavior.

## Evidence

`commands.json` records exact commands and exits. All tests used serial workers and the marked owned disposable PostgreSQL. Public network was denied before imports for this correction round; inference used only the local provider fixture. Original E01 scheduler escape evidence remains preserved; its exact external source request count was uninstrumented.

- `retention-e01-red-results.json`: five intentional failures against the immutable E01 tick/store bytes, including all three retention cases, late expired response retention and disabled cleanup cap. `prove-e01-red.py` restores E02 source in `finally`; `retention-e01-red-source.json` pins old/restored hashes. Reviewer red files and observations were untouched.
- `unit-final-results.json`:80 passed,0 failed, exit0; actual ingress route, contract, tick budget, authenticated tick and mandatory native manifest tests.
- `native-affected-first-results.json`:45 passed,1 failed, exit1. All12 collection cases, admission, feedback and shared D store cases passed. The unchanged crash matrix hit its existing20s child timeout; the cause is unproven. The first failure is retained.
- `crash-rerun-results.json`: the already-active exact crash-only rerun passed1, failed0, skipped9, exit0. All six checkpoint children exited74 within the unchanged20s limit. `crash-child-timing.jsonl` records6.1s,7.1s,11.4s,9.2s,8.6s and9.0s. The audit-only spawn trace changes no request, assertion, timeout or production source. No further rerun was started after the parent's deferral instruction.
- Prettier check and `git diff --check` passed. `owned-jobs-at-handoff.json` records zero active author node/bun/child jobs.

The independent verifier may now rerun its unchanged three-case retention probe with E02 observations redirected to its correction directory. Root should update T017/T027 evidence references to this packet and retain the first timeout when reporting qualification. Full quiet native/check/unit/build/browser qualification is still pending; this handoff does not claim those gates passed.
