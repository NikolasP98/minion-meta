---
id: 2026-11-17-faces-receipt-valuation-open-ends
title: FACES receipt valuation (spec 123) - open implementation ends (handoff ledger)
status: draft
created: 2026-11-17
updated: 2026-11-17
repos: [minion_hub]
effort: M
source: spec-123-implementation
---

# FACES receipt valuation (spec 123): open ends

Hub branch `feat/123-faces-receipt-valuation` implements the diagnostic, the correct and compensate writer, both CLIs and the ten registered native behaviors. Remaining ends, each mirrored by a `TODO(handoff)` at the code site or in the spec `tasks.md`:

1. **Package-process bootstrap smoke** (T028): F7's `scripts/operator-bootstrap.smoke.ts` is not on this base; qualify `faces:receipt:diagnose` and `faces:receipt:correct` through it when it lands. The real wiring (GoTrue principal, closed loader, owned connection) has not run against a real target.
2. **Derived-reader assertions** (T029): last restock (`itemSupplyInfo`, item-level) and stock daily-flow bucket are documented but not asserted natively.
3. **Financial/fiscal digest** covers the ticket row and its payments only until F3 publishes its complete family (invoice binding, shift, emission).
4. **Decimal limits**: `decimal.ts` errors are not mapped to an input-stage diagnostic code.
5. **F3 data-model.md:12** must state the compensate pair (source_id = source_entry_id = prior replacement receipt).
6. **Owner actions**: exact invoice/cost-basis evidence, period/rounding acceptance, correction.md approval, exact-manifest apply approval (including `faces:receipt:correct --apply` on production), owner merge. No production command was run.
