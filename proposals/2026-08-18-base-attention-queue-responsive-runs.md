---
id: 2026-08-18-base-attention-queue-responsive-runs
title: Base UI-004/011 — mobile attention queue, focused stages, responsive runs
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-base]
tags: [ui, logic]
source: ux-plan-2026-08-18
value: high
---

# Attention-first mobile board + responsive runs

Per [[2026-08-18-minion-base-mobile-hitl-ux-plan]] (UI-004 + UI-011).
Depends on [[2026-08-18-base-ui-primitives-and-shell]].

**AS-IS:** five fixed columns behind horizontal scroll at 390px (7,500px tall
pages); runs are a seven-column table. **TO-BE:** mobile default = attention
queue (decision_required/blocked/risk/stale/running/completed groups, sticky
headers, counts filter); stage selector renders ONE stage at a time (URL-
persisted, position shown "2 of 5"); URL-serialized filters in a bottom
sheet; WorkItemCard (state-first line, action sentence, risk, evidence count,
one contextual action routing to detail); runs become mobile cards (state,
stage, elapsed, work-item links, lazy logs). Desktop keeps lanes with sticky
headers + collapsible empty stages. **DELTA:** AttentionSummary →
StageSelector → WorkItemCard/List → filter sheet → runs cards → desktop lane
polish.

**DoD:** no page-level horizontal scroll 320–430px; all stages reachable via
visible controls; filters shareable; empty states recoverable; gates green.
