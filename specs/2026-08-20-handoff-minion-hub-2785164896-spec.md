---
id: 2026-08-20-handoff-minion-hub-2785164896-spec
title: "Handoff marker crm-finance.service.ts:12 — already covered by S2 of the reserva-keyword-config spec"
stage: spec
status: draft
pass: 1
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-2785164896
verdict: pending
repos: [minion_hub]
relationship: already-satisfied
related: [2026-08-17-hub-reserva-keyword-config-spec, handoff-minion-hub-1323254565, handoff-minion-hub-2131866440]
type: fix
tags: [logic, handoff-sweep]
---

# Handoff marker crm-finance.service.ts:12 — already covered by S2 of the reserva-keyword-config spec

## 0. Relationship classification (recommend-only)

`relationship: already-satisfied` — this proposal's Definition of Done ("the marker's open
end is resolved and the `TODO(handoff):` comment removed") is not yet true on disk, but it is
**already fully designed and scheduled** by an existing approved spec. No independent design
work is warranted; duplicating it would fork one decision (deposit-keyword rule design) across
two specs that must then be kept in sync by hand.

| Related id | Reason |
|---|---|
| [`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md) | Approved (pass 2, verdict `approved`) implementation spec whose **S1** slice is what deliberately *wrote* this exact marker (see §2 evidence below), and whose **S2** slice explicitly removes it as part of its Definition of Done. This spec's whole content is a pointer into that one. |
| `handoff-minion-hub-1323254565` | Sibling marker, same sweep, same file family (`crm-similarity.service.ts`) — S1 of the same canonical spec wrote it, S2 removes it. Not merged into this spec (distinct call site, per the source proposal's own 2026-08-20 reconciliation note), but resolved by the same slice. |
| `handoff-minion-hub-2131866440` | Sibling marker, same sweep, `crm-journey.service.ts` — identical relationship to the one above. |

The proposal's own 2026-08-20 reconciliation note already reached this conclusion at the
proposal layer ("Confirmed same idea as `2026-08-17-hub-reserva-keyword-config` … the marker
itself names the spec … Not merged into the canonical (in-spec, off-limits to edit)"). This
spec formalizes that into the spec-layer classification the SDLC contract requires, without
editing the canonical spec or either sibling proposal.

## 1. Problem (quoted from the proposal)

> Filed automatically by the factory handoff-ledger sweep: this file carries a
> `TODO(handoff):` marker (the open-items ledger clause). Approving sends it into the spec
> pipeline to resolve the open end below.
>
> - `NikolasP98/minion_hub@master src/server/services/crm-finance.service.ts:12` — rule is the
>   module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from
>   crm_settings
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed; the sweep closes this proposal automatically once the file carries no more markers.

## 2. Evidence this is already-satisfied by planned work

**The marker's own text is the proof.** The comment the sweep quoted —
*"rule is the module default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it
from crm_settings"* — is not incidental phrasing; it matches, almost verbatim, the canonical
spec's own S1 instruction: *"Leave `TODO(handoff): rule is the module default here — S2 of
2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings` at each of the three
call sites; S2 removes all three."* (`2026-08-17-hub-reserva-keyword-config-spec.md` §S1). This
means **S1 of the canonical spec has already been implemented** in `minion_hub` — the pure
`crm-deposit-rule.ts` extraction landed, and it deliberately left this exact marker at
`crm-finance.service.ts` (line 12 now vs. line 9 estimated in the original proposal — a small
drift consistent with the extraction edit S1 describes) as a **scaffold for S2**, not as
free-floating debt.

The canonical spec is `status: approved`, `verdict: approved` (pass 2, `specs/index.json`
verified) — a complete, reviewed, machine-checkable design for the exact transition this
marker asks for. Its S2 Definition of Done includes the literal command
`rg -n 'TODO(handoff)' src/server/services/crm-*.ts` returning **zero** after S2 lands, which
by construction resolves this marker (and the two siblings) simultaneously.

**Supplementary implementation note (not a design gap, for whoever runs S2):** operator memory
`/memory/MINION/factory/2026-08-20-2f403efa.md` records that `crm-finance.service`'s SQL
integration test fixtures previously typed `org_id` as `uuid` while production types it `text`
everywhere, which is invisible until a query fragment compares `org_id` directly against the
`app.current_org_id` GUC (as the canonical spec's `resolveDepositRule` read path will, once
threaded through this file in S2) rather than binding it as a parameter. That drift was fixed
in a prior run (CRM pagination S2) but is a "copy the fixture, inherit the bug" trap — worth a
one-line check (`grep org_id` in whatever fixture S2's author copies from) before extending
`crm-finance.service.test.ts`. This does not change the canonical spec's design; it is a
pre-existing gotcha in the same file family, noted here because it is exactly the kind of thing
that turns a green test into a false negative.

## 3. AS-IS → TO-BE → DELTA

**AS-IS.** `crm-finance.service.ts:12` (per the marker; not independently re-verified here —
this spec is written from the meta-repo, which does not check out `minion_hub`, same
constraint the canonical spec states in its own §1) carries `TODO(handoff): rule is the module
default here — S2 of 2026-08-17-hub-reserva-keyword-config-spec reads it from crm_settings`.
The deposit-classification rule at this call site is `DEFAULT_DEPOSIT_RULE` (`keywords:
['reserva']`) from `crm-deposit-rule.ts`, applied via `notDepositMatchSql` — S1's pure
extraction, output byte-identical to the pre-S1 hardcoded `ilike '%reserva%'`. No per-org
config is read yet. This is one of three structurally identical sites (finance, similarity,
journey) in the same state.

**TO-BE.** `crm-finance.service.ts` resolves its deposit rule once per call via
`resolveDepositRule(ctx)`, reading `crm_settings.value.deposit` (org-scoped, jsonb, zero DDL),
falling back to `DEFAULT_DEPOSIT_RULE` when absent or malformed. The `TODO(handoff)` comment at
line 12 no longer exists. Invariant preserved: for any org with no `deposit` key set, output is
byte-identical to AS-IS (canonical spec S2 DoD, "zero-regression proof for every org today").

**DELTA.**

| # | Transition | Mapped slice | Proving test |
|---|---|---|---|
| 1 | `crm-finance.service.ts` reads the org's `crm_settings.value.deposit` instead of the S1 module default; its `TODO(handoff)` marker is deleted | `2026-08-17-hub-reserva-keyword-config-spec` §S2 (already specified, not re-specified here) | S2 DoD block: per-org keyword classification assertions on `crm-finance.service.ts`'s revenue query, plus `rg -n 'TODO(handoff)' src/server/services/crm-*.ts` → zero hits |

One transition, one slice, already fully specified elsewhere — this is the entire content
"already-satisfied" is meant to capture. No new slice is proposed by this spec.

## 4. Approach

**No new vertical slice.** Implementing `2026-08-17-hub-reserva-keyword-config-spec` §S2 (and,
transitively, §S1 if it has not actually landed — verify with Slice 0 of that spec before
assuming S1 is done; §2 above infers it from marker phrasing, which is strong but not a
substitute for `git log`/`rg` on the checked-out repo) is both necessary and sufficient to
close this proposal. Dev-stage work should be dispatched against the canonical spec, not this
one; when it lands, the handoff-ledger sweep will find zero remaining markers in
`crm-finance.service.ts` (and, on the same PR, in `crm-similarity.service.ts` and
`crm-journey.service.ts`) and auto-close this proposal along with `handoff-minion-hub-1323254565`
and `handoff-minion-hub-2131866440`.

**Files touched:** none by this spec. The canonical spec's own file list
(`2026-08-17-hub-reserva-keyword-config-spec.md` §3) already covers
`src/server/services/crm-finance.service.ts` under its S1/S2 rows.

## 5. Cross-repo impact

Identical to the canonical spec's §4 assessment (no DDL, no shared-package change, no gateway
protocol change; the one real alert, ⚠️A2 — a possible fourth hardcoded copy in `minion/`'s CRM
gateway tools — is already tracked against `proposals/2026-08-17-gw-defaces-crm-tools`, a
different repo's proposal, and is out of scope for both this spec and the canonical one). Not
re-derived here to avoid two specs drifting on the same assessment.

## 6. Out of scope (explicit)

- **Any new design decision about the deposit-keyword rule.** That decision — shape of
  `crm_settings.value.deposit`, escaping, polarity, staleness disclosure, write-path validation
  — belongs entirely to `2026-08-17-hub-reserva-keyword-config-spec`. This spec must not
  fork it.
- **Verifying S1 actually shipped.** Inferred from marker phrasing (§2); the dev agent picking
  up the canonical spec's S2 should confirm with `git log`/`rg` in the checked-out `minion_hub`
  before starting, per that spec's own Slice 0.
- **Closing the sibling proposals** (`handoff-minion-hub-1323254565`,
  `handoff-minion-hub-2131866440`) or editing them — the sweep closes proposals automatically
  on marker removal; this spec does not touch them.

## 7. End-to-end verification

This spec has no independent implementation, so "verification" is: confirm the canonical
spec's S2 Definition of Done (`2026-08-17-hub-reserva-keyword-config-spec.md` §S2 and §6)
passes, then confirm this specific marker is gone:

```bash
cd minion_hub
rg -n 'TODO\(handoff\)' src/server/services/crm-finance.service.ts   # → zero hits
rg -n -i 'reserva' src/server/ --glob '!*.test.ts' --glob '!crm-deposit-rule.ts'  # → zero hits
bun run vitest run src/server/services/crm-
bun run check
```

If all four pass, this proposal's Definition of Done is met and the handoff-ledger sweep
should close it (and its two siblings) on its next pass.
