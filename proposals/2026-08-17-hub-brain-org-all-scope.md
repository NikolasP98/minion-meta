---
id: 2026-08-17-hub-brain-org-all-scope
title: brain-vector org_all scope: implement or narrow the type
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, edge-case]
value: 4
effort: M
source: debt-sweep-2026-08-17
---

# brain-vector org_all scope: implement or narrow the type

## Problem

brain-vector-client.ts:307 throws 'org_all vector scope is not implemented' while the type union (line 27) advertises it — runtime failure where the compiler could catch it.

## Definition of done

Either implemented (org-RLS-scoped, no sourceIds filter) with a success-path test, or the type narrowed to source_list only.

## Out of scope

New retrieval features.
