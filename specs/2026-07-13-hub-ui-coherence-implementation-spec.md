# Minion Hub UI Coherence Implementation Spec

**Date:** 2026-07-13

**Status:** Source implementation plus the first authenticated feedback-loop repair are certified locally at Hub `dev` checkpoint `5028464c`; full authenticated capture, Figma transfer, and package publication remain open

**Governing product direction:** [Minion Hub Design Manifesto](./2026-07-13-hub-design-manifesto.md)

**Evidence:** [Minion Hub UI Coherence Audit](./2026-07-13-hub-ui-coherence-audit.md)

The semantic contract, shared foundations, route/access authorities, page migration waves, primitive consolidation, token integrity, absolute zero-governed-debt gate, and final interaction repairs are implemented and source-certified on local Hub `dev`. The disposable authenticated capture, actual Figma file/frames, and package publication remain open. This document preserves the intended dependency order while the [execution log](./2026-07-13-hub-ui-coherence-execution-log.md) records where execution diverged from it.

Post-certification user review is handled as an evidence loop: reproduce the observation in the authenticated local Hub, trace it to the token/component/page contract, implement in an isolated worktree, require independent review plus source and browser gates, then merge the bounded commit into local `dev`. The first loop is recorded at `5028464c` and covers Home theme coherence, navigation hover, and the responsive right-side Notes & Todos rail.

## Outcome

Make Minion Hub feel like one continuous product across all routes, themes, screen sizes, permissions, and data states without flattening its distinctive agent, canvas, terminal, marketplace, and business-module experiences.

This is an adoption and governance program. It extends the existing shared packages and Svelte 5 architecture; it is not a rewrite.

## Goals

1. One semantic token contract shared by Hub and Site.
2. One accessible interaction contract for actions, fields, selection, dialogs, feedback, and layers.
3. One page-composition system with explicit responsive and scroll behavior.
4. Domain-by-domain removal of bespoke duplicate recipes.
5. Route, permission, command-palette, API, and Figma inventories driven by shared metadata.
6. Automated prevention of token, primitive, accessibility, responsive, and visual regressions.
7. Editable Figma coverage for every renderable route and key state.

## Non-goals

- Rebrand Minion or replace the current visual character.
- Remove CRT, Voxelized, holographic, canvas, graph, terminal, or workshop expression.
- Force the marketing site and Hub to use the same accent or page composition.
- Move all Hub composites into `@minion-stack/ui`.
- Produce every route × theme × viewport × data-state combination as a separate Figma frame.
- Change backend domain architecture except where a frontend flow is already broken or insecure.

## Architecture decisions

### D1. Ownership has three layers

The meta-repo packages and the Hub/Site consumers are separate release units. Package changes are published from the meta-repo; Hub and Site consume released npm versions through their own dependency and lockfile updates. A package source change is not available to either consumer until that release chain completes.

#### `packages/design-tokens`

Owns cross-product foundations:

- Semantic color and theme contracts
- Type roles
- Spacing, radius, control-size, shadow, elevation, motion, and layer scales
- Shared CSS utilities
- Token existence and contrast tests

Changes are additive first because `minion_site` also consumes the package. Removing compatibility aliases requires a separate migration and Changeset.

#### `packages/ui`

Owns portable Svelte primitives with no Hub domain knowledge:

- Button/IconButton
- Badge
- Card
- FormField, Input, Textarea
- Select, Checkbox, Radio, Toggle
- Spinner/Skeleton if made cross-product

Every primitive owns accessibility, all interactive states, density, token usage, theme compatibility, and reduced motion.

#### `minion_hub/src/lib/components/ui`

Owns Hub composites and foundations that depend on Hub behavior or libraries:

- Dialog, ConfirmDialog, Sheet
- Portal/Layer, Menu, Popover, Tooltip, Combobox
- Tabs and AsyncBoundary
- PageShell, PageHeader, PageBody, SectionShell, SectionNav
- DataTable patterns
- DraggableWindow wide-mode enhancement

Domain components compose this layer. They do not define new primitive systems.

### D2. Canonical token schema

This section is the sole normative naming and mapping policy. The Manifesto describes intent, not CSS spelling. Phase 2 implemented `packages/design-tokens/contract.json` locally as the machine-readable authority for exact values per theme/mode; `tokens.css`, Tailwind bindings, tests, documentation, and future Figma variables are generated or validated against that artifact. Publication through the normal package release flow remains pending. A release cannot hand-edit divergent values in those consumers.

```text
Color
  --color-canvas
  --color-surface-1
  --color-surface-2
  --color-surface-3
  --color-overlay

  --color-border-subtle
  --color-border-default
  --color-border-strong

  --color-text-primary
  --color-text-secondary
  --color-text-tertiary
  --color-text-disabled

  --color-accent
  --color-on-accent
  --color-brand

  --color-success-fg / -surface / -border
  --color-warning-fg / -surface / -border
  --color-danger-fg  / -surface / -border
  --color-info-fg    / -surface / -border

Typography
  --font-family-sans / mono / display
  --font-size-display / page-title / section-title / body / label / caption / mono / telemetry
  --line-height-display / heading / body / compact
  --font-weight-regular / medium / semibold / bold
  --letter-spacing-normal / label / display

Spacing
  --space-0      0
  --space-0-5    2px
  --space-1      4px
  --space-2      8px
  --space-3      12px
  --space-4      16px
  --space-6      24px
  --space-8      32px
  --space-12     48px

Semantic spacing
  --space-control-gap
  --space-field-gap
  --space-card-compact
  --space-card
  --space-section
  --space-page-gutter
  --space-page-section

Radius
  --radius-xs / sm / md / lg / xl / full

Control size
  --control-height-xs / sm / md / lg / touch

Shadow/elevation
  --shadow-elevation-1..4
  --shadow-overlay
  --shadow-focus
  --shadow-status-glow

Motion
  --duration-instant / fast / normal / slow
  --ease-standard / enter / exit / spring

Layer
  --layer-base / sticky / navigation / dropdown / popover
  --layer-modal / toast / command / debug

Layout
  --shell-sidebar-collapsed
  --shell-sidebar-expanded
  --section-nav-expanded
  --page-header-height
  --notch-clearance
```

The non-theme base values are frozen as follows; theme-specific color and shadow recipes must be exhaustively enumerated in `contract.json`:

| Family | Exact base values |
|---|---|
| Type size/line height | display `28/36`, page title `18/24`, section title `14/20`, body `14/20`, label `12/16`, caption `12/16`, mono `12/18`, telemetry `10/16` px |
| Type weight | regular `400`, medium `500`, semibold `600`, bold `700` |
| Letter spacing | normal `0`, label `0.04em`, display `-0.01em` |
| Semantic spacing | control gap `8`, field gap `8`, card compact `12`, card `16`, section `24`, page section `32` px; page gutter `16/24/32` px at compact/medium/wide |
| Radius | xs `2`, sm `4`, md `6`, lg `8`, xl `12`, full `9999` px before a theme-wide radius scale |
| Control height | xs `24`, sm `28`, md `32`, lg `36`, touch `44` px |
| Motion duration | instant `75`, fast `150`, normal `250`, slow `400` ms |
| Easing | standard `cubic-bezier(0.2, 0, 0, 1)`, enter `cubic-bezier(0, 0, 0.2, 1)`, exit `cubic-bezier(0.4, 0, 1, 1)`, spring `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Layer | base `0`, sticky `10`, navigation `20`, dropdown `30`, popover `40`, modal `50`, toast `60`, command `70`, debug `100` |
| Shell/layout | sidebar collapsed `56`, sidebar expanded `224`, section nav expanded `208`, page header `56`, notch clearance `96` px |

Compatibility aliases remain until both Hub and Site have migrated:

```text
--font-sans                -> --font-family-sans
--font-mono                -> --font-family-mono
--font-display             -> --font-family-display
--color-bg                 -> --color-canvas
--color-bg2                -> --color-surface-1
--color-bg3                -> --color-surface-2
--color-card               -> --color-surface-2
--color-card-foreground    -> --color-text-primary
--color-border             -> --color-border-default
--color-foreground         -> --color-text-primary
--color-muted              -> --color-text-secondary
--color-muted-foreground   -> --color-text-tertiary
--color-muted-strong       -> --color-text-secondary
--color-accent-foreground  -> --color-on-accent
--color-brand-pink         -> --color-brand
--color-success            -> --color-success-fg
--color-warning            -> --color-warning-fg
--color-destructive        -> --color-danger-fg
--color-info               -> --color-info-fg
--shadow-sm / md / lg / xl -> --shadow-elevation-1 / 2 / 3 / 4
--elevation-1-bg           -> --color-surface-1
--elevation-2-bg           -> --color-surface-2
--elevation-3-bg           -> --color-surface-3
--elevation-4-bg           -> --color-overlay
--elevation-1-border       -> --color-border-subtle
--elevation-2-border       -> --color-border-default
--elevation-3-border       -> --color-border-strong
--elevation-4-border       -> --color-border-strong
--hairline                 -> --color-border-subtle
--ease-out                 -> --ease-enter
--ease-in                  -> --ease-exit
```

Existing `--color-purple`, `--color-pink`, `--color-cyan`, `--color-emerald`, and `--color-neutral` remain sanctioned categorical/data-visualization palettes and cannot substitute for action or status semantics. Existing `--color-status-running`, `--color-status-thinking`, `--color-status-idle`, and `--color-status-aborted` remain temporary domain aliases until their owning status components move to mode-aware triples.

Undeclared legacy names such as `--accent`, `--color-bg1`, `--color-background`, `--color-primary`, and `--color-error` are not promoted to compatibility tokens. Their consumers migrate directly to the correct semantic role. Alias removal is a later breaking package release after repository-wide zero-usage checks.

### D3. Theme contract

Each theme supplies:

```ts
type ThemePreset = {
  id: string;
  mode: 'light' | 'dark';
  colors: SemanticColorSet;
  radiusScale: RadiusScale;
  shadowStyle: ShadowStyle;
  typographyStyle: TypographyStyle;
  decoration?: 'none' | 'crt' | 'voxelized';
};
```

Rules:

- Components read semantic tokens only.
- `theme.mode` is the only light/dark mode source.
- Accent choices are `{ accent, onAccent }` pairs with automated contrast validation.
- Status triples vary by mode.
- Theme radius overrides the complete radius scale.
- Decoration targets stable `data-part`/`data-variant` hooks.
- Broad selectors over all buttons/inputs/headers or substring-matched class names are removed.

### D4. Typography contract

Functional roles replace arbitrary sizes:

| Role | Size | Minimum use rule |
|---|---:|---|
| Display | 28px | Rare hero metric/orienting statement |
| Page title | 18px | Exactly one visible route title |
| Section title | 14px | Card/section hierarchy |
| Body | 13–14px | Primary reading and controls |
| Label | 11–12px | Fields, nav metadata, compact labels |
| Caption | 12px | Secondary readable metadata |
| Mono | 12px | IDs, logs, code-adjacent values |
| Telemetry | 10px | Nonessential canvas/system telemetry only |

Nine- and ten-pixel text is accepted only through a named telemetry utility that fails contrast/essential-content review if misused.

### D5. Primitive contracts

#### Button

- Variants: primary, secondary, ghost, outline, danger
- Sizes: `xs`, `sm`, `md`, `lg`, and `touch`, mapped one-to-one to the corresponding `--control-height-*` token; `icon` is a shape variant at one of those heights
- States: rest, hover, focus-visible, active, disabled, loading
- Disabled link renders without `href`, is not tabbable, and cannot call `onclick`
- Loading preserves width and accessible name
- Icon-only use requires a localized accessible name

#### FormField

```ts
type FormFieldProps = {
  id?: string;
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};
```

- IDs use `$props.id()` or a module-level allocator, never an instance-reset counter.
- Label, helper, error, and control are associated automatically.
- Input, Textarea, Select, Combobox, Checkbox, Radio, and Toggle share the same field geometry and status behavior.

#### Tabs

- Named tablist is mandatory.
- Tabs own `aria-controls`; panels own `aria-labelledby`.
- Arrow/Home/End navigation is covered by tests.
- Route tabs use links; local view tabs use the tabs interaction pattern.

#### Dialog family

- `title` or `aria-labelledby` is mandatory.
- Focus enters, is trapped, returns, and respects escape/close rules.
- Background is inert and body scroll is locked.
- Variants: Dialog, ConfirmDialog, Sheet.
- Destructive confirmation is proportional to consequence.

#### AsyncBoundary

```ts
type AsyncBoundaryState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'empty' }
  | { kind: 'error'; retry?: () => void }
  | { kind: 'forbidden' }
  | { kind: 'unavailable'; retry?: () => void };
```

Empty, error, permission, and backend-unavailable states are visually distinct.

#### Portal and Layer

- Dropdown, Popover, Tooltip, Combobox, Toast, Command Palette, and draggable windows use one layer registry.
- Feature code does not set numeric z-index values.
- Native dialog remains in the browser top layer.

### D6. Layout and responsive contracts

#### Viewport modes

| Mode | Width | Contract |
|---|---|---|
| Compact | `<768px` | Comfortable targets, single primary pane, visible section labels |
| Medium | `768–1279px` | Condensed shell, discoverable section nav, selective two-pane layouts |
| Wide | `≥1280px` | Full navigation and multi-pane workspaces |

Use container queries for pane-local behavior. Coarse pointers receive at least a 44px action target.

#### Route archetypes

| Archetype | Default scroll owner | Compact transformation |
|---|---|---|
| Dashboard | Page body | Cards stack; priority metrics first |
| Collection/table | Data region | Priority columns or record cards |
| Record detail | Page body | Actions collapse; side regions stack/sheet |
| Form/settings | Page body | One column; sticky save only when safe |
| Master/detail | Detail region at wide | Master route then detail route |
| Workspace/editor | Explicit panes | Tabs/stack; inspector becomes sheet |
| Canvas/kanban | Internal canvas/board | Deliberate pan/horizontal scroll |
| Terminal/remote desktop | Workspace | Full-screen task surface |
| Public/auth | Document | Centered single task with safe keyboard height |

#### Shared layout components

```svelte
<AppViewport>
  <PrimaryNav />
  <SectionShell mode="responsive">
    <SectionNav />
    <PageShell archetype="collection" scroll="page">
      <PageHeader title={...} actions={...} />
      <PageBody><slot /></PageBody>
    </PageShell>
  </SectionShell>
</AppViewport>
```

Rules:

- Exactly one primary scroll owner per screen.
- `PageHeader` actions declare `primary`, `secondary`, or `overflow` priority.
- Canvas/editor routes explicitly opt into `scroll="none"`.
- Compact height uses dynamic viewport units and safe-area insets.
- Section navigation never relies on hover-only labels.

### D7. Route metadata becomes the UI inventory

Security and presentation have separate, one-way sources of truth:

- `route-access-policies.ts` is the executable source of truth for route-view authorization. Server route guards, navigation filtering, and command-palette filtering call the same policy functions. The design manifest references a policy ID; it never restates a permission.
- `route-design-manifest.ts` is the source of truth for page composition, responsive behavior, capture, and Figma coverage.
- API authorization remains resource/action based and is not inferred from a visible route.

Extend the current route registry into a complete route-design manifest:

```ts
type RouteBaseMeta = {
  id: string;
  pattern: string;
  family: string;
  title: () => string;
  accessPolicyId: RouteAccessPolicyId | 'public';
  nav: 'primary' | 'section' | 'contextual' | 'hidden';
  breadcrumb: BreadcrumbRule;
};

type ScreenDesignMeta = RouteBaseMeta & {
  kind: 'screen';
  archetype: RouteArchetype;
  scroll: 'page' | 'region' | 'none';
  compact: ResponsiveTransformation;
  capture: {
    viewports: Array<'compact' | 'medium' | 'wide'>;
    states: CaptureState[];
    personas: CapturePersonaId[];
    fixtureId: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  figma?: { page: string; framePrefix: string };
};

type RedirectDesignMeta = RouteBaseMeta & {
  kind: 'redirect';
  target: string;
  preserveQuery: boolean;
  capture?: never;
  figma?: never;
};

type RouteDesignMeta = ScreenDesignMeta | RedirectDesignMeta;
```

Dynamic routes resolve through a typed fixture registry rather than hand-entered IDs:

```ts
type CaptureFixture = {
  id: string;
  provision(ctx: FixtureContext): Promise<{ params?: Record<string, string>; query?: Record<string, string> }>;
  reset(ctx: FixtureContext): Promise<void>;
};
```

The design manifest drives presentation and composition:

- Primary/section navigation placement and grouping, but not authorization visibility
- Route titles and breadcrumbs
- Playwright route crawl
- Screenshot/visual baselines
- Figma capture inventory

The access-policy registry drives server route guards plus navigation and Command Palette visibility. Redirect shims declare `kind: 'redirect'` and a target, do not receive Figma frames, and are tested for target/permission preservation. Contextual routes remain `nav: 'contextual'`; dynamic patterns must declare their fixture resolver. Build-time validation fails if a renderable route lacks either manifest metadata or an access policy, if a visible command bypasses that policy, or if a redirect points to an unknown target.

### D7a. Deterministic authenticated capture harness

Route-wide claims depend on a local, resettable test tenant—not production cookies. Before migration begins, add:

- CI-safe login/storage state for named personas: owner/admin, manager/editor, member/viewer, and restricted/no-module access.
- A deterministic tenant with module flags, one connected fake/test gateway, and stable records for every dynamic route family.
- Fixture provision/reset commands that can run repeatedly and isolate destructive tests.
- A gateway simulator or dedicated non-production gateway for connection, offline, loading, and unavailable states.
- A route resolver that expands manifest patterns into concrete URLs, personas, queries, and expected access outcomes.
- Separate read-only capture and mutation suites; production is never the mutation target.

The harness writes a machine-readable run manifest containing app commit, fixture version, persona, viewport, route/state ID, screenshot path, console/page failures, and network failures. Playwright storage state is generated in setup and never committed with real credentials.

### D8. Frontend mutation and API contract

Add a typed fetch helper:

```ts
async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T>;
```

It must:

- Throw a typed error on non-2xx
- Parse safe server messages without leaking internals
- Distinguish unauthorized, forbidden, validation, conflict, unavailable, and network failure
- Support cancellation
- Integrate with toast/inline error policy

Optimistic mutations define an explicit rollback. A page never clears `dirty`, removes an item, or reports success merely because `fetch()` resolved.

### D9. Accessibility contract

Automated and manual checks cover:

- Accessible names for controls, dialogs, regions, tablists, and navs
- Unique IDs and field associations
- Keyboard focus order, trap, restore, and disabled behavior
- Contrast for every theme/accent/status pair
- 200% zoom and text reflow
- Reduced motion
- Coarse-pointer targets
- Live regions for async save/progress where needed

## Immediate correctness backlog

These items all precede visual migration. UI-001 uses a decided draft-first architecture: `builtAgents` is the authoring source of truth; the wizard creates a Hub draft and opens its ID. Publishing provisions or updates the runtime gateway agent and stores an explicit `runtimeAgentId` beside the existing gateway/server relationship. A separate “Quick create runtime agent” action may call `agents.create`, but it returns to the runtime registry rather than the draft editor. Deleting a draft never deletes a deployed runtime agent without a separate confirmation.

| ID | Priority | Work | Exit criterion |
|---|---|---|---|
| UI-001 | P0 | Implement draft-first Agent Wizard, `runtimeAgentId` linkage, and publish synchronization | Draft create → editor load/save → publish/update-runtime integration test passes |
| UI-002 | P0 | Gate Builder skills/agents and persist ownership | Role/owner matrix tests pass; UI matches API |
| UI-003 | P0 | Apply read permissions and owner filters to global search | Unauthorized entity types never appear |
| UI-004 | P0 | Use `theme.mode` in all graph views | All light themes render light graph chrome |
| UI-005 | P0 | Correct current Hub accent/on-accent pairs and mode-aware status values without renaming tokens | Current Hub contrast suite passes; Phase 2 later publishes the shared triple vocabulary |
| UI-006 | P0 | Fix Select IDs, Toggle/Tabs naming, Modal naming, disabled links | Primitive conformance suite passes |
| UI-007 | P1 | Make palette visibility derive from route guard | No visible command lands on 403 |
| UI-008 | P1 | Add `fetchJson` and repair false-success flows | Non-2xx preserves/rolls back UI and reports error |
| UI-009 | P1 | Remove/implement Preview and Drone controls | No selectable dead control remains |
| UI-010 | P1 | Label confirmed icon-only controls | Accessible-name scan passes |

## Delivery plan

The non-negotiable dependency order is:

```text
Phase 0 evidence/auth baseline
  -> Phase 1 UI-001..UI-010 correctness
  -> Phase 2 additive package release and consumer upgrades
  -> Phase 3 Hub composition foundation
  -> Phase 4 shell/high-risk routes
  -> Phase 5 domain waves with per-wave regression and Figma updates
  -> Phase 6 final certification
```

### Phase 0 — Freeze evidence and build the authenticated baseline

1. Record the clean base commit plus dirty snapshot fingerprint and preserve this report's current-state evidence.
2. Implement the deterministic authenticated harness from D7a, including personas, tenant/module state, gateway simulation, dynamic fixtures, and reset.
3. Build a read-only route/design inventory and crawler that observes the current route, nav, palette, guard, and redirect behavior without wiring new policies into the product. Record known mismatches such as UI-007 as baseline failures.
4. Capture current-state screenshots for every renderable route at its declared viewports and states, including those known failure states.
5. Populate Figma `99 Current UI archive` before any behavior or visual fix. Only after the archive is frozen may Phase 1 introduce and wire `route-access-policies.ts` under UI-007.

**Exit:** the route crawler is repeatable locally and in CI, every renderable route resolves under at least one persona, current screenshots and the Figma archive are immutable audit artifacts, known parity failures are recorded rather than silently corrected, and capture produces no unexplained authentication/onboarding failures.

**Execution deviation:** the code migration proceeded after the executable inventory, persona, fixture, and capture contracts landed, but before a safe disposable authenticated matrix completed and before the Figma `99 Current UI archive` was created. Those two Phase 0 exit criteria remain open acceptance debt. Any eventual “current UI” archive must identify its actual source checkpoint rather than presenting the migrated product as a pre-change baseline.

### Phase 1 — Stop active breakage

Deliver UI-001 through UI-010 as small, independently verifiable changes. Add failing tests before each fix. Do not combine this phase with token renaming. UI-005 changes current Hub theme values only; the shared semantic triple names and cross-product release remain Phase 2 work.

**Exit:** broken Builder handoff, permission leaks, false success, primitive defects, and dead controls are resolved.

### Phase 2 — Foundation package release

This phase is a coordinated release DAG across independent repositories:

1. In a meta-repo feature worktree, add `contract.json`, the frozen semantic dictionary, status triples, and compatibility aliases to `packages/design-tokens`; fix/expand primitives in `packages/ui`; add token-existence, theme-completeness, contrast, and package tests.
2. Add Changesets describing additive exports and compatibility behavior. Validate both package builds plus Hub and Site against packed local artifacts before merge.
3. Merge through the normal meta-repo release flow and wait for npm publication; record exact published versions.
4. In separate Hub and Site feature branches, bump the exact package versions and their Bun lockfiles. Hub imports the shared utilities; both consumers run build/check/tests and theme smoke tests.
5. Merge consumer upgrades only after the published versions are available. If either consumer regresses, pin its prior version; aliases make rollback safe.
6. Remove aliases only in a later breaking release after zero-usage checks in both consumers. Alias removal is never bundled with initial adoption.

**Owners/artifacts:** design-system owner approves the dictionary; package maintainer owns Changesets/publication; Hub and Site owners approve their dependency/lockfile PRs. Release evidence records package versions, Changeset IDs, packed-artifact CI, consumer commit SHAs, and rollback versions.

**Exit:** packages publish a documented, tested contract; Hub and Site independently build and pass checks against the recorded versions.

### Phase 3 — Hub composition foundation

Build and test:

- Portal/Layer
- Dialog/ConfirmDialog/Sheet
- FormField family
- AsyncBoundary
- Responsive PageHeader
- AppViewport, SectionShell, PageShell, PageBody
- Compact SectionNav
- Responsive DraggableWindow behavior

Convert design lint to a per-file ratchet with documented exceptions for illustrations, theme previews, syntax/data visualization, and third-party render surfaces. Never raise a global baseline to accept the current regression.

**Exit:** all foundation stories have component tests, accessibility tests, examples, and usage rules.

### Phase 4 — Shell and high-risk layout migration

Order:

1. App viewport, dynamic height, safe areas, and one-scroll-owner contract
2. Primary Sidebar, mobile Topbar, Dynamic Island, command palette, and overlay tiers
3. SectionNav compact behavior
4. Settings Notifications/Workflows/Provision routing and scroll ownership
5. Sessions master/detail
6. Overview graph inspector
7. Shells dense list and shell detail actions
8. Memberships, Sales, Support, and Workforce project board compact behavior

**Exit:** the shell and highest-risk routes pass compact/medium/wide visual and keyboard tests.

### Phase 5 — Domain migration waves

Migrate a domain completely, then delete its local recipes.

#### Wave A — Core platform

Settings, Sessions, Channels, Reliability, Cloud, Shells, Config.

#### Wave B — Business operations

CRM, Finance, Scheduling, POS, Stock, Sales, Support, Memberships, Work, Workforce, Socials.

#### Wave C — Agent creation and development

Agents, Builder, Brains, Flow Editor, Prompt, Tools, Capabilities.

#### Wave D — Immersive and expressive surfaces

Home, Workshop, Autonomous Agents, Marketplace, terminal/remote desktop.

#### Wave E — Public/auth

Login, recovery, join/invite, onboarding, booking, shared links, global error pages.

Each domain PR must:

1. Declare route archetypes and capture states.
2. Adopt shared page/composition primitives.
3. Migrate tokens and interaction feedback.
4. Implement compact/medium/wide behavior.
5. Cover loading, empty, error, permission, and unavailable states.
6. Remove superseded local CSS/components.
7. Reduce that domain's design-lint baseline.

8. Re-run its authenticated route matrix and update the canonical Figma frames/component mappings in the same review.

At checkpoint `b3b168fe`, the source migration, governed-debt, compiler, interaction, and static certification portions of these waves are implemented. Item 8 remains open because the disposable authenticated capture has not completed and no target Figma file or route frames exist yet.

### Phase 6 — Final certification and Figma reconciliation

This phase does not create the first baseline. It re-runs the Phase 0 harness across the completed product, reconciles per-wave screenshots/Figma updates, and certifies the end state.

#### Browser matrix

Test at minimum:

- 360×800
- 390×844
- 768×1024
- 1024×768
- 1280×800
- 1440×900

Also test keyboard-only, coarse pointer, reduced motion, 200% zoom, long translations/content, default dark, one light theme, CRT, and Voxelized. Token tests cover all 16 themes without duplicating every route screenshot.

Assertions:

- No document-level horizontal overflow except explicit canvas/board allowlists
- One visible route title for standard pages
- No unnamed interactive controls or dialogs
- No duplicate IDs
- No console/page errors
- No failed same-origin GETs during route load
- Visible nav/palette items are permitted
- Empty, error, and unavailable states are distinguishable

#### Figma transfer strategy

Figma's remote MCP Code to Canvas can convert live UI into editable Figma frames. It does not by itself turn those layers into the canonical component library. Use two layers of capture:

1. **Current UI — audit reference:** capture the current product during Phase 0 without turning it into the canonical component library.
2. **Canonical system and target screens:** create variables/components from the frozen contract, then capture or design the migrated routes.

Recommended Figma pages:

```text
00 Manifesto
01 Foundations
02 Components
03 Shell and navigation
10 Organization
20 Agents and builders
30 Business operations
40 Platform and reliability
50 Immersive workspaces
60 Public and auth
90 States and flows
99 Current UI archive
```

Each renderable route receives:

- Compact, medium, and wide frames where the route supports them
- Loading, empty, error/unavailable, permission-denied, and destructive states when applicable
- A route ID matching `RouteDesignMeta.id`
- An annotation for scroll owner and responsive transformation

Do not duplicate all 16 themes per screen. Represent themes as Figma variable modes; visually verify representative routes for default dark, one light theme, CRT, and Voxelized.

The current Hub `dev` inventory at `b3b168fe` has 146 page endpoints: 136 renderable screens (126 authenticated app screens and ten public/auth screens) and ten redirect/proxy routes. Twenty-seven dynamic screens require deterministic fixtures. The route manifest is the authoritative capture checklist, producing a planned compact/medium/wide base archive of 408 frames before state variants.

Add a code-owned component registry alongside the route manifest:

```ts
type ComponentDesignMeta = {
  codeId: string;
  exportPath: string;
  variants: Record<string, readonly string[]>;
  states: readonly string[];
  tokenRoles: readonly string[];
  figmaComponentKey?: string;
};
```

Figma variables use the CSS token name without the leading `--`; Figma modes match `ThemePreset.id`, grouped by light/dark mode and decoration. Component and variant names come from `ComponentDesignMeta`, not frame layer names. The design-system owner creates/reviews canonical Figma components, then records their component keys in code; the route owner updates screen frames during each migration wave. CI validates unique route/component IDs and complete metadata, while human review confirms instance linkage and visual intent. Code Connect may be added if the team wants IDE/design mappings, but it is not required to make the route archive editable and is not assumed to be provided by Code to Canvas.

#### Linking Codex to Figma

Figma connector authorization is session-specific and must be confirmed at execution time; it is not part of the source contract. Install and authorize the Figma plugin/MCP through the active Codex client, then start a session that exposes the Figma tools.

At the 2026-07-14 execution checkpoint, the connector reported the eligible Starter workspaces `Sandbox`, `MELOFOBIA`, and `Harvest Fintech`; `Sandbox` was recommended as the isolated owner. The user authorized creation of a new Design file and full screen transfer, but did not choose the owning workspace. Because file creation requires that explicit workspace selection, no Figma file was created. Reconfirm workspace eligibility and plan limits before writing because connector state and workspace plans can change.

After connection, provide:

- A Figma Design file URL with edit access, or permission to create a new file
- An explicit target Figma team/project or workspace
- A successful safe disposable authenticated capture artifact from the implemented Phase 0 harness
- Interactive OAuth only for Figma; no Hub or production credentials need to be shared

All eligible workspaces currently expose Starter-plan variable limits. Screen transfer can proceed, but the canonical 16-theme system cannot be represented as one multi-mode variable collection until the owning workspace supports the required modes. Do not silently flatten or split the canonical theme contract to work around this limitation.

Official setup: <https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/>

Official Code to Canvas workflow: <https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/>

## Verification gates

| Gate | Owner | Evidence and threshold required before merge |
|---|---|---|
| Hub type/unit | Hub route owner | From `minion_hub/`: `bun run check` and `bun run test`, zero errors, warnings, failures, or timeouts; changed correctness path has a regression test |
| Site consumer | Site owner | From `minion_site/`: `bun run check` and `bun run build`, both green; affected theme/component has a smoke test or recorded manual check |
| Shared UI package | Package author | From meta-repo root: `pnpm --filter @minion-stack/ui run build` and `pnpm --filter @minion-stack/ui run typecheck`, both green; Phase 2 adds/runs package tests |
| Meta-repo integration | Package maintainer | From meta-repo root: `pnpm run build-all`, `pnpm run typecheck-all`, and `pnpm run test-all`, all green against packed artifacts and then published versions |
| Design lint | Design-system owner | Per-file report: zero violations in a migrated file except approved, reason-coded data-viz/illustration exceptions; final certification also runs `--zero-global` and requires zero non-exempt governed findings repository-wide |
| Token contract | Design-system owner | Machine-readable inventory: zero undefined semantic tokens; 100% theme completeness; text/action pairs meet the agreed WCAG AA thresholds |
| Primitive | UI maintainer | Component tests and accessibility report: all declared states pass; zero duplicate IDs or unnamed controls/dialogs |
| Responsive | Route owner | Route-matrix artifact at declared viewports/personas: zero document overflow outside named allowlists; 200% reflow passes |
| Visual | Design-system owner + route owner | Baseline diff artifact: zero unexplained pixel diffs; intentional diffs carry an approved screenshot and review note |
| Permissions | Security/domain owner | Persona matrix: nav, palette, route guard, and API policy agree for every changed resource/action |
| API feedback | Domain owner | Tests exercise representative 4xx, 5xx, offline, cancellation, and rollback paths; no false success |
| Figma | Design-system owner + route owner | Registry diff: route/component/variant IDs match code; canonical instances and affected frames are reviewed in the linked Figma file |

## Definition of done for a migrated screen

- Uses a declared route archetype and a single scroll owner.
- Uses semantic tokens; raw values are a documented expressive/data-viz exception.
- Uses shared controls, fields, dialogs, feedback, and layers.
- Has compact, medium, and wide behavior where applicable.
- Has loading, empty, error/unavailable, permission, and destructive states.
- Has no visible action that the API rejects by permission or feature readiness.
- Handles non-2xx responses without false success.
- Passes keyboard, focus, naming, contrast, reduced-motion, zoom, and target-size checks.
- Deletes superseded local recipes.
- Has zero design-lint debt except an approved, reason-coded expressive/data-viz exception; it must not merely preserve legacy debt.
- Has matching Figma route/component identifiers.

## Program completion scorecard

The coherence program is complete only when all of the following are true:

- 100% of filesystem routes are classified; 100% of renderable routes have design metadata, access policy, deterministic fixtures, authenticated crawl coverage, and required Figma frames. Redirect shims have redirect tests instead of frames.
- 100% of interactive controls on migrated routes use a shared primitive or an approved named variant; zero anonymous local button, field, select, dialog, or overlay systems remain.
- Zero undefined token names; zero raw semantic colors, arbitrary z-indexes, or arbitrary motion recipes outside reason-coded expressive/data-viz palettes.
- Zero P0/P1 items in UI-001 through UI-010; zero critical or serious automated accessibility defects; all manual keyboard, zoom, reduced-motion, and coarse-pointer checks signed off.
- The design-lint repository baseline reaches zero for governed rules, excluding explicit code-reviewed exceptions; no global baseline increases are allowed.
- All supported theme/accent/status combinations pass automated completeness and contrast; representative dark, light, CRT, and Voxelized route suites pass visual review.
- Hub and Site are pinned to recorded released design-system versions, and alias-removal readiness reports zero remaining consumers.

**Checkpoint status (`b3b168fe`):** route classification, route/access metadata, semantic-token integrity, interaction repairs, and the zero-global governed-debt criterion are implemented locally. Source certification is green under Node 22: 256 files/1,942 tests, `svelte-check` 0 errors/0 warnings, production build green with zero invalid-selector warnings, token violations zero, design debt zero, and static route/API contracts fully resolved apart from one deliberate typed Builder `DELETE` ambiguity. Authenticated capture coverage, Figma frames/registry reconciliation, and released package versions remain open; therefore the full program is not yet complete.

## Risks and controls

| Risk | Control |
|---|---|
| Shared token changes break Site | Additive aliases, dual-consumer CI, Changesets |
| Bulk migration creates a long-lived mixed state | Complete domain waves; no global rewrite branch |
| Design lint treats illustrations as violations | Reasoned per-file exceptions and separate palette modules |
| Figma archives current inconsistency as canon | Separate current-state archive from target library |
| Screenshot matrix becomes combinatorial | Token tests all themes; visual tests representative themes |
| Responsive fixes break canvas/editor workflows | Route archetypes and explicit no-scroll/internal-scroll modes |
| Authenticated tests mutate production data | Deterministic local fixtures or isolated test tenant |
| Existing dirty Cloud/Shell work is overwritten | Work from clean feature worktrees and scope commits narrowly |

## Original first execution slice (historical plan)

The original implementation series was intended to follow the same dependency order as the delivery plan:

1. Phase 0a: commit the read-only route/design inventory, deterministic personas/fixtures, reset command, and CI-safe auth setup; do not wire new access behavior yet.
2. Phase 0b: capture and approve the immutable current-state screenshot set and Figma `99 Current UI archive`.
3. UI-001: add the draft-first schema/runtime linkage, change wizard handoff, implement publish synchronization, and land the end-to-end regression test.
4. UI-002/UI-003: repair Builder write and Search read/owner authorization with persona-matrix tests.
5. UI-004/UI-005: correct graph theme mode and validate current Hub accent/on-accent plus mode-aware status values; shared triple token names wait for Phase 2.
6. UI-006: repair primitive IDs, names, dialog contracts, and disabled-link behavior.
7. UI-007: make route policy the shared source for guards, navigation, and palette visibility.
8. UI-008: add `fetchJson` and repair every confirmed false-success flow.
9. UI-009/UI-010: remove or implement dead controls and label all confirmed icon-only controls.
10. Re-run the full Phase 0 matrix and close Phase 1. Then begin the additive package release; the shell/component migration was intended to remain blocked until UI-001 through UI-010 were all green.

Execution did not preserve the Phase 0 screenshot/Figma prerequisite: the source migration proceeded while safe authenticated capture remained blocked. Source implementation and certification are now complete at `b3b168fe`. The remaining slice is to complete the disposable authenticated matrix, select the owning workspace and create/reconcile the Figma file and 136-screen/408-base-frame archive, then publish the package candidates through the normal release flow.
