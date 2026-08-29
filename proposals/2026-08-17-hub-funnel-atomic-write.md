---
id: 2026-08-17-hub-funnel-atomic-write
title: Make CRM _funnel write atomic (read-modify-write loses concurrent custom-field edits)
status: in-spec
created: 2026-08-17
updated: 2026-08-18
spawned_spec: 2026-08-18-hub-funnel-atomic-write-spec
repos: [minion_hub]
tags: [logic, data, edge-case]
value: 7
effort: M
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# Make CRM _funnel write atomic (read-modify-write loses concurrent custom-field edits)

## Problem

src/server/services/crm-contacts.service.ts:1009 spreads the whole customFields JSONB locally then overwrites the column — concurrent writes to other keys in the window are lost.

## Definition of done

jsonb_set (or select-for-update in the existing withOrgCore txn); test issues two concurrent writes to different keys and both survive.

## Out of scope

Funnel logic itself.
