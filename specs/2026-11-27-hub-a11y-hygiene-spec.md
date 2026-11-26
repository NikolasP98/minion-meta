---
id: 2026-11-27-hub-a11y-hygiene-spec
title: Hygiene — translated names, alerts that interrupt only when they must, named tables, real dialogs, pinned accessibility tree (a11y program S6)
stage: spec
status: implementing
verdict: approved
type: feature
pass: 1
created: 2026-11-27
updated: 2026-11-27
repos: [minion_hub, minion-meta]
tags: [ui, test]
proposal: 2026-11-20-hub-accessibility-program
---

# Hygiene (a11y program S6)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-26): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live."

Board stub for the Spec Kit feature **[`specs/155-hub-a11y-hygiene/`](155-hub-a11y-hygiene/spec.md)**.

The last slice closes what the earlier ones recorded. 53 accessible names are hard-coded English inside the Spanish UI and nothing stops a new one; 56 of 57 tables are announced only as "Table"; about 39 of 125 alerts interrupt a screen reader without need, and an early toast can go unannounced; the five workshop element panels are not dialogs; and nothing pins what a screen reader is given for the complex widgets. The slice translates the names and adds a lint rule, requires a name on every table, keeps `alert` for errors that follow the user's own action, makes the panels real dialogs, and adds accessibility-tree snapshot tests for five widgets.

**One decision with the owner:** the program names a screen-reader test library that would be a new dependency; the spec uses Playwright's built-in accessibility snapshots (no new dependency) unless the owner prefers the library.

**Out of scope:** migrating the 95 literal `title` / `placeholder` strings (counted, decrease-only), hard-coded visible headings, the items already waiting for the owner (accent as text, the story-test lane).

**Verification:** lint rules, type check for table names, mounted tests, the dialog pattern assertion, snapshot suite in the a11y gate, real-browser reads on Storybook and on the local real-renderer build.
