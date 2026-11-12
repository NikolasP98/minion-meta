---
id: 2026-11-10-hub-storybook-layers-layouts
title: Hub Storybook in three layers, page Layouts, and an unslop polish proposal
stage: spec
status: draft
pass: 1
created: 2026-11-10
updated: 2026-11-11
repos: [minion_hub]
type: feature
---

# Hub Storybook in three layers, page Layouts, and an unslop polish proposal

> **Owner decision 2026-11-11:** Parts 1+2 committed onto hub `feat/storybook` (#648) as `904f179a` + `0e413ead`; the full 11-file unslop to-be patch approved to ship as its own PR.

Owner request (2026-11-10, verbatim):

- "add page layouts as another section to the storybook project, so we can showcase how components look next to eachother. Try simulating existing pages."
- "there should be 3 layers (check if you can implement nested groups, meaning that the current items can all be put under COMPONENTS, shared components under ATOMS, layouts under LAYOUTS, while keeping the components grouped like they currently are)"
- "Run this skill: https://github.com/heydamir/unslop to improve layouts and make them look more professional. LMK what the skill findings are before commiting changes (as-is vs to-be in figcraft)"

Nothing here is committed. Parts 1 and 2 sit in the working tree of a hub clone on branch
`feat/storybook-layers` (from `origin/feat/storybook`, hub draft PR #648). Part 3 exists
only as a patch file. The owner reviews the FigCraft proposal
(`2026-11-10-hub-storybook-layers-layouts.figcraft`, next to this file) before anything lands.

## AS-IS

- Storybook 10.6 (SvelteKit + Svelte CSF) lives only on hub branch `feat/storybook` (#648).
  It has 188 story files under `src/lib/stories/`, titled with 15 flat roots: `Shared/*`,
  `Hub/*`, `Data/*`, `Agents/*`, `Calendar/*`, `Overlays/*`, and so on. Primitives and
  composed components sit side by side. For example, `Overlays/Popover` is a
  `$lib/components/ui` primitive, while `Overlays/CommandPalette` is an app component.
- `.storybook/preview.ts` sets no `storySort`, so the sidebar order follows file import order.
- #648's `check-and-build` is red: about 900 svelte-check errors in story files. They come
  from untyped `<script module>` blocks (`(js)` diagnostics) plus "'children' is specified
  more than once", where `{...args}` already carries `children`.
- No story renders a page. The real pages exist only as routes (`src/routes/(app)/**`),
  each a thin `+page.svelte` that wraps a route-local `PageBody.svelte` fed by `data`.
- The unslop audit of five real pages (below) finds light slop. The hub has a real brand
  (MINION wordmark, 16 themes including the FACES Clinic Light/Dark pair), so unslop's
  polish mode applies.

## TO-BE

1. **Three roots, nested groups.** `Atoms/<group>/<Name>` holds every story whose
   `component` comes from `src/lib/components/ui/**` or `@minion-stack/ui`. The groups are
   Actions, Display, Feedback, Inputs, Layout and Overlays. `Components/<old group>/<Name>`
   holds everything else, with the old group kept exactly. `Layouts/<Module>/<Page>` holds
   page simulations. `storySort` orders the roots Atoms, Components, Layouts, and sorts
   titles alphabetically inside each root. Story order inside a file is unchanged
   (`includeNames` stays false).
2. **Typed stories.** Every story script is `lang="ts"` and `bun run check` reports 0
   errors, with no `ts-ignore`, `ts-expect-error`, `nocheck` or `any`.
3. **Layouts simulate real pages.** Each Layout renders the REAL route body and module
   layout (`routes/(app)/<module>/+layout.svelte` plus `PageBody.svelte`) inside an
   `AppShell` fixture. The fixture is the `(app)/+layout.svelte` markup (Sidebar, Topbar
   and one scroll owner) without its live-data effects. The data is invented and typed
   against the route's own `$types`, so a load-shape change breaks the fixture at check time.
4. **Unslop TO-BE (proposal only).** The polish patch below is reviewed in FigCraft as-is
   vs to-be. It ships only if the owner approves it, in its own PR.

Invariants:

- No story id is referenced anywhere (play tests, docs, CI, scripts; verified with a
  repo-wide grep), so the retitle breaks nothing.
- The design-token contract wins over unslop: semantic tokens only, no new raw colour.
  `lint:design` and `lint:tokens` show no new debt, with or without the to-be patch.
- The owner's card-header contract (`.card-h` uppercase caption) is kept.

## DELTA

| # | Transition | Evidence |
|---|---|---|
| D1 | 188 story titles rewritten mechanically from each story's `component` import path (map below); `storySort` added | mapping table; Storybook index lists 1,374 entries under the 3 roots |
| D2 | `<script module lang="ts">` / `<script lang="ts">` on every story file; 468 → 0 svelte-check errors, fixed by typing the fixtures and callbacks against the components' real props | `bun run check` → `COMPLETED 12815 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` |
| D3 | `src/lib/stories/Layouts/` gets 5 Layout stories (Default + `Default · Phone` each) and `_fixtures/` (AppShell, shell page-data, typed route fixtures) | `STORYBOOK_TESTS=1 bunx vitest run --project storybook src/lib/stories/Layouts` → `Test Files 5 passed (5)`, `Tests 10 passed (10)` |
| D4 | unslop polish patch (`hub-layouts-unslop-tobe.patch`, 11 files) — proposal, not applied | FigCraft `Layouts / <Page> · as-is` vs `· to-be` frames |

### D1 mapping (Atoms; every other story becomes `Components/<old title>`)

Atoms/Actions: Button, IconButton. Atoms/Display: Avatar, Badge, Chip, EntityChip,
MathFormula. Atoms/Feedback: DataSource, EmptyState, ProgressBar, Skeleton, Spinner,
StatusDot. Atoms/Inputs: Checkbox, Combobox, FormField, Input, MultiSelectFilter, Picker,
PickerCombobox, Radio, SegmentedControl, Select, Textarea, Toggle. Atoms/Layout: Card,
PageHeader, SideNav, Tabs. Atoms/Overlays: ContextMenu, DraggableDialog, Dropdown, Modal,
Popover, Tooltip.

That makes 35 Atoms and 153 Components. `Shared/Markdown` becomes `Components/Shared/Markdown`:
its component is `prompt/MarkdownView`, not a ui primitive, and the rule is mechanical.

### D3 Layouts

| Story | Page | Rendered from |
|---|---|---|
| `Layouts/POS/Sell` | `/pos/sell` | `routes/(app)/pos/+layout.svelte` + `pos/sell/PageBody.svelte` |
| `Layouts/CRM/Customers` | `/crm/customers` | `crm/+layout.svelte` + `crm/customers/PageBody.svelte` |
| `Layouts/CRM/Contact` | `/crm/[contactId]` | `crm/+layout.svelte` + `crm/[contactId]/PageBody.svelte` |
| `Layouts/Stock/Entries` | `/stock/entries` | `stock/+layout.svelte` + `stock/entries/PageBody.svelte` |
| `Layouts/Settings/Appearance` | `/settings/appearance` | `settings/+layout.svelte` + `settings/appearance/+page.svelte` |

Skipped:

- `/pos/appointments`: the calendar runway's window cache (`createCalendarWindowCache`)
  fetches neighbouring weeks from `GET /api/pos/appointments` on mount. Without an API it
  renders its fetch-failure state instead of the page.
- The assistant/chat home (`routes/(app)/home/+page.svelte`, 2,141 lines): it reads the
  live gateway connection, `agentChat`, `assistant` state and `createConnectedFetch`
  directly. There is no props seam to feed it fixtures.

Known limitation: the contact page's `ContactChat` opens a Supabase realtime channel. In
Storybook (no `PUBLIC_SUPABASE_*`) that throws inside an `$effect`. The page still
renders, and the vitest lane passes.

## D4 Unslop audit (polish mode)

The method comes from the third-party `unslop` skill (heydamir, CC BY 4.0). Where it
conflicts with the hub contract, the contract wins.

### Signs found (sign → location)

Surfaces and colour

- Status hues used as categories, so every row is highlighted:
  - Stock entry type: Issue in error red, Receipt success, Transfer info, Adjustment
    warning (`src/lib/components/stock/entry-type-badge.ts:15-19` via `EntryTypeBadge.svelte:24`).
    A routine outflow reads as an error.
  - Stock status: green Submitted on nearly every row (`src/lib/components/stock/stock-ui.ts:15`).
  - CRM origin: success/info pills for an attribution fact
    (`routes/(app)/crm/customers/PageBody.svelte:1014-1021`, CSS `:1180-1199`).
  - POS kind badge: accent for product, info for service, brand for bundle
    (`src/lib/components/pos/SellableCard.svelte:45-48,73`). The accent is the
    primary-action colour.
  - Contact journey tiles: accent/success/warning by type, so a booking is painted as a
    warning (`routes/(app)/crm/[contactId]/PageBody.svelte:1570-1590`).
- A categorical chart colour used as a status step: the score ramp uses `--color-emerald`
  (`src/lib/components/crm/crm-format.ts:6`).
- Coloured borders at rest: the CRM Reserved (warning outline) and Awaiting reply (accent
  outline) toggles (`crm/customers/PageBody.svelte:1147-1166, 1200-1220`). Both bypass the
  app-wide chip contract.
- Glow on a dot: `.await-dot` carries `--shadow-overlay` (`crm/customers/PageBody.svelte:1221-1228`).
- No gradients, glass, blobs or gradient text.

Type

- Heavy figure in every row: the score is weight 700 at page-title size
  (`src/lib/components/crm/ScoreBadge.svelte:51-52`).
- Uppercase tracked labels:
  - section-nav group labels (`src/lib/components/ui/foundations/SectionNav.svelte:255-263`);
  - settings card titles (`routes/(app)/settings/appearance/+page.svelte:28`);
  - record card headers (`.card-h`, owner contract).
- Two money formats on one screen, `S/ 380` in the CRM table next to `S/ 1,190.00` in
  cards. Both come from the one formatter (`formatMoneyShort` vs `formatMoney`).
- No italics and no negative tracking.

Icons

- Icons in several hues (the journey tiles and the origin pills).
- No emoji in the chrome.
- The Sparkles on "Analyze" marks a premium AI action and explains it, so it stays.

Spacing

- Mixed control heights in one toolbar: the CRM scope toggles are
  `--control-height-xs` (24 px) beside the `sm` Select and search
  (`crm/customers/PageBody.svelte:1150,1203`).
- The record key is clipped: the id column is a fixed 96 px, so `STE-2026-00141` reads
  `ENT-STE-…` (`src/lib/components/data-table/DataTable.svelte:822`).
- Stock type pills stretch to the column width while the status pills hug their text.

Copy

- A trailing period on a subtitle (`messages/en.json:4939`, `es.json:4939`).
- Jargon source label "Harvested from comms" (`messages/en.json:1655`). The ES string
  already reads "Importado de mensajes".
- No greetings, exclamation marks, hype words or fake-looking data.

Components

- Tallies on every row: R/F/M micro-bars beside every score (`ScoreBadge.svelte:29-40`).
- A full-accent fill used for a selection: the language picker is a hand-rolled
  `Button primary/ghost` row (`settings/appearance/+page.svelte:34-46`). Governance
  requires `SegmentedControl` here.

Motion

- `animate-pulse` on a non-live state: the disconnected-gateway dot
  (`src/lib/components/layout/ConnectionStatusIndicator.svelte:88`). The connecting state
  is live and keeps its pulse.

Visuals: none needed. These are app screens with no decorative filler.

### Direction

- **Product**: the day sheet of a small clinic or shop: the till, the appointment book,
  the patient record and the stock room, for a front desk of two to five people. FACES
  Sculptors is the live tenant.
- **Character**: steady, exact, quietly warm.
- **World**: a clinic reception desk: the appointment book, the receipt roll, the
  patient file. It reads as a night-shift instrument panel in the dark themes and as
  paper-white in Clinic Light.
- **Moments**: the money and the patient. On the till, that is the total and the Charge
  button (the accent). On a patient row, the engagement score and funnel stage. On the
  record, the journey strip.
- **Signature**: every amount in tabular `S/` figures from the one formatter. Colour is
  spent only where a number or a state needs attention.

### Passes (what the to-be patch changes)

1. **Spacing**: the CRM scope toggles move to `--control-height-sm` with `--space-3`
   padding, so they match the toolbar.
2. **Colour**:
   - Stock type pills become neutral (the icon carries in/out). Submitted becomes neutral;
     draft (info) and cancelled (error) keep their hue.
   - POS kind badges become neutral.
   - CRM origin becomes quiet text: ad in `text-secondary`, organic in `text-tertiary`.
   - The scope toggles follow the chip contract: a hairline on `surface-2` at rest, an
     accent tint when on.
   - The score ramp keeps one highlight (≥75 `success-fg`); lower bands step down the
     text roles. No categorical emerald, and no warning for a mid score.
   - The language picker becomes `SegmentedControl` (accent-tinted active).
3. **Icons**: the journey tiles take the secondary text role on `surface-2`. Only a
   purchase, the conversion, keeps `success`.
4. **Copy**:
   - The stock subtitle drops its trailing period (EN and ES).
   - `crm_harvested` EN becomes "Imported from messages", matching ES.
5. **Type**: the score figure moves from 700 to `--font-weight-semibold`.
6. **Layout**: no change; sections and their order are kept.
7. **Details**: no shadow on the awaiting-reply dot.
8. **Visuals**: none.
9. **Motion**: the disconnected dot stops pulsing.

Suggestions only (not in the patch, owner's call):

- Sentence-case the section-nav group labels and settings card titles. This is the
  system label style; the `.card-h` record-header contract stays uppercase.
- Hide the R/F/M bars in the customers table and keep them on the record's score card.
- Size the DataTable id column to the code length instead of 96 px.
- Show healthy stock as neutral, keeping only low (warning) and out (error) in colour.
  This needs a `neutral` path in `stockTone`.
- Use one money format per screen.
- Make the stock type pill hug its label like the status pill.

No new token is needed for any of the above.

## Proposal file

`2026-11-10-hub-storybook-layers-layouts.figcraft` (next to this spec) has these pages:

- Copied from the master (as-is reference): `Point of Sale / pos/sell`, `CRM / crm/customers`,
  `CRM / crm/be36a27f-…` (contact), `Stock / stock/entries`, `Settings / settings/appearance`.
- `Layouts`: 20 frames, `Layouts / <Page> · as-is|to-be` plus a `· Phone` pair per page.
  They are real layers, built from DOM captures (`extract.js` + `fcbuild.build`) of the
  Storybook stories at 1440×1000 and 390×844.
  A few SVG icon shapes with an unsupported stroke cap were dropped by the builder, mostly
  the logo-picker marks on Settings.
- `Unslop findings`: this section's audit, Direction and passes.

`lint:design` (`no changed file increased governed debt`) and `lint:tokens` (`violations 0`)
pass with and without the to-be patch applied.

## Open ends

- Commit or PR: nothing is committed (owner review first). On approval, Parts 1+2 become
  one hub PR stacked on #648; the unslop patch becomes its own PR against master after
  #648. Retitling will conflict trivially with #652 and the popover PR.
- `/pos/appointments` and the assistant home need a fixture seam before they can be Layouts.
- Spec index: `node scripts/spec-index.mjs` has not been run, because nothing is committed.
