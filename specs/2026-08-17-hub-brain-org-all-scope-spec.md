---
id: 2026-08-17-hub-brain-org-all-scope-spec
title: "brain-vector org_all — make the unimplemented scope unrepresentable at the hub request boundary"
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-hub-brain-org-all-scope
verdict: pending
repos: [minion_hub, minion-meta]
tags: [logic, security, test]
type: fix
---

# brain-vector `org_all` — narrow the hub, keep the frozen contract

**Owner surface:** `minion_hub` — the brain-vector client (`brain-vector-client.ts`; the throw at
`:307` and the scope-mode union at `:27`, exact path resolved in S0) and its tests.
**Second surface:** `minion-meta` — `packages/shared/src/brain-vector/` (a **reserved-mode doc
comment and the missing binder tests only**; the wire contract does not change), one changeset, and
the proposal ledger.
**Design ancestors:**
[`2026-07-22-self-hosted-qdrant-brains-architecture`](2026-07-22-self-hosted-qdrant-brains-architecture.md)
(**shipped**) — §8.1 is the law this spec obeys: *"A signed `org_all` scope may be used only when
policy resolution proves the principal may read every enabled source in the organization; it is
never inferred merely because the Brain is Master"*; §12 WP-A/WP-C/WP-E split the work across
`@minion-stack/shared`, `minion`, and `minion_hub` (⚠️ A2); §8.4 defines vector-lane degradation.
[`2026-07-21-unified-brains-knowledge-architecture`](2026-07-21-unified-brains-knowledge-architecture.md)
— the Master/Focused Brain model that makes "the whole org" a tempting-but-unproven scope.
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — every slice is tagged `logic`/`security`/`test`: red-state TDD is mandatory, the fail-closed
rubric applies, **no UI-governance checks** (zero `.svelte` files in any slice), and per that table a
`security` tag means the score may *warn* but **never auto-pass** — the human gate is mandatory
however green §7 comes back.

---

## 0. Product

From the approved proposal `2026-08-17-hub-brain-org-all-scope`, verbatim:

> ## Problem
>
> brain-vector-client.ts:307 throws 'org_all vector scope is not implemented' while the type union
> (line 27) advertises it — runtime failure where the compiler could catch it.
>
> ## Definition of done
>
> Either implemented (org-RLS-scoped, no sourceIds filter) with a success-path test, or the type
> narrowed to source_list only.
>
> ## Out of scope
>
> New retrieval features.

**The proposal offers a fork and this spec takes the second branch: narrow.** §2 argues the choice
from evidence and states the exact condition that would flip it. The rest of the spec is the honest
cost of narrowing — because "delete a union member" is one line, and the three things that line
implies are not.

## 1. What is verified here, and what is carried

`packages/shared/` **is** checked out in this workspace and every claim in this section was read
from disk. `minion_hub/` is **not** (the meta-repo `.gitignore` excludes subprojects; there is no
`minion_hub` directory here), so every hub path, line number and symbol is a **carried claim** from
the proposal — written today, therefore fresh, but unverified. S0 turns them into fact.

### Verified in this checkout — the shared contract

| Fact | Evidence |
|---|---|
| `export type BrainVectorScopeMode = 'source_list' \| 'org_all'` | `packages/shared/src/brain-vector/contract.ts:38` |
| `org_all` is a full arm of **three** discriminated unions: the capability claims (`{ source_scope_mode: 'org_all'; source_scope_hash?: never }`), the request filters, and the bound scope | `contract.ts:53-57`, `:67-71`, `:73-77` |
| The request validator **accepts** `org_all` — and only when `sourceIds` is absent | `contract.ts:228-234` |
| `bindBrainVectorSearchScopeV1` **implements** `org_all` fail-closed: mode must match the capability, and an `org_all` capability carrying a `source_scope_hash` is rejected | `crypto.ts:113-144`, branch at `:127-132` |
| `BRAIN_VECTOR_MAX_SOURCE_IDS = 512` — the cap that makes `org_all` operationally interesting (⚠️ A4) | `contract.ts:5` |
| The contract is explicitly **frozen v1**: `BRAIN_VECTOR_CONTRACT_VERSION = 1`, "Frozen v1 Qdrant collection name", "Frozen v1 hash input encoding" | `contract.ts:1,24`, `crypto.ts:53-57` |
| `@minion-stack/shared@0.9.0`, `publishConfig.access: public`, exports a dedicated `./brain-vector` subpath | `packages/shared/package.json` |
| The `org_all` **request-validation** path is tested | `contract.test.ts:101-112` ("accepts org_all only when source ids are omitted") |
| The `org_all` **binder** path is **not tested at all** — `crypto.test.ts` mentions only `source_list` (`grep -n "org_all" crypto.test.ts` → zero hits) | `crypto.test.ts:104,113,119,192,198` |
| WP-A (the shared contract) is the **only** work package that has landed: its changeset is still unreleased in `.changeset/soft-brains-search.md`, and none of the 90 files in `supabase/migrations/` mentions `brain`, `vector`, `knowledge_chunks` or an outbox (WP-B) | `.changeset/soft-brains-search.md`; `ls supabase/migrations \| wc -l` → 90; `grep -rln 'knowledge\|brains' supabase/migrations/` → zero |

That last row is the load-bearing one: **the Qdrant rollout is at Phase 0.** The hub's brain-vector
client is pre-wired against a service that this repo shows no evidence of being deployed. That
changes the severity of the bug (⚠️ A5) and it is decisive for §2.

### Carried claims, load-bearing

1. **`brain-vector-client.ts` exists in `minion_hub`, throws at `:307`, and declares a scope-mode
   union at `:27`.** The directory is unknown from here (`src/lib/server/…` and
   `src/server/services/…` are both plausible by hub convention). S0 resolves it.
2. **Line 27 is a hub-local declaration, not the shared type.** Strong inference — the shared union
   lives at `contract.ts:38`, so a union at hub line 27 is either a local copy or a local re-export.
   **This is what makes narrowing hub-local and cheap.** If S0 finds the hub instead imports
   `BrainVectorScopeMode` directly, S1 declares a hub-local narrower alias rather than touching the
   package (⚠️ A1) — the shape of the fix is the same, the file is not.
3. **The vector lane is behind a feature flag and runs inside `Promise.allSettled`** — WP-E names a
   feature flag as a deliverable, and §8.4 says the hybrid search "uses `Promise.allSettled` as it
   does today". If both hold, today's throw is absorbed into a settled rejection and degrades to the
   lexical/fuzzy lanes rather than 500-ing a page. S0 must confirm, because it decides whether the
   PR describes a live outage or a pre-wiring defect. **Do not overstate it either way.**
4. **No caller can currently reach the `org_all` branch.** Implied by "not implemented" surviving in
   the tree. S0 proves it with a caller grep; a live caller flips §2's ruling.

### Slice 0 — recon (≤ 45 min, prepended to S1, not counted as a slice)

```bash
cd minion_hub
git branch -r                                    # settle the live base branch before branching

# 1. The file, the union, the throw                                        ← claims 1, 2
rg --files -g 'brain-vector*'
rg -n 'org_all' src/ --type ts                   # EVERY hit: type, throw, comment, test
rg -n -B30 -A10 'not implemented' <resolved brain-vector-client path>
sed -n '1,60p' <resolved brain-vector-client path>
#    Record: is line ~27 a local `type … = 'source_list' | 'org_all'`, or an import/re-export
#            from '@minion-stack/shared'? This decides WHERE S1 narrows.

# 2. Callers: can anything construct org_all today?                        ← claim 4, DECISIVE (§2)
rg -n 'scopeMode|source_scope_mode|sourceIds' src/ --type ts
rg -n 'brainVectorSearch|brain-vector-client|mintCapability|source_scope_hash' src/ --type ts
#    Record every construction site and whether any of them can produce 'org_all' from data
#    (a DB column, a settings jsonb, a request body) rather than from a literal.

# 3. Blast radius of the throw                                             ← claim 3, ⚠️ A5
rg -n -B15 -A15 'allSettled' src/ --type ts | rg -C10 -i 'vector|semantic'
rg -n -i 'flag|FEATURE_|QDRANT|BRAIN_VECTOR' src/lib/server src/server --type ts | head -30
#    Record: (a) is the vector lane inside Promise.allSettled? (b) is it flag-gated, and is the
#            flag on for any org? (c) is there a structured-warning helper the lane already uses?

# 4. The >512 boundary — the only legitimate use of org_all                ← ⚠️ A4, sizes S2
rg -n 'MAX_SOURCE_IDS|512|batch|partition|chunk\(' <resolved client> src/lib/server --type ts
#    Record: does a partition/batch path EXIST, or is >512 sources simply unhandled today?
#    If the allowed-source resolver is reachable, sample the real distribution on the dev DB:
#      select count(*) from knowledge_sources where org_id = '<dev org>' and enabled;  -- per org

# 5. Contract compatibility: does hub already validate against the shared contract?
rg -n 'isBrainVectorSearchRequestV1|@minion-stack/shared' src/ --type ts | head
ls src/**/brain-vector*.test.ts 2>/dev/null    # the test home S1 extends, or creates

# 6. Contention check before branching
git log --oneline -15 -- <resolved client path>
```

Record the four actuals — **(a) local union or shared import, (b) whether any caller can produce
`org_all`, (c) whether the lane is `allSettled`-wrapped and flag-gated, (d) whether a >512 batching
path exists** — in the PR description. Nothing in S0 changes a file.

## 2. The ruling: narrow at the hub, do not implement, do not touch the wire contract

The proposal accepts either branch. This spec picks **narrow**, for four reasons, in order of
weight:

1. **Implementing is not a hub-local change.** `org_all` is an end-to-end wire mode. For a minted
   `org_all` capability to return candidates, `brain-vector-api` (**repo `minion`**, WP-C,
   `services/brain-vector/`) must verify it, omit the source filter, and keep the org filter —
   and §1 shows the rollout is at Phase 0, with WP-C not evidenced anywhere. A hub that mints
   `org_all` against a service that rejects it converts a compile-visible gap into a
   capability-rejection at runtime: the same class of bug, one network hop further away.
2. **`org_all` has a *precondition*, not just an implementation.** §8.1: it may be used "only when
   policy resolution proves the principal may read every enabled source in the organization; it is
   never inferred merely because the Brain is Master." That proof — module authorization, record and
   field policy, source enablement, all intersected — is a policy engine deliverable, not an `if`.
   Shipping the mode without the proof is precisely the failure the architecture wrote that sentence
   to prevent. The proposal's effort estimate (M) does not buy it, and its own out-of-scope line
   ("new retrieval features") reads against it.
3. **Narrowing is reversible and costs the platform nothing.** The shared contract keeps all three
   `org_all` arms, so whoever implements WP-C and the policy proof finds the wire mode waiting.
   Only the hub's *request-construction* surface loses it — a strict subtype of
   `BrainVectorSearchRequestV1`, so nothing in `@minion-stack/shared` changes and no consumer
   breaks (⚠️ A1).
4. **The compiler is the right place for it.** The proposal's own framing — "runtime failure where
   the compiler could catch it" — is satisfied exactly and only by making the mode unrepresentable
   at the boundary.

**The condition that flips this ruling.** If S0 step 2 finds a caller that already constructs
`scopeMode: 'org_all'` — i.e. the throw is reachable in a shipped path rather than dead pre-wiring —
then narrowing would delete a live capability and the decision inverts. **Stop, record the caller,
and re-spec against WP-C's status in the `minion` repo.** Do not implement `org_all` inside this
spec's slices on the strength of a single grep hit; a scope-widening mode is not a thing to add
under time pressure.

## 3. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (org_all unrepresentable at the hub boundary; the throw is deleted)
                 ─▶ S2 (the >512-source path gets one defined, tested behavior)
                       ─▶ S3 (shared: reserved-mode docs + the untested binder branch + regression guard)
```

Sequential. **S1 alone satisfies the proposal's DoD sentence** ("the type narrowed to source_list
only"). S2 exists because narrowing removes the only escape hatch the 512-cap has, and S3 exists
because the branch this spec declines to use is currently untested in a *published* package. If the
wave cuts scope, cut after S2 — and then the AGENTS.md **open-items ledger** rule applies: a
`TODO(handoff):` at the binder plus an append to the source proposal.

---

### S1 — `org_all` becomes unrepresentable at the hub request boundary

**Tags:** `logic`, `security`, `test` · **Estimate:** 4–6 h

**Goal:** the hub can no longer *write* a brain-vector request whose scope mode is `org_all`. The
throw at `:307` is deleted because its branch is gone, not because its condition was hidden.

**Do:**
- Narrow the hub's scope-mode type to the single literal `'source_list'`. Per S0's finding:
  - *the union at `:27` is hub-local* → change it in place to `type … = 'source_list'`;
  - *the hub imports `BrainVectorScopeMode` from `@minion-stack/shared`* → **do not edit the
    package** (⚠️ A1). Declare a hub-local `type HubBrainVectorScopeMode = Extract<
    BrainVectorScopeMode, 'source_list'>` and use it on every request-construction signature, so the
    narrowing is derived from the shared type and breaks loudly if the shared union is ever renamed.
- Delete the `org_all` branch and its `throw` at `:307`. The request builder's parameter types now
  make the branch unreachable; a dead `throw` behind an impossible condition is worse than no throw,
  because it reads as a handled case.
- **Keep exactly one fail-closed runtime guard, at the boundary where a scope mode can arrive from
  data rather than from a literal** (a settings value, a DB column, a request body — S0 step 2
  enumerates them; if there are none, this bullet is a no-op and the PR says so). It must:
  - reject anything that is not `'source_list'` — never fall through, never widen;
  - be a **named, structured** failure that flows into the existing vector-lane degradation
    (§8.4: record a structured warning, continue with lexical/fuzzy, never broaden scope), not a
    bare `throw new Error(...)` string;
  - carry the reason and the offending value in the warning, so the next occurrence is diagnosable
    from logs rather than from a stack trace.
- **Compatibility assertion, not a copy.** Add a test that the request the hub builds satisfies
  `isBrainVectorSearchRequestV1` imported from `@minion-stack/shared` — Phase 0 item 5's
  "compatibility tests in Hub and service", which is what keeps a hub-local narrowing from drifting
  into a hub-local *dialect*.
- Comment the narrowing at the type site with one sentence and a pointer: `org_all` is
  contract-reserved and requires WP-C plus the §8.1 policy proof; this spec id; not a TODO, because
  nothing here is deferred — see S3 for the ledger entry that is.

**Files:** the resolved `brain-vector-client.ts`, its test file (create if absent), and any hub
module S0 shows re-declaring or re-exporting the scope mode.

**Verification criteria (automated):**
```bash
cd minion_hub
bun run vitest run <brain-vector client test path>
#   red-state first (G3):
#   - COMPILE: a `// @ts-expect-error` case constructing a request with scopeMode: 'org_all'
#     — the expect-error must be *needed* (removing it fails `bun run check`)     ← the proposal's DoD
#   - HAPPY PATH: a source_list request is built and satisfies isBrainVectorSearchRequestV1()
#     imported from @minion-stack/shared (not a locally re-declared validator)
#   - FAIL-CLOSED: a scope mode arriving from data as 'org_all' (or any other string) is rejected,
#     emits ONE structured warning naming the value, and does NOT produce a request
#   - DEGRADATION: that rejection does not reject the enclosing hybrid search — lexical/fuzzy
#     results still return (assert on the search result, not on the thrown value)      ← §8.4
bun run check                                    # 0 errors / 0 warnings
rg -n "'org_all'" src/ --type ts                 # → only the reserved-mode comment (+ the
                                                 #   @ts-expect-error test); ZERO construction sites
rg -n 'not implemented' <resolved client path>   # → no hits
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                       && exit 1  # no UI
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)'  && exit 1  # no DDL
```

---

### S2 — the >512-source path gets one defined, tested behavior

**Tags:** `logic`, `security`, `test` · **Estimate:** 5–7 h

**Goal:** the case `org_all` existed to serve — a principal whose allowed source list exceeds
`BRAIN_VECTOR_MAX_SOURCE_IDS` (512, verified §1) — has a single, deterministic, tested outcome
instead of an unhandled path. **This slice does not build batching.**

**Do:** per S0 step 4, exactly one of:

- **A batching/partition path already exists.** Then this slice is a test slice: pin it at the
  boundary (511, 512, 513, 1024 sources) and assert that (i) no single request carries more than 512
  source IDs, (ii) each batch gets its own capability, (iii) candidates are merged before
  rehydration, and (iv) the merge is order-independent. §8.1 describes this behavior; today it is
  almost certainly unasserted.
- **No batching path exists.** Then define the degradation and make it loud — **do not implement
  batching** (the proposal excludes new retrieval features, and batching is a WP-E deliverable in
  its own right):
  - take the first 512 IDs of `canonicalizeBrainVectorSourceIds(allowed)` — the shared canonical
    order (sorted, de-duplicated, ASCII-pinned, `crypto.ts:85-99`), so the truncation is
    deterministic and reproducible rather than dependent on query order;
  - emit **one** structured warning carrying `{ allowed: N, sent: 512, dropped: N-512, orgId,
    brainId }` — a silent cap here is exactly the "looks implemented from every surface except its
    output" failure this proposal class exists to kill;
  - leave `TODO(handoff): partition >512 source scopes per 2026-07-22-self-hosted-qdrant-brains-architecture §8.1`
    at the truncation site and file the follow-up proposal (§4 lists the file);
  - **never** widen instead of truncating. Truncation loses recall; widening loses the
    authorization property the whole architecture is built on (⚠️ A3).

**Files:** the resolved `brain-vector-client.ts` (or the allowed-source resolver S0 names), its test
file, and — in `minion-meta` — a new `proposals/2026-08-17-hub-brain-source-scope-batching.md` if
the truncation path is taken.

**Verification criteria (automated):**
```bash
cd minion_hub
bun run vitest run <brain-vector client test path>
#   red-state first (G3):
#   - BOUNDARY: 511 → one request, 511 ids · 512 → one request, 512 ids · 513 → the chosen
#     behavior, asserted exactly (N batches, or 512 ids + one warning naming dropped=1)
#   - DETERMINISM (truncation path): the ids sent equal
#     canonicalizeBrainVectorSourceIds(allowed).slice(0, 512) — assert set AND order, twice with
#     the input array shuffled, and prove the two runs are identical
#   - NEVER WIDEN: no code path in this file produces a request without sourceIds — assert every
#     built request satisfies isBrainVectorSearchRequestV1 AND has scopeMode 'source_list'
#   - WARNING: exactly one structured warning per truncated search, carrying the counts (assert on
#     the stubbed logger, not on stdout)
bun run vitest run                               # full hub suite green; no new skips
bun run check                                    # 0/0
```

---

### S3 — shared package: reserved-mode docs, the untested binder branch, and the regression guard

**Tags:** `security`, `test`, `docs` · **Estimate:** 4–6 h

**Goal:** the branch this spec declines to use is documented as reserved and — for the first time —
tested, and the hub cannot quietly re-acquire it.

**Do:**
- **Test the `org_all` binder branch** in `packages/shared/src/brain-vector/crypto.test.ts`. Verified
  §1: it has **zero** `org_all` coverage today, while `bindBrainVectorSearchScopeV1` (`crypto.ts:113-144`)
  is the single fail-closed chokepoint every server-side scope decision passes through. Cases:
  - `org_all` capability + `org_all` request → `{ orgId, scopeMode: 'org_all' }`, and **no**
    `sourceIds` key on the returned object (assert with `'sourceIds' in bound === false`, not
    `=== undefined` — the union says `?: never`);
  - `org_all` capability that *carries* a `source_scope_hash` → throws (`crypto.ts:128-130`);
  - mode mismatch **both** directions: `source_list` capability + `org_all` request, and `org_all`
    capability + `source_list` request → both throw (`crypto.ts:124-126`);
  - `org_all` request carrying `sourceIds` → rejected before binding, by the request validator;
  - `org_all` capability with an empty `org_id` → throws (`crypto.ts:118-120`).
- **Mark the mode reserved** with a doc comment on `BrainVectorScopeMode` (`contract.ts:38`) and on
  the binder's `org_all` branch: reserved in the frozen v1 contract, **not minted by `minion-hub`**,
  and mintable only once WP-C serves it and §8.1's policy proof exists. **No type, validator, or
  runtime behavior changes in this package** — §6 forbids it and §7 guards it.
- **Regression guard, hub-side.** A test that fails if hub source re-acquires an `org_all`
  construction site — a narrow matcher over the brain-vector client's source (the
  `@ts-expect-error` case must be excluded by construction, not by a broad ignore), with a comment
  explaining why it exists and a failure message pointing at this spec. A grep in a spec catches it
  once; a test catches it forever.
- **Changeset.** Add `.changeset/<slug>.md` with `'@minion-stack/shared': patch` **only if** a
  non-test file under `packages/shared/src/` changes (the doc comment does — it ships in the emitted
  `.d.ts`). Test-only changes need none. Root CI runs `changeset:status`, so this is a gate, not a
  nicety.
- **Ledger.** Append to `proposals/2026-08-17-hub-brain-org-all-scope.md`: which branch of its fork
  was taken, why (§2), and what re-enabling `org_all` would now require. Also append to the batching
  proposal if S2 created one.

**Files:** `packages/shared/src/brain-vector/crypto.test.ts`,
`packages/shared/src/brain-vector/contract.ts` (comment only),
`packages/shared/src/brain-vector/crypto.ts` (comment only), `.changeset/<slug>.md`,
`proposals/2026-08-17-hub-brain-org-all-scope.md`, plus the hub guard test.

**Verification criteria (automated):**
```bash
cd ~/work                                        # meta-repo
pnpm -F @minion-stack/shared test                # red-state first: the five binder cases above
pnpm -F @minion-stack/shared typecheck           # tsc --noEmit, clean
pnpm -F @minion-stack/shared lint                # oxlint src
pnpm run changeset:status                        # green (patch changeset present iff src changed)

# the contract itself must be untouched apart from comments — mechanical check:
git diff -U0 <base>...HEAD -- packages/shared/src/brain-vector/contract.ts \
                              packages/shared/src/brain-vector/crypto.ts \
  | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-]\s*(\*|/\*|//|$)' \
  && echo "FAIL: non-comment change to the frozen v1 contract" && exit 1

rg -n "'org_all'" packages/shared/src/brain-vector/contract.ts   # → the union arms still exist
cd minion_hub && bun run vitest run              # guard test present and green; full suite green
```

---

## 4. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `minion_hub` — resolved `brain-vector-client.ts` | S1, S2 | scope-mode narrowed to `'source_list'`; `org_all` branch + throw deleted; one fail-closed data-boundary guard; the >512 behavior |
| `minion_hub` — its test file (create if absent) | S1, S2, S3 | `@ts-expect-error` compile case, contract-compatibility assertion, degradation, boundary/determinism cases, regression guard |
| `minion_hub` — any module re-declaring/re-exporting the scope mode (S0) | S1 | narrowed alongside, or left importing the narrowed alias |
| `packages/shared/src/brain-vector/crypto.test.ts` | S3 | **new coverage** for the `org_all` binder branch (five cases) |
| `packages/shared/src/brain-vector/contract.ts` | S3 | **comment only** — `org_all` marked contract-reserved, not hub-minted |
| `packages/shared/src/brain-vector/crypto.ts` | S3 | **comment only** — same note on the binder branch |
| `.changeset/<slug>.md` | S3 | `@minion-stack/shared: patch`, iff a non-test `src/` file changed |
| `proposals/2026-08-17-hub-brain-org-all-scope.md` | S3 | ledger append: which fork branch, why, what re-enabling needs |
| `proposals/2026-08-17-hub-brain-source-scope-batching.md` (new) | S2 | only on the truncation path |

**Zero DDL, zero `.svelte`, zero wire-contract change** in either repo — guarded mechanically in
§3 and §7.

## 5. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". The plausible zones are **shared packages**
and **gateway protocol**; the ruling in §2 is what keeps both at zero.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `@minion-stack/shared` consumers (`minion_hub`, `minion_site`, `paperclip-minion`, `minion`) | **None.** The exported types, the validator and the binder are byte-identical apart from comments; the hub's narrowed type is a strict subtype of `BrainVectorSearchRequestV1` | the non-comment-diff guard in S3's DoD; `pnpm run build-all && pnpm run typecheck-all` at the root |
| npm release of `@minion-stack/shared` | **Patch at most** — a doc comment in the emitted `.d.ts`. No API removal, no version-range break for any consumer | `pnpm run changeset:status`; the changeset is `patch`, never `minor`/`major` |
| `minion` — `services/brain-vector` (WP-C) | **Alert, not a dependency.** The hub simply never mints `org_all`; the service's own `org_all` handling (if it exists) is unexercised, exactly as today. If WP-C lands later, nothing here blocks it | `rg -n 'org_all\|scopeMode' ~/work/minion/src ~/work/minion/services 2>/dev/null` at PR time — paste the result either way |
| `minion_site` (shares the DB and the package) | **None** — no brain-vector construction there; verify rather than assume | `rg -n 'brain-vector\|scopeMode' ~/work/minion_site/src` → expect zero |
| Supabase schema / `@minion-stack/db` | **None** — no column, table, index or migration | `git diff --name-only <base>...HEAD \| grep -E '(supabase/migrations\|db/schema)'` in both repos |
| Gateway WS protocol (`packages/shared/src/gateway`) | **None** — the brain-vector contract is a separate `./brain-vector` export subpath and no frame type is touched | `git diff --name-only … -- packages/shared/src/gateway` → empty |
| `paperclip-minion`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** | — |

### ⚠️ A1 — narrowing the *shared* type is the wrong lever, and it is the obvious one

The tempting reading of "narrow the type to source_list only" is to delete the `org_all` arms at
`contract.ts:38,53-57,67-71,73-77`. Do not. That is a breaking change to a **frozen v1 wire
contract** in a **public npm package** (verified §1), it deletes an already-implemented, already-
validated binder branch, it contradicts the shipped architecture §8.1 which designs the mode, and it
would force a coordinated change in `minion` (WP-C) for zero benefit — the hub's own type is what
the compiler checks when the hub builds a request. The narrowing belongs at the hub boundary; S3's
non-comment-diff guard is what makes that mechanical rather than a matter of reviewer attention.

### ⚠️ A2 — "implemented" is three repos, not one file

Per §12: WP-A (`@minion-stack/shared`) ✅ landed, WP-C (`minion`, the vector API that must honour an
`org_all` capability) — no evidence, WP-E (`minion_hub`, the retrieval adapter and the policy
resolution that would have to *prove* org-wide read) — partial, this file. Implementing `org_all` in
the hub alone produces a request the service rejects. This is the single strongest argument in §2 and
it should be restated in the PR description, because "just implement it, it's a few lines" is the
review comment this spec exists to answer.

### ⚠️ A3 — `org_all`'s real cost is recall, and it is silent

It is tempting to think a widened vector scope is harmless because §8.3 rehydrates every candidate
under RLS and drops what the principal may not read. The text does not leak. What leaks is the
**candidate budget**: `BRAIN_VECTOR_MAX_CANDIDATES = 200` (`contract.ts:4`), and an over-wide ANN
query fills those 200 slots with points that rehydration then discards — so a user with access to a
small slice of a large org gets fewer real results the wider the scope goes, with no error and no
warning anywhere. That is why S2 truncates rather than widens, and why "it's authorized downstream
anyway" is not a reason to ship the mode casually.

### ⚠️ A4 — the 512 cap is the only reason `org_all` exists, so S2 is mandatory

§8.1 introduces `org_all` immediately after the 512-source batching rule; it is the escape hatch for
principals whose allowed scope is larger than one request can express. Narrowing without defining
the >512 behavior would trade a compile-visible gap for a runtime-invisible one — the exact swap
this proposal objects to. S2 is therefore not optional polish; it is the other half of S1.

### ⚠️ A5 — state the severity accurately, in either direction

If S0 confirms the lane is flag-gated and wrapped in `Promise.allSettled`, then today's throw is
**pre-wiring debt in an unshipped lane**, not a live outage — and the PR must say so plainly rather
than inheriting the urgency of a 500. If S0 finds the opposite (a reachable, unwrapped throw on a
served path), that is a materially bigger finding than the proposal claims, and it belongs in the PR
title. Either way the fix in S1 is the same; only the description changes. Do not let the fix's
smallness set the description's tone before S0 answers.

### ⚠️ A6 — contention on brain/knowledge work

`.changeset/soft-brains-search.md` is still unreleased in this checkout, i.e. the contract landed
recently and adjacent Brains work may be in flight. Before S3, check for concurrent edits to
`packages/shared/src/brain-vector/` and to the hub client (`git log --oneline -15 --` on both).
Scope commits narrowly, never `git add -A`, and do not rebase someone else's contract work under
this spec's changeset.

## 6. Out of scope (explicit)

- **New retrieval features** — the proposal's own exclusion. No new lane, no new filter, no ranking,
  fusion, or rehydration change.
- **Implementing `org_all` end to end** — the vector API side (WP-C, repo `minion`), the §8.1 policy
  proof that a principal may read every enabled source, and the capability minting without a
  `source_scope_hash`. §2 states the condition under which that becomes a new spec.
- **Building source-scope batching/partitioning.** S2 *defines and tests* the >512 behavior; if no
  batching path exists it truncates deterministically, warns, and files a proposal. It does not
  build the partition-and-merge machinery §8.1 describes.
- **Any change to the frozen v1 wire contract** — no type, validator, hash, capability claim,
  collection name, dimension, or error-code change in `packages/shared/src/brain-vector/`. Comments
  and tests only. Removing the `org_all` arms is specifically forbidden (⚠️ A1).
- **The vector service, the outbox, the worker, the Swarm deployment, or the rollout phases.**
- **The feature flag** — no flag is flipped, added, or renamed; no org is enrolled or unenrolled.
- **Master/Focused Brain policy semantics** — membership, source enablement and the intersection
  rules are owned by `2026-07-21-unified-brains-knowledge-architecture`.
- **UI** — no `.svelte` file in any slice, so the `ui` tag and its governance gates
  (`lint:design` / `lint:tokens`, the ui-design-governance skill) do **not** apply, per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Schema changes.** No column, table, index or migration in either repo.

## 7. End-to-end verification

Run with all three slices merged, on the hub base branch confirmed in S0.

```bash
# ---- meta-repo -------------------------------------------------------------
cd ~/work
pnpm -F @minion-stack/shared test                # includes the five new org_all binder cases
pnpm -F @minion-stack/shared typecheck
pnpm -F @minion-stack/shared lint
pnpm run build-all && pnpm run typecheck-all     # every workspace consumer still compiles
pnpm run changeset:status
git diff -U0 <meta-base>...HEAD -- packages/shared/src/brain-vector/contract.ts \
                                   packages/shared/src/brain-vector/crypto.ts \
  | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-]\s*(\*|/\*|//|$)' \
  && echo "FAIL: non-comment change to the frozen v1 contract" && exit 1
git diff --name-only <meta-base>...HEAD | grep -E '^supabase/migrations' && echo "FAIL: no DDL" && exit 1
rg -n "'org_all'" packages/shared/src/brain-vector/contract.ts   # → arms intact, now commented

# ---- hub -------------------------------------------------------------------
cd minion_hub
bun run check                                    # 0 errors / 0 warnings
bun run vitest run                               # full suite green; no new skips
rg -n "'org_all'" src/ --type ts                 # → reserved-mode comment + the @ts-expect-error
                                                 #   test ONLY; zero construction sites
rg -n 'not implemented' <resolved client path>   # → zero hits          ← the proposal's problem
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                       && exit 1
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)'  && exit 1

# the proposal's DoD, literally: removing the expect-error must break the build
sed -i 's|// @ts-expect-error org_all is not representable|// |' <test path> && ! bun run check \
  && echo "OK: the narrowing is real" ; git checkout -- <test path>

# ---- sibling-repo check — paste the result either way ----------------------
rg -n 'org_all|scopeMode|brain-vector' ~/work/minion/src ~/work/minion/services \
      ~/work/minion_site/src ~/work/paperclip-minion 2>/dev/null

# ---- live behavior on a dev org (only if S0 shows the vector lane is enabled) ----
# a. run a Master Brain search on the largest dev org; it returns results and the logs show
#    source_list capabilities only — no 'not implemented', no capability rejection
# b. if that org has >512 enabled sources (or one is seeded), confirm the S2 behavior: either N
#    batched requests, or one 512-id request plus exactly one structured warning with the counts
# c. if the lane is flag-gated off, say so in the PR and skip a/b — do NOT enable a flag to
#    demonstrate this fix
```

**Ship gate:** §7 all green; S0's four recorded actuals (local union vs shared import; whether any
caller can produce `org_all`; whether the lane is `allSettled`-wrapped and flag-gated; whether a
>512 batching path exists) pasted into the PR; §2's ruling restated in the PR with ⚠️ A2's
three-repo argument; the S2 branch taken named explicitly, with its proposal filed if it truncates;
the ⚠️ A5 severity stated accurately; the shared contract's non-comment diff proven empty; and —
because a slice is tagged `security` (`2026-08-17-sdlc-phase-gates-scoring-spec` §4b) — **human
approval, which no score may substitute for.**
