---
phase: 10-durable-jobs-stock
plan: "02"
status: source-verified
requirements-completed: []
requirements-partial: ["STK-01", "STK-02"]
release_status: not-deployed
verified_at: 2026-09-09
---

# 10-02: Invoice stock issue identity and replay

The local source and scoped PostgreSQL fixture pass. STK-01/STK-02 remain partial until plan 10-03 exercises identified disposable, separate-connection PostgreSQL contention and crash boundaries. No production data was queried or changed by this slice. No live preflight, migration, backfill, dependency update, commit or branch/worktree operation occurred.

## Admitted scope

The initial four-file plan was amended after root ownership and independent review to include the matching expression index in `src/server/db/pg-schema/stock.ts`. A second reviewed amendment admitted row locking in the existing `updateEntry` and `deleteEntry` draft guards. Both additions prevent adjacent paths from undermining invoice issue identity or submitted evidence.

Final plan SHA-256: `451be8c1561d54054971d11d28d06826ae14743b5cdd8e5cd98b7ff26ef8e252`.

Owned files under `minion_hub`:

- `scripts/stock-invoice-dedupe-preflight.ts`
- `supabase/migrations/20260909090200_stock_invoice_issue_identity.sql`
- `src/server/db/pg-schema/stock.ts` — matching index only
- `src/server/services/stock.service.ts`
- `src/server/services/stock.sourced-issue.test.ts`

## Delivered behavior

**Identity.** One active issue is permitted per organization and normalized invoice ID: `lower(btrim(metadata->>'invoiceId'))`. Only `issue` entries in `draft`/`submitted` status with a nonempty string invoice ID participate. Cancelled entries and legacy entries without that key remain visible and excluded from the uniqueness boundary. An explicit new issue after cancellation may create one replacement; previous ledger rows remain untouched. Arbitrary source labels cannot evade an invoice identity already present. New writes use the canonical UUID returned by the locked invoice row. Legacy case/space variants are matched without rewriting metadata; `findEntryByInvoice` uses the same normalization.

**Migration and preflight.** The preflight exports read-only collision and invalid-identity queries and reports only counts plus organization/invoice/entry identifiers. It requires an explicit `STOCK_PREFLIGHT_DB_URL` and exactly `--read-only`; no write mode exists. The migration holds a table write-conflicting lock while checking and installing the partial unique index. Duplicate active identities or null/empty/non-string identity keys abort with a pointer to the preflight. It never deletes, merges, cancels or reposts history. Drizzle declares the same index expression and predicate.

**Replay.** `createIssueFromInvoice` locks the actual tenant-scoped invoice row before checking/creating its issue. Matching drafts resume submission, matching submitted entries return the committed identity, and incompatible quantities/items/warehouses reject with `duplicate_invoice`. Existing product-specific consumption-to-stock conversion is retained; no blanket UOM rule or historical conversion is introduced.

**Submission boundary.** A private invoice-aware submission path rechecks the expected entry type, invoice identity and resolved stock lines under the entry lock. This catches a draft edit between the creation and submission transactions. Competing invoice submissions converge on the submitted entry; the generic `submitEntry` API retains its existing double-submit rejection. New audit events are emitted only for an actual newly submitted transition. The normal append-only ledger/bin transaction and insufficient-stock guard remain in use.

**Draft mutation.** `updateEntry` and `deleteEntry` now lock their tenant-scoped draft guard reads. Their missing-row and draft-only policies are unchanged. An editor cannot rely on an unlocked draft snapshot when a competing submission owns the entry lock.

## Verification

From `minion_hub`, using installed tools:

```sh
node node_modules/vitest/vitest.mjs run src/server/services/stock.sourced-issue.test.ts src/server/services/stock.service.test.ts
node node_modules/prettier/bin/prettier.cjs --check src/server/services/stock.service.ts src/server/services/stock.sourced-issue.test.ts src/server/db/pg-schema/stock.ts scripts/stock-invoice-dedupe-preflight.ts
git diff --check -- src/server/services/stock.service.ts src/server/db/pg-schema/stock.ts
bun scripts/stock-invoice-dedupe-preflight.ts --apply
```

- Baseline service failed 6 of the first 15 new cases, including response-loss retry, draft resume and case-normalized identity.
- Final result: **66 passed** — 27 new fixture cases and 39 existing stock service tests.
- Scoped formatting and tracked whitespace checks pass. The final CLI command intentionally exits 1, rejecting unsafe mode before any database access.
- The fixture uses actual Drizzle SQL, PGlite PostgreSQL, `withOrgCore` transactions, the non-bypass `app_ledger` role and synthetic organization policies. The migration executes against the synthetic tables. No real customer data or credentials are used.
- The source Drizzle index is also compiled and installed independently, then exercised for duplicate denial, cross-organization reuse, cancelled history and excluded legacy rows. Preflight queries execute against both clean and colliding fixtures.
- Transaction tests cover a database-trigger failure during ledger insertion, post-commit response loss, matching draft recovery, insufficient stock followed by synthetic replenishment, differing payload rejection, authoritative UOM conversion, intervening line/type mutation, denied edit/delete after submission, allowed draft deletion, canonical UUID/legacy lookup and cross-tenant denial. Cancel/replacement checks compare retained ledger rows before and after replacement.
- Fixtures mock the audit boundary and naming-series formatter; a transaction callback hook injects an intervening edit after commit. Actual entry/line/ledger/bin reads and writes, row locks, uniqueness, rollback and organization role setup execute. This is not a live HTTP response-loss test or deployed RLS verification.
- PGlite serializes one embedded connection. The overlapping-request cases establish replay and SQL behavior but do not prove separate-connection MVCC races or process crash recovery. Draft guard tests additionally inspect emitted `FOR UPDATE` SQL. Full concurrency remains 10-03.

Logs and before-image: `/tmp/minion-360-10-02/` (`red.log`, `green.log`, `final-tests.log`, `unsafe-cli.log`, `stock.service.before.ts`). Root owns the final full Hub check and independent source review.

## Candidate identity

Hub branch at capture: `feat/level-2026-07-30`; HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`. Existing unrelated work remains intact.

| File | SHA-256 |
|---|---|
| `src/server/services/stock.service.ts` | `4dd1a45acf0c135ba7f2fc8416d5df40225982d6245c14167cce3334bb6facaa` |
| `src/server/services/stock.sourced-issue.test.ts` | `6abce6aa5e789830ea6763204e17eeb14cb2de405dd081956a0f46abec29e336` |
| `src/server/db/pg-schema/stock.ts` | `6c00c2a3e95cf9fc0a3e460a2d035167c61129aa99822ffb920932f6b780d775` |
| `scripts/stock-invoice-dedupe-preflight.ts` | `b7a771b809b582d5954985b243ae872e444265443ed380bdbeba226f47ec53b2` |
| `supabase/migrations/20260909090200_stock_invoice_issue_identity.sql` | `135cd5e4a614005637a5a926c5be5fc5726c52ba304f8fbb9bf944d5fd6e838f` |

## Review and rollout gates

Standards self-review: owned file boundaries and independent scope amendments respected; existing transaction/RLS/ledger mechanisms retained; no new dependency or historical mutation. Relevant memory policy (append-only history and product-specific UOM) was checked against the live stock implementation and backfill script; no remembered production quantities were used as current evidence.

Spec self-review: scoped behavior passes local actual-engine fixtures. The full requirements remain partial pending independent review and 10-03's separate-connection/crash qualification.

Before any authorized rollout, run and review the read-only preflight on the exact target database. Any collision or invalid identity needs a separately approved reconciliation decision; this migration intentionally refuses to make one. Install the constraint before relying on the new service behavior. Rollback is a coordinated code/index decision and must never undo posted ledger history; no rollback is executed here.

Source `TODO(handoff)` at `createIssueFromInvoice` names the remaining 10-03 concurrency qualification and points to the existing platform QC proposal (HDS-06). Root owns updating that proposal and global planning status. D360-01, D360-04, D360-05 and D360-06 apply.

## Independent UUID review correction

The verifier identified that PostgreSQL accepts brace/hyphenless UUID spellings while the first implementation compared a normalized raw invoice input. The final candidate carries the locked canonical invoice.id through submission. Actual-engine first-call and retry fixtures now cover those spellings. Item/warehouse IDs intentionally require the canonical grouped spelling; uppercase/outer whitespace normalize before UOM resolution, while braces/hyphenless/malformed values fail before creating a draft. This narrows their former permissive input contract rather than silently treating unsupported forms as equivalent.

A reviewed sixth-file extension changes only the three invoice mock fixtures in `src/server/services/stock.service.test.ts` to canonical item/warehouse UUIDs (SHA-256 `347ce6b73774e5418be9bdbdd10fa35ec83a19b03bc9c80ec81cb859bf6f73da`). The sourced fixture's previously unknown query row now has an explicit type. Final focused evidence is `/tmp/minion-360-10-02/uuid-tests.log`:66 passed. Root retains full-check ownership.
