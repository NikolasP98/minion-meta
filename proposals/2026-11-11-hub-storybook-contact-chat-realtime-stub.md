---
id: 2026-11-11-hub-storybook-contact-chat-realtime-stub
title: Storybook CRM contact layout throws from the chat panel's realtime channel
status: review
created: 2026-11-11
updated: 2026-11-15
repos: [minion_hub]
effort: S
source: spec 2026-11-10-hub-storybook-layers-layouts
duplicate_candidate: postmerge-minion-hub-d3f8d16a2e95
---

# Storybook CRM contact layout throws from the chat panel's realtime channel

## AS-IS

`Layouts/CRM/Contact` renders the real contact `PageBody`. It was added in `0e413ead` on hub
`feat/storybook` (#648). The page's chat panel opens a Supabase realtime channel on mount. In
Storybook there is no backend, so that call throws. The page still renders and its play tests
pass, but the story logs an uncaught error. The site is marked `TODO(handoff)` in
`src/lib/stories/Layouts/CrmContact.stories.svelte`.

## TO-BE

The contact layout story renders without an uncaught error. The chat panel shows its
offline/empty state in Storybook. Production behaviour does not change.

## DELTA

Pick one of the following:

1. Let the chat panel take its realtime subscription as an injectable prop or context, with
   production as the default, and have the story pass a no-op.
2. Add a Storybook-only alias for the realtime client module in `.storybook/main.ts`, following
   the existing `$env` shim pattern.

Test: the story's play function asserts that no `pageerror` fires.

## Out of scope

The `/pos/appointments` and assistant/chat-home layouts. Both were skipped because they fetch
live data on mount. They need the same kind of injection before they can get a layout story.

## Reconciliation note (2026-11-15)

Same defect as `postmerge-minion-hub-d3f8d16a2e95` (same `TODO(handoff)` marker, same file,
same PR #648, same root cause). That proposal is richer in root-cause framing but already
`status: approved`, so this sweep cannot retire it per the no-touch-approved rule. Flagging
this proposal for a human to pick the canonical and close out the other side manually.
