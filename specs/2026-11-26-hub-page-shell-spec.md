---
id: 2026-11-26-hub-page-shell-spec
title: Page shell — skip to the content, one main region, a title on every page (a11y program S2)
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

# Page shell (a11y program S2)

## 0. Product

Owner (2026-11-20): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner (2026-11-26): "start S2".

Board stub for the Spec Kit feature **[`specs/151-hub-page-shell/`](151-hub-page-shell/spec.md)**.

Three things every signed-in page should have and most do not: a "Skip to content" link for keyboard users, one main region, and a browser title ("‹page› · ‹hub name›"; 63 of 148 swept pages have none today). The primary navigation also gets a name. FigCraft as-is/to-be demo: [`page-shell.figcraft`](151-hub-page-shell/page-shell.figcraft).

**Out of scope:** rewriting the 87 titles pages already set by hand; landmark findings inside individual pages; public pages; focus rings (S4).

**Verification:** `document-title` at 0 on every swept page, one `main` per page, a keyboard run of the skip link in Chromium, the existing titles unchanged, `bun run a11y` with baselines not rising, every check green on the hub PR.
