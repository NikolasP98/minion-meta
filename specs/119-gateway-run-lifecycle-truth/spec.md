# Feature Specification: A run reports its real outcome (gateway)

**Feature Branch**: `spec/116-pos-booking-state-hardening` (meta, shared with specs 116–118); gateway slices on their own branches, PR base `DEV`

**Created**: 2026-11-14

**Status**: Draft, pass 2 (revised after the EGM design critique of 2026-11-14, `egm/critic_report.md`)

**Input**: Owner, 2026-11-14, on the audit report's gateway row, the two items left uncovered in the screenshot: "retry shown as an error" and "false 'server restarted' messages": "address these as well". Follows the 2026-11-11 audit.

**Repos**: `minion` (gateway). **Tags**: `logic`, `test`.

## Why this exists

Two gateway records say something about a conversation turn that is not true.

1. **A retry is reported as a failure.** When an attempt fails and the gateway retries (another model, another credential, after shrinking the context), the failed attempt already announced that the whole run ended in error. The web chat shows an error and then drops the successful answer; a parent agent is told its sub-agent failed.
2. **"My server restarted" is sent for turns that finished.** A bookkeeping row meant to detect turns cut off by a restart is left behind by every turn that ends any way other than plain success. On the next deploy each leftover row sends the customer an apology asking them to re-send a message that was answered, sometimes days earlier.

Both confirmed by reading gateway `533616ce95a` (`egm/evidence.md`); not reproduced on a running gateway. The second read corrected the audit on three points: the apology is sent at shutdown (the boot path already ignores rows older than 30 minutes), a user's Stop does not leave a row, and a failed attempt can also announce a premature *success*.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No apology for a turn that ended (Priority: P1)

A customer on WhatsApp or Telegram only receives "my server restarted, please re-send" when their message was really being answered at the moment the gateway stopped.

**Why this priority**: it is customer-facing, wrong, repeats on every deploy, and the fix is small and local.

**Independent Test**: after a turn that ends in an error reply, a fallback to another model, a cache hit or a timeout, the bookkeeping table is empty; a shutdown then sends nothing.

**Acceptance Scenarios**:

1. **Given** a turn whose first model failed and whose fallback answered, **When** the gateway shuts down later, **Then** no apology is sent for it.
2. **Given** a turn answered from the cache, or ended with an error reply, or timed out, **When** the turn returns, **Then** no row remains.
3. **Given** a turn still running when the gateway receives the stop signal, **When** the shutdown drain runs, **Then** that customer gets the apology, as today.
4. **Given** an internal run that is not a customer's message (scheduled job, memory flush, sub-agent, heartbeat), **When** the gateway stops in the middle of it, **Then** nobody receives an apology.

---

### User Story 2 - A retried run ends once, with its real result (Priority: P1)

A person chatting in the hub sees the answer when a retry succeeds, and an error only when the run has really failed. A parent agent is told its sub-agent's real outcome.

**Why this priority**: it turns a recoverable provider hiccup into a visible failure and a lost answer.

**Independent Test**: drive a run whose first attempt errors and second succeeds through the chat event handler and the sub-agent registry; exactly one terminal event arrives, it says success, and the answer's text is delivered.

**Acceptance Scenarios**:

1. **Given** a run whose first attempt fails and whose retry succeeds, **When** events flow to a web chat client, **Then** the client receives the answer and one final "done", and no error.
2. **Given** the same run for a sub-agent, **When** it ends, **Then** the parent is told it succeeded.
3. **Given** a run whose every attempt fails, or whose only attempt fails with nothing to retry, **When** it ends, **Then** the client receives exactly one error with the text the user would have been shown.
4. **Given** a run that fails before any attempt starts (unknown model, no usable credential), **When** it ends, **Then** the web chat receives a final error and stops showing the spinner.
5. **Given** an attempt that times out and is retried, **When** the retry succeeds, **Then** no premature "done" is announced for the timed-out attempt.

### Edge Cases

- The streaming HTTP endpoints (OpenAI-compatible and responses) end their stream on the terminal event; they must end on the run's real end, not an attempt's.
- `agent.wait` already tolerates a transient error for 15 seconds; it keeps working and its grace window becomes unnecessary but harmless.
- Internal runs that are not a customer reply (memory flush, scheduled jobs, follow-ups) must not leave a bookkeeping row that would apologise for a message the customer never sent.
- A process crash or out-of-memory kill still leaves the row, which is the case the apology exists for.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The in-flight record of a turn MUST be removed whenever the turn function returns or throws, whatever the outcome. Only process death may leave it.
- **FR-002**: The record MUST NOT be created for a turn that ends before any model call (configuration errors, cache hits), and MUST exist during the proactive compaction that precedes the first attempt.
- **FR-003**: The record MUST be created only for turns that answer a customer's message; internal runs MUST NOT create one.
- **FR-004**: For runs whose owner opts in (by wrapping the run with the terminal helper, which marks the run id), an attempt MUST NOT emit the run-level terminal lifecycle phases `end` or `error`; it emits `attempt_end` or `attempt_error`. Callers that do not opt in (model probes, the public extension export) keep today's behaviour.
- **FR-005**: Every opted-in run MUST emit exactly one terminal lifecycle event after its last attempt. The outcome is `error` when the last attempt ended in error or the run threw or reported a failure, and `end` otherwise; `end` carries the aborted flag.
- **FR-006**: Consumers that act on a run's end (web chat final, sub-agent outcome, streaming HTTP endpoints, `agent.wait`) MUST keep reacting to `end` and `error` only.
- **FR-007**: Attempt-level outcomes MUST stay observable as non-terminal lifecycle phases, and the reliability event recorded per failed attempt MUST stay.

## AS-IS (gateway `533616ce95a`, static read; full quotes in `egm/evidence.md`)

| # | Behaviour today | Anchor |
|---|---|---|
| A1 | The in-flight row is inserted at the top of the run function, before its `try`; it is deleted only when a success flag was set | `src/agents/pi-embedded-runner/run.ts:164-180`, `:1271`, `:1298-1304` |
| A2 | Exits that leave the row: configuration throws before the `try` (`:307`, `:340`, `:365`, `:495-506`), the cache hit (`:521-527`), error-reply returns (`:907`, `:933`, `:961`, `:1215`), failover throws (`:1029`, `:1037`, `:1159`). A user abort reaches the success path and deletes it | `run.ts` at those lines; `:929`, `:1081-1082` |
| A3 | The shutdown drain apologises for every `running` row of this process with no age filter and deletes a row only after a successful send. The boot recovery filters rows older than 30 minutes or retried twice | `src/agents/in-flight-turns/recovery.ts:134-157`, `:89-126`, `:34-41`; `src/gateway/server-core/server-close.ts:173-179` |
| A4 | Each attempt's `agent_end` emits lifecycle `error` (or `end`) on the shared event bus with the run's id; retries inside the run and model fallback outside it reuse that id | `src/agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts:35-86`; `run.ts:789`, `:838`, `:881`, `:1040-1049`, `:1109-1129`; `src/agents/models/model-fallback.ts:391-430`; `src/auto-reply/reply/agent-runner-execution.ts:558-570` |
| A5 | The web chat handler treats `end`/`error` as terminal: sends the final, clears the run's buffers, context and sequence tracking, so the retry's events have no session and are dropped, and a false "seq gap" error is broadcast | `src/gateway/server-core/server-chat.ts:480-520`, `:272-306`, `:356-368`; `src/gateway/server-core/server-session-key.ts:6-21` |
| A6 | The sub-agent registry records the outcome on the first `end`/`error` and ignores later ones | `src/agents/subagents/subagent-registry.ts:305-324`, `:406-420` |
| A7 | `agent.wait` already defers an `error` for 15 seconds and cancels it on a later `start`, with a comment describing this defect | `src/gateway/server-methods/agent-job.ts:7-11`, `:55-68`, `:114-120`, `:151-153` |
| A8 | The streaming HTTP endpoints end their stream on lifecycle `end`/`error` | `src/gateway/openai-http.ts:321-328`; `src/gateway/openresponses-http.ts:735-741` |
| A9 | A "terminal emitted once" guard exists only for the CLI-provider branch and only per model candidate | `src/auto-reply/reply/agent-runner-execution.ts:182-255` |
| A10 | A web chat run that throws before any attempt emits no lifecycle event and no chat final; the client waits forever | `run.ts:307`, `:340`, `:365`, `:495-506`; `agent-runner-execution.ts:466`, `:584-589`; `src/gateway/server-methods/chat/handlers.ts:354-398` |

Known unknowns: whether the agent SDK fires `agent_end` before a prompt error is thrown; what the shutdown's 1.5-second budget does to a drain loop still sending. Closed in review: every caller's run id does have consumers that wait for a terminal event (run context and sequence cleanup in `server-chat.ts:514-520`; the per-session busy flag in `agent-job.ts:121-143`, read by Telegram), so a caller that defers must emit. The run function also returns normally when its last attempt failed with nothing to retry (`run.ts:1081-1296`), so "returned" does not mean "succeeded".

## TO-BE (invariants)

- I1: an in-flight record exists only while its turn function is executing.
- I2: per run of an opted-in owner, consumers see zero or more `start`, any number of attempt-level phases, then exactly one of `end` or `error`.
- I3: a client that received a run's `start` always receives its terminal event.
- Unchanged: event payload fields other than the phase name of attempt-level events; the apology text and channel; boot recovery; `agent.wait` semantics; the reliability event per failed attempt.

## DELTA

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | Row created just before proactive compaction; deleted unconditionally in `finally` | 1 | runner test with a real store on a temp path: table empty after an error-reply return, a thrown failover and a cache hit |
| D2 | Row only for customer turns (opt-in parameter) | 1 | runner test: no row without the parameter; row present during the run with it |
| D3 | With the opt-in flag the attempt handler emits `attempt_end` / `attempt_error`; without it, `end` / `error` as today | 2 | `pi-embedded-subscribe` lifecycle test |
| D4 | The run's owner emits the single terminal event from the last attempt's outcome, with a `finally` backstop | 2 | helper and `agent-runner` tests: fail-then-succeed → one `end`; single failed attempt with no fallback → one `error`; all fail → one `error`; throw before start → one `error`; aborted → `end` with the aborted flag |
| D5 | Web chat and sub-agent consumers see the real outcome | 2 | `server-chat.agent-events.test.ts`: retry delivers deltas and one `done`; registry test: outcome ok |

## Success Criteria *(mandatory)*

- **SC-001**: After any turn that returned or threw, the in-flight table holds no row for it (tests D1).
- **SC-002**: A deploy sends an apology only to conversations with a turn in progress at that moment; checked on the dev gateway by running failing and fallback turns, then restarting, and counting apologies (expected 0).
- **SC-003**: In tests, a run with a failed first attempt and a successful retry produces exactly one terminal event and the answer reaches the web chat client.
- **SC-004**: A web chat run that cannot start ends with a visible error within the request, not a spinner.

## Assumptions

- Renaming the attempt-level phases is safe for clients: every gateway consumer matches `end` and `error` exactly, and the hub never reads a lifecycle phase (it reads chat `state` and tool phases, `minion_hub` `src/lib/services/gateway.svelte.ts:1362-1553`).
- **Intended behaviour changes:** a sub-agent that timed out is now reported to its parent as timed out (today the attempt's `end` carries no aborted flag, so it reads as success). Between two model candidates there is a short gap with no in-flight record; a stop in that gap sends no apology.
- No protocol type change in `@minion-stack/shared` is needed if the lifecycle phase is typed as a string there; if it is a closed union, the two new names are added and the hub, site and paperclip adapter are rebuilt (cross-project impact, stated in the plan).
- Gateway tests are run by file; the full suite is never run.

## Out of scope

The privacy finding (spec 117); the WATI restart loop, Telegram offset, config-reload counter and every other gateway audit item; changing the apology wording or language selection (it is always Spanish today because the language is never recorded — noted in the open-items ledger).
