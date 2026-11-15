---
id: 2026-11-14-hub-assistant-pill-status-followups
title: Assistant pill bubble — human tool labels and a singular tool count
status: draft
created: 2026-11-14
updated: 2026-11-14
repos: [minion_hub, minion]
---

# Assistant pill bubble — human tool labels and a singular tool count

## AS-IS

Hub #675 adds a hover bubble on the collapsed floating assistant. While a tool
runs, the bubble shows `Using {tool}…`, where `{tool}` is the gateway tool id with
`_`, `.` and `-` replaced by spaces (`crm_search_contacts` becomes
"crm search contacts"). The id is not localized and leaks internal naming
(`src/lib/assistant/pill-status.ts`, `TODO(handoff)` beside the `phase: 'tool'`
return).

The tool count reuses `ai_toolUses` ("{count} tool uses"), which has no singular
form. The bubble therefore hides the count for a single call:
`FloatingAssistant.svelte` has a `shortcut:` comment above
`{#if pill && pill.toolUses > 1}`.

The same unlabeled raw names appear in the expanded chat's grouped tool row
(`ChatBlocks.svelte`, `summary={[...new Set(group.tools.map((t) => t.name))].join(' · ')}`).

## TO-BE

- Every tool the gateway advertises carries a short localized label (en/es),
  for example "Searching contacts". The bubble and the grouped tool row both show
  that label, and fall back to today's spaced id only when a label is missing.
- `ai_toolUses` gains a plural form (`1 tool used` / `{count} tool uses`). The
  bubble then shows the count from one call up, and its `shortcut:` comment is
  removed.

## DELTA

1. Gateway tool catalog: add an optional `label` (or i18n key) per tool. The hub
   reads it through the existing capability/tool inventory. Test: a catalog
   entry with a label renders it; one without falls back to the spaced id.
2. Hub: `pillStatus()` takes a `labelFor(name)` resolver. Unit test in
   `pill-status.test.ts`.
3. Hub i18n: pluralize `ai_toolUses` in en/es and drop the `> 1` guard. Test:
   one call shows "1 tool used".
