---
spec: 2026-10-03-readiness-faces-runtime-spec
pass: 2
verdict: approved
reviewer: root-orchestrator
created: 2026-10-03
reviewed_commit: b841c36750e4bf10dd3f81a4896b19c699fe3132
---

# Review

Pass 1 checked public ingress semantics, persistence bounds and private paths.
Pass 2 checked Docker DNAT original-destination matching, restart ownership,
logger/tail compatibility and the distinction between liveness and readiness.
The source fix cannot prove live ingress closure or reclaim the existing crash
artifact; those are explicit release gates. Independent implementation review is
required before the slice can be accepted.

Independent implementation review by Sol gateway_fixes approved commit
`45b294ec3` after two blockers were corrected: runtime-writable root startup
paths (including ancestor replacement) and firewall deletion during systemd
stop/start. Disposable-container permission probes and eight stateful firewall
cases pass. Optional Swift initializer parameters now default to nil, retaining
old constructor calls; three generated-source checks pass. Native Swift compile
was unavailable. Logging/tail/CLI checks pass33, RPC33. Production release and
external/private-path probes remain distinct gates; no production write occurred.
