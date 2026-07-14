# Minion Hub Design Manifesto

**Design direction:** a living operations room—calm under load, dense without noise, expressive without becoming theatrical.

Minion Hub is not a collection of dashboards. It is the place where people direct agents, inspect systems, make decisions, and recover from failure. The interface should feel continuous across that work: one spatial language, one hierarchy of signals, and one predictable set of behaviors.

Themes may change the atmosphere. They must not change the grammar.

## The promise

Every screen should answer four questions without making the user hunt:

1. Where am I?
2. What is happening?
3. What can I do next?
4. What changed because of my action?

If a page looks beautiful but fails one of those questions, it is unfinished.

## Ten principles

### 1. Continuity is the product

Navigation should feel like moving through one instrument panel, not opening another application. The shell, page hierarchy, control behavior, density, and feedback model remain stable across modules.

Domain identity comes from content, iconography, data visualization, and restrained accents—not a new card, button, modal, and spacing system for every route.

### 2. Semantics come before aesthetics

Product UI consumes semantic tokens. It does not choose raw palette values because they happen to look right in one theme.

- `accent` means actionable, selected, focused, or current.
- Brand pink means Minion identity, a featured moment, or celebration. It is not the default CTA color.
- Success, warning, danger, and info are reserved for real state.
- Muted text is text. A muted surface has a different token.

Raw colors are allowed only in named data-visualization palettes, illustrations, shaders, syntax highlighting, avatars, or other documented expressive contexts.

### 3. Themes change expression, not behavior

A theme may change color, radius, typography texture, shadow character, and decorative atmosphere. It may not change information hierarchy, interaction semantics, focus behavior, control geometry, accessible contrast, or responsive transformation.

Every theme must pass the same component, contrast, motion, and viewport tests.

### 4. Density is deliberate

Minion Hub is an expert tool. It may be compact, but never illegible or untouchable.

- Compact density is for data-rich desktop work.
- Comfortable density is the default for touch and compact viewports.
- Density changes control height, row height, and padding as a system.
- It does not shrink random labels to 9px to make a layout fit.

### 5. Depth communicates responsibility

Elevation is structural:

- Canvas: the workspace
- Surface 1: attached rails and regions
- Surface 2: cards, rows, and panels
- Surface 3: menus and popovers
- Overlay: modal decisions and blocking work

Decorative glow is not elevation. Borders, shadows, and backgrounds move together through named recipes.

### 6. Motion explains causality

Motion exists to show where something came from, where it went, whether work is progressing, or how hierarchy changed.

- Press feedback is instant.
- Menus and local panels are fast.
- Dialog and route transitions are measured.
- Large spatial changes may use a restrained spring.
- Continuous animation is reserved for real activity.

No new local spinner, pulse, or entrance animation is added when a shared recipe exists. Reduced motion is a first-class mode.

### 7. State is never silent

Every user action has an appropriate acknowledgement:

- Local and reversible: inline or optimistic feedback
- Completed mutation: concise toast when the result is not otherwise visible
- Persistent system condition: inline banner or ambient status
- Form problem: next to the field and summarized where necessary
- Destructive action: explicit confirmation proportional to risk
- Backend failure: distinguish it from empty data and offer recovery

Loading preserves the geometry of what will appear. Empty states explain the next useful action.

### 8. Responsive means transformation

Responsive design is not a desktop screen squeezed smaller.

- Tables prioritize columns or become record cards.
- Master/detail becomes navigation between master and detail.
- Side inspectors become sheets.
- Multi-pane editors become tabs or stacks.
- Kanban and canvases keep deliberate internal scrolling.
- Secondary actions collapse into an overflow menu.

Every route declares its compact, medium, and wide behavior before implementation.

### 9. Accessibility is part of the visual contract

Focus, contrast, target size, accessible name, keyboard order, error association, reduced motion, and zoom behavior are component responsibilities.

An unnamed dialog, duplicate field ID, keyboard-active disabled link, or icon-only touch control is a design defect, not merely an implementation detail.

### 10. Exceptions become named variants

The Workshop, Flow Editor, terminal, code editor, holographic marketplace cards, CRT theme, and Voxelized theme are allowed to be distinctive. Their differences must be expressed as named variants, page archetypes, or sanctioned palettes.

Anonymous CSS overrides are not a design language.

## Token usage standard

This section defines usage intent. The sole normative naming/mapping policy and the generated artifact that owns exact values are defined in the [implementation specification](./2026-07-13-hub-ui-coherence-implementation-spec.md#d2-canonical-token-schema); they must not be independently redefined here.

### Color

| Token role | Use | Do not use for |
|---|---|---|
| `canvas` | Page/workspace background | Cards, menus, controls |
| `surface-1` | Attached nav, inset region, quiet panel | Floating menus |
| `surface-2` | Default card, list row, form section | Modal/top layer |
| `surface-3` | Dropdown, popover, floating tool panel | Full page |
| `overlay` | Dialog, blocking sheet | Ordinary card |
| `border-subtle` | Dividers and quiet structure | Focus or selected state |
| `border-default` | Control/card boundaries | Destructive emphasis |
| `border-strong` | Active grouping and high-contrast separation | Every container |
| `text-primary` | Titles, values, essential content | Placeholder text |
| `text-secondary` | Body copy and supporting labels | Disabled state |
| `text-tertiary` | Metadata that remains readable | Essential instructions |
| `accent` / `on-accent` | Primary action, selection, focus, current location | Decoration or status |
| `brand` | Product identity and special brand moments | Routine action |
| status triplets | Genuine success/warning/danger/info state | Category decoration |

Every status family has foreground, surface, and border tokens. Accent is always paired with a validated on-accent color.

### Typography

| Role | Target | Use |
|---|---:|---|
| Display | 28px | Hero metric or rare orienting statement |
| Page title | 18px | One per page shell |
| Section title | 14px | Card/section hierarchy |
| Body | 13–14px | Primary reading and control labels |
| Label | 11–12px | Field/nav/meta label; uppercase only when useful |
| Caption | 12px | Secondary metadata and help |
| Mono | 12px | IDs, logs, and code-adjacent values |
| Telemetry | 10px | Nonessential canvas/system telemetry only |

Nine- and ten-pixel text is limited to nonessential canvas telemetry. It cannot carry instructions, state, or an action label.

### Spacing

The base scale is:

`0 · 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48px`

| Semantic alias | Default role |
|---|---|
| `control-gap` | Icon-to-label and compact control internals |
| `field-gap` | Label, control, helper/error |
| `card-compact` | Dense panel/card padding |
| `card` | Default card padding |
| `section` | Related page sections |
| `page-gutter` | Viewport-to-content edge |
| `page-section` | Major page groups |

Use scale values directly for component internals and semantic aliases for page/composition geometry. Off-grid spacing requires a named reason.

### Radius

`xs 2 · sm 4 · md 6 · lg 8 · xl 12 · full`

- `xs/sm`: indicators, compact controls
- `md`: buttons, inputs, rows
- `lg`: cards and popovers
- `xl`: dialogs and prominent containers
- `full`: pills, avatars, status dots

Themes may rescale the whole family. Components never read a one-off theme radius.

### Shadow and elevation

| Recipe | Use |
|---|---|
| `elevation-1` | Attached surface above canvas |
| `elevation-2` | Card/panel |
| `elevation-3` | Floating menu/popover |
| `elevation-4` | High floating surface |
| `overlay` | Dialog/sheet |
| `focus` | Keyboard focus only |
| `status-glow` | Rare live/status emphasis |

Never recreate elevation from an arbitrary background + border + shadow stack.

### Motion

| Token | Duration | Use |
|---|---:|---|
| Instant | 75ms | Press feedback |
| Fast | 150ms | Hover, focus, menu, local color/position |
| Normal | 250ms | Panel, toast, dialog |
| Slow | 400ms | Large spatial or status transition |

Easings are standard, enter, exit, and spring. A motion recipe owns both duration and easing.

### Layer

`base · sticky · navigation · dropdown · popover · modal · toast · command · debug`

Components consume named tiers. Feature code does not invent numeric z-index values.

## Responsive and density contract

| Mode | Width | Default behavior |
|---|---|---|
| Compact | `<768px` | Comfortable targets, drawer/horizontal section nav, one primary pane |
| Medium | `768–1279px` | Condensed shell, labels remain discoverable, two panes only when viable |
| Wide | `≥1280px` | Full navigation, compact density available, multi-pane workspaces |

Container queries are preferred for panels whose behavior depends on available pane width rather than the full viewport.

On coarse pointers, actionable targets reach at least 44px even when the visible control is smaller.

## Component doctrine

### A primitive owns

- Geometry and density
- All interactive states
- Focus and keyboard behavior
- Accessible naming/association
- Token usage
- Theme compatibility
- Reduced motion

### A composite owns

- Arrangement of primitives
- Domain meaning
- Responsive transformation
- Async/empty/error composition
- Local data behavior

### A page owns

- Route-level hierarchy
- Page archetype and scroll mode
- Which actions are primary, secondary, overflow, or destructive
- Permission-aware visibility
- State orchestration

A page does not own a new button, modal, card, select, or shadow system.

## The review test

Before a screen is complete, reviewers should be able to say yes to all of the following:

- It feels like Minion Hub before reading the logo.
- It remains itself in every supported theme.
- Its primary action and current state are obvious.
- Its compact layout is intentionally transformed.
- Its loading, empty, error, and permission states are designed.
- It can be used with keyboard, touch, reduced motion, and 200% zoom.
- It uses shared tokens and components or names its exception.
- Its Figma component/variant vocabulary matches the code vocabulary.
