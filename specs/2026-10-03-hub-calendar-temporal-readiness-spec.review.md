---
spec: 2026-10-03-hub-calendar-temporal-readiness-spec
pass: 2
verdict: approved
reviewer: root-orchestrator
created: 2026-10-03
---

Slices1-4 approved after the worker incorporated server timezone caller audit,
bounded Intl caches, non-hour transitions, scope-change gesture cancellation,
month/year clamp and skipped-date rules, per-domain canonical timezone policy,
and absolute-duration/end-order invariants. HC-011..023 remain concrete follow-on
slices that require their implementation details reviewed before code changes.
