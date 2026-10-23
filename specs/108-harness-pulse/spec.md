# Feature Specification: Pulse approval and dispatch receipts

**Feature Branch**: `feature/agent-harness-d-pulse` (Hub)

**Created**: 2026-10-23

**Status**: Approved for development; both independent Astra technical reviews approved the exact frozen artifacts.

**Input**: Batch D implements parent acceptance A17–A20 Hub work in one PR. Gateway A20 belongs to batch C, not an additional PR. The owner requested one PR per group and Astra SDD/review with Sol development.

## 0. Product

A personal-org user can approve a Pulse proposal once, return later, and see whether it was queued, scheduled, rejected, or has an unknown outcome. Approval and scheduling are separate facts. Editing or dismissing a proposal while another request approves it has one authoritative winner.

This refines [the approved parent](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md), especially §§2, 7, 8, 10–12. Its full acceptance and safety requirements remain normative. User batching overrides the constitution's one-slice-per-PR packaging only. Human merge, deployment, real gateway qualification and paid/live inference remain separate gates. No new product scope or production migration is authorized here.

## User Scenarios & Testing

### User Story 1 — Decide the version I reviewed (Priority: P1)

A user edits or decides a pending proposal and receives the exact decision receipt.

**Why this priority**: Current approval can schedule twice before either decision is stored.

**Independent Test**: Exercise actual POST/PATCH handlers against a disposable PostgreSQL database with two independent connections. Concurrent approve/edit/dismiss produces one winning revision and no more than one dispatch/job.

**Acceptance Scenarios**:

1. Given a pending executable proposal, when two identical approvals arrive, then both observe the same receipt and only one dispatch exists.
2. Given a changed, missing, or stale executable revision, when approval arrives, then it requires refresh without dispatch. Edits and dismissals cannot alter an already approved snapshot.
3. Given an informational `digest`, `fyi`, or `draft_reply`, when approved, then the decision is recorded without a remote dispatch.
4. Given another profile in the same org, when it requests a new owner-bound receipt, then the response does not reveal that receipt. Existing informational rows without an owner retain existing access rules.

### User Story 2 — See what happened after approval (Priority: P1)

A user sees the authoritative status after refresh or reconnection, including uncertainty.

**Why this priority**: Scheduling acceptance is currently treated as the end of the approval flow.

**Independent Test**: Mount the existing `/pulse` page, notification popup and `/notifications` page Pulse section with real client mutation helpers and a stub gateway. Approve or dismiss, interrupt response/refresh, reconnect, and inspect the authoritative decision/receipt through the real route. Exercise the notifications SSR load separately against the real owner-scoped reader.

**Acceptance Scenarios**:

1. Given a committed decision, when refresh fails, then the UI reports a committed write awaiting refresh and never replays it.
2. Given a remote scheduling response, then the UI says scheduled, not executed. Unknown outcome shows a receipt reference and reconciliation guidance.
3. Given a receipt owned by the user, when they navigate away and return, then pending count is unchanged in meaning and a bounded recent-decisions section shows the receipt.
4. Keyboard approval, editing, receipt inspection, and error recovery work in English and Spanish, including approve/dismiss and recovery on the notifications-page Pulse cards.
5. Given a notifications SSR card rendered at revision 1 while shared state and the server hold revision 2, when either approve or dismiss is selected, then the real helper submits revision 1, receives refresh-required conflict and creates zero dispatches. Only after an explicit refresh displays revision 2 may a new user decision submit revision 2.
6. Given a committed notifications-page decision followed by failed `app:notifications` invalidation, then its authoritative decision/receipt remains visible, stale decision controls cannot replay the write, read-only recovery issues no second mutation, and reconnect recovers the same decision/receipt.
7. Given another same-org owner, missing review access, a business org or hidden Pulse fields, then notifications SSR/readback applies the existing access rules and shared Pulse owner filter/safe projection; unrelated inbox and join-request behavior stays unchanged.

### User Story 3 — Run only authorized, selected work (Priority: P1)

An operator can advance selected Pulse work without waking unrelated jobs or sending through another user's agent.

**Why this priority**: Global backlog activation and ambient gateway fallback are unsafe substitutes for a scoped worker.

**Independent Test**: Advance actual registered handlers with a local PostgreSQL queue containing older unrelated jobs and two owner profiles. Observe RPC arguments, call count, current authority and persisted states across process restarts.

**Acceptance Scenarios**:

1. Given future backoff, a stale candidate or direct advance cannot claim it. Skipped/unclaimed rows do not count as advanced.
2. Given a verified personal owner and qualified exact gateway assignment, then the request names that owner's agent and canonical origin session and disables announcement.
3. Given revoked membership/capability, missing assignment, unknown explicit agent, or missing scoped credentials, then no remote dispatch occurs, even with ambient credentials configured.
4. Given process death after committed admission or an ambiguous RPC result, then recovery records indeterminate and never automatically reissues the call.
5. Generic cron jobs with omitted agent IDs retain their default behavior; invalid explicit IDs are rejected by batch C. Existing isolated execution sessions remain isolated under the same agent.

### Edge Cases

Competing decision types; edit after decision; response lost after remote acceptance; local settlement failure; expired/reclaimed lease; delayed worker settlement; rotated credentials; removed personal-agent binding; owner deletion; changed gateway build; unknown/malformed remote job ID; instruction-like calendar title or reminder text; historical `executedAt` without evidence; another owner's card in the same org; three proven pre-dispatch failures; default global tick with no `jobs=1` flag.

## Requirements

### Functional Requirements

- **FR-001 / A17**: A proposal has a monotonic revision and decision time. Approval freezes payload, actor and target, records one dispatch/job per proposal revision, and decides atomically. Concurrent edits/decisions have one winner.
- **FR-002 / A17**: Durable dispatch identity and admitted outcome survive deletion/retention. Current-org/current-owner constraints apply independently from generic view permission. Legacy informational data is preserved without invented execution receipts.
- **FR-003 / A18**: Executable POST/PATCH require `expectedRevision`; stale/missing revision conflicts. Duplicate identical approval returns the original receipt. Informational approval never dispatches. All current callers submit revisions.
- **FR-004 / A18**: Receipt reads, recent decisions and UI distinguish decision from dispatch; new owner-bound records are private to the bound profile. Business-org executable admission is rejected. Recent decisions are paginated with at most 50 rows.
- **FR-005 / A19**: Type, org, owner and due time constrain candidate selection before limit and atomic claim. Future bounded postponement releases only the current generation; failed claim/unknown handler contributes zero advanced count. Default jobs tick behavior and other handlers' retries remain unchanged.
- **FR-006 / A20**: Executable work rechecks current membership/capability, personal-agent binding, channel and exact qualified gateway immediately before atomic admission. It uses no ambient credential fallback. Missing or changed binding rejects queued work.
- **FR-007 / A20**: Exactly one remote attempt follows committed admission. Unknown response, crash, or post-RPC storage failure is indeterminate and has no reset/retry API. Only proven unsubmitted queued work retries, at 5s then 30s, at most three attempts.
- **FR-008 / A20**: Typed calendar/reminder actions match pinned installed tool schemas, reject unknown keys and invalid times, and treat strings as data. `agentId`, canonical origin `sessionKey`, and `delivery.mode: none` are explicit. Qualified remote job ID means scheduled only.
- **FR-009 / A18–A20**: Existing module gates, personal-org visibility, owner checks, route contracts, action runtime, semantic primitives and Paraglide localization govern all changed surfaces. Current authority is checked again by workers independently of cleanup.

### Key Entities

Proposal revision; frozen dispatch; exact gateway qualification; selected background job and lease generation; decision/dispatch receipt; current personal owner authority. Storage and interface details are in [data-model.md](data-model.md) and [contracts/pulse.md](contracts/pulse.md).

## Success Criteria

- **SC-001**: All concurrent decision cases produce at most one dispatch for the reviewed revision and no mismatched payload execution.
- **SC-002**: Every ambiguous admitted case survives restart with zero automatic additional remote attempts.
- **SC-003**: Every denied owner, tenant, agent or gateway case produces zero remote calls and reveals no other owner's receipt.
- **SC-004**: Users can recover authoritative status after refresh/reconnect in both locales; keyboard-only operation and committed-refresh failure are demonstrated.
- **SC-005**: Selected Pulse advancement leaves all unrelated backlog rows unchanged, including when more than 20 older unrelated rows exist.

## AS-IS → TO-BE → DELTA

Source pin: Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `bun.lock` SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`.

| Verified AS-IS anchor (Hub-relative) | TO-BE / DELTA | Acceptance / tasks |
|---|---|---|
| `src/routes/api/pulse/proposals/[id]/+server.ts:27–82` reads pending, calls cron, then marks approved; PATCH has no version | One locking decision transaction, no remote call in route | A17/A18; T004–T011 |
| `src/server/services/pulse.service.ts:63–98` updates by org/id only; `pg-schema/pulse.ts:3–29` lacks revision/owner binding | Versioned pending edits and immutable dispatch snapshot; tombstones | A17; T004–T007 |
| `pulse.service.ts:43–60` reads/counts pending only; page `+page.svelte:91–103` and `NotificationsPopup.svelte:106–114` decide without revision | Bounded recent receipts and revised actual callers | A18; T010–T014 |
| `src/routes/(app)/notifications/+page.svelte:111–115,281,297,306` renders `data.pulseProposals` and decides by ID; `+page.server.ts:20,28–36` separately loads pending cards under existing review/org-kind gates | Carry the exact rendered revision through both actions; share owner filtering/safe read projection in SSR; preserve committed decision across failed page invalidation and reconnect | A18; T012–T014,T024,T025 |
| `bg-runtime.ts:130–156,354–378` selects global oldest 20 and increments even when no claim | Selected query/claim predicates and truthful result count | A19; T015–T018 |
| `src/routes/api/jobs/tick/+server.ts:42–53` skips bg jobs by default | Preserve this exact default; separate Pulse tick | A19; T017–T018 |
| `src/lib/server/gateway-rpc.ts:79–130` falls back through system/env credentials | Strict exact-assignment transport path | A20; T019–T022 |
| `personal-agent-binding.ts:35–98` rereads membership/assignment; `with-org-core.ts:28–65` scopes an existing transaction | Reuse patterns for short owned atomic writes and fresh authority | A17/A20; T006/T019–T023 |

## Assumptions and out-of-scope

The approved parent's security/data authorization covers this refinement. Batch C supplies the Gateway binding contract; Hub activation stays disabled until the exact deployed gateway build is qualified. Batch E consumes D's shared interfaces after D's implementation commit. No digest activation, new general scheduler, new protocol field, execution-time RBAC guarantee after acceptance, WhatsApp announcement, automatic replay of indeterminate work, production migration, merge, or paid test is included.

## Verification

Run the executable procedure in [contracts/validation.md](contracts/validation.md). All acceptance IDs require actual caller/worker tests, real PostgreSQL concurrency and crash cases, current frozen-lock dependencies, complete Hub gates, and mounted/browser evidence. Independent two-pass reviews follow artifact hashing; this document does not claim those reviews or implementation results.
