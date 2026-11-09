---
id: 2026-10-03-readiness-scheduling-link-mutations-spec
title: Truthful scheduling link and event-type mutation outcomes
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [logic, ui, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Truthful scheduling mutation outcomes

## 0. Product

HC-033 extends the approved client mutation contract to scheduling links and event-type deletion. A rejected deletion must remain visibly unsuccessful; an acknowledged mutation followed by a failed refresh must never be replayed. Adjacent link creation currently swallows known HTTP failures and belongs to this same route lifecycle.

## Out of scope

No server capability policy, public booking behavior, financial transaction or shared action-runtime contract changes. Event-type compound tag repair remains intact; only its save admission mirrors the unchanged server authority.

## AS-IS

- `src/routes/(app)/scheduling/links/+page.svelte:62` and `event-types/+page.svelte:70` await DELETE without checking status, then invalidate. Neither prevents duplicate clicks or shows rejection.
- Link creation checks `ok` but silently keeps its form on rejection; network errors escape. A successful POST clears the fields before an unchecked refresh.
- Event-kind settings already use `runTrackedCommand`, `runCheckedMutation`, `requireOk` and `checkedRefresh`; these are the shared semantics to reuse.
- Link clipboard timer has no unmount cleanup. Only lifecycle cleanup required by the touched route is included; public booking and event-type editor semantics stay owned by their existing modules.

## TO-BE

1. Known 4xx/5xx rejections expose a localized, text-only error and preserve the row/draft. There is no invalidation on rejected writes.
2. A pending mutation has an immediate handler guard and disabled relevant controls. Route mutations are serialized; no user can start a second delete/create while one remains pending.
3. A successful mutation is acknowledged once, then the existing scheduling dependency is refreshed with `checkedRefresh`. A failed refresh produces committed-refreshing and a refresh-only control. It never sends another DELETE/POST.
4. A network/timeout outcome after dispatch is unknown. Retain the draft or row, disable blind resubmission, and expose a refresh/reconciliation control. A successful refresh can clear an unknown DELETE only when the target is authoritatively absent. If it remains present, explicit user retry can be re-enabled. A successful refresh never authorizes replaying an unknown CREATE automatically: locate the exact submitted slug and compare its server-canonical trimmed title and duplicate-free, order-independent event-type ID set; confirmed matching creation resolves and clears its draft, conflicting or unavailable identity remains blocked with an explicit uncertainty message. A fresh creation is available only by explicit discard/new action after this result is shown.
5. Capture organization/user action-runtime scope before dispatch. Scope change or unmount aborts local observation, clears old draft/repair state, and suppresses late errors, toasts, refresh and completion publication. Scope change while a request is in flight does not imply rollback. Test both real action runtime and standalone component fallback ownership.
6. Use the existing UI primitives, semantic status tokens, localized English/Spanish messages and accessible alerts. Icon actions have accessible names; pending state is discoverable. No hard-coded dimensions/colors. Debt gates may only decrease.
7. Touched create/delete controls and handler admission mirror the existing server authority: scheduling:manage plus the actual central-hook capability (edit for collection POST/PATCH; delete for DELETE). The current UI edit/delete-only check can otherwise offer an action that will deterministically403. No server authorization is changed. Independent source review corrected the earlier assumption that collection POST mapped to create: neither scheduling links nor event-types is in CREATE_COLLECTION_ENDPOINTS. Their UI must match the current edit mapping. Event-type create/edit entry points and the editor save handler receive the same manage+edit conjunction.

## DELTA

Own the two route components, the event-type editor admission guard, central-hook/mapping regressions, a small shared scheduling mutation controller if reuse warrants it, focused mounted/unit tests and the specific new message keys. No API/server semantics or unrelated action-runtime consumers change. The controller must use the existing CommandOutcome vocabulary. Its own disposal/generation guard and AbortController cover mounted standalone consumers as well as context-backed production pages. A logical deadline of 15 seconds must settle UI observation even when injected fetch ignores AbortSignal; a late completion cannot clear a newer request. Clear timers and dispose state on route teardown. Retain the original global action ID. Successful authoritative repair reconciles that original attention record; read repairs use local guarded observation and never create additional confirmed-write attention records. A still-present deleted target becomes a conflict requiring review; explicit retry acknowledges that known conflict. Discarding an uncertain create draft must not falsely declare its unresolved write successful.

The retry/reconciliation operation is a read refresh, separately guarded. Bound retained state to one submitted snapshot and one target ID per mounted page. Do not retain credentials/customer payload in shared action history. Server errors are rendered as text. Submitted link title/slug/selected IDs are frozen while the unknown create is unresolved; known rejection restores editable intent. Selected event types are intersected with the current authorized projection before a new create is admitted.

Event-type editor save is already compound-aware; preserve its callbacks and tag repair. Deleting a configured service should still show the catalog service as dormant only after the refreshed server projection says so. The public booking links and event types use the unchanged endpoints and RBAC capabilities. Do not add confirmation dialogs or change permission policy.

## Verification

Mounted tests must cover each route: 403/409/500 keeps row and exposes error without refresh; success sends exactly one mutation and refresh; repeat click while pending produces one request; successful write plus rejected refresh or page error gets refresh-only repair; no write replay; transport rejection and never-settling request show unknown and retain intent; late acknowledgement after timeout cannot mutate state; scope change and unmount abort/dispose without publishing into the next scope. For link create, test invalid/removed selections, preserved text on known rejection, exact-slug identity reconciliation with equal/unequal title and selected-ID sets, duplicate invocation, and explicit discard/new action. Test recovery after refresh rejection without losing its snapshot. Test a role with verb permission but without manage and a role with both, proving unavailable actions do not dispatch. Use real production components and action helper behavior, not source-string assertions.

Run focused action/route tests, shared Svelte check, design/token lints and inspect browser presentation at desktop/mobile using Browser Harness when fixture composition is available. No production mutations are necessary.

## Review and release

Root Standards pass checks repository conventions, existing action semantics, bounded ownership, explicit no-replay outcomes and tests. A Sol independent Spec pass is required before implementation. Human merge/release remains a later gate. Source baseline is Hub07463ec1 with unrelated money changes in progress.
