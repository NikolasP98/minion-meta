---
id: 2026-08-20-handoff-minion-hub-3998033254-spec
title: "CRM contacts handoff — party-spine DNI search and pagination filter wiring"
stage: spec
status: approved
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-3998033254
verdict: approved
repos: [minion_hub]
tags: [logic, test]
slice_tags: [1:logic+test, 2:logic]
type: fix
relationship: extends
related: [2026-08-13-crm-customers-server-pagination-spec]
---

# CRM contacts handoff — party-spine DNI search and pagination filter wiring

## Relationship to existing work

This spec **extends** `2026-08-13-crm-customers-server-pagination-spec`; it is not
already satisfied by that spec's merged S1/S2 slices.

- The marker originally reported at `crm-contacts.service.ts:212` says the S2 filters are
  service-only until pagination S3 parses them in `GET /api/crm/contacts` and S5 points
  `/crm/customers` at that API. S1/S2 intentionally did not perform either transition.
  That work remains owned by the pagination spec; this spec adds only a cleanup gate so it
  is not implemented twice.
- The marker originally reported at `crm-contacts.service.ts:399` says search matches raw
  `crm_contacts.custom_fields->>'dni'`, while the returned row overlays the authoritative
  `parties.doc_number` into `custom_fields.dni` for display. A contact whose DNI exists only
  on the party spine is therefore displayed with a DNI but cannot be found by that prefix.
  The marker explicitly says pagination S1 named only the raw `custom_fields` predicate;
  party-spine search is a separate open end owned here.

The proposal's reconciliation note and this spec's pass-1 text saw only the sweep's
single-line excerpts and consequently treated both markers as descriptions of shipped
S1/S2 behavior. The full comments in
[`crm-contacts.service.ts`](https://github.com/NikolasP98/minion_hub/blob/5e77bbe7a15aec126651f6cdac76672020153abd/src/server/services/crm-contacts.service.ts#L212)
show that they instead document the two remaining gaps above.

## 0. Product

From the approved proposal `handoff-minion-hub-3998033254`:

> **Definition of done:** the marker's open end is resolved and the
> `TODO(handoff):` comment removed; the sweep closes this proposal
> automatically once the file carries no more markers.

The two source excerpts in that proposal end at their first newline and are findings, not
complete requirements. This spec uses the full source comments as the requirement boundary.

## 1. AS-IS → TO-BE → DELTA

### AS-IS

Verified against `minion_hub` master source at commit
`5e77bbe7a15aec126651f6cdac76672020153abd` because the subproject checkout is absent from
this workspace:

- Pagination S1 shipped in hub PR #128 and S2 in PR #134. Operator memory confirms both
  merges (`/memory/MINION/sdlc-board-triage-and-phase-gates.md`, lines 151, 159 and 163),
  while `/memory/MINION/factory/2026-08-20-eff604f2.md` records S2 commit `1bb15eb` passing
  `bun run check`, targeted Vitest, build and hosted CI.
- `RankFilters` now contains the service predicates added by S2, including the correction
  that the Customers page's "reserved" toggle maps to `reservedOnly`, not `buyerOnly`.
  `GET /api/crm/contacts` still parses only the pre-S2 filters and calls `rankContacts`, and
  `/crm/customers/+page.server.ts` still loads `listContactsCached` for client-side filtering.
  The `:212` marker is therefore current, not stale.
- For an unmasked caller, `search` matches `display_name`,
  `c.custom_fields->>'telefono'`, and `c.custom_fields->>'dni'`. The same query already
  left-joins `parties p` and overlays nonblank `p.doc_number` into the returned
  `custom_fields.dni`, but the predicate does not match `p.doc_number`. The existing
  PostgreSQL fixture already includes a contact whose only DNI is `parties.doc_number`.
- For a masked caller, search intentionally remains display-name-only to prevent digit-by-
  digit inference of redacted phone or DNI values. Party-spine search must stay behind this
  same field-level security branch.
- Both `TODO(handoff):` comments remain in the file. The proposal cannot meet its stated
  definition of done until both underlying gaps are closed and both comments are removed.

The operator-memory rule "grep the target file history before writing code" shapes the
recon gate below (`/memory/MINION/factory/2026-08-20-eafcc91e.md`): factory slice prompts can
lag already-merged code, so the implementer must recheck live history and behavior first.

### TO-BE

- An unmasked exact-prefix search matches a DNI stored only in nonblank
  `parties.doc_number`, as well as the already-supported display name, phone and raw
  `custom_fields.dni` sources.
- A masked caller cannot search either raw or party-spine phone/DNI values; display-name
  search remains unchanged.
- Pagination S3/S5 parse and use all shipped S2 filters under the canonical pagination
  spec, including `reserved` → `reservedOnly`; this spec does not fork that implementation.
- Each `TODO(handoff):` comment is removed only in the slice that proves its stated gap is
  closed. No comment is deleted merely because S1/S2 merged.

### DELTA

1. **Party-spine DNI search:** add `p.doc_number` as an exact-prefix alternative in the
   existing **unmasked** search predicate, then remove the `:399` marker.
   **Owner:** S1 below.
   **Proof:** real-PostgreSQL cases for party-only prefix match, mid-string non-match, and
   masked non-match.
2. **Pagination filter-wiring cleanup:** after canonical pagination S3 and S5 land, verify
   the API parses the S2 filter set and `/crm/customers` sends it, with the reserved toggle
   mapped to `reservedOnly`; then remove the `:212` marker.
   **Owner:** the pagination spec's S3/S5; the cleanup gate is S2 below.
   **Proof:** the canonical S3/S5 tests plus source greps in S2's DoD.

## 2. Approach

### Recon gate (before either slice)

On current `minion_hub` master, inspect the target history and marker context before editing:

```bash
git log --oneline -8 -- src/server/services/crm-contacts.service.ts
rg -n -C 5 "TODO\(handoff\)" src/server/services/crm-contacts.service.ts
```

If later work has already closed a gap, run that slice's DoD against master and omit the
duplicate code change; remove a marker only when the behavior proof passes.

### S1 — Search the authoritative party-spine DNI

**Goal:** make rendered and searchable DNI authority consistent without broadening access
for masked principals.

**Do:**

- In `rankContactsPage`'s existing unmasked `f.search` predicate, add
  `p.doc_number like ${f.search + '%'}` alongside the raw `custom_fields` phone/DNI terms.
- Preserve exact-prefix semantics. Do not add a substring match or alter display-name
  `ILIKE` behavior.
- Preserve the current `f.maskSensitive` branch exactly: masked callers remain
  display-name-only and must not probe `p.doc_number`.
- Remove only the party-spine DNI `TODO(handoff):` comment after the tests pass.

**Files:**

- `src/server/services/crm-contacts.service.ts`
- `src/server/services/crm-contacts.sql.integration.test.ts`

**Definition of done:**

```bash
REQUIRE_CRM_CONTACTS_POSTGRES=1 SUPABASE_DB_URL="$TEST_DATABASE_URL" \
  bunx vitest run src/server/services/crm-contacts.sql.integration.test.ts
# New assertions use a contact whose custom_fields.dni is absent and p.doc_number is 99887766:
# - unmasked search "9988" returns that contact
# - unmasked mid-string search "8877" does not return it
# - masked search "9988" does not return it
bun run check
rg -n "party-spine search|DNI search reads" src/server/services/crm-contacts.service.ts
# expect zero matches
```

### S2 — Remove the service-only filter marker after canonical wiring lands

**Dependency:** `2026-08-13-crm-customers-server-pagination-spec` S3 and S5. This slice
contains no duplicate route or UI implementation.

**Do:**

- Confirm the canonical S3 route work parses and forwards `awaitingReply`, `buyerOnly`,
  `reservedOnly`, `funnelStage`, `minIcp`, and `maxIcp` with validated boolean/numeric
  semantics.
- Confirm the canonical S5 page sends the active client filters and maps the UI's reserved
  toggle to `reservedOnly`, never `buyerOnly`.
- Remove only the service-only filters `TODO(handoff):` comment after those assertions pass.

**File:** `src/server/services/crm-contacts.service.ts` (comment deletion only; route/page
implementation and tests remain owned by the pagination spec).

**Definition of done:**

```bash
# Run the canonical pagination spec's S3 and S5 targeted tests first.
rg -n "awaitingReply|buyerOnly|reservedOnly|funnelStage|minIcp|maxIcp" \
  src/routes/api/crm/contacts/+server.ts
rg -n "reservedOnly" src/routes/\(app\)/crm/customers/
rg -n "TODO\(handoff\): S2 ships these five filters" \
  src/server/services/crm-contacts.service.ts
# final command expects zero matches
```

## 3. Files touched

| File | Slice | Nature |
|---|---|---|
| `src/server/services/crm-contacts.service.ts` | S1, S2 | party-spine prefix predicate; remove each resolved marker |
| `src/server/services/crm-contacts.sql.integration.test.ts` | S1 | party-only DNI search and masking regression cases |

All paths are relative to `minion_hub/`. Pagination S3/S5 files are intentionally absent
from this table because their implementation remains owned by the related spec.

## 4. Cross-repo impact

None. S1 changes an existing `minion_hub` service predicate and test only; it changes no DB
schema, shared package, REST response shape, auth contract, or gateway WebSocket protocol.
S2 delegates already-specified route/UI work to the pagination spec and deletes a comment
only after that work lands.

## 5. Out of scope

- Reimplementing or reslicing pagination S3–S6.
- Changing how DNI is stored, migrating `custom_fields.dni`, or changing the party-spine
  overlay used for display.
- Making phone or DNI searchable for masked principals.
- Fuzzy or mid-string matching, new search infrastructure, indexes, or schema changes.
- Any CRM route other than the existing `/crm/customers` dependency owned by the pagination
  spec.

## 6. End-to-end verification

After S1 and canonical pagination S3/S5 are present on the same live branch:

```bash
cd minion_hub
bun run check
REQUIRE_CRM_CONTACTS_POSTGRES=1 SUPABASE_DB_URL="$TEST_DATABASE_URL" \
  bunx vitest run src/server/services/crm-contacts.sql.integration.test.ts
# Run the pagination spec's S3/S5 route and page suites.
rg -n "TODO\(handoff\)" src/server/services/crm-contacts.service.ts
```

The final grep must show neither marker covered by this proposal. If unrelated markers are
present in the same file, verify absence by the two exact marker phrases used in the slice
DoDs rather than deleting unrelated handoff entries.
