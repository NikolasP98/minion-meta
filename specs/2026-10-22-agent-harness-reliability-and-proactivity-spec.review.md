---
spec: 2026-10-22-agent-harness-reliability-and-proactivity-spec
pass: 2
verdict: approved
reviewer: codex-router-durability-filter-independent-reviews
created: 2026-10-22
score_slice_size: 7
score_dod_verifiability: 8
score_scope_containment: 8
score_impact_zones: 9
score_collisions: 8
score_testability: 8
---

# Agent harness specification review

Technical design approved after two independent review passes. The owner subsequently authorized implementation on 2026-10-22: “Okay, begin implementation. Use subagents and validate work.” The specification is now `stage: dev`, `status: implementing`; later merge remains pending. This review does not authorize paid inference, production writes, deployment or active classifier promotion.

## Reviewed identity

- Pass 1: `941c42fd4006a1021e0a63d131d66d1611e47c25d1e2d9f3a745684d9171c621`; all reviewers requested changes.
- Final reviewed pass 2: `1f3ef8329b698570eeebdfde6d1df96611d700565706a71d0963b0bba88cd70e`; all three reviewers approved their assigned source-validated domains.
- Initial approved snapshot: `02a8418cf5fd8f11007744d918c9efce3d33d18b78a7fcfd1961b3808e5570e6`. At that point the only change after the reviewed hash was frontmatter `verdict: pending` → `verdict: approved`; the body was byte-identical. Both reviewed snapshots are retained in the [evidence directory](../audits/2026-10-22-agent-use-transcripts/spec/).
- These hashes preserve the pre-implementation design review. The owner-authorized lifecycle/specification is now committed on the isolated meta feature branch in [draft PR875](https://github.com/NikolasP98/minion-meta/pull/875). Product source baseline pins remain those in specification §1; implementation commit identities are recorded separately.

## Review coverage and scores

Axes are slice size, DoD verifiability, scope containment, impact zones, collisions and testability, in that order. The canonical sidecar uses the minimum score on each axis across reviewers: 7/8/8/9/8/8. The canonical gate computes the aggregate; scores are technical assessments, not runtime measurements.

| Reviewer | Pass 1 | Final pass 2 | Final axes |
|---|---|---|---|
| Hub submission, lineage and evaluations | [Changes requested](../audits/2026-10-22-agent-use-transcripts/spec/pass1-router.md) | [Approved](../audits/2026-10-22-agent-use-transcripts/spec/pass2-router.md) | 7/8/8/9/8/8 |
| Pulse, jobs and digest durability | [Changes requested](../audits/2026-10-22-agent-use-transcripts/spec/pass1-durability.md) | [Approved](../audits/2026-10-22-agent-use-transcripts/spec/pass2-durability.md) | 8/9/9/9/9/9 |
| Watcher receipts, SDK boundary and Factory | [Changes requested](../audits/2026-10-22-agent-use-transcripts/spec/pass1-filter-factory.md) | [Approved](../audits/2026-10-22-agent-use-transcripts/spec/pass2-filter-factory.md) | 8/9/9/9/9/9 |

The pass-2 reports preserve their initial findings and append a final superseding disposition tied to the exact final reviewed hash. Each reviewer checked the revised contract against its assigned code paths; this is not an assertion that every reviewer independently inspected every file in all repositories.

## Finding dispositions

| Finding | Final contract and proof |
|---|---|
| P1-R1 context revision/cancellation APIs | §4.1; A01–A02 explicit owner token, subscriptions and cancellation adapter |
| P1-R2 accepted-run authority/replay | §4.1; A03 bounded lineage, stale-final/reload/choice/callback and exact-run abort cases |
| P1-R3 telemetry producer/storage | §4.2; A04–A05 explicit authenticated ingestion and best-effort loss semantics |
| P1-R4 submission acceptance ordering | §4.1; A02 synchronous commit, helper rejection and unknown acknowledgement |
| P1-R5 runnable evaluation and economics | §9.1–9.3; A26–A29 and A31 fixture/live paths and paired whole-cohort cost-per-success |
| P1-R6 unbounded slice/collision plan | §8; 32 owned slices, dependency matrix and per-file serialization |
| P1-A external flow provenance | §6.1; A10–A11 certify raw/Telegram only; external producer remains outside scope |
| P1-B mutable-policy dedup identity | §6.1; A11–A12 stable admission first, frozen revision and identity conflicts |
| P1-C classification state/retry/retention | §6.2; A12–A13 explicit dispatcher, bounded retries and replay tombstones |
| P1-D delivery bridge choice | §6.2; A14–A15 caller-managed queue ID, local settlement then acknowledgement |
| P1-E omitted suggestion accounting/SDK choice | §6.3; A16 narrow opted-in wrapper, resolved/unknown usage and exact-lock gate |
| P1-F Factory remint/deadline boundary | §5; A08–A09 run-keyed ledger and HTTP/body cancellation/deadline |
| DR-01 execution principal | §7.1; A20 strict owner/agent/session/credential binding and explicit-agent gateway semantics |
| DR-02 persistent owner budget | §7.3; A22 shared admission lock, UTC rollover and unknown exposure fence |
| DR-03 approved-state visibility | §7.2; A18 recent decisions/receipt endpoint and personal-org-only pilot |
| DR-04 retries/terminal/manual reconciliation | §7.3; A19–A24 due-time retries, explicit terminal states, no unknown replay |
| DR-05 publication conflict | §7.3; A24 reserved identity, exact readback, immutable decided card and cursor transaction |
| DR-06 worker prerequisite/sizing | §8; independent A19, separated A21–A25 and A32 |
| P2-R1 actual live adapter ownership | A31; valid approved-manifest path tested with stub transport and disposable tools |
| P2-A suggestion recovery | §6.2; A15/E3 one suggestion subreceipt, unknown → empty fallback, no automatic recall |
| P2-B SDK received boundary | §6.2; A13/E3 terminal SDK result, no raw pre-SDK-validation requirement |
| P2-C queue-copy retention | §6.2; A15/E6 both queue and SQLite payload expiry/tombstones |
| DR2-01 periodic source trigger | §7.4; A32 authenticated schedule, cadence/lease, empty-queue closed-client proof |
| DR2-02 stale claim bypasses retry delay | §7.3; A19 candidate plus atomic-claim due predicate |

## Remaining qualification boundaries

No design blocker remains in these reviews. Installed SDK compatibility, migrations, mounted/browser behavior, actual scheduler installation, deployed identities and model economics are implementation acceptance work, not completed evidence. Thirty-two 4–8h slice targets are estimates plus verification; material source drift requires reslicing/review before coding. Human labeling and paid/live runs are separate operations.

Scoped canonical metadata/index checks and the acceptance graph are recorded in [validation evidence](../audits/2026-10-22-agent-use-transcripts/spec/scoped-validation.txt). The full working-tree spec gate has unrelated pre-existing failures; this task preserves them and does not claim a fleet-wide green gate.

## Implementation authorization

The lifecycle and authorization paragraph were updated after the reviewed spec hash in response to the owner’s explicit implementation instruction. Normative requirements in §§1–12 are unchanged; lifecycle prose and slice progress are maintained separately. The earlier hashes identify the reviewed design snapshot, not the current lifecycle metadata. [Implementation ledger](../audits/2026-10-22-agent-use-transcripts/implementation/README.md) records source pins, slice status, validation and remaining work.
