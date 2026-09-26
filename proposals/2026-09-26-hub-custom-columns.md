---
id: 2026-09-26-hub-custom-columns
title: Organization-owned custom columns at source tables
status: in-spec
created: 2026-09-26
updated: 2026-09-26
repos: [minion_hub]
spawned_spec: 2026-09-26-hub-custom-columns-spec
tags: [ui, data, security]
---

# Custom columns

## AS-IS

Hub master a7a7762 has eight registered primary tables with configurable labels, visibility and editability. DataTable's custom flag selects a renderer. There is no generic organization-owned property definition/value service. CRM separately stores untyped legacy custom_fields JSON. The formula audit traced 41 DataTable uses and identified the need for typed property metadata before expression editing.

## TO-BE

An authorized user creates, configures and archives typed custom columns directly at the eight registered source tables. Other authorized users edit and read persisted values. Text, number, date, checkbox, select and multi-select have typed rules and inline validation. Options have stable IDs and colors. Definition management and value editing have distinct permissions. Existing built-in data and legacy CRM metadata survive unchanged.

## DELTA

Deliver the shared property registry/storage/API, reusable DataTable management and cell editors, canonical entity adapters, seed fixtures, permission and concurrency tests, and local browser verification. The specification defines this first executable slice. Typed formula authoring, further table admission and minimal-core provisioning migration remain explicit follow-up stages rather than inactive type choices in this release.

## Authorization and verification

The user requested implementation on 2026-09-26 and previously authorized Sol implementation, merge after subagent review, and deployment after verification. Those instructions persist. Work is isolated from the dirty shared checkout; review and verification evidence precede merge/release. Definition/value writes run only against seeded loopback QA during qualification.

## Out of scope

This slice does not execute formulas, replace domain computations, convert built-in storage to custom properties or admit transient report rows as writable entities.
