---
id: 2026-08-18-base-ui-primitives-and-shell
title: Base UI-002/003 — interaction primitives + mobile shell
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-base]
tags: [ui, logic]
source: ux-plan-2026-08-18
value: high
---

# Shared primitives + mobile app shell

Per [[2026-08-18-minion-base-mobile-hitl-ux-plan]] (UI-002 + UI-003).

**AS-IS:** board/detail define private action/status patterns; KebabMenu is a
partial ARIA menu; nav is five fixed text links; no bottom nav, no safe-area
handling; DESIGN.md scene is desktop-only. **TO-BE:** primitives
Status/RiskMark/IntegrityMark/AsyncButton (states idle→confirming→submitting→
success/partial/conflict/failed, stable width, aria-busy)/ActionOutcome/
CopyableHash/Popover (focus-trap, esc, return-focus)/Disclosure; mobile shell:
bottom nav (Overview/Work/Request/Runs/More, icon+label, 44px, prefix-aware
active), sticky context header, safe-area tokens, skip-to-content; DESIGN.md
scene updated to mobile HITL. **DELTA:** extract primitives → replace local
patterns → add shell components → tokens (--layer-*, --safe-bottom,
--touch-target) → DESIGN.md rewrite.

**DoD:** 320px nav works without wrapping; every icon has a text label; no
color-only status; gates: check 0/0 + lint:design clean.
**Out of scope:** attention queue, WorkDetail, decision API (later WPs).
