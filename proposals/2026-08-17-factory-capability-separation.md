---
id: 2026-08-17-factory-capability-separation
title: Factory capability separation — per-run scoped GitHub credentials
status: approved
created: 2026-08-17
updated: 2026-08-18
repos: [minion-factory]
tags: [security, infra]
source: audit-2026-08-17
value: high
---

# Per-run scoped credentials instead of one shared PAT

Audit 2026-08-17 priority #3 (revised top-five). Today one broad `FACTORY_GH_TOKEN`
reaches every agent container and can write target repos, meta lifecycle state,
AND memory write-backs; lifecycle endpoints accept a caller-supplied `by` behind
a shared bearer.

**Definition of done:** runs receive short-lived credentials (GitHub App
installation tokens or equivalent) scoped to one repository/branch/action set;
separate credentials for (a) target-code pushes, (b) meta lifecycle commits,
(c) memory candidate uploads; `by` derived server-side from the authenticating
principal, never caller-supplied.

**Out of scope:** seccomp/egress hardening (separate proposal if pursued).

---

**Gate decision 2026-08-18 (delegated):** Approved for SPEC (M4 planning — GitHub App tokens). Merge human-gated.
