---
id: 2026-11-26-hub-primitive-contracts-spec
title: Primitive contracts — every shared widget keeps the keyboard and says what it is (a11y program S3)
stage: spec
status: shipped
verdict: approved
type: feature
pass: 1
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub, minion-meta]
tags: [ui, test]
proposal: 2026-11-20-hub-accessibility-program
---

# Primitive contracts (a11y program S3)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-26): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live."

Board stub for the Spec Kit feature **[`specs/152-hub-primitive-contracts/`](152-hub-primitive-contracts/spec.md)**.

The hub's shared widgets (dialogs, menus, lists, boards, loading placeholders) each get the keyboard behaviour and the roles their pattern requires, proven by `assertPattern`. It ships as five hub PRs by widget family: dialogs (with the two keyboard blockers left from S1), menus and lists, board moves with keyboard drag, status and labels, and the eight hand-rolled modals.

**Out of scope:** focus rings and contrast (S4), DataTable / charts / workshop canvas (S5), app-wide label hygiene and screen-reader tests (S6).

**Verification:** `assertPattern` per widget, Escape closes the unsaved-changes prompt, `bun run a11y` with baselines not rising, every check green on each hub PR.
