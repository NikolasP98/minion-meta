---
phase: 11-agent-lifecycle
plan: "10"
requirements: ["AGT-04", "AGT-05", "JOB-02"]
requirements-completed: []
status: locally-qualified-not-adopted
---

# Durable sender dispatch and terminal ownership

All three bounded implementation tasks are locally qualified. A successful fresh journal insertion grants one prompt opportunity; an identical replay, including after restart, never grants another. Only the five verified stable ACP stop reasons can settle a run. Unknown results and call failures remain unresolved. A local owner is released only after terminal journal persistence succeeds; failed commit retains occupancy.

Root reviewed the transaction and bridge paths and independently repeated all 102 tests (66 bridge, 36 journal), with zero skips in 8.59 seconds on Node22.23.2 and native SQLite. The suite includes actual emitted-module restart/admission/ACK controls and synthetic WS/ACP boundaries. Author package emission and TypeScript passed; the one lint warning is unchanged baseline debt.

The four exact source files, before-images, correction patch, author receipt and root test log are preserved in `../../operations/360/checkpoint-2026-09-11/sender/`. The patch depends on the recorded staged 11-03 foundation. No active package source was overwritten.

Official ACP initialization/session/prompt/cancel adoption, actual process termination, explicit unresolved recovery, minimum Node qualification, and sender/receiver integration remain open with exact source TODOs and `proposals/2026-09-08-platform-qc-remediation.md`. These tests do not certify a real agent harness, published package, image or deployment.
