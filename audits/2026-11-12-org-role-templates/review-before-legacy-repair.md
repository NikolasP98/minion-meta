# Independent final review — organization roles

Reviewed at 2026-11-12T08:37:01.710967+00:00.
Checkout: `/home/nikolas/.cache/codex-work/hub-org-role-templates-20261112`. Branch `feat/113-org-role-foundations`; PR 656 targets `master`.
HEAD: `d61023185ee55961ae2c71f1febd978dacaaef39`. HEAD tree: `87567919546535c8398bc313382f5c365aa4583f`.
Approved spec SHA-256: `b8786674cdb56c49995e39bf4e6854229be267a61c022d0fd545664c4125cf13`.

Uncommitted files at review (no product-source edits):
- `docs/organization-role-templates.md` SHA-256 `13031d1d283ed8aedfff1f4020f0688f4f86ef6936a804fa4899afbfbcf7bcb5`
- `src/routes/api/notes/polish/polish.server.test.ts` SHA-256 `cc487d8e9533ab681063fbf8c0c17a9d9eed5d6da9bb343fac03af8fb56773e1`
- `src/routes/api/pos/tickets/[id]/schedule/server.test.ts` SHA-256 `b5dc6e51690bec44c72e65e4a010c3c6e08c73a714322e00630d52eb0e3eaf86`

## Standards: BLOCKED

The remaining legacy grant writers do not establish fresh actual/effective authority inside the mutation transaction. This violates the existing server-boundary discipline and the owner-approved all-grants ceiling. Product code was not edited during this review.

## Spec: BLOCKED

1. **P1 — Legacy role assignment/removal can widen access beyond the actor.** `src/server/services/rbac.service.ts:752` / `:822` route legacy replace/add through rank-only checks at `:770` / `:840`, followed by separate privileged writes. `callerRankCap:651` also trusts admitted simulation rank without fresh real authority. The public member-role API supplies only its `users:manage` admission. A same/lower-rank role may contain module, owner/field, or page grants denied to the actor; assigning it to self is an escalation. `removeMemberRole:862` may remove the last explicit restricted role and restore the broader legacy membership fallback. Require fresh real/effective full grant and rank checks under org112, in the same grant transaction, including newly exposed fallback on removal. Keep existing catalog/assignments unchanged.
2. **P1 — Legacy admission bypasses the grantor ceiling.** `join/links.service.ts:33` mints legacy links without checking or persisting grantor authority; `:94` redeems through `createMembership`. `join/requests.service.ts:91` ignores reviewerProfileId in the legacy branch and reaches the same writer. `join/profile-admission.ts:24` fences only the target profile and writes the selected role unconditionally. A user with Team management can mint/approve a broader admin role despite lacking those rights. Require authenticated grantor, sorted profile114 locks before org112, fresh real/effective complete ceiling in the grant transaction, and audit/use/request commit semantics. Legacy records lacking verifiable grantor authority need fail-closed reissue/reconfirmation unless the owner explicitly authorizes an exception; none was recorded.

Required regressions: valid legacy grants still work; same/lower-rank broader module/record/field/page grants deny; removal cannot expose broader fallback; real revocation under active simulation denies; concurrent permission revocation defeats a waiting grant; failed grants leave assignments, audit, invite uses and request state unchanged. Existing native tests prove new-model admissions and legacy duplication ceilings, but do not cover these legacy grant paths.

## Reviewed and cleared within source scope

No additional confirmed blocker found in organization-only catalog selection/fail-closed role resolution; versioned template copying and guarded role CRUD; post-change last-owner/recovery checks and rendered role/Team path requirements; new-model frozen invite roles/revisions and replay handling; ordered profile-deletion fences; Brain ACL/visibility and managed-agent finalizer real/effective object checks; additive notification-source column grants and restrictive live-source fence. The pending rollout runbook correctly requires draining/stopping the old worker before both migrations, compatible readers/worker before activation, and provisioning flag false until approval. Remote gateway effects remain separate from SQL commits by the explicitly reviewed two-phase contract.

## Limits

Source review only in this final pass; no heavy tests, production writes, merge or release. Independent findings concern engine/admission/lifecycle/notification and rollout sources authored by other agents. Roles UI/API adapters authored by this reviewer retain separate focused-test receipts; they are not claimed as independently reviewed here. Previous focused test receipts remain separate. Parent reports browser qualification complete and exact-candidate full build/test CI in progress; this receipt does not certify those unobserved results. Corrections require a new source fingerprint, native regression proof and follow-up independent review before approval.
