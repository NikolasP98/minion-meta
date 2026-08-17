---
spec: 2026-08-17-hub-updatesellable-silent-drop-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review — updateSellable silent-drop fix

Cross-checked against `AGENTS.md`, the source proposal `proposals/2026-08-17-hub-updatesellable-silent-drop.md`,
`specs/2026-07-19-pos-stock-split-implementation-spec.md` (design ancestor for `kind` derivation,
`itemId`/`item_taken`), `specs/2026-07-19-item-spine-composition-slice1-spec.md`,
`specs/2026-07-25-faces-catalog-cleanup-report.md`, `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md`
(§4b tag/gate conventions), and `specs/2026-08-13-crm-customers-server-pagination-spec.md` (branch
discrepancy claim). `minion_hub` is not checked out in this checkout either, so line numbers and
symbol names were checked only for internal consistency and against the referenced specs — Slice 0
remains the source of truth for the live checkout, as the spec itself already says. Scope:
correctness and consistency only.

## Changes made

1. **Frontmatter** — `pass: 1 → 2`, `verdict: pending → approved`. `updated` was already
   `2026-08-17`; left as-is. `status: draft` left as-is (matches the precedent in
   `2026-08-13-ci-minion-site-ci-spec.md`, which carries `status: draft` at `pass: 2, verdict:
   approved` — status and verdict are independent fields in this corpus).

2. **S1 "Do" — `TODO(handoff)` placement (real bug).** The spec instructed placing a
   `TODO(handoff):` at *all three* refusal sites (`kind`, `trackStock`, `uom`), "removed by those
   slices." But `kind` is derived by design (assumption 1, corroborated by
   `2026-07-19-pos-stock-split-implementation-spec.md` line 27) and is **never** a directly
   settable field in S2 or S3 either — refusing a direct `kind` write is the permanent correct
   behavior, not deferred work. No slice was ever going to remove that marker, which would leave a
   stale `TODO(handoff)` forever and contradicts AGENTS.md's own definition of the tag ("unwired
   implementation, known bug… missing edge-case handling" — not "intentional permanent design").
   It also contradicts S3's own DoD gate (`rg -n 'TODO\(handoff\)' … # only for genuinely deferred
   work`), which implies zero markers should remain once policy is final. Fixed: `TODO(handoff)`
   now applies only to the `trackStock`/`uom` sites; `kind_derived` gets a plain explanatory
   comment instead.

3. **Slice 0 recon script — shell glob bug (real bug).**
   `rg -n 'PosError|catch' src/routes/api/**/sellables/**` relies on bash's `**` globstar, which is
   off by default; without `shopt -s globstar` the shell passes the literal string through and `rg`
   errors on a nonexistent path, silently producing no recon signal instead of the intended search.
   Fixed to use ripgrep's own `-g` glob flag (`rg -n 'PosError|catch' src/routes/api -g
   '**/sellables/**'`), which supports `**` natively regardless of shell settings, with a one-line
   note explaining why.

4. **§2 intro — DoD-satisfaction overclaim (real contradiction).** The text claimed "S1 alone
   already satisfies the proposal's minimum DoD," quoting only the "or a changed value returns 400"
   half of the proposal's compound DoD sentence. The proposal's DoD also has a trailing clause —
   "test asserts a kind/uom patch is reflected in `getSellableRow()`" — which requires an *applied*
   patch, and S1 refuses every real kind/uom change by construction (that is S1's entire point). No
   test under S1 can show a kind/uom patch reflected in a read; that first becomes possible in S2
   (trackStock+uom → kind flips to product). This directly contradicts the spec's own §6 "Ship
   gate," which correctly scopes the literal "reflected in `getSellableRow()`" check to step 2, run
   "with all three slices merged." Fixed §2 to state precisely what S1 does satisfy (the
   no-silent-loss safety property) versus what only S2 satisfies (the literal DoD sentence), and
   added a note that cutting scope after S1 should record that the DoD is only partially met, not
   just that transitions are refused.

5. **S3 "Do" + DoD — anti-recurrence guard assumed runtime type introspection (unverifiable
   requirement).** The guard was specified as "the const list is compared to the type's keys" via a
   vitest assertion. `SellableInput`/`SellableUpdate` is referenced elsewhere in this spec tree only
   as a plain TypeScript type (`2026-07-19-pos-stock-split-implementation-spec.md`: "`SellableInput`
   gains `itemId?: string`"), with no zod/valibot usage found anywhere in the referenced specs for
   POS/stock inputs. TS types are erased at compile time — "compare to the type's keys" at runtime
   is not implementable for a plain type, only for a runtime schema object. As written this was a
   DoD a S3 implementer could not actually build without either the codebase turning out to use a
   runtime schema (undetermined until Slice 0) or inventing an approach the spec didn't describe.
   Fixed: made the technique conditional on Slice 0's finding — runtime-keys comparison (as
   originally written) if the input is schema-backed, or a compile-time `Record<Exclude<keyof
   SellableUpdate, …>, never>`-style exhaustiveness type (which fails `bun run check`, not vitest)
   if it's a plain TS type — and updated the DoD block to check the compile-time form under `bun run
   check` alongside the vitest form.

## Verified, no change needed

- `kind` is derived (assumption 1), `createSellable`'s item-sync + `itemId`/`updateItem`/
  `item_taken` precedent (assumption 2), and `pos.sellables.test.ts` as the regression home
  (`2026-07-25-faces-catalog-cleanup-report.md` line 70) all match their cited ancestor specs
  verbatim.
- Branch discrepancy claim: `2026-08-13-crm-customers-server-pagination-spec.md` does state
  `origin/dev` was deleted and the live base is `origin/master` (lines 267–275) — the spec's
  instruction to settle this in Slice 0 rather than trust AGENTS.md's `dev` claim is correct.
- Gate-convention citation (§4b: `logic` tag ⇒ mandatory red-state TDD, no UI-governance checks)
  matches `2026-08-17-sdlc-phase-gates-scoring-spec.md` lines 116–117 exactly.
- A1's cross-repo grep claim independently re-run in this checkout:
  `rg -li 'sellable' packages ops langgraph-server scripts` returns zero hits, confirming "verified
  in this checkout" is still accurate today.
- Error-code naming (`kind_derived`, `stock_tracking_immutable`, `uom_immutable`,
  `stock_untrack_has_history`, `uom_locked_has_history`) is used consistently across each slice's
  "Do," DoD, and §6's curl assertions.
- Slice sequencing and the S1→S2→S3 `TODO(handoff)` removal narrative ("keep the rest" in S2,
  "remove the last markers" in S3) is internally consistent once change #2 above is applied.
- §3 "Files touched" table matches each slice's own "Files" list exactly.
- §5 out-of-scope claims (no `.svelte` edits, no schema/DDL) are consistent with §4's CI-guard
  greps and §6's `git diff` checks.

## Flagged for the human

None. All five issues found were mechanically correctable within the spec's own stated
methodology (Slice 0 turns carried claims into fact; ambiguous DoD clauses get disambiguated
against the spec's own later sections) and were fixed in place.
