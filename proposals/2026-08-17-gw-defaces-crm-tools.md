---
id: 2026-08-17-gw-defaces-crm-tools
title: De-FACES the builtin CRM tools (crm_search + crm_insight ship clinic identity to every org)
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, hardcoded]
value: 8
effort: M
source: debt-sweep-2026-08-17
---

# De-FACES the builtin CRM tools (crm_search + crm_insight ship clinic identity to every org)

## Problem

src/agents/tools/knowledge/crm-search-tool.ts:37 hardcodes 'Faces Sculptors patient CRM', Peru-only phone regex (/(?:\+?51)?([9]\d{8})\b/), DNI terminology and clinic example procedures into a GENERIC builtin tool gated only on memorySync.enabled — every org's agents get a wrong, confusing, single-tenant tool description. crm-insight-tool.ts:53 same class ('Faces Sculptors CRM + finance').

## Definition of done

Business display name, locale patterns (phone/DNI), and example vocabulary come from org config; descriptions are templated at construction. A non-FACES mock org yields descriptions with zero clinic-specific text (unit test). grep for 'Faces Sculptors' in src/agents/tools returns nothing.

## Out of scope

Changing tool behavior/queries; hub-side org-config UI.
