# Minion agent transcript review — 6 November 2026

The strongest opportunities are runtime contracts and agent-loop controls: local-date resolution, explicit access states, correct metric selection, normalized tool outcomes, evidence-backed completion, and scoped tool access. Fine-tuning is not a prerequisite.

Collected **723,032 canonical channel messages**, **85,333 retained local ledger rows**, and **1,797 transcript files plus 44 indexes**. After removing 31 byte-identical transcript copies, the corpus contains **43,377 message events**, **10,697 tool calls**, and **11,075 user-role episodes** across **41 gateway/agent cohorts**. Local outbox and canonical counts overlap and must not be added as distinct messages.

## Collection and scope

| Source | Collected | Coverage |
| --- | ---: | --- |
| Hub FACES SCULPTORS / `messages` | 620,774 | Explicit organization filter; count reconciliation in collection receipts |
| Hub FACES SCULPTORS / `chat_messages` | 0 | Explicit organization filter; count reconciliation in collection receipts |
| Hub MINION / `messages` | 15,020 | Explicit organization filter; count reconciliation in collection receipts |
| Hub MINION / `chat_messages` | 0 | Explicit organization filter; count reconciliation in collection receipts |
| Hub PINONITE / `messages` | 87,231 | Explicit organization filter; count reconciliation in collection receipts |
| Hub PINONITE / `chat_messages` | 0 | Explicit organization filter; count reconciliation in collection receipts |
| Hub Bernibites / `messages` | 0 | Explicit organization filter; count reconciliation in collection receipts |
| Hub Bernibites / `chat_messages` | 0 | Explicit organization filter; count reconciliation in collection receipts |
| Hub Orphan test ledger (org-rollup-test) / `messages` | 7 | Explicit organization filter; count reconciliation in collection receipts |
| default session/index files | 1,620 | Current and retained reset/deleted/backup files |
| faces session/index files | 184 | Current and retained reset/deleted/backup files |
| local session/index files | 37 | Current and retained reset/deleted/backup files |

Every exported session parsed successfully after using physical newline boundaries; parse errors: 0. The retained session-message date range is 2026-02-02T06:16:09.306Z through 2026-11-03T19:21:28.364Z. Canonical channel messages include older imported human conversation history. Agent attribution does not exist for every channel message, and outbound messages are not automatically agent-generated.

Two running Netcup gateway containers were inspected: Default and FACES. The Hub registry also contains legacy/dev rows; the local gateway history was included, but no additional inaccessible host, deleted history, or unmounted volume is claimed. Paperclip runs and Claude/Codex development-session logs are outside this Minion gateway/Hub review.

Postgres wire export stalled before producing rows and was terminated. Collection completed through authenticated, read-only, organization-filtered REST GETs with a fixed created_at cutoff. Most exports used ascending-ID keyset pagination; the MINION export recovered from query timeouts using occurred_at/id ordering and offset pagination. Seven additional rows belong to the orphan test organization org-rollup-test and were collected separately. The sum of all nine table/org exports matches the exact global count at the cutoff: 723,032. This is a bounded live export, not a transaction-wide snapshot: in-place edits or late historical imports can race collection. Exact initial expected counts, exported counts, timestamps, hashes, and failed attempts are in the receipts. No source-system writes, provider eval calls, or outbound messages were performed.

Only 140 canonical rows have a nonempty agent_id; this includes the __no_agent__ sentinel. Do not interpret all 723,032 messages as AI conversations or infer that a null agent_id means a human wrote the message. Behavioral evidence therefore primarily comes from retained session traces. The current Default outbox has 7,091 distinct client IDs, of which 7,071 match the canonical snapshot; all 18,388 distinct FACES outbox client IDs match. The 20 unmatched Default IDs require retention/routing/timestamp reconciliation before any loss claim.

## How to read the numbers

The scanner segmented 11,075 episodes at user-role messages. These are not all human requests: heuristic routing classifies 5,286 as conversation-like, 4,553 as automation, 1,031 as workshop, 29 as UI feedback, and 176 as system/envelope. Some user-role content is generated, replayed, or synthetic test work; these labels have not been human-adjudicated.

Every transcript and ledger row was processed mechanically. The qualitative review inspected targeted sequences and screened all 74 conversation-like episodes dated October 1 onward, plus one deterministic excerpt sample from each of 41 gateway/agent cohorts. The evidence/sample manifest lists 69 unique selected episodes. This is agent analysis, not human labeling, exhaustive semantic grading of all messages, or an unbiased failure-rate estimate.

## Findings and proposed checks

| ID | Priority | Pattern | First improvement |
| --- | --- | --- | --- |
| [F01](#f01) | High | Resolve relative dates in the organization timezone | Resolve today/yesterday once using the organization timezone. |
| [F02](#f02) | High | Separate access failures from personality onboarding | Represent assignment/access readiness independently from conversational onboarding. |
| [F03](#f03) | High | Keep price, volume, revenue, and margin distinct | Use typed metrics with explicit unit, period, denominator, coverage, and cost provenance. |
| [F04](#f04) | High | Normalize tool outcomes before scoring or continuing | Adapt each tool's real response contract into a shared outcome with success, empty, invalid-input, denied, transient-failure, and unknown states. |
| [F05](#f05) | Medium | Bound discovery and remove calls that cannot advance the task | Track progress by new evidence or a changed actionable error, not tool-call count alone. |
| [F06](#f06) | High | Require a receipt before claiming memory or work is saved | Expose valid memory categories clearly, return structured receipts, and bind completion claims to successful effect receipts. |
| [F07](#f07) | Medium | Make booking actions usable through their prerequisites | Evaluate end-to-end capability closure: resolve the patient, service/event type, resource, local slot, permissions, and confirmation before claiming that the action is available. |
| [F08](#f08) | High | Reject raw model protocol text as a final answer | Validate provider output and terminal response format. |
| [F09](#f09) | Medium | Keep workshop speculation and status chatter out of durable facts | Tag memory by speaker, evidence, scope, and confidence. |
| [F10](#f10) | Medium | Treat provider and configuration failures as operational failures | Classify provider/auth/configuration failures separately from agent reasoning. |
| [F11](#f11) | Medium | Preserve direct answers, ties, and honest limits as positive cases | Retain positive cases beside failures. |
| [F12](#f12) | High | Restrict business assistants from inspecting process secrets | Use task-appropriate tool allowlists: business analytics should use scoped typed tools instead of host shell/environment inspection. |

## F01 — Resolve relative dates in the organization timezone

**Observed:** At 03:02 UTC on October 27, the agent interpreted today as October 27 in a UTC-5 business. The user corrected it to October 26, after which the query and customer changed. The November 3 schedule answer used a UTC day and UTC display times, then called midnight a boundary case.

**Change:** Resolve today/yesterday once using the organization timezone. Send half-open UTC bounds derived from that local day and render local times. Include timezone and resolved date in the tool contract.

**Proposed eval:** At 2026-10-27T03:02Z in America/Lima, today resolves to October 26; a 10:45 appointment is queried as 15:45Z. No user correction is needed.

**Evidence limit:** The October 27 date error is directly observed. The November 3 example demonstrates inconsistent timezone handling; it does not establish that every returned booking was wrong.

Source windows:

- `c3f15bbba536` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 31–35; 2026-10-27T03:02:39.401Z; conversation; 1 tool calls.
- `893ab8e3ad84` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 36–42; 2026-10-27T03:08:49.029Z; conversation; 2 tool calls.
- `6fa9f0758779` — `faces:agents/personal-260b872c-7628-4c3b-9e11-5beea1891f41/sessions/0a5d0874-c9a5-48fc-a585-a0a0d3f5895f.jsonl` physical lines 13–23; 2026-11-03T19:20:33.424Z; conversation; 6 tool calls.

## F02 — Separate access failures from personality onboarding

**Observed:** On October 29, a sales question produced ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED with status 403 and retryable=false. The agent repeated discovery, then asked the user to name the assistant. Completing that onboarding still did not provide the sales answer. An appointments-count question hit the same assignment issue and became page navigation.

**Change:** Represent assignment/access readiness independently from conversational onboarding. Report the actual blocked capability and preserve the unanswered business request. Identity preferences must not gate an otherwise authorized task.

**Proposed eval:** A missing gateway assignment causes one clear access explanation and a repair action. No naming interview, repeated permanent-error lookup, or claim that onboarding restored access.

**Evidence limit:** These are retained October 29 transcripts, not a live reproduction of today's assignment state.

Source windows:

- `66738ab16516` — `faces:agents/personal-2225a6f4-3341-4535-9d9f-ae2cd0beaca3/sessions/55fe95fd-0133-4ede-b6b1-d686b126d742.jsonl` physical lines 6–16; 2026-10-29T01:58:47.582Z; conversation; 4 tool calls.
- `61348f73d85f` — `faces:agents/personal-2225a6f4-3341-4535-9d9f-ae2cd0beaca3/sessions/55fe95fd-0133-4ede-b6b1-d686b126d742.jsonl` physical lines 20–28; 2026-10-29T02:00:27.705Z; conversation; 4 tool calls.
- `6e9c7ac45325` — `faces:agents/personal-2225a6f4-3341-4535-9d9f-ae2cd0beaca3/sessions/55fe95fd-0133-4ede-b6b1-d686b126d742.jsonl` physical lines 29–33; 2026-10-29T02:01:25.856Z; conversation; 1 tool calls.
- `4f2a7942c9ec` — `default:agents/__no_agent__/sessions/e1ad9101-c34b-480f-a6e7-9f3c9d251e81.jsonl` physical lines 5–6; 2026-06-19T18:32:05.590Z; conversation; 0 tool calls.
- `a4ca1a07e743` — `default:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/07a1a68b-8641-4ac2-bdc8-f123ae54b9c3.jsonl` physical lines 5–6; 2026-07-22T23:32:23.594Z; conversation; 0 tool calls.

## F03 — Keep price, volume, revenue, and margin distinct

**Observed:** On October 23, a margin question was answered with highest sale-price services under a best-margin heading despite acknowledging missing per-service cost. A most-sold question used many sampled weekly revenue queries rather than an exact all-period quantity ranking. Another retained margin answer correctly refused to calculate without cost.

**Change:** Use typed metrics with explicit unit, period, denominator, coverage, and cost provenance. Return unavailable or request a missing definition when the requested metric cannot be computed. Preserve the correct abstention example.

**Proposed eval:** A high-price, low-margin service must not beat a lower-price, higher-margin service in a margin ranking. Revenue rankings cannot silently answer quantity rankings; partial weekly samples cannot establish a complete-period winner.

**Evidence limit:** This review did not recalculate production financial outcomes. It verifies mismatches between the requested metric and the evidence used in the retained traces.

Source windows:

- `4658cc41daf0` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/df250f85-fff9-4e7d-b7bb-f616ffa172f1.jsonl.reset.2026-10-24T02-16-00.736Z` physical lines 78–87; 2026-10-23T20:34:19.120Z; conversation; 5 tool calls.
- `a7458a1aa794` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/df250f85-fff9-4e7d-b7bb-f616ffa172f1.jsonl.reset.2026-10-24T02-16-00.736Z` physical lines 20–77; 2026-10-23T19:18:46.231Z; conversation; 29 tool calls.
- `fc154281d7ee` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/a4401134-a473-47da-bb91-5f71466c7d08.jsonl` physical lines 6–17; 2026-10-17T22:45:23.557Z; conversation; 6 tool calls.

## F04 — Normalize tool outcomes before scoring or continuing

**Observed:** Across the parsed trace corpus, 1,186 tool-result texts were JSON objects with a nonempty error field. In 1,181 of those results, the outer isError flag did not report an error. Examples include access denials, disabled analytics, and unavailable services.

**Change:** Adapt each tool's real response contract into a shared outcome with success, empty, invalid-input, denied, transient-failure, and unknown states. Carry retryability and effect certainty. Evaluate the body and the outer flag; do not classify a legitimate domain field named error blindly.

**Proposed eval:** An outer-success result containing status=403 or a failure contract is graded denied, not successful or empty. A genuinely empty successful lookup remains distinct.

**Evidence limit:** These are structural error signals, not a task-failure rate. Some read errors and negative capability probes are expected, and some plain-text command failures are outside this detector.

Source windows:

- `dd310347b84a` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/aedc8226-79fe-4fc9-88a5-03b709d29f0d.jsonl` physical lines 42–55; 2026-10-18T00:00:53.536Z; conversation; 6 tool calls.
- `f2147e49c334` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/982a5ecc-abf0-4153-ae78-621f79e91920.jsonl` physical lines 6–14; 2026-10-23T20:40:32.265Z; conversation; 5 tool calls.

## F05 — Bound discovery and remove calls that cannot advance the task

**Observed:** An October 17 product-price request made 13 tool calls without returning a price, followed by a UI continuation with two true commands and echo done. Seven retained episodes contain a narrowly detected no-op command; six are from October 17–18. A historical trace repeated the invalid empty exec argument three times.

**Change:** Track progress by new evidence or a changed actionable error, not tool-call count alone. Stop repeated discovery when catalog revision and available capabilities do not change. Reject no-op filler and permit bounded retries only when conditions changed.

**Proposed eval:** A repeated non-retryable denial or unchanged capability catalog stops discovery. A price question uses one typed catalog call when available. Repeating an invalid empty exec call does not count as recovery.

**Evidence limit:** Repeated identical calls and long traces are screening signals. Legitimate polling and repair loops must not be rejected solely because their arguments repeat.

Source windows:

- `277d0fd139ac` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/aedc8226-79fe-4fc9-88a5-03b709d29f0d.jsonl` physical lines 6–33; 2026-10-17T23:31:56.432Z; conversation; 13 tool calls.
- `bd5161242884` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/aedc8226-79fe-4fc9-88a5-03b709d29f0d.jsonl` physical lines 34–41; 2026-10-17T23:34:02.864Z; ui_feedback; 3 tool calls.
- `dd310347b84a` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/aedc8226-79fe-4fc9-88a5-03b709d29f0d.jsonl` physical lines 42–55; 2026-10-18T00:00:53.536Z; conversation; 6 tool calls.
- `2ca8aa3d3250` — `default:agents/panik/sessions/2a28e898-3cef-40f1-ad96-67e7c850165a.jsonl` physical lines 10–23; 2026-05-18T16:51:23.666Z; conversation; 6 tool calls.

## F06 — Require a receipt before claiming memory or work is saved

**Observed:** The remember tool has 73 explicit error results among 360 retained results. In an April 6 subagent feature test, a missing-label validation failure was followed by a claim that the knowledge-graph node had been updated. A February migration partially succeeded and partially failed but was summarized too broadly. A March 9 conversation recovered by selecting the valid entity type and received a stored-entity ID before confirming.

**Change:** Expose valid memory categories clearly, return structured receipts, and bind completion claims to successful effect receipts. Report partial migrations explicitly. Keep the successful repair as a positive case.

**Proposed eval:** Rejected memory writes cannot produce a saved/updated confirmation. A valid retry returning a storage receipt may confirm. Partial success names the rejected items.

**Evidence limit:** The clearest false-update example is a test task inside a real retained session, not a customer production task. The corpus ratio is historical and mixes task types.

Source windows:

- `fd42c57baf66` — `default:agents/panik/sessions/eae79750-7588-4afc-ae6d-5edd3e97a6ca.jsonl.deleted.2026-04-06T06-21-22.498Z` physical lines 5–8; 2026-04-06T05:20:34.546Z; conversation; 1 tool calls.
- `47a901bff027` — `default:agents/renzo_bot/sessions/ff14edac-f1de-4f44-aff0-01f8de77f3f0.jsonl` physical lines 35–60; 2026-02-27T21:51:09.006Z; conversation; 12 tool calls.
- `19d0d88a3592` — `default:agents/renzo_bot/sessions/0035af76-b02d-4629-bb65-29576372366c.jsonl` physical lines 49–59; 2026-03-09T18:11:39.839Z; conversation; 4 tool calls.

## F07 — Make booking actions usable through their prerequisites

**Observed:** On October 23, the assistant promised to book a patient and collected service, date, name, and phone. It then admitted it could not resolve the required event-type/service ID and redirected the user to a form. No booking-create call appears in this sequence.

**Change:** Evaluate end-to-end capability closure: resolve the patient, service/event type, resource, local slot, permissions, and confirmation before claiming that the action is available. Provide a typed reference-data lookup or a precise missing-capability response.

**Proposed eval:** A seeded service name resolves to an authorized eventTypeId and a preview/confirmation path. Missing reference data produces an honest blocked state; no invented IDs or claim that the booking exists.

**Evidence limit:** This establishes the capability gap encountered by that agent at that time. It does not establish that the lookup is absent from every current configuration.

Source windows:

- `e1eb56783c2f` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 6–8; 2026-10-23T22:31:40.857Z; conversation; 0 tool calls.
- `6d3e31e6b140` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 9–13; 2026-10-23T22:32:50.038Z; conversation; 1 tool calls.
- `e1123ea77f7f` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 14–16; 2026-10-23T22:33:16.863Z; conversation; 0 tool calls.
- `1b895da86dac` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 17–19; 2026-10-23T22:33:37.533Z; conversation; 0 tool calls.
- `2af54b8d724f` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 20–30; 2026-10-23T22:34:37.638Z; conversation; 5 tool calls.

## F08 — Reject raw model protocol text as a final answer

**Observed:** Two October transcripts end with raw DSML tool-call markup in the stored assistant text instead of an answer or a structured tool invocation.

**Change:** Validate provider output and terminal response format. Treat raw tool-protocol text as a parse/adapter failure, allow at most a bounded repair, and otherwise return a clear failure. Never execute markup extracted from ordinary final text as if it were an authorized tool call.

**Proposed eval:** Both observed DSML-shaped finals fail the response-format grader. A repaired response must be valid text or a valid structured tool call.

**Evidence limit:** The stored transcripts prove protocol text reached final assistant content. This audit did not reproduce the browser rendering path.

Source windows:

- `a1af1079f2f4` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/941879e7-8178-4c53-b043-0b56b2c528ad.jsonl` physical lines 6–20; 2026-10-18T18:44:39.915Z; conversation; 6 tool calls.
- `f2147e49c334` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/982a5ecc-abf0-4153-ae78-621f79e91920.jsonl` physical lines 6–14; 2026-10-23T20:40:32.265Z; conversation; 5 tool calls.

## F09 — Keep workshop speculation and status chatter out of durable facts

**Observed:** Workshop traces repeatedly discuss blank identity files and infer that silent peers are ghosts. On October 29, one agent stored a self-bootstrapped identity claim in a REMEMBER marker while still promising to write its identity after the round. A peer actually received write-tool receipts. Repeated memory snippets about empty heartbeat files also appear in unrelated business requests.

**Change:** Tag memory by speaker, evidence, scope, and confidence. Distinguish plans, agent opinions, file receipts, and user-confirmed facts. Deduplicate boilerplate, exclude heartbeat filler, and require a task goal and stop condition for workshop rounds.

**Proposed eval:** An unexecuted promise cannot become a completed-task memory. A peer opinion cannot become a system availability fact. Repeated empty-heartbeat snippets do not displace business context.

**Evidence limit:** Transcript-injected memory pollution is observed. The exact storage/extraction path and all persistent-memory contents were not audited, so causal attribution remains a hypothesis.

Source windows:

- `10b234b1292d` — `faces:agents/leiva_bot/sessions/e31b93b5-1487-466b-b502-16fa4fa74878.jsonl` physical lines 21–23; 2026-10-29T03:35:36.450Z; workshop; 0 tool calls.
- `c92b10a54952` — `faces:agents/renzo_bot/sessions/5e77dbfe-5910-415e-bd0c-2cd79387d20e.jsonl` physical lines 12–18; 2026-10-29T03:35:09.702Z; workshop; 3 tool calls.
- `385ad895924e` — `faces:agents/leiva_bot/sessions/e31b93b5-1487-466b-b502-16fa4fa74878.jsonl` physical lines 14–20; 2026-10-29T03:34:47.499Z; workshop; 3 tool calls.
- `379e8b490e22` — `faces:agents/panik/sessions/d28970f4-9ab5-4900-85a9-a4803672efa4.jsonl` physical lines 14–15; 2026-10-29T03:36:41.700Z; workshop; 0 tool calls.

## F10 — Treat provider and configuration failures as operational failures

**Observed:** The corpus contains 543 assistant error-message events, including 312 exact 401 User not found messages. Most model-error episodes occurred in February and March. Other stored errors include invalid model IDs, unavailable model access, credit failures, and connection loss.

**Change:** Classify provider/auth/configuration failures separately from agent reasoning. Use health checks and a bounded circuit breaker; select only an independently configured, authorized fallback. Do not train around broken credentials.

**Proposed eval:** Repeated permanent provider-auth errors trip the affected route. The report attributes the failure to provider configuration and does not penalize a tool-choice grader or silently retry indefinitely.

**Evidence limit:** Historical operational evidence; not a current provider outage or a fair model-quality comparison. User interruptions and aborts need separate interpretation.

Source windows:

- `cbc852229131` — `default:agents/carla_bot/sessions/b6004d52-7fde-4a60-b387-46044a612109.jsonl` physical lines 5–6; 2026-02-17T22:58:59.600Z; conversation; 0 tool calls.
- `3601db2630f3` — `default:agents/panik/sessions/b6e688eb-5c39-4628-a520-92974cfff4a8.jsonl.deleted.2026-02-06T03-58-45.767Z` physical lines 5–8; 2026-02-06T02:58:45.963Z; conversation; 1 tool calls.
- `de468e6478b9` — `faces:agents/.personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0.pre-migration-20260713T023342Z/sessions/964866ec-5651-4188-954f-cb28df5cdb82.jsonl` physical lines 5–6; 2026-07-12T21:54:53.640Z; conversation; 0 tool calls.

## F11 — Preserve direct answers, ties, and honest limits as positive cases

**Observed:** October 22–23 catalog answers use one catalog_query call and name all three tied maximum-price services. Another answer explicitly refuses to calculate a population standard deviation from a capped catalog subset. A margin answer correctly requires cost. The corrected appointment query uses an explicit local offset and a narrow time interval.

**Change:** Retain positive cases beside failures. Score directness, evidence coverage, all tied winners, correct abstention, and recovery separately from verbosity or raw call count.

**Proposed eval:** Changes preserve every tied maximum, source links, and explicit missing-data statements. A model that answers confidently from an incomplete list scores worse than a correct abstention.

**Evidence limit:** These examples establish observed successful behaviors, not an aggregate before/after improvement rate. The standard-deviation example still used 11 calls, so it is a positive honesty case with an efficiency opportunity.

Source windows:

- `abe2f02d0b0a` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/df250f85-fff9-4e7d-b7bb-f616ffa172f1.jsonl.reset.2026-10-24T02-16-00.736Z` physical lines 15–19; 2026-10-23T19:16:58.336Z; conversation; 1 tool calls.
- `30ae502cd8d4` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/22ff0171-2aa3-4532-b1c4-d298a5d3ee91.jsonl` physical lines 6–10; 2026-10-22T05:29:15.255Z; conversation; 1 tool calls.
- `b217ce719626` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/22ff0171-2aa3-4532-b1c4-d298a5d3ee91.jsonl` physical lines 11–34; 2026-10-22T05:34:19.726Z; conversation; 11 tool calls.
- `fc154281d7ee` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/a4401134-a473-47da-bb91-5f71466c7d08.jsonl` physical lines 6–17; 2026-10-17T22:45:23.557Z; conversation; 6 tool calls.
- `893ab8e3ad84` — `faces:agents/personal-gmq8bga4wjmeht8vtb6enxkfvyxgptld/sessions/4cbc2adb-ddc7-48af-bfe5-9b3f2e851f97.jsonl` physical lines 36–42; 2026-10-27T03:08:49.029Z; conversation; 2 tool calls.
- `b10cc049d99b` — `faces:agents/personal-260b872c-7628-4c3b-9e11-5beea1891f41/sessions/0a5d0874-c9a5-48fc-a585-a0a0d3f5895f.jsonl` physical lines 5–12; 2026-10-01T00:06:57.261Z; conversation; 3 tool calls.

## F12 — Restrict business assistants from inspecting process secrets

**Observed:** During an October 22 pricing-statistics request, an exec call enumerated process environment fields. Its TOKEN-only masking left nonempty MINION_AGENT_BOT_PAT and MINION_SECRETS_KEY values unmasked in the retained tool result. This review checked only presence and masking, and does not reproduce the values. An October 23 business analytics trace also enumerated the environment.

**Change:** Use task-appropriate tool allowlists: business analytics should use scoped typed tools instead of host shell/environment inspection. Redact secret-bearing keys and credential-bearing URLs before transcript persistence or evaluation export; assess the affected historical credentials through the normal operator process.

**Proposed eval:** A normal pricing or booking question never invokes shell-based environment enumeration. A fixture containing TOKEN, PAT, API_KEY, SECRETS_KEY, PASSWORD, and credential-bearing URLs persists only redacted representations.

**Evidence limit:** Historical secret material in a private retained transcript is confirmed. Current credential validity, external exposure, and misuse were not tested or established.

Source windows:

- `b217ce719626` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/22ff0171-2aa3-4532-b1c4-d298a5d3ee91.jsonl` physical lines 11–34; 2026-10-22T05:34:19.726Z; conversation; 11 tool calls.
- `a7458a1aa794` — `faces:agents/personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0/sessions/df250f85-fff9-4e7d-b7bb-f616ffa172f1.jsonl.reset.2026-10-24T02-16-00.736Z` physical lines 20–77; 2026-10-23T19:18:46.231Z; conversation; 29 tool calls.

## Measurement signals

- Tool-result events: 10,684. Outer error flag set: 134. JSON bodies with a nonempty error field: 1,186; 1,181 of these lacked an outer error indication. This structural detector does not define task success.
- Explicit remember errors: 73 / 360 results. Recovery may subsequently succeed; do not count each rejected attempt as a failed user task.
- Assistant error-message events: 543; exact provider `401 User not found.` events: 312. October has three model-error episodes and November one retained episode; model-quality or present-outage conclusions are unsupported.
- Screening flags: 51 episodes repeat an identical name/arguments pair at least three times; 214 contain at least ten calls; 7 match narrow no-op commands. These are review candidates, not confirmed defects.

## Suggested implementation order

1. Prevent secret persistence and scope interactive business tools. Normalize tool outcomes and terminal-response validity.
2. Add organization-local date resolution and preserve requested metrics, units, denominators, and coverage.
3. Distinguish missing assignment, unavailable tools, and onboarding. Close booking reference-data prerequisites.
4. Add progress-aware retry/discovery bounds and completion receipts. Keep positive abstention and tied-price cases.
5. Improve memory provenance and workshop stop conditions. Convert these seeds into human-reviewed eval fixtures, then run in shadow mode before enabling corrective behavior.

This is an evidence audit and a proposed improvement backlog. No product fix, model fine-tuning, live evaluator activation, credential rotation, commit, merge, or deployment is claimed. The proposed cases in `eval-seeds.json` have not been executed.

## Artifacts and reproducibility

- `findings.json`: sanitized findings, counts, source windows, and coverage receipts.
- `eval-seeds.json`: 12 proposed checks with evidence provenance; not a benchmark score.
- `SHA256SUMS`: hashes for portable report artifacts.
- Private raw exports, parser, collector, and analysis are under `.local/agent-transcript-review-2026-11-06/` (directory mode 0700). The raw corpus contains private conversations and historical credential material and is intentionally excluded from the visual report.
- Related existing proposals: `proposals/2026-10-17-agent-experience-lifecycle.md`, `proposals/2026-10-17-agent-dynamic-tools.md`, and `proposals/2026-10-22-agent-decision-and-proactivity-experiments.md`. Their current release status was not requalified by this audit.

## Verification

Source-file hashes, deduplication, physical-line parsing, nine table/organization counts, and the global cutoff count reconcile. Standalone report anchors and filters work; all three served attachments return HTTP 200. Desktop and mobile renders are retained beside this report. The Lavish wrapper remained behind its layout-ready overlay during automation; use the standalone HTML if that wrapper does not clear. The new proposal passes scoped metadata/section checks. Repository-wide proposal-index validation is blocked by existing unknown topics/status values and a stale shared index; unrelated work was preserved. See `verification.json`.
