---
phase: 10-durable-jobs-stock
plan: "02"
verified: 2026-09-09T06:00:20Z
status: gaps_found
slice_status: passed_for_local_source_and_embedded_engine
slice_score: 2/2 local source contracts verified; 1/2 full plan truths fully qualified
requirements_completed: []
re_verification:
  previous_status: gaps_found
  gaps_closed:
    - "Canonical invoice identity and pre-mutation item/warehouse UUID boundary."
  gaps_remaining:
    - "Separate-connection/process qualification and target migration acceptance."
  regressions: []
gaps:
  - truth: "Concurrent and interrupted stock effects converge across separate processes/connections."
    status: partial
    reason: "PGlite serializes one embedded connection; full MVCC contention and process crash qualification remain in 10-03."
    artifacts:
      - path: .planning/phases/10-durable-jobs-stock/10-03-PLAN.md
        issue: "Separate-connection/crash and deployment acceptance remain required."
    missing:
      - "10-03 independent evidence and approved target preflight/migration."
---

# Phase 10, slice 02: Independent verification

**Phase goal:** Retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history.

**Scoped result:** The corrected six-file source slice passes independent source review and 66 installed-runner tests. The initial 61-test candidate passed its tests but failed independent UUID boundary review; that finding is now closed. Full phase acceptance remains blocked by separate-connection/process qualification, domain job-effect work and target migration gates.

## Observable truths and roadmap coverage

| Contract | Result | Evidence and limit |
|---|---|---|
| Clean migration, safe collision failure, visible cancellation and explicit replacement | Verified locally | Actual migration and separately compiled Drizzle index run against real embedded PostgreSQL; collision failure retains history. |
| Concurrent calls and crash/retry converge without duplicate ledger effects | Source and embedded behavior verified; full truth partial | Invoice/entry locks, unique index, response-loss replay, rollback and overlapping calls pass. One PGlite connection does not qualify independent PostgreSQL clients or process death. |
| Roadmap: current fenced owner and long-call heartbeat | Separate 10-01 source report | Not recertified by this stock slice. |
| Roadmap: cancellation/restart and deterministic domain effect | Pending full 10-03 qualification | Job-domain effect fencing is not established by stock replay tests. |
| Roadmap: one submitted stock issue and safe interrupted submission | Partial at phase level | Local behavior passes; 10-03 contention/crash evidence remains mandatory. |

STK-01/STK-02 are covered by this plan but not closed. JOB-01/JOB-02 remain explicit phase requirements with other assigned plans; none is silently removed or orphaned. Later phase 20 release integration does not waive unfinished work in phase 10.

## Independent finding and scope amendment

The original candidate stored the canonical UUID returned by the locked invoice row, but its second transaction compared against `input.invoiceId.trim().toLowerCase()`. An independent PGlite cast probe confirmed PostgreSQL accepts braced and hyphenless UUID values and returns a canonical hyphenated ID that differs from those strings. Both HTTP schemas accept nonempty strings. Consequently an otherwise valid alternate spelling could create a draft and then reject submission as a conflicting identity.

The same boundary affects item/warehouse line identity. In addition, `resolveConsumptionLines` keys product factors by canonical database UUID while previously receiving raw item IDs; uppercase/alternate forms can miss that lookup. The admitted repair uses the locked canonical invoice ID after the first transaction and validates canonical grouped item/warehouse UUID shape before mutation, normalizing supported case/whitespace before quantity conversion. Alternate item/warehouse spellings are deliberately rejected before draft creation rather than reimplementing PostgreSQL's permissive UUID parser.

Root and this verifier admitted a sixth file, `stock.service.test.ts`, solely to replace three invoice mock fixtures' invalid `item1`/`wh1` identifiers with canonical UUID fixtures. These mock values could never satisfy actual UUID columns. No broader test rewrite was admitted.

The final source returns `invoice.id` from both first-transaction branches and passes that exact value into submission. Item/warehouse validation precedes `withOrgCore`, produces a copied normalized input, and precedes the product-factor lookup. Actual-engine tests now cover braced/hyphenless invoice first submission plus canonical retry; each braced/hyphenless/malformed item and warehouse spelling leaves entries, lines, ledger and bin quantity unchanged. A UUID containing hex letters proves uppercase/space normalization before the authoritative conversion: five consumption units at factor ten issue 0.5 stock units, and canonical replay reuses the same entry.

## Source and database invariant review

The migration holds `SHARE ROW EXCLUSIVE` on `stk_entries` while checking collisions/invalid keys and creating the unique index. This conflicts with ordinary concurrent writes during installation. It raises on collisions or invalid active identities; it does not delete, cancel, merge or repost records.

Migration, Drizzle index and preflight share the active identity predicate: organization plus `lower(btrim(metadata->>'invoiceId'))`, for issue entries in draft/submitted status with a nonempty string key. Cancelled rows and legacy rows lacking the key are excluded. Arbitrary `metadata.source` labels cannot bypass an existing nonempty invoice identity. This enforces the stated normalized-text identity, not every possible semantic UUID spelling in historical metadata.

The preflight validates exactly `--read-only` before opening its explicitly selected PostgreSQL connection. It uses a read-only transaction and statement timeout and returns counts plus identity fields. A successful preflight is a point-in-time observation; the migration repeats checks under its table lock. It is not an automatic reconciliation decision.

`createIssueFromInvoice` locks the tenant-scoped invoice before inspecting or creating an active issue. Matching persisted stock line identity is compared before returning an existing draft/submitted entry. Submission then locks the entry and checks invoice identity, type and expected lines under that lock before ledger/bin work. Generic submit retains non-draft rejection; invoice replay alone may return an already submitted matching entry. Audit recording only follows a newly submitted transition.

Both draft edit/delete guards now take `FOR UPDATE` on the same tenant-scoped entry read as submission. Status checking and line mutation remain inside `withOrgCore`; the user cannot retain an unlocked draft snapshot while submission owns the row. Missing rows and non-draft behavior are preserved. Actual SQL inspection in tests confirms the locks; this is not independent-connection contention proof.

The normal append-only ledger/bin transaction, insufficient-stock guard and item-specific UOM conversion remain. Cancellation appends reversal rows; replacement tests compare prior ledger rows exactly before allowing one active replacement.

## Wiring and fixture quality

The production stock `/api/stock/entries/from-invoice` route and gateway stock action both call the inspected service. Invoice detail uses `findEntryByInvoice`. The latter applies the same case/space normalization and retains cancelled history. The implementation is not an uncalled parallel service.

The new fixture uses actual Drizzle, actual `withOrgCore` setup, PGlite, the non-bypass `app_ledger` role, synthetic organization policies, entry/line/ledger/bin operations and the actual migration. It redirects the database entrypoint, naming-series formatter and post-commit audit boundary. A callback injects an edit between transactions. The source Drizzle index is separately compiled/installed, then exercised with duplicates, cross-org reuse and excluded rows.

The stock data-flow trace is input→tenant invoice lock→server quantity conversion→entry/lines→locked submission→ledger/bin transaction→returned committed entry. Tests inspect real rows at each failure boundary. No customer data or live RLS claim is involved.

## Checks before UUID correction

- Initial9-second capped run ended during startup, exit124, without a test verdict. It is not recorded as a failure of stock behavior.
- Independent uncapped installed runner completed61 tests across `stock.sourced-issue.test.ts` and `stock.service.test.ts`, duration11.58s. That green result did not catch the subsequently discovered UUID gap.
- Independent PGlite cast probe proved two alternate invoice spellings normalize differently from rawtrim/lower.
- `bun scripts/stock-invoice-dedupe-preflight.ts --apply` rejected unsupported mode before accessing connection configuration.
- GSD artifact existence/substance checks passed2/2; manual wiring review above establishes actual use. Scoped diff whitespace checks passed before correction.

## Final independent checks and artifact identity

`node node_modules/vitest/vitest.mjs run src/server/services/stock.sourced-issue.test.ts src/server/services/stock.service.test.ts` from Hub passed **66/66 tests in two files**, exit 0, duration 4.88s. This is the final independent run, not an additive total with earlier runs. Scoped `git diff --check` passed. Parent owns the full Hub type check; no duplicate full check or production operation was performed here.

| Hub-relative artifact | Existence / substance / wiring | SHA-256 |
|---|---|---|
| `src/server/services/stock.service.ts` | Verified: production routes, real transaction/ledger logic | `4dd1a45acf0c135ba7f2fc8416d5df40225982d6245c14167cce3334bb6facaa` |
| `src/server/services/stock.sourced-issue.test.ts` | Verified: actual engine and migration, failure injections | `6abce6aa5e789830ea6763204e17eeb14cb2de405dd081956a0f46abec29e336` |
| `src/server/services/stock.service.test.ts` | Verified: existing service suite; admitted fixture-only amendment | `347ce6b73774e5418be9bdbdd10fa35ec83a19b03bc9c80ec81cb859bf6f73da` |
| `src/server/db/pg-schema/stock.ts` | Verified: expression index compiled and independently exercised | `6c00c2a3e95cf9fc0a3e460a2d035167c61129aa99822ffb920932f6b780d775` |
| `scripts/stock-invoice-dedupe-preflight.ts` | Verified: explicit readonly CLI and real fixture queries | `b7a771b809b582d5954985b243ae872e444265443ed380bdbeba226f47ec53b2` |
| `supabase/migrations/20260909090200_stock_invoice_issue_identity.sql` | Verified: fixture installation, rejection and parity | `135cd5e4a614005637a5a926c5be5fc5726c52ba304f8fbb9bf944d5fd6e838f` |

No empty implementation or newly introduced stub blocks the admitted source contract. The `TODO(handoff)` at `createIssueFromInvoice` explicitly links outstanding contention/crash qualification to 10-03 and proposal HDS-06. UI appearance and live HTTP behavior are outside this slice; neither is certified by service tests.

## Phase boundaries

STK-01/STK-02 remain partial until 10-03 qualifies separate-connection/process contention. Single-connection overlap, trigger-induced rollback and audit-boundary response loss are meaningful local fixtures, not live HTTP crash or MVCC-race proof. JOB-01/JOB-02 are other phase requirements and are not dropped from phase acceptance.

Before release, run the read-only preflight against the exact authorized target and review collisions/invalid identities. Any historical reconciliation needs its separate decision. Apply the constraint before relying on service behavior; rollback must not undo posted ledger history. No production preflight or migration was performed here.

**Standards:** Admitted ownership and draft/schema/UUID amendments respected; verifier changed only this report. **Spec:** Local source and embedded-engine slice accepted. Full plan and phase acceptance remain pending the explicit gates above.
