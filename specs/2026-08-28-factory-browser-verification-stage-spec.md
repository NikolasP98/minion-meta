---
id: 2026-08-28-factory-browser-verification-stage-spec
title: Credential-free, loopback-isolated browser-verification stage for UI-topic factory runs
stage: spec
status: review
pass: 6
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
| [[2026-08-18-factory-worker-containment-spec]] | **Prerequisite, S1-S4 shipped; only S5 open (re-verified 2026-08-29).** S1-S3 shipped the phase-policy kernel (`runner/src/containers.ts`), `factory-*.sh` entrypoints, credential-free setup/self-test, and the `phase_attempts`/`phase_effects` evidence tables. **S4 shipped** through minion-factory PR #145 (+ #146, #148, #149, #150): both `agent/Dockerfile` and `runner/Dockerfile` are now digest-pinned via a manifest-digest `ARG`, and `scripts/verify-image-pins.sh`, `scripts/verify-image-provenance.sh`, and `scripts/publish-images.sh` exist on `main`. **S5 (adversarial E2E + supervised canary activation) is open as factory PR #161**, and production still reports `FACTORY_CONTAINMENT_V2=0`. This spec builds a **new** `browser-verify` `WorkerPhase` inside the same deny-by-default kernel and pins its own image to the bar S4 already set. S1-S8 may land independently; S9 is blocked until containment-v2 is verified active in production (Target invariant 4). |
| [[2026-08-18-factory-topic-capability-manifest-spec]] | **Prerequisite, shipped (S1-S5; S6 operator-doc open per its board audit).** Its Design decision 3 reserved exactly this extension point: "`requiredStages`/`requiredEvidence` are enforced constraints... so [[browser-verification-stage]] can later add a `browser-verify` entry... without changing the manifest schema." This spec is that entry. It also names this proposal in its own §9 out-of-scope ("The actual browser-verification stage and its evidence artifacts"). |

The proposal's own 2026-08-28 board-audit note ("BOTH declared blockers cleared... topics.ts:37
`SUPPORTED_STAGES`, topics.test.ts asserts `/unsupported stage "browser-verify"/`") correctly
identifies the landed extension mechanism, but the live baseline still has
`FACTORY_CONTAINMENT_V2` disabled in production. This spec therefore treats the code prerequisite as
available and the production activation as an explicit S9 gate. §5 Design decision 1 explains why
`browser-verify` joins `SUPPORTED_EVIDENCE`, while the stage-rejection regression remains.

## 1. Owner surface

**minion-factory** (`NikolasP98/minion-factory`, private, default branch `main`) — new
`agent/factory-browser-verify.sh`, `agent/factory-browser-verify-preview.sh`,
`agent/Dockerfile.browser-verify` (new image, not the existing `agent/Dockerfile`),
`agent/seccomp/browser-verify.json` (new committed seccomp profile),
`agent/lib/browser-verify-flows.mjs`, browser-image package/lock files,
`runner/src/browser-verify.ts` (+ `.test.ts`, `.e2e.test.ts`, `.recovery.e2e.test.ts`),
edits to `runner/src/topics.ts` (+ tests),
`runner/src/containers.ts` (+ tests), `runner/src/repos.ts` (+ tests), `runner/src/manifest.ts`
(+ tests), `runner/src/queue.ts` (+ tests), `runner/src/automerge.ts` (+ tests),
`repos.example.json`, `runner/Dockerfile` (bakes the seccomp profile the Docker client must read),
`docker-compose.yml`, `.env.example`, `deploy.sh`,
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
16. **The launch renderer has no per-phase kernel-surface hook, and its fixed posture disables
    Chromium's own sandbox.** `buildLaunchPlan()`'s argv renderer (`runner/src/containers.ts:900-913`)
    hard-codes `capDrop = ['ALL']` and `securityOpt = ['no-new-privileges']` for every phase; nothing
    in `PHASE_POLICIES` can add a `--security-opt seccomp=…` profile or a capability, and no seccomp
    profile file exists in the repository. Chromium's Linux sandbox is layered: a namespace (or
    setuid-helper) layer plus a seccomp-BPF layer. `no-new-privileges` neutralizes the setuid helper,
    and Docker's default seccomp profile is the documented reason Playwright ships a dedicated
    seccomp profile for running untrusted pages in containers ([Playwright Docker
    guide](https://playwright.dev/docs/docker)). Playwright's own launcher additionally appends
    `--no-sandbox` whenever `chromiumSandbox !== true`, and the option's documented default is
    `false`. **Consequence:** a browser phase written against the current renderer and Playwright
    defaults produces a green run with Chromium's renderer sandbox off, which is the only remaining
    boundary between candidate-rendered JavaScript and the verifier container's own UID, profile
    snapshot and `/out`. Neither the exact profile contents nor the precise syscall set is asserted
    here — Slice 3 must determine and pin them empirically (§5 Design decision 10).
17. **Durable launch identity, live tracking, and crash recovery each model exactly one container per
    attempt, and none of them model a network.** `containmentPolicy()` (`runner/src/queue.ts:713-734`)
    parses a single `{containerName, image}` and rejects anything whose `containerName` is not exactly
    `factory-${phase}-${runId}-${attempt}`; the in-process `active` map holds one `containerName`
    (`queue.ts:178`); and boot recovery (`queue.ts:4001-4004`, `queue.ts:4048-4080`) reaches safety
    only through `stopAndCrashContainmentAttempts()` (`queue.ts:3915-3951`), which kills that one name
    per running attempt row, proves it stopped, then seals unsealed rows as `crashed`. It never
    enumerates a second role and never removes a Docker network. **Consequence:** a phase that owns two
    containers plus a per-attempt network cannot be represented, killed, or reconciled by any of these
    three seams as they stand. A runner restart between network creation and second-role launch, or
    while both roles are live, would leave an unkillable orphan container and a leaked network while
    `stopAndCrashContainmentAttempts()` still returns `true`. Runner restart is a normal factory
    lifecycle event (operator memory: "★★★runner ADOPTS containers on restart"), not an exotic fault.
18. **A group lifecycle primitive already exists one layer up and is the pattern to generalize.** The
    orchestrator instance path already runs a labeled multi-container group on a per-instance
    `--internal` network: `codex-broker-policy.ts:145,185-187` names `factory-instance-<id>` and emits
    `createInternalNetworkArgs`, while `orchestrator-runtime.ts:131-145` (`ensureInstanceNetwork()`)
    creates-or-adopts that network idempotently, asserts `Driver === 'bridge' && Internal === true`,
    asserts the `factory.minion-ai/instance` + `factory.minion-ai/role` labels
    (`orchestrator-runtime.ts:40-41,120-129`), and refuses stale attachments; teardown
    (`orchestrator-runtime.ts:270-296`) removes every named role container, disconnects the runner,
    re-inspects, and only then runs `network rm` with a confirmation read. This spec's phase group must
    reuse that discipline rather than invent a second one — the delta is that the group identity has to
    become durable *phase-attempt* state, which the instance path does not need.
19. **A plain `--internal` bridge does not isolate either role from the Docker host.** Docker's own
    docs state that an internal bridge is normally assigned a host-side gateway address: processes on
    the host can reach containers on it, and containers can reach host services bound to that address;
    the `gateway_mode=isolated` bridge option (Docker Engine 28+) is what removes the host route
    ([Docker gateway modes](https://docs.docker.com/engine/network/port-publishing/#gateway-modes),
    [Docker Engine 28 release notes](https://docs.docker.com/engine/release-notes/28/)). No minimum
    Docker Engine version is pinned anywhere in `minion-factory` today, and the existing
    `createInternalNetworkArgs`/`ensureInstanceNetwork()` precedent (item 18) only asserts
    `Driver === 'bridge' && Internal === true` — it never requests or asserts a gateway mode. A pass-3
    fix closed the wildcard-bind/general-egress defect but left this one open: `--internal` alone
    leaves the Docker host reachable from both roles and leaves both roles reachable from the host,
    contradicting Target invariant 5's "only reachable destination is preview" claim.
20. **No controller-owned bare Git mirror exists anywhere in `minion-factory` today, and Git's
    replace-object mechanism can make an archive of a trusted SHA emit different bytes than that SHA's
    own tree.** A repository-wide search finds no bare mirror, mirror-creation path, or immutable
    object-store precedent; `agent/factory-prepare-workspace.sh:45-58` clones directly into the durable
    `${root}/workspace` — the same checkout `develop` mounts read-write with model/persistent-auth
    surfaces attached (`containers.ts:362-407`, item 15) — which is the only local Git object store the
    runner has today. A focused fixture proved the risk of treating that checkout as an archive source:
    after creating trusted commit A and attacker commit B, `git replace A B` made `git archive A` emit
    B's file and made `git rev-parse A^{tree}` return B's tree; only
    `GIT_NO_REPLACE_OBJECTS=1 git rev-parse A^{tree}` returned A's real tree. Archiving `candidate_sha`
    out of this checkout — even by SHA, even from the runner process — cannot by itself prove the
    exported bytes were not substituted by a develop-writable replacement ref, config, or alternate ref.
21. **No slice, table, or contract owns producing runnable dependencies for the preview role.**
    `minion-hub`'s registered `setup` is `bun install` (`runner/src/repos.ts:144-157`) run against the
    durable `${root}/workspace` with a generic writable `/cache` and no cache-location contract
    (`runner/src/queue.ts:1080-1088`); `git archive` excludes `node_modules` by construction (Git
    tracks no untracked path), and the `browser-internal` network (invariant 5) gives the preview
    container no registry egress of its own. Nothing in D1-D10 or Slices 1-9 declares a
    post-materialization dependency-install role, its network/credential posture, an artifact format,
    or a mount into the preview container — a hub pilot run with an unchanged manifest still has no
    declared way to receive installed packages.

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
   scheme and port on the fixed per-attempt network alias `preview` (`http://preview:<1024-65535>`, no
   credentials/query/fragment/path beyond `/`) — invariant 5 explains why the host is a per-attempt network
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
     browser container only on its declared port over the per-attempt internal network (invariant 5), and
     its process group is always killed and reaped at phase exit regardless of its own exit status.
   - **Browser (verifier) container**: the pinned `FACTORY_BROWSER_VERIFY_IMAGE`, under a distinct uid.
     It exclusively owns `/out` (rw) and a read-only snapshot of the browser profile; it never mounts
     candidate source of any kind. Chrome's DevTools Protocol binds to this container's own loopback
     only and is never exposed on the per-attempt network, so the preview container cannot reach it.
     Inside this container Chromium runs with its own renderer sandbox enabled and proved
     (invariant 11) — the container boundary protects the host, the Chromium sandbox protects the
     verifier process, profile snapshot and `/out` from candidate-rendered content.
   Only the browser container's exit code and its `/out/phase-result.json` seal the attempt — the
   preview container cannot author, replace, or race that evidence because it has no path to `/out` at
   all.
4. **Containment-v2 is an activation prerequisite.** The legacy worker cannot schedule this phase.
   A manifest requiring `browser-verify` refuses to queue or advance unless
   `FACTORY_CONTAINMENT_V2=1`, the phase is in `CONTAINMENT_IMPLEMENTED_PHASES`, the dedicated image
   resolves, and the repo registration/profile is valid. Factory-side implementation may land
   before the worker-containment spec's production canary, but minion-meta activation may not.
5. **Per-attempt internal network, host-isolated by construction; no unrestricted-egress mode and no
   host port exists.** The preview and browser containers share a Docker network created per attempt
   with `--internal` **and** `--opt com.docker.network.bridge.gateway_mode_ipv4=isolated`, with IPv6
   disabled on the network (`--ipv6=false`, so there is no unisolated IPv6 gateway path either), named
   `factory-browser-<runId>-<attempt>` and carrying the existing
   `factory.minion-ai/role=browser-verify-network` label. Before this phase can be scheduled at all,
   the runner preflights the connected Docker Engine's reported version and refuses to run — a
   distinct fail-closed infrastructure reason, never a phase failure — on any engine that does not
   support `gateway_mode_ipv4=isolated` (AS-IS item 19); a plain `--internal` bridge without that
   option is not an acceptable fallback. The network is created, adopted, and asserted against the
   **exact** options it was created with — `Driver === 'bridge' && Internal === true &&
   Options['com.docker.network.bridge.gateway_mode_ipv4'] === 'isolated' && EnableIPv6 === false`,
   labels match, no stale attachments — since asserting `Internal === true` alone does not prove host
   isolation (AS-IS item 19). Teardown reuses the same idempotent discipline `ensureInstanceNetwork()`/
   instance teardown already use (AS-IS item 18), and the network's identity, including its recorded
   creation options, is durable attempt state (invariant 12) — not in-process state. Only the two
   containers for this attempt are ever attached to it. `NETWORK_MODES` gains exactly one new closed
   value, `browser-internal`, used only by this phase's two roles; there is no `bridge` or other
   general-outbound mode for `browser-verify`, and a repo registration cannot opt into one.
   **Neither role's container spec may publish a host port** (`-p`/`--publish`/`--publish-all` are
   absent from the rendered argv and rejected by the plan validator), so the preview origin is
   reachable only from inside this one network. This satisfies the proposal's egress-allowlisting
   requirement by construction, and the isolated gateway mode additionally removes the Docker-host
   route a plain internal bridge would otherwise leave open in both directions: the only destination
   reachable from the browser container is the preview container, the preview container has no
   external destination to reach at all, the Docker host cannot reach either container's declared
   port, and neither container can reach a host-bound service through the bridge gateway address.
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
   snapshotted `browserProfileHash`, the inspected immutable browser image identity, and the exact
   dependency artifact's independently computed `artifactContentSha256` and byte size. The artifact
   content digest is recomputed over the final no-follow regular file after dependency preparation is
   proved stopped and again immediately before its read-only preview mount; the input-derived key is
   only a cache key and can never substitute for attesting the bytes actually executed.
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
10. **Clean, tracked-only candidate materialization, drawn from an independently-fetched,
    worker-inaccessible object store, performed by the runner before launch.** The runner does not
    treat the develop-writable `${root}/workspace` checkout as a trustworthy archive source (AS-IS item
    20 shows why: a replacement ref, alternate object directory, or replace-shaped config reachable
    from `develop` can make `git archive`/`git rev-parse` disagree with `candidate_sha`'s real tree).
    Instead, before either container is created, the runner:
    a. independently fetches `candidate_sha` from the controller's own remote authority (the same
       GitHub remote and read-only credential the controller already uses to learn the pushed SHA —
       never a path under `develop`'s checkout) into a **fresh, per-attempt bare object store** that no
       container ever mounts and no worker process can write to
       (`${root}/browser-mirror-${attempt}.git`, created and destroyed by the runner alone — the
       controller-owned sibling of the existing `${root}/selftest-${attempt}` special case in
       `canonicalMountSource()`);
    b. runs every Git operation against that store with `GIT_NO_REPLACE_OBJECTS=1`, so a
       `refs/replace` entry, alternate object directory, or replace-shaped config planted anywhere else
       can never be consulted;
    c. verifies the fetched commit's raw object id equals `candidate_sha` and that
       `candidate_sha^{tree}` (replacement processing disabled) matches the tree the controller's own
       remote authority reports for that SHA — the store is trusted because it was independently
       fetched and never touched by `develop`, not merely because its bytes match a hash drawn from the
       same source;
    d. archives exactly `candidate_sha`'s tree out of that verified store (`git archive`) into a fresh,
       empty, root-created per-attempt directory `${root}/browser-preview-${attempt}`, and re-verifies
       the extracted tree hashes to `candidate_sha`'s tree;
    e. closes and deletes the per-attempt bare store immediately after the archive succeeds, before the
       dependency-prep (invariant 13), preview, or browser role is created — the verified source exists
       only for the duration of steps (a)-(d) and is never available to any container.
    It is **never** a recursive copy of the develop workspace followed by `git reset --hard` (AS-IS item
    15 proves that path leaves untracked/ignored residue) and **never** an archive taken directly
    against the develop-writable checkout (AS-IS item 20 proves that path is replace-ref bypassable).
    **The untrusted containers never receive a Git object store, a mirror mount, a remote, or an
    archive transport**: the preview role's container spec contains no path under any mirror, the
    extracted tree contains no `.git` directory, and no role runs `git` against any object store after
    launch. The mount therefore contains exactly the tracked files at `candidate_sha` — no other ref,
    no history, no credential, secret, or residue written into an ignored or untracked path during
    `develop`. Runtime dependencies come from the separately sealed, credential-free, read-only
    dependency artifact invariant 13 defines, mounted read-only into the preview role — never from
    copying develop's `node_modules` or install state.
    **Regression proof:** a fixture plants a `refs/replace` entry, a malicious `.git/config` (an
    inserted replace-ref/alternates entry), and an unrelated ref carrying different content, all inside
    the develop workspace, immediately before the phase runs; none may reach the exported bytes, the
    reported tree hash, or any browser artifact (T-NO-REPLACE-REF-BYPASS).
11. **Chromium's own sandbox is enabled, minimally provisioned, and proved at runtime.** The browser
    entrypoint launches Playwright with `chromiumSandbox: true`; `--no-sandbox` and
    `--disable-setuid-sandbox` never appear in the launch options, the profile's allowed argument set,
    or the rendered container command. The browser role's phase policy carries the committed seccomp
    profile and the exact minimum kernel surface Chromium's namespace sandbox needs on the pinned base
    image (determined empirically in Slice 3, §5 Design decision 10) while keeping `--cap-drop ALL`
    and `--security-opt no-new-privileges`; the preview role's posture is unchanged from `self-test`
    and gains nothing. Before running any flow the entrypoint reads Chromium's own reported sandbox
    status and **exits nonzero as an infrastructure failure — never a `{status:'failed'}` verdict —
    if any expected layer is absent**. A missing or unreadable status report is itself a fail-closed
    infrastructure failure, so a future Chrome build that stops exposing it cannot silently downgrade
    the boundary.
12. **One attempt is one durably identified, group-recoverable authority unit.** Before creating the
    first per-attempt path, fetching candidate objects, creating the network, or launching any role,
    the runner persists the complete resource manifest into the attempt's durable launch policy:
    `{network, roles: {dependencyPrep, preview, browser}, paths: {mirror, previewTree, dependencyTree,
    dependencyArtifact, out}}`, with every container/path name deterministic in
    `(phase, runId, attempt, role)`, every image an immutable named digest, and every path constrained
    to a no-follow child of the attempt root. `containmentPolicy()` accepts both the legacy single-role
    shape (unchanged for all eight existing phases) and this group shape, and rejects any deviation as
    malformed durable launch identity. Launch, timeout, cancellation, and boot recovery are **group**
    operations: `stopAndCrashContainmentAttempts()` kills every persisted role (including dependency
    preparation), proves each stopped, removes the persisted network idempotently with the same
    inspect-assert-confirm discipline as AS-IS item 18, and no-follow removes every persisted path
    before sealing or retrying. It returns `false` (blocking dispatch) if it cannot prove any role
    stopped, network absent, or path removed. Recovery is correct at every failpoint — during fetch,
    after each path creation, during dependency preparation, before/after packing, after network
    create, after either serving role launch, between browser exit and seal, and during teardown —
    leaving no orphan container, leaked network/path, duplicate launch, or second writer to sealed
    evidence.
13. **The dependency artifact is produced by a controller-scheduled, credential-free install role —
    never by copying develop's `node_modules`.** After invariant 10 produces the tracked-only export
    and before the preview container is created, the runner launches a disposable **dependency-prep**
    role: the repo's already-registered `setup` command runs once, against a private copy of that same
    export, under the repo's already-registered `setupNetwork` egress (AS-IS item 6/21) — the closed,
    per-repo opt-in network already used to install `develop`'s dependencies, default `none` — with the
    same disposable-role posture as `self-test` (`github: null`, `model: forbidden`, `uid 1100`,
    read-only rootfs, no `/out`, no browser-profile mount, no candidate execution beyond the registered
    command). No new registry allowlist, proxy, or credential surface is introduced. On success the
    runner deterministically packs the resulting dependency directory into a single immutable,
    read-only artifact file. A SHA-256 over `{candidate_sha, lockfile bytes, setup command, toolchain
    image digest}` is its cache key; a separate `artifactContentSha256` is computed over the packed
    file's actual bytes, alongside its byte size, after the role is proved stopped. The runner stores
    it under a controller-owned per-attempt leaf and mounts only that one file read-only into
    the preview container; the preview entrypoint unpacks it locally and opens no network of its own
    (invariant 10's "separately sealed... dependency artifact" is this producer). The dependency-prep
    role and its private copy of the export are deleted before the preview or browser role is created.
    A missing, oversized (over a fixed byte ceiling), non-regular, cache-key-mismatched, or
    content-digest-mismatched artifact fails the phase closed rather than falling back to develop's
    dependency state. The runner recomputes the content digest immediately before the mount and binds
    the digest and size into `phase-result.json` and `phase_attempts.evidence`; altered output bytes
    under identical input metadata are therefore distinguishable and rejected.

## 4. DELTA

- **D1** Add the evidence name and all-or-nothing repo/profile schema (S1;
  T-EVIDENCE-SUPPORTED, T-REPO-SCHEMA).
- **D2** Add the two-container phase policy (preview + browser roles, disjoint mounts/UIDs, no
  published host ports), generic phase-artifact variant, conditional scheduler kept outside
  `DEV_PHASE_SEQUENCE`, phase-specific image selection per role, and the host-isolated network's
  minimum-Engine-version preflight (S2; T-PHASE-POLICY-BROWSER, T-CONTAINER-SPLIT,
  T-SEQUENCE-CONDITIONAL, T-IMAGE-SELECTION, T-NO-PUBLISHED-PORTS, T-ENGINE-GATEWAY-MODE-PREFLIGHT).
- **D3** Build and publish an immutable browser image from pinned inputs, including exact Chrome for
  Testing archive version+checksum and exact Playwright, axe-core, chrome-devtools-mcp, Bun, pnpm,
  npm, and Node/base-image identities (S3; T-IMAGE-PINS-BROWSER, T-DIGEST-DEPLOY).
- **D4** Implement controller-side tracked-only candidate materialization from an independently-fetched
  bare object store with replacement-object processing disabled, deterministic profile execution under
  an enabled Chromium sandbox, per-attempt host-isolated-network reachability enforcement, capture,
  cleanup, and both evidence layers (S4; T-PROFILE-CONTRACT, T-CLEAN-MATERIALIZATION,
  T-NO-REPLACE-REF-BYPASS, T-EVIDENCE-FILESET, T-INTERNAL-NETWORK-ONLY, T-HOST-ISOLATED-NETWORK,
  T-SANDBOX-ENFORCED).
- **D5** Snapshot/hash profiles and securely validate/bind the fixed evidence set (S5;
  T-PROFILE-SNAPSHOT, T-EVIDENCE-VALIDATE, T-EVIDENCE-BINDING).
- **D6** Enforce queue/advance readiness and an explicit automerge predicate (S6;
  T-MISSING-PROFILE-FAILCLOSED, T-V2-FAILCLOSED, T-READINESS-FAILCLOSED,
  T-AUTOMERGE-PREDICATE).
- **D7** Register and prove the `minion-hub` pilot, including adversarial content,
  container-isolation, mirror/history-unreachability, dependency-artifact-leak, the
  `CONTAINMENT_IMPLEMENTED_PHASES` transition, and sandbox-status cases (S7; T-INJECTION-AXTREE,
  T-INJECTION-CONSOLE, T-EGRESS-INTERNAL-NETWORK-ONLY, T-CONTAINER-ISOLATION,
  T-CLEAN-MATERIALIZATION-E2E, T-NO-MIRROR-REACHABILITY, T-NO-DEVELOP-DEPENDENCY-LEAK-E2E,
  T-IMPLEMENTED-PHASES-TRANSITION, T-SANDBOX-STATUS-E2E, T-PILOT-E2E).
- **D8** Add `browser-verify` to the canonical `ui` topic only after the production prerequisites and
  refusal canaries pass (S9; T-ROLLOUT-ORDER, T-META-ACTIVATION).
- **D9** Add the per-phase kernel-surface hook the launch renderer lacks (a closed, policy-owned
  `securityOpt`/seccomp field), commit and pin the browser seccomp profile, and forbid sandbox-
  disabling flags anywhere in the launch path (S2 for the policy hook, S3 for the pinned profile;
  T-SECURITY-OPT-POLICY, T-NO-SANDBOX-FLAGS, T-SECCOMP-PINNED).
- **D10** Make the durable launch identity, live tracking, cancellation, and boot recovery
  group-aware (roles + network) while leaving the eight legacy single-container phases byte-identical,
  and prove it against a real restarted controller (S2 unit + S8 integration;
  T-GROUP-LAUNCH-IDENTITY, T-LEGACY-POLICY-COMPAT, T-GROUP-TEARDOWN-IDEMPOTENT, T-GROUP-RECOVERY-UNIT,
  T-GROUP-RECOVERY-FAILPOINTS, T-GROUP-CANCEL).
- **D11** Add the dependency-artifact producer as a persisted member of the attempt resource manifest
  (disposable `setup`-network install role plus every prelaunch path), deterministically pack an
  immutable artifact, bind its independently computed content digest/size into trusted evidence, and
  mount it read-only into preview with size/cache-key/content-digest fail-closed checks (S2/S4/S5/S8;
  T-DEPENDENCY-ARTIFACT-PRODUCER, T-DEPENDENCY-ARTIFACT-BINDING, T-NO-DEVELOP-DEPENDENCY-LEAK).

## 5. Design decisions

1. **Use `requiredEvidence`.** Existing `requiredStages` entries require `{harness, model}` and are
   the wrong contract for a model-forbidden deterministic worker. The existing test that rejects
   `requiredStages: ['browser-verify']` remains; a new test accepts it only as evidence.
2. **Split preview and browser into two isolated containers within one phase.** A single shared
   container/UID would let candidate-controlled preview code author or replace the verifier's own
   output — file-shape and hash checks alone prove bytes, not authorship, and cannot detect a
   same-namespace tamper (pass-2 review finding H1). The phase still seals exactly one `phase_attempts` row
   and one exit code — the browser container's — but preview and browser run as separate OS
   principals with disjoint mounts, so authority over `/out` and the profile never touches the
   untrusted preview process. A server surviving into another phase remains impossible: both
   containers are torn down at phase exit.
3. **Use an executable profile, not a prose playbook.** A Markdown list of flows has no deterministic
   parser or assertion semantics. A runner-owned `.mjs` module is reviewable code, can express real
   Playwright actions/assertions, and is safe from candidate mutation through a per-run read-only
   snapshot.
4. **Use a per-attempt `--internal` Docker network with an isolated gateway mode, not `bridge` and not
   a plain internal bridge.** Splitting preview and browser into separate containers (decision 2)
   removes the shared network namespace the pre-fix design relied on for "loopback isolation," and
   `bridge` mode's general outbound access directly contradicts the proposal's egress-allowlisting
   requirement (pass-2 review finding H2). A freshly created `--internal` network scoped to exactly the
   two containers for this attempt has no route to any external destination by construction — stronger
   than allowlisting, since there is nothing to allowlist against. However, Docker documents a plain
   internal bridge as still carrying a host-side gateway address by default, so the Docker host can
   reach the containers and the containers can reach host-bound services unless the network is
   additionally created with `gateway_mode_ipv4=isolated` (Docker Engine 28+) and IPv6 disabled
   (pass-4 review finding H1). This spec therefore makes the isolated gateway mode, a pinned minimum
   Engine version (enforced by a fail-closed preflight), and an exact-options network inspection (not
   merely `Internal: true`) part of the network's durable identity and its recovery/teardown
   discipline — the Docker-host boundary is proved the same way the external-egress boundary is: by
   inspecting the object Docker actually created, not by the flag that was passed to create it. No
   proxy is necessary, and there is no configurable escape hatch left to document as residual risk.
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
   the moment it lands, or a false readiness signal if added early (pass-2 review finding M2). Instead
   `nextPhase()` gains a `conditionalPhases: WorkerPhase[]` parameter defaulting to `[]`
   (byte-compatible at the two option-less call sites in `preSetupReconciliation()` and
   `reconcileBaseWithBoundedResolution()`); only `advanceContainmentRun()`'s pump may pass
   `['browser-verify']`, and only when the run's current persisted manifest requires the evidence. A
   separate `browserVerifyReadiness()` predicate — never OR'd into `containmentReadiness()` — governs
   whether the elected phase may actually execute: it requires `FACTORY_CONTAINMENT_V2=1`,
   `browser-verify` present in `CONTAINMENT_IMPLEMENTED_PHASES` (added only in Slice 7, once the
   entrypoint, image, and evidence ingestion all exist — "implemented" admits the scratch/canary runs
   S7 and S8 need, while fleet activation stays behind S9), a resolved named-digest browser image, and a
   valid repo registration. An S2-only deployment (predicate and conditional election present, phase
   still absent from `CONTAINMENT_IMPLEMENTED_PHASES`) must leave every non-browser run's sequence and
   global readiness byte-identical to pre-slice behavior, and must make any run whose manifest
   requires `browser-verify` fail closed with a distinct "browser-verify not yet implemented"
   readiness reason rather than hanging the pump or reporting a false pass.
10. **Treat Chromium's renderer sandbox as a required boundary, not a container-level detail.** The
    container split (decision 2) removes candidate *process* authority over `/out` and the profile,
    but the browser container still executes candidate-authored HTML/CSS/JavaScript. Inside that
    container the only thing standing between a renderer compromise and the verifier's own UID,
    profile snapshot, and `/out` is Chromium's sandbox — and both defaults are unsafe: Playwright
    appends `--no-sandbox` unless `chromiumSandbox: true`, and the factory's launch renderer has no
    way to supply the seccomp profile that discipline needs (AS-IS item 16). This spec therefore adds
    the missing per-phase hook rather than accepting a green-but-unsandboxed run.
    *Empirical, not assumed:* Slice 3 must determine the minimum working configuration on the pinned
    base image by experiment — start from Docker's default seccomp profile plus the namespace-clone
    syscalls Playwright's published Docker profile permits, add nothing that is not required, and
    record the resulting profile digest in `/etc/factory-browser-toolchain.json`.
    *Where the profile lives matters:* `--security-opt seccomp=<path>` is resolved by the **Docker
    client**, which reads the file and sends its contents to the daemon — so the path must exist in
    the **runner** image (which is what invokes `docker` via `execFile`/`spawn`), not only in the
    browser image. Slice 3 therefore bakes the committed profile into `runner/Dockerfile` at a fixed
    absolute path and records its digest in the browser image's toolchain manifest too, so a
    runner/browser mismatch is detectable rather than silent. Adding
    `--cap-add SYS_ADMIN` is **not** acceptable: it re-grants the capability set `--cap-drop ALL`
    exists to remove. If no configuration reaches a fully enabled sandbox under `--cap-drop ALL` +
    `no-new-privileges` on that base image, the correct outcome is to **stop and re-spec** the browser
    role's isolation (for example a dedicated VM-isolated runtime), not to ship `--no-sandbox`;
    the S3 DoD records that finding either way.
    *Proved at runtime, not at build time:* the entrypoint reads Chromium's reported sandbox status
    (`chrome://sandbox` under the production launch flags, with a `--enable-logging`-derived fallback
    if that page is unavailable to an automated context — S3 determines which mechanism works and pins
    it) and exits nonzero if any layer is missing. `chrome --version` proves the binary is present and
    nothing about the boundary.
11. **Make every phase resource durable state, and reuse the shipped group-lifecycle discipline.** A
    phase that owns three containers, a network, and prelaunch host paths cannot be represented by the
    shipped single-container
    durable launch identity, active-run entry, or crash recovery (AS-IS item 17); a runner restart
    mid-launch would leave orphans while recovery still reported success. Rather than tracking the
    group in memory or deriving names at recovery time, the complete resource manifest is written to
    `phase_attempts.policy` **before** the first Docker object exists, so recovery reads the same truth
    the launcher wrote (operator memory ★★★: the controller owns truth). `containmentPolicy()` grows a
    second accepted shape instead of a looser one, so the eight legacy phases keep their exact
    single-name validation. Teardown reuses the inspect → assert-labels → refuse-stale-attachments →
    disconnect → `network rm` → confirm sequence the instance path already ships
    (`orchestrator-runtime.ts:270-296`), which is idempotent and therefore safe to re-run after a
    partial failure. Teardown first proves all three roles stopped, then removes the network and every
    no-follow attempt path; dependency preparation and materialization are not pre-attempt setup.
    Failing to *prove* a clean group leaves `runDispatchBlocked = true`, matching the
    existing fail-closed recovery posture rather than inventing a new one.
12. **The controller materializes from an independently verified source; the untrusted role only
    receives.** Invariant 10's tracked-only export must run in the runner, not in the preview
    entrypoint, and must not trust the same develop-writable checkout that `develop`'s
    model/persistent-auth mounts already touch — pass-4 review finding H2 showed that trusting that
    checkout as an archive source is bypassable through Git's own replace-object mechanism, regardless
    of whether the archive command runs in the runner process or a container. Handing the preview
    container a mirror mount would let candidate code read every other ref and all history and then
    render it into browser artifacts; handing it an archive *stream* would require a controller-owned
    producer and a binding/close protocol that neither this spec nor the shipped container-plan
    contract defines. Fetching `candidate_sha` fresh from the controller's own remote authority into a
    bare store the runner alone creates and destroys, with replacement-object processing disabled, and
    verifying the raw commit/tree identity before archiving, makes "the untrusted container has no Git
    object store" **and** "the exported bytes cannot have been substituted by a develop-writable ref"
    both properties of the container spec and the fetch protocol — inspectable and testable, not a
    promise about entrypoint behavior or a hash computed from a source that could itself have been
    tampered with.
13. **Reuse the existing `setup` phase's egress and credential posture for dependency install, rather
    than inventing a new registry proxy.** The repo already declares a `setup` command and a
    `setupNetwork` opt-in egress (AS-IS item 6) used to install `develop`'s dependencies; pass-4 review
    finding H3 showed no slice ever produces the dependency artifact invariant 10 promised the preview
    role. `browser-verify`'s dependency-prep role runs the identical command under the identical
    posture against the tracked-only export instead of the mutable develop workspace, so no new
    registry allowlist, proxy, or credential surface is introduced. Packing the result into a single
    deterministically packed artifact — rather than mounting the install role's writable directory
    directly — makes
    "no develop residue crosses into preview" a property of the copy step, since the pack step reads
    only from the install role's own disposable output, and gives the preview and browser containers a
    stable, read-only, candidate-bound input consistent with invariant 8's profile-snapshot pattern.
    The metadata-derived hash is only a cache key: the controller separately hashes the final packed
    bytes after the prep role stops and binds that content digest and size into trusted evidence.

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
`NETWORK_MODES` and attach both roles, and only both roles, to a per-attempt `--internal` network
created with `--opt com.docker.network.bridge.gateway_mode_ipv4=isolated` and `--ipv6=false`
(§5 Design decision 4) — no other network mode is valid for this phase, and a plain `--internal`
network without the isolated gateway option is rejected by the plan validator, not merely
undocumented. Before scheduling this phase, query the connected Docker Engine's reported version and
refuse with a distinct "Docker Engine does not support isolated gateway mode" infrastructure reason
(never a `{status:'failed'}` verdict) on any engine below the minimum that supports
`gateway_mode_ipv4=isolated` (T-ENGINE-GATEWAY-MODE-PREFLIGHT). Neither role's rendered argv
may contain `-p`/`--publish`/`--publish-all`, and the plan validator rejects a spec that carries one.
Extend the phase artifact parser with a browser variant that requires candidate/profile/image
bindings sourced from the browser role's `/out` only.

Add the per-phase kernel-surface hook the renderer lacks (§5 Design decision 10, AS-IS item 16):
`PHASE_POLICIES` entries gain an optional closed `securityOpt: readonly string[]` that
`buildLaunchPlan()` appends to its fixed `no-new-privileges`, never replaces it, and never lets grow
a capability (`--cap-drop ALL` stays unconditional and `--cap-add` remains unrenderable). Only the
browser role sets it, and only to the fixed runner-image path of the committed seccomp profile Slice 3
pins (the value is a controller constant, never repo- or candidate-supplied); every existing phase
renders byte-identical argv. Reject `--no-sandbox` and `--disable-setuid-sandbox` anywhere in a
rendered command or policy-supplied argument.

Make the durable launch identity and recovery group-aware (§5 Design decision 11, AS-IS item 17).
Persist `{network, roles: {dependencyPrep, preview, browser}, paths: {mirror, previewTree,
dependencyTree, dependencyArtifact, out}}` — deterministic names
(`factory-browser-verify-<role>-<runId>-<attempt>`, network `factory-browser-<runId>-<attempt>`) and
immutable per-role image digests and bounded no-follow attempt paths — into `phase_attempts.policy`
**before** creating any path, fetching candidate objects, creating the network, or launching a role.
Teach `containmentPolicy()` to accept exactly two shapes: the untouched legacy
single-role shape and this group shape; anything else stays `malformed durable launch identity`.
Teach the `active` map entry and `stopAndCrashContainmentAttempts()` to operate on the whole group —
kill every persisted role, prove each stopped, then remove the persisted network and paths with the
inspect → assert-labels → refuse-stale-attachments → disconnect → `network rm` → confirm sequence
`orchestrator-runtime.ts:270-296` already ships — and to return `false` (leaving
`runDispatchBlocked = true`) if any role stop, network removal, or path removal cannot be proved.

Implement §5 Design decision 9 exactly: add `nextPhase(..., {conditionalPhases: []})`
(byte-compatible default at every existing call site), have `advanceContainmentRun()`'s pump alone
pass `['browser-verify']` when required, and add the standalone `browserVerifyReadiness()` predicate
(never folded into `containmentReadiness()`). Do **not** add `browser-verify` to
`CONTAINMENT_IMPLEMENTED_PHASES` in this slice. A failed browser attempt enters the same bounded
develop-fix loop as failed self-test/review. Add `imageForPhase()` so each role resolves its own
image (preview keeps `FACTORY_AGENT_IMAGE`; browser uses `FACTORY_BROWSER_VERIFY_IMAGE`).

**DoD:** `cd runner && npm test -- --test-name-pattern='phase policy|container plan|nextPhase|image
selection|phase artifact|browser verify readiness|launch identity|group recovery|security opt' &&
npm run typecheck`. Exact per-role allowlists/mounts/network are asserted, including that the preview
role's container spec has no `/out` or profile mount, no path under the bare mirror, and no `.git`
source (T-CONTAINER-SPLIT), and that the browser role's has no candidate mount; neither rendered argv
contains a publish flag (T-NO-PUBLISHED-PORTS); every old sequence fixture is unchanged; fix rounds
rerun browser verification for the new candidate; deleting the phase/artifact/image mapping fails
tests; and a dedicated intermediate-state test proves that with this slice alone landed (readiness
predicate and conditional election present, phase absent from `CONTAINMENT_IMPLEMENTED_PHASES`) every
non-browser run's sequence/readiness is byte-identical to pre-slice behavior, while a run whose
manifest requires `browser-verify` fails closed with the "browser-verify not yet implemented" reason
instead of hanging or false-passing.

Additionally: **T-SECURITY-OPT-POLICY** — the browser role renders
`--security-opt no-new-privileges --security-opt seccomp=<pinned path>` with `--cap-drop ALL` intact,
and a golden-argv fixture proves all eight existing phases are byte-identical to pre-slice output.
**T-NO-SANDBOX-FLAGS** — a policy or command carrying `--no-sandbox`/`--disable-setuid-sandbox` is
rejected by name. **T-GROUP-LAUNCH-IDENTITY** — the persisted policy round-trips all three role names
and image digests, the network, and every bounded prelaunch/output path; a wrong role/path name, a
path outside the attempt root, a tag-shaped image, a missing role/path, or a missing network is
`malformed durable launch identity`. **T-LEGACY-POLICY-COMPAT** — an unmodified legacy
single-role row from every existing phase still parses and still validates its one deterministic name.
**T-GROUP-RECOVERY-UNIT** — with an injected Docker double, recovery from a policy row written at each
failpoint (fetch/materialization active; dependency-prep launched; artifact packing; network created
only; preview launched; both serving roles launched; browser exited unsealed; teardown half-done)
kills every live role, removes the network and paths, seals the row `crashed`, and leaves no orphan;
if the double reports any role still running, network attached, or path present, recovery returns `false`
and dispatch stays blocked. **T-GROUP-TEARDOWN-IDEMPOTENT** — running teardown twice, and running it
against an already-absent network, both succeed without error. **T-ENGINE-GATEWAY-MODE-PREFLIGHT** —
with an injected Docker-version double reporting an engine below the isolated-gateway-mode minimum,
scheduling this phase refuses with the named infrastructure reason before any network or container is
created; with a double reporting a supporting engine, the network-create call includes
`gateway_mode_ipv4=isolated` and `--ipv6=false`; every other phase's scheduling is unaffected by the
preflight.

### Slice 3 — pinned image supply chain (minion-factory, 4–6h)

**Topics:** deps, infra, security, test

**Files:** `agent/Dockerfile.browser-verify`, browser-image lock/package files,
`agent/seccomp/browser-verify.json` (new, committed), `runner/Dockerfile`,
`scripts/verify-image-pins.sh`, `docker-compose.yml`, `.env.example`, `deploy.sh`.

Build from a digest-pinned base. Download an exact Chrome for Testing build with a committed SHA-256
check; install dependencies through a committed lockfile and `npm ci`, not floating global installs.
Write `/etc/factory-browser-toolchain.json` and smoke-test the Chrome binary and
`chrome-devtools-mcp --version`. Publish/promote a named `repository@sha256:<manifest-digest>` and
emit it as `FACTORY_BROWSER_VERIFY_IMAGE` from `deploy.sh`; a mutable tag or bare local image ID is
not production-ready.

**Determine and pin the sandbox configuration empirically** (§5 Design decision 10). Starting from
Docker's default seccomp profile plus the namespace-clone syscalls Playwright's published Docker
profile permits, find the minimum profile under which Chromium reports a fully enabled sandbox on
this exact base image while `--cap-drop ALL` and `--security-opt no-new-privileges` remain in force.
Commit that profile, bake it into `runner/Dockerfile` at a fixed absolute path (the Docker **client**
reads the seccomp file, and the client runs in the runner container), record its SHA-256 in both
`/etc/factory-browser-toolchain.json` and the runner image's own manifest, and record in this
slice's completion note which sandbox-status mechanism (`chrome://sandbox` under the production launch
flags, or the `--enable-logging` fallback) is actually readable from an automated Playwright context —
Slice 4 consumes the one that works. **Adding `--cap-add SYS_ADMIN` is out of bounds.** If no profile
reaches a fully enabled sandbox under those constraints, stop: record the negative result, open a
proposal, and do not proceed to Slice 4 with `--no-sandbox`.

**DoD:** `scripts/verify-image-pins.sh`; two clean builds produce identical toolchain manifests;
`docker inspect` shows the fixed non-root entrypoint; a deployment fixture rejects a tag and accepts
a named digest. **T-SECCOMP-PINNED** — the committed profile's digest matches both the runner image's recorded digest
and the browser toolchain manifest, a build whose profile digest drifts fails, and a runner image
missing the profile at its fixed path fails. **T-SANDBOX-ENFORCED (image level)** — an automated
test launches Chromium inside the real image under the exact production flags
(`--cap-drop ALL`, `no-new-privileges`, the pinned seccomp profile, `chromiumSandbox: true`), asserts
the launched argv contains neither `--no-sandbox` nor `--disable-setuid-sandbox`, and asserts the
reported sandbox status shows every expected layer enabled; the same test run with the seccomp profile
removed must **fail**, proving the assertion is load-bearing rather than vacuous. T-IMAGE-PINS-BROWSER
and T-DIGEST-DEPLOY are automated tests, not manual diff review.

### Slice 4 — deterministic browser worker (minion-factory, 6–8h)

**Topics:** infra, logic, security, test

**Files:** `agent/factory-browser-verify-preview.sh`, `agent/factory-browser-verify.sh`,
`agent/lib/browser-verify-flows.mjs`, fixture profile and preview app, shell/Node tests.

**Controller-side materialization runs first** (§5 Design decision 12, invariant 10) and is *not* an
entrypoint responsibility: in `runner/src/browser-verify.ts`, before the network or either container
exists, the runner independently fetches `candidate_sha` from the controller's own remote authority
into a fresh, per-attempt bare object store (`${root}/browser-mirror-${attempt}.git`) that no
container ever mounts, runs every Git operation against it with `GIT_NO_REPLACE_OBJECTS=1`, verifies
the fetched commit's raw object id and `candidate_sha^{tree}` (replacement disabled) against the
controller's own remote authority, then creates an empty root-owned
`${root}/browser-preview-${attempt}`, pipes `git archive candidate_sha` from that verified store into
it, asserts the extracted tree hashes to `candidate_sha`'s tree and contains no `.git` path, and
mounts that directory into the preview role. It never reads or exports from the develop-writable
`${root}/workspace` checkout. Immediately after the archive succeeds, the runner closes and deletes
the per-attempt bare store — it exists only for the duration of the fetch-verify-archive sequence and
is never available to any container. The preview container receives no mirror path, no remote, and no
Git object store, so `git archive` never runs inside an untrusted container and there is no archive
transport to define.

**Dependency-artifact production runs next, still before either serving container exists** (§5 Design
decision 13, invariant 13): this work is already inside the persisted attempt resource manifest; the
runner copies the freshly archived tracked-only tree into a private
`${root}/browser-deps-${attempt}` directory and launches the disposable dependency-prep role — the
repo's existing `setup` command, under its existing `setupNetwork` egress, with the same
`github: null`/`model: forbidden`/`uid 1100`/read-only-rootfs posture as `self-test`, no `/out`, no
browser-profile mount, and no candidate execution beyond the registered command. On exit 0 the runner
deterministically packs the resulting dependency directory into a single immutable file keyed by
`sha256(candidate_sha + lockfile bytes + setup command + toolchain image digest)`. After proving the
dependency-prep role stopped, the runner separately computes `artifactContentSha256` and byte size
over that final no-follow regular file, deletes the private directory and dependency-prep container,
recomputes the content digest immediately before mount, and mounts only that one file read-only into
the preview role. A missing, oversized, non-regular, cache-key-mismatched, or content-digest-mismatched
artifact fails the phase closed before either the preview or browser role is created.

Split entrypoints by role (§5 Design decision 2). **Preview entrypoint** (runs in the preview
container): take the already-mounted tracked-only tree and the already-mounted dependency artifact as
given — it performs no materialization, fetch, checkout, or install of any kind; unpack the mounted
dependency artifact locally; start the registered command in a process group bound to
`0.0.0.0:<declared port>` so the browser role can reach it across the per-attempt internal network;
and always terminate/reap the process group at container exit. This container never mounts `/out`,
the browser profile, or any Git metadata, publishes no host port, opens no network of its own, and
holds no credential of any kind.
**Browser entrypoint** (runs in the browser container): read and assert Chromium's reported sandbox
status through the mechanism Slice 3 pinned, exiting nonzero if any layer is missing or the report is
unreadable (invariant 11); poll `http://preview:<declared port>` (the fixed per-attempt network alias)
with a fixed timeout before starting Chrome; launch Playwright with `chromiumSandbox: true` and
neither `--no-sandbox` nor `--disable-setuid-sandbox` in the launch options or the profile's allowed
argument set; import the read-only profile, run its Playwright flows against that address, inject
axe-core, capture CDP full AX trees (CDP bound to this container's own loopback only, never exposed on
the per-attempt network), checkpoint PNGs, console events, and request/response/failure events. Flow
assertion failure, critical/serious axe violations, or configured console errors fail.
Only the browser entrypoint writes browser result files and `/out/phase-result.json`; gate failures
return a valid `{status:'failed'}` phase artifact with process exit 0 so `nextPhase()` can enter its
bounded fix loop, while launch/infrastructure failures — including an absent or unprovable Chromium
sandbox — exit nonzero and remain crash/retry events.

**DoD:** `bash -n agent/factory-browser-verify-preview.sh && bash -n agent/factory-browser-verify.sh`
plus fixture tests prove profile actions and assertions execute, timeout/flow/axe failures are named,
both containers' process groups are gone after success and failure, the preview→browser connection
succeeds under `--network browser-internal`, non-`preview` `fetch`, WebSocket, EventSource and image
requests issued from the browser container fail and appear in `network.jsonl`, and the complete fixed
evidence set exists.

**T-CLEAN-MATERIALIZATION** asserts the controller-produced mount equals `git archive candidate_sha`
byte-for-byte as fetched into the independent bare store, contains no `.git` entry, that the preview
entrypoint issues no Git command, and that the per-attempt bare store no longer exists once the
preview role is created. **T-NO-REPLACE-REF-BYPASS** plants a `refs/replace` entry, a malicious
`.git/config`, and an unrelated ref carrying different content inside the develop workspace before the
phase runs, and proves none of them can change the fetched commit id, the archived tree hash, or any
emitted artifact — the fetch source is the controller's independent remote authority, never the
develop-writable checkout. **T-DEPENDENCY-ARTIFACT-PRODUCER** proves the artifact is produced from the
tracked-only export (never the develop workspace) by the persisted dependency-prep role, and that the
dependency-prep container and its private directory are gone before the preview role is created.
**T-DEPENDENCY-ARTIFACT-BINDING** proves a missing/oversized/non-regular/cache-key-mismatched/content-
digest-mismatched artifact fails the phase closed; identical input metadata paired with altered packed
bytes is rejected; and `artifactContentSha256` plus byte size in `phase-result.json` identify the exact
read-only file mounted into preview. The expected digest is derived independently from the packed bytes,
not from the cache-key implementation.
**T-INTERNAL-NETWORK-ONLY** replaces the removed loopback-era wildcard-bind assertion, which was
unsatisfiable once the roles became separate containers (`0.0.0.0` *is* the required listener):
assert instead that neither role's rendered argv publishes a host port, that the attempt network
inspects as `Internal: true` with exactly the two role containers attached, that the preview origin is
unreachable from the host and from a third container not on that network, and that it *is* reachable
from the browser role on the declared port.
**T-HOST-ISOLATED-NETWORK** asserts the attempt network was created with
`gateway_mode_ipv4=isolated` and IPv6 disabled, that the Docker host cannot reach either container's
declared port through the bridge gateway address, and that neither container can reach a host-bound
test service through that address; a control case run against a plain `--internal` network (gateway
mode omitted) must show the probe suite detecting the host-reachable gap, proving the assertions are
load-bearing rather than vacuous.
**T-SANDBOX-ENFORCED (entrypoint level)** asserts the entrypoint refuses to run flows when the
sandbox status reports any disabled layer or cannot be read, and that a profile attempting to inject
`--no-sandbox` is rejected by name.
Full container-boundary adversarial proof (candidate code attempting to reach `/out`, the profile,
CDP, the mirror, or another ref) is Slice 7's job (T-CONTAINER-ISOLATION,
T-CLEAN-MATERIALIZATION-E2E, T-NO-MIRROR-REACHABILITY).

### Slice 5 — profile snapshot and evidence ingestion (minion-factory, 4–6h)

**Topics:** data, infra, test

**Files:** `runner/src/browser-verify.ts`, `runner/src/browser-verify.test.ts`, `runner/src/queue.ts`.

Create a root-owned per-run profile input leaf without following links; copy the validated profile
once when evidence first becomes required and compute the hash in invariant 8. Validate fixed names
only: JSON/JSONL must be UTF-8 and structurally valid; allow 1 MiB each for JSON, 16 MiB and 100,000
lines each for JSONL, at most 64 PNGs of at most 16 MiB each; reject symlinks, non-regular files,
extra screenshot types, path traversal, missing files, or duplicate checkpoint names. Persist a
bounded summary and SHA-256 for every artifact in `phase_attempts.evidence`, not raw screenshots.
Also require `artifactContentSha256` and artifact byte size in `phase-result.json`, independently
recompute them from the final no-follow dependency file immediately before preview mount, and persist
them beside candidate/profile/browser-image bindings so the evidence identifies the exact dependency
bytes executed.

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

**Files:** `runner/src/repos.ts`, `runner/src/containers.ts`, `runner/src/containers.test.ts`,
`browser-profiles/minion-hub.mjs`, `runner/src/browser-verify.e2e.test.ts`, `README.md`.

**Add `browser-verify` to `CONTAINMENT_IMPLEMENTED_PHASES`** (`runner/src/containers.ts`) as this
slice's own change (§5 Design decision 9), only after the entrypoints (Slice 4), the pinned image
(Slice 3), and evidence ingestion (Slice 5) all exist and this slice's own hub profile is registered:
`browserVerifyReadiness()` is what actually gates execution, so this membership addition is what turns
"browser-verify not yet implemented" into "implemented, subject to `browserVerifyReadiness()`." Add a
before/after readiness regression test extending Slice 2's intermediate-state fixture
(T-IMPLEMENTED-PHASES-TRANSITION): with `browser-verify` absent from `CONTAINMENT_IMPLEMENTED_PHASES`,
a manifest requiring the evidence still refuses with "browser-verify not yet implemented"; with this
slice's addition landed, the same manifest is admitted only when `browserVerifyReadiness()`'s other
conditions (flag on, image resolves, repo registration/profile valid) also hold, while
`containmentReadiness()`'s existing eight-phase computation stays byte-identical either way.

Verify the current hub scripts before registering its exact build+preview command and port. The
profile contains 2–3 executable unauthenticated flows with stable assertions and at least one
screenshot checkpoint each. Adversarial fixtures put instruction-shaped strings and fake verdicts in
DOM/AX/console/network fields and exercise non-loopback resource APIs from the browser container
under `browser-internal`.

Add the container-isolation adversarial suite required by pass-2 review finding H1 (T-CONTAINER-ISOLATION):
a preview fixture that attempts to write into `/out`, open/inspect/signal the browser container's
process, escape its own process group, and connect to the browser container's CDP port — every
attempt must be denied while the preview's normal ability to serve HTTP to the browser container over
`browser-internal` is unaffected.

Add the clean-materialization adversarial fixture required by pass-2 review finding H3
(T-CLEAN-MATERIALIZATION-E2E): seed an untracked, secret-shaped file (e.g. `model-auth-copy`) in the
develop workspace immediately before `browser-verify` runs, and prove it is absent from the preview
container's filesystem, the browser container, and every emitted artifact — the fixture fails loudly
if the file is ever readable from either container.

Add the dependency-artifact-leak adversarial fixture required by pass-4 review finding H3
(T-NO-DEVELOP-DEPENDENCY-LEAK-E2E): seed a develop-only, secret-shaped file inside `node_modules` (in
addition to the workspace-level file above) immediately before `browser-verify` runs, and prove it is
absent from the dependency artifact, the preview container's filesystem, the browser container, and
every emitted artifact.

Add the mirror/history-unreachability suite (T-NO-MIRROR-REACHABILITY, §5 Design decision 12): commit
a secret-shaped blob on a ref that is **not** `candidate_sha`, then, from inside the preview container,
attempt to read the bare mirror path, any `.git` directory, any object store, and that other ref by
every available means (filesystem, `git`, any network path). Every attempt must fail while the
candidate tree remains runnable and the pilot flows still pass; the blob must be absent from every
emitted artifact.

Add the runtime sandbox proof (T-SANDBOX-STATUS-E2E): in the real deployed browser image under the
production launch flags, assert Chromium's reported sandbox status shows every expected layer enabled
and the effective argv contains no sandbox-disabling flag. A control run with the pinned seccomp
profile withheld must fail the phase as an infrastructure failure rather than passing.

**DoD:** full runner tests/typecheck, image-pin check, shell syntax, and one deployed scratch
`minion-hub` run complete the sequence `...self-test → browser-verify → prepare-review → review`.
The runner-owned attempt directory contains valid artifacts bound to the real candidate/profile/image;
the DB row contains only the bounded summary/hashes. A second canary requiring browser evidence for
unregistered `minion-site` refuses before any worker starts. The container-isolation,
clean-materialization, dependency-artifact-leak, mirror-unreachability, implemented-phases-transition,
and sandbox-status suites all pass. No PR-artifact publication is claimed.

### Slice 8 — group lifecycle failpoints and restart recovery (minion-factory, 6–8h)

**Topics:** infra, logic, test

**Files:** `runner/src/queue.ts`, `runner/src/browser-verify.ts`,
`runner/src/browser-verify.recovery.e2e.test.ts`, `runner/src/queue.test.ts`.

Slice 2 proves the group policy and recovery algorithm against an injected Docker double; this slice
proves them against the **real controller and the real Docker daemon** (§5 Design decision 11,
invariant 12). Add a test-only failpoint hook that aborts the runner process at each boundary of the
browser phase group: (a) after the attempt policy is persisted but before the first path exists,
(b) during candidate fetch, (c) after each mirror/preview/dependency/artifact directory or file is
created, (d) while dependency-prep is executing, (e) before and after deterministic packing,
(f) after network create before a serving-role launch, (g) after the preview role launches before the
browser role, (h) with both serving roles live, (i) after the browser container exits but before
`finishPhaseAttempt()` seals the row, and (j) mid-teardown with one role or path removed. At each
failpoint,
restart the controller and assert boot recovery leaves no orphan container, no leaked network, no
surviving attempt path, no duplicate launch, no second writer to `/out`, and either a sealed `crashed` row plus a resumable run
or a blocked dispatch with a named reason — never a silent pass. Do the same for an operator
cancellation issued during materialization, dependency preparation, and serving-role states
(T-GROUP-CANCEL): cancellation finishes only after Docker proves every role stopped and the network
and all no-follow attempt paths are gone, matching the existing "finalize cancellation only after
Docker proves the worker is not running" posture.

**DoD:** `cd runner && npm test -- --test-name-pattern='group recovery failpoints|group cancel' && npm
run typecheck`, plus the failpoint suite executed against a real daemon on the scratch box. Every
failpoint case asserts, by direct `docker ps -a` / `docker network ls` inspection scoped to the
attempt's deterministic names, that zero Docker objects and zero persisted attempt paths survive. A
deliberately broken teardown (dependency-prep left running, network left attached, or one path left
present) must make recovery return `false` and leave dispatch blocked — proving the assertions are
load-bearing. Non-browser phased runs are unaffected: the same failpoint harness run against a
`self-test` attempt reproduces exactly the pre-slice single-container behavior.

### Slice 9 — canonical UI activation (minion-meta, 4–6h)

**Topics:** infra, test, ui

**Files:** `specs/topics.json` only.

Add `browser-verify` to `ui.requiredEvidence` only. Do not edit `ux`. This slice may merge only after
S1–S8 are deployed, `FACTORY_CONTAINMENT_V2=1` is verified on the live runner, the hub success canary
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
| Deployment/env | `minion-factory/docker-compose.yml`, `deploy.sh`, `runner/Dockerfile`, production `.env` | `FACTORY_BROWSER_VERIFY_IMAGE` is a named immutable digest and is emitted by `deploy.sh`, per `/memory/MINION/index-archive.md`'s ★★★ wholesale-rewrite constraint. The seccomp profile ships **inside the runner image** (the Docker client reads it), so a runner redeploy — not only a browser-image publish — is part of the S3 rollout |
| Automerge | `minion-factory` only | New evidence predicate; `FACTORY_AUTOMERGE=0` remains untouched per `/memory/MINION/sdlc-board-triage-and-phase-gates.md` |
| AGENTS.md named product impact zones | shared WS protocol, channel extensions, shared DB, agent definitions, auth, workshop, pixel office, paperclip adapters | None entered; no code or contract in those zones changes |
| Existing hub live-preview subsystem | `minion_hub` + gateway plugin | No dependency or change; operator memory records it as inert until `PREVIEW_RUNNER_URL/_SECRET` is configured |

**Residual risk:** none for external egress — the per-attempt `--internal` network (§5 Design
decision 4) has no route to any external destination, no role publishes a host port, and there is no
configurable escape hatch. Host-boundary isolation, unlike external egress, is not free by construction
under a plain `--internal` bridge (AS-IS item 19) and is instead a gated, proved property: Slice 2's
Docker-Engine-version preflight and the exact-options network inspection (invariant 5) must both pass
before the phase schedules at all, and Slice 4's `T-HOST-ISOLATED-NETWORK` proves the host cannot
reach either container and neither container can reach the host, with a plain-`--internal` control
case proving the assertion is load-bearing. Three risks are converted from unproved assumptions into
gated work rather than eliminated by design alone:

- **Chromium sandbox availability under `--cap-drop ALL` + `no-new-privileges` is an empirical
  question, not a certainty** (§5 Design decision 10). Slice 3 either pins a seccomp profile that
  reaches a fully enabled sandbox or records a negative result that stops the spec — it may not ship
  `--no-sandbox` or `--cap-add SYS_ADMIN`. Until S3 completes, treat the browser role's in-container
  isolation as unproved.
- **Group lifecycle correctness is proved by failpoint testing, not by construction** (invariant 12).
  S2 proves the algorithm against a Docker double and S8 proves it against a restarted real
  controller; between those slices the phase must not be activated for any fleet repo.
- **Host-isolated gateway mode requires a minimum Docker Engine version** (invariant 5, AS-IS item 19).
  The production host's Engine version is not verified by this spec's authoring process; Slice 2's
  preflight is what makes an unsupporting engine a fail-closed infrastructure refusal instead of a
  silently unisolated network, and S9 activation must not proceed until a production run has exercised
  that preflight against the real deployed engine.

The remaining residual risk is scope, not isolation: `minion-hub` is the only registered profile, so
`minion-base`, `minion-site`, `minion-ai`, `minion-meta`, and `minion-factory` stay fail-closed on
`ui` until each receives its own separately reviewed profile (invariant 9).

## 8. Out of scope

- An LLM or harness driving browser/MCP interactions.
- Profiles for `minion-base`, `minion-site`, `minion-ai`, `minion-meta`, or `minion-factory`.
- Making `ux` independently require browser evidence or introducing an `a11y` topic.
- Custom per-repo axe rule sets beyond the fixed critical/serious gate.
- The hub Projects⇄GitHub live-preview subsystem.
- Existing agent/runner image pinning and the containment-v2 rollout implementation owned by the
  worker-containment spec. The rollout's successful production completion is nevertheless a hard S9
  prerequisite.
- Uploading browser artifacts to GitHub/PRs or changing the review worker/evidence format.

## 9. Verification

The spec is complete only when S1–S9 pass in order, the deployed runner reports containment-v2
enabled, the browser image reference is a named manifest digest, Chromium reports a fully enabled
sandbox under the production launch flags, the deployed Docker Engine passes the isolated-gateway-mode
preflight and every attempt network inspects with `gateway_mode_ipv4=isolated`, every group-lifecycle
failpoint leaves zero orphan containers and zero leaked networks, every browser-verify attempt's
dependency artifact is produced from the tracked-only export, every dependency-prep role and attempt
path is recoverable, and the artifact's independently computed content digest/size is bound beside
candidate+lockfile+toolchain, the hub success and site refusal canaries pass, the canonical `ui`
policy is live, and a post-activation hub run produces validated candidate/profile/image-bound
evidence before review. `FACTORY_AUTOMERGE=0`, provider independence,
the human merge gate, and reviewer read-only authority remain unchanged.

The memory constraints that shape this result are cited above: `/memory/MINION/MEMORY.md` and
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` require slice-scoped runs, controller-owned
truth, prompts not serving as a security boundary, and automerge remaining off; the archived
`minion-factory-agent-pipeline` entry in `/memory/MINION/index-archive.md` requires reviewers to
propose while the applier re-verifies and records the `deploy.sh` wholesale `.env` rewrite.

## 10. Review disposition log

**Pass 4 disposition: still-review (`status: review`, `verdict: pending`).** Pass 3 was independently
reviewed with `VERDICT: FAIL` on PR #286 (2026-08-29). Every finding was re-verified against the
factory baseline `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914` before being acted on — none was accepted
on the reviewer's word alone, and none was dismissed. All five were confirmed genuine and are resolved
in this pass. This pass does not self-approve: an independent re-review owns the next disposition, and
per the SDLC contract this spec's `security` tag keeps human gates at approval and merge.
Finding labels are round-scoped: references reading "pass-2 review finding …" in §5 and §6 belong to
the earlier round and are already resolved; the table below is the pass-3 round.

| Pass-3 finding | Re-verification against `0315707d…` | Resolution in pass 4 |
|---|---|---|
| **H1** Chromium sandbox neither enabled nor proved | Confirmed. `buildLaunchPlan()`'s renderer (`containers.ts:900-913`) hard-codes `capDrop=['ALL']` / `securityOpt=['no-new-privileges']` with no per-phase seccomp hook, and no seccomp profile exists in the repo; Playwright appends `--no-sandbox` unless `chromiumSandbox: true` | New AS-IS item 16, Target invariant 11, §5 Design decision 10, D9; S2 adds the closed per-phase `securityOpt` hook, S3 pins the profile empirically and may **not** ship `--no-sandbox`/`SYS_ADMIN`, S4 fails closed on an unreadable/incomplete sandbox report, S7 proves it in the deployed image |
| **H2** Crash/restart recovery models one container, not the group | Confirmed. `containmentPolicy()` (`queue.ts:713-734`) validates exactly one `factory-${phase}-${runId}-${attempt}`; `active` holds one `containerName` (`queue.ts:178`); `stopAndCrashContainmentAttempts()` (`queue.ts:3915-3951`) kills that one name and never removes a network | New AS-IS items 17-18, Target invariant 12, §5 Design decision 11, D10; group identity persisted **before** the first Docker object, `containmentPolicy()` gains a second accepted shape (legacy shape untouched), teardown reuses the shipped `orchestrator-runtime.ts:270-296` inspect→assert→disconnect→`rm`→confirm sequence; new **Slice 8** proves six failpoints and cancellation against a restarted real controller |
| **H3** Clean materialization delegated across the wrong trust boundary | Confirmed by reading the pass-3 text: invariant 10 promised a candidate-only mount while S4 assigned `git archive` against the controller's bare mirror to the **preview** entrypoint | Invariant 10 rewritten as controller-side export into `${root}/browser-preview-${attempt}` (the sibling of the shipped `${root}/selftest-${attempt}` special case) before either container exists; §5 Design decision 12; S4 preview entrypoint performs no Git operation at all; new S7 suite T-NO-MIRROR-REACHABILITY proves the mirror, `.git`, object store, and a secret-shaped blob on another ref are all unreachable |
| **M1** Slice 4 both required and rejected the same wildcard bind | Confirmed contradiction — `0.0.0.0` is the required listener once the roles are separate containers | The loopback-era wildcard-rejection DoD is removed and replaced by T-INTERNAL-NETWORK-ONLY (no published host port on either role, network `Internal: true` with exactly two attachments, origin unreachable from the host and from a third container, reachable from the browser role); invariant 5 restated accordingly |
| **M2** Committed board projection stale, CI red | Confirmed: `node scripts/spec-index.mjs --check` exited 1 with `specs/index.json is stale` | `specs/index.json` regenerated and committed as the last spec-edit step of this pass; `--check` passes |

**Slice renumbering:** the pass-3 Slice 8 (canonical `ui` activation) is now **Slice 9**; the new
Slice 8 is the group-lifecycle failpoint suite. Every S8 reference in §0, §1, §7, §8 and §9 was
updated. Slice count 8 → 9; no slice exceeds the 4–8 hour bound.

**Not changed, and why:** the spec title keeps the approved proposal's "loopback-isolated" wording.
Invariant 2 and §5 Design decision 4 already record that the per-attempt internal network supersedes a
literal loopback address; renaming the artifact is a proposal-level decision, not a review fix.

**Pass 5 disposition: still-review (`status: review`, `verdict: pending`).** Pass 4 was independently
reviewed with `VERDICT: FAIL` on PR #286 (2026-08-29). Every finding was re-verified against the
factory baseline `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914` before being acted on — none was accepted
on the reviewer's word alone, and none was dismissed. All four were confirmed genuine and are resolved
in this pass. This pass does not self-approve: an independent re-review owns the next disposition, and
per the SDLC contract this spec's `security` tag keeps human gates at approval and merge. Finding
labels are round-scoped: references reading "pass-3 review finding …" in §2, §5, and §6 belong to the
earlier round and are already resolved; the table below is the pass-4 round.

| Pass-4 finding | Re-verification against `0315707d…` | Resolution in pass 5 |
|---|---|---|
| **H1** Plain `--internal` does not isolate either role from the Docker host | Confirmed against Docker's documented gateway-mode behavior: a plain internal bridge is normally assigned a host-side gateway address, and the pass-3 network creation (`ensureInstanceNetwork()`-style `Driver === 'bridge' && Internal === true` assertion) never requests or checks a gateway mode | New AS-IS item 19; Target invariant 5 and §5 Design decision 4 rewritten to require `gateway_mode_ipv4=isolated` (Docker Engine 28+) and IPv6 disabled, a fail-closed minimum-Engine-version preflight, and an exact-options network inspection instead of `Internal: true` alone; S2 adds the preflight (T-ENGINE-GATEWAY-MODE-PREFLIGHT), S4 adds the runtime host-isolation probe with a plain-`--internal` control case (T-HOST-ISOLATED-NETWORK) |
| **H2** Clean materialization has no trusted object source and is replacement-ref bypassable | Confirmed by a focused fixture: `git replace A B` made `git archive A` emit B's file and made `git rev-parse A^{tree}` return B's tree; only `GIT_NO_REPLACE_OBJECTS=1` returned the real tree, and no bare mirror exists anywhere in `minion-factory` — the only object store is the develop-writable `${root}/workspace` checkout | New AS-IS item 20; Target invariant 10 rewritten to fetch `candidate_sha` independently from the controller's own remote authority into a fresh, per-attempt, worker-inaccessible bare store, run every Git operation against it with `GIT_NO_REPLACE_OBJECTS=1`, verify the raw commit/tree identity before archiving, and close/delete the store before either role launches; §5 Design decision 12 rewritten; S4 adds T-NO-REPLACE-REF-BYPASS (plants `refs/replace`, malicious config, and an alternate ref in the develop workspace and proves none reach the exported bytes or tree) |
| **H3** No slice creates the promised sealed dependency artifact | Confirmed: `minion-hub`'s `setup` (`bun install`) only ever installs into the durable workspace, `git archive` excludes `node_modules` by construction, the `browser-internal` network has no registry egress, and no D-item or slice owned a dependency producer | New AS-IS item 21; new Target invariant 13 and §5 Design decision 13 define a disposable dependency-prep role reusing the repo's existing `setup` command and `setupNetwork` egress, packing output into a single immutable candidate+lockfile+toolchain-hash-named artifact mounted read-only into the preview role; new **D11**; S4 adds the producer and its fail-closed binding checks (T-DEPENDENCY-ARTIFACT-PRODUCER, T-DEPENDENCY-ARTIFACT-BINDING), S7 adds the develop-`node_modules`-leak adversarial fixture (T-NO-DEVELOP-DEPENDENCY-LEAK-E2E) |
| **M1** No slice makes `browser-verify` implemented, so the pilot remains permanently fail-closed | Confirmed: §5 Design decision 9 already said the `CONTAINMENT_IMPLEMENTED_PHASES` addition happens in Slice 7, but Slice 7's file list and body never instructed it | Slice 7's file list now includes `runner/src/containers.ts` (+ tests) and its body adds `browser-verify` to `CONTAINMENT_IMPLEMENTED_PHASES` explicitly, after the entrypoint/image/ingestion prerequisites, plus a before/after readiness regression test (T-IMPLEMENTED-PHASES-TRANSITION) proving non-implemented refusal and post-slice admission gated on `browserVerifyReadiness()` |

**Not changed, and why:** slice count stays at 9 — the dependency-artifact producer and its adversarial
proof extend Slice 4 and Slice 7 (both already own controller-side materialization and hub-pilot
adversarial testing respectively) rather than adding a new numbered slice, consistent with how prior
rounds folded the sandbox and group-lifecycle fixes into existing slices instead of renumbering. No
slice's file list changed its owning repo; `runner/src/containers.ts` was already a Slice 2 file and is
now also touched by Slice 7 for the single-line implemented-phases addition.

**Pass 6 disposition: still-review (`status: review`, `verdict: pending`).** Pass 5 was independently
reviewed with `VERDICT: FAIL` on PR #286 (2026-08-29). Both findings were re-verified against this
spec's actual resource/evidence contracts before editing. The earlier network, trusted-materialization,
sandbox, and conditional-readiness fixes remain unchanged because the pass-5 reviewer explicitly
accepted them. This pass does not self-approve; the security-tagged spec still requires independent
approval and a human merge gate.

| Pass-5 finding | Re-verification | Resolution in pass 6 |
|---|---|---|
| **H1** Dependency preparation and prelaunch paths are outside durable recovery | Confirmed. Invariant 12 persisted only `{preview,browser,network}`, while invariant/Slice 4 created a dependency-prep container plus mirror, preview-tree, dependency-tree, artifact, and output paths before those recorded roles launched | Invariant 12 and Design decision 11 now persist `{dependencyPrep,preview,browser,network,paths}` before the first resource; D10/D11 and S2 make validation, active tracking, cancellation, and teardown cover all three roles and every no-follow path; S8 adds real-controller failpoints during fetch, each path creation, dependency execution, packing, and deletion and blocks sealing/retry until zero resources remain |
| **M1** Evidence names an input cache key rather than the dependency bytes executed | Confirmed. The prior artifact name was derived only from candidate/lockfile/setup/toolchain metadata and the evidence binding omitted the packed file | Invariants 7/13, Design decision 13, D11, and S4/S5 separate the metadata cache key from `artifactContentSha256`; the controller deterministically packs, hashes the final no-follow file after prep stops, rechecks immediately before mount, and binds content digest plus size in `phase-result.json` and `phase_attempts.evidence`; the focused fixture alters bytes under identical metadata and must fail |

**Not changed, and why:** slice count remains 9. S2 already owns durable policy/recovery, S4 owns
dependency production, S5 owns evidence ingestion, and S8 owns real restart failpoints; extending
those force-bearing seams is narrower and more independently landable than adding a tenth slice.
