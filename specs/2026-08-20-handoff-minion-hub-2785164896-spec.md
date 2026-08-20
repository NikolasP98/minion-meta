---
id: 2026-08-20-handoff-minion-hub-2785164896-spec
title: "Handoff marker crm-finance.service.ts:12 — complete the finance side of the org-configurable deposit rule"
stage: spec
status: approved
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-2785164896
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-17-hub-reserva-keyword-config-spec]
type: fix
tags: [logic, test, handoff-sweep]
possibly_shipped: https://github.com/NikolasP98/minion_hub/pull/145
---

# Complete the finance side of the org-configurable deposit rule

## 0. Product

The source proposal says the marker's open end is resolved only when the service reads the
org-configurable rule planned by canonical S2 and the marker is removed. That is the scope here.
The observable finance behavior affected by the rule is classification, not invoice arithmetic:
`purchased`, `reservedOnly`, `loyal`, representative-item ordering, `topProduct`, and the contacts
roster/funnel finance flags can change with the rule; invoice counts and summed invoice totals must
not change merely because the keyword set changes.

## 1. Relationship classification (recommend-only)

`relationship: extends` — the approved
[`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md)
owns the rule shape, normalization, settings read/write boundaries, and the S2 requirement to
remove this marker. Its S1 has landed on `minion_hub/master`: at remote commit
`5e77bbe7a15aec126651f6cdac76672020153abd`, `crm-finance.service.ts:12` contains the exact marker
and consumes `DEFAULT_DEPOSIT_RULE` through the extracted `crm-deposit-rule.ts` helpers.

The canonical S2 is necessary but its written file/consumer inventory is no longer sufficient for
the code produced by S1. `crm-finance.service.ts` now exports the rule-dependent, module-scope
`CONTACT_INVOICE_CLASS` SQL fragment, and `crm-contacts.service.ts::runRankQuery` imports that
fragment to derive roster/funnel finance flags. The finance map is also cached for two minutes
under a tenant-only key. Merely resolving a rule inside the obvious finance query would therefore
leave the contacts query on the default and can leave the cached finance result on the prior rule.
This spec adds only those implementation requirements needed to make the canonical S2 true for the
quoted finance marker; it does not redefine the rule or duplicate the similarity/journey work.

The sibling handoff proposals `handoff-minion-hub-1323254565` and
`handoff-minion-hub-2131866440` remain independently owned markers in similarity and journey.
They should be implemented in the same canonical S2 branch/PR where practical, but this spec does
not classify, close, or edit them.

## 2. Verified AS-IS

Evidence was read from the public `minion_hub/master` source at
`5e77bbe7a15aec126651f6cdac76672020153abd` because this meta-repo workspace does not contain a
Hub checkout. Before implementation, Slice 0 must repeat the checks on both the integration base
(`dev`, per `minion_hub/CLAUDE.md`) and the proposal's watched branch (`master`) and record drift.

- `crm-deposit-rule.ts` contains `DEFAULT_DEPOSIT_RULE`, escaping, both SQL polarities, and the
  TS predicate. This proves canonical S1 landed.
- `crm-finance.service.ts` binds `DEPOSIT_RULE = DEFAULT_DEPOSIT_RULE` at module load and builds
  `IS_DEPOSIT`, `IS_PROCEDURE`, and exported `CONTACT_INVOICE_CLASS` from it. The same default is
  also passed directly in `contactFinanceSummary` and `rankCustomers`.
- `crm-contacts.service.ts::runRankQuery` imports `CONTACT_INVOICE_CLASS` and the aggregate
  fragments from the finance service. Its `fin_purchased` and `fin_reserved_only` outputs therefore
  share the finance marker's default-rule limitation even though that file carries no copy of the
  marker.
- `contactFinanceMap` caches the classification-bearing result for two minutes with a key containing
  only the tenant id. A settings read performed only inside its cache loader is not “once per call”
  and cannot make a direct `crm_settings` change visible on the next invocation.
- Existing finance unit tests snapshot SQL containing bound `%reserva%` parameters. They prove S1
  parity, not per-org resolution or cache freshness.

Operator memory `/memory/MINION/factory/2026-08-20-2f403efa.md` records a relevant test trap:
some CRM SQL integration fixtures declared `org_id` as `uuid` while production declares it as
`text`, and DB-backed suites can skip when their PostgreSQL/PGlite prerequisite is absent. Any
fixture extended here must use production-compatible `text` org ids, and a skipped new integration
case is not passing evidence.

## 3. TO-BE

For every finance or contacts service call whose SQL classification depends on deposits:

1. Resolve the normalized `DepositRule` once for that call through canonical S2's
   `resolveDepositRule(ctx)` settings boundary.
2. Build every rule-dependent SQL fragment from that resolved rule after resolution; no
   rule-dependent SQL value may remain frozen at module initialization.
3. Use that same resolved rule in `crm-contacts.service.ts::runRankQuery`, preserving the invariant
   that roster/funnel finance flags and finance detail/summary flags classify the same invoice the
   same way.
4. A changed normalized rule must affect the next service invocation for the same tenant, including
   `contactFinanceMap`; a previously cached result for a different rule must not be returned. The
   implementation may key the cache by a stable normalized-rule fingerprint or perform equivalent
   targeted invalidation, but the next-call behavior is mandatory.
5. With no `crm_settings.value.deposit` key, compiled predicates and observable outputs remain
   equivalent to S1. Changing only the rule may change classification fields and item selection,
   but not invoice totals or counts.
6. Only after these conditions pass may the exact `crm-finance.service.ts` marker be removed.

The canonical spec remains authoritative for absent versus explicitly empty keywords, malformed
read fallback/warning behavior, wildcard escaping, normalization caps, and the write contract.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Replace finance's module-default, module-scope rule-dependent SQL with SQL built from one resolved rule per public service call | S1 | compiled-query tests for `contactFinanceMap`, `contactFinanceSummary`, and `rankCustomers` show the configured patterns and no default pattern |
| 2 | Thread the same resolved rule through the `CONTACT_INVOICE_CLASS` consumer in `crm-contacts.service.ts` | S1 | contacts query test proves custom and explicitly-empty rules drive `fin_purchased` / `fin_reserved_only` with the same polarity as finance |
| 3 | Prevent the tenant-only finance cache from serving a result produced under a different normalized rule | S1 | same-tenant default→custom→empty sequence observes each new classification on the immediately following call without waiting for TTL |
| 4 | Preserve default compatibility and rule-independent invoice arithmetic | S1 | absent-config parity assertion plus custom-rule assertions that totals/counts are unchanged while only classification/item fields move |
| 5 | Remove only the exact finance marker after D1–D4 pass | S1 | bounded exact-text search returns no match in `crm-finance.service.ts`; sibling markers remain owned elsewhere |

## 5. Slice 0 — reconcile before editing (read-only)

On the current Hub integration base and watched branch, record:

- the exact marker text and whether canonical S2 or another active branch/PR has already changed it;
- all imports/uses of `CONTACT_INVOICE_CLASS`, `FIN_PURCHASED`, `FIN_RESERVED_ONLY`, and
  `FIN_LOYAL` (current evidence includes finance, contacts, and their tests);
- every deposit-rule use in `crm-finance.service.ts` and the cache key/tags around
  `contactFinanceMap`;
- the actual path/export for canonical S2's settings resolver, if it has landed; and
- the fixture schema and runtime prerequisite for every SQL integration test to be extended.

If the canonical S2 branch already implements every DELTA item, do not create a duplicate change:
run this spec's verification against that branch and add its evidence to the same PR. If the
resolver contract differs from the approved canonical S2, stop and revise the canonical spec; do
not invent a second settings reader here.

## 6. Slice 1 — finish the finance integration (4–6 h)

**Prerequisite:** canonical S2's `resolveDepositRule(ctx)` contract is available in the same branch
or is implemented in the same PR exactly as the canonical spec defines.

**Implementation requirements:**

- Convert rule-dependent exported SQL into a function or equivalent call-time construction that
  accepts the resolved `DepositRule`. `CONTACT_PARTY` and rule-independent aggregate expressions
  may remain constants.
- Resolve once in each finance/contacts call path, then reuse that object for every predicate in
  that call. Do not query settings once per row, loop iteration, subquery, or helper occurrence.
- Keep `crm-contacts.service.ts` on the same finance-owned SQL builder rather than copying deposit
  predicates into contacts.
- Make `contactFinanceMap` cache identity/invalidation rule-sensitive so a same-tenant rule change
  is visible immediately. Tests must exercise the public cached function, not only its loader.
- Preserve all existing module gates, org scoping, SQL parameter binding, cache tenant isolation,
  and finance response shapes.
- Remove the exact marker only after the tests below pass. Do not delete or claim ownership of the
  similarity/journey markers.

**Files expected:**

- `src/server/services/crm-finance.service.ts`
- `src/server/services/crm-contacts.service.ts`
- `src/server/services/crm-finance.service.test.ts`
- the existing contacts service or SQL integration test that covers `runRankQuery`
- optionally the canonical S2 settings-service file/test only when this work shares its branch/PR

No route, UI, schema, migration, shared package, or gateway-protocol file belongs to this slice.

**Definition of done:**

```bash
cd minion_hub
bunx svelte-kit sync
bun run vitest run src/server/services/crm-finance.service.test.ts \
  src/server/services/crm-contacts.service.test.ts
# New assertions, with no skips:
# - absent deposit key => the S1 default SQL/output contract
# - custom ['adelanto','seña'] => finance and contacts bind those escaped patterns and never '%reserva%'
# - keywords: [] => total false/true predicates in both consumers; no dropped predicate
# - the same tenant called default -> custom -> empty sees each rule immediately through contactFinanceMap
# - invoice totals/counts stay fixed while classification and representative/top-product selection change

# Run the exact SQL integration file selected in Slice 0 with its DB prerequisite available.
# Its new cases must execute (not skip), use text org_id fixtures, and prove finance/contacts polarity.

bun run vitest run
bun run check

if rg -n -F 'TODO(handoff): rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings' \
  src/server/services/crm-finance.service.ts; then
  exit 1
fi

if rg -n '^const (DEPOSIT_RULE|IS_DEPOSIT|IS_PROCEDURE) =|^export const CONTACT_INVOICE_CLASS =' \
  src/server/services/crm-finance.service.ts; then
  exit 1
fi
```

The last guard targets the current module-scope declarations without forbidding call-local SQL
variables or renaming a call-time builder. The canonical default remains valid in
`crm-deposit-rule.ts` and may be used inside the settings resolver as its fallback.

## 7. Impact zones

| Surface | Impact | Required handling |
|---|---|---|
| `crm-contacts.service.ts` | **Affected downstream consumer.** It imports finance's classification CTE and exposes finance-derived roster/funnel values. | Use the same call-time rule and add contacts-query proof. |
| Hub cache | **Affected behavior.** Tenant-only cached classification can outlive the rule that produced it. | Rule-sensitive identity or equivalent targeted invalidation; prove next-call freshness. |
| Hub REST responses | Shapes are unchanged; configured classification can change existing finance/contact field values. | Preserve totals/counts and response types; test changed classification only. |
| `minion_site`, DB schema, `@minion-stack/db`, shared WS protocol | No impact: this reads an additive existing jsonb key and changes no schema or shared type. | No files or changesets. |
| Gateway CRM tools | Remains the canonical spec's separate A2 alert and proposal. | Do not widen this slice. |

## 8. Out of scope

- Redesigning `DepositRule`, its normalization, malformed-read policy, write API, or staleness
  disclosure; those remain canonical S2/S3 decisions.
- Similarity and journey implementation beyond coordination with their independently swept markers.
- Reclassifying historical `crm_win_embeddings` or cached ICP material.
- Changing revenue arithmetic, invoice counts, response shapes, UI, DDL, or gateway tools.
- Removing unrelated current or future `TODO(handoff):` markers.

## 9. End-to-end verification and closure

Run Slice 1's complete DoD on the reconciled Hub branch. In addition, inspect one fixture through
both the finance service and contacts ranking path under default, custom, and empty rules and
confirm their classification agrees after each immediate same-tenant change. Record the executed
integration-test count so a missing DB cannot turn a skip into evidence.

The proposal is complete only when all DELTA proofs pass, the exact finance marker is absent on the
watched branch, and a subsequent conclusive handoff sweep changes
`proposals/handoff-minion-hub-2785164896.md` to `status: closed`. Proposal status is sweep-owned;
this implementation must not edit it or either index file manually.
