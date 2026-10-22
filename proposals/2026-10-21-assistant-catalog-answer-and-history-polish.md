---
id: 2026-10-21-assistant-catalog-answer-and-history-polish
title: Show useful maximum-price ties and friendly oversized-history state
status: in-spec
created: 2026-10-21
updated: 2026-10-21
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

1. Inspect the actual first catalog call arguments and returned item count, without claiming that the copied answer alone proves limit1. Select explicit bounded maximum-tie semantics or precise tool guidance in a reviewed spec; cover a unique maximum, three ties, caller limits, more than20 ties, missing prices and organization isolation.
2. Trace structured oversized-history metadata through all chat consumers before editing UI. Specify a friendly state and legacy-peer behavior; retain current Gateway transport tests and add consumer coverage proving no raw protocol marker and no loss of actual chat content. Follow UI governance and local browser QA.
3. Verify catalog links are real clickable sources using rendered evidence; the pasted transcript cannot establish hrefs. Measure actual per-run tool counts rather than inferring that loops stopped from answer prose.
4. Qualify source and normal releases using the owner-selected credit-efficient flags. Keep these improvements separate from the already successful deployment and owner-reported core answering smoke. No implementation or new deployment is claimed by this proposal.

## Evidence

[Owner smoke receipt](../audits/2026-10-18-assistant-capability-repair/owner-hub-acceptance-20261021.json). Existing release and configured authority receipts remain unchanged.


## Owner implementation authorization

The owner requested implementation of both improvements. The scoped [implementation spec](../specs/2026-10-21-assistant-catalog-answer-and-history-polish-spec.md) defines explicit bounded maximum/ranked modes and Hub-only localized history display, preserving Gateway transport budgets. No Gateway source change is needed.
