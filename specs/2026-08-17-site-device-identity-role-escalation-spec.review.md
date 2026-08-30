---
spec: 2026-08-17-site-device-identity-role-escalation-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set pass 2 and `changes_requested`: the canonical caller-role source and device-grant mapping remain unresolved authorization decisions.
- Narrowed “no signed value from the body” to authorization-sensitive fields and server time; handshake fields legitimately remain request-derived and signed.
- Corrected the candidate role-source count and required a human choice between global and organization-scoped authority.
- Blocked implementation until canonical role/tenant semantics, `MAX_GRANT`, and the scope vocabulary are recorded.
- Defined omitted versus supplied fields in `resolveGrant`, removing ambiguity around “intersection.”
- Required `AppRole` to derive from canonical types where possible; a copied union cannot detect upstream enum changes.
- Clarified which payload fields remain sourced from the request/challenge rather than the sign response.
- Made the client signature contract test enumerate every canonical payload field.
- Recast the role/scopes grep as a manual bypass check; hit counts cannot prove data-flow safety.
- Replaced the temporary edit/revert exhaustiveness probe with a source-controlled type-test fixture.
- Required runtime scope validation to use an authoritative vocabulary rather than an unspecified list.
- Removed the instruction to expect a rebase, consistent with the repository's branch/worktree safety rule.
- Corrected the cross-repository correction workflow: a site PR cannot atomically commit a meta-repo spec edit.
- Made S1-alone safety conditional on an approved mapping and replaced “match the current client” policy with an explicit human compatibility/security decision.

## Human decision required

- Choose the canonical authorization source: global `profiles.role`/Better Auth `user.role`, or organization-scoped `member.role`, including active-tenant binding.
- Approve the exact mapping from canonical app roles to gateway device `role` and `scopes`, and identify the authoritative scope vocabulary. Current-client behavior is compatibility evidence, not automatically security policy.
