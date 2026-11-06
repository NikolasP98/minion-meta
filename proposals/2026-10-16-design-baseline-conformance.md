---
id: 2026-10-16-design-baseline-conformance
title: Design-system baseline and conformance (follow-on to durability)
status: done
created: 2026-10-16
updated: 2026-10-16
repos: [minion-meta, minion_hub, minion_site]
tags: [ui, test]
effort: L
source: design-system-audit-2026-10-16
---

# Design-system baseline and conformance

## Request and scope

After feature 012 shipped, the owner asked where the changes could be felt and whether an element that is "off" gets corrected automatically; then: "begin implementing all of these and use subagents for faster development" (2026-10-16). The nine items come from the audit's PAT-01…PAT-14 rules: runtime touch/density baseline, control-height and icon-size normalisation, route archetype conformance, data-view state coverage, narrow-width collapse by purpose, action placement, elevation/layer/colour debt, bilingual content contract. Spec Kit feature: `specs/013-design-baseline-conformance/`.

## AS-IS

Measured on minion_hub master `48976586`: no role-based runtime baseline (focus ring only); 302 raw control heights and 1,051 raw icon sizes outside `ui/`; 145 app pages with PageShell on 92, DataView on 5, native tables on 4; collection states hand-rolled per page; raw-color 197, raw-shadow 33, raw-layer 25; verbs and number/date formats chosen per page.

## TO-BE

Conformance by default: a role-based baseline corrects targets under coarse pointer and coordinates density under fine pointer; sizing and token debt normalised with ceilings; every page declares an archetype proven by a test; one collection-state presentation; collapse-by-purpose and declared action scopes on pilots; one bilingual verb/format contract.

## DELTA

Four streams (A baseline/density, B normalisation, C archetypes/placement/collapse, D states/content), each its own hub PR to master from an isolated worktree; meta carries spec/evidence; site gets ceiling parity. Proof per item in `specs/013-design-baseline-conformance/plan.md` verification matrix.

## Follow-ups (open-items ledger)

| Item | Pointer |
|---|---|
| Collapse pixel proof at 390/320 px for the collection pilots | spec 013 T021 |
| Comfortable density beyond DataTable rows on desktop | spec 013 T022; PR #547 Out of scope |
| raw-control-height 190 / raw-icon-size 92 residual gaps (design decisions listed in PR #548) | spec 013 T023 |
| 46 allow-listed non-conforming pages (`KNOWN_NONCONFORMING`) | spec 013 T024; PR #549 |
| Stale-age caption is caller-supplied in `CollectionState` | PR #546 |

## Out of scope

Framework replacement, free-form canvas, agent configuration writers, business logic, npm publication, screen-reader/cross-browser certification.
