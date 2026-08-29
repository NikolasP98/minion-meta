---
spec: 2026-08-18-factory-capability-separation-spec
pass: 5
verdict: pending
reviewer: factory-review-fix
created: 2026-08-18
updated: 2026-08-29
---

# Review sidecar — passes 4-5 (answers PR #271's two `VERDICT: FAIL` reviews)

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

## Human flags

0. **The long-lived-PAT deviation is a decision, not a note (H4).** Approving this spec means either amending the
   source proposal's DoD to record long-lived purpose PATs + negative-scope canaries as the accepted M4 target, or
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
