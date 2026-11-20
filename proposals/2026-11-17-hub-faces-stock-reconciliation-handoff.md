---
id: 2026-11-17-hub-faces-stock-reconciliation-handoff
title: FACES stock reconciliation (spec 122) - open implementation ends (handoff ledger)
status: draft
created: 2026-11-17
updated: 2026-11-17
repos: [minion_hub]
effort: M
source: spec-122-implementation
---
# F1 FACES stock reconciliation: open ends (agent handoff ledger)

Branch `feat/122-faces-stock-reconciliation` (hub). Each item also has a `TODO(handoff)` at its code site.

1. Diagnostic does not read `stk_corrections` rows as `correction` source evidence or resolve `prior_correction` refs; true-up coverage therefore stays unknown unless the owner asserts it (`faces-stock-reconcile-read.ts`).
2. Garment repost runs on F3 primitives with an F1-defined manifest; replace by F3's `GarmentManifestV1` engine; period-lock/fiscal admission of `postedAt` is not enforced (`faces-garment-repost.service.ts`).
3. Loader smoke case for `garmentMapping` / `garmentRepost` not added: `scripts/operator-bootstrap.smoke.ts` is F7-created.
4. Garment compensation rehearsal (`action=compensate`) is covered by pure tests only; no native run yet.
5. `updateSellable` and raw-SQL `stk_consumption` scripts are not behind the gate pair (mapping cutover relies on drain evidence).
6. Evidence files under `audits/2026-11-16-faces-followups/F1/` (T010, T016, T018, T020-T022) are not produced; production diagnosis, mapping apply and garment apply are OWNER actions after F2 and F3 rollout.
