---
id: 2026-08-18-hub-funnel-atomic-write-spec
title: "Make crm_contacts.custom_fields writes atomic — jsonb_set instead of read-modify-write"
stage: done
status: shipped
pass: 2
created: 2026-08-18
updated: 2026-08-20
proposal: 2026-08-17-hub-funnel-atomic-write
verdict: approved
repos: [minion_hub]
tags: [logic, test]
type: fix
evidence: https://github.com/NikolasP98/minion_hub/pull/125
shipped_reason: "Verified shipped: hub PR #125 (funnel atomic write) merged to master 2026-08-20 after conflict-resolution run, CI green, Vercel deployed."
---

# Make `crm_contacts.custom_fields` writes atomic

**Owner surface:** `minion_hub` — `src/server/services/crm-contacts.service.ts` (the `_funnel`
writer, ~`:1009` as of the proposal's authoring date), the contact-detail `custom_fields` PATCH
route (`src/routes/api/crm/contacts/[id]/+server.ts` per the CRM plan's route table — confirm in
Slice 0), and the CRM contacts service test file.

**Design ancestors:**
[`2026-06-13-crm-plugin-recon-and-plan`](2026-06-13-crm-plugin-recon-and-plan.md) (names
`custom_fields jsonb DEFAULT '{}'` on `crm_contacts`, the `withOrgCore`/`app_ledger` GUC-RLS
transaction convention every CRM read/write must route through, and the PATCH route that accepts
`custom_fields` from the contact-detail UI),
[`2026-07-23-crm-relationship-graph-v2-spec`](2026-07-23-crm-relationship-graph-v2-spec.md) and
[`2026-08-03-crm-relationship-graph-v2-port-spec`](2026-08-03-crm-relationship-graph-v2-port-spec.md)
(the `_relationship` reserved key's WP3 requirement was itself "writes use an atomic `jsonb_set`
JSON-path setter — `_funnel`'s read-modify-write is not concurrency-safe"; that PR **shipped**
per the shipped frontmatter of `2026-08-03-crm-relationship-graph-v2-port-spec`, so Slice 0 must check whether an
atomic setter already exists for `_relationship` and was simply never reused for `_funnel`),
[`2026-08-03-crm-icp-score-spec`](2026-08-03-crm-icp-score-spec.md) (a third reserved key, `_icp`,
**not yet built** — its spec explicitly requires reusing "the relationship slice's [setter] if that
lands first," i.e. this exact deferred work; landing this spec first is the smaller, cleaner order),
[`2026-08-17-hub-distinct-visit-dates-spec`](2026-08-17-hub-distinct-visit-dates-spec.md) §⚠️A5 (the
first spec whose own DoD depends on this one shipping first — see §4 Coordination below),
[`2026-08-17-hub-updatesellable-silent-drop-spec`](2026-08-17-hub-updatesellable-silent-drop-spec.md)
(the "Slice 0 is mandatory, minion_hub not checked out from the meta-repo" spec shape this spec
follows)
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — every slice below is tagged `logic`/`test`: mandatory red-state TDD, **no** UI-governance
checks. No `.svelte` file and no migration file is edited in any slice (§5), so the `ui` and `data`
tag gates do not apply despite the source proposal's own `data` tag (that tag describes the *column
being jsonb*, not a schema change — this spec ships zero DDL).

---

## 0. Product

From the approved proposal `2026-08-17-hub-funnel-atomic-write`, verbatim:

> ## Problem
>
> src/server/services/crm-contacts.service.ts:1009 spreads the whole customFields JSONB locally
> then overwrites the column — concurrent writes to other keys in the window are lost.
>
> ## Definition of done
>
> jsonb_set (or select-for-update in the existing withOrgCore txn); test issues two concurrent
> writes to different keys and both survive.
>
> ## Out of scope
>
> Funnel logic itself.

**Why this matters now, not hypothetically.** `custom_fields` on `crm_contacts` is a shared jsonb
bag with three reserved keys in flight: `_funnel` (shipped, the bug's origin), `_relationship`
(shipped 2026-08-05), and `_icp` (spec-only, blocked on exactly this fix per its own spec). Every
one of them can be written by a **background tick** (funnel-analyze, relationship-inference,
future icp-tick) at the same moment a **user edits a custom field** in the contact-detail UI, or two
ticks land in the same window. A read-modify-write on the whole column means whichever writer
commits second silently discards the other's key — not a merge conflict, not an error, just data
loss with no signal. `2026-08-17-hub-distinct-visit-dates-spec` (§⚠️A5, drafted the same day as
this proposal) documents that its own S2 is about to make the `_funnel` writer fire on **every**
auto-detected stage transition instead of never — i.e. it is about to turn a latent bug into an
active one. This spec is the fix that unblocks it.

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion_hub/` is not checked out** (the
meta-repo `.gitignore` excludes every subproject; verified: no `crm-contacts.service.ts` on disk
here). Every path, line number, and behavioral claim below is carried from the proposal (written
2026-08-17, one day old — strong) or from specs/memory dated 2026-06-13 through 2026-08-17 (up to
two months old on the oldest — line numbers have almost certainly moved, and the code has grown:
the `_funnel` writer moved from `~:802-829` in the 2026-08-03 memory note to `~:1009` in the
2026-08-17 proposal, i.e. ~180 lines of intervening growth). Treat every specific below as a lead,
not fact. Slice 0 turns them into fact; if something moved, reconcile the implementation and PR
description to the verified equivalent. If a load-bearing behavior or required write site does
not exist, stop and route a spec revision through the factory rather than changing scope silently.

Five carried claims are load-bearing:

1. **The `_funnel` writer does `select customFields → spread the object → update the whole
   column`** (`/memory/MINION/crm-icp-score-spec.md`, ★★★-flagged; corroborated by the proposal
   and by `2026-08-17-hub-distinct-visit-dates-spec` A5). If the shape has changed since — e.g. it
   already narrowed to a single-key write — this spec's Slice 1 shrinks to a verification-only
   pass, not a rewrite; say so in the PR.
2. **A second write site exists**: the contact-detail PATCH route accepts a `custom_fields` object
   from the UI (`2026-06-13-crm-plugin-recon-and-plan` route table: `contacts/[id]/+server.ts …
   PATCH (name, owner, override, custom_fields)`). This is the proposal's actual "concurrent writes
   to other keys" partner — a user editing a visible custom field while a background tick writes a
   reserved key (or two ticks landing together). If Slice 0 finds this route already does a
   targeted merge (not a whole-column overwrite), Slice 2 (below) narrows to a regression test only.
3. **An atomic `jsonb_set` setter for `_relationship` may already exist.** `_relationship`'s design
   spec named "atomic `jsonb_set` JSON-path setter" as a WP3 requirement, and the port spec is
   marked shipped. **Slice 0 must grep for it before writing a new one.** If it exists and
   is general enough (contact id + key + value → single `UPDATE … SET custom_fields = jsonb_set(…)`
   statement), Slice 1 becomes "extract it to a shared, exported helper and point `_funnel` at it,"
   not "write jsonb_set from scratch" — cheaper, and it adds evidence from `_relationship` having
   been live for nearly two weeks. If it exists but is relationship-specific
   (e.g. hardcoded to the `_relationship` key, or bundled with inference-lease logic), Slice 1
   extracts the generic shape out of it rather than duplicating.
4. **All CRM writes route through `withOrgCore`** (`with-org-core.ts:38`,
   `2026-06-13-crm-plugin-recon-and-plan` — "CRM services may not import `getCoreDb`" because the
   default connection bypasses RLS). `/memory/MINION/hub-org-scoping-rls.md` makes this a hard
   isolation constraint: the wrapper owns the transaction, assumes the `app_ledger` role, and sets
   `app.current_org_id`. The fix changes SQL inside that transaction; a helper must accept the
   existing transaction handle rather than opening a nested/separate `withOrgCore` transaction.
5. **`crm_contacts` lives in the hub's Supabase Postgres** (not the Turso DB — the CRM plan is
   explicit that `custom_fields jsonb` needs `jsonb_set`/Postgres jsonb operators, which Turso/SQLite
   does not have). No migration is implied by this fix: the column exists, only the write path
   changes.

**Branch discrepancy to settle before branching.** Per `2026-08-17-hub-updatesellable-silent-drop-spec`
and `2026-08-17-hub-distinct-visit-dates-spec`, hub's live base is disputed (AGENTS.md says `dev`;
other specs say `origin/dev` was deleted and `origin/master` is live). Run
`git -C minion_hub branch -r` and branch off whatever is actually live; do not resurrect a branch to
match stale docs. **`crm-contacts.service.ts` and `crm-funnel.ts` are contended files** — at least
two other in-flight specs (`2026-08-13-crm-customers-server-pagination-spec` S2,
`2026-08-17-hub-distinct-visit-dates-spec`, `2026-08-17-hub-reserva-keyword-config-spec`) touch the
same neighborhood. Check `git log --oneline -20 -- src/server/services/crm-contacts.service.ts`
before starting; scope commits narrowly; never `git add -A`.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_hub
git branch -r                                                     # settle the base branch
git log --oneline -20 -- src/server/services/crm-contacts.service.ts   # in-flight collisions

test -f src/server/services/crm-contacts.service.ts
rg -n -B15 -A25 'customFields' src/server/services/crm-contacts.service.ts | rg -n -C15 '_funnel'
                                    # confirm the exact RMW shape and current line number
rg -n 'select.*custom_?[Ff]ields|customFields' src/server/services/crm-contacts.service.ts
                                    # every read of the column — how many writers exist

# claim 2 — the second write site
rg -l 'custom_?[Ff]ields' src/routes/api/crm
rg -n -B10 -A30 'customFields' src/routes/api/crm/contacts/**/+server.ts 2>/dev/null
                                    # (use rg's own -g glob if ** errors — bash won't expand it
                                    #  without `shopt -s globstar`)
rg -n 'customFields|custom_fields' src/routes/api/crm -g '**/contacts/**/+server.ts'

# claim 3 — an existing atomic setter, possibly built for _relationship
rg -n 'jsonb_set' src/server/services/*.ts src/server/db/*.ts
rg -n '_relationship' src/server/services/crm-contacts.service.ts | rg -n -C15 'jsonb_set|update\('
rg -n 'setContactCustomField|mergeCustomFields|setCustomField' src/server/services
                                    # any existing generically-named helper

# enumerate every reachable writer, not only the two expected sites; a remaining stale
# whole-column writer can still clobber the new targeted update
rg -n 'customFields\s*:|custom_fields\s*=' src/server src/routes -g '*.ts'

# claim 4/5 — transaction + DB family
rg -n 'withOrgCore' src/server/services/crm-contacts.service.ts | head
rg -n 'app_ledger|getCoreDb' src/server/services/crm-contacts.service.ts
rg -n "custom_fields jsonb" supabase/migrations/*.sql packages/db/src/pg/schema/crm.ts 2>/dev/null

test -f src/server/services/crm-contacts.service.test.ts || \
  rg -l 'crm-contacts' src/server/services -g '*.test.ts'    # regression home; create if absent

# does the funnel writer need to READ the current value for business logic (forward-only guard,
# manual-override check), independent of the atomicity bug? If yes, Slice 1's fix keeps that
# targeted read but replaces the WHOLE-COLUMN write with a targeted jsonb_set/merge write.
rg -n -B5 -A40 'function.*[Ff]unnel' src/server/services/crm-contacts.service.ts | rg -n 'override|forward|stage'
```

Record the actuals in the PR description. Nothing else in Slice 0 changes files.

## 2. Approach — two vertical slices

```
S0 (recon) ─▶ S1 (atomic primitive + convert the _funnel writer) ─▶ S2 (close the second write site + deterministic concurrency proof)
```

Sequential for implementation, but **S1 and S2 are one ship unit**. S1 removes the vulnerable
whole-column write from `_funnel`; it is not safe to ship as a completed fix while another current
writer can still overwrite the whole column from a stale snapshot. S2 converts that race partner
and supplies the proposal's literal concurrency proof. If Slice 0 finds additional reachable
whole-column read/merge/write sites, convert them in S2 or stop and amend the spec before shipping;
leaving one behind would make the definition of done false.

---

### S1 — Atomic per-key setter; convert the `_funnel` writer

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** provide a transaction-local atomic primitive and convert the `_funnel` writer to a
single-statement targeted update. The repo-wide no-stale-writer invariant is completed in S2.

**Do:**
- Per Slice 0 claim 3: **if an atomic setter already exists for `_relationship`**, extract its
  generic shape (contact id + org scope + key + value → one `UPDATE`) into an exported helper and
  delete the relationship-specific wrapper's duplicate SQL, calling the shared helper instead — do
  not maintain two copies of the same statement shape. **If none exists**, add one:
  ```ts
  async function setContactCustomField(
    tx: CoreTransaction,
    contactId: string,
    key: string,
    value: JsonValue,
  ) {
    return tx.update(crmContacts)
        .set({
          customFields: sql`jsonb_set(coalesce(${crmContacts.customFields}, '{}'::jsonb), ARRAY[${key}]::text[], ${JSON.stringify(value)}::jsonb, true)`,
          updatedAt: sql`now()`,
        })
        .where(eq(crmContacts.id, contactId));
  }
  ```
  Exact Drizzle syntax (raw `sql` template vs. a query-builder jsonb helper if one exists in this
  Drizzle version) is confirmed in Slice 0/at implementation time — the shape above is the target,
  not literal code to paste. **No `SELECT` of `custom_fields` in this function** — that is the
  entire fix: the previous shape read the column into JS, spread it, and wrote the merged object
  back over the whole column; this shape asks Postgres to merge one key in a single atomic
  statement, so a second concurrent writer targeting a different key can never observe or clobber
  the first's key, regardless of commit order.
  The type name and exact Drizzle expression are illustrative. The load-bearing requirements are:
  (a) the caller's existing `withOrgCore` callback passes its `tx`; (b) path and JSON value are bound
  parameters, never `sql.raw`/string interpolation; (c) the statement updates one top-level key;
  and (d) the existing org predicate remains if the current service uses defense in depth in
  addition to RLS. Because the helper is generic, it must not silently reject valid user-field keys;
  an allowlist belongs at a reserved-key-only caller, not in the SQL primitive. Use the repo's
  existing JSON value type/validator if its name differs; `undefined` and non-serializable values
  must be rejected before the query.
- Per Slice 0's last recon line: if the current `_funnel` writer reads the existing value for
  business logic unrelated to the atomicity bug (e.g. a forward-only stage guard, or refusing to
  overwrite a manual `lifecycle_override`), **keep that read** — it is a correctness decision, not
  the bug. Only the *write* changes: replace `update({ customFields: mergedWholeObject })` with
  `setContactCustomField(tx, contactId, '_funnel', newFunnelValue)`. Do not fold the read-based
  decision logic into this spec's scope beyond preserving its existing behavior byte-for-byte —
  that logic is funnel semantics, the proposal's explicit **out of scope**.
- If the DoD's alternative ("select-for-update in the existing withOrgCore txn") turns out to be
  the better fit for a writer whose business logic genuinely needs a locked read *and* a merge
  wider than one key in a single statement, implement that instead: `SELECT … FOR UPDATE` and the
  `jsonb_set`-based (not whole-object) `UPDATE` inside the same `withOrgCore` callback and transaction.
  The row lock plus a targeted write is equally safe against the "lost key" bug (the second writer
  blocks until the first commits, then reads the merged state); it costs a lock wait the pure
  `jsonb_set` path does not. Prefer pure `jsonb_set` unless Slice 0 shows a concrete reason it can't
  express the writer's actual logic.

**Files:** `src/server/services/crm-contacts.service.ts` (setter + `_funnel` writer), the CRM
contacts service test file (create `crm-contacts.service.test.ts` if Slice 0 shows it absent).

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/crm-contacts.service.test.ts
#   red-state first (G3): the focused SQL-shape assertion must fail pre-fix; parity cases may pass
#   - seed a contact with custom_fields = {"_relationship": {...}, "someUserField": "x"}
#   - call the _funnel writer to set a new stage
#   - re-read the row: `_relationship` and `someUserField` are JSON-deep-equal to before the call
#     (parity only: this correctly passes pre-fix because a sequential object spread preserves keys)
#   - the setter's generated SQL contains no `SELECT … custom_fields` in its own statement
#     and uses bound path/value parameters (assert with a query-log spy or focused source check)
#   - if a forward-only or manual-override guard existed pre-fix, assert it still fires identically
#     (parity case — same input, same guarded outcome, before and after)
#   - same contact id under a different org context updates zero rows and leaves the row unchanged,
#     proving the helper did not bypass the `withOrgCore`/RLS boundary
bun run check                                   # 0 errors / 0 warnings
rg -n 'setContactCustomField|jsonb_set' src/server/services -g '*.ts'       # inspect shared definition + _funnel call, not N ad-hoc copies
```

---

### S2 — Close the second write site; prove real concurrency, not just correctness

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** the proposal's DoD sentence *literally* — "test issues two concurrent writes to different
keys and both survive" — against genuinely overlapping database transactions, and the race's other
half (claim 2: the user-facing `custom_fields` PATCH route) no longer overwrites the whole column
either.

**Do:**
- Per Slice 0 claim 2: if the contact-detail PATCH route writes `custom_fields`, convert it to one
  atomic statement too. First lock down its existing omission/deletion contract with a characterization
  route/service test; atomicity must not silently change whether an omitted user key is retained or
  deleted. If the current payload is a partial patch, use a **jsonb shallow merge**, not
  `jsonb_set` per key:
  ```sql
  UPDATE crm_contacts
  SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $submittedFields::jsonb,
      updated_at = now()
  WHERE id = $1 AND org_id = current_setting('app.current_org_id', true)
  ```
  `||` is a top-level shallow merge: keys present in `$submittedFields` overwrite; every other key
  (including hidden reserved keys `_funnel`/`_relationship`/`_icp`, which the editor never sends
  because they're hidden from it per the relationship spec's "reserved-key handling identical to
  `_funnel`: hidden from the custom-fields editor") passes through untouched in one statement, with
  no application-side read. If the current contract treats omission as deletion from the
  user-editable namespace, implement that replacement in one SQL expression while preserving the
  reserved keys from the row version PostgreSQL locks for the update. If deletion uses an explicit
  signal, preserve that signal with the jsonb `-` operator. In every variant, absent reserved keys
  from the editor are never deletions, and parity tests cover add, overwrite, explicit delete, and
  omission.
- **Concurrency test — the proposal's DoD, literally, against a real DB and a controlled
  interleaving:**
  ```ts
  // A coordinator connection holds SELECT ... FOR UPDATE on the contact before these calls start.
  // Each legacy writer can read but blocks when it attempts UPDATE; release only after the test
  // observes both blocked UPDATE attempts. Promise.all alone is not this barrier.
  await Promise.all([
    invokeFunnelWriter(ctx, contactId, { stage: 'customer' }), // actual public writer from Slice 0
    patchContactCustomFields(ctx, contactId, { favoriteColor: 'blue' }), // the S2 route's service call
  ]);
  const row = await getContact(ctx, contactId);
  expect(row.customFields._funnel).toEqual({ stage: 'customer' });
  expect(row.customFields.favoriteColor).toBe('blue');
  ```
  This must run against the real test Postgres connection (per house rule: CRM tests exercise real
  RLS/`withOrgCore`, not a mock — `2026-06-13-crm-plugin-recon-and-plan` §9's isolation-test
  precedent), using a coordinator plus two independent connections/transactions. The coordinator
  acquires a row lock first; a query-log hook or `pg_stat_activity`/lock observation confirms both
  writer transactions have reached their blocked `UPDATE` before commit releases the lock. Under
  the pre-fix RMW implementation both stale snapshots are therefore captured and one key is lost;
  under atomic SQL each right-hand expression is evaluated against the row version obtained after
  its lock wait, so both keys survive. A mock or plain `Promise.all` is nondeterministic and cannot
  satisfy G3. Run both writer start orders.
- A third case for the two-tick scenario named in §0: `_funnel` and (a stand-in for) `_relationship`
  writers firing concurrently on the same contact — same assertion shape, proves the fix generalizes
  across reserved keys, not just funnel-vs-user-edit.

**Files:** `src/server/services/crm-contacts.service.ts` (PATCH-route service function, if it needs
the merge conversion per claim 2), the PATCH route's `+server.ts` (only if the merge logic currently
lives inline in the route handler rather than the service), the CRM contacts service test file.

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/crm-contacts.service.test.ts
#   - deterministic barrier case above: both keys present after both release orders
#   - the same test recorded red against the pre-fix writer by losing one key
#   - two-reserved-key concurrent write case (funnel vs relationship-shaped key): both survive
#   - PATCH route service call no longer contains a `select … custom_fields` immediately followed
#     by an in-memory spread-and-reassign of the same object (rg-verifiable pattern, or a
#     query-log-count assertion: exactly one statement touches custom_fields per call)
#   - existing PATCH route tests (name/owner/override edits) still pass unchanged — no behavior
#     change for the non-custom_fields fields on the same route
#   - PATCH add/overwrite/delete/omission semantics match the pre-fix contract; reserved keys survive
#   - missing-contact/not-authorized status and response behavior remain identical to the old route
bun run vitest run                              # full hub suite green, no new skips
bun run check                                   # 0 errors / 0 warnings
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/server/services/crm-contacts.service.ts` | S1, S2 | `setContactCustomField` (new or extracted), `_funnel` writer converted, PATCH-route merge converted |
| Existing `_relationship` setter owner (exact path from Slice 0) | S1 | only if the shared atomic primitive already lives outside `crm-contacts.service.ts`; reuse or extract without changing relationship behavior |
| PATCH route `+server.ts` for `contacts/[id]` (exact path from Slice 0) | S2 | only if the merge logic lives inline in the route rather than the service |
| CRM contacts service test file (create if absent) | S1, S2 | red-state parity tests + real-DB concurrency tests |

All paths relative to `minion_hub/`. **No `.svelte` file is edited in any slice** — see §5.
**No migration file, no schema change** — the `custom_fields jsonb` column already exists; this
spec only changes the SQL text of the statements that write to it. Zero DDL in either repo.

## 4. Cross-repo impact

Checked against AGENTS.md's "Cross-Project Impact Zones" table:

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion_site` (shares the DB with hub) | **None.** No column, table, or type touched | CI guard: `git diff --name-only <base>...HEAD \| grep -qE '^(src/server/db/schema/\|supabase/migrations/)' && exit 1` |
| `@minion-stack/db` | **None** — no schema edit ⇒ no version bump, no changeset | same guard |
| `@minion-stack/shared` / gateway WS frames | **None** — internal service + REST route, no frame type touched | — |
| `packages/*` in this meta-repo | **None** — schema and shared protocol stay unchanged | no package edit in §3 |
| `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None visible from AGENTS.md's impact table** — this is a hub-internal service function, not a shared protocol surface | — |
| `minion/` gateway CRM tools | **No contract change expected** — callers that use the hub REST route inherit the corrected semantics; direct database writers would be an impact | If a sibling checkout is available, verify no direct `crm_contacts.custom_fields` SQL; absence of the sibling repo does not block this hub-only fix |

### ⚠️ A1 — Coordination with `2026-08-17-hub-distinct-visit-dates-spec` (same repo, sibling spec)

That spec's §⚠️A5 explicitly names this proposal, states it will **amplify** the bug (auto-detection
currently never fires, so the racy writer is never exercised; that spec's S2 turns it on), and
instructs: *"if this proposal is approved and in flight when its S2 starts, land the atomic writer
first and rebase on top."* This spec is now in-spec — when this spec's dev stage begins, check
whether `2026-08-17-hub-distinct-visit-dates-spec` has moved past its own Slice 0/S1 boundary and,
if so, flag the collision instead of two agents racing the same file. Record the dependency and
landing order in the implementation PR so the sibling spec can rebase on the atomic writer.

### ⚠️ A2 — `crm-contacts.service.ts` is a contended file (four other specs touch it)

`2026-08-13-crm-customers-server-pagination-spec` S2, `2026-08-17-hub-distinct-visit-dates-spec`,
and `2026-08-17-hub-reserva-keyword-config-spec` all edit this file or its immediate neighborhood
per their own "contention warning" sections. Scope every commit narrowly to the setter and the two
write sites; never `git add -A`; expect to rebase.

## 5. Out of scope (explicit)

- **Funnel logic itself** — the proposal's own exclusion. Stage-transition thresholds, the
  forward-only/manual-override policy (if one exists — Slice 0 confirms), and which events cause a
  `_funnel` write are untouched. This spec only changes *how* the write reaches the database, never
  *when* or *to what value*.
- **The `_relationship` and `_icp` writers' business logic.** Reusing/extracting an already-atomic
  relationship helper must preserve its behavior. `_icp` has no writer yet (spec-only); this spec
  does not build one, it only leaves an atomic primitive available for that future implementation.
- **UI changes.** No `.svelte` file is touched: no new error states, no optimistic-update changes,
  no "saved" indicator changes. The custom-fields editor keeps sending whatever it sends today; only
  the service-layer write underneath it changes. Per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b,
  the `ui` tag and its governance gates do not apply.
- **Schema changes.** No new column, table, index, or migration file. If a slice appears to need
  one (e.g. a reserved-key registry table), stop and re-spec — that is a different, larger piece of
  work than "make the existing column's writes atomic."
- **A generic "reserved key registry" abstraction.** The SQL primitive safely binds any top-level
  key; reserved-key authorization/validation remains at its current caller boundaries. Building a
  formal registry/enum is not required by this fix.
- **Backfilling or auditing data already lost to the pre-fix race.** Unknown how many contacts have
  a silently-dropped key today; a detection query is a separate proposal, and it should be written
  with whichever key-count Slice 0/S1 makes cheap to obtain.
- **The gateway's CRM tool surface** (`2026-08-17-gw-defaces-crm-tools-spec`). The meta-repo
  architecture gives the gateway no direct hub-Postgres write path, and this fix does not change a
  REST or WS contract; callers of the hub route inherit its corrected storage semantics.

## 6. End-to-end verification

Run with both slices merged, on the live hub base branch confirmed in Slice 0.

```bash
cd minion_hub

# 1. Gates (logic/test-tagged: no design/token lint required — see §5)
bun run check                                   # 0 errors / 0 warnings
bun run vitest run                              # full suite green, no new skips
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                       && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E '(supabase/migrations|db/schema)' && echo "FAIL: no DDL in this spec" && exit 1

# 2. The proposal's DoD, literally: two concurrent writes to different keys, both survive
bun run vitest run src/server/services/crm-contacts.service.test.ts -t "concurrent"

# 3. No reachable hub writer of custom_fields still does read-whole-spread-write-whole
rg -n -B3 'custom_?[Ff]ields' src/server src/routes -g '*.ts' | rg -B3 'select\(' \
  && echo "REVIEW: confirm this select is not immediately followed by a spread-and-overwrite of the same column"

# 4. Optional sibling-repo direct-writer check when those repos are present
for d in ../minion/src ../minion/extensions ../paperclip-minion; do
  test ! -d "$d" || rg -n -i 'custom_fields|crm_contacts' "$d"
done

# 5. Operator smoke probe against a running dev server (the deterministic proof is step 2)
#    (C = a contact id with an existing non-reserved custom field, e.g. {"favoriteColor":"blue"})
( curl -s -X POST "$HUB/api/crm/contacts/$C/funnel/analyze" -H "$AUTH" & \
  curl -s -X PATCH "$HUB/api/crm/contacts/$C" -H "$AUTH" -H 'content-type: application/json' \
    -d '{"custom_fields":{"favoriteColor":"green"}}' & \
  wait )
curl -s "$HUB/api/crm/contacts/$C" -H "$AUTH" | jq '.custom_fields'
#   both the analyze call's stage write AND the PATCH's favoriteColor:"green" must be present —
#   the pre-fix bug would silently drop whichever request's write lost the race
```

**Ship gate:** §6 all green, the proposal's DoD sentence checked off literally (step 2, real
concurrent writes to different keys, both survive), A1's landing order recorded in the PR, A2's
sibling-spec collision check re-run at merge time, and Slice 0's recorded actuals reconciled
against §1/§3.
