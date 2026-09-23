---
id: 2026-09-22-hub-table-properties
title: Inline catalog tags, managed category selects and custom-column boundaries
status: done
created: 2026-09-22
updated: 2026-09-22
repos: [minion_hub]
tags: [ui, data]
---

# Table properties

## AS-IS

The POS catalog displays direct and inherited tags without a cell editor. The existing scoped tagging service already supports assignment and registry management. `DataTable` supports primitive select editing, but the catalog category column is free text. The static table registry configures labels, visibility and editing for eight primary lists; it does not define arbitrary stored properties.

## TO-BE

Catalog tags are editable from the table using the shared tagging service. Category is a colored, managed single-select. Existing classifications survive the transition. The next custom-column phase has a source-anchored assessment of minimum fields per module and an explicit distinction between system-owned values, optional views and user-defined properties.

## DELTA

See [implementation specification](../specs/2026-09-22-hub-table-properties-spec.md). Add a reusable table-to-tag connector, colored category management, focused persistence and permission tests, and local QA browser evidence. Assess custom columns now; creating/removing arbitrary columns across every table is the subsequent phase described by the user.

## Authorization

The user requested this implementation on 2026-09-22, following the CRM release, and requested Sol implementation agents in this session. Work occurs in an isolated clone based on Hub `master`; existing shared-checkout changes remain untouched. Record review and verification before release.

## Delivery

Hub [PR 364](https://github.com/NikolasP98/minion_hub/pull/364) merged and deployed after Sol approval and passing CI. The linked specification records the exact production commit, migration verification, and completed module assessment.
