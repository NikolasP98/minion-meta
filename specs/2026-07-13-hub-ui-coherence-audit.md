# Minion Hub UI Coherence Audit

**Date:** 2026-07-13

**Scope:** immutable historical baseline of the `minion_hub/` frontend at the snapshot recorded in the evidence appendix

**Current status:** this audit is not a description of the later integration tree; see the [execution log](./2026-07-13-hub-ui-coherence-execution-log.md) and resolution appendix below
**Companion documents:**

- [Minion Hub Design Manifesto](./2026-07-13-hub-design-manifesto.md)
- [Minion Hub UI Coherence Implementation Spec](./2026-07-13-hub-ui-coherence-implementation-spec.md)

## Executive verdict

The Hub does not need a visual redesign. It needs a design-system adoption program.

The product already has a strong visual instinct, a shared token package, useful primitives, and several polished screens. The loss of immersion comes from the fact that navigation crosses three styling languages:

1. `@minion-stack/design-tokens` and `@minion-stack/ui`
2. Hub-local theme, utility, and composite-component conventions
3. Page-local Tailwind, scoped CSS, legacy variables, overlays, grids, and animation recipes

The newest business modules generally use `PageHeader`, `Button`, `Modal`, `EmptyState`, and `SideNav`. Older core surfaces—Home, Agents, Builder, Workshop, Marketplace, Sessions, and parts of Settings—more often implement their own control sizes, typography, depth, motion, and layouts. The user therefore experiences each module as a separate application even though individual screens can look good in isolation.

At the audited snapshot, this was a correctness issue as well as a consistency issue. The audit found broken light-theme graph mode, invalid token aliases, contrast failures, duplicate form-control IDs, unnamed dialogs, non-responsive dense layouts, inconsistent scroll ownership, and a failing design-lint ratchet.

## Audit basis and limitations

### Inspected

- 580 Svelte files, including 390 component files
- 142 page files: 132 authenticated app pages and 10 public/auth pages
- 37 authenticated route families
- 18 Hub-local UI primitives and four shared package primitives
- `@minion-stack/design-tokens`, `@minion-stack/ui`, runtime theme presets, shell/layout code, route metadata, UI state, frontend fetches, and API route definitions
- Existing May 28 UI design-system spec, UI council review, and consistency recon
- Current design-lint output, Svelte diagnostics, Vitest suite, static link/API reconciliation, and responsive source scan
- Public/auth screens at 375×667, 768×1024, and 1440×900

### Verification results

| Check | Result |
|---|---|
| `bun run check` | Pass: 0 errors, 0 warnings |
| `bun run test` | Pass: 204 files, 1,658 tests |
| `bun run lint:design:ci` | **Fail**: all three tracked drift classes exceed baseline |
| Public/auth viewport smoke test | No document-level horizontal overflow or console errors observed |
| Authenticated full visual crawl | Not completed; an automated browser does not inherit the user's authenticated cookies |

An isolated auth-bypass crawl was attempted, but the local development identity was redirected into onboarding or rendered without authenticated page data. It is not used as evidence for app-page visual conclusions. The authenticated app findings below are source-backed. A fully authenticated visual-regression pass is an explicit implementation requirement.

### Worktree caveat

The Hub worktree was already dirty and 13 commits behind `origin/dev`. It includes in-progress Cloud/Shell work. This report describes the current local tree, including that work, and does not claim to describe a clean upstream snapshot.

## Quantitative picture

### Primitive adoption

| Pattern | Canonical uses | Native/bespoke uses | Interpretation |
|---|---:|---:|---|
| Button | 177 across 69 files | 980 bare buttons across 308 files | The canonical action contract is still the minority |
| Input | 10 across 4 files | 318 native inputs across 135 files | Form behavior and styling are overwhelmingly local |
| Select | 44 across 20 files | 72 native selects across 45 files | Adoption is material but incomplete |
| Card | 23 across 12 files | At least 40 files define a local `.card` | Surface hierarchy changes by domain |
| Modal | 22 across 19 files | 30 fixed-screen overlays and five other native dialogs | Dialog behavior is fragmented |
| PageHeader | 73 render uses; 71 app pages | 61 app pages do not use it | Page-level hierarchy is only about half standardized |
| EmptyState | 28 render uses | Many local or absent empty states | Recovery actions and tone vary |
| Skeleton | 10 render uses in 2 files | Local spinners/text/blank states elsewhere | Loading geometry is rarely preserved |

The design-lint ratchet confirms active regression relative to its stored baseline:

| Rule | Current | Over baseline |
|---|---:|---:|
| Raw color literals | 1,202 | +347 |
| Bare buttons | 968 counted by the lint rule | +457 |
| Native selects | 71 counted by the lint rule | +44 |

These counts include legitimate visual assets and lower-level control internals, so they are not all equally actionable. The important signal is that the current global-baseline strategy permits large ambiguity and is failing rather than ratcheting debt down.

### Typography, motion, and layering

- 1,279 arbitrary text-size utilities across 212 files
- 542 uses of `text-[10px]`, 447 of `text-[11px]`, and 182 of `text-[9px]`
- 298 functional `.t-*` typography utility uses, concentrated heavily in `.t-caption`
- 169 `box-shadow` declarations across 81 files, with roughly 100 distinct one-line values
- 81 keyframe declarations in 45 files; `spin` is redefined 18 times
- 282 transition declarations and 145 hard-coded transition-time occurrences
- The shared `src/lib/animations.ts` system has only one product consumer
- 122 CSS `z-index` declarations across 67 files, spanning negative values through 9,999; utilities reach 10,001

### Responsiveness risk

- Only 34 of 132 app page files contain an explicit responsive modifier or media query. Parent components mitigate some cases, so this is a risk indicator rather than a direct failure count.
- 46 pages define explicit grid columns.
- 21 pages render tables.
- 65 pages contain arbitrary or fixed dimensions.
- Only two route error boundaries exist: the root boundary and Workforce.

## Findings by layer

### 1. Foundations: tokens, themes, typography, depth, and motion

#### P0 — Multiple token vocabularies are live at once

The canonical package defines `--color-bg`, `--color-card`, `--color-border`, `--color-muted`, `--color-muted-foreground`, and `--color-accent`. The app also consumes undeclared or legacy alternatives:

- `var(--accent)`: 54 occurrences across 15 files
- `var(--color-bg1)`: 5 occurrences plus 22 `bg-bg1` utility uses
- `var(--color-background)`: 7 occurrences
- `var(--color-primary)`: 16 occurrences
- `var(--color-error)`: 57 occurrences, often masked by a fallback
- Shadcn-like `bg-primary`, `text-primary-foreground`, `bg-background`, and `bg-popover`

Concrete examples include global mention styling in `src/app.css:1195`, the public book view at `src/routes/book/[slug]/+page.svelte:318`, `SettingsScrollspy.svelte:122`, `AssembledPromptPane.svelte:49`, and `ChannelCard.svelte:455`.

There is also a semantic collision: `--color-muted` is documented as a text token, while `bg-muted` is used 119 times across 46 files as a surface, progress track, and hover background.

**Impact:** some styles silently fall back, themes do not propagate predictably, and the same token name can mean text or surface depending on the file.

**Decision:** introduce one semantic vocabulary and temporary compatibility aliases. Add token-existence validation for both `var(--*)` and Tailwind semantic utilities.

#### P0 — Light themes configure graph libraries as dark

Theme presets expose `mode: 'light' | 'dark'`, but four graph views compare `theme.preset.id === 'light'`. No preset has the ID `light`.

Affected files:

- `src/lib/components/flow-editor/FlowCanvas.svelte:95`
- `src/lib/components/flow-editor/MasterFlowCanvas.svelte:22`
- `src/lib/components/builder/ChapterDAG.svelte:96`
- `src/routes/(app)/workforce/org/+page.svelte:110`

**Impact:** all eight current light presets pass dark-mode configuration into their graph/rendering libraries.

**Decision:** expose a single derived `theme.mode` and ban mode inference from preset names or IDs.

#### P0 — Accent colors and on-accent text are not a pair

The user can choose one of ten accent colors independently of the preset's stored `accentForeground`. A static contrast check across the 16 presets × 10 accents found 122 of 160 combinations below 4.5:1 for small text. White on amber or green is approximately 2.1:1.

Runtime pairing happens in `src/lib/state/ui/theme.svelte.ts:81-92`; the appearance preview still shows the preset's stored accent in `src/routes/(app)/settings/appearance/+page.svelte:98`.

**Decision:** every accent must own an `on-accent` value. Token tests must enforce contrast before a pair can ship.

#### P0 — Muted and status colors are not mode-aware

Fourteen of the 16 `mutedForeground` preset values calculate below 4.5:1 against the page background. That token drives a 10px `.t-caption` recipe used hundreds of times. Fixed success and warning colors also become low-contrast text on light surfaces.

**Decision:** status colors become triplets—foreground, surface, border—per mode. The default caption size becomes 12px; 9–10px text is limited to nonessential telemetry.

#### P1 — The spacing system does not exist as a shared contract

The shared package defines colors, radii, shadows, elevation, motion, and fonts, but no spacing scale. Local CSS therefore uses a long tail of values such as `.3rem`, `.35rem`, `.6rem`, `.7rem`, and `.85rem`.

**Decision:** use a 0, 2, 4, 8, 12, 16, 24, 32, 48px scale plus semantic layout aliases. Arbitrary spacing requires an explicit exception.

#### P1 — Elevation and glow are conflated

Only a small portion of the 169 shadow declarations use canonical shadow/elevation tokens. Decorative glows, focus rings, inset separators, and modal depth are all expressed as arbitrary shadows.

**Decision:** separate structural elevation (`elevation-1..4`, overlay) from focus and decorative/status glow recipes.

#### P1 — The motion system exists but is effectively unadopted

`src/lib/animations.ts` defines reusable transitions and a press action, but only the app layout imports it. Local files continue to define spinners, pulses, entrances, and hard-coded timings. Global reduced-motion CSS is good, but JS-driven transform actions do not consult it directly.

**Decision:** publish a small named motion vocabulary and lint raw durations outside the motion foundation. Motion must explain navigation, causality, progress, or spatial change.

#### P1 — Theme style knobs are mostly no-ops

`ThemeStyle` sets `--theme-radius` and `--theme-border-alpha`; radius has only four consumers and border alpha has none. CRT and Voxelized compensate through broad selectors over all buttons, inputs, headers, nav elements, and substring-matched `card`/`panel` classes.

**Impact:** theme behavior leaks into domain and third-party UI unpredictably.

**Decision:** themes override token scales. Components expose stable `data-part` and `data-variant` hooks; themes do not target class-name substrings or all HTML controls.

### 2. Building blocks: actions, fields, selection, status, and feedback

#### P0 — Canonical primitives contain conformance defects

- `Select.svelte:11` declares its ID counter inside each component instance, producing duplicate `select-0` IDs when more than one Select is rendered.
- `Toggle.svelte:48` can render an unnamed switch when its visual label sits outside the component.
- `Tabs.svelte:66` makes the tablist name optional and does not connect tabs to panels through `aria-controls`.
- The shared Button anchor variant retains `href` and `onclick` while `aria-disabled`, so keyboard activation can still navigate.

**Decision:** primitive conformance tests precede bulk migration. A broken primitive multiplies defects across every migrated screen.

#### P1 — Form semantics are still page-owned

With only ten canonical Input uses against 318 native inputs, label association, helper text, validation, required state, disabled state, density, and error placement vary widely.

**Decision:** introduce one `FormField` contract that composes Input, Textarea, Select, Combobox, Checkbox, Radio, and Toggle. Field components must support visible label, accessible name, helper/error IDs, required state, and consistent spacing.

#### P1 — Status and empty/loading/error states have no complete contract

Only two files use the shared Skeleton. Several pages treat network failure as an empty dataset; `/sessions` returns or catches silently in `src/routes/(app)/sessions/+page.svelte:13-23`.

**Decision:** standardize an `AsyncBoundary` with four visibly distinct states:

1. Loading: geometry-matched skeleton
2. Empty: explanation and next action
3. Recoverable error: message and retry
4. Permission/backend unavailable: specific reason, not an empty state

### 3. Composed components: cards, dialogs, menus, nav, and windows

#### P0 — Dialog accessibility is fragmented

The canonical native-dialog wrapper only uses `aria-label={title}`. Several callers render a custom header without the `title` prop, leaving the dialog unnamed:

- `src/lib/components/artifacts/ArtifactCreateModal.svelte:119`
- `src/lib/components/my-agent/EmailModal.svelte:194`
- `src/lib/components/brains/AddSourceDialog.svelte:172`
- `src/lib/components/my-agent/EventModal.svelte:80`

Custom overlays such as `SecretEditModal`, `DeleteConfirmModal`, and `CRTConfigModal` do not consistently provide focus trapping/restoration, inert background behavior, scroll lock, naming, and keyboard dismissal.

**Decision:** one dialog foundation, with mandatory `title` or `aria-labelledby`, and named Dialog, ConfirmDialog, and Sheet variants.

#### P1 — Overlay layers have no shared stack

Dropdowns, popovers, tooltips, comboboxes, dialogs, draggable windows, toasts, the command palette, the dynamic island, and dev tooling use unrelated z-index values and portal behavior.

Examples:

- Dropdown: z-50 and portaled
- Popover: not portaled
- Tooltip: not portaled and z-9999
- Combobox: z-2000
- DraggableDialog: z-1000, pointer-only drag, 420px minimum width

**Decision:** add a Portal/Layer foundation and named tiers: base, sticky, navigation, dropdown, popover, modal, toast, command, debug. Native dialog remains in the browser top layer.

#### P1 — Nested navigation is unlabeled below 1280px

The shared `SideNav` is 56px wide until `xl`; headers, labels, search, and badges are hidden. A `title` tooltip is not discoverable on touch. This affects Account, Brains, Channels, Cloud, CRM, Finance, Marketplace, POS, Scheduling, Settings, Socials, Stock, and Workshop.

Evidence: `src/lib/components/ui/SideNav.svelte:103-176`.

**Decision:** compact section navigation must retain visible labels through a horizontal tab strip, select/menu, or drawer. An icon-only rail is only valid when every icon is universally recognizable and has a touch-accessible label.

#### P1 — Draggable windows are desktop-specific

`DraggableDialog` is pointer-driven, has a large minimum size, and participates in the arbitrary layer stack.

**Decision:** draggable/resizable is an enhancement at wide widths. Compact mode becomes a full-screen sheet or ordinary route. Keyboard move/resize is required where floating mode remains.

### 4. Pages and layouts

#### P1 — Page hierarchy changes at module boundaries

`PageHeader` reaches only about 54% of app pages. Twenty-seven app pages define bespoke native headers, while others have no semantic `h1` in the page component. Header height, sticky behavior, notch clearance, title size, action placement, and background therefore change during navigation.

**Decision:** every non-canvas route declares a page archetype and uses a shared `PageShell`, `PageHeader`, and `PageBody`. Canvas/editor routes explicitly opt out.

#### P1 — Settings can clip long pages and hides destinations

The Settings layout uses `overflow-hidden`, while Notifications and Workflows render long content without a reliable scroll owner. Notifications, Workflows, and Provision are absent from `SettingsNav` and reachable only contextually.

Evidence:

- `src/routes/(app)/settings/+layout.svelte:26`
- `src/routes/(app)/settings/notifications/+page.svelte:90`
- `src/routes/(app)/settings/workflows/+page.svelte:69`

**Decision:** one `SectionPage` owns scrolling. Missing routes either enter a named Advanced/Automation group or are explicitly modeled as contextual children with breadcrumbs.

#### P1 — Master/detail and editor layouts do not transform on compact screens

- Sessions always reserves a fixed 300px list pane.
- Overview always keeps a fixed 320px editor beside the graph.
- Tool detail keeps its IDE panes side by side.
- Flow editor toolbars have fixed-width fields and action clusters.
- `PageHeader` keeps all actions in a non-wrapping `shrink-0` row.

**Decision:** define standard compact transformations: master→detail navigation, pane tabs/stacking, primary-action retention with overflow, and full-screen drawers for inspectors.

#### P1 — Dense business views have desktop-only grid contracts

High-risk examples include Membership creation, Sales, Support, Shells, the Workforce project board, POS/Appointments rows, and several scheduling lists. Fixed tracks can exceed compact viewports or force the document itself to become the horizontal scroller.

**Decision:** use one of three sanctioned patterns:

1. Dense list → priority-column table or mobile cards
2. Kanban/editor → explicit internal horizontal scroller with sticky lane headers
3. Two-pane workspace → tabs or stacked panes below `lg`

#### P2 — Scroll ownership varies by module

The app shell scrolls, many section layouts hide overflow, Workforce adds a scroll owner, POS adds another, and individual pages add more. Sticky behavior, clipping, restoration, and scrollbar location therefore depend on the route.

**Decision:** exactly one primary scroll owner per route archetype. Canvas routes use an explicit no-scroll mode.

#### P2 — The authenticated shell uses static viewport height

The shell uses `h-screen` rather than dynamic viewport units and safe-area insets.

**Decision:** use `100dvh` with a safe fallback and keyboard/safe-area handling.

### 5. Links, controls, and frontend APIs

#### P0 — New Agent creates one model and opens an editor for another

The Agent creation flow calls gateway RPC `agents.create` and returns a gateway agent ID:

- `src/lib/components/builder/AgentCreateWizard.svelte:274-326`
- `src/lib/components/builder/BuilderHub.svelte:340-343`

It then opens `/agents/builder/{id}`. That editor requests `/api/builder/agents/{id}`, whose handler only reads the Hub `builtAgents` table:

- `src/routes/(app)/agents/builder/[id]/+page.svelte:56-60`
- `src/routes/api/builder/agents/[id]/+server.ts:20-29`

No gateway-to-`builtAgents` mirror was found; the only `builtAgents` writer is `createBuiltAgent()` in `src/server/services/builder.service.ts:313-338`.

**Impact:** the editor receives a 404, logs it, stops loading, and displays a default “Untitled Agent” state. Later autosaves ignore response status and clear `dirty`, producing a false saved state.

**Decision:** choose one canonical agent model. Either persist the gateway-created record into `builtAgents` before navigation or make the editor read/write through gateway RPC. Add an integration test over create → returned ID → editor load → save.

#### P0 — Builder write APIs bypass the role/ownership model

Builder skill and agent endpoints use `requireCoreCtx` but do not enforce resource capability or ownership:

- `src/routes/api/builder/skills/+server.ts:6-21`
- `src/routes/api/builder/skills/[id]/+server.ts:39-108`
- `src/routes/api/builder/agents/+server.ts:6-18`
- `src/server/services/builder.service.ts:30-43,313-338`

Created skill and agent records omit `createdBy`, while detail access later expects ownership. `/api/builder/*` is also absent from `API_WRITE_PREFIXES` in `src/server/services/rbac.service.ts:929-948`.

**Impact:** an authenticated org member can create, mutate, publish, or delete shared builder records regardless of the role matrix; non-admin access to newly created built agents can then fail its own ownership check.

**Decision:** add direct resource/action capability gates, persist the actor, enforce owner-or-capability consistently, and gate the matching UI controls from the same capability source.

#### P0/P1 — Global search exposes entities outside the caller's view permissions

`src/routes/api/search/+server.ts:7-11` checks for org context, then `src/server/services/search.service.ts:21-87` queries CRM unconditionally and Support/Sales based on module enablement—not caller capability. It applies no owner filter.

**Impact:** direct API or command-palette search can disclose CRM contact names/IDs, ticket subjects/statuses, and sales metadata to roles without those view permissions.

**Decision:** resolve caller capabilities inside the endpoint, omit unauthorized entity sources, apply owner filters, and add role-matrix tests.

#### P1 — Command palette visibility diverges from route guards

The palette filters entries only when optional `requires` metadata is present. Several guarded routes omit it: Agents, Marketplace, all Workforce palette pages, Sessions, and the New Agent action.

Evidence:

- `src/lib/state/ui/command-palette.svelte.ts:39-60`
- `src/lib/nav/routes.ts:124-133,195-204,221-302`
- `src/lib/permissions.ts:209-235`

**Impact:** a user can select a visible command and land on a 403.

**Decision:** derive palette visibility from the same `requiredViewPermForPath()`/`canViewPath()` source as route protection. Gate page, action, and entity commands.

#### P1 — Several mutations report success after any HTTP response

`fetch()` does not throw on HTTP 4xx/5xx, but multiple flows treat “a response arrived” as success:

- Agent editor autosave/publish/skill changes: `agents/builder/[id]/+page.svelte:110-227`
- Skill editor save: `src/lib/state/builder/skill-editor.core.svelte.ts:220-238`
- Builder delete: `src/lib/components/builder/BuilderHub.svelte:88-100`
- Brain document reingest/delete: `src/lib/components/brains/BrainDocumentsTable.svelte:38-60`
- Finance sync start: `src/lib/state/features/finance-sync.svelte.ts:61-78`
- Built-skill persistence after agent creation: `AgentCreateWizard.svelte:312-330`

**Impact:** dirty state clears, cards disappear, “running” state appears, or analytics record success even though the server rejected the operation.

**Decision:** introduce a typed `fetchJson`/`assertOk` helper. Commit optimistic UI only after success or supply a rollback; surface an actionable inline/toast error.

#### P1 — Dead and misleading controls are visible

- Agent Builder Preview has no handler: `src/routes/(app)/agents/builder/[id]/_components/BuilderToolbar.svelte:93-96`.
- Flow Editor offers “Drone task” as a selectable execution type while explicitly saying execution is coming soon: `src/lib/components/flow-editor/nodes/AgentNode.svelte:170-201`.
- The shared Button retains `href` on disabled links. Keyboard activation can still navigate. Four disabled Meta/Instagram OAuth controls use this pattern in `src/routes/(app)/socials/settings/+page.svelte:162,171,205,226`.

**Decision:** implement or remove Preview; hide Drone until executable; disabled links must omit `href`, leave the tab order, and cancel activation.

#### P1 — Confirmed icon-only controls lack accessible names

Eleven controls were verified in Agent Registry, Flow Copilot, Marketplace cards/list toggles, POS Sellable Wizard, and Reliability Activity Log. Representative paths:

- `src/lib/components/builder/AgentRegistry.svelte:172-174`
- `src/lib/components/flow-editor/FlowCopilotPanel.svelte:129-136`
- `src/lib/components/marketplace/_agent-card/IdFooter.svelte:12-18`
- `src/lib/components/pos/SellableWizard.svelte:223`
- `src/lib/components/reliability/ActivityLogTable.svelte:475-499`
- `src/routes/(app)/marketplace/agents/+page.svelte:123-129`
- `src/routes/(app)/marketplace/plugins/+page.svelte:118-141`

**Decision:** add localized names. View toggles also expose `aria-pressed`.

#### Static reconciliation and coverage

- 142 page routes, 349 API handlers, and 401 frontend `fetch()` call sites across 164 files were scanned.
- No literal `href`, `goto`, redirect, or statically resolvable API path pointed to a missing route.
- No confirmed static HTTP-method/handler mismatch was found.
- Root `/` links are intentional: authenticated requests are redirected by `hooks.server.ts` to the user's configured landing page.
- The current E2E suite contains one authenticated happy-path spec for the Workforce dashboard. It skips when `E2E_USER_EMAIL` is not configured.

At the audited snapshot, there was no automated coverage for the Agent Builder model handoff, builder RBAC, search read permissions, palette/route-guard parity, dead controls, non-OK optimistic mutations, or route-wide link/button/form/API behavior.

## What is already strong

The implementation should preserve these patterns:

- The main Sidebar and mobile Topbar intentionally split below `md`.
- `DataTable` owns its internal overflow and computes dense table width.
- The canonical Modal constrains width to the viewport and body height to 85vh.
- `/home` uses media and container queries.
- `/pos/sell` has explicit desktop, tablet, and mobile layouts.
- Cloud overview/settings already include compact breakpoints.
- Global focus-visible and reduced-motion rules exist.
- Newer CRM, Finance, Scheduling, POS, Stock, and Workforce pages show that shared primitives can support the product's density without flattening its character.

## Root cause

At the audited snapshot, the May design-system work had delivered a foundation, but the operating model stopped at component creation. There was no enforced route archetype, complete token schema, primitive conformance suite, per-file design-debt ratchet, authenticated visual matrix, or definition of done that required a migrated screen to delete its local recipe.

As a result, every feature team can ship a good-looking page while making the whole product less coherent.

## Recommended action

The original recommendation was not to start with a theme refresh or a route-by-route cosmetic sweep, and to execute the companion implementation spec in this order:

1. Build the deterministic authenticated route harness; freeze screenshot evidence and the Figma current-state archive before changing the UI.
2. Fix UI-001 through UI-010 correctness, security, and accessibility defects.
3. Freeze and publish the semantic token, responsive, and primitive contracts through the shared-package release chain.
4. Standardize shell, page archetypes, layers, scroll ownership, and asynchronous states.
5. Migrate complete domains, deleting their old local recipes and updating browser/Figma evidence in each wave.
6. Run final route/theme/viewport and Figma certification.

Execution later diverged from step 1: the route/persona/fixture/capture contracts landed, but the source migration proceeded before a safe disposable authenticated archive or Figma `99 Current UI archive` completed. That deviation remains explicit acceptance debt rather than being rewritten into this historical baseline.

## Resolution/status appendix

**Current local authority:** local Hub `dev` checkpoint `b3b168fe` on 2026-07-14.

- The semantic token contract, theme roles, shared primitives/foundations, route-design manifest, route-access registry, mutation boundary, page migration waves, primitive consolidation, design-debt cleanup, and final interaction repairs are implemented locally.
- Current route authority: 146 endpoints, 136 reachable screens (126 authenticated app and ten public/auth), ten redirects, and 27 dynamic screen/fixture families. The planned compact/medium/wide base archive is 408 frames.
- Final source certification is green under Node 22: the serialized suite passes 256 files/1,942 tests, `svelte-check` reports 0 errors/0 warnings, and the production build succeeds with zero invalid-selector warnings.
- The token-integrity gate resolves 12,337 consumers across 1,913 files against 214 declared names, with 114 reason-coded runtime/component/render exceptions and zero violations.
- The absolute design-lint gate reports zero non-exempt governed findings. Its remaining 242 matches are all existing reason-coded expressive/render exceptions; palette utilities, bare buttons outside the UI foundation, and native selects outside the UI foundation are at zero.
- The static contract scanner resolves 146 pages, 352 API handlers, 298 navigation references, and 387 API calls with zero unresolved destinations and zero HTTP-method mismatches. The one remaining ambiguity is the deliberate typed Builder `DELETE` target across its three registered handlers.
- Still open: a successful safe disposable authenticated capture matrix, creation and reconciliation of the actual Figma file/frames/components after workspace selection, and normal Changeset/npm publication with released consumer versions.

This appendix records resolution status without changing the audit's original measurements or confidence classifications.

## Evidence appendix

### Snapshot fingerprint

The audit was taken from Hub commit `90d025c4e4a8015d70436b75e0a323be067ff112` on local branch `dev`, which was 13 commits behind `origin/dev`. The working tree had 31 changed/untracked status entries before this report was added.

| Snapshot element | SHA-256 |
|---|---|
| Tracked `git diff --binary HEAD` | `cb933943536e988074edd1340e5fc5ebe53693259b5e58216cc2f949ba5c391b` |
| Ordered untracked file-name list | `a6b5a3dac41bc2a2fc841464b6d642c23f5b87a48744371c92d8a435c4ae611d` |
| Ordered untracked file-content checksums | `f7f5081a324fd35a697ace98bf84869c5bc56380f9a5aa00a1ee066739ff9aed` |

This fingerprint is evidence identification, not an endorsement of the dirty state. The later implementation preserved this snapshot as the observed baseline and moved implementation into isolated feature worktrees; the incomplete authenticated/Figma archive is recorded in the resolution appendix rather than retroactively altering this evidence.

### Confidence classification

| Classification | Findings |
|---|---|
| Runtime verified | Public/auth viewport behavior at the three reported sizes; typecheck, unit suite, and design-lint command results |
| Source verified | Token aliases, graph mode condition, contrast enumeration, primitive/dialog defects, Agent Builder ID mismatch, Builder/Search authorization gaps, palette-policy drift, false-success mutations, dead controls, unnamed controls, and static route/API reconciliation |
| Source inferred | Compact-layout clipping/overflow risks, scroll-owner conflicts, and the practical effect of unlabeled touch navigation; these require the authenticated Phase 0 visual matrix for runtime confirmation |
| Not claimed as verified | Dynamic authenticated route outcomes, production API availability, and visual correctness of the current authenticated app |

### Reproduction notes

Run from `minion_hub/`:

```bash
git rev-parse HEAD
git status --porcelain=v1
git diff --binary HEAD | sha256sum
git ls-files --others --exclude-standard -z | sha256sum
git ls-files --others --exclude-standard -z | sort -z | xargs -0 sha256sum | sha256sum
bun run check
bun run test
bun run lint:design:ci
rg --files src -g '*.svelte'
rg --files 'src/routes/(app)' -g '+page.svelte'
rg --files src/routes/api -g '+server.ts'
rg -n 'fetch\(' src -g '*.ts' -g '*.svelte'
```

The contrast enumeration used WCAG relative luminance/contrast against the 16 presets in `src/lib/themes/presets.ts` and the 10 accent choices consumed by theme state. Inventory counts came from a one-off read-only scanner and targeted `rg` reconciliation; that temporary scanner was not committed. Durable follow-up coverage is split across `scripts/ui-audit-inventory.mjs`, `scripts/design-lint.mjs`, `scripts/token-integrity.mjs`, the route-design/access contract suites, and `src/server/ui-audit/frontend-contract-scanner.ts`; future reports should identify which authority produced each count rather than implying one nonexistent all-in-one scanner.
