---
id: 2026-08-17-hub-reserva-keyword-config
title: Extract the triplicated 'reserva' keyword into one org-configurable rule
status: in-spec
spawned_spec: 2026-08-17-hub-reserva-keyword-config-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, hardcoded]
value: 6
effort: M
source: debt-sweep-2026-08-17
---

# Extract the triplicated 'reserva' keyword into one org-configurable rule

## Problem

Spanish single-tenant keyword ilike '%reserva%' baked into crm-finance.service.ts:9, crm-similarity.service.ts:55, crm-journey.service.ts:39 for deposit-classification in multi-tenant services.

## Definition of done

One shared constant minimum (org-level config preferred); the three services consume it; existing tests green.

## Out of scope

Reclassifying historical rows.
