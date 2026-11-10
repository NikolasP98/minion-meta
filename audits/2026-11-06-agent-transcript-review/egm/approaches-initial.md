---
status: draft
verdict: awaiting-egm-review
scope: tested-candidates-only
source_gateway: d3e0fbf54fc657521df07c896ea7adce5ba1afcd
source_hub: 1f1ab6a327b347645aeff16f5bd675b8d9fbf54d
---

# Tested approaches to eight agent transcript findings

## Purpose and evidence

Minion's gateway assembles an assistant's instructions, runs tools, stores session messages, and sends replies to channels. The Hub is its authenticated business-data service. This proposal addresses eight places where their code can skip a required check or supply incomplete information that invites an unsupported answer. The findings and source anchors are in [the code review](../code-review/README.md). That review separates transcript matches from adjacent defects discovered in code; a related conversation alone does not prove causation.

The gateway source is pinned to DEV d3e0fbf54fc657521df07c896ea7adce5ba1afcd and Hub to master 1f1ab6a327b347645aeff16f5bd675b8d9fbf54d. Existing shared checkouts contain unrelated work. Candidate code and synthetic tests run in an exported temporary copy, outside those checkouts. This document is a design and prototype report, not approval to release. No production records, credentials, model providers, or outgoing user messages are used by the tests.

EGM means Elephant–Goldfish Model: an orchestrator retains the full investigation while separate reviewers receive only this document and an explicit reading list. Reviewers challenge the design with fresh context. Their reports, dispositions, candidate patches, and executable evidence are retained beside this file. A reviewer passing a design is distinct from a test passing an implementation.

## Desired behavior

1. Memory extraction sees actual new conversation messages and obeys its existing threshold and per-session spending limit even when calls overlap.
2. Optional identity setup does not stop a personal business assistant from answering an authorized business question.
3. A booking preview checks the same business prerequisites as booking creation, without creating or reserving anything.
4. Booking queries disclose their coverage; a count question has an aggregate count rather than the length of a capped list.
5. Explicit invalid finance dates fail visibly; an all-time request can be expressed deliberately.
6. Provider tool syntax cannot escape as an ordinary answer, and filtering cannot silently erase the only reply.
7. Supported secret forms are redacted at persistence and outbound boundaries, including after optional plugin transformations.
8. Concurrent memory work cannot overspend or overwrite a newer cursor with old state.

Actual authority checks, tenant isolation, booking transaction validation, and UI defaults remain in force. The candidate tests cover deterministic code behavior. Live model choices, deployment behavior, and every possible secret format are outside their proof.

## C01 and C08: collect the real memory window and control admission together

**AS-IS.** The caller supplies at most the current user/assistant pair, while the runner requires four new messages. The threshold therefore never opens at its default. When independently supplied eligible inputs overlap, capacity is checked before asynchronous dispatch but never reserved. Ten synthetic overlapping inputs can dispatch ten requests under a budget of five, then collapse the recorded completion count to one.

**TO-BE.** Keep the four-message threshold and five-attempt default. Accumulate a bounded session window from actual settled user/assistant messages with injected context removed. Give a submitted window stable identity so retries do not re-extract the same input. Admit work synchronously, serialize it per session, and count dispatched model attempts against the budget, including failures. Successful completion and dispatched attempts have separate counters. A session reset starts a new generation; an old completion cannot advance the new cursor or begin new writes.

**DELTA and alternatives.** Lowering the threshold to two would open the path but retain duplicate work and the concurrency defect. A durable cross-process queue would solve a larger problem than this in-process runner currently owns. Use a bounded in-process buffer and serialized admission now; document restart and eviction limits rather than claim lifetime exactly-once delivery. Existing durable memory should be read for duplicate avoidance, not supplied as an empty string unconditionally. Preserve separate knowledge-graph extraction and the rule that tool execution must settle first.

**Risks.** Cancellation cannot undo an external write already started. Generation checks must precede each side effect, and tests must distinguish prevention of a new write from rollback. Buffer eviction can lose deferred extraction; it must not retain unbounded transcript text. Restart resets in-process budgets, as the current cursor already does. The candidate must not claim a persisted global spending cap.

## C02: make optional personal onboarding non-blocking

**AS-IS.** One assembled instruction requires BOOTSTRAP onboarding before any unrelated task. Another says ordinary tasks should proceed if personality questions are ignored. This directly matches retained chats where a sales question became a naming interview.

**TO-BE.** In the assembled context for personal agents, omit the strict onboarding gate and the BOOTSTRAP ritual. Keep optional style/identity guidance and leave unknown preferences unknown. Determine personal-agent identity through the existing canonical agent/session identity resolver, including the runtime path that supplies a session key without an explicit agent ID. Keep strict onboarding for other profiles.

**DELTA and alternatives.** Globally deleting onboarding would alter deliberate policies for other agents. Rewriting workspace files or marking onboarding complete would fabricate state. Scope the assembly policy to personal agents instead. Access, assignment, and confirmation failures remain real failures; a prompt change cannot grant business permissions.

**Risk.** Misclassifying an agent could remove a gate outside the intended profile. Test explicit IDs, session-key fallback, non-personal agents, completed workspaces, and retained optional identity text. This establishes instruction consistency, not a guarantee of a particular model answer.

## C03: share booking preparation between preview and commit

**AS-IS.** The agent action's confirm=false branch returns immediately after syntax validation. Nonexistent or incompatible service, contact, and resource references can be echoed as a validated preview. Commit has additional transaction checks, so this is not evidence of an authorization bypass.

**TO-BE.** Factor the real booking algorithm into a read-only preparation phase followed by mutation. Preview uses preparation under the caller's scoped authority. Preparation resolves the event type/service, contact, selected resource, business timezone, and current slot availability. Return the effect-defining IDs and authorized resolved labels. Preview creates no booking, hold, reservation, contact, payment, or calendar side effect. Commit runs preparation again inside its real transaction; preview availability is advisory until commit.

**DELTA and alternatives.** A separate preview validator would drift from slot calculation and booking policy. Calling create then rolling back risks external side effects. Reuse the existing pre-mutation logic instead. The assistant path rejects an explicit stale or foreign contact rather than silently substituting a different customer. Preserve any existing fallback behavior deliberately used by UI callers.

**Risks.** A slot may disappear between preview and confirm, so the response must not promise reservation. Labels can contain personal data; existing field visibility applies to preview as well as commit. Resolving prerequisites is not a substitute for tenant authorization. Service discovery ergonomics remain a separate adoption requirement if the agent cannot obtain a valid event-type ID.

## C04: an assistant-specific page and count contract

**AS-IS.** Shared booking reads default to a cap of 500 rows, but the assistant gets only a bookings array. It cannot distinguish a complete 500-row result from 501 or more matches. The inspected transcripts do not prove that this cap was reached historically.

**TO-BE.** Add an assistant read contract that returns the selected rows and explicit total, applied limit, continuation, and coverage. A count mode returns the authorized aggregate without needing to fetch every row. Count and page metadata must describe one database snapshot. Stable ordering includes a unique tie-breaker. Preserve the shared UI list shape and cap. Mask returned personal fields through the existing authorization layer.

**DELTA and alternatives.** Raising the cap hides the same error at a larger size. Paging without a total may be sufficient for browsing, but requires walking every page for a count question. Use an assistant-specific aggregate/page operation; execute a real synthetic SQL fixture to check its semantics. Empty pages must still report their total accurately.

**Risks.** Paging across separate requests is not an immutable export: concurrent writes can change later pages. Report that boundary. An aggregate must apply the exact same tenant, status, service, resource, and date predicates as its page. Avoid a list/count race or count leaking records that the page may not disclose.

## C05: strict agent periods while retaining UI defaults

**AS-IS.** The UI period parser intentionally treats missing or invalid dates as a default rolling year. Reusing it on explicit tool input silently changes malformed requests. The Hub supports all-time, but the gateway tool cannot request it.

**TO-BE.** Validate explicit agent dates as real calendar days, reject malformed and reversed ranges, expose range=all, and disclose the resolved period. Convert calendar days to boundaries using the existing business-timezone helpers. Define all-time/date conflicts explicitly. Keep the existing dashboard parser and its truly absent-filter default unchanged.

**DELTA and alternatives.** Tightening the shared parser changes UI behavior unnecessarily. Silently repairing a malformed date substitutes the assistant's guess for the user's period. Add strict parsing at the agent API boundary and forward the explicit range through the gateway tool.

**Risks.** UTC midnight is not every business's midnight; daylight-saving changes also matter. Test calendar validity and timezone transitions. A correct date contract does not prove the financial metric or source coverage is correct.

## C06: reject provider syntax at the output boundary

**AS-IS.** The outbound sanitizer strips ordinary tool_calls markup but passes the observed DSML-prefixed family unchanged. DSML is provider-specific markup used to describe tool calls, not a user-visible receipt.

**TO-BE.** Recognize complete and incomplete DSML tool-call envelopes at the final-text boundary. Remove invalid protocol text, retain safe surrounding prose, and return a short explicit failure when no meaningful answer remains. Never interpret or execute a tool call from final text. Preserve legitimate code examples and ordinary XML under a documented policy.

**DELTA and alternatives.** Prompt-only reminders cannot guarantee this boundary. A provider retry could repair an answer but adds cost and another failure mode. The candidate implements deterministic failure and filtering; any future bounded model repair is a separate change. Do not use regex matching so broad that normal tags or code disappear.

**Risks.** Protocol formats evolve. The supported family is bounded by fixtures, including the observed syntax. Recognition is not universal validation of every future provider response.

## C07: mandatory redaction with one supported vocabulary

**AS-IS.** Persistence transforms are optional, and outbound filtering misses known named secret fields and fine-grained GitHub tokens. Synthetic fixtures demonstrate the boundary gap. They do not establish current validity or misuse of historical credentials.

**TO-BE.** A shared pure redaction helper handles supported secret-bearing assignments, JSON key/value forms, provider token prefixes, and URL credentials. Run it after optional plugin transformations and before transcript persistence; reuse it at outbound text filtering. Preserve the tool result's structural shape, record IDs, receipts, and non-secret image data. Tests use fabricated values only.

**DELTA and alternatives.** Asking every plugin to redact is unenforceable; egress-only redaction leaves stored secrets. Masking every long string damages legitimate record IDs and binary data. Use explicit secret-key vocabulary and known token families, with separate tests for false positives. Restricting process-environment access for business tools is additional defense that requires a separate tool-authority design; this prototype must not claim it implements that restriction.

**Risks.** Pattern-based redaction cannot promise detection of every secret. Existing historical data is not rewritten by a persistence fix. No rotation or retrospective cleanup occurs here. Security/data production adoption retains the repository's human approval and merge gates.

## Completion and adoption boundaries

A tested candidate is complete when all eight findings map to a mechanism, alternatives, tests of corrected behavior, and retained positive controls. Baseline failures must be recorded separately from passing corrected tests. Native database execution, service stubs, source-seam execution, and full runtime execution are different evidence levels and will be labeled separately. EGM review findings retain original severity and explicit dispositions; unresolved findings block a claim of production readiness.

Production adoption requires normal proposal/spec review, a slice-scoped branch and draft PR, independent code review, relevant repository builds/checks, and later deployed verification. No release authorization is inferred from this test exercise. Residual code work is recorded in the existing meta proposal and at the candidate's exact site with TODO(handoff) where applicable.

## Detailed Implementation Plan

### Prototype workspace and artifact ownership

Use the exported source at /tmp/minion-agent-egm-20261106-971jwsz3. Its gateway and hub directories originate from the pinned source archives recorded in scratch.json. Reuse installed dependencies only; this is not a clean frozen-lockfile build. Do not copy .env files, start services with production credentials, switch shared branches, or edit shared product source. The root vitest.config.mjs aliases $lib and $server to the Hub snapshot and runs tests under tests/ in a Node environment with one worker.

Three isolated ownership slices are permitted by the EGM workflow: memory (C01/C08), output (C02/C06/C07), and Hub/API (C03–C05). Reviewers are different fresh-context agents, read-only, and do not run or modify code. Each executor records its exact source changes, baseline failing cases, corrected tests, limits, and handoff notes in its candidate report. The patches and reports, rather than any prose abbreviation here, are the byte-exact implementation candidates to review.

### Slice A: memory window and admission

Modify gateway/src/memory/extract-memories-runner.ts and the durable extraction block in gateway/src/agents/pi-embedded-runner/run/attempt.ts; modify gateway/src/memory/extract-memories.ts only if cursor fields require it. Preserve all separate knowledge-graph and tool-settling behavior. Add tests/memory-candidate.test.ts and retain adjacent memory unit tests. Candidate details belong in memory-candidate.md.

Execute the actual attempt post-turn source block with injected runtime surroundings, not a test-only reconstruction. Verify two settled exchanges produce a four-message input and exactly one extraction; unchanged retry is a no-op; injected context is removed; existing durable content reaches the prompt. Bound buffered messages and memory-session state. Stable run/window identity must distinguish new input from replay.

Before scheduling, reserve a budget slot synchronously. The per-session queue is the only dispatcher. Increment attempted-call accounting at dispatch; failed calls consume the attempt budget, canceled work before dispatch does not. Increment successful extraction accounting only after a current-generation completion. A reset invalidates queued work and late completions. Test ten overlapping distinct eligible windows against budget five, same-window replay, failures, cancellation before/after dispatch, buffer eviction, and clear-while-in-flight. Do not assert rollback of a write already started before cancellation.

### Slice B: instructions, output, and persistence

Modify gateway/src/agents/bootstrap/bootstrap-files.ts, gateway/src/channels/outbound-sanitizer.ts, and gateway/src/agents/sessions/session-tool-result-guard.ts. Add a shared pure redaction helper under gateway/src/security/ if needed and tests/output-candidate.test.ts. Reuse the existing session-key resolver. Optional identity guidance remains sourced from the existing section. Candidate details belong in output-candidate.md.

Test explicit personal identity and session-key fallback; exclude strict gate and BOOTSTRAP content only in personal assembled context. Non-personal bootstrap remains unchanged, optional preferences remain unset, and real permissions remain unchanged. Test observed complete DSML envelopes, malformed/incomplete envelopes, safe surrounding prose, protocol-only fallback, existing plain tool syntax, normal prose, and legitimate code blocks.

At persistence, run mandatory redaction after any optional plugin result transform and before the write. Cover tool results with text, structured details, error receipts, image blocks, nested records, arrays, JSON strings, key=value strings, and URL credentials. Synthetic secret values cover TOKEN, PAT, API_KEY, SECRETS_KEY, PASSWORD, classic GitHub tokens, and github_pat_ tokens. Record IDs, allowed URLs, receipt fields, and non-secret images must survive. Egress uses the same supported vocabulary. Do not read real environment values.

### Slice C: authorized business data contracts

Modify Hub's booking-create action route and scheduling-bookings service to expose shared preparation before mutation. Add assistant-specific booking page/count service and modify the query/bookings route. Add an agent-period helper, modify the query/finance route, and modify gateway bookings-query-tool.ts and finance-query-tool.ts schemas and forwarding. Leave shared UI list and period parsers behaviorally unchanged. Candidate details belong in hub-candidate.md, including exact function names and API response fields selected by the tested patch.

Use real service paths with synthetic transaction boundaries for booking preparation. Assert confirm=false never reaches insert/update/delete or external side effects; unknown, foreign, inactive, incompatible, and unavailable inputs fail. A valid result includes the same effect-defining fields as creation under field-level visibility. Agent confirmation must use strict reference validation again inside the creation transaction. Explicit stale contact rejection is agent-only if UI currently falls back. A preview cannot reserve capacity. Native PostgreSQL availability/race proof remains a production-adoption gate unless this candidate actually executes it.

Test booking API list and count inputs, bounded limit, continuation ordering, total and truncation, empty pages, matching predicates, and field masking. Execute the candidate query on a local isolated PGlite fixture with 501 records, including equal start times and an empty later page; PGlite is an embedded PostgreSQL engine using synthetic local data. This validates SQL semantics but not deployed RLS policy or production query performance. Do not present a mocked service returning 501 as SQL proof.

For finance, test malformed days, non-leap February 29, valid leap day, reversed dates, one-sided ranges, range=all, conflicting explicit dates, absent filters, and existing dashboard-default controls. Test business midnight and a daylight-saving transition using existing timezone helpers. Tool schemas and forwarding must expose the same range contract as the route. Assertions must inspect the resolved boundaries, not only the existence of a date object.

### Ordered verification and review

1. Record failing candidate expectations against original pinned source before each slice's edits, with passing controls. Preserve command/results in candidate notes or JSON reports.
2. Run corrected slice tests, then the combined candidate suite. Run adjacent existing tests relevant to each changed boundary. Investigate new failures; do not broaden indefinitely after justified checks pass.
3. Record test counts, dependencies reused, mocked boundaries, native database checks, and tests that could not run. Include no generated credentials or historical raw transcript bulk in artifacts.
4. Apply EGM review stages 5 initial zoom out, 6 comprehension, 7 three critics, 8 intermediate zoom out, and 9 three implementation reviewers. Pass explicit source pins, this document, code-review evidence, candidate notes, and tested patches as the reading list. Keep complete comprehension paraphrases. Retain raw reports with the reviewed document hash and map findings to dispositions.
5. Resolve concrete defects in the scratch candidates and document; rerun affected tests. A maximum of one re-audit per EGM stage avoids endless loops. Remaining findings stay visible and block inappropriate readiness claims.
6. Generate patches against the original archive bytes, copy tests/config/candidate notes and machine-readable results into this artifact directory, and hash them. Update the existing meta proposal with tested-candidate status and adoption gates. Do not commit, push, merge, deploy, or send messages.
