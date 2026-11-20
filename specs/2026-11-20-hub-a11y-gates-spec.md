---
id: 2026-11-20-hub-a11y-gates-spec
title: Accessibility gates first — CI fails on any new accessibility regression (a11y program S0)
stage: spec
status: draft
verdict: pending
type: feature
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub, minion-meta]
tags: [ui, test]
proposal: 2026-11-20-hub-accessibility-program
---

# Accessibility gates first (a11y program S0)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Program approved the same day; S0 makes regressions fail CI before any fix lands.

Board stub for the Spec Kit feature **[`specs/137-hub-a11y-gates/`](137-hub-a11y-gates/spec.md)**
(constitution: the board reads only top-level `specs/*.md`).

Slice S0 of the approved [hub accessibility program](../proposals/2026-11-20-hub-accessibility-program.md):
automated accessibility checks on every swept page and every component story against
decrease-only baselines, our own WAI-ARIA pattern-assertion helper, the two orphaned
accessibility specs in CI, and a ratchet on suppressed compiler accessibility warnings.
No UI or behavior change; fixes are S1–S6.

**Out of scope:** fixing any recorded violation (S1–S6), screen-reader output tests, RTL, per-theme story checks, the `--full` sweep matrix in CI, `minion_site`. Full list in the Spec Kit spec.

**Verification:** one seeded failure per gate (page, story, pattern helper, orphaned specs, suppression count) fails the slice PR, then is reverted; the slice PR is green on the committed baselines; CI time stays within the sweep's 15-minute budget plus ≤ 6 minutes for the new jobs (SC-001–SC-005 in the Spec Kit spec).
