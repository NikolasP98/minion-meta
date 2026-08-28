---
id: 2026-08-03-crm-icp-score-spec
title: CRM — Per-Org Ideal Customer Profile (ICP) Score
stage: spec
status: approved
pass: 2
created: 2026-08-03
updated: 2026-08-28
repos: [minion_hub]
verdict: approved
tags: [logic, data, ui, test]
next_slice: 1
approved_reason: "Pass-2 review against minion_hub@1b47e8c: pagination and ICP server sort/filter prerequisites shipped; remaining units were collision-adjusted and bounded to 4-8h."
---

# CRM — Per-Org Ideal Customer Profile (ICP) Score

**Date:** 2026-08-03
**Status:** Approved after pass-2 review (ready for bounded Factory execution)
**Owner surface:** `minion_hub` — `/crm/customers`, `/crm/settings`, `crm-contacts.service.ts`, `/api/crm/icp/**`
**Prereq reading:** memory `crm-relationship-graph-v2-2026-07-23` (inference-kernel precedent), `hub-system-automations-manifest`, `rbac-erpnext-framework`, skill `ui-design-governance`

---

## 0. Product

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
| Roster query with `r_score/f_score/m_score/score`, `minScore`/`maxScore` filters, `sort` union | `crm-contacts.service.ts` (`rankContactsPage`) | extend, don't fork |
| ICP server projection, inclusive `minIcp`/`maxIcp`, `sort: 'icp'`, and CSV query plumbing | `crm-contacts.service.ts`, `/api/crm/contacts/**` | **already shipped** by the pagination work; preserve and consume it rather than rebuilding it |
| Per-org settings, one jsonb row | `crm_settings (org_id PK, value jsonb)` | home for the ICP definition — **zero migration** |
| Reserved `custom_fields` keys `_funnel`, `_relationship` | `crm_contacts.custom_fields` | precedent for `_icp` — **zero migration** |
| Atomic reserved-key writer | `setContactCustomField` in `crm-contacts.service.ts` | reuse for `_icp`; do not add another read-modify-write helper |
| Expiring inference-claim kernel | `crm-relationship-inference.service.ts` | reuse its claim semantics and failure cleanup; do not copy stale pre-kernel behavior |
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

The relationship kernel and generic `setContactCustomField` primitive have landed.
**Reuse them.** Adding a second setter or restoring the old read-modify-write shape is
out of scope and fails review.

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

Server-side pagination is now shipped. Its contact API and service already accept
`minIcp`, `maxIcp`, and `sort: 'icp'`, with inclusive boundaries and `NULLS LAST`
covered by unit and PGlite tests. The UI unit in this spec must consume that existing
contract. It must not compute ICP ordering client-side or duplicate the query path.

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

### Slice 1 — contract + settings storage (4–8h)

**Topics:** `logic`, `data`, `test`

Add the Zod contracts, `crm_settings.value.icp` normalization/read/write, and `_icp`
strip/mask rules. Reuse `setContactCustomField`; do not create a second setter. The
slice is done when focused tests prove strict settings validation, atomic version
bumps, masked free text, and unconditional `_icpClaim` stripping.

### Slice 2 — deterministic feature bundle (4–8h)

**Topics:** `logic`, `data`, `test`

Build Stage A by composing the existing finance, sentiment, RFM, and bounded
conversation inputs. The slice is done when tests prove the skip gate, stable bundle
shape, bounded head+tail text, and presence-only DNI/sex/age values.

### Slice 3 — judge + dirty gate (4–8h)

**Topics:** `logic`, `data`, `test`

Add the typed LLM judge, retry-once parser, disqualifier rule, and `inputSig`. The slice
is done when pure tests prove signature stability/change dimensions, score/band bounds,
prompt-injection containment, and that two parse failures persist no partial result.

### Slice 4 — tick + refresh endpoints (4–8h)

**Topics:** `logic`, `data`, `infra`, `test`

Add business-org selection, expiring claims, caps, cron allowlist, contact refresh,
and the `SYSTEM_AUTOMATIONS` entry with `wiring: 'unscheduled'`. The slice is done when
route/service tests prove org filtering, caps, dirty-gate bypass only for explicit
refresh, and claim release on every failure path.

### Slice 5 — roster UI (4–6h)

**Topics:** `ui`, `logic`, `test`

Consume the already-shipped server ICP projection: band/score column, server-backed
range controls, hidden-column empty state, and explainability popover. The slice is
done when component/query-state tests prove the fixed status-token map, server query
round-trip, hidden-off state, and masked-result rendering. Do not change ranking SQL.

### Slice 6 — settings UI + i18n (4–8h)

**Topics:** `ui`, `logic`, `test`

Add the definition editor, bounded criteria and disqualifier repeaters, rescore
warning, append-only EN/ES keys, and settings-route tests. The slice is done when UI
tests prove both collection caps, weight bounds, save/version behavior, and translated
validation errors.

### Slice 7 — final gates + PR evidence (≤4h)

**Topics:** `test`, `ui`, `data`

Run the exact commands in §11, record the pagination-contract tests that remain green,
and open one reviewable PR. This slice may repair gate failures but may not widen
product scope.

U1–U4 are server-only. U5a depends on the shipped pagination contract identified in
§2; U5b is independent after U1. Factory should execute the units in numeric order so
the browser never receives a UI contract the service cannot yet populate.

---

## Verification

```bash
bun run check                        # 0 errors / 0 warnings
bun run vitest run src/server/services/crm-*.test.ts src/lib/components/crm/
bun run lint:tokens
DESIGN_LINT_BASE_REF=origin/master bun run lint:design
```

🚨 `lint:design` **silently exits 0** in a master-based worktree (its base defaults to the
deleted `origin/dev`). U5 touches `.svelte` files, so the explicit base ref is mandatory.

## Out of scope

- Any DDL or speculative expression index. A measured query regression requires its
  own migration-backed proposal.
- Replacing or blending the existing RFM score, computing server ranking in the
  browser, enabling ICP for personal orgs, or persisting raw conversation evidence.
- Scheduling the automation on Netcup before an operator explicitly adds the crontab
  entry, or weakening the human merge gate for the `data`/`ui` change.

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

**Triage 2026-08-18:** KEPT (draft) — blocked on server-side pagination at that time.

**Pass-2 reconciliation 2026-08-28:** APPROVED. Pagination subsequently shipped
(including the server ICP projection and inclusive range/sort tests). The review
removed that completed work from the implementation units, bound the remaining work
to current Hub primitives, split the oversized UI unit, and retained a human merge
gate through the `data`/`ui` topic manifest.
