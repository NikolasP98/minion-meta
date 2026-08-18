---
id: 2026-08-18-base-ui-primitives-and-shell-spec
title: Base UI-002/003 — interaction primitives + mobile shell
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-18-base-ui-primitives-and-shell
verdict: approved
repos: [minion-base]
tags: [ui, logic, test, docs]
relationship: extends
related: [2026-08-18-minion-base-mobile-hitl-ux-plan, 2026-08-18-base-workdetail-summary-first]
---

# Base UI-002/003 — interaction primitives + mobile shell

## 0. Product

The approved proposal defines the problem and outcome as follows:

> **AS-IS:** board/detail define private action/status patterns; KebabMenu is a
> partial ARIA menu; nav is five fixed text links; no bottom nav, no safe-area
> handling; DESIGN.md scene is desktop-only. **TO-BE:** primitives
> Status/RiskMark/IntegrityMark/AsyncButton (states idle→confirming→submitting→
> success/partial/conflict/failed, stable width, aria-busy)/ActionOutcome/
> CopyableHash/Popover (focus-trap, esc, return-focus)/Disclosure; mobile shell:
> bottom nav (Overview/Work/Request/Runs/More, icon+label, 44px, prefix-aware
> active), sticky context header, safe-area tokens, skip-to-content; DESIGN.md
> scene updated to mobile HITL. **DELTA:** extract primitives → replace local
> patterns → add shell components → tokens (--layer-*, --safe-bottom,
> --touch-target) → DESIGN.md rewrite.
>
> **DoD:** 320px nav works without wrapping; every icon has a text label; no
> color-only status; gates: check 0/0 + lint:design clean.
> **Out of scope:** attention queue, WorkDetail, decision API (later WPs).

The product intent inherited from the approved UX program is a mobile decision cockpit whose
hierarchy is **Decision → Risk → Proof → Detail → History**, while preserving Minion Base's
graphite/ember/ivory scene. This work supplies the reusable interaction language and application
frame; it does not build the later work-item experiences.

## 1. Relationship recommendation

**Recommended classification: `extends`.**

- `2026-08-18-minion-base-mobile-hitl-ux-plan` — this spec turns the approved plan's UI-002 and
  UI-003 work packages into implementable slices; it does not replace or alter the program.

The intake search covered `specs/index.json` and `proposals/index.json` by repo, surface, title,
and DoD terms. The adjacent proposals `2026-08-18-base-attention-queue-responsive-runs` and
`2026-08-18-base-workdetail-summary-first` explicitly depend on this proposal, so they are
downstream consumers rather than duplicates to merge. Existing Minion Base board/deploy specs
touch route data or lifecycle behavior, not these primitives or shell.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified and carried current behavior

The `minion-base` source checkout is not present in this planner workspace. The following anchors
are therefore corroborated by the approved proposal, the approved program, related specs, and
operator memory, but must be rechecked against `main` before the first edit:

- `src/lib/components/KebabMenu.svelte` owns a partial ARIA menu with outside-click and Escape
  behavior. It does not establish a shared focus-trapped popover contract.
- `src/routes/+layout.svelte` is the application-frame integration point. The later shipped UI
  fold changed its five tabs to Pipeline, Request, Board, Practices, and Settings; `/factory` was
  folded into `/kanban?view=factory`, and `/research` into a Practices topic. Prefix-aware
  active-state behavior shipped in UI-001, so this work must reuse, not regress, that matching
  rule.
- `src/lib/design/tokens.css` is the only permitted raw-color source and
  `scripts/lint-design.mjs` enforces Minion Base's own design governance. `DESIGN.md` describes the
  graphite/ember/ivory scene but only for desktop.
- The board and detail surfaces contain local status/action/outcome rendering. UI-001 already
  introduced revision-bound two-step gate outcomes, including the persistent partial
  `approved_queue_pending` state; extraction must preserve that behavior and its
  `role="status"`/`role="alert"` and `aria-busy` semantics.
- Coarse-pointer controls were raised to 44px in UI-001, but the repo has no shared
  `--touch-target`, `--safe-bottom`, or layer-token contract and no bottom navigation or
  skip-to-content target.

Before implementation, record the resolved paths and current test scripts in the Slice 1 PR:

```bash
rg -n "KebabMenu|approved_queue_pending|aria-busy|role=.|navigation|<nav|pathname" src
rg -n -- "--touch|--safe|--layer|overflow|sticky" src/lib/design src/routes DESIGN.md
rg -n "playwright|axe|visual|test" package.json bun.lock playwright.config.* vite.config.* tests src 2>/dev/null
rg -n "PUBLIC_.*_V2|view=factory|/practices|/settings|/request|/kanban" src .env.example README.md 2>/dev/null
find src/lib/components src/routes -maxdepth 3 -type f | sort
bun run check
DESIGN_LINT_BASE_REF=origin/main bun run lint:design
```

The explicit `DESIGN_LINT_BASE_REF` is required because operator memory records that Minion Base
has only a `poke` check and, for the related Vercel Svelte worktree pattern, design lint can use a
deleted/stale base ref unless `origin/main` is supplied. Recon must record the exact unit/component,
browser, axe, and visual-regression commands. If the repo lacks the unit/component harness, Slice
1 adds the smallest Bun-compatible setup before its red tests; if it lacks browser/axe/visual
support, Slice 3 adds the smallest Playwright-compatible setup. The implementing slice includes
the resolved config/`package.json` paths in its PR scope. If recon contradicts a behavioral claim,
stop and revise this spec; path-only drift may be recorded in the PR and applied mechanically.

### TO-BE — target behavior and invariants

1. `Status`, `RiskMark`, and `IntegrityMark` expose a shared symbol + visible label + semantic
   color grammar. `IntegrityMark` implements the program's verified/claimed/stale/missing/
   quarantined/invalidated union. Recon inventories the current status and risk values; the typed
   mappings cover each observed value plus an explicit unknown/unavailable presentation. Unknown
   source input never silently becomes success, low risk, or verified. Meaning and accessible
   names never depend on color or a tooltip, and `DESIGN.md` records the resulting mapping table.
2. `AsyncButton` is a controlled presentation component for `idle`, `confirming`, `submitting`,
   `success`, `partial`, `conflict`, and `failed`; the owning lifecycle component remains the sole
   owner of network requests, revision state, and permitted retry/dismiss callbacks. The button
   keeps one computed inline size across all seven labels, suppresses activation while submitting,
   and exposes `aria-busy="true"` only while submitting. `AsyncButton` renders the control state;
   `ActionOutcome` renders the terminal live region from that same controlled state. Terminal
   outcomes never clear on a timer: success/partial use `role="status"`, conflict/failed use
   `role="alert"`, and they remain visible until an explicitly supplied dismiss/retry action or a
   new server result replaces them.
3. `ActionOutcome`, `CopyableHash`, `Popover`, and `Disclosure` have reusable, independently typed
   contracts. Popovers trap focus while open, close on Escape or outside interaction, and return
   focus to the still-connected trigger. `KebabMenu` additionally retains `menu`/`menuitem`
   semantics and ArrowUp/ArrowDown/Home/End navigation. Disclosure uses a real button with
   `aria-expanded`/`aria-controls`. CopyableHash preserves the visible revision text, announces
   success only after the Clipboard promise resolves, and exposes an announced failure state.
4. Existing lifecycle actions and statuses use these primitives without changing request
   payloads, revision binding, transition legality, receipts, or partial-success semantics.
5. The application shell provides the first interactive element in DOM/tab order as a skip link,
   a sticky context header, a focusable-on-activation `<main id="main-content" tabindex="-1">`, and
   mobile bottom navigation with this exact mapping: Overview → exact pathname `/`; Work →
   pathname `/kanban` or `/kanban/**` unless the Runs rule matches; Request → pathname `/request`
   or `/request/**`; Runs → pathname `/kanban` when `URLSearchParams.get('view') === 'factory'`;
   More → a Popover containing the existing `/practices` and `/settings` destinations. More is
   active on either contained pathname/prefix; Runs wins over Work regardless of query-parameter
   order; otherwise matching marks at most one item. Every top-level item has an icon, persistent
   text label, and 44×44 minimum target; at 320px the bar neither wraps nor causes page-level
   horizontal scroll. Desktop exposes the same destinations and preserves every current URL.
6. Safe-area and stacking behavior use semantic tokens (`--safe-bottom`, `--touch-target`,
   `--bottom-nav-height`, and `--layer-*`). `--safe-bottom` resolves from
   `env(safe-area-inset-bottom, 0px)`; shell content padding is at least
   `calc(var(--bottom-nav-height) + var(--safe-bottom))`. Fixed/sticky content remains reachable
   above the bottom navigation when the safe inset is zero or nonzero.
7. Desktop navigation and existing URLs remain usable. No gateway protocol, database, auth,
   lifecycle API, or index schema changes are introduced.
8. Shell activation is guarded by `PUBLIC_MOBILE_SHELL_V2`: unset/false preserves the current
   layout and URLs; true selects the new AppShell. The primitives may be used by migrated surfaces
   in either mode. The flag contract is documented in the repo's existing environment reference
   and does not weaken the fail-closed auth gate.
9. `DESIGN.md` becomes the normative mobile HITL scene and documents component states, symbol
   grammar, focus behavior, safe areas, and responsive shell rules. Raw colors remain confined to
   `src/lib/design/tokens.css`; no gradient, glass, or decorative status color is added.

### DELTA — transitions, slice traceability, and proof

1. **Local status/mark renderings → shared semantic marks** — Slice 1; proved by primitive tests
   covering label/symbol/accessibility combinations plus migrated-surface assertions and
   `bun run check`.
2. **Local gate/outcome state rendering → shared asynchronous action primitives** — Slice 2;
   proved by state-transition tests for all seven states, duplicate-submit prevention, persistent
   partial/conflict outcomes, and the unchanged lifecycle request fixture.
3. **Partial menu/disclosure behavior → keyboard-complete Popover/Disclosure/CopyableHash** —
   Slice 2; proved by focus-order, Escape, outside-dismiss, return-focus, expanded-state, and copy
   announcement tests.
4. **Desktop-only route frame → flagged, responsive, safe-area-aware application shell** — Slice
   3; proved with the flag off and on at 320, 390, 768, 1280, and 1920px by shell browser, axe, and
   visual-regression assertions for no horizontal overflow, nav labels/targets, skip-link focus,
   active route, sticky header, and unobscured final content.
5. **Implicit visual rules → documented and linted mobile HITL contract** — Slice 3; proved by
   `DESIGN_LINT_BASE_REF=origin/main bun run lint:design`, token-contract assertions, and
   `bun run check` reporting 0 errors and 0 warnings.

## 3. Approach — vertical slices

Each slice is independently reviewable and sized for roughly 4–8 focused hours. Slice 1 begins
with the recon commands in §2; later slices re-run the relevant searches before editing. If an
existing file named below has moved, use the resolved equivalent and record the substitution in
the PR. Do not create compatibility wrappers for dead paths.

### Slice 1 — semantic state language on a real board/detail path (4–6 h)

**User-visible outcome:** one existing board card and its corresponding detail summary speak the
same status, risk, and evidence-integrity language, with no color-only state.

**Files to touch:**

- `src/lib/components/Status.svelte` (new)
- `src/lib/components/RiskMark.svelte` (new)
- `src/lib/components/IntegrityMark.svelte` (new)
- `src/lib/components/index.ts` (create only if this is the existing component export boundary;
  otherwise update the recon-resolved barrel)
- `src/routes/kanban/+page.svelte`
- the recon-resolved existing generic detail component used by
  `src/routes/kanban/[kind]/[...ref]/+page.svelte`
- `src/lib/components/Status.test.ts` (new contract test; colocate equivalent tests if the repo's
  convention differs)
- the recon-resolved Bun component-test config and `package.json` (only if needed to supply the
  required red/green test command discovered in §2)

**Machine-checkable definition of done:**

- The test contains the recon-recorded status/risk mapping and all six integrity variants;
  exhaustive switches fail type checking when a member is omitted, and an unmapped boundary value
  renders the explicit unknown/unavailable mark rather than success, low risk, or verified.
- The chosen board/detail path renders symbol and visible label for every mapping-table fixture and
  retains an accessible name when color styles are disabled.
- Existing links and lifecycle controls on the migrated path behave unchanged.
- `bun test src/lib/components/Status.test.ts` and `bun run check` exit 0; the latter reports
  0 errors and 0 warnings.

### Slice 2 — one complete consequential-action interaction (6–8 h)

**User-visible outcome:** the existing UI-001 lifecycle gate uses one stable, keyboard-complete
interaction family from confirmation through durable outcome, and the stage kebab uses the same
popover behavior.

**Files to touch:**

- `src/lib/components/AsyncButton.svelte` (new)
- `src/lib/components/ActionOutcome.svelte` (new)
- `src/lib/components/CopyableHash.svelte` (new)
- `src/lib/components/Popover.svelte` (new)
- `src/lib/components/Disclosure.svelte` (new)
- `src/lib/components/KebabMenu.svelte`
- the recon-resolved lifecycle action/outcome component used by
  `src/routes/kanban/[kind]/[...ref]/+page.svelte`
- the component barrel resolved in Slice 1
- `src/lib/components/interaction-primitives.test.ts` (new)

**Machine-checkable definition of done:**

- Tests drive `idle → confirming → submitting` into each terminal outcome and assert stable button
  width (each computed width equals the idle-state width within 1 CSS px), `aria-busy`,
  duplicate-submit suppression, the §2 live-region role, controlled retry/dismiss callbacks, and
  persistence of every terminal outcome until an explicit callback/new result.
- The migrated gate sends exactly one request with the same revision/status payload as before and
  still distinguishes `approved_queue_pending` from success; retry UI never replays the approval
  mutation unless the existing lifecycle contract explicitly supplies that action.
- Popover tests prove Tab/Shift+Tab containment, Escape/outside close, and return focus. KebabMenu
  tests additionally prove `menu`/`menuitem` roles and ArrowUp/ArrowDown/Home/End movement.
  Disclosure and copy tests prove `aria-expanded`/`aria-controls`, success after Clipboard resolve,
  and announced Clipboard rejection without changing the hash text.
- `bun test src/lib/components/interaction-primitives.test.ts`, `bun run check`, and
  `DESIGN_LINT_BASE_REF=origin/main bun run lint:design` exit 0.

### Slice 3 — mobile shell and documented scene (6–8 h)

**User-visible outcome:** at 320px, every primary destination is reachable from a labeled bottom
navigation, context remains visible, content clears device safe areas, and keyboard users can skip
directly to the page.

**Files to touch:**

- `src/lib/components/AppShell.svelte` (new)
- `src/lib/components/BottomNav.svelte` (new)
- `src/lib/components/ContextHeader.svelte` (new)
- `src/routes/+layout.svelte`
- `src/lib/design/tokens.css`
- `DESIGN.md`
- `.env.example` and the existing environment reference (recon-resolved; only if separate from
  `DESIGN.md`)
- `src/lib/components/app-shell.test.ts` (new)
- `tests/app-shell.spec.ts` (new browser test; if the repo's browser suite lives elsewhere, move
  only this test to that established location)
- the recon-resolved Playwright/axe/visual-regression config and `package.json` (only when needed
  to supply the required commands discovered in §2)

**Machine-checkable definition of done:**

- The five top-level items are exactly Overview, Work, Request, Runs, and More and implement the
  route/menu mapping and active precedence in §2. Each exposes a persistent icon + text label; the
  More Popover exposes Practices and Settings without renaming or removing their URLs.
- Computed target size is at least 44×44px. With `PUBLIC_MOBILE_SHELL_V2=true`, at
  320/390/768/1280/1920px,
  `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, labels do not
  wrap, and a bottom sentinel scrolled into view has `boundingBox.bottom <= bottomNav.top`. The
  sticky header remains within the viewport without covering the focused main heading or a shell
  control. Repeat the sentinel assertion once with `--safe-bottom: 0px` and once with a nonzero
  test override.
- The skip link is the first interactive DOM element and first Tab stop; activation places
  `document.activeElement` on `#main-content`. Route changes close More and leave focus outside the
  detached old page.
- `tokens.css` defines `--touch-target`, `--safe-bottom` with an
  `env(safe-area-inset-bottom, 0px)` fallback, `--bottom-nav-height`, and named `--layer-*` values
  used by the shell; a token test asserts the required content-padding calculation.
- With the feature flag unset/false, semantic assertions prove the current five-tab desktop layout
  and all URLs remain available. With it true, axe reports no serious or critical violations and
  committed visual baselines cover 320, 390, 768, 1280, and 1920px.
- `DESIGN.md` documents the mobile scene and all invariants in §2 TO-BE; the environment reference
  documents flag enable/rollback behavior.
- `bun test src/lib/components/app-shell.test.ts`, the recon-recorded browser/axe/visual command
  scoped to `tests/app-shell.spec.ts`, `bun run check`, and
  `DESIGN_LINT_BASE_REF=origin/main bun run lint:design` all exit 0.

## 4. Cross-repo impact assessment

Per `AGENTS.md`'s Cross-Project Impact Zones, this change touches none of the listed shared
protocol, channel, database, agent-definition, auth, workshop, pixel-office, or Paperclip-adapter
zones. `repos: [minion-base]` is therefore intentionally narrow.

- **Minion Base lifecycle/factory integration:** unavoidable local risk because an existing gate
  is migrated. Mitigation: preserve request and response fixtures byte-for-byte, including
  revision identity and partial/conflict outcomes; do not edit the lifecycle proxy or factory.
- **Downstream Base UI packages:** the attention/runs and WorkDetail proposals consume these
  primitives. Mitigation: export typed, domain-neutral contracts and avoid importing board-detail
  types into primitives. This spec does not implement either downstream feature.
- **Design governance:** Minion Base has its own `DESIGN.md`, token file, and `lint:design`; the
  hub/site `ui-design-governance` skill and `lint:tokens` gate do not apply. Raw colors remain in
  the Base token file only.
- **Route/navigation integration:** the current Pipeline/Request/Board/Practices/Settings fold is
  the route source of truth. The new labels reorganize those existing surfaces only: Runs retains
  `/kanban?view=factory`, and More retains `/practices` and `/settings`; no redirects or route
  deletion are allowed. This correction follows
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` ("UI FOLD SHIPPED").
- **Vercel/build-time configuration:** `PUBLIC_MOBILE_SHELL_V2` is a public build flag, not a
  secret. The code and `.env.example` define false/unset rollback behavior; production enablement
  is an operator action, and this implementation does not mutate Vercel settings.
- **Deployment/CI alert:** operator memory says Minion Base's declared required check is only
  `poke`, not real CI. The implementation PR must attach the explicit local gate transcript and
  browser evidence; this spec does not broaden scope into CI infrastructure.

Memory shaping these decisions: `/memory/MINION/minion-base-lifecycle-dashboard.md` establishes
the Base-specific design-governance contract, `KebabMenu` history, and route-sync/fail-closed
constraints; `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records UI-001's shipped
revision-bound outcome semantics and the absence of real Base CI. The `★★★` constraints are
preserved: no board-level one-click approval, no invented evidence, and partial approval/queue
failure remains distinct from success.

## 5. Explicit out of scope

- Attention queue, focused stage selector, URL filter sheet, WorkItemCard, responsive run cards,
  or desktop lane polish (UI-004/UI-011).
- Internal issue route, `WorkDetail`, `Availability<T>`, summary-first detail, readiness band, or
  decision dock (UI-005/UI-006/UI-007).
- Decision API or new decision mutations (UI-008), evidence manifest/artifact system (UI-009),
  or durable event timeline (UI-010).
- Changes to minion-factory, minion-meta indexes, GitHub APIs, lifecycle endpoints, gateway
  protocol, auth, database/schema, route URLs, or Vercel configuration. Documenting the public
  shell flag and its local default is in scope; changing production environment values is not.
- A wholesale visual redesign, new icon-only controls, gradients/glass, or adoption of hub/site
  design tokens.
- Adding or repairing Minion Base CI. This implementation must nevertheless produce the local
  evidence required below.

## 6. End-to-end verification

From a clean Minion Base implementation worktree on `main`:

```bash
bun install
bunx svelte-kit sync
bun test src/lib/components/Status.test.ts
bun test src/lib/components/interaction-primitives.test.ts
bun test src/lib/components/app-shell.test.ts
bun run check
DESIGN_LINT_BASE_REF=origin/main bun run lint:design
# Run the recon-recorded browser command scoped to tests/app-shell.spec.ts; it must include axe
# and the committed visual baselines.
```

Then exercise one fixture of each asynchronous terminal state and each mark variant at 320, 390,
768, 1280, and 1920px. Run the shell matrix with the flag off and on. The browser test/evidence must
prove: no page-level horizontal overflow; five unwrapped icon+label top-level items; the exact
Work/Runs query precedence and More routes; ≥44×44 targets; skip-link focus on `#main-content`;
Popover focus containment/Escape/return-focus and menu arrow keys; zero/nonzero safe-bottom content
clearance; no color-only status; stable-width/`aria-busy` submission; axe with no serious/critical
violations; matching visual baselines; and persistent success, partial, conflict, and failed
outcomes. Finally, perform one existing revision-bound lifecycle action against the implementation's
test fixture/mock and assert its request payload and durable receipt are unchanged. A missing
browser/axe/visual harness is handled by the bounded Slice 3 test-support fallback above, not by
screenshots or an undocumented manual exception.
