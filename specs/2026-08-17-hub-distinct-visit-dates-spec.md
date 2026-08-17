---
id: 2026-08-17-hub-distinct-visit-dates-spec
title: "CRM funnel — count distinct visit dates on the party spine so Loyal auto-advances"
stage: spec
status: draft
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-hub-distinct-visit-dates
verdict: changes_requested
repos: [minion_hub, minion-meta]
tags: [logic, test]
type: fix
---

# CRM funnel — count distinct visit dates on the party spine

**Owner surface:** `minion_hub` — `src/server/services/crm-contacts.service.ts` (the stub at
`:952` and the `_funnel` writer neighbourhood), `src/server/services/crm-finance.service.ts`
(the existing party-spine → `fin_invoices` bridge), a new pure module
`src/server/services/crm-visits.ts` (the seam — see §3), `src/lib/crm/crm-funnel.ts`
(the stage/floor derivation), `src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts`
(the live caller), and the CRM service/route tests
**Design ancestors:**
[`2026-07-22-personal-org-differentiation-spec`](2026-07-22-personal-org-differentiation-spec.md)
(names the funnel axis this spec completes — "CRM: funnel axis = `crm_contacts.custom_fields._funnel`
(`lead→opportunity→customer→loyal`; `crm-funnel.ts`, `CrmFunnel*.svelte`, `FunnelStagePill`);
revenue ranking via `crm-finance.service.ts` (party-spine join to `fin_invoices`)" — i.e. the
join this spec reuses already exists),
[`2026-08-13-crm-customers-server-pagination-spec`](2026-08-13-crm-customers-server-pagination-spec.md)
(approved, pass 2 — its S2 ports `effectiveFunnelStage` + `financeFloorStage` into a SQL `CASE`
with a parity truth-table test; **the second consumer of the Loyal criterion** — see ⚠️ A4),
[`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md)
(the deposit-classification rule module — a deposit line is money for a *future* visit, so its
polarity decides whether a deposit invoice is a visit date; also the `crm-*.service.ts`
contention warning),
[`2026-08-03-crm-icp-score-spec`](2026-08-03-crm-icp-score-spec.md) (`crm-scoring.ts` as the
"pure logic in TS, ranking in SQL" precedent; `crm-finance.service.ts` as the finance bridge),
[`2026-07-06-hub-tanstack-ai-assessment`](2026-07-06-hub-tanstack-ai-assessment.md) §"CRM batch
jobs" (documents `crm/contacts/[id]/funnel/analyze/+server.ts:76` as a `generateText` +
regex-`JSON.parse` best-effort job with silent-skip error handling — the caller's real shape)
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
every slice below is tagged `logic`/`test`: mandatory red-state TDD, **no** UI-governance checks
(no `.svelte` file is edited in any slice — see §5)

---

## 0. Product

From the approved proposal `2026-08-17-hub-distinct-visit-dates`, verbatim:

> ## Problem
>
> crm-contacts.service.ts:952 returns 0 (STUB) while the live analyze endpoint calls it — Loyal
> auto-detection never fires for any org; only manual override reaches it.
>
> ## Definition of done
>
> Count distinct visit dates from fin_invoices/scheduling via the party spine; test seeds 2+ dates
> and asserts count + resulting stage.
>
> ## Out of scope
>
> Other funnel stages; UI.

**What an affected org sees today.** The funnel has four stages
(`lead → opportunity → customer → loyal`). Three of them advance on their own from evidence the
hub already has; the fourth cannot, because the only signal that distinguishes a repeat customer
from a one-time buyer is hardwired to `0`. The visible consequences:

1. **Nobody is ever Loyal unless a human types it.** The stage exists in the UI
   (`FunnelStagePill`, `CrmFunnel*.svelte`), in the value domain, and in the analyze endpoint's
   contract — and is unreachable by the machinery that fills the other three. An org's most
   valuable segment reads as empty.
2. **The analyze endpoint lies quietly.** It is a best-effort LLM job with silent-skip error
   handling (`2026-07-06-hub-tanstack-ai-assessment`: `generateText` + `text.match(/…/)` +
   `JSON.parse`, failures dropped). A signal pinned to `0` produces no error, no log, no empty
   state — just a stage that never appears. This is the worst failure shape available: a feature
   that looks implemented from every surface except its output.
3. **A stub, not a missing feature.** The function is called from a live endpoint. Every run pays
   whatever the call costs and discards the answer. That is why this is a `fix`, not a feature.

**Why three slices and not a one-line query.** "Count distinct visit dates" is four decisions
wearing one sentence, and every one of them is capable of promoting the wrong contacts:

- **What is a visit.** A `sched_bookings` row is an *intent*, not an attendance: verified in this
  checkout, the table carries a `status` (default `'accepted'`) and a future `start_time`. Counting
  cancelled or not-yet-happened bookings makes a no-show Loyal. A `fin_invoices` row is closer to
  evidence, but `issued_at` is **nullable** and a voided invoice is not a visit — and per
  `2026-08-17-hub-reserva-keyword-config-spec` a deposit line is money for a visit that has not
  happened yet.
- **Which spine, exactly.** There is no single `party_id` join. Verified here:
  `fin_invoices` has **no `party_id` column** — the bridge is
  `fin_invoices.client_id → fin_clients.id → fin_clients.party_id`, and `client_id` is *nullable*
  (`20260617141000_fin_invoice_client_fk.sql` backfilled it by matching `(org, provider,
  doc_number)`, so any invoice whose client row was absent still has `null`). `sched_bookings`
  carries **two** nullable paths (`party_id` *and* `crm_contact_id`). Pick one path and the count
  silently undercounts; invent a new path and it disagrees with the revenue numbers rendered next
  to it (⚠️ A3).
- **Which timezone.** Both source columns are `timestamptz`. "Distinct dates" is meaningless
  without a zone, and the choice is not cosmetic: two appointments on one Lima evening bucket as
  **two** distinct dates in UTC and **one** in `America/Lima` when the events straddle UTC
  midnight. UTC bucketing therefore promotes
  single-day double-appointments to Loyal (⚠️ A2).
- **Who else reads the answer.** `2026-08-13-crm-customers-server-pagination-spec` S2 (approved)
  ports the funnel derivation into SQL for the roster. If Loyal depends on a number only the
  per-contact endpoint can compute, `/crm/customers` and the contact detail page disagree about
  who is Loyal (⚠️ A4).

Slice 1 makes the counting correct and provable in isolation. Slice 2 delivers the proposal's
headline (the stage advances). Slice 3 makes the one number one number, for every consumer.

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion_hub/` is not checked out** (the meta-repo
`.gitignore` excludes every subproject; verified on disk here — there is no `src/server/services/`
at all). Every path, line number and symbol *inside minion_hub* is carried from the proposal
(written today — strong) or from the CRM specs of 2026-06 → 2026-08 (weeks old; **line numbers have
moved**). Treat them as leads, not fact. Slice 0 turns them into fact; if something moved, correct
§3 of this spec in the same commit rather than implementing against a different file in silence.

### What *was* independently verified in this checkout (the meta-repo owns the SQL)

These are facts, not leads — `supabase/migrations/` lives here:

| Fact | Evidence |
|---|---|
| `fin_invoices (org_id, provider, provider_ref, number, issued_at **nullable**, client_doc_number, status, total, …)`; indexes `(org_id, client_doc_number)` and `(org_id, issued_at)` | `20260617120000_finance.sql` |
| `fin_invoices.client_id uuid → fin_clients(id)` — **nullable**, added later and backfilled only where `(org, provider, doc_number)` matched. Header: *"Analytics/CRM-bridge join on this FK instead of the client_doc_number string"* | `20260617141000_fin_invoice_client_fk.sql` |
| `sched_bookings (org_id, uid, event_type_id, resource_id, start_time, end_time, status default 'accepted', crm_contact_id **nullable**, …)`; indexes `(org_id, start_time)`, `(org_id, status)`, `(crm_contact_id)` | `20260617150000_scheduling.sql` |
| `parties (id, org_id, type, name, phone9, email, doc_type, doc_number, …)`; `party_id` added to **`crm_contacts`, `fin_clients`, `sched_bookings`** — and *not* to `fin_invoices` | `20260622193500_party.sql` |
| `phone9` is explicitly *"a BRIDGE, NOT an identity"*; `doc_number` is the only uniquely-enforced key | same file, header comment |
| Every one of these tables is `force row level security`, scoped by the `app.current_org_id` GUC ⇒ any read is already org-isolated by the database, and must run inside `withOrgCore` | all of the above |
| `crm_contacts (…, lifecycle_override, custom_fields jsonb, deleted_at, …)` — `_funnel` lives in `custom_fields`; `lifecycle_override` is the *separate* manual pin | `20260614031500_crm.sql` |
| **No org-level timezone column exists** anywhere in these migrations. The only stored timezones are `sched_resources.timezone` / `sched_schedules.timezone`, both `default 'America/Lima'` | grep across `supabase/migrations/` |
| No second copy of this logic outside `minion_hub`: `grep -rniE 'funnel\|visitDate\|distinct_visit' packages ops scripts langgraph-server` → **zero hits** | this checkout |

The nullable `fin_invoices.client_id`, the missing `fin_invoices.party_id`, the dual booking paths
and the absent org timezone are the four facts that turn this from a one-liner into a spec.

### Six carried claims, load-bearing

1. **A stub exists at `crm-contacts.service.ts:952` and returns `0`** (proposal). Its exact name,
   signature and arity are unknown from here — `distinctVisitDates(contactId)` is the working
   name. S0 records the real one; do not rename it in S1 (a rename plus a behavior change in one
   commit is unreviewable).
2. **The live caller is `src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts`**
   (`2026-07-06-hub-tanstack-ai-assessment` names it with a line number). It is an LLM job with
   regex JSON parsing and silent-skip failure handling. **Whether the Loyal decision is made by
   the model or by a deterministic rule around it is the single most important thing S0 must
   read** — it decides whether S2's DoD is testable without a live LLM (see A7).
3. **`crm-finance.service.ts` already joins the party spine to `fin_invoices`**
   (`2026-07-22-personal-org-differentiation-spec`) and exposes a batched, cached
   `contactFinanceMap(ctx)` / `ContactFinance` shape (`2026-08-13-crm-customers-server-pagination-spec`
   S3). **S1 extends that query; it does not write a second one.** The join *it* uses (`client_id`
   vs `client_doc_number`) is the join this spec must use — consistency with the revenue shown
   beside the stage beats theoretical completeness.
4. **`crm-funnel.ts` exports `effectiveFunnelStage` and `financeFloorStage`** and the `_funnel`
   value domain is closed and finite (`2026-08-13-crm-customers-server-pagination-spec` S2 + its
   `rg "_funnel'" src/lib/crm/crm-funnel.ts` recon line). If a *floor* mechanism already exists,
   Loyal belongs in it — see A6.
5. **`crm_contacts.custom_fields._funnel` is written from `crm-contacts.service.ts:~1009` by a
   read-modify-write** (`proposals/2026-08-17-hub-funnel-atomic-write`, **status `draft`** — not
   approved, not fixed). This spec *amplifies* that defect by making auto-advance fire at all; see
   ⚠️ A5. It does not fix it.
6. **A test home exists** — `crm-finance.service.test.ts` is named as an existing file by
   `specs/hub-erp-roadmap/P0-write-hardening.md` ("look at `crm-finance.service.test.ts` first and
   copy its harness approach"). Reuse its DB-stubbing/seeding harness rather than inventing one.
   If `crm-contacts` has no route-level test for the analyze endpoint, create one in S2.

**Branch discrepancy to settle before branching.** AGENTS.md's project map says hub's branch is
`dev`; `2026-08-13-crm-customers-server-pagination-spec` states `origin/dev` was **deleted** and
the live base is `origin/master`. Run `git -C minion_hub branch -r` and branch off whatever is
actually live. Do not create or resurrect a branch to match the docs.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_hub
git branch -r                                                    # settle the base branch (above)

# 1. The stub itself: real name, signature, callers                         ← claim 1
rg -n -B20 -A20 'STUB|distinctVisitDates|visit' src/server/services/crm-contacts.service.ts
rg -n 'distinctVisitDates|visitDates' src/ scripts/ --type ts    # EVERY caller, not just analyze

# 2. The live caller: is the Loyal decision deterministic or the model's?    ← claim 2, DECISIVE (A7)
rg -n -B10 -A60 'loyal' 'src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts'
sed -n '1,140p' 'src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts'
#    Record: (a) is the visit count injected into the PROMPT, used in an if/else, or both?
#            (b) is there already a threshold literal (>= 2? >= 3?) — if so, THAT is the criterion;
#                this spec does not invent one
#            (c) does it write `_funnel` unconditionally or only on change?                (A5)
#            (d) does it respect the explicit `lifecycle_override` pin, and is there any
#                separate provenance that marks a stored `_funnel` value as manual?       (A6)

# 3. The existing party-spine finance join — extend it, do not fork it       ← claim 3
rg -n -B10 -A40 'fin_invoices' src/server/services/crm-finance.service.ts
rg -n 'client_id|client_doc_number|party_id|contactFinanceMap|ContactFinance' \
   src/server/services/crm-finance.service.ts
#    Record WHICH join it uses (client_id FK vs doc_number string) — S1 must match it exactly.

# 4. Bookings: which path(s) are actually populated, and what statuses exist
rg -n 'sched_bookings' src/server/services/*.ts src/server/db/schema/*.ts
#    dev DB, read-only — these two queries decide S1's predicate:
#      select status, count(*) from sched_bookings group by 1 order by 2 desc;
#      select count(*) filter (where party_id is not null)      as with_party,
#             count(*) filter (where crm_contact_id is not null) as with_contact,
#             count(*) filter (where party_id is null and crm_contact_id is null) as orphan,
#             count(*) from sched_bookings;
#      select count(*) filter (where client_id is null) as no_client_fk,
#             count(*) filter (where issued_at is null) as no_date,
#             count(*) from fin_invoices;
#      select status, count(*) from fin_invoices group by 1 order by 2 desc;

# 5. The funnel derivation + its second consumer                            ← claims 4, A4
rg -n "_funnel'" src/lib/crm/crm-funnel.ts                       # the closed value domain
rg -n -A30 'financeFloorStage|effectiveFunnelStage' src/lib/crm/crm-funnel.ts
ls src/server/services/crm-funnel-parity.test.ts 2>/dev/null     # has pagination S2 landed?
rg -n 'funnel_stage' src/server/services/crm-contacts.service.ts # the SQL CASE, if it exists yet

# 6. The `_funnel` writer (A5) — read it, do not touch it
rg -n -B15 -A25 'customFields' src/server/services/crm-contacts.service.ts | rg -n -C10 '_funnel'

# 7. Timezone: is there an org timezone anywhere in hub?                     ← A2
rg -n -i "timezone|'America/Lima'|orgTimezone|tz\b" src/server src/lib --type ts | head -30

# 8. Module availability + org kind (A8)
rg -n 'effectiveModuleEnabled|app_modules|orgKind' src/server --type ts | head

# 9. Test homes + harness
ls src/server/services/crm-*.test.ts
rg -n 'seed|fixture|toSQL' src/server/services/crm-finance.service.test.ts | head
```

Record the actuals — **especially (a) whether the Loyal decision is deterministic or model-made,
(b) which invoice join the finance bridge uses, (c) the real `sched_bookings.status` domain, and
(d) whether any org timezone exists** — in the PR description. Nothing in Slice 0 changes files.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (a correct, tested visit count; funnel untouched)
                 ─▶ S2 (Loyal auto-advances — the proposal's DoD) ─▶ S3 (one number for every consumer + guard)
```

Strictly sequential — S1 builds the number S2 acts on and S3 shares. **S1 + S2 together satisfy
the proposal's DoD sentence** ("count distinct visit dates from fin_invoices/scheduling via the
party spine; test seeds 2+ dates and asserts count + resulting stage"); S3 is what keeps the
roster and the contact page from disagreeing the week after. If the wave cuts scope, cut after S2
— but then the AGENTS.md **open-items ledger** rule applies: a `TODO(handoff):` at the SQL funnel
derivation (or in `crm-funnel-parity.test.ts`) plus an append to the source proposal saying the
roster's Loyal criterion is still visit-blind.

---

### S1 — A correct visit count on the existing spine; zero funnel behavior change

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** `distinct visit dates` becomes a real, batched, timezone-explicit number with tests that
pin every edge the schema allows — while the funnel still behaves exactly as today. The stub keeps
returning `0` at the end of this slice. That separation is deliberate: it makes S1's tests a
statement about *counting*, which S2 can then trust when it changes *behavior*.

**Do:**
- Create `src/server/services/crm-visits.ts` — side-effect-free and without DB execution,
  alongside the `crm-scoring.ts` /
  `crm-deposit-rule.ts` precedent. Exports:
  - `type VisitSource = 'invoice' | 'booking'` and
    `type VisitDate = { date: string; source: VisitSource }` (`date` = `YYYY-MM-DD`).
  - `const VISIT_DATE_TZ` — the resolved bucketing zone (see A2). If S0 found an org timezone,
    this is a *parameter* threaded from the caller and there is no constant; if it found none,
    it is a named constant `'America/Lima'` matching the `sched_*` schema default, with a comment
    saying so and a `TODO(handoff):` pointing at the follow-up proposal. **Never `UTC` by default
    and never `date_trunc('day', col)` without `at time zone`.**
  - `countDistinctVisitDates(rows: VisitDate[]): number` — dedupes **across** sources, not per
    source. An invoice and a booking on the same calendar day are **one** visit. This is the whole
    reason the metric is date-based rather than row-based.
  - `visitDateSql(col, tz): SQL` — the single place that renders `(${col} at time zone ${tz})::date`.
    Bind `tz` as a parameter; never interpolate it into the string.
- Extend the **existing** finance bridge (`crm-finance.service.ts`) with a set-based
  `contactVisitDates(ctx, contactIds)` — or, preferred if S0 confirms the shape, an additive
  `distinctVisitDates: number` field on `ContactFinance` / `contactFinanceMap(ctx)`, which is
  already batched and cached. **One query for N contacts, never one per contact** (A9). The query:
  - **Invoices** — reuse the join `crm-finance.service.ts` already uses (S0 records it: `client_id`
    FK or `client_doc_number`). Predicates: `issued_at is not null`; exclude the void/cancelled
    statuses S0 enumerated (name them in a `const` array, do not inline a string); count
    `visitDateSql(issued_at, tz)`.
  - **Bookings** — union **both** nullable paths (`sched_bookings.party_id = <contact party>` **or**
    `sched_bookings.crm_contact_id = <contact id>`) because S0's counts will show both are
    populated in practice. Predicates: status ∈ an attended set confirmed from an authoritative
    scheduling status definition in code/docs (S0's database enumeration discovers values but
    does not prove attendance semantics). If no status unambiguously means attended, stop for the
    product decision flagged in A1 rather than treating `accepted` as attended. *Exclude*
    cancelled/rejected/no-show — an intent is not a visit) **and** `start_time <= now()` (a booking
    next Tuesday is not a visit). Count `visitDateSql(start_time, tz)`.
  - Dedupe across both in SQL: `select count(distinct d) from ( … union all … ) t` — not
    `count(distinct a) + count(distinct b)`.
  - All-time window, no lookback. Windowing ("2 visits in 24 months") is a product decision that
    the proposal does not make; §5 excludes it explicitly so nobody invents one mid-implementation.
- **Do not touch the stub, the analyze endpoint, or `crm-funnel.ts` in this slice.** Leave
  `TODO(handoff): real count lands in S2 of 2026-08-17-hub-distinct-visit-dates-spec` on the stub,
  removed by S2.

**Files:** `src/server/services/crm-visits.ts` (new),
`src/server/services/crm-finance.service.ts`, `src/server/services/crm-visits.test.ts` (new),
`src/server/services/crm-finance.service.test.ts`.

**Verification criteria (automated):**
```bash
bun run vitest run src/server/services/crm-visits src/server/services/crm-finance
#   red-state first (G3): each case shown failing before the implementation lands
#   - COUNT: a contact seeded with 2 invoices on DIFFERENT days → 2      ← the proposal's DoD clause 1
#   - DEDUPE: 2 invoices on the SAME day → 1; an invoice AND a booking on the same day → 1
#   - CROSS-SOURCE: 1 invoice on day A + 1 booking on day B → 2
#   - TZ (A2): two events at 18:00 and 20:00 the same America/Lima day (spanning UTC midnight)
#     → 1, NOT 2. This single assertion is why the tz is explicit.
#   - EXCLUDED: null issued_at → not counted; a void/cancelled invoice status → not counted;
#     a cancelled/no-show booking → not counted; a booking with start_time in the FUTURE → not counted
#   - SPINE (A3): an invoice reachable only via client_doc_number (client_id null) is handled the
#     same way the finance bridge already handles it — assert the SAME row set as the existing
#     revenue query for the same fixture (set equality), so visits and revenue can never disagree
#   - BOOKING PATHS: a booking linked only by crm_contact_id counts; only by party_id counts;
#     linked by both counts ONCE
#   - EMPTY: a contact with party_id null and no bookings → 0, no throw
#   - BATCHING (A9): contactVisitDates(ctx, [50 ids]) issues ONE query (assert on the stubbed
#     driver's call count, not on timing)
bun run vitest run                                # full hub suite green; no new skips
bun run check                                     # 0 errors / 0 warnings
rg -n 'distinctVisitDates' src/server/services/crm-contacts.service.ts   # → still the stub + its TODO
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && exit 1   # zero DDL
```

---

### S2 — Loyal auto-advances

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** the proposal's headline. The stub is deleted, the analyze endpoint sees the real number,
and a contact with 2+ visit dates reaches Loyal without a human typing it — deterministically,
provably, and without demoting or overwriting anything a human set.

**Do:**
- Delete the stub body; the function returns the S1 number (from `contactFinanceMap` /
  `contactVisitDates` — resolved **once per call**, not per row, not inside a loop). Remove S1's
  `TODO(handoff):`.
- **Make the Loyal decision deterministic** (⚠️ A7). Per S0's reading of the analyze endpoint:
  - Set the criterion to the proposal's explicit floor:
    `LOYAL_MIN_VISIT_DATES = 2`. If S0 finds a different existing threshold, stop and reconcile
    that product contradiction rather than preserving one value while testing another.
  - If the decision is currently the *model's* (the count is only injected into the prompt), add a
    deterministic floor **after** the model's answer: `visitDates >= LOYAL_MIN_VISIT_DATES` ⇒ at
    least `loyal`. Rationale, to be written into the code comment: a deterministic input deserves a
    deterministic consequence, the endpoint's LLM path is explicitly best-effort with silent-skip
    failure handling, and a test that needs a live model is not a test. The model may still enrich
    or explain; it may not gate.
- **Three safety rules, each with its own test:**
  1. **Forward only.** Auto-advance never demotes. A contact stored as `loyal` whose invoice was
     later voided is not silently pushed back to `customer` by this path.
  2. **Never overwrite the explicit manual pin.** A non-null `lifecycle_override` wins over
     auto-detection. Do not call an arbitrary stored `_funnel` value "manual": the verified schema
     has no provenance that distinguishes a human-written `_funnel` from an automatic write. If
     S0 finds such provenance, add its exact rule and a test before implementation.
  3. **Write only on change.** If the computed stage equals the stored one, issue **no** write.
     This is one guard clause and it directly bounds ⚠️ A5's blast radius — without it, turning
     auto-advance on turns a rarely-exercised unsafe read-modify-write into a per-analyze one.
- If S0 shows the analyze endpoint is the *only* caller, say so in the PR; if there are others
  (a tick, a tool, a report), each becomes a named test case rather than a surprise.

**Files:** `src/server/services/crm-contacts.service.ts`,
`src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts`, `src/lib/crm/crm-funnel.ts`
(the threshold constant / floor, if that is where the derivation lives),
`src/server/services/crm-contacts.test.ts`, the analyze route's test file (create if absent).

**Verification criteria (automated):**
```bash
bun run vitest run src/server/services/crm-contacts src/routes/api/crm/contacts
#   red-state first (G3)
#   - THE PROPOSAL'S DoD, one test: seed a contact with 2 visit dates → the service reports 2 AND
#     the resulting stage is 'loyal'                        ← "asserts count + resulting stage"
#   - 1 visit date → NOT loyal (stays at whatever the other three stages derive)
#   - 0 visit dates, party_id null → NOT loyal, no throw
#   - NO LIVE LLM anywhere in the suite: the model client is stubbed; the stage assertion passes
#     with the stub returning garbage AND with it throwing        ← A7, the deterministic floor
#   - forward-only: stored 'loyal' + 0 current visit dates → stays 'loyal' (no demotion write)
#   - manual wins: lifecycle_override is not overwritten by auto-detection
#   - write-only-on-change: stage already 'loyal' → ZERO update statements (assert on the stubbed
#     driver, not on the returned value)                           ← bounds A5
rg -n 'STUB|return 0' src/server/services/crm-contacts.service.ts   # → no stub at the visit-count site
rg -n 'TODO\(handoff\)' src/server/services/crm-contacts.service.ts # → S1's marker is gone
bun run vitest run                                # full suite green
bun run check
```

---

### S3 — One number for every consumer, plus the anti-recurrence guard

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** `/crm/customers` and the contact page agree about who is Loyal; the count cannot become
an N+1; and nobody can re-stub a signal without a red test.

**Do:**
- **Roster parity (⚠️ A4).** Per S0, one of two paths:
  - *`crm-funnel-parity.test.ts` and the SQL `funnel_stage` CASE already exist* (pagination S2
    landed): add `distinct_visit_dates` to the finance CTE and the Loyal branch to the CASE, then
    extend the existing truth table with the visit-count axis so the SQL and TS answers are proven
    equal for every combination. The parity test is the deliverable, not the CASE.
  - *They do not exist yet*: S3 is blocked on the pagination spec's S2. Record the two ledger
    entries required by AGENTS.md, but do not pass this spec's ship gate while the roster and
    per-contact derivations disagree. This spec's stated goal is cross-consumer consistency, so a
    disclosed inconsistency is not an alternative definition of done.
- **Anti-recurrence guard.** A test that reads `crm-contacts.service.ts` (and the other CRM
  services) and fails if a funnel/visit signal function body is a constant return — i.e. the
  `STUB` shape this spec deletes — with a failure message pointing at `contactVisitDates`. The
  proposal's problem statement is "returns 0 (STUB)"; a grep in a spec catches that once, a test
  catches it forever. Keep the matcher narrow and comment why each pattern is listed, so it does
  not become a lint everyone disables.
- **Perf sanity (⚠️ A9).** Verified in §1: `sched_bookings` has `(org_id, start_time)`,
  `(org_id, status)` and `(crm_contact_id)` indexes; `fin_invoices` has `(org_id, issued_at)`,
  `(org_id, client_doc_number)` and `(client_id)`. The union-of-two-sources count should be index-
  supported already. On the largest dev org, `explain analyze` the batched count for a 100-contact
  page and paste the plan and timing in the PR. If it seq-scans `fin_invoices`, **stop before
  adding an index** — this spec ships zero DDL (§5); file a measured index proposal with the plan
  attached, exactly as `2026-08-13-crm-customers-server-pagination-spec` §4/A1 does.
- **Module/kind resilience (⚠️ A8).** Tests for an org with the scheduling module disabled or no
  `sched_*` rows, and for an org with no finance rows: the count is `0` or partial, never a throw,
  never a 500 on the CRM page. Do **not** add org-kind gating (out of scope) — just prove it does
  not crash a personal org.
- Any deferral left standing (the roster path above, the timezone constant from A2, a windowing
  decision) leaves a `TODO(handoff):` **and** an appended entry on the source proposal.

**Files:** `src/server/services/crm-contacts.service.ts` (the SQL `funnel_stage` CASE, if present),
`src/lib/crm/crm-funnel.ts`, `src/server/services/crm-funnel-parity.test.ts` (extend, or create
only if pagination S2 landed and it exists), `src/server/services/crm-visits.test.ts` (guard test),
`proposals/2026-08-17-hub-distinct-visit-dates.md` and, if the seam is deferred,
`proposals/2026-08-13-crm-customers-server-pagination.md` (handoff appends, in the meta-repo).

**Verification criteria (automated except the explicitly manual mutation check and EXPLAIN review):**
```bash
bun run vitest run src/server/services/crm-
#   - PARITY (path 1): the truth table now includes the visit-count axis and the SQL funnel_stage
#     result == effectiveFunnelStage()/financeFloorStage() TS result for every combination of
#     (_funnel value × inbound>0 × booked × purchased × visitDates 0/1/2). No skips.
#   - GUARD: re-stubbing the visit count to `return 0` makes the suite fail (verify by doing it
#     once locally, then reverting — state in the PR that you did)
#   - RESILIENCE: org with no sched_* rows → 0, no throw; org with no fin_* rows → 0, no throw
bun run vitest run                                # full hub suite green; no new skips
bun run check                                     # 0/0
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                      && exit 1   # UI out of scope
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && exit 1   # zero DDL
rg -n 'TODO\(handoff\)' src/server/services/crm-*.ts src/lib/crm/crm-funnel.ts
#   → only genuinely deferred items, each with a matching proposal entry
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/server/services/crm-visits.ts` | S1 | **new** — side-effect-free helpers: `VisitDate`, `countDistinctVisitDates`, `visitDateSql`, and the resolved bucketing timezone; no DB execution. |
| `src/server/services/crm-finance.service.ts` | S1 | additive batched `distinctVisitDates` on the **existing** party-spine query / `ContactFinance` — one query for N contacts |
| `src/server/services/crm-contacts.service.ts` | S2, S3 | stub → real count; `funnel_stage` CASE gains the Loyal branch (S3, if the CASE exists). **Not** the `_funnel` writer — see A5 |
| `src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts` | S2 | deterministic Loyal floor; forward-only, manual-wins, write-only-on-change guards |
| `src/lib/crm/crm-funnel.ts` | S2, S3 | `LOYAL_MIN_VISIT_DATES` + the Loyal floor in the derivation |
| `src/server/services/crm-visits.test.ts` | S1, S3 | counting/dedupe/tz/exclusion cases; anti-recurrence guard |
| `src/server/services/crm-finance.service.test.ts` | S1 | spine-equality with the existing revenue query; batching |
| `src/server/services/crm-contacts.test.ts` | S2 | count + resulting stage; safety rules |
| analyze route test (path from S0; create if absent) | S2 | stage with a stubbed/throwing model client |
| `src/server/services/crm-funnel-parity.test.ts` | S3 | visit-count axis added to the truth table (only if pagination S2 has landed) |
| `proposals/2026-08-17-hub-distinct-visit-dates.md` (+ the pagination proposal, if deferred) | S3 | handoff-ledger appends |

All `src/` paths relative to `minion_hub/`. **No `.svelte` file is edited in any slice** — see §5.
**Zero DDL in either repo**: every column this spec reads already exists (verified §1), and the
CRM/finance/scheduling migrations live in **minion-meta** (`supabase/migrations/`, verified here),
so the "no migration" guard in §6 runs against both checkouts. The only meta-repo edits are
proposal-ledger appends (`docs`-class), so `repos:` names both `minion_hub` and `minion-meta`.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". Four zones could plausibly apply — **DB
schema change** (hub → site, shared DB), **shared packages**, **gateway protocol**, and **agent
definition/tooling** — and none of them carries a blocking dependency:

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion_site` (shares the DB with hub) | **None.** Read-only use of existing columns; zero DDL; no table, column or type touched | `git diff --name-only <base>...HEAD \| grep -qE '(supabase/migrations/\|db/schema/)' && exit 1` in **both** repos |
| `@minion-stack/db` (canonical schema) | **None** — no schema edit ⇒ no version bump, no changeset | same guard |
| `@minion-stack/crm-sdk` | **None** — verified in this checkout: `grep -rniE 'funnel\|visitDate\|distinct_visit' packages ops scripts langgraph-server` → **zero hits**. It writes leads + DNI identity to the party spine and holds no funnel logic | re-run that grep at PR time |
| `@minion-stack/shared` / gateway WS frames | **None** — server-side services + one existing REST route; no frame type, no new endpoint, no response-shape change unless S0 finds the analyze endpoint returns the count (then it is additive — assert every typed in-repo consumer) | `rg -n 'funnel/analyze' src/ ~/work/minion/src` |
| `minion/` gateway CRM tools | **Alert, not a dependency** — the gateway's `crm_insight` / `crm_search` tools read CRM data and may surface or re-derive a funnel stage. If they do, they will now see contacts reaching Loyal | grep in S0 + §6 step 3; a hit means an append to `proposals/2026-08-17-gw-defaces-crm-tools.md`, not a fix here |
| `paperclip-minion`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** | — |

### ⚠️ A1 — a booking is an intent; an invoice is nearly evidence

The two sources are not equally trustworthy and neither is self-describing:
- **Bookings** carry `status` (default `'accepted'`) and a `start_time` that may be in the future.
  Counting a cancelled, rejected, no-showed or not-yet-happened booking as a visit is the fastest
  way to promote exactly the wrong contact — a serial no-show becomes "Loyal". S0 enumerates the
  real status domain from the dev DB (`select status, count(*) …`), then confirms semantics from
  an authoritative scheduling status definition before S1 names the attended set in a `const`.
  Observed values alone do not prove attendance. If the system records intent but no completed/
  attended state, a human must decide whether past `accepted` bookings count; implementation is
  blocked until that decision is recorded. **Do not guess from the schema default.**
- **Invoices** have a nullable `issued_at` (verified §1) and a `status` whose void/cancelled values
  must be excluded. A null date must be *excluded*, never coerced to `now()` or the epoch.
- **Deposits.** `2026-08-17-hub-reserva-keyword-config-spec` establishes that a deposit line is
  money for a visit that has not happened yet. If S0 shows that deposit-only invoices exist as
  standalone rows, decide explicitly and write the decision in the code comment: *a
  deposit-only invoice is not a visit date.* If that requires the deposit rule module, and that
  spec has not landed, **do not build a second copy of the keyword rule** — exclude nothing, note
  the over-count in the PR, and leave a `TODO(handoff):` referencing that spec. One wrong number
  is better than two disagreeing definitions of "deposit".

### ⚠️ A2 — "distinct dates" is undefined without a timezone, and UTC is the wrong default

Both `fin_invoices.issued_at` and `sched_bookings.start_time` are `timestamptz`. Bucketing in UTC
(the default anyone reaches for, and what a bare `::date` or `date_trunc('day', …)` gives you)
splits a single Lima evening across two calendar days: an appointment at 18:00 and another at
20:00 on the same local day are `23:00` UTC and `01:00` UTC *the next day* — so a one-day
double-appointment reads as **2 distinct visits** and the contact is promoted to Loyal on the
strength of a single visit. Verified in this checkout: **no org timezone column exists** in any
migration; the only stored timezones are `sched_resources.timezone` / `sched_schedules.timezone`,
both defaulting to `America/Lima`.

Ruling: **one resolved timezone per org, in one place, applied to both sources.** If S0 finds an
org timezone in hub (a settings jsonb key, a profile field, a constant), thread it. If not, use a
named constant matching the scheduling default, with a comment stating it is the FACES-era default
rather than a universal truth, plus a `TODO(handoff):` and a follow-up proposal for a real org
timezone. What is *not* acceptable is an unstated zone: it makes the count wrong in a way no test
notices unless the test spans midnight, which is why S1's DoD contains exactly that test.

### ⚠️ A3 — there is no single party-spine join, and the wrong one disagrees with revenue

Verified in this checkout: `fin_invoices` has **no `party_id`**. The paths are
`fin_invoices.client_id → fin_clients.id → fin_clients.party_id ← crm_contacts.party_id` (the FK
route the migration header recommends for "analytics/CRM-bridge" joins, but **nullable** and
backfilled only where `(org, provider, doc_number)` matched) and
`fin_invoices.client_doc_number ↔ parties.doc_number` (the string route, complete but coarser).
`sched_bookings` carries `party_id` **and** `crm_contact_id`, both nullable.

Ruling: **reuse whatever join `crm-finance.service.ts` already uses for revenue** (S0 records it)
and union *both* booking paths. Rationale: the visit count is rendered next to revenue derived from
the same spine, and "Loyal with zero revenue" (or the reverse) is a support ticket that costs more
than the invoices a stricter join would have missed. S1's DoD asserts set-equality with the
existing revenue row set for the same fixture, which is what makes that consistency mechanical
rather than aspirational. Contacts with `party_id is null` legitimately count `0` from the finance
path — asserted, not incidental.

### ⚠️ A4 — the Loyal criterion has two consumers, and they will disagree

`2026-08-13-crm-customers-server-pagination-spec` (approved, pass 2) S2 ports
`effectiveFunnelStage` + `financeFloorStage` into a SQL `CASE` in `crm-contacts.service.ts` with a
`crm-funnel-parity.test.ts` truth table, precisely so the roster and the TS derivation cannot
diverge. Adding a visit-count input to Loyal after that lands, without extending the CASE and the
table, breaks the guarantee that spec paid for: `/crm/customers` would filter and display one
funnel while the contact page shows another.

Both files are also contended — that spec's S1–S3 and
`2026-08-17-hub-reserva-keyword-config-spec` touch the same `crm-*.service.ts` neighbourhood.
Branch off the live shared branch, scope commits narrowly, never `git add -A`, and check for
in-flight work on `crm-contacts.service.ts` and `crm-funnel.ts` before starting S3.

### ⚠️ A5 — this spec amplifies a known, unfixed concurrency defect

`proposals/2026-08-17-hub-funnel-atomic-write` (**status `draft`**, same debt sweep) documents that
the `_funnel` writer at `crm-contacts.service.ts:~1009` spreads the whole `custom_fields` jsonb
locally and overwrites the column — losing concurrent writes to other reserved keys (`_icp`,
`_relationship`) in the window. Today auto-detection never fires, so the auto path never exercises
that writer. **This spec turns it on.** Honest handling:

1. **Do not fix it here.** Different proposal, different DoD, and `custom_fields` write semantics
   are exactly the kind of thing two concurrent PRs must not both touch.
2. **Bound it.** S2's *write-only-on-change* guard means the writer fires on genuine transitions
   only — bounded and rare — rather than on every analyze call. That guard is in scope, cheap, and
   is the main reason it is a required test rather than a nicety.
3. **Record it.** Append to `proposals/2026-08-17-hub-funnel-atomic-write.md` that its amplifier
   has landed and which slice did it, so the atomic-write work is prioritized with that fact
   visible. If that proposal is approved and in flight when S2 starts, **coordinate**: land the
   atomic writer first and rebase this on top. Two agents editing the same jsonb write path is a
   worse outcome than a week's delay.

### ⚠️ A6 — a stored stage is permanent; a floor is self-correcting

`_funnel` is a *stored* value; `financeFloorStage` (per claim 4) *derives* a minimum from evidence.
Writing `loyal` into `_funnel` makes it permanent — including after the evidence disappears (an
invoice voided, a booking retro-cancelled). Preference, if S0 confirms a floor mechanism exists:
express Loyal as a **floor** (`visitDates >= N ⇒ at least loyal`) and let the analyze endpoint
record a *suggestion*, so the stage tracks reality without a demotion write. If the floor
mechanism does not exist, S2's forward-only + manual-wins + write-only-on-change rules are the
compensating controls, and the permanence is a deliberate, documented trade — not an oversight.
Either way, **auto-detection must never overwrite `lifecycle_override`**, the verified explicit
manual pin. A stored `_funnel` value has no verified provenance and must not be described or tested
as human-authored unless S0 finds a separate marker.

### ⚠️ A7 — an LLM cannot be the gate on a deterministic number

The caller is a best-effort LLM job with regex JSON parsing and silent-skip failure handling
(`2026-07-06-hub-tanstack-ai-assessment`: `funnel/analyze/+server.ts:76`). If the Loyal decision is
the model's, then the proposal's DoD ("test … asserts count + resulting stage") is only satisfiable
against a live model — which is not a test, and which the house rule for these jobs forbids
(`2026-08-03-crm-icp-score-spec` §9: "all pure/unit — no live LLM"). Worse, the *existing* silent-
skip semantics mean a parse failure would leave the stage unchanged with no signal, reproducing the
exact invisibility this spec is fixing. Hence S2's ruling: the visit-count → Loyal step is
deterministic; the model may enrich the analysis but must not gate the stage. S2's DoD asserts the
stage still advances when the model client returns garbage **and** when it throws.

### ⚠️ A8 — orgs without the modules, and personal orgs

`app_modules` exists and hub gates modules per org (`effectiveModuleEnabled`). An org with
scheduling or finance disabled — or a personal org, which has no customers at all
(`2026-07-22-personal-org-differentiation-spec`) — must get `0`/partial counts and never an
exception on a CRM page. S3 tests both. This spec deliberately adds **no** org-kind gating: the
funnel's kind behavior is owned by that spec, and "other funnel stages" is the proposal's own
exclusion.

### ⚠️ A9 — a per-contact count is an N+1 waiting to be shipped

The natural implementation of "count this contact's visit dates" is one query per contact, which is
correct for the analyze endpoint (one contact) and quietly catastrophic for the roster (up to 500
rows per page). S1 therefore builds the batched, set-based form from the start and asserts the query
count, and S3 measures a real 100-contact page with `explain analyze`. Verified index support
exists for both sources (§1), so this should be measurement, not optimization — and if it is not,
the answer is a separate measured index proposal, never DDL smuggled into this spec.

## 5. Out of scope (explicit)

- **Other funnel stages** — the proposal's own exclusion. `lead`, `opportunity` and `customer`
  keep deriving exactly as today; no threshold, input or ordering of theirs is touched. The only
  new edge in the graph is `→ loyal`.
- **UI** — the proposal's own exclusion. `CrmFunnel*.svelte`, `FunnelStagePill`, the roster column
  rendering and the contact page are untouched: **no `.svelte` file is edited in any slice**, so
  the `ui` tag and its governance gates (`lint:design` / `lint:tokens`, the ui-design-governance
  skill) do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b. Consequence stated
  plainly: contacts will start appearing in the Loyal stage of an unchanged UI. That is the intent
  — the components already render the stage; they were simply never fed one.
- **An org-configurable Loyal threshold.** One named constant, one place. Making it per-org is the
  same shape as `2026-08-17-hub-reserva-keyword-config-spec` and belongs in `crm_settings` with
  that work, as one settings surface rather than two.
- **A lookback window** ("2 visits within 24 months"). All-time, exactly as "distinct visit dates"
  reads. A window is a product decision nobody has made; if it is wanted, it is a follow-up
  proposal with the distribution of inter-visit gaps attached.
- **Making `_funnel` writes atomic** — `proposals/2026-08-17-hub-funnel-atomic-write` owns it
  (⚠️ A5). This spec bounds and records the amplification; it does not fix the writer.
- **Reclassifying or backfilling history.** No batch re-analysis of the existing roster, no cron,
  no tick. Contacts advance the next time the analyze path runs for them. If the wave wants a
  one-shot backfill, it is a separate proposal — and it should be written with the count S3
  measures, because it would fire the A5 writer once per affected contact.
- **POS tickets and other visit sources.** The proposal names `fin_invoices` and scheduling. If POS
  tickets do not flow into `fin_invoices`, POS-only visits are invisible — note the gap in the PR
  and file it; do not widen the query.
- **A real `visits` data model.** The correct long-run answer is an explicit attendance record
  (checked-in bookings, or a `visits` table written at the point of service) rather than inferring
  attendance from billing and calendar rows. That is DDL plus an ingest change plus a backfill —
  a different, larger spec. This one infers, and says so.
- **Accent/vocabulary-sensitive deposit classification** — `2026-08-17-hub-reserva-keyword-config-spec`
  owns the rule; A1 states how to behave if it has not landed.
- **Schema changes.** No column, table, index or migration in either repo. If a slice appears to
  need one, stop and re-spec: every column read here was verified to exist (§1).

## 6. End-to-end verification

Run with all three slices merged, on the live hub base branch confirmed in Slice 0, against a dev
org that has both invoices and bookings.

```bash
cd minion_hub

# 1. Gates (logic/test-tagged: no design/token lint required — see §5)
bun run check                                   # 0 errors / 0 warnings
bun run vitest run                              # full suite green; no new skips
git diff --name-only <base>...HEAD | grep -E '\.svelte$'              && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && echo "FAIL: no DDL" && exit 1
git -C .. diff --name-only <meta-base>...HEAD | grep -E '^supabase/migrations' && echo "FAIL: no DDL (meta)" && exit 1

# 2. The proposal's DoD, literally
rg -n 'STUB|return 0' src/server/services/crm-contacts.service.ts    # → no stub at the visit-count site
rg -n 'countDistinctVisitDates|visitDateSql' src/server/services/crm-finance.service.ts
                                                # → the count comes from the party-spine bridge
bun run vitest run src/server/services/crm-visits src/server/services/crm-contacts
                                                # → "seeds 2+ dates, asserts count + resulting stage"

# 3. Sibling-repo check — paste the result in the PR either way
rg -n -i 'funnel|visit_dates|distinctVisitDates' ~/work/minion/src ~/work/paperclip-minion ~/work/packages

# 4. Behavior on a real dev org (the whole spec in one pass)
#    a. pick a contact with exactly ONE invoice/booking date; confirm it is NOT loyal:
curl -s "$HUB/api/crm/contacts/$C" -H "$AUTH" | jq '.custom_fields._funnel'
curl -s -X POST "$HUB/api/crm/contacts/$C/funnel/analyze" -H "$AUTH" | jq
curl -s "$HUB/api/crm/contacts/$C" -H "$AUTH" | jq '.custom_fields._funnel'   # unchanged
#    b. add a second visit on a DIFFERENT calendar day (a past-dated accepted booking is the
#       cheapest seed), re-run analyze → the stage is now 'loyal'
#    c. add a THIRD event on the SAME day as (b) → the count does not change (dedupe, live)
#    d. add a FUTURE-dated booking and a CANCELLED booking → the count does not change  (A1)
#    e. re-run analyze with the stage already 'loyal' → no write (check updated_at is unchanged
#       on crm_contacts, and that a sibling reserved key such as _icp is intact)          (A5)
#    f. set lifecycle_override to another stage → analyze does not overwrite it (A6)
#    g. the tz assertion, live: two events at 18:00 and 20:00 local on ONE day → count 1  (A2)

# 5. Roster consistency (A4)
curl -s "$HUB/api/crm/contacts?funnelStage=loyal&limit=5" -H "$AUTH" | jq '.total, [.contacts[].id]'
#    This set must match the per-contact derivation for the same org. If pagination S2 has not
#    landed, record the handoff and keep this spec blocked; disclosure alone does not pass.

# 6. Perf (A9) — paste the plan and the timing in the PR
#    explain analyze the batched visit-date count for a 100-contact page on the largest dev org.
```

**Ship gate:** §6 all green; the proposal's DoD checked clause by clause (counted from
`fin_invoices`/scheduling via the party spine — step 2; test seeds 2+ dates and asserts count +
resulting stage — step 2; auto-advance observed live — step 4b); S0's four recorded actuals (the
Loyal decision path, the invoice join, the booking-status domain, the org timezone or its absence)
pasted into the PR; the A1 deposit decision and the A2 timezone decision stated explicitly in code
comments **and** the PR; A5's append to `proposals/2026-08-17-hub-funnel-atomic-write.md` made;
A4's roster path either implemented or disclosed with both handoff records; and Slice 0's actuals
reconciled against §3, with any correction committed to this spec in the same PR.
