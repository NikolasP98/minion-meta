---
id: 2026-08-18-factory-browser-verification-stage
title: Isolated Chrome/AX/axe browser verification stage for UI-topic runs
status: in-spec
spawned_spec: 2026-08-28-factory-browser-verification-stage-spec
created: 2026-08-18
updated: 2026-08-28
repos: [minion-factory]
tags: [security, infra]
source: audit-2026-08-18
value: high
---

# Browser evidence for UI work — after containment, never before

Audit 2026-08-18: UI/UX/a11y-topic runs need behavioral evidence (acceptance
flows, AX-tree, axe-core, screenshots, console/network), but Chrome must NOT
enter the general-purpose agent container: browser authorization requires an
approved canonical UI topic AND a server-owned repo browser profile AND a
policy-resolved stage capability.

**Definition of done:** separate pinned web-verification image (Chrome for
Testing + chrome-devtools-mcp, no GitHub or model credentials, egress
allowlisted to the ephemeral preview origin); repos.ts gains preview command +
base URL + browser profile; stage sequence build→preview→Playwright flows→
axe→AX-tree→screenshots→console/network, artifacts under /out/browser/ bound
to candidate SHA + profile hash; missing preview profile for a UI-tagged repo
fails closed; page text/AX labels treated as untrusted injection input.

**Blocked by:** [[2026-08-17-factory-worker-containment]] and
[[2026-08-18-factory-topic-capability-manifest]].

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Approved at audit: BOTH declared blockers cleared (containment shipped; topic-manifest shipped). The extension point exists and rejects the stage by name (topics.ts:37 SUPPORTED_STAGES, topics.test.ts asserts /unsupported stage "browser-verify"/) — a bounded allowlist+image change. Ignore the stale Blocked-by line above.
