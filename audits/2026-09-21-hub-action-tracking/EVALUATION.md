# Signal-driven action tracking: evaluation

Implementation follow-up: [read/navigation foundation and revised table plan](IMPLEMENTATION.md).
The evaluation below describes the full target; only that first slice is implemented.

## Recommendation

Build a **Hub action service backed by reactive state**, with a typed action-definition helper and shared local/global status components. Integrate it as the implementation boundary of the existing optimistic-interaction coordinator. Do not add a second mutation state machine or treat a global HTTP counter as application truth.

Use one logical action record per user intent, with request attempts, refreshes and job observations attached beneath it. The global spinner is one derived presentation of these records. Local field/calendar feedback remains the primary explanation of what changed.

Evaluation only; no Hub implementation changed. Source checked at Hub `0acd6282df74d18eacd27673fcf238cd16a29e56` plus existing working-tree edits. The proposal below is not a tested performance result.

## Existing seams

| Source | Existing behavior | Integration |
|---|---|---|
| [Root layout](../../minion_hub/src/routes/+layout.svelte):117–127,164–168 | Top bar already responds to delayed navigation and `conn.connecting` | Replace its inputs with shared activity summaries; preserve navigation/connection labels. Do not add a duplicate bar. |
| [jsonMutation](../../minion_hub/src/lib/api/json-mutation.ts):14–21 | Awaits HTTP response and then `onSuccess` | Report write acknowledgement separately from refresh; a callback failure is not necessarily write failure. |
| [fetchJson](../../minion_hub/src/lib/api/fetch-json.ts):49–70 | Classifies transport/HTTP failures | Optional child request metadata; preserve behavior and return/error types for existing callers. |
| [createOptimistic](../../minion_hub/src/lib/utils/optimistic.ts):15–38 | Keyed intended-value overlay | Extend within the same action runtime; operation/revision owner controls settlement. |
| [Gateway RPC](../../minion_hub/src/lib/services/gateway-rpc.ts):33–36 | Non-HTTP request seam | Attach RPC attempts to action identity without coupling this leaf module to UI or creating import cycles. |
| [toastAsync](../../minion_hub/src/lib/state/ui/toast.svelte.ts):35–83 | Existing promise-to-loading/result toast wrapper | Presentation subscriber, not another action owner. One declared notification owner avoids three duplicate errors. |
| [QueryClient](../../minion_hub/src/lib/query/client.ts):5–20 | Out-of-load client querying; excludes business loads and WS state | Adapt its query/mutation lifecycle only where currently used. |
| [Polling](../../minion_hub/src/lib/utils/live-polling.ts):16–39 | Periodic and focus/visibility invalidation | Background classification by default; no global busy contribution. |
| [Finance sync](../../minion_hub/src/lib/state/features/finance-sync.svelte.ts):11–51 | Separate job/status polling state | Register the job once; status polls update it instead of spawning visible actions. |
| [Org events](../../minion_hub/src/lib/realtime/org-events.ts):108–169 | Shared private organization broadcasts | Signals for committed entity invalidation, not the local spinner source. Remote users' actions do not make this user's app busy. |

## Options

| Option | Benefit | Limitation | Decision |
|---|---|---|---|
| Global `fetch` interception | Broad HTTP attempt visibility | Misses RPC/streams/SSR semantics; raw HTTP success need not be business success; background noise and double counting | Optional diagnostics only; do not monkeypatch fetch for product state |
| QueryClient counters alone | Reuses query lifecycle | Excludes intentional SvelteKit/WS paths; would distort architecture if forced everywhere | Adapter, not authority |
| Per-component `busy` booleans | Easy locally | Duplicated errors/cleanup, no cross-view action identity | Migrate into scoped selectors |
| Typed action registry + reactive runtime | One semantic lifecycle, reusable UI, transport-independent | Requires operation classification and explicit adapters | Recommended |
| Generic event bus + manual start/stop emissions | Small initial API | Missing/mismatched events leave stuck counters; subscribers can create hidden side effects | Use typed observational events over state, not event-only truth |

## AS-IS → TO-BE → DELTA

**AS-IS:** navigation, gateway connection, field overlays, toast promises and finance jobs have separate state. A spinner can describe only a subset of work; `onSuccess` invalidation failures may obscure whether a mutation committed.

**TO-BE:** an action builder supplies a typed descriptor; the runtime executes through the existing qualified adapter/coordinator, owns action identity and lifecycle, and exposes reactive selectors plus typed lifecycle signals. Local status and the top bar derive from the same records. Endpoint attempts remain inspectable as children.

**DELTA:** add a normalized runtime and descriptor factory; bridge existing navigation/HTTP/RPC/job seams; derive foreground activity and attention summaries; migrate representative consumers, then expand through the existing 43-family adoption ledger.

## Architecture and ownership

`definition → action runtime/coordinator → domain adapter → transport`

`runtime state → scoped reactive selectors → local status + global activity + optional details`

`committed mutation → invalidation registry → authorized refetch → canonical reconciliation`

- **Definition registry:** static metadata and typed code references. Action names such as `booking.move` are stable; URLs, translated labels and entity IDs are not action names.
- **Runtime/coordinator:** sole writer of action lifecycle state; it also owns the optimistic/revision coordination already proposed in the motion spec. A separate read-only lifecycle projection is acceptable, but no independently mutable `busy` ledger.
- **Adapter:** authorization-preserving mutation/query semantics, outcome validation, serialization, idempotency, receipt lookup and invalidation. The wrapper cannot manufacture these guarantees.
- **Transport attempt:** HTTP/RPC metadata, cancellation handle and timing, linked to the logical action. Attempts do not decide UI success.
- **Status components:** observe state only. Shared package components may accept plain status props later; keep domain runtime Hub-local initially. Do not place service dependencies into `@minion-stack/ui`.

Create runtime per browser application/root context, so route unmount does not lose a pending write. Any server-side tracking instance is per request; never expose a mutable user-scoped SSR module singleton. Static definitions may be shared because they contain no user state. Explicitly pass parent context through async boundaries; do not use a global “current action” variable, which races under parallel requests.

## What “signals” means here

Use Svelte 5 reactivity already in the repository (`$state`, `$derived`, `SvelteMap`) for current state. No additional signals library is justified by this scope.

Expose typed lifecycle notifications such as `started`, `attempt-started`, `acknowledged`, `refreshing`, `job-attached`, `progress`, `settled`, and `attention-required`. These are local in-process signals, distinct from server/org broadcasts. Subscribers can inspect the latest snapshot after mounting; missing a historical `started` event cannot leave them stuck.

A validated transition updates the authoritative record, then publishes its notification. Duplicate or late terminal events are ignored by action/attempt identity and transition generation. Listener exceptions are isolated and cannot turn a committed mutation into a failed one. Observers never issue business writes or retries implicitly; retries and dependent commands are explicit runtime operations.

Signals may trigger registered invalidation/notification adapters through the runtime's declared pipeline. They are not unrestricted callbacks that launch arbitrary endpoint sequences. The runtime records pipeline stage outcomes, so an invalidation failure after acknowledgement becomes committed-refreshing.

## Action and endpoint identity

Minimum action metadata:

- `actionId`, stable `definitionId`, optional `parentActionId` and captured scope `{principal, org, host}`.
- Entity/concurrency key, local revision, optional server version, policy and visibility.
- Stage, timestamps, progress `{completed,total,unit}` only when actually known, sanitized label key and error kind.
- Child `attemptId`, stable endpoint template or RPC method, and retry ordinal; no request bodies, raw URLs with credentials, tokens or record names in the shared history.
- Optional durable `serverOperationId`/receipt reference for jobs and unknown outcomes.

A booking save with one PATCH and three invalidations counts as **one foreground action**, not four. A batch fill is one user action with per-row child outcomes; serialized/coalesced writes remain visible in its details. Parallel independent user actions count separately. Retries keep action identity, with new attempt IDs; duplicate wrappers attach to the declared parent rather than create a second root.

API coverage is an adoption ledger: each operation/endpoint template is assigned to a definition, child request, background observation or intentional exclusion. The initial wrapper cannot discover every fetch, SDK call, SvelteKit server load or plugin action automatically. Instrument unmatched calls for development diagnostics only; do not infer optimistic safety from coverage.

## Global and local UI policy

The global component is a quiet, nonblocking activity indicator using the existing top bar, plus an optional count/details affordance. Never place a blocking overlay over the entire app or mark the entire document busy.

| Record state | Global indicator | Local feedback |
|---|---|---|
| Navigation or user-blocking foreground read | Delayed busy indication | Matching view retains usable content or initial skeleton |
| Queued foreground write | Count as waiting work; delay spinner consistently | Immediate intended value and queued state |
| Saving | Busy while foreground action unsettled | Pending field/chip/event |
| Write acknowledged, dependent refresh running | “Updating views” if still foreground | Saved, refreshing; no reversal |
| Long-running job accepted | Transfer to job badge/count; foreground spinner ends | Queued/running progress, not false “done” |
| Poll, prefetch, telemetry, silent refresh | No global busy contribution | Optional contextual refreshing state |
| WS/SSE subscription lifetime | No global busy contribution | Connection status or job/stream-specific indicator |
| Failed, conflict or unknown outcome | Persistent attention count; no endless spinner | Recovery/retry/review appropriate to actual outcome |
| User-requested gateway connection | Bounded foreground connecting phase | Host status thereafter; autonomous reconnect is contextual |

Derive separate `foregroundPending`, `backgroundJobs` and `attentionRequired` summaries. `idle` means no foreground work, not “all data saved.” Never label the whole app “All changes saved” while an unresolved/local-only write exists. For queued/saving bursts, spinner appears after 150 ms continuous qualifying work, with no per-transition reset that postpones it forever; no artificial minimum duration delays settlement. Local pending feedback is immediate. Current navigation delay is 120 ms; unify deliberately as part of migration.

Multiple operations ending out of order cannot hide another action's busy state. Unknown outcome leaves an attention record and receipt-based recovery; it is not evicted as a completed action. A still-running operation crossing a deadline becomes stalled/needs-attention according to its adapter, not automatically failed or completed. Jobs with genuine progress do not expire on a generic HTTP timeout.

Progress across unrelated actions is a count, not a fabricated percentage. A 50 MB upload and a booking write do not have comparable units. The indicator uses existing Spinner/ProgressBar primitives and motion policy; reduced motion replaces rotation with static activity text. Local editing context owns routine saving announcements. The global component announces only aggregate transitions or new attention, without repeating per-field/row messages.

## Proposed action-builder API

Illustrative API shape, not an implemented or typechecked library:

```ts
const moveBooking = defineAction({
  id: 'booking.move',
  policy: 'optimistic',
  visibility: 'foreground',
  input: moveBookingSchema,
  adapter: bookingMoveAdapter,
  concurrencyKey: (input) => `booking:${input.bookingId}`,
  labelKey: 'booking.moving',
});

// Runtime acquired from application context; scope captured at invocation.
const result = await actions.run(moveBooking, input, { scope });
```

The runtime qualifies `policy` against adapter capabilities; an unsupported optimistic declaration fails definition validation instead of silently making an unsafe operation optimistic. Definitions remain code-authored and side-effect-free until run. `actions.run` returns a typed outcome (`succeeded`, `accepted-job`, `failed`, `conflict`, `unknown`) or a consistent typed rejection contract chosen by the implementation; freeze one public convention before coding. Recommended: explicit result union for business outcomes, exceptional throws only for programmer/configuration errors. No `false`/swallowed-error success path.

A status component subscribes by returned action handle/entity selector, while the top bar reads aggregate selectors. A simple `trackTask(descriptor, asyncFn)` convenience may wrap existing promise work under **confirmed/read** policy; it cannot opt into optimistic mutation without a qualified adapter.

Start with an options-object definition factory, not a long fluent chain. A future visual/action builder can select registered definitions and validated inputs. Sequential/parallel composition must define dependencies, cancellation, partial success and compensation. Chaining endpoints is not a transaction; financial/security commands retain their approval semantics. Do not execute arbitrary URLs or serialized JavaScript from builder data.

## Efficiency and lifecycle

- Normalize records by ID; maintain aggregate counters by validated state transition, not a full-history scan for each subscriber. Update a record and its counters together; terminal transitions are idempotent.
- Subscribe locally by action/entity key; top bar reads only small aggregate signals. Avoid copying the entire registry into every component or broadcasting changes through `window` events.
- Emit on semantic state changes. Proposed presentation cap: progress updates at most 10 per second per visible action, with first/final transitions immediate. Do not register each chat token, animation frame or polling tick as a new action.
- Keep minimal active records; bound queued work with backpressure. Proposed settled history: most recent 100 records, expiring after 5 minutes. This is a design default, not a measured optimum. Attention and active operations require explicit resolution/handoff and are not discarded by that TTL.
- Bound attention details separately with a capped view and minimal receipt identities; never retain arbitrary errors/payloads forever. A full view can paginate server-recoverable operations. Queue/history overflow must remain truthful rather than silently lose work.
- Timers only for indicator threshold, actual timeout/debounce and scheduled retention; no constant registry polling. Unsubscribe/dispose per owner; scope change hides old details and fences responses. Permission loss clears forbidden data while retaining only permitted recovery identity.
- Do not mirror all browser-tab actions globally by default. One client runtime tracks this tab's work; organization broadcasts reconcile data after commits. Cross-device action history would be a separate authorized server feature.

## Failure cases that decide whether the design works

1. Two foreground actions complete out of order; indicator stays busy until the last qualifying one settles.
2. PATCH commits, invalidation throws; record remains committed-refreshing, with no retry of PATCH or rollback.
3. Duplicate settlement/retry wrappers cannot underflow counters or create duplicate root actions.
4. Polling continues for minutes while foreground count stays zero.
5. Job submission returns 202; job remains queued/running while foreground spinner settles.
6. Lost write response becomes attention-required; receipt resolves it without replaying a new operation.
7. Read abort ends that read; write abort after dispatch is unknown until server reconciliation. Cancel is not Undo.
8. Remote update and local draft coexist; the runtime doesn't overwrite newer intent.
9. Org/host/principal switches and SSR concurrency cannot cross-contaminate records.
10. Observer throws or a status component unmounts; task lifecycle still completes correctly.
11. Large fill produces one root action, scoped child results, bounded progress updates and coalesced refreshes.
12. Failed requests preserve their error semantics; no success is inferred from HTTP 200 with a domain failure body.

## Adoption recommendation

1. Implement the typed registry/runtime projection and reducer tests, plus a navigation/read adapter and existing top-bar integration. Preserve established promises/errors and do not change business write semantics yet.
2. Add one existing simple toggle and one job adapter to demonstrate action-versus-request lifetime, local/global selectors and nonblocking presentation. Optimistic rollout still depends on the motion spec's version/receipt qualification.
3. Integrate HTTP/RPC child attempts, mutation acknowledgement/refetch stages and existing toast presentation. Add the source adoption ledger and prohibit new ad-hoc busy state only within migrated boundaries.
4. Grow the code-authored definition factory through calendar/fields. Consider composable or visual builders only after multiple adapters prove the lifecycle, failure and efficiency contracts.

This is a strong fit for centralization. Its value is predictable action state and reusable behavior; the global spinner is the simplest consumer of that state. No additional third-party signals library, new global endpoint interceptor, or server event bus is needed for the initial version.

## Review and limits

An independent source-review agent agreed with logical action tracking, derived foreground status, explicit parent identity and the existing coordinator boundary; it flagged double counting, jobs/streams, unknown outcome, SSR scope, event overhead and builder transaction semantics. Those concerns are addressed above. No benchmark, integration test or full endpoint coverage is claimed. Concurrent table/POS files remain untouched.
