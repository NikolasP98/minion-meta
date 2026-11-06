# Factory independent review

Scope: Slices 6–7 of `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, reviewed against the isolated `minion-factory` implementation clone. No Factory product edits by this reviewer. Final disposition: A06/A07 review passes after the correction below; Slice 8 accounting/admission limits remain deferred.

## Standards

No separate standards blocker found in the inspected shell, proxy, result and reconciliation changes. The implementation preserves legacy three-argument shell calls, keeps inference identity separate from local tags, and quarantines conflicting authoritative/local rows.

## Spec finding

**P1 / corrected — Retain known usage even when result validation fails.** In `runner/src/jev.ts`, `jevDecideAttempt` calls `validateResponse` before retaining provider billing. An otherwise received response with an invalid answer but valid `model` and `usage` becomes `invalid_response` with `resolvedModel: null`, no usage, `costStatus: unknown` and `costUsd: null`. `scripts/jev-shadow-report.mjs` also accepts known bills only when `jev.ok` is true. This loses a known paid-failure bill from the §5.1 attempt/cost facts and report denominator. It predates part of this slice but remains incompatible with its accounting contract.

Offline reproduction from `minion-factory/runner`:

```sh
node --import tsx --input-type=module - <<'JS'
import { jevDecide } from './src/jev.ts';
const result = await jevDecide({
  site: 'review-fixture', state: {},
  questions: { q: { type: 'noul', instructions: 'fixture' } },
  env: { FACTORY_OPENROUTER_API_KEY: 'fixture-only' },
  fetchImpl: async () => new Response(JSON.stringify({
    model: 'fixture-resolved',
    answers: { q: { type: 'noul', noul: 2 } },
    usage: { input_tokens: 7, output_tokens: 3, cost: 0.01 },
  }), { status: 200, headers: { 'content-type': 'application/json' } }),
});
console.log(JSON.stringify(result));
JS
```

Observed on 2026-10-22: `ok:false`, `reason:invalid_response`, `resolvedModel:null`, `costStatus:unknown`, `costUsd:null`; usage absent. The fetch implementation is an in-process stub and issues no provider request.

Required correction: retain independently validated billing/model facts before answer validation; allow failed results to carry known usage/cost; preserve those facts through shell enrichment and reconciliation; count one known failed bill once across central/local records. An actual unknown failure must remain unknown.

No other definite blocker was found in the initial diff. The final correction review below closes this finding.

## Correction review, first pass

The runner now extracts billing/model receipts before answer validation, including JSON HTTP error bodies. Proxy settlement and report generic totals now retain known failed bills. The independent stub reproduction now returns the known `$0.01`, resolved model and `7/3` usage while preserving `ok:false`. See `factory-independent-review-repro.json`.

Two parts of the same finding remain open as of this pass:

- `agent/lib/jev.sh:factory_jev_decide_direct` still validates before retaining the received body's known usage/model/cost, then writes an `invalid_response` error without those facts. The report's bash-shaped failure branch still drops known cost. The successful proxy loopback test does not qualify this direct path.
- `runner/src/spec-grounding.ts` adds failed costs before skipping invalid answers, but tests only `result.costSource === 'unknown'`. Network/timeout results expose `costStatus:'unknown'` and nullable cost while `costSource` can be absent; the summary can still count an unknown failed bill as zero without its unknown flag.

Both gaps were sent to the implementation owner and parent. No code edits by this reviewer.

## Final correction review

**Finding disposition: closed for A06/A07.** The corrected runner retains bounded provider model, token and billing facts before semantic validation. Direct shell failures, including JSON HTTP 422, preserve the same facts in their error artifacts. Proxy failure settlement records a known bill. The report prices failed known receipts independently of success and counts a duplicated central/local failed inference once, without a paired successful baseline comparison.

Independent verification by this reviewer:

- `node --import tsx --test --test-name-pattern='invalid semantic answers|v2 real shell' src/jev.test.ts src/jev-proxy.test.ts`: 3 passed. This includes valid/invalid real shell → loopback proxy → stub provider → central/local JSONL → actual report CLI, plus invalid-answer and HTTP 422 receipt retention.
- `bash agent/lib/jev.test.sh`: passed, including direct invalid-schema/HTTP 422 receipts through the actual report CLI.
- `node --import tsx --test --test-name-pattern='failed grounding calls' src/spec-grounding.test.ts`: 1 passed. Known failed bills remain `$0.01`; absent network receipts produce nullable unknown aggregate cost.
- Independent report call with matching authoritative/local failed receipts: one attempt, one known bill, `$0.01`, one failure, zero paired comparisons and zero conflicts.
- `bash agent/lib/cost.test.sh`: passed, including the known-subtotal compatibility reader.

**Standards:** No remaining blocker found in the reviewed changed paths. The new receipt extraction keeps malformed raw responses out of logs and preserves existing success/failure control flow. Exact handoff comments identify numeric cost readers and run persistence that cannot yet represent unresolved exposure.

**Spec:** A06/A07 receipt identity/reconciliation and known-versus-unknown reporting pass this review. This approval does not certify Slices 8–9 or full run spending bounds. `sum_cost_usd` and the run DB retain a numeric known-subtotal compatibility API; failed error artifacts and unknown exposure still require the explicitly deferred Slice 8 accounting/admission work. `known_cost_usd` is a subtotal, never a complete bill when `cost_source:unknown`.

The reviewed changed-file hashes are in `factory-independent-source-manifest.json`. This reviewer made no Factory product edits.
