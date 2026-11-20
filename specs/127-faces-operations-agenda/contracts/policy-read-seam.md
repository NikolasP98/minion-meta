# Authority-only navigation policy reads

This contract separates policy reads from navigation-document reads without adding a security function, role grant, schema, connection or public endpoint. In pinned `section-access.service.ts`, `loadPolicyRows` (lines 122–157) reads organizations, role catalogs and rules, and also `app_nav_config` (line 148). Calling it on the trusted outer transaction would read the navigation document outside its row-level security scope. `requireFreshPolicyActor` (lines 163–217) uses only policy, roles and rules, so its checks need no document.

`nav-config.service.ts` reaches every helper below with the existing dynamic `import('./section-access.service')` (as at `nav-config.service.ts:50–51`). A static import would close the cycle `section-access.service` → `permissions.service` → `nav-config.service`.

## Extraction

In `section-access.service.ts`, add private `type PolicyAuthorityRows = Omit<PolicyRows, 'nav'>` and private `loadPolicyAuthorityRows(tx: CoreTx, orgId: string): Promise<PolicyAuthorityRows>`. Move the existing active-org, organization-role-policy, legacy or custom role and rule reads into it with their current predicates, role composition, ordering and locks. It does not query `app_nav_config`. No empty placeholder nav object, cached rows, broader grant or F7 bridge stands in for authority.

Narrow `requireFreshPolicyActor`'s `rows` parameter to `PolicyAuthorityRows` (or a `Pick` of policy, roles and rules), because it never reads nav. Its identity, role-action, actual and effective simulation and rank semantics do not change, and existing callers passing full `PolicyRows` stay type-valid. Keep the private `loadPolicyRows` signature and behavior for unrelated section and role administration: it combines the extracted authority rows with its existing nav query and normalization. This refactor changes no caller's row-level security behavior and adds no parameter an HTTP client can supply.

`assertNavPolicyRevisionInTx(tx, ctx, selector, expected?)` (signature in [canonical-access.md](canonical-access.md#policy-fingerprint-and-fresh-read)) uses only `loadPolicyAuthorityRows` and `requireFreshPolicyActor`, with `roles:edit` and actual and effective `settings:manage`. It returns the policy revision string. It does not call `loadPolicyRows`, read the navigation document, start a transaction or build a placeholder nav. Org and profile come from the trusted `CoreCtx`. `rolePolicyRevision` consumes only the authority policy, roles and rules.

Validate the selector's section and target against the current normalized config, read under the nested `app_ledger` scope in `nav-config.service.ts`, and against the existing static aliasable registry. Neither the fresh GET nor the scoped PUT validates a section against a client-supplied config. The config ETag binds the org-scoped document; the policy revision binds the authority rows and the selector. HTTP headers, body and status codes are as defined in the other contracts.

## Recoverability without a privileged document read

Add this exported server-only helper to `section-access.service.ts`:

```ts
export async function assertNavigationAccessRecoverableInTx(
  tx: CoreTx,
  orgId: string,
  nav: NavConfig,
): Promise<void>;
```

It loads the authority-only rows and calls the existing `assertOrganizationAccessRecoverableDrizzle(tx, orgId, { ...authorityRows, nav })` with a complete `PolicyRows` object. `nav` is the normalized document read or persisted under row-level security in the same transaction, never a route body. In this call the existing function must not fall back to the mixed `loadPolicyRows`. The organization owner and administrator recoverability checks keep their member and assignment predicates and locks. No new role action is introduced.

The navigation writer calls this helper after the nested document write has finished and the original role and settings are restored, in both normal saves and preserve-single-link mode. Normal saves prune first, as today, then check recoverability against the persisted sticky normalized document; a failed check rolls back the document, pruning and audit together. Scoped saves keep their skip-pruning, unchanged-role policy. Other existing direct calls to `assertOrganizationAccessRecoverableDrizzle` without known rows are outside this change.

Normal saves without a mode keep their current authority: they do not gain the `roles:edit` check or the policy header. Only the scoped mode and the selector fresh GET run the role and settings checks. A test saves as a settings-authorized actor without `roles:edit` and expects success, so the helper split does not turn the scoped role check into a general navigation-edit requirement.

## Transaction and role phases

The selector fresh GET and both save modes each keep one `ctx.db` transaction, one backend and the navigation policy lock. Authority reads and the actor and recoverability checks run only under the trusted outer role. Every navigation-document SELECT, INSERT or UPDATE, including the sticky-marker read, the config comparison, the selector section lookup and the persisted result, runs inside an awaited `withOrgCoreTransaction` with the `app_ledger` role and org and profile scope. Only the normalized nav returned by the server crosses back as typed data, and role and settings restoration is asserted before the next authority phase. No privileged `app_nav_config` SELECT hides inside a policy or recoverability helper.

The save order is in [canonical-access.md](canonical-access.md#apply-order), followed by the recoverability check and commit. Early reads change nothing, and every actor check passes before any output or write. The fresh GET writes no business data but is not declared read-only, because the policy helpers take row locks. The F7 stock write lock is never taken after the navigation policy lock. No connection switching, `SET ROLE` escalation or new `app_ledger` org, profile or member rights are allowed.

## Qualification

Extend the existing `src/server/services/section-access.service.test.ts` for: unchanged unrelated callers of the full loader; the authority-only queries; the narrowed actor input; revision equality; and the recoverability helper with a supplied current or candidate nav. It is in the [focused command](../quickstart.md#focused-checks). Existing section-access SQL suites stay unchanged unless their shared fixture needs a recorded compatible extension; their permissive fake policies do not replace the F6 native lane.

Within the native behaviors in the [native lane](../quickstart.md#native-postgresql-lane), trace each request phase's SQL, backend, `current_role`, org and profile. Every `app_nav_config` statement runs as `app_ledger`, including the recoverability path after the save. Every authority-only org, profile, member, role and rule statement runs under the original trusted outer role. Setup statements in the controller phase are labeled separately from request reads. Cover the selector fresh GET, a legacy save, conditional add and inverse, an absent config, stale policy and config refusal, the absence of any mixed-loader nav SELECT, and restoration on success, error and rollback. Test both lock orders against a real policy writer without timing sleeps. SQL traces and baseline negative checks use real native roles, not assertions on mocked source text.

Mounted and route tests keep the strong config and policy headers, the marker and copy behavior, and the absence of raw policy rows. A source, actor or policy denial leaves no persisted config, rule or audit change and triggers no retry under the earlier owner approval.
