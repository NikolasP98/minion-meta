# Review — 2026-08-18-sdlc-transformation-roadmap (pass 1 → pass 2)

Reviewed 2026-08-29 against meta blob `3dbdcd95dc3acd21e6940f2a02c7715e0a4fc193`
(pass 1, 70 lines) and against `NikolasP98/minion-factory` `main`.

## Disposition: STILL-REVIEW — revised to pass 2, verdict withheld

`status: review` / `verdict: pending` recorded in frontmatter. The document is
kept and repaired — not archived, not rejected — for reasons that are checkable
rather than editorial:

- **It is load-bearing.** Eight committed specs cite it as normative ordering:
  `factory-m0-safety-foundation`, `factory-topic-capability-manifest`,
  `factory-worker-containment`, `factory-capability-separation`,
  `factory-orchestration-round7`, `factory-memory-governance`,
  `agent-instruction-parity-and-repo-policy`, plus review sidecars. Archiving it
  would dangle every one of those references.
- **Its content matched reality on audit.** The ordering, the twelve-item proposal
  sequence and the twenty predicates check out against merged code (details below).
  The automerge constraint checks out against **repository-declared defaults only**
  — `.env.example` and `deploy.sh`'s accepted-value guard on factory `main`. The
  live posture is **unproved**: `deploy.sh` preserves whatever `FACTORY_AUTOMERGE`
  the box already holds, and that runtime value is not readable from this
  repository, so no part of this disposition rests on it. Nothing was found to be
  wrong; things were found to be *missing*.
- **Its repairable defects were structural** — no milestone→spec join, uncitable
  predicates, a gate-label collision, missing required sections. All fixed in place
  without changing a single milestone, principle, ladder rung or predicate.

**Why the verdict is withheld.** The one defect that is *not* structural is the
dangling authority itself. Pass 1 delegated M0–M9 deliverables, schemas and exit
criteria to an off-repo 2026-08-18 chat message. Narrowing that delegation
(roadmap §1.2) governs content this review could not read: `git log --all -S`
over every ref, `/memory/MINION` and its topic files, and 30,033 `claude-mem`
past-session observations queried for the program's own phrasings all return
nothing. Approving the narrowing would mean asserting, without evidence, that no
unique requirement is lost — which is what the run was told not to do
("preserve unique WIP"). §1.2 was therefore written so it retires nothing
("not binding today… not retired"), and the verdict stays pending until a human
with that chat closes DELTA 4 of
[`2026-08-29-roadmap-unhomed-program-detail`](../proposals/2026-08-29-roadmap-unhomed-program-detail.md).
Cost of pending: nil — the roadmap is `type: decision` with `repos: []`, so no
implementation is gated on it, and the §5–§10 ordering that eight specs cite is
unchanged either way.

## What was verified

| Claim | Method | Result |
|---|---|---|
| Blob identity | `git hash-object` on the working file | `3dbdcd95…` — exact match, reviewed the right revision |
| Twelve-item proposal ordering | `ls proposals/` per item | 10/12 resolve to same-named files; "DAG/slice continuation" and "portfolio reconciliation" have no standalone proposal, both absorbed by `factory-orchestration-round7` |
| Milestone spec statuses | frontmatter of all 16 owning specs | All match the new §4 table; recorded verbatim |
| `FACTORY_AUTOMERGE` stays 0 | factory `.env.example` and `deploy.sh` (repository only) | `=0` **declared**; `deploy.sh` rejects any value but `0`/`1` and preserves the box value. Production box value not readable from this repo, so the live posture is unproved — scoped accordingly in §2 and §7, and not used as approval evidence |
| M-milestone implementation | factory tree + merged PR list (#28–#153) + open PRs (#103–#160) | M0–M3 and M7 have merged code; M4 behind `FACTORY_CONTAINMENT_V2=0`; M5, M6, M9 unimplemented |
| `SDLC-CONTRACT.md` exists | `grep -rn` across meta | Does not exist. The M1 outcome shipped as `AGENTS.md` §SDLC Contract + `repo-policy.yaml` |
| "Stage gates G0–G8" defined | `grep -rnE '^#{1,4} *G[6-8]\b' --include='*.md' specs/ proposals/` (heading-scoped, = roadmap §12 step 5) | No match: nothing defines G6–G8. The bare `\bG[6-8]\b` variant returns 14 hits, every one a mention in this branch's own prose or the generated index — which is why the definition check is heading-scoped, here and in both artifacts' closure checks. The live ladder is G0–G5 in `2026-08-17-sdlc-phase-gates-scoring-spec` (G0/G2 shipped, G1 producer open as factory PR #158) |
| 20 predicates | counted the pass-1 prose | Exactly 20 — internally consistent, now numbered P1–P20 |

Two claims drafted for pass 2 were **falsified by running §12's own verification**
before commit, and corrected rather than shipped: "all twelve proposals exist" (it
is ten) and a step-5 grep that matched the roadmap's own prose. Both are fixed in
the committed text.

## Findings and their resolution

1. **Dangling authority (highest severity).** Pass 1 delegated all milestone detail
   to "the user's program message of 2026-08-18" — an off-repo chat message, which
   the `AGENTS.md` SDLC contract forbids as a state location. **Not resolved —
   scoped and escalated.** §1 withdraws the delegation (milestone specs are the
   fidelity authority) and states that content living only in that message is not
   binding until a spec adopts it *and is not retired by that rule*. Ratifying
   even that narrowed rule needs the source, which is unrecoverable here, so the
   roadmap's §1 *Disposition* subsection records `still-review` with an explicit
   flip condition instead of approval.
2. **No milestone→spec join.** Pass 1 named M0–M9 but never said which spec is which
   milestone; only 6 of 16 owning specs self-declare an M-number, and 5 declare none.
   Resolved by the §4 table.
3. **Gate-namespace collision.** Two `G<n>` ladders both claiming `G0`. Resolved by
   §10: unqualified `G<n>` means the phase-gates ladder; `G0–G8` is non-normative.
4. **Uncitable acceptance suite.** 20 predicates as one prose paragraph could not be
   cited by a milestone spec. Resolved by numbering P1–P20 verbatim.
5. **Missing required sections.** No `## 0. Product`, out-of-scope or verification
   section; the spec passed CI only via the content-hash exemption in
   `scripts/spec-heading-lint-baseline.json`. Resolved by adding all three and
   deleting the baseline entry — the ratchet permits shrinking, and
   `spec-index --check` passes without it.
6. **Ordering deviation, undocumented.** M7 promotion machinery (factory PRs
   #71–#153) and M8's discovery loop merged ahead of their M4/M5 prerequisites,
   while `FACTORY_CONTAINMENT_V2=0`. Recorded in §5 as a deviation — the ordering
   stays normative, the history is not retroactively blessed.

## Open ends (ledger)

None of these is resolved here; each is out of scope for a plan-of-record re-pass
and needs its own spec or a human decision:

- [`2026-08-29-roadmap-unhomed-program-detail`](../proposals/2026-08-29-roadmap-unhomed-program-detail.md)
  — `SDLC-CONTRACT.md`, "PR order 1–26", `G0–G8`.
- [`2026-08-29-roadmap-milestone-order-deviation`](../proposals/2026-08-29-roadmap-milestone-order-deviation.md)
  — audit shipped M7/M8 against predicates P5, P6, P7. Closing it satisfies only
  condition 1 of the roadmap §5 durable closure gate; conditions 2 (M5) and 3 (M6)
  stay open by construction.
- The same un-homed-detail proposal, DELTA 4 — recover the 2026-08-18 message and
  commit a requirement-level preservation map, or record that it is unavailable.
  **This is the item that gates the roadmap's verdict**; it needs a human, not
  another pass.

## Scope discipline

No product code was written: the spec was not validly approved for implementation
when this run began, and it is a `type: decision` document with `repos: []` that is
never implementable. The change set is four markdown files, two regenerated
indexes, one baseline deletion, and one generator fix (`scripts/proposal-index.mjs`
now projects and validates `effort`, which regeneration had been silently dropping
from an unrelated approved proposal's index entry).

Gates green, exit codes captured directly (not through a pipe):
`spec-index --check` · `proposal-index` · `check-agent-instructions` ·
`build-all` · `typecheck-all` · `test-all`.
