---
id: 2026-11-28-hub-components-ai-ready
title: Make hub components readable by agents — one generated manifest, served by MCP
status: draft
created: 2026-11-28
updated: 2026-11-28
repos: [minion_hub]
tags: [ui, docs]
value: 7
effort: M
source: astryx-comparison-2026-11-28
---

# Make hub components readable by agents

Owner (2026-11-28): "I want the MINION component/primitives to be as accessible, agent-friendly, and
documented and "complete" as this design system [Astryx]. Compare functionality of our vs their
implementation; where are the gaps and how would it make the element ai-ready."

Visual report, with the full matrix (106 Astryx components, 5 axes, evidence per cell):
https://claude.ai/artifact/91qHJkoooXUMj2JyzBUGNC

## Problem (AS-IS)

Evidence is hub `master` `9eca9db2` and `@astryxdesign/core` 0.7.17, read from its `*.doc.mjs` files
and its CLI.

- **An agent cannot read our component contract without reading source.** Astryx answers
  `npx @astryxdesign/cli component Dialog` with import, props, anatomy, do/don't and theming,
  generated from a doc file next to the component. Our closest artifact is
  `src/lib/routes/component-design-registry.ts`: 40 entries with variants, states and token roles,
  and no description, accessibility rules, do/don't or example. `foundations/Dialog.svelte` is
  739 lines; 5 of its 22 props have JSDoc.
- **Nothing serves the contract.** The hub has no `llms.txt`, component CLI or component MCP tool.
  `/api/mcp` exposes only `sandbox_*` and `whoami`. Storybook is behind Cloudflare Access, and no
  story renders `foundations/Dialog` (only the deprecated `Modal`).
- **The registry covers half the barrel.** 14 of the 29 exports in `ui/index.ts` are not
  registered (Combobox, PickerCombobox, Picker, ContextMenu, MultiSelectFilter, SegmentedControl,
  Chip, Avatar, ProgressBar, SideNav, MathFormula, DataSource, DraggableDialog, Modal), nor are
  DataTable, BoardView, Chart or the AI chat kit.
- **Names are not always required by type.** Dialog (`DialogName`), Select, Tabs, Toggle,
  IconButton, Checkbox, Radio, MultiSelectFilter and SegmentedControl require one. Input, Textarea,
  Combobox, PickerCombobox, Popover and ProgressBar take an optional `label`.
- **Bypasses pass the gates.** `design-lint.mjs` has `bare-button` and `native-select`, but no rule
  for a raw `<input>` (142 files), `type="number"` (38), a native checkbox (21), a date input (17)
  or `<dialog>` / `role="dialog"` markup outside the foundation (up to 20 files; some matches are
  selectors). The missing primitives behind these copies are Banner, Stepper, CodeBlock,
  NumberInput, DateInput/TimeInput, Collapsible, TreeList, Link and Kbd.

Already at or above Astryx: the accessibility program S0–S6 (focus ring, dialogs, menus, grid,
charts, announcer), `DialogName` and the dirty guard on Dialog, token contract and lint ratchets, and
runtime driving by role (`data-testid` appears in 4 files). The sandbox block kit (spec 049) is
already Astryx-grade for agents, but only for four `/sandbox` block kinds.

## Fix (TO-BE)

A component is AI-ready when an agent can (a) find it by search, (b) read props, variants,
accessibility rules, do/don't and one example without rendering, (c) get a type or lint failure when
it uses it wrongly or bypasses it, and (d) find it at runtime by role and name.

Extend the registry we already drift-check instead of adding a second source of truth:

1. **S1 Manifest.** Add `summary`, `keywords`, `a11y` (role, name rule, keys, focus), `do`, `dont`,
   `example` (a story id) and `replaces` to each registry entry. A script merges them with props
   generated from the Svelte types (`svelte2tsx` 0.7.63, already installed through svelte-check) into
   `static/components.json`.
2. **S2 Serve it.** Read-only MCP tools `components_search` and `components_get` on `/api/mcp`, a
   `bun run components <query>` script, and an `llms.txt` pointing at both.
3. **S3 Coverage.** Register every export of `ui/index.ts` and `foundations/index.ts`, plus
   DataTable, BoardView, Chart and the AI kit; add stories for `foundations/Dialog` and `Sheet`.
4. **S4 Names by type** on the six components above.
5. **S5 Lint rules** `raw-dialog`, `raw-text-input`, `raw-checkbox`, `raw-date-input`, decrease-only.
6. **S6 Docs pages** in Storybook generated from the manifest.
7. **S7 Missing primitives**, most-copied first (Banner, Stepper on `@zag-js/steps`, CodeBlock,
   NumberInput, Date/Time input, Collapsible, TreeList on `@zag-js/tree-view`, Link, Kbd).
8. **S8 Runtime field**: the `getByRole` query per entry, read by the e2e helpers.

Example, after S1–S3. Today an agent asking "how do I open a dialog?" greps six dialog components
and about 20 hand-made ones, then reads `FOUNDATIONS.md` and 739 lines of source. After:

```json
// components_get { "id": "overlay.dialog" } — trimmed
{
  "id": "overlay.dialog",
  "import": "import { Dialog } from '$lib/components/ui/foundations'",
  "summary": "Modal dialog on the native <dialog>. For a yes/no decision use overlay.confirm-dialog.",
  "props": [{ "name": "title", "type": "string", "required": "unless labelledBy" }],
  "a11y": { "role": "dialog | alertdialog", "name": "required by type (DialogName)",
            "focus": "returns to the opener on close" },
  "dont": ["Hand-write <dialog> (lint: raw-dialog)"],
  "example": "Overlays/Dialog › Edit form",
  "runtime": "getByRole('dialog', { name: title })",
  "replaces": ["ui/Modal", "ui/DraggableDialog"]
}
```

Invariants: no component behaviour or appearance changes in S1–S3, S5, S6 and S8; the registry
stays the only place variants are declared.

## Proof (DELTA)

| Slice | Transition | Test that proves it |
|---|---|---|
| S1 | registry entry → manifest entry with props from source | fails when an entry lacks `summary`, `a11y` or `example`, or a source prop/variant is missing |
| S2 | no component tool → two MCP tools + script | `components_get("overlay.dialog")` returns the entry; tool list test |
| S3 | 40 entries → every exported component | fails when a barrel export is unregistered |
| S4 | optional `label` → required | `svelte-check` fails on an unnamed use; a11y ledgers do not grow |
| S5 | raw elements pass → counted and capped | new raw element in a changed file fails `lint:design` |
| S6 | autodocs only → usage, do/don't, a11y per entry | each manifest entry has a docs page |
| S7 | N copies → one primitive | the matching S5 ceiling goes down |
| S8 | queries per test → one per entry | a renamed role fails one test |

## Not covered

- **Owner decisions.** S2: a public `llms.txt` / `components.json` would expose docs that Storybook
  keeps behind Cloudflare Access; default is MCP-only (signed in). S7: a Zag date picker or number
  input adds `@zag-js/date-picker` or `@zag-js/number-input` (new dependencies); the alternative is
  styled native inputs. No feature is removed and no brand colour changes.
- Astryx's site and Storybook were not rendered in a browser; its CLI reads the same doc files.
  Astryx is uneven too: 20 of its 272 doc files have a structured accessibility section, 31 have
  examples.
- Usage counts are `git grep` file counts and are upper bounds. No screen reader was used.
- `svelte2tsx` props extraction on our components is unproven until S1.
- The site (`minion_site`) and `@minion-stack/ui` consumers outside the hub are out of scope.
