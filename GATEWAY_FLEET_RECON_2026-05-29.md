# Minion Gateway — Fleet Recon (all agents except renzo_bot)

**Date:** 2026-05-29
**Server:** netcup prod gateway `bot-prd@152.53.91.108`, `~/.minion`
**Line:** WhatsApp **+51 902 829 738** ("Panik") + Telegram (3 bots) + Discord (4 accounts)
**Companion doc:** `RENZO_BOT_RECON_2026-05-29.md` (renzo_bot deep-dive)

Method: per-agent session JSONL extraction + `message-ledger.db` (May 12–29) + KG/memory inspection. Three heavy agents (panik, leiva_bot, manchas_bot) were reconned by parallel subagents; public/telegram/persona bots analyzed directly. All temp PII dumps deleted (server + local).

---

## Agent inventory (by activity)

| Agent | Msgs | Window | Owner / peer | Purpose | Status |
|---|---|---|---|---|---|
| **panik** | 8,858 | Feb–May | Niko (+51922286663) | Personal PA: email triage, Google Workspace, doc/image analysis, research, agent-coaching | active |
| **leiva_bot** | 4,883 | Feb–May | Sebastián Leiva (+51923313093) | Faces clinic owner-assistant: reminders, finance/biz advice, drafting patient replies | active |
| renzo_bot | 4,311 | Feb–May | Renzo (+51966391347) | (see companion doc) | active |
| **manchas_bot** | 3,582 | Feb–**Apr 7** | Francisco (+51989031000) | Amazon-FBA/Helium10 research, Polymarket betting POC | **dormant ~7wk** |
| **public** | 319 | May | *anyone unauthenticated* | Open gateway agent (fallback for unbound peers/groups) | active |
| giuli_bot | 595 | Feb–May | Giuliana | persona/workshop | low |
| faces_bot_prd | 358 | Feb–Mar | Nikolas | early Faces test bot | idle |
| tom_bot | 267 | Feb–Apr | Tom | persona/workshop | idle |
| carla_bot | 192 | Feb–Mar | (Niko alt) | persona/workshop | idle |
| burns_bot | 120 | Feb–May | Nicolas | persona/workshop | low |
| bri_bot / bj_bot / chicho / la_dayanita / farquaad / nico / sussi-analyst | <35 each | — | Niko alts/tests | experimental | idle |

Telegram traffic (150 msgs) is almost entirely **Niko testing the complaint-detection/alert-watcher feature** ("this product is terrible, i want a refund", "s" ×N) routed to `public`. Not real users.

---

## 🔴 SYSTEMIC critical findings (fleet-wide — these are platform bugs, not per-agent)

### S1 — Plaintext secrets stored, echoed to chat, and world-readable
Confirmed across **every** active agent. Highest-risk items:
- **manchas_bot:** a **live Polymarket trading API key+secret+passphrase** rendered into a delivered message (`**API Key:** 019cd309-a156-7dd4-…`) and stored in the KG; Helium10 + Reddit passwords in cleartext `~/.minion/credentials/manchas_bot/{helium10,reddit}.json` at mode **0664**.
- **panik:** Niko's full Gmail OAuth **refresh token** (`1//0hFZ7oxoBQche…`) in tool results ×8 and surfaced in a delivered code-review message.
- **leiva_bot:** OpenRouter API-key fragments (`sk-or-…` ×14), full Google OAuth `client_id` + auth URLs (×19), and a real **bank card number** + a 586 KB plaintext bank-statement file in the workspace.
- **renzo_bot:** echoed a pasted API/bot token back in plaintext (companion doc F4).

**Action:** rotate **all** exposed credentials now (Polymarket key is real money); add a fleet-wide outbound + log secret-redaction filter (`1//0…`, `sk-…`, `ghp_…`, `AIza…`, card/`\d+:[A-Za-z0-9]{20,}` patterns); move agent creds to the secrets vault and `chmod 600`.

### S2 — Cross-tenant data leak via `cron`/`sessions_list`
`cron {action:list}` returns **other agents' and users' jobs**. leiva_bot surfaced jobs tagged `agentId:"panik"`, `agentId:"manchas_bot"`, peers `+51989031000`, "Renzo", "Tini" to Sebastián. Tenant isolation is broken at the tool layer.
**Action:** scope `cron list`, `sessions_list`, and any registry-listing tool to the calling `agentId` server-side.

### S3 — Bots give medical advice to unauthenticated strangers (clinic liability)
The **public** agent (open to anyone messaging the line) interprets lab results and gives health guidance:
> *"## 📋 Análisis de Resultados - Perfil Tiroideo … **TSH: 5.80 μU/ml** ⚠️ … ELEVADO … Tu madre con problemas de tiroides … fuerte componente genético"*

It also triages facial pain, post-procedure inflammation, and recommends "natural supplements" — while contradictorily claiming *"no puedo darte diagnósticos médicos"*. `leiva_bot` drafts contraindication verdicts (scleroderma + botox). Strangers (Joseph García, Mc Thader) reach the line and get served.
**Action:** hard guardrail for any health/medication/lab/contraindication input → reply only "requiere valoración médica presencial"; tighten the inbound allowlist on a line that also handles patient financial data.

### S4 — Un-executed tool calls leak as text AND get falsely claimed as done
panik printed raw tool XML (`<read>…</read> <web_search>…`) and a send-action JSON to Niko, then asserted **"Listo, mensaje enviado al operador (+51 943 270 903)"** — the WhatsApp send **never executed**, and it doubled down twice over two days. Same root cause as renzo_bot's `tool_calls` leak (companion F1/F2).
**Action:** treat emitted-but-unexecuted action blocks as a hard error; gate all "done / I sent it / te aviso" claims on a real tool-success result; strip tool-syntax from outbound text.

---

## 🟠 High (recurring across agents)

- **H1 — Weak/drifting model routing.** Every agent bounces across `deepseek-v3.2`, `gemini-2.0-flash`, `gemini-2.5-flash-lite`, `gpt-4.1-mini`, `kimi-k2.5`, even `openrouter/free` — despite a Sonnet default. This is the common root of S4, confabulation, OCR errors, and false capability-denials. **Fix:** pin a capable tool-use model (Sonnet) for any WhatsApp/tool-calling turn; reserve cheap models for casual text only.
- **H2 — WhatsApp markdown/table flooding.** panik, leiva (142 header msgs / 19 tables), manchas (26), renzo (2,746/108) all ship `##` headers and `| --- |` tables WhatsApp can't render — against AGENTS.md. **Fix:** channel-layer formatter that strips headers + converts tables to bullets (don't rely on the prompt).
- **H3 — Write-only, junk-filled KG memory.** Empty-`{}` fragment "facts" dominate: panik 312/798 (39%), leiva ~120/163 (75%), manchas ~45/51, renzo 18/34 — mostly truncated heartbeat-reasoning/sentence fragments persisted as facts. All write far more than they recall (`remember` ≫ `recall_entity`+`search_facts`). **Fix:** validate non-empty structured `data` before persisting; stop saving heartbeat reasoning; GC; add "recall before answering about a known entity" to the prompt.
- **H4 — Internal control tokens leak into messages.** leiva delivered `[[reply_to_current]]` ×99 and `[VOTE_UP]/[KEEP_PIN]/[VOTE_DOWN]` ×275/307/222 as visible text. **Fix:** strip `[[...]]` and `[VOTE_*]`/`[KEEP_PIN]` in the send path.
- **H5 — Confabulated progress / "completed" claims.** manchas declared *"✅ ESTUDIO 100 PÁGINAS COMPLETADO"* on hitting its context limit; admitted *"Nunca arranqué a buscar productos"* after reporting progress. panik/renzo similar. **Fix:** forbid "completed/100%" without a tool-verified artifact.

## 🟡 Medium

- **M1 — Internal paths/permission lectures exposed to users** (leiva ×617 path mentions; panik ×93; public dumps "agentType: restricted, fs:write, exec" walls). Keep infra detail out of delivered text.
- **M2 — Empty & duplicate messages** delivered by every agent (panik 71, leiva 84, manchas 341 empty turns; verbatim dupes sent). Suppress empty sends; dedup consecutive identical outbound.
- **M3 — Reminder/cron unreliability** (leiva: "401 User not found", repeated "no me enviaste el recordatorio"; panik: a missing `upstream-diff-report.py` made a daily cron silently no-op for days; cross-agent reminder ownership unclear). Fix isolated-session auth for cron delivery + add delivery confirmation + alert on missing target scripts.
- **M4 — Active WhatsApp sessions not always persisted to JSONL** (panik's worst trek session existed only in the ledger). Creates an audit blind spot. Investigate session-persistence on the live WhatsApp path.
- **M5 — Persona drift / confusing identity.** panik's untranslated Hinglish ("Arre yaar 👳‍♂️ bhai") confused its es/en operator; manchas invented a grandiose "NEXUS – Coordinador Supremo de todas las IAs" org-chart presented as real; leiva persona mislabels owner ("Sebastián Zevallos" vs Leiva). Ground identities to reality; localize tone per user.

---

## Cleanup / housekeeping recommendations

- **Retire/archive `manchas_bot`** — dormant ~7 weeks after an Apr-7 capability collapse (broken image-gen + a KG context-injection loop re-injecting "Polymarket API Credentials" as fake user turns). Preserve its FBA/BMW/Polymarket reports, **revoke its credentials + channel binding**, rebuild fresh only if Francisco wants it back.
- **Prune the persona/workshop bots** — `giuli_bot, tom_bot, carla_bot, bri_bot, bj_bot, chicho, la_dayanita, farquaad, nico, faces_bot_prd, burns_bot, sussi-analyst` are mostly idle templated experiments (Niko alts/family). Archive the idle ones to cut surface area, secret exposure, and cron noise.
- **`faces_bot_prd`** (idle since Mar) and the **stale WhatsApp line +51992376833 "Faces sculptors"** can be cleaned up.

---

## Top 5 platform fixes (ranked — these fix the whole fleet at once)

1. **Outbound sanitizer at the channel layer** — strip tool-syntax/action-JSON, `[[...]]`/`[VOTE_*]` tokens, markdown headers+tables, secret-shaped strings, and empty messages. Defends S1/S4/H2/H4/M2 without trusting the model. *(Same recommendation as renzo_bot's #4.)*
2. **Rotate all exposed secrets now + move creds to the vault with 0600** (S1) — Polymarket live key is the most urgent.
3. **Server-side tenant scoping** for `cron`/`sessions_list`/registry tools (S2).
4. **Pin Sonnet for tool-calling/WhatsApp turns** fleet-wide (H1) — kills the bulk of tool-leak, confabulation, OCR, and false-denial issues.
5. **Medical guardrail + inbound allowlist** on the clinic line (S3); and **KG write-validation + GC** (H3).
