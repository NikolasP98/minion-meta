# Implementation inventory — 127-faces-operations-agenda

These are future Hub-relative actions; nothing here was changed while writing. Create paths do not exist at the pinned baseline; if one exists on the implementation candidate, extend it rather than add a duplicate. No file is deleted and no package dependency is added. The Task column links each row to [tasks.md](tasks.md).

| Action | File | Task | Responsibility or no-change condition |
| --- | --- | --- | --- |
| Create | src/server/services/nav-config.service.test.ts | T008 | Revision, fresh read, conditional save and marker compatibility unit tests. |
| Create | src/server/services/nav-config-conditional.sql.integration.test.ts | T012 | The native behaviors in the [quickstart native lane](quickstart.md#native-postgresql-lane). |
| Modify | src/server/services/nav-config.service.ts | T008 | Fresh read with optional policy selector, conditional delta, sticky marker and no-prune scoped mode; calls section-access helpers through the existing dynamic import. |
| Modify | src/routes/api/nav/config/+server.ts | T008 | Fresh selectors, strong config and policy headers, status handling. |
| Modify | src/lib/nav/custom-sections.ts | T018 | Optional `canonicalAccess: true`, normalization, validation, `retainCanonicalAccess` and `addLink` marker copy. |
| Modify | src/lib/nav/nav-config-schema.ts | T018 | Literal-true-or-omitted marker admission. |
| Modify | src/lib/nav/nav-edit.svelte.ts | T018 | Clipboard type carries the optional marker; no user toggle. |
| Modify | src/lib/components/layout/NavContextMenu.svelte | T018 | Copy handler carries the marker; paste forwards it to `addLink` for section and module destinations. |
| Modify | src/lib/components/layout/NavContextMenu.mounted.test.ts | T018 | Real copy, paste, save and reload of marked and unmarked links with new IDs. |
| Modify | src/lib/nav/custom-sections.test.ts | T018 | Marker parsing, sticky move and retention, copy into `addLink`, no clear path. |
| Modify | src/server/services/section-access.service.ts | T020 | Private authority-only loader, narrowed actor input, exported `assertNavPolicyRevisionInTx` and `assertNavigationAccessRecoverableInTx`; policy reads never include `app_nav_config`. Other callers of `loadPolicyRows` unchanged. |
| Modify | src/server/services/section-access.service.test.ts | T020 | Extraction, actor subset, recoverability with a supplied nav, unchanged full-loader callers. |
| Modify | src/server/services/permissions.service.ts | T019 | `canonicalTargetViewAllowed`, reused by the native guard, and the marked-alias conjunction. |
| Modify | src/hooks.server.ts | T019 | Marked-hit and deeper-route canonical check, keeping module and data admission. |
| Modify | src/server/services/permissions.service.test.ts | T019 | Canonical versus marked and unmarked, role and module cases. |
| Modify | src/hooks.tenant.test.ts | T019 | Page, data and action equivalence and denial for marked and deeper routes. |
| Modify | src/lib/nav/custom-sections-nav.test.ts | T019 | Marked visibility under the canonical ceiling. |
| Modify | src/routes/api/nav/server.test.ts | T006, T008, T019 | Fresh selector and header errors, normal-save compatibility, and a 404 from `GET /api/nav/resolve` for a marked alias whose canonical target is denied. |
| Modify | src/lib/nav/personal-navigation.test.ts | T010 | Personal hide and order persistence independent of org placement. |
| Modify | scripts/qc/native-postgres-manifest.ts | T012 | One `qa-native` admission with `minimumAssertions: 11`, `exactAssertions: true` and the behavior names; uses the F7-owned shared harness. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | T012 | Admission and behavior identity. |
| Modify | scripts/qc/native-postgres-report.test.ts | T012 | Missing, duplicate, skipped and extra twelfth behavior rejection. |
| Modify only for missing text | messages/en.json, messages/es.json | T013 | Reuse existing keys if every scoped label and refusal is translated; otherwise add matching English and Spanish keys. No technical detail in the user workflow. |
| Generated | src/lib/paraglide/ | T013 | Output of `bun run i18n:compile`; never hand-edited; no diff when catalogs are unchanged. |
| Modify only if fixture absent | scripts/qa/seed/matrix.ts | T004 | Owned synthetic persona fixtures only; no shared QA reset or live rows. |
| Create | specs/127-faces-operations-agenda/validation.md | T001 and later | Candidate commands and results, ownership, native and browser receipts, open approval gates. Meta-repo path. |
| Create | specs/127-faces-operations-agenda/evidence/ | T015 | Synthetic receipts; no live personal data or credentials. Meta-repo path. |
| No change | src/routes/api/nav/resolve/+server.ts | T019 (test only) | Reads `page:<id>:view` from `loadPermissionsForUser`, so the marked-alias conjunction applies without code change. |
| No change | src/lib/nav/alias-reroute.ts | — | Client reroute through `/api/nav/resolve`; inherits the server decision. |
| No change | src/routes/api/nav/access/+server.ts | — | Existing read-only policy inspection is reused. |
| No change | src/lib/nav/personal-navigation.ts, src/lib/nav/nav-config.svelte.ts | — | Existing personal-navigation and client config ownership. `duplicatePage(pageId)` already spreads the whole page and keeps the marker; T018 verifies it. |
| No change | src/server/services/organization-role-policy.ts, src/server/services/nav-policy-lock.ts | — | `rolePolicyRevision` and `lockNavigationPolicy` are reused as they are. |
| No change | src/server/services/workspaces.service.ts | — | Workspace provisioning is out of scope. |

There is no schema or migration, new page or API route, dependency or token change, and no role, member or policy grant. Policy and actor reads run only on the trusted outer transaction and document reads and writes run under the nested `app_ledger` scope, as in [policy-read-seam.md](contracts/policy-read-seam.md). The F7 stock bridge is never called while F6 holds the navigation policy lock. The production alias is applied only in T017; Coli stays unprovisioned.

Test-only F7 dependencies:

- `src/server/test-utils/operator-native-auth-fixture.ts` and `fixtures/operator-native-auth.sql` (owned by F7, [native-auth-prerequisites.md](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md)) install and check the child `auth` prerequisite before the public foreign-key and policy setup. Reuse the qualified helper, not a copied permissive policy. They add no `app_ledger` rights and no runtime dependency.
- The optional `exactAssertions` type and report check ([native-exact-count.md](../128-faces-receivables-audit/contracts/native-exact-count.md)) must be qualified before this row is registered. F6 owns only its admission and tests.

Every new test uses an existing unit, route, mounted or `qa-native` harness; there is no new runner and no implicit skip. The [focused command](quickstart.md#focused-checks) runs every test file above except the native SQL file, which runs only in the full native lane. Focused tests do not replace the full native lane and report, the full candidate checks, the UI, i18n, token and browser gates, or owner approval.
