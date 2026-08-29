---
id: 2026-08-17-hub-distinct-visit-dates
title: Wire distinctVisitDates so the Loyal funnel stage can auto-advance
status: in-spec
spawned_spec: 2026-08-17-hub-distinct-visit-dates-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, todo]
value: 6
effort: M
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Wire distinctVisitDates so the Loyal funnel stage can auto-advance

## Problem

crm-contacts.service.ts:952 returns 0 (STUB) while the live analyze endpoint calls it — Loyal auto-detection never fires for any org; only manual override reaches it.

## Definition of done

Count distinct visit dates from fin_invoices/scheduling via the party spine; test seeds 2+ dates and asserts count + resulting stage.

## Out of scope

Other funnel stages; UI.
