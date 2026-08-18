---
id: 2026-08-17-factory-worker-containment
title: Worker containment — isolated read-only review, pinned images, no repo-code with shared creds
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [security, infra]
source: audit-2026-08-17
value: high
---

# Review must run where it cannot write, and setup must not run with secrets

Audit 2026-08-17 addendum P0 category. Today review runs in the same container
and working tree as develop (harness-level reset is a mitigation, not
isolation); repo-controlled setup/selfTest commands execute while shared
credentials are in the environment; base images and global CLIs are unpinned;
the runner's Docker socket is host-root-equivalent.

**Definition of done:** review stage executes in a separate container with a
read-only checkout of the exact reviewed SHA and no push-capable credential;
setup/selfTest run with credentials stripped from the environment (or a
credential-free phase); agent/runner images pinned by digest with pinned CLI
versions; adversarial regression tests for committed/staged/pushed/crashed
review cases.

**Out of scope:** rootless Docker / socket-proxy redesign (own proposal if
pursued); GitHub App per-run tokens (covered by capability-separation).
