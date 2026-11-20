# Agenda navigation and conditional save

## Scope and authority

Append one agenda link (a marked `kind: 'link'` page to `/pos/appointments`) to the approved `pdv` section only if it is absent. Keep every existing page and section ID, order, label, target, hidden and builtin setting, contextual policy and role grant. There are no role, permission-rule or membership writes. The marked alias is intersected with canonical target access as [canonical-access.md](canonical-access.md) specifies; that contract is part of this design, and a config-only ETag or unchanged rule rows alone are not enough. Unmarked aliases keep their current semantics.

A hidden or denied existing agenda link is a blocker, not a reason to create another alias. Resolve organization, section and operator before writing. Resolve each personal account before claiming its runtime proof. The owner confirmed that Coli is not provisioned; the existing operations account's acceptance is independent, and Coli's proof follows separately authorized provisioning. This slice adds no invite, account or grant. The existing `settings:manage` gate on the config route and the `roles:edit` gate on policy inspection stay as they are.

## Fresh read

Extend `GET /api/nav/config` with `?fresh=1` to read the org-scoped database directly, bypassing `cached()` and its 30-minute plus 5-minute stale-while-revalidate policy. Any other value, or no value, keeps cached behavior. The JSON body stays the normalized `NavConfig`. Fresh responses carry `Cache-Control: private, no-store` and a strong ETag.

Add `readNavConfigFresh(ctx)` and server-only `navConfigRevision(orgId, config)` to `nav-config.service.ts`. The revision and ETag format are defined in [data-model.md](../data-model.md#derived-revisions): the hash covers the authenticated `orgId` and the normalized version 1 document, with keys sorted by UTF-16 code-unit order and array order kept. Because the org ID is hashed, identical documents in two organizations yield different revisions, and a tag from one organization cannot authorize a save in another; actor and target checks still apply. No stored revision or schema change. `readNavConfig(ctx)` is unchanged. Inside writes, use a transaction-local reader; never nest `withOrgCore`. Calls from `nav-config.service.ts` into `section-access.service.ts` use the existing dynamic import (`nav-config.service.ts:50–51`) because of the static import cycle described in [research.md](../research.md#decisions-rationale-and-alternatives).

## Conditional write and failures

`PUT /api/nav/config` accepts an optional strong `If-Match`. A malformed, weak, wildcard or multi-value header returns 400 `invalid_nav_revision` with zero writes. A valid header becomes `writeNavConfig(ctx, config, { expectedRevision })`. Without the header the existing behavior is unchanged, so existing payloads and first-party clients stay compatible. This protects the selected operation, not old clients that send no precondition.

Keep the existing outer transaction and `lockNavigationPolicy`. After locking, and before the upsert or `pruneRemovedNavigationPolicies`, read the current stored document through the scoped transaction, normalize it and hash it without cache. A mismatch throws `NavConfigRevisionConflict`, rolls back and returns 412 `stale_nav_config` with no document or policy change. The lock also serializes saves when no row exists yet. With a matching revision, keep structural and semantic validation, the upsert and the recoverability check. Normal saves keep their pruning; the scoped mode below skips it. Return the unchanged JSON body and the candidate ETag. Tests prove that a refused request causes no document, policy, audit or invalidation side effect, and legacy tests are kept.

## Policy-preserving single-link mode

The F6 client sends `X-Minion-Nav-Mode: preserve-single-link` with a strong `If-Match` and the strong policy-revision header from [canonical-access.md](canonical-access.md#policy-fingerprint-and-fresh-read). An unknown mode returns 400 `invalid_nav_mode`; this mode without `If-Match` or the policy-revision header returns 428 `nav_revision_required`. The route passes `{ expectedRevision, expectedPolicyRevision, mode: 'preserve_single_link' }` to the service. Org and actor never come from a header or body.

Under the lock and after the config revision matches, validate the normalized before and candidate delta. Version, `builtin`, `builtinSections`, section count, order, IDs and metadata, and every unrelated section's pages must be identical. One existing section either gains one final `kind: 'link'`, `canonicalAccess: true` page, or loses that final marked link as the inverse. Every kept page object and its order are identical. A new section, a `kind: 'main'` change, a full replacement, a label, move or hidden edit, or more than one change returns 400 `invalid_nav_single_link`.

From the locked diff, take the changed page key and query `permission_rules` for this org and `module = 'page:<changed id>'` across every stored role, including orphan keys absent from current navigation. Any rule for the added or removed key returns 409 `nav_policy_conflict`, reveals no role or rule details and changes nothing. This stops an orphan rule from activating through an ID collision, and stops a rollback from removing a page that gained policy after creation. The scoped mode never calls `pruneRemovedNavigationPolicies`, so unrelated orphan rules stay byte-identical; otherwise `section-access.service.ts:893–915` would delete and audit every stored orphan. The recoverability check still runs in the same transaction.

This is a single additive or inverse path, not a general policy-preserving replacement. No new table, policy grant or pruning framework is added. Tests keep an unrelated orphan rule and its audit baseline through a successful append and removal; a key collision, an arbitrary delta and a stale revision each leave config, policy and audit unchanged.

## Operator sequence and recovery

1. After the code is qualified and released, fresh-read the full config and ETag, back it up privately, inspect policy without changing it, and verify the org, section, target and limits.
2. If the agenda link is already in place, make zero writes and verify account visibility separately. Otherwise build the candidate with one collision-free six-character page ID and only the approved agenda link.
3. Obtain owner approval of the document diff and target. PUT once with the fresh ETag and preserve-single-link mode. A 412 stops the apply: fresh-read and present a new diff; never merge or retry under the old approval.
4. On 200 or an uncertain response, fresh-read again. Equality with the approved candidate proves persistence; do not PUT again. Equality with the before-state allows only a retry with a current precondition and the same intent. Any third state needs a new approved diff. A transport failure is not rollback proof.
5. Cache and RBAC invalidation can fail after commit. A fresh read proves persistence, not member-layout freshness. Record "refresh required" until member-filtered navigation and canonical route data show the alias. Retry reads or refreshes, never configuration writes. Do not claim both-account delivery while identity, access or freshness is unqualified.

Rollback is a separately approved conditional PUT in preserve-single-link mode that removes the added link. The fresh state must equal the candidate, and `If-Match` must carry its current ETag. Restore only the approved before-document; stop if another edit intervened. Disposable QA compensation runs in `finally` with the same check. No business-record count, policy or role grant may change.

## Proof and compatibility boundary

Counterexample: cached GET returns A while the database holds B; an old hash preflight on A passes and the old PUT overwrites B. The new fresh GET must return B despite cached A. After a fresh read of B, a concurrent save of C must make the conditional save of B return 412, keeping C and all permission rules. Run both race orders on disposable native PostgreSQL, including the absent-row case and the shared lock path; mocked calls are not concurrency proof. Equivalent object-key order must give the same ETag; a change in array order must change it. Also test denied and foreign callers, malformed, weak, wildcard and list preconditions, a valid save, a lost response after commit, failed invalidation, rollback conflicts and legacy no-header compatibility.

There is no new route, table, migration, contextual grant or visible redesign. The `NavPage` model and validation gain the optional `canonicalAccess` marker defined in [canonical-access.md](canonical-access.md); the document stays `version: 1`. A later legacy administrator can still replace the whole document; this safeguard does not claim global lost-update prevention across old clients.
