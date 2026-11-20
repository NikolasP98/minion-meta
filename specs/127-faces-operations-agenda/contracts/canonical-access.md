# Marked alias canonical authority and policy-bound save

## Scope and compatibility

Custom-navigation aliases have their own instance and section policy. Keeping those rows unchanged does not prove that authority is unchanged: `permissions.service.ts:157–169` can inherit a section allow while ignoring a built-in page deny, and `hooks.server.ts:372–387` grants the instance before the native page check. A `kind: 'link'` page still uses `instancePath` and `resolveNavInstance`, so it is not a plain link to the canonical URL.

This operation uses an opt-in marked alias; legacy alias semantics do not change for any tenant. Add `NavPage.canonicalAccess?: true` to `custom-sections.ts` and `nav-config-schema.ts`. Only literal `true` or omission is valid. Keep it through `normalizeNavConfig`, validation, serializers and navigation-editor copies. A preserve-single-link add requires the new link to carry `canonicalAccess: true`; its inverse removes that marked link. No table, rule row or grant is added.

The marker is sticky for a kept page ID across all `writeNavConfig` modes, including a legacy whole-config save without headers. Add pure `retainCanonicalAccess(previous, candidate): NavConfig`, run before normalization, validation and hashing: for every candidate page ID whose stored page was marked, set `true` even if an older client omitted the field. Moving or renaming the page keeps it; explicit `false` is invalid; no control or API clears it. Removing the whole page keeps existing authorization semantics; this does not protect a page removed and later recreated by a separate owner action. Return the stored normalized candidate and its ETag. Unmarked documents behave as before. UI copies carry the marker as opaque metadata; the agenda workflow shows no technical toggle.

## Runtime ceiling for every role combination

Add pure `canonicalTargetViewAllowed(target: string, caps: Capabilities, userRole: string | undefined, granted: ReadonlySet<string>): boolean` to `permissions.service.ts`. It extracts the static `SCREEN_DESIGN_MANIFEST` rule lookup and `decideRouteAccess` combination already used for native paths. The native static-path guard calls the same helper with its original granted set, so there is one canonical algorithm. `loadPermissionsForUser` passes its existing `capsToLegacyPermissions` set; the hook passes its current `guard.granted` set. For an aliasable static target, the decision is `caps.explicitView('page:' + target) ?? registryDecision`; otherwise the native matched static-page or registry rule applies. For a platform administrator, skip the built-in override as today and evaluate the original registry and granted inputs; add no new administrator allow. The module-availability guard stays on the resolved target path. The helper receives the same effective capabilities as the native request, including role-simulation narrowing.

For marked pages only, `loadPermissionsForUser` emits `page:<id>:view` when both the existing instance, section or registry decision and `canonicalTargetViewAllowed(target, …)` allow. Unmarked aliases keep the old decision. In `prepareRouteGuard`, after the instance existence and grant checks and the module floor, a marked hit also requires the canonical helper; the alias grant alone never suffices. Denial uses the existing generic 403 or 404 without exposing the denied rule. For a deeper path whose route policy differs, evaluate its native static-page or registry decision too, instead of skipping it with `pageRule = true`. Dataset, record, owner and field gates run through their existing handles; a canonical route allow is not a data grant.

The invariant is: marked alias allowed for a principal implies canonical target allowed for that principal, for current and future role, rule and membership combinations. A section allow or an alias allow cannot override a canonical deny, and a later canonical deny applies without deleting the marker or adding role rows. Every consumer uses the same rule:

- navigation visibility from the app layout;
- server page loads, `__data.json` and form actions through `hooks.server.ts`;
- `GET /api/nav/resolve` (`src/routes/api/nav/resolve/+server.ts`), which the client reroute in `src/lib/nav/alias-reroute.ts:39` calls. It reads `page:<id>:view` from `loadPermissionsForUser`, so the conjunction above already covers it and the endpoint's code does not change. Its existing `GET /api/nav/resolve` suite in `src/routes/api/nav/server.test.ts` gains a case: a marked alias whose canonical target is denied returns 404.

Menu caching can delay what a member sees: a stale menu can still show a denied link, but the hook enforces the same canonical decision a native request gets. A fresh read after the save proves persistence, not the current member layout or access.

## Policy fingerprint and fresh read

The config ETag binds only the normalized config and the authenticated org. Scoped preserve-single-link saves also send `X-Minion-Nav-Policy-Revision: "nav-policy-v1-<64 lowercase hex>"`. The scoped mode requires both this header and `If-Match`: a missing one returns 428 `nav_revision_required`; a malformed, weak, wildcard or list policy revision returns 400 `invalid_nav_policy_revision`. Normal saves without a mode do not require the policy header.

Extend the fresh GET as `/api/nav/config?fresh=1&policySection=<sectionId>&policyTarget=<canonicalTarget>` when both selector fields are present. A selector without `fresh=1`, or with only one field, returns 400 `invalid_nav_policy_selector`. Validate the section ID and aliasable target without guessing. This read requires `settings:manage` and `roles:edit` under both actual and effective authority, and grants nothing. It returns the same config body, config ETag, policy-revision header and `Cache-Control: private, no-store`; no role, rule or member data is returned. A plain GET or `fresh=1` without a selector keeps its earlier contract.

Add `readNavConfigAndPolicyFresh(ctx, selector)` to `nav-config.service.ts`. Its one transaction takes `lockNavigationPolicy` first, reads the uncached config and policy rows, and checks the current actor through a new export of `section-access.service.ts`, reached with the dynamic import described in [behavior.md](behavior.md#fresh-read):

```ts
export async function assertNavPolicyRevisionInTx(
  tx: CoreTx,
  ctx: CoreCtx,
  selector: { sectionId: string; target: string },
  expected?: string,
): Promise<string>;
```

It checks `roles:edit` and actual and effective `settings:manage` using `ctx.profileId` and `ctx.tenantId` only, never body claims, through the authority-only loader in [policy-read-seam.md](policy-read-seam.md). A missing profile or unavailable authority refuses. Ordinary config GET permissions do not change.

Fingerprint: SHA-256 of UTF-8, key-sorted (UTF-16 code-unit order) JSON `{version: 1, orgId, sectionId, target, rolePolicyRevision}`. `rolePolicyRevision` is the existing pure `rolePolicyRevision(rows.policy, rows.roles, rows.rules)` in `organization-role-policy.ts:53–63`, which canonicalizes the role catalog, rules, role model and default role; it is reused unchanged, including its `localeCompare` ordering. Authority rows are loaded uncached in the same transaction with the existing same-org locking reads, including orphan rules; never hash a cached matrix or display names. The selector comes from validated fresh-read input and, at apply time, is derived again from the added or removed link. Membership is not part of the fingerprint: the current actor is rechecked under the lock, and the runtime ceiling handles any current or future membership.

## Apply order

`writeNavConfig` scoped options add `expectedPolicyRevision`; the route reads headers and never takes authority from JSON. In the existing locked transaction:

1. compare the current config revision;
2. form the delta and selector, and require `canonicalAccess: true` on the addition or the inverse;
3. compute and check the current policy revision through the helper and the fresh actor checks;
4. check for a policy rule on the changed page key;
5. persist the sticky normalized config, skip orphan pruning and assert recoverability.

A policy mismatch returns 412 `stale_nav_policy` with no config, policy, audit or invalidation effect, even when the config ETag still matches. A config mismatch (412 `stale_nav_config`) is checked first. A rule added after the preview normally produces the policy 412 before the collision check; to test the 409 collision, seed the rule before the fresh policy preview. There is no automatic refresh and retry under an old owner approval.

## Lock participants and unlocked writers

This inventory comes from a search of the pinned source for `lockNavigationPolicy`, `hashtextextended(…, 112)`, and writes to `permission_rules`, `org_roles`, `organizations`, `member_roles`, `organization_members` and `app_nav_config`, excluding tests. Repeat the search on the implementation candidate; a new writer of a revision input that skips the lock must join the lock before qualification.

Writers that take the navigation policy lock:

| Writer | Anchor | Changes | Role in F6 |
| --- | --- | --- | --- |
| `writeNavConfig` | `nav-config.service.ts:37` | Navigation document; prunes page and section rules | Config revision input. Covered by the config race tests. |
| `writeSectionAccess`, `resetRegisteredRolePolicies`, `deleteRoleAccessCatalog` | `section-access.service.ts:716`, `:807`, `:924` | `permission_rules`, `org_roles` | Policy revision input. `writeSectionAccess` is the policy writer in both policy-only race orders. |
| `createOrganizationRole`, `renameOrganizationRole`, `setDefaultOrganizationRole` | `organization-role-admin.service.ts:350`, `:435`, `:461` | `org_roles`, `permission_rules`, `organizations.default_role_key` | Policy revision input. Same lock and same tables as above, so the `writeSectionAccess` race tests cover the serialization they share. |
| `mutateOrganizationMemberRoles` | `organization-role-admin.service.ts:527` | `member_roles` | Actor state. The actor-revocation case removes the actor's role through this writer in both lock orders. |
| `protectNewModelMembershipRemoval` (called by `deleteUser` and `updateUserOrganizations`) | `user.service.ts:218` | Deletes `member_roles` and `organization_members` | Actor state. Same tables and lock as the actor-revocation case; not tested separately. |
| `deleteUser` | `user.service.ts:262` | Locks every member org, then sets `profiles.deletion_pending` | Actor state. `requireFreshPolicyActor` already refuses a profile with `deletion_pending`; not tested separately. |
| `updateUserOrganizations` (add path) | `user.service.ts:397` | Inserts `organization_members` and `member_roles` | Membership only; can add members but cannot change the actor's own rights. Not tested separately. |
| `lockOrganization` in organization admission | `join/organization-admission.ts:138` | Admission inserts `organization_members` and `member_roles` (lines 286–290) | Membership only, as above. Not tested separately. |
| `withBrainWriteAuthority` | `brain-access-grants.service.ts:59` | Brain ACL rows only | Writes no input of either revision or of the actor check; takes the lock to read consistent role state. No F6 conflict. |
| `bootstrapOrganization` | `organization-bootstrap.service.ts:38`, `:63` | Line 38: existing-org retry, reads only. Line 63: creates a new org with its role, rules and owner membership | Cannot conflict: a new org has no navigation document or approved diff. |

Writers of the same tables that do not take the lock:

| Writer | Anchor | Changes | What F6 does |
| --- | --- | --- | --- |
| `setRoleOverride`, `clearRoleOverride` | `rbac.service.ts:765`, `:802` | `permission_rules` through the Supabase admin client | No callers outside tests at the pinned commit. Outside the serialization promise; a live caller found on the candidate must join the lock first. |
| Owner membership step in `provisionOrganization` | `organization-provision.service.ts:308`, `:321` | `organization_members`, `member_roles` for legacy-model orgs during provisioning | Membership only, at org creation. Outside the serialization promise; T017 confirms no provisioning run targets the FACES org during apply. |
| Post-transaction cleanup in `deleteUser` | `user.service.ts:273` | Deletes `organization_members` through the Supabase admin client | Runs after `deletion_pending` is set under the lock, which the actor check already refuses. |
| `updateTenant` | `tenant.service.ts:27` | `organizations.name`, `slug` | Not an input of either revision or the actor check. |
| Privileged SQL and scripts | — | Any | Outside the serialization promise; out-of-band maintenance during the real apply blocks it. |

An advisory lock does not exclude writers that ignore it. The runtime canonical ceiling stays the independent no-widening boundary, including when policy legitimately changes later.

## Operator and qualification changes

T017 requests both fresh headers with its real section and target selector, backs up the config and policy fingerprints privately, shows the marked-link diff and unchanged-role intent, and obtains owner approval of those current hashes. Both headers are submitted once; a policy 412 stops the apply like a config 412. After a failure following commit, recover with a fresh config and policy read and member and canonical route checks, never another write. The conditional inverse uses fresh config and policy revisions and refuses changed-key policies.

The native behaviors this contract adds are listed with the others in the [native lane](../quickstart.md#native-postgresql-lane). Unit, route and hook tests also cover: omitted and `false` marker parsing; sticky preservation on moved and kept IDs; missing and malformed selector and header cases; plain GET and no-mode compatibility; actual and effective actor denial; and no raw policy serialization. Browser and route-data tests compare the canonical route with the marked alias under canonical deny plus section allow, alias explicit allow, denied module, a custom multi-role union, changed membership and a deeper stricter route; direct page, data and action requests gain no authority. Unmarked fixtures keep legacy semantics. Use the existing harnesses for `permissions.service`, the hooks and `custom-sections`.

## Copy and paste keep the marker

The copy pipeline projects fields, so `structuredClone` alone does not keep the marker. Three edits are required:

- `src/lib/nav/nav-edit.svelte.ts`: add `canonicalAccess?: true` to the `navClipboard.item` type;
- `src/lib/components/layout/NavContextMenu.svelte`: the copy handler copies `canonicalAccess: true` only when the source page has it; unmarked and builtin pages omit it;
- `src/lib/nav/custom-sections.ts`: `addLink` input and construction copy literal `true` into the new generated-ID page for both custom-section and builtin-module destinations.

Both `paste` and `paste:<sectionId>` already forward the clipboard to `addLink`; keep that. The server sticky rule cannot repair a new page ID whose clipboard dropped the marker, so the `addLink` path is required. `duplicatePage(pageId)` spreads the whole source page and keeps the marker; verify it and keep its hidden-field handling. Builtin duplicates stay unmarked unless the source is marked. There is no explicit `false`, inferred grant or user-facing toggle.

Tests: extend `custom-sections.test.ts` for marked and unmarked clipboard-to-`addLink` cases on both destinations and for `duplicatePage`, checking that pasted IDs differ from source IDs and the input config is not mutated. Extend `src/lib/components/layout/NavContextMenu.mounted.test.ts` to copy a real marked instance, paste through each destination, inspect the submitted candidate and returned document, reload and assert the new link is still marked; unmarked copies stay unmarked. In the native marked-alias behavior, persist the copied new-ID candidate with the real `writeNavConfig`, then check the real permission and hook canonical deny, so it never becomes an unmarked escape.

## Fresh policy actor on the trusted outer transaction

`assertNavPolicyRevisionInTx` uses the authority-only loader and `requireFreshPolicyActor` from [policy-read-seam.md](policy-read-seam.md). The mixed `loadPolicyRows` also reads `app_nav_config`, so F6 never calls it, directly or through a recoverability fallback. Reads and row locks on organizations, profiles and members cannot run under the `app_ledger` ACL and row-level security; navigation-document reads stay in that nested scope.

Follow the existing `writeNavConfig` pattern: `ctx.db.transaction` owns the trusted outer transaction and the navigation policy lock, and only the document read or write enters `withOrgCoreTransaction` with its `app_ledger`, org and profile scope. Policy loading, the fresh actor check and the `settings:manage` plus `roles:edit` checks run on the same outer transaction, before entering or after leaving that nested scope, never inside it. The fresh GET with a policy selector uses the same outer transaction and lock. It writes no business data, but it does not declare the transaction read-only because the policy helpers take row locks.

Before the policy reads, verify that the current role is the original trusted outer role with SELECT and lock rights on the needed org, profile, member, role and rule rows, and not `app_ledger`, `anon`, `authenticated`, `service_role` or a worker role. Otherwise fail with `nav_authority_unavailable` before any effect. `ctx.db` is the existing server core handle, not a caller-provided URL or new client. Do not `SET ROLE` to a higher role, open a second connection or add `app_ledger` grants. `withOrgCoreTransaction` restores the original role and settings and is awaited before the next policy call; assert the restoration on success, rollback and error. All phases share one transaction and backend and hold the navigation policy lock until commit or rollback.

Do not call the F7 stock bridge from this transaction. The bridge takes the stock write lock before the navigation policy lock; calling it while F6 already holds the navigation policy lock reverses that order and can deadlock. F6 needs no security function, migration or F7 runtime dependency. Runtime alias, data and field permission checks are unchanged. The scoped save order in [Apply order](#apply-order) is unchanged; this section only fixes which role each phase runs under.

The native fixture models this split: the fixture's outer role for policy checks, the real `app_ledger` role only for nested document access, the same backend with restoration, and no extra org, profile or member grants or policies. Add negative direct-access probes for the baseline role and assert no privileged role leaks into document SQL or outside the transaction. Use the owned public database fixture in the [quickstart](../quickstart.md#native-postgresql-lane), not search-path substitutes. Before the public policy and foreign-key fixtures, apply the F7 test-only [native auth prerequisite](../../128-faces-receivables-audit/contracts/native-auth-prerequisites.md) (child `auth` schema, users, `uid`, owner, ACL, JWT and profile foreign key). It grants no business or browser authority.
