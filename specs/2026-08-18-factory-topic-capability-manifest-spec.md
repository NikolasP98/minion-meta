---
id: 2026-08-18-factory-topic-capability-manifest-spec
title: Topic taxonomy + immutable execution manifest (policy resolver)
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory, minion-meta]
proposal: 2026-08-18-factory-topic-capability-manifest
verdict: pending
type: infra
tags: [logic, infra]
relationship: new
related: [2026-08-18-factory-workitem-handoff-schema-spec, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-sdlc-transformation-roadmap, 2026-08-18-factory-orchestration-round7, 2026-08-18-factory-browser-verification-stage, 2026-08-17-factory-worker-containment]
---

# Topic taxonomy + immutable execution manifest (policy resolver)

## 0. Problem (quoted from the approved proposal)

> Audit 2026-08-18: the pipeline has tags but no topic→capability policy.
> Target architecture: declared topics + repo policy + deterministic changed-path
> classification → immutable execution manifest → stage-specific skills/tools →
> mandatory evidence → merge/deploy policy.
>
> **Definition of done (S1):** `runner/src/topics.ts` canonical taxonomy with
> aliases and deterministic path classifiers; manifest resolved at queue time
> {policyVersion, declared/derived/effective topics, risk, requiredStages,
> requiredEvidence}, persisted with a hash on the run; final-diff reclassification
> after every push that is MONOTONIC (may add risk/gates, never remove);
> commit trailers (Factory-Run/Spec-SHA/Topics/Profile) + PR labels as
> projections of the DB manifest; meta templates/validators require canonical
> topics and per-slice topics; regression tests for order-independence,
> unknown-topic rejection, and downgrade prevention.
>
> **Out of scope:** browser tooling (separate security-gated proposal);
> GitHub App check identities (capability-separation proposal).

This is milestone **M3** of the [[2026-08-18-sdlc-transformation-roadmap]] ("topic/risk/
capability policy"), governing principles 3 ("unknown inputs fail closed"), 4 ("topics
never directly grant capabilities"), 5 ("risk only increases after approval without human
reapproval") and 11 ("the DB manifest is authority; git branch/trailers/labels/checks are
projections").

## 1. Relationship classification

**Relationship: `new`** — no existing spec or proposal builds a topic taxonomy, a
policy-resolved execution manifest, or diff-based reclassification. Related artifacts below
are things this spec **extends, is consumed by, or must not collide with** — none of them
already satisfy the proposal's DoD.

| id | relation |
|---|---|
| [[2026-08-18-factory-workitem-handoff-schema-spec]] | Approved, not yet built. Its Slice 4 defines `risk_class` on **proposal** frontmatter (proposal-level, tag-derived, projected into `proposals/index.json`). This spec's taxonomy is the **topic** registry that Slice 4's `risk_class` derivation should eventually read from instead of its own hardcoded `HIGH_STAKES_TAGS` copy — noted as a follow-up, not built here (disjoint files: that spec never touches `runner/src/topics.ts` or `specs/topics.json`). |
| [[2026-08-18-factory-m0-safety-foundation-spec]] | Approved, partially live (see AS-IS). Its S2 changes `RepoDef.requiredChecks` to `{name, appId}[]`. This spec's Slice 4 reads `REPOS[...].requiredChecks` inside `automerge.ts` **unchanged** — string-array or object-array, the existing `names.has(name)` check keeps working either way; no collision. |
| [[2026-08-18-factory-durable-state-outbox-spec]] | Draft, changes_requested, not yet built. Adds `runner/src/events.ts` and an `outbox_jobs` table. This spec adds different columns (`manifest_json`, `manifest_hash`, `manifest_prev_hashes`) to the **same** `runs` table in `runner/src/db.ts` — both are additive `ALTER TABLE` blocks; land in either order, do not delete the other's migration lines. |
| [[2026-08-18-sdlc-transformation-roadmap]] | Program plan; this spec is its M3 deliverable. |
| [[2026-08-18-factory-orchestration-round7]] (proposal) | **Downstream, not built.** States "Depends on: topic-capability-manifest" — its scenario profiles select from this spec's manifest. This spec ships only a `Profile: none` placeholder trailer/field; do not implement profile selection here (§7 out-of-scope). |
| [[2026-08-18-factory-browser-verification-stage]] (proposal) | **Downstream, not built.** States "Blocked by: worker-containment and topic-capability-manifest." Its browser stage should be one entry in this spec's `requiredStages` extension table (§4), gated on a `ui`-class effective topic — this spec defines the table's shape, not the stage itself. |
| [[2026-08-17-factory-worker-containment]] (proposal) | Draft, unrelated files (review-container isolation). No overlap; named only because it co-blocks browser-verification-stage above. |

## 2. Owner surface

**minion-factory** (`NikolasP98/minion-factory`, private, default branch `main`) — new
`runner/src/topics.ts` (+`runner/src/topics.test.ts`), new `runner/src/manifest.ts`
(+`runner/src/manifest.test.ts`), `runner/src/db.ts`, `runner/src/queue.ts`,
`runner/src/automerge.ts` (+ its existing test file once
[[2026-08-18-factory-orchestration-tests-spec]] lands one, else a new
`runner/src/automerge.test.ts`), `agent/run.sh`, `runner/README.md`.

**minion-meta** (this repo) — new `specs/topics.json`, `specs/TEMPLATE.md`,
`proposals/TEMPLATE.md`, `scripts/spec-index.mjs`, `scripts/proposal-index.mjs`, new
`scripts/topics.mjs` + `scripts/topics.test.mjs`, `.github/workflows/ci.yml` (one new step
inside the existing `verify` job — the job **name** stays `verify`, required-check matching
is unaffected), `package.json` (one new root script).

**Live baseline reviewed:** `minion-factory/main` commit `967c1af92c87bfc08a07590b246efa6d8fd82cc0`
(2026-08-18T06:18:43Z), read via `gh api repos/NikolasP98/minion-factory/contents/...` (this
repo is meta-gitignored and not checked out locally). Re-read every touched file before
implementation — this is a drift gate, not permission to implement the stale excerpts quoted
below if concurrent factory specs land first.

## 3. AS-IS (verified against the live baseline)

- `runner/src/risk.ts` is the entire "policy" that exists today: three hardcoded `Set`s —
  `HIGH_STAKES_PLAN` (`security`, `data`), `HIGH_STAKES_MERGE` (adds `infra`, `auth`, `perms`,
  `permissions`, `migration`, `migrations`, `billing`), `LOW_STAKES_MERGE` (`docs`, `test`,
  `deps`). `RISK_POLICY_VERSION = 1` exists as a constant but nothing persists which version a
  decision was judged under. There is no taxonomy, no aliasing (`perms` vs `permissions` are
  two separate strings, never unified), and no changed-path derivation — risk is a pure
  function of whatever free-text `tags:` a human or the auto-triage sweep put on the spec.
- The actual tag vocabulary in use today (union of `specs/index.json` + `proposals/index.json`)
  is `board, data, deps, docs, duplication, edge-case, hardcoded, infra, logic, security, test,
  todo, ui, unwired, ux` — **six of these fifteen** (`auth`, `perms`, `permissions`, `migration`,
  `migrations`, `billing`) that `risk.ts` treats as high-stakes have never actually been used on
  a spec or proposal, and conversely five real, frequently-used tags (`board`, `duplication`,
  `edge-case`, `hardcoded`, `todo`, `unwired`) are unknown to `risk.ts` entirely (silently
  `unclassified`, not rejected — there is no rejection path). `ui` and `ux` are two separate
  strings with no declared relationship.
- `runner/src/queue.ts:queueDevForSpec()` snapshots `fm.tags` into `run.spec_tags` (a raw JSON
  array of whatever strings the spec frontmatter had) at queue time. This is the only "manifest"
  that exists — no `policyVersion`, no derived/effective split, no risk field, no
  requiredStages/requiredEvidence, no hash column. `runner/src/db.ts`'s `runs` table has
  `spec_sha` and `spec_tags` columns only.
- `runner/src/automerge.ts:sweep()` reads `run.spec_tags` (the immutable snapshot — already
  correctly never re-reads the mutable meta branch) and merges only when
  `tagList.every(t => LOW_STAKES_MERGE.has(t))`. It fetches the PR's check-runs but **never
  fetches the PR's changed files** — there is no diff-based signal anywhere in the merge
  decision. A spec tagged `[docs]` whose implementation drifted into touching
  `runner/src/auth.ts` would auto-merge exactly as if it had stayed docs-only.
- `agent/run.sh` opens the draft PR with `gh pr create --body "Autonomous factory run
  \`${FACTORY_RUN_ID}\`... **Task**... **Stages**..."` and the branch's first commit is
  `factory: start run ${FACTORY_RUN_ID} — ${FACTORY_TITLE}`. No structured trailers of any kind
  exist in commit messages or PR bodies today. No PR labels are ever applied by the runner.
- `runner/src/github.ts:fetchMetaFile(path)` already fetches arbitrary files from the meta repo
  at `META_BRANCH` (used today for `specs/${id}.md`) — the mechanism this spec needs to fetch
  `specs/topics.json` already exists and needs no new auth/plumbing.
- minion-meta's `scripts/spec-index.mjs` / `scripts/proposal-index.mjs` project `fm.tags`
  verbatim into the committed index with **zero validation** against any registry — any string
  is accepted. `scripts/spec-frontmatter.mjs` is the shared flat-YAML parser both scripts import;
  it has no concept of tags/topics beyond treating `tags:` as a bracketed string list. There is
  no `scripts/*.test.mjs` file anywhere in the repo today — `pnpm run test-all`
  (`.github/workflows/ci.yml`'s `verify` job) is `pnpm -r --parallel --if-present run test`,
  which only runs workspace packages (`packages/*`); root-level `scripts/` is invisible to it.

## 4. TO-BE

- One canonical topic taxonomy, versioned (`policyVersion`), with explicit aliases, lives as
  **committed data in minion-meta** (`specs/topics.json` — specs/proposals are meta-repo
  artifacts and their authors need offline, no-network validation). minion-factory's
  `runner/src/topics.ts` fetches and caches it via the existing `fetchMetaFile()` — no
  duplicated taxonomy literal in two repos (a duplicate is a drift trap: principle 3 requires
  unknown inputs to fail closed, which a stale hardcoded copy silently violates).
- `runner/src/topics.ts` additionally owns **deterministic changed-path classifiers**, keyed by
  repo id (this is inherently factory-side: only the runner ever sees a target repo's file
  tree). Classification output is **order-independent** — sorting is part of the contract, not
  an implementation detail, because it feeds a hash.
- Every dev/spec run gets a **manifest** resolved at queue time —
  `{policyVersion, declared, derived, effective, risk, requiredStages, requiredEvidence}` —
  persisted as `runs.manifest_json` + `runs.manifest_hash` (sha256 of the canonical-sorted JSON).
  An unknown declared topic **refuses to queue** (fail closed), same posture as the existing
  repo-mismatch 400.
- After every push that the runner can observe (a completed run, an auto-fix requeue on the
  same branch — the only points at which the runner ever re-reads a PR's actual diff), the
  automerge sweep re-derives topics from the PR's real changed files and **unions** them into
  the stored manifest. Union is monotonic: risk, `requiredStages`, and `requiredEvidence` may
  only grow; a diff that reveals higher stakes than the original snapshot suggested makes the
  run merge-ineligible even if its original tags were all low-stakes. Nothing this spec adds may
  ever *loosen* an existing merge gate (M0's check-identity/PR-identity/head-sha binding are
  untouched).
- Commit trailers and PR labels are **projections the runner writes from its own manifest
  record**, never agent-authored free text — consistent with the existing pattern that only
  `run.sh`'s `emit()` (script-stamped `headSha`) and the runner's `finish()` write evidence
  fields, never the harness output directly.
- minion-meta's index generators reject any tag that does not resolve (via the taxonomy or an
  alias) to a canonical topic, with the offending file+tag named in the error, same style as the
  existing missing-field errors.

## 5. Design decisions

1. **Single source of truth, fetched not duplicated.** `specs/topics.json` in minion-meta is
   canonical; `runner/src/topics.ts` fetches it (cached with a TTL and an on-disk last-known-good
   fallback under `FACTORY_DATA`). A fetch failure with **no** cache available fails closed
   (`resolveManifest()` throws — a run cannot queue without a resolvable policy). A fetch failure
   **with** a cache available returns the cached policy tagged `stale: true` in logs only, never
   silently treated as fresh.
2. **Backward-compatible seed, not a retrofit.** `topics.json`'s initial content must accept
   every tag currently present in `specs/index.json` + `proposals/index.json` verbatim (the
   fifteen strings in §3) union `risk.ts`'s three sets (adds `auth`, `perms→permissions` alias,
   `migration→migrations` alias, `billing`), each given a `riskTier` (`unclassified` default,
   `low` for `risk.ts`'s low-stakes set, `high` for its high-stakes set). No mass-editing of the
   100+ existing spec/proposal files is required or in scope — the validator must round-trip the
   whole current corpus with zero errors before this lands (a Slice 1 DoD, not a hope).
3. **`requiredStages`/`requiredEvidence` are an extension table, not new stages.** This spec adds
   the *shape* (`{docs:[], ui:['self-test'], infra:['self-test'], default:[]}`-style pure lookup)
   so [[2026-08-18-factory-browser-verification-stage]] can later add a `browser-verify` entry
   keyed on a `ui`-class topic without touching this spec's resolver again. No stage this spec
   names is wired to anything that doesn't already exist (`self-test` already runs today).
4. **`Profile` is a literal placeholder.** [[2026-08-18-factory-orchestration-round7]] owns
   scenario-profile selection; this spec's manifest and trailer both carry `profile: none` /
   `Profile: none` until that spec lands. This is stated explicitly wherever `Profile` appears so
   it never reads as a silently-broken feature.
5. **Reclassification hooks into the existing 30-minute automerge sweep**, not a new push
   webhook. [[2026-08-18-factory-postmerge-discovery-loop-spec]] is the eventual home for
   signed push/merge webhooks (approved, not yet built); building a second, narrower webhook here
   would duplicate that infrastructure. "After every push" is satisfied at the two points the
   runner already re-touches a PR post-initial-queue: the automerge sweep (every 30 min while a
   PR sits open+passed) and `postFinish()` after each auto-fix requeue (which is itself a new
   push). The reclassification function is pure and reusable — a future webhook can call it
   without duplicating the diff→topics logic.

## 6. DELTA (numbered; each maps to a slice + proving test)

- **D1** Canonical taxonomy (`specs/topics.json`) exists, versioned, alias-resolving, and
  round-trips the entire current tag corpus with zero errors (→S1, T-SEED)
- **D2** minion-meta's index generators reject unknown/unresolvable tags, naming file+tag
  (→S1, T-UNKNOWN-META)
- **D3** `runner/src/topics.ts` fetches+caches the taxonomy, fails closed with no cache, serves
  stale-with-cache (→S2, T-FETCH)
- **D4** Deterministic, order-independent changed-path classification per repo (→S2, T-ORDER)
- **D5** Manifest resolved + hashed + persisted at queue time; unknown declared topic refuses to
  queue (→S3, T-QUEUE-UNKNOWN, T-HASH-STABLE)
- **D6** Final-diff reclassification is monotonic and gates automerge eligibility on the
  reclassified risk, not just the original snapshot (→S4, T-DOWNGRADE, T-RECLASSIFY-GATE)
- **D7** Commit trailers + PR labels are runner-authored projections of the persisted manifest,
  never agent-controlled text (→S5, T-TRAILER-RENDER, T-LABELS)
- **D8** Cross-repo policy-version discipline: a bumped `policyVersion` never silently
  reinterprets an already-persisted manifest (→S6, T-VERSION-PIN)

## 7. Slices

### Slice 0 — recon (fold into Slice 1's first hour)

Re-fetch `runner/src/risk.ts`, `runner/src/queue.ts`, `runner/src/automerge.ts`,
`runner/src/db.ts` at HEAD of `main` and diff against the excerpts quoted in §3. If
[[2026-08-18-factory-workitem-handoff-schema-spec]] or
[[2026-08-18-factory-durable-state-outbox-spec]] have landed changes to any of these files,
rebase this spec's plan around the new shape (e.g. if `fetchMetaFile` gained a `ref` parameter,
call it with an explicit ref rather than reintroducing a second signature) — never revert a
sibling spec's change to restore these excerpts.

### Slice 1 — canonical taxonomy + meta-side validation (minion-meta, 6h)

**Files:** `specs/topics.json` (new), `specs/TEMPLATE.md`, `proposals/TEMPLATE.md`,
`scripts/topics.mjs` (new — `loadTopics()`, `resolveTag(tag) → {canonical, riskTier} | null`),
`scripts/spec-index.mjs`, `scripts/proposal-index.mjs`, `scripts/topics.test.mjs` (new),
`.github/workflows/ci.yml`, `package.json`.

- `specs/topics.json`: `{policyVersion: 1, topics: [{name, aliases: [], riskTier, description}]}`.
  Seed per Design decision 2 — every one of the fifteen currently-used tags must appear as either
  a canonical `name` or an `aliases` entry; `risk.ts`'s six unused high-stakes strings are added
  as new topics/aliases with `riskTier: high` (or `low` for its low-stakes set).
- `scripts/topics.mjs`: pure loader + `resolveTag()`, no network, reads `specs/topics.json` from
  the working tree.
- `scripts/spec-index.mjs` / `scripts/proposal-index.mjs`: for every `fm.tags` entry, call
  `resolveTag()`; unresolved → push `${name}: unknown topic "${tag}" (see specs/topics.json)` to
  the existing `errors` array (same fail-the-build convention already used for missing fields);
  project the **resolved canonical name**, not the raw string, into the generated index entry.
- `specs/TEMPLATE.md` / `proposals/TEMPLATE.md`: document that `tags:` values must resolve via
  `specs/topics.json`; add an optional per-slice `**Topics:**` line convention to the body
  section (informational only — not validated this slice; retrofitting per-slice topics onto
  existing specs is out of scope, §8).
- `.github/workflows/ci.yml`: add a `Test meta scripts` step to the existing `verify` job running
  the new root script (job name `verify` is unchanged, so `requiredChecks: ['verify']` on
  `minion-meta` in minion-factory's `repos.ts` keeps matching).
- `package.json`: add `"test:scripts": "node --test scripts/*.test.mjs"`.

**DoD:** `node scripts/spec-index.mjs && node scripts/proposal-index.mjs` exit 0, byte-identical
`tags` output for every currently-untouched file (canonical-name projection only changes an entry
if its raw tag was an alias, e.g. `perms` → `permissions`) run against the **full existing
corpus** — T-SEED. A fixture spec (temp-file pattern per
[[2026-08-18-base-kanban-possibly-shipped-surface-spec]] §"fixture test") with `tags: [nonsense]`
makes `spec-index.mjs` exit 1 naming the file and `"nonsense"` — T-UNKNOWN-META. `node --test
scripts/*.test.mjs` green. `pnpm run test:scripts` runs clean locally and inside a scratch PR's
`verify` job.

### Slice 2 — `runner/src/topics.ts`: taxonomy fetch + path classifiers (minion-factory, 8h)

**Files:** `runner/src/topics.ts` (new), `runner/src/topics.test.ts` (new).

- `fetchTopicPolicy()`: `fetchMetaFile('specs/topics.json')` (or its `ref`-aware successor if
  Slice 0 found one landed), parse+validate shape, cache in-process (10 min TTL) and on disk at
  `${FACTORY_DATA}/topics-cache.json`. No cache + fetch failure → throw (fail closed, per Design
  decision 1). Cache present + fetch failure → return cached, log `stale=true`.
- `resolveTopics(tags: string[]): {resolved: string[], unknown: string[]}` — alias-aware,
  case-sensitive exact match against the fetched taxonomy (no fuzzy matching: an unknown string
  is unknown, never guessed).
- `classifyPaths(repoId: string, paths: string[]): string[]` — a per-repo table of
  glob/regex → canonical topic name(s) (seed at minimum: `ui` for `*.svelte`/`src/routes/**`,
  `data`/`migrations` for `**/*.sql`/`**/migrations/**`, `auth` for `**/auth/**`, `infra` for
  `.github/workflows/**`/`Dockerfile*`/`docker-compose*`, `docs` for `**/*.md` outside `specs/`
  and `proposals/`, `test` for `**/*.test.*`/`**/*.spec.*`). Output is deduplicated and
  **sorted** before return — order-independence is part of the function's contract.

**DoD:** `classifyPaths(repoId, shuffle(paths))` returns an identical array regardless of input
order across 3 shuffles of the same fixture path list — T-ORDER. `resolveTopics(['nonsense'])`
returns `{resolved: [], unknown: ['nonsense']}`, never throwing and never silently dropping the
unknown entry — feeds D5/D6's fail-closed behavior. A test that mocks `fetchMetaFile` to fail
with a seeded on-disk cache returns the cached policy; the same failure with the cache file
absent throws — T-FETCH. `npx tsc --noEmit -p runner/tsconfig.json` green.

### Slice 3 — manifest resolution + persistence at queue time (minion-factory, 8h)

**Files:** `runner/src/manifest.ts` (new — `resolveManifest()`, `hashManifest()`,
`unionManifest()`), `runner/src/db.ts` (add `runs.manifest_json TEXT`, `runs.manifest_hash TEXT`,
`runs.manifest_prev_hashes TEXT` to both the additive-migration block and the fresh-table DDL,
plus the `Run` type), `runner/src/queue.ts` (`queueDevForSpec()` and the manual run-creation path
call `resolveManifest()` before insert), `runner/src/manifest.test.ts` (new).

- `resolveManifest(declaredTags, repoId, policyVersion)`: `declared = resolveTopics(declaredTags)`
  (unknown → throw, caller refuses to queue); `derived = []` at queue time (no diff exists yet
  for a not-yet-started run — Slice 4 populates this post-push); `effective = sorted(unique(
  declared.resolved ∪ derived))`; `risk = max riskTier across effective` (`unclassified` if
  `effective` is empty); `requiredStages`/`requiredEvidence` from the Design-decision-3 lookup
  table keyed on `effective`. Returns the full object plus `hashManifest()`'s sha256 of its
  canonical (sorted-keys, sorted-arrays) JSON.
- `queueDevForSpec()` (and the manual `POST /runs {specId}` insert path) call
  `resolveManifest(fm.tags, repoId, currentPolicyVersion)`; an unknown-topic error aborts the
  queue attempt the same way a repo-mismatch does today (log + no insert), never a silent
  fallback to an all-`unclassified` manifest.

**DoD:** `hashManifest()` on two manifests differing only in array insertion order (e.g.
`['ui','docs']` vs `['docs','ui']`) produces the **same** hash — T-HASH-STABLE. A
`queueDevForSpec()` unit test with a spec tagged `[nonsense]` inserts zero rows — T-QUEUE-UNKNOWN.
A temporary DB initialized through `db.ts` contains all three new columns populated on a fresh
insert. `npx tsc --noEmit` green.

### Slice 4 — final-diff reclassification, monotonic, gates automerge (minion-factory, 8h)

**Files:** `runner/src/automerge.ts`, `runner/src/manifest.ts` (add `unionManifest(prev, diff)`),
`runner/src/automerge.test.ts` (new, or extended if
[[2026-08-18-factory-orchestration-tests-spec]] has already added one).

- Inside `sweep()`, before the existing `lowStakes`/`HIGH_STAKES_MERGE` tag check: fetch
  `/pulls/:number/files` for the candidate PR, run the changed paths through
  `classifyPaths(run.repo_id, paths)`, and call `unionManifest(storedManifest, diffDerivedTopics)`.
  `unionManifest` only adds to `derived`/`effective`/bumps `risk` upward/grows
  `requiredStages`/`requiredEvidence` — it can never remove or downgrade anything present in
  `prev`. Persist the unioned manifest + new hash; append the previous hash to
  `manifest_prev_hashes` (audit trail, never overwritten).
- The merge-eligibility check then reads the **reclassified** manifest's risk/tags, not the
  original queue-time snapshot: a run originally all-low-stakes whose actual diff now includes a
  high-stakes topic is skipped by the sweep exactly like a run that was tagged high-stakes from
  the start. Every existing gate (PR-identity, head-sha attestation, checks-must-be-present,
  `review-degraded` note) stays exactly as-is — this only adds a stricter, earlier-failing check
  in front of them.

**DoD:** fixture test — a run queued with an all-docs manifest, whose mocked PR file-list
includes `runner/src/auth.ts`, is reclassified `risk: high` and the sweep's mocked merge PUT is
never called — T-RECLASSIFY-GATE. A run whose diff stays within its declared topics merges
exactly as before (no regression on the existing low-stakes path) — regression guard. A pure
`unionManifest` test seeds `prev = {risk:'low', effective:['docs']}` and feeds an **empty** diff
result, asserting the output still equals `prev` (never accidentally downgrades on missing
signal) and a `high`-risk diff result never shrinks back to `low` on a subsequent call with a
smaller diff — T-DOWNGRADE. `npx tsc --noEmit` green.

### Slice 5 — commit trailers + PR labels as manifest projections (minion-factory, 5h)

**Files:** `runner/src/queue.ts` (render trailer block from the resolved manifest before
spawning docker; pass as `FACTORY_MANIFEST_TRAILERS` env), `agent/run.sh` (append the
pre-rendered block verbatim to the PR body and to the initial empty commit — never interpolate
`FACTORY_TASK`/`FACTORY_TITLE` or any agent-controlled value into the trailer lines themselves),
`runner/src/queue.ts` (`finish()`/`postFinish()`: once `pr_url` is recorded, `PUT` GitHub labels
`topic:<name>` per effective topic + `risk:<class>` — runner-only, mirrors the existing
review-verdict-is-script-stamped pattern), `runner/src/manifest.test.ts` (trailer-render unit
test), `runner/src/queue.test.ts` (label-call unit test, mocked `gh()`).

- Trailer format (exact, both in PR body and as git trailers on the initial commit):
  `Factory-Run: <run.id>`, `Spec-SHA: <run.spec_sha or "none">`, `Topics: <sorted,comma,list>`,
  `Profile: none` (Design decision 4 — literal placeholder, not a stub).

**DoD:** a pure-function test renders the exact trailer block for a fixture manifest — no
agent-controlled string can appear inside `Topics:`/`Profile:` values (input paths are the
manifest's own arrays, not `FACTORY_TITLE`/`FACTORY_TASK`) — T-TRAILER-RENDER. A mocked-`gh()`
test asserts the label PUT body is exactly `{labels: ['topic:...', ..., 'risk:...']}` derived
from the manifest, never from harness output — T-LABELS. `bash -n agent/run.sh` and
`npx tsc --noEmit` green.

### Slice 6 — policy-version pinning + operator docs (minion-factory, 4h)

**Files:** `runner/src/manifest.ts` (persisted manifests always carry the `policyVersion` they
were resolved under; `resolveManifest()`/`unionManifest()` never re-derive an already-persisted
manifest under a newer fetched `policyVersion` — a version bump only affects manifests resolved
*after* the bump), `runner/src/manifest.test.ts`, `runner/README.md` (short operator note: where
`topics.json` lives, how to bump `policyVersion`, fail-closed behavior, `manifest_prev_hashes` as
the audit trail).

**DoD:** a test bumps the fetched taxonomy's `policyVersion` between two calls and asserts a
run's **already-persisted** manifest (and its stored `policyVersion`) is untouched by a
subsequent `unionManifest()` call — only the `policyVersion` field on genuinely new resolutions
changes — T-VERSION-PIN. `README.md` diff reviewed for accuracy against the shipped behavior.

## 8. Cross-repo impact assessment

| Change | Repos touched | Mitigation |
|---|---|---|
| New `specs/topics.json` + stricter `tags:` validation | minion-meta only | Seeded to accept 100% of the existing corpus (Design decision 2, T-SEED) — zero retrofit commits required |
| New `runs` columns | minion-factory only | Additive `ALTER TABLE` in the same try/catch pattern already used for `spec_sha`/`spec_tags`; no migration for existing rows (nullable) |
| Automerge sweep gains a diff-fetch + reclassification step | minion-factory only, behavior-visible to every PR the factory opens across the fleet (hub, site, gateway, base, meta, factory) | Strictly additive gate — every existing check stays; `FACTORY_AUTOMERGE=0` kill switch is untouched and still stops the whole sweep; T-RECLASSIFY-GATE + the regression guard prove no existing low-stakes path breaks |
| Commit trailers + PR labels appear on every future factory PR, fleet-wide | Same fleet as above | Additive to PR body/commit message; no existing consumer parses commit messages today (grep confirms no `Factory-Run:`/`Spec-SHA:` reader exists yet), so nothing downstream can regress; labels are new, not replacing any existing label scheme |
| CI: new step inside minion-meta's `verify` job | minion-meta | Job name unchanged — `RepoDef.requiredChecks: ['verify']` in minion-factory's `repos.ts` keeps matching; step failure only blocks meta merges, never factory/hub/site |
| Downstream unblock, no code change here | Enables [[2026-08-18-factory-orchestration-round7]] (profile selection) and [[2026-08-18-factory-browser-verification-stage]] (requiredStages entry) to proceed once approved | Both proposals already declare the dependency; this spec's extension points (Design decisions 3–4) are sized so neither needs this spec re-opened |

**Alert (unavoidable, flagged not mitigated):** minion-factory's manifest resolution now has a
**live runtime read dependency** on minion-meta's `dev` branch content (`specs/topics.json`) at
every queue-time and reclassification call, on top of the existing spec-fetch dependency. This
is the same trust/availability boundary as today's `fetchMetaFile('specs/${id}.md')` calls, not a
new one — but it means a minion-meta outage or a malformed `topics.json` can now also stall
minion-factory queueing (fail-closed, by design, per Design decision 1). Operators should know
`topics.json` join the set of "meta files whose breakage stops the factory," alongside the specs
themselves.

## 9. Out of scope

- Real-time push webhook trigger for reclassification — deferred to
  [[2026-08-18-factory-postmerge-discovery-loop-spec]]'s eventual webhook infra (Design
  decision 5); this spec's reclassification is a pure function any future webhook can call.
- Scenario profile selection (`single-repo-low-risk`, `ui-flow`, `cross-repo-contract`,
  `database-migration`, `security-auth`, `incident-fix`) — [[2026-08-18-factory-orchestration-round7]].
  `Profile` stays a literal `none` here.
- The actual browser-verification stage and its evidence artifacts —
  [[2026-08-18-factory-browser-verification-stage]] (blocked on this spec + worker-containment).
- Repo-slice fan-out / multi-repo dependency ordering / slice continuation — round7's job; this
  spec's manifest is single-run/single-repo scoped.
- `{name, appId}` GitHub-App check-identity verification — [[2026-08-18-factory-m0-safety-foundation-spec]]
  S2's job; unchanged here.
- GitHub App per-run scoped credentials — [[2026-08-17-factory-capability-separation]].
- Retrofitting per-slice `**Topics:**` lines onto the 100+ historical spec files — the TEMPLATE.md
  convention is forward-only and advisory (not validated) this spec.
- `risk_class`/`source_trust`/priority/owner WorkItem fields on proposal frontmatter —
  [[2026-08-18-factory-workitem-handoff-schema-spec]]'s Slice 4/5; this spec does not touch
  `proposals/TEMPLATE.md`'s schema beyond the `tags:` validation rule already documented there.

## 10. End-to-end verification

1. On minion-meta: run `pnpm run test:scripts` and `node scripts/spec-index.mjs &&
   node scripts/proposal-index.mjs` on a clean checkout — zero errors, `git diff` on
   `specs/index.json`/`proposals/index.json` shows only canonical-name normalization (alias →
   name), never a dropped file.
2. Open a scratch minion-meta PR adding a fixture spec with `tags: [madeupword]` — the `verify`
   CI job's new step fails naming the file and the tag; remove the fixture, CI goes green.
3. On minion-factory: `npx tsc --noEmit -p runner/tsconfig.json` and `node --test
   runner/src/topics.test.ts runner/src/manifest.test.ts` (plus `automerge.test.ts` if present)
   all green.
4. Trigger (or simulate via the runner's test harness) one dev run against a low-stakes-tagged
   spec whose actual diff touches an `auth/`-classified path; confirm in `runs.manifest_json`
   that `risk` reads `high` post-reclassification and confirm the automerge sweep's log shows the
   PR skipped (mocked-`gh` test suffices if a live low-stakes PR isn't available to sacrifice).
5. Confirm one real (or scratch) factory-opened PR body/commit contains the exact
   `Factory-Run:`/`Spec-SHA:`/`Topics:`/`Profile: none` trailer block and carries `topic:*` +
   `risk:*` labels applied by the runner, not the agent.
6. Confirm `FACTORY_AUTOMERGE=0` still fully disables the sweep (kill switch untouched) and that
   an existing all-`docs`-tagged, diff-confined-to-docs PR still auto-merges exactly as before
   Slice 4 (regression, not just new behavior).
