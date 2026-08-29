---
id: 2026-08-17-gw-defaces-crm-tools
title: De-FACES the builtin CRM tools (crm_search + crm_insight ship clinic identity to every org)
status: in-spec
spawned_spec: 2026-08-17-gw-defaces-crm-tools-spec
created: 2026-08-17
updated: 2026-08-28
repos: [minion]
tags: [logic, hardcoded]
value: 8
effort: M
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# De-FACES the builtin CRM tools (crm_search + crm_insight ship clinic identity to every org)

## Problem

src/agents/tools/knowledge/crm-search-tool.ts:37 hardcodes 'Faces Sculptors patient CRM', Peru-only phone regex (/(?:\+?51)?([9]\d{8})\b/), DNI terminology and clinic example procedures into a GENERIC builtin tool gated only on memorySync.enabled — every org's agents get a wrong, confusing, single-tenant tool description. crm-insight-tool.ts:53 same class ('Faces Sculptors CRM + finance').

## Definition of done

Business display name, locale patterns (phone/DNI), and example vocabulary come from org config; descriptions are templated at construction. A non-FACES mock org yields descriptions with zero clinic-specific text (unit test). grep for 'Faces Sculptors' in src/agents/tools returns nothing.

## Out of scope

Changing tool behavior/queries; hub-side org-config UI.

## Open items

- `createMinionTools` still has no trusted `orgId` at the CRM-profile resolution site, so configured `gateway.crm.profiles[orgId]` entries remain dormant and only `defaultProfile` can be selected. Preserve the synchronous resolver contract; thread trusted org identity through tool construction in `2026-08-17-gw-defaces-crm-tools-spec` S2/S3, as recorded by the matching `TODO(handoff)` in `minion/src/agents/minion-tools.ts` and warning A1 in the spec.
