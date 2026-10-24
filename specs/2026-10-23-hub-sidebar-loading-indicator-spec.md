---
id: 2026-10-23-hub-sidebar-loading-indicator-spec
title: Hub sidebar loading indicator on the section icon or the header divider
stage: spec
status: draft
pass: 1
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub, minion-meta]
type: feature
tags: [ui]
verdict: pending
---

## 0. Product

Spec Kit feature: [`specs/038-sidebar-loading-indicator/`](038-sidebar-loading-indicator/spec.md), with `plan.md` and `tasks.md` alongside.

The hub's one global busy indicator leaves the sidebar footer. A per-user Appearance setting places it either on the module/section icon in the sidebar header (`icon-ring`: the house Spinner replaces the icon while busy) or on the hairline under the organization line (`divider-bar`: an indeterminate accent sweep). The footer ring slot is removed. Three owner decisions sit at the top of the Spec Kit spec with recommendations (default `icon-ring`, no `footer` value, 1 px bar).

**Out of scope:** determinate 0→100 % progress for the global indicator (no size signal exists — the busy state is boolean, fed by `navigation.load` and foreground actions); a pulsing variant; the mobile Topbar; a save-state toast.

**Verification:** SC-001 to SC-003 in the Spec Kit spec; browser proof screenshots per `tasks.md` T014 in the hub PR body.
