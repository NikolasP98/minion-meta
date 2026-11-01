---
id: 2026-11-01-hub-nav-home-landing-sections-spec
title: Hub navigation home — resolved landing page, /home → /chat, sections without slugs
stage: dev
status: implementing
pass: 1
created: 2026-11-01
updated: 2026-11-01
repos: [minion_hub, minion-meta]
tags: [ui, permissions]
---

## 0. Product

Spec Kit feature: [`specs/046-hub-nav-home-landing-sections/`](046-hub-nav-home-landing-sections/spec.md), with plan.md and tasks.md alongside. Source proposal: `proposals/2026-10-28-hub-org-module-packages-tenancy-nav-home.md`.

Creating a sidebar section needs only a name and never shows a false error. The section dialog gains an Advanced settings disclosure (icon, who can view). The module switcher lists Inicio first and it means "my landing page"; `/` resolves that page from the user's choice, the organisation's choice, or the user's first visible navigation item, with `/chat` (the renamed `/home` assistant screen) as the last resort. No hard-coded landing path survives.

Four hub slices: S0 hotfix (snapshot validation), S1 (name only, auto-suffix), S2 (Advanced settings; stacked on hub #602), S3 (`/chat`, resolver, Inicio first, mobile row). Owner approved 2026-11-01; owner merges.

**Verification:** per-slice gates in plan.md; post-merge: `/home` → 308 in prod, owner opens `/`.

**Out of scope:** marketplace module packages; content pages; a root `+page` for `/` (ledger in the proposal); write-button gating by data roles (`proposals/2026-10-24-hub-nav-sections-data-rbac-followups.md`).
