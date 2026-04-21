---
status: partial
phase: 03-adopt-foundation-in-subprojects
source: [03-VERIFICATION.md]
started: 2026-04-20
updated: 2026-04-20
---

## Current Test

Awaiting CI green + user review on 5 adoption PRs.

## Tests

### 1. PR #77 (minion-ai) CI green
expected: CI passes on `feat/adopt-minion-stack` against `DEV`. Pre-existing DEV failures may appear — baseline-match acceptance (adoption adds zero new errors per 03-01 A/B comparison).
result: [pending]

### 2. PR #16 (minion_hub) CI green
expected: First net-new CI run from adoption. 18 pre-existing strict-mode warnings deferred to Phase 8 via transitional overrides. Workflow passes.
result: [pending]

### 3. PR #2 (minion-site) CI green
expected: First net-new CI run from adoption. 1 pre-existing a11y warning deferred. Workflow passes.
result: [pending]

### 4. PR #1 (paperclip) CI green
expected: Existing CI workflows trigger only on `master`, not `minion-integration` base (pre-existing CI gap documented in deferred-items.md). Local verification stood in: 21/21 workspace packages typecheck + 1187/1187 tests pass. User manually confirms or merges.
result: [pending]

### 5. PR #246 (pablodelucca/pixel-agents from NikolasP98 fork) CI green
expected: First-time fork contributor. `pablodelucca` must approve workflow runs on the fork PR. All 5 pixel-agents CI gates pass locally pre-push. User coordinates merge with pablodelucca.
result: [pending]

### 6. `.env.defaults` no-secret audit
expected: Grep gate passed during verification (no `_KEY=`, `_SECRET=`, `_TOKEN=`, `_PASSWORD=` with real values across all 5 subprojects' `.env.defaults`). Human eyeball confirms no subtle leaks.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

(none — all deferrals are explicit and tracked in deferred-items.md)
