---
id: 2026-10-03-hub-client-mutation-selection-readiness-spec
title: Hub client mutation and selection readiness batch
stage: dev
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
verdict: approved
type: fix
---

# Hub client mutation and selection readiness batch

## 0. Product

This batch repairs HC-001 through HC-007 and UI-001 from the 2026-10-02 Hub/Gateway audit. Users must be able to trust that success means the requested state persisted, that a partial save keeps the remaining intent, and that a table action cannot silently operate on a record which disappeared from view.

The product result is truthful, recoverable mutation feedback across bulk tags, compound entity/tag saves, gateway creation, scheduling event kinds, Pulse editing, and POS status. The mobile bulk-tag panel stays inside the visual viewport.

### Invariants

The implementation must preserve these invariants:

1. A non-2xx response is never presented as success.
2. Once a primary write is acknowledged, a later tag, navigation, or refresh failure never causes the primary write to be replayed.
3. A partial fan-out retains the exact failed operations. A retry sends only those operations.
4. A network-lost create outcome is `unknown`; the UI retains the draft but blocks a blind create retry until authoritative state is reloaded or reconciled.
5. Selection is query scoped. Hidden IDs are either removed before an action or represented as an explicit all-matching selection with a visible hidden-count disclosure.
6. SvelteKit refresh is checked with `checkedRefresh`. If the write committed and refresh failed, the outcome is `committed-refreshing`; the UI may offer reload, but it must not replay the write.
7. UI edits use existing primitives and semantic tokens. `lint:design` and `lint:tokens` must stay green.
8. An organization/user scope change aborts observation, clears selection and repair tokens, and prevents a late completion from publishing into the new scope.

## 1. AS-IS

### HC-001 — bulk tag outcome truth

- `src/lib/components/tags/tag-bulk.ts` ignores `Response.ok` for the atomic stock/catalog request and every CRM row-by-tag request.
- CRM uses `Promise.all`, so one rejection loses the identity of requests that already succeeded.
- `DataTable.svelte` always clears the staged add/remove sets and emits a success toast after the helper resolves.

Observable failure: an HTTP 503 can produce a success toast and discard the staged intent; a CRM fan-out can partially mutate contacts without identifying the failed operations.

### HC-002 — query-scoped selection

- `selectedIds` is changed only by explicit selection controls.
- A new `data` projection, server page, search, filter, or an external archived toggle can leave IDs selected after those rows disappear.
- Count and ID-only bulk actions use the full stale set; row-derived behavior uses only the current `data`, so one displayed selection has two meanings.
- `onSelectAllMatching` deliberately creates a cross-page set, but the toolbar does not disclose how many selected records are hidden.

Observable failure: a bulk action can submit an ID which is no longer visible without telling the user.

### HC-003 — entity plus tag saves

- Booking create/edit, event-type save, and sellable create/edit check the primary response but do not check the follow-up tag response.
- The forms then navigate, close, or call their saved callback.
- `SellableWizard.saveTags` also makes edit autosave report success for a rejected tag assignment.

Observable failure: the entity commits, tags fail, and the editor exits as though the complete request succeeded.

### HC-004 — add gateway dual write

- The settings form checks `POST /api/servers` but not `POST /api/gateways`.
- It clears name, URL, and token before refresh even if the second write failed.

Observable failure: the Turso server exists, the Postgres gateway does not, credentials disappear from the form, and the user sees “Server added”.

### HC-005 — event-kind mutations

- Create, patch, default, recolor, rename, and delete ignore rejected HTTP responses.
- Create clears its draft on any resolved fetch.
- Every path invalidates as though the write committed; the invalidation result is not checked.

Observable failure: rejected settings appear briefly accepted, and a create draft is erased.

### HC-006 — Pulse proposal editing

- `saveEdit` ignores the PATCH response, closes the editor, and invalidates on every resolved fetch.
- The pending guard is only visual; a direct second invocation is not rejected.

Observable failure: a 403, 409, or 500 closes the editor and loses the JSON draft.

### HC-007 — persisted POS ticket status

- The service persists `status: 'void'`.
- The ticket detail checks for `'voided'`; every persisted void therefore falls through to the submitted/success presentation.
- The Drizzle schema comment also says `voided`, so the current inferred `string` type does not prevent the drift.

Observable failure: a reversed financial record renders as green Submitted.

### UI-001 — mobile bulk-tag popover overflow

- The shared Zag Popover positioner keeps its default `min-width: max-content` and does not request viewport fitting.
- The DataTable bulk-tag content has a fixed content minimum.
- At 390 px, opening the portaled panel increases document width to 539 px; closing it restores 390 px.

Observable failure: the page becomes horizontally scrollable while the mobile bulk-tag panel is open.

## 2. TO-BE

### Typed HTTP and compound-write outcomes

Extend the existing action-runtime seam for checked HTTP mutations and acknowledged primary/follow-up sequences. Do not introduce a competing lifecycle or outcome enum. Existing `CommandOutcome` statuses remain distinct:

- `succeeded`: all requested writes and the checked refresh/navigation completed.
- `failed`: the server rejected a write before any primary acknowledgement; the draft remains.
- `partial`: the primary write is acknowledged and a known follow-up write failed; the primary identity and exact follow-up intent are retained.
- `unknown`: transport ended without a trustworthy acknowledgement; the draft remains, but create is not automatically or blindly replayed.
- `committed-refreshing`: all writes are acknowledged and only the projection refresh/navigation failed. This is the code-level representation of the audit/report label `committed-refresh-failed`; both mean that the write must not be replayed.

The helper must be framework independent enough for focused unit tests. Components may publish the outcome through the existing action runtime, but must keep local draft/repair state because shared activity history intentionally does not store payloads.

### HC-001 — exact bulk-tag retry

- Model each CRM operation as `{ targetId, tagId, action: 'add' | 'remove' }`.
- Use `Promise.allSettled`, check every `Response.ok`, and return completed and pending operation arrays.
- Stock/catalog remain one atomic, idempotent transaction. A rejected response retains the full operation plan.
- DataTable keeps the staged display intent on failure. On a partial result it freezes that intent, shows partial feedback, and stores only the failed operation array for the retry button.
- Retry submits the stored failed array only. Success clears staged intent and repair state.
- After tag acknowledgement, refresh failure is reported as `committed-refreshing`; no tag write is replayed.

### HC-002 — explicit selection policy

- Extract pure selection reconciliation/count helpers from `DataTable.svelte`.
- Ordinary selection is current-projection scoped. When `data` is replaced, intersect it with current row IDs. Before an internal server search/filter/sort/page query is emitted, clear ordinary selection immediately. Infinite-page append keeps IDs whose rows remain loaded.
- `selectAllMatching` switches to an explicit all-matching mode. Its toolbar count displays total selected plus how many are not in the current projection.
- A later search/filter/sort query clears all-matching mode. Page navigation may retain it because the hidden count is disclosed.
- Built-in operations which need row data, including bulk edit and bulk tag tri-state calculation, are disabled whenever an all-matching selection contains hidden IDs. The toolbar explains that the user must narrow to visible rows. They must never silently operate on a visible subset while the count says all matching. Caller-owned ID-only bulk actions may receive the disclosed all-matching ID set.
- The selection anchor resets whenever reconciliation removes its row.

### HC-003 — repair only tags after the entity commits

- Check every tag PUT.
- On primary acknowledgement, retain the returned booking/event-type/product identity and the tag-ID snapshot until tags succeed.
- If tags fail, keep the editor open, show committed-partial feedback, and make the next repair action call only the tag endpoint. Do not POST the booking/event type/sellable again and do not PATCH the entity again.
- On a successful repair, invoke the original saved callback/navigation once.
- Sellable tag autosave rejects non-2xx so the existing save-status rail keeps the desired tag draft and shows failure.
- A failure after all writes, in callback/navigation/refresh, is committed-refreshing and does not restore a write retry.

### HC-004 — resumable gateway second write

- Snapshot the submitted name/URL/token.
- Check both responses. Once `/api/servers` returns 2xx, mark the server side acknowledged.
- If `/api/gateways` returns a known rejected response, retain the snapshot, keep the fields populated/frozen, show partial feedback, and make Retry call only `/api/gateways`.
- If the second POST has a transport-unknown result, block blind retry because the gateway might already exist. Require authoritative reload/reconciliation before another create attempt.
- Clear credentials only after the second write succeeds.
- Use checked refresh. Refresh failure is committed-refreshing and never restarts either POST.
- A transport-unknown first POST blocks blind re-submit and directs the user to reload/reconcile.

### HC-005 — checked event-kind commands

- All verbs check `Response.ok` and expose actionable failure feedback.
- Add clears name/color only after POST acknowledgement.
- Patch/delete leave the current control/draft in place on rejection.
- After acknowledgement, call `checkedRefresh(() => invalidate('scheduling:data'), () => page)`.
- A refresh failure is committed-refreshing and offers reload; it does not retry POST/PATCH/DELETE.

### HC-006 — Pulse draft preservation

- Ignore duplicate submit while the same proposal is pending.
- On 4xx/5xx, parse safe server error text, keep `editingId` and `editDraft` unchanged, and render the error.
- Only a 2xx PATCH closes the editor.
- Check the `pulse:feed` refresh. If it fails after the PATCH acknowledgement, keep the editor closed and report committed-refreshing rather than offering PATCH retry.

### HC-007 — canonical ticket status

- Define the shared client-safe ticket-status union as `'submitted' | 'void'` and use it in the Drizzle column declaration so the load result is narrow.
- Map the union exhaustively to submitted/success or voided/error presentation.
- Replace the detail page’s `'voided'` comparison with the shared formatter.
- Correct the stale schema comment. No storage migration is required because production already persists `'void'`.

### UI-001 — viewport-contained Popover mode

- Add an opt-in viewport-contained mode to shared Popover; retain its current defaults for the other 17 consumers. DataTable bulk edit/tags enable the mode.
- In that mode configure fixed, viewport-aware positioning and request Zag viewport fitting.
- Override Zag’s `min-width: max-content` on the positioner so its available-width maximum can take effect.
- Bound the content’s inline/block size to the visual viewport with semantic spacing and allow internal scrolling.
- Keep portalling, focus restoration, Escape, outside-pointer dismissal, anchor switching, resize behavior, RTL placement, browser zoom, native-dialog containment, and nested-layer behavior unchanged.
- Keep DataTable’s own horizontal scroller as the table overflow owner.

## 3. Blast-radius inventory

### Shared helper callers

- `bulkLinkTags`, `tagBulkState`, and `tagBulkIntent` have one production caller: `DataTable.svelte`. The existing test file is the only other caller. Changing `bulkLinkTags` from `Promise<void>` to a typed outcome therefore requires one production migration, while preserving the two pure tri-state signatures.
- Direct entity-tag callsites were inventoried. The compound-write scope is exactly `BookingCreateForm.svelte`, `BookingEditForm.svelte`, `EventTypeEditor.svelte`, and `SellableWizard.svelte`. Other tag writers (`InlineTagsCell`, booking drawer, CRM/stock detail pages) already check `Response.ok` or have their own reconciliation contract and are not migrated by this batch.
- `checkedRefresh` already serves stock/catalog mutations and its tests prove the committed-refreshing rule. New callsites must use the same helper rather than restating page-status checks.
- Shared `Popover.svelte` has 18 production consumers: artifacts, attachments, DataTable/filter/custom-property surfaces, global activity/notifications/chat, POS inline category and sell toolbar, scheduling calendar, tags, multi-select, identity/member access, and overview cards. The new mode is opt-in at the two DataTable bulk-bar popovers; defaults for the other consumers remain byte-compatible. Browser review still samples nested menus and native Dialog because those share the portal/layer action.

### DataTable callers and selection behavior

There are 38 production `DataTable` callsites plus three focused fixture components. Seven production routes enable row selection:

| Caller | Data source behavior | Bulk/selection risk in this batch |
|---|---|---|
| `crm/customers/+page.svelte` | server search/filter/sort with infinite append and `onSelectAllMatching` | cross-page IDs are allowed only in explicit all-matching mode; query change clears; hidden count is announced |
| `stock/items/+page.svelte` | page data replaced by archived toggle/invalidation; bound selection; bulk actions and tags | replacement intersects selection; tag action uses visible selected IDs; archive action never receives silently hidden stale IDs |
| `pos/catalog/+page.svelte` | page data refresh; internal selection; bulk edit and tags | replacement intersects selection; built-ins use visible rows |
| `stock/entries/+page.svelte` | page data/in-memory search, no bulk command | replacement removes stale visual selection |
| `brains/agents/+page.svelte` | page data/in-memory search, no bulk command | replacement removes stale visual selection |
| `socials/posts/+page.svelte` | page data/in-memory search, no bulk command | replacement removes stale visual selection |
| `finances/invoices/+page.svelte` | derived filtered array, no bulk command | filter replacement removes stale visual selection |

The other 31 production tables do not enable row selection, so the reconciliation seam must be inert for them. Cell-range selection is a separate state (`sel`) and remains unchanged except that the existing action scope reset continues to clear it.

Pagination rules are explicit:

- ordinary paginated selection clears before page/search/filter/sort `onQuery` dispatch;
- infinite append retains ordinary IDs because the selected rows stay in `data`;
- all-matching selection may span pages only while the same query remains active and the hidden count is visible;
- externally replaced `data` intersects ordinary selection even when no DataTable query callback ran.

### Success callbacks and draft ownership

| Surface | Current success continuation | New ownership rule |
|---|---|---|
| Booking create | `goto(returnTo)` | run only after booking POST and tag PUT acknowledge; tag repair retains booking ID |
| Booking edit | `onsaved(saved)` then `goto(returnTo)` | run once after tag success; repair retains parsed saved booking |
| Event type editor | `onsaved()` | run once after tag success; repair retains saved ID |
| Sellable wizard | close modal then `onSaved()` | run once after tag success; repair retains product ID; autosave failure remains in save rail |
| Add gateway | clear credentials then `invalidateAll()` | clear only after both POSTs acknowledge; checked refresh cannot authorize replay |
| Event-kind settings | `invalidate('scheduling:data')` | checked refresh after acknowledgement; create draft clears at acknowledgement, not refresh completion |
| Pulse editor | close editor then `invalidate('pulse:feed')` | close only after PATCH acknowledgement; refresh failure remains committed |
| DataTable bulk tags | success toast, clear staged sets, `onSaveComplete()` | partial keeps exact failed operations; clear after writes; checked refresh failure reports committed state |

### Partial commits and refresh boundaries

- Atomic stock/catalog bulk tags are one database transaction and are idempotent (`onConflictDoNothing` plus delete). A rejected response retains the whole plan.
- CRM bulk tags are independent idempotent row/tag operations. The result records each completed and pending identity; explicit repair sends pending identities only.
- Booking/event-type/sellable/gateway primary writes and tag/gateway follow-ups are distinct commits. The client repair token contains the acknowledged primary identity and an immutable follow-up snapshot; it never contains permission to execute the primary again.
- A callback, `goto`, `invalidate`, or route-error failure after final acknowledgement is projection failure. It clears write-repair permission and reports committed-refreshing.
- A transport-unknown create remains unresolved. It does not become failed merely because no response arrived, and the primary submit stays blocked until authoritative reload/reconciliation.

### Tenant and lifecycle boundaries

- Every new command uses `tryUseActions` when context exists, passes the command `AbortSignal`, checks `isCurrent()` before publishing UI state, and uses stable payload-free action IDs.
- DataTable observes `scopeVersion` and clears row selection, all-matching mode, range anchor, bulk tag draft, and exact retry operations together with its existing edit reset.
- Compound forms and the gateway page clear repair tokens on `scopeVersion` change. Late outcomes cannot navigate, clear a draft, invoke a saved callback, or retry an old-org entity ID.
- Component destruction leaves durable server effects untouched; cancellation only stops local observation.

### Accessible and mobile states

- Known failures and partial states render in an existing error/status region with `role="alert"` or `role="status"`; Retry is a real shared `Button` with an accessible label.
- Pending state disables duplicate submission. Partial repair disables mutation of the immutable follow-up snapshot until repair or authoritative reload.
- Hidden-selection disclosure is text, not color-only, and is included in the toolbar’s accessible status.
- Popover content remains keyboard reachable, Escape/outside-pointer dismissible, and returns focus to its trigger. Internal scrolling must not trap page/table horizontal scrolling when closed.

## 4. DELTA

| ID | Transition | Primary code boundaries |
|---|---|---|
| HC-001 | unchecked void helper → exact typed atomic/partial outcome; blanket retry → failed-operation retry | `tags/tag-bulk.ts`, focused outcome tests, `DataTable.svelte` |
| HC-002 | unscoped `Set<string>` → projection/all-matching policy with reconciliation and disclosure | new `data-table/selection.ts`, `DataTable.svelte` |
| HC-003 | unchecked second write and exit → acknowledged primary + retained tag repair token | new focused compound-action seam; booking, event-type, and sellable components |
| HC-004 | two unchecked client stages → acknowledged first stage + resumable second stage | settings gateways page and focused dual-write tests |
| HC-005 | fire-and-invalidate → checked commands + checked refresh | scheduling settings page |
| HC-006 | close-on-resolved-fetch → close-on-2xx only, checked refresh | Pulse page |
| HC-007 | stale literal/string → exhaustive persisted-status union | shared POS ticket status module, PG schema, ticket detail |
| UI-001 | max-content overflow → opt-in viewport-fit positioner/content for bulk bar | shared `Popover.svelte`, DataTable opt-in, parent-owned mounted/browser QA |

## 5. Out of scope

- No database migration, endpoint shape change, new permission, or bulk CRM endpoint.
- No redesign of every Popover consumer and no default positioning change for non-bulk callers.
- No persistent cross-session selection.
- No change to cell-range selection, table export, or nonselected tables.
- No claim of production readiness from unit/type/build checks alone; parent-owned local browser qualification and the separate production reconnaissance remain release gates.

## 6. Verification

### Test matrix

| Finding | Red signal before implementation | Required green proof |
|---|---|---|
| HC-001 atomic | `/api/tags/bulk` returns 503 | outcome is failed/unknown, no success, staged intent remains |
| HC-001 partial | one of four CRM operations returns 500 | exact 3 completed/1 pending result; retry issues one request only |
| HC-001 refresh | writes return 2xx, checked refresh publishes route 500 | outcome is committed-refreshing; zero write replay |
| HC-002 replacement | select A, replace data with B | selection emits empty; A is absent from every ordinary bulk submission |
| HC-002 server query | select A, emit page/search/filter query | ordinary selection clears before `onQuery` |
| HC-002 all matching | select all matching with hidden IDs | hidden count is disclosed; query change clears; page change is explicit |
| HC-003 create | primary POST 2xx, tag PUT 503, then retry | editor/draft remains; primary called once; tag PUT called twice; exit only after repair |
| HC-003 edit/autosave | entity PATCH 2xx, tag PUT 403 | committed-partial or failed save rail; no success callback/navigation |
| HC-004 | `/api/servers` 2xx, `/api/gateways` 503, then retry | credentials retained; server POST once; gateway POST twice; clear after repair only |
| HC-005 | each POST/PATCH/DELETE returns 403/500 | no invalidation; create and inline draft remain; visible error |
| HC-005 refresh | mutation 2xx, refreshed page becomes error | committed-refreshing; mutation called once |
| HC-006 | PATCH 409/500 and double click | editor/draft unchanged; one request while pending; server text shown |
| HC-006 success | PATCH 2xx | editor closes; checked refresh runs once |
| HC-007 | render status `void` | label Voided and semantic error tone; `submitted` remains success |
| UI-001 mounted | open DataTable bulk tags through the real shared Popover | viewport-contained mode positions the mounted panel without changing trigger/content semantics; no source-text assertion |
| UI-001 browser | 390 px and 320 px, open/close/rotate/table scrolled; repeat RTL and zoom; sample nested menu/native Dialog | `document.scrollWidth === document.clientWidth`; panel reachable; anchor follows resize; Escape/focus restore; sampled shared callers unchanged |
| Tenant switch | begin each command/partial repair, then increment action scope | request observation aborts; repair/selection clears; no late callback, navigation, toast-success, or old-org retry |
| Popover blast radius | representative tag, filter, nested menu, and native-dialog consumers | placement/dismissal/focus/stacking remain unchanged while viewport width stays contained |

### End-to-end verification

Focused tests must run first. Then run relevant component/API tests, `bun run check`, `bun run lint:design`, `bun run lint:tokens`, and the parent-owned browser scenarios. The final report records exact commands, outcomes, the runtime paths exercised, and any unproven safety fact. Compilation alone is not runtime proof.

## 7. Review gates

Pass 1 — Standards: verify repository instructions, Svelte 5 patterns, action outcome semantics, design tokens/primitives, i18n, and no blind replay after acknowledgement.

Pass 2 — Spec: verify every finding’s trigger and observable consequence is covered, partial operations remain exact, and no unrequested server/data behavior changed.
