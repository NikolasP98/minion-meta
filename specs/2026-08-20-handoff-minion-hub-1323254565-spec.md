---
id: 2026-08-20-handoff-minion-hub-1323254565-spec
title: "Handoff marker crm-similarity.service.ts:55 — resolve the deposit/procedure rule per call in buildWinIndex"
stage: spec
status: done
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-1323254565
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-17-hub-reserva-keyword-config-spec]
type: fix
tags: [logic, test, handoff-sweep]
done_reason: "Zero-diff dev run confirms the open end is already resolved on base (sibling merges covered it); husk PR closed."
---

# Handoff marker `crm-similarity.service.ts:55` — resolve the rule per call in `buildWinIndex`

## 0. Product

Quoted verbatim from the source proposal:

> Filed automatically by the factory handoff-ledger sweep: this file carries a
> `TODO(handoff):` marker (the open-items ledger clause). Approving sends it into the spec
> pipeline to resolve the open end below.
>
> - `NikolasP98/minion_hub@master src/server/services/crm-similarity.service.ts:55` — rule is
>   the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from
>   crm_settings
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed; the sweep closes this proposal automatically once the file carries no more markers.

## 1. Relationship classification (recommend-only)

**Recommended: `extends`.**

The approved, pass-2 [`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md)
("canonical spec") owns the `DepositRule` shape, `crm-deposit-rule.ts` module, the
`crm_settings.value.deposit` read/write boundary, normalization, and its own S1 explicitly
instructs leaving this exact marker at all three call sites for its own S2 to remove
("S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings"). This proposal
is the handoff-sweep re-discovery of that same marker at the `crm-similarity.service.ts` site;
it is not a new idea and not a duplicate request to design the rule — it is the completion
obligation the canonical spec's own text created.

Verified directly against `minion_hub@master` commit `5e77bbe7a15aec126651f6cdac76672020153abd`
(this meta-repo workspace has no Hub checkout — `.gitignore` excludes it — so evidence below was
pulled via `gh api repos/NikolasP98/minion_hub/contents/...?ref=<sha>`, the same method and same
commit the sibling specs below used):

- `src/server/services/crm-deposit-rule.ts` exists with `DEFAULT_DEPOSIT_RULE`,
  `escapeLikePattern`, `depositMatchSql`/`notDepositMatchSql`, `isDepositText` — canonical S1
  has landed.
- `resolveDepositRule` has **zero** hits anywhere in the repo except as a comment in
  `crm-deposit-rule.ts` describing S2 as future work — canonical S2 has **not** landed. This
  matches the sibling specs' finding for the finance marker; the three markers are still all open.
- `crm-similarity.service.ts:55-56` still reads `const DEPOSIT_RULE = DEFAULT_DEPOSIT_RULE;` at
  module scope, exactly as canonical S1 left it.

This spec is a sibling of, not a merge with:
- [`2026-08-20-handoff-minion-hub-2785164896-spec`](2026-08-20-handoff-minion-hub-2785164896-spec.md)
  (`status: approved`) — the same canonical S2 completion obligation, for the
  `crm-finance.service.ts:12` marker. Its own relationship note names this proposal
  (`handoff-minion-hub-1323254565`) as an independently owned sibling marker and explicitly does
  not classify or edit it. That finance spec found a downstream consumer
  (`crm-contacts.service.ts::runRankQuery`) and a two-minute tenant cache
  (`contactFinanceMap`) that make its own slice larger than a single-file swap. Recon below
  (§2) found **neither** applies to the similarity call site — no other service imports
  `crm-similarity.service.ts`'s `IS_PROCEDURE`, and `buildWinIndex` carries no in-process TTL
  cache — so this spec is deliberately narrower than its finance sibling rather than copying its
  shape unnecessarily.
- [`2026-08-20-handoff-minion-hub-2131866440-spec`](2026-08-20-handoff-minion-hub-2131866440-spec.md)
  (`status: draft`, pass 1 at this review) — the third and last sibling marker, at
  `crm-journey.service.ts`. Its draft is not authoritative for this slice and is not classified or
  edited here.

Not `already-satisfied`: canonical S2 has not landed (verified above), so the marker's condition
for removal ("S2 ... reads it from crm_settings") is not yet true. Not `conflicts-with`: this
spec makes zero changes to `crm-finance.service.ts`, `crm-journey.service.ts`, the canonical
`crm-deposit-rule.ts` module's public contract, or any DDL.

## 2. Verified AS-IS

Evidence pulled from `minion_hub@master` at `5e77bbe7a15aec126651f6cdac76672020153abd`
(`src/server/services/crm-similarity.service.ts`, full file read):

- Lines 55-57:
  ```ts
  // TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings
  const DEPOSIT_RULE = DEFAULT_DEPOSIT_RULE;
  const IS_PROCEDURE = sql`(ii.description is not null and ${notDepositMatchSql('ii.description', DEPOSIT_RULE)})`;
  ```
  Both are **module-scope constants**, built once at import time from the hardcoded default —
  never re-evaluated per call, per tenant, or per settings change.
- `IS_PROCEDURE` has exactly one consumer in this file: the buyer-selection query inside
  `buildWinIndex()` (lines ~132-142) —
  `array_agg(distinct ii.description) filter (where ${IS_PROCEDURE}) bought ... having
  bool_or(${IS_PROCEDURE})`. It selects which invoice-item descriptions count as a "procedure"
  (non-deposit) purchase and which contacts qualify as buyers at all. No other function in this
  file, and no other file in the repo (`gh api search/code?q=IS_PROCEDURE+repo:...` — confirmed
  the only other hit is `crm-finance.service.ts`'s own **independently defined**, same-named,
  file-local constant built from the same shared `crm-deposit-rule.ts` primitives; the two are
  not imported from one another and each is that spec's/this spec's own concern).
- `buildWinIndex()`'s result (`bought: string[]`, `snippet`) is **materialized** into
  `crm_win_embeddings (org_id, contact_id, embedding, msg_count, bought, snippet, built_at)`
  via an upsert (lines 216-236) — it is not recomputed at read time.
- The only reader of that table, `similarWins()` (lines 466-503), does a nearest-neighbour query
  against the **stored** `w.bought`/`w.snippet` columns and never re-evaluates any deposit rule
  itself. So the rule only matters at `buildWinIndex()` time — the write path — not at
  `similarWins()`'s read path.
- `buildWinIndex()`'s only caller in the repo is `POST /api/crm/insights/win-index`
  (`src/routes/api/crm/insights/win-index/+server.ts`) — an operator-triggered manual rebuild,
  confirmed via `gh api search/code?q=buildWinIndex+repo:NikolasP98/minion_hub`. There is no cron,
  no on-write-trigger, and no other call site. This means (a) unlike the finance marker's
  `contactFinanceMap`, there is **no in-process cache** to invalidate — the "staleness" here is
  entirely "the stored table wasn't rebuilt since the rule changed," which is exactly the
  canonical spec's own ⚠️A3 concern, already owned by canonical S3's write-path
  `staleDerivedCount` disclosure (§3 repeats this boundary so it is not silently duplicated here);
  and (b) there is no secondary in-repo consumer analogous to
  `crm-contacts.service.ts::runRankQuery` for this file — `similarWins` is the only reader and it
  reads the stored table, not `IS_PROCEDURE`.
- `crm-similarity.service.test.ts` (67 lines, full file read) has one PARITY test asserting the
  exact compiled buyer-query SQL and that `'%reserva%'` is bound as a parameter (twice — once per
  `IS_PROCEDURE` occurrence in the query). This is the parity snapshot canonical S1 produced; it
  pins today's *default-rule* output and must keep passing unchanged, and a second, *custom-rule*
  case must be added to prove per-call resolution (§4 DELTA #1).
- `crm-deposit-rule.sql.integration.test.ts` (full file read) already proves
  `depositMatchSql`/`notDepositMatchSql`/`isDepositText` against real PostgreSQL, including a case
  explicitly framed as "the predicate crm-finance/crm-journey/crm-similarity share." This is
  query-level classification coverage that already covers `IS_PROCEDURE`'s SQL semantics
  end-to-end; this spec's slice does not need to add a new integration test for the predicate
  itself, only for `buildWinIndex`'s per-call resolution of *which* `DepositRule` object feeds it.
- Operator memory `/memory/MINION/MEMORY.md` carries the hard Hub deployment constraint
  "`dev` DELETED (PR #83) → branch off `master`". Review-time remote evidence agrees:
  `master` is the GitHub default branch and no `dev` branch exists, while the remote Hub
  `CLAUDE.md` still describes the older `dev` integration flow. Slice 0 therefore checks the
  remote default branch and branch existence explicitly before branching; it must not infer the
  live base from the stale instruction text or assume today's `master` state will remain current.

## 3. TO-BE (target behavior + invariants)

- Each enabled `buildWinIndex(ctx)` call resolves one `DepositRule`, via canonical S2's
  `resolveDepositRule(ctx)` (the CRM settings boundary the canonical spec defines — this spec
  does not redefine it, re-implement it, or add a second settings reader), and builds
  `IS_PROCEDURE`'s SQL fragment from that resolved rule at call time.
- With no `crm_settings.value.deposit` key for an org, the resolved rule is bit-identical to
  `DEFAULT_DEPOSIT_RULE`, and `buildWinIndex`'s compiled query and output are unchanged from
  today (parity invariant — same guarantee the canonical spec's own S2 DELTA requires of finance
  and journey).
- With a custom rule (e.g. `keywords: ['adelanto', 'seña']`), the *next* call to `buildWinIndex`
  for that tenant classifies buyers/bought-items using the custom keywords. `buildWinIndex` has no
  classification cache of its own (§2); immediate freshness still depends on canonical S2's
  resolver contract, whose tests must prove the next `resolveDepositRule(ctx)` sees the new rule.
  This slice proves it does not add a second cache or retain the old module-scope constant.
- When `enabled(ctx)` is false, `buildWinIndex` keeps its current early return and does not resolve
  settings; enabled calls resolve the rule exactly once with the same `ctx` passed by the caller.
- `keywords: []` (explicitly empty) ⇒ `IS_PROCEDURE` evaluates to `sql\`(ii.description is not
  null and true)\``-shaped (i.e. every non-null description counts as a procedure line, per
  `notDepositMatchSql`'s empty-list contract) — asserted, not assumed.
- `similarWins()`, `winIndexStatus()`, the `POST /api/crm/insights/win-index` route contract, and
  `crm_win_embeddings`'s schema are **unchanged**. This slice touches only how `buildWinIndex`
  computes `IS_PROCEDURE`; it does not touch the read path, the route, or the table shape.
- **Invariant — staleness disclosure stays out of this slice.** Canonical S3 owns the
  `staleDerivedCount`/`staleDerived` response fields on the settings write path (per the canonical
  spec's ⚠️A3 and S3). This slice does not add a rebuild trigger, a staleness field, or a cron —
  doing so here would duplicate canonical S3's scope and risk two components disagreeing about
  what "stale" means.
- **Invariant — no change to `crm-finance.service.ts` or `crm-journey.service.ts`.** Those are the
  sibling specs'/proposals' own files.

## 4. DELTA — numbered transitions, each mapped to a slice and its proving test

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Replace `buildWinIndex`'s module-scope `DEPOSIT_RULE`/`IS_PROCEDURE` constants with one enabled-call `resolveDepositRule(ctx)` resolution, feeding the resolved rule into the buyer-selection query while preserving the disabled early return | S1 | Extend `crm-similarity.service.test.ts`: default and custom-rule query cases assert the resolver is called once with the exact `ctx`; the disabled case asserts it is not called; compiled default SQL remains unchanged and the custom case binds only its configured patterns |
| 2 | `keywords: []` still yields a total (non-`undefined`) predicate — every non-null description counts as a procedure — matching `notDepositMatchSql`'s existing contract | S1 | New unit case: empty-keywords rule → compiled SQL contains the `true`-shaped fragment; no dropped predicate |
| 3 | No behavior change to `similarWins`, `winIndexStatus`, the `POST /api/crm/insights/win-index` route, or `crm_win_embeddings`'s schema from this slice | S1 | Focused diff review confines this slice to the import/marker and `buildWinIndex` query construction plus its tests; if canonical S2/S3 is co-delivered, every additional file is traced to that owning spec rather than falsely requiring a two-file PR |
| 4 | The exact marker is removed only after 1-3 pass | S1 | `rg -n -F 'TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings' src/server/services/crm-similarity.service.ts` returns no match |

## 5. Approach

```
S0 (recon, ≤30 min, not a slice) ─▶ S1 (per-call resolution + marker removal)
```

One slice — recon in §2 already found no secondary consumer and no cache to invalidate for this
file, so the finance sibling's larger two-part shape does not apply here.

### Slice 0 — reconcile before editing (read-only)

```bash
cd minion_hub
gh repo view NikolasP98/minion_hub --json defaultBranchRef        # record the current default
git branch -r                                                     # confirm that branch exists locally/remotely
git log --oneline -5 -- src/server/services/crm-similarity.service.ts src/server/services/crm-deposit-rule.ts
rg -n 'resolveDepositRule' src/                                   # confirm canonical S2 still absent,
                                                                    # or already landed on this branch —
                                                                    # if landed, this slice only wires it in
rg -n -B3 -A3 'TODO\(handoff\)' src/server/services/crm-similarity.service.ts
rg -n 'IS_PROCEDURE|buildWinIndex' src/ --type ts                  # reconfirm no new consumer appeared
```

If canonical S2's `resolveDepositRule(ctx)` has already landed on the branch this work starts
from, Slice 1 below only needs to *call* it — do not re-implement or fork a second settings
reader. If it has **not** landed and is not being delivered in the same PR, stop: this spec's
Slice 1 has a hard prerequisite on that contract existing (same dependency the finance sibling
spec states), and implementing a stand-in here would fork the canonical rule-resolution path.
If the resolver is co-delivered, identify the canonical S2 commit(s)/files in the PR before using
the conditional scope checks below; those files are not owned by this slice and cannot be treated
as unexplained scope expansion.

### Slice 1 — per-call rule resolution in `buildWinIndex`

**Tags:** `logic`, `test` · **Estimate:** 2–4 h (small, single-file, single-call-site change)

**Prerequisite:** canonical S2's `resolveDepositRule(ctx): Promise<DepositRule>` is available in
the same branch/PR, exactly as `2026-08-17-hub-reserva-keyword-config-spec` §S2 defines it.

**Do:**
- Remove the module-scope `const DEPOSIT_RULE = DEFAULT_DEPOSIT_RULE;` and the module-scope
  `const IS_PROCEDURE = sql\`...\`;` (lines 55-57).
- Inside `buildWinIndex(ctx)`, after the existing `enabled(ctx)` early return, resolve
  `const rule = await resolveDepositRule(ctx);` once, and build the `IS_PROCEDURE` SQL fragment
  from `rule` at that point — a local `const`, not module scope — before it is used in the buyer
  query.
- Keep `notDepositMatchSql('ii.description', rule)` as the only way this file builds the
  predicate — do not hand-roll an equivalent `ilike`/`not ilike` expression.
- Leave `DEFAULT_DEPOSIT_RULE`/`escapeLikePattern`/`depositMatchSql`/`notDepositMatchSql`/
  `isDepositText` in `crm-deposit-rule.ts` untouched — this slice is a consumer-side change only.
- Remove the `TODO(handoff):` marker only after the DoD below passes.

**Files owned by this slice:** `src/server/services/crm-similarity.service.ts`,
`src/server/services/crm-similarity.service.test.ts`.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bunx svelte-kit sync
bun run vitest run src/server/services/crm-similarity.service.test.ts
# - existing PARITY case: mocked resolver returns DEFAULT_DEPOSIT_RULE → compiled query and bound
#   '%reserva%' params unchanged from today's snapshot; resolver called once with the exact ctx
#   (canonical S2's resolver tests separately prove absent crm_settings.value.deposit → default)
# - new case: mocked resolveDepositRule returning { keywords: ['adelanto','seña'], label: 'Adelanto' }
#   → resolver called once with the exact ctx; compiled query binds those escaped patterns,
#   never '%reserva%'
# - new case: mocked resolveDepositRule returning { keywords: [], label: 'x' } → the true-shaped
#   fragment appears; assert on the rendered SQL, not just "no throw"
# - disabled case still returns { indexed: 0 } and asserts resolveDepositRule was not called;
#   existing "MAPPING: ... no rows" behavior still passes

bun run vitest run       # full suite green, no new skips
bun run check            # 0 errors / 0 warnings

if rg -n -F 'TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings' \
  src/server/services/crm-similarity.service.ts; then
  exit 1
fi

rg -n '^const DEPOSIT_RULE =|^const IS_PROCEDURE =' src/server/services/crm-similarity.service.ts
# → no match (both are now call-scoped, not module-scoped)

git diff --name-only <base>...HEAD
# If resolveDepositRule existed at <base>:
# → src/server/services/crm-similarity.service.ts and its .test.ts only.
# If canonical S2/S3 is co-delivered:
# → those two files plus only files explicitly required by the co-delivered approved spec(s);
#   record the owning spec for each extra file. In either case this slice adds no schema/migration.
```

## 6. Cross-repo impact

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `crm-finance.service.ts`, `crm-journey.service.ts` | **None from this slice** — separate module-scope copies, separate specs/proposals own them | Focused Slice 1 diff; any co-delivered sibling edits are traced to their own approved spec |
| `crm_win_embeddings` (materialized `bought`/`snippet`) | **Indirect, already-flagged.** A rule change is only visible on the *next* `buildWinIndex()` call (operator-triggered rebuild); this slice does not add a rebuild trigger or staleness field | Owned by canonical S3's `staleDerivedCount` disclosure — not duplicated here; explicit out-of-scope below |
| `minion_site` (shared DB) | **None** — no DDL, no schema/type change | `git diff --name-only <base>...HEAD -- supabase/migrations db/schema` empty |
| `@minion-stack/db`, `@minion-stack/shared`, gateway WS protocol | **None** — no package or shared-type file touched | — |
| `minion/` gateway CRM tools, `paperclip-minion`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** | — |
| `POST /api/crm/insights/win-index` route contract | **None from this slice** — same request/response shape; only the query `buildWinIndex` runs internally changes | Focused Slice 1 diff leaves the route unchanged; any co-delivered canonical S3 route edit is reviewed and tested under that spec, not attributed here |

No alert-class cross-repo impact was found (unlike the canonical spec's ⚠️A2 gateway-tools alert,
which is that spec's concern, not re-raised here since this slice changes no gateway-adjacent
code).

## 7. Out of scope (explicit)

- **Redesigning `DepositRule`, `crm-deposit-rule.ts`'s public contract, normalization, the
  malformed-read fallback, or the write API.** Canonical S2/S3 own all of that.
- **A rebuild trigger, cron, or on-settings-write hook for `buildWinIndex`.** Today it is
  operator-triggered only (`POST /api/crm/insights/win-index`); this spec preserves that, it does
  not add automation.
- **Staleness disclosure** (`staleDerivedCount`, a warning log, a UI badge) for
  `crm_win_embeddings` rows built under a stale rule. Canonical S3's job (⚠️A3); implementing it
  here would fork that decision across two specs.
- **`crm-finance.service.ts` and `crm-journey.service.ts`** — the two sibling markers
  (`handoff-minion-hub-2785164896`, spec approved;
  `2026-08-20-handoff-minion-hub-2131866440-spec`, draft/pass 1 at this review). This spec does
  not classify, close, or edit either.
- **Reclassifying already-stored `crm_win_embeddings` rows.** Explicitly out of scope in the
  canonical spec and not reopened here.
- **Any `.svelte`/UI file.** No UI surface exists for this rebuild trigger beyond the existing
  route; none is added.

## 8. End-to-end verification and closure

Run Slice 1's complete DoD (§5) on the reconciled Hub branch confirmed by Slice 0.

```bash
cd minion_hub
bun run vitest run src/server/services/crm-similarity.service.test.ts
bun run vitest run          # full suite green
bun run check
if rg -n -F 'TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings' \
  src/server/services/crm-similarity.service.ts; then
  exit 1
fi
git diff --name-only <base>...HEAD
# Apply §5's conditional scope rule: exactly two files when the resolver pre-existed; otherwise
# every extra file must be traced to the co-delivered approved canonical/sibling spec.
```

**Ship gate:** §5's DoD all green; the exact marker absent from `crm-similarity.service.ts` on
the watched branch; the conditional scope rule is satisfied (exactly the two slice-owned files
when the resolver pre-existed, otherwise every extra file is traced to a co-delivered approved
spec); and a subsequent conclusive handoff sweep changes
`proposals/handoff-minion-hub-1323254565.md` to `status: closed` — proposal status is sweep-owned,
this implementation must not edit it or either index file manually.
