# Implementation Plan: Stuck sends and unguarded decisions

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-14, pass 2 | **Repo**: `minion_hub`, PR base `master` | Evidence: [egm/evidence.md](./egm/evidence.md), critique: [egm/critic_report.md](./egm/critic_report.md)

## Summary

Three slices, one draft PR each. Slices 1 and 2 are code only. Slice 3 adds one partial unique index and is owner-gated.

| Slice | PR title | Gate |
|---|---|---|
| 1 | `fix(hub): decisions apply once and the assistant follows workflow rules` | none |
| 2 | `fix(hub): a send that died no longer stays in progress` | none |
| 3 | `fix(pos): one live tax document per ticket` | `data`: owner applies the migration and merges. Branch stacked on slice 2; merge after it |

## Technical context

Bun, SvelteKit 2, Drizzle 0.45 over Postgres, vitest. Never run the whole suite; run named files. Real-Postgres POS tests use the disposable-Postgres harness of `src/server/services/pos-money.sql.integration.test.ts` (see spec 116's plan). Patterns: compare-and-set in `src/server/services/workflow.service.ts:174-183`; cross-organisation statement on `getCoreDb()` as `listFollowUpOrgIds` does (`doors-followup.service.ts:87-93`); one isolated `try/catch` per job in `src/routes/api/jobs/tick/+server.ts:45-58`; walking `.cause` to find the Postgres error code (`pos-categories.service.ts:31-33`).

## Constitution check

I this directory. II rows A1–A8 with anchors and a production read. III three PRs from clones `~/.cache/claude-tmp/hub-118-{a,b}`. IV no surface added. V slice 3 is `data`.

## Technical Plan

### Slice 1 — decisions

- **Join deny** (`src/server/services/join/requests.service.ts:104-112`, supabase-js on the service role): add `.eq('status', 'pending').select('id')`; when no row comes back throw `new JoinRequestConflictError('already_decided')` (new class in the same file). `src/routes/api/join-requests/[id]/deny/+server.ts` maps it to `error(409, 'already_decided')`.
- **Leave decision** (`src/server/services/hr.service.ts:693-711`): the update's `WHERE` becomes `and(eq(id), eq(orgId, ctx.tenantId), eq(status, row.req.status))` with `.returning()`; when nothing comes back throw `new HrRuleError('bad_transition', 'This request was already decided.')`. `hrTry` already maps it.
- **Assistant actions**: `src/routes/api/gateway/actions/order-update-status/+server.ts:30` passes `{ ...actor, role: null }` as the sixth argument of `setOrderStatus`; `ticket-update/+server.ts:47-53` passes the same as `updateIssue`'s workflow actor. No error-mapping change: `assertStatusChangeInTx` throws SvelteKit `error(409)` and both routes rethrow it. A null role is never admin (`workflow.service.ts:51`).

### Slice 2 — sweep and guarded final writes

- New `src/server/services/stale-sends.service.ts` exporting `STALE_SEND_MINUTES = 15` and `reapStaleSends(): Promise<{ reminders: number; followups: number; emissions: number }>`. Three statements on `getCoreDb()`, no organisation filter:
  - `update sched_reminders set status='failed', error='stale_claim' where status='sending' and created_at < now() - interval '15 minutes'`
  - `update crm_door_followups set status='failed', error='stale_claim' where status='sending' and created_at < now() - interval '15 minutes'`
  - `update pos_emissions set status='error', response_description='stale_pending', updated_at=now() where status='pending' and updated_at < now() - interval '15 minutes'`
- `src/routes/api/jobs/tick/+server.ts`: call it in its own `try/catch` beside the inbox-rules and follow-up calls, on every tick.
- Guarded final writes: `reminders.service.ts` `finalize` (`:192-209`) adds `eq(schedReminders.status, 'sending')`; `doors-followup.service.ts` final update (`:175-185`) adds `and status = 'sending'`; `pos-emission.service.ts` `runBetaEmission` result writes (`:202`, `:211`) add `eq(posEmissions.status, 'pending')`.
- Nothing changes in `emitShiftTickets`: once a row is `error`, the existing history page counts it as retriable and shows "Reintentar".

### Slice 3 — one live emission per ticket

- Migration `supabase/migrations/20261114120000_pos_emissions_one_live_per_ticket.sql`: `create unique index if not exists pos_emissions_org_ticket_live_uniq on public.pos_emissions (org_id, ticket_id) where status <> 'error';`
- Drizzle: the same index in `src/server/db/pg-pos-schema.ts` beside `:252-258`. No schema-test change (that test asserts columns only).
- `pos-emission.service.ts`, catch at `:317-327`: new private `isLivePerTicketViolation(e)` that walks `e` and up to four `.cause` levels for `code === '23505'` and `constraint_name === 'pos_emissions_org_ticket_live_uniq'`; when true, return silently (the ticket is already being emitted); otherwise the existing `console.error` stays. `isUniqueViolation` is not changed (it is in a frozen export list).
- `emitShiftTickets` still counts a swallowed duplicate in `queued`; accepted (the number shown in the close dialog can read one high in a race).

## Alternatives considered

- **Sweep inside the reminders tick, the follow-up run and the shift retry (pass 1).** Rejected: organisations with the feature switched off are never swept, and the shift retry button is hidden exactly when every row is stuck `pending`.
- **Lease columns like `bg_jobs`.** Rejected: three migrations; the claim time is already recorded.
- **Re-send reaped reminders.** Rejected: breaks "a failed send is never retried".
- **A row lock for the leave decision.** Rejected: compare-and-set is one predicate.
- **Advisory lock per ticket for emission.** Rejected: the index holds for every future caller.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A live send is reaped | Functions are capped at 300 s; final writes are status-guarded so a late result is dropped |
| A reaped emission is emitted twice | Shadow mode only; flagged for the owner |
| The assistant loses a transition it used | Only where a workflow is enabled; production has none (read 2026-11-14) |
| The index build fails on duplicates | None today; check query in the PR; `if not exists` |
| Driver errors are wrapped and the duplicate is logged as an error | The helper walks `.cause` |

## Verification

Per slice: failing test first; `bunx prettier --check`; named vitest files; `bun run check` under the gate lock. SQL integration tests run locally only with a disposable Postgres, else first in CI (say so in the PR). After deploy: the SC-004 count query.

## Detailed Implementation Plan

### Slice 1
- M `src/server/services/join/requests.service.ts`; M `src/server/services/join/requests.service.test.ts` (rebuild its `update` mock as a chainable thenable that records filters; cases: pending → denied; already approved → throws, filters include `status = pending`); M `src/routes/api/join-requests/[id]/deny/+server.ts` and its `server.test.ts` (409)
- M `src/server/services/hr.service.ts`; C `src/server/services/hr.service.leave-decision.test.ts` (mock-db as `hr.service.enrol.test.ts`: stale status → `bad_transition`; fresh → row returned)
- M `src/routes/api/gateway/actions/order-update-status/+server.ts`, `ticket-update/+server.ts`; M `src/routes/api/gateway/actions/actions.server.test.ts` (mock `$server/services/sales.service` including `ORDER_STATUSES`; assert the sixth argument equals the actor with `role: null`; a rejected `{ status: 409 }` propagates; same for the ticket action); M `src/server/services/direct-status-workflow.test.ts` (no-role actor: disallowed jump refused, open transition allowed)

### Slice 2
- C `src/server/services/stale-sends.service.ts`, `stale-sends.service.test.ts`
- M `src/routes/api/jobs/tick/+server.ts`, `server.test.ts`
- M `src/server/services/reminders.service.ts`; C `src/server/services/reminders-finalize.test.ts` (mock `getReminderConfig`, `withOrgCore`, `gatewayCall`, `composeReminder`; assert the rendered `WHERE` of the final write contains `status = 'sending'`)
- M `src/server/db/notification-legacy-reconciliation.sql.integration.test.ts` (one case: `sending → failed` with `error = 'stale_claim'` passes the trigger)
- M `src/server/services/doors-followup.service.ts`, `doors-followup.service.test.ts`
- M `src/server/services/pos-emission.service.ts`, `pos-emission.service.test.ts` (render the `where` of the result write)

### Slice 3 (branch from slice 2's branch)
- C the migration; M `src/server/db/pg-pos-schema.ts`, `src/server/services/pos-emission.service.ts`
- C `src/server/services/pos-emission.sql.integration.test.ts` on the `pos-money` harness (fixture gains `pos_emissions`, `pos_series` and the new index): two concurrent `triggerShadowEmission` calls → one non-error row and `next_number` advanced by 1; `error` row plus retry → new row; late result write on a reaped row changes nothing
