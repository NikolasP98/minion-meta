# Implementation file actions

Paths are relative to minion_hub, pinned source 3d39cbb6. Every existing path below was checked; new paths are deliberate. No Delete actions. Identity-consumer Modify actions are generated from the classified inventory; they do not authorize a global string replacement.

| Action | File | Required change |
|---|---|---|
| Modify | `messages/en.json` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `messages/es.json` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `scripts/qa/seed/matrix.ts` | Register branding fixture identity/reason entries. |
| Modify | `scripts/qa/seed/tenancy.ts` | Null short/long name, custom/MINION, max-length org fixtures. |
| Modify | `scripts/qc/native-postgres-manifest.test.ts` | Assert native coverage/manifest registration for new SQL cases. |
| Modify | `scripts/qc/native-postgres-manifest.ts` | Register new branding native SQL file/named cases in qa-native lane. |
| Create | `src/lib/branding.svelte.ts` | Read-only request/page-owned derived projection; no mutable singleton. |
| Create | `src/lib/branding.test.ts` | Exact contract fixtures, precedence, controls and byte/grapheme boundaries. |
| Create | `src/lib/branding.ts` | Shared exact validator, suggestion and closed projection resolver. |
| Modify | `src/lib/components/layout/DesktopTitlebar.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Create | `src/lib/components/layout/HubWordmark.mounted.test.ts` | Render actual component with bounded names and reactive org replacement. |
| Create | `src/lib/components/layout/HubWordmark.svelte` | Shared text prefix+fixed suffix, accessible identity and wrapping. |
| Modify | `src/lib/components/layout/MinionLogo.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/layout/Sidebar.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/layout/Topbar.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/marketplace/AgentCard.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/marketplace/_agent-card/IdFooter.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/navigation/PersonalHome.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/components/settings/CRTConfigModal.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Create | `src/lib/components/settings/OrganizationBranding.mounted.test.ts` | Actual editor no-dispatch/known-rejection/unknown/refresh-reconcile/org-generation tests. |
| Create | `src/lib/components/settings/OrganizationBranding.svelte` | Shared setting draft/counter/preview/save/recovery with existing action adapters. |
| Modify | `src/lib/components/ui/foundations/PublicTaskShell.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/lib/routes/route-access-authority.test.ts` | Appearance retains authenticated personal access; no owner page-wide restriction. |
| Modify | `src/lib/routes/route-design-contracts.test.ts` | Appearance existing form-settings metadata and unchanged page count. |
| Modify | `src/lib/stories/Shared/Markdown.stories.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/+layout.server.ts` | One combined identity/kind query, request projection and app:branding dependency. |
| Modify | `src/routes/(app)/agents/builder/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/capabilities/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/cloud/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/cloud/gui/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/cloud/settings/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/cloud/terminal/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/home/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/killswitches/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/layout.server.test.ts` | Updated load payload, one-query count, read fallback, scoped invalidation cases. |
| Modify | `src/routes/(app)/marketplace/agents/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/prompt/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/sessions/[sessionKey]/debug/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Create | `src/routes/(app)/settings/appearance/+page.server.ts` | Shared card projection/authority while preserving page access. |
| Modify | `src/routes/(app)/settings/appearance/+page.svelte` | Add shared org card while retaining personal preferences access. |
| Modify | `src/routes/(app)/settings/organizations/+page.svelte` | Hub-name suggestion, edited draft, bounded counter/preview and error. |
| Modify | `src/routes/(app)/team/PageBody.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/(app)/tools/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/+error.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/+layout.server.ts` | Optional verified non-app branding and app-subtree default; app:branding dependency. |
| Create | `src/routes/api/organizations/branding/+server.ts` | New exact PATCH guarded org prefix endpoint. |
| Create | `src/routes/api/organizations/branding/server.test.ts` | New endpoint admission/body/status tests. |
| Modify | `src/routes/api/organizations/provision/+server.ts` | Validate optional create hubName; preserve existing administrator admission. |
| Modify | `src/routes/api/organizations/provision/server.test.ts` | Create payload/invalid prefix/no-effect and gate coverage. |
| Modify | `src/routes/api/tenants/me/+server.ts` | Exact name/slug schema; shared owner admission; existing GET and success shape retained. |
| Create | `src/routes/api/tenants/me/server.test.ts` | Existing endpoint bypass/schema/conflict tests. |
| Modify | `src/routes/auth/reset/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/invite/accept/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/join/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/join/sent/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Create | `src/routes/layout.server.test.ts` | Root app/no-org/verified non-app identity and dependency tests. |
| Modify | `src/routes/link/[code]/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/login/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/login/forgot/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. |
| Modify | `src/routes/oauth/authorize/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. Also pass hubFullName to m.oauth_authorize_title; preserve existing parameters and suffix presence. |
| Modify | `src/routes/onboarding/+page.svelte` | Bind Hub identity text to verified projection; preserve technical identifiers in same file. Also pass hubName to m.onboarding_userTitle; preserve existing parameters and suffix presence. |
| Modify | `src/server/services/organization-bootstrap.service.ts` | Extend input/insert/return atomically; retry reads preserve stored prefix. |
| Modify | `src/server/services/organization-bootstrap.sql.integration.test.ts` | New-model prefix create/retry/concurrency and existing owner grants unchanged. |
| Create | `src/server/services/organization-branding.service.test.ts` | Authority/schema/status and no-ungated-writer checks. |
| Create | `src/server/services/organization-branding.service.ts` | One guarded transaction; separate prefix and legacy name/slug allowlists. |
| Create | `src/server/services/organization-branding.sql.integration.test.ts` | Actual migration/constraints/authenticated SQL/revocation and rollback cases. |
| Modify | `src/server/services/organization-provision.service.test.ts` | Legacy/flag-enabled initial create, retry, race and pre-effect rejection. |
| Modify | `src/server/services/organization-provision.service.ts` | Validate before effects; legacy create-only prefix plus bootstrap input forwarding. |
| Modify | `src/server/services/rbac.service.test.ts` | Exact/near-path/HTTP-method/manage-without-edit and existing GET mapping assertions. |
| Modify | `src/server/services/rbac.service.ts` | Exact PATCH mappings to settings:manage for both identity writers. |
| Modify | `src/server/services/tenant.service.ts` | Read hub_name; replace unguarded metadata writer with verified-locals guarded delegation. |
| Create | `supabase/migrations/20261122000000_organization_hub_name.sql` | Add nullable constrained hub_name without data backfill. Verify this new version is unused immediately before creating it; if collision, choose next unused UTC timestamp without changing migration content. |
| Modify | `src/lib/components/layout/WelcomePanel.svelte` | Pass hubFullName into m.welcome_heading after EN/ES message interpolation changes; update every caller of that key. |
| Modify | `src/lib/components/marketplace/AgentCreatorWizard.svelte` | Pass hubFullName into m.marketplace_wizardStep5SyncHeading after EN/ES message interpolation changes; update every caller of that key. |
| Modify | `src/routes/(app)/marketplace/plugins/+page.svelte` | Pass hubFullName into m.marketplace_pluginsSubtitle after EN/ES message interpolation changes; update every caller of that key. |

## Explicit no-change decisions

- `src/lib/routes/route-design-manifest.ts`: Appearance and organization settings already exist; no new page endpoint or nav item.
- `src/lib/routes/route-access-registry.ts`: preserve authenticated Appearance personal-preference access; card controls and both APIs have independent owner/manage guards.
- `vitest.qa-native-postgres.config.ts`: it consumes nativePostgresFiles from the manifest; register the new SQL file in that manifest, not a second include list.
- `src/lib/components/desktop-updater/Updater.svelte`, dedicated desktop_update_* messages, `desktop/main.ts`, `desktop/vite.config.ts`: standalone native updater retains installer identity. Hosted DesktopTitlebar is a web consumer and is modified.
- Existing action runtime and mutations adapters: reuse them unchanged; branding-specific capture/reconciliation lives in the new editor.
- Shared design-token package, package dependencies, native Rust/OS installer identifiers, external services and marketing site: no changes.

## Contract-specific proof

- Exact PATCH route/action rules are covered in rbac.service.test.ts; nearby paths and existing tenant GET remain unchanged.
- Route-design tests keep current page counts and existing Appearance archetype; a +server.ts API is outside that page-discovery inventory.
- The new mounted tests execute actual Svelte components using the current compiler/mount harness; browser-harness exercises actual QA routes for SSR, keyboard and geometry. A pure helper test cannot substitute for those mounted/browser checks.
- Native SQL tests are selected from the qa-native manifest and use its marked loopback disposable safeguards.
