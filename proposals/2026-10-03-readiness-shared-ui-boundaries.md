---
id: 2026-10-03-readiness-shared-ui-boundaries
title: Preserve shared Button semantics and own the mention-alias read lifecycle
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion-meta, minion_hub, minion_site]
tags: [ui, logic, test]
type: fix
---

# Shared UI boundaries found during card consumer verification

The existing user authorization covers implementation of every readiness finding and adjacent defects. These two defects require bounded specs and independent review before implementation. Production and merge gates remain unchanged.

## AS-IS

HC-038: the canonical `packages/ui/src/lib/Button.svelte` and Hub's installed pinned artifact spread consumer props, then overwrite `role` and `tabindex` with `undefined` for ordinary enabled controls. A real mounted FlowExports test requesting its `role="switch"` fails because the rendered element has only the native button role. Source inspection finds many Button consumers using menuitem, option, radio and switch semantics. The full failed test output is `hc026-route-panels-v1.log`; the transport-only replacement explicitly does not qualify shared control semantics.

HC-039: `hub/src/lib/state/features/aliases.svelte.ts` caches aliases and one inflight promise globally, without actor/org scope. `ChatMessage.svelte` calls it with `void ensureAliases()` and does not catch a rejected fetch. The mounted copilot test produces two unhandled rejections when the child alias reads reject. Tenant/session races are source-confirmed exposure risks; they have not been exercised against production data.

The HC-039 server boundary is also defective: `src/server/services/user.service.ts:listAliases(_ctx)` ignores its tenant context and queries all profiles through the Supabase service role. The route's tenant gate therefore does not restrict returned identities to that organization, and the PostgREST row limit can silently truncate the directory. The implementation must admit a current member and query only their active organization in a bounded read-only snapshot. Preserve the separate global alias-availability check. This extension was found through source review, without retrieving production identities; the user's all-findings authorization covers it and the security merge gate remains in place.

## TO-BE

Preserve explicitly supplied accessibility semantics and roving focus on shared Button while retaining disabled native-button and disabled-link behavior. Qualify canonical source and the exact package artifacts used by Hub and Site. Give mention-alias reads current owner/request fencing, validation and contained failure behavior; cache success only for its owner and retire stale data on identity changes.

## DELTA and proof

For HC-038, inventory shared Button forwarded accessibility attributes and consumers before defining explicit precedence. Mount real role/switch/menuitem and tabindex consumers, test pointer/keyboard and disabled/loading/link boundaries, package integrity and cross-consumer adoption. Include an original-artifact negative control and visual keyboard proof.

For HC-039, mount actual chat consumers with aliases success/rejection/malformed replies, actor/org changes and reversed completions. Assert no unhandled rejection, no stale alias visibility, bounded deduplicated requests, and successful explicit or policy-based recovery without request loops. Verify mention rendering and alias management invalidation. Capture synthetic receipts; no real notifications or production changes.
