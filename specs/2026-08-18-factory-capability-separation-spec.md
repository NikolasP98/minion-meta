---
id: 2026-08-18-factory-capability-separation-spec
title: Factory capability separation — purpose-scoped GitHub credentials, run-bound grants, and server-derived actors
stage: spec
status: review
pass: 9
created: 2026-08-18
updated: 2026-08-30
proposal: 2026-08-17-factory-capability-separation
verdict: pending
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

The interim security outcome is **not containment-equivalent** to pass 2's design. Pass 3 adopted long-lived purpose
PATs rather than pass 2's short-lived, run/repo/branch/action-bound grant. This pass removes the fleet-wide write-PAT
part of that deviation: each target-repository write purpose is configured as a runner-side repository→token map,
and every mapped token must have a provider-visible grant for exactly one repository. The remaining losses are still
material and explicit: a token is shared across runs for that repository, survives until operator rotation, is not
provider-bound to the run's one ref, and permits every action GitHub derives from its permissions. Contents-write
makes `github-branch`, `github-workspace-prepare`, and `github-merge` provider-capable of both pushing and merging
unless independently verified repository rulesets deny an action to that principal. The trusted adapter narrows
normal calls but cannot constrain a stolen token used directly. Exact provider evidence makes these excess lifetime,
ref, and action authorities visible; it does not remove them. The human approval gate must explicitly accept or
reject each loss for all three target-repository write purposes (§2 invariant 1a and H4). Server-derived actor
identity remains enforced and the product continues to require a human merge gate at the application layer.

**Pass-3 respec note (2026-08-29).** Passes 1-2 designed this as a GitHub-Apps/installation-token architecture with
a new `CapabilityGrantEnvelope` authority table. That specific mechanism is superseded: `minion-factory@5db7d391`
(main, PR #153 merged) has since landed a *different* implementation of the same "purpose-separated credential +
trusted publisher" idea — long-lived purpose-scoped PATs (`FACTORY_GH_CHECKOUT_TOKEN` /
`FACTORY_GH_BRANCH_TOKEN` / `FACTORY_GH_WORKSPACE_PREPARE_TOKEN`), a deny-by-default worker credential boundary, a
trusted runner-owned effect adapter (`runner/src/containment-effects.ts`), an activation canary
(`runner/src/scoped-github-canary.ts`), and a durable per-run ledger (`pipeline_instances` / `phase_effects` in
`runner/src/db.ts`) that plays the role passes 1-2 assigned to the envelope table — but only for `dev`-kind runs
with `FACTORY_CONTAINMENT_V2=1` (default `0`). Pass 3 did not reopen that design; it verified it and rescoped the
spec's remaining work to extend that landed mechanism rather than build a parallel GitHub-App identity system.

**Pass-4 executability note (2026-08-29).** Pass 3's framing survives review; its *plan* did not. A cross-provider
review of pass 3 (PR #271, `VERDICT: FAIL`) found the four slices non-executable on three counts, each of which
pass 4 re-verified independently against the same pinned commits before acting on it:

- **The credential removal had no publication path.** Pass 3's Slice 1 deleted `legacyCredentialTransport` while
  `agent/spec.sh`, `agent/reconcile.sh`, `agent/discovery.sh`, and `agent/chat.sh` still own the only clone-and-push
  protocol the factory has for `minion-meta`, and the trusted adapter's binding is dev-candidate-shaped only. The
  slice would have passed its own DoD (no token in argv) and then failed on the first `git push`. Pass 4 adds the
  runner-owned meta publication protocol as its own slice, *before* the downgrade (§2 invariant 2, §4 Slice 2).
- **The minion-base cutover depended on a server that does not exist.** Pass 3's Slice 3 was "minion-base only",
  but the factory has no lifecycle-only principal, ignores any caller-stated revision, enforces a *different*
  transition table than the dashboard, and returns `{ok, commit}` rather than a canonical projection. Pass 4 adds
  the factory-side slice that must land and deploy first (§2 invariant 6, §4 Slice 4).
- **The purpose registry was not closed.** Four purposes were declared, then memory and train purposes were used
  without being registered or provisioned, and `self-update.sh`'s three distinct authorities were all assigned to a
  `minion-meta`-only credential. Pass 4 replaces this with one exhaustive registry table mapping every inventoried
  operation to a purpose, env var, capability, and scope (§2 invariant 1).

Pass 4 also corrects pass 3's inventory (discovery and chat runs were missing; monitor intake lives in
`runner/src/monitor.ts`, not `runner/src/index.ts`) and its anchors. See §1 for the evidence and §4 for the
re-sliced plan.

**Pass-5 hardening note (2026-08-29).** A second cross-provider review of pass 4 (PR #271, `VERDICT: FAIL` again)
found four high-severity and one medium finding that survive against the same pinned commits, plus one low finding
in the spec's own DoD text. Every finding was re-verified this pass from **fresh** clones of
`minion-factory@5db7d391` and `minion-base@19531059` — not accepted on the reviewer's word — and all six are
confirmed real:

- **H1 (non-v2 dev loses its only write transport).** Confirmed: invariant 3 downgraded all five launch paths
  including `dev` to read-only, but the runner-owned publication protocol invariant 2 built only replaces the
  meta-writing agents' transport (`spec.sh`/`reconcile.sh`/`discovery.sh`/`chat.sh`), not `agent/run.sh`'s
  target-repository branch push + draft PR (confirmed at `run.sh:107,123,266-275,383,460-461`; the container "holds
  only GH_TOKEN (repo-scoped)" per `run.sh:4`, and every one of those call sites needs write authority).
  §2 invariant 9 already (correctly) excluded `dev` from the "purpose tokens unconditionally" list — invariant 3
  contradicted it by including all five paths anyway. Fixed by making `dev`'s downgrade conditional on
  containment v2 being verified active for 100% of dev dispatch, with the runner failing dev dispatch closed — never
  silently forwarding a write credential — when it is not (§2 invariant 3, §4 Slice 2).
- **H2 (worker-writable checkout crosses into the trusted apply phase).** Confirmed: the runner-mounted checkout the
  worker edits was also the checkout the runner would later apply/commit/push from and run
  `scripts/spec-index.mjs` against, so worker-side tampering outside the declared candidate (a hook, `.git/config`,
  a shadowed copy of the index generator) could reach trusted execution. Fixed by splitting the mount into a gitless
  worker snapshot (edit surface only; bytes exit through the bounded candidate artifact) and a separate
  runner-private checkout the worker never touches, which the trusted apply/commit/push/index-regeneration phase now
  always runs against (§2 invariant 2, §4 Slice 2, new `T-META-APPLY-CHECKOUT-ISOLATED`).
- **H3 (minion-base keeps the admin bearer outside `/lifecycle/*`).** Confirmed: `factory.ts:149`'s single
  `FACTORY_SECRET` backs every dashboard call — runs/history, stats, trigger-health, providers, `pipeline/spec`,
  `pipeline/reconcile`, `runs` creation, and `chat/*` (`factory-path.ts`'s `ALLOWED` regex, `+page.server.ts`,
  `stats/+page.server.ts`, `settings/+page.server.ts`, `api/meta/status/+server.ts`) — not just lifecycle mutations.
  Fixed by adding two more scoped principals alongside `lifecycle` (`dashboard-read`, `dashboard-run`), each with
  its own fixed route allowlist in the same shape as the existing `UNSTICK_ROUTES` precedent, and requiring
  minion-base to drop `FACTORY_SECRET` from its deployment entirely, not just from the `/lifecycle/*` call site
  (§2 invariant 7, §4 Slices 4-5).
- **H4 (long-lived PATs vs. the approved run-bound contract).** Confirmed as a real, previously under-stated
  deviation from the source proposal's DoD. This pass stops claiming an unchanged security outcome (§0 above), names
  the deviation for the human approval gate, and adds a negative-scope canary requirement as a hard activation gate
  — a purpose is not "active" until it is proven *denied* on a repository/action outside its declared scope, not
  just present and pairwise-distinct (§2 invariant 1a, §4 Slice 1, new `T-PURPOSE-NEGATIVE-SCOPE`).
- **M1 (`phase_effects` cannot represent the promised receipts).** Confirmed for `meta-publish` (no such
  `PhaseEffectKind`, no purpose/target-repo columns) but **not** for lifecycle/monitor: both already have their own
  durable idempotency records outside `phase_effects` — the lifecycle commit itself (git history + the CAS-checked
  canonical response, invariant 6) and `monitor_events` (fingerprint-deduped, `runner/src/monitor.ts`, verified to
  predate this spec) — so folding them into `phase_effects` too would duplicate an existing mechanism, not fill a
  gap. Fixed by narrowing invariant 8 to the run-bound credentialed effects the table can represent (target push/PR,
  meta publication, memory-candidate PUT) with additive `purpose`/`target_repo` columns and two new kinds, and
  pointing lifecycle/monitor evidence at their existing mechanisms instead (§2 invariant 8).
- **L1 (Slice 1's deploy gate skips one of the four writers it claims to check).** Confirmed: the DoD loop grepped
  `.env.example`/`deploy.sh`/`setup.sh` only, and `deploy/k8s.yml` was independently verified to already carry three
  of the existing purpose env vars, so the omission is a real gap, not a non-issue. Fixed by adding `deploy/k8s.yml`
  to the loop (§4 Slice 1).

No product code was implemented this pass either, for the same `tags: [security, infra]` reason pass 4 gave.

**Pass-6 executability note (2026-08-29).** A third cross-provider review of pass 5 (PR #271, `VERDICT: FAIL` again)
found two High findings and one Medium finding, all re-verified this pass from **fresh** clones of
`minion-factory@5db7d391` (still the current pinned commit — re-confirmed by cloning it again this pass) before being
acted on, not accepted on the reviewer's word:

- **H1 (the gitless worker snapshot cannot run any of the four meta agents).** Confirmed, and worse than stated: it
  is not only the write-allowlist gate that needs a live worktree. Re-read at the pinned commit, `agent/spec.sh`'s
  `require_exact_changes` (`:47-74`) hard-fails unless `git rev-parse --is-inside-work-tree` and a captured
  `git status --porcelain=v1 -z` both succeed, is called **four times** across the two passes (`:366,369,424,427`),
  and the normal path also needs two `git add`/`git commit` pairs and a `git rev-parse HEAD` (`:373-375,434-436,445`).
  `agent/reconcile.sh:407-424,528-532`, `agent/discovery.sh:149-165`, and `agent/chat.sh:64-83` all use the same
  `git status`/`add`/`commit`/`show` shape to detect and checkpoint what they publish. A read-only, gitless mount
  cannot serve any of that — pass 5's H2 fix (§2 invariant 2, splitting worker snapshot from runner-private checkout)
  solved the trust problem and broke the substrate problem in the same edit. Invariant 2 is rewritten below: the
  worker's edit surface is now a **writable, credential-free, remote-stripped git worktree** — `require_exact_changes`
  and the commit-checkpoint flow run **unmodified** inside it — while the runner-private checkout (never
  worker-reachable) stays exactly as pass 5 specified, so `T-META-APPLY-CHECKOUT-ISOLATED` is unaffected. Two new
  controls prove the worktree is genuinely git-capable (`T-META-WORKTREE-WRITABLE`) and genuinely cannot reach GitHub
  (`T-META-WORKTREE-NO-EGRESS`).
- **H2 (one negative probe cannot prove exact scope).** Confirmed: invariant 1a's single 403/404 sample against one
  out-of-scope target does not rule out a purpose token also holding access to a *different* forbidden repository or
  action, and does not distinguish "correctly denied" from "target does not exist" when the probing token itself
  cannot see the target either way. Rewritten below into a provider-backed scope audit: every in-fleet repository
  outside a purpose's declared scope is enumerated and probed, each forbidden target's existence is confirmed by a
  control independent of the token under test, representative forbidden action classes are probed on *allowed*
  repositories too, and the resulting evidence is bound to the token's provider-reported fingerprint so a rotation
  invalidates stale evidence (`T-PURPOSE-NEGATIVE-SCOPE` redefined; new `T-PURPOSE-SCOPE-FINGERPRINT-BOUND`).
- **M1 (lifecycle CAS is optional, so a caller can bypass the stale-decision guard).** Confirmed: invariant 6 made
  `expectedStatus`/`expectedRevision` acceptable-if-present rather than required, and Slice 4's DoD only tested
  mismatches, never omission. Checked for a compensating internal caller and found none needed one: the only
  in-process callers of `transition()` that do not go through this HTTP route (`runner/src/lifecycle.ts:263,454`
  auto-triage, `runner/src/index.ts:106` postmerge-close) already construct and pass their own `expectedStatus`
  directly to the function, never through the HTTP boundary — making both fields mandatory at the route only closes
  the caller-omission gap `src/routes/api/meta/status/+server.ts:18-31` and `meta-write.ts:90-119` prove is reachable
  today, with no internal caller to break.
- **M2 (the dashboard-run principal omits `PUT /providers`), confirmed as a live route regression** was also raised
  by this review. `runner/src/index.ts:731,735` serve both `GET /providers` and `PUT /providers`; invariant 7's route
  split had only ever listed the `GET`. Fixed by adding `PUT /providers` to `dashboard-run`'s allowlist.
- **M3 (`meta-publish` has no crash-window reconciliation identity), also raised**, is fixed by giving the new
  `meta-publish` effect the same `reserve → (perform | reconcile) → confirm` shape `push`/`pr-create` already use
  (`runner/src/db.ts:1912-1955`, `containment-effects.ts:146-175`'s `ensureExactPush`/`observe` precedent): a bounded
  runner-derived `{run_id, candidate-hash}` marker is trailered into every published commit, and `reconcile()` walks
  branch history from current HEAD (bounded depth, back to the pinned base) for a commit carrying that trailer —
  independent of how far a concurrent writer has since moved HEAD.

This pass's findings target the same invariants and slice (§2 invariant 2, §4 Slice 2 for H1; §2 invariant 1a, §4
Slice 1 for H2; §2 invariant 6, §4 Slice 4 for M1; §2 invariant 7, §4 Slices 4-5 for M2; §2 invariant 8, §4 Slice 2
for M3) rather than introducing new ones — see those sections for the rewritten text. No product code was
implemented this pass either, for the same reason passes 4-5 gave.

### Relationship recommendation

**Recommendation: `extends`, revised.** The source proposal is still not fully satisfied, but less of it is open
than passes 1-2 assumed:

- `2026-08-18-factory-topic-capability-manifest-spec` — **now `shipped`** (was the M3 prerequisite for an
  execution-manifest hash). No longer a blocker; the manifest hash it supplies is available for any future envelope
  work, though this pass's slices do not need a new envelope (§2).
- `2026-08-18-factory-durable-state-outbox-spec` — still `implementing` / `changes_requested`. Two-part relationship:
  this spec's *evidence* work extends the already-landed `pipeline_instances`/`phase_effects` tables
  (`db.ts:757-813`) and does not wait on that spec, since those tables exist and are load-bearing for the lineage
  orchestrator today. But that spec's §8 owns the lifecycle **transition-policy** decision (`TODO(handoff)` at
  `runner/src/lifecycle.ts:30-33`), which Slice 4 must touch. Slice 4 therefore *transcribes* the edge table
  minion-base already enforces rather than deciding new policy, and names a human confirmation of that
  transcription as a prerequisite (§4 Slice 4).
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
  path shipped (`runner/src/index.ts:685-707`) and still has the same caller-supplied-`by` gap this spec must close
  for both the `status` and `disposition` request shapes.
- `2026-08-18-sdlc-transformation-roadmap` — unchanged relationship.

## 1. AS-IS

Verified 2026-08-29 against `NikolasP98/minion-factory@main` commit `5db7d3919896042043e63da996d6441ec63db205`
(`5db7d391`, PR #153 merged) and `NikolasP98/minion-base@main` commit `19531059cf42e352e35425dd3b3b71afa9eb540f`
(`19531059`), both read from fresh local checkouts of those repos, plus closed (unmerged)
`NikolasP98/minion-factory` PR #29. Pass 4 re-read every anchor below in those checkouts and corrected the ones
pass 3 got wrong (monitor intake is `runner/src/monitor.ts`, not `runner/src/index.ts`). Re-read HEAD before
implementation; line numbers are anchors, not immutable coordinates.

1. **A purpose-scoped credential + trusted-adapter foundation already exists, gated to one run kind and one flag.**
   For `dev`-kind runs with `FACTORY_CONTAINMENT_V2=1` (`runner/src/queue.ts:439`; flag default `0`, fail-closed —
   `runner/src/containers.ts:1220-1221,1245-1256`; `.env.example:7`), the launch plan uses three distinct purpose
   credentials instead of one broad token. The purposes are a closed, capability-labelled set —
   `GITHUB_PURPOSES = ['github-checkout','github-branch','github-workspace-prepare']` with a
   `GITHUB_CAPABILITY` map (`runner/src/containers.ts:198-208`) — backed by `FACTORY_GH_CHECKOUT_TOKEN` (read),
   `FACTORY_GH_BRANCH_TOKEN` (write: push developed candidate), `FACTORY_GH_WORKSPACE_PREPARE_TOKEN` (write: branch
   + draft PR) (`.env.example:11-13`, `runner/src/scoped-github-canary.ts:27-30`). The load-bearing rule is written
   into that file's own comment: **"Worker phases receive only read credentials. Write purposes stay in the trusted
   runner effect adapter and are never rendered into a model-visible container plan."** A deny-by-default worker
   credential boundary (`GITHUB_CREDENTIAL_NAMES = ['GH_TOKEN','GITHUB_TOKEN']` at `:217`,
   `RESERVED_CREDENTIAL_ENV` + `RESERVED_ENV_PREFIXES` at `:235-251`) enforces it for contained phases.
2. **A trusted, runner-owned effect adapter performs the actual GitHub writes for that path — and its binding is
   dev-shaped only.** `runner/src/containment-effects.ts` (`tokenFor`, `githubRequest`, the
   `applyContainmentRemoteEffects` family) selects the bearer by phase purpose and bounds response size
   (`:255-279`). But `ContainmentEffectBinding.phase` is the closed union
   `'prepare-workspace' | 'develop' | 'reconcile-base'` (`:16-33`), re-validated at `:77`, and every field of the
   binding describes a **single-branch candidate push on one target repo** (`repoSlug`, `base`, `branch`,
   `baseSha`, `priorCandidateSha`, `candidateSha`). Its `ContainmentGitHubRemote` surface is
   `branchHead` / `pushExact` (compare-and-swap against an expected head) / `findPullRequest` /
   `createDraftPullRequest` (`:46-58`). There is **no** multi-file commit operation, no rebase-and-retry
   publication, no issue/comment effect, and no meta-repository binding of any kind. The adapter is therefore not a
   drop-in replacement for what the meta-writing agents do today (point 5).
   `runner/src/scoped-github-canary.ts` (533 lines) is a preflight/activation canary exercising the scoped-credential
   path end-to-end against a dedicated `NikolasP98/minion-factory-canary` repo before rollout — this substantially
   satisfies what pass-2's Slice 6 preflight envisioned, for the paths it covers.
3. **Durable per-run lineage/evidence state already exists**, playing the role pass-2 assigned to a new
   `CapabilityGrantEnvelope` table: `pipeline_instances` (run/attempt/lease/manifest-hash-bound row per run,
   `admission_key_hash` unique) and `phase_effects` (idempotent effect ledger keyed `{run_id, kind, key}`) —
   `runner/src/db.ts:757-813`. Any further authority/evidence record this spec's remaining slices need should be
   additive to these tables, not a parallel schema.
4. **Outside that one gated path, one process-wide `FACTORY_GH_TOKEN` serves every authority the factory has.**
   `runner/src/github.ts:6-16` binds a module-level `TOKEN` constant into every `gh()`/`ghStrict()` call, and that
   one transport is imported by nine runner modules with materially different authorities:

   | Consumer | Operation | Authority actually needed |
   |---|---|---|
   | `runner/src/lifecycle.ts:8,106,131-139,142-168` | meta `contents` read + PUT (spec/proposal frontmatter + `index.json`) | write, `minion-meta` only |
   | `runner/src/monitor.ts:6,69` | `POST /repos/<meta>/issues` (runtime-monitor intake) | write (issues), `minion-meta` only |
   | `runner/src/projections.ts:3-4`, `runner/src/queue.ts:78`, `runner/src/possibly-shipped.ts:20`, `runner/src/reconcile-detector.ts:15`, `runner/src/discovery.ts:11`, `runner/src/reclassify.ts:3`, `runner/src/topics.ts:20` | PR / check-run / commit / contents **reads** across the whole fleet | read, fleet-wide |
   | `runner/src/automerge.ts:532,632,680-681,706,720` | PR read, check reads, **`PUT /pulls/:n/merge`**, issue comment | write (merge), target repos — inert only because `FACTORY_AUTOMERGE=0` |

   The same PAT is additionally injected into containers and consumed by host scripts:
   - `runner/src/queue.ts:2101-2113` (`legacyCredentialTransport`) forwards it as `GH_TOKEN` into **five** launch
     paths, not the three pass 3 listed: `discovery` (`:2192-2206`), `spec` and `reconcile` (`:2207-2231`), every
     `dev` run without containment v2 (`:2232+`), and **chat turns** (`startChatTurn`, `:4038-4043`, which also
     bind-mounts the shared persistent meta clone `/opt/factory/meta:/work`).
   - `agent/run.sh:79-83` uses the inherited `GH_TOKEN` to `gh api -X PUT` memory notes directly to canonical
     `NikolasP98/minion-agent-memory`. The site already carries an accurate `TODO(handoff)` naming
     `2026-08-18-factory-memory-governance-spec` Slice 3 as its owner.
   - `scripts/train.sh:14,19,25,29`; `scripts/self-update.sh:37-40,58-60,68,70-73,91`;
     `scripts/provision-webhooks.sh:24-26`; and the deployment/setup writers `deploy.sh:316`, `setup.sh:102`,
     `deploy/k8s.yml:18`.
5. **The meta-writing agents own their own clone-and-publish protocol, inside the worker container.** This is the
   fact that makes "delete `legacyCredentialTransport`" non-executable on its own. Each meta-writing agent script
   clones `minion-meta` with `gh repo clone` and pushes with `git push`, and each carries its own
   `push_meta()` rebase-and-retry loop that regenerates `specs/index.json` / `proposals/index.json` mid-rebase and
   re-commits before retrying:
   - `agent/spec.sh:242-279` (`push_meta` at `:242`, clone at `:279`), pushed at `:373-375` and `:434-436`;
   - `agent/reconcile.sh:40-68` (`push_meta` at `:40`, clone at `:68`) — which *also* reads other repositories'
     GitHub state directly: `gh run list` (`:93`), `gh run view --log-failed` (`:132`), `gh api repos/…/commits`
     (`:216`) and `gh api repos/…/compare` (`:227`);
   - `agent/discovery.sh:47,95` (same shape, writes `proposals/`);
   - `agent/chat.sh:9-14,43,71` (same shape, over the *shared persistent* `/opt/factory/meta` clone).

   So the credential these containers hold is not incidental: it is the only transport for an operation the runner
   has no code to perform. `agent/spec.sh` additionally implements a fail-closed write allowlist over
   `git status --porcelain=v1 -z --untracked-files=all` (`:51-74`) — the natural basis for a runner-validated
   candidate artifact, and the only existing bound on what a worker may commit to meta.
6. **Lifecycle actor attribution still accepts a caller-supplied string for admin-authenticated callers.**
   `runner/src/index.ts:223-267` performs constant-time bearer matching and derives `res.locals.capability`
   server-side (unchanged since pass 2 — this part is sound). But both lifecycle request shapes still fold in
   request body text when the capability is `admin`:
   - `:700-704` (`disposition` path, which shipped after pass 2 via the base-kanban-possibly-shipped-surface spec):
     `res.locals.capability === 'admin' && typeof by === 'string' && by.trim() ? by.trim().slice(0, 60) : \`api:${capability}\``;
   - `:715-719` (`status` transition path): the identical expression, passed as `transition()`'s `by` argument.

   The human-readable actor text an admin bearer can commit to a meta audit trail is still request-supplied, not
   purely derived from the credential registry. This is the exact `by`-spoof gap named in the source proposal,
   unresolved across two intervening review passes.
7. **The factory's lifecycle endpoint cannot yet be the single audited writer minion-base would cut over to.**
   Three separate gaps, all verified at `5db7d391`:
   - **No lifecycle-only principal.** `runner/src/index.ts:138-267` recognises exactly `admin` (`FACTORY_SECRET`),
     `hook` (reconcile poke + monitor intake), `unstick` (read-only route allowlist), `instance-read`/
     `instance-write`, and `instance-orchestrator`. Nothing narrower than `admin` may reach
     `POST /lifecycle/:kind/:id`. The startup guard at `:164-190` (weak-secret refusal + pairwise-distinct check
     across `FACTORY_SECRET`/`FACTORY_HOOK_SECRET`/`FACTORY_UNSTICK_SECRET`/`FACTORY_WEBHOOK_SECRET`) is the exact
     precedent a new principal must extend.
   - **No caller-stated revision guard.** The route at `:681-729` destructures only
     `{ status, reason, by, disposition }`. `transition()` does accept an optional
     `expectedStatus?: ReadonlySet<string>` (`runner/src/lifecycle.ts:99,110-115`), but the HTTP route never reads
     an expectation from the body and never passes one; there is no blob-SHA (`expectedRevision`) guard anywhere.
   - **No canonical committed projection on the `status` path.** `TransitionResult` is
     `{ ok: true; commit: string }` (`runner/src/lifecycle.ts:49`) and the route answers `{ok, commit}` (`:728`).
     The `index.json` patch that follows the markdown commit is best-effort inside a `try {} catch {}` that
     **swallows failure silently** (`runner/src/lifecycle.ts:142-168`) — the caller is never told the index went
     stale. Only the `disposition` branch returns a projection (`{ok, commit, spec}`, `index.ts:707`).
   - **The two transition tables diverge.** The factory's is a target-only allowlist —
     spec `{approved, retired, superseded, done}`, proposal `{approved, rejected, retired, closed}` — carrying its
     own `TODO(handoff)` deferring the source→target edge table to the human policy decision in
     `2026-08-18-factory-durable-state-outbox-spec` §8 (`runner/src/lifecycle.ts:30-43`). minion-base enforces a
     *source→target edge table* that permits transitions the factory route would reject outright, including spec
     `draft→review`, `approved→implementing`, `implementing→done|superseded`, and proposal `approved→in-spec`
     (`minion-base/src/lib/server/meta-write.ts:64-78`). A naive cutover would 400 the dashboard's live controls.
8. **`NikolasP98/minion-base` writes minion-meta directly *and* already holds the factory admin bearer.**
   - Direct write path: `src/lib/server/meta-write.ts:13-45` (`gh()` using `env.GITHUB_TOKEN`; `getFile`/`putFile`
     against `NikolasP98/minion-meta`'s `dev` branch) and `applyTransition` at `:90-151`, reached only from
     `src/routes/api/meta/status/+server.ts:29-36`. That client is *richer* than the factory endpoint, not poorer:
     it returns typed outcomes `transition_committed | already_applied | revision_conflict | invalid_transition |
     failed` (`:80-86`), guards both the reviewed `status` and the exact contents-API blob `sha` before writing
     (`:112-119`), treats an already-satisfied transition as an idempotent no-write success (`:112`), and reports
     `indexSynced` rather than swallowing it (`:136-150`). The route maps those to 409 / 422 / 500.
   - Over-privileged relay: `src/lib/server/factory.ts:149` sends **`env.FACTORY_SECRET` — the admin bearer** on
     every proxied call, and `src/lib/server/spec-dispose.ts` already relays `POST lifecycle/spec/:id` disposals
     through it. So minion-base today holds two credentials that both exceed its need: a `minion-meta`-writing PAT
     and the factory admin secret.
   - Promotion is duplicated across the two sides: `src/routes/api/meta/status/+server.ts:38-61` calls
     `pipeline/spec` or `runs` itself after an approval (returning `approved_and_queued` / a 202
     `approved_queue_pending`), while the factory route auto-queues dev for the same event
     (`runner/src/index.ts:724-726`). Any cutover must resolve this, not inherit both.
   - minion-base's remaining *read* path (`src/lib/server/github.ts:142`) also uses `env.GITHUB_TOKEN`.
9. **Closed (unmerged) `NikolasP98/minion-factory` PR #29** (`auto: factory-capability-separation-spec S1`, closed
   2026-08-28) is direct evidence for this spec's disposition: its own body records that a prior implementation
   attempt under the pass-1/pass-2 GitHub-App/`CapabilityGrantEnvelope` design was **correctly self-postponed**
   because the M0-M3 authority spine it depended on ("a grant's authority must come from the controller's persisted
   manifest / run lineage ... [and] evidence must flow through the landed M2 outbox-evidence spine") did not exist in
   that repository at the time — "ship no capability code at all" was the conservative, fail-closed right call. That
   specific blocking condition no longer holds: `pipeline_instances` has since landed. But the App-based Slice 1
   design PR #29 was blocked on has independently been superseded by the scoped-token approach in points 1-3, so
   simply "unblocking" PR #29's old design is not the right next step either — hence this respec rather than a resume.
10. Points 1-9 together are the concrete basis for the 2026-08-28 board audit note this file already carried at the
    bottom prior to pass 3 (superseded by this section; kept below for history) and for [[factory-moving-origin-
    strategy-implementation]]'s independent finding from the same day: "capability-separation approved→draft for
    respec (architectures superseded: runs→pipeline_instances; GitHub-Apps→scoped PATs + effect ledger, keep by-spoof
    + broad-token deltas)".
11. **`agent/run.sh` (the `dev` worker) needs write authority for a *different* transport than the meta-writing
    agents — a target-repository branch push and draft PR, not a `minion-meta` commit — and only the
    containment-v2-gated trusted adapter (point 2) can supply that without a worker-held token.** Re-verified at
    `5db7d391`: the script's own header states "the container is the sandbox; it holds only `GH_TOKEN`
    (repo-scoped)" (`run.sh:4`). It uses that token directly: the initial branch push and draft-PR creation
    (`git push -u origin`, `gh pr create --draft`, `run.sh:266-275`), every develop/fix-round push through
    `factory_push()`'s non-fast-forward-aware retry (`run.sh:121-134`, invoked at `:473`), the resumed-branch push
    path (`:107-108`), and the budget-salvage push on early exit (`:460-461`). `runner/src/queue.ts:2101-2113`
    (`legacyCredentialTransport`) is the only credential source for this container — it forwards
    `source.FACTORY_GH_TOKEN` as `GH_TOKEN` unconditionally, for every launch path point 4 lists, `dev` included —
    and `dispatchPreparedRun` (`queue.ts:439`) routes a `dev` run to the containment-v2 path (which does *not* give
    the worker a write token at all; see point 2) only `if (run.kind === 'dev' && containmentV2Enabled())`; every
    other `dev` dispatch — the default, since `FACTORY_CONTAINMENT_V2` defaults to `0` (point 1) — falls through to
    `startLegacy`, which is exactly the write-token path above.

Hard constraints shaping this spec (unchanged from pass 2, reconfirmed 2026-08-29):

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and `/memory/MINION/MEMORY.md` require the controller to own
  truth, prompts not to serve as security boundaries, reviewers to be technically read-only, and
  `FACTORY_AUTOMERGE=0` through M0-M7.
- `/memory/MINION/minion-factory-agent-pipeline.md` records both that `deploy.sh` rewrites `.env` wholesale and that
  concurrent meta writers require push/rebase/retry handling. Purpose separation must preserve that convergence
  behavior without sharing credentials — which is why §2 moves `push_meta()`'s loop to the runner rather than
  deleting it.
- `/memory/MINION/projects-github-repo-link-and-factory-gates.md` requires decisions to exist first in native GitHub
  state and treats a handle from another id-space as requiring its own ownership proof. Routing minion-base
  mutations through the meta lifecycle endpoint must retain commit/blob CAS and return the committed projection; a
  successful UI-only or factory-DB-only decision is not acceptable.
- `/memory/MINION/factory-moving-origin-strategy-implementation.md` (2026-08-28 board audit entry) independently
  reached the same disposition as this respec: architecture superseded, `by`-spoof and broad-token deltas remain
  open. No stronger or conflicting factory-specific memory was found.
- `/memory/MINION/factory/2026-08-27-3832fc44.md` (partial-slice reviews: check for a landed precedent before
  treating "incomplete" as "build it all now") is why §2 extends `containment-effects.ts` and `GITHUB_PURPOSES`
  rather than proposing a second credential subsystem beside them.

### Known unknowns

- The exact fine-grained-PAT permission sets GitHub can express per purpose (§2's registry names the *authority*;
  the implementer maps it to GitHub's permission checkboxes at provisioning time and records the mapping).
- Whether the private memory-quarantine repository exists yet. §2 invariant 4 stays dormant either way; repository
  creation is a human-gated provisioning step owned by the memory-governance spec.
- Whether any lifecycle API caller other than minion-base and the factory's own sweeps exists in production.
  Slice 3's DoD requires that inventory before `by` becomes a hard 400.

## 2. TO-BE

Extend the already-landed purpose-scoped-credential + trusted-adapter pattern (§1 points 1-3) to every run kind and
every non-worker PAT consumer, instead of building a parallel GitHub-App/installation-token identity system. No new
authority table is introduced; `pipeline_instances`/`phase_effects` remain the durable spine. The design rule the
landed code already states — *workers get read credentials, writes live in the trusted runner adapter*
(`runner/src/containers.ts:198-200`) — becomes factory-wide rather than containment-v2-only.

### Target invariants

1. **One closed purpose registry, exhaustive over §1's inventory, validated at startup.** `GITHUB_PURPOSES`
   (`runner/src/containers.ts:201`) and `GITHUB_CAPABILITY` (`:204-208`) are extended so that **every** operation
   inventoried in §1 point 4 maps to exactly one purpose. Closed registry:

   | Purpose | Env var | Capability | Repository/ref scope | Consumers (§1 anchors) |
   |---|---|---|---|---|
   | `github-checkout` (existing) | `FACTORY_GH_CHECKOUT_TOKEN` | read | fleet repos + `minion-meta`: Contents/Actions/Checks read | contained checkout phases; the runner's fleet reads (`projections.ts`, `queue.ts`, `possibly-shipped.ts`, `reconcile-detector.ts`, `discovery.ts`, `reclassify.ts`, `topics.ts`); after Slice 2, the *only* credential in spec/reconcile/discovery/chat containers |
   | `github-branch` (existing purpose, changed transport) | `FACTORY_GH_BRANCH_TOKENS` | write | JSON repository→token map; every token exactly one target repo: Contents write; all refs unless rulesets narrow them | runner adapter candidate push; token selected only after canonical repo lookup |
   | `github-workspace-prepare` (existing purpose, changed transport) | `FACTORY_GH_WORKSPACE_PREPARE_TOKENS` | write | JSON repository→token map; every token exactly one target repo: Contents + Pull requests write; all refs unless rulesets narrow them | runner adapter branch/draft-PR; token selected only after canonical repo lookup |
   | `github-meta` (new) | `FACTORY_GH_META_TOKEN` | write | `NikolasP98/minion-meta` only: Contents + Issues write | `lifecycle.ts` transitions/dispositions; `monitor.ts:69` issue intake; the runner-side meta publication effect (Slice 2); `scripts/self-update.sh:58-60` issue filing |
   | `github-merge` (new) | `FACTORY_GH_MERGE_TOKENS` | write | JSON repository→token map; every token exactly one target repo: Contents + Pull requests write (merge endpoint + comment), all refs; provider-capable of push as well as merge unless rulesets deny it | `automerge.ts:706,720`; token selected only after canonical repo lookup. Inert while `FACTORY_AUTOMERGE=0`, but registered so §8's revocation cannot silently disarm it |
   | `github-factory-source` (new) | `FACTORY_GH_SOURCE_TOKEN` | read | `NikolasP98/minion-factory` only: Contents + Actions read | `scripts/self-update.sh:73,91` |
   | `github-memory-read` (new) | `FACTORY_GH_MEMORY_READ_TOKEN` | read | `NikolasP98/minion-agent-memory` only: Contents read | `scripts/self-update.sh:70-71` host memory pull (never enters a container) |
   | `github-memory-candidate` (new) | `FACTORY_GH_MEMORY_CANDIDATE_TOKEN` | write, adapter-restricted to create-only | the private quarantine repository only | Slice 6's dormant publisher. Must NOT be installed on canonical `minion-agent-memory` |
   | `github-train` (new) | `FACTORY_GH_TRAIN_TOKEN` | write | exactly the registry-declared promotion pairs (today `NikolasP98/minion-ai@DEV→main`, `NikolasP98/minion-site@dev→master`): Contents read + Pull requests read/create | `scripts/train.sh:19,25,29` |

   `scripts/provision-webhooks.sh:24-26` is deliberately **outside** this registry: it is an operator-run
   provisioning script that already falls back to the operator's own `gh auth`. Slice 6 makes that fallback the
   only path (it stops reading `FACTORY_GH_TOKEN`), so §8's revocation does not break it.

   A startup validator (extending the existing weak-secret/pairwise-distinct guard at `runner/src/index.ts:164-190`)
   rejects: a purpose that any *enabled* code path exercises but which is unconfigured; any target-repository map
   missing or adding a registry repository; any malformed/non-canonical repository key; and any two configured
   credential values, including values nested in maps, that are byte-identical. `runner/src/github.ts`'s
   module-level `TOKEN` is replaced by a purpose-and-canonical-repository-bound client factory; no module may
   construct an unlabelled transport or select a target token from caller-controlled text before registry lookup.
1a. **Purpose activation requires a provider-backed scope audit, not one negative sample.** This spec adopts the
   long-lived purpose-scoped PAT mechanism that already shipped in `minion-factory@5db7d391`, narrowed here to one
   repository per target-write token through runner-side purpose/repository lookup, rather than pass 2's
   short-lived, run/repo/branch/action-bound grant design the source proposal's DoD specifies
   (`proposals/2026-08-17-factory-capability-separation.md:21-25`) — a recorded deviation, not a claimed equivalent
   (§0). `runner/src/scoped-github-canary.ts`'s `verifyCommand` performs only *positive* checks against the one
   declared canary repository (`requireOk` calls at `:383-398`). A single negative probe is not evidence of exact
   scope: an over-granted token (e.g. a `github-meta` token that also reaches `minion-factory`) still passes if the
   one probed target is a *third*, still-forbidden repository, and a probe against a nonexistent target returns the
   same 404 a correctly-scoped token would produce, so presence-of-a-403/404 alone proves nothing about a target
   whose existence the probing token cannot itself confirm. Extend the canary into a **scope audit**, run once per
   distinct token value before that value backs any real (non-canary) call:
   - **Compare the provider-visible repository grant to the exact allowlist.** Enumerate the complete paginated set
     of repositories accessible to the credential under test (or query the fine-grained-PAT grant through GitHub's
     organization PAT-administration API using an independently authenticated controller), and compare that set to
     the purpose/token's declared repository allowlist. Every token nested in a target-write map has an allowlist
     containing exactly its canonical map-key repository. Any extra repository, incomplete pagination, unavailable grant
     inventory, or unenumerable access fails activation. The fleet registry and named infrastructure repositories
     remain negative fixtures, but are defense in depth rather than the source of truth for what the token can reach.
   - **Verify existence independently before trusting a denial.** A forbidden target's existence is confirmed by a
     control that does not depend on the token under test — the operator/bootstrap credential the provisioning
     script already runs under, or another purpose's token whose declared scope already covers that target (e.g.
     `github-checkout`'s fleet-wide read). A denial against a target whose existence cannot be independently
     confirmed is not counted as evidence; that target's probe blocks activation until existence is established some
     other way, it does not silently pass.
   - **Use provider permission/ruleset evidence plus disposable canaries for action classes.** A read-capability
     purpose gets a non-destructive write probe on a disposable allowed canary and must be refused. Do **not** claim
     that any Contents-write target-repository purpose is provider-enforced to its adapter action set: GitHub's
     merge endpoint accepts Contents-write, while `github-merge` needs Contents-write for that exact endpoint.
     Record the effective permission set and applicable repository/ref rulesets non-destructively, and exercise
     push and merge behavior for **each of** `github-branch`, `github-workspace-prepare`, and `github-merge` only
     against disposable branches/PRs. Never probe a production PR. Unless an independently verified ruleset denies
     an action to that principal, activation records all three as both push-capable and merge-capable at the provider
     boundary; each trusted adapter's narrower operation surface is defense in depth, not an action-scope guarantee.
   - **Bind evidence to the token's fingerprint.** The provider-reported identity of the credential (fine-grained
     PAT id, or the last verifiable identifier GitHub's API exposes for it) is recorded with the audit result.
     Rotating a purpose's token invalidates its prior audit; the new value must pass its own audit before it backs
     any real call.
   - **Fail closed on any surprise.** Any forbidden probe that returns 2xx, or any forbidden target whose existence
     could not be independently verified, fails activation for that purpose entirely — not just that one probe row —
     and the purpose is reported not-yet-active.

   A purpose is not eligible for §8's revocation gate, and may not back a real (non-canary) call, until its full
   scope audit has run and passed against the current token's fingerprint. For every Contents-write purpose, a
   passed audit does not erase the shared-across-runs lifetime, all-ref scope, or push/merge authority just
   described. This is the compensating control the
   human approval gate should weigh against the long-lived-token deviation named in §0 — it is not a substitute for
   asking the human whether the deviation itself is acceptable.
2. **A runner-owned meta publication protocol replaces in-container clone-and-push, before any credential is
   removed — but the worker keeps a real, git-capable edit surface, because its existing scripts require one.**
   `agent/spec.sh`'s `require_exact_changes` (called four times across its two passes, `:366,369,424,427`) hard-fails
   without a working `git rev-parse --is-inside-work-tree` and a captured `git status --porcelain=v1 -z`
   (`:47-74`), and the normal path needs two `git add`/`git commit` pairs plus `git rev-parse HEAD`
   (`:373-375,434-436,445`); `agent/reconcile.sh:407-424,528-532`, `agent/discovery.sh:149-165`, and
   `agent/chat.sh:64-83` use the same shape. A read-only or gitless mount cannot serve any of that — it is not
   merely a missing convenience, it is a guaranteed first-write failure. For every meta-writing run kind (`spec`,
   `reconcile`, `discovery`, `chat`):
   - The **runner** prepares two things before the worker starts: (a) a **writable, remote-stripped and
     write-credential-free git
     worktree** checked out at the pinned base commit — a real `.git/` directory with ordinary `status`/`add`/
     `commit`/`diff`/`show` behaviour, but with every remote removed (no `origin`, no credential helper, no
     `GIT_TERMINAL_PROMPT`-bypassing write token) so remote-based `git push`/`git fetch` fails locally —
     mounted into the worker as its edit surface, and (b) its **own private checkout** of the same pinned commit,
     held entirely outside any worker-reachable mount or volume. The pinned base commit is recorded by the runner,
     never claimed by the worker. Both worktrees start from byte-identical content; only (a) is git-backed for the
     worker's benefit.
   - The worker edits the worktree with **no write credential present** and runs its **existing, unmodified**
     write-allowlist survey and commit-checkpoint flow inside it — the same `require_exact_changes`/`git add`/
     `git commit` calls each script already makes — producing one or more ordinary local commits on top of the
     pinned base. It never runs `gh repo clone` (the worktree is pre-provisioned) and never calls `push_meta()` or
     `git push` (there is no remote to push to). After the local commits are made, the script serializes them into
     the existing `/out` directory (`/out/meta-candidate.json`) using ordinary git plumbing against its own
     worktree — `git log`/`git diff-tree --no-commit-id --name-status -r`/`git show <sha>:<path>` — into ordered
     commits of `{message, files[]}`, where each file entry is a discriminated operation:
     `{path, operation: 'upsert', content}` or `{path, operation: 'delete'}`. Upserts carry their own bounded byte
     content (not a path reference into the shared mount); deletes carry no content and are emitted from `D` status
     without calling `git show <sha>:<path>`. Renames are serialized as a delete of the old path plus an upsert of
     the new path. Every path passes the run kind's write allowlist (the same allowlist
     `agent/spec.sh:51-74` already computes and enforced live via `require_exact_changes` before serialization).
     For an upsert, the child entry is a regular file within declared size/count bounds. For a delete, the runner
     verifies against the pinned parent/base tree that the path existed as a regular allowlisted file; deleting a
     missing path, directory, symlink, or non-allowlisted path fails closed. No operation may target a path escape,
     `.git/`, or `scripts/`. The runner never reads, executes, or trusts anything from the worker's worktree itself
     after the worker exits — not its `.git/hooks`, not its `.git/config`, not a shadowed copy of
     `scripts/spec-index.mjs` the worker might have planted — only the bytes inside the validated artifact the
     worker emitted. The worker's local commits and its worktree's git history have no bearing on what the runner
     applies; they exist only so the scripts' own survey/checkpoint logic keeps working.
   - After the worker exits, the **runner** validates the artifact's bytes against that allowlist independently
     (rejecting on any violation with no GitHub call — `T-META-CANDIDATE-BOUNDED`), applies them onto its **own
     private checkout** from the first bullet — never the worker's worktree — applying upserts atomically and exact
     deletes only after the parent-tree validation above, then regenerates `specs/index.json` /
     `proposals/index.json` by running the meta repo's own `scripts/spec-index.mjs` / `scripts/proposal-index.mjs`
     from that same runner-private checkout under a minimal allowlisted environment (so the committed index and the
     generator that produced it are never worker-influenced), commits with a server-derived author, and pushes with
     `github-meta`. On a non-fast-forward it performs the same `pull --rebase` → regenerate → retry convergence
     `push_meta()` performs today, bounded to the current retry count, still entirely inside the runner-private
     checkout.
   - The effect is expressed as a new `containment-effects.ts` binding variant (extending the `phase` union at
     `:16-33` and its validator at `:77`, reusing `tokenFor`/`githubRequest`'s bounded-response primitives) and
     records an idempotent `phase_effects` row carrying a bounded `{run_id, candidate-hash}` publication marker
     trailered into the commit it pushes, so a crash between push and confirmation can be reconciled by identity
     rather than by branch position (invariant 8).
3. **After invariant 2 lands, no GitHub *write* credential reaches a worker/harness container for the four
   meta-writing run kinds on any deployment.** `legacyCredentialTransport` (`queue.ts:2101-2113`) is not deleted but
   **downgraded** for `discovery`, `spec`, `reconcile`, and `chat`: it forwards `github-checkout` (read) only. The
   deny-by-default boundary (`GITHUB_CREDENTIAL_NAMES`, `RESERVED_CREDENTIAL_ENV`) is extended to those four launch
   plans. `agent/reconcile.sh`'s fleet reads (`gh run list`, `gh api …/compare`) legitimately continue inside the
   container on that read-only credential — that is exactly the capability label the landed design grants workers.

   **The fifth launch path — `dev` without containment v2 — is handled differently, not silently folded into the
   above.** Its write need is a different transport than meta publication: a target-repository branch push and
   draft PR via `agent/run.sh` (§1 point 11), which only the already-landed, containment-v2-gated trusted adapter
   (§1 point 2) can serve without a worker-held token. Downgrading it on the same unconditional schedule as the four
   meta paths would deterministically break every default (`FACTORY_CONTAINMENT_V2=0`) dev run at its first
   `git push` — pass 3's original H1 mistake, repeated for a fifth path pass 4 itself introduced. Instead: once this
   invariant's implementation (Slice 2) is active, the runner **refuses to dispatch a `dev`-kind run under the
   legacy (non-v2) path at all** — failing closed with a queue-time error, never falling back to a write-capable
   legacy credential. `dev` runs therefore require `FACTORY_CONTAINMENT_V2=1` verified active from Slice 2 onward;
   until an operator makes that flip, `dev` dispatch is unavailable rather than credential-downgraded-and-broken.
   This is the fail-closed alternative to building a second, parallel target-repo publication protocol when one
   (the v2 adapter) already exists and only needs to become mandatory.

   **"Verified active" is a proof obligation, not a flag read.** Making the fail-closed gate ship without it would
   only move H1's outage from "dev runs break at `git push`" to "dev runs are refused and nothing replaces them".
   The v2 adapter's binding covers a single-branch candidate push (§1 point 2), while `agent/run.sh` publishes at
   **four** distinct moments (§1 point 11): the initial branch push + draft-PR creation (`:266-275`), each
   develop/fix-round push (`:121-134,473`), the resumed-branch push (`:107-108`), and the budget-salvage push
   (`:460-461`). Before the admission gate lands, Slice 2 must prove the containment-v2 dev path already serves all
   four — and, for any moment it does not, close that gap inside Slice 2 rather than assuming coverage
   (`T-DEV-V2-PUBLICATION-COMPLETE`, §4 Slice 2 prerequisites; operational activation named in §8).
4. **No direct memory write from worker code.** `agent/run.sh:79-83` is deleted. A runner-owned, create-only
   publisher accepts runner-validated bytes plus runner-owned run/candidate ids and targets the separate private
   quarantine repository at `<run-id>/<candidate-id>.json`, consistent with the approved
   `2026-08-18-factory-memory-governance-spec`. It stays dormant (no production caller) until that spec's schema/
   scanner/promotion contract lands, and cannot reach canonical `minion-agent-memory`.
5. **Server-derived actors only.** `by` is rejected (400) at the `/lifecycle/:kind/:id` HTTP boundary regardless of
   caller capability, on both the `status` (`index.ts:715-719`) and `disposition` (`:700-704`) branches. Commit/
   audit actor text is generated solely from `res.locals.capability`/the credential registry entry — never from
   request JSON, even for the admin bearer.
6. **The factory lifecycle endpoint becomes a complete single writer *before* minion-base depends on it.** All of
   the following are factory-side work (§4 Slice 4), not minion-base work:
   - **A lifecycle-only principal.** `FACTORY_LIFECYCLE_SECRET` yields capability `lifecycle`, authorised for
     exactly `POST /lifecycle/spec/:id` and `POST /lifecycle/proposal/:id` and nothing else (same route-allowlist
     shape as `UNSTICK_ROUTES`, `index.ts:206-214`). It joins the weak-secret and pairwise-distinct startup checks
     at `:164-190`, and its actor label is a fixed registry string (`base-dashboard-v1`).
   - **Caller-stated revision CAS is mandatory, not optional.** `POST /lifecycle/:kind/:id` **requires** both
     `expectedStatus` (string) and `expectedRevision` (contents-API blob sha) on every HTTP request, for both the
     `status` and `disposition` shapes; either missing returns **400** before any GitHub read or write — an omission
     is never treated as "no expectation," it is a malformed request. When both are present they are validated
     against the freshly-read file *before* any write, answering **409** `{outcome:'revision_conflict',
     current:{status, revision}}` on mismatch — preserving the guard `minion-base/src/lib/server/meta-write.ts:112-119`
     provides today, but closing the gap that guard's *optionality* left open: `api/meta/status/+server.ts:18-31`
     types both fields optional and `meta-write.ts:90-119` only checks them when present, so an authenticated caller
     that omits both can overwrite a newer human decision today. Making them mandatory at the HTTP boundary closes
     that without touching any in-process caller: `transition()`'s only callers that do not go through this route —
     `runner/src/lifecycle.ts:263,454` (auto-triage) and `runner/src/index.ts:106` (postmerge-close) — already
     construct and pass their own `expectedStatus` directly to the function, never through the HTTP body, so this
     requirement has no effect on them.
   - **Idempotent replay, including every mutation crash window.** Every request carries a caller-generated
     `requestId`; before the GitHub write, the server durably reserves a `pending` lifecycle-request row keyed by
     `{principal,requestId}` and bound to a canonical hash of the **entire** behavior- and audit-bearing request:
     `kind`, `id`, the discriminated `status | disposition` shape and value, `reason`, `expectedStatus`, and
     `expectedRevision`. The lifecycle commit carries a bounded `{principal,requestId}` marker. On retry/restart, a
     pending request is reconciled against GitHub commit history before CAS is re-evaluated or another PUT is
     attempted. Once the commit is found, index synchronization and approval promotion resume as idempotent durable
     steps; only after both have a recorded outcome does the request become `confirmed` with its canonical response.
     Reusing the key with any changed field — including reason-only changes or switching status/disposition shape —
     is 409 with no GitHub call. An exact retry returns the confirmed response, or reconciles and completes a
     pending request, even when the original write committed and its HTTP response was lost. A distinct request
     whose current status already equals the target answers 200
     `{outcome:'already_applied', revision}` with no write.
   - **An explicit source→target edge table.** The factory's target-only allowlist (`lifecycle.ts:34-43`) is
     replaced by the edge table minion-base already enforces (`meta-write.ts:64-78`), **adopted verbatim as the
     interim policy** because it is the behaviour humans use today; anything narrower silently removes live
     dashboard controls. This is the decision `lifecycle.ts:30-33`'s `TODO(handoff)` defers to
     `2026-08-18-factory-durable-state-outbox-spec` §8 — Slice 4 does not decide new policy, it *transcribes the
     shipped one* and names the human confirmation as a gate (§4 Slice 4 prerequisites).
   - **A canonical committed response.** The `status` path returns the same shape the `disposition` path already
     does plus the index outcome: `{outcome, commit, revision, indexSynced, spec}`. The index patch stops
     swallowing its own failure (`lifecycle.ts:142-168`) and reports `indexSynced: false` instead.
   - **One promotion, not two.** Because the route already auto-queues dev on spec approval (`index.ts:724-726`),
     the response carries that outcome (`runId` or a pending reason) so the caller does not queue a second run.
7. **minion-base stops writing minion-meta directly and stops holding the factory admin bearer *for any call*, not
   only `/lifecycle/*`.** `src/lib/server/meta-write.ts`'s `putFile`/Contents-API mutation path is removed;
   `applyTransition` becomes a thin client of the factory endpoint contract in invariant 6, keeping its
   typed-outcome surface so `src/routes/api/meta/status/+server.ts:29-36`'s 409/422/500 mapping is unchanged from a
   browser's point of view, and dropping its own promotion calls (`:38-61`) in favour of the server's.

   `FACTORY_SECRET` reaching minion-base at all is the residual gap, not just its use on `/lifecycle/*`: the single
   `factoryFetch` transport (`factory.ts:139-170`) sends it on *every* proxied call, and those calls are not only
   lifecycle mutations — `loadRunHistoryListing` (`:68-76`, `GET /runs`), `+page.server.ts` (`stats`,
   `trigger-health`), `stats/+page.server.ts` (`stats`), `settings/+page.server.ts` (`providers`),
   `api/meta/status/+server.ts` (`pipeline/spec`, `runs` creation), and the generic `api/factory/[...path]` proxy
   (`ALLOWED` pattern in `factory-path.ts`: `chat`, `runs`, `pipeline/spec`, `pipeline/reconcile`, `providers`,
   `stats`, `trigger-health`) all use it too. Narrowing only the lifecycle call site would leave every one of those
   still sending the admin bearer, which does not satisfy "stops holding the admin bearer" (§1 point 8). Instead,
   the factory registers two more capability-scoped service principals alongside `lifecycle` (invariant 6), in the
   same fixed-route-allowlist shape `UNSTICK_ROUTES` already establishes (`index.ts:206-214`):
   - **`dashboard-read`** (`FACTORY_DASHBOARD_READ_SECRET`) — `GET /runs`, `GET /runs/:id`, `GET /runs/:id/log`, `GET /stats`,
     `GET /trigger-health`, `GET /providers`, `GET /chat/*`. Read-only telemetry; no mutation.
   - **`dashboard-run`** (`FACTORY_DASHBOARD_RUN_SECRET`) — `POST /pipeline/spec`, `POST /runs`,
     `POST /pipeline/reconcile`, `POST /chat/*`, `PUT /providers`. Dashboard-triggered mutations that are not
     lifecycle transitions. `PUT /providers` (`index.ts:735`) is provider-settings write, currently reachable only
     by the admin bearer; omitting it from either principal would 403 the live settings-save route the moment
     `FACTORY_SECRET` leaves minion-base (Slice 5) — it belongs on `dashboard-run`, not `dashboard-read`, because it
     mutates state.

   Both join the weak-secret and pairwise-distinct startup checks at `:164-190` alongside `lifecycle`. minion-base
   routes each existing call to its matching principal, and `env.FACTORY_SECRET` is removed from its deployment
   configuration entirely — not aliased, not kept as a fallback. minion-base's remaining direct GitHub *reads*
   (`src/lib/server/github.ts:142`) keep their current `env.GITHUB_TOKEN` scope for now: narrowing reads to a
   mechanically read-only credential is real remaining work but is lower-risk and independent of the write cutover,
   so it is explicit later scope (§6, §8) rather than blocking this spec.
8. **Evidence reuses `phase_effects` for run-bound credentialed effects; lifecycle and monitor evidence reuse their
   own existing mechanisms instead of a new row on a table that cannot represent them.** Every run-bound
   credentialed effect — target push/PR (existing `push`/`pr-create` kinds), meta publication (new `meta-publish`
   kind, Slice 2), and memory-candidate PUT (new `memory-candidate` kind, Slice 6) — records an idempotent
   `phase_effects` row (existing table, `db.ts:757-773`) keyed by `{run_id, kind, key}`, with additive nullable
   `purpose` and `target_repo` columns (migration in Slice 2) populated by every new kind Slice 2/6 introduce;
   back-filling the two pre-existing kinds is not required. Token values are never persisted, logged, or included in
   Docker argv/result JSON/PR bodies/error messages.

   **`meta-publish` needs its own crash-window reconciliation identity, because `minion-meta`'s branch is not a
   dedicated per-run branch the way the target-push binding's is.** `ensurePhaseEffect`'s `reserve → (perform |
   reconcile) → confirm` protocol (`db.ts:1912-1955`) requires a `reconcile()` that reads remote state to answer
   "did this already land" after a restart finds a `pending` row — `ensureExactPush`'s `observe`
   (`containment-effects.ts:146-175`) answers that by comparing branch HEAD to the bound candidate SHA, which works
   because that binding owns an exclusive candidate branch. `minion-meta`'s target branch is the shared branch every
   meta writer pushes to (the reason `push_meta()`'s rebase-retry exists at all), so a concurrent writer can advance
   branch HEAD past this run's commit before or during a crash-recovery reconcile, and HEAD position alone can no
   longer identify *this run's* publication. The `meta-publish` binding fixes this the same way `pr-create`'s
   `observe` establishes identity independent of a mutable value (`validatePullRequest`, `:127-144`): every commit
   the publication protocol pushes (the primary commit and any rebase-continuation regeneration commit that becomes
   the eventual tip) carries a trailer line embedding the bounded runner-derived marker `run:<run_id>:candidate:
   <candidate-hash>`. `reconcile()` for `meta-publish` walks branch history from the current HEAD backward, bounded
   to the depth since the recorded pinned base commit, for a commit whose trailer matches this run's marker; a match
   confirms the effect with that commit's SHA as `ref` regardless of how far a concurrent writer has since moved
   HEAD, and no match lets `perform()` proceed (push/rebase-retry) exactly as an unreserved effect would. Replay of
   an already-confirmed `{run_id,'meta-publish',candidate-hash}` key returns the same commit without a GitHub call.

   Lifecycle transitions are **not** run-bound, so they do not get a `phase_effects` row: their evidence is the git
   commit itself (author = the credential-registry actor label, message, sha) plus the CAS-checked canonical
   response (invariant 6) — a durable, queryable trail that already exists. Monitor issues already have a durable,
   idempotent record of their own — `monitor_events` (fingerprint-keyed dedup, `runner/src/monitor.ts`), which
   predates this spec — that satisfies the same evidence requirement invariant 8 is after; a `phase_effects` row for
   the same event would duplicate it, not fill a gap, and inventing a synthetic run subject for a non-run event
   would be a parallel identity scheme, not an extension of the existing one (§6 explicit out-of-scope already
   rejects a parallel schema; this is that rule applied here).
9. **Compatibility.** `FACTORY_CONTAINMENT_V2` remains the rollout flag for the worker-containment spec's *physical*
   isolation boundary; credential purpose-scoping is not conditioned on it for the seven paths listed —
   meta/train/self-update/spec/reconcile/discovery/chat get purpose tokens unconditionally, independent of
   containment v2's rollout state. **`dev` is deliberately not in that list**: invariant 3 conditions its write-path
   downgrade on `FACTORY_CONTAINMENT_V2` being verified active, precisely because it is the one path whose
   credential-purpose-scoping and physical-isolation concerns are not yet separable — the trusted target-push
   adapter both properties share only exists inside the v2 launch path today. `FACTORY_AUTOMERGE` stays `0`. The
   concurrent-meta-writer rebase/retry convergence rule is preserved (moved, not dropped — invariant 2). The human
   merge gate is unchanged.

Explicitly **not** proposed by this pass: standalone GitHub Apps, App JWT/installation-token minting infrastructure,
or a new `CapabilityGrantEnvelope`/authority table. `pipeline_instances`/`phase_effects` are the authority/evidence
spine; any additional record this spec's slices need must be additive columns/rows on those, not a parallel schema.

## 3. DELTA

Six slices. Pass 3 proposed four and was found non-executable on three counts: Slice 1 removed the only publication
transport the meta-writing agents have, the minion-base cutover depended on factory-side capabilities no slice
built, and the purpose registry did not cover its own consumers. The ordering below fixes exactly that — the
registry closes first, the publication protocol precedes the credential downgrade, and the factory lifecycle
contract precedes the minion-base cutover.

1. Close the purpose registry: add `github-meta`, `github-merge`, `github-factory-source`, `github-memory-read`,
   `github-memory-candidate`, `github-train`; replace `github.ts`'s module `TOKEN` with purpose-bound clients for
   the runner's own calls; replace the shared branch/workspace-prepare values and new merge value with canonical
   repository→token maps whose individual tokens are provider-scoped to exactly one repository; add the startup
   validator; extend activation with exact provider-visible repository-grant
   comparison, provider permission/ruleset evidence, disposable action canaries, and fingerprint-bound evidence
   (→ Slice 1; proves `T-PURPOSE-REGISTRY-CLOSED`, `T-PURPOSE-TOKENS-DISTINCT`, `T-META-PURPOSE-TOKEN`,
   `T-PURPOSE-PROVIDER-GRANT-EXACT`, `T-PURPOSE-ACTION-EVIDENCE`,
   `T-PURPOSE-SCOPE-FINGERPRINT-BOUND`). No container or agent-script behaviour changes yet.
2. Build the runner-owned meta publication protocol (writable, credential-free, remote-stripped worker git worktree
   running the scripts' existing survey/commit-checkpoint flow unmodified → bounded candidate artifact with explicit
   upsert/delete operations serialized from the worker's local commits → apply/commit/regenerate/push against a separate runner-private
   checkout the worker never touches → trailer-marked `phase_effects` receipt reconciled by commit identity, not
   branch position), adopt it in `agent/spec.sh`, `agent/reconcile.sh`, `agent/discovery.sh`, `agent/chat.sh`;
   downgrade `legacyCredentialTransport` to the read-only `github-checkout` credential for those four launch paths;
   and make `dev`-kind dispatch under the legacy (non-v2) path fail closed rather than credential-downgraded, after
   proving the containment-v2 dev path already publishes at every moment `agent/run.sh` does (→ Slice 2; proves
   `T-META-CANDIDATE-BOUNDED`, `T-META-APPLY-CHECKOUT-ISOLATED`, `T-META-WORKTREE-WRITABLE`,
   `T-META-WORKTREE-WRITE-DENIED`, `T-META-PUBLISH-REBASE-RETRY`, `T-META-PUBLISH-RECEIPT`,
   `T-META-PUBLISH-CRASH-RECONCILE`, `T-WORKER-NO-WRITE-CREDENTIAL`, `T-LEGACY-PATH-READ-ONLY`,
   `T-DEV-V2-PUBLICATION-COMPLETE`, `T-DEV-CONTAINMENT-V2-REQUIRED`).
3. Reject `by` unconditionally at the lifecycle HTTP boundary and derive the actor only from the credential
   registry, on both the `status` and `disposition` routes (→ Slice 3; proves `T-BY-REJECTED`,
   `T-ACTOR-SERVER-DERIVED`).
4. Make the factory lifecycle endpoint a complete writer, and register the two additional dashboard-scoped
   principals minion-base's non-lifecycle calls need: lifecycle-only principal with mandatory `expectedStatus`/
   `expectedRevision` CAS (400 on omission, 409 on mismatch), idempotent replay, explicit source→target edge table,
   canonical committed response with `indexSynced`, single promotion; plus `dashboard-read` and `dashboard-run`
   route allowlists, `dashboard-run` including `PUT /providers`
   (→ Slice 4; proves `T-LIFECYCLE-PRINCIPAL-SCOPED`, `T-LIFECYCLE-CAS`, `T-LIFECYCLE-CAS-REQUIRED`,
   `T-LIFECYCLE-IDEMPOTENT`, `T-LIFECYCLE-EDGE-TABLE`, `T-LIFECYCLE-CANONICAL-RESPONSE`, `T-DASHBOARD-READ-SCOPED`,
   `T-DASHBOARD-RUN-SCOPED`).
5. Cut minion-base over to all three factory principals (lifecycle, dashboard-read, dashboard-run) for every call
   `factory.ts` makes, including routing the provider-settings save to `dashboard-run`'s `PUT /providers`; delete its
   Contents-API mutation path, its duplicate promotion call, and `FACTORY_SECRET` from its deployment entirely
   (→ Slice 5; proves `T-BASE-NO-META-WRITE`, `T-BASE-SERVICE-ACTOR`, `T-BASE-CONFLICT-SURFACED`,
   `T-BASE-NO-DOUBLE-PROMOTE`, `T-BASE-PROVIDERS-WRITE`, `T-BASE-NO-ADMIN-BEARER`).
6. Delete `agent/run.sh`'s direct memory upload, stand up the dormant create-only quarantine publisher, and map
   every host-script operation to its purpose credential — including self-update's three distinct authorities
   (→ Slice 6; proves `T-MEMORY-PATH`, `T-MEMORY-CREATE-ONLY`, `T-MEMORY-DORMANT`, `T-NO-HOST-SCRIPT-PAT`,
   `T-SELF-UPDATE-PURPOSE-MAP`, `T-TRAIN-FIXED-PAIRS`).

## 4. Approach — vertical slices

Each slice lands as a separately reviewable, single-repository PR (Slice 5 is the only minion-base PR). Before
editing shared files, the implementer reconciles current HEAD with this spec and with the worker-containment spec
rather than duplicating the credential-boundary/adapter code that already exists for the containment-v2 path. Every
named `T-*` control is an exact top-level test name; each slice's CI runs the full runner suite plus the focused
pattern and retains output showing every named control executed. Slice order is a dependency chain, not a
preference: **2 requires 1**, **5 requires 4**, and **§8's revocation requires all six**.

### Slice 1 — close the purpose registry (5-7h)

Adds credentials and a validator. Deliberately changes no container plan and no agent script, so it is safe to land
while the meta-writing agents still hold the broad PAT.

**Files to touch:**

- `runner/src/containers.ts` (`GITHUB_PURPOSES` `:201`, `GITHUB_CAPABILITY` `:204-208` — add the six new purposes
  and their capability labels)
- `runner/src/github.ts` (replace the module-level `TOKEN` `:6` with a purpose-and-repository-bound client factory;
  `gh`/`ghStrict` take the purpose and canonical registry repository from their caller; target-write purposes select
  only from their parsed repository→token map)
- `runner/src/lifecycle.ts`, `runner/src/monitor.ts` (use `github-meta`), `runner/src/automerge.ts` (use
  `github-merge`), and the seven fleet-read modules listed in §1 point 4 (use `github-checkout`)
- `runner/src/index.ts` (extend the startup validator at `:164-190` to the credential registry)
- `runner/src/scoped-github-canary.ts` (add the provider-backed activation audit alongside `verifyCommand`'s
  existing positive checks `:383-398`: paginate the credential's complete accessible-repository set or obtain its
  grant through GitHub's organization PAT-administration API using an independent controller; compare it exactly
  to the purpose allowlist; retain independently verified forbidden-target fixtures; collect provider permission/
  ruleset evidence and use disposable canaries for action probes; record the token fingerprint; fail closed when
  the grant is extra, incomplete, unavailable, or stale)
- `runner/src/github.test.ts`, `runner/src/index.test.ts`, new `runner/src/github-purpose.test.ts`,
  `runner/src/scoped-github-canary.test.ts`
- `.env.example`, `deploy.sh` (`:316`), `setup.sh` (`:102`), `deploy/k8s.yml` (`:18`), `README.md` — document and
  write `FACTORY_GH_BRANCH_TOKENS`, `FACTORY_GH_WORKSPACE_PREPARE_TOKENS`, and `FACTORY_GH_MERGE_TOKENS` as secret
  JSON maps in **all four** deployment writers; remove their singular predecessors rather than supporting a
  fleet-wide fallback; every other new env var is likewise documented and written by all four writers

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-PURPOSE-REGISTRY-CLOSED|T-PURPOSE-TOKENS-DISTINCT|T-META-PURPOSE-TOKEN|T-PURPOSE-PROVIDER-GRANT-EXACT|T-PURPOSE-ACTION-EVIDENCE|T-PURPOSE-SCOPE-FINGERPRINT-BOUND'
npm test
npx tsc --noEmit
cd ..
# every registry env var is written by every deployment writer, INCLUDING deploy/k8s.yml
for v in FACTORY_GH_BRANCH_TOKENS FACTORY_GH_WORKSPACE_PREPARE_TOKENS FACTORY_GH_META_TOKEN FACTORY_GH_MERGE_TOKENS FACTORY_GH_SOURCE_TOKEN \
         FACTORY_GH_MEMORY_READ_TOKEN FACTORY_GH_MEMORY_CANDIDATE_TOKEN FACTORY_GH_TRAIN_TOKEN; do
  grep -q "$v" .env.example && grep -q "$v" deploy.sh && grep -q "$v" setup.sh && grep -q "$v" deploy/k8s.yml \
    || { echo "missing: $v"; exit 1; }
done
```

Fixtures prove: `T-PURPOSE-REGISTRY-CLOSED` — every consumer enumerated in §1 point 4 resolves to a registry purpose
and no module can build an unlabelled transport; `T-PURPOSE-TOKENS-DISTINCT` — two purposes configured with the same
underlying token value, including nested map values, refuse startup; missing/extra/non-canonical repository keys
refuse startup; singular fleet-wide target-write variables are ignored/rejected; and an unconfigured purpose that
an enabled path exercises refuses startup;
`T-META-PURPOSE-TOKEN` — a lifecycle commit and a monitor issue both carry the `github-meta` credential and never
the target-purpose or checkout credential; `T-PURPOSE-NEGATIVE-SCOPE` — for a fixture purpose configured with an
intentionally *over-broad* scope (denied on forbidden target A, but able to reach forbidden target B, and able to
perform a forbidden action class on an allowed repository), the audit fails activation entirely — not merely
logs a partial pass — and a purpose whose full audit has not yet run is reported as not-yet-active rather than
silently trusted; a probe against a forbidden target whose existence cannot be independently confirmed also fails
activation rather than counting as a pass. `T-PURPOSE-SCOPE-FINGERPRINT-BOUND` — a purpose that passed its audit
under one token value is reported not-yet-active again after its token value (and provider-reported fingerprint)
changes, until the audit re-runs against the new value.

### Slice 2 — runner-owned meta publication, then legacy-path downgrade (8h; split if the DoD cannot be met in one PR)

The security-critical slice. It may only land with a real publication path proven end to end — a DoD that merely
shows the token missing from argv would pass while the first `git push` fails at runtime.

**Prerequisites (named, not assumed):** the fail-closed `dev` admission gate in §2 invariant 3 replaces a broken
write path with a refusal, so it may only ship once the containment-v2 dev path is proven to publish at all four
moments `agent/run.sh` publishes today (§1 point 11): initial branch push + draft PR, each develop/fix-round push,
the resumed-branch push, and the budget-salvage push. The implementer re-reads
`runner/src/containment-effects.ts`'s binding union and the v2 dev launch path at HEAD, records which moments are
covered, and — for any moment that is not — extends the adapter within this slice. If that extension proves larger
than this slice can carry, the slice splits (publication protocol first, admission gate second) rather than
shipping the refusal ahead of its replacement.

**Files to touch:**

- `runner/src/containment-effects.ts` (extend the `phase` union `:16-33` and validator `:77` with the meta
  publication binding; add the multi-file commit + rebase-retry publish operation reusing `tokenFor`/
  `githubRequest`, run only against the runner-private checkout described below; add the trailer-marker
  `reconcile()` for `meta-publish` alongside `ensureExactPush`'s `observe`)
- `runner/src/meta-publication.ts` (new: candidate-artifact schema carrying discriminated `upsert | delete`
  operations, inline bytes only for upserts, allowlist/bounds and pinned-parent delete validation, writable
  credential-free worker-worktree preparation — checkout at the pinned base commit with every
  remote removed — runner-private apply-checkout preparation, index regeneration via the meta repo's own
  `scripts/spec-index.mjs`/`scripts/proposal-index.mjs` run under a minimal allowlisted environment against the
  apply checkout only, and the commit-trailer marker format `run:<run_id>:candidate:<candidate-hash>`)
- `runner/src/db.ts` (add nullable `purpose TEXT` and `target_repo TEXT` columns to **both** the additive `ALTER
  TABLE phase_effects` migration path and the canonical `CREATE TABLE IF NOT EXISTS phase_effects` definition;
  update `PhaseEffectRow` and `requireColumns`; widen `PhaseEffectKind` `:1612` to add `'meta-publish'`)
- `runner/src/queue.ts` (runner-side worker-worktree + private apply-checkout preparation for the four meta run
  kinds; `legacyCredentialTransport` `:2101-2113` forwards `github-checkout` only for `discovery`/`spec`/
  `reconcile`/`chat` `:2186-2231`, `:4038-4043`; `dispatchPreparedRun` `:439` fails a `dev`-kind dispatch closed with
  a queue-time error when `!containmentV2Enabled()`, instead of falling through to `startLegacy`)
- `agent/spec.sh`, `agent/reconcile.sh`, `agent/discovery.sh`, `agent/chat.sh` (drop `gh repo clone`/`git push`/
  `push_meta()` only — `require_exact_changes`/`git add`/`git commit` stay exactly as they are today, now running
  against the runner-provisioned worktree instead of a fresh clone; add the serialization step that reads the
  worktree's local commits via `git log`/`git diff-tree --name-status`; serialize upsert bytes with `git show`,
  serialize `D` without a child blob, and normalize rename to delete+upsert in `/out/meta-candidate.json`)
- `runner/src/meta-publication.test.ts` (new), `runner/src/queue.test.ts`, `runner/src/containment-effects.test.ts`,
  `agent/spec-integrity.test.sh`

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-META-CANDIDATE-BOUNDED|T-META-APPLY-CHECKOUT-ISOLATED|T-META-WORKTREE-WRITABLE|T-META-WORKTREE-WRITE-DENIED|T-META-PUBLISH-REBASE-RETRY|T-META-PUBLISH-RECEIPT|T-META-PUBLISH-CRASH-RECONCILE|T-WORKER-NO-WRITE-CREDENTIAL|T-LEGACY-PATH-READ-ONLY|T-DEV-V2-PUBLICATION-COMPLETE|T-DEV-CONTAINMENT-V2-REQUIRED'
npm test
npx tsc --noEmit
cd ..
bash agent/spec-integrity.test.sh
# no meta-writing agent script may still clone-with-credentials or push
! rg -n 'git push|gh repo clone' agent/spec.sh agent/reconcile.sh agent/discovery.sh agent/chat.sh
# but the existing survey/checkpoint calls must still be present, unmodified, in the worktree
rg -n 'require_exact_changes' agent/spec.sh agent/reconcile.sh agent/discovery.sh agent/chat.sh
```

Fixtures prove: `T-META-CANDIDATE-BOUNDED` — a candidate naming a path outside the run kind's allowlist, a symlink,
a `.git/` entry, a `scripts/` target, an over-bound file/byte count, an unknown operation, content on a delete, or
a delete whose pinned parent is missing/not a regular allowlisted file is rejected with no GitHub call. Valid
fixtures prove an intentional deletion is serialized without `git show <child>:<deleted-path>`, applied as an exact
delete in the runner-private checkout, and published; a rename is preserved as delete-old + upsert-new;
`T-META-APPLY-CHECKOUT-ISOLATED` — a worker that tampers with its worktree's `.git/hooks`, `.git/config`, or a
shadowed copy of `scripts/spec-index.mjs` has zero effect on the apply/commit/push/index-regeneration phase, because
that phase runs only against the separate runner-private checkout the worker was never given access to;
`T-META-WORKTREE-WRITABLE` — inside the worker worktree, `require_exact_changes`'s `git status`/`git rev-parse
--is-inside-work-tree` check succeeds, and `git add`/`git commit`/`git rev-parse HEAD` behave exactly as they do in
today's clone-based flow, proving the substrate change did not break the scripts' existing survey/checkpoint logic;
`T-META-WORKTREE-WRITE-DENIED` — the worker worktree has no configured remote, so remote-based `git push`/`git
fetch` fails locally; representative GitHub write APIs deny the read credential, while reconcile's existing bounded
`gh run list` and compare reads succeed. This fixture does not claim network isolation; `T-META-PUBLISH-REBASE-RETRY`
— a simulated non-fast-forward triggers pull-rebase, index
regeneration, and a bounded retry that converges, matching today's `push_meta()` behaviour, entirely inside the
runner-private checkout; `T-META-PUBLISH-RECEIPT` — publication writes exactly one `phase_effects` row per
`{run_id,'meta-publish',candidate-hash}` with `purpose='github-meta'` and the target `minion-meta` slug recorded,
and a replay is a no-op returning the same commit; the fixture runs once from an upgraded schema and once from a
fresh empty database, proving the canonical CREATE path includes both columns and `requireColumns` accepts them;
`T-META-PUBLISH-CRASH-RECONCILE` — a fixture simulates a crash
after the runner's push is accepted by GitHub but before `confirmPhaseEffect()` runs, injects a concurrent writer's
commit on top of the pushed one, then restarts reconciliation: `reconcile()` locates the original commit by its
trailer marker (not by branch HEAD, which has moved), confirms the effect with that commit's SHA, and a subsequent
`perform()` is never invoked — exactly one publication commit exists, matching the original; `T-WORKER-NO-WRITE-CREDENTIAL`
— the launch plan and Docker argv for **each of** discovery/spec/reconcile/chat contain no write-purpose credential
and no `FACTORY_GH_TOKEN`; `T-LEGACY-PATH-READ-ONLY` — the credential those plans do carry resolves to
`github-checkout`, whose `GITHUB_CAPABILITY` is `read`; `T-DEV-V2-PUBLICATION-COMPLETE` — the containment-v2 `dev`
path resolves a trusted effect binding for each of the four publication moments §1 point 11 enumerates (initial
branch + draft PR, develop/fix-round push, resumed-branch push, budget-salvage push), and a moment with no binding
fails the test rather than falling back to a worker-held token; `T-DEV-CONTAINMENT-V2-REQUIRED` — dispatching a
`dev`-kind run with `FACTORY_CONTAINMENT_V2` unset/`0` is refused at admission time with a queue-time error naming
the missing prerequisite, never silently downgraded to a read-only credential and never silently routed through
`legacyCredentialTransport`'s unmodified (still-broad) form either — the refusal is the only allowed outcome once
this slice is active.

**End-to-end gate before merge (not a unit test):** execute one real spec run, one reconcile run, and one discovery
run against the meta repo with `FACTORY_GH_TOKEN` **unset in the runner process**, and attach the resulting meta
commits plus `phase_effects` rows to the PR. Then, with the same variable unset, execute one real `dev` run under
`FACTORY_CONTAINMENT_V2=1` that exercises branch creation + draft PR, at least one fix-round push, and one
salvage/early-exit push, and attach its branch, PR, and effect rows — this is the positive half of the fail-closed
gate and the only evidence that refusing non-v2 dev leaves dev runs *working* rather than merely refused.
Additionally attempt to dispatch a `dev` run with `FACTORY_CONTAINMENT_V2=0` and attach the resulting refusal (not a
broken/partial run). Slice 2 does not merge on unit fixtures alone.

### Slice 3 — reject caller-supplied `by`, server-derive actor (3-4h)

**Files to touch:**

- `runner/src/index.ts` (`:700-704`, `:715-719` — reject `by` for both branches; derive the actor solely from
  `res.locals.capability`/the credential registry)
- `runner/src/index.test.ts` or the equivalent lifecycle route test file
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
equals the registered credential-registry label for the authenticated capability. **Prerequisite check inside the
slice:** inventory the live lifecycle callers (factory sweeps, minion-base, any cron) and confirm none sends `by`
before the 400 becomes unconditional; record that inventory in the PR body.

### Slice 4 — factory lifecycle endpoint becomes a complete writer, and the two dashboard principals (6-9h, minion-factory only)

This slice exists because pass 3 assigned its work to nobody. Slice 5 cannot be written against a server that does
not authenticate a lifecycle principal, does not honour a stated revision, does not answer with the committed
projection, and has nothing narrower than `admin` for minion-base's non-lifecycle dashboard calls (§2 invariant 7).

**Prerequisites (named, not assumed):** the interim source→target edge table is minion-base's shipped table
(`meta-write.ts:64-78`) transcribed verbatim — no new policy is invented here. The `TODO(handoff)` at
`runner/src/lifecycle.ts:30-33` remains owned by `2026-08-18-factory-durable-state-outbox-spec` §8; this slice's PR
must state that it transcribes rather than decides, and carry a human confirmation of that transcription.

**Files to touch:**

- `runner/src/index.ts` (new `FACTORY_LIFECYCLE_SECRET` → capability `lifecycle` with a two-route allowlist; new
  `FACTORY_DASHBOARD_READ_SECRET` → capability `dashboard-read` with the read-route allowlist in §2 invariant 7; new
  `FACTORY_DASHBOARD_RUN_SECRET` → capability `dashboard-run` with the mutation-route allowlist in the same
  invariant **including `PUT /providers`** (`:735`), all three in the same fixed-allowlist shape as
  `UNSTICK_ROUTES` `:206-214`; join the weak/pairwise-distinct guards at `:164-190` for all three new secrets;
  **require** `expectedStatus`/`expectedRevision` on every `status`/`disposition` request body, 400 before any read/
  write when either is absent; return the canonical response; surface the promotion outcome)
- `runner/src/lifecycle.ts` (source→target edge table replacing `:34-43`; blob-sha CAS; `already_applied` replay;
  typed outcome union replacing `TransitionResult` `:49`; `indexSynced` reported rather than swallowed `:142-168`)
- `runner/src/db.ts` (durable `pending → confirmed` lifecycle-request storage, unique on
  `{principal,request_id}`, carrying the canonical full-input hash, remote commit identity, index-sync outcome,
  promotion outcome, and canonical response)
- `runner/src/index.test.ts`, `runner/src/lifecycle.test.ts`
- `.env.example`, `deploy.sh`, `setup.sh`, `deploy/k8s.yml`, `runner/README.md` (the three new secrets + the
  request/response contract, including required `requestId` and replay semantics)
- `runner/src/lifecycle-contract.test.ts` (new): the shared contract fixture Slice 5 imports/mirrors, so both sides
  are tested against one document

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-LIFECYCLE-PRINCIPAL-SCOPED|T-LIFECYCLE-CAS|T-LIFECYCLE-CAS-REQUIRED|T-LIFECYCLE-IDEMPOTENT|T-LIFECYCLE-EDGE-TABLE|T-LIFECYCLE-CANONICAL-RESPONSE|T-DASHBOARD-READ-SCOPED|T-DASHBOARD-RUN-SCOPED'
npm test
npx tsc --noEmit
```

Fixtures prove: `T-LIFECYCLE-PRINCIPAL-SCOPED` — the lifecycle bearer reaches exactly the two lifecycle routes and
403s everywhere else, is refused at startup when weak or equal to any other secret, and yields a fixed registry
actor label; `T-LIFECYCLE-CAS` — a mismatching `expectedRevision` or `expectedStatus` (both present, one or both
wrong) returns 409 with `{current:{status,revision}}` and performs no write; `T-LIFECYCLE-CAS-REQUIRED` — a request
omitting `expectedStatus`, omitting `expectedRevision`, or omitting both returns 400 with no GitHub read or write,
tested independently for each omission and for both the `status` and `disposition` shapes; `T-LIFECYCLE-IDEMPOTENT`
— crashes are injected after the spec PUT, after index synchronization, and after approval queue creation. Each
retry first reconciles a `pending` request by its commit marker, then idempotently completes index sync and promotion,
and converges to one transition, one promotion, and one canonical response without another PUT. Reusing a key with
different input returns 409 before a GitHub call; fixtures include a reason-only change and a status↔disposition
shape change. A distinct transition to the current status returns `already_applied` with no commit;
`T-LIFECYCLE-EDGE-TABLE` — every edge minion-base's shipped table permits is accepted and every edge outside it is
refused, enumerated from a table fixture; `T-LIFECYCLE-CANONICAL-RESPONSE` — a successful transition returns
`{outcome, commit, revision, indexSynced, spec}`, and an index-patch failure returns `indexSynced: false` rather
than a silent success; `T-DASHBOARD-READ-SCOPED` — the `dashboard-read` bearer reaches exactly its GET routes
(including `GET /runs/:id/log` and `GET /providers`, never `PUT /providers`) and 403s on any mutation and on `/lifecycle/*`, is refused at
startup when weak or equal to any other secret; `T-DASHBOARD-RUN-SCOPED` — the `dashboard-run` bearer reaches
exactly `pipeline/spec`/`runs`/`pipeline/reconcile`/`chat`/`PUT providers` mutations and 403s on `/lifecycle/*` and
on any `dashboard-read` route it does not also need (including `GET /providers`, which stays `dashboard-read`-only).

### Slice 5 — minion-base cutover off the admin bearer (5-7h, minion-base only; requires Slice 4 deployed)

**Files to touch (minion-base only):**

- `src/lib/server/meta-write.ts` (remove `gh`/`getFile`/`putFile` `:13-45` and the mutation half of
  `applyTransition` `:90-151`; keep the typed-outcome surface `:80-86` as the client's return type)
- `src/lib/server/factory.ts` (`factoryFetch` `:139-170` selects `FACTORY_LIFECYCLE_SECRET`,
  `FACTORY_DASHBOARD_READ_SECRET`, or `FACTORY_DASHBOARD_RUN_SECRET` by the path/method being called, per §2
  invariant 7's route split — **`PUT /providers` selects `FACTORY_DASHBOARD_RUN_SECRET`; `GET /providers` and
  `GET /runs/:id/log` select `FACTORY_DASHBOARD_READ_SECRET`**; `factoryConfigured()` `:18-20` checks the three new vars instead of
  `FACTORY_SECRET`; `env.FACTORY_SECRET` is removed from `.env.example`/deployment configuration and no code path
  reads it)
- `src/routes/api/meta/status/+server.ts` (forward `expectedStatus`/`expectedRevision` and a stable `requestId`
  across transport retries; drop the duplicate
  promotion calls `:38-61` in favour of the server's outcome, preserving the 202 partial-success semantics)
- `src/lib/server/spec-dispose.ts` (relay uses the lifecycle bearer; update its contract note)
- `src/lib/components/SpecWarning.svelte`, `src/lib/spec-warning.ts`, and the warning projection/loader and API
  route that feed them (carry the exact status and blob revision the human reviewed into every disposition request;
  generate one stable `requestId` per attempted decision and reuse it only for transport retries; remove `by`)
- existing server tests for these modules, plus a mirror of the Slice 4 contract fixture
- deployment/env documentation for the three new service bearers, with `FACTORY_SECRET` removed

**Definition of done (machine-checkable):**

```bash
cd <minion-base checkout>
bun test --test-name-pattern='T-BASE-NO-META-WRITE|T-BASE-SERVICE-ACTOR|T-BASE-CONFLICT-SURFACED|T-BASE-DISPOSITION-CAS|T-BASE-NO-DOUBLE-PROMOTE|T-BASE-NO-ADMIN-BEARER|T-BASE-PROVIDERS-WRITE'
bun test
bun run check
! rg -n "contents/|method: 'PUT'" src/lib/server/meta-write.ts
! rg -n 'FACTORY_SECRET' src/
```

Tests prove: `T-BASE-NO-META-WRITE` — no production minion-base module can `PUT` `minion-meta` contents;
`T-BASE-SERVICE-ACTOR` — each call sends the bearer matching its own route (`lifecycle`/`dashboard-read`/
`dashboard-run`), never `FACTORY_SECRET`, never `GITHUB_TOKEN`, and none of the three reaches browser/page
data/logs; `T-BASE-CONFLICT-SURFACED` — a 409 from the factory renders the same `revision_conflict` outcome and
current-state pair the UI renders today, and a stale page still cannot overwrite a newer human decision;
`T-BASE-DISPOSITION-CAS` — the warning projection and component carry the exact status/blob revision rendered to
the human; confirm/reject sends those values with a stable request id and no `by`. A matching decision succeeds,
while a stale-page revision returns conflict and performs no write; this path is included in both
`T-BASE-NO-ADMIN-BEARER` and the end-to-end UI gate;
`T-BASE-NO-DOUBLE-PROMOTE` — approving a spec results in exactly one queued run, sourced from the lifecycle
response; `T-BASE-PROVIDERS-WRITE` — a provider-settings save from `src/routes/settings/+page.svelte` reaches the
factory's `PUT /providers` using `FACTORY_DASHBOARD_RUN_SECRET` (never `FACTORY_DASHBOARD_READ_SECRET`, never
`FACTORY_SECRET`) and succeeds, while a `dashboard-read`-bearer-only fixture attempting the same PUT gets 403 —
this is the live regression the third review round caught (§0 pass-6 note); `T-BASE-NO-ADMIN-BEARER` — the
application starts and every existing dashboard surface (run history including opening a run log, stats, trigger-health, providers **read and
write**, spec/proposal approval, dev-run creation) still operates end-to-end with `FACTORY_SECRET` **absent** from
the environment entirely — not just unused on one route. `by` is never sent. If the repository's actual package
scripts differ at implementation-time recon, use its documented equivalents and record the exact commands in the
PR.

### Slice 6 — memory upload cutover and host-script purpose map (5-7h)

**Files to touch:**

- `agent/run.sh` (delete the direct memory `gh api PUT`, lines `79-83`, and its now-resolved `TODO(handoff)`)
- `runner/src/memory/candidate-publisher.ts` (new; purpose-bound transport only, create-only semantics; records a
  `phase_effects` row with kind `'memory-candidate'` — widen `PhaseEffectKind` `:1612` for this one addition,
  reusing the `purpose`/`target_repo` columns Slice 2 already migrated in)
- `runner/src/memory/candidate-publisher.test.ts` (new)
- `runner/src/queue.ts`, `runner/src/db.ts` (wire the publisher; dormant until memory-governance's validator lands)
- `scripts/self-update.sh` (`:37-40` stop reading `FACTORY_GH_TOKEN`; `:70-71` memory pull → `github-memory-read`;
  `:73,91` factory fetch + Actions read → `github-factory-source`; `:58-60` issue filing → `github-meta`)
- `scripts/train.sh` (`:14,19,25,29` → `github-train`, and the `PAIRS` list becomes the credential's declared scope)
- `scripts/provision-webhooks.sh` (`:24-26` — drop the `FACTORY_GH_TOKEN` read; operator `gh auth` only)
- `.env.example`, `deploy.sh`, `setup.sh`, `deploy/k8s.yml` (provision the memory/train/source purposes)

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-MEMORY-PATH|T-MEMORY-CREATE-ONLY|T-MEMORY-DORMANT|T-NO-HOST-SCRIPT-PAT|T-SELF-UPDATE-PURPOSE-MAP|T-TRAIN-FIXED-PAIRS'
npm test
npx tsc --noEmit
cd ..
! rg -n 'gh api.*minion-agent-memory' agent
! rg -n 'FACTORY_GH_TOKEN' scripts/
```

Fixtures prove: `T-MEMORY-PATH`/`T-MEMORY-CREATE-ONLY`/`T-MEMORY-DORMANT` — the publisher accepts only an exact
`<run-id>/<candidate-id>.json` path, refuses an overwrite and any canonical-`minion-agent-memory` target, and
production run output (including `agent/run.sh`) cannot invoke it before memory-governance's validator exists;
`T-NO-HOST-SCRIPT-PAT` — no script under `scripts/` reads `FACTORY_GH_TOKEN`; `T-SELF-UPDATE-PURPOSE-MAP` — a
self-update fixture exercises all three authorities (memory pull, factory source + Actions read, meta issue) each
with its own credential, and fails loudly if one is missing rather than falling back;
`T-TRAIN-FIXED-PAIRS` — the train can only compare and open a PR on the declared `{repo, head, base}` pairs, cannot
push or merge, and rejects a pair injected through the environment.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| Target repositories (`runner/src/repos.ts` / `repos.json`) | Read/branch-push/workspace-prepare purpose scoping for `dev` runs already shipped via containment v2 (§1) — unchanged for runs dispatched under it. What *does* change: once Slice 2 lands, `dev` dispatch under the legacy (non-v2) path is refused outright rather than silently downgraded (§2 invariant 3), so containment-v2 activation becomes an operational prerequisite for the factory's dev-run capacity, not merely an optional rollout. Automerge's merge authority moves to its own purpose but stays inert (`FACTORY_AUTOMERGE=0`). | Slices 1-2 change the *credential path* for the four meta kinds and add a fail-closed admission gate for `dev`. No target-repo source edit required, but the operator must verify containment v2 is active fleet-wide before or as part of activating Slice 2, or dev dispatch stops. |
| `minion-meta` | Every meta write moves twice: off the shared PAT onto `github-meta` (Slice 1), and out of the worker container onto the runner's publication adapter (Slice 2). Commit actor text becomes strictly server-derived (Slice 3). | The rebase/retry convergence rule is preserved by porting `push_meta()`'s loop into the adapter, not by deleting it. Slice 2 cannot merge on unit fixtures alone — it requires one real spec, reconcile, and discovery publication with the broad token unset. |
| `minion-meta` chat turns + `/opt/factory/meta` shared clone | `startChatTurn` (`queue.ts:4038-4043`) is the fifth credentialed launch path and mounts a *shared persistent* clone; pass 3 omitted it entirely. | Slice 2 covers `agent/chat.sh` alongside the run-kind agents. The shared-mutable-clone hazard is called out for the worker-containment spec, which owns physical isolation. |
| Private memory-quarantine repository | A candidate-only purpose and create-only JSON namespace are provisioned before M8 activation, matching the already-approved memory-governance spec. | Slice 6. Repo creation/access remains a human-gated provisioning step; do not install the candidate purpose against canonical `minion-agent-memory`. |
| `minion-agent-memory` (canonical) | Direct worker writes stop entirely (Slice 6 deletes `agent/run.sh:79-83`). The host's own read pull (`self-update.sh:70-71`) keeps working via a dedicated read purpose. | A canonical *write* from any purpose other than the (future, memory-governance-owned) promotion path is a failing adversarial test. |
| `minion-factory` self-update | `scripts/self-update.sh` uses one token for three different authorities (private memory read, factory source + Actions read, meta issue write). A `minion-meta`-only credential cannot serve the first two. | Slice 6 maps each command to its own purpose. §8's revocation happens only after that map is exercised — otherwise self-update is a deterministic host-path outage. |
| Promotion train | `scripts/train.sh` operates on **two** fixed pairs (`minion-ai@DEV→main`, `minion-site@dev→master`), not one. | Slice 6's `github-train` purpose is scoped to the declared pair set and cannot accept repo/ref input from the calling script. |
| `minion-base` ← **cross-repo dependency** | The cutover needs factory-side authentication, revision CAS, an edge table, and a canonical response that do not exist today; minion-base additionally holds the factory **admin** bearer for *every* proxied call (`factory.ts:149`), not only lifecycle mutations — runs/history, stats, trigger-health, providers, `pipeline/spec`, `pipeline/reconcile`, `runs` creation, and `chat/*` all use it too — and enforces transitions the factory route would reject. | Slice 4 (minion-factory) lands and deploys **before** Slice 5 (minion-base) and registers `lifecycle`, `dashboard-read`, and `dashboard-run` as three separate principals (§2 invariant 7), not just `lifecycle`. Slice 5 removes `FACTORY_SECRET` from minion-base's deployment entirely and proves the app still operates without it (`T-BASE-NO-ADMIN-BEARER`). One shared contract fixture is authored in Slice 4 and mirrored in Slice 5. Read-only GitHub-access narrowing stays explicit later scope (§6). |
| Other lifecycle API callers | Unknown fields including `by` become 400; server actor labels become credential-registry ids for every caller. | Slice 3 requires a caller inventory in its PR body before the 400 is unconditional; log rejected field names only, never body values. |
| Deployment surface (`deploy.sh`, `setup.sh`, `deploy/k8s.yml`, `.env.example`) | Six new purpose credentials plus **three** new bearer secrets (`FACTORY_LIFECYCLE_SECRET`, `FACTORY_DASHBOARD_READ_SECRET`, `FACTORY_DASHBOARD_RUN_SECRET` — Slice 4), and one removal: `FACTORY_SECRET` leaves minion-base's deployment entirely (Slice 5). `deploy.sh` rewrites `/opt/factory/.env` **wholesale** (operator memory), so a variable absent from it is silently dropped on the next deploy. | Every slice that introduces a credential edits all four writers in the same PR; Slice 1's DoD greps for exactly that. |
| Worker containment (separate spec) | Shares the deny-by-default credential boundary and the trusted adapter this spec extends with a meta publication binding. | Coordinate slice ordering with `2026-08-18-factory-worker-containment-spec` implementers so neither duplicates the other's boundary/adapter code (§0 relationship recommendation). |
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
- Deciding new lifecycle transition *policy*. Slice 4 transcribes the source→target edge table minion-base already
  enforces; changing which edges exist stays owned by `2026-08-18-factory-durable-state-outbox-spec` §8 and the
  `TODO(handoff)` at `runner/src/lifecycle.ts:30-33`.
- Physical isolation of the shared persistent `/opt/factory/meta` chat clone. This spec removes the *write
  credential* from that container; the shared-mutable-clone hazard itself belongs to the worker-containment spec.
- Narrowing minion-base's remaining direct GitHub *read* access to a mechanically read-only credential — real,
  valuable follow-on work, but independent of and not blocking the write-path cutover in Slice 5 (§2 invariant 7).
- Browser stages, multi-repo DAGs, release signing/provenance, application-deployment credentials, and product-release
  canary/rollback policy.
- GitHub user OAuth, display-name impersonation resolution, or changing the minion-base UI.
- Enabling automerge or bypassing human approval/merge gates.

## 7. End-to-end verification

1. Confirm every purpose in §2 invariant 1 and all three Slice 4 bearer secrets are configured, pairwise-distinct,
   and written by all four deployment writers; confirm the startup validator fails closed on a missing or
   duplicated value. For every purpose, confirm its provider-backed activation audit (§2 invariant 1a) ran against
   the current token's fingerprint — the complete paginated provider-visible repository grant exactly matches the
   allowlist, permission/ruleset evidence is captured, disposable canaries establish the safe action probes, no
   production PR was used, and every token in the `github-branch`, `github-workspace-prepare`, and `github-merge`
   maps is proven provider-scoped to exactly its one canonical repository. Confirm each token's all-ref scope and
   effective push+merge authority are reported unless captured ruleset evidence removes a specific action — and
   that a purpose whose audit has not run, or whose token has rotated since, is reported not-yet-active.
2. Queue one spec run, one reconcile run, one discovery run, and one chat turn with `FACTORY_GH_TOKEN` unset in the
   runner process. Verify each launch plan and Docker argv carries only the read-only `github-checkout` credential,
   that each worker's worktree supports its existing `require_exact_changes`/`git add`/`git commit` flow unmodified
   and has no configured remote, that each publication lands a real meta commit through the runner adapter carrying
   the run's trailer marker, and that each writes exactly one `phase_effects` receipt. Force one concurrent meta
   writer and verify the rebase-retry converges. Simulate a crash between an accepted push and `confirmPhaseEffect()`
   with a concurrent writer's commit landed on top, and verify reconciliation locates the original commit by its
   trailer rather than duplicating it. Publish one deletion and one rename candidate; verify deletion serialization
   never reads a nonexistent child blob, the runner-private checkout removes the old regular allowlisted path, and
   the rename lands as delete-old + upsert-new with regenerated indexes.
3. With `FACTORY_GH_TOKEN` still unset, run one `dev` run under `FACTORY_CONTAINMENT_V2=1` through branch creation,
   draft PR, a fix round, and a salvage exit; verify every publication landed through the trusted adapter and no
   worker plan carried a write credential. Then dispatch a `dev` run with `FACTORY_CONTAINMENT_V2=0` and verify it
   is refused at admission with an error naming the missing prerequisite — no container started, no credential
   forwarded, no partial branch left behind.
4. Execute one authenticated lifecycle transition without `by`; verify the meta commit/event actor equals the
   credential-registry label. Repeat with `by` set (both `status` and `disposition` shapes); verify 400 with no
   GitHub write, for admin and non-admin bearers.
5. Exercise the lifecycle contract directly against the factory: the lifecycle bearer on a non-lifecycle route
   (403), a request omitting `expectedStatus`, `expectedRevision`, or both (400, no read/write), a mismatching
   `expectedRevision`/`expectedStatus` with both present (409 with the current status/revision), a repeat of an
   response-lost retry using the same `requestId` and original CAS (the original canonical response, no second
   write), a key-reuse request with changed input (409), a distinct already-applied transition (no commit), an edge outside the table (refused), and a success (canonical
   `{outcome, commit, revision, indexSynced, spec}` with exactly one queued run on approval).
6. Exercise the two dashboard principals the same way: the `dashboard-read` bearer reaches its GET routes
   (including `GET /runs/:id/log` and `GET /providers`) and 403s on every mutation (including `PUT /providers`) and on `/lifecycle/*`; the
   `dashboard-run` bearer reaches `pipeline/spec`, `runs`, `pipeline/reconcile`, `chat`, and `PUT /providers`
   mutations and 403s on `/lifecycle/*` and on `GET /providers`.
7. Through the minion-base UI, drive an approval and a stale-page conflict with `FACTORY_SECRET` **absent from
   minion-base's environment entirely**. Verify the conflict still blocks the overwrite, the actor is the registered
   service label, the response is the factory's canonical projection, no `meta-write.ts` PUT remains on that path,
   and every other dashboard surface (run history, stats, trigger-health, providers **read and write** — save a
   provider setting through the UI and confirm it lands — dev-run creation) still works on the two dashboard
   bearers.
8. Invoke the dormant quarantine publisher with one runner-validated JSON fixture. Verify a create-only candidate
   appears at `<run-id>/<candidate-id>.json` in the separate private repository; overwrite and canonical-memory
   attempts fail; verify ordinary run output (including `agent/run.sh`) cannot invoke it.
9. Trigger the self-update and promotion-train fixtures. Verify self-update performs all three of its authorities
   each on its own credential (and fails loudly, not silently, if one is unset), and that the train can only compare
   its declared pairs and open a draft PR.
10. Run the full runner and minion-base CI/typecheck gates plus every `T-*` control named in §4; then search
    deployment, runner, agent, and host-script sources/config for any remaining `FACTORY_GH_TOKEN=`/bare `GH_TOKEN=`
    injection outside test files.

## 8. Rollout and rollback

Land Slices 1-6 in order with `FACTORY_AUTOMERGE=0` throughout; no new feature flag is required beyond the existing
`FACTORY_CONTAINMENT_V2` (which continues to gate the *physical*-isolation half of the related worker-containment
spec, not this spec's credential purposes — §2 invariant 9). Slice 4 must be **deployed**, not merely merged, before
Slice 5 ships, because minion-base and the runner deploy independently.

**Slice 2 carries one operational prerequisite, and it is a deploy-time gate on the operator, not on the
implementer.** Because Slice 2 makes non-v2 `dev` dispatch fail closed (§2 invariant 3), `FACTORY_CONTAINMENT_V2=1`
must be set in the deployed runner's environment — and, per operator memory, written into `deploy.sh`'s wholesale
`/opt/factory/.env` rewrite so the next deploy does not silently drop it — **before or in the same deploy as** the
Slice 2 image. Order for that deploy: (a) confirm Slice 2's `T-DEV-V2-PUBLICATION-COMPLETE` evidence and its real
containment-v2 dev run (§4 Slice 2's end-to-end gate); (b) flip and deploy the flag; (c) verify one real dev run
end-to-end on the deployed runner; (d) only then deploy the image carrying the admission gate. Deploying the gate
before the flip converts dev-run capacity to zero — the correct rollback for that mistake is re-deploying the
previous runner image, not restoring a worker write token.

Revocation of the broad `FACTORY_GH_TOKEN` is the last step, and it is gated on a closed map, not on a slice count:
after Slice 6 lands and §7 is green, confirm that every consumer inventoried in §1 point 4 — the nine runner modules,
all five container launch paths, `self-update.sh`'s three authorities, `train.sh`'s pair set, and
`provision-webhooks.sh`'s operator fallback — has an exercised purpose credential *and* a passed provider-backed
   provider-backed activation audit (§2 invariant 1a) bound to its currently-deployed token fingerprint. Only then revoke the PAT, remove it from
`.env.example`/`deploy.sh`/`setup.sh`/`deploy/k8s.yml`, and make missing purpose-credential configuration a startup
failure. Revoking earlier converts a security improvement into a host-path outage. **Any subsequent rotation of a
purpose credential invalidates that purpose's audit evidence** (§2 invariant 1a's fingerprint binding) — the audit
must re-run and pass against the new value before the rotated token backs any real call; this is an operational
runbook item, not a one-time activation step.

If production regresses, stop new intake and all GitHub writes, preserve `phase_effects` evidence, and roll back the
release while keeping write paths disabled. Restoring the broad `FACTORY_GH_TOKEN` to any worker or host script, or
restoring minion-base's direct `meta-write.ts` path, is not an acceptable rollback: the acceptable rollback for a
failed Slice 2 is re-enabling the *previous release's* container image, and for a failed Slice 5 it is re-pointing
minion-base at the previous release while the factory endpoint stays authoritative.

Follow-on, explicitly out of scope for this spec's approval (§6): narrowing minion-base's remaining GitHub *read*
access to a mechanically read-only credential.

## Board audit 2026-08-28 (superseded by passes 3-5 — kept for history)

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Returned to draft for respec: the GitHub-App + publisher-module mechanism was superseded by scoped PATs (scoped-github-canary.ts) + the effect ledger. Live deltas worth keeping: caller-supplied `by` at index.ts:648,663; retiring the broad FACTORY_GH_TOKEN; minion-base cutover; memory candidate publisher.

## Board respec 2026-08-29 (passes 3-6)

**Pass 3** reviewed this spec at exact pre-review blob `6be58a23e2730f89313b8a527237b4aeaed2830d` per operator task,
verified it against `minion-factory@5db7d391` (main, PR #153 merged), `minion-base@19531059`, and closed/unmerged
`minion-factory` PR #29, and rewrote AS-IS/TO-BE/DELTA/Approach around the landed scoped-credential foundation.
It recorded `status: review` / `verdict: changes_requested` against itself, asking for one more correctness pass.

**Pass 4** is that pass. The cross-provider review on PR #271 supplied three concrete findings; each was re-verified
this pass against fresh checkouts of the same two pinned commits — not taken on the reviewer's word — and all three
were confirmed, including two facts the review had not surfaced: `discovery` and `chat` are the fourth and fifth
credentialed launch paths (`runner/src/queue.ts:2192-2206`, `:4038-4043`), and the factory's and minion-base's
lifecycle transition tables **diverge**, so a naive cutover would have 400'd live dashboard controls
(`runner/src/lifecycle.ts:34-43` vs `minion-base/src/lib/server/meta-write.ts:64-78`). §1-§5, §7 and §8 were
rewritten accordingly; the slice count went 4 → 6 because the two missing prerequisites — a meta publication
protocol, and a complete factory lifecycle endpoint — are each a slice, not a footnote.

**Pass 5** answers the second cross-provider review of PR #271 (four High, one Medium, one Low). All six findings
were re-verified from fresh clones of the same pinned commits and all six were confirmed; §0's pass-5 note records
each finding, its confirmation evidence, and where it is fixed. Two of the fixes changed the shape of the plan
rather than its wording: `dev` dispatch under the legacy path now fails **closed** instead of being downgraded
(§2 invariant 3, with the containment-v2 activation proof obligation in §4 Slice 2 and the deploy ordering in §8),
and the minion-base cutover now removes `FACTORY_SECRET` from that deployment entirely behind three scoped
principals rather than narrowing one call site (§2 invariant 7, §4 Slices 4-5). Pass 5 also stopped the spec
claiming its security outcome was unchanged from the source proposal's (§0, invariant 1a) — see the human decision
below.

**Pass 6** answers the third cross-provider review of PR #271 (two High, three Medium — one Medium, dashboard
providers write, was independently caught by this pass's own re-read while verifying the review's findings). All
were re-verified from a fresh clone of `minion-factory@5db7d391` (re-confirmed still the pinned commit) before being
acted on; §0's pass-6 note records each finding, its confirmation evidence, and where it is fixed. The two High
findings changed substance, not just wording: the worker's meta-writing edit surface is a **writable,
credential-free, remote-stripped git worktree** running the agent scripts' existing, unmodified survey/checkpoint
logic, not a gitless read-only mount (§2 invariant 2, §4 Slice 2), and purpose activation requires a **provider-backed
scope audit** — enumerated forbidden targets, independently-verified existence, forbidden-action probes on allowed
repositories, fingerprint-bound evidence — not one negative sample (§2 invariant 1a, §4 Slice 1). The Medium findings
close two other reachable gaps: lifecycle CAS is now mandatory at the HTTP boundary rather than optional (§2
invariant 6, §4 Slice 4), and `dashboard-run` now carries `PUT /providers` so the live settings-save route survives
`FACTORY_SECRET`'s removal (§2 invariant 7, §4 Slices 4-5). A fifth fix, `meta-publish`'s crash-window reconciliation
identity via a commit-trailer marker (§2 invariant 8, §4 Slice 2), closes the gap the review's own M3 finding named.

**Pass 7** answers the fourth cross-provider review of PR #271 (three High, two Medium). The review correctly
identified that pass 6 still claimed a provider boundary GitHub does not supply: Contents-write can authorize both
push and PR merge, so `github-branch` cannot be safely proven "write-but-not-merge" with a production merge probe.
Invariant 1a and Slice 1 now require an exact provider-visible repository-grant comparison, non-destructive
permission/ruleset evidence, and disposable canaries; the effective merge authority is escalated as part of the
human deviation instead of hidden. The local fleet inventory remains defense in depth, not proof of the token's
complete grant. Slice 2's contradictory no-egress claim is replaced with the enforceable boundary actually needed:
remote-stripped and write-credential-free, with required reconcile reads succeeding and representative writes
denied. Slice 4 adds durable request-key replay so response loss after commit is idempotent despite stale original
CAS, and Slices 4-5 add the live `GET /runs/:id/log` route to `dashboard-read` and its end-to-end coverage.

**Pass 8** answers review-fix run `5b148f6c`, round 1 (two High, one Medium). H1 is resolved substantively and in
the approval text: target-repository write credentials are no longer fleet-wide shared values; Slice 1 migrates
branch, workspace-prepare, and merge to canonical repository→token maps, and activation proves every nested token's
provider grant contains exactly one repository. The still-accepted lifetime, all-ref, and action-scope losses are
enumerated for all three purposes. H2 is resolved in both directions: `github-merge` now has the Contents-write
permission required by its exact REST consumer, while all three Contents-write principals are audited, canaried,
and reported as push+merge capable unless rulesets independently deny an action. M1 is resolved by a discriminated
`upsert | delete` candidate format, pinned-parent regular-file validation for deletes, exact apply semantics, and
deletion plus rename-as-delete/upsert fixtures. These are spec corrections only; no product implementation is
authorized before the security approval gate.

**Pass 9** answers the subsequent exact-head review of pass 8 (four Medium findings). Lifecycle idempotency is now
a durable `pending → confirmed` protocol that reconciles the GitHub commit and resumes index/promotion steps after
every mutation crash window; its key binds the complete audit-bearing request. The minion-base disposition slice
now carries the exact human-reviewed status/blob revision through `SpecWarning` and proves stale-page rejection.
The `phase_effects` receipt migration now updates both ALTER and canonical CREATE paths and is tested from a fresh
empty database. These are planning-contract changes only; no product code is introduced.

**Disposition: `status: review`, `verdict: pending`.**

- Not `approved`: this spec is `tags: [security, infra]`, and the SDLC contract keeps human gates at approval AND
  merge for security-tagged work, so a factory pass may not self-approve it. The recommendation to the human gate is
  **approve the plan, and decide the deviation explicitly** — the plan is executable, dependency-ordered, and every
  slice's DoD is machine-checkable against code that exists, but approval also means accepting one recorded
  departure from the approved proposal, below.

**Human decision required at the approval gate (H4).** The source proposal's DoD asks for *short-lived* credentials
scoped to one repository/branch/action set (`proposals/2026-08-17-factory-capability-separation.md:21-25`). This
spec instead uses long-lived purpose PATs, with each target-write PAT provider-scoped to exactly one repository and
selected from a runner-owned canonical repository map (§0, §2 invariant 1a). This restores the proposal's
one-repository boundary but remains weaker on three axes for **each of** `github-branch`,
`github-workspace-prepare`, and `github-merge`: (1) **lifetime** — the PAT is shared across runs for that repository
and remains usable until operator rotation; (2) **ref scope** — GitHub exposes it to every repository ref unless a
captured ruleset independently narrows that principal; and (3) **action scope** — Contents-write makes all three
provider-capable of both direct push and PR merge, including `github-merge`, which needs Contents-write for its
exact merge endpoint. Pull-requests write adds its own PR/comment actions where configured. The trusted adapters'
narrower APIs constrain normal factory calls but do not constrain a stolen PAT used directly against GitHub.
Compensating controls are exact one-repository provider-grant audits for every mapped token, disposable push/merge
canaries for every Contents-write principal, captured ref-ruleset evidence, fingerprint-bound activation, and no
write credential in workers. These controls expose and reduce the deviation; they do not make it run/ref/action
bound. A factory pass may not resolve this trade-off or amend the approved proposal. The human gate has two options:

1. **Accept the interim target.** Approve this spec as written and amend the source proposal's DoD to record
   long-lived, one-repository purpose PATs + provider-grant audits as the accepted M4 target, explicitly accepting
   the shared-across-runs lifetime, all-ref scope, and push+merge authority of all three Contents-write purposes
   wherever verified rulesets do not remove an action, with short-lived run/ref/action-bound grants named as later
   work.
2. **Hold the original contract.** Keep the proposal's DoD and require a controller-minted, run/repo/ref/action-bound
   credential — which means this spec needs a further pass adding that minting path (the trusted adapter and the
   purpose/repository registry both survive as defense in depth; lifetime, ref, and action binding are the parts
   that change).
- Not `changes_requested`: that verdict was pass 3's own request for the correctness pass this pass performed. The
  findings that motivated it are resolved above, and leaving it set would keep the spec behind the server-side
  `changes_requested` promotion gate for a reason that no longer holds.
- Not `rejected`/`archived`: the source proposal's security gap is real, current, and verified at HEAD — one
  process-wide PAT still serves nine runner modules, five container launch paths, and four host scripts (§1 point
  4); `by` is still caller-supplied for admin bearers (§1 point 6); and minion-base still writes `minion-meta` with
  a raw PAT while holding the factory admin secret (§1 point 8).

No product code was implemented in passes 3, 4, 5, or 6, per the task's instruction not to implement while the spec
is not validly approved. The `T-*` control names and DoD commands are written against the runner's existing
`node:test` invocation (`npm test -- --test-name-pattern=…`); the implementer re-verifies exact anchors at HEAD
before each slice, as §1 states.
