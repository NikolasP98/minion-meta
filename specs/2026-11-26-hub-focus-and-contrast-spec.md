---
id: 2026-11-26-hub-focus-and-contrast-spec
title: Focus and contrast — the focus ring and links are visible in every theme (a11y program S4)
stage: spec
status: implementing
verdict: approved
type: feature
pass: 1
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub, minion-meta]
tags: [ui, test]
proposal: 2026-11-20-hub-accessibility-program
---

# Focus and contrast (a11y program S4)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-26): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live."

Board stub for the Spec Kit feature **[`specs/153-hub-focus-and-contrast/`](153-hub-focus-and-contrast/spec.md)**.

The focus ring and links take the user's accent colour, which is not readable on every theme: measured over all themes and accents, the ring is below 3:1 in 255 of 968 combinations and link text below 4.5:1 in 609. The slice derives a readable shade of the same accent for both (unchanged where the accent already passes), underlines links in running text, restores the focus indicator on the 22 elements that switch it off, and adds forced-colours support.

**Out of scope:** status colours, badges and charts (S5); label hygiene and screen-reader tests (S6); any change to a theme's palette or to the accent itself.

**Verification:** a unit test over every theme × accent, the contrast measurement re-run on the new variables (0 failing pairs), a lint rule for bare `outline-none`, real keys and forced-colours emulation on a Storybook build, `bun run a11y` with baselines not rising.
