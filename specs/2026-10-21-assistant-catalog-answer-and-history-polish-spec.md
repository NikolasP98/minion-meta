---
id: 2026-10-21-assistant-catalog-answer-and-history-polish-spec
title: Bound maximum-price winners and localize oversized history
stage: spec
pass: 1
status: implementing
verdict: approved
created: 2026-10-21
updated: 2026-10-22
repos: [minion_hub]
proposal: 2026-10-21-assistant-catalog-answer-and-history-polish
---

# Bound maximum-price winners and localize oversized history

## 0. Product

Hub assistant users receive the full bounded set of maximum-price winners and readable history notices, without extra model calls.

## AS-IS

Production owner smoke successfully answers prices, but shows one of three maximum-price services. The approved v1 typed catalog contract ranks a caller-limited list and reports maximum ties separately by count. Hub query SQL and route defaults currently cannot express a maximum-only result set. The live model call arguments are not available from the copied transcript and are not assumed to be limit1.

Gateway history shaping replaces an oversized message with a literal text marker and `__openclaw: { truncated: true, reason: "oversized" }`, preserving chronology and bounded transport. Hub renders that marker as ordinary chat text. Assistant bodies share ChatBlocks; user text consumers share extractText. Cached/legacy history can lack the structured metadata.

## TO-BE

1. Catalog contract version 2 declares `mode: maximum|ranked`, default maximum. Maximum mode returns only rows at the maximum stored active sale price in the authorized organization/kind, deterministically ordered by name/id, hard-capped at 20. The explicit `limit` applies to ranked mode; maximum mode has its own disclosed 20-item cap. Ranked mode preserves strict caller limit1..20 and descending-price/name/id order. One SQL statement selects rows and counts from the same snapshot; no second query or model turn retrieves ties.
2. Report mode, appliedLimit, maxPrice, tiedAtMaximum, matchedCount, missingPriceCount, source and asOf. `truncated` concerns the selected mode: maximum ties in maximum mode, all priced eligible rows in ranked mode. Preserve null-price exclusion, genuine zero prices, derived bundle isolation and POS currency. Tool guidance tells the agent to name every returned maximum winner and disclose a larger total when truncated. Unique winners use less response data than a five-row ranking.
3. Contract revision is computed through the existing declaration registry. Stale revisions fail before data reads. Preserve execution-time principal, organization, module and capability checks; do not edit Gateway permissions or deployment flags. Generic Gateway schema loading accepts the new enum without a new hardcoded tool or Gateway release.
4. Shared display helpers turn only a standalone oversized-history marker into localized EN/ES copy: an earlier message is too large to show here. Prefer valid structured metadata when available; accept an exact standalone legacy marker when metadata is absent. Preserve quoted/embedded examples, mixed real content and contradictory metadata. Do not mutate input messages, persisted history, timestamps, roles or Gateway size budgets. No model summary or history-fetch retry is added.
5. Both assistant and user displays, including normal chat, home/omnichat and session viewers, use the shared display path. Streaming text overrides must not reintroduce a raw marker. Use existing bubble primitives and tokens; no new styling system or raw design values.

## DELTA

- Add declaration mode/schema/guidance and version 2; route validates/defaults mode, rejects unknown/duplicated modes and preserves stale-contract/permission gates.
- Extend the existing SQL service with explicit maximum/ranked selection and a mode-relative truncation summary. Keep direct service callers default ranked for backwards-compatible internal call semantics; the advertised route defaults maximum. Add three-way tie, unique winner, more-than 20 ties, zero/missing/empty, strict ranking, tenant/bundle isolation and route tests.
- Add a pure display detector plus append-only localized strings, and consume it in shared message text/blocks. Test both roles, structured/legacy markers, quoted/mixed content, localization, immutability and streaming override. Mount actual chat components and browser-verify the friendly text and an inert source link locally.
- Run focused tests red/green, check/test/build and design/token gates on the exact Hub candidate. Record Standards and Spec results separately. Open a scoped PR against registry master; human merge remains required for this nontrivial change. No production write or deployment is part of implementation qualification.

## Review passes before implementation

Behavior pass: explicit modes resolve ambiguity without silently expanding ranked-list limits; maximum mode has one 20-row bound and a truthful overflow count. Structured and exact legacy history notices are display-only. Approved by the owner's explicit request to implement both; these concrete invariants were source-reviewed by the implementing agent.

Authority pass: the existing CoreCtx query transaction, active-kind filtering, permission/module admission and computed contract revision remain the authority chain. No new identity claim, SQL tool, arbitrary route, model call or production mutation is introduced. Separate independent repository PR review remains required before merge; no independent human review is claimed here.


## Out of scope

No Gateway transport-budget change, historical message recovery endpoint, model replacement, global prompt overhaul, permission change or production deployment. Source-link behavior is exercised as a preservation check, not redesigned.

## Verification

Focused query/route/display tests must fail on the old behavior and pass on the new implementation. Then run Hub check with zero errors/warnings, full tests, production build, design/token gates and local rendered history/source-link checks. CI and independent PR review qualify the exact candidate; local fixtures are not production acceptance.

## Historical implementation qualification for PR578

[Hub PR578](https://github.com/NikolasP98/minion_hub/pull/578) implements both changes at `b7b2c7e876ecc3df6d7592b52f8052551aac090b` (tree `66884050f9dc26ec84b873aeb2cc1a8674f9e87b`). [Qualification receipts](../audits/2026-10-21-assistant-catalog-answer-and-history-polish/qualification.json) retain exact CI identities, local test results and evidence boundaries. The independent review found and resolved a metadata-losing Session Viewer cache round trip and an unsupported fixture token; final Standards and Spec verdicts pass.

After a Session Viewer cache miss, raw WS messages now supply the read-only display directly, preserving string/block content and omission metadata verbatim. The existing cache POST is unchanged; the unnecessary re-fetch is removed. Legacy cache hits still recognize exact standalone markers without inventing lost provenance. Actual mounted loading tests cover both roles, mixed and contradictory content, malformed metadata, cache failure, cache-hit behavior and immutability.

The local fixture uses real chat rendering with synthetic answer data. EN/ES notices, preserved original message data and click-only catalog navigation pass; this is not authenticated production or model-tool-count proof. Human merge and deployment remain required. No Gateway source, deployment flag, production configuration or transport budget is changed by this follow-up.

### Lifecycle correction found by whole-suite CI

The initial `ca3c47f` CI unit step passed all 7,869 tests but failed on 3 uncaught callbacks from Session Viewer after mounted environment teardown. Its pre-existing deferred scroll timeout outlived the component and referenced the removed animation-frame environment. The same PR now owns and cancels both timeout and animation frame on replacement/destruction, and guards late history finalization after disposal. Normal delayed scrolling and its post-measurement second stage remain intact. A behavioral regression reproduces post-unmount scrolling before the fix; a second covers a history response arriving after unmount. The independent Standards and Spec review passes this correction. No test-clock relaxation, global RAF shim or error suppression is allowed; the corrected source requires fresh whole-suite CI.

Final-source qualification: CI39725717702 and desktop qualification39725717858 both passed at `b7b2c7e876ecc3df6d7592b52f8052551aac090b`; all 18 PR checks are green. The complete unit run passes 7,871 tests (existing 263 skips), with zero uncaught errors. PR578 is ready for human review/merge. [Final receipts](../audits/2026-10-21-assistant-catalog-answer-and-history-polish/qualification.json) keep the failed prior attempt and its resolved teardown cause. No production deployment is claimed.


## Post-merge owner smoke and notice-boundary repair (2026-10-22)

Hub PR578 merged at `c4ded7f7365098e29024eef3bbfae1ae6309e9ec` and reached the production alias. The owner confirms all maximum-price ties and source links appear. Their subsequent floating Assistant screenshot also shows one tool call and the raw oversized-history marker above the sourced answer. Catalog acceptance passes; history acceptance remains open. No business names or prices are retained here.

AS-IS: `FloatingAssistant.svelte` folds tool-only turns through `foldToolTurns` before `ChatBlocks` detects history notices. Folding pending tool/thinking blocks into a standalone omission creates mixed content, correctly rejected by the strict detector. The source-supported failure does not establish the exact production message sequence or exclude a stale client. A focused negative test fails on both structured and legacy omission boundaries. The separate floating text-stream branch also bypasses the display helper.

TO-BE: preserve a valid original omission as its own display boundary, flushing preceding tool/reasoning activity without changing its order or metadata. Keep mixed genuine content and contradictory metadata unchanged. Apply the same strict helper to floating text streams. Persisted content, Gateway budgets, query semantics and authority stay unchanged.

DELTA: repair the shared folding boundary; exercise actual FloatingAssistant rendering after tool-only history, both locales and immutable input; cover the direct streaming branch, genuine/mixed text, intervening user turns and source links. Re-run exact-candidate check/test/build and token/design gates, plus an actual local browser render. Independent Standards and Spec review and human merge remain required. This section extends the approved display-only scope; it does not claim the repair is deployed.


### Scoped boundary candidate

[Hub PR580](https://github.com/NikolasP98/minion_hub/pull/580), candidate `b7521c29353acfde1ebe44075688842fc44ee741`, preserves original notice boundaries in shared folding and honors structured provenance in the floating stream. It changes no catalog query, authority, transport budget or Gateway configuration. [Repair evidence](../audits/2026-10-22-assistant-history-boundary-repair/README.md) retains the actual floating-shell red reproduction, 28 focused green tests, independent Standards/Spec source review, synthetic EN/ES browser proof and interrupted local attempt. Complete exact-candidate CI39729691622 now passes all ten jobs, including 7,883 unit tests, architecture qualification, zero-error/warning typecheck, production build, browser journeys, SQL lanes and page conformance. Local design/token gates and EN/ES rendered checks pass. Both interrupted local full-suite attempts remain recorded; the second observed a CRM timeout, and an isolated replay then passed all 61 cases. No local complete-suite pass or timeout cause is claimed. [Final qualification](../audits/2026-10-22-assistant-history-boundary-repair/qualification.json) preserves these distinctions. Human merge and owner verification after deployment remain required; the repair is not deployed.

CI head and tested checkout are distinct: workflow head `b7521c2` is tested through synthetic merge `b17089a`, whose tree was fetched and verified identical to candidate tree `2d567e7e583c8473ae0df86fb7390db03d487f90`. Earlier PR578 qualification paragraphs are historical; this post-merge section governs the current repair state.
