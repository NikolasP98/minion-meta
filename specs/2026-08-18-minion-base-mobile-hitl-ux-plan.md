---
id: 2026-08-18-minion-base-mobile-hitl-ux-plan
title: Minion Base mobile-first HITL UX plan (UI0–UI7 program)
stage: spec
status: approved
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: []
type: decision
tags: [ui]
---

# Minion Base mobile-first HITL UX plan

Plan of record, user-authored 2026-08-18 (repos [] — reference document;
work packages cite it). Target: a decision cockpit, not a responsive
dashboard — "understand one exact work revision, evaluate its proof, and make
a safe decision in one focused mobile session."

## Non-negotiables

- Visual hierarchy on EVERY screen: Decision → Risk → Proof → Detail → History.
- No consequence lives only in a tooltip; approval copy states current state,
  resulting state, spawned automation, target repo, next human gate, exact
  revision.
- Consequential mutations are revision-bound (expected status + revision,
  409 on staleness); partial success (approved_queue_pending) is a persistent
  state distinct from success; receipts are durable.
- No board-level one-click approval; compact cards route to detail.
- Mobile: attention queue default, one stage at a time, no page-level
  horizontal scrolling, bottom nav + decision dock with safe-area insets,
  44×44 touch targets.
- State never color-only: shape + label + color + accessible name (symbol
  grammar: ◇ decision, ▶ running, × failed, ✓ approved, △ caution, etc.).
- Evidence is typed with integrity marks (verified/claimed/stale/missing/
  quarantined/invalidated) and provenance stamps (A/H/CI/BR/RV/RL); the UI
  never invents missing evidence (Availability<T> per field).
- Preserve the graphite/ember/ivory scene; hairline rules, no gradients/
  glass/decorative status color.

## Delivery order (work packages)

UI-001 gate integrity (SHIPPED base main 2026-08-18) → UI-002 primitives
(Status/AsyncButton/Popover/Disclosure/IntegrityMark/CopyableHash) → UI-003
mobile shell (bottom nav Overview/Work/Request/Runs/More, sticky context
header, safe-area tokens, DESIGN.md scene update) → UI-004 attention queue +
focused stage selector + URL filters → UI-005 internal issue detail route →
UI-006 WorkDetail adapter (Availability-typed) → UI-007 summary-first detail
(IdentityStrip/DecisionBrief/ReadinessBand/DecisionDock) → UI-008 guarded
decision workflows (blocked on durable decision API) → UI-009 evidence/
artifact system (blocked on SDLC evidence manifest) → UI-010 live timeline
(blocked on durable events) → UI-011 responsive runs cards.

Feature flags PUBLIC_*_V2, fixtures library (20 cases), Playwright + axe +
visual regression matrix (320→1920), microcopy law ("decision/evidence/
revision/verified/claimed", never "looks good/done/green"). Full screen-by-
screen detail lives in the user's 2026-08-18 UX program message.
