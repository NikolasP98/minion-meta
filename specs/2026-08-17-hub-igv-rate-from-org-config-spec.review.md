---
spec: 2026-08-17-hub-igv-rate-from-org-config-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review — SUNAT emission: thread the org's configured IGV rate

Cross-checked against `AGENTS.md`, the proposal `proposals/2026-08-17-hub-igv-rate-from-org-config.md`,
and the three design-ancestor specs: `specs/2026-08-14-sunat-emission-beta-spec.md`,
`specs/2026-08-14-sunat-resumen-baja-spec.md`, `specs/2026-08-14-pos-shadow-emission-spec.md`, plus
`specs/2026-08-14-sunat-source-ui-spec.md` and `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` §4b
(tag conventions). `minion_hub` is not checked out in this environment, matching the spec's own §1
disclosure — line numbers and symbol names inside that repo could not be independently re-verified and
are correctly treated as Slice-0 leads, not fact, throughout. Scope: correctness and consistency only.

## Changes made

1. **Frontmatter** — `pass: 1 → 2`, `verdict: pending → approved`. `updated` was already `2026-08-17`;
   left as-is.

2. **S1's own Definition-of-done grep, line ~201** — added `--glob '!*.test.ts'` (plus a note explaining
   why). As written, `rg -n 'IGV_RATE|0\.18' src/server/finance/emission/` had no test-file exclusion,
   but S1's own DoD three lines above it *requires* a test that calls
   `buildInvoiceXml(fixture with igvRate 0.18)` and asserts `cbc:Percent == igvRate * 100` for
   `{0.18, 0.10, 0.08}` — i.e., the slice's own golden-parity test file necessarily contains the literal
   string `0.18`. Run exactly as written, this check would fail against code that correctly satisfies
   every other part of the slice's DoD — a self-contradicting, unpassable "machine-checkable" gate. The
   later three occurrences of this same grep (S2's DEFAULT_IGV_RATE check, S3's, and §6 step 2) all
   already exclude `.test.ts` (via `--glob` or a piped `grep -v`); S1's was the one inconsistent copy.
   Fixed to match the other three.

3. **Owner surface line (top of §0)** — added `src/server/services/finance.service.ts` or a new
   `src/server/finance/tax.ts`, with a pointer to §3. The consolidated Files-touched table already lists
   this file as S2's target (it's where `resolveIgvRate` and `DEFAULT_IGV_RATE` are defined — the
   headline mechanism of the proposal, "read the org's configured tax rate") and S2's own "Do" and
   "Files" sections name it explicitly, but the spec's opening Owner-surface summary omitted it. A
   reader skimming only the header would miss the one new file this spec introduces.

4. **A2's citation** — changed "(per `2026-08-14-pos-shadow-emission-spec` §4)" to cite both §3 (where
   "Never block checkout" is the literal sentence, at the end of the customer-mapping bullet) and §4
   (where the `pos_emissions` row status lifecycle — pending/accepted/rejected/error — is actually
   defined). The combined claim ("`status='error'` and never blocks checkout") spans both sections;
   citing only §4 pointed a verifier at the wrong paragraph for half the claim.

## Verified, no change needed

- The proposal quote in §0 ("src/server/finance/emission/ubl.ts:5 const IGV_RATE = 0.18...") is
  reproduced verbatim from `proposals/2026-08-17-hub-igv-rate-from-org-config.md` — exact match,
  including the DoD and out-of-scope sentences.
- The "totals/IGV are DERIVED (18%, inclusive prices), never passed in" quote and its claim that this
  spec "revises exactly that sentence" — confirmed verbatim in `2026-08-14-sunat-emission-beta-spec.md`
  line 38 (`EmissionInvoice` row of the types table), which is `status: shipped`.
- The `summary.ts` "per-boleta totals (gravada + IGV + total)" quote and the claim that `buildBajaXml`
  carries no totals (boletas void via RC estado 3, not `buildBajaXml`) — both confirmed verbatim in
  `2026-08-14-sunat-resumen-baja-spec.md`'s `summary.ts` row.
- `ticketToEmission(ticket, lines, customer, settings): EmissionInvoice` signature (Assumption 3) —
  matches `2026-08-14-pos-shadow-emission-spec.md` §3 exactly.
- §4's cross-repo grep claim — independently re-run in this checkout:
  `grep -ril 'emission|igv|taxrate' packages ops langgraph-server scripts supabase` returns exactly one
  file, `packages/shared/src/gateway/cache-events.ts`, and the match is at line 20, the comment
  `/** Emission timestamp, ms since epoch. */` — exactly the single false positive the spec claims, at
  the line number the spec claims.
- `2026-08-14-sunat-source-ui-spec.md` contains no mention of `taxRate`/`tax_rate`/IGV anywhere, so §5's
  claim that this page is untouched and doesn't govern the rate is not contradicted by that spec; the
  spec's own hedge ("If S0 finds the rate has *no* UI at all, that is a follow-up proposal") already
  covers the residual uncertainty correctly.
- Gate-convention citation to `2026-08-17-sdlc-phase-gates-scoring-spec` §4b ("tagged `logic`/`test`:
  mandatory red-state TDD, no UI-governance checks") — matches that spec's per-tag table exactly. That
  source spec is itself `status: draft`/`verdict: pending`, but this spec only borrows its tag
  *semantics* for documentation purposes, not a claim that the gates are live — no dependency issue.
- Slice sequencing and file-set consistency: the "Files" list under each of S1/S2/S3 matches the
  consolidated table in §3 exactly; no file appears in a slice's prose that's missing from the table or
  vice versa.
- The rounding-invariant fix described in S3 (`net = round2(totalIncl / (1 + rate))`, `igv = totalIncl -
  net`) is arithmetically sound by construction (`net + igv == totalIncl` always holds regardless of how
  `net` is rounded) — correctly scoped as fixing only the total-vs-line-sum consistency, not the
  per-line-vs-document-sum invariant, which is exactly what the table-driven test in the same bullet is
  for.

## Flagged for the human

- **Effort mismatch, informational only.** The source proposal (`proposals/2026-08-17-hub-igv-rate-from-org-config.md`)
  carries `effort: S`, but this spec's own three slices sum to an estimated 14–20h — more consistent
  with a M/L effort proposal. The spec's own §0 ("Why this is worth three slices and not a
  find-and-replace") already explains and justifies the scope growth, so this isn't a spec defect to
  fix; it's a heads-up that the proposal's `effort` field is now stale relative to the spec it spawned,
  in case that field feeds board/scheduling decisions upstream. Not blocking — no change made to the
  proposal file (out of this review's scope).
