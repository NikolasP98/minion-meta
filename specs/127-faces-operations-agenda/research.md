# Research: FACES personal-account agenda in the operations Space

## Evidence baseline and reading list

Read the root AGENTS.md; the pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; the `speckit-specify`, `speckit-plan` and `speckit-tasks` skills; `.specify/memory/constitution.md`; the active spec, plan and tasks templates; and parent proposal item F6.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source` at HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, checked with `git rev-parse`. Source paths are relative to Hub; links pin that commit. The meta registry reports Hub base branch `master` and Bun. No extension hook or branch-creation hook ran.

| Evidence | Source anchor | Finding |
| --- | --- | --- |
| R1 | [`src/server/services/nav-config.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/nav-config.service.ts#L1) | Org-wide `app_nav_config` read and write, settings cache, navigation policy lock and post-commit invalidation. |
| R2 | [`src/server/db/pg-schema/nav-config.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/db/pg-schema/nav-config.ts#L1) | Navigation document storage; not workspace membership. |
| R3 | [`src/lib/nav/custom-sections.ts:11`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/custom-sections.ts#L11) | NavPage, section and config shapes; `kind` link versus main; alias IDs and limits. |
| R4 | [`src/lib/nav/custom-sections-nav.ts:43`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/custom-sections-nav.ts#L43) | Custom module and sidebar projections from the member-filtered config. |
| R5 | [`src/routes/api/nav/config/+server.ts:14`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/config/+server.ts#L14) | `settings:manage`-gated GET and PUT, whole-document validation and RBAC invalidation. |
| R6 | [`src/routes/api/nav/access/+server.ts:10`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/access/+server.ts#L10) | Separate `roles:edit`-gated contextual policy reads and writes. |
| R7 | [`src/routes/(app)/+layout.server.ts:217`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/+layout.server.ts#L217) | App-wide config read; `visibleNavConfig` applied at line 343 using viewer permissions. |
| R8 | [`src/lib/nav/nav-config.svelte.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/nav-config.svelte.ts#L1) | Client reads the member-filtered layout config, with an optimistic overlay. |
| R9 | [`src/lib/nav/nav-config-schema.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/nav-config-schema.ts#L1) | Structural schema versus the stricter semantic `validateNavConfig`. |
| R10 | [`src/server/services/workspaces.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/workspaces.service.ts#L1) | Workspace and company switching is separate from the custom Space. |
| R11 | [`src/lib/nav/personal-navigation.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/personal-navigation.ts#L1) | Personal navigation model; check per-account hiding and pins before assuming the org config is enough. |
| R12 | [`src/routes/api/nav/resolve/+server.ts:19`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/resolve/+server.ts#L19) | Client reroute endpoint (called from `src/lib/nav/alias-reroute.ts:39`); returns an alias target only when `loadPermissionsForUser` grants `page:<id>:view`. |

## Current behavior and uncertainty

The meeting calls the Space PDB or PDV and asks for the operations user and Coli, without account or Space IDs. Hub supports organization-wide custom navigation in `app_nav_config`, independent of company or workspace switching. The app layout reads this document and returns a member-filtered view. Aliases point to existing screens; page and section policy is stored separately.

A root read-only production inspection on November 16 found the operations section labeled `pdv` with eight pages (sell, clients, stock items, stock movements, catalog and three social or marketing pages) and no `/pos/appointments` target; the [sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) records this. That summary holds no account or member fields, so the operations personal account is unverified: T007 must resolve it before any claim. The owner confirmed on November 16 that Coli is not provisioned. Missing navigation is established; personal-account access is not.

## Decisions, rationale and alternatives

**Custom navigation, not workspace provisioning.** `app_nav_config` stores custom sections and aliases, while `workspaces.service` handles company access. A new workspace would add unrelated membership and possibly data separation; a new agenda page would duplicate the existing screen.

**An alias with `kind: 'link'`, never `kind: 'main'`,** so no existing navigation moves. The target is `/pos/appointments`: the meeting operated the POS appointments workflow, and `pdv` already groups POS sell and catalog. `src/lib/routes/route-design-manifest.ts:528` registers this static screen, `src/lib/nav/custom-sections.ts:87–93` admits it as an alias target, and `src/lib/routes/route-access-registry.ts:80` supplies its `pos.appointments` route key. `/scheduling/calendar` is out of scope. Reconfirm the target on the implementation candidate and stop on drift. No invite, account or grant is authorized; Coli's proof waits for separate provisioning.

**Fresh read and conditional save on the existing route.** `readNavConfig` (`nav-config.service.ts:18–32`) caches for 30 minutes plus 5 minutes stale-while-revalidate, so a cached preflight is not current-state evidence. `writeNavConfig` (lines 35–66) already holds the navigation policy lock and upserts and prunes in one transaction; the stored revision is compared there before any write, and a mismatch returns 412. Client-only hashes cannot close the cached-read to whole-write race. No revision column, new route or permission grant is added.

The revision helper is new code in `nav-config.service.ts`. It sorts keys by UTF-16 code-unit order rather than copying `stableValue` (`section-access.service.ts:349–357`), which uses `localeCompare`. A static import from `section-access.service.ts` is not possible: `section-access.service.ts` imports `permissions.service.ts`, which imports `nav-config.service.ts`. `writeNavConfig` already avoids that cycle with a dynamic `await import('./section-access.service')` (lines 50–51), and every new call from `nav-config.service.ts` into `section-access.service.ts` uses the same dynamic import. Full contract: [behavior.md](contracts/behavior.md).

**A link is not a grant.** Existing module, page and section decisions are verified for each account. No contextual access change is part of this item. Account identities and production configuration stay private execution inputs.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; do not edit generated token CSS. User-visible labels go through Paraglide catalogs and `bun run i18n:compile`. Existing routes keep their route-design-manifest and RBAC coverage; no route or module is created. Denial is proven on server responses (page, `__data.json`, actions and `/api/nav/resolve`), not by hidden links alone. Source evidence and production evidence stay distinct.

## Policy pruning and native lane evidence

`pruneRemovedNavigationPolicies` (`section-access.service.ts:893–915`) selects every stored page and section rule for the org and deletes and audits each key absent from the candidate navigation. Keeping old document keys therefore does not keep orphan rules. The selected preserve-single-link mode validates the one-link diff, refuses a changed key that already has a rule, and skips pruning; normal saves keep pruning. The config revision includes the org ID, so a copied document in another tenant cannot satisfy this precondition.

The ordinary `vitest.config.ts` imports `NATIVE_POSTGRES_EXCLUDES`, and `scripts/qc/native-postgres-manifest.ts` excludes every `*.sql.integration.test.ts`. `vitest.qa-native-postgres.config.ts` admits only `nativePostgresFiles('qa-native')` and checks the loopback and disposable opt-in before running. The new fixture needs one manifest entry with its behavior names and report checks. The existing `section-access.sql.integration.test.ts` belongs to `qa-native`; its source, lock and fixture structure is the baseline to reuse. No new lane, CI job, runtime or open port is needed.

## Canonical versus alias policy

`permissions.service.ts:150–169` resolves an alias as page rule, then section rule, then the target's registry decision; it never consults a built-in `page:<target>` deny. `hooks.server.ts:367–398` resolves every `kind: 'link'` instance and sets `pageRule = true` at line 384, before the native static-page rule; `applyRouteAccessGuard` then returns early at line 417 and skips the registry. `custom-sections.ts:109–162` shows that `kind: 'link'` still has an instance URL. Leaving rule rows unchanged therefore does not prove the alias grants no more than the target. The selected marker and runtime conjunction are in [canonical-access.md](contracts/canonical-access.md); global changes to legacy alias semantics are rejected.

`loadPolicyRows` (`section-access.service.ts:122–157`) also reads `app_nav_config` (line 148), while `requireFreshPolicyActor` (lines 163–217) uses only policy, roles and rules. The authority-only extraction that follows from this is in [policy-read-seam.md](contracts/policy-read-seam.md).

`rolePolicyRevision` in `organization-role-policy.ts:53–63` is an existing pure fingerprint of the role model, catalog and rules. The writers that take the navigation policy lock, and the writers of the same tables that do not, are listed with their anchors in [canonical-access.md](contracts/canonical-access.md#lock-participants-and-unlocked-writers). Repeat that search on the implementation candidate.

## Review limits and execution preconditions

No browser run, product test, configuration write or implementation happened for this item. No organization, section or operator ID is inferred from meeting spelling. The reading list shows the implementation behavior relevant here; it is not a full security audit. The live facts above come from a repeatable-read `app_ledger` snapshot at 2026-11-16T19:20:30.051Z; private identities, raw records and unrelated configuration are not reproduced. Source and live-record evidence do not prove browser behavior or deployed source. Unknown runtime facts are handled by the inventory and reproduction tasks and their stop conditions before any change.
