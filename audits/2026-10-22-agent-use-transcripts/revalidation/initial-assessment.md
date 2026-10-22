# Applying the Jev and durable agent transcripts to Minion

The highest-value lesson is to spend reasoning and human attention only after cheaper checks establish that useful work exists. Minion already has much of the required infrastructure. Improve its qualification, recovery and feedback before introducing another agent runtime.

This is research and a draft experiment plan, dated 2026-10-22. It implements no product behavior and enables no provider calls. The supplied transcripts provide the ideas; official documentation and pinned Minion source establish the relevant contracts. Provider claims are not Minion benchmark results.

## Evidence boundary

The checked-out branches are old and contain unrelated work. The following GitHub branch tips were verified with `git ls-remote`, then inspected through existing Git objects without switching branches or changing any subproject:

| Repository | Branch | Source SHA |
|---|---|---|
| Hub | master | `c4ded7f7365098e29024eef3bbfae1ae6309e9ec` |
| Gateway | DEV | `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18` |
| Factory | dev | `43a174b2e87c4d572ffd2ba030269db22a0b7bd2` |

[evidence.json](../evidence.json) maps 13 exact source snapshots to hashes and immutable GitHub URLs. These prove source behavior, not deployed identity or runtime quality. Older audit latency, traffic and pilot figures are not reused as current measurements.

## What is already present

- Hub batches one mode Choice and independent per-manifest Nouls in one Jev request. Its gate includes manifests selected by thresholds and by the winning mode. Null decisions, `off` and `shadow` send the full context. The changelog threshold is already 0.45. See [turn-router.ts](../source/minion_hub/src/lib/assistant/turn-router.ts), lines 77–160 and 214–235. Recommending the October 15 mode-fallback fix again would duplicate completed source work.
- Factory already has Jev shadow scoring, a runner client, and conditional guard-hook wiring. See [rank.sh](../source/minion_factory/agent/rank.sh), lines 25–95; [jev.ts](../source/minion_factory/runner/src/jev.ts); and [jev.sh](../source/minion_factory/agent/lib/jev.sh). Source wiring does not establish current production flags or classifier quality.
- Gateway already persists cron jobs and handles restart scheduling. See [store.ts](../source/minion/src/platform/cron/store.ts), lines 22–60, and [timer.ts](../source/minion/src/platform/cron/service/timer.ts). Heartbeat preflight already skips disabled, quiet-hour, busy and empty-work cases in [heartbeat-runner.ts](../source/minion/src/infra/heartbeat-runner.ts). A second scheduler would overlap existing capabilities.
- The local CRM Jev foundation is WIP. The current Hub router service explicitly records that `crm-jev.ts` never shipped to master. A previous shadow deployment and its expired review window require a separate operational review; neither proves an active CRM tagging integration today.

## Ranked opportunities

### 1. Qualify the existing context router against completed tasks

Video 1, 05:57: use a cheap decision before expensive reasoning. Minion already applies this to context selection. The next improvement is to measure whether the selected context lets the assistant finish the task correctly.

Use a frozen bilingual set containing direct questions, mixed intents, UI-choice replies, and short continuations such as “sí”, “12” and “viernes 3pm”. Include page changes, permission changes and org/thread switches. Compare the full-context baseline with routed context using the same model and authorized tools. Score correct answers/actions, required-context recall, input tokens, cached tokens, p95 response time and total cost per successful task.

The router's state builder currently receives text, locale and page, without prior task state: [assistant-router.service.ts](../source/minion_hub/src/server/services/assistant-router.service.ts), lines 57–66. Prototype a compact, server-validated task continuation record rather than classifying an ambiguous reply in isolation. Reuse prior needs only within the same actor/org/agent/session and valid task revision. Reclassification remains necessary when the task changes. The full-context fallback must still obey permissions.

Keep independent Nouls for overlapping needs. A forced single Choice cannot represent “find Ana AND book an appointment”. Keep context availability separate from permission to execute a write: loading the forms manifest grants no authority.

Success criterion: the candidate preserves baseline task correctness on the frozen regression set and lowers measured cost per successful task. Token reduction alone is insufficient. Calibrate on development cases and report results on a separate holdout.

The same corpus can later qualify model routing. Compare the existing model with cheaper candidates per task family, including tool availability, language and recovery behavior. Keep a selected model stable within an accepted run unless an explicit escalation policy applies. A short request can still be consequential; prompt length or apparent simplicity is not a sufficient routing rule. If deterministic code can answer a bounded request directly, include that as a baseline before adding another model decision.

### 2. Pilot a complaint filter before summary generation

Video 2, 03:26–04:04 and 09:54–10:30: filter before waking an expensive model.

The best bounded candidate found is [alert-watcher's classifier](../source/minion/extensions/alert-watcher/src/classifier.ts), lines 9–29. It produces `is_complaint`, severity, category and a summary, but requires an empty summary for non-complaints. A cheap complaint decision can potentially skip the generative call on clear negatives. Positives and uncertain cases retain the existing drone, which produces the required summary.

Start in shadow. Label complaints, non-complaints, urgent messages, negation, typos, mixed language and adversarial message text. Preserve the existing trigger-only context boundary: this classifier deliberately excludes prior messages because of context bleed. Measure missed complaints by severity and the observed share of calls avoided. On classifier failure, preserve the current classification path within its existing spend/deadline limits.

Economics per message: `gate cost + fraction forwarded × existing drone cost`. This must beat the baseline after including retries, errors and quality loss. A filter that forwards nearly everything adds cost and latency.

Gmail is a weaker first candidate: [gmail-auto-label.ts](../source/minion/src/hooks/gmail-auto-label.ts), lines 33–55, requires a summary even when the chosen label is `none`. Jev can choose a label, but removing its generation step would break the output contract. Likewise, the issue classifier requires a rationale, Factory rank requires rationale/evidence/readiness/recommendation fields, and the outcome judge requires customer-visible reasoning and criterion evidence. These are partial substitutions, not drop-in replacements.

### 3. Use cheap evaluation to direct investigation

Video 1, 07:00–08:22: batch narrow questions over a completed trace. Useful Minion questions include whether the requested answer appears, whether a number is supported by tool output, whether an error was disclosed, and whether an informational request caused an unsolicited action.

Run deterministic checks first: tool receipt status, allowed calls, actual database results, cancellation and source IDs. Apply typed semantic questions asynchronously. Send suspicious or uncertain traces to a stronger reviewer, plus a random sample of apparently good traces to detect failures the filter misses. Keep each rubric outcome separate; an average score can hide a serious failure.

Success criterion: higher confirmed-failure yield at the same review budget, with missed-failure estimates from the random sample. Do not interpret agreement with another model as ground truth. Do not let this classifier decide billing: [outcome-detector.ts](../source/minion/src/outcome-billing/outcome-detector.ts), lines 30–43 and 87–118, requires evidence and reasoning the decision model does not generate.

LangChain reports strong results on one agent and explicitly limits that conclusion. A separate primary engineering study found useful screening but insufficient reliability as a replacement judge. Those results support a Minion experiment, not automatic promotion to authority. [LangChain evaluation report](https://www.langchain.com/blog/jev-is-now-available-in-langsmith-evals), [three.dev study](https://three.dev/blog/jev-vs-the-llm-as-a-judge).

### 4. Make proactive tasks produce durable reviewable artifacts

Video 2, 02:42–03:26 and 07:02–08:52: the agent runs behind an API; browser, terminal and cron are clients. This fits Minion's gateway/client split. Reuse that split and the existing scheduler before evaluating a runtime replacement.

A useful pilot is a read-only engineering digest: changed dependencies or official model releases matched against Minion's actual stack, grouped by actionable impact, with source links and a suggested next step. This is narrower than a generic news feed. Prefer source change events, hashes and conditional fetches before model work. After a successful artifact commit, advance the source cursor; if nothing relevant changed, exit without waking the main agent.

Qualify phase checkpoints for collect → filter → dedupe → research → publish-artifact. Bind work to its owner/org/task, claim it with a lease and fence stale workers. Persist receipts and reconcile unknown effects. Test crashes after collection, after a paid call, after artifact commit and before acknowledgement. Test duplicate triggers, lost leases, revoked access, unavailable providers and catch-up after downtime.

SQLite persistence alone does not guarantee exactly-once effects or prevent double payment. A provider can finish a paid request whose response is lost before the local checkpoint. Mark that as an unknown outcome and reconcile when possible; never claim checkpointing removes the ambiguity.

Success criterion: closing every client does not stop accepted work; reconnecting shows authoritative state; injected restarts and duplicate triggers produce one visible artifact per logical task. Publish through a recipient-scoped delivery record, and keep consequential actions behind the existing human gates.

### 5. Turn feedback into versioned policy and evaluation data

Video 2, 12:29–15:46: user feedback changes topic/source weights. Extend the idea beyond thumbs: “useful”, “incorrect”, “duplicate”, “wrong timing” and “already handled” describe different problems.

Persist the artifact ID/revision, actor, task, sources, policy/rubric version and feedback reason. User relevance preferences can affect ranking; they must not change factual evidence or permissions. Bound weight adjustments, keep a baseline and exploration sample, and provide rollback. Natural-language preference edits should produce validated configuration revisions rather than arbitrary file edits.

Success criterion: held-out accepted-artifact rate improves without a rise in confirmed factual errors or repeated interruptions. No click is not a negative label. Once feedback cases tune a prompt or threshold, they become development data rather than independent test evidence.

## Useful corrections to the transcripts

- **Typed does not mean correct.** Jev's Choice/Score confidence describes the shape of its answer distribution. It is not the measured probability of correctness on Minion traffic. Noul returns a yes-probability without that separate confidence field. Use task labels and error costs to choose thresholds. [TypeSafe confidence](https://docs.typesafe.ai/confidence).
- **Multiple independent questions are useful; dependent reasoning still needs stages.** Batch urgency, category and relevance over shared state. Research findings do not exist at the earlier gate, so factual support must be evaluated later with evidence. [TypeSafe primitives](https://docs.typesafe.ai/primitives).
- **“Fact” and “signal” are separate axes.** Store source support, novelty, relevance and actionability independently. A classifier cannot verify a claim merely because several sites repeat it. Fetch primary evidence and preserve provenance. Hype/fact/signal scores need not sum to 100; the example repository uses separate scores. [Author's repository](https://github.com/disler/pi-durable-news-agent).
- **Guard classification supplements enforcement.** RBAC, scoped credentials, typed arguments and sandbox boundaries remain deterministic. A favorable classifier score cannot grant access, approve a production write or validate another actor's consent. On guard failure, retain the existing deterministic policy and required approval path.
- **Pin calibrated versions.** TypeSafe currently lists `jev-latest` → `jev-1.13.0` and `jev-preview` → `jev-1.14.0`; provider routing must be checked separately. Log requested/resolved model, rubric hash, input identity, latency, known/unknown cost and fallback reason. The vendor lists $0.042/M input tokens, free output and default 64K request/32K per-question context. These are published terms, not measured Minion savings. [TypeSafe models](https://docs.typesafe.ai/models).
- **Autonomy is task-specific.** Automatically collecting and drafting can be useful while sending, merging or billing still requires approval. Measure accepted outcomes, human review minutes and correction cost. The transcript's “80% or more” claim supplies no transferable Minion baseline.

## Recommended order and existing owners

1. Establish the frozen task/evaluation corpus and qualify existing router behavior under `2026-10-17-agent-experience-lifecycle` and `2026-10-12-hub-assistant-jev-context-router`.
2. Pilot the alert-watcher filter in shadow; use its negative rate and false-negative costs to decide whether it merits cut-over.
3. Review existing Factory/CRM shadow evidence before adding more decision sites. Reconcile with `2026-09-29-factory-jev-decision-layer` and `2026-09-21-hub-jev-shadow-week-review`. Expiry and live flags remain operational unknowns in this research.
4. Add asynchronous semantic screening and reasoned feedback.
5. Qualify one proactive digest with crash/replay tests. Integrate existing durable-job work where available; decide on an additional runtime only after a demonstrated missing capability.

The companion [draft proposal](../../../proposals/2026-10-22-agent-decision-and-proactivity-experiments.md) tracks these experiments. No spec, implementation, merge, deployment or production benchmark was performed. Existing proposal owners remain the source of repair work; this research does not reopen already-fixed audit findings.

The canonical proposal generator and its `--check` pass in an isolated single-proposal corpus. [proposal-index.scoped.json](../proposal-index.scoped.json) retains that projection; integrating the proposal requires normal index regeneration. The shared index and unrelated work were preserved. [validation.txt](../validation.txt) records artifact checks, and [SHA256SUMS](../SHA256SUMS) covers the retained evidence.
