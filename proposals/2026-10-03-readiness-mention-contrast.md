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

## HC-043 follow-on, recorded at the user-requested pause

HC-042's user-bubble-only fix is signed in Hub `875fb04369a3787aa93fb8d35f72f89c7946d460`. Its native proof does not close ordinary/error surfaces. The same synthetic actual-component fixture captured a New York dark ordinary mention at foreground rgb(37,99,235), background rgb(24,24,27), 16px/600: contrast 3.42779813:1. Record this separately as HC-043. No runtime fix is included.

Before choosing a correction, measure every supported ordinary/assistant/error surface with actual rendered background composition. The earlier `mention-other-surfaces-contrast-v1.json` contains **invalid derived error-surface ratios**: its simplistic RGB parser did not convert CSS oklab backgrounds. Preserve that receipt as historical raw evidence only; recalculate using browser-native canvas color conversion or a correct Oklab conversion. Do not quote its error-surface ratios as valid results. TO-BE: readable resolved identities with non-color distinction, no regression to the accepted user-bubble scope. DELTA: a separately reviewed semantic foreground contract, real theme/viewport screenshots, computed color evidence and adjacent mention behavior tests. The exact global `.mention` selector now carries the handoff pointer.
