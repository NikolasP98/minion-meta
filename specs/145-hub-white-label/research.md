# Research and decisions

Initial inspection used the shared local checkout; the specification was then reconciled against clean Hub origin/master `3d39cbb6` on 2026-11-21. This run does not establish deployed behavior. Exact SHA-256 file receipts and comparisons against Hub HEAD are in [source-evidence.json](source-evidence.json); current canonical literal candidates are in [coverage.md](coverage.md). Initial local receipts and inventory are preserved under egm/initial-local-*. Never assume missing files were intentionally deleted.

## AS-IS — initial local inspection

| Observation | Local source evidence |
|---|---|
| Sidebar and mobile header hardcode MINION plus a separately rendered hub | `src/lib/components/layout/Sidebar.svelte:515`, `Topbar.svelte:172` |
| Visible mobile wordmark is hidden at widths ≤400px | `Topbar.svelte:390` |
| Logo component repeats hardcoded MINION when its text option is used | `src/lib/components/layout/MinionLogo.svelte:368` |
| Public task chrome has its own Minion + Hub wordmark | `src/lib/components/ui/foundations/PublicTaskShell.svelte:50` |
| Page titles, marketplace badges and CSS watermarks also carry product names | coverage.md lists each occurrence, including CRT preview text |
| Organization creation accepts full names of 2–80 characters | `src/server/services/organization-provision.service.ts:40` |
| Creating an organization is administrator-only; retries reuse its slug | `src/routes/api/organizations/provision/+server.ts:7`, `organization-provision.service.ts:91` |
| Personal-agent onboarding is a separate authenticated flow | `src/routes/onboarding/+page.server.ts:11` |
| Appearance manages per-user logo/theme choices; those do not define organization branding | `src/routes/(app)/settings/appearance/+page.svelte:47`, `src/lib/state/ui/logo.svelte.ts:67` |
| Tenant service reads organizations from Supabase and ignores legacy logo/metadata writes | `src/server/services/tenant.service.ts:5` |
| Generic tenant PATCH has a tenant-context check but no explicit capability gate; its service currently only accepts name/slug | `src/routes/api/tenants/me/+server.ts:13`, `tenant.service.ts:20` |
| The initial local app layout reads the active tenant, while root load only returns user/env | `src/routes/(app)/+layout.server.ts:161`, `src/routes/+layout.server.ts:24` |
| Org management and member roles are scoped separately; settings capability alone does not mean owner | `src/server/services/rbac.service.ts:1184`, `src/server/services/organizations.service.ts:26` |
| Baseline organizations policy grants platform admins ALL and members SELECT; table grants alone are broad | `supabase/qa/baseline/schema.sql:9502`, `:9508`, `:11229` |

Git source heads: see source-evidence.json. Both repositories carry unrelated WIP. Hub registry PR base is master, verified by `node scripts/repo-policy.mjs show hub`; the older Hub CLAUDE.md dev-branch guidance conflicts and yields to the registry. GitHub PR list shows specs through 144, so this run explicitly reserves feature directory 145 rather than colliding with locally absent feature directories.

## Canonical source reconciliation

The clean Hub source snapshot was fetched without changing the shared Hub checkout. Its full commit is source-evidence.json hub_head, prefix `3d39cbb6`, current origin/master at inspection. Its AGENTS.md is authoritative and CLAUDE.md includes it. The inventory now covers this clean snapshot, with 51 Hub-identity candidates among 275 raw candidates after excluding seven standalone-updater identity occurrences; these counts describe the source scan, not unique screens or runtime results.

Material differences from the initial local inspection:

- `src/lib/services/actions/definition.ts` now defines CommandAction, and runtime.svelte.ts:367 exposes runCommand. The final plan uses that existing confirmed-command save path, acknowledgement and committed-refreshing/unknown outcomes. The initial EGM read-only-runtime finding was valid for the dirty local source but is superseded for the implementation base.
- `(app)/+layout.server.ts:233–250` normally reuses locals.orgKind without querying the organization. Final design intentionally adds one combined branding/kind projection per layout refresh and avoids a root/child duplicate. Ordinary navigation still does not reload that layout.
- `organization-provision.service.ts:286–303` has a feature-gated organization-bootstrap path. `organization-bootstrap.service.ts:15–90` inserts organizations and owner memberships atomically. Both creation paths must persist the initial prefix, and retries preserve it.
- New-model owners hold `organization_members.role='owner'` and can have assigned key `custom-administrator`; requiring member_roles.role_key='owner' would deny them. Final writer reuses exported readOrganizationAdminState/memberAuthority in organization-role-admin.service.ts under the existing actor/org advisory locks and fresh SQL row locks. Both role models and simulation denial are in the planned tests.
- Hub AGENTS.md requires `bun run a11y` after UI changes and `bun run a11y --all` for the QA-backed page sweep. These are named final gates, not checks run by this specification task.
- Existing org switch is `src/lib/components/layout/OrgPicker.svelte` → `/api/active-org`; the latter validates canonical membership before writing the cookie. Qualification must exercise this real path.

The tenant service, root layout shape, literal branding problem, direct tenant-patch allowlist, and dedicated Appearance/organization-creation surfaces remain consistent with the proposal. Baseline SQL remains evidence of the baseline only: final-role SQL behavior is still an implementation qualification gate.

## TO-BE

One verified organization provides the product-name prefix throughout the Hub. Null override follows a valid short organization name; a custom value takes precedence; no usable name means MINION. Hub remains fixed. The owner can edit the shared prefix. The administrator creation form proposes it without shortening the organization's full name.

## DELTA and proof

| Transition | Proof required before implementation is complete |
|---|---|
| Local per-user visual choices → independent shared org text | Two users/same org agree after reload; theme preferences remain independent |
| Hardcoded product names → resolved identity | Close every identity entry in coverage.md; actual server-rendered and hydrated views |
| Existing short-name org with no override → own name | Faces null fixture shows Faces Hub without backfill |
| Long full organization name → deliberate short display name | 80-character legal-name fixture; create blocked until short name chosen |
| New short name → persisted safe override | Route/service/native DB tests, retry and concurrent insert recovery |
| Generic unguarded tenant write path → shared owner-gated branding and full-organization-name mutation | Staff/other-org/revoked-owner/direct authenticated SQL negative tests; no generic brand allowlist and no unguarded automatic-name bypass |
| Organization switching → fresh identity | Delay A save/read while switching B; verify B after settlement and back/logout |
| Assumed fit → measured layout | Actual components, maximum-width names, 401/430px visible mobile and expanded narrow sidebar; 320/390 icon-only accessible name |

## Decisions and alternatives

1. **Separate Hub name from full org name.** Reusing the full-name field directly would impose the display limit on an existing 80-character business identifier. An optional organization column is enough; a new settings framework or per-user preference would add the wrong ownership.
2. **Fifteen graphemes plus a byte ceiling.** The user proposed about 15 characters. Graphemes count what people see; 256 UTF-8 bytes bounds pathological combining input. Both are validator limits, not a promise about pixels. Layout must wrap at accepted lengths.
3. **No silent shortening.** Creation requires a short Hub name when the suggestion does not fit. Existing long-name organizations get MINION until an owner supplies one. The editor explains that fallback.
4. **Use existing administrator org creation.** This feature does not turn personal-agent onboarding into organization provisioning or widen who can create organizations.
5. **Use existing Appearance.** Keep personal logo presets intact and label the new shared setting clearly. An explicit Save matches the local shared-default policy.
6. **Use a new guarded endpoint.** `/api/tenants/me` currently lacks the necessary branding authority check. Keep its allowlist closed to branding; the final plan therefore guards that existing full-name/slug writer through the same owner transaction, because its name supplies automatic branding. Unrelated tenant-management redesign remains outside scope.
7. **One request-owned identity.** Use SvelteKit layout data and a shared wordmark; avoid global SSR stores, CSS string interpolation, per-browser brand storage and post-mount default flashes.
8. **Scope is text identity in the Hub web app.** The bundled desktop updater and its dedicated messages retain literal native identity; the hosted DesktopTitlebar uses verified app branding. Logos, favicons, native binary/OS window titles, external emails, legal/service names and marketing remain independent. Neutralize personal-agent copy rather than calling the assistant a customer's brand name.

## Unverified evidence boundaries

No production queries/writes, migration, browser runtime, layout measurements, application tests or deployment were performed by this specification run. Actual RLS after all migrations, base reconciliation, Unicode runtime support and fixture coverage are implementation gates, not established results. The reviewed proposal's 15-character layout remains a requirement to prove.

The interrupted final source audit additionally identified onboarding_userTitle as visible product identity and the oauth_authorize_title caller. The final inventory has five named localized consumers; prefix-only copy keeps its original absence of Hub, while existing Hub suffixes remain fixed.

The final closure scan also records TypeScript-fed topology labels and external/provider/audit/release provenance. Global architecture names remain canonical physical-service identities under FR-010; they are explicitly excluded rather than missed by a markup-only search.
