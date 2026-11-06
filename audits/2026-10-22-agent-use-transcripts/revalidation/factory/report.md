# Factory: qualify the existing decision layer first

Source: Factory dev `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`. All source anchors below refer to that commit, before the comment-only handoff patch. Experiments run against an isolated archive; fetch/curl are stubbed. No paid calls or deployed state were inspected.

## Confirmed findings

| ID | Evidence and observable result | Minimum delta |
|---|---|---|
| F1 | `runner/src/jev-proxy.ts:210–228` centrally logs a container decision; `agent/rank.sh:87–93` logs the same result locally with the baseline. `scripts/jev-shadow-report.mjs:390–398` concatenates both files without deduplication. The executable fixture representing one inference reports n=2, cost=$0.02 for one $0.01 call, and one runner-origin row even though both represent container work. Only one row contains the paired rank baseline. | Introduce an inference/decision ID through proxy and local log; reconcile enrichment without counting another inference. Separate request count, attempt count, paired comparisons and independent labeled examples. Keep old unjoinable records explicitly unresolved. |
| F2 | `normalizeJev` at `scripts/jev-shadow-report.mjs:55–83` drops model and cost-source fields and maps missing cost to zero. Probe confirms all three. Reporting n/cost without model cohorts or unknown-cost counts is inadequate for a threshold/cost promotion decision. | Preserve requested/resolved model, rubric and input revisions, known-cost count, missing-cost count, failures and censoring. Zero actual cost and unknown cost are distinct. |
| F3 | `agent/hooks/jev-guard.sh:548–551` sets a 4s inference timeout under the configured 6s hook deadline. Proxy transport `agent/lib/jev.sh:213` instead defaults to 25s. Actual hook + fake curl probe captures `-m 25` despite `FACTORY_JEV_TIMEOUT_S=4`. | Propagate one remaining deadline through direct/proxy/runner calls. Test delayed proxy within the actual harness deadline. Deterministic enforce-floor denial already happens before the request and remains intact. |
| F4 | `runner/src/jev-proxy.ts:203–211` checks call/spend caps before awaiting inference, increments after. With max_calls=1, two parallel actual handler calls both invoke mocked upstream and return 200; the next returns 429. | Reserve call capacity before await. Bound outstanding spend with documented reservation/settlement semantics; do not promise exact provider billing when price/receipt is unknown. |

The probes demonstrate source behavior, not incidence in deployment. F3 proves timeout propagation mismatch; it does not prove how a particular installed Claude harness handles a killed hook. F4 demonstrates the call-count race; dollar exposure is not benchmarked.

## What the first review got right—and what it missed

Factory already has a Jev integration and shadow decisions; a new generic classifier layer duplicates it. But existing reports cannot yet be used uncritically as calibration evidence. This work should precede expanding the classifier footprint.

Rank is not a drop-in Jev substitution. `agent/rank.sh:153–181` requires readiness, confidence, recommendation, related keys, rationale and evidence beyond the three shadowed score axes. The production ledger uses 0–10; the shadow defines ten textual criteria labeled 1–10. Explicitly qualify numerical scale semantics before interpreting absolute differences; no scale bug is claimed without provider-contract confirmation. Likewise, baseline-model agreement is not correctness against an independent label.

The guard asks about actions outside the task, while its state includes command/path, cwd and phase, not the task's authorization context (`jev-guard.sh:450–500`). Treat this as a limited semantic signal. Deterministic containment and authorization remain separate.

The earlier apparent three-argument hook/library mismatch is **cleared**: `agent/lib/jev.sh:115–122` supports the legacy call shape. Retry overrides are also bounded by a failure fingerprint (`runner/src/queue.ts:3528–3535`); this review found no basis to claim unbounded Jev-driven retries.

## Validation

- Existing report suite: 10 passing tests (`node --test scripts/jev-shadow-report.test.mjs`).
- Existing runner + proxy suites: 28 passing tests through the available tsx loader.
- Existing shell library contract suite passed (`bash agent/lib/jev.test.sh`).
- [Source probes](probes.mjs): duplicate inference accounting, lost model/cost provenance, actual guard/proxy deadline mismatch.
- [Concurrent-budget probe](budget-probe.ts): actual proxy handler, stubbed fetch, no network.
- [Recorded output](probe-results.txt); [comment-only source handoff patch](handoff-comments.patch).

Reproduce with `node probes.mjs <pinned-factory-root>` and `node --import <tsx-loader> budget-probe.ts <pinned-factory-root>`. Full dependency lockfile installation, real provider accuracy, live flags and costs were not validated. Existing test passes do not cover the new findings.

## Proposal decision

Promote calibration-record integrity and request bounds ahead of new complaint filtering. Keep ranking substitution experimental and schema-limited. Add outcome-linked shadow experiments only after decisions have stable IDs and adequate provenance.
