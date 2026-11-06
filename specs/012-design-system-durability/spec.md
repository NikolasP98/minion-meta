# Feature Specification: Durable Minion design system

**Feature Branch**: `feat/design-system-durability`  
**Created**: 2026-10-16  
**Status**: Approved after two-pass review; implementing  
**Input**: Owner: “Implement and then fully deploy your recommended items. After that, we'll re-evaluate.”

## 0. Product

Deliver the eight initiatives in the design-system audit as working behavior, executable composition recipes and enforceable consumer contracts. Preserve Minion's semantic tokens, Svelte 5 primitives, route archetypes and business semantics. The approved scope includes deployment of these changes, including the proposed preference scoping and stale-write protections. This is separate from the paused October readiness program.

## AS-IS

Fresh fetched bases: meta `17bce12fcba0c72c42691c8c05d613124f3d88fb` (origin/dev), Hub `7d917ed066826eb34bbb84c5fa8ca55b78aafc13` (origin/master), Site `82887a9d9c8a1473785a275831f60256e0f4365a` (origin/dev). Work takes place in fresh isolated clones to preserve original dirty repositories. Fresh-source revalidation evidence is copied into this feature's evidence directory before review; original `.lavish/design-system-audit-2026-10-16/evidence/` contains source excerpts and measurements, not deployment certification. Revalidation notes take precedence over old source observations.

- `packages/design-tokens/tests/contract.test.mjs` checks text contrast against canvas. The audit measured 19 of 270 text/surface pairs below 4.5, across 18 themes, three text roles and five surfaces.
- Hub `src/app.css` redeclares shared type roles. Shared primitives have opt-in coarse-target coverage; decorative selectors can escape component boundaries.
- Hub `src/lib/components/dashboard/EditableGrid.svelte` and its layout helper trust persisted shapes, allow duplicates and lack keyboard-equivalent arrangement. Card-field and calendar preference consumers also need validated, scoped state.
- Hub DataView is intentionally a headless view selector; existing PageShell, PageHeader, PageBody and SectionShell already own page composition. Picker couples row activation to DataTable DOM details. Table keyboard support exceeds its announced semantics.
- Autosave feedback exposes fewer states than the mutation runtime. Some stock/event-type writes lack optimistic version admission. FormField replaces guidance with error content, and native destructive confirms remain in selected routes.
- Fresh Hub and Site already consume identical readiness token/UI archives; source/installed/rendered qualification still differs. Site already has token validation and CI gates; its remaining enforcement gap is per-file design debt. Existing route inventories and historical shipped labels are not runtime receipts.

## TO-BE and invariants

A consumer is qualified against identified package bytes and current source. Supported text/surface pairs meet 4.5:1 for ordinary text. Typography has one owner, component decoration uses stable hooks, and touch targets follow the existing 44px coarse-pointer policy. Layout preferences are versioned, sanitized, identity-scoped and visibly recoverable. Personal customization cannot override org policy or permissions. Visual order follows DOM order.

Every pointer arrangement operation has a keyboard path with stable focus and announcement. Read-only tables expose table semantics; spreadsheet behavior exposes grid semantics when enabled. Views reject an empty catalog; selection and activation are distinct capabilities. Existing shells are preferred over a new abstraction.

Saving, saved, conflict, unknown, committed-but-refresh-failed, local-only and error states remain distinct. A lost response never automatically replays a write. A committed write with failed refresh retries only the read. Identity/revision changes fence late responses and queued work. Dialog custom controls explicitly contribute dirty state. Forms retain guidance alongside errors and offer focusable error summaries.

## User Scenarios & Testing

### User Story 1 - Read and operate across themes and devices (Priority: P1)
Given any supported theme, when a user reads normal text on a documented surface, contrast meets 4.5:1. Given coarse input, shared controls meet the existing target policy. When switching themes or density, typography remains defined by the shared role contract. Independent test: token matrix plus installed-component computed-style fixture across themes, density and input modes.

### User Story 2 - Customize safely with keyboard or pointer (Priority: P1)
Given malformed, duplicated, obsolete or future-version stored preferences, loading cannot crash or create duplicate/invalid items. A valid known subset survives where safe; incompatible versions fall back predictably. Given two users and two organizations, switching scope cannot reuse another scope's local state or apply an old response. Given edit mode, keyboard users can reorder, resize, hide/show and reset with announced results and retained focus. Failed server saves retain an explicit local-only/error outcome and a bounded recovery action.

### User Story 3 - Edit records without false success or destructive retries (Priority: P1)
Given a stale version, a protected write returns a conflict and retains the draft. Given transport uncertainty, feedback requires reconciliation instead of blind replay. Given committed write and failed read, recovery repeats only read. Given a dialog changed through a custom picker, dismissal protection recognizes dirty state. Independent test: stale/late/unknown response and retry traces against real adapters, plus endpoint conflict tests.

### User Story 4 - Compose reusable views and forms (Priority: P2)
Given collection and calendar pilot routes, existing shells provide one header, one toolbar and owned scroll/overflow regions. No new wrapper is required unless both pilots prove the same missing responsibility. Given DataTable activation, Picker uses a logical callback rather than DOM inspection. Invalid empty view catalogs are rejected and explicit props override presets in documented tests. Given form errors, helper content stays available, summary links focus fields, and destructive confirmations identify the entity and retain failure context.

### User Story 5 - Maintain the system without silent drift (Priority: P2)
Given a new undefined token or increased changed-file design debt, either product's gate fails. Missing base refs fail explicitly rather than masquerading as a pass. A qualification manifest identifies source, contract, archives and consumer installs. Executable recipes cover collection, calendar, board, gallery, detail/inspector, form, dashboard and workspace compositions. Historical finding closure references concrete source and deployment receipts.

### Edge Cases
Malformed JSON; arrays replaced by scalar/object; duplicate/unknown IDs; non-finite spans; added/retired/renamed catalog entries; unsupported schema version; unavailable browser storage; failed HTTP status and rejected fetch; scope rotation during pending request; narrow containers independent of viewport; long EN/ES labels; 200% text zoom; 320px viewport; keyboard-only use; reduced motion; table empty/loading/error; conflict/unknown/stale/committed-refresh-failed/local-only; double activation; dirty custom controls; confirmation failure; missing git baseline; same version with different archive bytes.

## Functional Requirements

- **FR-001 / I01**: Generate qualification identity from source revision and actual installed/archive hashes; update stale governance counts from machine inventory and maintain historical disposition evidence.
- **FR-002 / I02**: Declare allowed normal text/surface pairings and test all themes; repair violating tokens; remove competing typography definitions; scope decorative styling through stable component hooks; make shared coarse-pointer target policy intrinsic.
- **FR-003 / I03**: Validate versioned layout envelopes, deduplicate known IDs, clamp finite spans, define deterministic catalog insertion and alias migration, and isolate local preferences by actor/org/surface. Unscoped legacy local preferences cannot be attributed safely and must not migrate across identities. Server-owned existing preferences may be normalized in their authenticated scope. Report save/local-only/error outcomes.
- **FR-004 / I04**: Provide move/resize keyboard actions, DOM-aligned layout flow, record-specific localized selection labels, aria-sort and accessible resize controls; close the named Sidebar/TimeOffCalendar/newContact residuals.
- **FR-005 / I05**: Preserve mutation outcomes in autosave, fence actor/scope/revision, explicitly integrate dirty custom controls, and complete optimistic version guards for stock/items and scheduling/event-types with authoritative returned versions. No production data backfill or schema migration is required unless revalidation proves otherwise and the spec is revised first.
- **FR-006 / I06**: Reject empty DataView catalogs; provide logical DataTable activation callback; test preset/explicit capability precedence; document and exercise existing-shell collection/calendar pilots before considering extraction.
- **FR-007 / I07**: Provide actual-component recipes and placement/state rules; persistent guidance and error summary; migrate audited native destructive confirms; capture EN/ES, narrow/zoom/keyboard and durable-edit states with synthetic data.
- **FR-008 / I08**: Align Hub/Site installed-token and per-file ratchet gates, publish component maturity/deprecation policy, certify actual consumer archives and migrate pilot routes with exact receipts. Do not claim exhaustive certification of all declared routes.
- **FR-009**: UI edits pass design/token checks, Paraglide generation, typecheck, relevant tests and production builds. Existing auth/RBAC/owner/field masking is preserved. New public or privileged app routes are not needed for recipes; fixtures run locally.
- **FR-010**: Independent review and release qualification precede merge. Deploy through each registry's integration/release branches. Verify production domain source identity and affected read-only UI behavior, including locale/login routes; CI alone does not prove deployment.

## DELTA / acceptance mapping

| Initiative | Transition | Proof |
|---|---|---|
| I01 | ambiguous artifacts → reproducible manifest and current inventory | hash/install identity tests; receipt for both consumers |
| I02 | canvas-only and competing CSS → allowed-pair and rendered contract | full contrast matrix; computed role/target/theme fixture |
| I03 | untrusted unscoped persistence → validated scoped envelopes | malformed/catalog/scope/storage/network tests |
| I04 | pointer-only and incomplete names → keyboard/semantic parity | mounted keyboard flow, focus and announcements, sort/resize tests |
| I05 | collapsed outcomes/unversioned writes → honest recovery and admission | conflict/lost-response/refresh-only/scope fencing endpoint and UI tests |
| I06 | implicit composition and DOM coupling → tested capabilities and pilots | DataView boundary, activation and preset tests; two rendered pilots |
| I07 | prose-only states/inconsistent forms → executable recipes | real components; helper/summary/confirm tests; visual matrix |
| I08 | unequal/skip-success gates → fail-closed consumer parity | intentional unknown-token/debt/missing-ref negative fixtures; CI/deployment receipts |

## Key Entities

PreferenceEnvelope: schema version, order/hidden IDs, finite spans, actor/org/surface identity. Catalog: unique item IDs, default order, constraints and explicit rename aliases. SaveOutcome: phase, immutable operation scope/revision, error/recovery capability. QualificationManifest: source SHA, package version and hash, contract digest, consumer revision, test and deployed identity. No preference stores permission grants.

## Success Criteria

All eight initiatives have implemented evidence or a reviewed already-satisfied disposition. Every allowed contrast pair passes. Malformed preference tests do not throw. Keyboard customization covers the same capabilities as pointer paths. Unknown writes are never automatically replayed. Both consumers fail negative gate fixtures. Both deployed domains resolve the expected source/package identity, and the targeted read-only smoke matrix passes. Remaining manual screen-reader/cross-browser limitations are disclosed rather than represented as certified.

## Assumptions and out of scope

Keep current framework, business transactions, auth systems and org policies. Do not restart paused readiness work, introduce a universal wrapper/SDK, redesign every route, add an agent configuration writer, or claim exhaustive tenant/screen-reader/cross-browser certification. Documentation, fixtures and concrete audited consumers are in scope; a speculative whole-product migration is not. Owner's implementation/deployment instruction authorizes this recommendation scope, including reviewed safety improvements; no separate production business-data mutation is authorized or needed.

## Verification and release

Run each repository's declared checks plus focused regression/negative fixtures. Render actual packaged components in synthetic local fixtures. Publish scoped PRs with exact test receipts and independent review. Build and qualify immutable shared package archives first (npm publication is separate), install the same reviewed archive bytes in consumers, and deploy Hub/master and Site/master through their prescribed branch paths. Record source SHA, deploy ID, production alias and read-only smoke receipts. Rollback is a reviewed revert of the affected slice/consumer archive, not a data rewrite.

## Review amendments (pass 1 and pass 2)

The following contracts resolve review R1–R5 and B1–B4 and are normative:

- Both independent FormField implementations are repaired directly without breaking snippets: meta/packages/ui/src/lib/FormField.svelte and Hub/src/lib/components/ui/foundations/FormField.svelte. ErrorSummary's canonical implementation is Hub foundations, exported there and used by EventTypeEditor and stock item form. Packaged Input/Select and actual Hub FormField each get helper+error tests.
- The required text matrix is textPrimary/textSecondary/textTertiary × canvas/surface1/surface2/surface3/overlay across all18current themes (270pairs), plus existing accent/status assertions. No failure may be excluded by shrinking the allowlist. A known-failing negative control proves the test detects a violation.
- Intrinsic coarse targets cover shared Button/IconButton (including anchors), Input, Select, Textarea, Toggle, Checkbox and Radio. Button/icon/toggle target is at least44px in both axes; fields have at least44px height and retain available width; check/radio label target has at least44px height without enlarging the mark. Fine-pointer density stays intact. Mounted/browser fixtures cover enabled/disabled/busy where supported.
- Unknown outcomes stay unknown after a successful read unless a server receipt proves this exact operation committed. Matching values cannot prove causation. Recovery refreshes authoritative state and asks user to review; a deliberate new edit uses a fresh version. Neither the old mutation closure nor queued edits auto-replay. Tests include matching-value concurrent actor ambiguity and identity rotation during reconciliation.
- Browser stock/item and event-type PATCH require expectedUpdatedAt: missing or malformed400, mismatch409, absent404. Internal authoritative service writers may retain explicit no-CAS mode; inventory includes pos.service stock linkage, stock archive and scheduling catalog synchronization. All writers must advance the token monotonically relative to stored value. Return token from the actual UPDATE, not a later independent SELECT. Event-type CAS and resource-link replacement are one transaction; stale/foreign/missing updates perform no secondary writes. Native local PostgreSQL test runs two writers with same token: exactly one succeeds and timestamp advances even within the same millisecond. Stale linked-resource update leaves links unchanged; rollback leaves no partial writes. Endpoint mocks alone are insufficient proof.
- Enumerate all createAutosave and direct SaveStatus.run callers in evidence/autosave-callers.md. Migrate scheduling BookingDetailDrawer, AvailabilityEditor, HR PeopleView, scheduling/reminders, pos/settings and home/settings; classify every direct SaveStatus caller as migrated/adapted/already-safe. Capture record/actor/org/version at scheduling and fence host side effects before dispatch and completion. Separate write acknowledgement from invalidate/read. Generic post-dispatch errors are unknown unless positively known rejected/unsent; do not erase409 into Error. Test a real BookingDetailDrawer or PeopleView scope switch and AvailabilityEditor committed-refresh failure.
- Explicit Dialog dirty state is canonical for custom controls. Extend actual dialog-dirty-harness.svelte to use a real Toggle/Select/Picker and explicit baseline comparison; initialization and search remain clean, user change dirty, successful rebaseline clean. Inventory real Dialog custom-control hosts and fix missing explicit dirty participation. Document the requirement in component API/recipes; do not infer edits from arbitrary clicks or add an event framework.
- EditableGrid hide/show is part of version1 hidden IDs; edit mode can reveal hidden cards for restoration. Grid interaction semantics follow actual cell navigation/selection/edit capabilities, not merely canEdit. Preference transport uncertainty retains local state and requires reconciliation before deliberate new write.
- Audited destructive pilots are SecretsSection, DynamicSecretGroup and ChannelsTab only; broader native confirms are inventoried, not silently claimed migrated. Component maturity/deprecation and compatible API transition rules live beside recipes and shared package README.
