# Branding contracts

## New PATCH /api/organizations/branding

Body: exactly `{ "hubName": string | null }`; reject missing fields, unknown fields, non-JSON, arrays, non-string/non-null values, and bodies above 2 KiB with 400. No org id accepted. Treat name as text, never markup.

Authority: authenticated verified active organization; fresh owner membership (organization_members.role, independent of assigned role key), or platform admin in that verified organization; settings:manage gate in rbac.service. Require a fresh non-deleting canonical profile and active-organization membership for every writer, including platform admins; no missing-profile exception. Do not allow the AUTH_DISABLED fabricated user to grant production authority. Read target from `locals.tenantCtx.tenantId`, not body/query/header. If active org is unresolved, do not fall back to the first database organization.

Success: 200 `{ "branding": Branding, "hubName": string | null }`, using the committed row with branding.readStatus:ready. Validate the full response projection, its owning org and field bounds before treating it as a committed current-scope result. Never echo a draft as committed. Response `Cache-Control: private, no-store`; follow existing same-origin CSRF protections for session mutations. 401 unauthenticated/unresolved authenticated tenant context; 403 denied; 404 missing organization; 400 malformed/invalid; 500 unavailable write (localized safe client message, bounded server diagnostic). No silent success if update returns no row.

Request organization is captured at admission. The client accepts the reply only while that org and editor generation still match; switching org invalidates that generation and must not let a delayed completion invalidate or update the new org's draft. Any role-simulation session is read-only for branding and saves return 403. Server admission uses the locked organization-administration transaction in plan.md; its authority read and update commit together. A confirmed save invalidates app:branding for the same org and displays committed projection. A confirmed-refresh retry requires readStatus:ready and matching scope before reconciling the captured original runtime actionId; an unavailable fallback remains refresh pending. Unknown writes retain unknown history even if current text matches. Failed writes preserve draft and last committed wordmark. Cross-session propagation is next full reload or organization selection, not push.

## Existing PATCH /api/tenants/me

Automatic branding derives from organization.name, so this path is part of the protected identity boundary. Accept exactly an object with at least one of name or slug; every present value must be a string. Reject null, arrays, empty object, unknown keys (including hubName/hub_name, logo, metadata), and body above 2 KiB with 400. name uses existing provisioning normalization: trim/collapse whitespace, 2–80 UTF-16 code units, without truncation; this preserves the existing full-name counting contract. slug must match `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$` (1–63 ASCII characters), with no trim/case conversion. Reject empty/blank/null name or slug. Unspecified fields remain unchanged.

Require the SAME verified active-org, fresh owner/admin, settings:manage, no-simulation and locked transaction admission as the new branding endpoint. Change updateTenant's caller contract to verified locals and share the guarded organization-branding service. Staff/foreign/revoked-owner attempts cannot change name or automatic branding. A valid owner full-name edit changes automatic branding; a custom override stays unchanged. Return existing 200 `{ok:true}` after committed update; 401/403/404 as above, malformed fields 400, unique-slug PostgreSQL 23505 as 409 with no row changes, other DB failures 500. Test 80/81-code-unit name, 63/64-char slug, case/punctuation, null/missing/unknown fields and duplicate slug transaction rollback. These input checks are part of closing the existing automatic-brand source-name writer.

Register exact PATCH paths /api/organizations/branding and /api/tenants/me in apiWriteCapability as settings:manage. Retain member read access on GET /api/tenants/me and existing admin-only provisioning.

## Existing POST /api/organizations/provision

Keep platform-admin gate and existing request fields. Add optional `hubName: string`. Missing means normalize/suggest from org name; if invalid, return 400 before any side effects. Null is not accepted in this create contract. Validate the raw value before provisioning. Preserve full-name rules and use chosen prefix only on a newly inserted organization, in both legacy ensureOrganization and ORG_ROLE_TEMPLATES_ENABLED bootstrapOrganization paths. Extend bootstrap input/result/select/insert atomically; never run a follow-up unconditional brand update. On retry/existing-slug adoption/concurrent insert recovery, preserve the row's existing hub_name. Tests verify no later provisioning effect occurs for invalid branding and no existing brand is reset.

## Layout and UI

App layout adds one combined name/hub_name/kind tenant read per layout refresh and removes its rare kind-only fallback query; this is intentionally one extra ordinary layout read, never a navigation-wide load. Root returns default for the app subtree and optional verified branding for other routes. The `$app/state` reader always follows current page.data. No singleton identity state. Public no-org pages stay MINION. Error fallback never resolves an org from untrusted input.

Use fullName for accessible product labels. Preserve existing suffix presence in headings/copy: use hubFullName where Hub already exists and hubName where only Minion appears; retain shell suffix hub in its separate span. Localized messages interpolate `{hubName}` or `{hubFullName}`. User-authored strings, distinct service names, package/config/path identifiers and historical content do not pass through substitution.

## Surface/access registration

Reconcile `src/lib/routes/route-design-manifest.ts`, existing hooks/route policy and API access tests on the implementation base. Appearance remains the existing settings route; expose shared editor only under settings view and canEditBranding. The endpoint independently enforces manage+owner. Add tests for hidden editor, direct denied request, unknown route contract expectations and existing load payloads. Do not make shell identity depend on permission to visit Settings.
