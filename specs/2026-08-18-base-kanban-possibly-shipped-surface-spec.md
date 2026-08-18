---
id: 2026-08-18-base-kanban-possibly-shipped-surface-spec
title: minion-base kanban renders and acts on G0's possibly_shipped verification flags
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-base-kanban-possibly-shipped-surface
verdict: pending
repos: [minion-base, minion-factory, minion-meta]
tags: [ui, logic]
type: feature
---

# minion-base kanban renders and acts on G0's possibly_shipped verification flags

**Owner surfaces:** three repos, none of them this one's own checkout:
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
reconcile." This spec resolves that by absorbing its DoD into Slice 1 (§3) rather than leaving two
specs to converge later; a human still needs to close or supersede that proposal by hand (§6, N1)
— this document does not edit it.

**Gate conventions:**
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
Slice 1 is `logic` only (script + doc, no UI). Slice 2 is `logic` (backend endpoint + sweep
change). Slice 3 is `ui`+`logic` — per §4b's routing rule ("split at planning time... a `ui` slice
+ a `logic` slice where the seam is natural"), the type-and-plumbing half and the rendering half
are still one slice here because they are one Svelte component and one fetch call; splitting them
would recreate the context-loss handoff §4b warns against for a change this size. `ui-design-
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
undocumented ad-hoc frontmatter. No spec currently in this repo carries any of the three fields
(`grep -rl` across `specs/*.md` returns nothing) — consistent with `git log` here showing only
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
Slice 1's DoD is written to satisfy `2026-08-17-meta-spec-index-project-possibly-shipped`'s DoD
verbatim (§6 N1 records the human follow-up this spec cannot perform itself: closing or
superseding that proposal once Slice 1 ships).

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
contradicts an assumption, stop and update this spec before implementing — do not silently
reinterpret the work in the PR.

Five carried claims are load-bearing:

1. **The write-back path is `POST /lifecycle/:kind/:id {status, reason, by}`** on minion-factory,
   already used by the board for proposal/spec approve-reject actions (`sdlc-board-triage-and-
   phase-gates` memory, "LIFECYCLE TOOLS" entry: "writes meta frontmatter via contents API, audit =
   commit message w/ actor+reason"). This is the "same PR/commit path the board already uses for
   other spec mutations" the proposal's DoD requires — not a new mechanism.
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
4. **minion-base already has a reason-prompt UI** for existing approve/reject lifecycle actions
   (implied by claim 2 being "verified live" on the board) that Slice 3 reuses rather than building
   new.
5. **minion-base optimistically patches its own fetched `index.json`/store on a lifecycle action**
   before the next server refresh (memory: factory's runner "now patches BOTH [the source .md and
   index.json]... mirrors base setStatus" — i.e. base already has a `setStatus`-shaped local-mirror
   update it performs after a successful lifecycle call). Slice 3 extends this existing mirror
   update rather than introducing a new one.

### Slice 0 — recon (≤ 30 min per repo, prepended to each slice below, not counted in estimates)

```bash
# minion-meta (this repo — already partially done above; re-run against the branch HEAD at
# implementation time in case this spec's own claims have drifted):
grep -n 'possibly_shipped\|evidence\|link_review\|reconcile_ignore' scripts/*.mjs specs/TEMPLATE.md
grep -rl 'possibly_shipped\|link_review' specs/*.md   # expect: none, or a short list to test against

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
grep -rln 'setStatus\|lifecycleAction\|factoryFetch' src/lib/            # locate the existing mutation + optimistic-mirror pattern (claim 5)
grep -rln 'reason' src/lib/components/ | grep -i 'modal\|prompt\|dialog' # locate the reason-prompt UI (claim 4)
```

Paste each repo's output into its slice's PR. Where a claim is contradicted, the slice's "Do"
list is a starting point, not a spec to follow blindly past the contradiction.

## 3. Slice 1 — minion-meta: project the three fields (closes the sibling proposal too)

**Tags:** `logic` · **Estimate:** 3–4 h · **Repo:** minion-meta

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

**Files:** `scripts/spec-index.mjs`, `specs/TEMPLATE.md`, a new or extended test file (locate the
existing test setup for `scripts/` in Slice 0 recon — if none exists, a minimal `node --test`
script following this repo's existing script conventions is sufficient; no new test framework
dependency).

**Definition of done (machine-checkable):**

```bash
# Fixture proof — create a throwaway spec with possibly_shipped set, run the indexer, inspect, remove:
cp specs/TEMPLATE.md specs/_tmp-possibly-shipped-fixture.md
# edit the copy's frontmatter: id/created as required, plus:
#   possibly_shipped: "https://github.com/example/pr/1"
#   evidence: "https://github.com/example/pr/2"
#   link_review: "ambiguous supersedes link, needs human read"
node scripts/spec-index.mjs
grep -A4 '"_tmp-possibly-shipped-fixture"' specs/index.json
#   → possibly_shipped/evidence/link_review keys present with the fixture's values
rm specs/_tmp-possibly-shipped-fixture.md
node scripts/spec-index.mjs   # regenerate clean — fixture gone from index.json too

grep -n 'possibly_shipped\|evidence\|link_review\|reconcile_ignore' specs/TEMPLATE.md
#   → 4 new rows present, each marked optional

node --test <the new/extended test file>   # or this repo's existing test command — green

git diff --stat -- specs/index.json   # after the fixture round-trip: empty (no fixture residue committed)
```

## 4. Slice 2 — minion-factory: disposal endpoint + G0 skip check

**Tags:** `logic` · **Estimate:** 5–7 h · **Repo:** minion-factory

**Goal:** a human action on the board can durably confirm-shipped or reject a `possibly_shipped`
flag, through the existing commit-audited write path, and a rejected spec is not re-flagged by the
next G0 sweep.

### D1 — Extend, don't replace, the existing lifecycle endpoint

Add an optional `disposition: 'confirm-shipped' | 'reject'` field to the existing
`POST /lifecycle/spec/:id` body, alongside (not instead of) the current `status`/`reason`/`by`
handling recon confirms in Slice 0. `disposition` is orthogonal to a plain `status` transition:

- **`confirm-shipped`** — writes `stage: done`, and `status: shipped` per §2 claim 3's resolution
  (D2 below), plus `updated: <today>`; **deletes** `possibly_shipped`, `evidence`, `link_review`
  keys from the frontmatter entirely (not empty-string — TEMPLATE.md's flat-YAML parser treats a
  present-but-empty key differently from absent, per `spec-frontmatter.mjs`'s serializer skipping
  `null`/`undefined`/`''`).
- **`reject`** — writes `reconcile_ignore: true`; deletes the same three keys; **does not** touch
  `stage`/`status`. `reason` is still required and ≥20 chars (§2 claim 2) — rejecting a flag is an
  assertion that the sweep was wrong, which is exactly the kind of claim the terminal-state
  justification rule exists for, even though `stage`/`status` themselves don't move.

Both dispositions commit via the existing contents-API path with the existing audit format
(`reconcile: spec sweep` is G0's own commit prefix; use a distinct one for human disposals, e.g.
`reconcile: human disposal (<confirm-shipped|reject>) <spec-id>`, so `git log --grep` can tell
automated flips from human ones later). Both also perform the existing dual-write recon found in
Slice 0 (patch the raw `.md` **and** `specs/index.json` in the same commit) — the same fix
`sdlc-board-triage-and-phase-gates` memory records was already needed once ("latent loop fixed:
runner lifecycle `transition()` patched only the md while every sweep reads index.json").

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

# D1/D2 — confirm-shipped and reject both round-trip against a scratch spec in a scratch branch/PR
#   (do not run against a real active spec's id):
curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"confirm-shipped","reason":"<>=20 char test reason for confirm>","by":"spec-recon-test"}'
#   → commit created; scratch spec's .md now has stage: done, status: shipped, no possibly_shipped/
#     evidence/link_review keys; specs/index.json in the same commit reflects the same

curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id-2>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"reject","reason":"<>=20 char test reason for reject>","by":"spec-recon-test"}'
#   → commit created; scratch spec's .md has reconcile_ignore: true, no possibly_shipped/evidence/
#     link_review keys, stage/status UNCHANGED from before the call; index.json updated in the same commit

curl -s -X POST "$FACTORY_URL/lifecycle/spec/<scratch-id-3>" \
  -H 'content-type: application/json' \
  -d '{"disposition":"reject","reason":"too short"}'
#   → rejected (400), same ≥20-char rule as existing terminal transitions; no commit created

# D3 — the G0 skip, proven against a fixture the sweep would otherwise flag:
#   construct a spec fixture with reconcile_ignore: true that also matches G0's shipment-evidence
#   heuristic (same shape as a spec it would normally flag); run agent/reconcile.sh against it
#   → the fixture is left untouched (no possibly_shipped written, no commit); remove the fixture

<existing lifecycle test command>   # extended suite green
```

## 5. Slice 3 — minion-base: SpecFile type, amber render, one-click dispose

**Tags:** `ui`, `logic` · **Estimate:** 6–8 h · **Repo:** minion-base

**Goal:** the kanban board is where a human sees and disposes of a `possibly_shipped`/`link_review`
flag — matching the proposal's DoD sentence for sentence.

**Do:**

- Extend `SpecFile` (located in Slice 0; per proposal, "wherever the board's spec type lives") with
  `possibly_shipped?: string`, `evidence?: string`, `link_review?: string` — string types matching
  `specs/index.json`'s shape (Slice 1), not booleans; the value is the evidence URL or review note
  itself, not just a flag.
- In the Spec-column card (and the kanban's card-detail route, if `possibly_shipped`/`link_review`
  should surface there too — recon locates it; the v3 lifecycle-dashboard memory names
  `/kanban/[kind]/[...ref]` as the detail-page pattern), render an amber state when either field is
  present: a `--warn`-token badge (existing token per minion-base's `tokens.css`, §"Gate
  conventions" above — no raw hex, no new token) showing the evidence URL as a link or the
  link-review note as text. A card with `link_review` but no `possibly_shipped` still gets the
  amber treatment — the proposal's DoD names both fields as amber triggers, not only
  `possibly_shipped`.
- Add the one-click disposal action (kebab-menu entry, consistent with the existing
  `KebabMenu.svelte` pattern on other stage columns per the 2026-08-13 kebab-menus memory, unless
  Slice 0 recon finds amber cards use a different existing action surface) offering **confirm
  shipped** and **reject**, each opening the existing reason-prompt UI (§2 claim 4) with its
  ≥20-char minimum, then calling `POST /lifecycle/spec/:id` with the matching `disposition` (Slice
  2). On success, apply the existing optimistic local-mirror update (§2 claim 5's `setStatus`-
  shaped pattern) so the amber state clears immediately without waiting for the next 5-minute
  auto-refresh (`2026-08-13-minion-base-kanban-auto-refresh-spec`).
- On a failed disposal call (network error, 400 from the ≥20-char check, etc.), the card stays
  amber and the UI surfaces the error — no silent no-op, no optimistic clear on failure.

**Files:** the `SpecFile` type module (Slice 0), the kanban card component(s) (Slice 0; expected
`src/routes/kanban/+page.svelte` and/or a card sub-component), the kebab-menu / reason-prompt
components (Slice 0, reused not rewritten), a new or extended test for the amber-render logic if
minion-base's `bun test` runner covers component logic (per the auto-refresh spec's precedent of
introducing `bun test` for pure-function DoDs — if the amber-trigger logic is extracted as a pure
`isPossiblyShipped(spec): boolean`-shaped helper, test that in isolation).

**Definition of done (machine-checkable):**

```bash
cd minion_base
bun test                                    # existing suite + any new pure-logic test, green
bunx svelte-check                           # 0 errors / 0 warnings — proves the type extension compiles
bun run lint:design                         # passes; debt unchanged or decreases (amber uses --warn, no new token)
bun run build

rg -n 'possibly_shipped' src/lib/           # SpecFile type hit + card-render hit + disposal-call hit — not just one
git diff -U0 origin/main...HEAD -- '*.svelte' | rg '^\+.*(#[0-9a-fA-F]{3,8}|[0-9]+px)'  # → 0 (semantic tokens only)
```

Plus one browser probe (`browser-harness` skill, headless Chromium, basic-auth `minion:$DASH_PASSWORD`),
pasted into the PR:

```
- seed a scratch spec (via a direct commit, not through the app) with possibly_shipped set →
  open /kanban → the card renders amber with the evidence URL visible
- click confirm-shipped, enter a >=20-char reason, submit → card leaves the Spec column (now
  stage: done) within the page, no manual refresh; verify the commit landed in minion-meta
- seed a second scratch spec with link_review (no possibly_shipped) → confirm it also renders
  amber
- click reject with a <20-char reason → submission is blocked client-side or server-rejects (400);
  card stays amber
- click reject with a valid reason → amber clears, spec stays in its prior column; verify
  reconcile_ignore: true landed on the spec in minion-meta and NOT stage/status
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
| `2026-08-17-meta-spec-index-project-possibly-shipped` (sibling proposal, `status: review`) | **Superseded in substance, not in file** — Slice 1 fulfills its DoD verbatim | N1 below; this spec does not edit that proposal |

Scope guard, run in each repo's PR:

```bash
# minion-meta
out="$(git diff --name-only origin/main...HEAD | rg -v '^(scripts/spec-index\.mjs|specs/TEMPLATE\.md|specs/index\.json|.*\.test\.(mjs|js)$)')"
[ -z "$out" ] || { echo "FAIL: change escaped Slice 1's surface"; echo "$out"; exit 1; }
```

### 🚨 A1 — the disposal path must stay human-only, or the whole design collapses

The phase-gates spec's design principle #3 is explicit: "Gates block buttons, not people... a
below-threshold score disables the board's promote button... the human can override with a
recorded reason." `possibly_shipped` exists *because* G0 is not confident enough to auto-flip.
Slice 2's endpoint must never be callable by the 30-min sweep, a cron, or any non-human `by` value
— it is reachable only from the kebab-menu action Slice 3 adds, gated by the same reason-prompt UI
every other terminal lifecycle action already uses. This is not a new constraint the slices above
violate; it's flagged because a future "let's also auto-confirm high-confidence-adjacent flags"
proposal would be exactly the regression the original G0 design (medium confidence → human gate,
by design, not a shortcut) was built to prevent. Nothing in Slices 1–3 does this today; the alert
is here so it isn't done later without noticing the tension.

### ⚠️ N1 — two follow-ups this spec cannot perform itself

1. **Close or supersede `proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md`** once
   Slice 1 ships — its DoD is satisfied but the file itself is untouched (the planner pass's
   instructions for *this* spec forbid editing any file besides this one and this proposal's
   frontmatter). Flag for whichever human or auto-triage pass next reviews that proposal.
2. **minion-base and minion-factory are still absent from AGENTS.md's Project Map** — twice-
   observed now (`2026-08-13-minion-base-kanban-auto-refresh-spec` §5, `2026-08-17-base-deploy-
   status-branch-filter-spec` §5, and here). Worth a one-line follow-up in a separately scoped
   meta-repo documentation change; not done here for the same reason as N1.1.

## 7. Out of scope (explicit)

Carried from the proposal:

- **Redesigning G0's high/medium/no-evidence confidence classification.** Slice 2 consumes G0's
  existing output; it does not change what counts as medium confidence or how evidence URLs are
  chosen.
- **Any change to how G0 decides `revises`/`supersedes` link hygiene** beyond honoring
  `reconcile_ignore` (D3) — the phase-gates spec's "auto-fixed or flagged" link-hygiene behavior is
  untouched.

Added by this spec:

- **A `link_review` disposal UI beyond the shared amber+confirm/reject action.** The proposal names
  `link_review` only as a render trigger ("showing the evidence URL/link-review note"); this spec
  routes its disposal through the same two-button flow as `possibly_shipped` rather than inventing
  a third disposition, on the reasoning that both fields mean "a human must look at this before the
  sweep can trust it again" and a spec could in principle carry both at once. If a future review
  finds `link_review` needs a distinct disposal semantic (e.g. "which of the two links is correct"
  rather than confirm/reject), that is a new proposal, not a silent reinterpretation here.
- **Batch disposal / bulk-confirm across multiple amber cards.** One card, one action, per the
  proposal's "one-click action" singular framing.
- **Scoring or re-scoring `possibly_shipped` confidence on the board side.** The board renders and
  disposes; it does not second-guess G0's confidence tier.
- **`reconcile_ignore` visible anywhere in minion-base.** §3 explains why it is not projected into
  `specs/index.json`; it has no board consumer.
- **Retrying a failed disposal automatically, or queuing offline disposals.** A failed call surfaces
  an error and leaves the card amber (§5); no retry/backoff logic is added.
- **Editing `proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md` or any other file**
  outside this spec and the source proposal's frontmatter — this planning pass's own constraint,
  restated because N1.1 depends on a human doing it separately.
- **`ui-design-governance`, `lint:tokens`, `packages/design-tokens/contract.json`.** Wrong repo —
  minion-base's governance is `DESIGN.md` + `src/lib/design/tokens.css` + `bun run lint:design`.

## 8. End-to-end verification

Run with Slices 1–3 merged in their three respective repos.

```bash
# 1. minion-meta: the field exists and round-trips (Slice 1 DoD, re-run post-merge)
cd minion-meta && node scripts/spec-index.mjs && grep -c 'possibly_shipped' specs/index.json || true

# 2. minion-factory: G0 produces a real medium-confidence flag (not a fixture) and it reaches minion-meta
cd minion-factory && ./agent/reconcile.sh   # or the scheduled invocation, per whatever recon found
#    → if a real medium-confidence match exists this cycle, the target spec's .md in minion-meta
#      gains possibly_shipped; if none exists, fall back to the scratch-spec fixture from Slice 2's
#      DoD and note in the PR that no live match was available at verification time

# 3. minion-meta: the sweep's commit round-trips through the indexer (this may already be automatic
#    via a post-commit hook or CI step — recon confirms which)
cd minion-meta && node scripts/spec-index.mjs && git diff --stat specs/index.json

# 4. minion-base: the flag is visible and actionable end to end
#    (browser-harness, basic auth) open /kanban → the flagged spec's card is amber, evidence
#    visible → confirm-shipped with a valid reason → card moves to the done column, no manual
#    refresh, and minion-meta's specs/*.md for that spec now shows stage: done, status: shipped,
#    no possibly_shipped/evidence/link_review keys, and specs/index.json agrees

# 5. The human-gate guarantee (🚨 A1), proven negative
#    confirm no automated path (30-min sweep, cron, CI) ever calls POST /lifecycle/spec/:id with a
#    disposition field — grep minion-factory's sweep/cron code for 'disposition' → 0 matches outside
#    the route handler and its tests
```

**Ship gate:** §8 steps 1–5 all green or explicitly explained (step 2's live-match fallback noted);
Slice 1's fixture round-trip pasted; Slice 2's confirm-shipped and reject curl transcripts pasted,
including the rejected-short-reason 400; Slice 3's five-point browser probe pasted; the D2 decision
(whether `shipped` was added to the transition table, or the table was already generic) stated
plainly; N1's two follow-ups logged (as a `TODO(handoff)` at the relevant site in each repo per
AGENTS.md's open-items ledger, plus a proposal for N1.2 if not already filed) since this spec's own
constraints prevent performing them here.
