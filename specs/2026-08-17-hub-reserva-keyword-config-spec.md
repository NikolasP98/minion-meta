---
id: 2026-08-17-hub-reserva-keyword-config-spec
title: "CRM deposit classification — one rule module, then an org-configurable keyword set (no triplicated '%reserva%')"
stage: spec
status: implementing
pass: 2
created: 2026-08-17
updated: 2026-08-28
proposal: 2026-08-17-hub-reserva-keyword-config
verdict: approved
repos: [minion_hub]
tags: [logic, test]
type: fix
reconcile_ignore: true
reconcile_ignore_reason: "Denied: S1/S2 and the journey handoff are merged, but Slice 3's validated CRM settings write path and anti-recurrence guard remain in open minion_hub PR #160; the linked PR #140 is not full-spec completion."
---

# CRM deposit classification — one rule module, then an org-configurable keyword set

**Owner surface:** `minion_hub` — `src/server/services/crm-finance.service.ts`,
`src/server/services/crm-similarity.service.ts`, `src/server/services/crm-journey.service.ts`,
a new pure-logic module `src/server/services/crm-deposit-rule.ts` (the seam — see §3), the
existing CRM settings reader/writer (`crm_settings`, path from Slice 0), and the CRM service tests
**Design ancestors:** [`2026-08-03-crm-icp-score-spec`](2026-08-03-crm-icp-score-spec.md)
(establishes `crm_settings (org_id PK, value jsonb)` as the per-org config home — "**zero
migration**" — and `crm-scoring.ts` as the precedent for "pure logic in TS, ranking in SQL";
also names `crm-finance.service.ts` as the finance bridge),
[`2026-07-17-crm-conversation-intelligence-spec`](2026-07-17-crm-conversation-intelligence-spec.md)
(names the exact line neighbourhoods this spec touches — `crm-similarity.service.ts:55/59/100-102/261`,
`crm-journey.service.ts:166` — and documents the existing `crm_settings.disabled_channels` /
`getHarvestScope` read path this spec reuses),
[`2026-07-22-personal-org-differentiation-spec`](2026-07-22-personal-org-differentiation-spec.md)
(`crm-finance.service.ts:31` `ContactFinance` — the business finance bridge, explicitly "do NOT touch"
for the personal-finance work, and the shape whose numbers this rule moves),
[`2026-06-13-crm-plugin-recon-and-plan`](2026-06-13-crm-plugin-recon-and-plan.md) (the CRM derived-signal
design; precedent that per-org thresholds land in `crm_settings` jsonb, not in new columns)
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
every slice below is tagged `logic`/`test`: mandatory red-state TDD, **no** UI-governance checks
(no `.svelte` file is edited in any slice — see §5)

---

## 0. Product

From the approved proposal `2026-08-17-hub-reserva-keyword-config`, verbatim:

> ## Problem
>
> Spanish single-tenant keyword ilike '%reserva%' baked into crm-finance.service.ts:9,
> crm-similarity.service.ts:55, crm-journey.service.ts:39 for deposit-classification in
> multi-tenant services.
>
> ## Definition of done
>
> One shared constant minimum (org-level config preferred); the three services consume it; existing
> tests green.
>
> ## Out of scope
>
> Reclassifying historical rows.

**What an affected org actually sees.** The CRM is multi-tenant; the keyword is not. For any org
that does not write the Spanish word *reserva* on its booking-deposit line items — an English org
("deposit", "retainer"), a different Spanish vocabulary ("adelanto", "seña", "abono", "a cuenta"),
or any org whose invoices simply say something else — three separate features are quietly wrong at
once, and each is wrong in a *different* direction:

1. **Money** (`crm-finance.service.ts`) — deposits are not distinguished from delivered revenue, so
   per-contact lifetime revenue / buyer flags are off. Those same numbers feed the ICP feature
   bundle (`2026-08-03-crm-icp-score-spec` §4, "Commercial: lifetime revenue, invoice count,
   last purchase date, `isBuyer` (`crm-finance.service.ts`)"), so a wrong classification propagates
   into an LLM-scored, cached, operator-facing judgement about the customer.
2. **Similarity / win index** (`crm-similarity.service.ts`) — the "what did this customer actually
   buy" signal degrades into "what did they put money down on", polluting the nearest-neighbour
   comparisons that `similarWins` (`:261`) serves.
3. **Journey** (`crm-journey.service.ts`) — the timeline either shows no booking milestone at all,
   or shows one labelled with a Spanish word the org never uses.

None of the three fails loudly. All three return plausible output. That is why this is worth a spec
rather than a find-and-replace.

**Why three slices and not one sed.** Four things make the triplication more than a copy-paste:

- **The three predicates may not be the same predicate.** They are three call sites with plausibly
  three *polarities*: finance most likely **excludes** deposit lines from revenue (`not ilike`),
  similarity most likely **excludes** them from the `bought` array, journey most likely **includes**
  them to emit a milestone (`ilike`). Collapsing three predicates into one shared helper while
  silently flipping one polarity converts a cosmetic bug into a numeric one. Slice 0 records the
  polarity of each site before anything is extracted, and S1's parity tests are what prove none
  flipped.
- **A match rule and a display label are different things.** The journey site plausibly both matches
  on *reserva* and prints "Reserva" as the milestone label. An org configuring
  `keywords: ['deposit']` must not get a milestone labelled "Reserva". One config, two fields.
- **Keywords from config land inside a `LIKE` pattern.** `%`, `_` and `\` in an operator-supplied
  keyword are wildcards, not literals; an org that types `100%` gets a rule that matches every row.
  There is exactly one correct place to escape, and it must exist before any config can be read.
- **Some of the output is materialized, not derived.** `crm_win_embeddings` (verified in this
  checkout: `supabase/migrations/20260618120000_crm_win_embeddings.sql`) stores `bought text[]` and
  `snippet` per contact. If the similarity site's rule feeds those columns, changing an org's
  keywords leaves **stale rows** until a rebuild runs. Reclassifying history is the proposal's own
  out-of-scope — so this spec must make the staleness explicit rather than pretend a config write
  is instantly total (§4 ⚠️ A3, §5).

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion_hub/` is not checked out** (the meta-repo
`.gitignore` excludes every subproject; verified on disk here: no `crm-finance.service.ts`,
no `src/server/services/` at all). Every path, line number and symbol *inside minion_hub* below is
carried from the proposal (written today — strong) or from the CRM specs of 2026-06→2026-08 (weeks
old; **line numbers have moved**). Treat them as leads, not fact. Slice 0 turns them into fact; if
something moved, correct §3 of this spec in the same commit rather than implementing against a
different file in silence.

What *was* independently verified in this checkout (the meta-repo owns the SQL):

- `public.crm_settings (org_id text primary key, value jsonb not null default '{}', updated_at)`
  exists — `supabase/migrations/20260614200000_crm_settings.sql`. Its header comment states the
  contract this spec leans on: *"Graceful default: a missing table OR missing row means 'all
  channels enabled', so the harvest gate and channel manager are safe even before this migration
  reaches an environment (the service swallows a missing-relation error)."* RLS is forced, scoped by
  the `app.current_org_id` GUC — so a settings read is already org-scoped by the database.
- `public.fin_invoice_items (…, description text, …)` — `supabase/migrations/20260617120000_finance.sql`.
  **No index on `description`**; the existing `ilike '%reserva%'` is already a sequential scan
  (relevant to S3's perf check, and the reason N keywords is a quantitative, not qualitative, change).
- `public.crm_win_embeddings (org_id, contact_id, embedding, msg_count, bought text[], snippet, built_at)`
  — the materialized consumer named above.
- `packages/crm-sdk` (`@minion-stack/crm-sdk`) talks to this same Postgres directly, but
  `grep -rin 'reserva' packages ops scripts supabase langgraph-server` returns **zero hits** — no
  second copy of the keyword outside `minion_hub`. Re-run at PR time (§4).

Five carried claims are load-bearing:

1. **The keyword appears exactly three times, at `crm-finance.service.ts:9`,
   `crm-similarity.service.ts:55`, `crm-journey.service.ts:39`** (proposal). A fourth site — a
   route, a tool, an unfinished report — invalidates the slice estimates, not the design: add it to
   S1's consumer list. `crm-finance.service.ts:9` being near the top of the file suggests a
   module-level constant or an early `sql` fragment; the other two look like inline predicates.
2. **All three are the same *concept*** ("this invoice line is a booking deposit, not delivered
   goods/services") **with possibly different polarity.** If S0 shows two genuinely different
   concepts (e.g. one is "the customer has a reservation" and another is "this line item is a
   deposit"), do **not** force one keyword list over both: emit two named rules from the same config
   object and say so in the PR. One shared *module* is still the right answer; one shared *list*
   would not be.
3. **A `crm_settings` reader already exists** (`2026-07-17-crm-conversation-intelligence-spec` §28
   names `crm_settings.disabled_channels` and `getHarvestScope`). S2 **reuses** it; it does not add
   a second query path. If the reader is channel-specific and not generic, generalizing it is S2
   work — one function, not a refactor.
4. **The three services run inside an org-scoped context** (RLS requires `app.current_org_id` to be
   set, so a ctx/orgId is in hand at every call site). If any of the three is called from an unscoped
   background job, that job needs the orgId threaded — flag it in S0; it changes S2's estimate.
5. **A regression home exists** — `crm-finance.service.test.ts` is named as an existing file by
   `specs/hub-erp-roadmap/P0-write-hardening.md` ("look at `crm-finance.service.test.ts` first and
   copy its harness approach"). Use its DB-stubbing harness for the new tests rather than inventing
   one. If `crm-similarity`/`crm-journey` have no test file, create them in S1.

**Branch discrepancy to settle before branching.** AGENTS.md's project map says hub's branch is
`dev`; `2026-08-13-crm-customers-server-pagination-spec` states `origin/dev` was **deleted** and the
live base is `origin/master`. Run `git -C minion_hub branch -r` and branch off whatever is actually
live. Do not create or resurrect a branch to match the docs.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_hub
git branch -r                                                    # settle the base branch (above)

# 1. Every occurrence of the keyword, anywhere — the proposal claims exactly three
rg -n -i 'reserva' src/ scripts/ --type ts
rg -n -i 'reserva' src/ --type svelte                            # is the word also a UI label? (→ §5)

# 2. The three call sites in full: polarity, column, and query shape  ← assumption 2, decisive
rg -n -B15 -A25 'reserva' src/server/services/crm-finance.service.ts
rg -n -B15 -A25 'reserva' src/server/services/crm-similarity.service.ts
rg -n -B15 -A25 'reserva' src/server/services/crm-journey.service.ts
#    For each: record (a) `ilike` or `not ilike`, (b) which column (fin_invoice_items.description?
#    fin_invoices.note? a concatenation?), (c) drizzle helper vs raw sql`` template,
#    (d) whether the matched text is ALSO used as a display label.

# 3. Does the similarity rule feed the materialized table?              ← ⚠️ A3
rg -n 'crm_win_embeddings|bought|snippet' src/server/services/crm-similarity.service.ts
rg -n 'crm_win_embeddings' src/ --type ts                        # who rebuilds it, and on what trigger

# 4. The existing crm_settings read/write path — reuse, do not fork     ← assumption 3
rg -n 'crm_settings|getHarvestScope|disabled_channels' src/ --type ts
rg -rn 'crm/settings' src/routes/api --files-with-matches        # the write endpoint (S3)
rg -n 'API_WRITE_PREFIXES' src/ --type ts | head                 # confirm /api/crm is already gated

# 5. Org scoping at each call site                                      ← assumption 4
rg -n 'function (contactFinance|listContacts|buildJourney|similarWins)' src/server/services/crm-*.ts
rg -n 'orgId|ctx\b' src/server/services/crm-journey.service.ts | head

# 6. Test homes + harness
ls src/server/services/crm-*.test.ts
rg -n 'toSQL|snapshot' src/server/services/*.test.ts | head      # is there a query-snapshot precedent?

# 7. Data reality — how many rows would a keyword change actually move (dev DB, read-only):
#    select count(*) filter (where description ilike '%reserva%') as hits, count(*)
#      from fin_invoice_items;
```

Record the actuals — **especially the polarity table for the three sites and whether the journey
site doubles as a display label** — in the PR description. Nothing in Slice 0 changes files.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (one rule module, three consumers, zero behavior change)
                 ─▶ S2 (crm_settings drives the rule) ─▶ S3 (write path, staleness, guard)
```

Strictly sequential — S1 creates the seam S2 feeds and S3 defends. **S1 alone satisfies the
proposal's minimum DoD** ("one shared constant minimum; the three services consume it; existing
tests green"); **S2 delivers its preferred form** ("org-level config preferred"); S3 makes the
config writable and safe to change. If the wave cuts scope, cut after S2 — but then the AGENTS.md
**open-items ledger** rule applies: a `TODO(handoff):` at the config seam plus an append to the
source proposal saying the rule is readable but not writable through any product surface.

---

### S1 — One rule module; the three services consume it; output unchanged

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** the string `reserva` exists in exactly one place in `src/server/`, the three services call
one module, and **every byte of output is identical to today**. No config, no settings read, no
behavior change — this slice is a pure extraction whose whole value is that its parity tests can be
trusted later.

**Do:**
- Create `src/server/services/crm-deposit-rule.ts` — pure logic, no DB access, alongside the
  `crm-scoring.ts` precedent (`2026-08-03-crm-icp-score-spec` §2: "pure logic in TS, ranking in SQL").
  Exports:
  - `type DepositRule = { keywords: string[]; label: string }`
  - `const DEFAULT_DEPOSIT_RULE: DepositRule = { keywords: ['reserva'], label: 'Reserva' }` — the
    **only** occurrence of the word in `src/server/`, with a comment stating it is the FACES-era
    default kept for behavioral compatibility, not a universal truth, and pointing at S2's config key.
  - `escapeLikePattern(k: string): string` — escapes `\`, `%`, `_` and wraps in `%…%`. Used by
    *every* pattern builder; never build a pattern by interpolation anywhere else.
  - `depositMatchSql(col, rule): SQL` and `notDepositMatchSql(col, rule): SQL` — **two named
    exports, one per polarity.** Call sites pick a name; they never wrap the other one in an ad-hoc
    `not()`. This is what makes a flipped polarity a review-visible word rather than a punctuation
    change.
  - `isDepositText(text: string | null | undefined, rule: DepositRule): boolean` — the TS-side twin,
    for any site that classifies rows already in memory. **Same casefold semantics as `ilike`**
    (lowercase both sides, substring match), asserted by a shared test table so the SQL and TS
    answers can never diverge.
  - Empty `keywords` ⇒ `depositMatchSql` returns `sql\`false\`` and `notDepositMatchSql` returns
    `sql\`true\``. It must **never** return `undefined`/no predicate: a dropped predicate in a
    drizzle `and(...)`/`or(...)` chain silently widens the result set, which is the failure mode this
    module exists to prevent. (Not reachable in S1 — the default is non-empty — but the guarantee
    must be built and tested where it lives, before S2 can produce an empty list.)
- Rewrite the three call sites to use the module, each keeping the polarity S0 recorded. Bind
  patterns as query parameters (drizzle `ilike(col, pattern)` binds; a raw `sql` template must use
  `${pattern}` interpolation, never string concatenation).
- If S0 found the journey site also *renders* the word, split it: match via `rule.keywords`, render
  via `rule.label`. Both come from `DEFAULT_DEPOSIT_RULE` in this slice, so output is unchanged.
- No settings read in this slice. Leave `TODO(handoff): rule is the module default here — S2 of
  2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings` at each of the three call
  sites; S2 removes all three.

**Files:** `src/server/services/crm-deposit-rule.ts` (new),
`src/server/services/crm-finance.service.ts`, `src/server/services/crm-similarity.service.ts`,
`src/server/services/crm-journey.service.ts`, `src/server/services/crm-deposit-rule.test.ts` (new),
plus the existing `crm-*.service.test.ts` files S0 located.

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/crm-
#   red-state first (G3): each case shown failing before the extraction lands
#   - PARITY, per service: for a seeded fixture, the compiled query is unchanged — snapshot
#     `query.toSQL()` (drizzle) or the raw SQL string, captured from the PRE-change code and
#     committed in this slice. Three snapshots, one per call site.
#   - POLARITY, per service: a fixture row whose description contains 'reserva' lands on the side
#     S0 recorded (excluded from revenue / excluded from `bought` / emits the milestone) and a row
#     without it lands on the other side. Three explicit assertions, no shared helper.
#   - escapeLikePattern('100%') → the '%' is escaped; a row 'anything' does NOT match it
#   - isDepositText and depositMatchSql agree on a shared 10-case table (casing, accents-as-typed,
#     substring-in-word, empty string, null)
#   - keywords: [] → depositMatchSql is `false` and notDepositMatchSql is `true`; NEITHER is
#     undefined (assert on the returned object, not on query output)
bun run vitest run                                # existing tests green ← the proposal's third DoD clause
bun run check                                     # 0 errors / 0 warnings
rg -n -i 'reserva' src/server/ --glob '!*.test.ts' --glob '!crm-deposit-rule.ts'
#   → zero hits: "one shared constant" satisfied. The two --glob exclusions are load-bearing —
#     the constant necessarily lives in crm-deposit-rule.ts and the parity fixtures necessarily
#     contain the literal word.
```

---

### S2 — `crm_settings.value.deposit` drives the rule

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** the proposal's preferred form. An org's own vocabulary classifies its own deposits, with
one validation boundary, one normalization, and a default that leaves every existing org
bit-identical. **Zero DDL** — `crm_settings` already exists (verified, §1).

**Do:**
- Define the config shape, zod-validated, versioned by convention with the ICP precedent
  (`2026-08-03-crm-icp-score-spec` §3.1 — same table, sibling key):
  ```ts
  // crm_settings.value.deposit — absent ⇒ DEFAULT_DEPOSIT_RULE (today's behavior)
  { keywords: string[];      // 0..20 entries, each 1..40 chars after trim
    label?: string;          // ≤ 40 chars, default 'Reserva'
    updatedAt?: string }     // ISO; set by the S3 write path, read by rebuild tooling (⚠️ A3)
  ```
- Add `resolveDepositRule(ctx): Promise<DepositRule>` to the **CRM settings layer** (extend the
  existing `crm_settings` reader found in S0 — *not* inside `crm-deposit-rule.ts`, which stays
  pure and DB-free, and *not* a second query). It is the single place that:
  - Uses separate read and write boundaries. The read boundary accepts a type-correct legacy array
    beyond today's write caps, then **normalizes**: trim, lowercase, drop empties, dedupe, preserve
    order, truncate each keyword and the label to 40 characters, and keep the first 20 keywords.
    Non-string members or the wrong object shape are malformed and take the fail-soft path below.
    The write schema remains strict and rejects over-cap input rather than truncating it. This makes
    the stated hand-written-row behavior deterministic without weakening the API contract.
  - **Fails soft on read.** A malformed/legacy `value.deposit` blob logs a warning and falls back to
    `DEFAULT_DEPOSIT_RULE`; it does **not** throw. Rationale, stated in the code comment: these three
    services back analytics pages, and a single bad settings row must not 500 the whole CRM. Strict
    rejection belongs on the **write** path (S3), where a human is present to fix it.
  - **Honors the migration's graceful-default contract** — missing table *or* missing row ⇒ default,
    swallowing the missing-relation error exactly as the existing channel-scope reader does
    (quoted in §1). Same behavior, same helper.
  - Distinguishes **absent** from **explicitly empty**: no `deposit` key ⇒ default `['reserva']`;
    `keywords: []` ⇒ this org has no deposit concept, `depositMatchSql` is `false`, and the journey
    milestone never fires. Both are legitimate states and the tests assert them separately.
- Thread it: each of the three services resolves the rule **once per call** (not per row, not per
  loop iteration) and passes it into the S1 helpers. Remove S1's three `TODO(handoff):` markers.
- If S0 found a call site without an org-scoped ctx (assumption 4), thread the orgId from its
  caller — do not give the pure module a DB dependency to dodge a signature change.

**Files:** the existing CRM settings service (path from S0 — e.g.
`src/server/services/crm-settings.service.ts`), `src/server/services/crm-deposit-rule.ts` (zod
schema + normalization can live here as pure functions; the *query* stays in the settings service),
the three `crm-*.service.ts` files, their test files.

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/crm-
#   - org with NO crm_settings row → rule == DEFAULT_DEPOSIT_RULE and all three services produce
#     output byte-equal to the S1 snapshots   ← zero-regression proof for every org today
#   - org with { deposit: { keywords: ['adelanto','seña'] } } → a row 'ADELANTO 50%' is classified
#     as a deposit and a row 'Reserva de cita' is NOT, in all three services
#     ← "the three services consume it", end to end
#   - org with { deposit: { keywords: [], label: 'x' } } → nothing is a deposit; the journey emits
#     no milestone; revenue includes every line
#   - org with { deposit: { keywords: ['dep%osit'] } } → the '%' is a literal; an unrelated row
#     does not match  ← the escaping boundary, asserted through the real query path
#   - malformed blob ({ deposit: 'reserva' } / { deposit: { keywords: [1,2] } }) → falls back to the
#     default AND logs a warning; does NOT throw
#   - 40 keywords stored by hand → normalization caps at 20 (assert the built SQL, not the input)
#   - label: 'Deposit' → the journey milestone renders 'Deposit', not 'Reserva'
bun run vitest run                                # full hub suite green; no new skips
bun run check
rg -n -i 'reserva' src/server/ --glob '!*.test.ts' --glob '!crm-deposit-rule.ts'   # → still zero
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && exit 1   # zero DDL
```

---

### S3 — A validated write path, honest staleness, and the anti-recurrence guard

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** the rule is changeable through the product (not only through `psql`), a change cannot
corrupt the shared settings row or the query, the operator is told what a change does *not*
retroactively fix, and nobody can reintroduce a fourth hardcoded copy without a red test.

**Do:**
- **Write path** on the existing CRM settings endpoint found in S0 (`/api/crm/settings` or
  equivalent). The request contract for this operation is
  `{ deposit: { keywords: string[]; label?: string } }`; clients cannot supply `updatedAt`.
  Strict zod on the `deposit` object — unknown deposit keys rejected, caps enforced, `updatedAt`
  stamped server-side. Preserve any other top-level settings keys rather than rejecting them as
  though this operation owned the whole settings document. `/api/crm` is already covered by `API_WRITE_PREFIXES`
  (`2026-08-03-crm-icp-score-spec` §2), so the central write gate applies with no new registration —
  **confirm** that in S0 rather than assuming it.
- **Merge, never replace, the jsonb.** `crm_settings.value` also holds `disabled_channels`
  (the table's original v1 key — verified in the migration header). A handler that writes
  `value = $new` silently deletes another feature's config. Write a key-level merge
  (`value = value || jsonb_build_object('deposit', $1)` or the equivalent read-modify-write inside
  one transaction) and add a test that sets `deposit` on a row that already has `disabled_channels`
  and asserts **both** survive. This is the single highest-value test in the slice.
- **Staleness disclosure (⚠️ A3).** If S0 confirmed the similarity rule feeds `crm_win_embeddings`
  (`bought`, `snippet`), then a keyword change does not retro-fix stored rows — and reclassifying
  history is the proposal's explicit out-of-scope. So: on a successful rule change, log at `warn`
  with the org id and return `staleDerivedCount`, the count of `crm_win_embeddings` rows whose
  `built_at < deposit.updatedAt`, plus `staleDerived: staleDerivedCount > 0` in the response body,
  and leave a
  `TODO(handoff): keyword changes do not rebuild crm_win_embeddings.bought — see
  2026-08-17-hub-reserva-keyword-config-spec §5` at the write site **and** append the same sentence
  to the source proposal. If S0 shows the existing rebuild job is idempotent and cheap to trigger,
  name it in the log message; do not build a new one here.
- **Anti-recurrence guard:** a test that reads the source of the three services (plus any new CRM
  service file) and fails if `/reserva/i` — or a bare `ilike '%…%'` pattern built by string
  concatenation — appears outside `crm-deposit-rule.ts`, with a failure message pointing at
  `depositMatchSql`. The proposal's "one shared constant" is a one-time grep in a spec; this makes
  it permanent.
- **Perf sanity.** `fin_invoice_items.description` has no index (verified, §1) — one `ilike` is
  already a seq scan, and N keywords multiply the per-row cost, not the scan count. On the largest
  dev org, `explain analyze` the finance query at 1 keyword and at 20; paste both timings in the PR.
  If the 20-keyword case regresses beyond ~2× on real row counts, lower the cap and say so here
  rather than shipping a configurable foot-gun.

**Files:** the CRM settings route + service (paths from S0), `src/server/services/crm-deposit-rule.test.ts`
(guard test), the settings service test file, `proposals/2026-08-17-hub-reserva-keyword-config.md`
(handoff append, in the meta-repo).

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/crm- src/routes/api
#   - PUT deposit config on a row that already has disabled_channels → BOTH keys present afterwards
#   - PUT { deposit: { keywords: ['x'.repeat(80)] } } → 400, row unchanged
#   - PUT { deposit: { keywords: [...21 items] } } → 400, row unchanged
#   - PUT { deposit: { keywords: ['ok'], surprise: 1 } } → 400 (unknown key), row unchanged
#   - PUT valid → 200, updatedAt stamped server-side, and the very next resolveDepositRule()
#     returns the new rule (no stale in-process cache)
#   - unauthenticated / wrong-org PUT → rejected by the existing write gate (assert, don't assume)
#   - guard test: adding `ilike('%reserva%')` to crm-journey.service.ts makes the suite fail
#     (verify by doing it once locally, then reverting — state in the PR that you did)
bun run vitest run                                # full suite green
bun run check
rg -n 'TODO\(handoff\)' src/server/services/crm-*.ts src/routes/api   # → only the A3 staleness note,
                                                  #   and it has a matching proposal entry
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/server/services/crm-deposit-rule.ts` | S1, S2, S3 | **new** — `DepositRule`, `DEFAULT_DEPOSIT_RULE` (the only `reserva`), `escapeLikePattern`, `depositMatchSql` / `notDepositMatchSql`, `isDepositText`, zod schema + normalization. Pure; no DB. |
| `src/server/services/crm-finance.service.ts` | S1, S2 | inline predicate → `notDepositMatchSql` (polarity per S0); rule resolved once per call |
| `src/server/services/crm-similarity.service.ts` | S1, S2 | same; `bought`/`snippet` construction path |
| `src/server/services/crm-journey.service.ts` | S1, S2 | same; match via `keywords`, render via `label` |
| CRM settings service (path from S0, e.g. `crm-settings.service.ts`) | S2, S3 | `resolveDepositRule(ctx)` reusing the existing reader; key-level jsonb merge on write |
| CRM settings API route (path from S0) | S3 | strict zod write path, `staleDerived` disclosure |
| `src/server/services/crm-deposit-rule.test.ts` | S1, S3 | escaping, polarity, empty-list, SQL↔TS agreement, anti-recurrence guard |
| `crm-finance.service.test.ts`, `crm-similarity.service.test.ts`, `crm-journey.service.test.ts` | S1, S2 | query snapshots (parity), per-org rule cases |
| `proposals/2026-08-17-hub-reserva-keyword-config.md` (meta-repo) | S3 | handoff append for the stale-derived-data item |

All `src/` paths relative to `minion_hub/`. **No `.svelte` file is edited in any slice** — see §5.
**Zero DDL in either repo**: `crm_settings` already exists and this spec adds a jsonb *key*, not a
column. Note that the CRM/finance migrations live in **minion-meta** (`supabase/migrations/`,
verified here), so the "no migration" guard in §6 must be run against both checkouts.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". Four zones could plausibly apply — **DB
schema change** (hub → site, shared DB), **shared packages**, **gateway protocol**, and **agent
definition/tooling** — and only the last one carries a real (non-blocking) alert.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion_site` (shares the DB with hub) | **None.** No DDL; an additive jsonb key inside a table site does not read. No column, table or type touched | `git diff --name-only <base>...HEAD \| grep -qE '(supabase/migrations/\|db/schema/)' && exit 1` in both repos |
| `@minion-stack/db` (canonical schema) | **None** — no schema edit ⇒ no version bump, no changeset | same guard |
| `@minion-stack/crm-sdk` | **None** — it writes leads + DNI identity to the party spine and contains no deposit logic. Verified in this checkout: `grep -rin 'reserva' packages ops scripts supabase langgraph-server` → **zero hits** | re-run that grep at PR time |
| `@minion-stack/shared` / gateway WS frames | **No shared-package or WS change.** The existing settings REST endpoint does gain an additive request key and response fields, so S0 must locate and test any typed in-repo consumers before S3 changes it. | `rg -n '/api/crm/settings|staleDerived' src/` and update/assert every typed consumer found; expect no shared-frame edit |
| `minion/` gateway CRM tools | **Alert, not a dependency** — see ⚠️ A2 | grep in Slice 0 + §6 |
| `paperclip-minion`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** | — |

### ⚠️ A1 — polarity is the thing that must not be guessed

Three call sites, three plausible polarities, and a flip is invisible in review because both forms
are one word long and both compile. It is also invisible in production: revenue silently
including deposits and revenue silently excluding real sales both look like "revenue". The
mitigations are structural, not vigilance: (a) S0 records the polarity table *before* any edit;
(b) the module exports two differently-named functions so a call site names its intent;
(c) S1's per-service polarity assertions are written as three independent tests with no shared
helper, so a copy-paste error in one cannot be masked by a passing abstraction. If S0's polarity
table and the S1 snapshots disagree, stop — the snapshot is the truth about today's behavior.

### ⚠️ A2 — the gateway has the same debt, and this spec does not fix it

`proposals/2026-08-17-gw-defaces-crm-tools` (approved, `repos: [minion]`) documents the sibling
failure in `minion/src/agents/tools/knowledge/crm-search-tool.ts` and `crm-insight-tool.ts` —
hardcoded clinic identity, Peru-only patterns, single-tenant vocabulary in generic builtin tools.
Those tools query CRM data, so a fourth copy of `%reserva%` may live there. Before S1 merges:

```bash
rg -n -i 'reserva|deposit.*ilike|ilike.*deposit' ~/work/minion/src ~/work/paperclip-minion
```

- Zero hits ⇒ nothing to do; note it in the PR.
- A hit ⇒ **do not** fix it from this spec (different repo, different release train, and it already
  has an approved owner). Append the exact path and line to
  `proposals/2026-08-17-gw-defaces-crm-tools.md` so the org-config work there covers it, and say in
  this PR that you did. Two repos silently disagreeing about what a deposit is would be worse than
  today's single wrong answer.

### ⚠️ A3 — a config change is not retroactive, and the product must say so

`crm_win_embeddings.bought` / `snippet` are **stored**, built under whatever rule was live at
`built_at`. Changing keywords changes the *live* queries immediately and the *stored* rows not at
all, so for a period the journey and the similarity index disagree. Reclassifying history is the
proposal's own out-of-scope, so this spec's obligation is disclosure, not repair: S3 logs, returns
`staleDerived` with a row count, and files the handoff note. If S0 reveals that the similarity site
does **not** feed those columns (it may only filter at read time), drop this alert and S3's staleness
bullet, and note the simplification in the PR — do not implement a warning for a problem that
does not exist.

## 5. Out of scope (explicit)

- **Reclassifying historical rows** — the proposal's own exclusion. No backfill, no rebuild of
  `crm_win_embeddings`, no re-derivation of cached `_icp` scores whose commercial features came from
  the old classification. ⚠️ A3 discloses the consequence instead of hiding it; a rebuild is a
  follow-up proposal that should be written with the row count S3 measures.
- **A `/crm/settings` UI editor for the keyword list.** The write path is API-only. **No `.svelte`
  file is edited in any slice**, so the `ui` tag and its governance gates (`lint:design` /
  `lint:tokens`, the ui-design-governance skill) do **not** apply to this spec, per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b. Consequence stated plainly: after S3 an operator
  still needs an API call to change the rule. That is a deliberate scope line — the editor belongs
  with the ICP definition editor already planned for that page (`2026-08-03-crm-icp-score-spec` §8.2)
  and should be one form, not two. Because it is explicitly excluded rather than a partial
  implementation, it does not create an implementation handoff item in this spec.
- **A real data model for deposits.** The correct long-run fix is a boolean/enum on the invoice line
  (`fin_invoice_items.is_deposit`, set at ingest by the provider adapter) rather than a substring
  match on free text. That is DDL plus an ingest change plus a backfill — a different, larger spec.
  This one keeps the matching strategy and only moves *where the words come from*.
- **Smarter matching**: accent-insensitive comparison, stemming, full-text search, regex rules,
  per-product overrides, LLM classification. Substring + case-insensitive, exactly as today.
- **The other single-tenant hardcodes in these same files** (clinic names, DNI/Peru phone patterns,
  Spanish labels elsewhere). Same debt class, separate proposals — including
  `2026-08-17-gw-defaces-crm-tools` for the gateway copy (⚠️ A2). Do not opportunistically widen the
  diff; `crm-*.service.ts` files are contended by the CRM specs listed at the top and a wide diff
  guarantees a painful rebase.
- **Changing revenue semantics.** Whatever a deposit currently counts toward, it still counts toward.
  This spec changes *which strings are recognised as deposits*, never *what recognition implies*.
- **Schema changes.** No column, table, or migration in either repo. If a slice appears to need one,
  stop and re-spec.

## 6. End-to-end verification

Run with all three slices merged, on the live hub base branch confirmed in Slice 0, against a dev org.

```bash
cd minion_hub

# 1. Gates (logic/test-tagged: no design/token lint required — see §5)
bun run check                                   # 0 errors / 0 warnings
bun run vitest run                              # full suite green; no new skips
                                                #   ← the proposal's "existing tests green"
git diff --name-only <base>...HEAD | grep -E '\.svelte$'              && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && echo "FAIL: no DDL" && exit 1
git -C .. diff --name-only <meta-base>...HEAD | grep -E '^supabase/migrations' && echo "FAIL: no DDL (meta)" && exit 1

# 2. The proposal's DoD, literally
rg -n -i 'reserva' src/server/ --glob '!*.test.ts' --glob '!crm-deposit-rule.ts'   # → zero hits
rg -n 'depositMatchSql|notDepositMatchSql|resolveDepositRule' \
   src/server/services/crm-finance.service.ts \
   src/server/services/crm-similarity.service.ts \
   src/server/services/crm-journey.service.ts    # → all three services consume the module

# 3. Sibling-repo check (⚠️ A2) — paste the result in the PR either way
rg -n -i 'reserva' ~/work/minion/src ~/work/paperclip-minion ~/work/packages

# 4. Behavior, on a real dev org (the whole spec in one pass)
#    a. seed/choose a fixture with one invoice-item description containing "reserva", then record
#       the baseline with no crm_settings.deposit key
curl -s "$HUB/api/crm/contacts/$C/finance" -H "$AUTH" | jq '{revenue,invoices}'   # record
curl -s "$HUB/api/crm/contacts/$C/journey"  -H "$AUTH" | jq '[.[] | select(.kind=="milestone")]'
#    b. set the org's rule to a vocabulary the data does NOT use
curl -s -X PUT "$HUB/api/crm/settings" -H "$AUTH" -H 'content-type: application/json' \
     -d '{"deposit":{"keywords":["adelanto"],"label":"Adelanto"}}' | jq
#    c. the SAME two reads must now differ — deposit lines re-enter revenue and the booking
#       milestone disappears (or reappears under the new label, per the fixture)
#    d. set keywords back to ["reserva"] → both reads return to the step-(a) values, exactly
#    e. confirm the sibling key survived the write:
psql "$DB" -c "select value from crm_settings where org_id = '$ORG'"   # disabled_channels intact
#    f. PUT an over-long / 21-item / unknown-key body → 400 and the row is unchanged

# 5. Perf note (S3)
#    explain analyze the finance query at 1 and 20 keywords on the largest dev org; paste both.
```

**Ship gate:** §6 all green; the proposal's DoD checked clause by clause (one shared constant —
step 2; three services consume it — step 2; existing tests green — step 1); S0's polarity table and
the A2 sibling-repo grep pasted into the PR; the A3 staleness decision (implemented, or dropped with
the evidence that it does not apply) stated explicitly; and Slice 0's recorded actuals reconciled
against §3, with any correction committed to this spec in the same PR.
