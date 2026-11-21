---
id: 2026-11-20-hub-a11y-gates-spec
title: Accessibility gates first — CI fails on any new accessibility regression (a11y program S0)
stage: spec
status: merged
verdict: approved
type: feature
pass: 2
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
one command (`bun run a11y`, same in CI) that runs five gates and prints one JSON document:
automated accessibility checks on every swept page and every component story against a
decrease-only ledger, our own WAI-ARIA pattern-assertion helper, the two orphaned
accessibility specs, and a ratchet on suppressed compiler accessibility warnings.
No UI or behavior change; fixes are S1–S6. Pass 2 (2026-11-20) corrected the AS-IS
(the sweep's ledger was never committed; 84 suppressed warnings, not 80; cold story runs
are not repeatable) and added the one-command and documentation requirements.

**Out of scope:** fixing any recorded violation (S1–S6), screen-reader output tests, RTL, per-theme story checks, the wide viewport and `--full` sweep matrix in CI, committing the sweep's own six-rule ledger (spec 014), `minion_site`. Full list in the Spec Kit spec.

**Verification:** one seeded failure per gate (page, story, pattern helper, orphaned specs, suppression count) fails its gate, then is reverted; the slice PR is green on the committed baselines; the sweep stays within its 15-minute step budget and the new job finishes before the longest existing one; the command's JSON output from a real run is in the PR (SC-001–SC-007 in the Spec Kit spec).
