---
spec: 2026-10-03-notification-slice3-catalog-outbox-spec
pass: 2
verdict: approved
reviewer: gateway_fixes-sol-and-parent
created: 2026-10-03
---

Independent Standards PASS and parent Spec PASS on author SHA-256 `9a9388d8183a01d6217cd1059d857439ba62229249c1bdb325f8a76cb6e8de32`. Canonical text only clarifies that the five nullable lease fields include renewal_count; generation and total claim count persist.

Review corrected the invoker-trigger privilege contradiction with a narrowly owned non-bypass SECURITY DEFINER trigger, added an enforceable renewal tuple, bounded claim/catalog query shapes with native plan negatives, capped every indexed envelope value, and required the actual dedicated RLS transaction pool with restoration proof. The source implementation must prove these contracts using restricted native roles and concurrent writers. This approval does not qualify a running notification worker or any production send.
