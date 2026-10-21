---
spec: 2026-10-21-windows-qualification-kernel-containment-spec
pass: 2
verdict: approved
reviewer: codex-independent-standards-and-spec-review
created: 2026-10-21
reviewed_commit: 070dfbff759a9199e5f1a8c8b5cc5c281d1e40b6
---

# Kernel containment spec review

Proposal pass 1 approved the explicit contract transition, preserved release invariants and bounded scope. Spec pass 1 required corrected handle lifetimes and a crash fixture without an extra job handle. The technical review separately required exact private-job membership rather than NULL-job/outer-runner membership.

Both independent reviewers re-read revised pass 2 and approved standards and spec: completed-process references released before final accounting; exact target membership verified while suspended; first-action marker absent before resume; crash fixtures hold process handles only; bounded accounting cannot excuse a live survivor. Native compatibility, implementation correctness and release qualification remain unproven and are mandatory executable gates.

Approval permits reversible branch implementation under this design. It does not approve a production merge, reinterpret historical failures, waive any ten-run/full-shard gate or grant a sandbox guarantee.
