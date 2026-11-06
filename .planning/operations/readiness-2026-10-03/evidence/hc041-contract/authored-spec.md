---
id: 2026-10-03-readiness-current-org-getter-spec
title: Align userState organization identity with the server layout
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, logic, test]
type: fix
proposal: 2026-10-03-readiness-current-org-getter
---

# HC-041 canonical organization getter

## AS-IS

The app server layout returns `{user, activeOrgId, ...}`; its user is the canonical `requireAuth(locals)` object. The browser getter instead reads `page.data.user.orgId`. Its unit fixture manufactures that obsolete field. Gateway `identityKey` and `publishAuthenticatedSession` consume the getter, while HC-036's resource admission reads the real top-level organization, so a connected session can fail every owned resource admission. The server source and caller inventory are in the matching proposal.

## TO-BE and DELTA

Change only `userState.orgId` and its tests. Treat `page.data.activeOrgId` as unknown; return it only when it is a string with nonempty trimmed content, otherwise null. Do not trim or rewrite an admitted identifier. Do not fall back to any nested user field. Keep canonical actor IDs, all other getters, authentication and layout output unchanged. No new dependency, shared protocol, database migration or UI appearance change.

Replace the always-passing wrong-shape fixture with the actual layout shape and retain the original implementation as a negative control. Assert initial org, same-actor A→B, logout/missing org, wrong primitive type, blank string, and top-level precedence when a stale nested property exists. Existing user/role/permissions cases remain required. The independent HC-036 integration suite must use the real getter and canonical PageData to drive session publication and resource admission; matched independent mocks are insufficient. Every old-owner completion remains fenced after org replacement.

## Review and release

Parent Standards review: the change corrects the existing server/client contract and introduces no authority grant; missing identity fails closed. Independent Spec and source reviews remain required. The user's all-findings authorization covers implementation; human merge and production release remain separate. Add exact repro/fix evidence to HC-041 and the Lavish dropdown.
