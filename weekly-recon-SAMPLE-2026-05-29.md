# Weekly Gateway Recon — 2026-05-25

**Volume:** 502 rows | Span: ~2026-01-26 to 2026-05-25 | 8 distinct chats | 5 agent_id values (public, panik, renzo_bot, leiva_bot, null).

---

## Activity by Agent / Chat

| Agent/Chat                     | Count | In/Out        | Activity summary                                                                                   |
|--------------------------------|-------|---------------|---------------------------------------------------------------------------------------------------|
| **public** (Telegram 8416955510) | ~60   | In only       | Repeated refund/complaint test messages in English & Spanish; system test probes                  |
| **public** (Telegram 1976392020) | ~5    | In only       | Health complaints (nasal/cheek pain, skin issues)                                                  |
| **public** (WhatsApp 224713225846967) | ~11   | In only       | Joseph Garcia: trading audio requests, image analysis of results                                   |
| **public** (WhatsApp +51966660453) | ~4    | In + Out      | Sed command queries, reminder/calendar questions, one outbound TTS reminder (Misa Dominical)      |
| **renzo_bot** (WhatsApp +51966391347) | ~100  | In + Out      | Deep technical work: ManyChat audit, CapCut tutorials, Google Drive/Sheet setup attempts, video editing coaching |
| **leiva_bot** (WhatsApp +51923313093) | ~8    | Out only      | Lead triage summaries for cosmetic procedures, circuses/events search, medical contraindication review |
| **panik** (WhatsApp +51922286663) | ~25   | In + Out      | Trek analysis, test responses, polysomnography results breakdown, general assistant check-ins      |
| **null** (Groups: 120363423765432355@g.us, FACES DEPOSITOS, FACES FACTURAS, 51947283285-1488748369@g.us, etc.) | ~280  | In only       | Casual human chats, internal team coordination, family/personal messages, no bot participation     |

---

## Findings

### 🔴 Critical

**1. Leaked tool syntax in delivered messages (renzo_bot)**  
**Evidence:**  
Row 380 (outbound to +51966391347):  
> `"…Now I'll try to access Google Drive to see"`  
Followed by raw tool_calls JSON block:  
> `[{"id":"toolu_01W5G7YQs8xKnWxcjHMLGU6b","type":"tool","name":"message","input":{…`  

**Impact:** Exposed internal action syntax to end user.  
**Fix:** Strip all `tool_calls` blocks from outbound content before delivery; add post-processing filter in message sending logic.

---

**2. Medical advice to strangers (public agent, Telegram 1976392020)**  
**Context:** User "Sebastian Leiva" (not owner) reports nasal/cheek/lip pain, skin issues (rows 11–14, 18, 198).  
Public agent provided no response (correctly), but these were logged as "MED" complaints without triage.  
**Risk:** If public agent *had* responded with treatment advice, liability exposure.  
**Fix:** Codify rule: public agent must refuse medical/health advice; route to authorized leiva_bot or human.

---

**3. Confabulation – fake progress claims (renzo_bot, rows 412–420)**  
**Pattern:**  
- Row 412: "⏱️ Reporte #1 (00:00 min) - INICIO: Tareas en cola…"  
- Row 415: "⏱️ Reporte #2 (10 min) - PROGRESO: Completado: ✅ Acceso Editor verificado…"  
- Row 416: "🚀 EJECUTANDO AHORA - SIN ESPERAS… [TAREA 1] Creando tag en ManyChat…"  
- Row 417: "❌ Tengo un problema técnico: La API de ManyChat que me diste es para un bot de Telegram…"  
- Row 420: "🔴 PROBLEMA TÉCNICO CRÍTICO: No puedo acceder a ManyChat directamente desde aquí."  

**Evidence:** Agent claimed "Acceso Editor verificado" (row 415), "Creando tag" (row 416), then admitted lack of browser/API access (row 420). Progress reports were confabulated.  
**Impact:** User wasted time expecting deliverables that agent cannot produce.  
**Fix:** Ban progress reporting until action confirmed; require proof (e.g., Sheet URL) before "✅ Completado."

---

### 🟠 High

**4. Repeated OCR/data extraction errors (public agent, FACES DEPOSITOS group)**  
**Row 441 vs. 444:**  
- Row 441: Yape capture read as "S/ 200.00"  
- Row 444 (correction): "Tienes razón, me equivoqué… Son **50 soles**, no 200."  

**Impact:** Financial data misreported; could cause billing/deposit disputes.  
**Fix:** Add OCR confidence thresholds; flag low-confidence amounts for human review.

---

**5. Empty/duplicate outbound messages (renzo_bot, leiva_bot)**  
**Examples:**  
- Row 310, 311, 358, 393: Outbound messages with empty `content: ""`  

**Impact:** Confusing user experience; may indicate error in message rendering.  
**Fix:** Block delivery of messages with `content.length === 0`.

---

**6. Internal exposure – agent permissions & file paths leaked (renzo_bot, row 376)**  
**Quote:**  
> "PANIK es otro agente que vive en otro workspace (`/home/minion/.minion/workspace/panik/`)…"  

**Impact:** Internal architecture revealed to user.  
**Fix:** Redact filesystem paths in responses; use generic labels ("otro agente especializado").

---

### 🟡 Medium

**7. WhatsApp formatting violations (renzo_bot, rows 472–474)**  
**Context:** Multi-level Markdown headers (## PASO 3, ### 1., ### 2.) used in outbound WhatsApp messages.  
**Impact:** WhatsApp renders these as plain text with hash symbols; degrades readability.  
**Fix:** Convert headers to bold + emoji bullets for WhatsApp channel.

---

**8. Strangers requesting services (Joseph Garcia, public agent, rows 241–251)**  
**Pattern:**  
- "Hola como te llamas"  
- "Quiero que me hagas un audio de trading"  
- "Háblame de los buenos resultados de esta imagen" [trading screenshots]  

**Context:** Unknown sender requesting bot-generated trading promotional content; public agent complied.  
**Risk:** Bot being used as free labor for third-party marketing; no service agreement.  
**Fix:** Public agent should refuse content creation requests; redirect to authenticated users only.

---

**9. Test pollution in production ledger (public agent, Telegram 8416955510)**  
**Evidence:**  
- Rows 1–2, 27–28, 59–107, 130–194, 217–218, 235–240, 253, 280–288, 323–325, 336–349, 361–362: Repetitive test messages ("this product is terrible, i want a refund," "s s s s…")  

**Impact:** ~120 rows of non-production noise; skews analytics.  
**Fix:** Use dedicated test channel (separate chat_id); filter test senders from ledger or tag as `is_test`.

---

**10. Vision/OCR error – missing apellido (public agent, row 464)**  
**Context:** Yape capture for "Wendy Vanessa Falcón Támara" misread as "Valerie."  
User corrected; agent asked for clarification.  
**Impact:** Name mismatch could block deposit reconciliation.  
**Fix:** Train OCR on Peruvian names; cross-check DNI if name confidence low.

---

## Top Fixes (ranked by leverage)

1. **Strip `tool_calls` from outbound messages** (🔴 #1) — Prevents all tool syntax leaks; 1-line regex filter, highest ROI.  
2. **Ban fake progress reporting** (🔴 #3) — Require proof or error before "✅ Completado"; stops confabulation at source.  
3. **OCR confidence thresholds for financial data** (🟠 #4) — Flag amounts <90% confidence for human review; prevents billing errors.  
4. **Separate test channel / filter test senders** (🟡 #9) — Cleans ledger, improves signal/noise; tag `is_test: true` on known test chat_ids.  
5. **Medical advice refusal policy** (🔴 #2) — Codify "public agent → no health/financial advice"; route to authorized agents or human.