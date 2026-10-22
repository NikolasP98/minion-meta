---
id: 2026-10-21-assistant-catalog-answer-and-history-polish-spec
title: Bound maximum-price winners and localize oversized history
stage: spec
pass: 1
status: implementing
verdict: approved
created: 2026-10-21
updated: 2026-10-21
repos: [minion_hub]
proposal: 2026-10-21-assistant-catalog-answer-and-history-polish
---

# Bound maximum-price winners and localize oversized history

## AS-IS

Production owner smoke successfully answers prices, but shows one of three maximum-price services. The approved v1 typed catalog contract ranks a caller-limited list and reports maximum ties separately by count. Hub query SQL and route defaults currently cannot express a maximum-only result set. The live model call arguments are not available from the copied transcript and are not assumed to be limit1.

Gateway history shaping replaces an oversized message with a literal text marker and `__openclaw: { truncated: true, reason: "oversized" }`, preserving chronology and bounded transport. Hub renders that marker as ordinary chat text. Assistant bodies share ChatBlocks; user text consumers share extractText. Cached/legacy history can lack the structured metadata.

## TO-BE

1. Catalog contract version2 declares `mode: maximum|ranked`, default maximum. Maximum mode returns only rows at the maximum stored active sale price in the authorized organization/kind, deterministically ordered by name/id, hard-capped at20. The explicit `limit` applies to ranked mode; maximum mode has its own disclosed20-item cap. Ranked mode preserves strict caller limit1..20 and descending-price/name/id order. One SQL statement selects rows and counts from the same snapshot; no second query or model turn retrieves ties.
2. Report mode, appliedLimit, maxPrice, tiedAtMaximum, matchedCount, missingPriceCount, source and asOf. `truncated` concerns the selected mode: maximum ties in maximum mode, all priced eligible rows in ranked mode. Preserve null-price exclusion, genuine zero prices, derived bundle isolation and POS currency. Tool guidance tells the agent to name every returned maximum winner and disclose a larger total when truncated. Unique winners use less response data than a five-row ranking.
3. Contract revision is computed through the existing declaration registry. Stale revisions fail before data reads. Preserve execution-time principal, organization, module and capability checks; do not edit Gateway permissions or deployment flags. Generic Gateway schema loading accepts the new enum without a new hardcoded tool or Gateway release.
4. Shared display helpers turn only a standalone oversized-history marker into localized EN/ES copy: an earlier message is too large to show here. Prefer valid structured metadata when available; accept an exact standalone legacy marker when metadata is absent. Preserve quoted/embedded examples, mixed real content and contradictory metadata. Do not mutate input messages, persisted history, timestamps, roles or Gateway size budgets. No model summary or history-fetch retry is added.
5. Both assistant and user displays, including normal chat, home/omnichat and session viewers, use the shared display path. Streaming text overrides must not reintroduce a raw marker. Use existing bubble primitives and tokens; no new styling system or raw design values.

## DELTA

- Add declaration mode/schema/guidance and version2; route validates/defaults mode, rejects unknown/duplicated modes and preserves stale-contract/permission gates.
- Extend the existing SQL service with explicit maximum/ranked selection and a mode-relative truncation summary. Keep direct service callers default ranked for backwards-compatible internal call semantics; the advertised route defaults maximum. Add three-way tie, unique winner, more-than20 ties, zero/missing/empty, strict ranking, tenant/bundle isolation and route tests.
- Add a pure display detector plus append-only localized strings, and consume it in shared message text/blocks. Test both roles, structured/legacy markers, quoted/mixed content, localization, immutability and streaming override. Mount actual chat components and browser-verify the friendly text and an inert source link locally.
- Run focused tests red/green, check/test/build and design/token gates on the exact Hub candidate. Record Standards and Spec results separately. Open a scoped PR against registry master; human merge remains required for this nontrivial change. No production write or deployment is part of implementation qualification.

## Review passes before implementation

Behavior pass: explicit modes resolve ambiguity without silently expanding ranked-list limits; maximum mode has one20-row bound and a truthful overflow count. Structured and exact legacy history notices are display-only. Approved by the owner's explicit request to implement both; these concrete invariants were source-reviewed by the implementing agent.

Authority pass: the existing CoreCtx query transaction, active-kind filtering, permission/module admission and computed contract revision remain the authority chain. No new identity claim, SQL tool, arbitrary route, model call or production mutation is introduced. Separate independent repository PR review remains required before merge; no independent human review is claimed here.
