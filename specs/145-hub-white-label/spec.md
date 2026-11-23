---
status: implementing
verdict: approved
owner_approval: approved
owner_approved_at: 2026-11-22
---

# Feature Specification: Organization names throughout Hub

**Feature**: `145-hub-white-label`
**Created**: 2026-11-21
**Status**: Owner approved implementation and release on 2026-11-22: “approved. lmk when its all live”. Implementation in progress; EGM evidence is recorded in egm/
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
