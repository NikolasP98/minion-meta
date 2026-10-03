---
id: 2026-10-03-readiness-meta-pagination-spec
title: Meta sync terminal-page progress
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Meta sync terminal-page progress

## 0. Product

Meta sync must advance its durable cursor across terminal pages, windows and accounts without replaying a completed budget boundary. This slice covers FACES-PROD-001.

## Out of scope

Lease fencing, provider metric definitions, account reconnection and production job mutation are separate slices.

## AS-IS

FACES-PROD-001: read-only production probes observed a queued Ads job whose
counters advanced by 100 while its latest business date stayed September 12.
The current source checks row budget before page exhaustion and persists the
same window without a next-page URL. That cursor means restart the first page.
The same ordering exists in Posts and historical Messages. The deployed Hub
source revision is not attested, so the production causal link is an inference;
the source defect is directly reproducible. No production mutations occurred.

## TO-BE

A completed page is never replayed solely because it reaches a slice budget.
If another page exists, resume that page. Otherwise advance to the next Ads
window or target. If neither exists, return terminal completion. Cursor URLs
still omit access tokens and app-secret proofs. Tail-message sampling retains its
one-page-per-target contract. Item upserts and status transitions retain their
existing interfaces in this slice; lease ownership is HS-005's separate slice.

## DELTA

Extract cursor serialization/progression into a small dedicated module. Replace
all three budget-boundary cursor decisions with the shared explicit-successor
rule. Keep exported URL sanitizer compatibility. Exercise actual runJob slices
across terminal-page budgets, multiple windows/accounts, a nonterminal page,
posts, historical messages and tail sampling. Assert the next dispatched call
uses the successor and the completed first page is not called again. Preserve
existing provider/mapping regressions. Independent review is required before
acceptance. No provider API calls, migrations or production job rewrites occur.

## Review passes

Pass 1 verified terminal, next-page, next-window and next-target transitions.
Pass 2 checked shared Posts/Messages blast radius, credential stripping, status
completion and budget behavior at equality and above the threshold.


## Verification

Run the behavior and failure-path checks in DELTA against actual handlers or runtime boundaries. Record focused test receipts and independent review in the readiness ledger. Full typecheck, native runtime acceptance, hosted CI, merge and deployment remain separate qualification gates.
