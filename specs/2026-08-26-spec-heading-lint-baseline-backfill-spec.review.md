---
spec: 2026-08-26-spec-heading-lint-baseline-backfill-spec
pass: 4
verdict: changes_requested
reviewer: factory-review
created: 2026-08-26
updated: 2026-08-30
score_slice_size: 8
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
---

# Review record

This sidecar is the running review record for the spec. The frontmatter above is the
roll-up for the spec's **current** pass; each pass keeps its own section below, newest last.

## Pass 2 — `changes_requested`

Reviewer: `factory-review`. Date: 2026-08-26.

### Changes made

- Set the reviewed spec to `pass: 2` and `verdict: changes_requested` because the five heading
  batches do not credibly fit the stated 4–8-hour convention.
- Replaced the 22–26-file batching plan in §5C with thirteen frozen contiguous ranges of at most ten
  specs, preserving all 126 ids and the sequential execution constraint.
- Added an explicit readiness blocker above the slice definitions so the unchanged S5–S9 text
  cannot be mistaken for an implementable plan while its DELTA rows, slice numbering, ordering,
  and baseline-count DoDs still describe the oversized five-batch layout.
- Clarified that sequential batches contend on the shared heading-baseline file as well as possibly
  `specs/index.json`; disjoint spec bodies alone do not make them safe to run concurrently.
- Added the factory-nomenclature proposal to S2 and S3 files/DoDs because §8 already requires those
  proposal alerts, but the slice contracts previously omitted the write.
- Made a partially completed heading range explicitly fail its DoD; the earlier text simultaneously
  required zero range ids remaining and allowed unresolved ids in the PR body.
- Identified S4 as the sole lifecycle-field exception in Out of scope, resolving the contradiction
  between the blanket lifecycle prohibition and S4's required `superseded` → `retired` disposition.

### Human/author action required

The author must replace D6–D10 and S5–S9 with thirteen transitions/slices matching this exact split,
then renumber the cleanup slice and update §7/§9 references and cumulative baseline counts:

| Batch | Count | First id | Last id (inclusive) |
|---|---:|---|---|
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

The split is required because each file needs content-preserving judgment, active specs need real
scope and verification language, the corpus median is 15 KB, and S5–S9 currently assign 22–26 files
to one 4–8-hour run. This also follows the slice-scoped-run constraint recorded in
`/memory/MINION/sdlc-board-triage-and-phase-gates.md:133` and avoids the meta push races recorded in
`/memory/MINION/minion-factory-agent-pipeline.md`. The spec-index fixture guidance remains consistent
with `/memory/MINION/factory/2026-08-19-d9da93ee.md`: malformed `--check` fixtures must commit a stale
index instead of invoking the validating generator first.

No product-scope decision is requested. Approval is blocked only until the mechanical slice rewrite
is completed and the resulting cumulative DoDs are internally consistent.

## Pass 3 — `approved`

Reviewer: `factory-review` (cross-provider, high effort, two rounds on PR #285). Date: 2026-08-29.
Disposition recorded by the authoring run `0a450055` after every finding of both rounds was fixed
and re-verified on the branch.

### What the pass-3 review found, and what was done

Round 1 — `H1`, `M1`, `M2`, `L1`; the round-2 re-review confirmed all four resolved:

- `H1` the approved disposition was not published to `specs/index.json` → index regenerated with
  `node scripts/spec-index.mjs` and committed; `--check` exits 0 unpiped.
- `M1` cleanup was still a second `Slice 10` while D19/§6 called it `S18` → cleanup renumbered to
  Slice 18, reporter contract widened to `B1..B13`, §7 ordering restated as `S5→S17` then `S18`,
  §9 end-to-end moved to "after S18", board invariant widened to `S5–S17`.
- `M2` binding DoDs hard-coded the obsolete 126/84/62 corpus → every binding DoD is now a computed
  invariant; the dated 2026-08-29 magnitudes remain only as labelled non-binding orientation.
- `L1` `grep -c 'TODO(handoff)'` exits 1 on the desired zero-match state → replaced everywhere with
  the negated unpiped `! rg -n 'TODO\(handoff\)' …`.

Round 2 — `M1`, `M2`, both fixed in this pass without reopening pass 3:

- `M1` the proposed §5B sidecar rule was existence-only, so it would accept stale review evidence,
  and **this sidecar was the live counterexample** (spec at `pass: 3`/`approved`, sidecar still at
  `pass: 2`/`changes_requested`). Fixed two ways. (a) This file is repaired: the frontmatter is now
  the current-pass roll-up and each pass keeps its own section, which is the shape the rule will
  check. (b) §5B is split into a **structural** contract (B1 — parses, `spec` matches, required
  fields present, `pass ≤` the spec's pass) measured at 0/69 violations, and a **freshness**
  contract (B2 — `pass ==` and verdict agreement) measured at 2 violations before this repair and 1
  after. S3 now must repair that last one before B2 may land, so I3 still holds on the day the rule
  ships, and S3 states the explicit fallback (ship B1, defer B2) if it cannot. *(That fallback was
  withdrawn in round 4 below — the split into B1/B2 as separately named errors survives, the
  separate landing does not.)*
- `M2` Slice 18 flipped the source proposal to `status: done` in Markdown only, leaving the board
  projection at `in-spec` forever because `proposal-index.mjs` has no `--check` and is not in CI →
  S18 now lists `proposals/index.json` in its files, requires the `updated:` bump with the
  transition, and its DoD asserts the generated entry reads `done` in the same commit.

### Residual risk accepted

`2026-08-18-base-attention-queue-responsive-runs-spec` is at `pass: 5` with a `pass: 2` sidecar;
passes 3–5 left no committed per-pass record. S3 owns repairing it — reconstructing the missing
records from the run evidence where it survives, otherwise correcting the roll-up and naming the
passes whose detail is unrecoverable. No new baseline file is created for it (I1, I3).

Round 3 — `M1`, `M2`, both fixed in this pass without reopening pass 3:

- `M1` the B1-only fallback was internally impossible: the escape hatch (lines 450-452, this
  revision) authorized S3 to defer B2, leave a `TODO(handoff)` pointer, and file a follow-up
  proposal, while the same slice's DoD, the TO-BE bullet, S18's DoD, and end-to-end verification #4
  unconditionally required zero B1/B2 violations and zero `TODO(handoff)` markers anywhere. Fixed by
  making every one of those sites explicitly conditional on which path S3 takes: the B1+B2 path keeps
  the original zero-violation/zero-marker requirements verbatim; the B1-only path asserts zero B1
  violations only, permits the replacement marker + its proposal to persist, and scopes
  `handoff-minion-meta-1883922325`'s closure to the three unconditionally-resolved markers in that
  case (end-to-end verification #5 already carried this conditional; #4 now matches it). *(Round 4
  below found this fix incomplete and wrong at the root, and replaced it by removing the branch.)*
- `M2` S2 and S3 both append to `proposals/2026-08-20-factory-spec-heading-nomenclature.md` (round 4
  retargeted that write to a new active proposal; the serialization below still stands) but were
  declared independent/any-order in §7, and neither slice's files/DoD required the `updated:` bump or
  `node scripts/proposal-index.mjs` regeneration that a substantive proposal edit needs (per
  `proposals/TEMPLATE.md:12-13` and the generator's own `updated` projection). Fixed by serializing
  S2 before S3 in §7 (both edit the same file; they are not safe to dispatch concurrently) and adding
  the `updated` bump + `proposals/index.json` regeneration to both slices' file lists and DoDs.

Round 4 — `M1`, `M2`, both fixed in this pass without reopening pass 3:

- `M1` round 3 made the B1-only branch conditional at six sites, but not at D19, and — the part no
  in-spec conditional could have fixed — `handoff-minion-meta-1883922325`'s own definition of done is
  a **file-level** predicate: "the sweep closes this proposal automatically once the file carries no
  more markers" (`proposals/handoff-minion-meta-1883922325.md:24-26`). A retained replacement marker
  therefore leaves that proposal open with no closing path, and the spec's claim that it "closes over
  the other three markers only" was simply false about the consumer. Rather than conditionalize a
  third time, the escape hatch is **withdrawn**: §5B gains a "Landing rule" (B1+B2 in one commit, or
  S3 blocked and merging nothing, mirroring §6's partial-ranges rule), and TO-BE, D4, S3's DoD 1/4/5,
  S18's DoD and §9 items 4/5 each carry exactly one contract again. The hatch also guarded a
  condition that cannot arise — §5B/S3 already specify an always-honest repair (correct the roll-up
  to the spec's current pass/verdict, name the passes whose detail was never committed, invent
  nothing) that needs no evidence beyond the spec's own frontmatter.
- `M2` S2 and S3 appended the two new generator failure modes to
  `proposals/2026-08-20-factory-spec-heading-nomenclature.md`, which is `status: done` (its 2026-08-28
  board audit recorded DELTA 2 addressed), and `scripts/proposal-index.mjs:59-72` projects status
  through unchanged — so the cross-repo mitigation had no active lifecycle owner and §8's "DELTA 2 is
  still open" was stale. Fixed by filing
  `proposals/2026-08-29-factory-generator-related-ids-and-review-sidecars.md` (`status: draft`,
  `repos: [minion-factory]`) with the corpus-level evidence and an explicit "the generator-side cause
  is inferred, confirm it first" caveat, regenerating `proposals/index.json`, and repointing §1, §8,
  §10, S2's and S3's files/DoD and the spec's `related` list at it. §7's S2-before-S3 serialization
  still applies — both slices still edit one shared proposal, now the new one.

Round 5 — `M1`, `M2`, `L1`, all fixed in this pass without reopening pass 3:

- `M1` (medium) the shipped B1/B2 sidecar contract from round 2 proved matching frontmatter, not a
  review record: nothing in B1/B2 or S3's fixture list required a `## Pass N` body section, so a
  sidecar with valid, current, agreeing frontmatter and an empty body satisfied every predicate.
  Fixed by adding a third clause, **Body**, to §5B: for every `2 ≤ N ≤ spec.pass` the sidecar body
  must carry a `## Pass N — <verdict>` section, or an explicit `## Pass N — record unavailable:
  <reason>` for a genuinely unrecoverable pass; an empty-body sidecar and a sidecar missing only the
  *current*-pass section both fail. Landing rule, the repair-before-enable text, the S3 DoD fixtures
  (two new negative cases + the positive updated), and the sibling factory proposal's invariant/DELTA
  3/proves-it were all updated to the same three-clause contract (B1, B2, Body) so no site still
  describes the two-clause version.
- `M2` (medium) S4 adds `supersedes:` to a successor or flips an orphan to `retired`, both
  substantive lifecycle/lineage transitions per `specs/TEMPLATE.md:30`, but never required bumping
  that spec's `updated` field — so the regenerated board index would carry the stale
  `updated: 2026-08-13` through the transition. Fixed by requiring the `updated` bump in the same
  edit on whichever spec S4 touches (successor or orphan), and adding a DoD check that diffs each
  touched file's `updated` field against its pre-slice value and confirms `specs/index.json` matches.
- `L1` (low) §7 declared S4 independent of the batches and safe to land in any order, but S4's
  permitted edits are frontmatter on the same 5 orphan specs (and their successor candidates) that
  §6 assigns to specific heading batches — as measured 2026-08-29, two orphans are in B1 (S5), two in
  B4 (S8), one in B6 (S10) — so dispatching S4 alongside one of those batches could race on the same
  spec file, not merely on a generated index. Fixed by serializing S4 before S5–S17 in §7, naming the
  three colliding batches and ids, and removing the "index files only" independence claim.

Round 6 — `M1`, `L1`, both fixed in this pass without reopening pass 3:

- `M1` (medium) round 5 required a non-empty Body suffix but did not constrain its meaning, so
  arbitrary text, a current-pass verdict contradicting the roll-up, and reasonless `record
  unavailable` would all pass the prescribed regex. Fixed by replacing the loose regex with an
  exact normalized grammar: precisely one accepted heading per required pass; suffix in `VERDICTS`
  or `record unavailable: <non-empty reason>`; and a current-pass verdict equal to the roll-up.
  S3 now requires negative controls for arbitrary, contradictory, reasonless, and duplicate cases,
  and the factory-generator proposal carries the identical invariant and proving tests.
- `L1` (low) D4 still named only B1+B2 and its fixtures omitted Body even though §5B and S3 made
  all three clauses atomic. Fixed by naming B1+B2+Body in D4 and listing the same semantic Body
  negatives and positives required by S3, leaving one binding transition and proof contract.

### Author's disposition

`approved`. Every round-1 through round-6 finding is fixed on the branch; no finding was waived. The
approval is the authoring run's operator disposition, not a reviewer sign-off on this last fix round —
if a subsequent review round raises a blocking finding, the spec returns to `status: review` /
`verdict: pending` and this section records that instead.

## Pass 4 — `changes_requested`

Reviewer: cross-provider review. Date: 2026-08-30.

The branch was reconciled with `origin/dev@90ec190`. The review found that the strict Body grammar
would force an unplanned corpus-wide migration: only 1 of 70 existing sidecars used it, while all
70 existing bodies already named their current pass and represented the roll-up verdict; two more
pass>1 specs had no sidecar. S3 now extends the base's canonical `scripts/review-sidecar.mjs`, uses
strict structured mode for new/updated records, accepts the measured legacy current-pass form for
historical evidence, and creates the two missing sidecars before enabling the gate. The duplicate
auto-triage proposal was removed after its distinct remaining writer-ownership work was preserved
in the current-base proposal.
