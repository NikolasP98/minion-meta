---
id: 2026-08-03-crm-icp-score-spec
title: CRM — Per-Org Ideal Customer Profile (ICP) Score
stage: spec
status: draft
pass: 1
created: 2026-08-03
updated: 2026-08-18
repos: [minion_hub]
---

# CRM — Per-Org Ideal Customer Profile (ICP) Score

**Date:** 2026-08-03
**Status:** Proposed (ready for subagent execution)
**Owner surface:** `minion_hub` — `/crm/customers`, `/crm/settings`, `crm-contacts.service.ts`, `/api/crm/icp/**`
**Prereq reading:** memory `crm-relationship-graph-v2-2026-07-23` (inference-kernel precedent), `hub-system-automations-manifest`, `rbac-erpnext-framework`, skill `ui-design-governance`

---

## 1. Goal

The CRM roster today ranks contacts by an **RFM score** — recency, frequency, monetary —
which measures *engagement*: how much someone talks to us and pays us. It says nothing
about whether they are the kind of customer this org actually wants.

Add a second, orthogonal score: **ICP fit**, computed per org from that org's own
definition of an ideal customer, using **contact details + conversation history**.

> `score` = how engaged they are (behavioural, SQL, already exists — **do not touch**).
> `icp` = how well they match who we want (fit, AI-assisted, **new**).

Both columns coexist in the table. A dormant perfect-fit lead and a chatty bad-fit
tyre-kicker are the two cases the current single score cannot distinguish.

---

## 2. What already exists (do NOT rebuild)

| Asset | Location | Use |
|---|---|---|
| RFM score + lifecycle + weights | `src/server/services/crm-scoring.ts` (`RFM_WEIGHTS`, `RFM_CONST`) | reference for the "pure logic in TS, ranking in SQL" split |
| Roster query with `r_score/f_score/m_score/score`, `minScore`/`maxScore` filters, `sort` union | `crm-contacts.service.ts` (`listContacts`) | extend, don't fork |
| Per-org settings, one jsonb row | `crm_settings (org_id PK, value jsonb)` | home for the ICP definition — **zero migration** |
| Reserved `custom_fields` keys `_funnel`, `_relationship` | `crm_contacts.custom_fields` | precedent for `_icp` — **zero migration** |
| Finance bridge (revenue, invoice count, last purchase) | `crm-finance.service.ts` | ICP feature inputs |
| Per-message sentiment | `crm_message_sentiment` | ICP feature input |
| LLM call pattern | `crm-conversation-analysis.service.ts` — `generateText` from `ai` + `getOpenRouterModel` from `$server/llm` | copy this shape; hub has **no** `drones.execute` client |
| Conversation content signature | `crm_conversation_index.content_sig` | dirty-gate input |
| Central write gate | `['/api/crm', 'crm']` in `API_WRITE_PREFIXES` | new `/api/crm/**` routes are auto-gated |

---

## 3. Data model — zero DDL

### 3.1 Org definition — `crm_settings.value.icp`

```ts
// Zod-validated on write; enums live in code only (no DB enum).
type IcpDefinition = {
  version: number;              // bump on ANY edit → invalidates every cached score
  description: string;          // free text: "who is our ideal customer", max 2000 chars
  criteria: Array<{
    id: string;                 // stable slug, e.g. 'budget'
    label: string;              // "Has budget for a full treatment plan"
    weight: number;             // 1..5, relative
  }>;                           // max 8 criteria
  disqualifiers: string[];      // max 5, e.g. "only ever asks for free consults"
  updatedAt: string;            // ISO
};
```

Missing/empty `icp` ⇒ the feature is **off** for that org: no tick work, no column, no
LLM spend. This is the default state for every existing org.

### 3.2 Per-contact result — `crm_contacts.custom_fields._icp`

```ts
type IcpResult = {
  score: number;                // 0..100
  band: 'strong' | 'moderate' | 'weak' | 'disqualified';
  criteria: Array<{ id: string; met: boolean; note: string }>;  // note ≤ 140 chars
  reasons: string[];            // ≤ 3, ≤ 200 chars each, NO raw conversation quotes
  evidenceRefs: Array<{ chunkId: string }>;                     // refs only, never text
  inputSig: string;             // see §5
  icpVersion: number;           // the IcpDefinition.version scored against
  model: string;
  promptVersion: number;
  scoredAt: string;             // ISO
};
```

`_icpClaim` is a **separate, internal-only** key holding the expiring inference lease
(§6). It must be stripped from every response, exactly like `_relationshipClaim`.

**No raw evidence text is ever stored** — `evidenceRefs` only. This mirrors the ruling
already made for the relationship graph and keeps conversation PII out of a field that
is cached and serialised to browsers.

### 3.3 Why `custom_fields` and not a column

Zero migration, matches two existing precedents, and the roster query can project it.
**If** sorting by ICP proves hot after measurement, add an expression index as a
*separate, measured* change — do not add it speculatively:

```sql
-- ONLY if measured slow. This is DDL and needs the migration pipeline.
create index concurrently crm_contacts_icp_score_idx
  on crm_contacts (((custom_fields->'_icp'->>'score')::numeric) desc nulls last);
```

---

## 4. Scoring pipeline

Two stages. Stage A is deterministic and cheap; stage B is the only LLM call.

### Stage A — feature bundle (SQL + TS, no LLM)

Assemble per contact, reusing existing queries:

- **Profile:** display name present, identity count, channels, `source`, DNI/sex/age
  presence (presence only — **never** the values, see §7), tenure days, verified flag.
- **Commercial:** lifetime revenue, invoice count, last purchase date, `isBuyer`
  (`crm-finance.service.ts`).
- **Engagement:** `r_score`, `f_score`, `m_score`, inbound/outbound counts, mean
  sentiment from `crm_message_sentiment`.
- **Conversation digest:** a **bounded** head+tail sample of the contact's messages —
  cap at ~2,000 characters total. ⚠️ The existing analyze tick sends only the *first*
  chunk of a conversation and is **not reusable as-is** for this.

**Skip gate (no LLM spend):** if a contact has *both* zero messages *and* zero
commercial history, write `_icp = null` and move on.

### Stage B — LLM judge (one call per contact)

`generateText` + `getOpenRouterModel(ICP_MODEL)` — default `google/gemini-2.5-flash`,
overridable by env. Prompt receives the org's `IcpDefinition` and the Stage-A bundle,
and must return **raw JSON only** matching `IcpResult` minus the bookkeeping fields.
Parse with Zod; on parse failure, retry once, then record a failure and skip — never
write a partial result.

Weighting is done **by the model against the stated criteria weights**, not by a
hand-tuned formula. Rationale: the criteria are org-authored free text; a numeric blend
across them would be false precision. The deterministic features are *inputs*, not a
second score to reconcile.

`disqualified` band short-circuits to `score ≤ 10` when any disqualifier matches.

---

## 5. Dirty gate — never age-based

Recompute **only** when the input signature changes:

```
inputSig = sha256([
  icpDefinition.version,
  promptVersion,
  model,
  aggregate(crm_conversation_index.content_sig for this contact),
  hash(profile+commercial feature subset),
].join('|'))
```

Rerun iff: no `_icp`, `inputSig` differs, `icpVersion` differs, or an explicit refresh
was requested. **Never** "older than N days" — that turns a bounded backfill into a
recurring bill. (Same ruling as the relationship inference kernel.)

---

## 6. Background execution

`POST /api/crm/icp/tick` — one endpoint, cron-driven, cross-org.

- **Org selection in SQL:** `organizations.kind = 'business'` **and** the org has a
  non-empty `crm_settings.value.icp`. ICP is a *customer*-fit concept; personal orgs have
  no customers. Re-check in-service — do **not** rely on `locals.orgKind` (cron has no
  user locals) and do **not** use `effectiveModuleEnabled` (crm is available to both kinds).
- **Concurrency:** an advisory xact lock **must not** be held across LLM calls. Use an
  atomic expiring claim written to `_icpClaim` (claim → LLM → commit result → release),
  exactly as the relationship kernel does.
- **Caps:** per-org 5 contacts/tick, global 25/tick, concurrency 2. These are the
  numbers already validated for the relationship kernel; keep them until measured.
- **Cron principal:** `searchableModules:['crm'], fieldLevels:{crm:1}` — **never**
  owner/admin.
- **Wiring (all three or it silently never runs):** route + `hooks.server.ts`
  unauthenticated-API allowlist + netcup crontab. Add a `SYSTEM_AUTOMATIONS` entry with
  `wiring: 'unscheduled'` and `automation_crm_icp_{title,desc}` message keys. Do **not**
  claim `netcup` — the crontab is currently pruned and scheduling is the user's call.

`POST /api/crm/contacts/[id]/icp/refresh` — force one contact (bypasses the dirty gate,
still respects caps and the claim).

### 6.1 Atomic write ⚠️

`_funnel`'s writer on master is a **read-modify-write** (`select customFields` → spread →
`update`) and is **not concurrency-safe** — a tick and a user edit can clobber each
other. `_icp` must be written with an atomic `jsonb_set` JSON-path update.

If the relationship-graph slice (`specs/2026-08-03-crm-relationship-graph-v2-port-spec.md`)
has already landed, **reuse its atomic setter**. If not, write one here and keep it
generic so that slice can adopt it.

---

## 7. Security, privacy, RBAC

- **Masking.** For principals where `shouldMaskSensitive(locals,'crm')` is true, strip
  `_icp.reasons`, `_icp.criteria[].note`, and `_icp.evidenceRefs` — these are
  LLM-written summaries of private conversations and `pii.ts` masking is *shallow*, so
  nesting will not save you. **Keep** `score` and `band`: they are derived aggregates of
  the same class as the RFM `score`, which masked principals already see.
  → *If the reviewer disagrees, the stricter fallback is to strip `_icp` entirely, as
  the relationship graph does. Flag the choice rather than deciding silently.*
- **`_icpClaim` is never serialised.** Add it to the same strip list as
  `_relationshipClaim`.
- **DNI / sex / age are presence-only features.** Send booleans to the model, never the
  values. A national ID must not reach an external LLM.
- **RBAC:** `/api/crm/**` mutations are already centrally write-gated. Verify the new
  routes are covered; add nothing new unless a gap is proven.
- The ICP definition is org-authored free text — treat it as untrusted input in the
  prompt (it cannot be allowed to redirect the model's output contract).

---

## 8. UI

### 8.1 Roster column (`/crm/customers`)

Add an `icp` column beside `score` in the existing `columns` array
(`crm/customers/+page.svelte`):

- Cell = band chip + number. Bands map to **status tokens, one fixed semantic map**:
  `strong → success`, `moderate → warning`, `weak → neutral/surface`,
  `disqualified → danger`. **Never `--color-accent` for a status level.**
- Sortable via the existing `sort` union (`'icp'` added), server-side.
- Range filter mirroring `minScore`/`maxScore` → `minIcp`/`maxIcp`. **Inclusive at both
  endpoints** (`>= min AND <= max`) per the range-filter governance rule.
- Empty state when the org has no ICP definition: column hidden entirely, with a link to
  `/crm/settings`. Do not render a column of dashes.
- Explainability popover on the chip: reasons + per-criterion met/not — mirroring the
  existing RFM tooltip. Use the shared `Tooltip`/`Popover` wrappers, not `title=""`.

⚠️ **`/crm/customers` is being rewritten for server-side pagination**
(`specs/2026-08-03-crm-customers-server-pagination-spec.md`). Coordinate: the ICP column
must be a **server-projected field with server sort/filter**, not a client-side
computation over the full roster — otherwise it breaks the moment pagination lands.

### 8.2 Definition editor (`/crm/settings`)

Section: description textarea, criteria repeater (label + weight 1–5, max 8),
disqualifiers list (max 5). Save bumps `icp.version`. Show a plain warning that saving
re-scores every contact on the next ticks.

### 8.3 i18n

All strings through Paraglide (`m.*()`), keys added to **both** `messages/en.json` and
`messages/es.json`, then `bun run i18n:compile`. ★**Never re-sort `messages/*.json`** —
append only; the files are co-edited and a re-sort produces an unreviewable diff and
clobbers co-agent keys.

---

## 9. Tests (required, all pure/unit — no live LLM)

| Test | Asserts |
|---|---|
| `crm-icp.test.ts` | band thresholds; disqualifier short-circuit; Zod rejects out-of-range score, >8 criteria, oversized notes |
| `crm-icp-sig.test.ts` | `inputSig` changes on icp-version / prompt-version / model / conversation-sig / profile change; **stable** otherwise (the no-rerun guarantee) |
| `crm-icp.service.test.ts` | skip gate (no messages + no commerce ⇒ no LLM); parse-failure retry-once-then-skip writes nothing partial |
| masking test | masked principal gets no `reasons`, no `criteria[].note`, no `evidenceRefs`, and **never** `_icpClaim` |
| tick test | org selection SQL restricted to `kind='business'` + non-empty definition; caps respected; claim released on failure |
| roster test | `minIcp`/`maxIcp` inclusive at both endpoints; `sort:'icp'` orders server-side; contacts without `_icp` sort last, not as 0 |

---

## 10. Execution order (subagent-sized units)

1. **U1 — contract + storage.** Zod types, `crm_settings.value.icp` read/write, `_icp`
   strip/mask rules in the sanitiser, atomic `jsonb_set` setter. Tests: masking + Zod.
2. **U2 — feature bundle.** Stage-A extraction reusing finance/sentiment/RFM. Tests:
   skip gate, bundle shape, presence-only PII.
3. **U3 — judge + dirty gate.** LLM call, Zod parse, retry-once, `inputSig`. Tests: sig
   stability, parse failure.
4. **U4 — tick + refresh endpoints.** Org selection, claims, caps, allowlist entry,
   `SYSTEM_AUTOMATIONS` entry (`unscheduled`). Tests: org-kind SQL, caps, claim release.
5. **U5 — UI.** Roster column + server sort/filter, settings editor, i18n, popover.
6. **U6 — gates + PR.**

U1–U4 are server-only and can proceed while U5 waits on the pagination spec's landing
shape. **U5 must not be merged before confirming it composes with server-side pagination.**

---

## 11. Gates

```bash
bun run check                        # 0 errors / 0 warnings
bun run vitest run src/server/services/crm-*.test.ts src/lib/components/crm/
bun run lint:tokens
DESIGN_LINT_BASE_REF=origin/master bun run lint:design
```

🚨 `lint:design` **silently exits 0** in a master-based worktree (its base defaults to the
deleted `origin/dev`). U5 touches `.svelte` files, so the explicit base ref is mandatory.

## 12. Acceptance criteria

1. An org with no ICP definition sees **no column, no tick work, no LLM spend**.
2. Editing the definition bumps `version`; affected contacts re-score on subsequent
   ticks and **unaffected ones do not** (proven by `inputSig` stability test).
3. `score` (RFM) is **byte-identical** before and after — ICP never overwrites it.
4. A masked principal receives no ICP free text and no `_icpClaim`.
5. No DNI/sex/age **values** appear in any prompt payload — presence booleans only.
6. `minIcp`/`maxIcp` are inclusive at both endpoints; `sort:'icp'` is server-side.
7. Zero DDL. Any index is a separate, measured follow-up.
8. Tick is registered in `SYSTEM_AUTOMATIONS` as `unscheduled` until a crontab line
   exists — never claimed as `netcup` while unscheduled.

---

**Triage 2026-08-18:** KEPT (draft) — still wanted, but blocked by 2026-08-13-crm-customers-server-pagination-spec (server-sorted column prerequisite; its two pilot PRs #105/#106 closed unshipped — a fresh dev run was requeued). Approve for dev only after pagination merges.
