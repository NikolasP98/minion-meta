# Factory B independent implementation review

**Disposition: changes requested.** One confirmed blocking defect, B-V1, prevents complete known-cost accounting from settling the run budget. The focused existing suite passed; an independent numerical-boundary regression failed through all three real worker paths. No other blocking defect was confirmed in this bounded review.

Reviewed 2026-10-23 by Astra (`/root/astra_sdd_pulse_digest`). Runtime source was read only. No production access, paid inference, source edits, commits, pushes, PR creation, merge or deployment occurred.

## Frozen candidate and review basis

- Repository: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory`; branch `feature/agent-harness-b-factory`; base `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`; registered PR base `dev`.
- Developer manifest: `../../development/b-factory/source-manifest.json`; aggregate source identity `def8080c0ace0a08d8e26e8700b4f8269f0c1d5bc9cce944d072c3baabf10b25`. Independently verified all 25 file hashes and modes, including a final recheck when writing this report.
- Dependency lock identity: `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`, unchanged in the candidate.
- Contract: approved sibling `f-evals/specs/106-harness-factory/` artifacts and final independent SDD pass 1/pass 2 dispositions, scoped to parent A08/A09. Current Factory `AGENTS.md`, MINION engineering/testing/review and change-safety guidance applied.
- Source anchors below are relative to the candidate repository. Evidence paths in this report are relative to this directory unless specified otherwise.

## Standards review

**No blocking standards finding.** Changes follow the approved two-slice Factory scope, retain the six-second hook configuration and deterministic denial floor, and do not expand deployment authority. The tests use local stubs and disposable state. This review does not convert source or fixture evidence into deployment evidence.

**B-S1 — low, stale handoff text:** `agent/lib/jev.sh:355–357` still says error receipts must join run accounting and that the legacy sum ignores error files. The new accounting reader and actual worker emitters now supply that path. Remove or update this obsolete TODO during the B-V1 correction so the maintenance ledger describes remaining work accurately. This comment is not the cause of B-V1.

## Spec review

### B-V1 — high: finite known costs can produce incompatible receipt revisions and retain settled run reservations

**Requirement:** A08 / FR-B03 requires known billed subtotal, unknown exposure and dispatched inference count to remain distinct across the actual worker-to-runner accounting path. A complete known bill must be eligible for reservation settlement under the approved reconciliation contract.

**Source:** `agent/lib/jev-accounting.py:132–138` canonicalizes integer-valued floats but otherwise hashes Python JSON number formatting. `runner/src/jev-accounting.ts:424–426` hashes JavaScript `JSON.stringify` formatting. Python serializes the valid finite number `0.000001` as `1e-06`; JavaScript serializes it as `0.000001`. Identical records therefore receive different `receiptRevision` values. `runner/src/queue.ts:3139–3143` correctly requires a matching revision for a complete worker envelope and downgrades the mismatch to incomplete coverage. `runner/src/budget-reservations.ts:104–107` then correctly preserves the reservation instead of settling unverified coverage.

**Trigger and independent reproduction:** a loopback provider returns a known `$0.000001` bill with an invalid advisory answer. The scratch regression runs the actual guard and proxy, lets guard cleanup finish, extracts the actual result emitter from each of `agent/run.sh`, `agent/spec.sh` and `agent/reconcile.sh`, parses the emitted `FinishResult`, and calls the actual queue finish/reservation path using disposable SQLite state. It does not replace those callers with reimplemented helpers. The expected numeric bill is explicit in the fixture.

All three workers produce known complete accounting on each side but different receipt revisions. Each completed run retains `{settled_at: null, actual_usd: null}`. The run cost itself is recorded; its budget reservation remains committed. Repetition can consume the available reservation budget and block later work despite complete known bills. This is a false unresolved-exposure outcome, not a demonstrated overspend.

**Preserved evidence:** [scratch regression](tiny-cost-chain.mts), [full failing log](tiny-cost-chain.log). The log records each worker, known cost, both actual revisions and retained reservation. The test collects all three failures before asserting, so one worker's failure does not hide the other paths.

**Smallest correction:** define one deterministic numeric canonicalization for the receipt-hash boundary in both languages, covering every admitted finite cost number. Preserve the original known bill precision; keep unknown exposure distinct. Do not fix this by rounding currency, dropping tiny known values, treating them as unknown, or relaxing the binding/revision check. Add cross-language canonicalization fixtures and actual worker-to-queue settlement coverage for tiny and exponent-form values, known zero and ordinary values, retaining unknown/conflicting-receipt protection. Re-run this preserved regression against the corrected candidate and the focused accounting/proxy/deadline suite; update frozen source and proof hashes where applicable.

## Executed independent checks

Commands ran from the candidate's `runner/` directory. All providers were local test stubs; no model credentials or live inference were used.

| Command | Actual outcome | Evidence |
|---|---|---|
| `node --import tsx --test src/jev-accounting.test.ts src/jev-proxy.test.ts src/jev-deadline.test.ts` | Exit 0; 39 passed, 0 failed, 0 skipped; 12441.577575 ms | `focused-independent.log` |
| `node --import tsx --test /home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/b-factory/tiny-cost-chain.mts` | Exit 1; 1 failed test containing confirmed failures for run/spec/reconcile; 2160.396515 ms | `tiny-cost-chain.log` |
| SHA-256 and mode comparison of all 25 manifest entries | All matched, including final report-time recheck | `verification.json` and developer source manifest |

The scratch regression derives its wiring from the submitted actual-path integration test while independently changing the provider's cost and expecting exact settlement for that known value. It lives outside the product tree. No full-suite rerun was needed to establish B-V1.

## Acceptance trace and proof limits

| Acceptance | Actual callers and evidence inspected | Disposition |
|---|---|---|
| A08 / FR-B01 synchronous run admission, capped malformed debit, one in-flight request, retained counters | `jev-proxy.ts:88–125,268–354`; actual proxy tests for cap-one concurrency, rotation, malformed debit, retirement and revocation | Focused checks passed; no additional blocker found |
| A08 / FR-B02 once-only settlement, unknown exposure fence, expiry and restart | `jev-proxy.ts:171–183,283–289,369–388`; `jev-accounting.ts:48–218`; real journal/pending-receipt/restart and lock-recovery tests | Focused checks passed; source shows fsync before dispatch and receipt-only recovery without inference |
| A08 / FR-B03 receipt identity, failed billed calls, unknown separation, worker/queue/reservation/stats propagation | Actual guard → proxy → each worker emitter → `parseFinishResult` → queue finish → reservations; late accounting listener `queue.ts:3146–3160`, finish path around `3315–3347`; focused late stats/conflict tests | **Blocked by B-V1** for valid finite tiny bills; ordinary known/unknown cases pass |
| A09 / FR-B04 hook six-second outer budget, bounded semantic work, cancellation through response body | `jev-guard.sh:42–51,535–547,562–592`; `jev-http.ts`; `jev.ts:276–374`; actual Express abort/premature-close/normal-close and fetch/body tests | Focused checks passed; installed pinned-hook evidence inspected as below |
| A09 / FR-B05 direct shell, proxy shell, runner and legacy behavior | `jev.sh` deadline propagation and three-argument compatibility; submitted shell/deadline logs; independently executed runner deadline suite | Runner checks independently passed; shell qualification is developer-executed evidence inspected, not independently rerun here |
| A08/A09 / FR-B06 auth/privacy/site gates, advisory fallback and immediate deterministic denial | Actual proxy validation/admission; hook denial before semantic work; malformed/auth and fallback source/tests | No additional blocker found in bounded review |

## Installed-hook qualification evidence

Independently inspected `../../development/b-factory/pinned-hook-proof.py`, its raw stream output and its receipt. The driver invokes the exact installed Claude Code 2.1.233 binary, supplies a Bash-only fixture prompt and the real hook/settings, uses an explicit isolated environment with fake loopback-only credentials, and serves both inference turns locally. `/jev/decide` deliberately stalls for eight seconds. The stream records a matching hook start/response ID, successful hook completion and the expected fixture tool output; the driver asserts one Jev request and two local provider turns.

The recorded hook interval is **3864.93376299768 ms**, inside the four-second semantic bound; the original outer hook setting remains six seconds. The whole process interval is approximately 5809.67 ms. The qualified hook copy is executable (0555); the preserved read-only source-mode negative fixture exits 126 without a Jev request. This distinction agrees with the Docker executable-copy contract.

Independently rehashed the exact installed binary (`55d281096f57d411ebbdd94dbf5e9ff3accb7c05713e37348c2c11d4b83bf9d9`), settings (`56f972b9d69f494646dc8c19bb673309237131f583fa90d28968fc1aff32b035`), hook, shell library and Python accounting helper against the proof receipt; all matched. This is developer-executed native pinned-binary evidence independently inspected. It is neither an independently rerun native proof nor a built Docker image or deployed-runtime qualification.

The developer packet separately reports 1261 passing runner tests, typecheck and shell/static checks. Those are attributed to that packet, not claimed as independently executed here. No required acceptance is waived: B remains unapproved until the finite-cost defect is corrected and verified against a new frozen candidate.
