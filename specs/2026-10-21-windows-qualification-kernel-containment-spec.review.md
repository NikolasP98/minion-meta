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

The 2026-10-21 coordinator-crash clarification received independent Standards PASS / Spec PASS from both the native-unit and protocol/CI reviewers. It applies exact-birth retained process-handle witnesses to deliberate coordinator death, as already required for supervisor death, and preserves ordinary missing-result failure. Witnesses must retain the actual supervisor and fixed members before the kill, share one monotonic cutoff, record roles/identities/wait results and remain source-bound. This is design approval only; the revised implementation and native evidence remain pending.

Implementation source at Gateway `6c11a011cd054c3d18b1b70ed414ed7f34bdbc7e` received independent Standards PASS / Spec PASS from native and protocol reviewers. Native Windows CI `39568008279` passed all 17 cases and required Linux artifact verification. Local committed-head check and 43 portable tests passed. This proves the infrastructure implementation; human merge, product ten-run/full-shard qualification and production adoption remain pending.
