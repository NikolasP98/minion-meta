# Pass 2 independent review — Hub contracts and evaluation

Reviewed artifact: `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, pass 2, initial SHA-256 `8f97591a08878bab4da6b580c5de5c62c347235b1dc903cc4aed627ec01df4e3`.

Initial verdict: **changes_requested**, for the narrow live-adapter completion boundary below. All six pass-1 blockers are substantively resolved. This is a technical review, not human approval for implementation, paid inference or deployment.

## Pass-1 dispositions

| Finding | Disposition / reviewed correction |
|---|---|
| P1-R1 missing page/signal adapters | Closed: §4.1 explicitly adds owner token/revision/subscription to page-context, reuses actual onToolChange, extends attachment signing cancellation; A01 covers equal-value old disposer and scope changes. |
| P1-R2 accepted-run ownership/replay | Closed: bounded 256-entry/two-hour client accepted-run map, frozen scope, duplicate-final handling, unknown-lineage suppression, explicit fresh click and context-changing batch termination. Exact-run abort adds an optional existing gateway field rather than a protocol replacement. A02/A03 prove the cases. |
| P1-R3 client event sink and loss | Closed: bounded authenticated decision-events endpoint with server identity, enums/limits, memory-only buffer and owner-change discard; analytics dedup/loss semantics explicit; runner-owned append-only artifacts retain evaluation truth; off/shadow/enforce vocabulary preserved. |
| P1-R4 commit ordering | Closed: no-await critical section checks ownership, invokes transport, only then marks submitted on accepted return; rejection retains draft and lost acknowledgement does not auto-replay. |
| P1-R5 economic statistic | Closed: total cohort cost divided by successful episodes; paired episode-cluster bootstrap recomputes whole ratio, 10,000 seeded draws; unknown exposure, zero success and critical failures prevent promotion; synthetic counterexample mandatory. |
| P1-R6 size/dependencies | Closed: runner/corpus/report separated as 26–28; curation and paid execution separated as governed operations; no Factory dependency for router eval; trace fixture independent of digest UI; publication and feedback separated as 24/25. |

## Remaining narrow blocker at initial hash

**P2-R1 — Slice 26 only proves fixture/rejection paths, but §9.1 promises executable live mode.**

Slice 26 owns fixture runner plus synthetic Hub adapters and asserts that invalid live manifests are rejected. It does not explicitly own the working live provider/marked disposable QA adapter or prove valid-manifest acceptance with stubs. A parser that always rejects live would satisfy its written DoD while leaving the promised evaluation path unwired.

Minimum correction: state that the same runner includes explicit live provider and marked disposable QA adapters, with tests proving a valid approved manifest reaches a stubbed provider, every request/retry receives admission/receipt accounting, maximum effort/budget enforce, and only disposable side effects are available. Real paid execution remains a separately authorized operation. Alternatively explicitly exclude live implementation and require a later spec, but that is less complete relative to the current promised protocol.

This does not request real provider calls during implementation validation or review.

## Dependency and whole-artifact checks

- Parsed all 30 numbered slices and their dependency declarations: every dependency references an earlier defined slice, so no missing node or cycle was found.
- Router runner 26 depends only on 3/5; corpus 27 on 26; report 28 on 26/27; screening 29 on 5/28. Complaint pilot30 depends on actual watcher repairs and report. Mandatory repairs no longer wait for digest/evaluation.
- Selected-job worker19 is independently implementable; Pulse dispatch20 depends on18/19, not digest. The changed explicit-agent cron semantics are declared and qualified across Hub/Gateway.
- Full document read covers watcher stable admission, cross-store delivery receipts, Factory run-keyed reservation/deadline, Pulse admission/publication/budget/owner checks and rollout. Their deep verification remains with the other independent reviewers; this review does not substitute shallow approval for theirs.
- Asked durability reviewer to verify the concrete source-collector trigger/cadence: draining existing jobs is insufficient by itself to create proactive digest runs while clients are closed.
- No unnecessary server task-state system, new generic runtime, automatic feedback learning, authority-bearing correlation or new shared wire fields were introduced. Source and installed runtime evidence remain distinguished.

## Suggested G2 scores

| Axis | Score | Rationale |
|---|---:|---|
| slice_size | 7 | Material splits and separate curation improve executability; several cross-repository slices remain substantial and require stated preflight estimation. |
| dod_verifiability | 8 | Explicit states, acceptance IDs, commands and economic counterexamples; one live-adapter boundary needs closure. |
| scope_containment | 8 | Repairs and conditional experiments separated; concrete reuse avoids generic infrastructure. |
| impact_zones | 9 | Missing context/signal/abort adapters and new event endpoint now declared; cron compatibility impact explicit. |
| collisions | 8 | Actual dependency graph is acyclic and file owners serialize; existing artifact ownership retained. |
| testability | 8 | Source, fixture, database, browser, provider-stub and paid distribution evidence distinguished; complete live-adapter stub test needed. |

No product code or runtime behavior was changed by this review. A final amendment, if present below, identifies the exact subsequently reviewed artifact hash and verdict.

## Final pass-2 amendment

Reviewed final SHA-256: `1f3ef8329b698570eeebdfde6d1df96611d700565706a71d0963b0bba88cd70e`.

Final technical verdict: **approved**. P2-R1 is closed by Slice 31 and §9.1: the real inference transport adapter is explicit owned work, a valid approved manifest must exercise it using a stub provider, every attempt reserves and records exposure, and tools remain the same disposable fixtures. Fixture-only completion cannot be mistaken for a working live adapter. Actual paid execution remains a separate authorized operation. The split preserves the bounded runner/corpus/report slices and adds no production credential discovery or new QA authority system.

Read the additional final changes: §7.3 now checks due time inside atomic claim, not merely candidate selection; §7.4/Slice 32 own the scheduled source collector, persisted collection lease/due time, bounded fetch, scoped enqueue and empty-queue closed-client proof. The latter closes the proactive-trigger gap referred to the durability reviewer. Reviewed the watcher additions for consistency: terminal SDK result boundary, suggestion subreceipt/fallback, mirrored queue payload retention and explicit incomplete fallback-cost coverage preserve the stated evidence boundary. Deep runtime verification remains assigned to the relevant implementation slices and independent domain reviewer.

Re-ran the dependency parser against the exact final file: **32 slices, all referenced dependencies exist and point to earlier defined slices; no cycle**. Slice 31 depends on 26/27/28 and Slice 32 on 19/21/22/24. Mandatory repairs and router fixture qualification still do not depend on optional digest rollout.

Final G2 scores: `slice_size: 7`, `dod_verifiability: 8`, `scope_containment: 8`, `impact_zones: 9`, `collisions: 8`, `testability: 8`. The initial rationale remains applicable; the live-adapter caveat is now resolved. Source reconciliation and exact-dependency/runtime qualification are explicit future gates, not reasons to invent additional architecture now.

No unresolved blocking finding remains in this review. Approval is for this exact specification contract; it does not assert implemented behavior, successful paid evaluation, human approval, deployment or release readiness. No product file was changed.
