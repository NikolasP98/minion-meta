---
id: 2026-08-26-spec-heading-lint-baseline-backfill-spec
title: Drain the spec-gate debt — backfill the grandfathered spec headings, resolve 5 orphan superseded specs, resolve `related` ids, and settle the pass>1 link policy
stage: spec
status: approved
pass: 3
created: 2026-08-26
updated: 2026-08-29
repos: [minion-meta]
proposal: 2026-08-18-spec-heading-lint-baseline-backfill
verdict: approved
type: infra
approved_reason: "Pass-3 revision on minion-meta@2c86617, corrected across four cross-provider review rounds. Round 1: the pass-2 blocker (rewrite S5-S9/D6-D10 into the 13 frozen ranges) is fully done, cleanup renumbered to Slice 18 with D19/§6/§7/§9 reconciled so no Slice-10 collision remains; every AS-IS claim re-measured 2026-08-29 (114 heading debt, 99 related ids/22 proposal-only, 69 pass>1 specs all with sidecars); binding DoDs are computed invariants with dated counts labeled non-binding orientation; the zero-TODO gate uses an unpiped negated `rg` instead of `grep -c`. Round 2: the §5B sidecar rule is no longer existence-only - it is a parsed contract split into B1 structural (0/69 violations, lands in S3) and B2 freshness (2 violations measured, this spec own sidecar repaired here, the last one repaired inside S3 before B2 is enabled, with a stated defer-B2 escape hatch so I3 never bends); and S18 now closes the source proposal in the committed board projection (proposals/index.json regenerated, `updated` bumped, DoD asserts status done) because proposal-index.mjs has no --check and no CI step. Round 3: the B1-only escape hatch is now conditional everywhere it is referenced (TO-BE, D4, S3's DoD, S18's DoD, end-to-end verification #4) instead of contradicting the same slice's unconditional zero-violation/zero-marker requirements; and S2/S3 — which both edit `proposals/2026-08-20-factory-spec-heading-nomenclature.md` — are serialized in §7 instead of declared independent, with both slices' files/DoD now requiring the proposal's `updated` bump and a `proposals/index.json` regeneration. Round 4: the B1-only escape hatch is WITHDRAWN rather than conditionalized a third time - two rounds of adding conditionals kept missing a site (this round it was D19 and, decisively, the handoff proposals own file-level auto-close contract at proposals/handoff-minion-meta-1883922325.md:24-26, which no in-spec conditional can satisfy while a marker remains), and the hatch guarded a condition that cannot arise because §5B already states an always-honest repair; B1+B2 now land together in S3 or S3 is blocked and merges nothing, mirroring §6 partial-ranges-do-not-merge, so TO-BE/D4/§5B/S3/S18/§9 each carry one contract. Also round 4: the two new generator failure modes are no longer appended to 2026-08-20-factory-spec-heading-nomenclature (status: done since its 2026-08-28 board audit, and proposal-index.mjs:59-72 projects status through unchanged, so a completed card cannot own new work) - they are owned by the new active proposal 2026-08-29-factory-generator-related-ids-and-review-sidecars (repos: [minion-factory]), which S2/S3/§1/§8/§10 and the related list now point at; proposals/index.json and specs/index.json are regenerated to match this disposition."
relationship: extends
related: [2026-08-17-maintenance-lane-monitors-spec, 2026-08-17-sdlc-phase-gates-scoring-spec, 2026-08-20-factory-spec-heading-nomenclature, 2026-08-29-factory-generator-related-ids-and-review-sidecars, handoff-minion-meta-1883922325]
tags: [infra, hygiene, docs, test]
---

# Drain the spec-gate debt left by the `spec-index --check` hardening

## 0. Product

From the approved proposal `2026-08-18-spec-heading-lint-baseline-backfill`, in the requester's words:

> **Ask:** a sweep (agent or scripted) that reads each baselined spec, adds the missing section(s)
> (can be a short "not applicable" stub for old design docs), and removes the id from the baseline
> file once fixed — shrinking it toward zero over time. Low urgency; do in batches, not one PR of
> 127 files.

> **Ask:** when G0 reconciler work … lands, decide whether it should also *write*
> `revises`/`supersedes` onto those 51 files (closing this proposal), or whether `--check` should
> gain a `pass > 1` presence rule once the backlog is cleared. Don't add the rule to `--check`
> before the backlog is cleared — it would just be red CI with no signal.

> **Ask:** for each id, find or write the spec that actually replaced it … and add the missing
> `supersedes` link on that successor's frontmatter. If a given spec was simply retired rather than
> replaced by a successor, change its `status` from `superseded` to `retired` … Remove each id from
> `scripts/spec-supersede-baseline.json` as it's resolved — the file should shrink to empty.

> **Ask:** decide where the join lives (a shared loader used by both `spec-index.mjs` and
> `proposal-index.mjs`, or a third `link-check` script that reads both committed index.json files),
> then require every `related` id to resolve.

Why it matters: `node scripts/spec-index.mjs --check` is a required meta CI step
(`.github/workflows/ci.yml:55-58`). It currently passes only because two exception files
grandfather 114 specs and 5 orphan `superseded` markers out of the very rules the gate exists to
enforce, and because two link rules were deliberately never written. The board at
base.minion-ai.org consumes `specs/index.json`, so a spec with no out-of-scope and no verification
section is a card an implementer cannot execute from. This spec drains all four debts to zero and
leaves rules behind that stop them re-accumulating.

## 1. Relationship classification (recommend-only)

`relationship: extends`. One line per related id:

- `2026-08-17-maintenance-lane-monitors-spec` — its §2 built the `--check` gate and *created* both
  baseline files as a deliberate day-one carve-out; this spec continues that work by draining the
  carve-out. It does not replace it.
- `2026-08-17-sdlc-phase-gates-scoring-spec` — owns the G0 reconciler row "Pass-1/pass-2 spec pair
  with no supersedes link either direction", i.e. it owns the *pair-detection* half of §2 of the
  proposal; §5 below returns a decision to it rather than duplicating it.
- `2026-08-20-factory-spec-heading-nomenclature` (proposal) — adjacent and explicitly disjoint: it
  fixed the minion-factory *generator* that emitted `## 0. Problem`, and it names the grandfathered
  specs as out of its scope and this spec's territory. It is now `status: done` (its 2026-08-28
  board audit recorded DELTA 2 as addressed), so it is history here, not a live dependency — the
  new generator work this spec creates goes to the proposal below instead.
- `2026-08-29-factory-generator-related-ids-and-review-sidecars` (proposal) — filed by this
  spec's authoring run to own the two *new* ways a factory-generated spec can red meta CI once S2
  and S3 land (an invented `related` id; a sidecar left behind by an in-place `pass` bump). It is
  the cross-repo alert of §8, active and `repos: [minion-factory]`, and it is a consumer of this
  spec's rules, not a blocker of them.
- `handoff-minion-meta-1883922325` (proposal) — the handoff-ledger sweep's marker proposal for the
  four `TODO(handoff)` comments in `scripts/spec-index.mjs`; those are exactly the four asks below,
  so it closes automatically when the markers go (Slice 18). Its own frontmatter already carries
  `duplicate_candidate: 2026-08-18-spec-heading-lint-baseline-backfill`.

Recommendation only — no lifecycle field on any of those four artifacts is changed by this spec.

## 2. AS-IS (re-measured 2026-08-29 on `minion-meta@dev`, tip `2c86617`)

`node scripts/spec-index.mjs --check` → `198 specs`. Every number below was measured on that tree
with the gate's own exported helpers (`missingRequiredHeadings`, `parseFrontmatter`); re-run
instructions are in §9.

**Counts here are dated observations, not contract.** The corpus is live: between the pass-1
measurement (2026-08-26, 192 specs / 126 baselined) and this one (2026-08-29, 198 specs / 114
baselined) twelve ids drained out of the heading baseline through unrelated PRs, because the ratchet
permits removal from any branch. Every *structural* claim below survived that drift unchanged; only
the magnitudes moved. Consequently **no DoD in this spec is gated on a memorized count** — DoDs are
gated on predicates (`zero B<n> ids remain`, `--check` exit 0) that stay true under drift, and §5C's
batch boundaries are frozen **id ranges**, not indices, for the same reason. Re-measure before
starting any slice; do not trust the numbers on this page.

1. **Heading debt: 114 specs, 0 of them currently clean.** `scripts/spec-heading-lint-baseline.json`
   holds 114 `id -> sha256(body)` entries (the proposal said 127; the pass-1 measurement said 126).
   Of those 114 specs: 111 are missing `## 0. Product`, 88 are missing an out-of-scope section, 86
   are missing a verification section. Distribution of missing sections per spec: 73 specs miss all
   three, 25 miss two, 16 miss one. **No baselined id currently passes the lint**, so there is no
   free removal available today — every removal costs an edit. Corpus shape: 62 are terminal
   (`shipped`/`superseded`/`rejected`/`retired`/`done` or `stage: done`), 52 are still active
   (47 of them `status: unknown` from the 2026-08-13 retrofit); created 2026-04 (4), 2026-05 (23),
   2026-06 (14), 2026-07 (58), 2026-08 (15).
2. **The exemption is by content hash, not id** (`scripts/spec-index.mjs:684`): a baselined spec
   stays exempt only while `sha256(body)` matches. Editing a baselined spec silently drops the
   exemption and applies the heading lint. Consequence for this work: a batch that backfills
   headings *and forgets to delete the id* still passes CI — the stale entry is inert, invisible,
   and the baseline never visibly shrinks. Nothing detects that today.
3. **Both baseline files are one-way ratchets** (`checkHeadingBaselineRatchet` /
   `checkSupersedeBaselineRatchet`, wired at `scripts/spec-index.mjs:772-773`): a PR may delete
   entries but never add an id or rewrite a hash, checked against the merge base (PRs), the push
   event's before-SHA, or every parent of `HEAD` locally. Removals are therefore always legal;
   batching is safe.
4. **Orphan superseded markers: 5.** `scripts/spec-supersede-baseline.json` lists 5 ids; all 5 are
   `status: superseded`, `stage: spec`, `updated: 2026-08-13`, and all 5 are also in the heading
   baseline. They are the *only* superseded specs in the corpus without an incoming `supersedes`
   link (6 superseded specs total). Plausible successors already exist in-corpus for at least two —
   `2026-07-10-gateway-update-system` vs `2026-07-11-fleet-update-orchestration` /
   `2026-07-13-runtime-aware-fleet-image-updates`, and `2026-04-21-triage-executor-adapter-design`
   vs `2026-07-10-bug-triage-workforce-agents` / `2026-07-12-living-workforce-harness`.
5. **`related` is enum-checked but never resolved** (`TODO(handoff)` at
   `scripts/spec-index.mjs:675`). Measured: 99 `related` ids across 35 specs; **0 are unresolvable**;
   77 resolve against the spec corpus and **22 resolve only against `proposals/`** (154 proposals).
   So the rule can land today with zero backlog and zero new baseline — but a spec-corpus-only
   implementation would red 22 legitimate references. `scripts/proposal-index.mjs` has no `--check`
   mode (it always writes) and is not run by CI, so it cannot host the rule.
6. **The `pass > 1` TODO misstates the corpus** (`scripts/spec-index.mjs:704`, "51 specs violate
   that today"). Measured: 69 specs have `pass > 1` and 68 carry neither `revises` nor `supersedes`.
   But there are **zero pass-1/pass-2 file pairs**: no two specs share a title, and the only
   same-slug groups (`…-design`/`…-plan`) are all pass 1. The factory's 2-pass review bumps `pass`
   **in place on the same file**, so `revises` has no target to point at — those 68 specs are not
   violating anything. Meanwhile **69 of 69 pass>1 specs have a `specs/<id>.review.md` sidecar, and
   0 of 129 pass-1 specs do**: the corpus already satisfies an exact traceability invariant that the
   proposed presence rule does not express. (This ratio held at 62/62 and 0/130 three days earlier —
   the invariant is stable under corpus growth, which is why it is safe to enforce.)

   **6b — sidecar *presence* is not sidecar *freshness*, and the two split cleanly.** Parsing all
   69 sidecars (not just stat-ing them) on 2026-08-29 gives two very different populations:

   - **Structural: 0 violations of 69.** Every sidecar parses as flat frontmatter, its `spec:` field
     equals the spec's `id`, it carries `pass`, `verdict`, `reviewer` and `created`, its `verdict`
     is in `VERDICTS` (`scripts/spec-index.mjs:81`), and **no sidecar claims a `pass` higher than
     its spec's** — the only direction that would be outright forgery.
   - **Freshness: 2 violations of 69** (`sidecar.pass !== spec.pass`):
     `2026-08-18-base-attention-queue-responsive-runs-spec` (spec `pass: 5`, sidecar `pass: 2`) and
     this spec itself (spec `pass: 3`, sidecar `pass: 2`, and the only verdict disagreement in the
     corpus — `approved` vs `changes_requested`). **This revision repairs its own**, so the live
     count entering S3 is 1, in one named file. An existence-only rule accepts both; that is why
     §5B ships a parsed contract instead.
   - One **orphan sidecar** exists with no spec file at all:
     `specs/2026-08-28-factory-board-audit.review.md` (the 2026-08-28 board-audit record, written as
     a sidecar precisely so it would not mutate ratchet-protected spec bodies). It is legitimate,
     which is the concrete reason the converse rule (`sidecar ⇒ pass>1 spec`) stays unenforced in
     §5B rather than merely "left open" out of caution.
7. **The gate's own fixtures encode the current permissiveness.**
   `scripts/spec-index.test.mjs:665` ("array-form `tags` and `related` pass --check") writes
   `related: [some-other-spec]` — a deliberately dangling id — and asserts exit 0; the scalar-field
   loop at `:650` uses the same dangling value, though its assertion is about array-ness and
   survives S2 unchanged. Neither `makeCliFixture` (`:369`) nor `makeCleanFixture` creates a
   `proposals/` directory in its temp repo.
8. **Body edits do not disturb `specs/index.json`.** The index projects frontmatter only, so
   heading-only edits leave it byte-identical; changing `updated:` does not (the board sorts by it).
   Recorded from a prior factory run: "`specs/index.json` does not hash bodies, so heading edits
   leave it untouched" (`/memory/MINION/factory/2026-08-20-b9b4a8a9.md`).
9. `specs/TEMPLATE.md:27`'s status column omits `retired` and `done`, both of which
   `scripts/spec-frontmatter.mjs:6-20` accepts and the corpus uses (5 retired, 19 done corpus-wide).
   `retired` additionally requires `retired_reason` ≥ 20 chars (`scripts/spec-index.mjs:637`).

## 3. TO-BE

Target observable behavior:

- `scripts/spec-heading-lint-baseline.json` and `scripts/spec-supersede-baseline.json` are **gone**
  (both drained to zero and deleted), and `node scripts/spec-index.mjs --check` exits 0 with every
  spec in the corpus satisfying the three required headings on its own merits.
- `--check` additionally enforces, on top of today's rules: (a) no baseline entry may be stale — an
  id whose spec now passes the lint, or whose spec no longer exists, is an error naming the removal;
  (b) every `related` id resolves against the **union** of the spec and proposal corpora; (c)
  `pass > 1` requires a `specs/<id>.review.md` review sidecar that **parses and names the current
  pass** — not merely a file of that name (§5B).
- **All four** `TODO(handoff)` markers in `scripts/spec-index.mjs` are gone — baseline-staleness
  (D1), `related`-resolution (D3), orphan-superseded (D5), and the `pass`/`revises` site (D4). There
  is no partial outcome: `handoff-minion-meta-1883922325`'s definition of done is *file-level* — the
  sweep closes it "once the file carries no more markers"
  (`proposals/handoff-minion-meta-1883922325.md:24-26`) — so a spec that leaves one marker behind
  leaves that proposal open with no path to close. §5B's landing rule is written to make the
  all-four outcome the only one S3 can ship (§5B, S3's DoD).
- The `pass>1`/`revises` question is **decided and written down**: no blanket presence rule; the
  pair-detection case stays with the G0 reconciler per `2026-08-17-sdlc-phase-gates-scoring-spec`.

Invariants that must not change:

- **I1 — the ratchet stays a ratchet.** No slice may add an id to either baseline file or rewrite a
  hash. If a batch cannot fix a spec, it leaves that id alone; it never re-grandfathers.
- **I2 — no lint rule is weakened.** `REQUIRED_HEADINGS` (`scripts/spec-index.mjs:161-171`),
  `stripNonDocumentMarkdown`, the slice-`**Topics:**` lint, and the bidirectional supersedes rules
  keep their current semantics. Debt is fixed by editing specs, never by relaxing the gate.
- **I3 — every new rule is green on the corpus the day it lands.** Each new rule was measured at 0
  violations (§2.1, §2.5, §2.6/§2.6b) **as of the commit that lands it**, and a rule that would need
  its own baseline is not shipped. One rule is not green today: the sidecar *freshness* half of §5B
  has exactly 1 remaining violation after this revision (§2.6b). I3 is satisfied not by exempting it
  but by making the repair a precondition inside its own slice (S3) — repair first, then enable.
  §5B states the always-available honest repair (correct the roll-up to the spec's current
  pass/verdict and name the passes whose detail was never committed; invent nothing), so "repair
  impossible" is not a shippable branch: if it nonetheless happens, **S3 is blocked and merges
  nothing**, exactly as a partial heading range is blocked in §6. Under no circumstance is a third
  baseline file created (I1), and under no circumstance does a half-rule merge.
- **I4 — content is preserved.** Backfill adds sections and, where a section exists under a
  different name, renames/moves it. No slice deletes spec content, changes a DoD, or edits
  `stage`/`status`/`repos`/`pass` on a spec it is only backfilling headings for.
- **I5 — the board stays legible.** `updated:` is bumped only when the added section changes what an
  implementer would do (see §6 rule R3), so the backfill sweep (114 ids as measured 2026-08-29;
  see §2's drift note) does not reshuffle the whole board.
- **I6 — `specs/index.json` is regenerated in the same commit as any frontmatter change.** The
  staleness check (`scripts/spec-index.mjs:770`) already enforces this; slices must not fight it.
- **I7 — no index file is hand-edited.** `specs/index.json` and `proposals/index.json` change only
  via `node scripts/spec-index.mjs` / `node scripts/proposal-index.mjs`.

## 4. DELTA — numbered transitions

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| D1 | Baseline entries can go stale unnoticed → `--check` errors on any baseline id that passes the lint or names a missing spec (both files) | S1 | New fixtures in `scripts/spec-index.test.mjs`: a baselined-but-clean spec fails; a baseline id with no file fails; the real corpus still exits 0 |
| D2 | No way to see what the baselined specs are missing → `node scripts/spec-heading-backfill.mjs --report` prints per-id missing sections + totals; `--verify` is the same check as D1 usable pre-commit | S1 | `--report` row count equals the baseline file's key count exactly (114 as measured 2026-08-29; totals 111/88/86 — dated orientation numbers per §2's drift note, not a binding count); `--verify` exits 0 today and 1 on a seeded stale entry |
| D3 | `related` ids unresolved → every `related` id must resolve against specs ∪ proposals, via one shared loader | S2 | Fixtures: dangling id fails; proposal-only id passes; missing `proposals/` dir does not crash; corpus exits 0 with zero unresolvable ids (99 ids, 22 proposal-only, as measured 2026-08-29 — dated orientation numbers, not a binding count) |
| D4 | `pass>1` policy undecided and TODO misstates the corpus → decision recorded, TODO removed, `pass>1 ⇒ a **parsed, current** review sidecar` enforced (§5B B1 **and** B2 together — there is no half-rule variant) | S3 | Fixtures: `pass: 2` with no sidecar fails; with an unparseable, wrong-`spec`, missing-field, `pass`-ahead, stale-`pass`, or verdict-contradicting sidecar fails; with a current sidecar passes; `pass: 1` unaffected; the one known stale sidecar is repaired in the same slice so the corpus exits 0 with no new baseline and the TODO is removed outright |
| D5 | 5 orphan `superseded` specs → each linked from a real successor or flipped to `retired` + `retired_reason`; `scripts/spec-supersede-baseline.json` deleted | S4 | `--check` exits 0 with the file absent; `specs/index.json` regenerated; each disposition justified in the PR body |
| D6 | Heading-baseline range B1 grandfathered → backfilled and removed | S5 | `--check` exits 0; `--verify` exits 0; `--report --batch B1` prints 0 rows |
| D7 | range B2 grandfathered → backfilled and removed | S6 | same, for B2 |
| D8 | range B3 grandfathered → backfilled and removed | S7 | same, for B3 |
| D9 | range B4 grandfathered → backfilled and removed | S8 | same, for B4 |
| D10 | range B5 grandfathered → backfilled and removed | S9 | same, for B5 |
| D11 | range B6 grandfathered → backfilled and removed | S10 | same, for B6 |
| D12 | range B7 grandfathered → backfilled and removed | S11 | same, for B7 |
| D13 | range B8 grandfathered → backfilled and removed | S12 | same, for B8 |
| D14 | range B9 grandfathered → backfilled and removed | S13 | same, for B9 |
| D15 | range B10 grandfathered → backfilled and removed | S14 | same, for B10 |
| D16 | range B11 grandfathered → backfilled and removed | S15 | same, for B11 |
| D17 | range B12 grandfathered → backfilled and removed | S16 | same, for B12 |
| D18 | range B13 grandfathered → backfilled and removed; heading baseline reaches `{}` | S17 | same, for B13, and `--report` prints 0 rows corpus-wide |
| D19 | Empty baselines + 4 stale `TODO(handoff)` markers + stale TEMPLATE docs → files deleted, markers removed, `specs/TEMPLATE.md` corrected, source proposal closed **in both the Markdown and the committed board projection** | S18 | `--check` exits 0 with neither baseline file present; `! rg -n 'TODO\(handoff\)' scripts/spec-index.mjs` exits 0 (no match); `node scripts/proposal-index.mjs` re-run and `proposals/index.json` shows `"status": "done"` for `2026-08-18-spec-heading-lint-baseline-backfill` in the same commit; `pnpm run test:scripts` green |

Every slice below traces to at least one row; no row lacks a proving test. D6–D18 are stated as
*range emptied*, not as a baseline count, deliberately: §2's preamble shows counts drift under
unrelated merges, so a count-based transition can be satisfied or falsified by a PR that never
touched this work. The cumulative counts measured on 2026-08-29 are carried in §5C as orientation.

## 5. Design decisions (the four asks, answered)

**A. Where the `related` join lives → a shared loader inside `--check`, not a third script.**
New `scripts/corpus.mjs` exporting `loadIds({ dirs })` (or equivalent) that parses frontmatter ids
from `specs/` and `proposals/`, skipping `TEMPLATE.md` and `*.review.md` and tolerating a missing
directory. `spec-index.mjs --check` consumes it; `proposal-index.mjs` may consume it later. Reasons:
`related` link integrity belongs beside the `revises`/`supersedes` link integrity it mirrors (same
function, same error style, one gate to read); a third script needs a new CI step and splits link
integrity across two gates; and reading the committed `index.json` files instead of the markdown
would make the rule depend on the very artifact whose staleness the gate is separately checking.
Resolution reads the **markdown**, not `index.json`.

**B. `pass > 1` presence rule → NO. Do not add it, and correct the record.**
The premise ("51 specs violate that") does not survive measurement (§2.6): the factory's 2-pass
review bumps `pass` in place, so 68 of 69 specs (as measured 2026-08-29; see §2.6) have no second
file to link to, and there are zero pass-1/pass-2 file pairs in the corpus. A blanket presence rule
would demand a link that cannot exist and would be a permanent 68-file red. The genuine pair case —
two files, two passes, no link — is already assigned to the G0 reconciler by
`2026-08-17-sdlc-phase-gates-scoring-spec`, and it needs semantic pair detection (title/slug
similarity), which is a heuristic that does not belong in a required CI gate. What *is* exact and
already true of 69/69 specs is: a pass bump is evidence of a completed review, and a completed
review leaves `specs/<id>.review.md`. Ship **that** traceability instead of the presence rule.

But "a file with that name exists" is the wrong test, and §2.6b shows why: 2 of 69 sidecars are
behind their spec's pass, and this spec's own sidecar was one of them (`pass: 3`/`approved` spec,
`pass: 2`/`changes_requested` sidecar) until this revision repaired it. An existence-only rule would
have graded that as compliant, i.e. it would green-light a re-pass that no committed record shows
was ever reviewed. So the rule is a **parsed** contract, in two named halves —
separately named so a failure message says which contract broke, but shipped in one commit (see
"Landing rule" below):

- **B1 — structural (binding, 0/69 violations today, lands in S3).** For every spec with `pass > 1`
  there is a `specs/<id>.review.md` that: (i) parses with `parseFrontmatter`; (ii) has
  `sidecar.spec === spec.id`; (iii) carries `pass`, `verdict`, `reviewer`, `created`; (iv) has an
  integer `pass ≥ 1`; (v) has `verdict` ∈ `VERDICTS` (`scripts/spec-index.mjs:81`); and (vi) has
  `sidecar.pass ≤ spec.pass` — a sidecar may lag, never lead. (vi) is the half that is a pure
  forgery check and is unconditionally safe to enable.
- **B2 — freshness (binding once green; 1 violation remaining after this revision).**
  `sidecar.pass === spec.pass`, and when the sidecar records the spec's current pass its `verdict`
  equals the spec's `verdict` (the roll-up must not contradict its own evidence). The single known
  violation — `2026-08-18-base-attention-queue-responsive-runs-spec`, spec `pass: 5` / sidecar
  `pass: 2` — is repaired **inside S3, before the rule is enabled**, so B2 also lands at zero (I3).

**Landing rule: B1 and B2 land together in S3, or S3 lands nothing.** An earlier revision of this
spec authorized a B1-only fallback that deferred B2 behind a replacement `TODO(handoff)`. That
branch is withdrawn, for two reasons that are facts about the repository rather than preferences.
(a) `handoff-minion-meta-1883922325` closes on a *file-level* predicate — the sweep closes it "once
the file carries no more markers" (`proposals/handoff-minion-meta-1883922325.md:24-26`) — so leaving
one of the four markers behind leaves that proposal open with no closing path and makes D19's and
§9's zero-marker proof unsatisfiable. (b) The fallback guarded a condition that cannot arise: the
repair S3 performs has an always-available honest form — correct the sidecar's roll-up to the spec's
current `pass`/`verdict` and name in the body which passes left no committed detail, inventing
nothing. That needs no evidence beyond the spec's own frontmatter. If some future corpus state
defeats even that, S3 is **blocked** and merges nothing — the same discipline §6 applies to a
partially fixable heading range — and the spec is revised rather than a half-rule shipped.

The sidecar shape B2 assumes is the one this spec's own sidecar now uses: frontmatter is the
**current-pass roll-up**, and each pass keeps its own `## Pass N — <verdict>` section, newest last.
That keeps prior-pass findings readable without letting the machine-checked fields go stale.

Only the forward direction is enforced (`pass>1 ⇒ sidecar`); the converse stays unenforced, and not
merely out of caution — `specs/2026-08-28-factory-board-audit.review.md` is a real, legitimate
sidecar with no spec file at all (§2.6b), so the converse would red a deliberate artifact on day one.

**C. Batching → contiguous id ranges, one PR each, sequential.**
Boundaries are frozen, expressed as **id ranges** (not indices) so they stay stable as the baseline
shrinks. `Count` and `Left after` are the 2026-08-29 measurement, for orientation only — the binding
DoD is "no id in this range remains in the baseline" (§6):

| Batch | Count | Left after | First id | Last id (inclusive) |
|---|---:|---:|---|---|
| B1 | 10 | 104 | `2026-04-19-minion-meta-repo-design` | `2026-05-22-document-ingestion` |
| B2 | 10 | 94 | `2026-05-22-gateway-turn-recovery` | `2026-05-26-auth-token-simplification` |
| B3 | 10 | 84 | `2026-05-27-gateway-dx-simplification` | `2026-06-13-plugin-sdk-recon-and-improvement-report` |
| B4 | 10 | 74 | `2026-06-14-plugin-ui-cdn-caching-design` | `2026-07-02-hub-erp-agent-native-audit` |
| B5 | 10 | 64 | `2026-07-04-meta-business-integration` | `2026-07-06-hub-tanstack-pacer` |
| B6 | 10 | 54 | `2026-07-06-hub-tanstack-query` | `2026-07-10-per-org-volume-tenancy` |
| B7 | 10 | 44 | `2026-07-11-fleet-update-orchestration` | `2026-07-13-hub-ui-coherence-audit` |
| B8 | 10 | 34 | `2026-07-13-hub-ui-coherence-execution-log` | `2026-07-17-hub-performance-optimization-plan` |
| B9 | 10 | 24 | `2026-07-17-ig-ad-attribution-spec` | `2026-07-20-whatsapp-sync-status-spec` |
| B10 | 9 | 15 | `2026-07-21-unified-brains-knowledge-architecture` | `2026-08-03-crm-relationship-graph-v2-port-spec` |
| B11 | 7 | 8 | `2026-08-07-projects-github-repos-and-factory-gates-spec` | `2026-08-18-base-kanban-possibly-shipped-surface-spec` |
| B12 | 2 | 6 | `2026-08-18-base-phase-aware-sorting-provenance` | `2026-08-18-factory-workitem-handoff-schema-spec` |
| B13 | 6 | 0 | `2026-08-18-minion-base-mobile-hitl-ux-plan` | `ws-duplication-audit` |

**The ranges are drift-proof, and that was verified rather than assumed.** Re-run against the
2026-08-29 baseline, all 114 surviving ids still fall inside these 13 ranges — zero uncovered, zero
double-covered — even though two boundary ids (`2026-08-07-projects-github-repos-and-factory-gates-spec`,
`2026-08-18-factory-workitem-handoff-schema-spec`) have themselves already drained out of the
baseline. Because the ranges are string bounds rather than members, a drained boundary costs
nothing. Sizes shrank in the tail only (B10 9, B11 7, B12 2) and no batch grew, which the ratchet
(§2.3) guarantees. A batch that measures 0 ids at start time is a no-op: close it and move on.

The exact file list for a batch is reproducible, never guessed:

```sh
node -e 'const b=require("./scripts/spec-heading-lint-baseline.json");
console.log(Object.keys(b).sort().filter(id=>id>="FIRST"&&id<="LAST").join("\n"))'
```

Sequential, not parallel: two batch PRs that both touch the shared baseline and potentially
`specs/index.json` conflict, and per
`/memory/MINION/minion-factory-agent-pipeline.md` ★★★ meta pushes race. Each batch branch merges
`origin/dev` **in** (never rebases — rebase rewrites history and the runner cannot force-push,
`/memory/MINION/sdlc-board-triage-and-phase-gates.md:133`), regenerates the index after the merge,
and pushes with rebase-retry.

**D. What "backfilled" means per spec (the content contract).** Judgment, not templating:

- *Terminal specs* (62 of the 114: `shipped`/`superseded`/`rejected`/`retired`/`done`, or `stage: done`) — a
  historical record does not acquire new scope. `## 0. Product` states, in one or two sentences,
  what the document was for; out-of-scope and verification may be honest stubs
  (`**Out of scope:** historical record — this spec is closed; scope changes belong in a new spec.` /
  `**Verification:** none — shipped and closed on <date>; see <evidence/PR> if known.`). Do not
  invent a verification procedure for work that already shipped.
- *Active specs* (52) — the sections must be real. If the document says nowhere what is out of scope
  or how to verify it, the backfiller writes what the document's own content implies and says so in
  the PR body; it does not guess at product intent. A spec whose active scope genuinely cannot be
  determined is left in the baseline and reported in the PR body as unresolved (I1 permits this —
  the ratchet only forbids growth).
- Where a section exists under a non-matching name (`## 0. Problem`, `## 9. End-to-end acceptance`),
  **rename or move it** rather than adding a duplicate — the three shapes and the section-renumbering
  hazard are already documented in `2026-08-20-factory-spec-heading-nomenclature` DELTA 1; check
  `§n` cross-references before renumbering.

## 6. Slices

Each slice is one PR against `dev`, sized for a junior dev at 4–8 focused hours. S1–S4 are the
rule/decision slices; S5–S17 are the thirteen frozen heading batches of §5C; S18 is cleanup.

**Shared contract for the batch slices S5–S17.** Every batch slice is the same work on a different
frozen range, so the contract is stated once here and each slice below carries only its range and
its topics line.

- **Files:** the `specs/*.md` in the batch's range (list reproduced by the §5C command — never
  guessed); `scripts/spec-heading-lint-baseline.json` (that range's entries deleted);
  `specs/index.json` only if some spec in the batch legitimately bumps `updated:` per rule R3.
- **Content contract:** §5D — terminal specs get honest stubs, active specs get real sections,
  misnamed sections are renamed/moved rather than duplicated.
- **Rule R3:** bump `updated:` only when the added section changes what an implementer would do —
  essentially never for terminal specs, sometimes for active ones. If any `updated:` is bumped,
  regenerate `specs/index.json` in the same commit (the staleness check at
  `scripts/spec-index.mjs:783` catches the omission anyway).
- **DoD (machine-checkable), identical for every batch:**
  1. `node scripts/spec-index.mjs --check` exits 0, exit code captured unpiped;
  2. `node scripts/spec-heading-backfill.mjs --verify` exits 0;
  3. `node scripts/spec-heading-backfill.mjs --report --batch B<n>` prints **0 rows** — no id in the
     range remains in the baseline;
  4. the diff touches no `stage`/`status`/`repos`/`pass` field on any spec (I4).
- **Partial ranges do not merge.** If any id in the range cannot be fixed without guessing product
  intent, the slice is blocked: it must not claim the DoD and must not merge a partial range. The PR
  body names the id and the reason, and the id stays in the baseline (I1 permits leaving it; the
  ratchet only forbids growth).
- **A batch that measures 0 ids at start time is a no-op** — the range drained through unrelated
  merges. Close it, say so, and move to the next; that is a legal outcome, not a failure.


### Slice 1 — Baseline hygiene rules + backfill report tool

**Topics:** `infra`, `hygiene`, `test`

**Files:** `scripts/spec-index.mjs` (new `findStaleBaselineEntries()` helper + two call sites in the
`check` block; rewrite the TODO at :223-226 into a pointer to this spec); new
`scripts/spec-heading-backfill.mjs`; `scripts/spec-index.test.mjs` (new fixtures); `package.json`
(add `"spec:backfill": "node scripts/spec-heading-backfill.mjs"`).

Adds to `--check`: for each id in either baseline file, error if (a) `specs/<id>.md` does not exist,
or (b) it exists and `missingRequiredHeadings(body).length === 0` (heading baseline) / it is now
named by some spec's `supersedes` or is no longer `status: superseded` (supersede baseline). Error
text names the file and the exact line to delete. `spec-heading-backfill.mjs` is a read-only
reporter: `--report` prints `<id>\t<missing labels>` plus totals; `--report --batch B1..B13` filters
to a frozen range; `--verify` runs the same predicate as (a)/(b) and exits non-zero, for use before
committing a batch.

**DoD (machine-checkable):** `node scripts/spec-index.mjs --check` exits 0 unpiped (capture `$?`
directly — a piped gate returns the pipe's exit code, `/memory/MINION/MEMORY.md` FEEDBACK
"piped gates lie"); `pnpm run test:scripts` green with ≥ 4 new fixtures, each of which fails if its
control is reverted; `node scripts/spec-heading-backfill.mjs --report` prints exactly one row per id
currently in `scripts/spec-heading-lint-baseline.json` (114 rows, totals `product=111 out-of-scope=88
verification=86` as measured 2026-08-29 — dated orientation numbers per §2's drift note, re-measure
before relying on them; the binding predicate is "row count == baseline key count"); `--verify` exits 0.

### Slice 2 — `related` ids resolve across the spec ∪ proposal corpora

**Topics:** `infra`, `hygiene`, `test`

**Files:** new `scripts/corpus.mjs`; `scripts/spec-index.mjs` (replace the TODO at :662 with the
rule); `scripts/spec-index.test.mjs` (fix the two fixtures at :640 and :649 that currently assert a
dangling `related` id passes; add new ones); `specs/TEMPLATE.md` (`related` row: "every id must
resolve to an existing spec or proposal");
`proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md` (append the
as-shipped rule semantics and error text for the `related` failure mode required by §8; no
lifecycle change — the proposal is already active — but bump `updated` to the commit date since
this is a substantive edit); `proposals/index.json` (regenerated via `node scripts/proposal-index.mjs`
in the same commit — I7; per §7 this lands before S3's edit to the same proposal, so there is no
race).

The loader tolerates a missing `proposals/` directory (returns an empty set) so the CLI fixtures at
`scripts/spec-index.test.mjs:363` keep working without a proposals tree. Resolution runs **only**
under `--check`; the plain generator path stays permissive so `spec-index.mjs` can still regenerate
an index for a corpus mid-edit.

**DoD:** `--check` exits 0 on the corpus with zero unresolvable `related` ids (99 related ids, 22 of
them proposal-only, as measured 2026-08-29 — dated orientation numbers, not a binding count); fixtures prove
(i) a dangling id fails naming spec + id, (ii) a proposal-only id passes, (iii) a fixture repo with
no `proposals/` dir passes, (iv) `node scripts/spec-index.mjs` (no `--check`) still succeeds with a
dangling id; `grep -n 'TODO(handoff)' scripts/spec-index.mjs` no longer matches the `related` marker;
`proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md` names invented
`related` ids as a generator failure mode with the as-shipped error text, its `updated` field is
bumped, its `status` is still an active (non-terminal) value, and `node scripts/proposal-index.mjs`
was re-run with `git diff --exit-code proposals/index.json` clean in the same commit.

### Slice 3 — Settle the pass>1 policy; enforce review-sidecar traceability

**Topics:** `infra`, `hygiene`, `docs`, `test`

**Files:** `scripts/spec-index.mjs` (replace the TODO at :691 with the decision + the sidecar rule);
`scripts/spec-index.test.mjs`; `specs/2026-08-18-base-attention-queue-responsive-runs-spec.review.md`
(the one stale sidecar — repaired, see below); `specs/TEMPLATE.md` (`pass` and `revises` rows plus a
new **review-sidecar** row: `pass` is bumped in place by a re-pass and requires a sidecar whose
frontmatter is the current-pass roll-up, with one `## Pass N — <verdict>` section per pass; `revises`
is only for the rare *new-file* re-pass); `proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md`
(append the as-shipped rule semantics and error text for the missing-/stale-sidecar failure mode
required by §8; no lifecycle change — the proposal is already active — but bump `updated` to the
commit date; this is that proposal's *second* substantive edit, landing after S2 per §7);
`proposals/index.json` (regenerated via `node scripts/proposal-index.mjs` in the same commit — I7).

Implements decision B of §5: no presence rule; `pass > 1` requires a **parsed, current** sidecar.
Ship B1 and B2 as separate, separately-named errors so a failure message says which contract broke.

**Repair before enable (the I3 precondition).** §2.6b measured exactly one B2 violation left after
this spec's own sidecar was repaired: `2026-08-18-base-attention-queue-responsive-runs-spec`, spec
`pass: 5`, sidecar `pass: 2`. Re-measure first — it may have drained. If it is still there: recover
the pass-3/4/5 review records from the run evidence (the spec's `approved_reason` names "Pass-5 G2
by orchestrator" and a pass-4 FAIL, so the reviewing runs and their PR comments are findable) and
append them as `## Pass N` sections. Where a pass's detail genuinely cannot be recovered, do **not**
invent one: correct the frontmatter roll-up to the spec's current pass/verdict and state in the body
which passes left no committed detail and why. Fabricating review findings is a worse defect than
the stale field.

**There is no B1-only fallback** (§5B, "Landing rule"). The repair above always has an honest form —
correcting the roll-up and naming the unrecoverable passes needs nothing beyond the spec's own
frontmatter — so B1 and B2 ship in one commit. In the event some corpus state defeats even that,
**S3 is blocked and merges nothing**: it does not ship half the rule, does not leave a replacement
`TODO(handoff)`, and does not create a third baseline file (I1). The PR body says what defeated the
repair and the spec is revised. This mirrors §6's "partial ranges do not merge".

The comment must state the measured facts as of implementation — re-measure with §9's helper rather
than copying stale numbers; as measured 2026-08-29 these are 69 pass>1, 68 without a link, 0 file
pairs, 69/69 sidecars, 0/69 structural violations, 1 remaining freshness violation (dated
orientation numbers, not a binding count) — so the next reader does not re-litigate from the old
"51 violate" framing, and must hand the pair-detection case to
`2026-08-17-sdlc-phase-gates-scoring-spec`'s G0 reconciler by name.

**DoD (machine-checkable):**
1. `node scripts/spec-index.mjs --check` exits 0 on the corpus, exit code captured unpiped, with
   **zero** sidecar violations of either half — no baseline, no exemption list, no skip flag;
2. `pnpm run test:scripts` green with fixtures proving each clause fails independently: `pass: 2`
   with **no** sidecar; with an unparseable/empty sidecar; with `sidecar.spec` naming a different
   id; with `pass`/`verdict`/`reviewer`/`created` missing; with `sidecar.pass > spec.pass`; with
   `sidecar.pass < spec.pass` (B2); with `sidecar.pass === spec.pass` but a contradicting `verdict`
   (B2). Positives: a current, agreeing sidecar passes, and `pass: 1` with no sidecar passes;
3. each fixture fails if its control is reverted (fixtures that cannot fail prove nothing);
4. `2026-08-18-base-attention-queue-responsive-runs-spec`'s sidecar satisfies B1 **and** B2 in the
   same commit that enables them, and every other pass>1 sidecar does too;
5. no `TODO(handoff)` remains at the pass/revises site — it is deleted, not replaced, not commented
   out. S3 leaves no open end of its own, so it files no new handoff marker;
6. `proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md` names both a
   missing and a stale pass-2 review sidecar as generator failure modes, with the as-shipped error
   text;
7. that proposal's `updated` field is bumped again (its second substantive edit, after S2), its
   `status` is still an active (non-terminal) value, and `node scripts/proposal-index.mjs` was
   re-run with `git diff --exit-code proposals/index.json` clean in the same commit.

### Slice 4 — Resolve the 5 orphan superseded specs and delete that baseline

**Topics:** `infra`, `hygiene`, `board`

**Files:** up to 5 successor specs' frontmatter (`supersedes:`) and/or the 5 orphan specs' own
frontmatter (`status: retired` + `retired_reason`); `scripts/spec-supersede-baseline.json`
(deleted); `scripts/spec-index.mjs` (rewrite the TODO at :228-230); `specs/index.json` (regenerated,
never hand-edited).

Per id: read it, then search commits and sibling specs around `updated: 2026-08-13` for the work that
actually replaced it (starting anchors in §2.4). If a successor exists → add `supersedes: <orphan>`
to the successor. If not → `status: retired` with a ≥ 20-char `retired_reason` naming why, and the
orphan leaves the superseded population entirely. **Constraint to check first:** `supersedes` is a
scalar — one successor may name only one predecessor. If two orphans map to the same successor, one
of them is retired instead (or a different, more specific successor is used); do not chain a false
lineage to satisfy the gate. The heading debt of these same 5 specs stays with their heading batch.

**DoD:** `scripts/spec-supersede-baseline.json` is deleted; `--check` exits 0; `specs/index.json`
regenerated in the same commit; PR body states the disposition and the evidence for each of the 5.

### Slice 5 — Heading backfill batch B1

**Topics:** `docs`, `hygiene`

Range `2026-04-19-minion-meta-repo-design` … `2026-05-22-document-ingestion` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D6.

### Slice 6 — Heading backfill batch B2

**Topics:** `docs`, `hygiene`

Range `2026-05-22-gateway-turn-recovery` … `2026-05-26-auth-token-simplification` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D7.

### Slice 7 — Heading backfill batch B3

**Topics:** `docs`, `hygiene`

Range `2026-05-27-gateway-dx-simplification` … `2026-06-13-plugin-sdk-recon-and-improvement-report` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D8.

### Slice 8 — Heading backfill batch B4

**Topics:** `docs`, `hygiene`

Range `2026-06-14-plugin-ui-cdn-caching-design` … `2026-07-02-hub-erp-agent-native-audit` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D9.

### Slice 9 — Heading backfill batch B5

**Topics:** `docs`, `hygiene`

Range `2026-07-04-meta-business-integration` … `2026-07-06-hub-tanstack-pacer` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D10.

### Slice 10 — Heading backfill batch B6

**Topics:** `docs`, `hygiene`

Range `2026-07-06-hub-tanstack-query` … `2026-07-10-per-org-volume-tenancy` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D11.

### Slice 11 — Heading backfill batch B7

**Topics:** `docs`, `hygiene`

Range `2026-07-11-fleet-update-orchestration` … `2026-07-13-hub-ui-coherence-audit` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D12.

### Slice 12 — Heading backfill batch B8

**Topics:** `docs`, `hygiene`

Range `2026-07-13-hub-ui-coherence-execution-log` … `2026-07-17-hub-performance-optimization-plan` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D13.

### Slice 13 — Heading backfill batch B9

**Topics:** `docs`, `hygiene`

Range `2026-07-17-ig-ad-attribution-spec` … `2026-07-20-whatsapp-sync-status-spec` (inclusive), 10 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D14.

### Slice 14 — Heading backfill batch B10

**Topics:** `docs`, `hygiene`

Range `2026-07-21-unified-brains-knowledge-architecture` … `2026-08-03-crm-relationship-graph-v2-port-spec` (inclusive), 9 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D15.

### Slice 15 — Heading backfill batch B11

**Topics:** `docs`, `hygiene`

Range `2026-08-07-projects-github-repos-and-factory-gates-spec` … `2026-08-18-base-kanban-possibly-shipped-surface-spec` (inclusive), 7 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D16.

### Slice 16 — Heading backfill batch B12

**Topics:** `docs`, `hygiene`

Range `2026-08-18-base-phase-aware-sorting-provenance` … `2026-08-18-factory-workitem-handoff-schema-spec` (inclusive), 2 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D17.

### Slice 17 — Heading backfill batch B13

**Topics:** `docs`, `hygiene`

Range `2026-08-18-minion-base-mobile-hitl-ux-plan` … `ws-duplication-audit` (inclusive), 6 ids as measured 2026-08-29.
Files, content contract, R3 and DoD are the shared batch contract at the top of §6; proves D18. This is the last batch, so the baseline file is left containing exactly `{}`; S18 deletes it.

### Slice 18 — Retire the baselines, close the markers, correct the template

**Topics:** `infra`, `docs`, `todo`, `handoff-sweep`

**Files:** `scripts/spec-heading-lint-baseline.json` (deleted); `scripts/spec-index.mjs` (remove the
last `TODO(handoff)` markers and rewrite the header comment's grandfathering paragraphs into the
past tense, keeping the ratchet code and its tests intact); `scripts/spec-index.test.mjs` (a fixture
proving the gate still works with **no** baseline file present, and that re-adding one with a new id
still fails the ratchet); `specs/TEMPLATE.md` (add `retired` and `done` to the status list; note
`retired_reason`; update the grandfathering sentence); `scripts/spec-heading-backfill.mjs` (keep
`--verify` as a no-op-safe pre-commit check, or delete it — say which in the PR);
`proposals/2026-08-18-spec-heading-lint-baseline-backfill.md` (frontmatter `status: done` **and**
`updated:` bumped to the merge date); `proposals/index.json` (regenerated by
`node scripts/proposal-index.mjs`, never hand-edited — I7).

The ratchet code stays: with both files absent, an attempt to re-create either with a new id is
still an error, which is exactly the regression guard this whole effort earns.

**Closing the proposal is two edits, not one.** `scripts/proposal-index.mjs:59-64` projects `status`
and `updated` into the committed `proposals/index.json`, and `proposals/TEMPLATE.md:12-13` requires
running the generator after any proposal edit. Unlike the spec side there is **no safety net**:
`proposal-index.mjs` has no `--check` mode and no CI step (§2.5), so `pnpm run ci` stays green while
the board keeps rendering this proposal as `in-spec` forever. Editing only the Markdown is therefore
a silent failure of the very debt-drain this slice exists to finish.

**DoD:** neither baseline file exists; `node scripts/spec-index.mjs --check` exits 0;
`! rg -n 'TODO\(handoff\)' scripts/spec-index.mjs` exits 0, i.e. `rg` finds no match — `rg -n` alone
exits 1 on no-match, so the check is the negated, unpiped exit code, not stdout. That zero-match
state is what lets the handoff sweep close `handoff-minion-meta-1883922325` on its own: its
definition of done is file-level ("the sweep closes this proposal automatically once the file
carries no more markers", `proposals/handoff-minion-meta-1883922325.md:24-26`), so anything short of
all four markers gone leaves it open. §5B's landing rule is what guarantees S3 cannot leave a
fourth. `node scripts/proposal-index.mjs` was run and `node -e 'const p=require("./proposals/index.json").proposals.find(x=>x.id==="2026-08-18-spec-heading-lint-baseline-backfill");
process.exit(p && p.status==="done" ? 0 : 1)'` exits 0 **from the committed tree** (i.e. re-running
the generator produces no further diff — `git diff --exit-code proposals/index.json` after the run);
`pnpm run test:scripts` green; `pnpm run ci` green.

## 7. Ordering and concurrency

S1 must land before S5–S17 (it is what makes "removed from the baseline" enforceable). S4 is
independent of S2/S3 and of the batches and may land in any order. **S2 must land before S3: both
substantively append to `proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md` (§8),
each with its own `updated` bump and `proposals/index.json` regeneration (see each slice's DoD) —
running them concurrently would race on the same proposal file and index projection, so they are not
independent and must not be dispatched together.** S5→S17 land sequentially; S18 is last. Batches are the only
slices that touch many files, and they touch disjoint file sets, so a late-arriving S3/S4 never
conflicts with a batch except on `specs/index.json` and, for S3, `proposals/index.json` — resolve by
merging `dev` in and re-running the generator, never by hand-editing the index (I7).

## 8. Cross-repo impact

`repos: [minion-meta]`. Nothing here changes a published package, a runtime path, or a schema.

- **minion-base (board) — mitigated.** `specs/index.json` is the board's only source. Rule R3 keeps
  `updated:` bumps rare, so the sweep does not reshuffle the board; the batches that do bump some
  cards cap the churn at one batch's worth. No projection field changes, so no board code change is
  needed.
- **minion-factory (spec generator) — unavoidable, ALERT, and owned by an active proposal.** Two of
  the new rules add ways for a *factory-generated* spec to red meta CI: an invented `related` id
  (S2) and a `pass: 2` spec whose review sidecar was not committed — **or was committed once and
  then left behind by later in-place pass bumps**, which §2.6b measures as the more common of the
  two failure modes (S3). Both are correct failures — the alternative is unverifiable links on the
  board — but the generator must be told about them. **Owner:**
  `proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md`, filed by this
  spec's authoring run, `repos: [minion-factory]`, active. It could **not** be appended to
  `2026-08-20-factory-spec-heading-nomenclature`: that proposal is `status: done` (its 2026-08-28
  board audit recorded the `## 0. Product` DELTA 2 as addressed), and
  `scripts/proposal-index.mjs:59-72` projects a proposal's status through unchanged, so prose
  appended to a completed card creates no active work item. **Mitigation:** S2 and S3 error text
  must name the file, the offending value, and the fix; and each slice appends its as-shipped rule
  semantics and error text to the active proposal above (a proposal edit, not a spec change), so the
  generator fix covers both in one pass. Do not fix the generator from this spec — it is another
  repo and that proposal's DELTA.
- **The factory dev lane itself — mitigated.** Batch slices are large-file-count but mechanical;
  they must be run slice-scoped (one batch per run/branch), per
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` ★ "slice-scoped dev runs mandatory
  (monolith = 101-turn burn)". A run that tries to do two batches at once should be stopped.
- **minion / minion_hub / minion_site / paperclip / pixel-agents — none.** No file outside
  `scripts/`, `specs/`, `proposals/` and `package.json` is touched.

## 9. End-to-end verification

Run from the repo root on a fresh clone of `dev` **after S18 has merged** (each command's exit code
read directly, never through a pipe):

1. `node scripts/spec-index.mjs --check` → exit 0, prints `spec-index --check passed: N specs`.
2. `test ! -e scripts/spec-heading-lint-baseline.json && test ! -e scripts/spec-supersede-baseline.json`
   → exit 0. Both debts are gone, not hidden.
3. Re-measure the debt with the gate's own helper — expect `0`:
   ```sh
   node -e 'import("./scripts/spec-index.mjs").then(async m=>{const fs=await import("node:fs");
   const {parseFrontmatter}=await import("./scripts/spec-frontmatter.mjs");
   let bad=0; for(const f of fs.readdirSync("specs").filter(f=>f.endsWith(".md")&&f!=="TEMPLATE.md"&&!f.endsWith(".review.md"))){
   const p=parseFrontmatter(fs.readFileSync("specs/"+f,"utf8")); if(p&&m.missingRequiredHeadings(p.body).length) {bad++; console.log(f);} }
   console.log("specs missing required headings:", bad);})'
   ```
4. `! rg -n 'TODO\(handoff\)' scripts/spec-index.mjs` → exit 0 (no match; `rg -n` alone would exit 1
   on no-match, so read the negated, unpiped exit code directly — never `grep -c`'s stdout, which
   prints `0` but still exits 1 on no match). There is no variant of this expectation: §5B's landing
   rule leaves no fourth marker behind.
5. `node -e '…'` over `specs/*.md`: every `status: superseded` spec is named by some spec's
   `supersedes`, and every `pass > 1` spec has a `specs/<id>.review.md` that **parses**, whose
   `spec:` equals the spec id, whose `pass` equals the spec's `pass`, and whose `verdict` equals the
   spec's `verdict` → 0 exceptions.
6. `node scripts/proposal-index.mjs && git diff --exit-code proposals/index.json` → exit 0, and the
   entry for `2026-08-18-spec-heading-lint-baseline-backfill` reads `"status": "done"`. This is a
   manual step by necessity: no CI gate covers `proposals/index.json` staleness (§2.5, §10).
7. Negative controls, each of which must make `--check` exit **1** (run on a scratch branch, then
   discard): (a) add `related: [does-not-exist]` to any spec; (b) create a spec with `pass: 2` and no
   sidecar; (c) take any `pass > 1` spec and lower its sidecar's `pass` by one; (d) re-create
   `scripts/spec-heading-lint-baseline.json` with any id; (e) delete an out-of-scope section from any
   spec.
8. `pnpm run test:scripts` and `pnpm run ci` → both green.
9. Board check: fetch `specs/index.json` and `proposals/index.json` from `dev` and confirm the
   base.minion-ai.org board renders the same card count as before the sweep, with no spec's
   `stage`/`status` changed by S5–S17 and the source proposal shown as `done`.

## 10. Out of scope

- **Fixing the minion-factory spec generator**, in either of its two forms and in both cases in
  another repo: the `## 0. Problem` → `## 0. Product` / acceptance → verification heading fix, owned
  and already closed by `2026-08-20-factory-spec-heading-nomenclature` DELTA 2; and teaching the
  generator the two rules S2/S3 add, owned by the active
  `2026-08-29-factory-generator-related-ids-and-review-sidecars`. This spec writes the alert into
  that proposal (§8); it does not touch minion-factory.
- **A `pass > 1 ⇒ revises|supersedes` presence rule** — explicitly rejected in §5B; the pair case
  stays with the G0 reconciler under `2026-08-17-sdlc-phase-gates-scoring-spec`.
- **G0 reconciler changes of any kind**, including having it *write* `revises`/`supersedes` onto the
  68 in-place re-passed specs (as measured 2026-08-29). §2.6 shows there is nothing to write.
- **Proposal-side link integrity** (`spawned_spec`, `merged_into`, `duplicate_candidate`) and giving
  `scripts/proposal-index.mjs` a `--check` mode + a CI step. All 3 field types resolve cleanly today
  (measured: 0 unresolvable), so this is a regression guard, not a debt — file it separately if
  wanted. `scripts/corpus.mjs` from S2 is the loader it would reuse. Note the cost of leaving it
  out: S18 closes the source proposal by running `proposal-index.mjs` by hand, and nothing in CI
  would catch it if a future editor forgot — which is why S18's DoD asserts the generated `done`
  entry explicitly rather than trusting `pnpm run ci`.
- **Rewriting or re-scoping any spec's content.** Backfill adds the missing sections and normalizes
  headings; it does not modernize stale specs, adjudicate whether an `unknown`-status spec is still
  live, or change any lifecycle field (I4). Two explicit exceptions: S4 may change only the five
  orphan specs from `superseded` to `retired` when evidence shows there is no successor; and S3 may
  repair the frontmatter of the one stale `*.review.md` sidecar named in §2.6b, which is a review
  record, not a spec. Reconstructing review *findings* that were never committed is out of scope and
  forbidden — S3 corrects the roll-up and names the gap instead.
- **New lint rules beyond the three named** (e.g. AS-IS→TO-BE→DELTA as a lint, required frontmatter
  `type`, per-slice DoD checks). TEMPLATE.md keeps AS-IS→TO-BE→DELTA a review expectation.
- **Any change to `REQUIRED_HEADINGS`, `stripNonDocumentMarkdown`, or the per-slice topics lint**
  (I2), and any change to `specs/topics.json`'s `grandfatheredSpecIds`.
- **Migrating specs to XML/another format** — parked by `2026-08-17-maintenance-lane-monitors-spec`.
