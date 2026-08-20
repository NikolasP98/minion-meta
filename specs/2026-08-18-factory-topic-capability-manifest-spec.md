---
id: 2026-08-18-factory-topic-capability-manifest-spec
title: Topic taxonomy + immutable execution manifest (policy resolver)
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-20
repos: [minion-factory, minion-meta]
proposal: 2026-08-18-factory-topic-capability-manifest
verdict: approved
type: infra
tags: [logic, infra]
relationship: new
related: [2026-08-18-factory-workitem-handoff-schema-spec, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-sdlc-transformation-roadmap, 2026-08-18-factory-orchestration-round7, 2026-08-18-factory-browser-verification-stage, 2026-08-17-factory-worker-containment]
reconcile_ignore: true
reconcile_ignore_reason: "Flag evidence was Slice-2 merge only — Slice 1 (meta topics.json + scripts) verified absent, shipped topics.ts fails closed without it; Slices 3-6 unbuilt. Slice 1 in flight by orchestrator."
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
| [[2026-08-18-factory-workitem-handoff-schema-spec]] | Approved, not yet built. Its S4/S5 touch `proposals/TEMPLATE.md`, `proposal-index.mjs`, `risk.ts`, `lifecycle.ts`, and `automerge.ts`, so the earlier “disjoint files” claim was false. Follow the roadmap order: land/reconcile WorkItem schema first, then make its proposal `risk_class` validation and factory consumers resolve through this taxonomy rather than retaining `HIGH_STAKES_TAGS`. Preserve WorkItem trust/priority/owner behavior and tests while replacing only its duplicated tag policy. |
| [[2026-08-18-factory-m0-safety-foundation-spec]] | Approved, partially live (see AS-IS). Its S2 changes `RepoDef.requiredChecks` to `{name, appId}[]` and updates automerge matching. This spec must preserve whichever string/object compatibility shape has landed during Slice 0 and must not replace M0's name+App-identity gate while adding manifest gates. |
| [[2026-08-18-factory-durable-state-outbox-spec]] | Draft, changes_requested, not yet built. Adds `runner/src/events.ts` and an `outbox_jobs` table. This spec adds manifest columns plus `run_manifest_revisions` in `runner/src/db.ts`; both changes are additive and may land in either order without deleting the other's DDL. |
| [[2026-08-18-sdlc-transformation-roadmap]] | Program plan; this spec is its M3 deliverable. |
| [[2026-08-18-factory-orchestration-round7]] (proposal) | **Downstream, not built.** States "Depends on: topic-capability-manifest" — its scenario profiles select from this spec's manifest. This spec ships only a `Profile: none` placeholder trailer/field; do not implement profile selection here (§7 out-of-scope). |
| [[2026-08-18-factory-browser-verification-stage]] (proposal) | **Downstream, not built.** States "Blocked by: worker-containment and topic-capability-manifest." Its browser stage should be one entry in this spec's `requiredStages` extension table (§4), gated on a `ui`-class effective topic — this spec defines the table's shape, not the stage itself. |
| [[2026-08-17-factory-worker-containment]] (proposal) | Draft, unrelated files (review-container isolation). No overlap; named only because it co-blocks browser-verification-stage above. |

## 2. Owner surface

**minion-factory** (`NikolasP98/minion-factory`, private, default branch `main`) — new
`runner/src/topics.ts` (+`runner/src/topics.test.ts`), new `runner/src/manifest.ts`
(+`runner/src/manifest.test.ts`), `runner/src/db.ts`, `runner/src/queue.ts`,
`runner/src/index.ts`, `runner/src/github.ts`, `runner/src/risk.ts`, `runner/src/lifecycle.ts`,
`runner/src/automerge.ts` (+ its existing test file once
[[2026-08-18-factory-orchestration-tests-spec]] lands one, else a new
`runner/src/automerge.test.ts`), `agent/run.sh`, `cli/factory`, `runner/README.md`.

**minion-meta** (this repo) — new `specs/topics.json`, `specs/TEMPLATE.md`,
`proposals/TEMPLATE.md`, `scripts/spec-index.mjs`, `scripts/proposal-index.mjs`, new
`scripts/topics.mjs` + `scripts/topics.test.mjs`, `.github/workflows/ci.yml` (one new step
inside the existing `verify` job — the job **name** stays `verify`, required-check matching
is unaffected), `package.json` (one new root script).

**Live baseline reviewed:** `minion-factory/main` commit `dd1cb7e11af0a86bb4621c5d922e561afe69d730`
(2026-08-18T07:09:22Z), read via `gh api repos/NikolasP98/minion-factory/contents/...` (this
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
  todo, ui, unwired, ux`. Six additional strings that `risk.ts` treats as high-stakes (`auth`,
  `perms`, `permissions`, `migration`, `migrations`, `billing`) have never actually been used on
  a spec or proposal, and conversely six real tags (`board`, `duplication`, `edge-case`,
  `hardcoded`, `todo`, `unwired`) are unknown to `risk.ts` entirely (silently
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
  persisted as the current projection in `runs.manifest_json` + `runs.manifest_hash` (sha256 of
  canonical JSON), while every queue-time/reclassification value is append-only in
  `run_manifest_revisions`. “Immutable manifest” means immutable revisions and a runner-owned
  current pointer, not a JSON value that is updated in place with unverifiable predecessor
  hashes. An unknown declared topic **refuses to queue** (fail closed), same posture as the
  existing repo-mismatch 400. Spec runs resolve proposal tags; spec-backed dev runs resolve spec
  tags; manual non-spec dev runs must supply `declaredTopics`; retries inherit the parent's exact
  policy snapshot and latest manifest revision rather than resolving again.
- After every push that the runner can observe (initial completion and every auto-fix/requeue
  completion on the same branch), `postFinish()` reclassifies the full PR file list; the
  30-minute automerge sweep repeats that operation immediately before judging eligibility.
  Reclassification **unions** into a new immutable manifest revision. Union is monotonic: derived
  and effective topics, risk, `requiredStages`, and `requiredEvidence` may only grow. An API or
  pagination failure, an unsupported repo classifier, or any unmatched changed path is explicit
  `unclassified` signal and merge-ineligible, never “no derived topics.” A diff that reveals
  higher or unclassified stakes makes the run merge-ineligible even if its original tags were
  all low-stakes. Nothing this spec adds may ever *loosen* an existing merge gate (M0's
  check-identity/PR-identity/head-sha binding are untouched).
- Commit trailers and PR labels are **projections the runner writes from its own manifest
  record**, never agent-authored free text. Initial commit trailers and the initial PR-body block
  identify the queue-time revision; runner-owned `topic:*`/`risk:*` labels are reconciled after
  every later manifest revision while preserving unrelated labels. This is consistent with the
  existing pattern that only `run.sh`'s `emit()` (script-stamped `headSha`) and the runner's
  `finish()` write evidence fields, never the harness output directly.
- minion-meta's index generators reject any tag that does not resolve (via the taxonomy or an
  alias) to a canonical topic, with the offending file+tag named in the error, same style as the
  existing missing-field errors.

## 5. Design decisions

1. **Single source of truth, fetched not duplicated.** `specs/topics.json` in minion-meta is
   canonical; `runner/src/topics.ts` fetches it (cached with a TTL and an on-disk last-known-good
   fallback under `FACTORY_DATA`). A fetch failure with **no** cache available fails closed
   (`resolveManifest()` throws — a run cannot queue without a resolvable policy). A fetch failure
   **with** a schema-valid cache available returns the cached policy tagged `stale: true` in logs
   only, never silently treated as fresh. Cache replacement is atomic. `runner/src/risk.ts`,
   `runner/src/lifecycle.ts`, `runner/src/automerge.ts`, and `agent/run.sh` must consume the
   resolved manifest/policy rather than retain hardcoded topic sets; otherwise the claimed single
   source of truth would be false.
2. **Backward-compatible seed, not a retrofit.** `topics.json`'s initial content must accept
   every tag currently present in `specs/index.json` + `proposals/index.json` verbatim (the
   fifteen strings in §3) union `risk.ts`'s three sets (adds `auth`, `perms→permissions` alias,
   `migration→migrations` alias, `billing`), each given a `riskTier` (`unclassified` default,
   `low` for `risk.ts`'s low-stakes set, `high` for its high-stakes set). No mass-editing of the
   100+ existing spec/proposal files is required or in scope — the validator must round-trip the
   whole current corpus with zero errors before this lands (a Slice 1 DoD, not a hope).
3. **`requiredStages`/`requiredEvidence` are enforced constraints, not new stages.** This spec
   adds the *shape* (`{docs:[], ui:['self-test'], infra:['self-test'], default:[]}`-style pure lookup)
   so [[2026-08-18-factory-browser-verification-stage]] can later add a `browser-verify` entry
   keyed on a `ui`-class topic without changing the manifest schema. No stage this spec names is
   wired to anything that doesn't already exist (`self-test` already runs today). Queueing rejects
   an unknown stage/evidence name, and automerge verifies every required current-stage/evidence
   predicate from runner-owned state; storing unused arrays would not satisfy the proposal.
4. **`Profile` is a literal placeholder.** [[2026-08-18-factory-orchestration-round7]] owns
   scenario-profile selection; this spec's manifest and trailer both carry `profile: none` /
   `Profile: none` until that spec lands. This is stated explicitly wherever `Profile` appears so
   it never reads as a silently-broken feature.
5. **Reclassification hooks into existing runner touchpoints**, not a new push
   webhook. [[2026-08-18-factory-postmerge-discovery-loop-spec]] is the eventual home for
   signed push/merge webhooks (approved, not yet built); building a second, narrower webhook here
   would duplicate that infrastructure. “After every push the runner can observe” is satisfied by
   calling the same idempotent `reclassifyRunFromPr()` from `postFinish()` after every completed
   dev run with a PR (initial and retry) and from the automerge sweep (every 30 min while a PR sits
   open+passed). The reclassification function is reusable — a future webhook can call it without
   duplicating the diff→topics logic.
6. **Policy pinning includes the rules needed for later reclassification.** The queue transaction
   stores the schema-validated execution subset of `topics.json` (`policyVersion` + canonical
   topics, aliases, risk, eligibility, requirements; excluding the meta-only grandfather list)
   and its canonical hash with the run. Manifest revisions
   keep its `policyVersion`; `unionManifest()` resolves newly derived canonical topics against that
   stored snapshot, never whichever policy happens to be current. Factory classifiers are a
   registry keyed by `policyVersion`; a policy bump lands factory support for both old and new
   versions before minion-meta switches the current version. Unsupported stored versions fail
   closed. Existing classifier versions are not edited destructively while runs using them remain
   merge candidates.
7. **Unclassified is conservative, not numerically below low.** Aggregate risk is `high` if any
   effective topic is high, otherwise `unclassified` if the topic set is empty, any topic has
   `riskTier: unclassified`, or any changed path is unmatched; it is `low` only when every
   effective topic is low and every changed path is classified. Automerge additionally requires
   every effective topic to be in the policy's explicit `autoMergeEligible: true` set. This
   preserves today's docs/test/deps-only rule and prevents `docs + logic` from collapsing to low.
8. **Forward-only per-slice validation is explicit.** At Slice 1 landing,
   `topics.json.sliceTopicValidation.grandfatheredSpecIds` snapshots the ids of existing specs that
   lack per-slice annotations. Only those exact ids are exempt; a new file cannot evade validation
   by backdating `created`. Every other spec must put a `**Topics:**` line under each
   `### Slice ...` heading, and every listed value must resolve through the taxonomy.
   `spec-index.mjs` enforces both the exact-id exemption and the topic values. This satisfies the
   approved proposal's “validators require ... per-slice topics” without editing historical specs.

## 6. DELTA (numbered; each maps to a slice + proving test)

- **D1** Canonical taxonomy (`specs/topics.json`) exists, versioned, alias-resolving, and
  round-trips the entire current tag corpus with zero errors (→S1, T-SEED)
- **D2** minion-meta's index generators reject unknown/unresolvable tags, naming file+tag
  (→S1, T-UNKNOWN-META)
- **D3** `runner/src/topics.ts` fetches+caches the taxonomy, fails closed with no cache, serves
  stale-with-cache (→S2, T-FETCH)
- **D4** Deterministic, order-independent changed-path classification per repo, with unmatched
  paths preserved as fail-closed signal (→S2, T-ORDER, T-UNMATCHED)
- **D5** Manifest resolved + hashed + persisted at queue time; unknown declared topic refuses to
  queue (→S3, T-QUEUE-UNKNOWN, T-HASH-STABLE)
- **D6** Complete, paginated final-diff reclassification is monotonic, append-only, runs at both
  observable touchpoints, and gates automerge on reclassified policy/evidence rather than only the
  original snapshot (→S4, T-DOWNGRADE, T-RECLASSIFY-GATE, T-DIFF-PAGES)
- **D7** Commit trailers + PR labels are runner-authored projections of manifest revisions, never
  agent-controlled text; current labels track later revisions without deleting unrelated labels
  (→S5, T-TRAILER-RENDER, T-LABELS)
- **D8** Cross-repo policy-version discipline: a stored policy snapshot plus versioned classifier
  prevents a bump from silently reinterpreting an existing run (→S6, T-VERSION-PIN)
- **D9** New specs have validator-enforced, canonical per-slice topics while the pre-policy corpus
  remains valid without retrofit (→S1, T-SLICE-TOPICS)

## 7. Slices

### Slice 0 — recon (fold into Slice 1's first hour)

**Topics:** `docs`, `logic`

Re-fetch `runner/src/risk.ts`, `runner/src/lifecycle.ts`, `runner/src/queue.ts`,
`runner/src/index.ts`, `runner/src/automerge.ts`, `runner/src/db.ts`, and `agent/run.sh` at HEAD
of `main` and diff against the excerpts quoted in §3. If
[[2026-08-18-factory-workitem-handoff-schema-spec]] or
[[2026-08-18-factory-durable-state-outbox-spec]] have landed changes to any of these files,
rebase this spec's plan around the new shape (e.g. if `fetchMetaFile` gained a `ref` parameter,
call it with an explicit ref rather than reintroducing a second signature) — never revert a
sibling spec's change to restore these excerpts.

### Slice 1 — canonical taxonomy + meta-side validation (minion-meta, 6h)

**Topics:** `infra`, `logic`, `docs`, `test`

**Files:** `specs/topics.json` (new), `specs/TEMPLATE.md`, `proposals/TEMPLATE.md`,
`scripts/topics.mjs` (new — `loadTopics()`, `resolveTag(tag) → {canonical, riskTier} | null`),
`scripts/spec-index.mjs`, `scripts/proposal-index.mjs`, `scripts/topics.test.mjs` (new),
`.github/workflows/ci.yml`, `package.json`.

- `specs/topics.json`: `{policyVersion: 1, sliceTopicValidation:
  {grandfatheredSpecIds: [...]}, topics:
  [{name, aliases: [], riskTier, autoMergeEligible, requiredStages, requiredEvidence,
  description}]}`. Names and aliases are unique, case-sensitive slugs; risk is
  `high|low|unclassified`; only canonical `docs`, `test`, and `deps` seed
  `autoMergeEligible: true`. `grandfatheredSpecIds` is generated once from the corpus present at
  landing, sorted and duplicate-free; adding a later id is a reviewed policy change, not a normal
  way to make CI green.
  Seed per Design decision 2 — every one of the fifteen currently-used tags must appear as either
  a canonical `name` or an `aliases` entry; `risk.ts`'s six unused high-stakes strings are added
  as new topics/aliases with `riskTier: high` (or `low` for its low-stakes set). Add reserved
  canonical `unclassified` with `riskTier: unclassified` and
  `autoMergeEligible: false`; classifiers add it for unmatched paths, but authors do not use it as
  a declared tag.
- `scripts/topics.mjs`: pure loader + `resolveTag()`, no network, reads `specs/topics.json` from
  the working tree.
- `scripts/spec-index.mjs` / `scripts/proposal-index.mjs`: for every `fm.tags` entry, call
  `resolveTag()`; unresolved → push `${name}: unknown topic "${tag}" (see specs/topics.json)` to
  the existing `errors` array (same fail-the-build convention already used for missing fields);
  project the **resolved canonical name**, not the raw string, into the generated index entry.
- `specs/TEMPLATE.md` / `proposals/TEMPLATE.md`: document that `tags:` values must resolve via
  `specs/topics.json`; the spec template requires a `**Topics:**` line under every slice heading.
  `spec-index.mjs` enforces the line and resolves every listed topic for every spec not in the exact
  grandfathered-id set (Design decision 8).
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
`verify` job. A grandfathered fixture without per-slice topics passes; an unlisted fixture with one
missing or unknown `**Topics:**` entry fails naming the file, slice, and topic. A backdated unlisted
fixture still fails — T-SLICE-TOPICS.

### Slice 2 — `runner/src/topics.ts`: taxonomy fetch + path classifiers (minion-factory, 8h)

**Topics:** `logic`, `infra`, `test`

**Files:** `runner/src/topics.ts` (new), `runner/src/topics.test.ts` (new).

- `fetchTopicPolicy()`: `fetchMetaFile('specs/topics.json')` (or its `ref`-aware successor if
  Slice 0 found one landed), parse+validate shape, cache in-process (10 min TTL) and on disk at
  `${FACTORY_DATA}/topics-cache.json`. No cache + fetch failure → throw (fail closed, per Design
  decision 1). Cache present + fetch failure → return cached, log `stale=true`.
- `resolveTopics(tags: string[]): {resolved: string[], unknown: string[]}` — alias-aware,
  case-sensitive exact match against the fetched taxonomy (no fuzzy matching: an unknown string
  is unknown, never guessed).
- `classifyPaths(policyVersion: number, repoId: string, paths: string[]): {topics: string[],
  unmatchedPaths: string[]}` — a versioned per-repo table of
  glob/regex → canonical topic name(s) (seed at minimum: `ui` for `*.svelte`/`src/routes/**`,
  `data`/`migrations` for `**/*.sql`/`**/migrations/**`, `auth` for `**/auth/**`, `infra` for
  `.github/workflows/**`/`Dockerfile*`/`docker-compose*`, `docs` for `**/*.md` outside `specs/`
  and `proposals/`, `test` for `**/*.test.*`/`**/*.spec.*`, and `deps` for package manifests plus
  the repo's recognized lockfiles). Every fleet id in `REPOS` has an explicit classifier entry;
  an unknown repo/version throws. Both arrays are deduplicated and
  **sorted** before return — order-independence is part of the function's contract. A path that
  matches no rule remains in `unmatchedPaths`; it is never discarded. At load/test time, every
  topic name emitted by a classifier must exist canonically in the matching policy version.

**DoD:** `classifyPaths(1, repoId, shuffle(paths))` returns identical arrays regardless of input
order across 3 shuffles of the same fixture path list — T-ORDER. `resolveTopics(['nonsense'])`
returns `{resolved: [], unknown: ['nonsense']}`, never throwing and never silently dropping the
unknown entry — feeds D5/D6's fail-closed behavior. A test that mocks `fetchMetaFile` to fail
with a seeded on-disk cache returns the cached policy; the same failure with the cache file
absent throws — T-FETCH. Each fleet repo has a coverage fixture, and
`['src/new-area/file.ts']` is returned in `unmatchedPaths` unless an explicit rule classifies it —
T-UNMATCHED. `npx tsc --noEmit -p runner/tsconfig.json` green.

### Slice 3 — manifest resolution + persistence at queue time (minion-factory, 8h)

**Topics:** `logic`, `data`, `infra`, `test`

**Files:** `runner/src/manifest.ts` (new — `resolveManifest()`, `hashManifest()`,
`unionManifest()`), `runner/src/db.ts`, `runner/src/queue.ts`, `runner/src/index.ts`,
`runner/src/risk.ts`, `runner/src/lifecycle.ts`, `agent/run.sh`, `cli/factory`, `runner/README.md`,
and focused tests.

- Add nullable `runs.manifest_json`, `runs.manifest_hash`, `runs.topic_policy_json`, and
  `runs.topic_policy_hash` to both additive migration and fresh DDL, plus the `Run` type. Add
  `run_manifest_revisions(run_id, revision, manifest_json, manifest_hash, reason, created_at,
  PRIMARY KEY(run_id, revision), UNIQUE(run_id, manifest_hash))`. Existing rows stay nullable and
  are merge-ineligible; no fabricated backfill from mutable tags.
- Queueing a new run stores the validated policy snapshot/hash, current manifest projection, and
  immutable revision 0 in one SQLite transaction. Later retries/requeues copy the policy snapshot
  and latest manifest and create their own revision 0 with `reason: inherited:<parent-run-id>`;
  they never resolve against the then-current policy.

- `resolveManifest(declaredTags, repoId, policySnapshot)`: `declared = resolveTopics(declaredTags)`
  (unknown → throw, caller refuses to queue); `derived = []` at queue time (no diff exists yet
  for a not-yet-started run — Slice 4 populates this post-push); `effective = sorted(unique(
  declared.resolved ∪ derived))`; compute risk by Design decision 7; union all topic
  `requiredStages`/`requiredEvidence`. Reject any requirement name the runner does not support.
  Returns the full object plus `hashManifest()`'s sha256 of canonical (sorted-keys,
  sorted-arrays) JSON.
- `queueDevForSpec()` and manual `POST /runs {specId}` resolve spec tags. `/pipeline/spec`
  resolves the approved proposal's tags. Manual `POST /runs` without a spec requires a non-empty
  `declaredTopics: string[]`; missing/unknown values return 422 before insert. Every auto-fix and
  manual requeue copies the inherited snapshot/revision. `cli/factory run` adds a required
  `--topics topic1,topic2` flag for task-only runs and sends `declaredTopics`; spec-backed board
  recovery calls remain unchanged. Reconcile runs remain out of this dev/spec manifest contract.
- Pass `FACTORY_MANIFEST_JSON` to `agent/run.sh`; review strictness reads its runner-resolved
  `risk` and canonical `effective` values. Remove the shell's hardcoded high/low topic lists.
  `risk.ts` becomes compatibility types/helpers over the fetched policy (or is deleted after its
  consumers migrate), and lifecycle promotion resolves canonical policy risk rather than keeping
  another set literal.

**DoD:** `hashManifest()` on two manifests differing only in array insertion order (e.g.
`['ui','docs']` vs `['docs','ui']`) produces the **same** hash — T-HASH-STABLE. A
`queueDevForSpec()` unit test with a spec tagged `[nonsense]` inserts zero rows — T-QUEUE-UNKNOWN.
A temporary DB initialized through `db.ts` proves the four run columns and revision 0 are populated
atomically; a forced revision insert failure leaves neither run nor partial revision. Route tests
cover proposal/spec/manual topic sources, missing manual `declaredTopics`, and inheritance through
both retry paths. `rg 'HIGH_STAKES|LOW_STAKES|FACTORY_SPEC_TAGS' runner/src agent/run.sh` finds no
independent policy literal/legacy input. `npx tsc --noEmit` and `bash -n agent/run.sh` green.

### Slice 4 — final-diff reclassification, monotonic, gates automerge (minion-factory, 8h)

**Topics:** `logic`, `infra`, `test`

**Files:** `runner/src/automerge.ts`, `runner/src/queue.ts`, `runner/src/github.ts`,
`runner/src/manifest.ts` (add `unionManifest(prev, diff)`), `runner/src/automerge.test.ts` (new,
or extended if
[[2026-08-18-factory-orchestration-tests-spec]] has already added one).

- Add idempotent `reclassifyRunFromPr(run)`. Fetch the PR head, then every
  `/pulls/:number/files?per_page=100&page=N` page, then the PR head again; a changed head, API
  failure, malformed response, or GitHub's endpoint cap makes classification incomplete and the
  run merge-ineligible. Never judge the first page only. Run the complete file list through
  `classifyPaths(storedPolicyVersion, run.repo_id, paths)` and call
  `unionManifest(storedManifest, diffDerivedTopics)`; any `unmatchedPaths` also adds the reserved
  canonical `unclassified` topic.
- Call `reclassifyRunFromPr()` from `postFinish()` for every completed dev run with a PR and from
  `sweep()` immediately before merge eligibility. The repeated call is idempotent for an unchanged
  head/manifest. It is deliberately not a new webhook (Design decision 5).
- `unionManifest` resolves against `runs.topic_policy_json`, only adds to
  `derived`/`effective`, moves risk along `low → unclassified → high`, and grows
  `requiredStages`/`requiredEvidence`; it can never remove or downgrade anything present in
  `prev`. Persist the current run projection and the next immutable revision in one transaction;
  duplicate hash means no new revision.
- The merge-eligibility check then reads the **reclassified** manifest's risk/tags, not the
  original queue-time snapshot. Eligibility requires `risk === 'low'`, every effective topic's
  `autoMergeEligible === true`, complete diff classification, and runner-owned proof for every
  required stage/evidence predicate. A run originally all-low whose diff gains high or
  unclassified signal is skipped. Every existing gate (PR identity, reviewed-head attestation,
  required check presence/identity/pagination, `review-degraded`, merge SHA guard, confirmed merge
  response, and `FACTORY_AUTOMERGE === '1'`) stays exactly as-is; this only adds stricter gates.

**DoD:** fixture test — a run queued with an all-docs manifest, whose mocked PR file-list
includes `runner/src/auth.ts`, is reclassified `risk: high` and the sweep's mocked merge PUT is
never called — T-RECLASSIFY-GATE. An unmatched `runner/src/new-area/file.ts` likewise becomes
`unclassified` and never merges. A run whose diff stays within its declared topics merges
exactly as before (no regression on the existing low-stakes path) — regression guard. A pure
`unionManifest` test seeds `prev = {risk:'low', effective:['docs']}` and feeds an **empty** diff
result, asserting the output still equals `prev` (never accidentally downgrades on missing
signal) and a `high`-risk diff result never shrinks back to `low` on a subsequent call with a
smaller diff — T-DOWNGRADE. Pagination fixtures cover a risk-bearing file on page 2, page failure,
endpoint-cap truncation, and a head change between the two PR reads; every incomplete case skips
merge — T-DIFF-PAGES. `postFinish()` and sweep tests both invoke the same helper. `npx tsc
--noEmit` green.

### Slice 5 — commit trailers + PR labels as manifest projections (minion-factory, 5h)

**Topics:** `logic`, `infra`, `test`

**Files:** `runner/src/queue.ts` (render trailer block from the resolved manifest before
spawning docker; pass as `FACTORY_MANIFEST_TRAILERS` env), `agent/run.sh` (append the
pre-rendered block verbatim to the PR body and to the initial empty commit — never interpolate
`FACTORY_TASK`/`FACTORY_TITLE` or any agent-controlled value into the trailer lines themselves),
`runner/src/queue.ts` + `runner/src/automerge.ts` (once `pr_url` is recorded and after every
revision, reconcile GitHub labels `topic:<name>` per effective topic + `risk:<class>` — runner-only, mirrors the existing
review-verdict-is-script-stamped pattern), `runner/src/manifest.test.ts` (trailer-render unit
test), `runner/src/queue.test.ts` (label-call unit test, mocked `gh()`).

- Trailer format (exact, both in PR body and as git trailers on the initial commit):
  `Factory-Run: <run.id>`, `Spec-SHA: <run.spec_sha or "none">`, `Topics: <sorted,comma,list>`,
  `Profile: none` (Design decision 4 — literal placeholder, not a stub). `Spec-SHA` is the
  existing SHA-256 of the snapshotted spec content, not a Git commit id. Trailers/body describe
  the queue-time revision; labels describe the current revision.
- Label reconciliation fetches existing labels, removes only stale factory-owned `topic:*` and
  `risk:*` labels, adds the current set, and preserves every unrelated label. Do not use a
  replacement PUT body that erases human/bot labels. A label API failure is logged and makes that
  sweep iteration merge-ineligible; later `postFinish()`/sweeps retry from DB authority.

**DoD:** a pure-function test renders the exact trailer block for a fixture manifest — no
agent-controlled string can appear inside `Topics:`/`Profile:` values (input paths are the
manifest's own arrays, not `FACTORY_TITLE`/`FACTORY_TASK`) — T-TRAILER-RENDER. A mocked-`gh()`
test starts with unrelated + stale factory labels and asserts the unrelated labels survive while
the factory subset exactly matches the latest manifest, never harness output; a later manifest
revision changes labels and a failed label call prevents merge — T-LABELS. `bash -n agent/run.sh` and
`npx tsc --noEmit` green.

### Slice 6 — policy-version pinning + operator docs (minion-factory, 4h)

**Topics:** `logic`, `docs`, `test`

**Files:** `runner/src/topics.ts`, `runner/src/manifest.ts`, their tests, `runner/README.md`.

- Persisted manifests carry the `policyVersion` they were resolved under; `unionManifest()` reads
  that run's stored policy snapshot and the classifier registered for the same version. A newer
  fetched policy affects only genuinely new resolutions. Missing/malformed policy snapshots or
  unsupported stored classifier versions fail closed and cannot merge.
- Document the two-repo rollout: add the new classifier version while retaining the old one,
  deploy factory, then bump `specs/topics.json.policyVersion`; remove an old classifier only after
  no merge-candidate run references it. Document cache behavior, immutable revisions, and the
  fact that topic policy constrains stages/evidence but grants no tool or credential capability.

**DoD:** a test queues under v1, fetches v2, then reclassifies the old run: its new immutable
revision still uses the stored v1 policy/risk/requirements and v1 classifier; a new run uses v2.
Missing v1 policy JSON or classifier support skips merge rather than falling back to v2 —
T-VERSION-PIN. `README.md` diff reviewed for accuracy against the shipped behavior.

## 8. Cross-repo impact assessment

| Change | Repos touched | Mitigation |
|---|---|---|
| New `specs/topics.json` + stricter `tags:` validation | minion-meta only | Seeded to accept 100% of the existing corpus (Design decision 2, T-SEED) — zero retrofit commits required |
| New `runs` columns + `run_manifest_revisions` | minion-factory only | Additive DDL; existing rows remain nullable and merge-ineligible rather than receiving invented history; run + initial revision and later projection + revision writes are transactional |
| Queue contract covers spec runs and manual non-spec dev runs | minion-factory API/CLI callers | Spec/proposal-backed callers need no new input; manual task-only `/runs` callers must add non-empty `declaredTopics`, with route tests and README examples updated in the same slice |
| Runner/lifecycle/review risk consumers move off hardcoded sets | minion-factory only | All consume the validated policy snapshot/resolved manifest; search gate proves no duplicate factory policy literal remains |
| Automerge + `postFinish()` gain paginated diff reclassification | minion-factory only, behavior-visible to every PR the factory opens across the fleet (hub, site, gateway, base, meta, factory) | Strictly additive gate — every existing check stays; `FACTORY_AUTOMERGE` remains exact opt-in and the roadmap keeps it disabled through M7; incomplete/unmatched diffs block rather than downgrade |
| Commit trailers + PR labels appear on every future factory PR, fleet-wide | Same fleet as above | Trailers/body are additive queue-time projections; label reconciliation owns only `topic:*`/`risk:*`, preserves unrelated labels, and retries from DB authority |
| CI: new step inside minion-meta's `verify` job | minion-meta | Job name unchanged — `RepoDef.requiredChecks: ['verify']` in minion-factory's `repos.ts` keeps matching; step failure only blocks meta merges, never factory/hub/site |
| Downstream unblock, no code change here | Enables [[2026-08-18-factory-orchestration-round7]] (profile selection) and [[2026-08-18-factory-browser-verification-stage]] (requiredStages entry) to proceed once approved | Both proposals already declare the dependency; this spec's extension points (Design decisions 3–4) are sized so neither needs this spec re-opened |

**Alert (unavoidable, flagged not mitigated):** new-run manifest resolution adds a live read of
minion-meta's `dev` branch `specs/topics.json`, on top of the existing spec/proposal fetch
dependency. A meta outage or malformed policy with no valid cache stalls new queueing (fail
closed). Reclassification does **not** re-fetch mutable policy: it uses the run's stored snapshot,
so already-queued runs are not reinterpreted or availability-coupled to meta. Operators should
still treat `topics.json` as a meta file whose malformed content stops new factory work.

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
- Retrofitting per-slice `**Topics:**` lines onto the exact historical ids recorded in
  `topics.json.sliceTopicValidation.grandfatheredSpecIds`; every unlisted spec is validated.
- `risk_class`/`source_trust`/priority/owner WorkItem fields on proposal frontmatter —
  [[2026-08-18-factory-workitem-handoff-schema-spec]]'s Slice 4/5; this spec does not touch
  `proposals/TEMPLATE.md`'s schema beyond the `tags:` validation rule already documented there.

## 10. End-to-end verification

1. On minion-meta: run `pnpm run test:scripts` and `node scripts/spec-index.mjs &&
   node scripts/proposal-index.mjs` on a clean checkout — zero errors, `git diff` on
   `specs/index.json`/`proposals/index.json` shows only canonical-name normalization (alias →
   name), never a dropped file.
2. Open a scratch minion-meta PR adding a fixture spec with `tags: [madeupword]` — the `verify`
   CI job's new step fails naming the file and the tag. Repeat with valid frontmatter tags but a
   missing/unknown per-slice `**Topics:**` line; it fails naming the slice. Remove the fixture, CI
   goes green.
3. On minion-factory: `npx tsc --noEmit -p runner/tsconfig.json` and `node --test
   runner/src/topics.test.ts runner/src/manifest.test.ts` (plus `automerge.test.ts` if present)
   all green.
4. Trigger (or simulate via the runner's test harness) one dev run against a low-stakes-tagged
   spec whose actual diff touches an `auth/`-classified path; confirm `runs.manifest_json` reads
   `risk: high`, revision 0 and the new revision both remain queryable in
   `run_manifest_revisions`, and automerge skips. Repeat with an unmatched non-doc path and confirm
   `risk: unclassified`; a risk-bearing page-2 fixture proves the full PR file list was read.
5. Confirm one real (or scratch) factory-opened PR body/commit contains the exact
   `Factory-Run:`/`Spec-SHA:`/`Topics:`/`Profile: none` trailer block and carries `topic:*` +
   `risk:*` labels applied by the runner, not the agent. Add an unrelated scratch label, cause a
   manifest revision, and confirm the unrelated label survives while factory labels update.
6. Confirm `FACTORY_AUTOMERGE=0` still fully disables the sweep (kill switch untouched) and that
   an existing all-`docs`-tagged, diff-confined-to-docs PR still auto-merges exactly as before
   Slice 4 only when all manifest-required stage/evidence predicates and every pre-existing M0
   gate pass (regression, not just new behavior).
