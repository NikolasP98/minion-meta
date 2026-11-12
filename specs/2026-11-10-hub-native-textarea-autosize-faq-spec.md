---
id: 2026-11-10-hub-native-textarea-autosize-faq-spec
title: Native textarea auto-grow and one-at-a-time FAQ answers
stage: spec
status: draft
pass: 1
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
type: feature
tags: [ui]
source: owner-request-2026-11-10
---

# Native textarea auto-grow and one-at-a-time FAQ answers

## 0. Product

Chat boxes should grow with what you type without a script measuring them, and the public FAQ
should open one answer at a time. Less JavaScript, same behavior, and both visible in Storybook.

Browser facts (PostHog, last 30 days of hub pageviews): the majority is Chrome/Edge/Opera 154-157,
then Firefox 155-159 and mobile Safari 26-27. Desktop Safari 18 is 2 users / 79 pageviews. Safari 18
has `details name`; its `field-sizing` support is uncertain, so the scripted resize stays as the
fallback.

## 1. AS-IS

- `src/lib/components/ai/AiPromptInput.svelte`: `resize()` sets `style.height = scrollHeight` capped at
  `MAX_ROWS = 8` lines, toggles `overflow-y`; runs in an effect on `value` and after submit.
- `src/lib/components/my-agent/ChatInput.svelte`: `autoGrow()` caps at 96 px focused, 52 px blurred;
  min-height 21 px.
- `src/lib/components/doors/faq/Public.svelte`: each entry is `<details class="entry">` with no
  `name`, so any number can be open at once.
- Stories: `AI/AiPromptInput` and `Chat/ChatInput` exist; there is no `Doors` story.

## 2. TO-BE

- Where `CSS.supports('field-sizing', 'content')` is true, the textarea grows through CSS
  (`field-sizing: content`, `min-height`, `max-height` in `lh`); the scripted resize does not run.
- Elsewhere the scripted resize is unchanged. Min height, max rows, scrolling beyond the cap and
  the reset after sending behave identically in both paths.
- Every entry of one FAQ shares a `name` unique to that door instance (`$props.id()`), so only one
  is open at a time and two FAQ doors on one page do not interfere. Browsers without `details name`
  allow several open, which is acceptable.

## 3. DELTA

### Slice 1: native auto-grow and FAQ exclusivity

**Topics:** `ui`

| # | Transition | Proof |
|---|---|---|
| D1 | `AiPromptInput` grows by CSS when supported | story states `Grows 1 line`, `Grows 6 lines`, `Grows 20 lines capped` in the storybook lane |
| D2 | `ChatInput` grows by CSS when supported | same three states in `Chat/ChatInput` |
| D3 | scripted fallback kept | `resize()`/`autoGrow()` early-return only when supported; existing mounted tests (jsdom has no `CSS`, so the fallback runs) |
| D4 | FAQ `name` per door instance | `Doors/FaqPublic` play function opens entry 2 and asserts entry 1 closed |

## 4. Out of scope

Other native-CSS adoptions (anchor positioning, invoker commands, customizable select), any change
to the FAQ editor, a new shared textarea component.

## 5. Verification

In the hub PR: targeted vitest, `STORYBOOK_TESTS=1 bunx vitest run --project storybook` on the three
story files, `bun run check`, `bun run lint:design && bun run lint:tokens`, prettier.
