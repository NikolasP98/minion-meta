---
phase: 09-security-containment
plan: "06"
status: gaps_found
scoped_source_verification: passed
requirements_completed: []
verified: 2026-09-09
---

# Independent gateway Shells receiver verification

Root read the frozen receiver/manager implementation and independently reran the receiver, manager and store suites: **39 passed,3 files,887ms,exit0**, no unhandled errors. Log: `/tmp/minion-09-06-root-independent.log`. The executor separately completed the gateway typecheck and four-file type-aware lint/format. Red evidence included JSONnull escaping frame assumptions and overlapping same-socket registration being accepted.

## Standards and behavior

Runtime guards reject malformed pre-auth JSON and invalid req/res/event shapes before manager authority. Handler/storage/transport errors use bounded safe diagnostics. Reusable device credentials retain valid reconnect behavior; synchronous registration reservation prevents a single socket admitting overlapping identities.

Per-shell registration/fatal mutation ordering prevents delayed older writes overtaking replacement admission. The code checks open/current socket identity around asynchronous boundaries and documents that an already-admitted storage write cannot be undone by closure. Pending forwards capture the full connection owner, and settlement requires both current map identity and the actual authenticated socket. Synthetic known-ID responses from another shell cannot settle the request. Cleanup removes old pending entries before closing, preserving newer owners and their timers; asynchronous send failure and timeout settle once.

Only delta/final/backup_done bridge events pass the allowlist, with required payload validation. The manager independently restricts names and rechecks ownership after storage lookup, then derives orgId from the stored shell. A bridge cannot spoof gateway-owned online/archive/error/quota lifecycle events through generic relay. Late close and event callbacks cannot alter replacement ownership.

## Remaining gates

This is current source verification, not deployed receiver adoption or full SDK/agent certification. Terminal relay remains transient;11-03 and phase14 own durable acknowledgments and logical run correlation. Persisted online status still needs a disconnect sweeper. Caught auxiliary timestamp/timer-read failures lack durable retry/reporting. Existing administrative provider/timer status races are outside bridge-origin mutation ordering. Exact source TODOs and the QC proposal retain these gaps. No real remote shell, provider, token export, deployment or production exploit occurred.

| Source | SHA-256 |
|---|---|
| `minion/src/shells/bridge-ws.ts` | `8a0b6fbd2026e7d30a2fa61e21684eaad185be9cc09b6880b20665bce5fde451` |
| `minion/src/shells/bridge-ws.test.ts` | `3fbdf8c819fc3565d3004ef4a04e4ae998a296976f1e64fac66e7db56d260f11` |
| `minion/src/shells/manager.ts` | `a8db03c3683c13a4ef2794b7f3e41186384ec98ad13ce9e6e9304546f426cbe2` |
| `minion/src/shells/manager.test.ts` | `f9cc2dc2bfcf1630d0f73ce8a293c415812e6692722f27ee6b539d8326a90580` |
