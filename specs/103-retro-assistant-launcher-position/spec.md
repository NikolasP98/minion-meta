# Feature Specification: Assistant Launcher Stays in Its Corner

**Feature Branch**: `103-retro-assistant-launcher-position`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "make sure the floating agent chat always initially renders in
this corner spot [bottom-right]. The user can later move it around as usual, but its
location is stored in local/sessionstorage or similar. hard refreshes moves it back to its
corner spot. Also make sure screen resize doesn't displace its location like it currently
does."

## Clarifications

### Session 2026-10-15

- Q: The ask says the launcher's dragged location "is stored in local/sessionstorage or
  similar" (implying it survives a reload) but also that "hard refreshes moves it back to
  its corner spot" (implying it does not survive a reload). Which behavior wins — does a
  hard refresh restore the last dragged spot, or always reset to the corner? → A: A hard
  refresh (and any full page reload) always resets the launcher to its default corner. The
  storage mechanism named in the ask is read as a suggested means, not a requirement; the
  explicit behavioral statement ("always initially renders in this corner spot", "hard
  refreshes moves it back") is stated twice and unconditionally, and wins over the
  implementation hint it contradicts. (ASSUMPTION — owner to confirm)
- Q: "The user can later move it around as usual" — does a dragged spot need to survive
  normal in-app page navigation (no reload), or may each page/view reset to the corner too? →
  A: A dragged spot survives in-app (client-side) navigation for the rest of that browser
  tab's session; only a reload resets it. Treating every navigation as a reset would make
  "move it around as usual" pointless, since any page change would discard the move
  immediately. (ASSUMPTION — owner to confirm)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launcher always starts in its home corner (Priority: P1)

A user opens (or reloads) the hub in their browser. Regardless of where they last dragged
the floating assistant launcher, it renders in its default bottom-right corner on this load.

**Why this priority**: This is the owner's literal, twice-stated complaint ("the launcher
came back where it had been dragged after a hard refresh" was NOT wanted) — it is the
feature's entire reason for existing. Without it, nothing else matters.

**Independent Test**: Drag the launcher away from its corner, hard-refresh the page, and
confirm it renders back in the bottom-right corner.

**Acceptance Scenarios**:

1. **Given** the launcher has never been dragged, **When** the page loads, **Then** it
   renders in the bottom-right corner.
2. **Given** the launcher was previously dragged to a different edge in an earlier browser
   session, **When** the page is hard-refreshed (or opened fresh), **Then** it renders in
   the bottom-right corner, not the previously dragged spot.

---

### User Story 2 - Dragging still works for the rest of the session (Priority: P2)

A user drags the launcher to a different edge of the screen. It stays where they put it
while they keep using the app in that tab (including navigating between pages), exactly as
it does today.

**Why this priority**: The owner explicitly preserves this ("the user can later move it
around as usual") — User Story 1 must not regress existing drag behavior.

**Independent Test**: Drag the launcher to an edge, navigate to a different page in the app
without reloading, and confirm the launcher is still at the dragged spot.

**Acceptance Scenarios**:

1. **Given** the launcher is at its default corner, **When** the user drags it to another
   screen edge, **Then** it snaps to and stays at that edge.
2. **Given** the launcher was dragged to a non-default edge, **When** the user navigates to
   another page in the app (no reload), **Then** the launcher remains at that dragged edge.

---

### User Story 3 - A window resize never displaces the launcher (Priority: P1)

A user has dragged the launcher to an edge (or it sits at its default corner) and then
resizes the browser window. The launcher is not knocked to a different edge or corner by the
resize, and it never ends up partly or fully off-screen.

**Why this priority**: Explicitly called out by the owner as current broken behavior
("resizing the window moved it to a different edge") — equal weight to Story 1 since it is
the second concrete bug named in the same request.

**Independent Test**: Drag the launcher to an edge, resize the browser window (both larger
and smaller), and confirm the launcher stays on the same edge and fully visible at every
size.

**Acceptance Scenarios**:

1. **Given** the launcher is docked at a non-default edge, **When** the browser window is
   resized, **Then** the launcher remains on that same edge rather than snapping to a
   different one.
2. **Given** the launcher is at any position, **When** the browser window is resized
   smaller, **Then** the launcher remains fully visible within the new viewport (never
   partially or fully off-screen).

### Edge Cases

- What happens when the user drags the launcher very close to the default bottom-right
  corner and releases it — does it register as a new custom position at that spot, or does
  it snap back to being treated as "the default corner" (so a later resize/reload behaves
  identically to having never dragged it)? No reasonable default is obvious from the ask
  alone; flagged in Assumptions, not required reading further.
- What happens if the window is resized to be smaller than the launcher's last dragged
  position would allow (e.g., dragged near the right edge, then the window is narrowed)? The
  launcher must still land fully inside the new viewport (see Story 3, Scenario 2).
- What happens on a partial/soft reload performed by the framework during normal navigation
  (not a user-initiated hard refresh)? Per the Session 2026-10-15 clarification, only the
  dragged-spot-survives-navigation behavior (Story 2) applies; a framework-level full page
  reload is treated the same as a hard refresh (Story 1).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The launcher MUST render in its default bottom-right corner on every fresh
  page load, including a hard refresh, regardless of any position it was dragged to in a
  prior browser session.
- **FR-002**: Users MUST be able to drag the launcher to any screen edge; it snaps to the
  nearest edge on release, as it does today.
- **FR-003**: A dragged (non-default) launcher position MUST persist across in-app
  (client-side) page navigation within the same browser tab session, until that tab is
  reloaded.
- **FR-004**: A dragged launcher position MUST NOT be read back or restored after a hard
  refresh or any full page reload — every such load MUST show FR-001's default corner.
- **FR-005**: When the browser window is resized, the launcher MUST remain on the same edge
  it was last docked to; a resize MUST NOT move the launcher to a different edge or corner
  than the one it was already on.
- **FR-006**: When the browser window is resized, the launcher MUST remain fully within the
  visible viewport at every size, never partially or fully off-screen.

### Key Entities

- **Launcher position state**: The launcher's current screen anchor — either "default
  corner" or a dragged edge position. Lives only for the current browser tab session; carries
  no identity beyond that session and is not shared across tabs, devices, or users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of fresh page loads (including hard refreshes) render the launcher in its
  default bottom-right corner, independent of any drag performed in a prior session.
- **SC-002**: After dragging the launcher to each of the four screen edges and resizing the
  browser window across a representative range of widths/heights, the launcher remains fully
  on-screen and on its originally-dragged edge in 100% of those checks.
- **SC-003**: A dragged launcher position is observably retained through at least one in-app
  navigation (page change without a reload) in manual verification, with zero regressions to
  existing drag/snap/open behavior.
- **SC-004**: The owner's two reported complaints — "launcher comes back where it was
  dragged after a hard refresh" and "resizing moves it to a different edge" — no longer
  reproduce in manual verification after this change ships.

## Assumptions

- "This corner spot [bottom-right]" is the launcher's existing default anchor; no new corner
  option is being introduced.
- The storage mechanism is an implementation detail left to the plan; the ask's mention of
  "local/sessionstorage or similar" is guidance, not a binding requirement, per the
  Clarifications above (session-scoped persistence that does not survive a reload is also an
  acceptable reading of "sessionstorage or similar").
- Dragging the launcher back into the default corner's immediate drop zone is treated as
  equivalent to clearing the custom position (returning to the dynamic default), matching how
  "home" behavior already works for drag-to-snap launchers elsewhere in the shell. This is an
  assumption, not stated in the ask. (ASSUMPTION — owner to confirm)
- No other floating UI (e.g., the expanded chat panel itself, as opposed to the collapsed
  launcher pill) is in scope — the ask names only the launcher's "location."
- Existing drag, edge-snap, and open/close behavior of the launcher is out of scope for
  change except where Stories 1–3 explicitly require it.
