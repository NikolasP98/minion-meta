---
id: 2026-08-17-hub-pos-appointments-fork-spec
title: "Collapse the /pos/appointments fork into one bookings view — extract the component, don't delete the route"
stage: spec
status: implementing
pass: 2
created: 2026-08-17
updated: 2026-08-28
proposal: 2026-08-17-hub-pos-appointments-fork
verdict: approved
repos: [minion_hub, minion-meta]
tags: [ui, logic, test]
type: fix
reconcile_ignore: true
reconcile_ignore_reason: "Denied: PR #135 merged only Slice 2 after the Slice 1 characterization harness. Slice 3 remains in open draft PR #137 and Slice 4 route-contract/count/smoke closure is not merged."
---

# Collapse the `/pos/appointments` fork into one bookings view

**Owner surface:** `minion_hub` on branch `dev` — `src/routes/(app)/pos/appointments/*`,
`src/routes/(app)/scheduling/bookings/*`, a new shared view under
`src/lib/components/scheduling/`, a shared server loader under the server-only convention discovered
in §1, and every route-discoverability surface found by §1.3/§5.2. Known surfaces are
`src/lib/routes/route-design-manifest.ts`, `src/lib/routes/route-design-validation.ts`,
`src/lib/routes/route-design-contracts.test.ts`, `src/lib/state/features/assistant-context.ts`, the
availability manifest or equivalent gate, `src/lib/routes/route-access-registry.ts`, and
`src/lib/components/layout/sections.ts`. Most are verification-only on the view branch. A redirect or
archetype correction also conditionally updates the meta-repo Figma coverage ledger named in §5.1.

**Design ancestors (read before starting):**
[`2026-07-22-hub-routing-simplification-spec`](2026-07-22-hub-routing-simplification-spec.md) — §R1
declares `/pos/appointments` a **composite availability entry**
(`posAppointments: { appPrefixes: ['/pos/appointments'], requires: ['pos','scheduling'] }`), §R1 also
states RBAC stays in `route-access-registry` and is **not** derived from the availability map, §R4
records the live inconsistency *"disabled scheduling bookings → 403 vs disabled stock items → 404"*,
§R5 flags `pos/+layout.server.ts:17` as returning stock+scheduling availability **as data** to the POS
UI, and §R7 rules that route-design contracts stay independent and are **not** derived from the
manifest;
[`2026-07-13-hub-ui-coherence-implementation-spec`](2026-07-13-hub-ui-coherence-implementation-spec.md)
§D6 (route archetypes, one scroll owner), §D7 (`route-design-manifest.ts` is the source of truth for
page composition, and it distinguishes `ScreenDesignMeta` from `RedirectDesignMeta { target,
preserveQuery }`);
[`2026-07-13-hub-figma-screen-coverage-ledger`](2026-07-13-hub-figma-screen-coverage-ledger.md) —
records the two routes at **different archetypes**: `COLL /scheduling/bookings` vs
`WORKSPACE /pos/appointments`;
[`2026-07-22-personal-org-differentiation-spec`](2026-07-22-personal-org-differentiation-spec.md) §R6 —
`scheduling/bookings/+page.server.ts:36` loads **stock accruals** and `+page.svelte:114` offers
**"Create sales order" → `/sales`**, both listed as *known kind-leak bugs awaiting `effectiveModuleEnabled`*;
[`2026-08-03-crm-relationship-graph-v2-port-spec`](2026-08-03-crm-relationship-graph-v2-port-spec.md)
§H3 — the worked precedent for bumping the route-contract counters (`endpoints`, `screens`, bucket
letters, section comments) and the warning about copying numbers from a stale branch.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — per-slice tags below are the routing unit. Slices 2 and 3 are `ui`-tagged: they pull the
`ui-design-governance` skill and `bun run lint:design && bun run lint:tokens` into selfTest, and the
design-debt ratchet **may only decrease**. Slices 1 and 4 are `logic`/`test`: red-state TDD applies,
UI governance does not.

---

## 0. Product

From the approved proposal `2026-08-17-hub-pos-appointments-fork`, verbatim:

> ## Problem
>
> Two independent implementations of the same booking domain: pos/appointments/+page.svelte (732 lines)
> vs scheduling/bookings/+page.svelte (663). Drift guaranteed.
>
> ## Definition of done
>
> /pos/appointments is a thin filtered view or redirect over the scheduling component; route-contract
> manifest + 6 counts updated; both routes smoke-tested.
>
> ## Out of scope
>
> Booking feature changes; schema.

**The one place this spec argues with the proposal.** The DoD offers "thin filtered view **or**
redirect" as if they were interchangeable. They are not, and the difference is not cosmetic:

| | Thin filtered view | Redirect |
|---|---|---|
| RBAC | `/pos/appointments` keeps its own `route-access-registry` entry | The user is thrown at `/scheduling/bookings` and must satisfy **scheduling's** policy. A POS-only operator who can see appointments today gets a denial tomorrow |
| Availability | The composite `requires: ['pos','scheduling']` entry keeps working | The composite gate must run before the redirect so an ineligible org receives its existing denial instead of being sent into `/scheduling/bookings`; the POS nav must not retain a dead link |
| Shell | The page stays under `(app)/pos/+layout.svelte` — POS section nav, and the stock/scheduling availability that `pos/+layout.server.ts` hands the POS UI | The POS shell is lost mid-flow; the operator lands in a different module's chrome |
| Route contract | Both stay `screen`; counts do **not** move; archetype may need reclassification | `/pos/appointments` becomes a `RedirectDesignMeta`: screens −1, redirects +1, plus bucket and section-comment edits |
| Proposal's own DoD | "both routes smoke-tested" is naturally satisfied | Satisfied by asserting the specified 307 and its target/query contract |

So: **the thin filtered view is the default and this spec is written for it.** The redirect branch is
permitted only if Slice 1's audit proves *all three* of (a) zero POS-only affordances on the fork,
(b) identical RBAC reachability for every persona, and (c) no org in the target database has `pos`
enabled with `scheduling` disabled. §5.5 carries the extra work that branch incurs. Choosing the
redirect for its smaller diff while any of (a)–(c) is unproven is a behaviour change smuggled in under
a refactor, and the proposal's out-of-scope line ("booking feature changes") forbids it.

**Second correction, stated plainly:** the proposal's "6 counts updated" presumes the route class
changes. On the default (view) branch the honest DoD is the **opposite** — the counts must come out
**unchanged**, and the contract suite proves it without an edit. §5 handles both branches and forbids
the failure mode that matters: editing a hardcoded count until a test goes green without naming which
route changed class.

---

## 1. Discovery contract (run first — nothing below is safe without it)

`minion_hub` is a separate git repo and is **not** present in this meta-repo checkout (verified: no
`minion_hub/` directory on disk here; `.gitignore` excludes every subproject). Every path, line number
and count in this spec is therefore either quoted from a prior spec or a **hypothesis to re-derive**.
Run all of this from the `minion_hub/` root on branch `dev`, and paste the output into the PR body.

```bash
# 1.1 — the two forks exist, at roughly the claimed sizes
wc -l src/routes/\(app\)/pos/appointments/+page.svelte \
      src/routes/\(app\)/scheduling/bookings/+page.svelte
ls src/routes/\(app\)/pos/appointments/ src/routes/\(app\)/scheduling/bookings/

# 1.2 — what each route loads, and from where
rg -n "export const load|from '\\\$lib|from '\\\$app|service" \
   src/routes/\(app\)/pos/appointments/+page.server.ts \
   src/routes/\(app\)/scheduling/bookings/+page.server.ts

# 1.3 — the discoverability surfaces that name either route (the "6 counts" hunt starts here)
rg -n "pos/appointments|scheduling/bookings" src/lib/routes/ src/lib/state/ src/lib/components/layout/
rg -n "endpoints:|screens:|redirects:" src/lib/routes/route-design-validation.ts
rg -n "toBe\(|toHaveLength\(" src/lib/routes/route-design-contracts.test.ts

# 1.4 — did the availability manifest from 2026-07-22 actually ship? (that spec's status is `unknown`)
ls src/lib/modules/manifest.ts 2>/dev/null && rg -n "posAppointments|requires" src/lib/modules/manifest.ts
rg -n "pos\.appointments|scheduling\.bookings" src/lib/routes/route-access-registry.ts

# 1.5 — shared service layer already in place?
ls src/server/services/scheduling-bookings.service.ts
rg -n "export (async )?function" src/server/services/scheduling-bookings.service.ts | head -30

# 1.6 — green baseline BEFORE any edit
bun run check && bun run test && bun run lint:design && bun run lint:tokens
```

Recording rules:

- **1.1 materially off** (e.g. one file is 200 lines, or `/pos/appointments` has no `+page.svelte`) —
  the sweep read a different tree. Stop and report; do not "fix" the spec by improvising.
- **1.4 returns nothing** — the availability manifest never landed and `/pos/appointments` is gated
  some other way. Find that way (`rg -n "isModuleEnabled" src/routes/\(app\)/pos/`) and substitute it
  everywhere this spec says "availability manifest". The *shape* of the work does not change.
- **1.6 not green on an untouched tree** — record the pre-existing failures verbatim. They are the
  baseline; every later gate compares against them, not against zero.

---

## 2. Slice 1 — Differential audit + characterization harness *(tags: `logic`, `test`; ~5–7 h)*

You cannot deduplicate two 700-line pages by reading them side by side and trusting your memory. This
slice produces **two artifacts** and makes **one decision**, and it writes no production code.

### 2.1 The differential matrix (PR-body deliverable)

One table, one row per user-observable capability, three columns: *capability* ·
`/scheduling/bookings` · `/pos/appointments`. Minimum rows to cover — add whatever the files reveal:

| Category | What to enumerate |
|---|---|
| Data | every key each `+page.server.ts` returns; the service functions called; date-window defaults; pagination/limit; sort |
| Filters | status, date range, resource, event type, contact, free-text — and which are **preset/locked** on the POS side |
| Columns | every column rendered, its formatter (money → `formatMoney`?), its responsive priority |
| Row actions | reschedule, cancel, confirm, no-show, **charge-to-POS / create ticket**, open contact, … |
| Page actions | create booking, export, **"Create sales order" → `/sales`** (the §R6 known leak), refresh |
| Empty / error / loading | `EmptyState` vs hand-rolled markup; copy keys |
| i18n | every message key each page uses; note where the two pages use **different words for the same thing** |
| Realtime | any WS/invalidate/polling subscription |
| Archetype | declared `archetype`/`scroll` in `route-design-manifest.ts` (ledger says `COLL` vs `WORKSPACE` — confirm) |

Classify every row into: **identical** · **POS-only** · **scheduling-only** · **same intent, different
implementation** (the drift the proposal predicted — these are the interesting ones). For each
"different implementation" row, state which side wins and why in one sentence. **Divergent behaviour is
not silently normalized:** the union is preserved per-context via capability props (Slice 2); anything
that cannot be preserved is a behaviour change and blocks under "booking feature changes".

### 2.2 The characterization harness (the code this slice ships)

`src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts` — a vitest suite that
pins **today's** behaviour so Slices 2–3 can prove they changed nothing:

1. imports both `+page.server.ts` `load` functions and invokes each against a stubbed event
   (copy the stubbing idiom from an existing hub server-load test — do not invent a second one);
2. asserts the **exact key set** each load returns, plus the shape of the bookings array and the value
   of every preset filter the POS side applies;
3. asserts each route's `route-design-manifest.ts` entry (`kind`, `archetype`, `scroll`,
   `accessPolicyId`) and its `route-access-registry.ts` policy id;
4. asserts that the actual availability gate discovered in §1.4 still requires **both** `pos` and
   `scheduling`. If no testable gate can be identified, Slice 1 is blocked; do not skip this core
   preservation assertion.

Red-state proof (§4b, `logic`): before writing assertions, land one deliberately wrong expectation,
capture the failing output in the PR body, then correct it. A characterization suite that has never
failed has not characterized anything.

### 2.3 The decision (recorded, not assumed)

Answer (a)/(b)/(c) from §0 with evidence:

```bash
# (a) POS-only affordances — must be EMPTY for the redirect branch
#     (from the §2.1 matrix; a non-empty POS-only column means "view", full stop)
# (b) RBAC reachability
rg -n -A5 "pos\.appointments|scheduling\.bookings" src/lib/routes/route-access-registry.ts
# (c) orgs with pos enabled and scheduling disabled — run READ-ONLY against a non-production DB
#     SELECT org_id FROM app_modules WHERE feature_id='scheduling' AND enabled=false;
#     cross-reference against orgs with pos enabled. Remember: an ABSENT row means ENABLED
#     (modules.service.ts:26 — the trap named in the personal-org spec §R6).
```

Write **"Branch: view"** or **"Branch: redirect"** plus the evidence into the PR body. Default is view.

### 2.4 Definition of done

```bash
test -f src/routes/\(app\)/scheduling/bookings/bookings-routes.characterization.test.ts
bun run vitest run src/routes/\(app\)/scheduling/bookings/bookings-routes.characterization.test.ts  # green
git diff --name-only | rg -v "characterization\.test\.ts$" ; test $? -eq 1   # ONLY the test file changed
bun run check                                                               # no new errors vs 1.6 baseline
```

Plus, in the PR body: the §2.1 matrix, the §2.3 branch decision with evidence, and the red-state output.

---

## 3. Slice 2 — Extract `BookingsView` from the scheduling route *(tags: `ui`, `logic`; ~6–8 h)*

Deduplication happens in two moves, and this is the one that touches **only** the scheduling side. It
must be independently mergeable and independently revertable: if Slice 3 is abandoned, the hub is left
strictly better (one page, one component) rather than half-forked.

### 3.1 What gets built

**`src/lib/components/scheduling/BookingsView.svelte`** — the whole current
`scheduling/bookings/+page.svelte` body, parameterized. Props contract (Svelte 5 runes, `$props()`):

```ts
type BookingsViewProps = {
  data: BookingsViewData;                 // exactly what the shared loader returns (§3.2)
  capabilities: BookingCapabilities;       // keys derive from divergent affordances in §2.1
  presetFilters?: Partial<BookingFilters>; // applied on mount
  lockedFilters?: Array<keyof BookingFilters>; // rendered read-only, not hidden
  columns?: BookingColumnId[];             // default = today's scheduling column set
  labelNamespace?: 'scheduling' | 'pos';   // i18n key prefix ONLY
};
```

`BookingCapabilities` contains exactly the behavior switches justified by the matrix. Likely examples
are `createBooking`, `reschedule`, `cancel`, `createSalesOrder`, and `chargeToPos`, but names or
capabilities absent from the audited pages must not be invented merely to match this example.

**The iron rule that makes this reviewable:** `BookingsView.svelte` contains **zero** branches on
which route rendered it. Behaviour comes from `capabilities` / `presetFilters` / `columns`;
`labelNamespace` selects message keys and nothing else.

```bash
rg -n "pos|appointment" src/lib/components/scheduling/BookingsView.svelte \
  | rg -v "labelNamespace|chargeToPos" ; test $? -eq 1     # no route-awareness leaked in
```

**`src/routes/(app)/scheduling/bookings/+page.svelte`** becomes a wrapper: import the component, pass
`data`, pass the capability set that reproduces today's page exactly (including the current scheduling
value for `createSalesOrder` if that capability exists — the §R6 leak is preserved verbatim; fixing it here would be an unrequested
behaviour change owned by the personal-org spec).

### 3.2 The server half

Extract the scheduling `+page.server.ts` load body into
`src/server/scheduling/load-bookings-view.ts` (match the hub's existing server-module convention found
in 1.5) exporting `loadBookingsView(event, opts)` where `opts` carries only the server-side
preset/window/limit knobs identified by the §2.1 data audit. Client-only presentation props do not
belong in loader options. `scheduling/bookings/+page.server.ts` shrinks to a call plus its
existing `actions`. **Form actions stay on their routes** — SvelteKit resolves actions per route, and
per routing-simplification §R2 actions execute before page loads re-run; moving them is out of scope.

### 3.3 Governance (this slice is `ui`-tagged)

Invoke the `ui-design-governance` skill before the first `.svelte` edit. Extraction is the classic
moment a component "gains" a hand-rolled empty state or a raw `p-[13px]` during the copy. Non-negotiable:
semantic tokens only; `DataTable` / `EmptyState` / `Spinner` / `Button` / `formatMoney` primitives kept,
not re-implemented; the one-scroll-owner contract (§D6) preserved — the extracted component **must not**
introduce a second `overflow-y-auto`; any class forwarded to a primitive stays written as
`.scoped-ancestor :global(.class)` or it ships dead.

### 3.4 Files to touch

- **Create:** `src/lib/components/scheduling/BookingsView.svelte`
- **Create:** `src/server/scheduling/load-bookings-view.ts`
- **Modify:** `src/routes/(app)/scheduling/bookings/+page.svelte` (→ wrapper)
- **Modify:** `src/routes/(app)/scheduling/bookings/+page.server.ts` (→ delegate; `actions` untouched)
- **Must NOT appear in the diff:** anything under `src/routes/(app)/pos/`, any `.sql`, any
  `src/server/db/schema/**`, `route-design-*` (nothing about the scheduling route's contract changes)

### 3.5 Definition of done

```bash
test -f src/lib/components/scheduling/BookingsView.svelte
test $(wc -l < "src/routes/(app)/scheduling/bookings/+page.svelte") -lt 80      # wrapper, not a page
rg -n "pos|appointment" src/lib/components/scheduling/BookingsView.svelte \
  | rg -v "labelNamespace|chargeToPos" ; test $? -eq 1
git diff --name-only | rg "^src/routes/\(app\)/pos/|\.sql$|route-design-" ; test $? -eq 1
bun run check                                                                   # no new errors
bun run vitest run                                                              # full suite, characterization suite still green
bun run lint:design && bun run lint:tokens                                      # debt count ≤ the 1.6 baseline
```

The characterization suite passing **unmodified** is the load-bearing check here: it means the
scheduling route's server contract survived extraction untouched. If a characterization assertion has
to be edited in this slice, the extraction changed behaviour — revert and re-extract.

---

## 4. Slice 3 — Collapse `/pos/appointments` onto the shared view *(tags: `ui`, `logic`; ~5–7 h)*

### 4.1 What happens

Delete the 732-line fork body. `src/routes/(app)/pos/appointments/+page.svelte` becomes a wrapper of
the same shape as §3.1's, with the POS capability set derived **from the §2.1 matrix, not from taste**:

- every row the matrix marked *POS-only* → a capability prop set `true` here and `false` on scheduling
  (e.g. `chargeToPos`);
- every row marked *scheduling-only* → `false` here, unless the matrix shows the fork already had it;
- `createSalesOrder` → whatever the fork does **today**. If the fork lacks it, it stays `false`:
  turning it on would newly expose a Sales action inside POS, which is a feature change.

`pos/appointments/+page.server.ts` calls `loadBookingsView` with the POS presets. It keeps any
POS-specific data it loads today (the §R5 note: `pos/+layout.server.ts:17` hands availability to the
POS UI as *data*, not as a gate — do not "clean that up" here).

### 4.2 The three traps

1. **Availability stays composite.** `/pos/appointments` still requires `pos` **and** `scheduling`
   (§R1). Sharing a component does not change what the route needs; leave the entry alone.
2. **RBAC stays separate.** `/pos/appointments` keeps its own `route-access-registry` entry with its
   current policy id. Do not repoint it at scheduling's policy — §R1 is explicit that RBAC is not
   derived from availability, and a shared *view* implies nothing about who may see it.
3. **Archetype may genuinely change.** The ledger records `WORKSPACE /pos/appointments` vs
   `COLL /scheduling/bookings`. If the POS page now renders a collection, its
   `route-design-manifest.ts` entry must say so (`archetype`, `scroll`) — that is a *correction*,
   made deliberately in Slice 4 with the ledger updated in the same PR, never left silently wrong.
   If the POS page keeps a workspace layout *around* the shared collection, the archetype stays
   `WORKSPACE` and the wrapper owns that chrome.

### 4.3 Files to touch

- **Modify (gutted):** `src/routes/(app)/pos/appointments/+page.svelte`
- **Modify:** `src/routes/(app)/pos/appointments/+page.server.ts`
- **Modify (only if the matrix demands a new capability/preset knob):**
  `src/lib/components/scheduling/BookingsView.svelte`, `src/server/scheduling/load-bookings-view.ts` —
  additive props with defaults that preserve scheduling's behaviour
- **Must NOT appear in the diff:** any `.sql`, `src/server/db/schema/**`,
  `src/server/services/pos.service.ts` (a contended file — see §6), `route-access-registry.ts`

### 4.4 Definition of done

```bash
test $(wc -l < "src/routes/(app)/pos/appointments/+page.svelte") -lt 100
# the duplicated domain logic is actually gone, not moved: the fork's booking-domain
# identifiers must now appear ONLY in the shared component/loader
rg -c "bookings|booking" "src/routes/(app)/pos/appointments/+page.svelte"     # single-digit (wrapper props only)
git diff --name-only | rg "\.sql$|db/schema/|pos\.service\.ts|route-access-registry" ; test $? -eq 1
bun run check
bun run vitest run              # characterization suite remains green without changing its pinned
                                # pre-collapse behavior assertions
bun run lint:design && bun run lint:tokens        # debt ≤ baseline
bun run build
```

Net-line check, which is the proposal's actual point — paste into the PR body:

```bash
git diff --stat <base>...HEAD -- "src/routes/(app)/pos/appointments" \
                                 "src/routes/(app)/scheduling/bookings" \
                                 src/lib/components/scheduling src/server/scheduling
# expect a large net deletion; ~1,395 forked lines collapsing to one component + two wrappers
```

### 4.5 If Slice 1 chose the redirect branch instead

Replace §4.1–§4.4 with: `pos/appointments/+page.server.ts` reduced to
`throw redirect(307, '/scheduling/bookings?...preset')`, `+page.svelte` **deleted**, and *additionally*:

- the actual availability gate for `/pos/appointments` must be evaluated **before** the redirect
  fires. Add a characterization test proving a `scheduling`-disabled org receives the same denial it
  received before the refactor and is not redirected to `/scheduling/bookings`;
- the `route-design-manifest.ts` entry converts from `ScreenDesignMeta` to
  `RedirectDesignMeta { target, preserveQuery }` — this is what moves the counts in Slice 4 (§5);
- the POS section nav entry must be re-pointed or removed (`src/lib/components/layout/sections.ts`),
  otherwise the nav highlights a route that immediately leaves the module;
- the figma ledger loses a `WORKSPACE` screen — update it in the same PR.

---

## 5. Slice 4 — Contracts, counts, and both-routes smoke *(tags: `logic`, `test`, `docs`; ~4–6 h)*

### 5.1 The count surfaces

The proposal says "6 counts". Treat that as a hypothesis and derive the real set from 1.3 plus the
contract suite's own failure output. Known surfaces, from the §H3 precedent:

| File | What carries a number |
|---|---|
| `src/lib/routes/route-design-validation.ts` | `endpoints:`, `screens:`, `redirects:` totals |
| `src/lib/routes/route-design-contracts.test.ts` | per-bucket counts (`B: 67 → 68` style) |
| `src/lib/routes/route-design-manifest.ts` | section comments like `CRM, finance, sales, support and work (15)` |
| `specs/2026-07-13-hub-figma-screen-coverage-ledger.md` (meta-repo) | the `COLL`/`WORKSPACE` line per route |

**The rule.** On the **view** branch, the route class does not change, so `endpoints`/`screens`/
`redirects` must come out **unchanged** and the DoD is that the suite is green *without editing a
single number*. Only an archetype correction (§4.2 trap 3) may edit the manifest entry — an
attribute, not a count. On the **redirect** branch, exactly one screen becomes one redirect; every
number that moves must move by 1 in the direction that fact implies, and each edit gets a one-line
justification in the PR body. Per routing-simplification §R7 these contracts stay **independent** of
the availability manifest — do not "fix" a count by deriving it.

### 5.2 The other places these routes are named

```bash
rg -n "pos/appointments" src/ messages/ static/ 2>/dev/null
```

Every hit resolves to one of: the route files themselves, a nav entry
(`src/lib/components/layout/sections.ts`), the route-design/access files, or
`src/lib/state/features/assistant-context.ts` — **the assistant's route-hint map**, which per
`specs/hub-erp-roadmap/P1-mcp-tool-packs.md` is also serialized by `GET /api/gateway/pages` and
consumed by the `hub_pages` agent tool. If the page's description, accepted query params, or (on the
redirect branch) its existence changed, that map is now wrong and agents will hand users a stale deep
link. Update it, and say so in the PR body — this is the one surface a purely visual smoke test
cannot catch.

### 5.3 Both-routes smoke (the proposal's literal DoD)

Extend the Slice 1 characterization file (do not add a second suite) with a **post-collapse** block:

1. both `load`s still return their pinned key sets;
2. the POS load still applies its preset filters, and applies them to the **shared** loader;
3. both routes' manifest entries still exist with their (possibly corrected) archetypes;
4. the shared component is imported by exactly two route files:
   `rg -l "components/scheduling/BookingsView" src/routes/ | wc -l` → `2`;
5. on the redirect branch instead: an eligible request to `/pos/appointments` returns a 307 to the
   expected target with the preset query preserved; a `scheduling`-disabled org is not redirected and
   receives its characterized pre-change denial.

### 5.4 Definition of done

```bash
bun run vitest run src/lib/routes/                          # route-design contract suites green
git diff -U0 <base>...HEAD -- src/lib/routes/route-design-validation.ts \
  | rg "^[+-].*[0-9]"                                       # view branch: EMPTY. redirect branch: ±1 only
rg -l "components/scheduling/BookingsView" src/routes/ | wc -l   # == 2 (view branch)
rg -n "pos/appointments" src/lib/state/features/assistant-context.ts  # present & accurate, or intentionally gone
bun run check && bun run vitest run && bun run build
bun run lint:design && bun run lint:tokens                  # debt ≤ baseline
```

---

## 6. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion_hub` | The only repo with runtime code changes | Everything above. Branch `dev`; feature branch off it |
| **Concurrent hub specs on POS** | `2026-08-17-hub-updatesellable-silent-drop`, `2026-08-17-hub-igv-rate-from-org-config`, `2026-08-14-pos-shadow-emission`, `2026-08-14-pos-payment-methods-config` are all in flight against `src/server/services/pos.service.ts` | **This spec must not touch `pos.service.ts` at all** — it works at the route/component layer. That is enforced in §4.3's diff check. Expect to rebase `src/routes/(app)/pos/**` anyway; keep commits narrow |
| **Concurrent hub specs on scheduling** | `2026-08-17-hub-reserva-keyword-config` touches booking-*deposit* classification in finance/journey services, not the bookings list | No file overlap expected. Verify with `git diff --name-only` before merge; if it lands first, rebase |
| `packages/ui`, `packages/design-tokens` (minion-meta) | **None expected.** The extraction reuses existing primitives | **Alert, do not absorb.** If the shared view genuinely needs a primitive that does not exist (Chip/Tag and Avatar are named gaps in the governance skill), hand-roll minimally *inside the hub*, note it, and file a proposal. Adding to `@minion-stack/ui` is a changeset → Version-Packages PR → npm publish → hub dep bump loop, and is out of scope |
| `minion` (gateway) | The `hub_pages` MCP tool reads `GET /api/gateway/pages`, serialized from `assistant-context.ts` | §5.2. No gateway code changes; the gateway serves whatever the hub declares. On the redirect branch, agents holding a cached `/pos/appointments` deep link get a 307 — acceptable, but say it in the PR |
| `minion_site` | Shares the database with the hub. **No schema change occurs** | §3.4/§4.3 forbid `.sql` and `src/server/db/schema/**` in the diff. If either appears, the slice failed its own definition |
| `paperclip-minion` | None. No protocol, adapter, or tenancy surface is touched | — |
| `minion-meta` (this repo) | `specs/2026-07-13-hub-figma-screen-coverage-ledger.md` records one line per route and goes stale on an archetype correction or a screen→redirect conversion | Update that line as a coordinated meta-repo change, or the ledger silently misstates coverage. Absent an open-item proposal required below, this is the only implementation-time meta-repo file this work should touch |

**Open-items ledger (AGENTS.md).** Anything left unwired — a capability the matrix could not
reconcile, a filter that had to stay hardcoded, a skipped characterization assertion — needs both a
`TODO(handoff): <what, why, pointer>` at the exact site **and** an entry in `proposals/`. Undocumented
open ends are defects here, not shortcuts.

---

## 7. Out of scope

- **Booking feature changes** (the proposal's own line). No new filter, column, action, or status.
  The union of today's two behaviours is preserved per-context; nothing is added.
- **Schema.** No table, column, or migration. No `.sql` file may appear in any slice's diff.
- **Fixing the §R6 kind-leaks** — scheduling bookings loading stock accruals, and the
  "Create sales order" → `/sales` action leaking into personal orgs. They are preserved **verbatim**
  behind capability props and remain owned by `2026-07-22-personal-org-differentiation-spec` (WP1,
  `effectiveModuleEnabled`). Turning one off here would be an unrequested behaviour change; the props
  contract merely makes the eventual fix a one-line change.
- **Resolving the 403-vs-404 denial inconsistency** for disabled modules (routing-simplification §R4).
  Named as a hazard for the redirect branch; not fixed here.
- **The rest of the routing-simplification migration** (S2–S4: hook guard, locals snapshot, nav
  derivation, API centralization). This spec consumes the availability manifest; it does not advance it.
- **Deduplicating any other forked pair** in the hub. One proposal, one fork.
- **`pos.service.ts`, emission, sellables, IGV** — four other in-flight specs own that file (§6).
- **Deleting `/pos/appointments` outright.** Neither branch of the proposal's DoD permits it; the
  route stays reachable, as a view or as a redirect.

---

## 8. End-to-end verification

Run from `minion_hub/` on the feature branch with all four slices merged.

```bash
# 1. The fork is actually gone
test $(wc -l < "src/routes/(app)/pos/appointments/+page.svelte") -lt 100 || \
  test ! -f "src/routes/(app)/pos/appointments/+page.svelte"     # view branch | redirect branch
test $(wc -l < "src/routes/(app)/scheduling/bookings/+page.svelte") -lt 80
test -f src/lib/components/scheduling/BookingsView.svelte

# 2. Gates (ui-tagged work: design lints included)
bun run check                       # no new errors vs the §1.6 baseline
bun run vitest run                  # full suite green; characterization + route-design suites included
bun run lint:design && bun run lint:tokens     # debt count ≤ baseline (ratchet may only decrease)
bun run build

# 3. Nothing forbidden leaked into the diff
git diff --name-only <base>...HEAD | rg "\.sql$|src/server/db/schema/|pos\.service\.ts" ; test $? -eq 1

# 4. The route contract tells the truth
bun run vitest run src/lib/routes/
git diff -U0 <base>...HEAD -- src/lib/routes/route-design-validation.ts | rg "^[+-].*[0-9]"
#   view branch → empty; redirect branch → exactly the ±1 moves justified in the PR body
```

**5. The behavioural check no grep can make.** `bun run dev` against a dev org that has **both** `pos`
and `scheduling` enabled and at least a dozen bookings spanning past/today/future, then, signed in:

- `/scheduling/bookings` — filters, sorting, pagination, row actions, and the create-booking flow all
  behave as before; the page still owns exactly one scroll region; the empty state renders when a
  filter matches nothing.
- `/pos/appointments` — renders inside the **POS** section nav (view branch), shows the POS preset
  filter applied and visibly locked, and every POS-only affordance from the §2.1 matrix still works
  end-to-end (charge-to-POS in particular: run one appointment through to a ticket).
- Capability isolation: confirm the scheduling-only actions are **absent** from the POS page and the
  POS-only actions are **absent** from the scheduling page. A shared component that leaks either way
  is a feature change wearing a refactor's clothes.
- Compact viewport (390×844) on both routes: §D6 compact transformation still holds — no horizontal
  overflow, section nav not dragged by content scroll.

**6. The negative check.** Sign in as a persona that can reach `/pos/appointments` today but has no
scheduling permission (from §2.3(b)); confirm the outcome is **identical** to before the change. On the
view branch it must still render. If it now denies, the RBAC entry was repointed against §4.2 trap 2 —
revert rather than patch forward; every slice here is designed to be `git revert`-safe precisely so
that option stays open.
