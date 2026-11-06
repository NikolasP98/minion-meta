# Agent harness remaining-slice batches

The owner authorized autonomous implementation of all remaining 27 slices in six grouped PRs, with Astra generating/reviewing SDDs and handling escalation/verification, and Sol developing. Terra is not exposed by this harness.

The existing approved October22 specification is the behavioral contract. Six Spec Kit packages refine it against freshly fetched source. This batching instruction explicitly overrides one-PR-per-slice delivery; security/data merge gates, paid live experiments and production activation remain separate.

| Group | Product repository | Primary slices | Cross-repository support |
|---|---|---|---|
| A Chat | Hub | 3–5 | Required Hub evaluation adapters26 |
| B Factory | Factory | 8–9 | None |
| C Gateway | Gateway | 11–16 | Gateway binding20 and shadow/census30 |
| D Pulse | Hub | 17–20 Hub | Consumes Gateway binding in C |
| E Digest | Hub | 21–25,32 | Stacks on D schema and worker |
| F Evaluation | Meta | 26–31 Meta | Consumes A fixture/event contracts; Gateway30 lives C |

No original checkout, existing worktree, stash or branch is changed. All development occurs in the six isolated clones in workspaces.json. One heavy validation job runs at a time. Specs undergo two review passes before corresponding code; developers return evidence for independent Astra verification and convergence. Every approved acceptance must map to implemented, tested behavior, with truthful limits for deployment, paid execution and human corpus adjudication.

Current status lives in program.json. No PR or slice is marked complete because a worker was started or wrote an implementation.
