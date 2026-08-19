---
id: 2026-08-17-hub-brain-org-all-scope-spec
title: "brain-vector org_all — make the unimplemented scope unrepresentable at the hub request boundary"
stage: spec
status: draft
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-hub-brain-org-all-scope
verdict: approved
repos: [minion_hub]
tags: [logic, security, test]
type: fix
---

# brain-vector `org_all` — narrow the hub, keep the frozen contract

## 0. Decision and scope

The proposal permits either implementing `org_all` or narrowing the advertised hub type to
`source_list`. This spec chooses the second branch: the hub request-construction boundary must
represent only `source_list`, and the current `org_all vector scope is not implemented` runtime
branch must be removed.

This is a `minion_hub`-only change. It does not alter the frozen v1 wire contract in
`packages/shared/src/brain-vector/`, implement `org_all`, add source batching or truncation, or
change retrieval behavior for any already-supported request.

The governing architecture is
[`2026-07-22-self-hosted-qdrant-brains-architecture`](2026-07-22-self-hosted-qdrant-brains-architecture.md),
especially §8.1: source lists larger than 512 are partitioned, while `org_all` is permitted only
after policy resolution proves org-wide access. The Master/Focused model comes from
[`2026-07-21-unified-brains-knowledge-architecture`](2026-07-21-unified-brains-knowledge-architecture.md).
Per [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b,
red-state TDD and a human security gate apply. No UI file is in scope.

## 1. Evidence and assumptions

Verified in the current meta-repo checkout:

- `BrainVectorScopeMode` in `packages/shared/src/brain-vector/contract.ts` is
  `'source_list' | 'org_all'`; request filters, capability claims and bound scopes retain both
  arms.
- `isBrainVectorSearchRequestV1` accepts `org_all` only without `sourceIds`.
- `bindBrainVectorSearchScopeV1` implements fail-closed binding for both modes.
- `BRAIN_VECTOR_MAX_SOURCE_IDS` is 512.
- Architecture §8.1 requires partitioning for allowed lists larger than 512; it does not authorize
  truncation.

`minion_hub` is not present in this checkout, so the proposal's path, line numbers, local type
shape, call sites and test locations are not verified here. Recon below must resolve them before
editing.

## 2. Required recon and stop conditions

On the current `minion_hub` development base, record in the PR description:

```bash
rg --files -g 'brain-vector*'
rg -n "org_all|not implemented" src --type ts
rg -n "scopeMode|source_scope_mode|sourceIds|brainVectorSearch" src --type ts
```

Classify every `org_all` hit as a type declaration, request construction, runtime guard, comment,
or test.

- If no production caller can construct `org_all`, continue with §3.
- If any production caller can construct `org_all`, stop without changing code. Narrowing would
  remove reachable behavior, and implementing the mode would require a new cross-repo spec covering
  the vector API and the §8.1 policy proof. Record the caller in the proposal ledger under the
  repository's open-items rule.
- If the apparent hub type is imported directly from `@minion-stack/shared`, do not narrow the
  shared export. Introduce a hub-local subtype at the request-construction boundary.
- If the client has no hub-owned request-construction type to narrow, stop and re-spec; deleting a
  runtime branch alone does not satisfy the proposal's compiler-enforcement DoD.

These are evidence gates, not alternative implementation branches.

## 3. Implementation slice — narrow the hub request boundary

**Tags:** `logic`, `security`, `test`

### Required change

1. Narrow the hub-owned scope type used by every brain-vector request-construction entry point to
   the literal `'source_list'`.
   - If the type is hub-local, narrow it in place.
   - If the boundary currently uses `BrainVectorScopeMode` from `@minion-stack/shared`, derive a
     hub-local alias such as
     `type HubBrainVectorScopeMode = Extract<BrainVectorScopeMode, 'source_list'>` and use that alias
     at all hub request-construction entry points.
2. Delete the now-unreachable `org_all` branch and its `not implemented` throw.
3. Preserve existing validation for values that enter from untyped data. If recon finds such an
   ingress, parse it before request construction and reject every value other than `source_list`
   through the vector lane's existing structured-error/degradation path. Do not add a second logging
   or degradation mechanism. If no untyped ingress exists, no runtime guard is required.
4. Add a short comment at the narrowed type explaining that `org_all` remains reserved by the v1
   contract and requires the architecture §8.1 policy proof before the hub may mint it.

### Tests

Add tests in the existing client/request-builder test home (create the nearest conventional test
file only if none exists):

- A compile-time negative case proves a hub request-construction API cannot be called with
  `scopeMode: 'org_all'`. Use `// @ts-expect-error`; the line must produce a TypeScript error when
  the directive is removed.
- A `source_list` request still builds successfully and passes
  `isBrainVectorSearchRequestV1` imported from `@minion-stack/shared`.
- If recon found an untyped ingress, an `org_all` value is rejected before a vector request is
  emitted, and the enclosing hybrid search follows its existing degradation behavior. Assert the
  observable result and the existing structured diagnostic, not a new error-string contract.

The tests must fail for the pre-change implementation for the intended reason before production
code is changed.

### Files

- The resolved `minion_hub` brain-vector client/request-builder module.
- Its existing test file, or the nearest conventional test file if absent.
- A hub module that directly re-exports or independently redeclares the request-construction scope
  type, but only when recon proves it is part of that same boundary.

No `packages/shared`, proposal, changeset, schema, migration, or `.svelte` file is part of this spec.

## 4. Verification and definition of done

Resolve the placeholders during recon and record the commands and results in the PR:

```bash
cd minion_hub
bun run vitest run <resolved-test-path>
bun run check
bun run vitest run

rg -n "org_all|not implemented" <resolved-client-path> <other-resolved-boundary-files>
# Expected production-code result: no org_all construction or runtime branch; only the reserved
# contract comment may remain. Tests may contain the intentional negative case.

if git diff --name-only <base>...HEAD | grep -E '\.svelte$'; then exit 1; fi
if git diff --name-only <base>...HEAD \
  | grep -E '(supabase/migrations|db/schema|packages/shared)'; then exit 1; fi
```

The change is done only when all of the following are true:

- recon found no reachable production `org_all` caller and no stop condition fired;
- a hub request-construction API rejects `org_all` at compile time, demonstrated by a necessary
  `@ts-expect-error` directive;
- supported `source_list` construction remains valid against the shared v1 validator;
- the `not implemented` runtime branch is gone;
- any untyped ingress found by recon fails closed before request emission and retains the existing
  vector-lane degradation behavior;
- the targeted test, full hub test suite and hub check command exit zero with no new skips;
- the diff is confined to the hub files listed in §3 and contains no UI, schema, migration or
  shared-contract change; and
- a human approves the security-tagged change.

## 5. Cross-project impact

| Surface | Impact |
|---|---|
| `minion_hub` | Its request-construction type no longer advertises an unimplemented mode. |
| `@minion-stack/shared` | None. The frozen v1 `org_all` contract and binder remain intact. |
| `minion` vector API | None. The hub continues not to mint `org_all`. |
| `minion_site`, `paperclip-minion`, gateway protocol | None; no shared export or protocol changes. |
| Database and UI | None. |

## 6. Out of scope

- Implementing `org_all` or its policy proof.
- Source-list batching, partitioning, truncation, candidate merging, or any other >512-source
  behavior. Architecture §8.1 owns that work; silently truncating an allowed scope is not an
  acceptable substitute.
- Changes to `packages/shared`, its tests or documentation.
- Changesets or proposal-ledger edits unless a recon stop condition invokes the existing
  open-items rule.
- Feature flags, retrieval ranking/fusion, rehydration, schema, migrations, or UI.
