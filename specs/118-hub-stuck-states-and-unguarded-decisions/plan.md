# Implementation Plan: Stuck sends and unguarded decisions

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-14 | **Repo**: `minion_hub`, PR base `master` | Evidence with code quotes: [egm/evidence.md](./egm/evidence.md)

## Summary

Three slices, one draft PR each. Slices 1 and 2 are code only. Slice 3 adds one partial unique index and is owner-gated.

| Slice | PR title | Gate |
|---|---|---|
| 1 | `fix(hub): decisions apply once and the assistant follows workflow rules` | none |
| 2 | `fix(hub): a send that died no longer stays in progress` | none |
| 3 | `fix(pos): one live tax document per ticket` | `data`: owner applies the migration and merges |

## Technical context

Bun, SvelteKit 2, Drizzle over Postgres, vitest. Never run the whole suite; run named files. Tests here are mock-db or PGlite unit tests (named per slice); the one real-Postgres suite touched is none. Patterns to copy: compare-and-set in `src/server/services/workflow.service.ts:174-183`; `isUniqueViolation` already imported in `pos-emission.service.ts:19` with a swallowing catch at `:317-327`; isolated `try/catch` per job in `src/routes/api/jobs/tick/+server.ts:45-58`.

## Constitution check

I this directory. II AS-IS rows A1–A8 with anchors and a production read. III three PRs from clones `~/.cache/claude-tmp/hub-118-{a,b}`. IV no surface added. V slice 3 is `data`.

## Technical Plan

### Slice 1 — decisions

- `src/server/services/join/requests.service.ts` deny (`:104-112`): add `.eq('status', 'pending')`. Zero rows stays a silent no-op, as the existing comment says.
- `src/server/services/hr.service.ts` `decideLeaveRequest` (`:693-711`): add `eq(hrLeaveRequests.status, row.req.status)` and the organisation predicate to the update's `WHERE`, `.returning()`, and throw `new HrRuleError('bad_transition', …)` when nothing came back.
- `src/routes/api/gateway/actions/order-update-status/+server.ts:30` and `ticket-update/+server.ts:47-53`: pass `{ ...actor, role: null }` as the workflow actor argument of `setOrderStatus` / `updateIssue`. A workflow refusal is already a 409 through the routes' existing error mapping; confirm and add the mapping if the action route swallows it as 400.

### Slice 2 — reapers

- `reminders.service.ts`, top of `processOrgReminders` after the enabled check (`:87`): one `withOrgCore` update `set status='failed', error='stale_claim' where org and status='sending' and created_at < now() - interval '15 minutes'`. The transition trigger allows it and `sent_at` stays null.
- `doors-followup.service.ts`, in `runOrg` before `dueCandidates` (`:194-203`): the same update on `crm_door_followups`. Add `and status = 'sending'` to the final update (`:175-185`).
- `pos.service.ts` `emitShiftTickets` (`:465`), before `listUnemittedTickets`: update `pos_emissions set status='error', response_description='stale_pending' where org and status='pending' and updated_at < now() - interval '15 minutes'` limited to the shift's tickets. `pos-emission.service.ts` `runBetaEmission` (`:202`, `:211`): add `eq(status, 'pending')` to both result writes so a late provider answer cannot overwrite a reaped row.
- The 15-minute limit is one exported constant per service.

### Slice 3 — one live emission per ticket

- Migration `supabase/migrations/<timestamp>_pos_emissions_one_live_per_ticket.sql`: `create unique index if not exists pos_emissions_org_ticket_live_uniq on public.pos_emissions (org_id, ticket_id) where status <> 'error';` Production has no duplicate today (read 2026-11-14), so the build succeeds; the PR body repeats the check query for the owner to run first.
- Drizzle index in `src/server/db/pg-pos-schema.ts` beside `:252-258`; update `src/server/db/pg-pos-schema.test.ts`.
- `triggerShadowEmission` (`pos-emission.service.ts:288-327`): the duplicate insert fails inside the transaction that allocated the number, so the number rolls back; make sure the existing catch treats `isUniqueViolation` on this index as "already being emitted" and returns without an error row.

## Alternatives considered

- **Lease columns and a generic reaper like `bg_jobs`.** Rejected: three tables would each need a migration; `created_at`/`updated_at` already record the claim time, and the volume is zero today.
- **Re-send reaped reminders.** Rejected: it breaks "a failed send is never retried" and risks a duplicate message when the send had in fact gone out.
- **A row lock for the leave decision.** Rejected: it would also lock the joined employee row; compare-and-set is one predicate.
- **Advisory lock per ticket for emission instead of an index.** Rejected: the index is the guarantee that survives every future caller.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A slow but live send is reaped at 15 minutes | Final writes are status-guarded, so the late result is dropped, not mixed; the limit is far above a send's duration |
| A reaped emission is emitted twice | Shadow mode only; flagged for the owner |
| The assistant loses a transition it used | Only role-gated ones; the refusal is a clear 409; production has no evidence of such use (owner can grant a role later) |
| The index build fails on duplicates | Check query in the PR; `if not exists`; none today |

## Verification

Per slice: failing test first; `bunx prettier --check`; named vitest files; `bun run check` under the gate lock. After deploy: the SC-004 count query.

## Detailed Implementation Plan

### Slice 1
- M `src/server/services/join/requests.service.ts`, `src/server/services/join/requests.service.test.ts`
- M `src/server/services/hr.service.ts`; C `src/server/services/hr.service.leave-decision.test.ts` (mock-db, as `hr.service.enrol.test.ts`)
- M `src/routes/api/gateway/actions/order-update-status/+server.ts`, `ticket-update/+server.ts`; M `src/routes/api/gateway/actions/actions.server.test.ts`; extend `src/server/services/direct-status-workflow.test.ts` with the no-role case

### Slice 2
- M `src/server/services/reminders.service.ts`; C `src/server/services/reminders-reaper.test.ts`
- M `src/server/services/doors-followup.service.ts`, `doors-followup.service.test.ts`
- M `src/server/services/pos.service.ts`, `pos-emission.service.ts`; M `pos.service.emission.test.ts`, `pos-emission.service.test.ts`, and `pos.shifts.test.ts` if its mock sequences shift

### Slice 3 (branch from slice 2's branch)
- C the migration; M `src/server/db/pg-pos-schema.ts`, `pg-pos-schema.test.ts`, `pos-emission.service.ts`, `pos-emission.service.test.ts`
