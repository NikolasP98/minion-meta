---
id: 2026-10-03-readiness-pos-service-boundaries-spec
title: Extract wallet projections and POS settings without changing transaction behavior
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [HC-030]
verdict: approved
---

# POS service boundaries

## 0. Product

Make POS money changes reviewable in focused modules while preserving every public outcome and transaction invariant.

## Out of scope

This slice changes code organization and stale comments only; no new business policy, UI, storage migration, production operation or release.

## AS-IS

The locally qualified wallet correction expanded pos-accounts.service.ts from945 to1412 lines and pos.service.ts from2601 to2822 lines. Account reads now contain bounded SQL projections, DTO decoding, currency buckets and current identity resolution beside ledger/plan mutations. Settings normalization, shared/exclusive lock admission and field-preserving updates occupy pos.service.ts:143-434. This concentrates unrelated changes in two files and makes lock invariants harder to review.

The wallet candidate has144 focused cases and27 actual disposable PostgreSQL cases. Its exact source manifest is wallet-owned-files.sha256 (bc2342bd9db3a89b5b7635b684a643284f95a8f14f791ca75ff49f377af5e70b). Server behavior is accepted, client v11 integration is pending. This refactor must not hide or replace those receipts.

## TO-BE

- Eliminate both current runtime strongly connected components: pos.service with pos-accounts.service, and pos.service with pos-emission.service. `pos-emission.service.ts` must import PosError directly from pos/errors, PosSettings as type-only from pos/settings, and isUniqueViolation from a focused DB-error-classifier leaf; pos.service keeps its public re-export. The extracted settings module may then import emission-series seeding without a path back to pos.service. Update the deliberate-cycle comments in both current services.
- Stable public exports remain available from pos.service and pos-accounts.service. API routes, UI imports and existing tests must not need unrelated import rewrites.
- Move settings types/defaults/normalization/read/update admission into pos/settings.ts, with pure normalization in a sibling only if it improves cohesion. This leaf may import DB schemas, requirements, emission-series seeding, credit-method policy, money and lock helpers; it must not import the pos.service barrel or accounts service at runtime. Re-export its existing public symbols from pos.service and import required symbols locally there. Actor may become a type-only leaf with reexports if necessary to avoid a cycle.
- Move account list/resolution/detail projections into pos/accounts/ focused modules: a types/identity-key leaf, shared row decoders, list/resolution read and detail read. Keep each module cohesive; SQL and its decoder must remain discoverable together. Shared pure plan-detail assembly may be its own leaf because both plan and account-detail reads use it. The accounts write/plan lifecycle service imports leaves directly, never a projection that imports it back. Re-export every existing public name.
- Preserve SQL text and parameter order, row limits, currency separation, canonical identity precedence, retained deleted/missing provenance, null and invalid-value behavior, error codes and exact output shapes. Do not weaken the bounded read or reintroduce per-plan query fan-out.
- Preserve one withOrgCore transaction per existing admission, shared-settings then shared-identity locking and complete sorted wallet lock keys. Settings updates keep their exclusive lock, exact field-presence semantics and shadow-series seeding in the same transaction. Do not turn transaction-local calls into fresh pool connections.
- Correct stale comments claiming identity is arbitrary OR matching or balances always sum in JavaScript; document actual canonical identity and SQL projection behavior. Explain module responsibilities and transaction ownership at boundaries, without narrating each line.

## DELTA and verification

1. Freeze pre-extraction file hashes and exported symbol inventory. Extract leaves and reexports mechanically before any cleanup; do not combine behavioral changes. Record before/after line counts, imports and a map from former function to new file.
2. Keep all existing actual-service tests importing public barrels; rerun144 focused and27 native cases with zero skip, plus the settings/POS v11 client neighbors when stable. Prove the same read outputs, SQL query count and lock/waiter behavior. Existing native tests exercise the real imports and must not be replaced by mocks.
3. A resolved emitted-runtime dependency graph is mandatory. Fail if either named strongly connected component remains or a new cycle joins these leaves/barrels. Type-only edges do not count; source-text grep alone is insufficient. Run plain module-load smoke from both public barrels and each extracted leaf to catch initialization-order changes. Freeze runtime exports and type exports separately before and after. No test that merely asserts a filename or line count is acceptance.
4. The three account detail/resolve/active-grants focused tests currently mock pos.service only for getPosSettingsInTx. Move that seam to the settings leaf without replacing their behavioral assertions or the real public-barrel/native coverage.
5. Run configured Hub check and touched-file formatting. No design changes are intended; existing design/token gates still apply to any incidental UI edit. No migration, production data test, staging or release.
6. Independent review traces every public consumer and transaction helper, verifies manifests and confirms that the original behavioral tests remain intact. Record the new source manifest separately from accepted wallet source.

This is one HC030 maintainability slice. Other oversized modules and the reproduced mobile calendar overlap remain tracked separately; extracting these services does not close the whole finding.
