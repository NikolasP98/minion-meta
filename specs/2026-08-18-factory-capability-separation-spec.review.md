---
spec: 2026-08-18-factory-capability-separation-spec
pass: 4
verdict: pending
reviewer: factory-review-fix
created: 2026-08-18
updated: 2026-08-29
---

# Pass 4 review (executability fix — answers PR #271 `VERDICT: FAIL`)

## Trigger

Pass 3 rewrote this spec around the scoped-credential foundation that landed in `minion-factory@5db7d391` and
recorded `status: review` / `verdict: changes_requested` against itself. The cross-provider review of that branch
(PR #271, 2026-08-29) accepted the framing — it explicitly closed the prior H1 and confirmed the branch avoids
product code and preserves the human gates — but returned `VERDICT: FAIL` on three executability findings. Pass 4
resolves those findings. It writes no product code.

## Verification performed this pass

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

## Changes made this pass

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

## Disposition and why `pending`, not `approved`

`tags: [security, infra]` keeps human gates at approval AND merge (AGENTS.md SDLC contract), so no factory pass may
move this spec to `approved`. `changes_requested` was pass 3's own request for the correctness pass that pass 4
performed, and it additionally holds the spec behind the server-side `changes_requested` promotion gate; leaving it
set would misreport the state. `pending` = the plan is complete and awaiting the human security gate. The
recommendation to that gate is **approve**.

## Human flags

1. **Slice 4 transcribes a policy decision that is formally open.** The interim source→target edge table is
   minion-base's shipped table, adopted verbatim because it is the behaviour humans use today. The owning decision
   (`runner/src/lifecycle.ts:30-33` → `2026-08-18-factory-durable-state-outbox-spec` §8) is still unresolved. Slice
   4's PR must state that it transcribes rather than decides, and carry a human confirmation.
2. **Slice 2 is the highest-risk slice in this spec** — it moves the factory's own meta-writing protocol. Its
   end-to-end gate (real spec + reconcile + discovery publication with `FACTORY_GH_TOKEN` unset) is not optional.
3. `2026-08-18-factory-durable-state-outbox-spec` remains `changes_requested`. This spec's evidence work depends
   only on already-landed `pipeline_instances`/`phase_effects`, so it is not a hard blocker — but a reviewer should
   confirm that reasoning still holds at implementation time.
