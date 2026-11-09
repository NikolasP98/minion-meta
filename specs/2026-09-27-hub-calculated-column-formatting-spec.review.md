---
spec: 2026-09-27-hub-calculated-column-formatting-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-quick-add
created: 2026-09-27
score_slice_size: 8
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
score_collisions: 9
score_testability: 9
---

# Calculated column formatting review

## Standards and security — approved

Sol guardians_dob approved pass2 after freezing permission-aware projection across every response, omission/null update semantics, display-only references, precise legacy/percent formatting behavior, raw primary numeric boundaries and guarded targeted installation.

## Requirements and UI — approved

Sol quick_add approved pass2 after requiring restricted-secondary metadata redaction and non-destructive unrelated saves. Numeric formula admission, reusable presentation metadata, currency/sign/secondary controls and local QA demonstration meet the requested scope. Native and other-custom column admission remain later work.

## Implementation review

Independent Sol reviewer guardians_dob approved exact Hub head `0796fd675fb92961fb8a8195957a1f66ed89bc01` after backend, UI, runtime and message-merge review. Browser qualification exercised persisted symbol/code, precision, caption, invalid-save prevention and reload. Hosted CI and deployment remain separate gates tracked in the qualification artifact. Backend agent independently approved the targeted example helper and HTTP qualification script.

Final delta: the regression suite exposed repeated loads for an empty formula catalog. Successful empty responses and failures now remain settled until explicit retry, with in-flight deduplication. Independent Sol reviewer guardians_dob approved exact final head `4dd53490c02702399487e5dd2e8222b392b50ed8`; the 3-file component/formatter suite passed 11 tests, including exactly one request for an empty catalog.
