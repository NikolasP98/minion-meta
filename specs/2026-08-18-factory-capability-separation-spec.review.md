---
spec: 2026-08-18-factory-capability-separation-spec
pass: 10
verdict: pending
reviewer: factory-review-fix
created: 2026-08-18
updated: 2026-08-30
---

# Review sidecar — passes 4-10 (answers PR #271's seven `VERDICT: FAIL` reviews)

## Pass 4 review (executability fix — historical; superseded by pass 5 below)

### Trigger

Pass 3 rewrote this spec around the scoped-credential foundation that landed in `minion-factory@5db7d391` and
recorded `status: review` / `verdict: changes_requested` against itself. The cross-provider review of that branch
(PR #271, 2026-08-29) accepted the framing — it explicitly closed the prior H1 and confirmed the branch avoids
product code and preserves the human gates — but returned `VERDICT: FAIL` on three executability findings. Pass 4
resolves those findings. It writes no product code.

### Verification performed this pass

Every finding was re-verified from **fresh** local clones of the same pinned commits, rather than accepted on the
reviewer's word:

- `NikolasP98/minion-factory@5db7d3919896042043e63da996d6441ec63db205` and
  `NikolasP98/minion-base@19531059cf42e352e35425dd3b3b71afa9eb540f`.

| Review finding | Verdict after independent check | Evidence |
|---|---|---|
| **H1** — Slice 1 removes the only GitHub transport from the meta-writing workers | **Confirmed, and understated** | `queue.ts:2101-2113` feeds `GH_TOKEN` to **five** launch paths (`:2192-2206` discovery, `:2207-2231` spec/reconcile, `:2232+` non-v2 dev, `:4038-4043` chat), and each agent script owns its own clone + `push_meta()` rebase loop (`spec.sh:242-279`, `reconcile.sh:40-68`, `discovery.sh:47,95`, `chat.sh:9-14,43,71`). `containment-effects.ts:16-33,47-58,77` is a single-branch dev-candidate binding with `pushExact`/`createDraftPullRequest` and no multi-file or rebase operation. Pass 3 omitted discovery *and* chat. |
| **H2** — Slice 3 cannot authenticate or preserve the stale-decision guard | **Confirmed, plus one further break the review did not name** | `index.ts:223-267` knows only admin/hook/unstick/instance/orchestrator; the route `:681-729` destructures no `expectedStatus`/`expectedRevision` (though `lifecycle.ts:99` accepts one) and answers `{ok, commit}` (`lifecycle.ts:49`) with a silently-swallowed index patch (`:142-168`). **Additionally:** the two transition tables diverge — base permits spec `draft→review`, `approved→implementing`, `implementing→done|superseded` and proposal `approved→in-spec` (`meta-write.ts:64-78`) that the factory's target-only allowlist (`lifecycle.ts:34-43`) rejects. And base already holds the **admin** bearer (`factory.ts:149`) and duplicates promotion (`status/+server.ts:38-61` vs `index.ts:724-726`). |
| **M1** — the purpose registry is not closed and self-update cannot work under it | **Confirmed** | `self-update.sh` uses one token for three authorities: private memory pull `:70-71`, factory source + Actions read `:73,91`, meta issue write `:58-60`. `train.sh:9-12` operates on **two** pairs, not the "one pair" pass 3 wrote. Further unregistered consumers found: `automerge.ts:706,720` (PR merge), `provision-webhooks.sh:24-26`, `deploy.sh:316`, `setup.sh:102`, `deploy/k8s.yml:18`. |

Anchor corrections applied from the same reading: monitor intake is `runner/src/monitor.ts:69`, not
`runner/src/index.ts:393-418`; the `by` expressions are at `index.ts:700-704` and `:715-719`.

### Changes made this pass

- **§1 AS-IS** — added the fourth/fifth credentialed launch paths, the in-container publication protocol (point 5),
  the adapter's dev-only binding shape (point 2), a consumer/authority table for `github.ts`'s nine importers, the
  factory lifecycle endpoint's three gaps plus the diverging transition tables (point 7), minion-base's
  admin-bearer and duplicate-promotion reality (point 8), and a "Known unknowns" block. All anchors re-verified.
- **§2 TO-BE** — replaced the four-purpose sketch with one closed registry table (purpose × env var × capability ×
  scope × consumers) covering every inventoried operation; added the runner-owned meta publication protocol as an
  invariant; added the complete factory lifecycle contract (principal, CAS, idempotent replay, edge table,
  canonical response, single promotion) as factory-side work.
- **§3/§4 DELTA and slices** — 4 → 6 slices with an explicit dependency chain: registry → publication protocol →
  `by` rejection → factory lifecycle endpoint → minion-base cutover → memory/host scripts. Slice 2 gains an
  end-to-end merge gate (one real spec/reconcile/discovery publication with the broad token unset) so it cannot
  pass on "token absent from argv" alone. Every slice that introduces a credential now edits `.env.example`,
  `deploy.sh`, `setup.sh`, and `deploy/k8s.yml` in the same PR, with a DoD that greps for it.
- **§5, §7, §8** — new rows for chat turns, self-update, the train, the deployment surface, and the cross-repo
  ordering; verification steps for the lifecycle contract and the three self-update authorities; revocation
  re-gated on a closed, exercised credential map rather than on a slice count, with per-slice rollback.
- **§6** — added two exclusions: this spec transcribes rather than decides lifecycle transition policy, and the
  shared `/opt/factory/meta` clone's physical isolation stays with the worker-containment spec.
- Frontmatter `pass: 4`, `verdict: pending`, `status: review` unchanged; regenerated `specs/index.json`.

### Disposition and why `pending`, not `approved` (pass 4; see pass 5 for the current recommendation)

`tags: [security, infra]` keeps human gates at approval AND merge (AGENTS.md SDLC contract), so no factory pass may
move this spec to `approved`. `changes_requested` was pass 3's own request for the correctness pass that pass 4
performed, and it additionally holds the spec behind the server-side `changes_requested` promotion gate; leaving it
set would misreport the state. `pending` = the plan is complete and awaiting the human security gate. The
recommendation to that gate is **approve**.

## Pass 5 review (hardening fix — answers the second PR #271 `VERDICT: FAIL`)

### Trigger

The cross-provider review of pass 4 returned `VERDICT: FAIL` again with four High findings (H1-H4), one Medium
(M1), and one Low (L1). Pass 5 resolves them. It writes no product code.

### Verification performed this pass

Same method as pass 4 — fresh clones of `minion-factory@5db7d391` and `minion-base@19531059`, every finding checked
before it was acted on. All six confirmed:

| Finding | Verdict after independent check | Fix |
|---|---|---|
| **H1** — non-v2 `dev` loses its only write transport | **Confirmed** | Invariant 3 had folded `dev` into the same unconditional downgrade as the four meta paths, contradicting invariant 9, which had already (correctly) excluded it. `dev`'s legacy dispatch now **fails closed** instead, and the containment-v2 path it hands over to must first be proven to publish at all four moments `agent/run.sh` publishes today (§1 point 11) — `T-DEV-V2-PUBLICATION-COMPLETE`, Slice 2 prerequisites, a real v2 dev run in Slice 2's end-to-end gate, and the deploy ordering in §8. |
| **H2** — worker-writable checkout crosses into the trusted apply phase | **Confirmed** | Invariant 2 splits the mount: a gitless worker snapshot (edit surface, bytes leave only through the bounded candidate) and a runner-private checkout the worker never touches, which the apply/commit/push/index-regeneration phase always runs against, under a minimal allowlisted environment. New control `T-META-APPLY-CHECKOUT-ISOLATED`. |
| **H3** — minion-base keeps the admin bearer outside `/lifecycle/*` | **Confirmed** | `factory.ts:149` sends `FACTORY_SECRET` on *every* proxied call, not just lifecycle. Invariant 7 adds `dashboard-read` and `dashboard-run` principals beside `lifecycle` (Slice 4) and requires `FACTORY_SECRET` to leave minion-base's deployment entirely (Slice 5, `T-BASE-NO-ADMIN-BEARER`, `! rg 'FACTORY_SECRET' src/`). |
| **H4** — long-lived PATs vs. the approved run-bound contract | **Confirmed as a real, under-stated deviation** | §0 stops claiming an unchanged security outcome; invariant 1a records the deviation and makes a negative-scope canary a hard activation gate (`T-PURPOSE-NEGATIVE-SCOPE`). The trade-off itself is escalated as an explicit two-option decision at the human approval gate — a factory pass may neither accept it silently nor amend the approved proposal to match. |
| **M1** — `phase_effects` cannot represent the promised receipts | **Confirmed for `meta-publish` only** | Lifecycle and monitor already have durable idempotent records outside `phase_effects` (the CAS-checked commit; `monitor_events`' fingerprint dedup, verified to predate this spec), so a row there would duplicate a mechanism rather than fill a gap. Invariant 8 narrows to the run-bound credentialed effects the table can represent, with additive `purpose`/`target_repo` columns and the two new kinds assigned to Slices 2 and 6. |
| **L1** — Slice 1's deploy gate skips `deploy/k8s.yml` | **Confirmed** | `deploy/k8s.yml` already carries three existing purpose vars, so the omission was a real gap. Added to the DoD loop. |

### Changes made in the review-fix round

The first fix round applied the six fixes above. A second pass over the result closed the internal inconsistencies
those fixes left behind, each traceable to the finding that caused it: invariant 3's forward reference to a
containment-v2 prerequisite `§8` did not yet contain (H1); no positive proof that refusing non-v2 `dev` leaves dev
runs *working* (H1); §5's deployment row still counting "one new bearer secret" after H3 added three; §7 not
verifying the dev refusal, the two dashboard principals, or `FACTORY_SECRET`'s absence; and the closing disposition
still recording only passes 3-4. `specs/index.json` was regenerated for `pass: 5`.

### Disposition after pass 5

Unchanged mechanically — `status: review`, `verdict: pending`, `pass: 5` — and for the same reason: a
security-tagged spec keeps its human gates at approval AND merge, so no factory pass may self-approve it. What
changed is the recommendation. Pass 4 recommended **approve**; pass 5 recommends **approve the plan and decide
finding H4 explicitly**, because approving the spec as written also accepts a departure from the source proposal's
short-lived-credential DoD that only a human may accept (flag 0 below).

## Pass 6 review (worktree substrate + scope audit + mandatory CAS — answers PR #271's third `VERDICT: FAIL`)

### Trigger

The cross-provider review of pass 5 returned `VERDICT: FAIL` again with two High findings (H1: gitless worker
snapshot is non-executable; H2: one negative probe cannot prove exact scope) and one Medium (M1: lifecycle CAS
optional). Verifying those findings against fresh code also surfaced a second, independently-reachable Medium not
named as a top-level finding by the review's own numbering but present in its findings list (M2: `dashboard-run`
omits the live `PUT /providers` route) and a third (M3: `meta-publish` has no crash-window reconciliation identity).
Pass 6 resolves all five. It writes no product code.

### Verification performed this pass

Same method as passes 4-5 — a fresh clone of `minion-factory@5db7d391` (re-confirmed still the pinned commit;
`minion-base@19531059` unchanged), every finding checked before it was acted on:

| Finding | Verdict after independent check | Fix |
|---|---|---|
| **H1** — gitless worker snapshot cannot run any of the four meta agents | **Confirmed, and worse than the review stated** | `agent/spec.sh`'s `require_exact_changes` (`:47-74`) needs a working `git rev-parse --is-inside-work-tree` and `git status`, is called **four** times across the two passes (`:366,369,424,427`, not once), and the normal path also needs two `git add`/`git commit` pairs plus `git rev-parse HEAD` (`:373-375,434-436,445`). `agent/reconcile.sh:407-424,528-532`, `agent/discovery.sh:149-165`, `agent/chat.sh:64-83` use the same shape. Fixed: the worker's edit surface is now a writable, credential-free, remote-stripped git worktree — the scripts' existing survey/commit-checkpoint calls run unmodified inside it; only `gh repo clone` and `push_meta()` are dropped. New `T-META-WORKTREE-WRITABLE`, `T-META-WORKTREE-NO-EGRESS`. |
| **H2** — one negative probe cannot prove exact scope | **Confirmed** | An over-scoped token denied on one unrelated target still passes; a probe against a nonexistent target is indistinguishable from a correctly-denied one to the token being tested. Fixed: invariant 1a becomes a scope audit — every in-fleet forbidden target enumerated (from `repos.ts`/`repos.json`), each target's existence independently verified, forbidden action classes probed on allowed repos too, evidence bound to the token's fingerprint so rotation invalidates it. `T-PURPOSE-NEGATIVE-SCOPE` redefined to require the specific "one forbidden target denied, another allowed" failure case; new `T-PURPOSE-SCOPE-FINGERPRINT-BOUND`. |
| **M1** — lifecycle CAS is optional | **Confirmed** | `expectedStatus`/`expectedRevision` were accept-if-present; `api/meta/status/+server.ts:18-31` types both optional and `meta-write.ts:90-119` only checks them when present — an omitting caller can overwrite a newer human decision today. Checked whether any in-process caller needed the optionality: `lifecycle.ts:263,454` (auto-triage) and `index.ts:106` (postmerge-close) call `transition()` directly, never through the HTTP route, so making the route require both fields has no effect on them. Fixed: both fields mandatory, 400 before any read/write when either is missing. New `T-LIFECYCLE-CAS-REQUIRED`. |
| **M2** — `dashboard-run` omits `PUT /providers` | **Confirmed as a live route regression** | `index.ts:731,735` serve both `GET` and `PUT /providers`; invariant 7's split had only ever listed the `GET`. Fixed: `PUT /providers` added to `dashboard-run`'s allowlist (not `dashboard-read`, since it mutates), with a positive-PUT/negative-read-principal test (`T-BASE-PROVIDERS-WRITE`) and an explicit settings-save exercise in `T-BASE-NO-ADMIN-BEARER`. |
| **M3** — `meta-publish` has no crash-window reconciliation identity | **Confirmed** | `minion-meta`'s branch is shared (not a dedicated per-run branch like the target-push binding's), so branch HEAD cannot identify this run's publication after a concurrent writer advances it. `ensurePhaseEffect`'s `reconcile → perform → confirm` protocol (`db.ts:1912-1955`) needs an identity-based `reconcile()`, which `ensureExactPush`'s branch-HEAD `observe` cannot supply here. Fixed: a bounded `run:<run_id>:candidate:<candidate-hash>` marker is trailered into every published commit; `reconcile()` walks branch history from HEAD (bounded to the pinned base) for a commit carrying that trailer, independent of concurrent-writer drift. New `T-META-PUBLISH-CRASH-RECONCILE`. |

### Changes made this pass

- **§0** — new pass-6 executability note summarizing all five findings, their confirmation evidence, and where each
  is fixed.
- **§2 invariant 1a** — rewritten from a single negative probe into a provider-backed scope audit (enumerate,
  independently verify existence, probe forbidden action classes on allowed repos, bind to token fingerprint, fail
  closed on any surprise).
- **§2 invariant 2** — rewritten: the worker's edit surface is a writable, credential-free, remote-stripped git
  worktree running the scripts' existing survey/commit-checkpoint flow unmodified, not a gitless read-only mount.
  The runner-private checkout and the "runner never trusts the worker's tree directly" rule are unchanged from pass
  5 — only the worker-facing substrate changed.
- **§2 invariant 6** — `expectedStatus`/`expectedRevision` changed from optional to mandatory at the HTTP boundary;
  in-process callers unaffected (they never go through the route).
- **§2 invariant 7** — `dashboard-run`'s route list gains `PUT /providers`.
- **§2 invariant 8** — added the `meta-publish` crash-window reconciliation identity (commit-trailer marker +
  history-walk `reconcile()`), mirroring the `push`/`pr-create` precedent in `containment-effects.ts`.
- **§3/§4** — DELTA bullets 1, 2, 4 and Slices 1, 2, 4, 5 updated: new file-touch notes, new/renamed DoD test-name
  patterns (`T-META-WORKTREE-WRITABLE`, `T-META-WORKTREE-NO-EGRESS`, `T-META-PUBLISH-CRASH-RECONCILE`,
  `T-PURPOSE-SCOPE-FINGERPRINT-BOUND`, `T-LIFECYCLE-CAS-REQUIRED`, `T-BASE-PROVIDERS-WRITE`), and fixture
  descriptions rewritten to match.
- **§7, §8** — verification steps 1, 2, 5, 6, 7 updated for the scope audit, worktree substrate, mandatory CAS, and
  provider-settings write; §8's revocation gate now also requires each purpose's audit evidence to be bound to its
  currently-deployed token fingerprint, and rotation is named as an operational trigger to re-run the audit.
- Frontmatter `pass: 6`, `verdict: pending`, `status: review` unchanged; regenerate `specs/index.json`.

### Disposition after pass 6

Unchanged mechanically — `status: review`, `verdict: pending`, `pass: 6` — for the same reason as passes 4-5: a
security-tagged spec keeps its human gates at approval AND merge, so no factory pass may self-approve it. The
recommendation is unchanged from pass 5: **approve the plan, and decide finding H4 explicitly** (the long-lived-PAT
deviation, flag 0 below) — this pass's findings were executability and evidence-completeness gaps in the plan, not
new instances of the H4 trade-off itself.

## Pass 7 review (provider-real scope evidence + replay-safe lifecycle — answers PR #271's fourth `VERDICT: FAIL`)

The latest review identified three High and two Medium still-current blockers. All five are accepted and resolved in
the spec without repeating pass 6's negative-probe approach:

| Finding | Resolution |
|---|---|
| **H1 — Contents-write cannot be provider-denied for merge** | The spec no longer claims `github-branch` is write-but-not-merge. Activation captures effective permissions and rulesets non-destructively and uses only disposable canary PRs. Without a verified ruleset denial, merge authority is an explicit human-approved deviation. |
| **H2 — local fleet inventory is not the token's full grant** | Activation now paginates the provider-visible accessible-repository set (or uses the organization PAT-admin grant through an independent controller) and compares it exactly to the purpose allowlist. Extra or unenumerable access fails closed. |
| **H3 — no-egress contradicts reconcile reads** | The boundary is now remote-stripped and write-credential-free, not network-free. Remote push/fetch and representative API writes fail; reconcile's required Actions/compare reads must succeed. `T-META-WORKTREE-NO-EGRESS` is replaced by `T-META-WORKTREE-WRITE-DENIED`. |
| **M1 — stale CAS breaks response-loss replay** | Lifecycle mutations require a durable `requestId` bound to principal and full request input. An exact retry returns the recorded canonical response before re-evaluating CAS; conflicting key reuse is 409. |
| **M2 — run-log route omitted** | `GET /runs/:id/log` is added to `dashboard-read`, Slice 5 routing, scoped-route fixtures, and the no-admin-bearer end-to-end surface. |

### Disposition after pass 7

`status: review`, `verdict: pending`, `pass: 7`. Security approval and merge remain human gates. The recommendation
remains conditional: approval must explicitly accept both PAT lifetime loss and `github-branch`'s provider-level
merge authority when no independently verified repository ruleset denies it.

## Pass 8 review (repository-bound write tokens + permission parity + deletion semantics)

Review-fix run `5b148f6c`, round 1 identified two High and one Medium blocker. All three were re-verified against the
current spec before editing and are resolved in the planning artifact only:

| Finding | Resolution |
|---|---|
| **H1 — approval hides shared tokens' fleet/all-ref/action authority** | Target-write credentials change from singular shared PATs to canonical repository→token maps; provider activation proves each nested token reaches exactly one repository. The approval decision explicitly retains and enumerates shared-across-runs lifetime, all-ref scope, and excess action authority for branch, workspace-prepare, and merge. |
| **H2 — merge permission is insufficient while workspace-prepare is undisclosed merge-capable** | `github-merge` gains Contents write for the exact merge endpoint. All three Contents-write principals are tested and reported as push+merge capable unless independent ruleset evidence removes an action; rollout and human-deviation text cover all three. |
| **M1 — candidate protocol cannot preserve deletions** | Candidate entries become discriminated `upsert | delete` operations. Deletes carry no child content, require a regular allowlisted file at the pinned parent, and apply exactly in the runner-private checkout. Fixtures cover deletion and rename-as-delete/upsert. |

### Disposition after pass 8

`status: review`, `verdict: pending`, `pass: 8`. Security approval and merge remain human gates. Approval must
explicitly accept the long-lived, all-ref, excess-action deviation for every one-repository target-write PAT, or
hold the source proposal's run/repo/ref/action-bound contract and require a minting path.

## Pass 9 review (lifecycle recovery + disposition CAS + fresh-schema parity)

Review run `5b148f6c` at exact head `d238656a` found four Medium blockers. Pass 9 accepts all four and changes only
their contracts and proof obligations:

| Finding | Resolution |
|---|---|
| **M1 — lifecycle PUT has an unknown-outcome window** | Slice 4 now reserves a `pending` request before PUT, marks the commit with `{principal,requestId}`, reconciles GitHub before retrying CAS, and durably/idempotently completes index sync and promotion before confirming the response. Tests crash after PUT, index sync, and queue creation. |
| **M2 — disposition UI lacks required CAS inputs** | Slice 5 now includes `SpecWarning.svelte`, its projection/loader, route, and contract tests. The exact rendered status/blob revision and stable decision request id reach confirm/reject; stale-page conflict is proved without a write. |
| **M3 — fresh databases omit receipt columns** | Slice 2 requires `purpose` and `target_repo` in both ALTER and canonical CREATE paths, plus `PhaseEffectRow`/`requireColumns`; the receipt fixture runs from an empty database as well as an upgraded schema. |
| **M4 — request key omits audit-bearing input** | The binding is a canonical full-request hash including `reason` and the discriminated status/disposition shape. Reason-only and shape-only reuse return 409 before GitHub. |

### Disposition after pass 9

`status: review`, `verdict: pending`, `pass: 9`. The four executability blockers are closed in the plan. Security
approval and merge remain human gates, including the unchanged PAT-deviation decision in flag 0.

## Pass 10 review (atomic token cutover + call-site purposes + compatible lifecycle rollout)

Review-fix run `6a0462ee`, round 1 identified two High and three Medium blockers. All five were re-verified against
the cited live consumers before the planning contract changed:

| Finding | Resolution |
|---|---|
| **H1 — map cutover omits singular-token consumers** | Slice 1 now includes containment effects, lineage phase transport, queue launch/preflight/readiness, and the canary behind one canonical repository-map resolver. `T-MAP-ONLY-CONTAINMENT-FLOW` proves the existing containment-v2 push/PR/readiness path with both singular variables absent before their atomic removal. |
| **H2 — mixed modules classified as checkout-only** | The inventory is call-site-granular. Reads remain `github-checkout`; normal project-label outbox writes use `github-project-labels`; husk comment/close uses `github-husk-pr`; disposition and sweep meta PUTs use `github-meta`; readiness retains bound branch/workspace-prepare purposes. Broad-token-absent fixtures cover each mutation. |
| **M1 — `by` rejection precedes caller removal** | Slice 3 derives the actor but tolerates/ignores legacy `by`; Slice 5 removes it from minion-base and proves both mixed-version pairs; Slice 6 hard-rejects only after Slice 5 deployment evidence. |
| **M2 — disposition writer omitted from replay slice** | Slice 4 now includes `possibly-shipped.ts` and routes the real `applyDisposition` path through the shared lifecycle request state machine. Crash and stale-CAS fixtures execute that writer, not only `transition()` or a route mock. |
| **M3 — durable request state contradicts schema rule** | The spec explicitly authorises one dedicated non-run-bound `lifecycle_requests` journal, with canonical CREATE and upgrade paths, immutable input hash, recovery and retention indexes, bounded pruning, and fresh/upgraded fixtures. It stores replay state, never run authority. |

### Disposition after pass 10

`status: review`, `verdict: pending`, `pass: 10`. These blockers are closed in the plan. Security approval and merge
remain human gates, including the unchanged PAT-deviation decision in flag 0.

## Human flags

0. **The PAT deviation is a decision, not a note (H4).** Approving this spec means either amending the source
   proposal's DoD to record long-lived, one-repository purpose PATs + exact provider-grant audits as the accepted
   M4 target — also accepting every target-write token's all-ref and push+merge authority unless a verified
   ruleset denies an action — or
   holding the original short-lived run-bound contract and sending the spec back for a minting-path pass. The two
   options are written out at the end of the spec.
1. **Slice 4 transcribes a policy decision that is formally open.** The interim source→target edge table is
   minion-base's shipped table, adopted verbatim because it is the behaviour humans use today. The owning decision
   (`runner/src/lifecycle.ts:30-33` → `2026-08-18-factory-durable-state-outbox-spec` §8) is still unresolved. Slice
   4's PR must state that it transcribes rather than decides, and carry a human confirmation.
2. **Slice 2 is the highest-risk slice in this spec** — it moves the factory's own meta-writing protocol. Its
   end-to-end gate (real spec + reconcile + discovery publication with `FACTORY_GH_TOKEN` unset) is not optional.
3. `2026-08-18-factory-durable-state-outbox-spec` remains `changes_requested`. This spec's evidence work depends
   only on already-landed `pipeline_instances`/`phase_effects`, so it is not a hard blocker — but a reviewer should
   confirm that reasoning still holds at implementation time.
