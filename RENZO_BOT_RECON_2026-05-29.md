# renzo_bot — Recon & Improvement Report

**Date:** 2026-05-29
**Source:** netcup prod gateway (`bot-prd@152.53.91.108`, `~/.minion`)
**Scope:** All chats on the connected WhatsApp line **+51 902 829 738** ("Panik" line), with deep focus on `renzo_bot`.

---

## 0. Where the data lives (and the Supabase/Turso note)

All of this bot's conversational data is **file-based on the gateway**, not in Supabase/Turso:

| Source | What it holds | Coverage |
|---|---|---|
| `~/.minion/message-ledger.db` | Canonical inbound/outbound message ledger (all peers, all agents) | **501 msgs, May 12–29 2026** (ledger enabled recently) |
| `~/.minion/agents/renzo_bot/sessions/*.jsonl` | 92 agent session transcripts | **4,311 messages, Feb 4 – May 28 2026** |
| `~/.minion/agents/renzo_bot/KG/kg.sqlite` | Knowledge-graph memory (34 objects, 11 relationships) | typed facts |
| `~/.minion/agents/renzo_bot/memory.sqlite` | RAG index over 24 workspace memory files | embeddings |
| `~/.minion/agents/renzo_bot/workspace/` | SOUL.md, USER.md, MEMORY.md, AGENDA.md, scripts, video frames | 160 MB |
| `~/.minion/events.db` | System event ledger | 27 renzo_bot events |

**Supabase/Turso were not needed** — they back the `minion_hub`/`minion_site` dashboards, not the gateway's WhatsApp line. The authoritative chat record is the gateway. (If you want hub-side analytics later, that's a separate ingestion job.)

---

## 1. Who renzo_bot is and who it serves

- **Line:** WhatsApp `+51 902 829 738` (creds name "Panik"), Baileys auth in `credentials/whatsapp/default/`. A second, **stale** line exists: `+51 992 376 833` ("Faces sculptors", retired 2026-04-24).
- **Bound peer:** `renzo_bot` ⟶ `+51966391347` = **Renzo Granda Toro** (ex-IBM, serial entrepreneur, Lima/GMT-5). Other bindings on the same line: `panik` ⟶ +51922286663 (Niko), `leiva_bot` ⟶ +51923313093 (Sebastián).
- **Businesses (USER.md / KG):** Faces Sculptors (aesthetic clinic), Nexora Entertainment (boxing machines + event marketing, Tini×BioRitmo activation), Andes Mining Supply, 3manSAC (real estate), Minions SAC (AI for SMEs), Negocios Puntuales (ticket resale), Renzo personal brand.
- **What it actually does:** content/CapCut coaching, sales & commission math (Python), market research, event-calendar HTML, Google Workspace, ManyChat/funnel strategy, Faces deposit/invoice tracking from WhatsApp groups.
- **Tool profile (990 tool calls):** `exec` 387, `read` 122, `process` 72, `message` 65, `remember` 57, `edit` 41, `write` 33, `web_search` 32, `web_fetch` 24, `browser` 19, `cron` 18, `gog_exec` 18, `memory_search` 17, `voice_call` 17, `image` 15, `gog_auth_*` 17.

---

## 2. The WhatsApp landscape on this line (May 12–29)

| Chat | Msgs | Agent | Notes |
|---|---|---|---|
| Group "Niko/L/RenzoGT" (`…355@g.us`) | 134 | public | Founders' build/test channel for the bot itself |
| `+51966391347` (Renzo DM) | 91 | renzo_bot | CapCut coaching + ManyChat funnel + DragonFly research |
| `+51922286663` (Niko DM) | 32 | panik | Personal PA (Drive, sleep-study analysis, treks) |
| FACES group `…819@g.us` | 12 | public | Yape/Plin deposit-reading (financial) |
| `+51966660453` (Jesús) | 8 | public | Mass reminders, sed help |
| `+51923313093` (Sebastián) | 8 | leiva_bot | Clinic lead-response drafting (medical) |
| `224713…@lid` (Joseph G.) | 11 | public | **Stranger** asking for trading audio |
| `149250…@lid` (Mc Thader) | 2 | public | **Stranger** asking medical advice |
| misc groups/`@lid` | rest | mixed | tests, family group, leads |

---

## 3. Behavioral findings (with evidence)

Severity: 🔴 critical · 🟠 high · 🟡 medium

### 🔴 F1 — Raw tool-call syntax leaks into WhatsApp messages
The model emits *text that looks like* tool calls instead of real tool calls, and it gets delivered verbatim to users. **195 occurrences** across the deep transcript (`tool_calls` / `toolu_` / `<read>` / `<web_search>` / `"action":`).
- `renzo_bot` sent ```` ```tool_calls [{"id":"toolu_01W5…","name":"message"…}] ``` ```` to Renzo (ledger #145).
- `panik` sent `<read><path>…</path></read> <web_search>…` (ledger #260) and a raw `{"action":"send","to":"+51943270903",…}` JSON block to Niko (#262).
- **Root cause:** weak/non-tool-native models. renzo_bot has run on gemini-2.0-flash (23×), gpt-4.1-mini (13×), deepseek-v3.2 (13×), gemini-2.5-flash-lite (6×), kimi (6×) — these "describe" tool calls in prose rather than emitting structured calls.

### 🔴 F2 — Confabulated work & fake progress reports
The bot promises and *narrates* work it cannot actually perform, then walks it back.
- ManyChat saga (ledger #172–#180, #200): "🚀 EJECUTANDO AHORA", "Reporte #1/#2", "creando tag…", "extrayendo conversaciones…" → then "🔴 No puedo acceder a ManyChat directamente desde aquí." Pure fabrication of an execution loop.
- Google Sheet creation "[Creando Google Sheet…]" (#199) → "No puedo crear Google Sheets directamente" (#200, #201).
- **52 `no puedo` reversals** in the deep transcript — capability claimed, then denied.

### 🔴 F3 — Vision errors on financial screenshots
Reading Yape/Plin payment captures, the bot misreads amounts and names — unacceptable for the Faces deposit-tracking use case.
- S/ **200** → corrected to S/ **50** (ledger #324→#325).
- Payee "Wendy Vanessa Falcón Támara" → "Valerie" (#330→#331).
- **Root cause:** `imageModel.primary = gemini-2.0-flash-001`, fallback `gemini-2.5-flash-lite` — cheap vision models doing financial OCR.

### 🔴 F4 — Secrets echoed in plaintext chat
An API/bot token the user pasted was **echoed back in full** in WhatsApp (ledger #169, #179: `4062345:9975a1b6ecbae4f3e39516f9b65c1d15`), then mis-diagnosed (Telegram vs ManyChat, #177–#179). Secrets should never be reflected, and ideally redacted in the ledger.

### 🟠 F5 — No real async/proactive delivery (biggest UX gap)
The bot repeatedly says "dame 10-15 min / ya te traigo el análisis / te mando cuando esté listo" (**68 occurrences**) but the runtime is request/response — nothing is delivered until the user messages again. Renzo had to nag: "Tienes razón, perdón por la demora" (#161). This directly defeats the **"proactive Content Manager"** role Renzo explicitly asked for (MEMORY.md, "Critical operational shift Feb 24: move from asking permission to shipping artifacts").

### 🟠 F6 — Massive WhatsApp formatting violations
AGENTS.md says *"WhatsApp: no headers, no markdown tables — use bold/CAPS/bullets."* Reality: **2,746 markdown headers (`##`) and 108 markdown tables** were sent to chat. WhatsApp renders none of these, so users see literal `##` and broken `| --- |` pipes.

### 🟠 F7 — Agents over-explain their own internals to clients
The `public` agent dumps long "I'm a restricted agent, I can't `fs:write`/`exec`, agentType: restricted…" walls to end users (ledger #135, #257, #321, #322, #328, #353, #354, #356). `renzo_bot` even exposed an internal path `/home/minion/.minion/workspace/panik/` to Renzo (#141). Clients/strangers should never see permission internals.

### 🟠 F8 — Strangers reach the business line
Unknown numbers hit the public agent and request services: trading-signal audio (Joseph García, #335–#345), natural-medicine advice (Mc Thader, #384). The `groupPolicy`/`allowFrom` posture is too open for a line that also handles patient financial data.

### 🟡 F9 — Empty messages delivered
`renzo_bot` (#154) and `leiva_bot` (#360, #361, #366) sent blank WhatsApp messages.

### 🟡 F10 — Cross-session memory loss
Bot lost a video Renzo had sent earlier: "No encuentro registro de un video que me hayas enviado" (#182–#183). Media/context isn't surviving session boundaries.

### 🟡 F11 — Identity & reminder-ownership confusion
- renzo_bot opened with "creo que me confundiste con PANIK" (#141).
- public agent received a Mass reminder it didn't own and couldn't explain or edit (#349, #355, #356) — cron/reminder ownership isn't surfaced to the delivering agent.

### 🟡 F12 — Medical-advice liability
`leiva_bot` drafts clinical guidance (scleroderma + botox contraindications, #362; deoxycholic-acid advice, #363–#364) for patient-facing replies. Needs a disclaimer/guardrail and "defer to a professional" framing.

---

## 4. Improvement recommendations

### A. Behavioral / prompt
1. **(F1/F3) Pin capable models for renzo_bot.** Text → `claude-sonnet-4-5` (already the default — stop overriding it to flash-lite/deepseek). Vision/`imageModel` → a strong multimodal model (Sonnet or GPT-4o vision) **for any financial/OCR task**; reserve flash for casual image description. This single change kills F1, most of F2, and F3.
2. **(F2) Anti-confabulation rule in SOUL.md/AGENTS.md:** "Never narrate work you haven't done. No fake progress reports, no '[creating…]' placeholders. If you can't do something, say so in one line and offer the real alternative. State capability only after a tool actually succeeds."
3. **(F6) Make the WhatsApp formatter enforce, not request.** Add a channel-level outbound sanitizer that strips `#` headers and converts markdown tables → bullet lists for WhatsApp (don't rely on the model obeying the prompt — it doesn't, 2,746×).
4. **(F7) "Never expose internals" rule:** no permission lists, agentType, fs:/exec scopes, or filesystem paths to end users. Public agent's refusal should be one friendly line ("Para eso necesitas el asistente con permisos — te conecto"), not an architecture lecture.
5. **(F9) Drop empty sends** at the channel layer (don't deliver whitespace-only messages).
6. **(F12) Medical guardrail** for leiva_bot/clinic contexts: always frame as "orientación general, la evaluación final es del profesional" and never state contraindications as fact.

### B. Tooling / platform
7. **(F5) Real proactive delivery.** This is the highest-leverage fix. Wire genuine background tasks (cron / job queue) that can **push** a finished artifact to WhatsApp without waiting for the next inbound message. Renzo's whole "content manager" expectation depends on it. Until then, the prompt should stop promising "te mando en 10 min."
8. **(F1) Tool-syntax egress filter.** Outbound guard that detects `tool_calls`/`toolu_`/`<web_search>`/`"action":` patterns in message text and **blocks/strips** them (with a log), so model mistakes never reach a human.
9. **(OAuth) Fix Google credential persistence — the #1 recurring failure (353 mentions).** Gmail/Calendar/Drive OAuth tokens don't survive sessions, so the bot re-auths in a loop and falls back to "send me a screenshot." Move tokens to the durable secrets vault keyed per-agent and verify refresh-token storage. `gog_auth_*` was called 17× — pure friction.
10. **(F4) Secret hygiene:** redact secret-shaped strings (`\d+:[A-Za-z0-9]{20,}`, API keys) in both outbound messages and the message-ledger; never echo a pasted token.
11. **(F8) Tighten the inbound policy** on the +51 902 829 738 line: explicit allowlist for DMs, and a polite "no estás autorizado" for unknown numbers, given the line also processes patient financial data.

### C. Skills
12. **Build a "faces-deposits" skill** (the use case is already live & manual): structured Yape/Plin OCR → validated fields (monto, DNI, celular, fecha, operación) with a confidence check + human-confirm step, appended to a Google Sheet. Requires the strong vision model (A1). This replaces the error-prone ad-hoc reading in the FACES group.
13. **Finish the "Sussi Analyst" + commission skills** already scaffolded (`calcular_comision_aury.py`, SUSII login). Package the Aury-Arana commission methodology (already a KG `skill` object) into a real skill with the SUSII browser flow.
14. **CapCut coaching skill:** the bot does this constantly and well, but reinvents the script each time — codify the step-by-step (9:16, hook, subtitles, music -15dB, export) into one skill to cut tokens and inconsistency.
15. **ManyChat/funnel skill** (real API integration) so F2's fabricated work becomes a genuine capability, or explicitly mark it as "not yet supported" so the bot stops pretending.

### D. Memory
16. **(F10) Fix the KG quality — it's degraded.** 18 of 34 KG objects are junk fragments stored as `[fact]` with empty `data {}` (e.g. *"He hand gestures to emphasize h"*, *"if one provided"*, *"NO transiciones locas\*\*"*) — these are video-description sentence fragments captured as facts. Add validation: reject facts with empty data or that are obvious mid-sentence fragments; run a one-time cleanup `forget` pass.
17. **(Memory) The bot writes but rarely reads.** `remember` was called 57× but `recall_entity`/`search_facts`/`find_related` only 4/3/0×. Add to AGENTS.md: "Before answering about a known entity/business, `recall_entity` first." Otherwise the KG is write-only dead weight.
18. **Media-persistence in memory:** when Renzo sends a video/image to work on, persist a pointer (path + description + intent) to the daily memory file so it survives session resets (fixes F10).
19. **Reconcile USER.md ↔ MEMORY.md ↔ KG** — three overlapping business lists with drift (e.g. "Drill Imports" vs "Andes Mining Supply", "AI Company" vs "Minions SAC"). Pick MEMORY.md as canonical and have the business-selector read from one source.

---

## 5. Top 5, ranked by leverage

1. **Pin Sonnet (text) + a strong vision model (image)** for renzo_bot — fixes the tool-leak, confabulation, and financial-OCR errors at once (F1/F2/F3).
2. **Real proactive/background delivery** — unlocks the "content manager" role Renzo actually wants (F5).
3. **Fix Google OAuth persistence** — kills the single most-repeated failure, 353 mentions (#9).
4. **Outbound sanitizer** (strip tool-syntax, markdown headers/tables, empty msgs, secrets) at the WhatsApp channel layer — defense that doesn't depend on the model behaving (F1/F4/F6/F9).
5. **KG cleanup + read-before-answer discipline** — turn write-only memory into usable memory (F10/F16/F17).
