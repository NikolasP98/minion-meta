---
id: 2026-08-26-spec-heading-lint-baseline-backfill-spec
title: Drain the spec-gate debt — backfill 126 grandfathered spec headings, resolve 5 orphan superseded specs, resolve `related` ids, and settle the pass>1 link policy
stage: spec
status: draft
pass: 2
created: 2026-08-26
updated: 2026-08-26
repos: [minion-meta]
proposal: 2026-08-18-spec-heading-lint-baseline-backfill
verdict: changes_requested
type: infra
relationship: extends
related: [2026-08-17-maintenance-lane-monitors-spec, 2026-08-17-sdlc-phase-gates-scoring-spec, 2026-08-20-factory-spec-heading-nomenclature, handoff-minion-meta-1883922325]
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
grandfather 126 specs and 5 orphan `superseded` markers out of the very rules the gate exists to
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
  fixes the minion-factory *generator* that emits `## 0. Problem`; it names the 126 grandfathered
  specs as out of its scope and this spec's territory. Its still-open DELTA 2 is a cross-repo alert
  here (§8), not a slice.
- `handoff-minion-meta-1883922325` (proposal) — the handoff-ledger sweep's marker proposal for the
  four `TODO(handoff)` comments in `scripts/spec-index.mjs`; those are exactly the four asks below,
  so it closes automatically when the markers go (Slice 10). Its own frontmatter already carries
  `duplicate_candidate: 2026-08-18-spec-heading-lint-baseline-backfill`.

Recommendation only — no lifecycle field on any of those four artifacts is changed by this spec.

## 2. AS-IS (verified 2026-08-26 on `minion-meta@dev`, tip `83d69b6`)

`node scripts/spec-index.mjs --check` → **exit 0**, `192 specs, specs/index.json up to date`. Every
number below was measured on that tree with the gate's own exported helpers
(`missingRequiredHeadings`, `parseFrontmatter`); re-run instructions are in §9.

1. **Heading debt: 126 specs, 0 of them currently clean.** `scripts/spec-heading-lint-baseline.json`
   holds 126 `id -> sha256(body)` entries (the proposal says 127; one has since been removed). Of
   those 126 specs: 122 are missing `## 0. Product`, 91 are missing an out-of-scope section, 92 are
   missing a verification section. Distribution of missing sections per spec: 75 specs miss all
   three, 29 miss two, 22 miss one. **No baselined id currently passes the lint**, so there is no
   free removal available today — every removal costs an edit. Corpus shape: 62 are terminal
   (`shipped`/`superseded`/`rejected`/`retired`/`done` or `stage: done`), 64 are still active
   (48 of them `status: unknown` from the 2026-08-13 retrofit); created 2026-04 (2), 2026-05 (23),
   2026-06 (14), 2026-07 (58), 2026-08 (27), plus 2 undated ids. Total 2.32 MB of markdown, median
   spec 15 KB.
2. **The exemption is by content hash, not id** (`scripts/spec-index.mjs:671`): a baselined spec
   stays exempt only while `sha256(body)` matches. Editing a baselined spec silently drops the
   exemption and applies the heading lint. Consequence for this work: a batch that backfills
   headings *and forgets to delete the id* still passes CI — the stale entry is inert, invisible,
   and the baseline never visibly shrinks. Nothing detects that today.
3. **Both baseline files are one-way ratchets** (`checkHeadingBaselineRatchet` /
   `checkSupersedeBaselineRatchet`, wired at `scripts/spec-index.mjs:759-761`): a PR may delete
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
   `scripts/spec-index.mjs:662`). Measured: 84 `related` ids across 31 specs; **0 are unresolvable**;
   67 resolve against the spec corpus and **17 resolve only against `proposals/`**. So the rule can
   land today with zero backlog and zero new baseline — but a spec-corpus-only implementation would
   red 17 legitimate references. `scripts/proposal-index.mjs` has no `--check` mode (it always
   writes) and is not run by CI, so it cannot host the rule.
6. **The `pass > 1` TODO misstates the corpus** (`scripts/spec-index.mjs:691`, "51 specs violate
   that today"). Measured: 62 specs have `pass > 1` (61 at pass 2, 1 at pass 5) and 61 carry neither
   `revises` nor `supersedes`. But there are **zero pass-1/pass-2 file pairs**: no two specs share a
   title, and the only same-slug groups (`…-design`/`…-plan`) are all pass 1. The factory's 2-pass
   review bumps `pass` **in place on the same file**, so `revises` has no target to point at — those
   61 specs are not violating anything. Meanwhile **62 of 62 pass>1 specs have a
   `specs/<id>.review.md` sidecar, and 0 of 130 pass-1 specs do**: the corpus already satisfies an
   exact traceability invariant that the proposed presence rule does not express.
7. **The gate's own fixtures encode the current permissiveness.** `scripts/spec-index.test.mjs:640`
   and `:649` both write `related: [some-other-spec]` — a deliberately dangling id — and assert
   exit 0. `makeCliFixture` (`:363`) creates only `scripts/` and `specs/` in its temp repo: there is
   no `proposals/` directory.
8. **Body edits do not disturb `specs/index.json`.** The index projects frontmatter only, so
   heading-only edits leave it byte-identical; changing `updated:` does not (the board sorts by it).
   Recorded from a prior factory run: "`specs/index.json` does not hash bodies, so heading edits
   leave it untouched" (`/memory/MINION/factory/2026-08-20-b9b4a8a9.md`).
9. `specs/TEMPLATE.md`'s status column omits `retired` and `done`, both of which
   `scripts/spec-frontmatter.mjs:5-20` accepts and the corpus uses (4 retired, 3 done among the
   baselined specs alone). `retired` additionally requires `retired_reason` ≥ 20 chars
   (`scripts/spec-index.mjs:624`).

## 3. TO-BE

Target observable behavior:

- `scripts/spec-heading-lint-baseline.json` and `scripts/spec-supersede-baseline.json` are **gone**
  (both drained to zero and deleted), and `node scripts/spec-index.mjs --check` exits 0 with every
  spec in the corpus satisfying the three required headings on its own merits.
- `--check` additionally enforces, on top of today's rules: (a) no baseline entry may be stale — an
  id whose spec now passes the lint, or whose spec no longer exists, is an error naming the removal;
  (b) every `related` id resolves against the **union** of the spec and proposal corpora; (c)
  `pass > 1` requires a `specs/<id>.review.md` review sidecar.
- All four `TODO(handoff)` markers in `scripts/spec-index.mjs` are gone, which auto-closes
  `handoff-minion-meta-1883922325`.
- The `pass>1`/`revises` question is **decided and written down**: no blanket presence rule; the
  pair-detection case stays with the G0 reconciler per `2026-08-17-sdlc-phase-gates-scoring-spec`.

Invariants that must not change:

- **I1 — the ratchet stays a ratchet.** No slice may add an id to either baseline file or rewrite a
  hash. If a batch cannot fix a spec, it leaves that id alone; it never re-grandfathers.
- **I2 — no lint rule is weakened.** `REQUIRED_HEADINGS` (`scripts/spec-index.mjs:161-171`),
  `stripNonDocumentMarkdown`, the slice-`**Topics:**` lint, and the bidirectional supersedes rules
  keep their current semantics. Debt is fixed by editing specs, never by relaxing the gate.
- **I3 — every new rule is green on the corpus the day it lands.** Each of the three new rules was
  measured at 0 violations (§2.1, §2.5, §2.6). A rule that would need its own baseline is not
  shipped; it is deferred and said so out loud.
- **I4 — content is preserved.** Backfill adds sections and, where a section exists under a
  different name, renames/moves it. No slice deletes spec content, changes a DoD, or edits
  `stage`/`status`/`repos`/`pass` on a spec it is only backfilling headings for.
- **I5 — the board stays legible.** `updated:` is bumped only when the added section changes what an
  implementer would do (see §6 rule R3), so a 126-spec sweep does not reshuffle the whole board.
- **I6 — `specs/index.json` is regenerated in the same commit as any frontmatter change.** The
  staleness check (`scripts/spec-index.mjs:770`) already enforces this; slices must not fight it.
- **I7 — no index file is hand-edited.** `specs/index.json` and `proposals/index.json` change only
  via `node scripts/spec-index.mjs` / `node scripts/proposal-index.mjs`.

## 4. DELTA — numbered transitions

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| D1 | Baseline entries can go stale unnoticed → `--check` errors on any baseline id that passes the lint or names a missing spec (both files) | S1 | New fixtures in `scripts/spec-index.test.mjs`: a baselined-but-clean spec fails; a baseline id with no file fails; the real corpus still exits 0 |
| D2 | No way to see what the 126 specs are missing → `node scripts/spec-heading-backfill.mjs --report` prints per-id missing sections + totals; `--verify` is the same check as D1 usable pre-commit | S1 | `--report` on the corpus prints 126 rows and the totals 122/91/92; `--verify` exits 0 today and 1 on a seeded stale entry |
| D3 | `related` ids unresolved → every `related` id must resolve against specs ∪ proposals, via one shared loader | S2 | Fixtures: dangling id fails; proposal-only id passes; missing `proposals/` dir does not crash; corpus (84 ids, 17 proposal-only) exits 0 |
| D4 | `pass>1` policy undecided and TODO misstates the corpus → decision recorded, TODO replaced, `pass>1 ⇒ review sidecar exists` enforced | S3 | Fixtures: `pass: 2` with no sidecar fails, with sidecar passes, `pass: 1` unaffected; corpus (62/62) exits 0 |
| D5 | 5 orphan `superseded` specs → each linked from a real successor or flipped to `retired` + `retired_reason`; `scripts/spec-supersede-baseline.json` deleted | S4 | `--check` exits 0 with the file absent; `specs/index.json` regenerated; each disposition justified in the PR body |
| D6 | Heading baseline 126 → 100 (batch B1) | S5 | `--check` exits 0; `--verify` exits 0; no B1 id remains in the baseline |
| D7 | 100 → 74 (B2) | S6 | same |
| D8 | 74 → 48 (B3) | S7 | same |
| D9 | 48 → 22 (B4) | S8 | same |
| D10 | 22 → 0 (B5) | S9 | same, and the file contains `{}` |
| D11 | Empty baselines + 4 stale `TODO(handoff)` markers + stale TEMPLATE docs → files deleted, markers removed, `specs/TEMPLATE.md` corrected, proposal closed | S10 | `--check` exits 0 with neither baseline file present; `grep -c 'TODO(handoff)' scripts/spec-index.mjs` = 0; `pnpm run test:scripts` green |

Every slice below traces to at least one row; no row lacks a proving test.

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
review bumps `pass` in place, so 61 of 62 specs have no second file to link to, and there are zero
pass-1/pass-2 file pairs in the corpus. A blanket presence rule would demand a link that cannot
exist and would be a permanent 61-file red. The genuine pair case — two files, two passes, no link —
is already assigned to the G0 reconciler by `2026-08-17-sdlc-phase-gates-scoring-spec`, and it needs
semantic pair detection (title/slug similarity), which is a heuristic that does not belong in a
required CI gate. What *is* exact and already true of 62/62 specs is: a pass bump is evidence of a
completed review, and a completed review leaves `specs/<id>.review.md`. Ship that rule instead; it
enforces the traceability the ask actually wanted, with zero backlog and no heuristic. Only the
forward direction is enforced (`pass>1 ⇒ sidecar`); the converse is left open so a first-pass review
sidecar is not made illegal.

**C. Batching → contiguous id ranges, one PR each, sequential.**
Boundaries are frozen at the sorted 126-id baseline as of `83b...`/this spec's date, expressed as
**id ranges** (not indices) so they stay stable as the baseline shrinks:

| Batch | Count | First id | Last id (inclusive) |
|---|---|---|---|
| B1 | 10 | `2026-04-19-minion-meta-repo-design` | `2026-05-22-document-ingestion` |
| B2 | 10 | `2026-05-22-gateway-turn-recovery` | `2026-05-26-auth-token-simplification` |
| B3 | 10 | `2026-05-27-gateway-dx-simplification` | `2026-06-13-plugin-sdk-recon-and-improvement-report` |
| B4 | 10 | `2026-06-14-plugin-ui-cdn-caching-design` | `2026-07-02-hub-erp-agent-native-audit` |
| B5 | 10 | `2026-07-04-meta-business-integration` | `2026-07-06-hub-tanstack-pacer` |
| B6 | 10 | `2026-07-06-hub-tanstack-query` | `2026-07-10-per-org-volume-tenancy` |
| B7 | 10 | `2026-07-11-fleet-update-orchestration` | `2026-07-13-hub-ui-coherence-audit` |
| B8 | 10 | `2026-07-13-hub-ui-coherence-execution-log` | `2026-07-17-hub-performance-optimization-plan` |
| B9 | 10 | `2026-07-17-ig-ad-attribution-spec` | `2026-07-20-whatsapp-sync-status-spec` |
| B10 | 10 | `2026-07-21-unified-brains-knowledge-architecture` | `2026-08-03-crm-relationship-graph-v2-port-spec` |
| B11 | 10 | `2026-08-07-projects-github-repos-and-factory-gates-spec` | `2026-08-18-base-kanban-possibly-shipped-surface-spec` |
| B12 | 10 | `2026-08-18-base-phase-aware-sorting-provenance` | `2026-08-18-factory-workitem-handoff-schema-spec` |
| B13 | 6 | `2026-08-18-minion-base-mobile-hitl-ux-plan` | `ws-duplication-audit` |

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

- *Terminal specs* (62: `shipped`/`superseded`/`rejected`/`retired`/`done`, or `stage: done`) — a
  historical record does not acquire new scope. `## 0. Product` states, in one or two sentences,
  what the document was for; out-of-scope and verification may be honest stubs
  (`**Out of scope:** historical record — this spec is closed; scope changes belong in a new spec.` /
  `**Verification:** none — shipped and closed on <date>; see <evidence/PR> if known.`). Do not
  invent a verification procedure for work that already shipped.
- *Active specs* (64) — the sections must be real. If the document says nowhere what is out of scope
  or how to verify it, the backfiller writes what the document's own content implies and says so in
  the PR body; it does not guess at product intent. A spec whose active scope genuinely cannot be
  determined is left in the baseline and reported in the PR body as unresolved (I1 permits this —
  the ratchet only forbids growth).
- Where a section exists under a non-matching name (`## 0. Problem`, `## 9. End-to-end acceptance`),
  **rename or move it** rather than adding a duplicate — the three shapes and the section-renumbering
  hazard are already documented in `2026-08-20-factory-spec-heading-nomenclature` DELTA 1; check
  `§n` cross-references before renumbering.

## 6. Slices

Each slice is one PR against `dev`, sized for a junior dev at 4–8 focused hours. **Pass-2 blocker:**
the implementation section still defines only five 22–26-spec batch slices (S5–S9), despite the
corrected 10-spec maximum in §5C. Those slices are not implementation-ready until the author replaces
S5–S9 and D6–D10 with B1–B13 slices/transitions and updates ordering and baseline-count DoDs. The
required split is exactly the corrected table in §5C; no product-scope decision is needed.

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
reporter: `--report` prints `<id>\t<missing labels>` plus totals; `--report --batch B1..B5` filters
to a frozen range; `--verify` runs the same predicate as (a)/(b) and exits non-zero, for use before
committing a batch.

**DoD (machine-checkable):** `node scripts/spec-index.mjs --check` exits 0 unpiped (capture `$?`
directly — a piped gate returns the pipe's exit code, `/memory/MINION/MEMORY.md` FEEDBACK
"piped gates lie"); `pnpm run test:scripts` green with ≥ 4 new fixtures, each of which fails if its
control is reverted; `node scripts/spec-heading-backfill.mjs --report` prints 126 rows and the
totals `product=122 out-of-scope=91 verification=92`; `--verify` exits 0.

### Slice 2 — `related` ids resolve across the spec ∪ proposal corpora

**Topics:** `infra`, `hygiene`, `test`

**Files:** new `scripts/corpus.mjs`; `scripts/spec-index.mjs` (replace the TODO at :662 with the
rule); `scripts/spec-index.test.mjs` (fix the two fixtures at :640 and :649 that currently assert a
dangling `related` id passes; add new ones); `specs/TEMPLATE.md` (`related` row: "every id must
resolve to an existing spec or proposal");
`proposals/2026-08-20-factory-spec-heading-nomenclature.md` (append the generator failure-mode
alert required by §8; no lifecycle change).

The loader tolerates a missing `proposals/` directory (returns an empty set) so the CLI fixtures at
`scripts/spec-index.test.mjs:363` keep working without a proposals tree. Resolution runs **only**
under `--check`; the plain generator path stays permissive so `spec-index.mjs` can still regenerate
an index for a corpus mid-edit.

**DoD:** `--check` exits 0 on the corpus (84 related ids, 17 of them proposal-only); fixtures prove
(i) a dangling id fails naming spec + id, (ii) a proposal-only id passes, (iii) a fixture repo with
no `proposals/` dir passes, (iv) `node scripts/spec-index.mjs` (no `--check`) still succeeds with a
dangling id; `grep -n 'TODO(handoff)' scripts/spec-index.mjs` no longer matches the `related` marker;
the nomenclature proposal names invented `related` ids as a generator failure mode.

### Slice 3 — Settle the pass>1 policy; enforce review-sidecar traceability

**Topics:** `infra`, `hygiene`, `docs`, `test`

**Files:** `scripts/spec-index.mjs` (replace the TODO at :691 with the decision + the sidecar rule);
`scripts/spec-index.test.mjs`; `specs/TEMPLATE.md` (`pass` and `revises` rows: `pass` is bumped in
place by a re-pass and requires a review sidecar; `revises` is only for the rare *new-file* re-pass);
`proposals/2026-08-20-factory-spec-heading-nomenclature.md` (append the missing-sidecar generator
failure-mode alert required by §8; no lifecycle change).

Implements decision B of §5: no presence rule; `pass > 1` requires `specs/<id>.review.md` to exist.
The comment must state the measured facts (62 pass>1, 61 without a link, 0 file pairs, 62/62
sidecars) so the next reader does not re-litigate from the old "51 violate" framing, and must hand
the pair-detection case to `2026-08-17-sdlc-phase-gates-scoring-spec`'s G0 reconciler by name.

**DoD:** `--check` exits 0 on the corpus; fixtures prove `pass: 2` without a sidecar fails, with one
passes, and `pass: 1` without one passes; no `TODO(handoff)` remains at the pass/revises site; the
nomenclature proposal names a missing pass-2 review sidecar as a generator failure mode.

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

### Slice 5 — Heading backfill batch B1 (26 specs, `2026-04-19-minion-meta-repo-design` … `2026-06-11-gog-nuke-execution-plan`)

**Topics:** `docs`, `hygiene`

**Files:** the 26 `specs/*.md` in the B1 range (list reproduced by the §5C command);
`scripts/spec-heading-lint-baseline.json` (26 entries deleted); `specs/index.json` only if some spec
in the batch legitimately bumps `updated:` per rule R3.

**Rule R3 (applies to S5–S9):** bump `updated:` only when the added section changes what an
implementer would do — i.e. essentially never for terminal specs, sometimes for active ones. If any
`updated:` is bumped, regenerate `specs/index.json` in the same commit (the staleness check at
`scripts/spec-index.mjs:770` will catch the omission anyway).

**DoD:** `node scripts/spec-index.mjs --check` exits 0; `node scripts/spec-heading-backfill.mjs
--verify` exits 0; `--report` shows the baseline at 100 entries and zero B1 ids remaining; the diff
touches no `stage`/`status`/`repos`/`pass` field (I4). If any batch id cannot be fixed without
guessing product intent, the slice is blocked and must not claim this DoD or merge a partial range;
the PR body names the id and reason.

### Slice 6 — Heading backfill batch B2 (26 specs, `2026-06-11-google-oauth-verification-packet` … `2026-07-07-hub-db-migration-pipeline`)

**Topics:** `docs`, `hygiene`

**Files:** the 26 B2 specs; `scripts/spec-heading-lint-baseline.json`; `specs/index.json` per R3.

**DoD:** as S5, with the baseline at 74 entries and zero B2 ids remaining.

### Slice 7 — Heading backfill batch B3 (26 specs, `2026-07-08-package-updates-tracking` … `2026-07-17-crm-conversation-intelligence-spec`)

**Topics:** `docs`, `hygiene`

**Files:** the 26 B3 specs; `scripts/spec-heading-lint-baseline.json`; `specs/index.json` per R3.

**DoD:** as S5, with the baseline at 48 entries and zero B3 ids remaining.

### Slice 8 — Heading backfill batch B4 (26 specs, `2026-07-17-dashboard-kpi-popover-2step-spec` … `2026-08-12-minion-factory-agent-pipeline-spec`)

**Topics:** `docs`, `hygiene`

**Files:** the 26 B4 specs; `scripts/spec-heading-lint-baseline.json`; `specs/index.json` per R3.

**DoD:** as S5, with the baseline at 22 entries and zero B4 ids remaining.

### Slice 9 — Heading backfill batch B5 (22 specs, `2026-08-13-minion-factory-staged-harness-spec` … `ws-duplication-audit`)

**Topics:** `docs`, `hygiene`

**Files:** the 22 B5 specs; `scripts/spec-heading-lint-baseline.json` (left containing `{}`);
`specs/index.json` per R3.

**DoD:** as S5, with the baseline file containing exactly `{}` and `--report` printing 0 rows.

### Slice 10 — Retire the baselines, close the markers, correct the template

**Topics:** `infra`, `docs`, `todo`, `handoff-sweep`

**Files:** `scripts/spec-heading-lint-baseline.json` (deleted); `scripts/spec-index.mjs` (remove the
last `TODO(handoff)` markers and rewrite the header comment's grandfathering paragraphs into the
past tense, keeping the ratchet code and its tests intact); `scripts/spec-index.test.mjs` (a fixture
proving the gate still works with **no** baseline file present, and that re-adding one with a new id
still fails the ratchet); `specs/TEMPLATE.md` (add `retired` and `done` to the status list; note
`retired_reason`; update the grandfathering sentence); `scripts/spec-heading-backfill.mjs` (keep
`--verify` as a no-op-safe pre-commit check, or delete it — say which in the PR);
`proposals/2026-08-18-spec-heading-lint-baseline-backfill.md` (frontmatter `status: done`).

The ratchet code stays: with both files absent, an attempt to re-create either with a new id is
still an error, which is exactly the regression guard this whole effort earns.

**DoD:** neither baseline file exists; `node scripts/spec-index.mjs --check` exits 0;
`grep -c 'TODO(handoff)' scripts/spec-index.mjs` returns 0 (which lets the handoff sweep close
`handoff-minion-meta-1883922325` on its own); `pnpm run test:scripts` green; `pnpm run ci` green.

## 7. Ordering and concurrency

S1 must land before S5–S9 (it is what makes "removed from the baseline" enforceable). S2, S3 and S4
are independent of each other and of the batches and may land in any order. S5→S9 land sequentially;
S10 is last. Batches are the only slices that touch many files, and they touch disjoint file sets,
so a late-arriving S2/S3/S4 never conflicts with a batch except on `specs/index.json` — resolve by
merging `dev` in and re-running the generator, never by hand-editing the index (I7).

## 8. Cross-repo impact

`repos: [minion-meta]`. Nothing here changes a published package, a runtime path, or a schema.

- **minion-base (board) — mitigated.** `specs/index.json` is the board's only source. Rule R3 keeps
  `updated:` bumps rare, so the sweep does not reshuffle the board; the batches that do bump some
  cards cap the churn at one batch's worth. No projection field changes, so no board code change is
  needed.
- **minion-factory (spec generator) — unavoidable, ALERT.** Two of the new rules add ways for a
  *factory-generated* spec to red meta CI: an invented `related` id (S2) and a `pass: 2` spec whose
  review sidecar was not committed (S3). Both are correct failures — the alternative is unverifiable
  links on the board — but the generator prompt should be told about them, and it already needs the
  `## 0. Product` fix that `2026-08-20-factory-spec-heading-nomenclature` DELTA 2 owns and that is
  still open. **Mitigation:** S2 and S3 error text must name the file, the offending value, and the
  fix; and the implementer appends a note to that proposal (a proposal edit, not a spec change)
  recording the two new failure modes so the generator fix covers them in one pass. Do not fix the
  generator from this spec — it is another repo and another proposal's DELTA.
- **The factory dev lane itself — mitigated.** Batch slices are large-file-count but mechanical;
  they must be run slice-scoped (one batch per run/branch), per
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` ★ "slice-scoped dev runs mandatory
  (monolith = 101-turn burn)". A run that tries to do two batches at once should be stopped.
- **minion / minion_hub / minion_site / paperclip / pixel-agents — none.** No file outside
  `scripts/`, `specs/`, `proposals/` and `package.json` is touched.

## 9. End-to-end verification

Run from the repo root on a fresh clone of `dev` **after S10 has merged** (each command's exit code
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
4. `grep -c 'TODO(handoff)' scripts/spec-index.mjs` → `0`.
5. `node -e '…'` over `specs/*.md`: every `status: superseded` spec is named by some spec's
   `supersedes`, and every `pass > 1` spec has a `specs/<id>.review.md` → 0 exceptions.
6. Negative controls, each of which must make `--check` exit **1** (run on a scratch branch, then
   discard): (a) add `related: [does-not-exist]` to any spec; (b) create a spec with `pass: 2` and no
   sidecar; (c) re-create `scripts/spec-heading-lint-baseline.json` with any id; (d) delete an
   out-of-scope section from any spec.
7. `pnpm run test:scripts` and `pnpm run ci` → both green.
8. Board check: fetch `specs/index.json` from `dev` and confirm the base.minion-ai.org board renders
   the same card count as before the sweep, with no spec's `stage`/`status` changed by S5–S9.

## 10. Out of scope

- **Fixing the minion-factory spec generator** (`## 0. Problem` → `## 0. Product`, acceptance →
  verification) — owned by `2026-08-20-factory-spec-heading-nomenclature` DELTA 2, in another repo.
- **A `pass > 1 ⇒ revises|supersedes` presence rule** — explicitly rejected in §5B; the pair case
  stays with the G0 reconciler under `2026-08-17-sdlc-phase-gates-scoring-spec`.
- **G0 reconciler changes of any kind**, including having it *write* `revises`/`supersedes` onto the
  61 in-place re-passed specs. §2.6 shows there is nothing to write.
- **Proposal-side link integrity** (`spawned_spec`, `merged_into`, `duplicate_candidate`) and giving
  `scripts/proposal-index.mjs` a `--check` mode + a CI step. All 3 field types resolve cleanly today
  (measured: 0 unresolvable), so this is a regression guard, not a debt — file it separately if
  wanted. `scripts/corpus.mjs` from S2 is the loader it would reuse.
- **Rewriting or re-scoping any spec's content.** Backfill adds the missing sections and normalizes
  headings; it does not modernize stale specs, adjudicate whether an `unknown`-status spec is still
  live, or change any lifecycle field (I4). S4 is the explicit exception: it may change only the
  five orphan specs from `superseded` to `retired` when evidence shows there is no successor.
- **New lint rules beyond the three named** (e.g. AS-IS→TO-BE→DELTA as a lint, required frontmatter
  `type`, per-slice DoD checks). TEMPLATE.md keeps AS-IS→TO-BE→DELTA a review expectation.
- **Any change to `REQUIRED_HEADINGS`, `stripNonDocumentMarkdown`, or the per-slice topics lint**
  (I2), and any change to `specs/topics.json`'s `grandfatheredSpecIds`.
- **Migrating specs to XML/another format** — parked by `2026-08-17-maintenance-lane-monitors-spec`.
