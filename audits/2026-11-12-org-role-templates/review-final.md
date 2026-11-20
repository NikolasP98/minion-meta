# Independent final source review: organization role foundations

Reviewed UTC: 2026-11-12T09:41:17.885513+00:00.
Checkout: `/home/nikolas/.cache/codex-work/hub-org-role-templates-20261112`. Branch: `feat/113-org-role-foundations`. PR: 656, base `master`.
Commit: `99341e7074541360eadcf2dcd32e67494f3c65ad`. Git tree: `0295df1eb209992cc5c9e3354754c29de93884bf`. Worktree: clean at fingerprint check.
Approved canonical spec: `/home/nikolas/.cache/codex-work/meta-org-role-templates-20261112/specs/113-org-role-templates/spec.md`. Spec SHA-256: `292cda97641a7c963d634de66314da45e3456101758b477f4d12346d9061962f`.
Reviewed-source manifest SHA-256: `fa2a76336d62937b8ef832eee2316927522cd51af01b85fd08ab8a7ae3d89ed6`.

Clarification refreshed UTC: 2026-11-12T09:47:08.742855+00:00. Independently checked canonical spec §2.1, Slice 4 and the legacy acceptance row against the already reviewed source and final grant-ceiling amendments. They now consistently preserve existing active grants and legacy keys/Staff approval defaults while bounding all future grants, requiring unverified-link reissue, clearing inactive stale assignments and preserving existing-member replay as a no-op. This is a wording correction, with no product source or approved behavior change. Commit/tree and source-manifest fingerprint are unchanged.

## Verdicts

- **Standards: PASS for source review.** The reviewed authorization writers establish fresh authority inside their serialized mutation boundary; the implementation preserves existing capability semantics and uses additive schema, bounded evaluation and separate platform/object authority.
- **Spec: PASS for source review.** The frozen candidate implements the reviewed organization-owned-role design and the owner's universal future-grant ceiling amendment.
- Confirmed remaining source blockers: **0**. Accepted source open ends within this reviewed scope: **0**.

This is a source-review verdict, not an exact-candidate CI, merge, deployment or release approval. Exact-candidate full CI remains pending as described below; this receipt does not convert qualification evidence into release approval.

## Scope and independence

This final pass independently reviewed engine, admission, lifecycle, policy, Brain and rollout contributions written by other agents. The reviewer previously authored Roles UI/API adapters and mounted tests; their earlier focused receipts are not represented as independent self-review. Parent browser qualification and its review of those surfaces remain separate evidence. The final 26-file correction commit was inspected after the prior blocking review; historical blocked receipts are preserved rather than overwritten.

## Complete current permission model

The review traced every modeled capability dimension and its composition:

| Dimension | Reviewed boundary |
|---|---|
| Actions | Full recipient role OR before/after; only newly effective grants are bounded by fresh actual and current-selected/admitted simulation authority. |
| Record scope | Least-restrictive view scope cannot silently widen a retained or newly enabled action, including edit. Scope and field changes are checked independently. |
| Field tier | Hidden-role MAX sensitivity and dotted inheritance cannot expose higher view/export tiers through another role. New actions, scope widening and tier growth are checked against the resulting tuple. |
| Pages | Registered static/native, custom and builtin page instances, section deny/inheritance, route floors and inherited transitions use shared policy evaluators; arbitrary dynamic-ID policies are not claimed. |
| Delegation rank | New role create/edit/delete or Team manage, and rank increases while management is held, cannot activate higher recipient management rank than either grantor ceiling. Read-only role view does not activate ranked writes. |
| Object identities | Brain role ACLs, user ACLs, creator identity, org visibility, other-role unions, legacy owner/admin aliases and new-model Brain management scope are evaluated separately from the generic matrix. |

`canRunAnalytics` and `visibleModules` derive from the already checked view capabilities; no additional mutable grant dimension was identified. Existing higher permissions that do not increase are retained, and genuine narrowing is allowed. `buildCapabilities` and legacy OR/fallback semantics are preserved.

## Writer coverage

- Member-role replace/add/remove for both models share the org112 policy transaction. They use the complete recipient before/after union and delegation rank, including legacy fallback exposure. Fresh actors and targets must be active; explicit internal system paths cannot borrow a simulation. Last-owner and new-model access-recovery guards remain serialized.
- Every role policy write/reset checks every affected active explicit or legacy-fallback holder, not only the edited role in isolation. Generic data deltas run for all mutations; Brain snapshots are required only for Brain action/scope widening. Canonical object actor capabilities come from pre-change rules, so proposed self-edits and synthetic platform-owner caps cannot supply private access.
- Known-recipient Brain effects include retained user/creator rights and other-role unions. Verified personal-agent ACL activation is considered only for recipient view/edit paths actually supported by the current routes. Browser grantors never inherit their agents' object rights. Browser/recipient caches are partitioned.
- Structural role checks retain latent role-ACL and future all-private scope ceilings. Legacy owner/admin blanket scope requires the corresponding actual/effective categorical authority; enumerating only current objects cannot create that permission.
- All invitation minting, redemption and approval adapters use the authenticated transactional admission path in both models. Role revisions include effective defaults, dotted/native/nav policy and selected-role Brain ACL effects. Unknown-provenance legacy links fail closed with a reissue message for new members. Existing-member redemption remains a no-op without role replacement or additional use.
- Inactive membership admission removes stale assignments and installs exactly the verified promised role in the same audit/use/request transaction. Applicant user/creator/verified-agent effects are checked before activation; legacy role-key and omitted-approval Staff behavior remain compatible.
- Sorted profile114 lifecycle locks precede org112 for admissions/deletion-sensitive membership creation. Pending-deletion fences and post-change owner/recovery checks prevent account deletion from racing a new sole-administrator admission.
- Brain ACL/visibility writers and managed-agent SQL finalizers retain current actual/effective module and object checks. Gateway RPC effects remain explicitly separate from SQL commits; idempotent retries and binding-conflict rejection do not claim cross-system atomicity.

## Bounded identity and platform contracts

The ordinary personal-agent contract is immutable, profile-owned identity: canonical creation derives `personal-<profile UUID>`, profile ownership is unique and cascades on profile deletion, normal service updates do not replace agent IDs, and the deletion export has no production caller. ACL recipient validation requires registered exact-org identities. Built authoring IDs are server CUIDs; normal runtime creation requests `built-...`, and managed Brain IDs use `brain-...`. Existing binding rows are share-locked; ambiguous case-folded personal identity denies.

The gateway's checked source contract normalizes the requested name and returns that exact agent ID (sibling source HEAD `1e099b3e6b9946f9d804c43ec8fde31bf0542eea`, relevant files clean when inspected). This is not proof of the deployed gateway artifact. Arbitrary SQL/imports, noncanonical identity injection or malicious trusted gateway responses are outside this ordinary application-path proof; they are not used as a silent authorization fallback. No additional reachable ordinary identity phantom was found.

Platform account/org lifecycle administration remains a distinct existing operator boundary: `/api/users/[id]` requires the profiles-derived platform admin identity, and active role simulation removes that route privilege. Organization-local Administrator or Team management does not become platform admin. This separate lifecycle privilege is not a claim that `profiles.role=admin` implies raw private-Brain access. The role editor's generic platform data authority and canonical private-object authority remain separate.

Brain and policy evaluation is explicitly bounded (4096 Brains, 65536 ACL/binding rows, 4096 policy recipients and 1000000 evaluation cells/assignment budget). Overflow denies and rolls back; no truncation grants authority.

## Compatibility and rollout

Existing organization catalogs, stored grants and assignments are not migrated into the new model. New organizations use one explicit local Administrator; optional versioned templates remain separate from active assignment roles. The security amendment intentionally tightens future legacy grants, old invitations lacking provenance and inactive stale assignments, while preserving legacy keys/defaults and existing active-member permissions.

The rollout runbook keeps `ORG_ROLE_TEMPLATES_ENABLED=false` until qualification and owner activation approval. It requires draining and stopping the old notification worker before applying migration10000 then20000, and deploys compatible readers/worker before activation. The additive worker source grants are column-limited and fenced by restrictive live event/receipt authority. Old workers are not admitted against the new catalog, and old readers cannot be used as rollback after organization-model data exists.

## Evidence and qualification limits

The reviewer inspected these completed focused JSON reports (tests were run by the owning agents, not rerun in this final review):
- `/tmp/role113-recipient-composition-final.json`: **127/127 passed**, zero failed/pending; SHA-256 `a1303aff0af06c92f0141c482d6c45ad2fffcb525dfb3f3ab389f5fcf56d9e75`.
- `/tmp/role113-complete-policy-final.json`: **45/45 passed**, zero failed/pending; SHA-256 `b6db91d3ab13d5a0450f97687c9cf43219bb158161ef4bdd3603dc00b4af4640`.
- `/tmp/role113-agent-principal-native.json`: **10/10 passed**, zero failed/pending; SHA-256 `1683832ba7cd1ad7b44e19c689012451db9fcc6f04795a49c3a2fa2963941ceb`.

Parent additionally reports admission 101/101 (43 native, 41 service/API, 17 action) and prior unchanged RBAC 66/66; those counts are attributed to the parent rather than represented as newly executed by this reviewer. RED reproductions and subsequent native object/data/rank regression cases were inspected during the review. The final source snapshot is the committed fingerprint above.

At this clarification refresh, the parent reports local check 0 errors/0 warnings and QC 32 passed, plus exact-candidate CI check/build, jobs/QA and native guard passes. Full unit/browser CI remains pending. These latest gate outcomes are parent-reported, not newly executed by this reviewer. Historical green full CI on d610231 does not qualify 99341e7; earlier intermediate failure artifacts are historical, not substitutes for the current gates. Parent reports browser qualification separately. No production write, merge or deployment was performed by this reviewer. Owner approval of the concrete merge/release candidate remains required.

## Source manifest

```text
a407e945cda8c6f2fbf776a7f7768d2960d0f400b695a457b9fcfa3d1799c7aa  src/server/services/role-simulation-policy.ts
bfd08ef1d826c69e821d45730cc21e742eda601dfb35348c1a713f9985dfd10c  src/server/services/brain-role-grants.ts
e9b17766f73df96155513bbc79ce9678e6d8dfb3da17b78d93af328c139def37  src/server/services/organization-role-admin.service.ts
f41c7949a6cbe7c8954eeab2308df872eeec71da7e5bf79582e3d595d79a4d1e  src/server/services/rbac.service.ts
9a56e852ad191eff003ca482c8a4284d6d61f66bf307d0185b065a47d7770380  src/server/services/section-access.service.ts
b993d48425c1d81e9317fc508a4e7218c12f6820be36cfeed285a97798a5de48  src/server/services/join/organization-admission.ts
ef58bb2f0a39434d01cfbf30e0af790cd035933853a954a75dc694483252f8cf  src/server/services/join/profile-admission.ts
61626a65bf8d69bdc08a388301defad8d954605e384a43e9c67190b449ea2b65  src/server/services/join/membership.ts
4acea21b49462cf7524b11f81c5a0a5a8b0bf2eb7d34b44ac5068a98852b9296  src/server/services/join/links.service.ts
000458517d523a79512d74db1b6501631fb91bb18205d9fa1e8e4f3fa3a8acf8  src/server/services/join/requests.service.ts
5ec13fc1e07dd123eb1d52c1eec9d89886356e2ed332be57d9b35abbc2e029f4  src/server/services/brain-access-grants.service.ts
fa6479ce33f2ce90376c8a64400d87e1bc8884fc93591f19b1c4f9c6c2bbd7d2  src/server/services/brain-agents.service.ts
6e3a1a6ad776be23b646a91d292dad051b1dced05876f761cb93e546c60cb19f  src/server/services/organization-bootstrap.service.ts
338fb3e55aaed8e181acad2772dee08c104e4b0c50287b8562f5f947ed17a530  src/server/services/user.service.ts
c1b50b059f65a373a9bcbe1fcf10ea0c7f47cf04e4f74700cbdb05c7978334e0  docs/organization-role-templates.md
```
