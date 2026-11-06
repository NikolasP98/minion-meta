# Factory B revision 1 — independent correction verification and convergence

**Standards: approved. Spec: approved. B-V1 and B-S1 are resolved.** The implementation satisfies the reviewed A08/A09 software scope. No further software convergence task was identified. T015's parent-owned scoped PR creation remains a delivery action; merge, promotion, deployment and paid operations remain separately gated.

Reviewer: Astra `/root/astra_sdd_pulse_digest`, 2026-10-23. This bounded review preserves the original failed regression and review. Only this revision's audit directory was written; no runtime/spec/index/branch/commit edits, production access or paid inference occurred.

## Exact candidate

Repository: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory`; branch `feature/agent-harness-b-factory`; base `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`; PR base `dev`.

Independently recomputed the canonical sorted compact-JSON manifest digest: **`4a9ad22073efc509dc8c11e4ad0c8ea912bf7c2d5b34f0680b2535571ee0001a`**. All 25 file SHA-256 values and modes matched, including a final report-time recheck. Compared with prior frozen candidate `def8080c0ace0a08d8e26e8700b4f8269f0c1d5bc9cce944d072c3baabf10b25`, exactly five files changed: `agent/lib/{jev-accounting.py,cost.sh,jev.sh}` and `runner/src/{jev-accounting.ts,jev-accounting.test.ts}`. The dependency lock is unchanged: `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`.

Read those five actual corrections against preserved original source/patch snapshots, then rechecked the unchanged queue, reservation, stats, admission and HTTP caller boundaries relevant to the correction. The original scratch regression's SHA-256 still equals the first independent review receipt.

## Correction disposition

**B-V1 closed.** Python `agent/lib/jev-accounting.py:28–46` and TypeScript `runner/src/jev-accounting.ts:294–308` now encode receipt-hash numeric inputs as typed big-endian binary64 hex. Python parses both integer and fractional JSON number tokens at the JavaScript binary64 boundary. Thus exponent spelling, tiny values and large integer tokens no longer create language-dependent revisions. The actual bill remains numeric, and both snapshot readers removed six-decimal total quantization (`jev-accounting.py:159`; `jev-accounting.ts:435–441`). `subtotal_text` (`jev-accounting.py:48–51`) uses the legacy six-decimal presentation only when it round-trips exactly; `cost.sh:27–29` calls that actual helper.

The queue still validates the binding and exact receipt revision (`queue.ts:3139–3143`); incomplete coverage still retains reservations (`budget-reservations.ts:104–107`). Unknown exposure, conflict quarantine and idempotent late settlement were not weakened to make the regression pass. All three real workers now settle the exact `$0.000001` bill after actual guard cleanup, result emission, FinishResult parsing and queue finish. The preserved regression reports matching shell/runner hashes and populated `settled_at`/`actual_usd` for run, spec and reconcile.

**B-S1 closed.** `agent/lib/jev.sh:355–356` replaces the obsolete accounting TODO with the implemented durable failed/unknown receipt behavior. No other behavioral change exists in that file relative to the first frozen candidate.

## Independent executed evidence

Commands ran from the candidate `runner/` directory with loopback stubs and disposable state. No live provider was contacted.

| Command | Result | Evidence |
|---|---|---|
| `node --import tsx --test /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/b-factory/tiny-cost-chain.mts /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/b-factory/revision1/numeric-boundary.mts` | Exit 0; 2 passed, 0 failed/skipped; 2471.78557 ms | [independent-regressions.log](independent-regressions.log) |
| `node --import tsx --test src/jev-accounting.test.ts src/jev-proxy.test.ts src/jev-deadline.test.ts` | Exit 0; 46 passed, 0 failed/skipped; 13168.722325 ms | [focused-independent.log](focused-independent.log) |

The original unchanged test exercises real guard → proxy/provider → cleanup → the exact emitter extracted from each actual shell worker → parser → queue → SQLite reservation. The new independent [numeric-boundary.mts](numeric-boundary.mts) writes raw JSON receipts and invokes the actual Python reader, actual TypeScript run reader and actual shell subtotal API. Its 16 inputs cover known positive/signed zero, minimum subnormal and normal values, `1e-7`, `1e-6`, fine precision, ordinary/binary fractions, adjacent finite values, large integer token rounding, `1e20`, `1e21`, maximum finite binary64 and unknown/null. It asserts exact numeric preservation, finite shell output, complete/incomplete distinction and cross-language revision equality. Known zero and unknown identities remain distinct. This complements rather than substitutes for the actual worker-to-reservation regression.

The focused suite additionally exercises cap-one races, token lifecycle, unknown fences, durable admission/settlement failure and pending-receipt recovery, actual late stats/reservation reconciliation, restart rejection, true Express disconnects, normal response completion and header/body deadlines. Its expanded repository accounting cases include ordinary/tiny/fine-precision/subnormal/known-zero/binary-fraction bills through all three workers, plus unknown and denied cases.

## Fresh installed-hook proof

Inspected the revision-1 developer driver, raw stream output and receipt; independently matched the exact hook-start/response ID, successful hook outcome, completed fixture tool, one stalled Jev request and two local provider turns. Rehashed the installed binary, original settings, hook, current shell library and current Python helper against the receipt; all matched.

- Exact native Claude Code 2.1.233 binary: `55d281096f57d411ebbdd94dbf5e9ff3accb7c05713e37348c2c11d4b83bf9d9`.
- Settings: `56f972b9d69f494646dc8c19bb673309237131f583fa90d28968fc1aff32b035`; outer budget remains six seconds.
- Current library: `aac7f422e3df09820feb6098c905ad546f76d5f22794d5374e2b4e547062122b`.
- Current accounting helper: `e64b70c873d5703deff0c53b0514a810ae9531c19583a1700f2766c48bd2f057`.
- Hook: `6e4b18ab873d4b929d0429e502498ea42f0a5908c70ec3c0c202491c9aede0eb`.

Measured hook interval: **3826.241859998845 ms**, below four seconds; entire fixture process: 5026.24 ms. The driver uses an explicit isolated environment, fake local key, loopback inference/proxy, eight-second stalled Jev endpoint, disabled telemetry/updater and blocking outbound proxy. The executable hook copy is 0555; original source mode remains 0644. This is refreshed developer-executed native-harness proof independently inspected, not a newly rerun harness or built/deployed Docker image claim.

Developer revision-1 logs separately record 1268 runner tests passed with zero failed/skipped, typecheck, required Jev/cost/guard/deadline shell checks, shellcheck, Bash syntax, 16 report tests and spec-worker integrity dry runs. Inspected their actual summaries and correction packet; no full-suite rerun was needed after the independent focused and discriminating boundary checks passed. These broader runs are attributed to Sol, not claimed as independently executed here.

## Spec Kit convergence

Applied the local `speckit-converge` contract and engineering Standards/Spec separation against the present implementation. Read approved feature `spec.md`, `plan.md`, `tasks.md`, contract, parent §§5.1–5.3/A08/A09 and constitution. Initialized with:

```bash
SPECIFY_FEATURE_DIRECTORY=/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals/specs/106-harness-factory SPECIFY_FEATURE_NO_PERSIST=1 .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
```

Exit 0 returned the exact feature directory and `research.md`, `contracts/`, `tasks.md`. No extension hooks are registered (`.specify/extensions.yml` absent). All 15 existing tasks were assessed regardless of their unchecked state; task checkboxes were not treated as proof. Checked six FR, four SC, nine user-story acceptance scenarios, eight numbered implementation-plan decisions and five constitution principles. The owner's two-slice/one-PR exception remains explicit; required UI gates do not apply to this Factory scope. No new missing, partial, contradictory or unrequested **software** work was found.

| Requirement / parent | Tasks | Actual implementation and evidence |
|---|---|---|
| FR-B01 / A08; US1 AC1/AC4; SC-B01 | T003–T005 | `jev-proxy.ts` separate run ledger, synchronous admission before await, capped malformed debit, one flight and no busy debit; actual cap-one/rotation/pressure tests pass. |
| FR-B02 / A08; US1 AC2/AC3; SC-B01 | T003–T005 | `jev-proxy.ts` identity settlement, unknown fence and lifecycle; `queue.ts:3347,3409,5017` and `queue-retirement.ts:90` terminal retirement; persistent no-remint journals/tombstones and receipt-only recovery; actual revoke/expiry/remint/restart/lock-failure tests pass. |
| FR-B03 / A08; US1 AC5; SC-B03 | T006–T008 | Durable Python/TS accounting → all three actual emitters → `FinishResult`/`parseFinishResult` → `queue.ts:3139–3159,3315–3319` → reservations; `stats.ts:23,60` caches only matching complete receipt state. Known failures, unknowns, denied calls, duplicate mirrors, late settlement and precision cases pass. Slice-7 actual shell/proxy/report path and submitted 16 report tests retain authority precedence. |
| FR-B04 / A09; US2 AC1–AC3; SC-B02 | T009–T013 | `index.ts:146,1170` installs early timing and actual route; `jev-http.ts` aborts genuine request/premature response close; `jev.ts` signal/timer spans fetch and body; `jev-guard.sh` independent bounded child and immediate floor. Real HTTP tests and refreshed installed-hook proof satisfy the specified local runtime boundary. |
| FR-B05 / A09; US2 AC4 | T009–T011/T014 | Additive remaining-duration/signal options retain unbudgeted general ceilings; shell normalization preserves three-argument callers. Independently executed runner deadline tests and inspected submitted direct/proxy/legacy shell logs pass. |
| FR-B06 / A08/A09 | T003/T005/T008/T011–T012 | Existing token/site/malformed controls and advisory fallback remain; queue/container env requires the run capability for qualified calls; no unknown/denied work disables baseline or deterministic floor. Focused auth/site/fallback and submitted floor/shell checks pass. |
| SC-B04 / evidence and lifecycle | T001–T002/T013–T015 | Exact source/lock/install/native-harness/gate evidence and two approved prior SDD passes are recorded; this independent correction review closes the implementation defect. PR creation remains parent-owned; no release has been authorized or performed. |

T006's stats regression is implemented through the actual stats APIs in `jev-accounting.test.ts`, rather than adding another test to `stats.test.ts`; this is a test-location adjustment with the required real late-settlement/cache assertion, not an uncovered behavior. New accounting helpers and route-lifetime extraction are narrow implementations of planned boundaries. No separate billing engine, scheduler, distributed limiter, retry mechanism or permission expansion was introduced.

**Convergence outcome: software converged; no new software tasks required.** T015 is partially pending only for the already planned parent-owned PR creation. No duplicate convergence task was appended; `tasks.md` and all specs remain byte-for-byte unchanged by this reviewer. Parent may proceed with scoped commit/PR preparation using this frozen identity. This report does not claim that the entire delivery lifecycle is complete.
