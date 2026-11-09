# Implementation Plan: POS shift-scoped edits — tender correction, receipt issuing on close, accounting period locks

**Branch**: `101-retro-pos-shift-scoped-edits` (hub work branches off `master`, one per slice) | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/101-retro-pos-shift-scoped-edits/spec.md`

## Summary

Make the till shift the unit of trust. While a shift is open its sales are a draft: a cashier
corrects a mis-tendered sale in place, nothing has been declared to the tax authority yet.
Closing the shift declares them and freezes them: later tender corrections post as an
offsetting pair on the *current* open shift so a counted drawer is never rewritten. An
accountant can then lock a month, after which every POS mutation in it is refused with one
sentence. Three slices, one hub PR each, in that order — slice 2 depends on slice 1 having
removed the per-sale submission at submit time, and slice 3 replaces a stub left by slice 1.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, Node 22+ runtime on Vercel

**Primary Dependencies**: SvelteKit 2, Drizzle ORM (Postgres/Supabase), Paraglide i18n, zod, existing `pos.service.ts` / `pos-emission.service.ts` / `activity.service.ts` / `rbac.service`

**Storage**: Supabase Postgres. Existing: `pos_tickets`, `pos_payments`, `pos_shifts`, `pos_emissions`, `doc_audit_log`, `fin_settings`. New: one table for period locks.

**Testing**: vitest (`bun run test` scoped to the touched folders — never the full suite with `.env` present, per `minion_hub/CLAUDE.md`), plus the repo's frozen export-inventory and route-contract tests

**Target Platform**: hub web app (`minion_hub`), deployed on Vercel from `master`

**Project Type**: SvelteKit web application (server services + API routes + Svelte pages)

**Performance Goals**: a tender correction is a single short transaction (user-perceived instant). A shift close must not get slower by more than the one queued batch call per sale; the batch runs after the close commits, serialized to respect the tax gateway's beta rate limit.

**Constraints**: the tax gateway is external, rate-limited and may be down — nothing user-facing may block on it. Multi-tenant: every read and write is org-scoped and RLS-covered. Money arithmetic stays in the existing integer-minor-unit representation; no floats.

**Scale/Scope**: one clinic (FACES) in production today, tens of sales per shift, one shift open at a time per till. 3 slices; ~8 server units, 3 API endpoints, 5 UI surfaces, 1 migration.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 design — see bottom.*

| Principle | Status | Evidence / how this plan satisfies it |
|---|---|---|
| **I. Spec before code** | PASS | `spec.md` exists and precedes any code; this plan precedes `tasks.md`. (Retrospective note: the shipped work was specified in the flat `specs/*.md` format instead — see `retro-scorecard.md`.) |
| **II. AS-IS → TO-BE → DELTA with evidence** | PASS | `spec.md` carries a "Current behavior (AS-IS)" section with file:line anchors verified on `origin/master` 2026-10-15; TO-BE is FR-001…FR-023 plus INV-1…INV-6; the DELTA is the slice table below, each transition naming its test. |
| **III. Slice-scoped delivery** | PASS | Three slices, each one PR against hub's registered PR base `master` (`AGENTS.md` Project Map; `node scripts/repo-policy.mjs show hub`), each from its own worktree, hub's gates run foreground before the PR opens. Slice 2 is stacked on slice 1 and retargeted to `master` once slice 1 merges — and the base branch is **retargeted before** slice 1's branch is deleted (house rule: `--delete-branch` on a base closes the dependent PR). |
| **IV. Required build steps are spec requirements** | PASS, with work | New API endpoints ⇒ RBAC wiring through `rbac.service` (`pos:edit`, `pos:manage`, `finance:manage`), route-contract manifest update **and its 6 counts** (2 of which live outside `src/lib/routes/`), Paraglide `m.*()` keys in `en.json` + `es.json` + `i18n:compile`, `lint:design` + `lint:tokens` with debt only decreasing. All appear as tasks, not as afterthoughts. New/removed service exports must be registered in the frozen export inventory (`pos-service-boundaries.test.ts`) in the same commit. |
| **V. Security/data work keeps human gates** | PASS, gated | Tagged **data**: a migration, production money rows, tenant scoping, and a control (the lock) whose whole purpose is to refuse writes. Owner approval of this spec before code **and** owner merge of all three PRs are required. The prod proofs touch real FACES tickets, so they are dry-run-first, reversible, and run by the owner — never by the agent. |
| **Open-items ledger** | PASS by construction | Every deliberate omission below gets both an in-code `TODO(handoff): <what, why, pointer>` at its site **and** an entry in `proposals/2026-10-15-hub-pos-shift-scoped-edits-followups.md`. The known omissions at plan time: FR-020 (customer/document/note edits) deferred out of slice 1; the credit-note path (out of scope); the two deferred clarifications FR-011a / FR-021a; the period-lock/unlock trace if FR-022's unlock half cannot reuse the per-sale audit rail. |

No violations to justify ⇒ **Complexity Tracking is empty and omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/101-retro-pos-shift-scoped-edits/
├── spec.md
├── plan.md              # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/            # Phase 1 — API contracts
├── checklists/requirements.md
├── tasks.md              # /speckit-tasks
└── analysis.md           # /speckit-analyze
```

### Source Code (minion_hub, repository root)

```text
src/
├── server/
│   ├── db/pg-pos-schema.ts                  # + period-lock table
│   └── services/
│       ├── pos.service.ts                   # + tender correction, + close-time issuing batch, guards
│       ├── pos-emission.service.ts          # issuing moves off submit; serialized beta gate
│       ├── activity.service.ts              # audit write usable inside a transaction
│       └── pos/
│           ├── tender-correction.ts          # pure: guard chain + correction planning
│           ├── period-locks.ts               # pure: month normalization + lock lookup
│           └── settings.ts                   # drop the never-read per-method document default
├── routes/
│   ├── api/pos/tickets/[id]/payments/[paymentId]/+server.ts   # correct the tender
│   ├── api/pos/tickets/[id]/emit/+server.ts                   # issue one sale now
│   ├── api/pos/shifts/[id]/emit/+server.ts                    # retry a shift's failures
│   ├── api/finances/period-locks/+server.ts                   # lock / unlock / list
│   └── (app)/
│       ├── pos/tickets/[id]/                 # the one edit surface + lock badge
│       ├── pos/sell/                          # till popover shows the tender, links out
│       ├── pos/history/                       # per-shift issued/failed counts, retry, lock icon
│       └── finances/settings/                 # accountant's lock card
├── lib/time/zoned.ts                          # month in the accounting timezone
└── messages/{en,es}.json                       # appended keys only

supabase/migrations/<ts>_pos_period_locks.sql
```

**Structure Decision**: no new layer. The feature lives where POS already lives: pure
decision helpers under `src/server/services/pos/` (so the guard chain and the correction
plan are unit-testable without a database), effects in `pos.service.ts`, one endpoint per
mutation under the existing `src/routes/api/pos/` tree, and the UI on the pages that already
own these objects. The emission service must **not** import POS settings (service-boundary
rule); the close-time batch therefore assembles its settings in `pos.service.ts` and hands
them down.

## Phase 0 — research

See [research.md](./research.md). Decisions taken there: correction-pair-on-current-shift
(not snapshot rewrite), issuing after the close transaction commits (not inside it),
month resolution in the org accounting timezone inside the SQL predicate, one shared guard
chain as a pure function, and one edit surface for the correction dialog.

## Phase 1 — design

- [data-model.md](./data-model.md) — the period-lock table, the payment-entry metadata used
  to trace a correction, and the effective-method rule that keeps repeated corrections from
  stacking.
- [contracts/](./contracts/) — the four endpoints with their request shapes, permissions and
  refusal codes, including the shared refusal order and the 423 copy.
- [quickstart.md](./quickstart.md) — how to exercise each slice locally and the prod proof the
  owner runs.

## Slices (the DELTA)

| Slice | Delivers | Proven by |
|---|---|---|
| **S1 — tender correction** | FR-001…FR-008, FR-017 (lock check stubbed), FR-021, FR-023; INV-1…INV-3 | unit tests on the pure guard chain and the correction plan (both branches, guard order, INV-1/INV-2), a history-folding test (a corrected sale reads as the corrected method), the frozen export inventory, the route contract |
| **S2 — issuing on close** | FR-009…FR-014, FR-023; INV-5 | unit tests: close issues N, a failure does not block, a retry re-sends only failures and never duplicates, a no-op while issuing is off; the status-folding rule; export inventory |
| **S3 — period locks** | FR-015…FR-019, FR-022, FR-023; INV-4, INV-6 | migration + unit tests: month normalization, month resolved in the accounting timezone for one instant, each of the four mutators refuses in a locked month before any effect, unlock restores |
| **deferred** | FR-020, FR-011a, FR-021a, credit note | ledgered in `proposals/`, not in these PRs |

## Constitution re-check after Phase 1

All five principles still PASS. Two things Phase 1 made sharper:

- **Principle IV** grew a concrete item: dropping the never-read per-method document default
  changes the payment-policy revision hash, which makes in-flight sale previews re-preview
  once after deploy. That is a user-visible consequence of a cleanup, so it belongs in the
  PR body and the ledger, not only in the diff.
- **Principle V**: the migration is a new empty table, so it is `seed-unaffected` for the
  migration-pairing gate; the lock's *refusal* path is the security-relevant part and gets a
  test per mutator rather than one test for the service.
