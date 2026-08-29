---
id: 2026-08-18-factory-capability-separation-spec
title: Factory capability separation — purpose-scoped GitHub credentials, run-bound grants, and server-derived actors
stage: spec
status: review
pass: 3
created: 2026-08-18
updated: 2026-08-29
proposal: 2026-08-17-factory-capability-separation
verdict: changes_requested
repos: [minion-factory, minion-base]
tags: [security, infra]
relationship: extends
related: [2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-factory-worker-containment-spec, 2026-08-18-factory-memory-governance-spec, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-base-kanban-possibly-shipped-surface-spec, 2026-08-18-sdlc-transformation-roadmap]
type: infra
---

# Factory capability separation — purpose-scoped GitHub credentials, run-bound grants, and server-derived actors

## 0. Product

From approved proposal `2026-08-17-factory-capability-separation`, verbatim:

> Today one broad `FACTORY_GH_TOKEN` reaches every agent container and can write target repos, meta lifecycle state,
> AND memory write-backs; lifecycle endpoints accept a caller-supplied `by` behind a shared bearer.
>
> **Definition of done:** runs receive short-lived credentials (GitHub App installation tokens or equivalent) scoped
> to one repository/branch/action set; separate credentials for (a) target-code pushes, (b) meta lifecycle commits,
> (c) memory candidate uploads; `by` derived server-side from the authenticating principal, never caller-supplied.

The security outcome is unchanged from pass 2: compromise of one run or purpose-specific integration must not be
able to reuse a factory-wide credential to mutate unrelated repositories or impersonate another authenticated
principal. This is M4 identity work. It retains the human merge gate.

**Pass-3 respec note (2026-08-29).** Passes 1-2 designed this as a GitHub-Apps/installation-token architecture with
a new `CapabilityGrantEnvelope` authority table. That specific mechanism is superseded: `minion-factory@5db7d391`
(main, PR #153 merged) has since landed a *different* implementation of the same "purpose-separated credential +
trusted publisher" idea — long-lived purpose-scoped PATs (`FACTORY_GH_CHECKOUT_TOKEN` /
`FACTORY_GH_BRANCH_TOKEN` / `FACTORY_GH_WORKSPACE_PREPARE_TOKEN`), a deny-by-default worker credential boundary, a
trusted runner-owned effect adapter (`runner/src/containment-effects.ts`), an activation canary
(`runner/src/scoped-github-canary.ts`), and a durable per-run ledger (`pipeline_instances` / `phase_effects` in
`runner/src/db.ts`) that plays the role passes 1-2 assigned to the envelope table — but only for `dev`-kind runs
with `FACTORY_CONTAINMENT_V2=1` (default `0`). This pass does not reopen that design; it verifies it, and rescopes
the spec's remaining work to extend that landed mechanism to the paths it does not yet cover, rather than building a
parallel GitHub-App identity system. See §1 for exact evidence and §2 for what changed.

### Relationship recommendation

**Recommendation: `extends`, revised.** The source proposal is still not fully satisfied, but less of it is open
than passes 1-2 assumed:

- `2026-08-18-factory-topic-capability-manifest-spec` — **now `shipped`** (was the M3 prerequisite for an
  execution-manifest hash). No longer a blocker; the manifest hash it supplies is available for any future envelope
  work, though this pass's slices do not need a new envelope (§2).
- `2026-08-18-factory-durable-state-outbox-spec` — still `implementing` / `changes_requested`. Unchanged relationship:
  this spec's remaining slices extend the already-landed `pipeline_instances`/`phase_effects` tables (`db.ts:757-813`)
  rather than waiting on that spec's own unresolved §8 human decision, since those tables already exist and are load-
  bearing for the lineage orchestrator today.
- `2026-08-18-factory-worker-containment-spec` — `approved`. Its physical-isolation boundary (credential-free
  setup/self-test/review) is a distinct concern from credential purpose-separation, but the two now share
  infrastructure: `runner/src/containers.ts`'s `GITHUB_CREDENTIAL_NAMES`/`RESERVED_CREDENTIAL_ENV` deny-by-default
  boundary and `containment-effects.ts`'s trusted adapter, both introduced for containment v2, are exactly the
  mechanism this spec's remaining slices reuse and extend to non-containment-v2 run kinds. Implementers of either
  spec must coordinate so neither duplicates the other's credential-boundary code.
- `2026-08-18-factory-memory-governance-spec` — `approved`, unimplemented. Unchanged: this spec provisions only the
  dormant create-only quarantine publisher; memory-governance owns schema, scanners, activation, and promotion.
- `2026-08-18-factory-m0-safety-foundation-spec` — `implementing`/`approved`. Unchanged: preserves trusted-check
  `{name, appId}` matching; this pass introduces no new checked identity.
- `2026-08-18-base-kanban-possibly-shipped-surface-spec` — `done`/`changes_requested`. Its `disposition` lifecycle
  path shipped (`runner/src/index.ts:683-719`) and still has the same caller-supplied-`by` gap this spec must close
  for both the `status` and `disposition` request shapes.
- `2026-08-18-sdlc-transformation-roadmap` — unchanged relationship.

## 1. AS-IS

Verified 2026-08-29 against `NikolasP98/minion-factory@main` commit `5db7d3919896042043e63da996d6441ec63db205`
(`5db7d391`, PR #153 merged) and `NikolasP98/minion-base@main` commit `19531059cf42e352e35425dd3b3b71afa9eb540f`,
both read from local checkouts of those repos, plus closed (unmerged) `NikolasP98/minion-factory` PR #29. Re-read
HEAD before implementation; line numbers are anchors, not immutable coordinates.

1. **A purpose-scoped credential + trusted-adapter foundation already exists, gated to one run kind and one flag.**
   For `dev`-kind runs with `FACTORY_CONTAINMENT_V2=1` (`runner/src/queue.ts:439`; flag default `0`, fail-closed —
   `runner/src/containers.ts:1220-1221,1245-1256`; `.env.example:7`), the launch plan uses three distinct purpose
   credentials instead of one broad token: `FACTORY_GH_CHECKOUT_TOKEN` (read-only clone/fetch),
   `FACTORY_GH_BRANCH_TOKEN` (write: push developed candidate), `FACTORY_GH_WORKSPACE_PREPARE_TOKEN` (write: branch +
   draft PR) — `runner/src/containers.ts:201-207`, `runner/src/scoped-github-canary.ts:27-30`. A deny-by-default
   worker credential boundary (`GITHUB_CREDENTIAL_NAMES = ['GH_TOKEN','GITHUB_TOKEN']`, `RESERVED_CREDENTIAL_ENV`)
   blocks those and other secret env names from reaching a credential-free phase — `runner/src/containers.ts:217,
   236-237` and surrounding table.
2. **A trusted, runner-owned effect adapter performs the actual GitHub writes for that path.**
   `runner/src/containment-effects.ts` (`tokenFor`, `githubRequest`, the `applyContainmentRemoteEffects` family)
   selects the bearer by phase purpose and bounds response size (`:255-279`). `runner/src/scoped-github-canary.ts`
   (533 lines) is a preflight/activation canary exercising exactly this scoped-credential path end-to-end against a
   dedicated `NikolasP98/minion-factory-canary` repo before rollout — this substantially satisfies what pass-2's
   Slice 6 preflight envisioned, for the paths it covers.
3. **Durable per-run lineage/evidence state already exists**, playing the role pass-2 assigned to a new
   `CapabilityGrantEnvelope` table: `pipeline_instances` (run/attempt/lease/manifest-hash-bound row per run,
   `admission_key_hash` unique) and `phase_effects` (idempotent effect ledger keyed `{run_id, kind, key}`) —
   `runner/src/db.ts:757-813`. Any further authority/evidence record this spec's remaining slices need should be
   additive to these tables, not a parallel schema.
4. **Everything outside that one gated path still uses one process-wide `FACTORY_GH_TOKEN`, indistinguishable across
   purposes:**
   - `runner/src/github.ts:6-16` — the module-level `TOKEN` constant backs every `gh()` call. `runner/src/
     lifecycle.ts:8` imports `gh` from this module for every meta lifecycle commit (`transition`, `spec-pass`,
     `reconcile`, `chat-proposal`). Meta writes and legacy target writes are not credential-separated at all: both
     draw from the same PAT.
   - `runner/src/queue.ts:2101-2113` (`legacyCredentialTransport`) injects that same `FACTORY_GH_TOKEN` as `GH_TOKEN`
     into every spec run, every reconcile run, and every dev run that does not have containment v2 enabled — which
     is every run kind except the one path in point 1, and is today's default for `dev` runs too.
   - `agent/run.sh:79-83` uses the inherited `GH_TOKEN` (same broad PAT) to `gh api -X PUT` memory notes directly to
     canonical `NikolasP98/minion-agent-memory`. No candidate/quarantine separation exists yet; this is pass-2's
     Slice 5 invariant, unimplemented.
   - `scripts/train.sh:14`, `scripts/self-update.sh:37-40,68`, and `runner/src/index.ts:393-418` (monitor issue
     filing) also consume `FACTORY_GH_TOKEN` directly.
5. **Lifecycle actor attribution still accepts a caller-supplied string for admin-authenticated callers.**
   `runner/src/index.ts:55-90` performs constant-time bearer matching and derives `res.locals.capability`
   server-side (unchanged since pass 2 — this part is sound). But both lifecycle request shapes still fold in
   request body text when the capability is `admin`:
   - `:683` (`status` transition path): `res.locals.capability === 'admin' && typeof by === 'string' && by.trim() ?
     by.trim().slice(0, 60) : \`api:${capability}\``.
   - `:701-719` (`disposition` path, which shipped after pass 2 via the base-kanban-possibly-shipped-surface spec):
     the identical pattern.
   The human-readable actor text an admin bearer can commit to a meta audit trail is still request-supplied, not
   purely derived from the credential registry. This is the exact `by`-spoof gap named in the source proposal,
   unresolved across two intervening review passes.
6. **`NikolasP98/minion-base` still performs the direct Contents-API write path AS-IS §8 already identified in pass
   2**, unchanged: `src/lib/server/meta-write.ts:13-45` (`gh()` using `env.GITHUB_TOKEN`; `getFile`/`putFile` against
   `NikolasP98/minion-meta`'s `dev` branch) and `:126-145` (`putFile` commits the `status`/`updated` frontmatter plus
   the derived index; GitHub-side CAS via `sha` protects against a concurrent-edit race, but no factory-authenticated
   principal is involved — the actor is a raw PAT, not a credential-registry identity at all). No `base-dashboard-v1`
   -style service credential exists in either codebase.
7. **Closed (unmerged) `NikolasP98/minion-factory` PR #29** (`auto: factory-capability-separation-spec S1`, closed
   2026-08-28) is direct evidence for this pass's disposition: its own body records that a prior implementation
   attempt under the pass-1/pass-2 GitHub-App/`CapabilityGrantEnvelope` design was **correctly self-postponed**
   because the M0-M3 authority spine it depended on ("a grant's authority must come from the controller's persisted
   manifest / run lineage ... [and] evidence must flow through the landed M2 outbox-evidence spine") did not exist in
   that repository at the time — "ship no capability code at all" was the conservative, fail-closed right call. That
   specific blocking condition (no persisted manifest/lineage record) no longer holds: `pipeline_instances` has since
   landed. But the specific App-based Slice 1 design PR #29 was blocked on has independently been superseded by the
   scoped-token approach in points 1-3, so simply "unblocking" PR #29's old design is not the right next step either
   — hence this respec rather than a resume.
8. Points 1-7 together are the concrete basis for the 2026-08-28 board audit note this file already carried at the
   bottom prior to this pass (superseded by this section; kept below for history) and for [[factory-moving-origin-
   strategy-implementation]]'s independent finding from the same day: "capability-separation approved→draft for
   respec (architectures superseded: runs→pipeline_instances; GitHub-Apps→scoped PATs + effect ledger, keep by-spoof
   + broad-token deltas)".

Hard constraints shaping this spec (unchanged from pass 2, reconfirmed 2026-08-29):

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and `/memory/MINION/MEMORY.md` require the controller to own
  truth, prompts not to serve as security boundaries, reviewers to be technically read-only, and
  `FACTORY_AUTOMERGE=0` through M0-M7.
- `/memory/MINION/minion-factory-agent-pipeline.md` records both that `deploy.sh` rewrites `.env` wholesale and that
  concurrent meta writers require push/rebase/retry handling. Purpose separation must preserve that convergence
  behavior without sharing credentials.
- `/memory/MINION/projects-github-repo-link-and-factory-gates.md` requires decisions to exist first in native GitHub
  state and treats a handle from another id-space as requiring its own ownership proof. Routing minion-base
  mutations through the meta lifecycle endpoint must retain commit/blob CAS and return the committed projection; a
  successful UI-only or factory-DB-only decision is not acceptable.
- `/memory/MINION/factory-moving-origin-strategy-implementation.md` (2026-08-28 board audit entry, read this pass)
  independently reached the same disposition as this respec: architecture superseded, `by`-spoof and broad-token
  deltas remain open. No stronger or conflicting factory-specific memory was found.

## 2. TO-BE

Extend the already-landed purpose-scoped-credential + trusted-adapter pattern (§1 points 1-3) to every run kind and
every non-worker PAT consumer, instead of building a parallel GitHub-App/installation-token identity system. No new
authority table is introduced; `pipeline_instances`/`phase_effects` remain the durable spine.

### Target invariants

1. **One credential-issuance mechanism, four purposes, all run kinds.** Add a fourth purpose, `meta` (write,
   scoped to `NikolasP98/minion-meta` only), to the existing `checkout`/`branch`/`workspace` purposes. Apply all four
   uniformly to spec runs, reconcile runs, and every dev run — not only containment-v2 dev runs.
   `runner/src/github.ts`'s module-level `TOKEN` is replaced by an injected purpose-bound client; `queue.ts`'s
   `legacyCredentialTransport` is removed. A startup validator rejects missing configuration for any purpose actually
   exercised by the enabled run kinds and rejects identical values configured across two purposes.
2. **No raw GitHub credential reaches worker/harness containers for target-repo effects, on every run kind.** The
   already-implemented deny-by-default boundary (`GITHUB_CREDENTIAL_NAMES`, `RESERVED_CREDENTIAL_ENV`) is extended to
   spec/reconcile launch plans. The trusted adapter in `containment-effects.ts` (or an equivalent adapter reusing its
   bounded-response/token-selection primitives) performs push/PR/readiness calls for every run kind that needs them,
   not only containment-v2 dev runs.
3. **No direct memory write from worker code.** `agent/run.sh:79-83` is deleted. A runner-owned, create-only
   publisher accepts runner-validated bytes plus runner-owned run/candidate ids and targets the separate private
   quarantine repository at `<run-id>/<candidate-id>.json`, consistent with the approved
   `2026-08-18-factory-memory-governance-spec`. It stays dormant (no production caller) until that spec's schema/
   scanner/promotion contract lands, and cannot reach canonical `minion-agent-memory`.
4. **Server-derived actors only.** `by` is rejected (400) at the `/lifecycle/:kind/:id` HTTP boundary regardless of
   caller capability, on both the `status` (`index.ts:683`) and `disposition` (`index.ts:701-719`) branches. Commit/
   audit actor text is generated solely from `res.locals.capability`/the credential registry entry — never from
   request JSON, even for the admin bearer. minion-base is issued a distinct, lifecycle-only service bearer
   (`base-dashboard-v1`-equivalent) instead of using the admin bearer.
5. **minion-base stops writing minion-meta directly.** `src/lib/server/meta-write.ts`'s `putFile`/Contents-API path
   is removed or reduced to a thin client of the factory's `/lifecycle/:kind/:id` endpoint, authenticated with the
   new service bearer. The existing GitHub-side CAS (`sha` match) and canonical committed-response/index-sync
   behavior are preserved by having the factory lifecycle endpoint compute and return them, not by minion-base
   computing them itself. minion-base's remaining direct GitHub reads (`src/lib/server/github.ts`) keep their
   current `env.GITHUB_TOKEN` scope for now: narrowing reads to a mechanically read-only credential is real
   remaining work but is lower-risk and independent of the write cutover, so it is explicit later scope (§8) rather
   than blocking this spec's approval.
6. **Non-worker PAT consumers get purpose credentials too.** `scripts/train.sh`, `scripts/self-update.sh`, and
   `runner/src/index.ts`'s monitor-issue path stop reading `FACTORY_GH_TOKEN` directly. Self-update and monitor
   intake use the `meta` purpose; `train.sh` uses a dedicated `train` purpose scoped to comparing/opening PRs on one
   registry-configured `{repositoryId, headRef, baseRef}` pair only — it cannot push, merge, or accept repo/ref input
   from the calling script.
7. **Evidence reuses `phase_effects`.** Every credentialed effect (target push/PR, meta commit, memory-candidate PUT,
   monitor issue) records an idempotent `phase_effects` row (existing table, `db.ts:757-773`) keyed by
   `{run_id, kind, key}`. Purpose, target repo, and a redacted result are recorded; token values are never persisted,
   logged, or included in Docker argv/result JSON/PR bodies/error messages.
8. **Compatibility.** `FACTORY_CONTAINMENT_V2` remains the rollout flag for the worker-containment spec's *physical*
   isolation boundary; credential purpose-scoping itself is no longer conditioned on it once this spec's slices land
   — meta/train/self-update/spec/reconcile paths get purpose tokens unconditionally, independent of containment v2's
   dev-only rollout state. `FACTORY_AUTOMERGE` stays `0`. The existing concurrent-meta-writer rebase/retry
   convergence rule is preserved unchanged. Human merge gate is unchanged.

Explicitly **not** proposed by this pass: standalone GitHub Apps, App JWT/installation-token minting infrastructure,
or a new `CapabilityGrantEnvelope`/authority table. `pipeline_instances`/`phase_effects` are the authority/evidence
spine; any additional record this spec's slices need must be additive columns/rows on those, not a parallel schema.

## 3. DELTA

Four slices remain (down from pass 2's six): target-purpose scoping and its trusted adapter/canary already shipped
for the containment-v2 dev path (§1 points 1-2) and need no further design, only extension to other run kinds, which
Slice 1 folds in alongside the new `meta` purpose.

1. Add the `meta` purpose alongside the three already-shipped target purposes; replace `runner/src/github.ts`'s
   single `TOKEN` and `queue.ts`'s `legacyCredentialTransport` with purpose-bound clients used by spec, reconcile,
   and non-containment-v2 dev runs (→ Slice 1; proves `T-META-PURPOSE-TOKEN`, `T-NO-SHARED-TOKEN`,
   `T-LEGACY-PATH-SCOPED`).
2. Reject `by` unconditionally at the lifecycle HTTP boundary and derive actor only from the credential registry, on
   both the `status` and `disposition` routes (→ Slice 2; proves `T-BY-REJECTED`, `T-ACTOR-SERVER-DERIVED`).
3. Cut minion-base over from `meta-write.ts`'s direct Contents-API PUT to a lifecycle-only service bearer calling the
   factory's own lifecycle endpoint, preserving CAS/canonical-response/index-sync behavior (→ Slice 3; proves
   `T-BASE-NO-META-WRITE`, `T-BASE-SERVICE-ACTOR`, `T-LIFECYCLE-CAS`).
4. Delete `agent/run.sh`'s direct memory upload and stand up the dormant create-only quarantine
   publisher; remove `FACTORY_GH_TOKEN` from `scripts/train.sh`/`scripts/self-update.sh`/monitor-issue creation,
   replacing each with its purpose token (→ Slice 4; proves `T-MEMORY-PATH`, `T-MEMORY-CREATE-ONLY`,
   `T-MEMORY-DORMANT`, `T-NO-HOST-SCRIPT-PAT`).

## 4. Approach — vertical slices

Each slice is approximately 4-8 focused hours and lands as a separately reviewable, single-repository PR. Before
editing shared files, the implementer reconciles current HEAD with this spec and with the worker-containment spec
rather than duplicating the credential-boundary/adapter code that already exists for the containment-v2 path. Every
named `T-*` control is an exact top-level test name; each slice's CI runs the full runner suite plus the focused
pattern and retains output showing every named control executed.

### Slice 1 — meta purpose token and legacy-path purpose scoping (6-8h)

**Files to touch:**

- `runner/src/github.ts` (replace module-level `TOKEN` with an injected purpose-bound client)
- `runner/src/containers.ts` (extend `SCOPED_GITHUB_ENV`/purpose set with `meta`; extend deny-by-default boundary to
  spec/reconcile launch plans)
- `runner/src/queue.ts` (remove `legacyCredentialTransport`; route spec/reconcile/non-v2-dev launches through
  purpose-scoped tokens)
- `runner/src/lifecycle.ts` (use the `meta`-purpose client instead of `github.ts`'s shared `gh()`)
- `runner/src/github.test.ts`, `runner/src/queue.test.ts`, new `runner/src/github-purpose.test.ts`
- `.env.example`, `deploy.sh`, `setup.sh` (add `FACTORY_GH_META_TOKEN`; document the four purposes)

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-META-PURPOSE-TOKEN|T-NO-SHARED-TOKEN|T-LEGACY-PATH-SCOPED'
npm test
npx tsc --noEmit
```

Fixtures prove: a spec run's launch plan contains no `FACTORY_GH_TOKEN`/`GH_TOKEN`; a meta commit made during a spec
run uses the `meta`-purpose credential, not the target-purpose credential; two purposes configured with the same
underlying token value fail the startup validator.

### Slice 2 — reject caller-supplied `by`, server-derive actor (3-4h)

**Files to touch:**

- `runner/src/index.ts` (`:683`, `:701-719` — reject `by` for both branches; derive actor solely from
  `res.locals.capability`/credential registry)
- `runner/src/index.test.ts` or equivalent lifecycle route test file
- `runner/README.md` (document the removed field)

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-BY-REJECTED|T-ACTOR-SERVER-DERIVED'
npm test
npx tsc --noEmit
```

Fixtures prove: a `status` transition request with `by` set returns 400 with no GitHub write, for both admin and
non-admin bearers; a `disposition` request with `by` set returns 400; the resulting meta commit actor text always
equals the registered credential-registry label for the authenticated capability.

### Slice 3 — minion-base lifecycle cutover (4-6h, minion-base only)

**Files to touch (minion-base only):**

- `src/lib/server/meta-write.ts` (remove direct Contents-API mutation; keep or reduce to response-shaping helpers)
- `src/lib/server/factory.ts` (new: authenticated client for the factory's `/lifecycle/:kind/:id` endpoint)
- `src/routes/api/meta/status/+server.ts`
- existing server tests for these modules
- deployment/env documentation for the new lifecycle-only service bearer

**Definition of done (machine-checkable):**

```bash
cd <minion-base checkout>
bun test --test-name-pattern='T-BASE-NO-META-WRITE|T-BASE-SERVICE-ACTOR|T-LIFECYCLE-CAS'
bun test
bun run check
```

Tests prove: a revision mismatch returns 409 with no GitHub call from minion-base; success renders the registered
service actor and the factory's canonical committed projection; `by` is never sent; the service bearer never reaches
browser/page data/logs; no production minion-base module can `PUT` `minion-meta` contents directly. If the
repository's actual package scripts differ at implementation-time recon, use its documented equivalents and record
the exact commands in the PR.

### Slice 4 — memory upload cutover and host-script purpose tokens (4-6h)

**Files to touch:**

- `agent/run.sh` (delete the direct memory `gh api PUT`, lines `79-83`)
- `runner/src/memory/candidate-publisher.ts` (new; purpose-bound transport only, create-only semantics)
- `runner/src/memory/candidate-publisher.test.ts` (new)
- `runner/src/queue.ts`, `runner/src/db.ts` (wire the publisher; dormant until memory-governance's validator lands)
- `scripts/train.sh`, `scripts/self-update.sh` (replace direct `FACTORY_GH_TOKEN` use with purpose tokens)
- `runner/src/index.ts` (monitor-issue creation uses the `meta`-purpose client)

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-MEMORY-PATH|T-MEMORY-CREATE-ONLY|T-MEMORY-DORMANT|T-NO-HOST-SCRIPT-PAT'
npm test
npx tsc --noEmit
cd ..
! rg -n 'gh api.*minion-agent-memory' agent
! rg -n 'FACTORY_GH_TOKEN' scripts/train.sh scripts/self-update.sh
```

Fixtures prove: the memory publisher accepts only an exact `<run-id>/<candidate-id>.json` path with matching blob
hash on overwrite (no-op success), rejects any canonical-`minion-agent-memory` target, and production run output
cannot invoke it before memory-governance's validator exists; `train.sh`/`self-update.sh` no longer read
`FACTORY_GH_TOKEN` from the environment.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| Target repositories (`runner/src/repos.ts` / `repos.json`) | No change — target-purpose scoping already shipped via containment v2 (§1). | Slice 1 only extends the *credential path*, not target-repo behavior. No target-repo source edit required. |
| `minion-meta` | Meta commits move from the shared `FACTORY_GH_TOKEN` to a distinct `meta`-purpose credential; commit authorship/audit actor text becomes strictly server-derived. | Slice 1 (credential) + Slice 2 (actor). Preserve concurrent-writer rebase/retry and native GitHub commit audit unchanged. |
| Private memory-quarantine repository | A candidate-only purpose and create-only JSON namespace are provisioned before M8 activation, matching the already-approved memory-governance spec. | Slice 4. Repo creation/access remains a human-gated provisioning step; do not install the candidate purpose against canonical `minion-agent-memory`. |
| `minion-agent-memory` | Direct worker writes stop entirely (Slice 4 deletes `agent/run.sh:79-83`). | A canonical write from any purpose other than the (future, memory-governance-owned) promotion path is a failing adversarial test. |
| `minion-base` | Current status/disposition mutations bypass factory auth and write minion-meta directly with `env.GITHUB_TOKEN`; `by` stays invalid there too until this spec's Slice 3 lands. | Slice 3 routes mutations through a lifecycle-only service credential, preserves revision CAS/canonical responses. Read-only GitHub-access narrowing is explicit later scope (§8), not blocked here. |
| Other lifecycle API callers | Unknown fields including `by` become 400; server actor labels become credential-registry ids for every caller, not only minion-base. | Slice 2. Inventory other callers before strict cutover; log rejected field names only, never body values. |
| Self-update and monitor intake, promotion train | `scripts/self-update.sh`, monitor issue creation, and `scripts/train.sh` currently depend on the shared PAT. | Slice 4. Self-update/monitor use the `meta` purpose; `train.sh` uses a fixed-pair `train` purpose that cannot push/merge or accept repo/ref input. |
| Worker containment (separate spec) | Shares the deny-by-default credential boundary and trusted-adapter code this spec extends. | Coordinate slice ordering with `2026-08-18-factory-worker-containment-spec` implementers so neither duplicates the other's boundary/adapter code (§0 relationship recommendation). |
| Gateway protocol, shared DB, hub/site auth, UI | No protocol/schema/UI change. | Per the Cross-Project Impact Zones table, no fan-out to `@minion-stack/shared`, hub, site, paperclip, or gateway is required. |

## 6. Explicit out of scope

- Seccomp, general egress filtering, rootless Docker, Docker socket proxying, and host isolation (worker-containment
  spec).
- Full review-container/read-only-checkout and credential-free setup/self-test physical isolation
  (worker-containment spec) — this spec covers *credential* separation only.
- Topic taxonomy and risk calculation (topic-capability-manifest spec, already shipped).
- Memory scanning, human approval, canonical promotion, retention, and calibration (memory-governance spec).
- GitHub Apps, App JWTs, installation-token minting, or any new `CapabilityGrantEnvelope`-style authority table —
  explicitly rejected as the mechanism for this pass (§0, §2).
- Narrowing minion-base's remaining direct GitHub *read* access to a mechanically read-only credential — real,
  valuable follow-on work, but independent of and not blocking the write-path cutover in Slice 3 (§2 invariant 5).
- Browser stages, multi-repo DAGs, release signing/provenance, application-deployment credentials, and product-release
  canary/rollback policy.
- GitHub user OAuth, display-name impersonation resolution, or changing the minion-base UI.
- Enabling automerge or bypassing human approval/merge gates.

## 7. End-to-end verification

1. Confirm the four purpose credentials (`checkout`, `branch`, `workspace`, `meta`) are configured and distinct;
   confirm the startup validator fails closed on a missing or duplicated purpose.
2. Queue one spec run and one reconcile run. Verify their launch plans and Docker argv contain no `FACTORY_GH_TOKEN`/
   `GH_TOKEN`, and that any meta commit they make records the `meta`-purpose actor.
3. Execute one authenticated lifecycle transition without `by`; verify the meta commit/event actor equals the
   credential-registry label. Repeat with `by` set (both `status` and `disposition` shapes); verify 400 with no
   GitHub write, for admin and non-admin bearers.
4. Through a minion-base fixture, verify revision CAS, the new service-bearer actor, the canonical committed
   response, and the absence of any direct `meta-write.ts` PUT.
5. Invoke the dormant quarantine publisher with one runner-validated JSON fixture. Verify a create-only candidate
   appears at `<run-id>/<candidate-id>.json` in the separate private repository; overwrite and canonical-memory
   attempts fail; verify ordinary run output (including `agent/run.sh`) cannot invoke it.
6. Trigger the configured promotion-train and self-update fixtures. Verify the train can only compare its fixed pair
   / create a draft PR, and self-update reads only its configured factory source and files only via the `meta`
   purpose.
7. Run the full runner and minion-base CI/typecheck gates plus every `T-*` control named in §4; search deployment,
   runner, agent, and host-script sources/config for remaining `FACTORY_GH_TOKEN=`/bare `GH_TOKEN=` injection outside
   test files.

## 8. Rollout and rollback

Land Slices 1-4 with `FACTORY_AUTOMERGE=0` throughout; no new feature flag is required beyond the existing
`FACTORY_CONTAINMENT_V2` (which continues to gate the *physical*-isolation half of the related worker-containment
spec, not this spec's credential purposes — §2 invariant 8). After Slice 4 lands and the full evidence chain in §7
is green, revoke the broad `FACTORY_GH_TOKEN` from every consumer inventoried in §1 point 4 and make missing
purpose-credential configuration a startup failure. If production regresses, stop new intake and all GitHub writes,
preserve `phase_effects` evidence, and roll back the release while keeping write paths disabled; restoring the
broad `FACTORY_GH_TOKEN` to any worker or host script, or restoring minion-base's direct `meta-write.ts` path, is
not an acceptable rollback.

Follow-on, explicitly out of scope for this spec's approval (§6): narrowing minion-base's remaining GitHub *read*
access to a mechanically read-only credential.

## Board audit 2026-08-28 (superseded by this pass — kept for history)

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Returned to draft for respec: the GitHub-App + publisher-module mechanism was superseded by scoped PATs (scoped-github-canary.ts) + the effect ledger. Live deltas worth keeping: caller-supplied `by` at index.ts:648,663; retiring the broad FACTORY_GH_TOKEN; minion-base cutover; memory candidate publisher.

## Board respec 2026-08-29 (this pass)

Reviewed at exact pre-review blob `6be58a23e2730f89313b8a527237b4aeaed2830d` per operator task. Verified against
`minion-factory@5db7d391` (main, PR #153 merged), `minion-base@19531059`, and closed/unmerged `minion-factory` PR
#29. Disposition: **`status: review`, `verdict: changes_requested`** — not `approved`, because this pass rewrites
AS-IS/TO-BE/DELTA/Approach around the landed scoped-credential foundation and needs one more correctness review pass
(exact file/line anchors, `T-*` test names, and DoD commands re-verified against the actual runner test suite at
implementation time) before product code may start; not `rejected`/`archived`, because the source proposal's
security gap (§1 points 4-6) is real, unresolved, and independently corroborated by
[[factory-moving-origin-strategy-implementation]]'s 2026-08-28 board audit entry. No product code was implemented as
part of this pass.
