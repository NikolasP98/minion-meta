# CRM Plugin — Recon + Implementation Plan (v2)

**Date:** 2026-06-13 (v2 rewrite after design review + new requirements)
**Status:** REVISED + **P0–P4 BUILT** (2026-06-13, in `minion_hub` on `dev`; `check` 0/0 · `test` 662/662 · `build` clean). NOT yet committed or DB-applied. Remaining: apply migration to a DB + validate raw SQL against live Postgres; tag-create UI; i18n of new strings. See §10 for what landed.
**Author:** orchestrator (recon + adversarial review + 3 parallel design agents)
**Scope:** A hub-native, reuse-first CRM for the Minion hub whose core job is to **track each customer's end-to-end journey across every channel and let the business tag / score / rank them** — built on the existing `messages` ledger, identity tables, and `withOrgCore` RLS, with the smallest possible new surface.

> **What changed from v1 of this plan (and why).** v1 proposed ~10 new tables including a `crm_activities` table that *copied* the message ledger, a `JobRunner`/BullMQ seam for async, and a full Person/Company/Deal/Notes/Tasks CRM. An adversarial review (4 specialists, evidence-backed) plus the user's clarified intent collapsed the design:
> - **The journey already exists** as rows in the `messages` ledger. v2 **derives** the timeline live instead of copying it — killing the largest table, the consistency bugs, and the write-amplification.
> - **The point of the CRM is scoring/ranking the customer**, not a deal pipeline. v2 makes the **ranked contact list the product**; deals/pipelines move to a clearly-marked stretch.
> - **No workers/queues.** Scoring is **on-read RFM SQL**. Contact sync is an **idempotent set-based anti-join** (no counters, no watermark, no locks). The v1 `JobRunner`/BullMQ machinery is deleted from v1.
> - **Schema bugs fixed**: correct org column (`org_id text`, matching the ledger) + correct GUC RLS policy + no fictional cascade FKs + no false "identity convergence" claims (see §3, §6).
> - **The impossible "real-time hook after `insertMessages()`" is dropped** (the hub runs serverless with no `waitUntil`/queue; a floating async there is killed on freeze). Near-real-time becomes a v2 gateway event, named honestly.
> - **Privacy/retention** — absent in v1, now a first-class section (§9). The lead tenant is a medical clinic; harvesting contacts without a deletion/consent story was a liability.

---

## 0. TL;DR

A hub-native CRM living in the hub's Supabase Postgres, **reusing the `messages` ledger as the single source of truth for the customer journey.** People who text the org's **registered channels** become **contacts** (a message's `org_id` is server-stamped at ingest = the channel registration, so contacts derive cleanly per-org from ledger rows that already carry the right `org_id`). Each contact's **journey timeline** is a live query over `messages` (zero copy, always fresh). Each contact gets an **explainable RFM score** (Recency / Frequency / "Monetary"-as-engagement) computed **on-read in SQL**, a **derived lifecycle stage** (New→Engaged→Active→Dormant→Churned), and **manual + auto tags**. The defining surface is a **ranked, filterable contact list** — sort customers by engagement, tag them, drill into the full cross-channel journey + score breakdown.

**New surface (total):** 3 small tables (`crm_contacts`, `crm_contact_identities`, `crm_activities` for *non-message* events only) + 2 tiny tag tables + 1 stats view + 1 timeline view + 1 ranking SQL function + 1 index on `messages`. Everything else is derived from or reuses native infra.

---

## 1. Core Principle: the ledger IS the journey

The `messages` ledger (`packages/db/src/pg/schema/messages.ts`) already records **every inbound/outbound interaction across every channel**, org-scoped and RLS-enforced: `channel, direction, accountId, chatId, isGroup, senderId, senderName, senderHandle, isBot, content, messageId, agentId, sessionKey, occurredAt, createdAt, metadata`. Indexed on `(org_id, channel, chat_id, occurred_at)` and `(org_id, occurred_at)`.

**Therefore:**

| Concern | v1 plan | v2 (this) | Covered by |
|---|---|---|---|
| Customer journey timeline | copy into `crm_activities` | **live query / VIEW** over `messages` | the ledger + a join to contact identity |
| Message activities | `crm_activities` rows | **not stored** | `messages` |
| Non-message events (notes, stage/tag/score changes, manual log) | `crm_activities` + `crm_activity_targets` | tiny **`crm_activities`** (single `contact_id` FK, no polymorphic join) | new, minimal |
| `message_count / first / last contact` | incremented on harvest (non-idempotent — bug) | **derived view** (`COUNT`, `MIN`, `MAX`) | `crm_contact_stats` view |
| Score | (absent) | **on-read RFM SQL** | ranking function over the ledger |
| Tags | `crm_tags` + join | manual join table; **auto-tags = live filters** | §7 |
| Deals/pipelines/notes/tasks | full set in v1 | **stretch / v2** | §10 |

The win condition: **smallest new surface that delivers contact + journey + scoring, reusing the ledger, RLS, and existing UI primitives.**

---

## 2. Architecture

```
minion_hub/
├── src/routes/(app)/crm/
│   ├── +page.svelte                 # ★ THE PRODUCT: ranked contact list (sort by score, filter, tag)
│   └── [contactId]/+page.svelte     # contact: score breakdown + journey timeline + tags + notes
├── src/routes/api/crm/
│   ├── contacts/+server.ts          # GET ranked list (calls ranking fn) / sync-on-read
│   ├── contacts/[id]/+server.ts     # GET detail + timeline / PATCH (name, owner, override, custom_fields)
│   ├── contacts/sync/+server.ts     # POST "Sync now" (set-based harvest for active org)
│   ├── contacts/sync-all/+server.ts # cron fan-out across orgs
│   └── tags/+server.ts              # CRUD tags; apply/remove on contact
├── src/server/services/crm-contacts.service.ts   # syncContactsFromLedger + ranked reads (withOrgCore)
├── src/lib/state/features/crm.svelte.ts           # $state module (hub convention: plain $state, not a class)
├── src/lib/components/crm/                          # ContactTable, ScoreBreakdown, JourneyTimeline, TagPicker
└── vercel.json                                      # NEW: cron schedule (does not exist yet)

packages/db/src/pg/schema/crm.ts                     # Drizzle schema (org_id text, GUC RLS family)
packages/db/migrations/ (hand-written *_crm.sql)     # CREATE TABLE IF NOT EXISTS + RLS policies + ranking fn
```

**Plugins-nav registration (verified trivial):** add one entry to `BUILTIN_PLUGIN_ITEMS` (`minion_hub/src/lib/components/layout/sections.ts`) — the exact precedent is the "Kanban"/`/workforce` hub-native route. No manifest, no gateway SDK change.

**Style decision (unchanged, validated):** hub-native Svelte routes + Supabase PG. A gateway SQLite plugin genuinely cannot join/derive from the PG ledger; only the hub can. This was confirmed correct.

---

## 3. Data Model (Supabase Postgres — `org_id text`, `app_ledger` GUC RLS family)

**Org column decision (corrects a v1 bug):** all CRM tables use **`org_id text`** to match `messages.org_id` exactly, so journey joins need no `::text` casts and the tables ride the **same `withOrgCore()` transaction / `app_ledger` role / `app.current_org_id` GUC** the ledger already uses. (The v1 plan's `REFERENCES organization(id)` was wrong on three counts — wrong table, wrong type, a cross-DB FK no table has. Canonical tenant is `public.organizations` uuid via GoTrue; core tables key `tenant_id uuid` with *no* FK; the ledger is the `org_id text` exception we join, so we match it.)

**Every CRM table:** `org_id text NOT NULL`, RLS `ENABLE` + `FORCE`, policy `org_id = current_setting('app.current_org_id', true)` (USING + WITH CHECK), `GRANT … TO app_ledger`, `created_at/updated_at`. **No FK to any org table** (cross-DB convention). FKs only where same-table-family and org-local (e.g. identity → contact).

### `crm_contacts` — the one genuinely new entity (a person aggregated across channels)
```
id uuid pk · org_id text · display_name text (CRM override; falls back to ledger sender_name on read)
· profile_id uuid (OPTIONAL bridge to profiles.id if the contact later becomes a hub user; nullable, NO FK/cascade)
· owner_id uuid (profiles.id, optional — for future per-rep visibility)
· lifecycle_override text (nullable; pins stage, wins over derived stage — §5)
· tags … (see §7) · custom_fields jsonb DEFAULT '{}'
· created_at · updated_at
```
*Not derivable:* no existing table names a human across `(channel, senderId)` tuples, and CRM-only attributes (override name, owner, override stage, custom fields) have no home in the immutable ledger.

### `crm_contact_identities` — maps `(channel, external_id)` → contact (the harvest target + timeline join key)
```
id uuid pk · org_id text · contact_id uuid → crm_contacts(id) ON DELETE CASCADE (real, org-local FK)
· channel text (== messages.channel) · external_id text (== messages.sender_id) · handle text (last-seen, display)
· created_at · UNIQUE(org_id, channel, external_id)   ← the idempotency key
```
Indexes: `(org_id, channel, external_id)` (matches the ledger's index shape → index-driven timeline join), `(contact_id)`.

> **Why not reuse `user_identities`?** It has the right `UNIQUE(provider, externalId)` shape **but a `user_id NOT NULL → profiles.id` FK** (`user-identities.ts:16`). Harvested contacts are anonymous channel senders with **no `profiles` row** — there is nothing to point `user_id` at. So `crm_contact_identities` is `user_identities` *minus the auth coupling*. When a contact later **claims** their channel identity via the existing `/account` OTP flow (which writes `user_identities`), we bridge by setting `crm_contacts.profile_id`. *(Note: `channel_identities` is a Turso/SQLite table keyed `(channel, channelUserId)` — a different store entirely; it cannot share a key or FK with these PG tables. The v1 plan's "three tables already share `UNIQUE(provider, externalId)`" claim was false; the convergence is a real mapping task, scoped here.)*

### `crm_activities` — ONLY non-message events (notes / tag / score / stage / manual)
```
id uuid pk · org_id text · contact_id uuid → crm_contacts(id) ON DELETE CASCADE
· kind text ('note'|'tag_change'|'score'|'stage'|'manual') · body text · actor_id uuid (profiles.id, nullable)
· data jsonb DEFAULT '{}' (old/new score, tag delta, diff) · occurred_at timestamptz DEFAULT now() · created_at
```
Indexes: `(contact_id, occurred_at desc)`, `(org_id, occurred_at desc)`.
*Single `contact_id` FK replaces the v1 polymorphic `*_targets` join* — message activities (which v1's polymorphism existed to attach) are not stored here at all, so the polymorphic machinery is unnecessary.

### `crm_tags` + `crm_contact_tags` (§7)
```
crm_tags         (id uuid pk · org_id text · name text · color text · kind text DEFAULT 'manual' ('manual'|'auto')
                  · rule jsonb (nullable; only for kind='auto') · created_at · created_by uuid · UNIQUE(org_id, name))
crm_contact_tags (contact_id uuid → crm_contacts(id) ON DELETE CASCADE · tag_id uuid → crm_tags(id) ON DELETE CASCADE
                  · applied_at · applied_by uuid (null = system) · PK(contact_id, tag_id))
```

### `crm_contact_stats` — VIEW (derived rollups, idempotent, always correct)
```sql
CREATE VIEW crm_contact_stats AS
SELECT ci.contact_id,
       count(*)                                   AS message_count,
       count(*) FILTER (WHERE m.direction='inbound') AS inbound_count,
       count(DISTINCT m.channel)                  AS channels_used,
       min(COALESCE(m.occurred_at, m.created_at)) AS first_contact_at,
       max(COALESCE(m.occurred_at, m.created_at)) AS last_contact_at
FROM crm_contact_identities ci
JOIN messages m
  ON m.org_id = ci.org_id AND m.channel = ci.channel AND m.sender_id = ci.external_id
WHERE m.is_bot IS NOT TRUE
GROUP BY ci.contact_id;
```
`COALESCE(occurred_at, created_at)` handles the nullable client timestamp. **Counters are never incremented** → immune to replay/concurrency. If this ever gets slow (tens of thousands of contacts × millions of messages), the first optimization is `REFRESH MATERIALIZED VIEW CONCURRENTLY` on the cron tick — still idempotent, no new machinery. Ship the plain view.

### `crm_contact_timeline` — VIEW (the end-to-end journey, zero copy)
Live `UNION ALL` of message interactions (from `messages`, joined on `(org_id, channel, sender_id)`) and non-message events (from `crm_activities`), ordered by time. RLS flows through the base tables under `app_ledger`. This is the literal "journey across all channels" deliverable, never duplicated.

### NEW index required on the ledger
```sql
CREATE INDEX messages_org_channel_sender_idx ON messages (org_id, channel, sender_id);
```
The only DB perf cost of the whole feature — makes the identity join + the RFM aggregate cheap. (Existing indexes are `(org_id, channel, chat_id, occurred_at)` and `(org_id, occurred_at)`; neither covers the `sender_id` join.)

---

## 4. Contact Harvesting — idempotent, set-based, no copy, no watermark

The "harvest" shrinks to: **ensure one `crm_contacts` + `crm_contact_identities` row exists per distinct inbound `(org_id, channel, senderId)` in the ledger.** Nothing is copied; rollups are the `crm_contact_stats` view.

**The whole sync** (in `crm-contacts.service.ts`, run under `withOrgCore`):
1. **Anti-join select** — find senders the ledger knows but CRM doesn't:
   ```sql
   SELECT DISTINCT ON (m.channel, m.sender_id)
          m.channel, m.sender_id, m.sender_name, m.sender_handle
   FROM messages m
   LEFT JOIN crm_contact_identities ci
     ON ci.org_id=m.org_id AND ci.channel=m.channel AND ci.external_id=m.sender_id
   WHERE m.org_id = current_setting('app.current_org_id', true)
     AND m.direction = 'inbound'              -- a contact is someone who CONTACTED the org
     AND m.sender_id IS NOT NULL
     AND COALESCE(m.is_bot, false) = false    -- skip bots
     AND COALESCE(m.is_group, false) = false  -- skip groups in v1 (§8 eligibility)
     AND ci.id IS NULL                         -- the reconciliation: only un-harvested senders
   ORDER BY m.channel, m.sender_id, m.created_at DESC;  -- newest name/handle wins
   ```
2. For each eligible sender: `INSERT crm_contacts (shell) … RETURNING id`, then `INSERT crm_contact_identities … ON CONFLICT (org_id, channel, external_id) DO NOTHING`. A trailing `DELETE FROM crm_contacts WHERE NOT EXISTS (identity)` sweeps the rare concurrent-loser orphan shell. Both are idempotent.

**Why this is concurrency-free by construction:** every write is `ON CONFLICT … DO NOTHING` on the unique key; **no counters are incremented**, so there is nothing to double-count. Manual "Sync now" + cron overlapping → the second is a no-op. No advisory locks, no `FOR UPDATE`, no job-state table. The v1 plan's race conditions are *removed by the schema*, not guarded against.

**Why no watermark:** the `ci.id IS NULL` anti-join **is** the reconciliation — zero stored state, finds exactly the new senders every run, usually returns 0 rows, bounded by distinct senders not message volume. A forward-only `occurredAt` watermark would silently drop late-arriving/out-of-order/NULL-timestamp messages (the v1 bug). If volume ever makes the anti-join's left-join scan expensive, add `created_at` (server-side, monotonic, never null — **not** `occurred_at`) as an *optimization hint* to narrow the `messages` side, but **keep a periodic full anti-join** to guarantee gaps are caught. Acceleration ≠ correctness.

---

## 5. Lifecycle Stages (derived, with manual override)

Six stages, **derived** from ledger signals that already exist (so they self-maintain as messages flow), with a nullable `lifecycle_override` that a user can pin. Effective stage = `COALESCE(lifecycle_override, derived_stage)`. Thresholds default as below; configurable per-org later (`crm_settings.lifecycle jsonb`) — no settings UI in v1.

| Stage | Derived rule (over the contact's messages) |
|---|---|
| **New** | `first_contact_at` within 7d AND `message_count < 3` |
| **Engaged** | `last_contact_at` within 14d AND has ≥1 inbound AND ≥1 outbound |
| **Active** | `last_contact_at` within 30d AND `message_count ≥ 10` |
| **Dormant** | `last_contact_at` 30–90d ago |
| **Churned** | `last_contact_at` > 90d ago |

This is RFM-aligned: stage is a coarse Recency+Frequency bucketing the score refines.

---

## 6. Scoring — RFM, on-read SQL, explainable

**Decision: deterministic RFM, computed on-read. No ML, no LLM-judge in v1.** RFM is the canonical CRM model, computable as a pure SQL aggregate over the ledger, trivially explainable (the whole point of "evaluate the customer"), and sortable cheaply. LLM scoring would be expensive, non-deterministic, unexplainable, and un-sortable — rejected for v1.

**Score 0–100 = `0.5·R + 0.3·F + 0.2·M`** (engagement-first; "M"onetary is proxied by volume + channel diversity + reciprocity since most orgs have no revenue wired yet). Bounded continuous transforms (not quintiles) for stability on small/sparse data:
```
R = 100 · exp(-last_days / 30)                              -- recency decay; today≈100, 30d≈37, 90d≈5
F = 100 · least(1, ln(1+inbound_msgs) / ln(21))            -- ~20 inbound msgs ≈ full marks
M = 100 · (0.60·least(1, ln(1+total_msgs)/ln(51))          -- volume saturates ~50
         + 0.25·least(1, channels_used/3.0)                -- multi-channel presence
         + 0.15·(inbound_msgs / NULLIF(total_msgs,0)))     -- reciprocity (are they replying)
```
Computed in a `crm_rank_contacts(org_id, …filters)` function (or inline SELECT) joining `crm_contact_identities → messages`, returning each contact with `r_score, f_score, m_score, score` **as columns** so the UI shows the breakdown. `WHERE m.is_bot IS NOT TRUE` so the bot's own outbound doesn't distort frequency.

**When:** on-read, every list load. For hundreds–low-thousands of contacts with the new `(org_id, channel, sender_id)` index, this is a few-to-tens of ms — fine for serverless, no worker/cron. **Escape hatch** (not v1): if an org gets huge, add `score/score_components/scored_at` columns and compute at sync time. Explicitly **no BullMQ/JobRunner** — RFM doesn't need it.

**Explainable (reuse existing primitives):** the contact detail panel shows the score via the `/reliability` KaTeX pattern — `MathFormula.svelte` (`{tex, displayMode?, class?}`) with symbolic + numbers-substituted lines, three R/F/M bars, and a `KpiSparkline.svelte` (`{series, rollAvg?, mean, sigma, color?, height?}`) of monthly inbound volume. "Why is this person an 82?" is answerable at a glance.

**Cross-role note:** CRM tables live in the **same `app_ledger` GUC family** as `messages`, so the ranking aggregate joins them in one `withOrgCore` transaction with no cross-role gymnastics. (If a future split is needed, a `SECURITY DEFINER` function is the clean encapsulation — not required for v1.)

---

## 7. Tagging — manual tags + auto-tags as live filters

- **Manual tags:** user applies/removes a label → insert/delete in `crm_contact_tags`. Multi-select in the table (Zag.js), chips in the detail panel.
- **Auto-tags (the killer simplification):** an auto-tag is a `crm_tags` row with `kind='auto'` and a tiny `rule jsonb` that is a **filter predicate over the computed score row** — evaluated **live in the same ranking SELECT**, never stored. So auto-tags are *always correct by construction* (a contact crossing score 80 "becomes VIP" the instant the next load recomputes), cost nothing, and need no sync job. The rule engine is ~30 lines: a **whitelist** of fields (`score, r_score, f_score, m_score, last_days, total_msgs, inbound_msgs, channels_used, reciprocity, stage`) → SQL fragment, with `all`/`any` nesting. No DSL, no workflow engine.
  ```jsonc
  { "field": "score", "op": ">=", "value": 80 }                                   // "VIP"
  { "field": "last_days", "op": ">", "value": 30 }                                // "Dormant"
  { "all": [ {"field":"score","op":">=","value":70}, {"field":"reciprocity","op":">=","value":0.4} ] }  // "Hot lead"
  ```
  v1: `crm_contact_tags` only ever holds **manual** tags; auto-tags live as rule rows evaluated on read. (v2 optional: a reconciliation `INSERT … SELECT … ON CONFLICT` to materialize auto-tags if other systems need to query them.)

---

## 8. Ingestion Triggers + Eligibility (honest, given serverless)

**Triggers:**
| Trigger | Mechanism | Reality |
|---|---|---|
| **Manual "Sync now"** | `POST /api/crm/contacts/sync` → `syncContactsFromLedger(orgId)`, bounded, returns count | works today |
| **Lazy on-read** | `GET /api/crm/contacts` runs the sync (cheap anti-join, usually a no-op) before the list query; soft-debounce via an advisory `crm_sync_state(org_id, last_synced_at)` row (skip if synced <60s ago — advisory only, NOT a correctness watermark) | works today; self-healing |
| **Vercel cron** | NEW `vercel.json` `{"crons":[{"path":"/api/crm/contacts/sync-all","schedule":"*/15 * * * *"}]}` → fan-out per org | greenfield; mind `maxDuration` (Hobby ~10–60s, Pro default 60s, up to 300s via `export const maxDuration`). Job is resumable → a timed-out run is finished by the next tick or next on-read sync, no corruption |

**Dropped: the v1 "real-time hook after `insertMessages()`."** Confirmed impossible — ingest runs in a Vercel function with no `waitUntil`/queue; a floating async after the response is killed on freeze. **v2 near-real-time (honest, not free):** the **gateway** is a long-lived process that already flushes ledger batches to the hub; it can emit a lightweight `contact-touch {orgId, channel, senderId}` event to a hub endpoint doing the single-row upsert. New gateway code path + hub endpoint — scoped as v2, not pretended free.

**Row eligibility (which ledger rows yield contacts):**
- **Inbound only** (`direction='inbound'`) — a contact is someone who *contacted the org*; outbound is the org's own agent.
- **Skip bots** (`COALESCE(is_bot,false)=false`) — nullable flag coalesced to false (unknown treated as human).
- **Skip same-org agents** — already excluded by `direction='inbound'` (org agents are outbound); add an explicit guard only if agent-to-agent *inbound* traffic ever appears.
- **`sender_id` present** — no id, no stable identity to key on.
- **Groups SKIP in v1** (`COALESCE(is_group,false)=false`) — `sender_id` semantics in group chats vary by channel (sometimes the per-person participant, sometimes the chat id), so creating contacts from groups risks group-as-contact pollution. **v2:** once we confirm per-channel that `is_group=true` rows carry a real per-participant `sender_id` distinct from `chat_id`, enable group participants. (The journey timeline can still *show* group messages read-side without making the group a contact.)

---

## 9. Security, RLS, Privacy & Retention

**RLS (mandatory):**
- All CRM tables: `org_id text`, RLS `ENABLE` + `FORCE`, policy `org_id = current_setting('app.current_org_id', true)`, granted to `app_ledger`.
- **Every CRM read/write MUST route through `withOrgCore`** (`with-org-core.ts:38`). The hub's default `postgres` connection has **`rolbypassrls=true`** — any CRM query that uses `getCoreDb()` directly **silently leaks across orgs**. Rule: CRM services may **not** import `getCoreDb`; add a grep/lint guard + a cross-org isolation test (mirror `with-org-core.test.ts`).
- API routes: `requireAuth` + org membership via **GoTrue `organization_members`** (not Better Auth `member`), plus explicit per-record org checks for mutations — honoring the IDOR lesson already fixed in this repo (`api/flows/+server.ts:82`); never a `tenant_id == tenantId` no-op gate.

**Privacy & retention (NEW — was absent in v1; the lead tenant FaceSculptors is a medical clinic handling patients + DNI + insurance):**
- **Deletion / right-to-erasure:** `crm_contacts.deleted_at timestamptz` soft-delete + a hard-delete path ("Forget this contact" → removes `crm_contacts` + identities + `crm_activities`; the underlying ledger rows are a separate retention domain owned by the gateway/messages subsystem, noted for the user). Required before any real customer data lands.
- **Consent / lawful basis:** harvesting inbound contacts needs a documented lawful-basis position **signed off by the user** before go-live. v1 ships the per-org ingestion **blocklist** (excluded handles/domains) as the minimum opt-out control.
- **Per-user/role visibility:** v1 is **org-wide visibility** (every member sees all contacts) — stated explicitly as a known limitation. For a clinic this means any staffer sees any patient's timeline; `owner_id` is modeled but **not yet enforced**. Per-rep/role RLS is a v2 item flagged with its privacy implication, not silently shipped.
- **Audit:** access to contact journeys for medical tenants should be logged (v2).

---

## 10. Phasing (with rough sizing — v1 = P0–P4)

> Sizing is a planning estimate for one engineer, not a commitment; the reuse-first design is what keeps it small. **v1 is P0–P4.**

| Phase | Deliverable | Rough size |
|---|---|---|
| **P0** | `crm.ts` Drizzle schema + hand-written migration (`crm_contacts`, `crm_contact_identities`, `crm_activities`, `crm_tags`, `crm_contact_tags`, RLS policies, the `messages_org_channel_sender_idx`, `crm_contact_stats` + `crm_contact_timeline` views). Confirm `app_ledger` role exists in target DB. | ~1–2 days |
| **P1** | `crm-contacts.service.ts`: `syncContactsFromLedger` (anti-join + ON CONFLICT + orphan sweep) + ranked read (RFM SQL) via `withOrgCore`; `/api/crm/contacts` (+ `/sync`) with the `getCoreDb` ban + isolation test | ~2–3 days |
| **P2** | ★ **The product:** `/crm` ranked contact list (TanStack table, sort by score, filter bar: stage/tag/channel/score-range, channel icons, last-contact, `KpiSparkline` volume column) + Plugins-nav entry | ~3–4 days |
| **P3** | Contact detail: **journey timeline** (live `crm_contact_timeline`) + score breakdown (`MathFormula` ×2 + R/F/M bars) + notes (`crm_activities` note) | ~2–3 days |
| **P4** | Tags: manual create/apply/remove (Zag multiselect) + auto-tags as live filter rules; lifecycle `lifecycle_override` edit; soft-delete + "Forget contact" | ~2–3 days |
| **P5 (v2)** | Vercel cron (`vercel.json` + fan-out) + advisory debounce; header KPI strip (`/reliability` pattern); configurable thresholds | stretch |
| **P6 (v2)** | Per-rep/role visibility (owner-scoped RLS) + audit logging for medical tenants | stretch |
| **P7 (v2)** | AI layer (gated, pull/cached/on-demand): journey summary, suggested-tag, sentiment-as-4th-score-component | stretch |
| **P8 (v2)** | Deals/pipelines (Kanban; `amount_micros bigint + currency_code text`, **not** jsonb), Companies, identity claim→`profile_id` bridge automation, cross-channel dedup/merge UI, gateway `contact-touch` near-real-time event, FaceSculptors patient import (dedup by phone) | stretch / on-demand |

**Cross-repo note (P0 honesty):** the hub consumes `@minion-stack/db` as a **vendored tarball** (`minion_hub/deps/*-pg.tgz`) and `@minion-stack/shared` from npm — both are *publish-then-vendor*, not workspace symlinks. The `crm.ts` schema ships in the `-pg` db tarball; P0 includes the **bump → pack → re-vendor → reinstall** step as an explicit gate. **`ContactIdentity` stays a hub-local type for v1** (no `@minion-stack/shared` promotion / changeset / two-merge publish dance until the gateway actually needs it).

---

## 11. The MVP slice (smallest thing that proves the hypothesis)

Ship exactly this, watch the user actually rank/tag real customers, *then* expand:

1. **DB:** `crm_contacts` + `crm_contact_identities` + the `messages_org_channel_sender_idx` index + `crm_contact_stats` view + the RFM ranking SELECT. (Tags/activities tables can land with it but the *slice* is contacts + score.)
2. **Sync:** `syncContactsFromLedger` (anti-join, idempotent) + manual "Sync now".
3. **List:** `/crm` ranked by score DESC, with stage pill, channel icons, last-contact, volume sparkline.
4. **Detail:** journey timeline (live over `messages`) + score breakdown.

≈ 2 tables + 1 index + 1 view + 1 SQL function + 2 routes, reusing the ledger, RLS, `MathFormula`, `KpiSparkline`, TanStack, Zag. Manual tags, auto-tags, the KPI strip, cron, AI, deals are all additive on top **without restructuring anything**.

---

## 12. Decisions

1. **Architecture** — ✅ Hub-native PG, `org_id text`, `withOrgCore`/`app_ledger` GUC RLS family (joins the ledger directly).
2. **Journey** — ✅ **Derived live from the `messages` ledger** (view), never copied.
3. **Scoring** — ✅ **On-read RFM SQL**, explainable via `MathFormula`/`KpiSparkline`. No workers/queues in v1.
4. **Contacts** — ✅ Inbound, non-bot, non-group senders to registered channels; idempotent set-based anti-join sync (no counters, no watermark, no locks).
5. **Tags** — ✅ Manual (join table) + auto-tags as live filter rules.
6. **v1 scope** — ✅ Contact + journey + score + tags (P0–P4). Deals/companies/notes-tasks → v2/stretch.
7. **Triggers** — ✅ Manual + lazy on-read + cron. Real-time hook dropped (v2 gateway event).
8. **Privacy** — ✅ Soft-delete + "Forget contact" + blocklist in v1; consent sign-off required pre-go-live; org-wide visibility a known v1 limitation; per-role + audit in v2.

---

## 13. Non-Goals (v1)

- TWENTY's custom-OBJECTS metadata engine (dynamic DDL + GraphQL recompile), schema-per-workspace, dual GraphQL, permission-aware ORM fork. *(Custom **fields** are still cheaply available via `custom_fields jsonb`; only user-defined object **types** are out.)*
- BullMQ/Redis worker fleet / `JobRunner` seam — **deleted from v1**; on-read SQL + idempotent set-based sync make it unnecessary at this scale. Reconsider only if a genuinely durable async job lands (and host on netcup beside flows-runner with a dedicated `noeviction`+AOF Valkey).
- Copying the ledger into a CRM activity table.
- Deals/pipelines, Companies, Notes/Tasks polymorphic targets, saved views — v2/stretch.
- Per-user/role visibility, AI scoring/summaries, group-participant contacts, gateway near-real-time event, FaceSculptors patient import — v2.
- OR-filter groups, calendar view — v1 UI is single-sort + AND-filters.
