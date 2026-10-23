# Feature Specification: Owned chat callbacks and decision evidence

**Feature Branch**: `feature/agent-harness-a-chat` (Hub)

**Created**: 2026-10-23

**Status**: Review pending; approved parent requirements, implementation refinement awaiting two independent passes.

**Input**: Owner: “batch their implementations in 1 PR per group … Run autonomously.” Group A batches parent Slices 3–5 and the Hub fixture adapter required by Slice 26 in one Hub PR. The full [approved parent](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md), particularly §§2, 4, 8–11, remains normative. These artifacts do not authorize merge, deployment, paid inference or proposed agent-engine P1–P4 work.

## 0. Product

A delayed assistant reply must not act on a different user's page. Operators must distinguish a classifier response from a decision actually used by a submission, and from a run accepted by the gateway. The same real chat paths must be available to the offline evaluation runner without production access.

## AS-IS

Source pin: Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, branch `feature/agent-harness-a-chat`, registered PR base `master`. Anchors below are relative to Hub at that commit, not deployed evidence.

| Current source | Verified behavior | Remaining transition |
|---|---|---|
| `src/lib/assistant/pending-submission.ts:17–100`, `page-context.ts:15–44`; Home `src/routes/(app)/home/+page.svelte:680–754`; `src/lib/components/layout/FloatingAssistant.svelte:289–398` | Slices 1–2 already freeze preparation identity/revision, cancel and guard local send; callbacks bypass routing. | Reuse this implementation; qualify it as a prerequisite, extend accepted-run lifetime only. |
| `src/lib/services/gateway/chat-rpc.ts:290–365` | Caller run UUID reaches `chat.send.idempotencyKey`; local submitted and async failure are distinct. No accepted-run binding/ack observation is retained. | Add additive frozen lineage and observation hooks without changing wire fields. |
| `src/lib/services/gateway.svelte.ts:1270–1349`; `src/lib/assistant/dispatch.ts:19–34`; `runner.ts:50–71` | Final handling clears `runId` before an asynchronous UI callback; per-session chains bound follow-ups at five, but UI calls lack frozen owner/context checks. | Capture run before clearing state; one final claim, guarded tool batch and fresh validated follow-up. |
| `turn-router.ts:244–273`; `src/server/services/assistant-router.service.ts:130–180`; route `src/routes/api/assistant/route/+server.ts:26–70` | Request lacks submission header. Classifier failure is null; absent cost and failure elapsed become zero at the route. | Retain attempt disposition/elapsed/provenance separately from optional decision. |
| `src/lib/server/observability-context.ts:124–151,286–305,367–378`; `posthog.ts:44–80` | Identity comes from server locals; capture sanitizes a flat allowlist. `p_sandbox` is emitted but absent from both field and event allowlists. | Extend the actual sanitizer, including nullable unknown cost and bounded provenance. |
| `tests/fixtures/critical-journeys/gateway-transport.ts:41–210`; `build.mjs:26–108` | Actual Home/gateway service runs on synthetic HTTP/WS; unknown calls fail. No three-arm trajectory adapter exists. | Add a versioned fixture-only driver/export for F using these real seams. |

Existing rate limiting in `src/server/auth/rate-limit.ts:1–32` counts requests per process. It does not yet atomically charge a batch's event count. Existing route auth deliberately treats classifier input as a personal observation, not a business mutation. The new observation route must explicitly document the same self-only classification in RBAC and additionally require current organization context. No generic JSON same-origin helper was found; the explicit guard pattern in `src/routes/api/dev/switch-user/+server.ts:16–24` is the local reference, not a dev-auth exemption to copy.

## TO-BE

A live final may act only under the exact accepted owner, session, surface and current page binding. Explicit callbacks remain available with full context. Routing and transport observations distinguish preparation, submission, acknowledgement and task evidence, with bounded authenticated ingestion. The evaluation bridge exercises those actual paths in disposable state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep a live reply inside its accepted owner and page (Priority: P1)

A user can stop, switch owner/session/page, or reload while a reply is pending without a delayed final performing stale page actions.

**Why this priority**: UI calls may change forms and must not inherit authority from whichever page is now visible.

**Independent Test**: Drive the actual gateway final handler and real tool registry with held tool promises, plus mounted Home/Floating fixture controls.

**Acceptance Scenarios**:

1. **Given** a registered accepted run, **When** its final arrives twice or a stream-finish callback is delayed, **Then** only one batch may claim the final, and current owner/session/epoch/context is rechecked before executing it.
2. **Given** an awaited tool, **When** actor/org/agent/session changes, cancellation occurs, or A→B→A occurs, **Then** subsequent actions and automatic follow-up dispatch are zero; completion cannot restore authority.
3. **Given** a valid tool that changes page/tool context, **When** it finishes, **Then** the old batch ends and only completed results may enter one newly captured, validated follow-up. Remaining old-page calls are never resumed implicitly.
4. **Given** expired/evicted/reloaded or unknown lineage, **When** history/final text renders, **Then** no automatic UI calls execute. An explicit choice/artifact click can start a new validated submission with full context; it carries a parent only when an exact live binding is known.
5. **Given** repeated valid read-result follow-ups, **When** five follow-ups have been submitted under one root, **Then** no sixth is sent. Existing navigation proposals remain user-confirmed and terminal.

### User Story 2 - Observe the routing decision that was actually used (Priority: P1)

An operator can join an early routing attempt to the later submission without mistaking server success for application.

**Independent Test**: Exercise real classify service → route → `captureServerEvent` → sanitizer with a stub fetcher/capture sink; exercise mounted pending cancellation and assert separate applied/discarded observations.

**Acceptance Scenarios**:

1. The preallocated submission UUID appears in `x-minion-run-id` and subsequent `chat.send.idempotencyKey`; malformed headers confer no authority.
2. Requested/resolved model, question/schema/gate revision, actual elapsed errors, tokens when supplied and known/unknown cost survive the actual sanitizer. `p_sandbox` and all existing probability fields survive valid input.
3. Off or explicit callback bypass produces an application observation and zero invented provider attempts. Modes remain `off|shadow|enforce`.
4. A successful server classification followed by cancellation/invalidation produces a discard; it never counts as applied. A locally prepared envelope counts as applied only at a submitted local transport transition; gateway acceptance remains a separate observation.

### User Story 3 - Ingest bounded self-owned observations and qualify real fixtures (Priority: P1)

An operator receives privacy-preserving observation batches and complete runner-owned fixture receipts with explicit lineage and missing-evidence counts.

**Independent Test**: Invoke the actual endpoint through its auth/origin/parser/RBAC path and actual capture sanitizer, then run the versioned fixture adapter with controlled resets and failure injections.

**Acceptance Scenarios**:

1. Server identity overrides forged actor/org claims; unknown event kinds/raw text fields reject; missing auth/org and cross-origin JSON requests reject before capture.
2. A batch contains at most 20 events and 16 KiB; combined batches admit at most 120 events/minute for one actor/org in the existing process limiter. A 20-event batch charges 20, not one.
3. The memory buffer contains at most 20 events, is abandoned on owner change, and never flushes under the successor's identity. Lost/repeated telemetry is coverage information, not durable completion proof.
4. Explicit callbacks/follow-ups carry exact root/parent/origin. Free text creates a new root. F deduplicates repeated event IDs and lowers coverage on missing events/receipts.
5. Each fixture arm starts from identical disposable state and runs the real context/gateway/dispatch path. Unsupported HTTP/WS/provider/tool operations fail closed and receipts include source/adapter revision.

### Edge Cases

Capacity 257 evicts the oldest binding and revokes its automatic authority; two-hour expiry is measured from creation and never extended by a duplicate final. Unknown ack, final-before-ack, terminal-before-ack and cancel-before-ack remain separate states. A late ack cannot revive canceled/expired lineage. Page change during a tool can be attributed to that single admitted tool only while owner/session/generation remains current; otherwise completed results are discarded. Unmounted surface callbacks cannot return. Invalid probability/nonfinite/negative cost is not silently zero. Buffer overflow/drop, fetch failure, partial analytics delivery and duplicate JSONL records lower coverage. Legacy callers without binding continue chat but cannot acquire automatic callback authority by text or session coincidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 / A03**: Retain at most 256 accepted-run bindings for two hours, clear on actor/org change, with frozen owner/session/epoch/context/root and final-claim/canceled/terminal state. Revalidate before and after every await, before tool invocation and before follow-up submission.
- **FR-002 / A03**: Preserve full-context explicit callbacks, five-follow-up cap, user-confirmed navigation and normal history rendering; unknown lineage has zero automatic UI authority. Context-changing actions end the batch and return only completed results through a fresh validated binding.
- **FR-003 / A04**: Propagate the early UUID through the route header and existing send key; report genuine provider attempts with requested/resolved identity, revision, elapsed disposition and nullable unknown cost. Extend both sanitizer layers for `p_sandbox` and all new allowed fields.
- **FR-004 / A04–A05**: Record prepared/applied/discarded decisions, transport submission, gateway acceptance/unknown and terminal outcome as distinct evidence. Off/bypass has no provider attempt. Explicit origin is `user|ui_choice|artifact|ui_followup`; free text never guesses a parent.
- **FR-005 / A05**: Authenticate self-only decision-event ingestion under server-derived actor/org, strict event/field validation, same-origin protection, 20-event/16-KiB batches and 120 events/minute. Keep telemetry IDs correlation-only and content out of analytics.
- **FR-006 / A05**: Buffer at most 20 memory-only observations; abandon queued/in-flight ownership on actor/org change; disclose coverage loss; downstream dedupe uses event identity, not content or timestamp.
- **FR-007 / A26-Hub**: Provide one versioned disposable Hub fixture adapter for F, importing actual context/routing/transport/final/tool seams, with fresh state per arm, strict request allowlists and append-only observation/receipt export. Its source lives in the A PR, never as copied patches in F.
- **FR-008 / A03–A05**: Preserve current RBAC/tool authorization, Svelte 5, semantic tokens and localized strings. Correlation/lineage never grants server authority. No new user-facing page/nav/business capability is introduced.

### Key Entities *(include if feature involves data)*

Accepted-run binding; explicit run relation; route-attempt envelope; applied/discarded observation; bounded owner-scoped buffer; disposable fixture receipt. Exact fields/state transitions are in [contracts](contracts/chat-evidence.md); fixture protocol is in [the A/F contract](contracts/eval-adapter.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every A03 adversarial case produces zero stale UI actions/follow-ups and no duplicate final execution; valid callback/navigation/five-follow-up cases remain available.
- **SC-002**: All A04 fields round-trip through the real capture boundary with nonzero measured failure duration where time elapsed and unknown costs retained as null.
- **SC-003**: All A05 auth/size/rate/enum/owner-switch cases fail closed; one routed user turn plus explicit UI follow-up is joinable without fabricated acceptance or guessed free-text lineage.
- **SC-004**: F can execute all three arms through the A adapter, with identical initial state hashes and zero external requests in fixture mode. Missing evidence makes the run incomplete.

## DELTA and verification

| Delta | Parent acceptance | Owned transition | Proving seam |
|---|---|---|---|
| D-A1 | A03 | bounded binding + final claim + guarded UI continuation/callback callers | real gateway events, tool registry, mounted Home/Floating |
| D-A2 | A04 | early ID, typed attempt provenance, sanitizer | service/route/capture integration |
| D-A3 | A05 | self observation ingestion + owner buffer + explicit joins | auth route and actual producers, F dedupe contract |
| D-A4 | A26-Hub | fixture adapter and reset/receipt protocol | built actual components and synthetic HTTP/WS |

See [plan](plan.md), [tasks](tasks.md) and [validation guide](contracts/quickstart.md). Parent full Hub gates and two independent review passes remain required. Browser screenshots qualify the installed synthetic fixture, not login, deployment or production RBAC.

## Assumptions

The owner explicitly overrides the constitution's one-PR-per-slice rule with one PR for A and six PRs total. Existing wave-1 code is reused, with regression evidence required. A03 adds no gateway wire field and no shared-package release. Weighted rate charging extends the current per-process limiter; this design does not promise fleet-global rate enforcement. The observation endpoint is an authenticated self-only telemetry write, not a new business-data permission; its explicit RBAC classification is reviewed/tested. Bounded aliases for callback message identity are ephemeral; history without exact identity starts a new root on explicit click. A/F use the protocol in this feature; F must pin the delivered A source and lockfile before integration evidence is complete.

## Out-of-scope

No classifier threshold changes, routing mode activation, persistent task-state service, model replacement, generic queue, production fixture account, paid evaluation, WhatsApp rewrite, automatic navigation or engine P1–P4 implementation.
