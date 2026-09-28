---
id: 2026-09-27-hub-calculated-column-formatting
title: Configurable formatting for calculated columns
status: in-spec
created: 2026-09-27
updated: 2026-09-27
repos: [minion_hub]
spawned_spec: 2026-09-27-hub-calculated-column-formatting-spec
tags: [ui, data, security]
---

# Calculated column formatting

## AS-IS

Hub 31f023cd has typed scalar formula columns. CustomPropertyCell displays the main value and quality warnings; value.ts uses Intl currency formatting in the UI locale. Native POS margin uses formatMoney, semantic positive/negative colors and a separate marginPct caption. Custom definitions have no presentation metadata.

## TO-BE

Authorized users configure currency symbol/code, numeric precision, percent scale, sign colors and a secondary calculated value on numeric formula columns. A shared presentation contract and formatter can later serve native and other custom columns. The user requested live testing on the isolated QA dev server and previously authorized Sol implementation/review and verified merge/deployment.

## DELTA

Add persisted presentation metadata, guarded API writes and permission-aware reads, reusable formatting helpers and editor, and computed-cell secondary rendering. Qualify local QA with two margin formulas. Existing formulas retain values and native margin remains unchanged. This slice only admits numeric formula columns; broader column admission is deliberately a later task.
