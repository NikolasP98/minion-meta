---
id: 2026-10-03-readiness-mention-contrast
title: Preserve readable mentions on user message backgrounds
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [ui, test]
type: fix
---

# Mention foreground contrast

The user authorized all readiness findings. HC-042 is an adjacent visual defect found during native HC-039 qualification, separate from its directory ownership change.

## AS-IS

The actual ChatMessage user bubble uses the semantic accent background and on-accent foreground, but src/app.css:1448 overrides resolved mention text with accent. Dedicated headless Chromium measured both the mention foreground and the bubble background as rgb(59,130,246); the name is invisible. The synthetic actual-component screenshot is hc039-after-initial-v1.png. No production write or session was used.

## TO-BE

Resolved mentions remain visibly readable on user bubbles in dark and light themes, with a non-color distinction, while ordinary, assistant and error surfaces retain existing styling. Preserve the rendered mention identity and escaped text.

## DELTA

Add one explicit scope on the actual user bubble and override its descendant mention foreground to inherit that semantic on-accent text; underline provides distinction. Check actual browser computed colors and screenshots at desktop/mobile and light/dark. No global accent token change, new color literal, package fork or markup serializer change.
