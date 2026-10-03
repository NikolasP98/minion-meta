---
spec: 2026-10-03-readiness-marketplace-spec
pass: 2
verdict: approved
reviewer: gateway_fixes-sol
created: 2026-10-03
---

Pass 1 blocked implementation pending final SQL publication fences, row-error
isolation, exact failed-root state, cross-process document leases, concrete input
bounds, end-of-transaction cache CAS and explicit HTTP retry/stale contracts.

Pass 2 approved A/B/C after the normative corrections settled every blocker.
The reviewer requires a real read-only repeatable-read transaction for list/count
consistency and catalog-then-hydration lock order. A second reviewer was also
invited; any additional implementation finding remains actionable.

Second Sol reviewer (hub_test_fixes) accepted the eight corrections and requested
three final clarifications: precise featured/model/search semantics, document
readiness before even the install handler's server-row write, and bounded cache
key admission. The normative second-reviewer section records all three. Its
approval was conditional on recording those requirements; implementation must
prove each before acceptance.

## Implementation review and local qualification

Sol accepted A/B/C after the parent corrected filter revisit pagination, database
verification digest pairing, old-writer provenance overwrite detection, scheduled
operation metadata and honest empty-state copy. The explicit cron-path registry
addition repairs registry drift; the broad marketplace handler delegation already
made the route reachable. No route-unreachable claim is retained.

Source commit: Hub `8cd6123a`. The combined native jobs lane passes 179 named cases,
including 15 marketplace cases, without skips. Mounted catalog cases cover every
filter, pagination revisit, reordered replies, load retry and stale install blocking.
Actual hook-to-cron authority cases and full Hub typecheck passed. See the readiness
ledger for receipts. Installation remains separately tracked as HC-034/GW-022; its
exact-target durable consumption and runnable-agent registration are not closed by
catalog/file-loading work.
