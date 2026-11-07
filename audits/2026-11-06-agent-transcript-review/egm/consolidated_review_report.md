# EGM approaches and tested results

**Later release qualification:** this report records the original EGM prototype round. It is not the current release candidate. Native repository testing later exposed a large-output performance defect in the original Gateway patch; that is corrected in the [current Gateway draft](gateway-release-draft.patch), with real callable test seams replacing source-fragment execution. [Release status](release-status.json) owns the current delivery state and remaining qualification gates. The original patches/manifests below are retained as historical test evidence, not deployment recommendations.

All eight code findings now have a selected approach, alternatives, executable candidate corrections and passing acceptance checks. **253 distinct tests pass** after rebuilding the exported patches from the pinned source: 153 new candidate tests and 100 nearby regression tests. The five EGM stages used nine fresh-context reviewers, followed by three fresh reviewers for one implementation re-audit. Their findings materially changed the candidates.

These are tested patches against exported source. Shared product checkouts were not edited; nothing was committed, merged, deployed or sent to a user channel. Production adoption has open integration and qualification gates below. No review convergence or production approval is claimed.

## Approaches by finding

| Finding | Selected approach | Proof of corrected behavior | Practical boundary |
| --- | --- | --- | --- |
| C01: extraction never reaches its threshold | Accumulate actual settled messages, keep threshold4, deduplicate by real run ID, strip injected context and reuse already-authorized recalled memory. | Actual attempt-source seam extracts once after two exchanges; retries do not duplicate the window; recall filtering/cap and explicit memory-write gates tested. | Recalled/local context is bounded, not entire-corpus dedup; sink delivery is unacknowledged. |
| C08: overlapping extraction overspends/loses cursor updates | Synchronous reservations, one serial worker per retained session, separate attempt/completion accounting and generation fences. Cap256 retained states, idle expiry30min, decline admission at capacity. Wire successful gateway RPC reset/delete cleanup. | Ten eligible overlapping windows dispatch at most5 attempts; failure/cancel/clear/re-create/cap/expiry tests; actual source-bound RPC cleanup blocks late writes. | Budget belongs to a retained in-process generation; restart/expiry reset it. Automatic non-RPC rotation and provider timeout/abort remain adoption work. |
| C02: onboarding blocks business requests | Personal-agent assembled context omits mandatory BOOTSTRAP ritual, retains optional setup, resolves identity through explicit ID or session key; identity section prioritizes a task. | Actual bootstrap assembly and identity text; personal/session-key cases, other-profile strictness and unknown preferences preserved. | Prompt consistency is proven; no live model-choice guarantee or permission grant. |
| C03: preview merely echoes unchecked input | Factor native read-only booking preparation from actual commit path; preview resolves scoped references and current availability; commit revalidates. |14 local native-service cases with real computeSlots/SQL, including5 additional negative previews; no mutations/effects during preview; later conflict rejected at commit. | No reservation. Without an explicit resource, commit may choose another available resource. Real RLS, full authenticated service composition and concurrent exclusion unqualified. |
| C04: capped list looks complete | Assistant-specific bounded list with total/returned/truncated/limit/mode; separate exact count; preserve shared UI array contract. | Real PGlite fixture reports501total/500returned; deterministic tied-time order, exact count, predicates, masking and zero/narrow ranges. | No continuation or complete enumeration. Narrow filters and disclose truncation; production query performance unqualified. |
| C05: malformed dates silently become defaults | Strict agent calendar dates and explicit all-time, existing business-timezone boundaries; preserve UI parser. Adapter preserves supplied-property presence before optional string handling. |17 chained adapter→real-route cases plus route/timezone regressions: blank/wrong types, invalid/leap dates, one-sided/exact boundaries, all-time/conflicts, fixed default and DST. | Period resolution/forwarding proven; real financial SQL amounts and metric correctness not evaluated here. |
| C06: raw protocol or no reply | Whole-response failure on DSML contamination, including mixed false receipts; ordinary protocol-only terminal fallback; retain control/media/intermediate distinctions. Apply before TTS and again at dispatcher. | Actual TTS→dispatcher composition in off/always/tagged modes, independent spoken text/summary guards, prefix/control/media cases, observed DSML forms. | Supported syntax family only. Literal DSML examples are also rejected. Direct speech/telephony and bypass delivery need qualification. |
| C07: optional persistence/egress redaction | One pure mandatory full-redaction vocabulary after persistence transforms/hooks and at protected text/speech boundaries. | Fabricated named-key/JSON/PAT/URL secrets, transformed/synthetic tool results; IDs/images/schema/receipts retained. Actual guard tested with synthetic append sink. | Not universal secret detection; native SDK serializer blocked by dependency mismatch; historical data, alternate exports and environment authority unchanged. |

The complete rationale and exact implementation instructions are in [approaches.md](approaches.md). Byte-exact changes are [Gateway](gateway-candidate.patch) and [Hub](hub-candidate.patch), with [source fingerprints](candidate-manifest.json). Candidate reports preserve alternatives, APIs, baseline failures and limitations: [memory](memory-candidate.md), [output](output-candidate.md), [Hub](hub-candidate.md), [integration follow-ups](root-followups.md).

## What the independent reviews changed

The first candidates passed their focused tests while missing actual lifecycle and composition boundaries. EGM exposed:

- Extraction clearing had no production reset owner and retained unbounded session state. The candidate now wires gateway RPC cleanup and bounds retention.
- TTS consumed raw text before final text filtering. Caption, separate speech input and generated summaries are now guarded before the protected speech path.
- Ordinary tool syntax could disappear, while mixed DSML could leave a false success receipt. Terminal classification and whole-response DSML failure address these outcomes.
- Disabled TTS still erased the terminal failure before dispatch. A real chained test reproduced this and now passes.
- The finance adapter erased explicit blank dates before strict route validation. Presence-aware reading and adapter-to-route tests address this.
- Five required native preview rejection cases and several finance acceptance cases were missing. They are now explicit tests.
- The design promised pagination that its selected candidate did not implement. The final contract plainly selects bounded list+exact count and discloses its enumeration limit.

Both codebase-review Blockers retain their original classification and were closed by the fresh re-audit. The final readiness reviewer raised RR-1 Major for missing finance coverage; the root added and ran those tests after the one permitted re-audit. That test-only closure was not independently re-reviewed. This is a completed five-stage review with visible dispositions, not two clean rounds of convergence.

## Review traceability

| Raw findings | Priority retained | Response and disposition |
| --- | --- | --- |
| ZI-1 / DC-2 lifecycle | Major | RPC generation-clear integration, tested source seam; other rotation paths remain named adoption work. |
| DC-2 retention | Major | Cap256/idle30min/admission refusal;6 retention cases pass. |
| ZI-2 / DC-3 | Major | Guard protected TTS path before summary/speech and after summary; tested with synthetic provider exports. |
| ZI-3 / DC-4 | Major | Shared terminal fallback, control/media/intermediate exceptions; actual dispatcher tests. |
| DC-5 | Major | Reject mixed DSML false receipts rather than retain surrounding success prose. |
| CP-1 / DC-1 / ST-1 | Major | Bounded list/count selected; paging and enumeration promises removed. |
| FS-1 / FS-2 / IS-1 / IS-2 / IZ-1 | Nit | Terminology/file list/limits/final candidate notes aligned; superseded evidence labeled. |
| IR-1 / CD-1 | Major / Blocker | Disabled-TTS composition fixed and tested; fresh codebase re-audit closes original Blocker. |
| CD-2 | Blocker | Explicit finance input presence fixed/tested; fresh codebase re-audit closes original Blocker. |
| CD-3 | Major |5 real native preview-negative cases with no-write/effect assertions; fresh re-audit closes. |
| RR-1 | Major |8 further finance cases plus exact default-mode/boundary assertions pass; root-verified after re-audit. |

Raw reports: [initial zoom](zoom_out_report.md), [complete comprehension paraphrases](comprehension_report.md), [three feature critics](critic_report.md), [intermediate zoom](intermediate_zoom_out_report.md), [implementation review](implementation_readiness_report.md), [one fresh re-audit](reaudit_report.md), [dispositions](goldfish_review_report.md). No reviewer was counted as completed without a returned report. Reviewer inspections did not execute tests; executor/root runs supply executable evidence.

## Verification and reproduction

| Group | Distinct passing tests |
| --- | ---: |
| Memory admission, retention, source-bound caller/lifecycle and nearby tests |93 |
| Onboarding, output, TTS/dispatch, persistence and nearby sanitizer tests |71 |
| Native scheduling, routes, adapters, finance-chain and nearby tests |89 |
| Total |253 |

Reconstruction runs221tests under vitest.config.mjs and72under hub-candidate.config.mjs. Forty Hub tests overlap, yielding253distinct assertions rather than293. All18changed source-file hashes match the exported manifest after reconstruction. [verification.json](verification.json) contains exact test names, versions and source hashes; final JSON reports are in results/.

Runtime: Node v26.13.0; reused installed Vitest4.1.10, TypeScript5.9.3, PGlite0.5.5 and Drizzle0.45.2. This does not qualify a clean lockfile install or the production runtime. Focused lint and narrow type checks passed; complete Hub/Gateway builds and SDK-backed SessionManager suites did not run successfully. The latter stopped before assertions because the installed pi-ai dependency does not export ./providers/all under Vitest's conditions. The synthetic session append tests are not disk-serializer proof.

Run without modifying either input repository:

```sh
python reproduce.py \
  --gateway-repo /path/to/minion \
  --hub-repo /path/to/minion_hub \
  --run
```

The script reads the pinned Git objects, creates a new temporary source copy, applies the patches, links existing dependencies, and runs both configs. It copies no .env file and performs no network installation/provider call. The final independently reconstructed workspace was /tmp/minion-egm-reproduce-pekb63jr. Hashes are in SHA256SUMS.

## Remaining production gates

The [meta proposal](../../../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md) records these again. Exact candidate sites have TODO(handoff) comments for current integration or weak-test boundaries.

1. Qualify supported runtime/locked dependencies, full builds/checks and real SDK transcript serialization.
2. Qualify native app_ledger role/GUC/RLS policies, the fully authenticated route→native-service path, real schema/triggers and concurrent booking exclusion.
3. Define acknowledged/idempotent memory sink delivery, provider timeout/abort transport, filesystem/plugin memory-write outcomes and non-RPC session rotation. Retained-generation counters are not a durable global budget.
4. Qualify direct speech/telephony, custom channel delivery, alternate persistence/export paths and task-appropriate environment access. Do not infer historical cleanup or credential rotation.
5. Provide authorized booking prerequisite discovery where the agent cannot obtain a valid event-type/service ID; previews cannot repair missing tool access.
6. Apply normal proposal/spec/development and independent code-review gates. Security/data adoption retains human approval and merge. Deployed verification and live behavioral evals are separate later work.
