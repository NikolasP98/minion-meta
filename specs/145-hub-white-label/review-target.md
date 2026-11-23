---
status: review
verdict: pending
owner_approval: pending
---

# Feature Specification: Organization names throughout Hub

**Feature**: `145-hub-white-label`
**Created**: 2026-11-21
**Status**: Owner approval pending; EGM evidence is recorded in egm/
**Input**: Make MINION branding configurable per organization. Default MINION; organization onboarding uses the organization name. Faces should see Faces Hub. Only the name changes; Hub remains fixed. Bound the name so it fits.

## User Scenarios & Testing

### User Story 1 — See my organization's name (Priority: P1)

Members of Faces see Faces Hub throughout the web application. The chosen name belongs to the organization and is shared across members and devices.

**Why this priority**: A workspace presented under the customer's name is the requested outcome.

**Independent Test**: Use two organizations in separate sessions and switch organizations in one session. Check the shell, page title, welcome view, marketplace, and a page outside the authenticated application that has a verified active organization.

**Acceptance Scenarios**:

1. **Given** an existing organization named Faces with no override, **when** a member opens the application, **then** product identity reads Faces Hub from the first server-rendered page onward.
2. **Given** Faces has an explicit display name Clínica Faces, **when** another member signs in, **then** that name replaces the MINION portion everywhere classified as Hub identity.
3. **Given** no verified organization, **when** a public login, join, recovery, or error page loads, **then** it uses MINION Hub without exposing an organization's name from a cookie or query parameter.
4. **Given** Faces is active, **when** the member switches to Orbit, **then** the settled view contains Orbit's name and no late Faces response can restore Faces branding.
5. **Given** an organization chooses the literal name MINION, **then** it can keep MINION Hub despite having a different organization name.

### User Story 2 — Set the name during organization creation (Priority: P1)

The organization creation form proposes the organization name as the Hub name and previews the fixed Hub suffix. A long legal organization name does not force a long wordmark.

**Independent Test**: Create Faces, create an organization with an 80-character name and a short Hub name, and retry each creation after a simulated later provisioning failure.

**Acceptance Scenarios**:

1. **Given** the operator enters Faces, **when** the creation form is filled, **then** Hub name is prefilled as Faces and the preview reads Faces Hub.
2. **Given** the organization name exceeds the display-name limit, **then** creation requires a valid shorter Hub name; it never silently truncates or shortens the organization's full name.
3. **Given** the operator has edited the Hub name, **when** the organization name changes, **then** the edited Hub name is preserved.
4. **Given** organization creation already succeeded but a later step failed, **when** provisioning is retried, **then** the organization's chosen Hub name is preserved.
5. **Given** the organization is named Faces Hub, **then** its initial suggestion is Faces and the preview is Faces Hub, with the original organization name preserved.

### User Story 3 — Owner changes the shared name (Priority: P2)

An organization owner edits Hub name in Settings → Appearance, sees a live preview and character counter, and explicitly saves a change shared by the organization. A member without authority can view the resulting identity but cannot change it.

**Independent Test**: Change the name as owner, reload as another member, attempt the same change as staff, and simulate a failed save.

**Acceptance Scenarios**:

1. **Given** a valid name, **when** the owner saves, **then** the name persists and refreshes the owner's shell and page title; other sessions receive it on their next full reload or organization selection.
2. **Given** an invalid or too-long name, **then** the form explains the 15-character rule, preserves the draft, and does not save it. A direct request is rejected too.
3. **Given** a failed save, **then** the last saved name remains in the shell, the draft remains available, and Retry is available without claiming success.
4. **Given** a staff member or an owner of a different organization, **then** changing the active organization's Hub name or its automatic source organization name is denied and both stored values remain unchanged.
5. **Given** a custom name, **when** the owner chooses Use organization name, **then** the preview shows the automatic name or MINION when the organization name cannot fit. Choosing Use MINION stores that explicit choice.

### Edge Cases

- Blank input, only spaces, 1/15/16 visible characters, combining accents, emoji sequences, wide letters, long unbroken words, HTML-looking input, and pasted line breaks. A name within 15 graphemes but over 256 UTF-8 bytes is rejected with a clear simplify-the-name message before saving and on direct requests.
- An organization name ending in the standalone word Hub; names such as HubSpot retain their letters.
- An old organization with a long name and no display-name override; its owner can choose a short name, and other members see the MINION fallback meanwhile.
- Initial server render, JavaScript disabled, direct deep links, missing organization, unavailable branding read, logout, browser back, fast organization switching, stale saves, and permission revocation.
- Narrow sidebar, visible mobile wordmark, collapsed navigation, 320px mobile viewport, 200% text zoom, Spanish, light and dark themes.

## Requirements

### Functional Requirements

- **FR-001**: Hub identity MUST resolve from the verified active organization, with this order: valid explicit Hub name; valid automatic organization-name suggestion; MINION. The full identity appends the fixed word Hub. Existing short-name organizations, including Faces, inherit their name without a production data backfill.
- **FR-002**: Hub name MUST be separate from the organization's full name, slug, identifiers, customer records, and agent names. Editing it changes only product identity. Preserve user-entered capitalization; remove the current forced uppercase presentation for customized names.
- **FR-003**: A custom Hub name MUST contain 1–15 visible characters after Unicode normalization and trimming/collapsing spaces. Count combined characters and emoji sequences as one visible character. A name MUST also fit within 256 UTF-8 bytes after normalization. Reject control characters, line breaks, bidi controls and standalone invisible format characters; allow joiners and variation selectors only inside valid emoji graphemes. Reject names ending in the standalone word Hub. Explain that Hub is added automatically. Never render input as HTML or CSS.
- **FR-004**: Automatic suggestions remove a final standalone Hub, normalize spaces, and preserve capitalization. A suggestion longer than 15 visible characters is invalid: creation requires a short name; existing organizations use MINION until an owner sets one. No silent truncation.
- **FR-005**: Organization creation MUST prefill and preview the suggestion, allow editing, preserve edited input, validate before provisioning starts, and persist the chosen override with organization creation. A retry MUST NOT reset an existing brand name.
- **FR-006**: Existing organization owners MUST have an organization-scoped editor in Settings → Appearance. The shared change uses an explicit Save button, busy feedback, visible failure/Retry, character counter, preview, Use organization name, and Use MINION. Personal theme/logo preferences retain their existing ownership.
- **FR-007**: Only a fresh authenticated owner membership in the active organization, or a platform administrator operating in that verified organization, may write branding. Enforce existing settings management permission as well. Ordinary members can read their organization's identity regardless of access to Settings. Protect changes to the full organization name that feeds automatic branding with the same owner boundary; ordinary members cannot bypass it through an existing organization-name editor or request. Reject client-selected organization IDs. Existing provisioning remains platform-admin-only.
- **FR-008**: Resolve branding for the first server-rendered response and subsequent navigation. Switching organizations and logout MUST retire previous branding and pending editor work. Late reads/saves MUST NOT modify another organization's visible name. Branding MUST NOT use process-global mutable state or an unscoped browser preference.
- **FR-009**: Replace every occurrence classified as Hub identity in the coverage inventory: wordmarks, accessible names, page titles, welcome/onboarding/public-shell copy where a verified org is available, marketplace labels and decorative watermarks, and localized Hub product references. The suffix retains its existing display casing, such as hub in the shell and Hub in titles.
- **FR-010**: Technical references MUST remain literal: package names, paths, configuration/environment keys, product names for distinct services such as Minion Drone/Workforce, support addresses, protocol identifiers, historical release content, author/user content, and theme/logo preset names. Inventory these exclusions explicitly. This feature configures text identity; it does not redesign logos, favicons, theme colors, app installer identity, external messages, or the marketing site.
- **FR-011**: Public pages with no verified active organization MUST use MINION. An authenticated non-app page may use the verified organization's identity. A token, invite code, host name, cookie, or query string alone MUST NOT authorize a branding lookup. Branding-read failure may use MINION for that request without overwriting saved values or blocking unrelated work; save failures remain visible.
- **FR-012**: Character limits MUST be enforced in the form and server. At every visible wordmark width, accepted names MUST remain fully readable without ellipsis, clipping, overlap, or horizontal document overflow. Use layout space or wrapping; the character cap is not a pixel-width guarantee. Existing collapsed/icon-only modes may remain; provide the full identity as the link's accessible name.
- **FR-013**: New or changed product copy MUST be localized in English and Spanish. New controls MUST be keyboard operable, labelled, expose errors and save state, and use the existing design tokens and UI components. Any new endpoint MUST be entered in applicable access/route contracts and tested at the server boundary.

### Key Entities

- **Organization**: Verified tenant with its existing full name and optional Hub-name override.
- **Hub name**: Short prefix owned by the organization. No override means follow the valid organization suggestion; an explicit MINION means retain the product default.
- **Resolved identity**: Prefix, full name with Hub, owning organization, and whether the name is custom, automatic, or the default. It belongs to one request/session organization.
- **Branding inventory**: Every current product-identity occurrence to convert, with technical or historical exclusions distinguished.

## Success Criteria

- **SC-001**: Every inventory item marked Hub identity displays the resolved prefix in server-rendered and hydrated views; all explicit exclusions remain unchanged.
- **SC-002**: Faces creation and existing Faces membership both produce Faces Hub; the default public experience remains MINION Hub.
- **SC-003**: All valid 15-character test names remain readable wherever the wordmark is visible, including narrow layouts and 200% text zoom. The 16-character case is rejected before saving and on direct requests.
- **SC-004**: Tests demonstrate organization A cannot change organization B's identity, ordinary staff cannot save, revoked owners cannot save, and delayed work from A cannot change B's view.
- **SC-005**: Reloading another member's session shows the saved name; failed saves never claim success or change the committed identity.

## Alternatives considered

The [decisions and alternatives in research.md](research.md#decisions-and-alternatives) form the design rationale: a separate organization override preserves long business names; user preferences have the wrong shared ownership; a new settings framework is unnecessary; silent shortening is rejected; the existing administrator creation and Appearance flows are reused. A shared guarded writer protects both the dedicated Hub-name endpoint and existing full-organization-name edits that feed automatic branding.

## Assumptions

- This request authorizes Speckit artifacts and EGM review. The data/security-tagged implementation remains subject to the repository's owner approval and human merge gates.
- Fifteen visible characters is the proposed product limit. Visual qualification is mandatory; do not claim it prevents clipping without measuring the layouts.
- Existing organizations with a valid short name inherit it. No production rename/backfill is part of this run.
- Organization creation currently lives in an administrator settings flow; personal-agent onboarding is a different flow and does not create organizations.
- Changes propagate to other sessions on their next full reload or organization selection; cross-session push is outside this feature.
- research.md records both the initial dirty local checkout and the later clean origin/master source snapshot. Neither is deployed runtime proof. Implementation must recheck its isolated base against the pinned source evidence before editing.

## Detailed Implementation Plan

# Implementation Plan: Organization names throughout Hub

**Feature**: 145-hub-white-label · **Date**: 2026-11-21 · **Spec**: [spec.md](spec.md)
**Target**: minion_hub · **PR base**: master (verified with repo-policy)
**State**: Planned, no application code changed; owner approval required before implementation.

## Summary

Store one optional text override on the existing Supabase organization. Derive the default from its full name, retain Hub as a fixed suffix, and supply the resolved identity as request-owned SvelteKit layout data. Reuse Appearance for the owner editor and the existing administrator organization creation flow for the initial suggestion. Convert all product-identity occurrences using an explicit inventory.

## Technical Context

- TypeScript strict; SvelteKit 2 and Svelte 5 runes; Bun; existing Paraglide localization.
- Supabase PostgreSQL organizations is authoritative. Legacy Turso organization metadata, gateway settings, and profile-scoped logo preferences are not suitable shared branding storage.
- Tests: Vitest logic/route tests, the local Supabase QA stack for migration/authenticated SQL, actual Svelte renders through browser-harness for layout and interaction.
- Scope: Hub web UI. No gateway/shared protocol changes, new dependencies, logo upload, custom domains, emails, native installer rename, or marketing-site changes.
- No post-mount branding request. Authenticated app routes use one branding tenant projection per app-layout refresh, replacing the rare kind-only fallback with the combined projection. Non-app root layouts use one verified-tenant lookup only when an organization is available.

## Constitution Check

| Principle | Before design | After design |
|---|---|---|
| I — spec before code | Spec, plan, tasks precede implementation | No application edits authorized by this package alone |
| II — observed current state | research.md and source-evidence.json | Pinned origin/master source plus initial dirty-tree evidence; deployed behavior unverified |
| III — isolated slices | Registry confirms master | Private branch/isolated checkout required at implementation; preserve shared WIP |
| IV — UI, RBAC, localization, route contracts | Included in slices and verification | No new page; new API endpoint gets access and route-contract coverage |
| V — security/data owner gates | Applies to persistence and tenant permissions | Owner spec approval pending; human merge required |

## Project Structure

Feature artifacts: spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/branding.md, quickstart.md, checklists/requirements.md, coverage.md, source-evidence.json, egm/.

Proposed application files (paths relative to minion_hub):

| Area | Files |
|---|---|
| Shared normalization/resolution | new `src/lib/branding.ts`, `src/lib/branding.test.ts` |
| Request-derived client access | new `src/lib/branding.svelte.ts` using `$app/state.page.data`; no module mutable state |
| Shared wordmark | new `src/lib/components/layout/HubWordmark.svelte` |
| Persistence/read | `supabase/migrations/20261122000000_organization_hub_name.sql`, `src/server/services/tenant.service.ts`, new `src/server/services/organization-branding.service.ts` and `.test.ts` |
| Shared setting endpoint | new `src/routes/api/organizations/branding/+server.ts` and `server.test.ts`; guarded existing `src/routes/api/tenants/me/+server.ts` plus route tests |
| Owner editor | `src/routes/(app)/settings/appearance/+page.svelte`, new adjacent `+page.server.ts`, new `src/lib/components/settings/OrganizationBranding.svelte` |
| Creation | `src/routes/(app)/settings/organizations/+page.svelte`, `src/routes/api/organizations/provision/+server.ts`, `src/server/services/organization-provision.service.ts`, `src/server/services/organization-bootstrap.service.ts`, existing tests |
| Layout delivery | `src/routes/+layout.server.ts`, `src/routes/(app)/+layout.server.ts`, corresponding load contract tests |
| Consumers | All entries classified Hub identity in coverage.md, EN/ES messages |
| QA/contracts | `scripts/qa/seed/tenancy.ts`, `scripts/qa/seed/matrix.ts`, explicit contract/test actions in implementation-files.md |

## Implementation steps

### 1. Establish the implementation base

The shared Hub checkout has extensive unrelated modifications/deletions. Do not restore, stash, switch, or commit them. Before code, use pinned clean origin/master `3d39cbb6` as the reviewed source baseline, then compare coverage.md and source-evidence.json with the actual isolated implementation base. Reconcile moved/deleted paths and update the inventory and plan. Investigate differences that change behavior before implementation. The initial local inspection was superseded by a clean source checkout of origin/master; the preserved local evidence is historical. Follow the pinned Hub AGENTS.md (included by CLAUDE.md), including its a11y gate. Do not treat source inspection as release proof.

### 2. Normalization and presentation contract

`src/lib/branding.ts` exports pure normalization, suggestion, validation, and resolution functions. Apply the exact algorithm in [contracts/name-validation.md](contracts/name-validation.md), with positive/negative vectors in contracts/name-fixtures.json. Normalize NFC; map Unicode space separators (category Zs) to ASCII space, collapse/trim ASCII spaces, reject all Cc/Cf characters except an allowed emoji ZWJ. Count graphemes with Intl.Segmenter and enforce 1–15 plus 256 normalized UTF-8 bytes. Explicit regex grammar in that contract recognizes allowed emoji joiner/variation sequences; Segmenter alone is not an emoji validator. Server and browser must support Intl.Segmenter and the required Unicode property escapes; if unavailable, disable editing with a localized unavailable message and reject mutation as 503 rather than using a code-unit fallback. Read resolution uses MINION if validation capability is unavailable; it never persists a fallback. The runtime parity tests use the same deterministic vectors. A DB check enforces the byte envelope and nonempty/nonblank input; the application validator enforces the full rule.

A final ASCII-space-delimited case-insensitive Hub token (or the entire name Hub) is removed for automatic suggestions only. Custom input ending in Hub is rejected with localized help. No forced uppercase. Resolver accepts a tenant record and returns `{ orgId, name, fullName, source, readStatus }`, with `fullName = name + ' Hub'` and source `custom|organization|default` and readStatus `ready|unavailable`. A successful known default/automatic/custom resolution is ready; failed required tenant read or unavailable server validator is unavailable. Null/malformed/too-long stored input resolves through the documented fallback; do not render unvalidated data.

A valid automatic name is the normalized suggestion within both bounds. No valid suggestion means MINION. An explicit `MINION` is stored as a real override; null means follow the org name. A future change to the full org name affects automatic mode only. The editor previews both its draft and the fixed suffix; the shell consumes only committed layout data.

### 3. Additive data change and safe writer

Add nullable `organizations.hub_name text default null`, no backfill. Add a named CHECK for null or a trimmed, nonempty value within 256 bytes. The migration is compatible with old readers/writers. Seed valid custom, null/short, null/long, and boundary fixtures. Register migration and seed pairing through existing tooling.

Extend getTenant's projection only. Keep hub_name out of the generic tenant-patch allowlist. Protect its existing full-name/slug mutation with the SAME owner admission transaction: automatic branding depends on that full name, so leaving this writer unguarded would bypass the feature boundary.

The new organization-branding service exposes separate whitelisted entry points: the branding endpoint accepts only hubName; existing tenant PATCH accepts its existing name/slug fields, never hubName/hub_name.

Both invoke one private guarded transaction. Change updateTenant to receive verified locals rather than an unauthenticated TenantContext and delegate its update into that transaction; source search confirms the tenant PATCH is its only current caller. Do not leave a second privileged full-name writer. Each endpoint whitelists its own fields and binds SQL parameters.

The shared service obtains orgId/profileId from verified locals and calls `requireOrgCapability(locals, 'settings', 'manage')` for the normal route gate. This cached gate alone is insufficient.

Reuse the existing privileged organization-administration transaction pattern in `organization-role-admin.service.ts`: `getPgClient().begin`, then actor-account advisory lock namespace 114 followed by organization authority lock namespace 112, matching `organization-bootstrap.service.ts` lock order. Within that same transaction call exported `readOrganizationAdminState(tx, orgId)` and `memberAuthority(state, profileId)`. Require an active organization and a present non-deleting profile/member; allow either a freshly read platform admin or `organization_members.role === 'owner'` with fresh settings:manage.

Do not require a literal member_roles role key owner: new-model organizations use custom-administrator. Preserve both legacy and organization role-model composition via the existing helpers.

During any role-simulation session the shared branding editor is read-only and the endpoint returns 403; use existing effective-authority context to enforce this, never a client flag.

The exact existing tenant PATCH schema, full-name/slug rules and 23505→409 conflict mapping are in contracts/branding.md.

After admission, the branding entry updates only organizations.hub_name; the existing tenant entry updates only its existing name/slug fields for that exact org in the SAME transaction with RETURNING id/name/hub_name. Use parameterized SQL. Zero returned rows is 404. Keep row/advisory locks until commit so profile/owner/rule revocation cannot pass an obsolete precheck. The existing readOrganizationAdminState SELECTs lock profile, membership, role and rule rows; organization status is checked/locked explicitly. No external HTTP/Supabase client call occurs inside the transaction. Native tests must run a concurrent revocation before admission and while a write is held, proving the admitted order rather than allowing unchecked races.

Missing authentication/context/profile is 401; lack of member/owner/capability or role simulation is 403; missing org is 404; malformed body/name is 400. All editor authority reads use the same admission predicates in a repeatable-read transaction; they do not authorize later writes. Do not trust locals.user.role for the final platform-admin bypass.

The current baseline SQL permits organization writes through a platform-admin RLS policy and member SELECT only. Keep that boundary: authenticated non-admin members, including owners, cannot directly mutate `hub_name`; they use the guarded endpoint. Verify this under actual authenticated PostgreSQL roles after all migrations, not just from the baseline snapshot. Service-role access remains server-only. If the reconciled base gives ordinary members UPDATE, protect the new column before enabling the endpoint; do not widen policies as a convenience.

### 4. Read path and organization switching

The current `(app)/+layout.server.ts:233–250` usually reuses locals.orgKind and only calls getTenant for a rare mismatch. Add ONE active-org identity read per app-layout refresh, combining name/hub_name/kind; replace that kind-only fallback with this combined projection so the fallback never triggers a second query. This intentionally adds one DB read on the ordinary layout refresh, not every page navigation. Root layout emits default branding for the `(app)` subtree to avoid a duplicate identity lookup, and the child data overrides it before the first app render. On other routes root load uses existing verified locals.tenantCtx only for authenticated org members. Never look up from a raw cookie, host or URL. On branding-read failure, use MINION for the current org and readStatus:unavailable plus canEditBranding:false with bounded diagnostics, without changing persisted state or concealing auth errors. Keep the already-verified locals.orgKind if the branding-only lookup fails.

Use request/page-owned derived access in components, including root error handling and PublicTaskShell; no server-side writable singleton and no localStorage identity. Error components use the latest safe layout data when available and default otherwise. Add a dependency `app:branding`; successful save invalidates that dependency and refreshes committed data. Organization selection/logout already invalidate app data: add tests proving this path updates branding, retires pending editor state and cannot apply late results. Pending editor work captures orgId and an incrementing generation; check both before handling any awaited response or focus effect. Clear the editor's draft/error/save state on org change. Failed reads default for the current organization rather than keeping another org's name.

### 5. Creation and owner editing

Add optional `hubName` to the administrator provision request, with the same validator. A missing field follows the valid organization suggestion; if that suggestion is invalid, require an explicit short value before any external provisioning starts. On first insert, persist the chosen override with the organization row in BOTH paths: legacy ensureOrganization and feature-gated `bootstrapOrganization` (`ORG_ROLE_TEMPLATES_ENABLED`). Extend the bootstrap input/result/select/insert and SQL integration tests; keep its existing atomic organization/membership/role creation transaction. Existing-row and concurrent-unique-slug recovery paths must return the existing stored name and never overwrite it with retry input. Branding validation failure must precede membership/gateway/workforce effects. Public personal-agent onboarding consumes identity but does not write organization branding.

The creation form has a dirty flag so later edits to the org name update only an untouched suggestion. Explain the suffix and show a counter/preview. Keep the existing full-name 2–80-character validation unchanged.

Add the shared OrganizationBranding editor to Appearance. Keep Appearance's current authenticated personal-preference access; do not add a page-wide settings:manage or owner restriction. The new organization card alone requires settings:view plus fresh canEditBranding for its controls. Its server load provides fresh `canEditBranding`; render editor controls only for eligible users.

Both write endpoints repeat all checks independently. Add exact-path PATCH rules for /api/organizations/branding and /api/tenants/me in rbac.service.apiWriteCapability returning settings:manage, before prefix matching. Do not widen the organization-provision prefix or change the existing tenant GET visibility. Test settings:manage without settings:edit so central dispatch matches the chosen action.

Use existing Input, FormField, Button and error notice. Use the established settings Notifications pattern (`src/routes/(app)/settings/notifications/+page.svelte:231–256`): `tryUseActions`, `runTrackedCommand`, `runCheckedMutation` and `requireOk` from the existing action modules.

Stable action id settings.organization-branding.save; attempt ids use .write and .refresh. Mutate with fetch plus the combined command/editor AbortSignal, call requireOk so known HTTP rejections become MutationRejected, validate the committed response projection, and use guarded onCommitted/refresh callbacks. The adapters own acknowledgement and committed-refreshing/unknown outcomes; do not duplicate that lifecycle. Keep captured org/profile/editor generation and runtime scopeVersion checks before applying a reply, starting invalidation or accepting a refreshed page. A confirmed commit plus invalidation failure offers refresh retry only.

Capture `context?.actionId` together with org/profile/editor generation and actions.scopeVersion, following `src/routes/(app)/scheduling/settings/PageBody.svelte:73–111`. For committed-refreshing, a refresh-only retry uses checkedRefresh, validates that refreshed branding.orgId and current page scope still match AND branding.readStatus is ready (a MINION read-failure fallback cannot qualify a successful refresh), then reconciles that original acknowledged action with actions.reconcile(originalActionId, succeeded). Never issue PATCH again to repair a refresh.

For unknown transport/abort outcome, block blind resubmission and perform a checked current-org reload; retain the original unknown action history because matching current text does not prove that operation committed. The current projection enables a deliberate new edit/Save, labelled as such, without declaring the uncertain operation successful or failed. Add mounted tests asserting recovery clears the acknowledged runtime attention record and preserves a genuinely unknown record, not just the editor notice. Scope change retires the result entirely. Definite rejection preserves the draft and prior committed identity.

Use MINION sets the literal override. Use organization name submits null and previews the fallback when the org name is too long. Name the control Hub name / Nombre del Hub and explain that everyone in the organization sees it.

### 6. Convert complete text inventory

Use HubWordmark for Sidebar, Topbar, MinionLogo text and PublicTaskShell wordmarks. Supply a resolved prefix to other badges and localized interpolations. Replace CSS literal watermarks using safe text or an escaped text attribute consumed with CSS `attr()`; never interpolate into stylesheet source. Use fullName for product link accessible names. In title/copy text that already includes Hub, use fullName; where the old copy contains only Minion, use name and preserve the absence of a suffix. This changes only the requested name portion. For welcome_heading, marketplace_wizardStep5SyncHeading and marketplace_pluginsSubtitle, pass `{hubFullName: branding.fullName}` at every call site. For oauth_authorize_title, keep `{app: data.appName}` and add hubFullName. For onboarding_userTitle, pass `{hubName: branding.name}`; it previously had no Hub suffix and must not gain one. All five message consumers are enumerated in coverage.md/implementation-files.md; changing the message JSON alone breaks generated Paraglide signatures. Run i18n:compile before the consumer typecheck. Page titles retain their section labels and replace only the product name portion. Do not replace technical tokens via global search/replace.

Read coverage.md completely before this step. The standalone `src/lib/components/desktop-updater/Updater.svelte` and dedicated desktop_update_* messages retain native installer identity because they are built without a verified tenant/layout. The hosted `src/lib/components/layout/DesktopTitlebar.svelte` remains in scope. The initial raw inventory in coverage.md is a discovery aid, not a clean allowlist: classify every candidate as identity, technical, distinct-service name, historical/user content, or preset. All identity rows and localized message callers must have a destination and test; all exclusions have a reason. Repeat inventory after conversion, including localized strings and CSS `content`, and fail completion for an unexplained product-identity literal. No fixture may count merely hiding the wordmark as a fit correction; existing icon-only modes are measured separately.

### 7. Fit and accessibility proof

Retain the existing icon-only mobile mode at widths ≤400px and collapsed-sidebar mode, with the full accessible identity. Wherever the wordmark is visible, keep the entire name and Hub readable. In the sidebar, allow the version to move to a second line and allow the name to wrap; in the mobile header at visible-wordmark widths (401–767px), give the wordmark a separate wrapping row, keep the controls on their own row, and replace the fixed h-14 height with auto height plus the existing page-header-height minimum token. Preserve ≤400px icon-only layout. Recheck scroll/sticky offsets against the resulting header height. Keep all actions reachable at their existing touch target size. Do not shrink text below the existing body-small token or add ellipsis. Use semantic spacing/type/width tokens and `min-width: 0` on flex/grid children.

Render actual components with MINION, Faces, WWWWWWWWWWWWWWW, 15 CJK characters, accented text, a maximum-bound emoji name, a 15-character unbroken name, and Spanish copy. At 320/390px the wordmark may follow the existing icon-only policy; test visible mobile text at 401/430/768px plus a narrow expanded sidebar, desktop, and 200% zoom. Measure bounding boxes and text scroll extents; assert no clipping, overlap, document overflow, or missing Hub. Verify keyboard controls, accessible labels, errors, focus and busy state, in light/dark. The limit remains 15 only if this passes; fix layout rather than silently lowering validation or hiding more wordmarks.

### 8. Slices, gates and release

1. **Data and resolver**: additive migration, native SQL permission/constraint tests, seeds, shared validator, safe writer and endpoint. Human spec approval first.
2. **Request delivery, shared shell wordmark, creation and owner editor**: implement T008/T009 app:branding/SSR delivery and contract tests before editor refresh; then prefill/persist/retry paths, form feedback, access gates, EN/ES strings and compile. Exercise real QA sessions.
3. **Remaining identity consumers and qualification**: titles/copy/badges/watermarks beyond the shared shell, owner-switch races and full inventory closure. Product feature is complete only after all three slices.

Each slice gets an isolated feature branch and draft PR against master, self-test, independent Standards and Spec review, required CI and human merge. Order deploys so migration precedes readers. Post-merge verify build/deployment separately from source checks, then check the authenticated runtime with approved access. No production data changes are needed to activate existing short names. Rollback application first; leaving the additive nullable column preserves custom names for a later retry. Never drop the column during emergency application rollback.

## File actions and access contracts

[implementation-files.md](implementation-files.md) enumerates Create/Modify actions for every source path and identity consumer. No Delete actions. Modify rbac.service.ts/rbac.service.test.ts for exact PATCH settings:manage rules and negatives. Modify route-access-authority.test.ts to prove Appearance remains authenticated and personal preferences accessible. Modify route-design-contracts.test.ts to assert the existing Appearance form-settings contract and unchanged route count. Do not modify route-access-registry.ts or route-design-manifest.ts: no new page/nav is introduced and /settings/appearance is already registered. The new API is tested at handler and apiWriteCapability boundaries; the page-design manifest discovers page endpoints, not +server.ts APIs.

## Verification

See [quickstart.md](quickstart.md) for commands and [tasks.md](tasks.md) for required evidence. Focused tests must cover unauthorized mutation, cross-org requests, Unicode bounds, retries, server render and stale results. Run i18n compile, typecheck, all tests, production build, design/token lints, route/access checks, `bun run a11y` and the QA-backed page sweep `bun run a11y --all` on the isolated implementation. Builds must use the disposable QA environment because Hub build tooling can run migrations. Do not build with production credentials. Browser evidence uses actual components and a local seeded stack; screenshots of a proposal do not qualify runtime behavior.
