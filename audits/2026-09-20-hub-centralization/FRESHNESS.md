# Hub mutation and freshness audit

Source inspection: 2026-09-20, Hub checkout reported by the orchestrator at `0acd6282df74d18eacd27673fcf238cd16a29e56` on `master`, with concurrent table and POS changes. Evidence describes files observed during the audit, including working-tree content; it is not a deployed-state claim. Line references can move as concurrent work continues. No Hub source changes, browser checks, or runtime tests were performed.

## AS-IS: canonical index

| Concern | Existing implementation and evidence | Boundary |
| --- | --- | --- |
| HTTP transport and errors | [fetch-json.ts](../../minion_hub/src/lib/api/fetch-json.ts), lines 11–29 and 49–70 | `fetchJson` rejects HTTP/network failures with classified `ApiError`. It does not validate successful response bodies against a runtime schema. |
| Confirmed mutations | [json-mutation.ts](../../minion_hub/src/lib/api/json-mutation.ts), lines 14–21 | `jsonMutation` executes `onSuccess` after successful transport; callers own invalidation, conflict presentation, and pending state. |
| Page refresh | [navigation.ts](../../minion_hub/src/lib/navigation.ts), line 11 | Reexports SvelteKit navigation/invalidation; only `goto` is wrapped. No cross-tab change bridge is implemented here. |
| Out-of-load client queries | [query/client.ts](../../minion_hub/src/lib/query/client.ts), lines 5–20 | Singleton QueryClient for runtime panels/modals and client GET deduplication. Its documented contract excludes load-gated business pages and WS-pushed gateway state. |
| Debouncing | [pacer/index.svelte.ts](../../minion_hub/src/lib/pacer/index.svelte.ts), lines 43–109 | Sync, async, and keyed debouncers. Scheduling primitives are not a complete persistence coordinator. |
| Browser realtime | [org-events.ts](../../minion_hub/src/lib/realtime/org-events.ts), lines 55–85 and 108–169 | Refcounted private channel per org/tab; change signals prompt canonical fetches preserving RBAC and field masking. Typed convenience API currently covers `message.committed`. |
| Backend automation events | [events/emit.ts](../../minion_hub/src/server/events/emit.ts), lines 4–20 | Transactional `pg_notify` delivered on commit to the flows listener; fire-and-forget, with cron fallback and no v1 outbox. Not itself a browser refresh service. |
| Server data cache | [server/cache.ts](../../minion_hub/src/lib/server/cache.ts), lines 85–115 and 159–177 | Production defaults to noop, development to memory; optional Valkey. Gateway cache broadcasting is separate from browser realtime. Code warns that memory invalidation does not propagate across Hub instances. Runtime configuration was not inspected. |
| Customer pagination cache | [customer-page-cache.ts](../../minion_hub/src/lib/components/crm/customer-page-cache.ts), lines 8–87 | Bounded LRU, abortable foreground requests, coalesced prefetches, explicit `clear()`. Specialized navigation cache, not a general entity store. |
| Inline field editing | [EditableName.svelte](../../minion_hub/src/lib/components/users/EditableName.svelte), lines 12–40 | Domain-local name editor with async commit, rollback, and Zag `submitMode: 'both'`; candidate for generalization after agreeing interfaces with the table owner. |

## AS-IS: prioritized findings

### F01 — P1: mutations refresh local routes without a shared entity change contract

The [stock list](../../minion_hub/src/routes/(app)/stock/items/+page.svelte), lines 19–32, and [stock detail](../../minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte), lines 172–208, PATCH the same endpoint but invalidate `stock:items` and `stock:item-detail` independently. Their loads declare those distinct dependencies in [list load](../../minion_hub/src/routes/(app)/stock/items/+page.server.ts), line 10, and [detail load](../../minion_hub/src/routes/(app)/stock/items/[id]/+page.server.ts), line 12.

This refreshes matching current-page loads. It does not establish freshness for another mounted representation, tab, or user. The observed navigation wrapper adds no bridge. The missing shared behavior is a mapping from a committed entity change to affected page dependencies, client query keys, and local cache entries. Do not infer a live production outage from this source-only finding.

### F01b — P1: reusable browser realtime has narrow adoption

The only production caller found for `subscribeMessageCommitted`/`subscribeOrgBroadcast` is [CRM contact detail](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte), line 407. It filters message identities, coalesces refreshes at lines 380–397, refreshes on subscription at line 414, and self-heals with visibility and polling at lines 425–438. This is a reusable pattern; contact metadata, stock item edits, and customer list changes do not inherit it.

The backend event union in [emit.ts](../../minion_hub/src/server/events/emit.ts), lines 12–16, contains invoice upserts, booking creation, ticket status changes, and stock entry submission. Those automation events and browser change notifications have different recipients and delivery contracts. Generalizing browser freshness requires explicit committed entity events and consumers, not renaming the existing automation bus.

### F02 — P1: direct mutations bypass shared error handling

In [CRM contact detail](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte), lines 302–313, tag addition/removal calls `fetch` and invalidates without checking HTTP status. The general contact patch at lines 283–295 handles conflicts but otherwise finishes silently on non-2xx responses. The [stock list](../../minion_hub/src/routes/(app)/stock/items/+page.svelte), lines 19–32, repeats fetch/JSON/invalidation plumbing and returns only a success boolean.

The shared `jsonMutation` helper already prevents HTTP errors from reaching success callbacks. [TeamSettingsView.svelte](../../minion_hub/src/lib/components/team/TeamSettingsView.svelte), lines 59–72, demonstrates using it with route invalidation and error presentation. A domain adapter should retain this helper while adding the entity dependency mapping and conflict policy.

### F03 — P1: autosave needs consistent conflict protection

[CRM contact detail](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte), line 289, sends `expectedUpdatedAt`; its [PATCH endpoint](../../minion_hub/src/routes/api/crm/contacts/[id]/+server.ts) accepts and passes that field at lines 44 and 72, and reports stale writes at line 94.

The [stock PATCH schema](../../minion_hub/src/routes/api/stock/items/[id]/+server.ts), lines 12–29, has no expected revision field. [stock.service.ts](../../minion_hub/src/server/services/stock.service.ts), lines 381–410, reads the current record, validates merged UOM configuration, then updates using ID/org predicates only. It has no comparable stale-write guard. More frequent automatic saves would increase exposure to overwriting concurrent changes unless server and client revision contracts are added.

### F04/F05 — P1/P2: autosave coordination is repeated; flow saving has a race candidate

[Agent notes](../../minion_hub/src/lib/state/features/agent-notes.svelte.ts), lines 185–234, implement keyed timers, create/save coordination, retry tracking, fetch, and toast logic. Pacer already supplies keyed debouncing, but a migration must preserve the note-specific creation queue and bounded retry semantics.

[Flow editor](../../minion_hub/src/lib/state/features/flow-editor.svelte.ts), line 516, schedules `saveFlow` with a debouncer. Its save at lines 588–608 has no in-flight or revision guard and clears `isDirty` and the current draft after any successful response. An edit made while an earlier request is pending can therefore have its newer dirty/draft state cleared by the earlier success. This is a source-level race candidate, not a reproduced runtime failure.

The missing reusable contract is per-entity write serialization plus revision-aware acknowledgement. Replacing timers alone is insufficient.

### F06 — P2: the existing name editor needs a stronger reusable contract

[EditableName.svelte](../../minion_hub/src/lib/components/users/EditableName.svelte), lines 31–40, assumes a nonempty trimmed name and awaits `onCommit` without `try/finally`. A rejecting callback leaves its `saving` state true. The current [ProfileCard](../../minion_hub/src/lib/components/users/ProfileCard.svelte), lines 19–33, catches failures and returns false, so this is a reusable API gap rather than a demonstrated failure of that caller.

Promote a general field editor only after coordination with the concurrent DataTable work. Share field persistence state, validation, accessibility, and commit semantics; avoid a second table editing implementation.

### X02 — P2: specialized caches need invalidation adapters

The customer pagination LRU has explicit clearing, wired through [customer page](../../minion_hub/src/routes/(app)/crm/customers/+page.svelte), lines 78–89 and 742. It has no intrinsic entity subscription or TTL. Keep its pagination semantics and connect its clear/invalidate operation to the entity change registry. The QueryClient contract explicitly excludes these load-gated business pages; centralization does not justify moving every business load into TanStack Query.

## TO-BE: predictable changes across views

Reversible scalar fields, names, tags, and low-risk statuses commit on blur/Enter or a bounded debounce. Each editor exposes pending, saving, saved, conflict, and error states. A successful response acknowledges the exact revision sent and cannot clear newer edits. Retry preserves the draft and does not repeat non-idempotent effects blindly.

Committed entity changes carry a versioned, minimal org-scoped identifier payload. Existing private org subscriptions dispatch those signals to a dependency registry. Current-page loads, out-of-load query caches, and specialized caches each use their own adapter. Canonical fetches retain owner scope, field masking, and authorization. Reconnect and visibility regain refetch authoritative state; signals are not the record source of truth.

Keep explicit submission for coherent multi-field forms and destructive or financial actions. The stock UOM/packaging form contains related fields at [stock detail](../../minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte), lines 185–198. Contact forgetting already confirms at [CRM detail](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte), lines 333–336. Posting invoices, stock entries, and similar business commits should not become keystroke autosaves.

## DELTA: proposed transitions

| Sequence | Change | Existing foundation | Qualification before adoption |
| --- | --- | --- | --- |
| 1 | Register entity-to-dependency/cache mappings; document cache ownership | SvelteKit loads, QueryClient, customer LRU | Demonstrate correct affected views without invalidating unrelated org/entity state. |
| 2 | Consolidate mutation error/conflict handling in domain adapters | `fetchJson`, `jsonMutation` | Non-2xx never produce success; conflicts preserve drafts. |
| 3 | Add atomic server revision checks and a revision-aware save coordinator | CRM expected timestamp pattern, Pacer | Stale writes fail without overwrite; old responses cannot clear newer edits. |
| 4 | Extend committed browser entity signals and reconnect handling | Private org realtime, CRM message refresh pattern | Authorized tabs/users refresh; unauthorized consumers receive no record data. |
| 5 | Generalize field editor persistence contract with the DataTable owner | `EditableName`, ongoing table edits | Keyboard, pending/error/retry, and teardown behavior remain consistent. |
| 6 | Adopt on one reversible entity field, then expand by domain | Stock/CRM mutation adapters | Two representations and two clients converge under the matrix below. |

These are proposed implementation changes. This audit does not claim they are implemented or qualified. No new blanket query store, event bus, or autosave helper should be added before checking the indexed contracts.

## Required validation matrix

| Scenario | Required observation | Test boundary |
| --- | --- | --- |
| HTTP/network/validation failure | No success event or premature editor closure; error classification and draft retained | Mutation helper and editor integration |
| Conflict between writers | Atomic stale-version rejection; show current value without silently replacing the draft | Server transaction plus two-client integration |
| Edit while prior save is pending | Earlier response only acknowledges its revision; newer dirty state/draft survives and is subsequently saved | Deterministic deferred-response coordinator test |
| Reversed response timing | Final UI/server value follows the latest accepted revision; no stale acknowledgement | Coordinator and API integration |
| Retry after transient failure | Bounded retry; safe/idempotent mutation; persistent error remains visible | Coordinator test with fake timers |
| Navigate/unmount while pending | Defined flush or preserved-draft policy; no silent lost edit or update to a new entity | Editor lifecycle integration |
| Same-tab multiple representations | Successful mutation refreshes every subscribed representation of the affected entity | Component integration |
| Cross-tab and cross-user update | Other authorized active views refresh from canonical loads/APIs | Two-session local QA test |
| Reconnect/missed signal | Subscription recovery and visibility regain refetch authoritative state | Realtime adapter test and local QA |
| Event burst | Coalesced bounded refreshes; eventual latest value; unrelated entities unaffected | Realtime/dependency integration |
| Org switch/logout | Release old channels and caches; no old-org data or pending response enters new-org state | Session lifecycle integration |
| Owner and field permissions | Event payload contains no sensitive row content; refetch preserves owner filtering and masking | API authorization integration |
| Different cache families | Correct SvelteKit dependency, QueryClient key, or LRU eviction; gateway state remains push-owned | Adapter contract tests |
| Financial/destructive/form action | Explicit confirmation/submit retained; no automatic duplicate business commit | Domain integration and local QA |

Audit validation consisted of bounded `rg` searches and line-numbered source reads. No test result, deployment status, realtime latency, or production cache configuration is inferred from this inspection.
