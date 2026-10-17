---
id: 2026-10-16-design-baseline-conformance-spec
title: Design-system baseline and conformance
stage: deploy
status: shipped
pass: 2
created: 2026-10-16
updated: 2026-10-17
repos: [minion-meta, minion_hub, minion_site]
proposal: 2026-10-16-design-baseline-conformance
verdict: approved
tags: [ui, test]
---

# Design-system baseline and conformance

## 0. Product

Owner-authorized follow-on to feature 012 (2026-10-16): make design-system conformance the default instead of opt-in. Spec Kit source of truth: [feature 013](013-design-baseline-conformance/spec.md), [plan](013-design-baseline-conformance/plan.md), [tasks](013-design-baseline-conformance/tasks.md).

## AS-IS

See feature 013 spec §AS-IS: counts measured on minion_hub master `48976586` (302 raw control heights, 1,051 raw icon sizes, 145 pages with 92 on PageShell and 5 on DataView, raw-color 197 / raw-shadow 33 / raw-layer 25, no role-based touch baseline, per-page states and verbs).

## TO-BE

A runtime role-based touch and density baseline with explicit dense opt-out; sizing and token debt normalised under lowered ceilings; a route archetype manifest with a conformance test; one collection-state presentation; collapse-by-purpose and action-scope placement on pilots; a bilingual verb/format contract — with the invariant that comfortable density equals today's sizing and nothing changes on desktop unless an element was off-scale.

## DELTA

Streams A–D as separate hub PRs (plan.md ownership table), proofs per item in the verification matrix (FR-001…FR-011, SC-001…SC-008).

## Out of scope

Framework replacement, free-form canvas, agent configuration writers, business logic, npm publication, screen-reader/cross-browser certification.

## Verification

Per PR: `check`, `lint:design`, `lint:tokens`, `build`, affected tests, independent review; production verified on the real aliases after each merge (`evidence/deployment.md`).
