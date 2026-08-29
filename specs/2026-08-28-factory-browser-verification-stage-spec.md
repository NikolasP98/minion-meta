---
id: 2026-08-28-factory-browser-verification-stage-spec
title: Credential-free, loopback-isolated browser-verification stage for UI-topic factory runs
stage: spec
status: review
pass: 3
created: 2026-08-28
updated: 2026-08-29
proposal: 2026-08-18-factory-browser-verification-stage
verdict: pending
repos: [minion-factory, minion-meta]
type: infra
tags: [security, infra, ui, test]
relationship: new
related: [2026-08-18-factory-worker-containment-spec, 2026-08-18-factory-topic-capability-manifest-spec]
---

# Credential-free, loopback-isolated browser-verification stage for UI-topic factory runs

## 0. Product

From the approved proposal `2026-08-18-factory-browser-verification-stage`, verbatim:

> Audit 2026-08-18: UI/UX/a11y-topic runs need behavioral evidence (acceptance flows, AX-tree,
> axe-core, screenshots, console/network), but Chrome must NOT enter the general-purpose agent
> container: browser authorization requires an approved canonical UI topic AND a server-owned
> repo browser profile AND a policy-resolved stage capability.
>
> **Definition of done:** separate pinned web-verification image (Chrome for Testing +
> chrome-devtools-mcp, no GitHub or model credentials, egress allowlisted to the ephemeral
> preview origin); repos.ts gains preview command + base URL + browser profile; stage sequence
> build→preview→Playwright flows→axe→AX-tree→screenshots→console/network, artifacts under
> /out/browser/ bound to candidate SHA + profile hash; missing preview profile for a UI-tagged
> repo fails closed; page text/AX labels treated as untrusted injection input.

### Relationship classification

**Relationship: `new`** — no existing spec or proposal builds a preview/browser-verification
stage. The two related artifacts below provide the extension points this spec activates; neither
already satisfies this proposal's DoD, and containment's production activation remains a rollout
prerequisite for this spec's final policy flip.

| id | relation |
|---|---|
| [[2026-08-18-factory-worker-containment-spec]] | **Prerequisite, S1-S4 shipped; only S5 open (re-verified 2026-08-29).** S1-S3 shipped the phase-policy kernel (`runner/src/containers.ts`), `factory-*.sh` entrypoints, credential-free setup/self-test, and the `phase_attempts`/`phase_effects` evidence tables. **S4 shipped** through minion-factory PR #145 (+ #146, #148, #149, #150): both `agent/Dockerfile` and `runner/Dockerfile` are now digest-pinned via a manifest-digest `ARG`, and `scripts/verify-image-pins.sh`, `scripts/verify-image-provenance.sh`, and `scripts/publish-images.sh` exist on `main`. **S5 (adversarial E2E + supervised canary activation) is open as factory PR #161**, and production still reports `FACTORY_CONTAINMENT_V2=0`. This spec builds a **new** `browser-verify` `WorkerPhase` inside the same deny-by-default kernel and pins its own image to the bar S4 already set. S1-S7 may land independently; S8 is blocked until containment-v2 is verified active in production (Target invariant 4). |
| [[2026-08-18-factory-topic-capability-manifest-spec]] | **Prerequisite, shipped (S1-S5; S6 operator-doc open per its board audit).** Its Design decision 3 reserved exactly this extension point: "`requiredStages`/`requiredEvidence` are enforced constraints... so [[browser-verification-stage]] can later add a `browser-verify` entry... without changing the manifest schema." This spec is that entry. It also names this proposal in its own §9 out-of-scope ("The actual browser-verification stage and its evidence artifacts"). |

The proposal's own 2026-08-28 board-audit note ("BOTH declared blockers cleared... topics.ts:37
`SUPPORTED_STAGES`, topics.test.ts asserts `/unsupported stage "browser-verify"/`") correctly
identifies the landed extension mechanism, but the live baseline still has
`FACTORY_CONTAINMENT_V2` disabled in production. This spec therefore treats the code prerequisite as
available and the production activation as an explicit S8 gate. §5 Design decision 1 explains why
`browser-verify` joins `SUPPORTED_EVIDENCE`, while the stage-rejection regression remains.

## 1. Owner surface

**minion-factory** (`NikolasP98/minion-factory`, private, default branch `main`) — new
`agent/factory-browser-verify.sh`, `agent/Dockerfile.browser-verify` (new image, not the existing
`agent/Dockerfile`), `agent/lib/browser-verify-flows.mjs`, browser-image package/lock files,
`runner/src/browser-verify.ts` (+ `.test.ts`), edits to `runner/src/topics.ts` (+ tests),
`runner/src/containers.ts` (+ tests), `runner/src/repos.ts` (+ tests), `runner/src/manifest.ts`
(+ tests), `runner/src/queue.ts` (+ tests), `runner/src/automerge.ts` (+ tests),
`repos.example.json`, `docker-compose.yml`, `.env.example`, `deploy.sh`,
`scripts/verify-image-pins.sh` (**extend** — the containment spec's S4 shipped it, so this spec adds
the browser image to the existing verifier rather than writing a parallel check),
`browser-profiles/minion-hub.mjs` (new pilot profile), `README.md`.

**minion-meta** (this repo) — `specs/topics.json` only, in the final slice.

**Live baseline reviewed:** `minion-factory/main` commit `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914`
(2026-08-29T16:31:09Z, "containment-base-reconciliation S2b: resolve-conflict with RUNNER-OWNED
enforcement", PR #157), read via `gh api repos/NikolasP98/minion-factory/contents/...` (this repo
is meta-gitignored and not checked out locally). Every line anchor in §2 was re-resolved against
this commit on 2026-08-29; the pass-2 anchors against `9dc06488683f` are superseded. Re-read every
touched file before implementation — this is a drift gate, not permission to implement the stale
excerpts quoted below if a concurrent factory PR lands first.

## 2. AS-IS (verified against the live baseline)

1. `runner/src/topics.ts:37-38`: `SUPPORTED_STAGES = ['spec', 'develop', 'review']` and
   `SUPPORTED_EVIDENCE = ['self-test', 'review-verdict']`. Both are closed membership sets;
   `validateTopicPolicy()` (`topics.ts:94-131`) throws `unsupported stage "…"` /
   `unsupported evidence "…"` for anything outside them, so `specs/topics.json` cannot declare
   `browser-verify` on any topic today. `runner/src/topics.test.ts:102-104` is a regression fixture
   proving exactly that rejection for `requiredStages: ['browser-verify']`.
2. `specs/topics.json`'s `ui` topic is `{riskTier: unclassified, autoMergeEligible: false,
   requiredStages: [], requiredEvidence: ['self-test']}`; `ux` is `{riskTier: unclassified,
   autoMergeEligible: false, requiredStages: [], requiredEvidence: []}`. Neither names any
   browser-evidence requirement.
3. `runner/src/containers.ts:38-48` declares a closed `WORKER_PHASES` union of exactly
   `prepare-workspace, setup, develop, reconcile-base, resolve-conflict, self-test, prepare-review,
   review` — **eight** phases as of PR #157 (the pass-2 baseline had seven; `resolve-conflict` was
   added by the containment-base-reconciliation spec's S2b).
   `NETWORK_MODES` (`containers.ts:56`) is closed to `none|bridge` — no proxy/allowlist/second-network
   primitive exists anywhere in this file. `PHASE_POLICIES` (`containers.ts:314`) gives every
   phase a fixed `network`, `mountRoles`, `envAllowlist`, `github`/`model` credential posture, and
   resource limits; an unlisted phase is a hard `unknown worker phase` error
   (`phasePolicy()`, `containers.ts:552-556`). `self-test`'s policy (`containers.ts:475-489`) is
   `github: null, model: 'forbidden', network: 'repo:self-test'` (closed per-repo opt-in, default
   `none`) with `mountRoles: {workspace: 'rw', out: 'rw', cache: 'any'}`,
   `requiredMountRoles: ['workspace', 'out']`, `user: '1100:1100'`, `readOnlyRootfs: true`,
   `tmpfs: ['/tmp', '/home/agent']` — the closest existing analogue to what this spec needs.
4. `DEV_PHASE_SEQUENCE` (`containers.ts:1180-1189`) is a **fixed** 8-element array mirroring
   `WORKER_PHASES`, and `nextPhase()` (`containers.ts:1221-1223`) is a pure function of `attempts`
   plus `{maxFixRounds}` only — it has no manifest/topic input, so it cannot conditionally schedule a
   phase today. It has **three** call sites in `queue.ts`, not one:
   `advanceContainmentRun()`'s pump (`queue.ts:1750`) passes `{maxFixRounds}` and is the authoritative
   routing decision; `preSetupReconciliation()` (`queue.ts:2170`) and
   `reconcileBaseWithBoundedResolution()` (`queue.ts:2206`) call `nextPhase(states)` with **no
   options** and only ask whether it elects `reconcile-base` / `resolve-conflict`. Any new argument
   must therefore default to the byte-compatible value, and only the pump may pass a true one.
4b. `CONTAINMENT_IMPLEMENTED_PHASES` (`containers.ts:1337-1346`) lists all eight phases, and
   `containmentReadiness()` (`containers.ts:1348-1353`) computes `missing` as
   `DEV_PHASE_SEQUENCE.filter(p => !implemented.includes(p))`. `containmentGate()`
   (`containers.ts:1360-1369`) then refuses **every** dev run when `FACTORY_CONTAINMENT_V2=1` and any
   member of `DEV_PHASE_SEQUENCE` is unimplemented. Adding `browser-verify` to `DEV_PHASE_SEQUENCE`
   would therefore be a fleet-wide kill switch, not an additive change — the conditional phase must
   be elected by `nextPhase()` without joining that static array (§5 Design decision 9).
5. `canonicalMountSource()` (`containers.ts`, the `workspace` case) special-cases only `self-test`
   for a disposable per-attempt copy (`${root}/selftest-${attempt}`); every other phase shares the
   one `${root}/workspace` develop owns.
6. `runner/src/repos.ts:12-48`'s `RepoDef` has `setup`, `selfTest`, `playbook`, `setupNetwork`,
   `selfTestNetwork`, `commandEnv` — no preview command, base URL, or browser-profile field of
   any kind. `repoNetwork()` (`repos.ts:85-92`) resolves only `setup`/`selfTest`. The registry
   (`repos.ts:~110-209`) has exactly six entries — `minion-base`, `minion-site`, `minion-hub`,
   `minion-meta`, `minion-ai`, `minion-factory` — each with a `playbook: '<id>.md'` file under
   `playbooks/`.
7. `runner/src/topics.ts`'s `CLASSIFIERS_V1` (`COMMON_RULES_V1`) classifies `**/*.svelte` and
   `src/routes/**` as topic `ui` for every fleet repo. Of the six registered repos, `minion-hub`,
   `minion-site`, and `minion-base` are SvelteKit apps that will actually surface `ui` as an
   effective topic in practice; `minion-ai` (the gateway) also runs the rule but its `ui/` workspace
   is not confirmed Svelte-routed at this baseline. None of these three repos has a Playwright suite
   today (`paperclip-minion` does, but it is not a `minion-factory`-registered repo and is out of
   this proposal's `repos: [minion-factory]` scope).
8. `runner/src/db.ts:715-735`'s `phase_attempts` table already has `run_id, phase, attempt, status,
   policy, candidate_sha, reviewed_sha, provider, instance_id, plan_revision, request_id,
   claim_generation, output_candidate_sha, exit_code, exit_reason, evidence TEXT, started_at,
   finished_at` with `UNIQUE(run_id, phase, attempt)`. `evidence` is a free-form column any phase
   name can populate — no new table or migration is implied by adding one more `WorkerPhase`.
8b. **The attempt row is sealed exactly once.** `finishPhaseAttempt()` (`runner/src/db.ts:1684-1724`)
   writes `status`, `exit_code`, `exit_reason`, `provider`, `reviewed_sha`, `output_candidate_sha`
   and `evidence` in a **single** `UPDATE ... WHERE id = ? AND status = 'running'`, and the
   `phase_attempts_terminal_immutable` trigger (`db.ts:737-750`) raises
   `phase_attempts terminal result is immutable` on any later update of a non-`running` row.
   `phase_attempts_no_delete` forbids deletion. Browser-evidence validation, hashing and summarisation
   must therefore complete **before** the seal — there is no second write in which to attach them,
   and a validation failure discovered after the seal cannot be recorded against that attempt.
   `output_candidate_sha` is additionally restricted to passed `develop`/`reconcile-base` attempts
   (`db.ts:1699-1707`), so `browser-verify` must never attempt to stamp it.
9. `runner/src/automerge.ts`'s `evaluateAutoMergeRun()` (`automerge.ts:44-88`) loops
   `manifest.requiredStages` requiring each to resolve to `isExecutableStage(configuredStages[stage])`
   (an object with `{harness, model}`) — that shape fits `spec`/`develop`/`review` but is meaningless
   for a credential-free, model-forbidden phase. The **separate** `manifest.requiredEvidence` loop
   (`automerge.ts:81-85`) special-cases only `'review-verdict'`; every other evidence name (including
   today's `'self-test'`) is accepted with **no explicit predicate** beyond the run-level
   `status === 'passed'` check at the top of the function — a real gap this spec must close for its
   own evidence name, not inherited debt to fix generally.
10. **Corrected at pass 3 — the pass-2 statement is no longer true.** `agent/Dockerfile` and
    `runner/Dockerfile` are now digest-pinned: both open with a comment block naming
    `node:22-bookworm-slim` and resolve the base through a manifest-digest `ARG` so the `FROM` line
    and the recorded toolchain manifest cannot drift apart, and `runner/Dockerfile:41` is
    `CMD ["/app/node_modules/.bin/tsx", "src/index.ts"]` (no `npx`). `scripts/verify-image-pins.sh`,
    `scripts/verify-image-provenance.sh` (+ its test) and `scripts/publish-images.sh` all exist on
    `main`. This landed as the worker-containment spec's Slice 4 (factory PR #145, supervised release
    `1901ed0699f4a0e23d918392bac8429a09b30758`, hardened by PRs #146/#148/#149/#150). Consequence for
    this spec: the browser image does **not** get to invent its own pinning discipline or a parallel
    verifier — Slice 3 extends the shipped one and matches the shipped bar (digest-pinned base,
    committed toolchain manifest, candidate-bound publication, provenance verification).
11. No `playwright`, `chrome-devtools`, `preview`, or egress-proxy code exists anywhere in
    `minion-factory` today (verified by a repository code search at the baseline commit). The only
    existing "restrict egress to one destination" precedent is `runner/src/codex-broker-policy.ts`'s
    two-network pattern (`factory-provider-egress` network, `createInternalNetworkArgs`/
    `attachBrokerEgressArgs`) built for the Codex broker's fixed, known upstream — a stable named
    provider, not a dynamic per-run preview origin. §5 Design decision 4 generalizes this pattern to a
    freshly created, per-attempt `--internal` network scoped to exactly one run's two containers,
    rather than reusing the single fixed `factory-provider-egress` network, because the preview origin
    is dynamic per run and per attempt.
12. A **different**, unrelated "preview" system exists in the ecosystem: `minion_hub`'s
    Projects⇄GitHub feature has a gateway plugin that serves a live git-worktree preview on the
    Netcup box, gated behind `PREVIEW_RUNNER_URL`/`_SECRET` and currently **inert** (per operator
    memory). It is a user-facing live-preview surface owned by the `minion` gateway, not a CI
    verification stage owned by the factory runner — this spec does not depend on it, extend it, or
    collide with it, and does not reuse its worktree-on-the-box mechanism (this spec's preview is a
    same-container ephemeral build, torn down at phase exit).
13. `advanceContainmentRun()` accepts one `image` and uses it for every phase, while
    `phasePlanInput()` and `buildLaunchPlan()` persist that image in the phase policy. A separate
    browser image therefore requires an explicit controller-owned phase→image selection; merely
    adding a Compose image service would still launch `browser-verify` in the general agent image.
14. A successful phase must write `/out/phase-result.json`; `advanceContainmentRun()` parses that
    fixed file through `parsePhaseArtifact()` before it seals a passed `phase_attempts` row. Browser
    detail files under `/out/browser/` cannot replace this generic phase result.
15. **The existing disposable-copy primitive leaks develop-workspace residue.** The closest existing
    analogue (item 5's per-attempt `self-test` copy) is a recursive copy of the whole durable workspace
    (`runner/src/queue.ts:797-803`) followed by `resetWorkspaceToCandidate()`
    (`runner/src/queue.ts:1105-1113`), which runs `git reset --hard`
    (`runner/src/conflict-scope.ts:544-550`) — an operation that does not remove untracked or ignored
    files. A focused fixture reproduced the mechanism: seeding an untracked file
    (`model-auth-copy`) before the copy, then running the recursive copy plus `git reset --hard`,
    leaves that file present in the copy (`RESIDUE_SURVIVES_RESET=yes`). Because the preceding
    `develop` phase carries model-auth mounts on a writable durable workspace
    (`runner/src/containers.ts:362-407`), reusing this exact primitive for `browser-verify`'s candidate
    materialization would let develop-phase credential/residue reach the preview container. This spec's
    candidate materialization (Target invariant 10) must not reuse it unmodified.

**Hard constraints from operator memory** (`/memory/MINION/sdlc-board-triage-and-phase-gates.md`,
★★★): prompts are not a security boundary; reviewers are technically read-only; the controller owns
truth; automerge stays disabled through M7 (`FACTORY_AUTOMERGE=0`). The archived
`minion-factory-agent-pipeline` entry in `/memory/MINION/index-archive.md` (★★★) says reviewers
propose while the applier re-verifies;
`deploy.sh` rewrites the box `.env` wholesale, so any new runtime flag/image reference this spec
needs must be emitted by `deploy.sh`, never hand-added on the host. This spec treats "prompts are not
a security boundary" as applying identically to page-rendered text reaching a downstream consumer
(§5 Design decision 5).

## 3. TO-BE

### Target invariants

1. **Evidence, not a model stage.** `browser-verify` joins `SUPPORTED_EVIDENCE`, not
   `SUPPORTED_STAGES`. The phase is deterministic, has no harness/model selection, and receives no
   GitHub, model, factory bearer, SSH, persistent-auth, or Docker-socket capability.
2. **An executable server-owned profile.** `RepoDef` declares `previewCommand`, `previewBaseUrl`, and
   `browserProfile`. All three are an all-or-nothing registration. `previewBaseUrl` declares only the
   scheme and port on the fixed per-run network alias `preview` (`http://preview:<1024-65535>`, no
   credentials/query/fragment/path beyond `/`) — invariant 5 explains why the host is a per-run network
   alias rather than a literal loopback address. `browserProfile` is a basename-only `.mjs` module
   under the runner-owned `browser-profiles/` directory; it exports deterministic Playwright flows and
   assertion policy. Candidate-controlled Markdown is documentation, not executable acceptance logic.
3. **Two isolated containers, one phase, one controller-owned image choice per role.**
   `browser-verify` runs after every passed `self-test` and before `prepare-review` when the run's
   current persisted manifest requires the evidence, and still seals exactly one `phase_attempts` row
   through one exit code. Internally it launches two containers under separate UIDs with no shared
   filesystem, mount namespace, or PID namespace:
   - **Preview container** (candidate-controlled): runs `previewCommand` against the freshly
     materialized, tracked-only candidate workspace (invariant 10) under the run's normal
     `FACTORY_AGENT_IMAGE`/self-test policy (`uid 1100`, `github: null`, `model: forbidden`). It
     receives **no** `/out` mount, **no** browser-profile mount, and **no** CDP access — those roles
     are absent from its container spec, not merely permission-denied. It is reachable from the
     browser container only on its declared port over the per-run internal network (invariant 5), and
     its process group is always killed and reaped at phase exit regardless of its own exit status.
   - **Browser (verifier) container**: the pinned `FACTORY_BROWSER_VERIFY_IMAGE`, under a distinct uid.
     It exclusively owns `/out` (rw) and a read-only snapshot of the browser profile; it never mounts
     candidate source of any kind. Chrome's DevTools Protocol binds to this container's own loopback
     only and is never exposed on the per-run network, so the preview container cannot reach it.
   Only the browser container's exit code and its `/out/phase-result.json` seal the attempt — the
   preview container cannot author, replace, or race that evidence because it has no path to `/out` at
   all.
4. **Containment-v2 is an activation prerequisite.** The legacy worker cannot schedule this phase.
   A manifest requiring `browser-verify` refuses to queue or advance unless
   `FACTORY_CONTAINMENT_V2=1`, the phase is in `CONTAINMENT_IMPLEMENTED_PHASES`, the dedicated image
   resolves, and the repo registration/profile is valid. Factory-side implementation may land
   before the worker-containment spec's production canary, but minion-meta activation may not.
5. **Per-run internal network; no unrestricted-egress mode exists.** The preview and browser
   containers share a freshly created, per-attempt Docker network created with the `--internal` flag
   (no route to any external destination), generalizing the existing `factory-provider-egress`
   two-network pattern (`runner/src/codex-broker-policy.ts`) to a dynamic per-attempt network. Only
   the two containers for this attempt are ever attached to it, and it is torn down at phase exit.
   `NETWORK_MODES` gains exactly one new closed value, `browser-internal`, used only by this phase's
   two roles; there is no `bridge` or other general-outbound mode for `browser-verify`, and a repo
   registration cannot opt into one. This satisfies the proposal's egress-allowlisting requirement by
   construction — the only destination reachable from the browser container is the preview container,
   and the preview container has no external destination to reach at all.
6. **Deterministic verdict.** The profile's Playwright assertions, configured console-error policy,
   and the fixed axe policy (fail on `critical` or `serious` violations) are the only inputs to pass
   or fail. Page text, AX labels, console bodies, and network bodies are evidence data and can never
   set a verdict. Full AX data is captured through Chrome DevTools Protocol
   `Accessibility.getFullAXTree`; `chrome-devtools-mcp` is installed and smoke-tested as required by
   the proposal, but no LLM or MCP-driving agent runs in this phase.
7. **Two-layer evidence contract.** Every successful or failed execution writes the generic
   `/out/phase-result.json` required by `advanceContainmentRun()` plus
   `/out/browser/{result.json,axe.json,ax-tree.json,console.jsonl,network.jsonl,screenshots/*.png}`.
   The runner validates every path no-follow, hashes the validated files, and persists only the
   bounded summary/hashes in `phase_attempts.evidence`; the full artifacts remain in the
   phase-attempt-owned `/out` leaf. A passed attempt must bind the current `candidate_sha`, the
   snapshotted `browserProfileHash`, and the inspected immutable browser image identity.
8. **Stable profile binding.** When browser evidence first becomes required, the runner copies the
   validated server-owned profile to a runner-owned, read-only per-run input leaf and records a hash
   over canonical `{previewCommand, previewBaseUrl, profileBytes, browserImageIdentity}`. Retries and
   review-fix rounds reuse that snapshot; automerge compares the passed attempt to the same snapshot
   and current candidate.
9. **Compatibility and intentional refusal.** Runs whose manifests do not require browser evidence
   retain their existing phase order, image, and gates. After the final `ui` policy activation, a
   `ui`-effective run for a repo without a browser registration intentionally refuses to queue; it
   never reports a false pass. This affects `minion-base`, `minion-site`, `minion-ai`, `minion-meta`,
   and `minion-factory` until each receives a separately reviewed profile.
10. **Clean, tracked-only candidate materialization.** The preview container's workspace is produced
    by `git archive candidate_sha | tar -x` (or an equivalent tracked-only export) from the
    controller's own bare mirror into a fresh directory — never a recursive copy of the develop
    workspace followed by `git reset --hard` (AS-IS item 15 proves that path leaves untracked/ignored
    residue). The result contains exactly the tracked files at `candidate_sha` and no `.git` directory,
    so it cannot carry forward any credential, secret, or other residue written into an ignored or
    untracked path during `develop`. Runtime dependencies come from a separately sealed,
    credential-free setup cache/artifact, never from copying develop's `node_modules` or install state.

## 4. DELTA

- **D1** Add the evidence name and all-or-nothing repo/profile schema (S1;
  T-EVIDENCE-SUPPORTED, T-REPO-SCHEMA).
- **D2** Add the two-container phase policy (preview + browser roles, disjoint mounts/UIDs), generic
  phase-artifact variant, conditional scheduler kept outside `DEV_PHASE_SEQUENCE`, and phase-specific
  image selection per role (S2; T-PHASE-POLICY-BROWSER, T-CONTAINER-SPLIT, T-SEQUENCE-CONDITIONAL,
  T-IMAGE-SELECTION).
- **D3** Build and publish an immutable browser image from pinned inputs, including exact Chrome for
  Testing archive version+checksum and exact Playwright, axe-core, chrome-devtools-mcp, Bun, pnpm,
  npm, and Node/base-image identities (S3; T-IMAGE-PINS-BROWSER, T-DIGEST-DEPLOY).
- **D4** Implement deterministic profile execution, clean tracked-only candidate materialization,
  per-run internal-network bind enforcement, capture, cleanup, and both evidence layers (S4;
  T-PROFILE-CONTRACT, T-CLEAN-MATERIALIZATION, T-EVIDENCE-FILESET, T-INTERNAL-NETWORK-ONLY).
- **D5** Snapshot/hash profiles and securely validate/bind the fixed evidence set (S5;
  T-PROFILE-SNAPSHOT, T-EVIDENCE-VALIDATE, T-EVIDENCE-BINDING).
- **D6** Enforce queue/advance readiness and an explicit automerge predicate (S6;
  T-MISSING-PROFILE-FAILCLOSED, T-V2-FAILCLOSED, T-READINESS-FAILCLOSED,
  T-AUTOMERGE-PREDICATE).
- **D7** Register and prove the `minion-hub` pilot, including adversarial content,
  container-isolation, and clean-materialization cases (S7; T-INJECTION-AXTREE, T-INJECTION-CONSOLE,
  T-EGRESS-INTERNAL-NETWORK-ONLY, T-CONTAINER-ISOLATION, T-CLEAN-MATERIALIZATION-E2E, T-PILOT-E2E).
- **D8** Add `browser-verify` to the canonical `ui` topic only after the production prerequisites and
  refusal canaries pass (S8; T-ROLLOUT-ORDER, T-META-ACTIVATION).

## 5. Design decisions

1. **Use `requiredEvidence`.** Existing `requiredStages` entries require `{harness, model}` and are
   the wrong contract for a model-forbidden deterministic worker. The existing test that rejects
   `requiredStages: ['browser-verify']` remains; a new test accepts it only as evidence.
2. **Split preview and browser into two isolated containers within one phase.** A single shared
   container/UID would let candidate-controlled preview code author or replace the verifier's own
   output — file-shape and hash checks alone prove bytes, not authorship, and cannot detect a
   same-namespace tamper (review finding H1). The phase still seals exactly one `phase_attempts` row
   and one exit code — the browser container's — but preview and browser run as separate OS
   principals with disjoint mounts, so authority over `/out` and the profile never touches the
   untrusted preview process. A server surviving into another phase remains impossible: both
   containers are torn down at phase exit.
3. **Use an executable profile, not a prose playbook.** A Markdown list of flows has no deterministic
   parser or assertion semantics. A runner-owned `.mjs` module is reviewable code, can express real
   Playwright actions/assertions, and is safe from candidate mutation through a per-run read-only
   snapshot.
4. **Use a per-run `--internal` Docker network, not `bridge`.** Splitting preview and browser into
   separate containers (decision 2) removes the shared network namespace the pre-fix design relied
   on for "loopback isolation," and `bridge` mode's general outbound access directly contradicts the
   proposal's egress-allowlisting requirement (review finding H2). A freshly created `--internal`
   network scoped to exactly the two containers for this attempt has no route to any external
   destination by construction — stronger than allowlisting, since there is nothing to allowlist
   against. No proxy is necessary, and there is no configurable escape hatch left to document as
   residual risk.
5. **Reuse `/out`, but honor the generic phase contract.** Browser files live under
   `/out/browser/`; `/out/phase-result.json` remains mandatory because it is how the existing runner
   closes any phase attempt. No new database table or output mount role is required.
6. **Snapshot before execution.** Binding evidence to whatever profile happens to be current at
   automerge time would make a previously passed run change meaning after deployment. The per-run
   snapshot makes crash retries, fix rounds, and later automerge evaluation deterministic.
7. **Activation remains gated on containment-v2.** The worker-containment spec's open production
   rollout is a real blocker to the final policy flip, not merely an alert: with the flag off the
   legacy path cannot execute this new phase.
8. **Activate canonical `ui`, not `ux`.** The shipped topic-manifest spec names `ui` as this
   extension point, and this spec/proposal's DoD says a UI-tagged repo fails closed. `ux` is a
   distinct canonical topic today, not an alias; widening it is a separate policy decision.
9. **Represent the conditional phase outside `DEV_PHASE_SEQUENCE`.** `DEV_PHASE_SEQUENCE` and
   `CONTAINMENT_IMPLEMENTED_PHASES`/`containmentReadiness()` stay byte-identical; adding
   `browser-verify` to either would make it a fleet-wide kill switch for every non-browser dev run
   the moment it lands, or a false readiness signal if added early (review finding M2). Instead
   `nextPhase()` gains a `conditionalPhases: WorkerPhase[]` parameter defaulting to `[]`
   (byte-compatible at the two option-less call sites in `preSetupReconciliation()` and
   `reconcileBaseWithBoundedResolution()`); only `advanceContainmentRun()`'s pump may pass
   `['browser-verify']`, and only when the run's current persisted manifest requires the evidence. A
   separate `browserVerifyReadiness()` predicate — never OR'd into `containmentReadiness()` — governs
   whether the elected phase may actually execute: it requires `FACTORY_CONTAINMENT_V2=1`,
   `browser-verify` present in `CONTAINMENT_IMPLEMENTED_PHASES` (added only in Slice 7, once the
   entrypoint, image, and evidence ingestion all exist), a resolved named-digest browser image, and a
   valid repo registration. An S2-only deployment (predicate and conditional election present, phase
   still absent from `CONTAINMENT_IMPLEMENTED_PHASES`) must leave every non-browser run's sequence and
   global readiness byte-identical to pre-slice behavior, and must make any run whose manifest
   requires `browser-verify` fail closed with a distinct "browser-verify not yet implemented"
   readiness reason rather than hanging the pump or reporting a false pass.

## 6. Slices

Before every slice, re-fetch the named `minion-factory/main` files and reconcile drift. Each slice
is one 4–8 hour implementation run and must not start a later slice.

### Slice 1 — evidence and repo-profile schema (minion-factory, 4–6h)

**Topics:** infra, data, test

**Files:** `runner/src/topics.ts`, `runner/src/topics.test.ts`, `runner/src/repos.ts`, its tests,
`repos.example.json`, `README.md`.

Add `browser-verify` only to `SUPPORTED_EVIDENCE`. Add the three optional repo fields from invariant
2 (`previewCommand`, `previewBaseUrl`, `browserProfile`) and `validateBrowserConfig()`. Validate the
three fields all-or-nothing; reject a malformed base URL (wrong scheme, non-`preview` host, port
outside `1024-65535`, or path/query/fragment beyond `/`), unsafe profile paths, and a
missing/non-regular profile file. There is no per-repo network field — the topology is fixed
(invariant 5) and not configurable.

**DoD:** `cd runner && npm test -- --test-name-pattern='topics|repos|browser config' && npm run
typecheck`. Tests prove accepted evidence, unchanged stage rejection, every partial combination, and
URL/host/port/path rejection.

### Slice 2 — phase policy, scheduling, and image routing (minion-factory, 4–6h)

**Topics:** infra, logic, test

**Files:** `runner/src/containers.ts`, `runner/src/containers.test.ts`, `runner/src/queue.ts`,
`runner/src/queue.test.ts`.

Add the `browser-verify` worker phase as a two-container launch plan (§5 Design decision 2): a
**preview** role reusing the repo's existing self-test/build policy (uid 1100, read-only root,
writable `/tmp` and ephemeral home, `github: null`, `model: forbidden`, a disposable candidate-only
workspace, **no** `/out` mount, **no** `browser-profile` mount) and a **browser** role on the
dedicated `FACTORY_BROWSER_VERIFY_IMAGE` under a distinct uid (exclusive `/out` rw, read-only
`browser-profile` input, **no** candidate/workspace mount). Add the `browser-internal` value to
`NETWORK_MODES` and attach both roles, and only both roles, to a freshly created per-attempt
`--internal` network (§5 Design decision 4) — no other network mode is valid for this phase. Extend
the phase artifact parser with a browser variant that requires candidate/profile/image bindings
sourced from the browser role's `/out` only.

Implement §5 Design decision 9 exactly: add `nextPhase(..., {conditionalPhases: []})`
(byte-compatible default at every existing call site), have `advanceContainmentRun()`'s pump alone
pass `['browser-verify']` when required, and add the standalone `browserVerifyReadiness()` predicate
(never folded into `containmentReadiness()`). Do **not** add `browser-verify` to
`CONTAINMENT_IMPLEMENTED_PHASES` in this slice. A failed browser attempt enters the same bounded
develop-fix loop as failed self-test/review. Add `imageForPhase()` so each role resolves its own
image (preview keeps `FACTORY_AGENT_IMAGE`; browser uses `FACTORY_BROWSER_VERIFY_IMAGE`).

**DoD:** `cd runner && npm test -- --test-name-pattern='phase policy|container plan|nextPhase|image
selection|phase artifact|browser verify readiness' && npm run typecheck`. Exact per-role
allowlists/mounts/network are asserted, including that the preview role's container spec has no
`/out` or profile mount and the browser role's has no candidate mount; every old sequence fixture is
unchanged; fix rounds rerun browser verification for the new candidate; deleting the
phase/artifact/image mapping fails tests; and a dedicated intermediate-state test proves that with
this slice alone landed (readiness predicate and conditional election present, phase absent from
`CONTAINMENT_IMPLEMENTED_PHASES`) every non-browser run's sequence/readiness is byte-identical to
pre-slice behavior, while a run whose manifest requires `browser-verify` fails closed with the
"browser-verify not yet implemented" reason instead of hanging or false-passing.

### Slice 3 — pinned image supply chain (minion-factory, 4–6h)

**Topics:** deps, infra, security, test

**Files:** `agent/Dockerfile.browser-verify`, browser-image lock/package files,
`scripts/verify-image-pins.sh`, `docker-compose.yml`, `.env.example`, `deploy.sh`.

Build from a digest-pinned base. Download an exact Chrome for Testing build with a committed SHA-256
check; install dependencies through a committed lockfile and `npm ci`, not floating global installs.
Write `/etc/factory-browser-toolchain.json` and smoke-test the Chrome binary and
`chrome-devtools-mcp --version`. Publish/promote a named `repository@sha256:<manifest-digest>` and
emit it as `FACTORY_BROWSER_VERIFY_IMAGE` from `deploy.sh`; a mutable tag or bare local image ID is
not production-ready.

**DoD:** `scripts/verify-image-pins.sh`; two clean builds produce identical toolchain manifests;
`docker inspect` shows the fixed non-root entrypoint; a deployment fixture rejects a tag and accepts
a named digest. T-IMAGE-PINS-BROWSER and T-DIGEST-DEPLOY are automated tests, not manual diff review.

### Slice 4 — deterministic browser worker (minion-factory, 6–8h)

**Topics:** infra, logic, security, test

**Files:** `agent/factory-browser-verify-preview.sh`, `agent/factory-browser-verify.sh`,
`agent/lib/browser-verify-flows.mjs`, fixture profile and preview app, shell/Node tests.

Split entrypoints by role (§5 Design decision 2). **Preview entrypoint** (runs in the preview
container): materialize a fresh, tracked-only copy of exactly `candidate_sha` via
`git archive candidate_sha | tar -x` from the controller's bare mirror (never a recursive copy of the
develop workspace, and never `git reset --hard` on a reused checkout — AS-IS item 15,
invariant 10) into an ephemeral directory with no `.git` metadata; install dependencies from the
separately sealed, credential-free setup cache/artifact; start the registered command in a process
group bound to `0.0.0.0:<declared port>` on the per-run internal network only; and always
terminate/reap the process group at container exit. This container never mounts `/out` or the
browser profile and holds no credential of any kind. **Browser entrypoint** (runs in the browser
container): poll `http://preview:<declared port>` (the fixed per-run network alias) with a fixed
timeout before starting Chrome; import the read-only profile, run its Playwright flows against that
address, inject axe-core, capture CDP full AX trees (CDP bound to this container's own loopback only,
never exposed on the per-run network), checkpoint PNGs, console events, and request/response/failure
events. Flow assertion failure, critical/serious axe violations, or configured console errors fail.
Only the browser entrypoint writes browser result files and `/out/phase-result.json`; gate failures
return a valid `{status:'failed'}` phase artifact with process exit 0 so `nextPhase()` can enter its
bounded fix loop, while launch/infrastructure failures exit nonzero and remain crash/retry events.

**DoD:** `bash -n agent/factory-browser-verify-preview.sh && bash -n agent/factory-browser-verify.sh`
plus fixture tests prove profile actions and assertions execute, a wildcard preview bind is still
rejected before Chrome connects (defense in depth alongside the per-run internal network),
timeout/flow/axe failures are named, both containers' process groups are gone after success and
failure, the preview→browser connection succeeds under `--network browser-internal`, non-loopback
`fetch`, WebSocket, EventSource and image requests issued from the browser container fail and appear
in `network.jsonl`, and the complete fixed evidence set exists. Full container-boundary adversarial
proof (candidate code attempting to reach `/out`, the profile, or CDP) is Slice 7's job
(T-CONTAINER-ISOLATION, T-CLEAN-MATERIALIZATION-E2E).

### Slice 5 — profile snapshot and evidence ingestion (minion-factory, 4–6h)

**Topics:** data, infra, test

**Files:** `runner/src/browser-verify.ts`, `runner/src/browser-verify.test.ts`, `runner/src/queue.ts`.

Create a root-owned per-run profile input leaf without following links; copy the validated profile
once when evidence first becomes required and compute the hash in invariant 8. Validate fixed names
only: JSON/JSONL must be UTF-8 and structurally valid; allow 1 MiB each for JSON, 16 MiB and 100,000
lines each for JSONL, at most 64 PNGs of at most 16 MiB each; reject symlinks, non-regular files,
extra screenshot types, path traversal, missing files, or duplicate checkpoint names. Persist a
bounded summary and SHA-256 for every artifact in `phase_attempts.evidence`, not raw screenshots.

**DoD:** `cd runner && npm test -- --test-name-pattern='browser.?verify|profile snapshot|evidence' &&
npm run typecheck`. Corrupt, oversized, symlinked, extra, missing, and binding-mismatch fixtures fail
with the offending path; retry uses the identical snapshot/hash after the source profile changes.

### Slice 6 — fail-closed requirements and automerge (minion-factory, 4–6h)

**Topics:** infra, security, test

**Files:** `runner/src/manifest.ts`, its tests, `runner/src/queue.ts`, `runner/src/queue.test.ts`,
`runner/src/automerge.ts`, `runner/src/automerge.test.ts`.

At initial queue time, `enforceQueueRequirements()` rejects required browser evidence unless the
repo config is complete, containment-v2 is enabled, the phase/entrypoint is declared ready, and the
named-digest image resolves. Before every `nextPhase()` call, re-read the run's current persisted
manifest so monotonic post-push reclassification can add the phase; never rely on the stale
`manifestJson` dispatch argument. Re-run the same readiness check on advance. Automerge requires the
latest passed browser attempt for current candidate+profile+image and never treats page strings as a
verdict.

**DoD:** `cd runner && npm test -- --test-name-pattern='queue requirements|browser readiness|automerge'
&& npm run typecheck`. Missing profile, flag off, missing phase, missing/tagged image, late-added UI
evidence, stale candidate/profile/image, and absent/failed attempts each have named fail-closed tests.

### Slice 7 — minion-hub pilot and adversarial E2E (minion-factory, 6–8h)

**Topics:** infra, test, ui

**Files:** `runner/src/repos.ts`, `browser-profiles/minion-hub.mjs`,
`runner/src/browser-verify.e2e.test.ts`, `README.md`.

Verify the current hub scripts before registering its exact build+preview command and port. The
profile contains 2–3 executable unauthenticated flows with stable assertions and at least one
screenshot checkpoint each. Adversarial fixtures put instruction-shaped strings and fake verdicts in
DOM/AX/console/network fields and exercise non-loopback resource APIs from the browser container
under `browser-internal`.

Add the container-isolation adversarial suite required by review finding H1 (T-CONTAINER-ISOLATION):
a preview fixture that attempts to write into `/out`, open/inspect/signal the browser container's
process, escape its own process group, and connect to the browser container's CDP port — every
attempt must be denied while the preview's normal ability to serve HTTP to the browser container over
`browser-internal` is unaffected.

Add the clean-materialization adversarial fixture required by review finding H3
(T-CLEAN-MATERIALIZATION-E2E): seed an untracked, secret-shaped file (e.g. `model-auth-copy`) in the
develop workspace immediately before `browser-verify` runs, and prove it is absent from the preview
container's filesystem, the browser container, and every emitted artifact — the fixture fails loudly
if the file is ever readable from either container.

**DoD:** full runner tests/typecheck, image-pin check, shell syntax, and one deployed scratch
`minion-hub` run complete the sequence `...self-test → browser-verify → prepare-review → review`.
The runner-owned attempt directory contains valid artifacts bound to the real candidate/profile/image;
the DB row contains only the bounded summary/hashes. A second canary requiring browser evidence for
unregistered `minion-site` refuses before any worker starts. The container-isolation and
clean-materialization adversarial suites both pass. No PR-artifact publication is claimed.

### Slice 8 — canonical UI activation (minion-meta, 4–6h)

**Topics:** infra, test, ui

**Files:** `specs/topics.json` only.

Add `browser-verify` to `ui.requiredEvidence` only. Do not edit `ux`. This slice may merge only after
S1–S7 are deployed, `FACTORY_CONTAINMENT_V2=1` is verified on the live runner, the hub success canary
and site refusal canary pass, and the deployed runner recognizes the exact policy value.

**DoD:** `node scripts/spec-index.mjs && node scripts/proposal-index.mjs`; the existing topic tests
pass; a scratch `[ui]` manifest requires the new evidence; a scratch `[ux]` manifest does not; the
diff changes only `ui.requiredEvidence`. After deployment, one normal hub UI run (no override) runs
the phase, and one normal unregistered-repo UI run refuses with the expected reason.

## 7. Cross-repo impact assessment

| Impact zone | Repos/surface | Required treatment |
|---|---|---|
| Factory phase/evidence protocol | `minion-factory` only | Additive closed-set entries, generic phase result, exact policy tests, dedicated image selection |
| Canonical topic policy | `minion-meta/specs/topics.json` → every factory fleet repo | Activate last; `ui` runs on unregistered repos intentionally refuse |
| Registered UI applications | `minion-hub` pilot; behavior impact on `minion-base` and `minion-site` | Hub gets the only profile in scope; base/site refusal is verified and called out, not treated as compatibility |
| Other fleet repos that may declare/derive `ui` | `minion-ai`, `minion-meta`, `minion-factory` | Same fail-closed behavior until separate per-repo profiles exist |
| Deployment/env | `minion-factory/docker-compose.yml`, `deploy.sh`, production `.env` | `FACTORY_BROWSER_VERIFY_IMAGE` is a named immutable digest and is emitted by `deploy.sh`, per `/memory/MINION/index-archive.md`'s ★★★ wholesale-rewrite constraint |
| Automerge | `minion-factory` only | New evidence predicate; `FACTORY_AUTOMERGE=0` remains untouched per `/memory/MINION/sdlc-board-triage-and-phase-gates.md` |
| AGENTS.md named product impact zones | shared WS protocol, channel extensions, shared DB, agent definitions, auth, workshop, pixel office, paperclip adapters | None entered; no code or contract in those zones changes |
| Existing hub live-preview subsystem | `minion_hub` + gateway plugin | No dependency or change; operator memory records it as inert until `PREVIEW_RUNNER_URL/_SECRET` is configured |

**Residual risk:** none for egress — the per-run `--internal` network (§5 Design decision 4) has no
route to any external destination, and there is no configurable escape hatch. The remaining residual
risk is scope, not isolation: `minion-hub` is the only registered profile, so `minion-base`,
`minion-site`, `minion-ai`, `minion-meta`, and `minion-factory` stay fail-closed on `ui` until each
receives its own separately reviewed profile (invariant 9).

## 8. Out of scope

- An LLM or harness driving browser/MCP interactions.
- Profiles for `minion-base`, `minion-site`, `minion-ai`, `minion-meta`, or `minion-factory`.
- Making `ux` independently require browser evidence or introducing an `a11y` topic.
- Custom per-repo axe rule sets beyond the fixed critical/serious gate.
- The hub Projects⇄GitHub live-preview subsystem.
- Existing agent/runner image pinning and the containment-v2 rollout implementation owned by the
  worker-containment spec. The rollout's successful production completion is nevertheless a hard S8
  prerequisite.
- Uploading browser artifacts to GitHub/PRs or changing the review worker/evidence format.

## 9. Verification

The spec is complete only when S1–S8 pass in order, the deployed runner reports containment-v2
enabled, the browser image reference is a named manifest digest, the hub success and site refusal
canaries pass, the canonical `ui` policy is live, and a post-activation hub run produces validated
candidate/profile/image-bound evidence before review. `FACTORY_AUTOMERGE=0`, provider independence,
the human merge gate, and reviewer read-only authority remain unchanged.

The memory constraints that shape this result are cited above: `/memory/MINION/MEMORY.md` and
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` require slice-scoped runs, controller-owned
truth, prompts not serving as a security boundary, and automerge remaining off; the archived
`minion-factory-agent-pipeline` entry in `/memory/MINION/index-archive.md` requires reviewers to
propose while the applier re-verifies and records the `deploy.sh` wholesale `.env` rewrite.
