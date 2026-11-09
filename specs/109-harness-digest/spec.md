# Feature Specification: Bounded dependency digest in Pulse

**Feature Branch**: `feature/agent-harness-e-digest` (Hub, stacked on batch D)

**Created**: 2026-10-23

**Status**: Approved for development; both independent Astra technical reviews approved the exact frozen artifacts.

**Input**: Batch E implements parent A21–A25 and A32 in one Hub PR. It consumes batch D schema/worker/receipt interfaces after D's implementation commit.

## 0. Product

One explicitly configured personal owner can receive a useful dependency-impact card in the existing Pulse feed while their browser and CLI are closed. The card names an affected Minion dependency, retained public evidence and a next step. The owner can give reasoned feedback without silently training or changing policy.

This is a refinement of the approved [parent specification](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md), §§0–12, particularly §7 and A21–A25/A32. User-directed grouping overrides one-slice-per-PR packaging only. Default is disabled and zero spend. Human merge, production migration, actual schedule installation, owner activation and paid inference retain separate gates. This SDD does not authorize those actions.

## User Scenarios & Testing

### User Story 1 — Collect bounded, relevant public changes (Priority: P1)

The owner selects a small official-source policy tied to Minion's dependency snapshot. Unchanged or unrelated content uses no reasoning call.

**Why this priority**: A useful card requires reproducible inputs and a bounded source boundary.

**Independent Test**: Run the actual policy/source collector with local fixture transports for changed, unchanged, unrelated, over-limit, failed and malicious source responses.

**Acceptance Scenarios**:

1. Given disabled, missing or business-org configuration, then collection/admission is denied and no provider request occurs.
2. Given at most five official sources tied to a pinned dependency snapshot, when normalized evidence is at most twenty items and 48 KiB, then one immutable snapshot may be queued; unknown dependency relationship is excluded with a reason.
3. Given unchanged content or fetch failure, then neither causes a reasoning request; failure remains a failure and does not advance accepted cursors.
4. Redirect/private-address/body/time abuse cannot expand the source boundary. Fetch timestamps do not change logical content identity.

### User Story 2 — Produce one durable informational result (Priority: P1)

A qualified changed snapshot can produce one informational card, or an explicit no-signal outcome, within the approved budget.

**Why this priority**: Retries and crashes must not turn one card into repeated paid work.

**Independent Test**: Real PostgreSQL admissions with two simultaneous workers and a counted stub model, including process crashes around every external/result/publication boundary.

**Acceptance Scenarios**:

1. Duplicate input creates one logical run and job; distinct snapshots compete for one active owner slot and the last daily allowance.
2. Policy revision or UTC rollover does not erase outstanding reservation/unknown exposure. No price bound, zero spend or unknown bill admits zero new calls.
3. A run makes one tool-free request with at most 1,024 generated tokens and no automatic retry/fallback. A returned response/bill is retained before content validation.
4. Restart after received response resumes validation/publication without another request; restart after uncertain admission becomes indeterminate and never automatically replays.
5. Card, source cursors, terminal run and job progress commit together under current lease/authority. Conflicting cursor or card binding cannot overwrite a newer/decided card.

### User Story 3 — Explain my feedback (Priority: P2)

The owner can mark usefulness or a factual error independently from approving or dismissing the card.

**Why this priority**: Preference and truth are different signals and must remain auditable.

**Independent Test**: Use real feedback routes with same-action retries, stale content, correction conflicts, cross-owner access and mounted keyboard save/refresh failure cases.

**Acceptance Scenarios**:

1. Reasons are `useful`, `irrelevant`, `duplicate`, `fact_error`, `already_handled`, or `too_late`; optional comment is at most 500 characters.
2. A repeated client action returns the same record. Correcting feedback appends a revision tied to the same owner/card/content; prior evidence remains.
3. Stale content and another owner are rejected without leaking records. A committed write followed by failed refresh does not repeat the write.
4. Scoped export preserves actor/content/source/policy identity and separates factual error from preference/relevance. No automatic policy/weight learning follows.

### User Story 4 — Receive the card with clients closed (Priority: P1)

A trusted scheduler collects due sources and advances only configured Pulse work from an empty queue.

**Why this priority**: Existing queued-job processing does not discover work when nobody opens the app.

**Independent Test**: With browser/CLI producers stopped and an empty selected queue, invoke the shipped schedule template through a local scheduler fixture against the authenticated real tick. Change a stub source, restart between phases, reconnect and read one card.

**Acceptance Scenarios**:

1. The minute tick checks only the configured personal owner; first poll is immediate and later success polls every fifteen minutes.
2. Concurrent ticks share a durable thirty-second generation lease; collection has a fifteen-second aggregate deadline and at most two concurrent fetches.
3. Failure or partial failure records an outcome and schedules the next poll in five minutes; accepted cursors stay unchanged. Expired collection lease is reclaimable because collection only reads public data.
4. A tick stays within fifty seconds and starts no reasoning request unless its full bound fits. Unrelated backlog is untouched.
5. The deployment template/runbook are executable and tested locally. Real installation and cold-start deployment evidence remain required before activation is called qualified.

### Edge Cases

Zero budget; missing approved exposure bound; model identity drift; unknown cost despite valid content; missing/invalid citation; supported reference that does not entail a claim; SQL rollback after card insert; stale source cursor; conflicting dedup binding; source deletion and replay; midnight with unknown bill; owner revocation during fetch/model/publication; policy change during collection; empty feed; response body slow/oversize; DNS rebinding; operator SSRF bypass configured; feedback double correction; decided-card immutability; missing schedule; less than thirty seconds remaining after collection.

## Requirements

### Functional Requirements

- **FR-001 / A21**: Require one verified personal-org owner, explicitly approved policy/scope and at most 5 official sources tied to present dependencies. Bound normalized input to 20 items/48 KiB; stable hashes ignore fetch time. Disabled/zero-spend defaults cause no reasoning.
- **FR-002 / A21**: Fetch exact allowlisted HTTPS endpoints using public connection addresses, timeout 10s each, response at most 1 MiB, no redirects except individually preapproved targets. Conditional requests preserve accepted cursors on failure. No arbitrary search/source expansion.
- **FR-003 / A22**: Domain uniqueness deduplicates input before enqueue in one transaction. Lock one stable owner budget namespace across revisions/days; enforce one active attempt, at most 5 calls/day, approved spend reservation and unknown fence atomically with reasoning admission. Stale settlement cannot release a successor slot.
- **FR-004 / A23**: One model request, no tools, maximum 1,024 output tokens, deadline 30s, retries/fallback off. Persist bounded response and authoritative usage before validation. Unknown outcome/bill is fenced; known invalid output fails without recall or cursor advance. Received recovery has no inference.
- **FR-005 / A24**: Publication commits immutable informational card/run/source checkpoint CAS/job progress together under ownership and current authority. Identical binding returns same card; mismatch rolls back; newer cursors supersede old work. No-signal records reason/cursors without a card. Invalid/unknown output advances neither.
- **FR-006 / A24**: Reserve `internal:dependency-digest:v1:` and internal binding fields against gateway/public ingestion. Structural citation/dependency validation is mandatory; human/sample claim-support review remains a separate promotion gate.
- **FR-007 / A25**: Feedback reason, actor and immutable content/source/policy revisions are explicit. Comments are at most 500 characters, repeated actions idempotent, corrections append/supersede same-owner content only. Scoped export separates factual error from preference; no automatic learning.
- **FR-008 / A32**: Authenticated deployment-minute tick uses trusted fixed scope, durable poll due time/generation lease and selected worker. Poll first immediately, then 15min success/5min failure; collection 30s lease, <=15s aggregate, <=2 fetches, tick <=50s. Failed partial collection cannot enqueue a mixed snapshot.
- **FR-009 / A22–A25/A32**: Policy/owner revocation cancels queued work and fences job/collection generations transactionally. Every admission/publication rereads current authority. Retain raw evidence/comments at most 30 days by default, preserve minimal replay tombstones, retire namespace before deleting them.
- **FR-010 / A25/A32**: Reuse existing Pulse/action/RBAC/owner/navigation/route-contract primitives and EN/ES localization. Keyboard controls preserve failed-save selection; committed-refresh failure never repeats a write. Default global jobs tick remains unchanged.

### Key Entities

Digest policy and approved budget namespace; immutable source snapshot; accepted source checkpoint revision; digest run and attempt; collection lease; immutable Pulse card; reasoned feedback revision. [Data model](data-model.md) and [runtime contract](contracts/digest.md) define exact storage/interfaces.

## Success Criteria

- **SC-001**: Every over-limit/unapproved/unrelated/unchanged or failed source case makes zero model calls.
- **SC-002**: All duplicate, concurrent, crash and midnight/revision cases respect one admitted attempt per logical run and preserve unknown exposure.
- **SC-003**: A qualified fixture run produces exactly one card with matching cursor/run/job state; stale or revoked runs produce none.
- **SC-004**: A source change from an empty queue produces one visible card through the scheduled authenticated fixture with clients closed and zero unrelated queue changes.
- **SC-005**: All feedback actions survive reconnect with immutable actor/content provenance, keyboard recovery and no implicit policy change.

## AS-IS → TO-BE → DELTA

Verified Hub source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `bun.lock` SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`. D will change shared foundations; its delivered commit is an additional required pin before E development.

| AS-IS anchor | TO-BE / DELTA | Acceptance |
|---|---|---|
| `pulse.service.ts:22–40` starts its own transaction and skips conflicts without readback | Transaction-taking internal publication validates full immutable binding | A24 |
| `pulse.service.ts:43–60`; `/pulse/+page.server.ts:12–25` only pending feed | D supplies authoritative receipts; E adds owner feedback and informational digest content | A25 |
| `bg-runtime.ts:263–287` generation ownership; `:354–378` global selection | Consume D selected runner/transaction APIs; add digest domain admission | A22/A23/A32 |
| `job-effects.service.ts:505+` creates/revises a job request; effect rows are vector-specific | Domain unique run before enqueue; no arbitrary LLM result in effects table | A22/A24 |
| `ssrf-guard.ts:151–219` has operator bypass and separate DNS check; `:244+` image fetch differs in limits | Narrow strict connection-bound official source fetch | A21 |
| `src/server/llm.ts:25–46,74–102,145–147` shared metered model adapter; `ai`/OpenAI in package lock | Opt-in bounded one-request digest adapter with authoritative receipts; no estimate-as-known bill | A23 |
| `src/lib/server/cron-auth-path.ts`; `/api/jobs/tick/+server.ts:42–53` has no Pulse collector and skips jobs by default | Dedicated authenticated minute schedule plus durable source polling from empty queue | A32 |

## Assumptions and out-of-scope

D's source commit is stacked before E edits shared files. Official-source policy ships as a disabled repository template; activating exact sources/model/budget/owner requires operator approval. Fixture sources/providers prove mechanics without external calls. No business pilot, arbitrary scraper/search/tool agent, private transcript source, external announcement, automatic approval, auto retries/fallback, reset of indeterminate work, new global scheduler, general preference store, model learning, production migration or paid validation is included.

## Verification

Follow [contracts/validation.md](contracts/validation.md) and tasks. Real PostgreSQL concurrency/crash proof, source/SDK locks, actual scheduler-template trigger, mounted/browser EN/ES feedback/reconnect proof and full Hub gates are mandatory. Local fixture evidence and deployed schedule/provider/accuracy qualification are separate evidence classes.
