---
id: 2026-08-20-handoff-minion-hub-3998033254-spec
title: "Handoff marker — crm-contacts.service.ts DNI/five-filter TODOs (already covered by pagination spec S1+S2, both merged)"
stage: spec
status: draft
pass: 1
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-3998033254
verdict: pending
repos: [minion_hub]
tags: [handoff-sweep, crm]
type: fix
relationship: already-satisfied
related: [2026-08-13-crm-customers-server-pagination-spec, 2026-08-13-crm-customers-server-pagination]
---

# Handoff marker — crm-contacts.service.ts DNI/five-filter TODOs

## Relationship to existing work

- **`2026-08-13-crm-customers-server-pagination-spec`** (status `approved`, pass 2,
  verdict `approved`) — its **S1** slice ("Extend `search` to also match
  `custom_fields->>'telefono'` and `->>'dni'` as exact-prefix") is the literal resolution
  of the `:399` marker, and its **S2** slice ("every filter the client currently applies…
  becomes a SQL predicate," landing `awaitingReply` / `buyerOnly` / `funnelStage` /
  `minIcp` / `maxIcp` — five filters — service-layer only, UI wiring deferred to S4/S5) is
  the literal resolution of the `:212` marker, down to the "service only" phrasing.
- **`handoff-minion-hub-3998033254`** (the source proposal, this spec's parent) — same
  repo/file, superseded in scope by the above.

## 0. Product

From the approved proposal `handoff-minion-hub-3998033254`, verbatim:

> Filed automatically by the factory handoff-ledger sweep: this file carries a
> `TODO(handoff):` marker (the open-items ledger clause). Approving sends it into the spec
> pipeline to resolve the open end below.
>
> - `crm-contacts.service.ts:212` — "S2 ships these five filters on the SERVICE only —
>   nothing [wired to the UI yet]"
> - `crm-contacts.service.ts:399` — "DNI search reads `crm_contacts.custom_fields->>'dni'`,
>   the [same convention as the gateway `crm_search` tool]"
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):`
> comment removed.

The proposal's own reconciliation note (added 2026-08-20, before this spec was written)
already flags the overlap: both markers describe the exact slice boundary that
`2026-08-13-crm-customers-server-pagination-spec` S1/S2 were *designed* to leave — "S2
ships filters service-only ahead of the UI wiring" is not a bug report, it is that spec's
own stated slice contract (see `2026-08-13-…-spec.md` §2 "S4 (component) has no dependency
on S1–S3," §2 S2 goal text). The note recommended `status: review` for a human to confirm
scope rather than merging artifacts; this spec pass reaches the same conclusion
independently, with merge evidence added below.

## 1. AS-IS → TO-BE → DELTA

### AS-IS (verified via operator memory, not a fresh checkout — `minion_hub/` is
gitignored in the meta-repo; see caveat below)

- `2026-08-13-crm-customers-server-pagination-spec.md` S1 ("Paged query with total" +
  DNI/telefono prefix search) shipped as **hub PR #128**, merged 2026-08-19 ~22:30Z
  ("CRM pagination S1 — finally landed after 6 failed runs across 3 days" —
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` line 151).
- S2 ("Server filters + funnel stage ported into SQL") shipped as **hub PR #134**, merged
  2026-08-20 ~02–03Z (`sdlc-board-triage-and-phase-gates.md` line 159; gate/CI confirmation
  independently in `/memory/MINION/factory/2026-08-20-eff604f2.md`: commit `1bb15eb`,
  `bun run check` + `bunx vitest run` + `bun run build` all green, hosted CI green).
  Both PRs appear in the 2026-08-20 ~04:00Z session-final merged list alongside #116 #117
  #121 #125 #126 #133 #135 (`sdlc-board-triage-and-phase-gates.md` line 163).
- S3–S6 of that spec (API page contract, `DataTable` server mode, `/crm/customers`
  rewire, export/cleanup) have **no merge evidence** in operator memory — still open,
  already tracked under that spec's own identity.
- The two `TODO(handoff):` markers this proposal was filed against are still present in
  `crm-contacts.service.ts` as of the 2026-08-20 sweep, i.e. **after** #128 and #134
  merged — S1/S2 landing did not delete them.
- Memory `crm-icp-score-spec.md`: "⚠️ column must be SERVER-sorted (pagination rewrite in
  flight)" — consistent with S1 already having added `sort:'icp'` (S1 scope), no
  contradiction.

**Caveat (carried from the design-ancestor spec's own §1):** this pass, like
`2026-08-13-…-spec.md` before it, is written from the meta-repo without `minion_hub/`
checked out. The merge evidence above is operator-memory-sourced (session log +
factory-run lesson file), not a fresh `git log` read. It is strong (two independent memory
entries, both naming exact PR numbers, slice labels and one commit sha) but a human or the
next dev-stage recon should confirm with `git log --oneline -- src/server/services/crm-contacts.service.ts`
on `minion_hub` master before treating this as closed — the same "grep the target file
history before writing code" discipline from `/memory/MINION/factory/2026-08-20-eafcc91e.md`.

### TO-BE

- Both `TODO(handoff):` comments at `crm-contacts.service.ts:212` and `:399` are deleted.
- No behavior change: S1 and S2's shipped code is correct-as-designed (service-layer-only
  filters, prefix-match DNI/telefono search) and stays exactly as merged.
- The remaining slice work (S3–S6 — API contract, UI wiring) continues to be tracked
  **only** under `2026-08-13-crm-customers-server-pagination-spec`, not duplicated here.

### DELTA

1. **Transition:** delete the two stale `TODO(handoff):` lines.
   **Slice:** none — this is not implementation work, it is comment cleanup that belongs
   to whichever PR next touches those exact lines (naturally S4 or S5 of the pagination
   spec, since those are the slices that finish "wiring to the UI" the S2 comment refers
   to). Filing a standalone slice/PR whose only diff is two deleted comment lines is not
   worth a dev-stage run; fold it into the next pagination-spec slice's diff instead.
   **Proving test:** `rg -n "TODO\(handoff\)" src/server/services/crm-contacts.service.ts`
   returns zero matches once `2026-08-13-crm-customers-server-pagination-spec` S4/S5 land
   and their author remembers to strip the two lines (call this out explicitly in that
   slice's PR description if picked up).
2. No other transition. There is no product-behavior gap to close — S1/S2 already ship the
   exact things both markers describe as done.

## 2. Approach

No vertical slices. This proposal's entire ask is already designed (and, for S1/S2,
already merged) under `2026-08-13-crm-customers-server-pagination-spec`. Writing a second,
parallel implementation plan against the same file/lines would either (a) duplicate S1/S2's
already-shipped work, or (b) silently re-scope S3–S6 under a second spec id, both of which
this repo's multi-agent-safety convention (AGENTS.md "Multi-agent safety") and the
proposal's own reconciliation note warn against.

**Recommended disposition (for the human/resolver, not executed by this spec pass):**
close `handoff-minion-hub-3998033254` as already-satisfied, with a pointer to
`2026-08-13-crm-customers-server-pagination-spec` S1 (PR #128) and S2 (PR #134). If the
resolver wants the two comment lines gone sooner than S4/S5, that is a one-line-diff task,
not a spec-worthy one.

## 3. Cross-repo impact

None — no code change is proposed by this spec. `2026-08-13-crm-customers-server-pagination-spec`
§5 already carries the full cross-repo assessment for the surface these markers sit on.

## 4. Out of scope

- Re-specifying `2026-08-13-crm-customers-server-pagination-spec` S1–S6 — that spec is the
  canonical plan; this document does not restate or fork it.
- Any UI wiring for the five S2 filters — tracked as S4/S5 of the existing spec.
- Verifying the merge evidence against a live `minion_hub` checkout — flagged above as a
  recon step for whoever closes this out, not performed here (no checkout available from
  the meta-repo).

## 5. End-to-end verification

No new verification surface. Confirming this proposal is fully closed only requires:

```bash
cd minion_hub   # on a host where it is checked out, not the meta-repo
git log --oneline -- src/server/services/crm-contacts.service.ts | grep -E '#128|#134|S1|S2'
rg -n "TODO\(handoff\)" src/server/services/crm-contacts.service.ts   # expect 0 once S4/S5 clean up
```

`2026-08-13-crm-customers-server-pagination-spec` §8 remains the real end-to-end
verification for the underlying feature (server-mode pagination); nothing here adds to it.
