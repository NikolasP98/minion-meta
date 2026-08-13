---
spec: 2026-08-13-crm-customers-server-pagination-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-13
---

# Pass 2 review — CRM Customers DataTable server mode

Cross-checked against `AGENTS.md`, `specs/2026-08-03-crm-customers-server-pagination-spec.md`
(design ancestor), `specs/2026-08-03-crm-icp-score-spec.md`, `specs/2026-07-06-hub-tanstack-consolidated-execution.md`,
`specs/2026-07-07-hub-db-migration-pipeline.md`, and `packages/crm-sdk/src/client.ts` (the one
claim in §5 verifiable from this checkout). Scope: correctness and consistency only.

## Changes made

1. **Frontmatter** — `pass: 1 → 2`, `verdict: pending → approved`. `updated` was already
   `2026-08-13`; left as-is.

2. **Slice 0 recon** — added `rg -n "_funnel'" src/lib/crm/crm-funnel.ts` to the recon block.
   S2's DoD demands a truth-table test covering "every combination of (_funnel value × …)"
   but no file in this spec or its references enumerates the `_funnel` value domain, and it's
   a jsonb free-text field in the schema — "every combination" of an unbounded domain is not
   a machine-checkable requirement. Slice 0 already exists to turn carried-over claims into
   fact; extending it to enumerate the domain is the same pattern applied to a gap the pass-1
   author missed.

3. **S2 DoD** — added a line clarifying the `_funnel` domain is closed/finite per Slice 0's
   new recon line, not open-ended. Same issue as #2, applied at point of use.

4. **S3 "Do" bullet (meta-keys)** — changed "exposed on the page load" to "exported as
   `getMetaKeys(ctx)` … S3 only adds and tests the helper — S5 is the slice that calls it
   from `+page.server.ts`". As written, S3 claimed to expose the query "on the page load,"
   but S3's own goal statement is "still no UI change" and its Files list never touches
   `+page.server.ts` — that wiring only happens in S5's "Do" bullet. This is exactly the kind
   of slice-boundary ambiguity the spec's stated purpose (§0: "slices a single dev can land
   green one at a time") is supposed to eliminate; left as-is, S3's implementer might think
   S3 itself must wire the page, or a reviewer might reject S5 for "duplicating" S3's work.

5. **S3 DoD** — added an `rg` existence check and a vitest case for `getMetaKeys`. As written,
   S3's "Do" section introduces a new query/helper but the DoD had zero verification for it —
   every other S3 "Do" bullet (page contract, limit clamp, decoration, `fields=id`, RBAC
   masking) has a matching DoD assertion; meta-keys was the one silent gap.

6. **S4 DoD git-diff check** — rewrote
   `git diff --name-only origin/master...HEAD | grep -v data-table | grep '\.svelte$'`
   to diff a named "sha-before-S4-commits" range instead of `origin/master...HEAD`, with a
   note explaining why. This check exists to prove S4 needs zero consumer-route edits, but
   §5 alert A4 (which this same spec wrote) says the implementation branch is **shared** with
   `2026-07-06-hub-tanstack-consolidated-execution` T2 (touches `DataTable.svelte` itself)
   and `2026-08-03-crm-icp-score-spec` U5 (touches `/crm/customers`'s `.svelte` files)
   concurrently. Diffing against `origin/master` picks up *their* commits too, so the check
   as written will false-fail (or pass by accident, order-dependent) whenever those concurrent
   specs land on the shared branch before or during S4 — the exact scenario A4 itself warns
   about. This was a genuine contradiction between two parts of the same spec, correctable
   without a human call (scope the diff to this slice's own commits).

## Verified, no change needed

- Design-ancestor cross-references (§0, §1, §3, §7): file paths, the `RankedPage`/
  `rankContactsPage` shape, the funnel-CASE port, the trgm/org-index migration SQL, and the
  `831da4b0` equivalence-harness reference all match `2026-08-03-crm-customers-server-pagination-spec.md`
  verbatim where they should.
- ICP coordination (`sort:'icp'`, `minIcp`/`maxIcp` inclusive-both-endpoints,
  `custom_fields->'_icp'->>'score'` path, nulls-last): matches
  `2026-08-03-crm-icp-score-spec.md` §8.1 exactly.
- A1 (migration-transaction claim): `2026-07-07-hub-db-migration-pipeline.md` (status: shipped)
  confirms `scripts/db-migrate.ts` does apply each file inside one transaction under
  `pg_advisory_xact_lock` — the spec's correction from `concurrently` to plain `create index`
  is right, and treating it as "verify in Slice 0" rather than settled fact is appropriately
  cautious given the referenced doc is from a different checkout and could have drifted.
- A2 (`packages/crm-sdk` claim): independently re-verified in this checkout —
  `packages/crm-sdk/src/client.ts:232` does an `update crm_contacts …` direct to Postgres and
  never calls `/api/crm/contacts`. The spec's "verified in this checkout" note is accurate.
- T2 coordination (A4, DataTable.svelte): `2026-07-06-hub-tanstack-consolidated-execution.md`
  T2 confirms it targets the same file (1034 lines, hand-rolled, do-not-add-TanStack-Table
  constraint repeated verbatim in both specs) and removes a *different*, top-level
  `pageSize`/`renderLimit`/`windowed`/`infiniteScroll` prop set — no field-name collision with
  this spec's `server.onQuery({..., pageSize})` payload, which lives inside a callback
  argument, not the component's prop namespace.
- Slice dependency graph vs. prose ("S4 has no dependency on S1–S3 and may be done in
  parallel") — consistent.
- `DESIGN_LINT_BASE_REF` silent-exit-0 warning — corroborated verbatim by multiple other specs
  in this tree (`2026-08-03-crm-relationship-graph-v2-port-spec.md`,
  `2026-08-03-crm-icp-score-spec.md`, `2026-07-15-ui-design-governance-hardening.md`).

## Flagged for the human

None. All issues found were mechanically correctable (scoping a diff, adding a missing DoD
assertion, disambiguating which slice owns a wiring step) and were fixed in place.
