# Catalog ties and readable history qualification

Hub [PR578](https://github.com/NikolasP98/minion_hub/pull/578), source `b7b2c7e876ecc3df6d7592b52f8052551aac090b`, implements the owner's two requested follow-ups. This folder qualifies implementation; it does not claim either follow-up is live. Final-source CI and all 18 PR checks pass, including 7,871 unit tests, the QA stack/page sweep, all four desktop platforms and Vercel Preview. Independent Standards and Spec review passes.

## Catalog behavior

The typed catalog declaration is version 2. Its route defaults to `mode=maximum`, selecting only maximum-price winners from the existing authorized active catalog. With A/B/C tied and D cheaper, maximum mode returns A/B/C even when a caller supplies limit1; the separate maximum-mode cap is20. More than 20 ties return20 deterministic winners, the full count, and `truncated=true`. Explicit ranked mode still honors limit1..20 strictly. Price selection/counts share one SQL statement, and the existing currency lookup is retained.

The result reports mode and appliedLimit. Dynamic declaration/schema revisions expose the changed contract through the existing registry. Stale revisions fail before data reads; existing execution principal, organization, module and permission checks remain. Tool guidance asks for every returned winner with sources and truthful truncation. No model retry, second tie-fetch call, Gateway source change or hardcoded tool list is added.

## History behavior

Actual shared chat components display a localized EN/ES notice for structured oversized markers and exact standalone legacy markers. Quoted or embedded examples, mixed real content and contradictory/malformed metadata remain visible. Genuine and empty streaming overrides retain precedence. Original messages, roles, timestamps, persistence and Gateway byte budgets are unchanged.

Session Viewer now displays raw WS context after a cache miss rather than a lossy cache re-fetch. Its existing cache POST is unchanged. Historical cache rows cannot recover provenance previously discarded; they retain exact legacy-marker recognition.

## Evidence classes

- `qualification.json` records candidate/tree, focused local checks, exact CI runs and release boundary. It is the current result summary.
- `independent-review.json` records separate Standards/Spec verdicts and the two resolved findings with final source hashes.
- Red diagnostics prove the new catalog, history, streaming-override and Session Viewer cases detected the prior behavior. The final Session Viewer suite passes all 9 cases.
- `focused-refinement.log` passes 82 tests across 7 files. This run began before the Session Viewer test expanded to7 cases; `session-loading-green.log` qualifies the final 9-case file, including scroll teardown. Do not add these counts into a whole-suite result.
- Typecheck has0errors/0warnings; token lint0violations; design debt does not increase; architecture3tests/16assertions pass. The unchanged Gateway dynamic-query adapter passes29 tests.
- `browser-proof.json`, four PNGs and `fixture-source-manifest.json` qualify the actual chat render/source-link code using synthetic answer data. All 242 recorded product source hashes matched the final checkout. EN/ES each show3friendly notices, unchanged source message data, no raw marker, no navigation before click and one catalog navigation after click. This is not a live model or authenticated production check.
- `local-failed-run.json` retains a failed/stopped loaded local full-suite diagnostic at the earlier candidate. Three unchanged booking tests hit5s and two unchanged POS-boundary tests hit15s. Isolated files passed without source/assertion/clock changes. CI qualification is a separate complete run, never a stitched focused result.

## Release boundary

No merge, production deployment, production write, Gateway release, production flag change or model turn is performed for this follow-up. The existing Vercel integration builds a PR preview; that preview is distinct from production acceptance. The existing owner-reported production product/service-answer smoke belongs to the prior release and remains separately recorded. Human merge, branch-triggered deployment and authenticated owner verification are the next release stages.

## Whole-suite lifecycle finding

`ci-ca3c47f-history-teardown.json` and its log retain the initial whole-suite failure: all 7,869 tests passed, but3 uncaught callbacks made CI fail. The newly mounted Session Viewer tests exposed existing deferred scroll work outliving the component. The correction owns/cancels both timeout and frame and guards late history finalization; independent Standards/Spec review passes. New unmount/late-history regressions must pass along with fresh final-source CI. No global shim, uncaught-error suppression or test timeout change is used.

Final qualification: `ci-final.json`, `desktop-final.json`, `ci-b7b2c7e-unit.json` and `pr-final-checks.json` retain the completed exact-source evidence. The previously failing uncaught lifecycle errors are resolved.
