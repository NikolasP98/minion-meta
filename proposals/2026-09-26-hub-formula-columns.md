---
id: 2026-09-26-hub-formula-columns
title: Guarded formula properties and POS margin comparison
status: in-spec
created: 2026-09-26
updated: 2026-09-26
repos: [minion_hub]
spawned_spec: 2026-09-26-hub-formula-columns-spec
tags: [ui, data, security]
---

# Formula properties

## AS-IS

Hub master 55f525c ships six custom input types on eight registered tables. POS catalog computes native money margin as Math.round((unitPrice - canonicalCost) * 100) / 100 and masks cost/margin with finance-sensitive access. The approved audit recommends SQL-style guarded expressions and stable property references; no formula engine is deployed.

## TO-BE

Add a working read-only Formula type with typed expressions, completions, inline diagnostics, authorized server previews and computed values. Create a separate Margin (formula) property in the user's POS catalog, retain native Margin, and compare results including null/partial cost and rounding differences.

## DELTA

Implement a bounded scalar expression language, stable AST/dependency storage, canonical source catalog and server evaluation, dependency lifecycle checks, reusable editor, and idempotent targeted template creation. Formula type is available on all eight registered tables for supported scalar custom inputs; native inputs begin with POS price/cost and canonical margin for comparison. Relations/rollups and full server-query planning remain separate phases.

The user authorized implementation, Sol agents, review before merge, verification and deployment. First-column creation is explicitly requested; provision only the identified target organization, preserving its existing data and native calculation.
