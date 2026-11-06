---
id: 2026-10-03-readiness-mention-contrast-spec
title: Restore readable resolved mentions in user message bubbles
stage: spec
status: review
pass: 1
verdict: pending
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [ui, test]
type: fix
proposal: 2026-10-03-readiness-mention-contrast
---

# User-bubble mention contrast

## AS-IS

In the actual ChatMessage native fixture, the resolved `.mention` foreground and user bubble background are both rgb(59,130,246), contrast 1:1. The global `src/app.css` accent text overrides the bubble's semantic on-accent text. `hc039-after-initial-v1.png` retains the before image; synthetic fixture only, no production writes.

## TO-BE

Resolved names in user bubbles use the existing semantic on-accent foreground and remain distinguishable by underline and the existing weight. Plain text, data-user-id, escaping and selection remain unchanged. Global mention styling outside this user-message scope remains unchanged. Light and dark preset themes and narrow layouts remain legible.

## DELTA

1. Add an explicit `chat-user-message` class only on the current user bubble in `src/lib/components/chat/ChatMessage.svelte`.
2. Add a Svelte-scoped `.chat-user-message :global(.mention)` rule with `color: inherit` and `text-decoration: underline`. Inheritance consumes the bubble's existing `--color-on-accent`; add no raw color or theme override. Keep the global `.mention` rule for all other contexts.
3. Remove the HC-042 handoff comment once qualified. Update the UI governance skill: inspect computed nested foreground/background in actual components, including filled semantic surfaces, rather than treating token compliance alone as contrast proof.
4. Retain the original screenshot and measured 1:1 case. Build source-bound actual ChatMessage fixtures; measure computed resolved mention/background contrast at least 4.5:1 for the normal small text in both dark/light themes. Prove an ordinary unfilled mention keeps accent styling, and the actual error branch keeps its prior foreground. Capture desktop and390px images, check document overflow, and retain textual identity/HTML escaping assertions. This fixture may coexist with HC039 but the two changes get separate source/evidence receipts.
5. Run changed-source formatting, design and token gates; focused actual ChatMessage/alias tests; independent scope review. No shared package, global design token, serializer or agent/data mutation is part of this correction.

## Authorization

The user authorized all readiness fixes and UI governance lessons. This narrowly scoped UI-only fix is reviewed by the parent and an independent Sol agent before implementation. Merge and deployment remain separate.
