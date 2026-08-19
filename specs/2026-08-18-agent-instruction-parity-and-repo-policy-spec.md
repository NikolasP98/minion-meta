---
id: 2026-08-18-agent-instruction-parity-and-repo-policy-spec
title: Provider-neutral agent instructions and canonical repository policy
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta, minion, minion_hub, minion_site, minion_plugins, paperclip, pixel-agents, minion-factory, minion-base]
proposal: 2026-08-18-agent-instruction-parity-and-repo-policy
verdict: approved
relationship: depends-on
related: [2026-08-18-sdlc-transformation-roadmap, 2026-08-18-factory-orchestration-round7-spec, 2026-04-19-minion-meta-repo-design]
---

# Provider-neutral agent instructions and canonical repository policy

## 0. Product — problem in the proposal's words

> Agent-file audit 2026-08-18 (alignment 62/100): Claude and Codex receive
> materially different instructions — minion/ has AGENTS.md but no CLAUDE.md,
> minion_site/ and pixel-agents/ only CLAUDE.md, minion_hub/AGENTS.md is a stale
> memory snapshot. Branch policy contradicts across files (hub CLAUDE says dev —
> DELETED branch; minion PR_WORKFLOW hardcodes main while feature work targets
> DEV; package install and changelog rules self-contradict).

The outcome is one provider-neutral instruction contract per repository and one validated,
machine-readable source for repository ids, aliases, branches, package-manager commands, checks,
and merge targets. Human-facing files may explain policy, but cannot redefine those facts.

## 1. Relationship recommendation

**Recommended relationship: `depends-on`.** This is the M1 policy foundation in the approved
transformation roadmap. It supplies the canonical repository/alias API that the later orchestration
graph explicitly consumes. It does not itself implement graph fan-out. This recommendation does not
merge, retire, supersede, or edit any related artifact.

| Related id | One-line reason |
|---|---|
| `2026-08-18-sdlc-transformation-roadmap` | Plan-of-record dependency: M1 calls for `SDLC-CONTRACT.md`, a machine-readable repo registry, and instruction parity before later execution-graph work. |
| `2026-08-18-factory-orchestration-round7-spec` | Downstream consumer: its Slice 2 requires the canonical registry and alias API supplied here and forbids treating factory `REPO_ALIASES` as that registry. |
| `2026-04-19-minion-meta-repo-design` | Existing architecture baseline: it established independent repositories, branches, package managers, and the meta-repo orchestrator; this spec centralizes that truth without changing the independence model. |

The index scan found no artifact that already delivers provider-neutral instruction pairs plus a
validated shared policy registry. The factory round-7 work overlaps only as a consumer, so
`depends-on` is more accurate than `extends` or `already-satisfied`.

## 2. Scope and ownership

`minion-meta` owns the source file, schema/validator, contract documentation, and generated consumer
artifact. Each product repository owns its canonical `AGENTS.md` and compatibility `CLAUDE.md`.
`minion-factory` and `minion-base` consume pinned copies of the generated artifact; they must not
carry separately authored Minion-fleet alias, branch, command, or required-check maps.

The canonical Minion fleet is the nine repository ids accepted by `specs/TEMPLATE.md`: `minion-meta`,
`minion`, `minion_hub`, `minion_site`, `minion_plugins`, `paperclip`, `pixel-agents`,
`minion-factory`, and `minion-base`. `minion.json` remains the six-row projection for child checkouts
orchestrated by the root CLI; its stable keys map as `minion→minion`, `hub→minion_hub`,
`site→minion_site`, `paperclip→paperclip`, `pixel-agents→pixel-agents`, and
`plugins→minion_plugins`. It is not the complete fleet registry, and the existing short CLI ids remain
accepted. Instruction-file parity is scoped to those same six child product repositories. Root
`AGENTS.md` remains the cross-project orchestrator contract, and root `CLAUDE.md` retains its
already-correct include. `Minion Docs/` and `ai-studio/`
are not CLI-registered development repositories and are outside this proposal. `minion-factory` and
`minion-base` are included as policy consumers and canonical routing targets because their duplicate
fleet/board maps have already caused routing defects; this spec does not otherwise rewrite their
instruction files.

Because the independent product checkouts are not present in this planning checkout, paths and
contradictions below are anchored to the approved audit/proposal, the root `AGENTS.md` Project Map,
`minion.json`, and existing specs. Slice 0 must verify each path and live remote branch before any
policy mutation; a missing or renamed path is a blocking evidence failure, not permission to invent
policy.

## 3. AS-IS → TO-BE → DELTA

### 3.1 AS-IS — verified behavior and constraints

- Root `AGENTS.md` Project Map records branches and package managers in prose, while `minion.json`
  separately records the orchestrated branch/command data. The two surfaces have no parity validator.
- Root `CLAUDE.md` is already a single include, `@AGENTS.md`, proving the compatibility pattern but
  not enforcing it across independent repositories.
- The approved audit records these concrete instruction states: `minion/AGENTS.md` exists without a
  `CLAUDE.md`; `minion_site/CLAUDE.md` and `pixel-agents/CLAUDE.md` exist without canonical
  `AGENTS.md`; `minion_hub/AGENTS.md` contains a stale memory snapshot; the other repository pairs
  are not uniformly canonical/include-only.
- The approved audit records four semantic contradictions: hub instructions name a deleted `dev`
  branch; `minion/PR_WORKFLOW.md` targets `main` although feature delivery targets `DEV` and puts
  rebase after review; minion package-install guidance conflicts with its pnpm workspace contract;
  and minion changelog rules contradict their stated exemptions.
- `AGENTS.md` says feature branches flow to `dev`/`DEV` and then `main`/`master`, but existing specs
  record a live hub branch dispute. A prose assertion is therefore insufficient: branch existence,
  default/development/release roles, and deploy triggers must be evidenced before encoding them.
- Factory policy currently lives in `minion-factory/runner/src/repos.ts`, can be replaced wholesale
  by `FACTORY_REPOS_FILE` (normally `/data/repos.json`), and has a separate `REPO_ALIASES` map.
  Minion Base has another repository/promotion map. The factory round-7 spec identifies this as an
  unsafe routing dependency.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records two binding lessons that shape this
  design: slice-scoped runs are mandatory, and the board/factory alias maps have already drifted and
  silently degraded approval-to-queue routing. It also states the M1 order: lifecycle contract and
  repo registry precede later manifest/DAG work.
- `/memory/MINION/factory/2026-08-18-ac227e10.md` records that factory `REPO_ALIASES` is not the
  repository registry and that `FACTORY_REPOS_FILE` may add deployment-local repositories. The
  canonical fleet policy must therefore compose with validated extension rows rather than disabling
  mounted repositories or validating them against a fleet-only alias table.
- `/memory/MINION/context-bloat-management.md` identifies a leading `<claude-mem-context>` block in
  `AGENTS.md` as stale injected memory that is duplicated through `CLAUDE.md`; the instruction checker
  must reject that exact block without treating ordinary repository documentation as a memory dump.
- The operator-memory FTS query returned no observation specific to this proposal. No semantic
  memory-search tool was available in this session. No unverified database observation is used as a
  requirement.

### 3.2 TO-BE — target behavior and invariants

1. Root `repo-policy.yaml` is the sole authored source for the nine canonical Minion fleet rows. Each
   row contains its canonical id, accepted aliases, meta-root-relative checkout directory, normalized
   `owner/repo` remote slug, package manager, development/default/release branch names, PR base,
   command map, and required CI checks. Every alias is globally unique across both aliases and
   canonical ids. Branch roles are explicit rather than inferred from names and may intentionally
   name the same branch when a repository has one branch serving multiple roles.
2. `repo-policy.schema.json` defines the closed, versioned contract. `scripts/repo-policy.mjs`
   validates it, confirms exactly the nine canonical ids plus the exact six-key `minion.json` mapping
   in §2, and produces deterministic JSON for consumers. Every CLI key must equal its row's canonical
   id or one of its declared aliases. The schema exposes one reusable closed
   row definition for validating factory extension rows; the exact nine-id constraint applies only to
   the authored fleet document. The command object has required
   `install`, `dev`, `build`, `test`, `check`, and `typecheck` keys; an unsupported operation is
   represented by `null`, while a supported command is a non-empty whitespace-delimited executable
   and argument string compatible with the current non-shell CLI runner. Quotes, redirections, shell
   expansion, and control operators are rejected. Each row has a `requiredChecks` array of
   `{name, appId}` objects, where `appId` is the positive GitHub App id observed on a matching check
   run; the array may be empty only when Slice 0 evidence proves the PR base has no required checks.
   Unknown fields, id/alias collisions, empty command strings, unsupported package managers, malformed
   check identities, or missing branch/command keys fail closed with repo id and field path.
3. Branch and check values enter the registry only after read-only verification against the repository
   remote, branch protection/rulesets, recent check runs, and deployment workflow. Every distinct
   branch named by a development/default/release role must exist remotely; `prBase` must equal one of
   those branch names. Deleted/stale branches and required-check `{name, appId}` drift fail the explicit
   remote drift check. Offline schema validation does not claim to prove remote state.
4. Every product repo has a substantive, provider-neutral `AGENTS.md`. Its `CLAUDE.md` is exactly one
   include line, `@AGENTS.md`, plus its terminating newline. Provider-specific operational files may
   exist below scoped directories, but cannot redefine repo-level branch/command/merge policy.
5. Instruction content is preserved semantically except for the audited contradictions and references
   required to point policy facts at `repo-policy.yaml`. Moving content from `CLAUDE.md` into
   `AGENTS.md` preserves all repository-local requirements and resolved links; it is not a byte-for-byte
   claim after branch corrections, heading normalization, or include-path changes.
6. Minion workflow instructions target the registry's verified `prBase`, require updating/rebasing
   from that base **before** the independent review attestation, use pnpm workspace commands, and state
   one non-contradictory changelog rule with explicit exemptions.
7. Factory and Base use compatible read-only adapters over byte-identical, checked-in copies of
   `generated/repo-policy.json`, pinned by `schemaVersion` and canonical content hash. Factory mounted
   configuration may override checkout paths and other deployment-local values for canonical rows and
   may add fully schema-validated non-fleet extension rows. It may not change or shadow a canonical
   fleet id, alias, remote, branch role, command, or required check. Alias uniqueness is validated over
   the composed fleet-plus-extension registry; unknown, colliding, or invalid rows fail before queueing
   or transition. Base consumes canonical fleet rows only. This preserves the mounted-repository
   contract recorded in `/memory/MINION/factory/2026-08-18-ac227e10.md`.
8. Existing gateway protocol, shared packages, DB schemas, auth behavior, UI behavior, deploy branch
   semantics, and release automation remain unchanged. This work documents and enforces current truth;
   it does not select a new branching model.
9. Policy changes are reviewable and auditable: the generated artifact carries `schemaVersion` and a
   canonical content hash computed over the canonical JSON with the `contentHash` member omitted,
   avoiding a self-referential digest. Meta CI fails synchronously on generated-output, root Project
   Map/quick-reference, or `minion.json` drift. Each product PR must attach a passing checker result
   for its instruction pair; after merge, the scheduled/manual remote fleet audit detects later pair
   drift and reports it. The spec does not claim that meta PR CI can gate files in independent,
   non-checked-out repositories.

### 3.3 DELTA — transitions, slices, and proof

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Duplicated fleet prose/maps become one evidence-backed policy schema and registry without removing validated factory extension rows. | S1 | `node scripts/repo-policy.test.mjs`: exact nine-id fleet plus valid extension fixture; id/alias collision, canonical override, unknown field, missing role/command/check field, invalid empty command, malformed check identity, and nondeterministic-order cases. |
| D2 | Unchecked branch/check names become verified branch roles, exact required-check identities, and drift evidence. | S1 | `node scripts/repo-policy.mjs verify-remote --fixture ...`; operator transcript records remote heads, workflow triggers, ruleset/branch-protection requirements, and matching recent `{name, appId}` check runs for every fleet row. |
| D3 | Meta prose and CLI metadata become projections checked against the registry. | S2 | `node scripts/repo-policy.test.mjs --parity`; exact assertions for `AGENTS.md`, `minion.json`, and generated JSON. |
| D4 | Divergent provider files become canonical `AGENTS.md` plus include-only `CLAUDE.md` in all six repos. | S3–S5 | Per-repo `node scripts/check-agent-instructions.mjs <checkout>` and exact-byte include tests. |
| D5 | The four audited contradictions become one branch/install/review/changelog contract. | S3 | Focused instruction fixtures and clause-scoped negative assertions prove the stale PR-base clause, review-before-rebase ordering, non-pnpm install guidance, and conflicting changelog clauses are absent without rejecting valid references to a release branch. |
| D6 | Factory/Base hard-coded fleet routing maps become hash-pinned read-only consumers while factory extension rows remain supported. | S6 | Consumer unit tests load byte-identical fleet artifacts, resolve all fleet ids/aliases identically, compose a valid factory-only extension row, and reject unknown, collision, stale hash, and canonical-field mutation. |
| D7 | Manual instruction drift discovery becomes a synchronous per-change check plus a scheduled/manual fleet audit. | S7 | Fixture E2E mutates each governed surface in turn and proves the applicable local or remote-audit mode fails, then passes on the clean fixture. |
| D8 | The complete author→consume→dispatch path is verified without changing product behavior. | S8 | End-to-end procedure in §8 proves one policy hash, all instruction pairs, correct Base lookup, and correctly routed factory dry-run. |

## 4. Approach — vertical slices

Each slice is approximately 4–8 focused hours and owns one independently reviewable outcome.
Implementation uses a feature branch and draft PR in each independent repository; no slice changes a
branch merely to make the registry match it.

### Slice 0 — evidence lock and contradiction ledger (minion-meta, 4h)

**Files to touch:** new `specs/evidence/2026-08-18-repo-policy-baseline.md` only.

- Read each of the six instruction-scoped subprojects' current `AGENTS.md` or `CLAUDE.md` before
  planning its patch. For all nine canonical fleet rows, record blob/commit SHA, default branch from
  the remote, every distinct head used by a declared branch role, deployment trigger branches,
  package manager, executable package scripts, required check-run names/app ids (or evidence that the
  set is empty), and the exact location of every applicable contradiction clause.
- Resolve the hub `dev`-deleted discrepancy from remote/workflow evidence. If prose, remote default,
  workflow triggers, and actual promotion practice disagree, stop and request the branch policy owner;
  do not encode a guess.
- Record whether `minion/PR_WORKFLOW.md` is at that path; if not, update the evidence artifact with its
  real path before S3 and use that recorded path consistently.

**Machine-checkable DoD:** all nine fleet rows planned for S1 have a normalized remote slug,
blob/commit SHA, branch-head evidence, workflow anchor, command anchor, and ruleset/check-run anchor
(including explicit proof of an empty required-check set where applicable); all six instruction pairs
have file evidence; the document contains no `TBD`, `unknown`, or unresolved contradiction. A reviewer
can rerun every read-only command.

### Slice 1 — canonical schema, registry, and validator (minion-meta, 6–8h)

**Files to touch:** new `repo-policy.yaml`; new `repo-policy.schema.json`; new
`generated/repo-policy.json`; new `scripts/repo-policy.mjs`; new `scripts/repo-policy.test.mjs`;
`package.json`; `.github/workflows/ci.yml`.

- Define `schemaVersion: 1` and the fields/invariants in §3.2. Separate public policy and relative
  checkout directories from secrets and absolute machine-local checkout roots. Aliases are a set;
  commands use the restricted non-shell string grammar and run from repo root.
- Generate `generated/repo-policy.json` deterministically and validate checked-in freshness. The
  generator must not query the network; `verify-remote` is a separate explicit drift command that
  checks branch roles and exact required-check identities.
- Add the validator/tests to the existing `verify` job without renaming that required check.

**Machine-checkable DoD:** `node scripts/repo-policy.test.mjs`,
`node scripts/repo-policy.mjs validate`, and the existing meta CI command pass; changing key order or
set-like alias/check order does not change the canonical hash; every negative fixture fails non-zero
with field-level diagnostics; the nine canonical ids and six CLI-key-to-fleet-id mappings are asserted
exactly.

### Slice 2 — meta projections and instruction checker (minion-meta, 4–6h)

**Files to touch:** `AGENTS.md`; `minion.json`; new `scripts/check-agent-instructions.mjs`; new
`scripts/check-agent-instructions.test.mjs`; `scripts/repo-policy.mjs`; `package.json`.

- Replace branch/command facts in the root Project Map and quick reference with parity-checked values.
  Mark the policy-owned tables/blocks so the checker compares their parsed fields rather than grepping
  unrelated prose for branch or command words. Keep architecture and Cross-Project Impact Zones prose
  intact.
- Make `minion.json` a checked projection/consumer of registry rows, branches, and commands; preserve
  the six stable CLI keys, their §2 alias mapping, and all environment orchestration fields.
- Checker rules: substantive `AGENTS.md`; exact include-only `CLAUDE.md`; no leading
  `<claude-mem-context>` block; no mismatch inside marked policy-owned fields; links/includes resolve.
  Ordinary prose and command examples outside marked fields are not rejected merely for containing a
  branch name.

**Machine-checkable DoD:** focused checker tests pass on good fixtures and fail separately for missing
pair, non-exact include, mismatched marked policy field, leading stale memory block, broken include,
and `minion.json` drift; a valid release-branch mention outside a marked field passes.

### Slice 3 — gateway parity and contradiction repair (minion, 6–8h)

**Files to touch:** `AGENTS.md`; new `CLAUDE.md`; `PR_WORKFLOW.md` at the S0-verified path.

- Preserve canonical gateway instructions, add the exact include shim, and replace governed literals
  with a reference to the canonical `minion` row. Any query example must explicitly run from a
  `minion-meta` checkout (`node scripts/repo-policy.mjs show minion`); product checkouts do not pretend
  to contain that script.
- Correct PR base and ordering: sync/rebase the feature branch from verified `prBase`, run tests, then
  obtain independent review on the resulting head. Any post-review rebase invalidates attestation.
- Consolidate package installation around pnpm/workspace rules and consolidate changelog policy into
  one rule whose exemptions are enumerated once.

**Machine-checkable DoD:** instruction checker passes; `pnpm`-focused existing docs/lint tests pass;
fixture assertions prove all four audited contradictions are removed without deleting unrelated
security, testing, release, or handoff-ledger instructions.

### Slice 4 — hub and site parity (minion_hub + minion_site, two 4–6h repo PRs)

**Hub files to touch:** `minion_hub/AGENTS.md`; `minion_hub/CLAUDE.md`.

**Site files to touch:** new `minion_site/AGENTS.md`; `minion_site/CLAUDE.md`.

- Hub: replace the stale snapshot with the current provider-neutral contract sourced from the
  substantive instruction file; encode only the S0-verified branch role and point to the registry.
- Site: move every existing substantive requirement into `AGENTS.md`, correct only governed policy
  facts and resolved links, then reduce `CLAUDE.md` to the include. Preserve Svelte 5, Bun, auth, and
  design-governance requirements.

**Machine-checkable DoD:** checker passes against each checkout; `bun run check` passes in each repo;
normalized headings/rules from the pre-change substantive document are present in `AGENTS.md`, and
no stale memory/frontmatter dump remains.

### Slice 5 — paperclip, pixel-agents, and plugins parity (three 4–6h repo PRs)

**Paperclip files to touch:** `paperclip-minion/AGENTS.md`; new `paperclip-minion/CLAUDE.md`.

**Pixel files to touch:** new `pixel-agents/AGENTS.md`; `pixel-agents/CLAUDE.md`.

**Plugin files to touch:** new `minion_plugins/AGENTS.md`; new `minion_plugins/CLAUDE.md` (or the
S0-verified existing counterparts at those exact repo roots).

- Preserve repository-specific build, test, safety, and architecture guidance while standardizing
  discovery. Do not import root-orchestrator content wholesale.
- For an instruction-empty plugins repository, author only verified repository-local commands and
  lifecycle rules; do not fabricate package scripts.

**Machine-checkable DoD:** checker passes for all three; `pnpm typecheck` plus `pnpm test:run` pass for
paperclip, and every non-null registry-declared check/test command passes for pixel-agents and plugins.
If plugins has no executable check/test command, the S0 evidence-backed `null` entries and the
instruction checker are its proof; no build command is invented. Exact include-byte assertions pass.

### Slice 6 — factory and board consumers (minion-factory + minion-base, two 6–8h repo PRs)

**Factory files to touch:** `runner/src/repos.ts`; `runner/src/queue.ts`; new
`runner/src/repo-policy.ts`; new `runner/src/repo-policy.test.ts`; new
`runner/repo-policy.generated.json`; `setup.sh`; `.env.example`; `runner/README.md`.

**Base files to touch:** the S0-verified repo registry/promotion module (expected
`src/lib/repos.ts`); new adjacent `repo-policy.test.ts`; new server-only
`repo-policy.generated.json`; the server-side factory proxy/adapter that currently maps promotion
aliases; `.env.example`. Slice 0 records the exact destinations before implementation if the expected
server directory differs.

- Copy the byte-identical generated JSON into each consumer repository and verify its embedded hash
  against exact deployment variable `REPO_POLICY_V1_HASH` before enabling it. Both consumers expose one
  canonical `resolveRepo(idOrAlias)` shape for fleet rows; the copy/update procedure is deterministic
  and a stale copy fails tests and startup under the opt-in.
- Factory mounted config may override checkout path and deployment-local values for canonical rows and
  may add validated non-fleet rows. Validate the base policy hash, merge only allowlisted local fields,
  and reject canonical id/alias/field shadowing; never wholesale-replace fleet policy. Preserve
  existing fail-closed required-check behavior. With `REPO_POLICY_V1` off, the legacy mounted-file
  shape continues unchanged. Enabling it requires `setup.sh` to migrate/validate extension rows or
  refuse startup with field-level diagnostics; it may not silently drop a mounted repository.
- Base labels/URLs may remain UI metadata, but branches, aliases, promotion targets, and commands come
  from policy. Unknown values yield an explicit unavailable/error state, not fallback routing.

**Machine-checkable DoD:** factory `npm test` and `npm run typecheck` pass; Base's existing check/test
commands pass; file hashes prove both checked-in consumer copies are byte-identical to the meta output;
a shared fixture yields identical fleet resolution in both consumers; one factory-only extension row
resolves without becoming a Base row; targeted assertions find no surviving legacy hard-coded fleet
alias/branch/promotion maps while allowing `minion.json`, generated copies, UI-only metadata, and
mounted extension data; collision and canonical-field mutation tests fail closed.

### Slice 7 — fleet parity audit and rollout (minion-meta, 4–6h)

**Files to touch:** `scripts/check-agent-instructions.mjs`; `scripts/repo-policy.mjs`;
`.github/workflows/ci.yml`; `README.md`; `AGENTS.md` only for the new maintenance command.

- Add a local mode used as attached evidence by each product PR and a remote-audit mode that fetches
  the six instruction pairs at pinned SHAs without credentials in logs. Meta CI always validates local
  fixtures and root projections; it validates product checkouts only when they are explicitly supplied.
- Document the change procedure: edit registry → validate/drift-check → regenerate → update affected
  consumer pin → update prose projection → review. Policy hash mismatch blocks rollout.
- CI validates the root checkout synchronously; remote fleet drift runs on schedule/manual dispatch and
  opens one actionable report rather than silently rewriting repos.

**Machine-checkable DoD:** mutation matrix proves each surface is caught by its stated local or remote
mode; scheduled job fixture dedupes identical drift; logs contain no tokens or remote URLs with
credentials; a missing product checkout is reported as not supplied rather than as a false passing
check; existing `verify` name and unrelated CI jobs are unchanged.

### Slice 8 — end-to-end acceptance (integration, 4h)

**Files to touch:** no product files; attach command outputs and policy hash to the final implementation
PRs/deployment record. If a defect requires code, reopen the owning slice rather than patching here.

**Machine-checkable DoD:** §8 succeeds against merged candidate branches and produces one matching
policy hash across meta, factory, and Base; all six instruction pairs pass; canonical and extension-row
dry-run routing is correct; no product build/runtime diff exists outside instruction files and the
explicit factory/Base policy-consumer surfaces.

## 5. Cross-repo impact assessment

| AGENTS.md impact zone / surface | Assessment | Mitigation or alert |
|---|---|---|
| Gateway protocol | None: no frame, event, RPC, client, or handshake change. | Assert no diff under shared protocol packages or gateway server methods. |
| Channel extensions | None. | Gateway slice is instruction-only; no `extensions/` edits. |
| DB schema | None. | No hub/site or factory database migration. Registry is versioned static policy. |
| Agent definition format | None: repo instruction discovery is not runtime agent-definition YAML. | Do not touch `Minion Docs/agents/` or marketplace/runtime parsers. |
| Auth | None. | No Better Auth, token, permission, or identity changes. |
| Workshop/canvas and Pixel office | None. | Pixel edit is root documentation only; no extension/webview source changes. |
| Paperclip adapters | None. | Paperclip edit is root documentation only; no adapter/server source changes. |
| Factory routing and Base promotion | **Direct unavoidable impact.** Their duplicate maps become policy consumers. | Hash-pin policy, fail closed, preserve local checkout/UI-only metadata, add identical-resolution fixtures before rollout. |
| Root CLI registry and accepted spec repo ids | **Direct projection impact.** `minion.json` has six stable CLI keys while the spec vocabulary and fleet policy have nine canonical ids. | Assert the exact nine ids and six key-to-row mappings; preserve short CLI ids and never use `minion.json` as the graph-routing registry. |
| Factory mounted repositories | **Direct compatibility impact.** Deployments may add repositories absent from the Minion fleet. | Compose schema-validated extension rows after loading the pinned fleet artifact; reject collisions/overrides, preserve valid additions, and test both paths. |
| Factory/Base deployment configuration | **Direct rollout impact.** Both consumers need the expected policy hash. | Document and set `REPO_POLICY_V1_HASH` before the exact opt-in; hash absence/mismatch refuses enablement, and rollback restores the previous file/hash pair. |
| Independent repository release flows | Documentation now points at verified roles but must not change them. | S0 remote/workflow evidence gate; any desired branch-model change requires a separate proposal and human decision. |
| Concurrent repo changes | Instruction files may change while this wave is open. | Pin source blob SHAs in S0; re-read and reconcile before each repo PR; never overwrite newer rules. |

## 6. Explicitly out of scope

- changing any repository's default/development/release branch, deploy trigger, required check, package
  manager, or release topology merely to simplify the registry;
- rewriting instruction content beyond faithful provider-neutral relocation, the four approved
  contradictions, registry references, and removal of the audited stale memory snapshot;
- runtime agent prompts, agent definition YAML, skills, memory injection, MCP configuration, or the
  separate factory topic/capability manifest;
- execution DAGs, slice continuation, scenario profiles, relationship resolution, or automatic merge;
- a UI editor for repository policy;
- gateway protocol, database, auth, channel, workshop, Pixel office, or Paperclip adapter changes;
- secrets, credentials, absolute developer checkout paths, live tokens, or machine-specific env data
  in `repo-policy.yaml`;
- automatically editing, retiring, merging, or superseding any related proposal/spec;
- hand-editing `specs/index.json` or `proposals/index.json`.

## 7. Landing order and rollout safety

Land S0, then S1–S2. S3–S5 may proceed in parallel as independent repo PRs after the schema and
checker are fixed. Land S6 consumers only after the generated artifact is finalized, copied, and
pinned and all aliases resolve in tests. Land S7 after every product pair is merged. S8 is the final
ship gate.

During rollout, factory and Base continue on their current maps until their consumer tests pass with
the pinned registry. Set `REPO_POLICY_V1_HASH` to the copied artifact's verified canonical hash, then
cut over each behind exact opt-in `REPO_POLICY_V1=1`; a missing/mismatched hash, unset opt-in, `true`,
or a typo is off/refused rather than falling back. Before cutover, compare old/new results for every canonical id and alias, every configured mounted
extension id/alias, and one complete scheduled factory reconciliation execution; exercise at least one
Base request between the reconciliation start and finish. Record timestamps, row inputs, and both
resolver outputs. Any mismatch blocks cutover and emits the repo id/alias and both results. Remove old
fleet maps only after that matrix and reconciliation are clean; retain mounted extension/local metadata
and rollback to the previous pinned artifact/hash, never a silent post-cutover fallback.

## 8. End-to-end verification

From `minion-meta` at the integrated candidate revision:

```bash
node scripts/repo-policy.mjs validate
node scripts/repo-policy.mjs generate --check
node scripts/repo-policy.test.mjs
node scripts/check-agent-instructions.test.mjs
node scripts/check-agent-instructions.mjs --all
node scripts/repo-policy.mjs verify-remote
```

Then run every non-null registry-declared check/test/typecheck command in each product checkout,
`npm test && npm run typecheck` in `minion-factory/runner`, and every non-null registry-declared Base
check/test/typecheck command. Capture:

1. the same schema version and canonical policy hash from meta, factory, and Base;
2. one successful, identical fleet resolution in factory and Base for every canonical id and alias,
   with no collisions, plus successful factory-only resolution of every configured extension row;
3. exact-byte `CLAUDE.md` include proof and substantive `AGENTS.md` proof for all six product repos;
4. read-only remote proof that every distinct declared branch exists, matches its documented workflow
   role, and has the recorded required-check `{name, appId}` set (including explicit empty sets);
5. a factory dry-run for every canonical alias and configured extension alias, proving the intended
   repo, checkout, PR base, command set, and required checks without queueing or writing;
6. a Base dry-run of every canonical alias, proving identical fleet repo/branch promotion resolution
   while extension-only aliases are explicitly unavailable;
7. mutation proof: stale branch, changed alias, changed command, changed required check, non-exact
   include, and mounted override policy mutation each fail before dispatch/transition;
8. an explicit diff assertion that protocol, DB, auth, channel, runtime agent, UI, and adapter source
   trees are untouched.

The implementation is complete only when all evidence is attached to the slice PRs, the comparison
matrix and reconciliation execution are clean, `REPO_POLICY_V1=1` consumers use byte-identical files
with the same pinned hash, the old factory/Base fleet maps are absent, and valid factory extension rows
still resolve. Any known open end must follow the root `AGENTS.md` two-place handoff ledger; an
undocumented exception cannot be accepted as completion.
