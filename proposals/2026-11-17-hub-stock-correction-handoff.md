---
id: 2026-11-17-hub-stock-correction-handoff
title: Hub stock correction workflow (spec 124) - open implementation ends (handoff ledger)
status: draft
created: 2026-11-17
updated: 2026-11-17
repos: [minion_hub]
effort: M
source: spec-124-implementation
---
# Hub stock correction (spec 124): open ends after the first implementation pass

Branch `feat/124-stock-correction-workflow` (hub clone). Done: migration + schema, stock-v1 gate and
same-tx seams, postTicketStockInTx / realizeAccrualsInTx, correction service for `variant_swap` and
`receipt_replace`, routes, central admission exception, native proof of 8 behaviors.

AS-IS: the swap route/UI still use the legacy `swapTicketLineProduct` (pos:edit only, no reason/key).
TO-BE: the route delegates to the correction engine; ticket and stock-entry pages offer reason, preview,
stable operation key, saved-outcome recovery and blocked-evidence links.
DELTA / open (each has a `TODO(handoff)` at its site):
- T015/T017/T021/T023 route delegation + ticket and receipt UI + i18n (en/es) + blocked evidence.
- T007 full owned-fixture matrix and the remaining native names (frozen stock-only, mapping cutover,
  deny-insert race, warehouse/timezone/bundle writers, deleting principals). Registered names: 8 of 13.
- Valuation qualification (owner currency attestation), private garment entrypoints, browser recovery
  pointer, operator CLI loader key (`stockCorrections`), GET-by-id detail, POS-only status recovery
  through the central read gate.
- T011 participant wrappers (submitTicket etc.) keep their own timeouts by decision; T032 gate in
  submitTicket/voidTicket intentionally not added (no nested stock write in their money tx).
- Snapshots use explicit named fields, not `to_jsonb(row)` row hashes.

## Update 2026-11-17 (pass 2)
Done: swap routes delegate (T015), ticket and receipt correction UI with recovery pointer, native names 13/13 (T006).
Still open (each `TODO(handoff)` in `stock-corrections.service.ts`): owner valuation attestation in engine + UI (T017/T021 unticked),
blocked-evidence projection with F1/F2 links (T023), GET-by-id detail, private garment `stock_only`, F1 mapping cutover + its
`cutover_pending_sources` census (native name has a drain-only body), real `writeSectionAccess`/`deleteUser` in the race cases,
T032 gate placement in submitTicket/voidTicket (deliberately absent, decision 4), T011 participant wrapper limits.
