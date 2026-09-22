---
id: 2026-09-21-hub-optimistic-interactions-motion-spec
title: Hub optimistic interactions, autosave and async motion
stage: spec
status: draft
implementation_status: partial
pass: 2
verdict: pending
created: 2026-09-21
updated: 2026-09-21
repos: [minion-meta, minion_hub]
proposal: 2026-09-20-hub-component-service-centralization
type: feature
relationship: extends
related: [2026-09-20-hub-component-service-centralization, 2026-09-20-hub-datatable-cell-editing-followups]
tags: [ui, logic, data, security, test]
---

# Hub optimistic interactions, autosave and async motion

## 0. Product

Ordinary edits should feel immediate: change a value, move a booking, choose a tag, reorder a card. The interface reflects intent on the next paint while persistence runs asynchronously. Most reversible property edits need no Save button. Pending, failure and conflict remain clear, and a confirmed change becomes visible in other authorized views.

This specification covers both existing async feedback and opportunities to add it. It defines behavior and motion together: a faster animation cannot repair a UI that waits for a round trip before responding. It does not authorize production changes or assert implementation is complete.

Deliverables: [43-family interaction catalogue](../audits/2026-09-21-hub-optimistic-interactions/CATALOG.md), [all scanned source files and signal anchors](../audits/2026-09-21-hub-optimistic-interactions/SOURCE-INDEX.md), [calendar evidence](../audits/2026-09-21-hub-optimistic-interactions/calendar.md), [component evidence](../audits/2026-09-21-hub-optimistic-interactions/components.md), and [mutation evidence](../audits/2026-09-21-hub-optimistic-interactions/mutations.md).

## 1. Scope, evidence and AS-IS

Implementation update (2026-09-21): the user authorized beginning implementation.
The [Action Service implementation](../audits/2026-09-21-hub-action-tracking/IMPLEMENTATION.md)
now includes navigation, qualified table commands and finance jobs on top of merged
Hub PR #352 (`698aaa71`). The user also authorized merge/deployment; own release
gates remain in progress. The wider inventory remains staged for later slices.

Snapshot: Hub `master` at `0acd6282df74d18eacd27673fcf238cd16a29e56`, plus dirty working-tree changes; meta-repo source and shared design tokens also inspected. Source-only audit; no measured latency, browser interaction or production state is claimed. The supplied screenshot establishes the visible POS calendar controls and layout, not their timing.

The reproducible scanner inspected **1,055 client source files**, with async/motion signals in **507**. It excludes generated messages, server routes and recognized test/fixture files. It records 288 Save/submit-related lexical matches, 300 Svelte-motion matches and 457 CSS-motion matches; these include comments/overlapping patterns and are **not counts of buttons or defects**. Every scanned file, including zero-signal files, is indexed. The 43 rows consolidate observed families into reusable contracts; they are not 43 independent endpoints. Delegated callbacks, dynamic plugins and server-side effects cannot be fully classified by a lexical scan.

| Verified current implementation | Consequence for this spec |
|---|---|
| `src/lib/utils/optimistic.ts:15` retains a keyed overlay through a commit callback, including awaited invalidation; each completion deletes the key | Extend this helper with operation ownership and serialization. Do not introduce a rival optimistic store. |
| `ui/Toggle.svelte` already supports intended value, pending spinner and blocked re-entry | Reuse its contract; field/chip/calendar variants need equivalent state. |
| `BookingCalendar.svelte:511` clears drag before awaiting the move; Scheduling's `MoveConfirmDialog.svelte:42` retains a moved chip but asks for Save | Share the persistence contract across both renderers; ordinary move/resize commits on drop. |
| Booking PATCH lacks expected version; current row locking alone does not reject stale client intent | Add atomic stale-write detection and prove destination conflict/capacity safety before enabling optimistic move persistence. |
| `jsonMutation` acknowledges HTTP success before calling `onSuccess`; callers choose invalidation behavior | Keep transport acknowledgement separate from refresh success; a failed refresh must not roll back a committed write. |
| CRM uses `expectedUpdatedAt`; stock scalar PATCH lacks a comparable guard | Adapt existing guarded APIs and add guards where missing; do not call every endpoint autosave-ready. |
| Flow/skill autosave can clear current dirty state after an older request succeeds | Exact revision acknowledgement is required before more Save removal. |
| `animations.ts` exports fadeScale, slideIn, slideUp, fadeIn, scaleIn, staggerList and press; duration overrides and press have local timing paths | Centralize token/motion-preference resolution for CSS and JS. Reduced-motion token values alone do not prove every runtime animation stops. |
| `Chart.svelte` and workshop motion helpers already observe reduced motion; global tokens set durations to zero under reduced motion | Extend these patterns, including live preference changes and engine-specific effects. Preserve accessible alternatives. |
| Claude's table handoff describes cell editing, full-row `onSaveRow`, fill and optimistic overlay on a separate branch | This snapshot does not contain that branch's final implementation. Integrate its contract after landing; do not build a second cell editor. |

## 2. TO-BE: operation policies and Save-button decisions

Every operation adapter declares one of these policies. Default for an unclassified write is **confirmed**, not optimistic. HTTP method alone does not determine safety.

| Policy | What the user sees immediately | Persistence and gesture |
|---|---|---|
| L — local presentation | Selected tab, lane split, open drawer, dragged layout | Apply locally; no network barrier and no Save. Persist preferences separately if applicable. |
| R — asynchronous read | Updated filter/navigation intent, existing matching cached content, localized refreshing status | Cancel/fence obsolete reads; no invented results. No Save. |
| O — reversible mutation | Intended value/chip/position plus scoped pending status | Blur/Enter/selection/drop or bounded text debounce commits. Requires version/retry/error contract. |
| D — coherent draft | Immediate local preview and validation | Keep Submit/Apply for coupled fields, creation forms and atomic configurations. Split independent scalar properties from these forms where safe. |
| C — confirmed command | Pending intent and command progress; current effective fact remains truthful | Keep Send/Charge/Publish/Approve/Delete/Apply where meaningful. Completion requires server acknowledgement. |
| J — long-running operation | Queued/requesting/running feedback | Request acceptance is not completion. Track a job/run identity and authoritative progress. |

Remove routine Save for scalar names/descriptions, internal notes, manual tags, harmless preferences, personal layouts, ordinary single-booking moves/resizes, independent stock metadata, draft flow/skill edits and compatible cell edits. Conditional entry gates remain per adapter.

Keep deliberate actions for booking creation, external message Send, financial/stock posting, invoice emission, payment, shift closing, cancellation with package/series effects, shared-default publication, privileged access/credentials, deployments/provisioning, flow execution/publishing and coupled UOM/recipe configuration. These still receive immediate feedback; they do not falsely show a completed outcome.

## 3. Shared mutation architecture

### 3.1 Ownership and compatibility

Extend `src/lib/utils/optimistic.ts` through a shared typed controller and compatibility adapter. Keep `get/isPending/run` consumers working until migrated. Reuse `fetchJson`, `jsonMutation`, Pacer, Toggle, FormField, AsyncBoundary and the private org event manager. New UI state belongs in a small reusable `MutationStatus` composition, not separate local spinners in each feature.

One application-scoped coordinator owns pending mutations; the selected transport remains domain-specific (HTTP, RPC or local persistence). SvelteKit business loads remain permission-gated; gateway state remains WS-owned; QueryClient and custom caches receive adapters rather than wholesale replacement. The coordinator is a pending-intent layer, not another complete entity database.

Each adapter declares:

- Scope key: organization, principal, optional host, entity type and entity ID; temporary stable client identity for creates.
- Policy L/R/O/D/C/J; writable fields; validation; commit gesture; debounce; supported undo; concurrency grouping.
- `readCanonical`, `send(capturedOperation)`, canonical result/version extraction, permission-filtered refetch, dependency/query/cache invalidations.
- Retry semantics and capability flags: `versioned`, `idempotent`, `reversible`, `atomic`. Missing guarantees disable O for that operation and use immediate pending C feedback.
- Side effects and partial outcomes. An endpoint with multiple commits must report which succeeded; client rollback cannot undo already-committed server effects.

### 3.2 State and revision contract

Represent canonical baseline, authored draft and pending operation separately. Required states: `clean`, `editing`, `queued`, `saving`, `committed-refreshing`, `saved`, `failed`, `conflict`, `unknown-outcome`, and `local-only` where local persistence is supported. Jobs additionally expose queued/running/succeeded/failed/cancel-requested/cancelled.

Capture `{scope, clientOperationId, entityKey, localRevision, expectedVersion, patch}` before awaiting. Only one write per entity/concurrency group is in flight. Coalesce **unsent** patches, preserving different fields; do not mutate the payload of an in-flight request. Different entities may proceed concurrently with an adapter-defined bounded queue. Composite actions use one server transaction or explicit partial-result reconciliation.

Success for local revision N acknowledges N only. Draft N+1 remains dirty and queued against the newly acknowledged server baseline/version. Canonical data returned by the write settles the corresponding overlay; subsequent refresh failure produces `committed-refreshing` with retry, never a reversal or repeated write. Where an old endpoint returns only `{ok:true}`, keep the acknowledged overlay until canonical refetch settles or display confirmed-but-refreshing, with a bounded retry affordance.

Known rejection rolls back only the rejected projection. Keep authored text and edit context; newer revisions remain intact. Never restore an old whole-list/role/chapter snapshot over unrelated accepted changes. A 409 pauses dependent sends and presents current server value versus local intent; do not silently resubmit a stale full-row snapshot. 403 revokes edit affordances and retains draft only where continued access permits.

Timeout/disconnect/aborted request after dispatch means **unknown outcome**, not proof of failure. Each O adapter must supply an authoritative operation-status/receipt lookup, or an equivalent protocol that can prove whether this exact operation committed; current entity version alone is insufficient after intervening writes. Pause dependent sends while unknown. Reconcile before retry or rollback. Idempotent retries reuse the same operation identity. Do not auto-retry consequential actions whose idempotency is unproven.

### 3.3 Server protocol

Migrate O adapters to atomic compare-and-update: authorized row/version is checked and changed in the same transaction. Return `{entity, version, clientOperationId, warnings}`; conflicts return a stable code and permitted current revision/data. Do not compare timestamps in the browser to invent ordering. Existing timestamp tokens may remain opaque equality tokens during migration; new domain versions should be monotonically incremented server-side. Unauthorized replies must not leak current entity data.

Every O adapter must provide an organization/principal-authorized receipt or status lookup for dispatched operation identity, atomically recorded with its mutation, or document and test an equivalent proof protocol. Missing reconciliation support blocks O activation. Retain receipt identity without sensitive payload across reload, or recover it through the authorized server operation list; reload cannot silently reset an unresolved operation into a new write.

Creates/external commands require an organization-scoped idempotency key with stored request fingerprint and outcome; same key/different payload is rejected. A documented existing equivalent can satisfy this contract. Receipt retention must cover the permitted retry horizon. Consequential command identity must survive reload in scoped nonsecret storage or be authoritatively recoverable before offering retry; never store credentials/tender details with it. A timeout must not make the UI generate a fresh payment/message/booking identity.

Bulk table fill preserves Claude's `onSaveRow` until optional batch support is agreed. Coalesce invalidations after settled rows and return per-row outcomes; do not display all-or-nothing success for partial acceptance. Full editable snapshots require version checks to avoid overwriting another field.

### 3.4 Autosave gestures and draft lifetime

- Text: render on every keystroke; commit on blur or Enter for single-line fields; debounce 500 ms after idle with a 2 s maximum wait for ongoing typing. These are proposed **scheduling constants**, not animation durations. Domains may opt out for structured editors; document the override.
- Multiline: newline remains newline; use debounce/blur and Ctrl/Cmd+Enter for explicit flush where already appropriate. IME composition never triggers a partial commit; compositionend restarts scheduling.
- Select/toggle/chip: enqueue on selection immediately. A simple pending toggle may keep its existing re-entry block; text keeps accepting input and queues later revisions.
- Drag/resize: pointer/keyboard preview is local, commit on release/drop. Escape before dispatch restores preview; Escape after dispatch does not pretend to cancel server work.
- Navigation/unmount: coordinator survives route teardown; flush valid queued drafts or retain recoverable drafts according to declared policy. Never set dirty=false merely because the editor unmounted. Register same-origin navigation handling with a flush/retain decision; browser close is best-effort and cannot guarantee persistence.
- Persistence: preference drafts may use existing scoped local storage. Authored note/flow drafts require an explicit per-domain allowlist, org/user/entity keys and permission-aware restore. Never persist credentials, tokens, payment details or unrestricted sensitive fields. Clear on logout/account scope changes; do not introduce a generic offline write queue in this phase. If durable recovery is unavailable, expose unsaved state and prevent silent abandonment within the app.
- Undo: before dispatch remove the queued intent. After dispatch, offer Undo only if the adapter has a versioned compensating operation or server restore capability; track its result. Hiding a toast is not undo. Irreversible effects never get cosmetic Undo.

### 3.5 Accessible status and focus

One polite live-region owner per editing context (form, grid, calendar or drawer) coalesces status announcements; individual icons are not additional live regions. Announce the first pending transition and the final settled summary, not each keystroke or each row of a fill. Announce conflicts/actionable errors once and link their text to the affected field via FormField IDs. Background acknowledgement never moves focus.

When an optimistically removed chip/row owns focus, move focus to its next actionable sibling, else previous sibling, else the owning Add/list control. Capture the chosen destination. Rollback restores the item but must not steal focus if the user has moved elsewhere. For a provisional item replaced by server identity, keep the same DOM key and focus. Unauthorized content removal takes precedence over draft preservation.

### 3.6 Cross-view propagation

On a committed change, reconcile the current view from the response, then notify the shared invalidation registry. Map entity types to SvelteKit dependencies, client query keys and scoped local caches. Server commits emit private org-scoped entity/version/operation signals; publish identifiers, not sensitive record bodies. Reuse existing org channel plumbing while retaining workflow/telemetry consumers as distinct systems.

Remote signals update the canonical baseline without overwriting authored/pending intent. Deduplicate echoes by operation/version; coalesce invalidations. If version order cannot be established, refetch instead of applying a speculative patch. Reconnect/visibility recovery refreshes active scopes so missed notifications heal. Do not require a durable event log for convergence, and do not misrepresent `pg_notify` as one. Scope changes dispose subscriptions and quarantine old replies from the new org/host.

## 4. Motion and feedback catalogue

All motion uses existing design tokens via a shared resolver, including JS/Svelte transitions. Current token values are instant 75 ms, fast 150 ms, normal 250 ms and slow 400 ms; treat these as repository values, not hardcoded component durations. No network call, acknowledgement, focus transfer or error display waits for a decorative animation.

| ID | Interaction/primitive | Proposed motion and timing | Reduced-motion equivalent |
|---|---|---|---|
| M01 | Press, select, toggle | Immediate active/selected state; optional token-instant press and token-fast thumb/tint | Immediate state without scale/travel |
| M02 | Inline field and cell commit | Value stays in place; reserved status icon/text crossfades token-fast | Static status text/icon, no blink |
| M03 | Tag/chip add/remove | Stable keyed insertion/removal; token-fast opacity and bounded size change | Instant insert/remove, focus preserved |
| M04 | Card/list reorder | Pointer follows directly without lag; siblings use token-fast keyed position transition on discrete reorder | Direct positions, no interpolated movement |
| M05 | Booking drag/resize | Pointer preview; pending position retained at drop; outline uses token-fast change; no success bounce | Same geometry/state, no interpolation |
| M06 | Rejection/rollback | Only failed entity returns token-normal; inline reason and Retry remain | Immediate geometry correction plus message |
| M07 | Read navigation/filter/window | Controls immediate; preserve shell; token-fast content crossfade when correctly keyed results arrive | Swap correct content without fade |
| M08 | Drawer/dialog/popover | Existing foundation entry/exit, token-normal/fast; shell opens before content fetch | Immediate open/close with same focus and scroll-lock lifecycle |
| M09 | Initial load/refresh | First load Skeleton in reserved geometry; subsequent refresh keeps content plus local indicator | Static placeholder/status, no shimmer |
| M10 | Progress/upload/job | Actual byte/job progress interpolates token-fast; indeterminate only when total unknown | Static reported values and textual stage |
| M11 | Message and streamed output | Stable pending bubble inserted token-fast; stream updates same DOM node, preserve user scroll position | Immediate bubble/text; no per-token animation |
| M12 | Chart/sparkline data delta | Reuse Chart instance; bounded token-normal transition for new confirmed data, no repeated intro | Engine animation disabled, accessible data retained |
| M13 | Graph/workshop feedback | Preserve specialized renderer; share preference resolution and stop decorative continuous motion when hidden/reduced | Static layout/meaningful state; no decorative physics/pulse |
| M14 | Saved/error toast/status | Quiet scoped saved indication, persistent actionable errors; no toast per keystroke | Same information and lifetime, no slide/scale |
| M15 | Staggered lists | Do not stagger mutation results, search results or frequently refreshed business rows; existing staggerList limited to optional first reveal, total delay capped at token-normal | Zero duration **and delay** |

Extend `animations.ts` rather than add a second animation library. Its explicit duration/delay overrides and `press` must respect reduced motion, including changes after mount. Resolve only registered easing names; inspect existing `--ease-out` callers against canonical `--ease-exit`. `fadeScale`, `slideIn`, `slideUp`, `fadeIn`, `scaleIn`, `staggerList`, and `press` remain compatible exports during migration. New components select semantic roles instead of literal timing overrides.

Operational status appears immediately in text/ARIA; show a cosmetic spinner only after 150 ms to avoid brief flashes. No minimum spinner lifetime may delay success. After 2 s, use a clear “Still saving…” label; errors/conflicts have no artificial delay. These are proposed shared presentation constants independent of reduced-motion animation durations. Under reduced motion replace rotating/shimmering indicators with static pending state while keeping any operation timeout unchanged.

Performance acceptance targets (not measured baselines): next-paint local acknowledgement with p95 ≤100 ms across 30 repeated inputs on the local QA fixture; no intentional wait for the HTTP response. Drag stays responsive while a 2 s network delay is injected. Report test device, fixture size, latency and observed frame delays; do not generalize one machine's results into a production SLA. Motion uses transform/opacity where possible; avoid animating whole table/calendar dimensions or remounting their contents.

## 5. Calendar specification: the supplied appointments screen

### 5.1 Navigation and reads

Day/work-week/week, arrows, Today and invoiced/scheduled lane controls respond immediately. Split mode is presentation; it does **not** invoice or change a booking's status. Show selected range/view immediately, keep the calendar shell and time-axis geometry, and render only events keyed to that range/resource/filter scope. If only previous-window events exist, keep them visibly identified as the previous range while loading or use an empty matching grid with localized placeholder; never display previous-week appointments under the new week's heading.

Use a query-generation guard and AbortController for eligible reads. Cache keys include org, principal/permission scope, resource/kind filters, range, timezone and view-dependent data requirements. Reconcile authoritative windows by replacement/deletion as well as merge: moved-out/deleted events must disappear. Track tombstones/versions or invalidate affected windows after commits; stale pre-mutation reads cannot resurrect moved events. Bound cache size and refetch on reconnect/focus.

### 5.2 Moves and resizes

Ordinary single-booking drop/resize immediately sends the versioned patch and retains the new geometry with a pending indicator. No routine Save modal. Both `BookingCalendar` and `SchedulingCalendar` use the same mutation adapter while keeping renderer-specific hit-testing/layout. Keep unrelated bookings and navigation usable. For a second move on the same booking, retain newest local intent and queue it after the first settles; do not dispatch two conflicting requests without a proven ordering protocol.

Provide a non-drag booking action **Move or resize**. It opens a compact editor prefilled with date, start, end and resource; focus starts on date, Tab follows field order, Enter on the action **Move** commits once, Escape cancels before dispatch and returns focus to the event. This action replaces the physical drop gesture; it is not a second Save step. Announce the destination, pending state and result through the calendar status owner. Existing creation/capacity validation is shared with drag. On touch, use a dedicated drag handle with activation threshold so ordinary grid scrolling never moves an event; the Move or resize action is always available. Keyboard reordering of cards uses Move before/after actions sharing the same adapter.

The backend remains authoritative for resource membership, status, duration, timezone, buffers, overlap and capacity. Same-booking row lock is not evidence of cross-booking destination safety. Add an integration test with two bookings concurrently targeting a capacity-one slot and prove only permitted outcomes commit through a constraint, resource locking or another demonstrated transaction strategy.

Destination is a compound patch `{start,end,resource}`. On 409/validation failure restore only that operation's projection, preserve intended destination for correction, and show the reason near the event/drawer. On timeout keep an “Outcome unknown” pending position until canonical reconciliation resolves it. Do not animate a rollback if the move may have committed. Reconcile server-normalized times and returned warnings.

Series changes, policy overrides and transitions with package/stock/payment effects retain review. Existing off-hours shading is not enforcement; use the configured server rule. If off-hours moves are permitted with warning, show that warning from the result; if explicit override approval is required, open review before dispatch. Do not invent new scheduling policy in the motion layer.

### 5.3 Creation, drawer edits and commands

Paid-item drop inserts a provisional booking and marks the source line pending; duplicate attempts join the same operation. Ambiguous service mapping opens the prefilled form. Creation/slot conflict restores the tray/draft; acknowledged creation swaps server identity without remount. Preserve the existing atomic ticket-line scheduling guarantee.

Drawer internal notes and reversible metadata autosave. Full booking forms keep Create/Apply where coupled fields require validation. Booking PATCH followed by a separate tag PUT must show per-part outcomes or be replaced with an atomic endpoint before claiming one saved entity. Stale slot lookups cannot overwrite current service/day choices.

Completion/cancellation may commit status and return stock warnings: show completed-with-warning, not failed-and-reverted. Charge stays explicit. On confirmed ticket response, display receipt/next-step locally; refresh accounts/pending/calendar in the background where it does not gate the next action's correctness. Unknown payment outcomes require reconciliation before another charge.

## 6. Coverage and adoption ledger

The linked catalogue A01–A43 is normative for operation policy, gesture, immediate feedback and settlement. The motion catalogue M01–M15 is normative for visual behavior. The source index is discovery evidence, not a mechanically approved migration list.

At implementation intake, every discovered async/motion call site receives one disposition: inherited shared behavior, adapter migration, confirmed-command retention, intentional specialized renderer, or excluded noninteraction/comment. Record its family, owner, backend capability, tests and flag status. A file-level match does not prove every action in that file has been assessed; maintain operation-level entries as each slice is implemented. Do not claim universal rollout from sample coverage.

Dynamic plugin UIs, embedded terminal/remote desktop surfaces and external integrations outside Hub's renderer use the host pending/error boundary; internal implementation is out of scope until inventoried separately. Unknown actions retain explicit confirmation/submit where currently required.

## 7. DELTA and implementation slices

Slices are dependency ordered. Each is a small PR boundary; if backend endpoint fan-out exceeds one focused 4–8 hour unit, split by adapter before implementation. The entire fleet conversion is not one executable PR. Record all remaining adapters in the adoption ledger; do not silently mark the parent scope shipped.

### Slice 1 — Shared motion and status presentation

**Topics:** `ui`, `test`

D1: Extend animations resolver and pending-status composition, live reduced-motion handling, spinner-delay policy and AsyncBoundary background-refresh variant. Keep API compatibility. Tests: M01/M02/M08/M09/M14/M15, explicit duration override under reduced motion, zero-delay cleanup, rejected callback cleanup. No domain writes change. Files: `animations.ts`, UI foundations, proposed MutationStatus; shared tokens only if a missing semantic role is justified.

### Slice 2 — Revision-aware optimistic controller

**Topics:** `logic`, `data`, `test`

D2: Extend createOptimistic with operation ownership, per-entity serialization, captured snapshots, acknowledged-versus-refresh state and typed adapter capability gates. Integrate fetchJson/jsonMutation/Pacer. Tests: rapid A→B edits, first rejection, second edit during in-flight save, stale refresh, unknown outcome, org/host switch, create→edit→delete identity. Keep legacy consumers on enforced non-overlap until migrated.

### Slice 3 — Booking server mutation qualification

**Topics:** `data`, `security`, `test`

D3: Versioned booking PATCH and canonical result/warnings, stale-write rejection and destination concurrency proof. Reuse existing scheduling/POS transaction ownership. Any schema change includes QA seed/migration pairing. Tests: same-booking stale versions, two bookings/one slot, buffers/timezones, unauthorized resource, cancelled booking, paid-line duplicate create and warnings. This slice gates ordinary auto-commit drag.

### Slice 4 — Calendar read selection and freshness

**Topics:** `ui`, `logic`, `test`

D4: Query identity, localized refresh/error, bounded cache/window replacement and pending-overlay-safe reads across the two calendar surfaces. Tests: rapid navigation, Back/Forward, stale slot reply, deleted/moved-out booking, stale pre-mutation request, permission scope change. No renderer rewrite.

### Slice 5 — Calendar drag, resize and property adapters

**Topics:** `ui`, `logic`, `test`

D5: Integrate qualified booking adapter/controller into both calendars, remove routine move Save modal, persist pending geometry, scoped rollback and internal-note autosave. Keep conditional review paths. Tests: calendar acceptance matrix in §8 with keyboard/touch alternatives and slow network. Coordinate POS ownership; do not modify that session's work underneath it.

### Slice 6 — Committed entity propagation

**Topics:** `data`, `security`, `test`

D6: Extend existing org events with committed entity identifiers and invalidation mapping, permissions-preserving refetch, echo coalescing and reconnect recovery. Start booking adapter only; add contact/item in their own qualified adapter PRs. Tests: two views/tabs/users, foreign-org denial, visibility/reconnect, remote change during local draft. No payload-body broadcast and no wholesale cache replacement.

### Slice 7 — Ordinary property adapter migrations

**Topics:** `ui`, `logic`, `data`, `test`

D7: Separate PRs for contact/tag, stock scalar, profile/preferences, notes, and draft flow/skill adapters. Add missing backend version/idempotency behavior per adapter before O activation. Scope each PR to one family and its tests. Replace eligible Save buttons with field status; preserve forms/commands. Integrate landed Claude DataTable overlay/full-row contract; coalesce fill invalidations without pretending partial success is atomic.

### Slice 8 — Confirmed actions, uploads and jobs

**Topics:** `ui`, `logic`, `test`

D8: Separate PRs for upload/finalize feedback, sync/job stages, and confirmed-command progress/error presentation. Do not expand payment/security semantics merely to remove a button. Backend idempotency gaps become separately reviewed data/security work before retry changes. Test accepted-versus-completed, progress 100%-but-finalizing, partial outcomes and lost-response recovery.

### Slice 9 — Remaining motion consumers and adoption closure

**Topics:** `ui`, `test`

D9: Per-domain rollout of M03/M04/M07/M10–M13 and final call-site dispositions. Preserve specialized charts/graphs/workshop and semantic keyboard/focus behavior. Run source inventory again; all initially discovered call sites and newly introduced ones have documented disposition. Family flags default off until adapter qualification passes. A flag-off fallback keeps the prior validated behavior; it does not disable failure reporting.

## 8. Verification and acceptance

### 8.1 Required behavioral matrix

| Case | Observable assertion |
|---|---|
| Slow successful O mutation | Intent shown before response; only affected control pending; no snapback between write and refetch |
| 400/422 rejection | Validated field error linked to control; authored text preserved; only failed projection returns |
| 403 or revoked access | Effective permissions never speculative; protected content cleared on authority loss |
| 409 conflict | Server value/version and local draft remain distinguishable; no silent overwrite/retry |
| Write commits, refetch fails | State is committed-refreshing, never rolled back or resent |
| Timeout after server commit | Unknown outcome reconciles by original operation identity; at most one external effect |
| Edit N+1 during save N | N success does not clear N+1; N failure cannot undo unrelated accepted edits |
| Broadcast during active edit | Canonical baseline refreshes; draft stays; conflicts explicit |
| Navigate/org/host switch | No old-scope response affects new scope; valid draft retained according to policy |
| Reconnect/hidden tab resumes | Canonical refetch repairs missing signals; no event storm or duplicate objects |
| Provisional create then edit/delete | Stable UI key; server identity resolves once; latest intent retained |
| Mixed-result fill/group action | Per-row/part status; no false global success or whole-list restore |
| Removal and restoration focus | Focus falls to next/previous/owner; rejected removal restores item without stealing focus; provisional identity remains stable |
| Coalesced accessible status | One pending and one result summary per context; bulk fill does not generate per-cell announcements; error remains linked to field |
| Keyboard/IME | Enter/blur/Escape semantics hold; no mid-composition request; pending doesn't lose focus |
| Reduced motion before/during work | Zero nonessential motion/delay, identical status/results; dialogs release focus/scroll locks |
| Upload reaches 100% bytes | Shows finalizing until authoritative link completes; no premature downloadable success |
| Stock warning after booking completion | Committed status remains; warning has actionable recovery |
| Read range changes A→B→C | C owns active results; A/B may populate their cache only; old bookings never sit under C's heading |
| Two clerks move bookings to one slot | Backend capacity rule proven under concurrency, both UIs reconcile without false success |

### 8.2 Executable qualification

Use the local QA stack from Hub instructions (`bun run qa:up`, or existing `bun run dev:local`) and never production for mutation tests. Implement controller unit tests, endpoint transaction/concurrency integration tests and Playwright UI tests per slice. Use deterministic deferred responses/fake timers for races and actual local DB concurrency for version/capacity guarantees. Test at 0/150/800/2,000 ms injected latency plus dropped response and offline cases.

For every UI slice run `bun run lint:design && bun run lint:tokens`, focused Vitest tests and `bun run check`. Run relevant local QA flows and required CI before merge. Record screenshots/video of the calendar at pointer release, pending, confirmed, rejection and unknown outcome; capture reduced-motion equivalence. Existing UI comparison uses the user-provided screenshot only; the review demo is proposed behavior, not recorded app performance.

### 8.3 Definition of done

All A01–A43 families have adapter-level dispositions and test evidence or an explicit retained policy; all lexical candidates are classified before claiming universal adoption. Qualified O families no longer expose routine Save buttons. Pending, failure, conflict and unknown outcome are visible and accessible. Authorized views converge without lost edits. Consequential commands retain truthful confirmation. No unresolved test or implementation gap is hidden behind a animation or a disabled flag.

## 9. Out of scope and rollout controls

No Hub source changes in this specification task. No deployment, billing/security policy change, generic offline command queue, CRDT editor replacement, second DataTable engine, calendar-renderer replacement, new animation framework, or wholesale TanStack Query migration. Plugin/internal remote UI inventories remain separate.

Source findings and future work are documented here and in the existing proposal. No source TODOs are inserted during this read-only spec pass; implementation owners must add required `TODO(handoff)` plus proposal pointers for any open ends they leave. Preserve the concurrent table and POS sessions. Data/security-tagged implementation retains human approval and merge gates. This draft remains pending approval even after independent specification review.

## 10. Action service and global activity evaluation

[The follow-up evaluation](../audits/2026-09-21-hub-action-tracking/EVALUATION.md) recommends one typed action runtime for this spec's coordinator, with reactive status selectors and lifecycle signals. One logical action owns its requests, retries and refreshes. The existing root navigation/connection bar becomes a foreground-activity consumer; background polling, jobs and unresolved outcomes have distinct presentation. A code-authored action-definition factory precedes any visual builder. This is an evaluated direction, not a separately implemented state machine or approved expansion of scope.
