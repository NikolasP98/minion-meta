---
id: 2026-08-20-handoff-minion-hub-2131866440-spec
title: "Handoff marker crm-journey.service.ts:44 — complete the journey side of the org-configurable deposit rule"
stage: spec
status: done
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-2131866440
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-17-hub-reserva-keyword-config-spec]
type: fix
tags: [logic, test]
slice_tags: [1:logic+test]
possibly_shipped: https://github.com/NikolasP98/minion_hub/pull/152
done_reason: "Verified complete on master b7bd02cf: all 6 DELTA items (resolveDepositRule import, label fix, tests, integration test, zero handoff markers) — subagent verification 2026-08-20."
---

# Complete the journey side of the org-configurable deposit rule

## 0. Product

The source proposal is complete when the journey service reads the org-configurable rule named by
the marker and the exact `TODO(handoff):` comment is removed. Observable journey behavior is:

- invoices containing at least one non-deposit item produce a `purchase` milestone labelled from
  the selected non-deposit item;
- deposit-only invoices produce a `reserve` milestone;
- configured keywords decide which invoice items are deposits; and
- a configured label may rename the `reserve` milestone, while an org with no deposit config must
  continue to see `Reserved a consult`.

No route or response shape changes. The output remains `Milestone[]`; only classification and the
configured reserve label may change.

## 1. Relationship classification (recommend-only)

`relationship: extends` — the approved
[`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md)
owns the shared rule shape, settings boundary, normalization, and S2 requirement to remove this
marker. Its S1 has landed on `minion_hub/master`: at remote commit
`5e77bbe7a15aec126651f6cdac76672020153abd`, `crm-journey.service.ts:44` contains the exact marker
and uses the extracted `crm-deposit-rule.ts` predicates.

Current source disproves one carried assumption in the canonical spec. A deposit-only invoice is
currently labelled `Reserved a consult`; `DEFAULT_DEPOSIT_RULE.label` is `Reserva` but is not used
by the journey mapper. Therefore, replacing the live label with `rule.label` as canonical S2 says
would violate the same slice's byte-identical absent-config invariant. The query also selects an
unused alias named `only_reserva_flag`, which would fail the canonical zero-hardcode guard even
after the marker is removed. This spec adds only the journey-specific correction and proof needed
to make canonical S2 internally consistent; it does not redesign the shared matching rule.

The sibling handoff proposals `handoff-minion-hub-1323254565` and
`handoff-minion-hub-2785164896` remain independently owned markers. Implement them in the same
canonical S2 branch/PR where practical, but do not classify, close, or edit them from this spec.

## 2. Verified AS-IS

Evidence was read from public `minion_hub/master` source at
`5e77bbe7a15aec126651f6cdac76672020153abd`; this workspace does not contain a Hub checkout.
Before implementation, Slice 0 must repeat the checks on the actual integration base and watched
branch and record any drift.

- `crm-journey.service.ts` binds `DEPOSIT_RULE = DEFAULT_DEPOSIT_RULE` at module load. Its private
  `deterministicMilestones` function builds three rule-dependent expressions: a selected but unused
  `only_reserva_flag`, `has_proc`, and representative-item ordering.
- The row mapper ignores `only_reserva_flag`. `has_proc` alone selects `purchase` versus `reserve`;
  the reserve label is the hardcoded English string `Reserved a consult`, not
  `DEFAULT_DEPOSIT_RULE.label`.
- Both public entry points, `contactJourney` and `analyzeJourney`, call
  `deterministicMilestones`. Neither path caches the deterministic finance query.
- `crm-journey.service.test.ts` snapshots the default SQL and bound `%reserva%` parameters, then
  injects `has_proc` from a mock to test JS mapping. It does not prove that a configured rule is
  resolved, that a real row produces the expected `has_proc`, or that a configured label is used.
- `crm-deposit-rule.sql.integration.test.ts` is the existing PostgreSQL proof home for the shared
  predicates, but journey still needs an executed query-path assertion rather than relying only on
  an isolated helper test.

Operator memory `/memory/MINION/factory/2026-08-20-2f403efa.md` records that CRM SQL integration
fixtures have drifted to `uuid` `org_id` while production uses `text`, and that DB-backed tests can
skip when PostgreSQL/PGlite is absent. Any journey fixture added or extended here must use `text`
org ids, and a skipped new integration case is not passing evidence.

## 3. TO-BE

For each `contactJourney` or `analyzeJourney` call:

1. Resolve canonical S2's normalized `DepositRule` once through the CRM settings boundary before
   building the deterministic finance query. Reuse that rule for every predicate and for mapping
   the result; do not resolve at module initialization, once per row, or once per SQL fragment.
2. Build `has_proc` and representative-item ordering from that resolved rule. Remove the unused
   `only_reserva_flag` projection rather than retaining a dead, default-vocabulary alias.
3. Preserve current mapping for an absent or malformed deposit config: a deposit-only invoice is
   `{ type: 'reserve', label: 'Reserved a consult' }`. To make this compatible with one resolved
   rule, the normalized default label must be `Reserved a consult`, including when an explicit
   config omits `label`. This journey-specific correction supersedes the canonical spec's carried
   `label: 'Reserva'` default; finance and similarity do not consume the label.
4. When a valid config supplies `label`, use it only for `reserve` milestones. Purchase milestones
   remain labelled from the chosen non-deposit item.
5. Preserve the canonical empty-keyword contract. With `keywords: []`, no item is a deposit, so an
   invoice with a non-null item is a purchase; no reserve milestone is emitted for that invoice.
6. Only after these conditions pass may the exact journey marker be removed.

Canonical S2 remains authoritative for absent versus explicitly empty keywords, malformed-read
fallback/warning behavior, normalization caps, wildcard escaping, org scoping, and the settings
write contract.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Replace the module-default rule with one call-scoped resolved rule shared by the journey query and mapper | S1 | entry-point tests show one resolver call and configured bound patterns for both `contactJourney` and `analyzeJourney` |
| 2 | Remove the unused `only_reserva_flag` projection and all journey-local `reserva` text without changing classification | S1 | compiled-query assertions plus bounded source guards |
| 3 | Preserve `Reserved a consult` for absent/malformed config and make it the normalized omitted-label default | S1 | exact default-parity and malformed-fallback assertions |
| 4 | Apply an explicit configured label only to deposit-only `reserve` milestones | S1 | custom-rule query-path test returns the configured reserve label while purchase labels remain item-derived |
| 5 | Prove custom and empty rules through an executed SQL path with production-compatible fixture types | S1 | non-skipped integration cases cover deposit-only, mixed, non-deposit, and empty-keyword invoices |
| 6 | Remove only the exact journey marker after D1-D5 pass | S1 | exact-text guard returns no match in `crm-journey.service.ts`; sibling markers remain independently owned |

## 5. Slice 0 — reconcile before editing (read-only)

On the current Hub integration base and watched branch, record:

- the exact marker and whether canonical S2 or another active branch/PR already changed it;
- all callers of `contactJourney`, `analyzeJourney`, and `deterministicMilestones`;
- every use of `DEFAULT_DEPOSIT_RULE`, `depositMatchSql`, `notDepositMatchSql`,
  `only_reserva_flag`, and `Reserved a consult` in journey source/tests;
- the actual settings-resolver path/export if canonical S2 has landed;
- whether any journey result is cached outside this service; and
- the fixture schema and runtime prerequisite for the SQL integration test selected below.

`minion_hub/CLAUDE.md` documents `dev` as the integration branch, but the public `dev` ref was not
available during this review while `master` resolved to the commit above. Branch from the actual
live integration ref; do not create or resurrect a branch merely to match stale documentation.

If another branch already satisfies every DELTA item, run this spec's verification there and add
the evidence to that PR instead of creating a duplicate implementation. If the shared resolver
contract differs from canonical S2, revise the canonical contract before implementing a second
settings reader.

## 6. Slice 1 — finish the journey integration (3–5 h)

**Prerequisite:** canonical S2's `resolveDepositRule(ctx)` contract is available in the same branch
or is implemented in the same PR, with the default-label correction in §3.3.

**Implementation requirements:**

- Resolve once at the private deterministic boundary so each public call performs one settings
  read and passes one rule through the SQL and mapping path.
- Remove the unused `only_reserva_flag` projection. Keep the two live classifications explicit:
  `notDepositMatchSql` determines whether a non-deposit procedure exists, while
  `depositMatchSql` keeps deposit items behind non-deposit items in representative-item ordering.
- Preserve SQL parameter binding, org-scoped `withOrgCore`, query limits, response types, AI
  milestone persistence, and purchase-item labels.
- Use `rule.label` only for the `reserve` mapping after correcting the normalized default to
  `Reserved a consult`.
- Extend an executed PostgreSQL/PGlite journey query test, or create
  `crm-journey.sql.integration.test.ts` if no suitable file exists. Its new cases must execute,
  use `text` `org_id`, and fail rather than skip when their DB prerequisite is unavailable in the
  required gate.
- Remove the exact marker only after the tests pass. Do not remove the similarity or finance
  markers.

**Files expected:**

- `src/server/services/crm-journey.service.ts`
- `src/server/services/crm-journey.service.test.ts`
- `src/server/services/crm-deposit-rule.ts` and its unit test for the corrected default label
- the selected existing CRM SQL integration test, or a new
  `src/server/services/crm-journey.sql.integration.test.ts`
- optionally the canonical S2 settings-service file/test when this work shares its branch/PR

No route, UI, schema, migration, shared-package, or gateway-protocol file belongs to this slice.

**Definition of done:**

```bash
cd minion_hub
bunx svelte-kit sync
bun run vitest run src/server/services/crm-deposit-rule.test.ts \
  src/server/services/crm-journey.service.test.ts
# New assertions, with no skips:
# - absent deposit key => exactly the S1 SQL/output contract and label "Reserved a consult"
# - malformed deposit value => warning + the same default SQL/output; no throw
# - custom ['adelanto','seña'] + label "Deposit paid" => configured escaped patterns are bound,
#   '%reserva%' is absent, deposit-only => reserve/"Deposit paid", mixed => purchase/item label
# - keywords: [] => total false/true predicates; a non-null item produces purchase, not reserve
# - contactJourney and analyzeJourney each resolve settings exactly once per call

# Run the exact SQL integration file selected in Slice 0 with its DB prerequisite available.
# Its new default/custom/empty cases must execute (not skip), use text org_id fixtures, and prove
# deposit-only, mixed, and non-deposit invoice classification plus representative-item ordering.

bun run vitest run
bun run check

if rg -n -F 'TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings' \
  src/server/services/crm-journey.service.ts; then
  exit 1
fi

if rg -n -i 'reserva|only_reserva_flag' src/server/services/crm-journey.service.ts; then
  exit 1
fi
```

The canonical `reserva` default remains allowed only in `crm-deposit-rule.ts` and tests. The final
guard is bounded to journey source and does not claim ownership of sibling markers.

## 7. Impact zones

| Surface | Impact | Required handling |
|---|---|---|
| `contactJourney` and `analyzeJourney` | Both call the deterministic finance query and expose its milestones. | Resolve exactly once on both paths and test both entry points. |
| Journey API/page consumers | Response shape is unchanged; configured classification and reserve label may change values. | Preserve `Milestone` and route contracts; exercise the existing service-facing consumer test if Slice 0 finds one. |
| AI `_journey` custom field | Stored AI milestones remain separate from the live deterministic invoice milestones and are not rewritten by this change. | Preserve the existing atomic write path; no backfill. |
| Hub caches | No service-local cache exists in verified source; Slice 0 must check external callers before relying on that. | If a journey-result cache is found, make its identity/invalidation rule-sensitive and add immediate next-call proof. |
| `minion_site`, DB schema, `@minion-stack/db`, shared WS protocol | No impact: this reads an additive existing jsonb key and changes no schema or shared type. | No files or changesets. |
| Gateway CRM tools | Remains canonical spec alert A2 under its separate proposal. | Do not widen this slice. |

## 8. Out of scope

- Redesigning keyword normalization, escaping, malformed-read policy, the write API, or stale
  `crm_win_embeddings`; those remain canonical S2/S3 concerns.
- Similarity and finance implementation beyond coordination in one canonical S2 PR.
- Reclassifying historical invoices or stored AI milestones.
- Changing invoice totals, query limits, response shapes, UI, DDL, or gateway tools.
- Renaming the `MilestoneType` value `reserve`; it is an API value, not a vocabulary hardcode.
- Removing unrelated current or future `TODO(handoff):` markers.

## 9. End-to-end verification and closure

Run Slice 1's complete DoD on the reconciled Hub branch. Exercise one org through the actual
journey read under absent, custom, and explicitly empty config and confirm the immediately next
call reflects each state. Record the executed integration-test count so a missing DB cannot turn a
skip into evidence.

After merge, confirm the handoff sweep removes `handoff-minion-hub-2131866440` from its open queue
because the watched file contains no marker. The sweep owns proposal closure; do not manually edit
the proposal or any `index.json` as part of this implementation.
