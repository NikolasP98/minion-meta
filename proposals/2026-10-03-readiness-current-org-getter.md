---
id: 2026-10-03-readiness-current-org-getter
title: Read the current organization from canonical PageData
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, logic, test]
type: fix
---

# HC-041 current organization getter

The user authorized all readiness findings and adjacent defects. This narrow correction is an HC-036 integration dependency found while reviewing HC-039. Human merge and release gates remain in place.

## AS-IS

`src/lib/state/features/user.svelte.ts:userState.orgId` reads `page.data.user.orgId`. The actual `(app)/+layout.server.ts` returns `activeOrgId` at the top level and the canonical user has no nested orgId. `gateway.svelte.ts` uses the incorrect getter both for lifecycle identity and published authenticated-session ownership. HC-036's resource owner correctly reads top-level activeOrgId, so the two paths disagree and valid resources fail admission. The existing getter test invents the nested field and passes despite the production data mismatch.

## TO-BE and DELTA

Read only top-level `page.data.activeOrgId`, accepting a nonempty string or returning null. Never fall back to the obsolete nested field. Replace the coupled test fixture with the real PageData layout and prove A→B, clearing, malformed identity and disagreement with an obsolete nested field. Qualify the real getter through Gateway session publication and the HC-036 owner, without mocking a matching userState value. Do not change authentication, canonical actor IDs, gateway selection, RPC or server layout output. Preserve all other user getters and their existing tests.

This is not a production incident claim: the source mismatch is confirmed and local behavioral reproduction is required before acceptance.
