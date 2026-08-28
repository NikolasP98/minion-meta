---
id: 2026-08-28-factory-browser-verification-stage-spec
title: Credential-free, loopback-isolated browser-verification stage for UI-topic factory runs
stage: spec
status: draft
pass: 1
created: 2026-08-28
updated: 2026-08-28
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
stage. The two related artifacts below are the shipped prerequisites this spec activates; neither
already satisfies this proposal's DoD.

| id | relation |
|---|---|
| [[2026-08-18-factory-worker-containment-spec]] | **Prerequisite, mostly shipped.** Its 2026-08-28 board audit records S1-S3 shipped (phase-policy kernel `runner/src/containers.ts`, `factory-*.sh` entrypoints, credential-free setup/self-test, `phase_attempts`/`phase_effects` evidence tables) and S4-S5 still open (agent/runner Dockerfiles remain tag-only `FROM node:22-bookworm-slim`, no `verify-image-pins.sh`, `FACTORY_CONTAINMENT_V2` not yet flipped to `1` in production). This spec builds a **new** `browser-verify` `WorkerPhase` inside the same deny-by-default kernel; it pins its own Dockerfile from its first commit rather than waiting on or duplicating S4's remediation of the two pre-existing images, and it does not claim `FACTORY_CONTAINMENT_V2=1` is active in production — see §8 alert. |
| [[2026-08-18-factory-topic-capability-manifest-spec]] | **Prerequisite, shipped (S1-S5; S6 operator-doc open per its board audit).** Its Design decision 3 reserved exactly this extension point: "`requiredStages`/`requiredEvidence` are enforced constraints... so [[browser-verification-stage]] can later add a `browser-verify` entry... without changing the manifest schema." This spec is that entry. It also names this proposal in its own §9 out-of-scope ("The actual browser-verification stage and its evidence artifacts"). |

The proposal's own 2026-08-28 board-audit note ("BOTH declared blockers cleared... topics.ts:37
`SUPPORTED_STAGES`, topics.test.ts asserts `/unsupported stage "browser-verify"/`") verified that
the fail-closed extension mechanism exists and rejects an undeclared `browser-verify` value today.
§5 Design decision 1 below explains why this spec adds `browser-verify` to `SUPPORTED_EVIDENCE`
rather than `SUPPORTED_STAGES`, and leaves that specific regression fixture untouched.

## 1. Owner surface

**minion-factory** (`NikolasP98/minion-factory`, private, default branch `main`) — new
`agent/factory-browser-verify.sh`, `agent/Dockerfile.browser-verify` (new image, not the existing
`agent/Dockerfile`), `runner/src/browser-verify.ts` (+ `.test.ts`), edits to `runner/src/topics.ts`,
`runner/src/containers.ts` (+ `.test.ts`), `runner/src/repos.ts`, `runner/src/queue.ts`,
`runner/src/automerge.ts`, `repos.example.json`, `docker-compose.yml`, `deploy.sh`,
`scripts/verify-image-pins.sh` (extend if landed by the containment spec's S4, else a minimal
local check scoped to this one image), `playbooks/minion-hub-browser.md` (new pilot playbook),
`README.md`.

**minion-meta** (this repo) — `specs/topics.json` only, in the final slice.

**Live baseline reviewed:** `minion-factory/main` commit `9dc06488683fd700e6e2a11d83bc6ccbcc0ad2d0`
(2026-08-28T08:44:29Z), read via `gh api repos/NikolasP98/minion-factory/contents/...` (this repo
is meta-gitignored and not checked out locally). Re-read every touched file before implementation —
this is a drift gate, not permission to implement the stale excerpts quoted below if a concurrent
factory PR lands first.

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
3. `runner/src/containers.ts:38-46` declares a closed `WORKER_PHASES` union of exactly
   `prepare-workspace, setup, develop, reconcile-base, self-test, prepare-review, review`.
   `NETWORK_MODES` (`containers.ts:55`) is closed to `none|bridge` — no proxy/allowlist/second-network
   primitive exists anywhere in this file. `PHASE_POLICIES` (`containers.ts:289-476`) gives every
   phase a fixed `network`, `mountRoles`, `envAllowlist`, `github`/`model` credential posture, and
   resource limits; an unlisted phase is a hard `unknown worker phase` error
   (`phasePolicy()`, `containers.ts:478-484`). `self-test`'s policy (`containers.ts:409-424`) is
   `github: null, model: 'forbidden', network: 'repo:self-test'` (closed per-repo opt-in, default
   `none`) with `mountRoles: {workspace: 'rw', out: 'rw', cache: 'any'}` — the closest existing
   analogue to what this spec needs.
4. `DEV_PHASE_SEQUENCE` (`containers.ts:1115-1122`) is a **fixed** 7-element array, and `nextPhase()`
   (the same file, ~1128-1180) is a pure function of `attempts` plus `{maxFixRounds}` only — it has
   no manifest/topic input, so it cannot conditionally schedule a phase today.
   `queue.ts:1573` calls it as `nextPhase(containmentPhaseStates(runId), {maxFixRounds})`, again with
   no per-run conditional-phase argument.
5. `canonicalMountSource()` (`containers.ts`, the `workspace` case) special-cases only `self-test`
   for a disposable per-attempt copy (`${root}/selftest-${attempt}`); every other phase shares the
   one `${root}/workspace` develop owns.
6. `runner/src/repos.ts:12-48`'s `RepoDef` has `setup`, `selfTest`, `playbook`, `setupNetwork`,
   `selfTestNetwork`, `commandEnv` — no preview command, port, base URL, or browser-profile field of
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
8. `runner/src/db.ts:672-694`'s `phase_attempts` table already has `run_id, phase, attempt, status,
   policy, candidate_sha, reviewed_sha, provider, exit_code, exit_reason, evidence TEXT, started_at,
   finished_at` with `UNIQUE(run_id, phase, attempt)`. `evidence` is a free-form column any phase
   name can populate — no new table or migration is implied by adding one more `WorkerPhase`.
9. `runner/src/automerge.ts`'s `evaluateAutoMergeRun()` (`automerge.ts:44-88`) loops
   `manifest.requiredStages` requiring each to resolve to `isExecutableStage(configuredStages[stage])`
   (an object with `{harness, model}`) — that shape fits `spec`/`develop`/`review` but is meaningless
   for a credential-free, model-forbidden phase. The **separate** `manifest.requiredEvidence` loop
   (`automerge.ts:81-85`) special-cases only `'review-verdict'`; every other evidence name (including
   today's `'self-test'`) is accepted with **no explicit predicate** beyond the run-level
   `status === 'passed'` check at the top of the function — a real gap this spec must close for its
   own evidence name, not inherited debt to fix generally.
10. `agent/Dockerfile:1` and `runner/Dockerfile:1` still read `FROM node:22-bookworm-slim` (mutable
    tag) and `runner/Dockerfile:19` still `CMD ["npx", "tsx", "src/index.ts"]` — confirmed live at
    the baseline commit above. The worker-containment spec's own 2026-08-28 board audit records this
    as its still-open Slice 4; the digest-pinning discipline it establishes is the bar this spec's
    **new** image must clear from its first commit, independent of when that slice lands for the two
    pre-existing images.
11. No `playwright`, `chrome-devtools`, `preview`, or egress-proxy code exists anywhere in
    `minion-factory` today (verified by a repository code search at the baseline commit). The only
    existing "restrict egress to one destination" precedent is `runner/src/codex-broker-policy.ts`'s
    two-network pattern (`factory-provider-egress` network, `createInternalNetworkArgs`/
    `attachBrokerEgressArgs`) built for the Codex broker's fixed, known upstream — a different shape
    (a stable named provider, not a dynamic per-run loopback origin) that this spec does not reuse
    directly (see §5 Design decision 3 for why loopback isolation is a strictly stronger fit here).
12. A **different**, unrelated "preview" system exists in the ecosystem: `minion_hub`'s
    Projects⇄GitHub feature has a gateway plugin that serves a live git-worktree preview on the
    Netcup box, gated behind `PREVIEW_RUNNER_URL`/`_SECRET` and currently **inert** (per operator
    memory). It is a user-facing live-preview surface owned by the `minion` gateway, not a CI
    verification stage owned by the factory runner — this spec does not depend on it, extend it, or
    collide with it, and does not reuse its worktree-on-the-box mechanism (this spec's preview is a
    same-container ephemeral build, torn down at phase exit).

**Hard constraints from operator memory** (`/memory/MINION/sdlc-board-triage-and-phase-gates.md`,
★★★): prompts are not a security boundary; reviewers are technically read-only; the controller owns
truth; automerge stays disabled through M7 (`FACTORY_AUTOMERGE=0`). `/memory/MINION/factory` topic
(`minion-factory-agent-pipeline.md`, ★★★): reviewers propose while the applier re-verifies;
`deploy.sh` rewrites the box `.env` wholesale, so any new runtime flag/image reference this spec
needs must be emitted by `deploy.sh`, never hand-added on the host. This spec treats "prompts are not
a security boundary" as applying identically to page-rendered text reaching a downstream consumer
(§5 Design decision 5).

## 3. TO-BE

### Target invariants

1. **`browser-verify` is evidence, not a model-driven stage.** The proposal's DoD explicitly forbids
   a model credential in the browser-verification image, so its acceptance flows must be
   deterministic scripts (Playwright-style), not an LLM driving `chrome-devtools-mcp` interactively.
   It therefore joins `SUPPORTED_EVIDENCE`, mirroring `'self-test'` exactly (a deterministic,
   credential-free, repo-registered command), **not** `SUPPORTED_STAGES` (whose three members are all
   `{harness, model}`-configured). `runner/src/topics.test.ts:102-104`'s existing rejection fixture
   is untouched by this spec.
2. A UI-classified repo declares its browser-verification surface once, in the runner-owned registry:
   a preview build+serve command, a fixed loopback port, and a playbook naming the acceptance flows —
   symmetric with the existing `setup`/`selfTest`/`playbook` triad, not a new nested config shape.
3. **One new, deny-by-default `WorkerPhase`.** `browser-verify` joins the phase-policy kernel with the
   same credential posture as `self-test` (`github: null, model: 'forbidden'`) plus a disposable
   candidate copy exactly like `self-test`'s. It builds the preview, serves it, drives the flows, and
   tears the server down — all inside its own container's lifetime — so no phase boundary ever has to
   hand off a still-running server process (a fixed constraint of the existing one-shot,
   exit-code-gated phase model this spec must not break).
4. **Egress isolation is loopback-only by default, not a proxy allowlist.** The preview server binds
   `127.0.0.1:<previewPort>` inside the same container Chrome runs in. With the phase's Docker network
   mode at its default `none`, Chrome can reach that loopback address (loopback always exists inside a
   container's own network namespace regardless of `--network` mode) and **nothing else** — no proxy,
   firewall rule, or second Docker network is needed for the common case, and there is no destination
   to misconfigure. A repo whose flows genuinely need a real third-party origin (OAuth redirect, CDN
   asset) may opt into `bridge` explicitly, symmetric with `selfTestNetwork`; that opt-in trades away
   the loopback guarantee and is flagged, not solved, by this spec (§8 alert).
5. **Fail-closed activation.** A run whose resolved manifest requires `browser-verify` evidence but
   whose target repo lacks a complete preview/browser-playbook registration, or whose runner build
   lacks the phase's entrypoint/image, refuses to queue — never silently skips the stage. This mirrors
   the existing `containmentGate()`/unknown-declared-topic fail-closed postures exactly.
6. **Evidence is bound, validated, and reused, not re-invented.** `/out` under a `browser-verify`
   attempt already resolves to a phase+attempt-unique, runner-owned leaf directory
   (`canonicalMountSource()`'s existing `out` case) — the proposal's "artifacts under `/out/browser/`"
   is realized as that leaf directory's contents, not a new mount role. The evidence file set
   (`result.json`, `axe.json`, `ax-tree.json`, `screenshots/*.png`, `console.jsonl`, `network.jsonl`)
   is opened no-follow, size/type-validated the same way `review.ts` already validates `REVIEW.md`,
   hashed together with the run's `candidate_sha` and a `browserProfileHash` (sha256 of the resolved
   `previewCommand`/`previewPort`/`browserVerifyNetwork`/playbook **content**, via the existing
   `manifest.ts:canonicalJson()` helper), and persisted on the existing generic
   `phase_attempts.evidence` column — no new table.
7. **Untrusted page content stays inert.** AX-tree accessible names/roles, page title, and
   console/network log bodies are opaque evidence bytes: never concatenated into a shell command, a
   file path, a subsequent prompt, or interpreted as a verdict. A page that emits text shaped like
   `VERDICT: PASS` or an injection attempt aimed at a driving agent changes nothing, because there is
   no driving agent in this phase to inject into (invariant 1) and the runner-side ingestion in
   invariant 6 only ever reads the fixed evidence files as data.
8. **Compatibility.** No existing `WORKER_PHASES` entry, `PHASE_POLICIES` value, `DEV_PHASE_SEQUENCE`
   ordering, or `automerge` gate changes for a run whose manifest does not require `browser-verify`
   evidence — every currently-registered repo's dev-run behavior is byte-identical until its
   `RepoDef` is explicitly given a preview/browser-playbook registration **and** `specs/topics.json`
   is updated in the final slice.

## 4. DELTA (numbered; each maps to a slice + proving test)

- **D1** `browser-verify` is added to `SUPPORTED_EVIDENCE` (not `SUPPORTED_STAGES`); the existing
  `SUPPORTED_STAGES` rejection fixture is unmodified (→S1, T-EVIDENCE-SUPPORTED,
  T-STAGE-FIXTURE-UNCHANGED)
- **D2** `RepoDef` gains `previewCommand`, `previewPort`, `browserVerifyNetwork`, `browserPlaybook`,
  validated all-or-nothing, with `repoNetwork()` extended accordingly (→S1, T-REPO-SCHEMA,
  T-PARTIAL-CONFIG-REJECTED)
- **D3** A new deny-by-default `browser-verify` `WorkerPhase` exists in the phase-policy kernel
  (`github: null, model: 'forbidden'`, disposable workspace copy, closed `repo:browser-verify`
  network defaulting `none`) and `nextPhase()` gains an additive, opt-in parameter that conditionally
  inserts it between `self-test` and `prepare-review` without altering the unconditional path
  (→S1, T-PHASE-POLICY-BROWSER, T-SEQUENCE-CONDITIONAL, T-SEQUENCE-REGRESSION)
- **D4** A pinned browser-verification image (Chrome for Testing digest, pinned
  `chrome-devtools-mcp`/Playwright versions, build-time toolchain manifest) and its entrypoint execute
  build→preview→flows→axe→AX-tree→screenshots→console/network inside one container, writing the
  fixed evidence file set (→S2, T-IMAGE-PINS-BROWSER, T-EVIDENCE-FILESET, T-LOOPBACK-ONLY)
- **D5** Runner-side evidence ingestion validates/hashes/binds the file set to `candidate_sha` +
  `browserProfileHash` and persists it on `phase_attempts.evidence`; queue-time resolution fails
  closed on an incomplete preview registration or an unready phase build; `automerge.ts` gains an
  explicit `browser-verify` predicate (→S3, T-EVIDENCE-VALIDATE, T-MISSING-PROFILE-FAILCLOSED,
  T-READINESS-FAILCLOSED, T-AUTOMERGE-PREDICATE)
- **D6** Adversarial proof that page-derived text cannot alter the runner's accept/reject decision,
  and that Chrome under the default network policy cannot reach anything but the loopback preview
  origin (→S4, T-INJECTION-AXTREE, T-INJECTION-CONSOLE, T-EGRESS-LOOPBACK-ONLY)
- **D7** `specs/topics.json`'s `ui`/`ux` topics declare `requiredEvidence: [..., 'browser-verify']`
  only after the factory-side slices are deployed and verified live (→S5, T-ROLLOUT-ORDER,
  T-META-ACTIVATION)

## 5. Design decisions

1. **Evidence, not a stage.** See TO-BE invariant 1. Modeling `browser-verify` as `SUPPORTED_EVIDENCE`
   (like `self-test`) rather than `SUPPORTED_STAGES` (like `develop`/`review`) is the direct
   consequence of the proposal's "no... model credentials" requirement — `automerge.ts`'s
   `isExecutableStage()` predicate for `requiredStages` requires `{harness, model}`, which a
   credential-free phase can never satisfy. Treating it as required evidence instead lets it reuse the
   exact enforcement shape `self-test` already has, and needs a new explicit predicate only in the
   `requiredEvidence` loop (closing AS-IS #9's pre-existing gap for this one evidence name — no other
   evidence name's enforcement is touched).
2. **Single container, not prepare+verify split.** An earlier draft of this design split "build/serve
   the preview" and "drive Chrome against it" into two sequential phases, mirroring
   `prepare-review`/`review`. That does not fit: a preview server must stay running while the
   verification step executes, but every existing phase is a one-shot process gated by its own exit
   code (`nextPhase()`'s `status === 'passed'` transition) — there is no mechanism today for one
   phase's background process to outlive its container into the next phase's container. Folding
   build→serve→verify→teardown into one `browser-verify` phase's entrypoint script avoids inventing
   cross-container process handoff and keeps the "one container per WorkerPhase, one exit code"
   invariant every other phase already relies on.
3. **Loopback isolation instead of an egress-allowlist proxy.** Because the preview server and Chrome
   share one container's network namespace, binding the server to `127.0.0.1:<previewPort>` and
   leaving the phase's Docker network mode at its closed-set default `none` makes "everything outside
   the preview origin is unreachable" a property of Linux network namespaces, not application-level
   policy — there is no proxy config, allowlist table, or second Docker network to build, test, or
   misconfigure. This is a strictly stronger and simpler guarantee than the codex-broker's
   two-network/provider-egress pattern (AS-IS #11), which exists to reach a **known external**
   upstream and does not fit an **ephemeral, per-run, purely local** origin. The `bridge` opt-in
   (TO-BE invariant 4) intentionally does not attempt to build a dynamic allowlist for that rarer
   case — see §8's alert.
4. **Reuse the existing `out` mount, not a new `/out/browser/` mount role.** `MOUNT_ROLES` already
   gives every phase attempt its own unique, runner-owned `/out` leaf
   (`${root}/out/${phase}-${attempt}`, `containers.ts`'s `canonicalMountSource()`). The proposal's
   `/out/browser/` is satisfied by the entrypoint writing evidence files under that existing mount
   (optionally namespaced `browser/` inside it for readability); adding a distinct `MountRole` would
   duplicate a guarantee (per-phase, per-attempt, leaf-only, never an ancestor of another role's
   source) the kernel already provides.
5. **Page-derived text is data, never instruction, symmetric with the review boundary.** The operator
   memory constraint "prompts are not a security boundary" (AS-IS, hard constraints) was written for
   the model-driven `review` phase; this spec applies the identical posture to `browser-verify`'s
   evidence ingestion even though no model is present here — the risk this design decision closes is
   not prompt injection into an LLM (there is none in this phase) but injection into whatever
   downstream code later reads the evidence (`browser-verify.ts`, PR comment rendering, a future
   agent summarizing results): AX-tree labels/console/network bodies are stored and displayed as
   opaque strings, never interpolated into a shell command, file path, SQL, or template that could
   reinterpret them.
6. **Missing preview registration is a hard queue-time refusal, not a skipped stage.** Symmetric with
   `resolveManifest()`'s existing unknown-declared-topic refusal (`DeclaredTopicError`) and
   `containmentGate()`'s incomplete-phase refusal — an operator must never be able to misread "the
   browser stage silently didn't run" as "the browser stage passed."

## 6. Slices

### Slice 0 — recon (fold into Slice 1's first hour)

**Topics:** `docs`, `logic`

Re-fetch `runner/src/topics.ts`, `runner/src/containers.ts`, `runner/src/repos.ts`,
`runner/src/queue.ts`, `runner/src/automerge.ts`, `runner/src/db.ts`, `agent/Dockerfile`,
`runner/Dockerfile`, and `docker-compose.yml` at HEAD of `main` and diff against the excerpts quoted
in §2. If the worker-containment spec's Slice 4/5 (image pinning, `FACTORY_CONTAINMENT_V2=1`
activation) or any other concurrent factory spec has landed changes to any of these files, rebase
this spec's plan around the new shape rather than reverting a sibling spec's change to restore these
excerpts.

### Slice 1 — schema and phase-policy extension points (minion-factory, 6-8h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** make the new phase and its registry surface machine-readable and deny-by-default before any
container actually launches Chrome.

**Files:**

- `runner/src/topics.ts`, `runner/src/topics.test.ts`
- `runner/src/repos.ts`, `runner/src/repos.test.ts` (or the file holding its existing tests)
- `runner/src/containers.ts`, `runner/src/containers.test.ts`
- `repos.example.json`

Add `'browser-verify'` to `SUPPORTED_EVIDENCE` (D1). Add `previewCommand?: string`,
`previewPort?: number`, `browserVerifyNetwork?: NetworkMode`, `browserPlaybook?: string` to
`RepoDef`; a new `validatePreviewConfig(id, def)` rejects any state where exactly one of
`previewCommand`/`previewPort`/`browserPlaybook` is set without the other two (all-or-nothing), a
`previewPort` outside `[1024, 65535]`, or an unknown `browserVerifyNetwork` value (reusing
`parseNetworkMode`). Extend `repoNetwork()` to also resolve `browserVerify` (default `none`).

In `containers.ts`: add `'browser-verify'` to `WORKER_PHASES`; add a `PhasePolicy` entry
`{phase: 'browser-verify', entrypoint: '/usr/local/bin/factory-browser-verify.sh', user: '1100:1100',
network: 'repo:browser-verify', readOnlyRootfs: true, tmpfs: ['/tmp', '/home/agent'], github: null,
model: 'forbidden', mountRoles: {workspace: 'rw', out: 'rw', cache: 'any'}, requiredMountRoles:
['workspace', 'out'], envAllowlist: [...BASE_ENV, ...PHASE_ENV, 'FACTORY_RUN_ID', 'CI',
'FACTORY_COMMAND', 'FACTORY_PREVIEW_PORT', 'FACTORY_BROWSER_PLAYBOOK'], repoCommandEnv: true, limits:
WORK_LIMITS}`. Extend `canonicalMountSource()`'s `workspace` case so `phase === 'browser-verify'`
also gets a disposable per-attempt copy (`${root}/browserverify-${attempt}`), exactly like
`self-test`'s existing special case, so a mutation during the preview build can never become the
next candidate. Extend `nextPhase()`'s options with an additive `browserVerifyRequired?: boolean`
(default `false`); when `true`, the transition map inserts `'self-test': 'browser-verify'` and
`'browser-verify': 'prepare-review'` in place of the existing `'self-test': 'prepare-review'`, and
the bounded-fix-round gate-phase set (`reconcile-base`/`self-test`/`review`) gains
`'browser-verify'`. When `false` (the default, and every call site until Slice 5), behavior is
byte-identical to today.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='topics|repos|container plan|phase policy'
npm run typecheck
```

`topics.test.ts` gains a case proving `requiredEvidence: ['browser-verify']` now validates —
T-EVIDENCE-SUPPORTED — and the existing `requiredStages: ['browser-verify']` rejection fixture at
`topics.test.ts:102-104` is asserted unchanged byte-for-byte in the diff —
T-STAGE-FIXTURE-UNCHANGED. `repos.test.ts` proves a `RepoDef` with only `previewCommand` set (no
`previewPort`/`browserPlaybook`) is rejected, and one with all three plus a `previewPort` of `80` is
rejected — T-PARTIAL-CONFIG-REJECTED. `containers.test.ts` asserts the exact env/mount/network set
for `browser-verify` (no GitHub/model/persistent-auth/Docker-socket surface can be added without the
test failing), that its disposable workspace source never collides with `self-test`'s or `develop`'s,
and that `nextPhase()` with `browserVerifyRequired: false` produces the identical sequence as before
this slice for every existing fixture (regression) while `browserVerifyRequired: true` inserts the
new phase exactly once between `self-test` and `prepare-review`, including in the bounded-fix-round
path — T-PHASE-POLICY-BROWSER, T-SEQUENCE-CONDITIONAL, T-SEQUENCE-REGRESSION.

### Slice 2 — pinned image and entrypoint (minion-factory, 8h)

**Topics:** `security`, `infra`, `deps`, `ui`

**Goal:** one container performs build→preview→flows→axe→AX-tree→screenshots→console/network with no
GitHub or model credential, and Chrome can reach nothing but the loopback preview origin.

**Files:**

- `agent/Dockerfile.browser-verify` (new)
- `agent/factory-browser-verify.sh` (new)
- `agent/lib/browser-verify-flows.mjs` (new — thin Playwright/`chrome-devtools-mcp`-library driver,
  no LLM in the loop)
- `runner/src/queue.ts` (image reference plumbing only, no scheduling logic yet)
- `docker-compose.yml`, `.env.example`

Pin `FROM` by digest (Chrome-for-Testing-compatible base), and pin exact `chrome-devtools-mcp`
(or the underlying `chrome-launcher`/Playwright-core package, whichever the driver actually imports),
`axe-core`, and Node versions with the same build-time "assert installed == pinned, write
`/etc/factory-toolchain.json`" pattern `agent/Dockerfile` already uses (AS-IS #10) — do not repeat the
tag-only mistake still open on the two pre-existing images. `factory-browser-verify.sh`: (1) copy the
disposable workspace, (2) run `$FACTORY_COMMAND` (the resolved `previewCommand`) in the background,
bound to `127.0.0.1:$FACTORY_PREVIEW_PORT` — the entrypoint refuses to proceed if the process is
observed binding any other interface — poll the port with a bounded timeout, exit non-zero on
timeout; (3) launch Chrome for Testing headless against that loopback origin only, drive the flows
named by `$FACTORY_BROWSER_PLAYBOOK` deterministically (Playwright-style script, not free-form agent
exploration), run `axe-core`, capture the full accessibility tree, take screenshots at each flow
checkpoint, and record every console message and network request/response (including any denied by
the container's network policy, which is valuable evidence of what the page attempted); (4) kill the
preview server; (5) write `/out/browser/result.json` (`{exit, verdictReason}`), `/out/browser/axe.json`,
`/out/browser/ax-tree.json`, `/out/browser/screenshots/*.png`, `/out/browser/console.jsonl`,
`/out/browser/network.jsonl`.

**Definition of done (machine-checkable):**

```bash
bash -n agent/factory-browser-verify.sh
docker build --pull -t factory-browser-verify-proof -f agent/Dockerfile.browser-verify .
docker run --rm --entrypoint sh factory-browser-verify-proof -c 'test -r /etc/factory-toolchain.json'
docker build --no-cache --pull -t factory-browser-verify-proof-2 -f agent/Dockerfile.browser-verify .
diff <(docker run --rm --entrypoint cat factory-browser-verify-proof /etc/factory-toolchain.json) \
  <(docker run --rm --entrypoint cat factory-browser-verify-proof-2 /etc/factory-toolchain.json)
```

A local fixture repo with a trivial static preview server proves: the entrypoint produces every file
in the fixed evidence set (T-EVIDENCE-FILESET); a fixture preview page that attempts
`fetch('http://169.254.169.254/')`, `fetch('https://example.com/')`, and a raw TCP connect to the
Docker host gateway all fail from inside Chrome and are recorded as denied attempts in
`network.jsonl`, while a request to the loopback preview origin itself succeeds
(T-LOOPBACK-ONLY); and a fixture whose `previewCommand` binds `0.0.0.0` instead of `127.0.0.1` makes
the entrypoint exit non-zero before Chrome ever launches (T-IMAGE-PINS-BROWSER covers the digest/pin
assertions above).

### Slice 3 — runner-side evidence, fail-closed queueing, automerge predicate (minion-factory, 8h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** the runner treats browser-verify evidence with the same rigor `review.ts` treats
`REVIEW.md`, and a run cannot silently skip a required browser stage.

**Files:**

- `runner/src/browser-verify.ts` (new), `runner/src/browser-verify.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/automerge.ts`, `runner/src/automerge.test.ts`
- `runner/src/repos.ts` (pilot registration: `minion-hub`)
- `playbooks/minion-hub-browser.md` (new)

`browser-verify.ts`: `validateBrowserEvidence(outDir)` opens each expected file with no-follow
semantics, rejects a symlink, a non-regular file, anything over a fixed size ceiling per file type
(screenshots larger than a generous PNG bound, JSON/JSONL logs larger than a generous line-count
bound), or invalid UTF-8/JSON where structure is expected — mirroring `review.ts`'s existing
`REVIEW.md` posture (AS-IS #9's sibling code, reused as a pattern, not imported directly since the
file shapes differ). `computeBrowserProfileHash(repoDef, playbookContent)` reuses
`manifest.ts`'s exported `canonicalJson()` + sha256 over
`{previewCommand, previewPort, browserVerifyNetwork, playbookContent}`. The validated result plus
`candidate_sha` plus `browserProfileHash` is what `queue.ts` persists into the `browser-verify`
`phase_attempts.evidence` column (AS-IS #8 — no schema migration).

`queue.ts`: before calling `nextPhase()`, read the run's persisted `manifest_json.requiredEvidence`;
if it includes `'browser-verify'`, pass `browserVerifyRequired: true` **only if** (a) the target
`RepoDef` has a complete preview/browser-playbook registration (Slice 1's `validatePreviewConfig`)
and (b) a `browserVerifyReadiness()` check (mirroring `containmentReadiness()`'s shape, scoped to
just this one phase's entrypoint/image) reports ready; otherwise the run refuses to queue with a
named reason (`DeclaredTopicError`-style refusal, not a silent `browserVerifyRequired: false`).

`automerge.ts`: add an explicit branch to the `requiredEvidence` loop —
`if (evidence === 'browser-verify') { /* require a passed browser-verify phase_attempts row whose
candidate_sha equals the run's current candidate_sha */ }` — closing AS-IS #9's gap for this one
evidence name.

Register `minion-hub` as the pilot: `previewCommand: 'bun run build && bun run preview --port
$FACTORY_PREVIEW_PORT --host 127.0.0.1'` (adjust to the repo's actual SvelteKit preview command),
`previewPort: 4173`, `browserVerifyNetwork: 'none'`, `browserPlaybook: 'minion-hub-browser.md'`.
`playbooks/minion-hub-browser.md` names 2-3 concrete acceptance flows (e.g. dashboard loads, a
primary nav route renders, no console errors) the deterministic driver in Slice 2 executes.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='browser.?verify|automerge'
npm run typecheck
```

A fixture with a corrupted/oversized/symlinked evidence file is rejected with the offending file
named — T-EVIDENCE-VALIDATE. A manifest requiring `browser-verify` evidence against a `RepoDef` with
no preview registration refuses to queue with a named reason, never silently proceeds without the
phase — T-MISSING-PROFILE-FAILCLOSED. The same manifest against a complete registration but a mocked
`browserVerifyReadiness()` reporting not-ready also refuses to queue — T-READINESS-FAILCLOSED. An
`evaluateAutoMergeRun()` fixture with `requiredEvidence: ['browser-verify']` and no passed
`browser-verify` attempt bound to the current `candidate_sha` is ineligible with a named reason; one
with a passed, correctly-bound attempt is eligible (all other existing gates held constant) —
T-AUTOMERGE-PREDICATE.

### Slice 4 — adversarial and end-to-end proof (minion-factory, 6-8h)

**Topics:** `security`, `test`, `infra`

**Goal:** prove the injection and egress boundaries under attack, and that the whole path works
against the real `minion-hub` pilot.

**Files:**

- `runner/src/containment.e2e.test.ts` (extend the existing containment E2E suite from the
  worker-containment spec if present, else new `runner/src/browser-verify.e2e.test.ts`)
- `agent/lib/browser-verify-flows.mjs` (fixture hardening only, if gaps are found)

Adversarial fixtures: a preview page whose DOM/AX-tree accessible names contain a string shaped like
a driving-agent instruction (there is none to inject into — the test proves the evidence pipeline
treats it as inert bytes reaching `browser-verify.ts` unchanged); a page whose console output emits
`VERDICT: PASS` or JSON shaped like `phase_attempts.evidence`; a page that attempts `WebSocket`,
`EventSource`, `<img src>`, and `fetch` requests to non-loopback hosts under both the default `none`
network and an explicit `bridge` opt-in fixture (proving the opt-in genuinely removes the loopback
guarantee, so the residual risk documented in §8 is demonstrated, not assumed). None of these change
`validateBrowserEvidence()`'s output or the run's terminal status.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test
npm run typecheck
cd ..
bash -n agent/*.sh
```

The E2E suite fails if any adversarial fixture's page-derived content is observable anywhere except
inside the opaque evidence blob, if a `bridge`-opted-in fixture's non-loopback request silently
succeeds without appearing in `network.jsonl`, or if a `none`-network fixture's non-loopback request
succeeds at all — T-INJECTION-AXTREE, T-INJECTION-CONSOLE, T-EGRESS-LOOPBACK-ONLY. One real
(or CI-scratch) `minion-hub` run with `browserVerifyRequired: true` produces a complete evidence set
bound to its real `candidate_sha`, visible on the draft PR's `/out/browser/` artifacts.

### Slice 5 — minion-meta activation (minion-meta, 2-4h)

**Topics:** `infra`, `docs`, `ui`

**Goal:** flip the switch only once the factory side is live, matching the two-repo rollout discipline
the topic-capability-manifest spec already established for its own classifier versioning.

**Files:**

- `specs/topics.json`

Add `'browser-verify'` to the `ui` topic's `requiredEvidence` array (and, if the operator confirms
`ux`-tagged work also targets rendered UI, to `ux` as well — default to `ui` only if uncertain, since
`ux` today carries no evidence requirement at all and widening it is a reversible follow-up, not a
blocking decision for this slice). This slice **must not** be merged/deployed before Slice 1-4 are
live on `minion-factory/main` and the pilot run in Slice 4 has produced real evidence — deploying it
early makes every `ui`-effective-topic run queue-time-refuse the moment `resolveManifest()` sees an
evidence name the deployed runner doesn't yet support that it's now required to satisfy for a repo
with no preview registration.

**Definition of done (machine-checkable):**

```bash
node scripts/spec-index.mjs && node scripts/proposal-index.mjs
```

Exit 0. A scratch spec fixture tagged `[ui]` still validates. `git diff specs/topics.json` shows only
the additive `requiredEvidence` entries — no other topic's fields change.

## 7. Cross-repo impact assessment

| Change | Repos touched | Mitigation |
|---|---|---|
| `SUPPORTED_EVIDENCE` gains `browser-verify` | minion-factory only | Additive to a closed set; `specs/topics.json` cannot reference it until Slice 5, and Slice 5 is explicitly ordered last |
| New `WorkerPhase` + `PhasePolicy` | minion-factory only | Deny-by-default, only enters `DEV_PHASE_SEQUENCE` when `nextPhase()` is called with `browserVerifyRequired: true`; every existing call site keeps the default `false` until Slice 3 wires the manifest read |
| `RepoDef` schema growth | minion-factory only, `repos.ts` callers | All new fields optional and all-or-nothing validated; the five non-pilot repos are unaffected until an operator registers them |
| New pinned image + entrypoint | minion-factory only | Independent Dockerfile, pinned from its first commit — does not depend on or block the worker-containment spec's still-open Slice 4 remediation of the two pre-existing images |
| `automerge.ts` new predicate branch | minion-factory only, behavior-visible only to a run whose manifest requires `browser-verify` evidence (none, until Slice 5) | `FACTORY_AUTOMERGE` remains `0` through the roadmap regardless; this predicate only matters once that kill switch is lifted |
| `specs/topics.json` `ui`/`ux` change | minion-meta, fleet-wide (every future `ui`-effective-topic run on any repo) | Deliberately the **last** slice, gated on live factory deployment (§6 Slice 5); any repo without a preview registration at that point fails closed at queue time rather than merging without evidence |
| Deployment | minion-factory `deploy.sh`/`.env` | Any new required env (pinned browser image digest reference) must be emitted by `deploy.sh` per the hard memory constraint in AS-IS — never hand-added on the host |

**Alert (unavoidable, flagged not mitigated):** the `bridge` network opt-in (TO-BE invariant 4,
Design decision 3) intentionally has no allowlist mechanism — a repo that opts a preview into
`bridge` because its flows need a real third-party origin gets full outbound network access from
Chrome, identical in shape to today's `selfTestNetwork: 'bridge'` opt-ins. This spec does not build a
dynamic per-run egress allowlist for that case; if a future repo needs both a real external
dependency and hard destination allowlisting, that is a new proposal, not silent scope creep here.
Operators should treat a `browserVerifyNetwork: 'bridge'` registration as requiring the same review
scrutiny `selfTestNetwork: 'bridge'` already gets.

## 8. Out of scope

- General egress allowlisting/proxying for the `bridge` opt-in path — see the alert above.
- Any use of an LLM/harness to drive `chrome-devtools-mcp` interactively; this spec's flows are
  deterministic scripts only, per Design decision 1.
- Migrating `agent/Dockerfile`/`runner/Dockerfile`'s existing tag-only `FROM` lines or shipping
  `scripts/verify-image-pins.sh` for those two images — that remains the worker-containment spec's
  open Slice 4.
- Flipping `FACTORY_CONTAINMENT_V2` to `1` in production, or any other containment-v2 canary/rollout
  work — that remains the worker-containment spec's open Slice 5. This spec's new phase joins the same
  kernel regardless of that flag's state, exactly as every other `WorkerPhase` already does.
- Configuring `previewCommand`/`browserPlaybook` for `minion-site`, `minion-base`, or any repo beyond
  the `minion-hub` pilot — a follow-up per-repo rollout, not a blocking part of this DoD.
- Custom per-repo `axe-core` rule configuration (`axeTags`-style overrides) — ship the fixed default
  ruleset first.
- The `minion_hub` Projects⇄GitHub live-preview gateway plugin (AS-IS #12) — unrelated subsystem, not
  touched.
- Any change to `review`'s existing model-driven posture, credential set, or evidence format.
- Widening `ux`'s `requiredEvidence` — deferred to operator judgment in Slice 5, not decided here.

## 9. End-to-end verification

1. On a clean `minion-factory` checkout: `cd runner && npm test && npm run typecheck` all green;
   `bash -n agent/*.sh`; `docker build --pull -f agent/Dockerfile.browser-verify .` succeeds and
   `scripts/verify-image-pins.sh` (or its scoped equivalent from Slice 2) passes.
2. Register `minion-hub` with a real `previewCommand`/`previewPort`/`browserPlaybook`. Queue a dev run
   against a low-stakes `minion-hub` spec with `browserVerifyRequired` resolvable to `true` (via a
   test-only manifest override, since `specs/topics.json` itself is not yet updated at this point).
   Confirm the draft PR's phase sequence is
   `prepare-workspace → setup → develop → reconcile-base → self-test → browser-verify → prepare-review
   → review`, and that `/out` under the `browser-verify` attempt contains the full evidence set bound
   to the run's `candidate_sha`.
3. Repeat with a `RepoDef` lacking a preview registration and a manifest requiring `browser-verify`
   evidence — queueing refuses with a named reason, no phase attempt row is created.
4. Run the adversarial fixture suite (Slice 4) and confirm every page-derived-content and egress
   boundary case behaves as specified — no observable leak of AX-tree/console text into any
   accept/reject decision, no non-loopback request succeeding under the default network policy.
5. Only after 1-4 pass against the real deployed runner: land the `specs/topics.json` change (Slice
   5), open a scratch minion-meta PR with a `[ui]`-tagged fixture spec, and confirm
   `node scripts/spec-index.mjs` still exits 0. Queue one more `minion-hub` run through the now-live
   `specs/topics.json` (no manifest override needed this time) and confirm the same evidence set
   appears through the unmodified, production manifest-resolution path.
6. Confirm `FACTORY_AUTOMERGE=0` still fully disables the sweep (kill switch untouched, unaffected by
   this spec) and that a non-`ui` repo's existing dev-run behavior is unchanged throughout.

This spec is complete only when those checks pass without weakening the worker-containment kernel's
existing deny-by-default guarantees, the topic-capability-manifest's fail-closed unknown-value
posture, provider independence, or the human merge gate — consistent with
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` (controller owns truth; prompts are not a
security boundary; automerge stays off through M7) and `/memory/MINION/factory`'s
`minion-factory-agent-pipeline.md` (reviewers propose while the applier re-verifies; `deploy.sh`
rewrites `.env` wholesale).
