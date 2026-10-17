---
id: 2026-10-12-hub-assistant-jev-context-router
title: Hub assistant — JEV turn router, open ends and threshold calibration
status: draft
created: 2026-10-12
updated: 2026-10-16
repos: [minion_hub]
tags: [logic, security]
value: 8
effort: M
parent: 2026-10-12-gateway-pi-1.1-upgrade-and-jev-turn-router
---

# Hub assistant — JEV turn router (Slice 2 ledger + open ends)

Parent spec: `specs/2026-10-12-gateway-pi-1.1-upgrade-and-jev-turn-router-spec.md`,
section "Slice 2 — hub JEV turn router". This file is the Slice 2 implementation
ledger and its open-items list; the design lives in the spec.

## Owner ask (verbatim, 2026-10-12)

> "Also, I implemented a JEV pre-tool-use hook in ~. Check it out because I want a
> similar feature for the minion hub agent."

> "its main goal is to optimize that 4k token per turn"

## AS-IS (measured 2026-10-12, hub master `f6b33d13`)

`buildAssistantContext()` built ONE envelope and prepended it to every assistant
turn, regardless of what the turn was:

| Section | Chars | Source |
|---|---|---|
| UI-tool protocol + 4 tool schemas + intent rules | 4,530 | `uiToolsBriefing` core |
| Page list (110 visible pages) | 7,516 | `visiblePages(canViewPath)` |
| Form catalog (8 forms) | 2,156 | `FORM_CATALOG` |
| **Briefing total** | **14,202** | `uiToolsBriefing(...)` |
| Fixed prose (route, focus, org, links, data tools, brain, closing) | 1,893 | `buildAssistantContext` |
| **Envelope total** | **≈16,096 chars ≈ 4,000 tokens** | every turn, including "thanks!" |

Numbers are printed by `src/lib/assistant/briefing.test.ts` and
`src/lib/state/features/assistant-context.test.ts`, not estimated.

Two observed consequences:

1. A one-word turn cost ~25K prompt tokens on production (envelope + history).
2. "Summarize the latest changelog" made the agent run six web searches about the
   upstream OpenClaw project: nothing in the envelope told it the hub has its own
   release notes, so it treated "the changelog" as an open-web question.

## TO-BE

Every user-typed turn is classified first by a typed JEV decision (Typesafe
`~typesafe/jev-latest` over OpenRouter's decisions endpoint), and the envelope
carries only the manifests that turn needs. Invariants:

- The core is never gated: where the user is, what is focused, the active org id,
  the in-app link convention, the UI-tool protocol and intent rules, the closing
  line. The envelope still opens with `[In-app assistant context` and closes with
  `Don't restate this context.]` (`chat-rpc.stripAssistantContext` depends on both).
- A null decision — missing key, timeout, non-200, malformed body, `off`/`shadow`
  mode — always yields today's full envelope. Fail open, never fail closed.
- The user's typed text is never altered, and never leaves the hub except as the
  classifier's `state` (not persisted, not logged).
- The route call never delays a send by more than 1.5 s.

## DELTA

| Transition | Where | Proof |
|---|---|---|
| New shared manifest table (ids, mode, question, threshold, inject) | `src/lib/assistant/turn-router.ts` | `turn-router.test.ts` |
| Pure gate: decision + router mode → loaded manifest ids | same | `turn-router.test.ts` (11 cases incl. both spec verification cases) |
| New classifier service, one request, both stages | `src/server/services/assistant-router.service.ts` | `assistant-router.service.test.ts` (15 cases, fetch faked) |
| New `POST /api/assistant/route`, `requireAuth`, always HTTP 200 | `src/routes/api/assistant/route/+server.ts` | service tests + manual live probe |
| `buildAssistantContext(loaded?)` renders only loaded sections | `src/lib/state/features/assistant-context.ts` | `assistant-context.test.ts` |
| `uiToolsBriefing` drops the pages/forms HEADERS with their arrays | `src/lib/assistant/briefing.ts` | `briefing.test.ts` |
| Both user-typed callsites route first, fail open | `FloatingAssistant.svelte`, `(app)/home/+page.svelte` | n/a (wiring) |
| `assistant_route` PostHog event + field validators | `src/lib/server/observability-context.ts` | existing allowlist tests |

### Measured result (chars, full-permission org owner)

Each row is the envelope for the manifest set the LIVE classifier actually
returned for that turn on 2026-10-12. Printed by the
"reports the end-to-end envelope size per routed mode" test.

| Turn | Loaded | Envelope | vs before |
|---|---|---|---|
| before (every turn) | all 5 | 16,096 | — |
| `chat` — "thanks!" | — | 5,048 | **−69%** |
| `knowledge_question` — "summarize the latest changelog" | brain, changelog | 5,828 | −64% |
| `data_question` — "¿cuántas facturas pagó Ana este mes?" | data, brain | 6,068 | −62% |
| `record_action` — "registra una venta de S/50 para Maria" | forms | 7,204 | −55% |
| `navigate` — "llévame a inventario" | pages | 12,564 | −22% |

A `navigate` turn keeping ~78% of the envelope is the spec invariant working as
intended: that turn is exactly the one that needs the 110-page list.

Classifier latency measured live over 12 probes: **499–995 ms** (p50 ≈ 600 ms),
cost ≈ **$0.000022 per turn** (~525 input tokens).

## Open ends

1. **`TODO(handoff)` — threshold calibration from the decision log.**
   `src/lib/assistant/turn-router.ts`: all five thresholds are hardcoded and were
   set from 12 live probes on 2026-10-12, not from a distribution. The
   `assistant_route` PostHog event carries `p_pages`/`p_forms`/`p_data`/`p_brain`/
   `p_changelog` plus the chosen mode precisely so they can be re-derived from real
   traffic. Re-check after ~200 real turns. The `brain` noul is the weakest signal
   (0.37–0.88 with poor separation) and most likely to need moving.
   (Merged from postmerge-minion-hub-441331fd7343, 2026-10-13: alternatives
   considered — document the probe methodology in a linked artifact/comment;
   move thresholds to versioned config with "last validated" + confidence
   bounds; or have the classifier return confidence scores so tuning is
   data-driven at runtime.)
2. **`pages` threshold deviates from the spec (0.35, not 0.5).** The spec proposed
   0.5; a live "¿dónde configuro los horarios?" turn scores 0.41, and
   `UI_TOOL_RULES` (1) requires a "where/how do I…" question to navigate — 0.5
   silently broke the exact case that rule exists for. 0.35 separates the measured
   navigation turns (0.41–0.70) from the rest (0.06–0.26). Needs confirming against
   real traffic, same as (1).
3. **`hub_changelog` inject is prose only — the release notes are NOT inlined.**
   The brief allowed fetching the latest release text server-side and embedding it
   (capped ~2K chars). Not done: it adds a `getCoreDb()` query to EVERY assistant
   turn, and production Postgres is currently CPU-throttled (see memory
   `hub-jobs-tick-cron-incident-2026-10-11`). The prose inject already stops the
   wrong behaviour (web-searching other projects) and points the agent at
   `/changelog`. Inline the notes only together with a cache, or give the gateway
   agent a `hub_releases` tool instead — the better fix, since the agent then reads
   the notes only when it actually needs them.
4. **Artifact-callback and `ui.choice` turns are deliberately NOT routed.**
   `FloatingAssistant.svelte` lines ~963/~967 still send the full envelope. A
   `ui.choice` reply is the literal string "Show me how" / "Do it for me", which a
   classifier reads as `chat` — stripping exactly the page list and form catalog
   the agent needs to act on that choice. Routing them needs the PRIOR turn's
   decision carried forward, not a fresh classification of the button label.
5. **No `other`/escape option in the mode choice.** The spec's five modes are
   exhaustive-by-construction, so an off-topic turn is forced into the nearest one.
   Harmless today (the gate reads the nouls, so a mis-labelled mode only mislabels
   a log line) but it makes mode statistics less trustworthy for (1).
6. **`shadow` mode is implemented but never exercised in CI.** `routerMode()` is
   read from `PUBLIC_ASSISTANT_ROUTER`; `gateManifests` is unit-tested for
   `shadow`, but no test boots the app with the env var set.
7. **No test asserts the 1.5 s client budget end to end.** `requestRouteDecision`
   uses `AbortSignal.timeout(1500)` and the service its own 1,500 ms signal; both
   are asserted only through the "a thrown fetch yields null" path.
8. **The user-bubble latency.** `send()` clears the composer immediately but awaits
   the classifier (~600 ms p50) before `sendAssistantTurn` pushes the user bubble,
   so the bubble appears ~0.6 s after Enter. Acceptable per the brief, but if it
   reads as lag the fix is to push the bubble through the existing path first and
   send the gateway request after the decision resolves.
9. **Guard timeout leaves the in-flight indicator up (pre-existing, surfaced by
   spec 016).** `chat-rpc.ts:293-298` flips `sending` off after 120 s and reloads
   history but never nulls `chat.stream`/`runId`, so a run that produced no final
   event keeps whatever the floating assistant shows for "in flight" — before
   spec 016 either nothing (`stream === ''`) or a partial dashed bubble, after it
   the "Thinking…" row — until the next send or New chat. Fix belongs with the
   lost-reply root cause (`chat.guard_timeout` crumb): null the stream on the
   guard AND decide whether late deltas of that run may still stream.
   (`specs/016-assistant-empty-turn-bubble/spec.md`, 2026-10-16)
