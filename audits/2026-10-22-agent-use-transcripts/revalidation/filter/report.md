# Revalidation: complaint filtering, call economics and event correctness

**Revise the recommendation. Alert-watcher is a conditional Jev experiment, not a demonstrated best pilot.** Its default complaint contract does have a cheap, generation-free negative branch. However, no activation or traffic volume was established; its matcher is configurable beyond complaints; and executable probes exposed duplicate/dropped events and cost attribution errors that invalidate naive savings or recall measurements. The immediate work should normalize event identity and measure an admitted-call baseline before introducing a new classifier.

## Evidence boundary

Gateway source: `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`, DEV snapshot at `/tmp/minion-agent-validation-20261022-blbb_5vg/minion`. Hub comparison: `b677a5d91a2b653211a1655465b2b5fd398efc2a`, master snapshot in sibling `minion_hub`. Paths below are relative to their named repository. These are extracted snapshots, not Git worktrees. Source was inspected read-only except for three temporary offline test files in the gateway snapshot. Original repositories, live providers, configuration and production data were untouched.

Tests use the installed dependencies exposed through a symlink to `/home/nikolas/Documents/CODE/MINION/minion/node_modules`; that is **not a frozen install of the snapshot's lockfile**. The probes validate source control flow and object contracts with mocked external boundaries, not provider compatibility or deployment behavior.

## Actual call paths and configuration

### Hook path

`channel adapter → fireMessageInbound → plugin hook runner → alert-watcher message_inbound → matching subscription → handle → dedup → length filter → classifyMessage → minSeverity → cooldown → SQLite insert → optional reply-suggestions drone → sendAlerts`.

- The bundled plugin is disabled unless enabled: `src/plugins/config-state.ts:17-21,165-195`. Default subscriptions and destinations are empty: `extensions/alert-watcher/index.ts:113-142`; manifest lines 9-44. A source file is not evidence of any current paying traffic. An explicitly enabled plugin with no subscriptions receives hook logging but does no classification.
- Subscriptions may match channel+optional account, agent, or catchall: `extensions/alert-watcher/src/subscriptions.ts:1-25`. Classifier configuration is plugin-global plus flow-node overrides, not a dedicated per-org complaint policy. Hook admission separately honors org enablement through `src/plugins/hooks.ts:120-143,191-196`; missing org scope is explicitly fail-open for compatibility. `src/channels/fire-message-inbound.ts:48-55` supplies account ownership.
- Hook dedup happens before inference (`index.ts:637-655`), then fewer than three Latin/alphanumeric characters are skipped (`664-671`). This heuristic also excludes text entirely in scripts outside its allowlist; a multilingual pilot must record this pre-existing coverage boundary rather than credit all absent calls to Jev.
- Cooldown executes **after** classification to permit severity escalation (`732-738`). It suppresses alerts, not classifier calls. Runtime resolver defaults cooldown to false (`138-142`), whereas the manifest advertises true (`minion.plugin.json:113-126`); do not assume the effective value without observing resolved config.
- Classifier defaults to Anthropic `claude-haiku-4-5`, max 256 generated tokens, 15-second drone timeout (`src/classifier.ts:85-92,109-115`). The hook wraps it with a 30-second outer race (`index.ts:696-719`). No fallback model is declared at this site. On a classifier exception the message returns without a persisted classification-work record (`715-717`). No statement here claims all SDK/provider retries were measured.
- Only successful positive results above minSeverity and outside cooldown are inserted (`724-750`). Consequently the complaints DB does **not** contain the denominator needed to estimate admitted-call negative share, classifier failures or all suppressed positives. Logs and unscoped drone events are insufficient by themselves for clean per-policy experimental accounting.
- Successful positives may trigger a second generative call for owner-reply suggestions (`762-773`), enabled by default in reply-flow defaults. That cost is not removed by a true-negative filter because negatives never reached it in the baseline.

### Agent subscription path

`dispatchFromConfig → runMessageReceived → matching agent subscription → handle`.

The dispatch code supplies `metadata.messageId`, `metadata.senderId`, `ctx.conversationId`, account and agent (`src/auto-reply/reply/dispatch-from-config.ts:265-289`). Alert-watcher reads top-level `event.messageId`, `ctx.chatId`, and `event.from` (`index.ts:864-871`). These fields do not match. **F-02 reproduces two classifications/two sends for a single logical message when both channel and agent subscriptions match.** Agent-only processing can write `chat_id="unknown"`, impairing context lookup and origin handling.

There is no global “every message goes to this classifier” path: raw inbound wiring exists for Telegram, Discord, Signal, Slack, iMessage, and separately WhatsApp (`src/channels/impl/*` callers of `fireMessageInbound`; `src/web/inbound/monitor.ts:142-179`). Agent subscriptions additionally see dispatch-path events. The raw hook runs before normal mention/pairing/agent dispatch filters; do not equate active assistant turns with classifier admissions. No direct raw inbound call was found for every extension channel. Custom extension support must be checked individually. Hook invocation is fire-and-forget and void hooks execute in parallel (`src/channels/fire-message-inbound.ts:51`; `src/plugins/hooks.ts:188-207`), so delivery ordering is not a serialization guarantee.

### Flow/RPC path

`flow trigger → alertWatcher.classify RPC → rule router → sendAlert` is the shipped manifest template. Optional `gate` and `suggest` nodes also exist, but **the packaged templates do not include `gate`**. `classify` does not run the hook's subscription, dedup or triviality gates; repeated identical or empty input invokes the drone again. Gate dedup/cooldown, when a user wires it, is downstream of classification (`index.ts:336-424,426-515`). Neither the direct RPC nor its envelope carries the trigger metadata automatically in this implementation.

A cheap prefilter inserted only in hook `handle` would therefore miss flow/RPC classifier calls. A shared insertion in `classifyMessage` reaches both, but must respect each caller's resolved rules and public output contract. Negative envelopes can safely pass downstream without generation: the probe verifies `gate`, `suggest` and `sendAlert` all no-op on `match:false`.

## Why a global complaint prefilter is unsound

The default prompt requires an empty negative summary (`src/classifier.ts:18-29`). It intentionally classifies only the current message (`60-67`), irrespective of history passed by the hook. **Confirm** the original insight for that default policy.

But the whole system prompt is replaceable, severity definitions and categories are configurable, and flow nodes can override matching rules (`src/classifier.ts:42-57,70-84`; `index.ts:352-398`). For example, a valid configured watcher can match requests for opening hours. A generic “not a complaint” result would wrongly suppress that required alert. The type named `is_complaint` is legacy terminology; the public envelope already calls it `match` (`src/envelope.ts:10-25`). A default-only pilot should explicitly fingerprint the effective default rubric, bypass custom rules, and choose a valid configured category when constructing a negative result. A later general matcher experiment must ask whether the message matches the *effective policy*, not whether it sounds like a complaint.

Typed negative output preserves the built-in consumer contract (`match:false`, empty summary, accepted severity/category). It does not preserve hypothetical custom flow branches that inspect negative category/severity, nor arbitrary overridden prompts requiring negative summaries. Inventory those consumers before promotion.

## Reproduced problems that come before savings claims

| ID | Finding and consequence | Pinned source | Offline evidence |
|---|---|---|---|
| F-01 | Dedup keys only raw message ID; distinct Telegram chats/accounts with the same chat-local ID lose one event | `extensions/alert-watcher/src/dedup.ts:46-48`; `index.ts:641-642`; Telegram adapter `src/channels/impl/telegram/bot-handlers.ts:140-151` | Two distinct chats with ID `7` cause one classifier call and one send |
| F-02 | Received-event adapter reads nonexistent ID/chat fields; dual subscription double-processes the same event | Dispatch `265-289`; watcher `864-871` | One inbound plus its actual dispatch-shaped event cause two classifier calls and two sends |
| F-03 | In-memory dedup marks an event before classification succeeds; an outage consumes its retry opportunity | Watcher `641-642,715-717,743-750` | Classifier fails once; redelivery of the same message makes no second attempt and sends nothing |
| F-04 | Shared DroneHost retains last resolved model, so concurrent different-model calls misattribute usage | `src/drones/host.ts:27-39,83-105`; watcher shared host `103-107` and node-model override `341-344` | Resolve model A, resolve model B, end A: usage is tagged B |

Boot notification retry is a separate stage: it only covers already-inserted positive rows (`index.ts:276-326`; `src/store.ts:42-54`). Partial delivery stays pending and boot replays all current destinations, so a destination that succeeded can receive another copy (`index.ts:804-816`). There is no per-recipient receipt in that row, and no classifier-recovery queue. This source observation is not an injected crash/delivery test.

The patch in `handoff-comments.patch` contains comment-only TODOs at the four demonstrated source sites. It is **applied only to the disposable source snapshot**; the companion meta proposal must retain F-01 through F-04 as open items.

## Measured request components and break-even

`request-sizes.json` captures the actual `runDrone` definition/input for synthetic fixture `Hola, ¿a qué hora abren mañana?`, using the real `classifyMessage` builder and a mocked `runDrone` transport:

| Component | UTF-8 bytes |
|---|---:|
| Default Spanish system prompt | 782 |
| Output schema serialization | 483 |
| User prompt | 57 |
| Combined captured components JSON | 1,396 |
| Illustrative one-question Jev request JSON | 344 |

The illustrative request is not a qualified provider integration. Bytes are **not tokens, billed request sizes, latency, or dollar savings**. The drone/provider adds its own result-tool wrapper; model tokenizers and caching differ. No paid call was made. Current traffic, enabled policies, negative rate, model success, billed costs and provider pricing were not measured.

For admitted inputs after existing deterministic filters, the correct comparison is:

`E[gate cost] + P(forwarded) × E[baseline cost | forwarded] + incremental recovery cost < E[baseline cost]`.

This conditional expectation matters: long or complicated positives can cost more than short negatives. Under the deliberately simplified equal-cost-per-baseline-call assumption only, with `r = gate/baseline`, break-even is `forwarded fraction < 1-r`. Illustrative sensitivities: r=0.01 requires >1% calls avoided; r=0.10 requires >10%; r=0.25 requires >25%. These are algebraic scenarios, not measurements. A live shadow phase always runs baseline plus gate, so it incurs additional spend until a separately approved cut-over. True positives also incur gate latency before the existing classifier in a sequential design.

A correct experiment compares quality-adjusted cost per logical message, not per hook invocation. F-01 can make measured recall falsely look good by dropping hard cases before labeling; F-02 inflates baseline call volume and apparent savings; F-04 can corrupt price attribution. Fix or explicitly account for them first.

## Alternative candidates challenged

| Candidate | Actual contract / gate | Decision |
|---|---|---|
| Existing Hub context router | A real typed Jev call already exists, with tests; concerns include continuation state and downstream correctness | Stronger *first qualification* target than adding a new classifier. No need to prove new activation from scratch; runtime volume still needs observation |
| Gmail auto-label | Requires summary even for label `none`; all successfully classified mail is ledgered (`src/hooks/gmail-auto-label.ts:33-55,225-247`). Body slice bounded at 2,000 chars (`61-80`). Best-effort failures advance upstream history per contract | Confirm prior “not a drop-in replacement.” A Jev label pass cannot eliminate the required summary call without redesigning the product contract |
| Issue classifier drones | Labels/project decisions plus rationale (`src/drones/pipeline.ts:147+`); executable registry labels availability `probe_required` (`src/drones/registry.ts:25-37,78+`) | Partial substitution only; no evidence this is a high-volume active paid site |
| CRM relationship inference | Bounded evidence, free-text relationship label plus evidence chunk references (`Hub src/server/services/crm-relationship-inference.service.ts:200-235`). Existing no-evidence gate avoids model entirely (`615-624`), personal-org, API-key, dirty-candidate, deadline and claim gates (`660-684`) | Do not equate bounded category with full output. A preliminary unknown classifier adds a call and can suppress relationship evidence; benefits need observed unknown-rate/cost data |
| CRM finance/deposit classification | Deterministic rule/SQL logic in Hub `src/server/services/crm-deposit-rule.ts` and finance callers | Keep deterministic; introducing Jev adds probabilistic errors/cost |
| Channel/agent dispatch | Existing binding/identity routing is deterministic; `src/routing/resolve-route.ts` resolves authority/agent selection | Not a cheap-LLM replacement opportunity; semantic classification must not change authorization |
| Gateway complexity scorer + multi-model router | Definitions and unit tests exist, but `rg` finds no non-test caller to `scoreComplexity`, `resolveModelForTurn`, or `createMultiLLMRouter` at this SHA | Do not call this active routing infrastructure. Integrating it would be new behavior and its own task-outcome experiment |

No alternative can honestly be ranked “highest-volume” from this source inspection. The strongest recommendation is to qualify the existing router and correct logical-message accounting; preserve default-policy alert filtering as a narrower second experiment conditional on real usage.

## Minimal experiment and blast radius

1. Normalize a logical event identity `(channel, account, chat, message)` at both hook adapters and flow entry; test channel-only, agent-only, overlapping subscriptions, cross-account equal IDs, redelivery, concurrent completion and custom flow use. Define whether one alert is intended when channel+flow routes overlap.
2. Instrument prefilter admission and outcome counts against that identity, effective policy hash, source path, resolved model, prompt/schema hash, timing and provider usage. Record unknown paid outcomes separately. Snapshot activation/subscriptions without copying secrets into audit artifacts.
3. Build a labeled bilingual *default-rubric-only* holdout. Include urgent complaints, mixed-intent requests, spelling/negation, repeated text, very short messages and current deterministic exclusions. Label prefilter exclusions separately. Do not tune thresholds on holdout.
4. Shadow a single narrow match question at the shared classification boundary, forwarding everything to baseline. Bypass custom system/rubric/category policies until qualified separately. Preserve trigger-only input. Negative branch must stay side-effect-free and match the exact public envelope.
5. Promote only after severity-sensitive false-negative review, measured eligible traffic, full gate+forwarded/retry cost, fallback deadline and independent outcome review. Provider failure preserves baseline classification within the caller's total budget; it must not map to a fabricated negative.

This touches the gateway alert-watcher classifier, adapters, dedup and DroneHost telemetry; it does not require a new agent runtime, a change to Hub context manifests, or a change to Gmail/billing contracts. The generic matcher and multi-tenant receipt fixes require their own reviewed spec before product changes.

## Validation

The saved tests assert the *observed present behavior*, including defects; green does not mean the product is correct. Seven plugin-handler probes use real watcher code, dedup/cooldown/envelope and local SQLite with mocked classifier/delivery. One request-components probe uses real classifier construction. One host probe uses real DroneHost with mocked credentials/events.

Commands, run in the gateway snapshot:

```sh
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/revalidation.filter.test.ts extensions/alert-watcher/revalidation.measure.test.ts extensions/alert-watcher/src/dedup.test.ts extensions/alert-watcher/src/cooldown.test.ts extensions/alert-watcher/src/envelope.test.ts extensions/alert-watcher/src/classifier.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/revalidation.host.test.ts
```

Results: **41 passed assertions/tests across seven files** (32 existing tests, nine new probe tests). Saved output: `probe-results.txt`. An initial run including existing `extensions/alert-watcher/index.test.ts` failed at import: `"./compat" is not exported ... @earendil-works/pi-ai`; the other four selected suites passed 32 tests. This is an installed-dependency compatibility limitation, not a proven snapshot-lockfile regression. The new control-flow probes mock that unrelated host/transport boundary explicitly. No full build, live model call, runtime activation, deployed identity or performance measurement was claimed.
