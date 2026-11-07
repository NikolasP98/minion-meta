# Agent chat review: skipped checks and unsupported assumptions in code

I found eight code-backed improvement areas. The most consequential are a durable-memory path that never opens its default gate, contradictory onboarding instructions, and booking previews that skip the validation they advertise. A concurrency defect must be repaired before enabling the dormant memory path.

## Source and proof

The review uses freshly fetched Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd` and Hub master `1f1ab6a327b347645aeff16f5bd675b8d9fbf54d`. The working checkouts are older and contain unrelated changes; they were not switched, reset, or edited. Source was exported with git archive into private snapshots. Installed dependencies were reused; this is not a clean frozen-lockfile installation or a complete build qualification.

Fifteen focused probes passed by reproducing the observed defects and checking positive controls. Passing these probes means the defects are reproducible; it does not mean the product is fixed. No model provider, production endpoint, or database was called by the probes. Tool/authority/database boundaries use explicit synthetic stubs.

The transcript corpus is the previously collected snapshot. Exact user/assistant/tool windows are preserved in private local evidence; the published parent overview contains aggregate scope only. Each finding below distinguishes a direct chat match from a new adjacent code defect; a related transcript is not automatically proof of causation.

## Prioritized improvements

| Finding | Priority | Skipped check or assumption | Concrete change |
| --- | --- | --- | --- |
| [C01](#c01) | High | Durable extraction is permanently skipped by the caller/default mismatch | Collect actual new messages since a real cursor or maintain a bounded per-session buffer. |
| [C02](#c02) | High | Code instructs the assistant to skip business tasks for onboarding | Give personal business assistants one onboarding policy. |
| [C03](#c03) | High | A validated booking preview only echoes syntax-checked input | Factor an authorized, read-only preparation/preflight step shared with creation: resolve the service, contact, resource, local time, and current availability. |
| [C04](#c04) | Medium | Booking lists can look complete after silently reaching 500 rows | Add an assistant-specific bounded page/count contract with explicit coverage and continuation. |
| [C05](#c05) | Medium | Invalid finance dates silently become a twelve-month query | Validate explicit agent date inputs strictly at the API boundary and reject malformed/reversed ranges rather than silently selecting another period. |
| [C06](#c06) | Medium | The outbound guard does not recognize the leaked DSML protocol | Recognize provider protocol families at the response adapter and egress boundary. |
| [C07](#c07) | High | Secret handling is optional before persistence and incomplete at egress | Apply mandatory secret-aware redaction before transcript persistence/export and use a consistent supported secret vocabulary at egress. |
| [C08](#c08) | Medium | Extraction admission assumes there is no overlapping call | Reserve session capacity synchronously before scheduling, track in-flight work, and serialize/coalesce admission by the input window. |

## C01 — Durable extraction is permanently skipped by the caller/default mismatch

Status: **reproduced in canonical source**.

**What is skipped or assumed:** The durable-memory caller passes only the current user/assistant pair: newMessageCount is at most 2. The default gate requires 4. It does not accumulate the count across turns.

**Executable proof:** Ten settled synthetic turns through the actual maybeExtractMemories runner produce zero injected model calls and an extraction count of zero. Supplying four messages opens the same runner gate and makes one injected call. The actual attempt caller is source-bound to the two-message shape.

**Code improvement:** Collect actual new messages since a real cursor or maintain a bounded per-session buffer. Strip injected context, include existing durable memory for deduplication, and advance the cursor against the admitted input window. Do not merely lower the threshold and enable more repeated extraction.

**Acceptance:** After two eligible exchanges, the pending four-message window is extracted once; later unchanged history is not re-extracted. Tool-settling and budget rules remain explicit. Test the real attempt-to-runner seam rather than injecting newMessageCount=5 independently of recentMessages.

**Connection to chats:** New code defect found while investigating continuity and memory claims. This does not prove it caused a particular rejected remember-tool call.

Retained episode keys: `10b234b1292d`, `2238e6878e06`.

**Limit:** The separate KG extractor and explicit remember tools still exist. This finding is about the durable auto-extraction branch, not a claim that all Minion memory is disabled.

Canonical code anchors:

- [gateway/src/agents/pi-embedded-runner/run/attempt.ts:733](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/pi-embedded-runner/run/attempt.ts#L733)
- [gateway/src/memory/extract-memories.ts:96](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories.ts#L96)
- [gateway/src/memory/extract-memories-runner.ts:61](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories-runner.ts#L61)

## C02 — Code instructs the assistant to skip business tasks for onboarding

Status: **reproduced in canonical source**.

**What is skipped or assumed:** ONBOARDING_REQUIRED says to complete BOOTSTRAP.md before doing anything else and not proceed with unrelated tasks. The personality section simultaneously says to process an ordinary message normally and not repeat personality questions.

**Executable proof:** The real bootstrap resolver, with a synthetic unconfigured workspace, injects the blocking gate for a personal agent. Rendering the real personality section produces the contradictory ordinary-task instruction in the same scenario.

**Code improvement:** Give personal business assistants one onboarding policy. Optional identity/style setup must not block authorized work. Keep capability/assignment readiness separate and show its actual reason. Preserve any deliberately strict onboarding policy for other agent profiles explicitly rather than removing every gate globally.

**Acceptance:** A first-turn business question reaches its authorized data tool or an accurate access error without a naming interview. Unknown optional preferences remain unknown; skipping them does not invent facts in USER.md.

**Connection to chats:** Directly matches the observed naming interview instead of a sales answer; prompt causality is supported, while reproducing a live model choice was outside this audit.

Retained episode keys: `66738ab16516`, `61348f73d85f`, `4f2a7942c9ec`.

**Limit:** The probe validates prompt assembly with mocked workspace reads. It does not claim that the model must always choose one instruction or that an access denial is resolved by this change.

Canonical code anchors:

- [gateway/src/agents/bootstrap/bootstrap-files.ts:54](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/bootstrap/bootstrap-files.ts#L54)
- [gateway/src/agents/sections/identity.ts:90](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/sections/identity.ts#L90)

## C03 — A validated booking preview only echoes syntax-checked input

Status: **reproduced in canonical source**.

**What is skipped or assumed:** confirm=false returns before any booking-service validation. Nonexistent service/customer/staff references pass. The preview also omits crmContactId and resourceId, even though those fields determine the committed booking.

**Executable proof:** Calling the actual POST route with nonexistent references returns HTTP 200 and a preview; auth is invoked, createBooking is not invoked, and the response omits the customer/staff IDs. Request JSON and Zod body parsing are real; authority and database services are synthetic boundaries.

**Code improvement:** Factor an authorized, read-only preparation/preflight step shared with creation: resolve the service, contact, resource, local time, and current availability. Return resolved labels and all effect-defining fields. Revalidate availability inside the actual creation transaction, because previews cannot reserve a future slot.

**Acceptance:** An unknown/foreign service or incompatible resource is rejected before a validated preview is emitted. A valid preview identifies the exact contact, staff, service and time; confirm=false performs no mutation.

**Connection to chats:** Adjacent code gap found in the same booking workflow. The October 23 trace never called preview, so it is not evidence that an invalid preview was shown in that conversation.

Retained episode keys: `e1eb56783c2f`, `2af54b8d724f`.

**Limit:** No write authorization bypass is claimed. The real create path has additional checks; no create operation or database was invoked by the probe.

Canonical code anchors:

- [hub/src/routes/api/gateway/actions/booking-create/+server.ts:33](https://github.com/NikolasP98/minion_hub/blob/1f1ab6a327b347645aeff16f5bd675b8d9fbf54d/src/routes/api/gateway/actions/booking-create/+server.ts#L33)
- [gateway/src/agents/tools/hub/booking-create-tool.ts:30](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tools/hub/booking-create-tool.ts#L30)

## C04 — Booking lists can look complete after silently reaching 500 rows

Status: **source limit verified; route omission reproduced**.

**What is skipped or assumed:** The service defaults to 500 rows, but the agent route returns only {bookings}. It exposes no total, truncation flag, or cursor, and the tool has no limit/pagination input.

**Executable proof:** The real route, supplied a 500-row synthetic service result, returns only the bookings array. Its service arguments do not override the cap. The actual service source applies Math.min(opts.limit ?? 500, 2000). No native SQL result cap was exercised.

**Code improvement:** Add an assistant-specific bounded page/count contract with explicit coverage and continuation. For count questions use a scoped aggregate, not array length. Preserve existing UI list contracts until their consumers are migrated deliberately.

**Acceptance:** A 501-record fixture cannot yield an unqualified count of 500 or an unqualified full list. A complete narrow date range may be reported as complete. PII masking and tenant isolation remain intact.

**Connection to chats:** The chats contain unbounded booking lookups and schedule summaries. No inspected example proves it exceeded the 500-row cap; this is a current completeness-contract defect, not an observed missing-booking count.

Retained episode keys: `2af54b8d724f`, `e16518e73706`, `6fa9f0758779`.

**Limit:** The route probe mocks the authorized service. The cap is source-proven; no full PostgreSQL integration or performance qualification was performed.

Canonical code anchors:

- [hub/src/server/services/scheduling-bookings.service.ts:812](https://github.com/NikolasP98/minion_hub/blob/1f1ab6a327b347645aeff16f5bd675b8d9fbf54d/src/server/services/scheduling-bookings.service.ts#L812)
- [hub/src/routes/api/gateway/query/bookings/+server.ts:19](https://github.com/NikolasP98/minion_hub/blob/1f1ab6a327b347645aeff16f5bd675b8d9fbf54d/src/routes/api/gateway/query/bookings/+server.ts#L19)
- [gateway/src/agents/tools/hub/bookings-query-tool.ts:7](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tools/hub/bookings-query-tool.ts#L7)

## C05 — Invalid finance dates silently become a twelve-month query

Status: **reproduced in canonical source**.

**What is skipped or assumed:** parsePeriod treats malformed dates as missing, then substitutes its UI rolling-year default. The agent-facing tool also has no explicit all-time selector even though the Hub parser supports range=all.

**Executable proof:** With a fixed clock, from=not-a-date&to=also-not-a-date returns the previous twelve months instead of a validation error. A positive control shows range=all returns an open period; the tool schema and forwarding code do not expose that parameter.

**Code improvement:** Validate explicit agent date inputs strictly at the API boundary and reject malformed/reversed ranges rather than silently selecting another period. Expose all-time and resolved period semantics deliberately. Preserve the dashboard default for an actually absent filter.

**Acceptance:** Malformed explicit dates produce a field-specific error. Valid dates and an intentionally absent UI range retain documented behavior. All-time requests are representable and reports disclose their actual period.

**Connection to chats:** Adjacent defense against unsupported period assumptions. Those traces show metric/coverage confusion, not the specific malformed-date input used by the probe.

Retained episode keys: `4658cc41daf0`, `a7458a1aa794`.

**Limit:** This is a pure parser and source-contract probe. It does not establish that a specific historical financial answer used invalid dates or that all date-free queries are bugs.

Canonical code anchors:

- [hub/src/lib/finance/period.ts:6](https://github.com/NikolasP98/minion_hub/blob/1f1ab6a327b347645aeff16f5bd675b8d9fbf54d/src/lib/finance/period.ts#L6)
- [hub/src/routes/api/gateway/query/finance/+server.ts:21](https://github.com/NikolasP98/minion_hub/blob/1f1ab6a327b347645aeff16f5bd675b8d9fbf54d/src/routes/api/gateway/query/finance/+server.ts#L21)
- [gateway/src/agents/tools/hub/finance-query-tool.ts:7](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tools/hub/finance-query-tool.ts#L7)

## C06 — The outbound guard does not recognize the leaked DSML protocol

Status: **exact observed syntax reproduced**.

**What is skipped or assumed:** The guard recognizes ordinary tool_calls/invoke tags but not their DSML-prefixed equivalents. The whole leaked invocation passes unchanged with strippedToolSyntax=false.

**Executable proof:** The actual sanitizeOutboundText function returns an observed-shape DSML invocation unchanged. A positive control removes the existing plain <tool_calls> form.

**Code improvement:** Recognize provider protocol families at the response adapter and egress boundary. Classify raw protocol text as invalid output; permit a bounded repair or return a clear failure. Never execute tool instructions parsed from ordinary final text and never silently replace an entire reply with nothing.

**Acceptance:** Both retained DSML cases fail terminal-response validation. Plain prose and legitimate code examples remain readable. A failed repair has an explicit user-visible outcome.

**Connection to chats:** Direct reproduction of the protocol family stored in the October transcripts.

Retained episode keys: `a1af1079f2f4`, `f2147e49c334`.

**Limit:** This proves the current guard gap. It does not independently prove which browser/channel renderer displayed each retained final or re-run a model provider.

Canonical code anchors:

- [gateway/src/channels/outbound-sanitizer.ts:57](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/channels/outbound-sanitizer.ts#L57)
- [gateway/src/auto-reply/reply/reply-dispatcher.ts:146](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/auto-reply/reply/reply-dispatcher.ts#L146)

## C07 — Secret handling is optional before persistence and incomplete at egress

Status: **default persistence and egress gaps reproduced with synthetic values**.

**What is skipped or assumed:** Default tool-result persistence caps and repairs messages but does not require secret redaction; its transform is optional. Egress masks classic PAT shapes but misses named secret-key fields and github_pat_ fine-grained PAT shapes.

**Executable proof:** The real session guard persists a synthetic MINION_SECRETS_KEY field unchanged. The outbound sanitizer also leaves a synthetic named key and fine-grained PAT unchanged, while its classic PAT positive control is redacted.

**Code improvement:** Apply mandatory secret-aware redaction before transcript persistence/export and use a consistent supported secret vocabulary at egress. Restrict process-environment access for business assistants. Cover known secret-bearing key names and credential URLs without treating every long hexadecimal value as a secret.

**Acceptance:** Synthetic TOKEN/PAT/API_KEY/SECRETS_KEY/PASSWORD and credential-URL fixtures cannot persist or leave the agent in raw form. Normal record IDs and valid structured tool outputs remain intact.

**Connection to chats:** Matches the secret-bearing environment fields already confirmed in a retained tool result. Historical real values are neither copied into probes nor reproduced in this report.

Retained episode keys: `b217ce719626`, `a7458a1aa794`.

**Limit:** Optional installed plugin transforms may alter a configured runtime. Current validity of historical credentials, external disclosure, and misuse were not tested. Credential changes require the normal operator authorization.

Canonical code anchors:

- [gateway/src/agents/sessions/session-tool-result-guard.ts:122](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/sessions/session-tool-result-guard.ts#L122)
- [gateway/src/agents/sessions/session-tool-result-guard-wrapper.ts:41](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/sessions/session-tool-result-guard-wrapper.ts#L41)
- [gateway/src/channels/outbound-sanitizer.ts:92](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/channels/outbound-sanitizer.ts#L92)

## C08 — Extraction admission assumes there is no overlapping call

Status: **latent concurrency defect reproduced; repair with C01**.

**What is skipped or assumed:** Budget is checked before scheduling work but not reserved. Each asynchronous completion advances the cursor it captured before awaiting. Concurrent calls therefore all see the same available capacity and can overwrite each other.

**Executable proof:** Ten overlapping eligible requests under the default five-extraction budget make ten injected calls, then leave extractionCount=1. No provider was called.

**Code improvement:** Reserve session capacity synchronously before scheduling, track in-flight work, and serialize/coalesce admission by the input window. Commit against current cursor state and define failure/retry accounting. Fix this before C01 makes the default caller eligible.

**Acceptance:** Overlapping requests cannot exceed the configured admission budget; completed/admitted counters cannot collapse through stale-cursor writes. Duplicate windows coalesce and cancellation/failure behavior is explicit.

**Connection to chats:** Follow-up defect exposed by probing a repaired/eligible C01 input shape. No historical paid overrun is claimed.

**Limit:** The normal caller is currently blocked by C01. This is a real runner defect under eligible inputs, not evidence that the deployed default path currently overspends.

Canonical code anchors:

- [gateway/src/memory/extract-memories-runner.ts:59](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories-runner.ts#L59)
- [gateway/src/memory/extract-memories-runner.ts:73](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories-runner.ts#L73)
- [gateway/src/memory/extract-memories-runner.ts:100](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories-runner.ts#L100)

## Checked and cleared

- **Hub error metadata loss: already addressed in canonical Gateway source.** Current helper preserves code, status and retryable, propagates abort/timeout state and sends x-minion-server-id. An isolated real-helper probe preserves a permanent denial and gateway header. [gateway/src/agents/tools/hub/hub-common.ts:31](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tools/hub/hub-common.ts#L31)
- **Fulfilled tool-error promises counted as successful built-in tool calls: already addressed in canonical Gateway source.** Current wrapper sets isError when details.error is present and classifies 401/403 as auth_error. A real-wrapper positive probe confirms isError=true. [gateway/src/logging/tool-tracking.ts:20](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/logging/tool-tracking.ts#L20)
- **Dead extractMemories convenience function: not used by the real extraction runner.** The runner calls the injected llmCall and parseExtractionResponse directly. The unused convenience stub is not the cause of C01. [gateway/src/memory/extract-memories-runner.ts:76](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories-runner.ts#L76)

## Recommended correction slices

1. **Memory admission and continuity: C01 + C08 together.** Add the real input window, reserve budget before scheduling, coalesce duplicates, and use commit-safe cursor advancement. Keep independent KG behavior intact.
2. **Personal-agent task readiness: C02.** Resolve the prompt-policy contradiction while keeping actual access/assignment failures distinct.
3. **Trustworthy reads and preflight: C03–C05.** Validate preview references, make data coverage explicit, and reject invalid agent periods. Add an authorized service/event-type lookup so booking_create has resolvable prerequisites; preserve the creation transaction checks.
4. **Output and persistence boundaries: C06 + C07.** Reject malformed protocol output, supply bounded recovery, and redact synthetic secret shapes before persistence and egress. This is security/data work and retains the normal human approval and merge gates.

## Reproduce and review boundaries

The private snapshots and runner are at `.local/agent-code-review-2026-11-06/`. From that directory:

```bash
./node_modules/.bin/vitest run --config vitest.config.mjs --reporter=json --outputFile=probe-results.json
```

The copied test/config files in this report are review artifacts; reproducing requires the pinned source snapshots and compatible dependencies. Source fingerprints and dependency-reuse limits are in `findings.json`. The archived tar files retain original source bytes. `handoff-todos.patch` records comments added at exact defect sites in the private annotated snapshots; no behavioral patch is applied and no shared product checkout is changed. The linked meta proposal records the same eight open items.

Standards review: isolated source snapshots, synthetic values, no broad staging, no branch/worktree changes, no production testing, no paid eval calls. Spec review: audit/reproduction scope achieved; product implementation, full-suite qualification, deployment, and current runtime reproduction are not claimed.
