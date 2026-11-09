# B — Hub assistant JEV turn router audit

- Date: 2026-10-15
- Code: clean checkout `/home/nikolas/.cache/claude-tmp/hub-audit` at `4fe89934` (origin/master)
- Read-only. 46 live classifier probes (~$0.001 total), 46 unit tests, 1 PostHog read. No repo edits.

## Verdict

**JEV classifies the *kind* of turn well; the gate throws that classification away, and
that is where the agent starves.** The mode choice was right on 44/46 probes. The five
`noul` scores that actually drive the gate are only usable for two of the five manifests
(`data`, `forms`). `brain` is unusable as a signal (fires on 24/46 turns, needed on ~4,
and no threshold separates true from false). `pages` leaks both ways. `changelog` — the
one manifest that exists to fix a named production bug — measured **0.61 today against a
0.6 threshold**, i.e. one bad roll from regressing.

Measured outcome over 46 representative turns: **27 OK, 13 STARVED, 6 of the OK rows
carry a wasted manifest.** Every starvation falls in one of four buckets:

1. **The winning mode's own manifest scored below its threshold → the turn gets nothing
   but core.** 4/46 probes *and* 2 of the 5 real production turns logged so far
   (`knowledge_question` with `p_brain` 0.39 and 0.18 → core-only). This is the headline
   defect and it is a 3-line fix (D2).
2. **`/home` routes `ui.choice` / artifact replies** — the exact bypass `FloatingAssistant`
   implements on purpose. Measured: "Do it for me" → `brain` only, no forms, no pages (D1).
3. **Follow-up turns** ("sí", "viernes 3pm", "12") → core-only, because the classifier is
   given the current text and nothing else (D7).
4. **Actions with no catalog form** (void a ticket, comment on a support ticket, close a
   shift) → `data` only or core-only. The eight `FORM_CATALOG` forms are well served; the
   gateway-only write tools are described in exactly one gated sentence (D6).

Fail-open is correct and solid: `off` mode, `shadow` mode, missing key, non-200,
oversized body, malformed JSON, no manifest answers, timeout, and the client fetch all
resolve to `null` → full envelope. I could not find a path that fails closed. The
`[In-app assistant context` / `Don't restate this context.]` strip contract holds — both
markers are core and ungateable. The 1.5 s budget is comfortable: 46/46 probes returned,
**200–501 ms** (p50 ≈ 225 ms), well under the spec's own 499–995 ms measurement.

## Gating rules, in plain language

1. `requestRouteDecision(text, locale)` — if `PUBLIC_ASSISTANT_ROUTER=off`, stop and
   return `null`. Otherwise POST `{text, locale}` to `/api/assistant/route` with a
   **1500 ms** abort. Any non-ok status, any throw, any body that is not
   `{decision: {...}}` → `null`.
2. The endpoint (`requireAuth` only, **always HTTP 200**) calls the classifier with
   `OPENROUTER_API_KEY`, then logs an `assistant_route` PostHog event carrying the mode
   and all five probabilities — never the user's text.
3. The classifier sends **one** request to `openrouter.ai/api/alpha/decisions`, model
   `~typesafe/jev-latest`, `state` = `ui_locale: <locale>\n\nREQUEST:\n<text, 2000 chars>`,
   and six typed questions: one `choice` over the 5 modes, one `noul` per manifest.
   Own 1500 ms abort. Returns `null` if the body is >32 KB, has no `answers`, has no
   usable mode, or answered **zero** manifest questions.
4. `gateManifests(decision, mode)`:
   - `decision === null` **or** router mode is not `enforce` (`off` / `shadow`) → **all
     five manifests** = today's full envelope.
   - otherwise: load manifest *m* iff `decision.manifests[m]` is a number `>= threshold`.
     Thresholds: `pages 0.35`, `forms 0.6`, `data 0.5`, `brain 0.5`, `changelog 0.6`.
   - **`decision.mode` is not read at all.** A turn whose five nouls are all below
     threshold gets core only, whatever the mode says.
5. `buildAssistantContext(loaded)` renders the core (page + focus + `active_org_id` +
   link convention + UI-tool protocol + `UI_TOOL_RULES` + closing line) plus the loaded
   sections. `pages` → `visiblePages(canViewPath)`; `forms` → `FORM_CATALOG` filtered by
   `canViewPath`; `data`/`brain` → prose; `changelog` → static prose only (no release
   notes inlined). The pages/forms **headers** go with their arrays, so an empty list
   never reads as "there are none".

End to end: typed text → `send()` clears the composer, sets `routing`, awaits the
decision → `gateManifests` → `buildAssistantContext(loaded)` → `sendAssistantTurn(id,
text, envelope, sessionKey)` → gateway `chat.send` with `envelope + text`; the transcript
strips the envelope back off with `stripAssistantContext`.

## Probe results (live, 2026-10-15)

`needed` is my judgement of what the agent must have to act correctly; `loaded` is what
`gateManifests` actually returned from the live decision. `ov` = loaded but not needed.

| id | loc | request | needed | mode | loaded | verdict |
|---|---|---|---|---|---|---|
| nav-en | en | take me to inventory | pages | navigate | pages | OK |
| nav-es | es | llévame a inventario | pages | navigate | pages | OK |
| nav-where-es | es | ¿dónde configuro los horarios? | pages | knowledge_question | pages+brain | OK (ov brain) |
| nav-how-en | en | how do I add a new customer? | pages,forms | record_action | forms | OK* |
| nav-typo | es | donde veo los compobantes emitdos | pages | navigate | pages+brain | OK (ov brain) |
| nav-module-missing | es | ¿dónde está la planilla de sueldos? | pages | navigate | pages+data+brain | OK (see D5) |
| nav-list | en | show me open support tickets | pages,data | navigate | data+brain | **STARVED** (pages .25) |
| nav-settings | es | abrir configuración de roles | pages | navigate | — | **STARVED** (all nouls low) |
| nav-report | en | open the sales history page | pages | navigate | pages | OK |
| nav-cal | es | muéstrame la agenda de mañana | pages,data | navigate | — | **STARVED** (pages .20 data .41) |
| rec-sale | es | registra una venta de S/50 para Maria | forms | record_action | forms | OK |
| rec-stock | en | add 4 boxes of gauze at 1200 to the warehouse | forms | record_action | forms+data | OK |
| rec-booking | es | agenda a Ana el viernes a las 3pm | forms,data | record_action | forms+data | OK |
| rec-customer | en | create a customer called Pedro Quispe, DNI 70123456 | forms | record_action | forms | OK |
| rec-invoice | es | emite una boleta por 120 soles a Juan | forms | record_action | forms+data | OK |
| rec-goal-novalues | es | necesito registrar una compra | forms | record_action | forms | OK |
| rec-goal-en | en | I need to add stock | forms | record_action | forms+data | OK |
| rec-ticket-comment | es | comenta en el ticket 42 que ya lo llamamos | forms,pages,data | record_action | — | **STARVED** (worst row) |
| rec-edit | en | change Ana's phone number to 999888777 | forms,data | record_action | forms+data | OK |
| rec-destructive | es | anula el comprobante POS-00007 | pages,data | record_action | data | **STARVED** (no UI path) |
| rec-destructive-2 | en | delete the customer Pedro Quispe | pages,data | record_action | data | **STARVED** |
| data-invoiced | en | how much did we invoice last month? | data | data_question | data+brain | OK (ov brain) |
| data-ana | es | ¿cuántas facturas pagó Ana este mes? | data | data_question | data+brain | OK (ov brain) |
| data-count | es | ¿cuántos clientes nuevos tuvimos en setiembre? | data | data_question | data+brain | OK (ov brain) |
| data-stock | en | which items are below their minimum stock? | data | data_question | data | OK |
| data-who | es | ¿quién atendió más citas la semana pasada? | data | data_question | data+brain | OK (ov brain) |
| data-pct | en | what percentage of tickets were resolved within SLA? | data | data_question | data+brain | OK (ov brain) |
| know-changelog | en | summarize the latest changelog | changelog | knowledge_question | data+brain+changelog | OK, **fragile** (.61 vs .60) |
| know-whatsnew | es | ¿qué hay de nuevo en el dashboard? | changelog | knowledge_question | brain+changelog | OK |
| know-history | es | ¿qué me dijo Ana sobre el precio la última vez? | brain | knowledge_question | brain | OK |
| know-themes | en | what do customers complain about most? | brain,data | data_question | pages+data+brain | OK (**ov pages = 9.6 KB**) |
| know-howtouse | es | ¿cómo funciona el cierre de caja? | pages,brain | knowledge_question | brain | **STARVED** (rule 1 wants nav) |
| chat-thanks | en | thanks! | — | chat | — | OK |
| chat-hi | es | hola | — | chat | — | OK |
| chat-ok | es | ok perfecto | — | chat | — | OK |
| btn-doitforme | en | Do it for me | forms,pages | chat | brain | **STARVED on /home** (D1) |
| btn-hazlo | es | Hazlo por mí | forms,pages | chat | brain | **STARVED on /home** |
| btn-showmehow | en | Show me how | forms,pages | knowledge_question | brain | **STARVED on /home** |
| fu-yes | es | sí | forms,pages | chat | — | **STARVED** (D7) |
| fu-second | en | the second one | forms,pages | navigate | pages+brain | OK by accident (pages .61) |
| fu-value | es | viernes 3pm | forms | record_action | — | **STARVED** (D7) |
| fu-qty | en | 12 | forms | chat | — | **STARVED** (D7) |
| multi-intent | en | find Ana and book her for Friday | data,pages,forms | record_action | forms+data+brain | OK* |
| multi-intent-es | es | busca a Maria y regístrale una venta de 80 soles | data,pages,forms | record_action | forms+data+brain | OK* |
| mixed-both | es | ¿cuánto vendimos ayer y dónde veo el detalle? | pages,data | data_question | pages+data+brain | OK (ov brain) |

`OK*` = `pages` was withheld but the turn survives because `describeForm`
(`forms.ts:133`) prints `at <route><?open-params>` for each of the eight catalog forms, so
a form-backed action still has its path. That mitigation does **not** extend to any
non-catalog action — see D6.

Signal quality measured over these 46 turns:

| noul | true turns | false turns | threshold | separates? |
|---|---|---|---|---|
| `data` | 0.46–0.93 | 0.03–0.42 | 0.50 | yes, clean |
| `forms` | 0.51–0.88 | 0.02–0.29 | 0.60 | yes, but 0.51 (ticket comment) is lost |
| `changelog` | 0.61–0.78 | 0.01–0.07 | 0.60 | yes, but threshold sits **0.01** under the lowest true |
| `pages` | 0.20–0.72 | 0.09–0.61 | 0.35 | **no** — overlapping |
| `brain` | 0.57–0.92 | 0.08–0.85 | 0.50 | **no** — unusable |

Multi-intent is handled correctly, and this is the design's best decision: independent
nouls express "forms AND data" where a softmax could not (`multi-intent`: forms .71 +
data .82). Spanish is not disadvantaged — ES and EN rows score alike (`llévame a
inventario` .72 vs `take me to inventory` .69), and typos survive (`compobantes emitdos`
→ pages .53). Imperative vs question phrasing *is* biased, but toward `brain`, not away
from the right manifest.

## Live-traffic reality (PostHog)

`assistant_route` has **5 events total** since 2026-10-13 (first 10-13 05:51Z, last 10-15
20:24Z), 0 nulls, 222–336 ms. Two of those five are `knowledge_question` with `p_brain`
0.39 and 0.18 → **core-only**, i.e. the D2 failure mode is already the majority of real
knowledge turns in production. At 5 turns / 3 days, open end 1's "re-derive after ~200
real turns" is roughly four months out; a repeatable offline probe set (the 46 above) is
the only practical calibration instrument today.

## Tests

`bun run vitest run src/lib/assistant/turn-router.test.ts
src/server/services/assistant-router.service.test.ts
src/lib/state/features/assistant-context.test.ts src/lib/assistant/briefing.test.ts`
→ **4 files, 46 tests, all passing** (688 ms). A fresh checkout needs
`bunx svelte-kit sync && bun run i18n:compile` first or the two envelope-size suites fail
on `$lib/paraglide/runtime`.

## Defects

**D1 — `/home` routes `ui.choice` and artifact replies, starving exactly the turn that
needs forms+pages.** `src/routes/(app)/home/+page.svelte:1039-1040` and `:1142-1143` send
those callbacks through `handleSubmit(text,'ask')` (`:640-666`), which routes. Measured:
"Do it for me" → `brain` only; "Show me how" → `brain` only. `FloatingAssistant.svelte:992/996`
deliberately bypasses the router for the same two callbacks.
*Fix: call `sendAssistantTurn(..., buildAssistantContext(), ...)` from those four props,
or give `handleSubmit` a `routed = true` parameter that the callbacks pass as `false`.*

**D2 — the gate discards `decision.mode`, so a turn can be classified correctly and still
get nothing.** `src/lib/assistant/turn-router.ts:163-174`. 4/46 probes and 2/5 production
turns. `CONTEXT_MANIFESTS` already carries the `mode → manifest` mapping for this.
*Fix: after the threshold loop, `for (const m of CONTEXT_MANIFESTS) if (m.mode === decision.mode) loaded.add(m.id)`
— the winning mode always earns its own manifest.*

**D3 — `brain` is not a usable signal; moving the number cannot fix it.**
`turn-router.ts:106-115`. True 0.57–0.92, false 0.08–0.85; loaded on 24/46 turns, needed
on ~4. The question ("the organization's own knowledge, history or past conversations")
is true of almost any business question. Cost ≈ 700 chars per false positive.
*Fix: reword to name the mechanism — "…require semantic search over past chat messages and
documents, as opposed to a direct database lookup?" — then re-probe; do not just raise 0.5.*

**D4 — `changelog` threshold is one bad roll from regressing the bug it was built for.**
`turn-router.ts:117-135`: threshold 0.6, comment cites 0.94 measured on 2026-10-12; the
same prompt measured **0.61** today. Below it, "summarize the latest changelog" loses the
prose that stops the agent web-searching OpenClaw.
*Fix: drop to 0.45 — the next-highest false score across 46 turns is 0.07.*

**D5 — the anti-hallucination rule survives but its evidence is gated.**
`briefing.ts:20` rule (5) tells the agent to trust "anything only listed after
'NO MODULE HERE for'", and `site-map.ts:224` renders those markers **only inside the page
list**. When `pages` is withheld, the rule cites a list that is not in context. The
recovery tool makes it worse: `global-tools.ts:76-94` `hub.pages` returns weak (`~`)
matches as ordinary hits with no marker, so "planilla" returns `/team` as if payroll
lived there.
*Fix: have `hub.pages` split `~` keywords the way `describePages` does and set a
`moduleMissing` flag on weak-only hits.*

**D6 — gateway-only write actions get no manifest at all.** The eight `FORM_CATALOG`
forms carry their own routes (`forms.ts:133`), but actions with no catalog form — comment
on a support ticket, void/refund a POS ticket, close a shift, complete a visit — are
described only in the gated `data` prose (`assistant-context.ts:112-121`). Measured:
`comenta en el ticket 42…` → core-only; both destructive turns → `data` only, so no page
list and no form catalog for a destructive flow.
*Fix: gate the data-tools paragraph on `data || forms` (a `record_action` turn always
needs to know which write tools exist), or move the one-line tool inventory into core.*

**D7 — the classifier sees one turn with no history, so mid-task follow-ups lose
everything.** `assistant-router.service.ts:45-47` builds `state` from the current text
only. Measured: "sí" / "viernes 3pm" / "12" → core-only, mid-form-fill.
*Fix: carry the prior turn's mode (not its text) into `state`, or reuse the prior decision
when the new text has no verb / is under ~4 tokens.*

**D8 — `/api/assistant/route` has no rate limit.** `src/routes/api/assistant/route/+server.ts:25-39`,
`requireAuth` only, no throttle anywhere in `hooks.server.ts`. An authenticated user can
loop it and burn OpenRouter credit at ~$0.000022/call. Low severity, worth one line.
*Fix: reuse whatever per-IP/per-user throttle the other POST routes use, or cap per session.*

**D9 — the two 1500 ms budgets are nested, so the server can never use its own.**
`turn-router.ts:148,192` abort the hub round trip at 1500 ms; `assistant-router.service.ts:28`
aborts the OpenRouter call at 1500 ms. Measured 200–501 ms so there is no live impact.
*Fix: server 1200 ms, or state the nesting in the comment.*

**D10 — the calibration plan has no data source.** 5 production events in 3 days (above).
*Fix: commit the 46-case probe as an opt-in live test (the pattern `prompt-contract.live.test.ts`
already uses) and calibrate from it; keep the PostHog event for drift, not for derivation.*

## Known open ends — current status

| # | Open end | Status 2026-10-15 |
|---|---|---|
| 1 | Thresholds set from 12 probes, not a distribution | **STILL OPEN, and unexecutable as written** — only 5 real turns logged in 3 days (D10). The `brain` worry was right and is worse than "needs moving" (D3). |
| 2 | `pages` threshold 0.35 vs spec's 0.5 | **STILL OPEN.** 0.35 is the better of the two, but no threshold works: measured true-navigate 0.20–0.72 overlaps false 0.09–0.61. Needs the mode assist (D2), not a number. |
| 3 | `hub_changelog` inject is prose only | **STILL OPEN** (`turn-router.ts:124-134`). Unchanged. The prose still does its job *when it loads* — see D4 for why that is now the risk. |
| 4 | `ui.choice` / artifact turns not routed | **HALF DONE.** Correct and deliberate in `FloatingAssistant.svelte:992/996` (full envelope — "Do it for me" really does get forms+pages there). **Broken on `/home`** (D1). Probe confirms the stated reasoning: those labels classify as `chat`/`knowledge_question` with forms ≤0.16. |
| 5 | No `other`/escape mode | **STILL OPEN**, and the consequence is bigger than logged: because the gate ignores the mode entirely (D2), a forced-fit mode is not merely a bad log line — the mode is a free second signal being thrown away. |
| 6 | `shadow` mode never exercised in CI | **STILL OPEN.** Unit-tested at `turn-router.test.ts:22`; nothing boots the app with `PUBLIC_ASSISTANT_ROUTER=shadow`. |
| 7 | No end-to-end test of the 1.5 s budget | **STILL OPEN**, low risk: 46/46 live calls landed in 200–501 ms. See D9 for the nesting. |
| 8 | User bubble appears after the classifier | **STILL OPEN**, smaller than feared: p50 ≈ 225 ms classifier (not ~600 ms), plus the hub round trip. |

## Nothing wrong with

- Fail-open: every one of the nine `null` paths resolves to the full envelope; I found no
  fail-closed path. `shadow` and `off` both behave as documented.
- The strip contract: both anchors are core and ungateable.
- `chat` detection: 3/3 probes correct and empty, which is the whole token win.
- Independent nouls over a softmax for multi-intent — the right call, and it measures right.
- Typed decisions: a bounded answer per question, so nothing the classifier emits can
  reach the user or steer the agent. The user's text is not logged (verified
  `+server.ts:49-64`).
