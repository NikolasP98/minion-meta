---
id: 2026-08-18-base-kanban-possibly-shipped-surface-spec
title: minion-base kanban renders G0 warnings and acts on possibly_shipped flags
stage: spec
status: done
pass: 2
created: 2026-08-18
updated: 2026-08-20
proposal: 2026-08-17-base-kanban-possibly-shipped-surface
verdict: changes_requested
repos: [minion-base, minion-factory, minion-meta]
tags: [ui, logic, docs, test]
type: feature
done_reason: "All 3 slices live 2026-08-20: meta index projects the G0 fields (fixtures green), factory runner ships the evidence-bound producer sweep + disposition endpoint (D1 exactly-one-of, D2 shipped-status on confirm only, D3 reconcile_ignore honored; 515/515 tests; e2e verified live: 3 specs flagged, confirm-shipped 200 with canonical projection, 409/400 negative gates), base surface + dispose relay enabled via FACTORY_DISPOSAL=1."
---

# minion-base kanban renders G0 warnings and acts on possibly_shipped flags

**Implementation and merge stop (2026-08-18):** This overlapping plan is not dev-eligible. The
verified factory writer does not emit the proposed reconciliation fields, so producer ownership
and field semantics must be approved before the projection and consumer slices run. The open
minion-base PR #13 must not merge until one canonical cross-repo contract replaces this ordering;
projection and consumption must then land after the producer or atomically with it.

**Owner surfaces:** two external repos plus this meta-repo checkout:
`minion-base` (`NikolasP98/minion-base`, private, `main` → Vercel → base.minion-ai.org),
`minion-factory` (the orchestrator that owns `agent/reconcile.sh`, the `/lifecycle/:kind/:id`
write endpoint, and the GitHub-contents-API commit path), and `minion-meta` (this repo,
`scripts/spec-index.mjs` + `specs/TEMPLATE.md`, branch `dev`).

**Design ancestors:**
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §3 G0 —
defines the write side (`agent/reconcile.sh` in minion-factory sets `possibly_shipped:
<evidence-url>` on medium-confidence shipment matches, plus `evidence:` on high-confidence
flips and `link_review:` on ambiguous supersedes/revises links) and names this exact gap in its
own §5 slice table (slice 7: "Board: override-with-reason flow + amber `possibly_shipped` verify
chip — minion-base"). This spec is that slice, expanded to cover the dependency it turned out to
have.
[`2026-08-12-minion-base-v2-sdlc-kanban-spec`](2026-08-12-minion-base-v2-sdlc-kanban-spec.md) §1 —
the Spec column's live derivation, now from the committed `specs/index.json`
(`sdlc-board-triage-and-phase-gates` memory: "board Spec column = committed specs/index.json…
fetch needs `?ref=dev`").
[`2026-08-17-base-deploy-status-branch-filter-spec`](2026-08-17-base-deploy-status-branch-filter-spec.md)
— the most recent minion-base spec; reused here for its recon-first structure (§1) and its
still-open ⚠️ N1 (minion-base absent from AGENTS.md's Project Map) and 🚨-style alert conventions.
[`2026-08-17-meta-spec-index-project-possibly-shipped`](../proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md)
(proposal, `status: review`, not yet approved) — filed independently by a minion-factory dev
agent and flags exactly the gap §1 below re-derives from first principles. It explicitly declines
to pick a canonical between itself and this spec's source proposal, "left for a human to
reconcile." This spec resolves that by absorbing its DoD into Slice 1 (§3) and requiring the
sibling proposal to be marked `merged` into this spec's source proposal when Slice 1 lands.

**Gate conventions:**
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
Slice 1 is `logic`+`docs`+`test` (projector, schema documentation, fixture test). Slice 2 is
`logic`+`test` (backend endpoint, sweep change, regression coverage). Slice 3 is `ui`+`logic`+
`test`; its server contract is already isolated in Slice 2, while the remaining type, render, and
response-driven local update share one Svelte consumer and should land together. `ui-design-
governance` does **not** apply to minion-base — its own governance is `DESIGN.md` +
`src/lib/design/tokens.css` + `bun run lint:design`, no `lint:tokens` script, same carve-out the
branch-filter spec made.

---

## 0. Problem

Quoted verbatim from the approved proposal `2026-08-17-base-kanban-possibly-shipped-surface`:

> minion-factory's G0 backward-staleness reconciler (`agent/reconcile.sh`, spec
> `2026-08-17-sdlc-phase-gates-scoring-spec.md`) walks active specs and, on a
> medium-confidence shipment match, writes `possibly_shipped: <evidence-url>`
> frontmatter (plus `evidence:` on high-confidence flips and `link_review:` for
> ambiguous revises/supersedes links) without changing `stage`/`status` — by
> design, a human is supposed to confirm with one click on the board rather
> than the sweep guessing. `scripts/spec-index.mjs` (minion-meta) now
> deterministically projects all three fields into the committed
> `specs/index.json` that the board fetches.
>
> minion-base's `SpecFile` type has no `possibly_shipped` / `evidence` /
> `link_review` fields, and `src/routes/kanban/+page.svelte` neither renders an
> amber "needs verification" state nor offers a one-click confirm/reject
> action. Until this repo is updated, the fields are computed and projected
> but completely invisible and unactionable to the human — the entire point of
> routing medium-confidence matches through a human gate instead of
> auto-flipping state is defeated, because there is nowhere to see or act on
> the flag.
>
> **Definition of done:** `SpecFile` gains `possibly_shipped?`, `evidence?`,
> `link_review?` fields matching `specs/index.json`'s shape. The kanban board
> renders a visibly distinct (amber) state on any spec carrying
> `possibly_shipped` or `link_review`, showing the evidence URL/link-review
> note. A one-click action lets a human dispose of the flag — confirm-shipped
> (writes back to the spec, e.g. flips `stage: done`/`status: shipped`) or
> reject (writes `reconcile_ignore: true` per `specs/TEMPLATE.md` so the next
> G0 sweep leaves the spec alone). Whichever write-back shape is chosen, it
> must go through the same PR/commit path the board already uses for other
> spec mutations, not a direct unreviewed write.
>
> **Out of scope:** Any further change to minion-factory or minion-meta — both
> already emit and project the three fields; this proposal is scoped to
> minion-base's consumption of them. Redesigning G0's high/medium/no-evidence
> confidence classification.

## 1. Correction to the proposal's premise — why `repos:` is not `[minion-base]` alone

The proposal's own out-of-scope line ("both already emit and project the three fields") is
**checked against this repo's current `dev` branch and is false**:

```
$ grep -n 'possibly_shipped\|evidence\|link_review' scripts/spec-index.mjs scripts/spec-frontmatter.mjs
(no matches)
```

`scripts/spec-index.mjs` projects exactly `id, title, stage, status, pass, created, updated,
repos, revises, supersedes, proposal, verdict, pr, type, tags` — the three G0 fields are absent
from the conditional-spread block. `specs/TEMPLATE.md`'s field table also does not document
`possibly_shipped`, `evidence`, `link_review`, or `reconcile_ignore` at all; G0 writes them as
undocumented ad-hoc frontmatter. No spec frontmatter currently carries any of the three fields
(`rg -n '^(possibly_shipped|evidence|link_review):' specs/*.md` returns no matches) — consistent
with `git log` here showing only
`reconcile: proposal sweep [factory]` commits (the proposal-dedup reconciler) and zero `reconcile:
spec sweep` commits (G0's own commit prefix per the phase-gates spec §3), i.e. G0 has not yet
found a medium-confidence match in this repo, so the gap has not yet been observed in production —
only reconstructed from source.

This is not a new discovery: a minion-factory dev agent filed it independently as
`proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md` (`status: review`), and that
proposal's own reconciliation note confirms the same grep result and flags the conflict with this
spec's source proposal rather than resolving it. Two proposals describing the same downstream
symptom does not make the upstream claim true — verifying against the file was cheaper than
trusting either proposal's prose, and this spec is written from the answer, not from the premise.

**Decision:** `repos:` includes `minion-meta` and `minion-factory` alongside `minion-base`. Slice 1
(§3) closes the meta-side gap as a prerequisite — without it, Slices 2 and 3 are unverifiable: the
board cannot render a field `specs/index.json` never contains, no matter how correct its Svelte is.
Slice 1's DoD satisfies `2026-08-17-meta-spec-index-project-possibly-shipped`'s DoD and closes its
duplicate lifecycle state in the same meta-repo slice.

## 2. Assumptions carried into slices below — and why Slice 0 exists in each repo

**This spec is written from minion-meta, where neither `minion-base` nor `minion-factory` is
checked out** (both are excluded by this repo's `.gitignore` pattern for subprojects, and — per
`2026-08-17-base-deploy-status-branch-filter-spec` §5 ⚠️ N1, still true — neither appears in
AGENTS.md's Project Map or its Cross-Project Impact Zones table at all). Every minion-base and
minion-factory file path, endpoint name, and transition-table value below is reconstructed from
proposal citations, ancestor specs, and the `sdlc-board-triage-and-phase-gates` /
`minion-base-lifecycle-dashboard` operator-memory files (★★★ items are load-bearing and are cited
inline) — **not verified fact**. Each slice below opens with a short, uncounted recon step that
turns its carried claims into recorded facts before implementation, following the precedent
`2026-08-17-base-deploy-status-branch-filter-spec` §1 set for exactly this situation. If recon
contradicts a behavioral or data-contract assumption, stop and update this spec before
implementing; path or component-name drift may be recorded in the PR and followed without a spec
revision.

Four carried claims are load-bearing:

1. **The write-back path is `POST /lifecycle/:kind/:id {status, reason, by}`** on minion-factory,
   already used by the board for proposal/spec approve-reject actions (`sdlc-board-triage-and-
   phase-gates` memory, "LIFECYCLE TOOLS" entry: "writes meta frontmatter via contents API, audit =
   commit message w/ actor+reason"). This is the "same PR/commit path the board already uses for
   other spec mutations" the proposal's DoD requires — not a new mechanism. The proposal does not
   require a PR when this existing path writes a reviewed commit directly; recon records the
   actual target branch and commit mechanism.
2. **Terminal-state writes require a ≥20-char `reason`** (same memory entry: "terminal states
   REQUIRE ≥20-char justification (verified live)"). §4 D1 applies this to both dispositions this
   spec adds, on the reasoning that overriding an automated flag is the same stakes as a terminal
   status change even when the underlying `stage`/`status` doesn't move (the `reject` case).
3. **The existing spec transition table's allowed target values are `approved | retired |
   superseded | done`** — notably **not** `shipped`, even though `shipped` is a valid `status` in
   `specs/TEMPLATE.md`'s enum and is the exact value G0 itself writes on a high-confidence flip
   (phase-gates spec §3 G0: "flip frontmatter (`stage: done, status: shipped`...)"). This is a
   second, independent inconsistency from §1's — between G0's write convention and the lifecycle
   endpoint's accepted values — and §4 D2 resolves it explicitly rather than guessing silently.
4. **minion-base has an existing lifecycle-action UI and local update path**, but the cited memory
   does not prove that it includes a reusable reason dialog or an optimistic `SpecFile` patch.
   Slice 0 locates the actual components and response shape. Slice 3 reuses them when present;
   otherwise it adds the smallest implementation consistent with minion-base's `DESIGN.md` and
   existing primitives. This uncertainty changes file selection, not required behavior.

### Slice 0 — recon (≤ 30 min per repo, prepended to each slice below, not counted in estimates)

```bash
# minion-meta (this repo — already partially done above; re-run against the branch HEAD at
# implementation time in case this spec's own claims have drifted):
grep -n 'possibly_shipped\|evidence\|link_review\|reconcile_ignore' scripts/*.mjs specs/TEMPLATE.md
rg -n '^(possibly_shipped|evidence|link_review):' specs/*.md # expect: none, or a short list to test against

# minion-factory (wherever it's checked out):
cd minion-factory
grep -rn 'lifecycle/:kind\|lifecycle/.*kind' server/ src/ 2>/dev/null   # confirm route + file
grep -n "'spec'" -A5 <the file above>                                    # confirm the transition table's allowed values (claim 3)
grep -n 'possibly_shipped\|reconcile_ignore' agent/reconcile.sh          # does G0 already skip reconcile_ignore, or does S2 need to add it?
grep -n 'reason' <lifecycle route file> | grep -i '20\|length'           # confirm the ≥20-char rule and where it lives
grep -rn 'index.json' agent/ server/ 2>/dev/null                         # confirm the "patches BOTH" dual-write (claim 1/5's other half)

# minion-base (wherever it's checked out):
cd minion_base
grep -n 'SpecFile' -r src/lib/                                           # locate the type
test -f src/routes/kanban/+page.svelte && grep -n 'possibly_shipped\|amber\|verify' src/routes/kanban/+page.svelte
grep -rln 'setStatus\|lifecycleAction\|factoryFetch\|/lifecycle/' src/    # locate mutation, response, and local-update paths
grep -rln 'reason' src/lib/components/ src/routes/ 2>/dev/null | grep -i 'modal\|prompt\|dialog' # locate reusable reason UI, if any
rg -n 'FACTORY_URL|FACTORY_SECRET|\[\.\.\.path\]' src/routes/ src/lib/server/ # confirm the server-only proxy/auth boundary
```

Paste each repo's output into its slice's PR. Where a claim is contradicted, the slice's "Do"
list is a starting point, not a spec to follow blindly past the contradiction.

## 3. Slice 1 — minion-meta: project the three fields (closes the sibling proposal too)

**Tags:** `logic`, `docs`, `test` · **Estimate:** 4–6 h · **Repo:** minion-meta

**Goal:** `specs/index.json` carries `possibly_shipped`, `evidence`, `link_review` for any spec
whose frontmatter has them, using the same pattern already used for `revises`/`supersedes`/
`verdict`, and the schema is documented so the next ad-hoc field doesn't repeat this gap.

**Do:**

- In `scripts/spec-index.mjs`, extend the per-spec object literal with three more conditional
  spreads, same shape as the existing six:
  ```js
  ...(fm.possibly_shipped ? { possibly_shipped: fm.possibly_shipped } : {}),
  ...(fm.evidence ? { evidence: fm.evidence } : {}),
  ...(fm.link_review ? { link_review: fm.link_review } : {})
  ```
  Do **not** add `reconcile_ignore` here — it is read directly from spec markdown by
  `agent/reconcile.sh` in minion-factory (Slice 2), never by the board; projecting it into
  `index.json` would be dead weight with no consumer (§6 explicit out-of-scope).
- Add a row each for `possibly_shipped`, `evidence`, `link_review`, and `reconcile_ignore` to
  `specs/TEMPLATE.md`'s frontmatter field table, marked `no` (optional), with a one-line
  description and a pointer to `2026-08-17-sdlc-phase-gates-scoring-spec.md` §3 G0 as the writer.
  This is the ledger the proposal's own gap exists because nobody wrote — do not repeat it for the
  next ad-hoc field.
- Add a fixture-based test (or extend whatever test currently exercises `spec-index.mjs`, if one
  exists — recon first) asserting: a spec fixture with `possibly_shipped` set produces that key in
  the generated object; a spec fixture without it produces no key (not `null`, not `""` — absent,
  matching the existing fields' behavior); `reconcile_ignore` on a fixture produces **no** key in
  the output.
- Mark `proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md` as `status: merged`, set
  `merged_into: 2026-08-17-base-kanban-possibly-shipped-surface`, update its date, and regenerate
  `proposals/index.json`. The source proposal is canonical because it already owns this spawned
  spec; leaving the sibling in `review` would keep a duplicate Proposal card alive after its DoD
  ships.

**Files:** `scripts/spec-index.mjs`, `specs/TEMPLATE.md`,
`proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md`, `specs/index.json`,
`proposals/index.json`, and a new or extended test file (locate the existing test setup for
`scripts/` in Slice 0 recon — if none exists, a minimal `node --test` script following this repo's
existing script conventions is sufficient; no new test framework dependency).

**Definition of done (machine-checkable):**

```bash
# Fixture proof — create a throwaway spec with possibly_shipped set, run the indexer, inspect, remove:
cp specs/TEMPLATE.md specs/_tmp-possibly-shipped-fixture.md
# edit the copy's frontmatter: set id: _tmp-possibly-shipped-fixture and a valid created date, plus:
#   possibly_shipped: "https://github.com/example/pr/1"
#   evidence: "https://github.com/example/pr/2"
#   link_review: "ambiguous supersedes link, needs human read"
node scripts/spec-index.mjs
node -e "const x=require('./specs/index.json').specs.find(s=>s.id==='_tmp-possibly-shipped-fixture'); if(!x||!x.possibly_shipped||!x.evidence||!x.link_review||'reconcile_ignore' in x) process.exit(1)"
rm specs/_tmp-possibly-shipped-fixture.md
node scripts/spec-index.mjs   # regenerate clean — fixture gone from index.json too
node -e "if(require('./specs/index.json').specs.some(s=>s.id==='_tmp-possibly-shipped-fixture')) process.exit(1)"

grep -n 'possibly_shipped\|evidence\|link_review\|reconcile_ignore' specs/TEMPLATE.md
#   → 4 new rows present, each marked optional

node --test <the new/extended test file>   # or this repo's existing test command — green
node scripts/proposal-index.mjs
node -e "const p=require('./proposals/index.json').proposals.find(p=>p.id==='2026-08-17-meta-spec-index-project-possibly-shipped'); if(!p||p.status!=='merged'||p.merged_into!=='2026-08-17-base-kanban-possibly-shipped-surface') process.exit(1)"

test -z "$(git diff --name-only -- specs/index.json)" # no fixture residue in committed output
```

## 4. Slice 2 — minion-factory: disposal endpoint + G0 skip check

**Tags:** `logic`, `test` · **Estimate:** 5–7 h · **Repo:** minion-factory

**Goal:** a human action on the board can durably confirm-shipped or reject a `possibly_shipped`
flag, through the existing commit-audited write path, and a rejected spec is not re-flagged by the
next G0 sweep.

### D1 — Extend, don't replace, the existing lifecycle endpoint

Add an optional `disposition: 'confirm-shipped' | 'reject'` field to the existing
`POST /lifecycle/spec/:id` body, alongside the current `status`/`reason`/`by` handling recon
confirms in Slice 0. A request supplies exactly one of `status` or `disposition`; reject a request
that supplies both. `disposition` is valid only for `kind=spec` and only while the target spec has
a non-empty `possibly_shipped` value; a stale or inapplicable request returns `409` and creates no
commit. Either disposition also returns `409` while `link_review` is present: confirm-shipped
would remove the spec from the active board and G0 scan, while reject would set
`reconcile_ignore: true` and prevent G0 from revisiting the unresolved link. These preconditions
prevent the new operation from becoming an alternate arbitrary "mark shipped" API or hiding a
pending link review.

- **`confirm-shipped`** — writes `stage: done`, and `status: shipped` per §2 claim 3's resolution
  (D2 below), plus `updated: <today>`; copies the `possibly_shipped` URL into `evidence` when
  `evidence` is absent, then deletes `possibly_shipped` entirely (not an empty string).
- **`reject`** — writes `reconcile_ignore: true`, deletes `possibly_shipped`, and **does not** touch
  `stage`/`status`, `evidence`, or `link_review`. `reason` is still required and ≥20 chars (§2
  claim 2) — rejecting a flag is an assertion that the sweep was wrong, which is exactly the kind
  of claim the terminal-state justification rule exists for, even though `stage`/`status`
  themselves do not move.

`link_review` is a separate link-hygiene warning, not shipment evidence. Neither shipment
disposition clears or interprets it. A link-only warning is visible in Slice 3 but has no
confirm-shipped/reject controls in this spec; resolving the underlying `revises`/`supersedes`
relationship remains G0's existing link-hygiene workflow. This follows the source proposal's own
description of the fields and avoids marking a spec shipped merely because its links are
ambiguous.

Both dispositions commit via the existing contents-API path with the existing audit format
(`reconcile: spec sweep` is G0's own commit prefix; use a distinct one for human disposals, e.g.
`reconcile: human disposal (<confirm-shipped|reject>) <spec-id>`, so `git log --grep` can tell
automated flips from human ones later). Both also perform the existing dual-write recon found in
Slice 0 (patch the raw `.md` **and** `specs/index.json` in the same commit) — the same fix
`sdlc-board-triage-and-phase-gates` memory records was already needed once ("latent loop fixed:
runner lifecycle `transition()` patched only the md while every sweep reads index.json").
The success response returns the canonical updated spec projection so minion-base updates its
local card from committed state rather than duplicating mutation rules client-side.

### D2 — Resolve the `shipped` vs `done` status-value split (§2 claim 3)

If Slice 0 recon confirms the transition table's allowed spec-status values are literally
`approved | retired | superseded | done` and do not include `shipped`: **add `shipped` to that
table for the `confirm-shipped` disposition specifically**, rather than writing `status: done` to
match the existing list. Reasons: `done` is already a `stage` value (the kanban column), reusing it
as a `status` value too is the exact kind of overloaded-field ambiguity `specs/TEMPLATE.md`'s
schema was retrofitted (2026-08-13) to eliminate; and G0 itself — the authoritative design source
for what "shipped" means on a spec, per the phase-gates spec's own §3 wording — already writes
`status: shipped` on its high-confidence auto-flips. A human confirming a medium-confidence flag
should produce the identical frontmatter shape G0 produces for a high-confidence one; anything else
is an avoidable second shape for the same real-world fact. If recon instead finds the transition
table is generic (any `STATUSES` enum member is accepted, and the memory's `done` was shorthand),
this decision is moot — record which was true in the PR either way.

### D3 — G0 must honor `reconcile_ignore`

Recon's `grep -n 'possibly_shipped\|reconcile_ignore' agent/reconcile.sh` determines whether this
is a no-op verification or new code:

- If `agent/reconcile.sh` already skips specs with `reconcile_ignore: true` before scoring them for
  a shipment match: state that in the PR with the matching line number, no code change needed.
- If it does not: add the skip, as early in the per-spec loop as the existing `stage`/`status`
  filter (phase-gates spec §3 G0: "for every spec with `stage ∈ {spec, dev}` and `status ∈
  {approved, implementing, draft, review}`" — `reconcile_ignore` is a third filter alongside those
  two, checked the same way). Without this, `reject` is cosmetic: the next sweep re-flags the same
  spec and the human override is silently discarded on the following cycle.

**Files:** the `/lifecycle/:kind/:id` route handler (located in Slice 0; expected under `server/`
per the memory's "server-side" phrasing), `agent/reconcile.sh`, whatever test suite already covers
the lifecycle endpoint (extend it; do not introduce a new test runner).

**Definition of done (machine-checkable):**

```bash
cd minion-factory

# D1/D2 — first cover the transitions with the existing endpoint test harness and a mocked
# Contents API. If a non-production scratch target exists, also round-trip scratch specs there;
# never exercise these destructive transitions against a real active spec:
curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"confirm-shipped","reason":"<>=20 char test reason for confirm>","by":"spec-recon-test"}'
#   → commit created; scratch spec's .md now has stage: done, status: shipped, no
#     possibly_shipped key; evidence equals its prior value or the former possibly_shipped URL;
#     any link_review is unchanged; specs/index.json in the same commit reflects the same

curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id-2>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"reject","reason":"<>=20 char test reason for reject>","by":"spec-recon-test"}'
#   → commit created; scratch spec's .md has reconcile_ignore: true, no possibly_shipped key;
#     stage/status/evidence/link_review are UNCHANGED; index.json updated in the same commit

curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id-3>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"reject","reason":"too short","by":"spec-recon-test"}'
#   → rejected (400), same ≥20-char rule as existing terminal transitions; no commit created

curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id-without-flag>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"confirm-shipped","reason":"<>=20 char stale request reason>","by":"spec-recon-test"}'
#   → rejected (409); no commit created

# Existing status behavior remains compatible, and status+disposition together are rejected (400).
# Confirm-shipped and reject requests against a fixture that also has link_review are rejected
# (409), preserve every field, and create no commit.

# D3 — in the existing mocked/test harness, run the same medium-confidence candidate twice:
#   without reconcile_ignore → possibly_shipped is proposed/written
#   with reconcile_ignore: true → fixture remains byte-identical and no commit call is made

<existing lifecycle test command>   # extended suite covers all cases above and is green
```

## 5. Slice 3 — minion-base: SpecFile type, amber render, one-click dispose

**Tags:** `ui`, `logic`, `test` · **Estimate:** 6–8 h · **Repo:** minion-base

**Goal:** the kanban board is where a human sees both reconciliation warnings and disposes of a
`possibly_shipped` flag without conflating it with a `link_review` warning.

**Do:**

- Extend `SpecFile` (located in Slice 0; per proposal, "wherever the board's spec type lives") with
  `possibly_shipped?: string`, `evidence?: string`, `link_review?: string` — string types matching
  `specs/index.json`'s shape (Slice 1), not booleans; the value is the evidence URL or review note
  itself, not just a flag.
- In every existing surface that renders a spec card or spec detail, render an amber state when
  either warning is present: a `--warn`-token badge (existing token per minion-base's
  `tokens.css`, §"Gate conventions" above — no raw hex, no new token). Show `possibly_shipped` and
  `evidence` values as links only after parsing them as `http:` or `https:` URLs; otherwise render
  them as text. Show `link_review` as text. A card with `link_review` but no `possibly_shipped`
  still gets the amber treatment.
- Add the disposal action to the card's existing action surface (use the existing
  `KebabMenu.svelte` pattern unless recon finds a more specific card-action primitive). Offer
  **confirm shipped** and **reject** only when `possibly_shipped` is present; when `link_review`
  also exists, disable both dispositions with an explanation until the link warning is resolved.
  Each available action opens the
  reusable reason UI found in recon, or the smallest design-governed dialog if none exists,
  enforces the ≥20-character minimum, then calls `POST /lifecycle/spec/:id` with the matching
  `disposition` (Slice 2). A link-only warning is read-only in this slice.
- Send the request through minion-base's existing server-only factory proxy. If that proxy uses a
  method/path allowlist or validates response bodies, extend it narrowly for
  `POST /lifecycle/spec/:id` and the canonical updated-spec response. `FACTORY_SECRET` must remain
  server-only and must never enter page data, browser JavaScript, logs, or an error message.
  This preserves the shipped boundary recorded in
  `/memory/MINION/minion-factory-agent-pipeline.md` ("Base = the interface"; lifecycle gates use
  the GitHub-contents write path).
- On success, replace the local spec with the endpoint's canonical returned projection so the
  amber shipment flag clears immediately without waiting for the next 5-minute auto-refresh
  (`2026-08-13-minion-base-kanban-auto-refresh-spec`). Do not predict the server mutation in the
  client. If `link_review` remains, the card remains amber after the shipment flag clears.
- On a failed disposal call (network error, 400 from the ≥20-char check, etc.), the card stays
  amber and the UI surfaces the error — no silent no-op, no optimistic clear on failure.

**Files:** the `SpecFile` type module (Slice 0), every existing spec-card/detail renderer found in
recon, the existing action/reason components or one minimal reason dialog if none exists, the
server proxy only if its allowlist/validation requires a change, and a new or extended test for
the warning/action predicates and response-driven local update. Keep the
predicates pure where practical so Bun's existing runner can cover: either field triggers amber;
only `possibly_shipped` enables shipment dispositions; `link_review` blocks both dispositions;
a failed request leaves local state unchanged.

**Definition of done (machine-checkable):**

```bash
cd minion_base
bun test                                    # existing suite + any new pure-logic test, green
bunx svelte-check                           # 0 errors / 0 warnings — proves the type extension compiles
bun run lint:design                         # passes; debt unchanged or decreases (amber uses --warn, no new token)
bun run build

rg -n 'possibly_shipped|link_review' src/    # type + every card/detail render + disposal call
# Existing/new proxy tests assert the browser request carries no FACTORY_SECRET and that upstream
# non-2xx status/body are relayed as a safe user-visible error without clearing local state.
```

Plus one browser probe (`browser-harness` skill, headless Chromium, basic-auth `minion:$DASH_PASSWORD`),
pasted into the PR:

```
- seed a scratch spec (via a direct commit, not through the app) with possibly_shipped set →
  open /kanban → the card renders amber with the evidence URL visible
- click confirm-shipped, enter a >=20-char reason, submit → card leaves the Spec column (now
  stage: done) within the page, no manual refresh; verify the commit landed in minion-meta
- seed a second scratch spec with link_review (no possibly_shipped) → confirm it renders amber,
  shows the note, and offers no confirm-shipped/reject actions
- seed a third scratch spec with both fields → confirm both dispositions are disabled with the
  link-review explanation
- click reject with a <20-char reason → submission is blocked client-side or server-rejects (400);
  card stays amber
- click reject with a valid reason → the shipment warning clears and the spec stays in its prior
  column; verify reconcile_ignore: true landed on the spec in minion-meta and NOT stage/status;
  (this fixture has no link_review, because unresolved link warnings block both dispositions)
- remove the scratch specs through the same controlled meta-repo commit path and verify they no
  longer appear on the board
```

## 6. Cross-repo impact

Checked against AGENTS.md's "Cross-Project Impact Zones" table: **no row applies.** That table
covers the meta-repo's seven tracked subprojects (minion, minion_hub, minion_site, minion_plugins,
Minion Docs, paperclip-minion, pixel-agents) plus `packages/shared`/`@minion-stack/*`; neither
`minion-base` nor `minion-factory` is a tracked subproject or appears anywhere in that table — the
same absence `2026-08-17-base-deploy-status-branch-filter-spec` §5 flagged as ⚠️ N1. This spec adds
a bespoke table instead of forcing a fit:

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| Every other spec already in `specs/index.json` (108+, per the 2026-08-13 retrofit) | **None** — Slice 1's fields are optional conditional spreads, absent keys stay absent | fixture DoD proves both the present and absent cases |
| `minion/`, `minion_hub/`, `minion_site/`, `@minion-stack/*`, gateway WS protocol | **None** — no code in those repos is touched, read, or referenced | scope guard (below) |
| G0's confidence classification itself (high/medium/no-evidence) | **None** — explicitly out of scope per the proposal; this spec only wires the medium-confidence output through to a human and back | §7 |
| The 30-min auto-approve/auto-promote sweep (`sdlc-board-triage-and-phase-gates` memory: "APPROVAL=PROMOTION... AUTO-APPROVE machine-sourced drafts") | **None to proposals** (that sweep only touches proposal-kind items, cap 3/sweep, excludes security/data tags) — but see 🚨 A1 | A1 |
| The double-pass auto-merge rule (two consecutive review PASSes) | **None** — operates on PRs, not on spec frontmatter disposal | — |
| `specs/TEMPLATE.md` consumers (`spec-retrofit.mjs`, any other script reading the field table for validation) | **Additive only** — four new optional rows, no enum/required-field change, `spec-index.mjs`'s existing `errors.push` required-field loop (`id, title, stage, status, created`) is untouched | Slice 1 DoD |
| `2026-08-17-meta-spec-index-project-possibly-shipped` (sibling proposal, `status: review`) | **Merged into the canonical source proposal** so the duplicate card does not remain active | Slice 1 updates the proposal and committed proposal index |

Scope guard, run in each repo's PR:

```bash
# minion-meta
out="$(git diff --name-only origin/dev...HEAD | rg -v '^(scripts/spec-index\.mjs|specs/TEMPLATE\.md|specs/index\.json|proposals/2026-08-17-meta-spec-index-project-possibly-shipped\.md|proposals/index\.json|.*\.test\.(mjs|js|ts)$)')"
[ -z "$out" ] || { echo "FAIL: change escaped Slice 1's surface"; echo "$out"; exit 1; }
```

### 🚨 A1 — the disposal path must not be wired into automation; `by` is not authorization

The phase-gates spec's design principle #3 is explicit: "Gates block buttons, not people... a
below-threshold score disables the board's promote button... the human can override with a
recorded reason." `possibly_shipped` exists *because* G0 is not confident enough to auto-flip.
Slice 2's endpoint remains behind the factory's existing privileged authentication, and Slice 3
reaches it through the existing authenticated minion-base server proxy. The client-supplied `by`
field is audit metadata, **not** proof that a human initiated the call, so the implementation must
not treat a particular `by` string as an authorization boundary. This slice wires no sweep, cron,
or CI caller to `disposition`; the negative grep in §8 proves that automation has not been added.
Cryptographically proving a browser gesture would require a new actor/session contract and is out
of scope. The enforceable guarantee here is authenticated, reasoned, commit-audited mutation plus
no automated caller — consistent with the G0 design's medium-confidence human gate.

## 7. Out of scope (explicit)

Carried from the proposal:

- **Redesigning G0's high/medium/no-evidence confidence classification.** Slice 2 consumes G0's
  existing output; it does not change what counts as medium confidence or how evidence URLs are
  chosen.
- **Any change to how G0 decides `revises`/`supersedes` link hygiene** beyond honoring
  `reconcile_ignore` (D3) — the phase-gates spec's "auto-fixed or flagged" link-hygiene behavior is
  untouched.

Added by this spec:

- **A `link_review` disposal UI.** This spec makes the warning visible but does not invent a
  shipment disposition for link ambiguity. A future action must define how the corrected
  `revises`/`supersedes` relation is selected and written; it cannot reuse confirm-shipped/reject.
- **Batch disposal / bulk-confirm across multiple amber cards.** One card, one action, per the
  proposal's "one-click action" singular framing.
- **Scoring or re-scoring `possibly_shipped` confidence on the board side.** The board renders and
  disposes; it does not second-guess G0's confidence tier.
- **`reconcile_ignore` visible anywhere in minion-base.** §3 explains why it is not projected into
  `specs/index.json`; it has no board consumer.
- **Retrying a failed disposal automatically, or queuing offline disposals.** A failed call surfaces
  an error and leaves the card amber (§5); no retry/backoff logic is added.
- **Editing AGENTS.md to add minion-base/minion-factory to the Project Map.** The omission is a
  known orchestration-documentation gap, but it does not change this feature's contracts or
  implementation.
- **`ui-design-governance`, `lint:tokens`, `packages/design-tokens/contract.json`.** Wrong repo —
  minion-base's governance is `DESIGN.md` + `src/lib/design/tokens.css` + `bun run lint:design`.

## 8. End-to-end verification

Run with Slices 1–3 merged in their three respective repos.

```bash
# 1. minion-meta: the fixture test proves projection and the committed index is canonical
cd minion-meta
node --test <the Slice 1 test file>
node scripts/spec-index.mjs
test -z "$(git diff --name-only -- specs/index.json)"
node scripts/proposal-index.mjs
node -e "const p=require('./proposals/index.json').proposals.find(p=>p.id==='2026-08-17-meta-spec-index-project-possibly-shipped'); if(!p||p.status!=='merged'||p.merged_into!=='2026-08-17-base-kanban-possibly-shipped-surface') process.exit(1)"

# 2. minion-factory: an isolated fixture that satisfies G0's medium-confidence heuristic gains
# possibly_shipped, while the same fixture with reconcile_ignore: true remains byte-identical.
# Run through the existing mocked/test harness; do not run the production sweep merely to create
# evidence. Both cases are required assertions in the Slice 2 suite.
cd minion-factory && <existing lifecycle/reconcile test command>

# 3. minion-meta: the sweep's commit round-trips through the indexer (this may already be automatic
#    via a post-commit hook or CI step — recon confirms which)
cd minion-meta && node scripts/spec-index.mjs
test -z "$(git diff --name-only -- specs/index.json)"

# 4. minion-base: the flag is visible and actionable end to end
#    (browser-harness, basic auth) open /kanban → the flagged spec's card is amber, evidence
#    visible → confirm-shipped with a valid reason → card moves to the done column, no manual
#    refresh, and minion-meta's specs/*.md for that spec now shows stage: done, status: shipped,
#    no possibly_shipped key, evidence preserved from the confirmed URL, link_review unchanged,
#    and specs/index.json agrees

# 5. The human-gate guarantee (🚨 A1), proven negative
#    confirm no automated path (sweep, cron, CI) calls the lifecycle endpoint with a disposition
#    field. Limit the search to executable automation directories and fail on any hit; route/UI/test
#    declarations are intentionally outside this grep.
test -z "$(rg -l 'disposition' agent/ scripts/ .github/ 2>/dev/null || true)"
```

**Ship gate:** §8 steps 1–5 are green; Slice 1's fixture round-trip is pasted; Slice 2's automated
confirm-shipped, reject, stale-409, both link-review-409 cases,
mixed-status/disposition-400, and
short-reason-400 cases are
green; Slice 3's browser probe is pasted; the duplicate proposal is `merged` in the committed
proposal index; and the D2 decision (whether `shipped` was added to the transition table, or the
table was already generic) is stated plainly.
