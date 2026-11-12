---
spec: 2026-11-12-hub-org-role-templates-spec
pass: 2
verdict: approved
reviewer: codex-independent-role-spec-review
created: 2026-11-12
---

# Review: organization-owned roles and templates

Technical review and owner security-spec approval are complete. Implementation and local runtime qualification are complete in an isolated Hub
checkout; final exact-head CI passes all 18 PR checks.
Merge and deployment have not been performed.

## Pass 1 — Changes requested

Independent reviewer `/root/role_spec_review` found missing Spec Kit artifacts,
an underspecified shared administration predicate, incomplete creation-path
inventory, mutable default-role invite authority, undefined blank-role rank and
a last-administrator invariant that omitted actual management-page access.

Corrections: added canonical `specs/113-org-role-templates/` spec/plan/tasks/research;
separated Team, simulation, Brains and ownership authority; completed source and
read-only database metadata inventory; froze invite role/revision/grantor at mint;
set blank rank 10; included management-page paths in the recovery predicate.

## Pass 2 — Corrections verified

Reviewer requested three final consistency corrections: link the completed
inventory instead of promising future research; remove the unsupported new
personal-org signup promise; scope the new recoverable-administrator guard to
new-model orgs and add legacy-edit regression requirements. All were applied.

Final independent review result: **Standards PASS; Spec PASS for owner approval**.
No residual blocking finding. This is specification readiness, not implementation
or authorization to skip the human approval/merge gates.

## Executed validation

- `node scripts/proposal-index.mjs --check`: passed.
- `node scripts/spec-index.mjs --check`: passed.
- `node scripts/check-agent-instructions.mjs`: instruction parity verified.
- `git diff --check`: passed.

Initial instruction parity invocation could not resolve an installed parser in
the isolated clone. Retried using the existing root dependencies through a local
untracked symlink; the check passed. No package/lockfile edits were needed.
Those checks qualify the planning artifacts. Product qualification is tracked
separately in the canonical task list and implementation evidence.

## Approval and handoff

The concrete design selects one local Administrator role for new organizations;
current organizations remain legacy. Owner approval is recorded in the board
spec and this sidecar. Implementation and qualification progress is tracked in
`specs/113-org-role-templates/tasks.md`.

## Owner approval

On 2026-11-12 the owner replied “approved. Proceed.” and then “go on”.
The reviewed specification is approved for implementation. This authorization
does not replace the separate owner merge/release decision.

## Owner-approved amendment

The owner requires every access grant to stay within the actor's own permissions
and explicit role CRUD authority. The Manager template receives role view, create,
edit and delete within that ceiling, as the owner confirmed with “Allow within
their own limits”. Staff and Viewer receive no role CRUD. Team management remains
separate. The canonical specification and plan contain the full amendment.


## Final implementation review refinement

Final independent review found rank-only legacy assignment and unverified legacy
admission paths that did not implement the owner-approved complete grant ceiling.
Those paths are being extended to fresh transactional actual/effective checks.
Legacy keys and stored grants are preserved. Future unknown-grantor legacy links
require reissue before admitting new members. This is an implementation correction
to the existing approved security rule; final code qualification remains required.


## Final source review and candidate

Hub `99341e7074541360eadcf2dcd32e67494f3c65ad`, tree
`0295df1eb209992cc5c9e3354754c29de93884bf`, passes independent Standards and Spec
source review. Earlier legacy, object, recipient-union and management-rank gaps
were reproduced and corrected; no source defect is accepted as unfinished.
The [independent receipt](../audits/2026-11-12-org-role-templates/review-final.md)
states the modeled scope and platform/identity boundaries. The
[qualification ledger](../audits/2026-11-12-org-role-templates/qualification.md)
keeps focused checks, full CI, browser evidence and release approval separate.
