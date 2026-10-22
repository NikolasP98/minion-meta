---
id: 2026-10-21-assistant-catalog-answer-and-history-polish
title: Show useful maximum-price ties and friendly oversized-history state
status: in-spec
created: 2026-10-21
updated: 2026-10-22
repos: [minion, minion_hub]
spawned_spec: 2026-10-21-assistant-catalog-answer-and-history-polish-spec
---

# Show useful maximum-price ties and friendly oversized-history state

## AS-IS

Owner production smoke after release `97ccd699` successfully answers product and service price questions. The service response discloses three tied maxima but lists only one. Hub `src/server/services/pos/catalog-query.ts` bounds ranked rows by the caller's limit and separately counts all maximum-price ties; `catalog-query-contract.ts` accepts limit1..20, default5. Its tests explicitly cover ties outside limit1 and1000 ties bounded to20. The approved dynamic-tool spec states that ties beyond the limit are reported by count. This is a presentation improvement candidate, not evidence that the query violates its current contract. Raw names/prices are not copied into this proposal.

The same transcript contains `[chat.history omitted: message too large]`. Gateway `src/gateway/server-methods/chat/sanitize.ts` declares the literal and produces it in `buildOversizedHistoryPlaceholder`, alongside `__openclaw: { truncated: true, reason: "oversized" }`. Hub `src/lib/services/gateway/chat-rpc.ts:loadChatHistory` stores incoming messages in the chat thread. Exact rendering and source-link click behavior were not browser-verified in this turn.

## TO-BE

For a highest-price question, make a small tied maximum set useful to the user by naming the tied entries with prices and sources, while retaining a hard response-size cap and explicit disclosure when ties exceed it. Choose a reviewed contract/guidance change rather than silently breaking explicit item-limit semantics. Do not add repeated tool discovery, unbounded reads, automatic navigation or a model-generated summary call solely for this case.

Render an oversized historical message as a clear, localized history state rather than raw protocol wording. Preserve server byte/text budgets, structured truncation metadata, message chronology, routing identity and the original persisted history. Do not claim the original message was deleted or relax the transport safeguard.

## DELTA

1. Inspect the actual first catalog call arguments and returned item count, without claiming that the copied answer alone proves limit1. Select explicit bounded maximum-tie semantics or precise tool guidance in a reviewed spec; cover a unique maximum, three ties, caller limits, more than 20 ties, missing prices and organization isolation.
2. Trace structured oversized-history metadata through all chat consumers before editing UI. Specify a friendly state and legacy-peer behavior; retain current Gateway transport tests and add consumer coverage proving no raw protocol marker and no loss of actual chat content. Follow UI governance and local browser QA.
3. Verify catalog links are real clickable sources using rendered evidence; the pasted transcript cannot establish hrefs. Measure actual per-run tool counts rather than inferring that loops stopped from answer prose.
4. Qualify source and normal releases using the owner-selected credit-efficient flags. Keep these improvements separate from the already successful deployment and owner-reported core answering smoke. No implementation or new deployment is claimed by this proposal.

## Evidence

[Owner smoke receipt](../audits/2026-10-18-assistant-capability-repair/owner-hub-acceptance-20261021.json). Existing release and configured authority receipts remain unchanged.


## Owner implementation authorization

The owner requested implementation of both improvements. The scoped [implementation spec](../specs/2026-10-21-assistant-catalog-answer-and-history-polish-spec.md) defines explicit bounded maximum/ranked modes and Hub-only localized history display, preserving Gateway transport budgets. No Gateway source change is needed.

## Historical implementation qualification for PR578

[Hub PR578](https://github.com/NikolasP98/minion_hub/pull/578) implements both changes at `b7b2c7e876ecc3df6d7592b52f8052551aac090b` (tree `66884050f9dc26ec84b873aeb2cc1a8674f9e87b`). [Qualification receipts](../audits/2026-10-21-assistant-catalog-answer-and-history-polish/qualification.json) retain exact CI identities, local test results and evidence boundaries. The independent review found and resolved a metadata-losing Session Viewer cache round trip and an unsupported fixture token; final Standards and Spec verdicts pass.

After a Session Viewer cache miss, raw WS messages now supply the read-only display directly, preserving string/block content and omission metadata verbatim. The existing cache POST is unchanged; the unnecessary re-fetch is removed. Legacy cache hits still recognize exact standalone markers without inventing lost provenance. Actual mounted loading tests cover both roles, mixed and contradictory content, malformed metadata, cache failure, cache-hit behavior and immutability.

The local fixture uses real chat rendering with synthetic answer data. EN/ES notices, preserved original message data and click-only catalog navigation pass; this is not authenticated production or model-tool-count proof. Human merge and deployment remain required. No Gateway source, deployment flag, production configuration or transport budget is changed by this follow-up.

Final-source qualification: CI39725717702 and desktop qualification39725717858 both passed at `b7b2c7e876ecc3df6d7592b52f8052551aac090b`; all 18 PR checks are green. The complete unit run passes 7,871 tests (existing 263 skips), with zero uncaught errors. PR578 is ready for human review/merge. [Final receipts](../audits/2026-10-21-assistant-catalog-answer-and-history-polish/qualification.json) keep the failed prior attempt and its resolved teardown cause. No production deployment is claimed.


## Post-merge owner smoke and notice-boundary repair (2026-10-22)

Hub PR578 merged at `c4ded7f7365098e29024eef3bbfae1ae6309e9ec` and reached the production alias. The owner confirms all maximum-price ties and source links appear. Their subsequent floating Assistant screenshot also shows one tool call and the raw oversized-history marker above the sourced answer. Catalog acceptance passes; history acceptance remains open. No business names or prices are retained here.

AS-IS: `FloatingAssistant.svelte` folds tool-only turns through `foldToolTurns` before `ChatBlocks` detects history notices. Folding pending tool/thinking blocks into a standalone omission creates mixed content, correctly rejected by the strict detector. The source-supported failure does not establish the exact production message sequence or exclude a stale client. A focused negative test fails on both structured and legacy omission boundaries. The separate floating text-stream branch also bypasses the display helper.

TO-BE: preserve a valid original omission as its own display boundary, flushing preceding tool/reasoning activity without changing its order or metadata. Keep mixed genuine content and contradictory metadata unchanged. Apply the same strict helper to floating text streams. Persisted content, Gateway budgets, query semantics and authority stay unchanged.

DELTA: repair the shared folding boundary; exercise actual FloatingAssistant rendering after tool-only history, both locales and immutable input; cover the direct streaming branch, genuine/mixed text, intervening user turns and source links. Re-run exact-candidate check/test/build and token/design gates, plus an actual local browser render. Independent Standards and Spec review and human merge remain required. This section extends the approved display-only scope; it does not claim the repair is deployed.


### Scoped boundary candidate

[Hub PR580](https://github.com/NikolasP98/minion_hub/pull/580), candidate `b7521c29353acfde1ebe44075688842fc44ee741`, preserves original notice boundaries in shared folding and honors structured provenance in the floating stream. It changes no catalog query, authority, transport budget or Gateway configuration. [Repair evidence](../audits/2026-10-22-assistant-history-boundary-repair/README.md) retains the actual floating-shell red reproduction, 28 focused green tests, independent Standards/Spec source review, synthetic EN/ES browser proof and interrupted local attempt. Complete exact-candidate CI39729691622 now passes all ten jobs, including 7,883 unit tests, architecture qualification, zero-error/warning typecheck, production build, browser journeys, SQL lanes and page conformance. Local design/token gates and EN/ES rendered checks pass. Both interrupted local full-suite attempts remain recorded; the second observed a CRM timeout, and an isolated replay then passed all 61 cases. No local complete-suite pass or timeout cause is claimed. [Final qualification](../audits/2026-10-22-assistant-history-boundary-repair/qualification.json) preserves these distinctions. Human merge and owner verification after deployment remain required; the repair is not deployed.

CI head and tested checkout are distinct: workflow head `b7521c2` is tested through synthetic merge `b17089a`, whose tree was fetched and verified identical to candidate tree `2d567e7e583c8473ae0df86fb7390db03d487f90`. Earlier PR578 qualification paragraphs are historical; this post-merge section governs the current repair state.
