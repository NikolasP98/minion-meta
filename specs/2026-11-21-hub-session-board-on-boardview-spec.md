---
id: 2026-11-21-hub-session-board-on-boardview-spec
title: The session task board works without a mouse — it moves onto the shared board (a11y program S1)
stage: spec
status: review
verdict: pending
type: feature
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub, minion-meta]
tags: [ui, test]
proposal: 2026-11-20-hub-accessibility-program
---

# The session task board works without a mouse (a11y program S1)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-21): "Yes, start S1".

Board stub for the Spec Kit feature **[`specs/146-session-board-on-boardview/`](146-session-board-on-boardview/spec.md)**.

The task board on an agent's Monitor tab is the only board where a task can be moved only by dragging with a mouse. It moves onto the shared board component, so each card gets a "Move to…" button, moves are announced, and focus follows the card. Mouse drag stays. FigCraft as-is/to-be demo: [`session-board.figcraft`](146-session-board-on-boardview/session-board.figcraft).

**Out of scope:** keyboard drag (S3), NavigationGuardModal and CommandPalette (other S1 specs), a phone layout for the panel.

**Verification:** a keyboard-only move test, `assertPattern` on the move menu, `bun run a11y` with baselines not rising, the existing board tests unchanged, every check green on the hub PR.
