---
id: 2026-10-18-assistant-navigation-confirmation
title: Keep assistant navigation under user control
status: in-spec
created: 2026-10-18
updated: 2026-10-18
repos: [minion_hub]
spawned_spec: 2026-10-18-assistant-navigation-confirmation-spec
---

# Keep assistant navigation under user control

## AS-IS

The user reproduced a catalog-price question that called disabled SQL, searched stale tools, then opened the catalog without answering. Production gateway revision 3289fc2 still predates the dynamic-tool repair; its promotion remains gated. Separately, Hub permits model-generated navigation fences and native browser tool calls to change the page, and its message renderer can label an unexecuted fence as Opened. The dynamic-tools proposal explicitly retains this gap.

## TO-BE

Information requests return data and source links. A model-generated navigation request offers a validated Open link; only the user's click changes the page. Explicit open requests also require this one click. The assistant must not claim it opened a page, repeat a pending navigation, or fill the current page as if navigation had succeeded.

## DELTA

Replace the navigation effect with a proposal at the common tool implementation; render source links through existing internal navigation; stop dependent fill/guide batches; align prompts and translations. Prove legacy/native behavior and a real rendered click. This fulfills the user's revise-and-repair request without relying on model intent classification.

## Definition of done and out of scope

Focused tests, required Hub gates, independent review and local browser proof precede release approval. Source readiness and production adoption are separate. Automatic navigation, a new intent-classification system, arbitrary SQL, model changes and changes to gateway CI resource allocation are out of scope. Existing dynamic-tool release blockers remain tracked in the prior proposal and release receipts.

## Retained native effect boundary

Native WebMCP has no shared request/batch identity for separate calls. This repair makes native navigation inert but does not bind independent native fill calls to user intent. That requires a separate request-bound effect contract; the registration site must retain a TODO(handoff) pointing here. Legacy navigation batches are pre-scanned so reordered fills never run on the current page.
