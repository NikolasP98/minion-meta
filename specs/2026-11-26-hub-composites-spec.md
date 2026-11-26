---
id: 2026-11-26-hub-composites-spec
title: Composites — tables, charts and the workshop canvas work from the keyboard (a11y program S5)
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

# Composites (a11y program S5)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-26): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live."

Board stub for the Spec Kit feature **[`specs/154-hub-composites/`](154-hub-composites/spec.md)**.

Three composites still need a mouse. A table is not one Tab stop: every button inside it is (over 100 with 50 rows on screen), cells are reachable only after a click, and sorting says nothing. Charts read as "Chart" in 24 of 28 places, pie, sankey and scatter have no data table, and legend and drill-down are pointer only. On the workshop canvas, adding, moving and linking agents, opening elements, and pan and zoom are pointer only. The slice makes the table a real grid (one Tab stop, cell navigation, Enter activates, sort announced), gives every chart a name, a data table and keyboard buttons, and gives the workshop an equivalent list plus zoom buttons.

**Out of scope:** screen-reader spoken-output tests and label hygiene (S6); the story-test lane's CSS; any change to pointer behaviour or to the look at rest.

**Verification:** `assertPattern(grid)` and `assertPattern(menu)`, type check for chart names, extended chart and workshop tests, real keys on a Storybook build and on the local QA stack, `bun run a11y` with baselines not rising.
