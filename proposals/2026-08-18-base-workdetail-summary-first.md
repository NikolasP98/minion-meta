---
id: 2026-08-18-base-workdetail-summary-first
title: Base UI-005/006/007 — issue route, WorkDetail adapter, summary-first detail
status: in-spec
created: 2026-08-18
updated: 2026-08-18
spawned_spec: 2026-08-18-base-workdetail-summary-first-spec
repos: [minion-base]
tags: [ui, logic]
source: ux-plan-2026-08-18
value: high
---

# Summary-first detail pages over a typed WorkDetail adapter

Per [[2026-08-18-minion-base-mobile-hitl-ux-plan]] (UI-005/006/007).
Depends on [[2026-08-18-base-ui-primitives-and-shell]].

**AS-IS:** issue cards deep-link straight to GitHub (no internal route);
the generic Detail type renders full markdown body BEFORE the review verdict;
no readiness/blockers/revision model. **TO-BE:** /kanban/issue/:owner/:repo/
:number internal detail (triage state, lineage, View source ↗ separate);
WorkDetail discriminated model with Availability<T> per field (missing/
unsupported explicit — the UI never invents evidence; legacy items show an
EVIDENCE INCOMPLETE banner); summary-first layout: IdentityStrip (sticky) →
DecisionBrief (objective, requested decision with consequence language,
revision identity) → ReadinessBand (vetoes above scores) → blockers →
disclosures (full doc/history/lineage collapsed; failed review auto-expanded);
deep-link anchors. **DELTA:** issue route → adapters per kind → shell
components → reorder detail rendering → anchors.

**DoD:** first mobile viewport answers what/decision/consequence/ready/
blocked/revision; review conclusion above raw body; every card kind opens an
internal page; gates green.
