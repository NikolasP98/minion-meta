# Audit of the six "implicit state machine" claims (hub snapshot at `/home/nikolas/.cache/claude-tmp/egm-116/hub/`)

All paths below are relative to that root. Every line number was checked against the file.

**Verdicts:**
- **Item 1:** confirmed. The reschedule half is partly wrong: stages that have not fired yet do move with the new start time.
- **Item 2:** confirmed.
- **Item 3:** confirmed. The "serialized gate" spaces calls inside one process only and does not deduplicate.
- **Item 4:** mostly wrong. Approve is properly guarded; only deny is unguarded.
- **Item 5:** confirmed. The same bypass also exists in the `ticket-update` gateway route.
- **Item 6:** the race is confirmed, but the "balance deduction doubles" part is wrong. There is no deduction; the balance is computed from request statuses.

---

## 1. `sched_reminders` stuck in `sending`: CONFIRMED

**Statuses.** The column comment is at `src/server/db/pg-reminders-schema.ts:68`: `'sending' | 'sent' | 'failed' | 'skipped'`. The database enforces this in `supabase/migrations/20261003140000_notification_legacy_reconciliation.sql`:
- `:923-931`: CHECK on status, plus `sent_at` must be set exactly when status is `sent`.
- `:941-972`: trigger `sched_reminders_legal_transition`. An INSERT must be `sending`. An UPDATE must go from `sending` to `sent`, `failed` or `skipped`. Identity columns and `created_at` cannot change.

```sql
  if old.status <> 'sending'
     or new.status not in ('sent', 'failed', 'skipped')
     ...
     or new.created_at is distinct from old.created_at then
    raise exception 'sched_reminder_transition_rejected' using errcode = '23514';
```

**Lease or timestamp column.** There is no lease column. The table has only `sent_at` and `created_at` (`pg-reminders-schema.ts:71-72`; DDL at migration `:844-858`). Because the trigger forces every INSERT to be `sending` and freezes `created_at`, **`created_at` is effectively the claim time**.

**Claim** (`src/server/services/reminders.service.ts:166-190`):
```ts
          const claimed = await withOrgCore(ctx, (tx) =>
            tx
              .insert(schedReminders)
              .values({ ..., recipient, status: 'sending' })
              .onConflictDoNothing({ target: [ ...orgId, bookingId, stage, channel, recipientRole ] })
              .returning({ id: schedReminders.id }),
          );
          if (!claimed.length) continue; // already handled
```
- The claim and the final update are two separate transactions. The final update (`finalize`, `:192-209`) runs only after `composeReminder` (an LLM call) and `gatewayCall('channels.send')` (`:231-251`).
- A crash between them leaves the row in `sending`.
- The dedup set at `:115-130` treats any existing row as done, whatever its status. So a `sending` row (and also a `failed` one) is never picked up again.
- **There is no reaper.** Only two code paths touch the table: `reminders.service.ts` and the delete at `scheduling-bookings.service.ts:3245-3247`.
- Stuck rows are also invisible in the UI: `getReminderActivity` counts only `sent`, `failed` and `skipped` (`:427-434`).

**Rescheduling: half right.** `rescheduleBookingInTx` (`src/server/services/scheduling-bookings.service.ts:1483-1494`) updates only `startTime`, `endTime`, `resourceId` and `updatedAt`. It never touches `sched_reminders`.
- `dueStages` is recalculated from `start_time` on every tick (`src/server/scheduling/reminders.ts:3-8`: "Recomputed every tick from booking.startTime, so reschedules self-correct"). So stages that have not fired yet do fire at the new time.
- Stages that already fired (for example a `24h` reminder sent before the booking was moved a week out) are **never sent again**, because their unique row still exists (`pg-reminders-schema.ts:77-83`).
- So "never re-plans" is wrong. "Never re-sends an already-fired stage" is right.

**Smallest fixes:**
- **Reaper.** At the top of `processOrgReminders`, after the `config.enabled` check (`:87`), run one per-org UPDATE through `withOrgCore`:
  ```sql
  update sched_reminders set status='failed', error='stale_claim'
  where org_id=${ctx.tenantId} and status='sending' and created_at < now() - interval '15 minutes'
  ```
  The trigger allows `sending → failed`, and the CHECK accepts `sent_at` as null. This keeps the "a failed send is never retried" policy.
- **Reschedule.** In `rescheduleBookingInTx`, when the start time changes, delete the booking's rows with `stage <> 'confirmation' and status <> 'sending'`. This is the same org-scoped delete already used at `scheduling-bookings.service.ts:3245-3247`; DELETE is not blocked by the trigger. Two cautions:
  - This is a product decision: it deliberately sends a reminder again.
  - It deletes the audit rows for those stages.
- **Entrypoint.** `src/routes/api/scheduling/reminders/tick/+server.ts:17-49` (comment says Vercel Cron, every minute).

---

## 2. `crm_door_followups` stuck in `sending`: CONFIRMED

**Statuses.** CHECK `('sending','sent','failed','skipped')` at `supabase/migrations/20261025100000_crm_doors.sql:47`, and the TypeScript type at `src/server/services/doors-followup.service.ts:35`.
- Unique on `(org_id, door_id, contact_id)` (`:55`).
- No lease column: only `sent_at` and `created_at` (`:53-54`).
- No transition trigger, unlike reminders.

**Claim and finalize** (`doors-followup.service.ts:160-185`):
```ts
      insert into crm_door_followups (org_id, door_id, contact_id, submission_id, status, reason)
      values (${ctx.tenantId}, ${c.door_id}, ${c.contact_id}, ${c.submission_id}, ${status}, ${reason})
      on conflict (org_id, door_id, contact_id) do nothing
      returning id
...
      update crm_door_followups
      set status = ${status}, ...
      where org_id = ${ctx.tenantId} and door_id = ${c.door_id} and contact_id = ${c.contact_id}
```
- The send happens between the two (`:223-233`).
- Candidate selection excludes any existing row, whatever its status (`:145-146`).
- There is no reaper.
- The UI counts leave out `sending` (`:314`).
- `finalize` also has no `and status='sending'` predicate.

**Smallest fix.** In `runOrg` (`:194-203`), before `dueCandidates`, run:
```sql
update crm_door_followups set status='failed', error='stale_claim'
where org_id=… and status='sending' and created_at < now() - interval '10 minutes'
```
This matches the file's own policy: "a failed send is never retried" (`:13-15`). Optionally add `and status='sending'` to `finalize`'s WHERE.

**Entrypoint.** `runDoorFollowUps` already runs on every `/api/jobs/tick` call (`src/routes/api/jobs/tick/+server.ts:52-58`).

---

## 3. `pos_emissions`: CONFIRMED (both halves)

**Statuses.** `'pending' -> 'accepted' | 'rejected' | 'error'` (comment at `src/server/db/pg-pos-schema.ts:240`).
- There is **no SQL CHECK and no transition trigger** (`supabase/migrations/20260814040000_pos_shadow_emission.sql:32-49`). Only the default `'pending'` exists.
- The only uniqueness is per document number, not per ticket (`:51-52` and `:54-55`; also `pg-pos-schema.ts:252-258`):
  ```sql
  create unique index if not exists pos_emissions_org_doc_serie_correlativo_uniq
    on public.pos_emissions (org_id, doc_type, serie, correlativo);
  create index if not exists pos_emissions_org_ticket_idx
    on public.pos_emissions (org_id, ticket_id);
  ```

**Insert of `pending`.** In `triggerShadowEmission` (`src/server/services/pos-emission.service.ts:288-316`), the number allocation and the `pending` insert happen in one transaction. The provider call is then detached:
```ts
      const allocation = await allocateNumber(tx, ctx.tenantId, docType, 'beta');
      ...
          status: 'pending',
      ...
    });
    fireAndForget(runBetaEmission(ctx, emissionId, invoice, docRequired));
```
- `runBetaEmission` (`:178-216`) updates the row by id only (`:202`, `:211`), with no `status='pending'` predicate.
- **If the process dies after commit and before or during the call, the row stays `pending` forever.** The code admits this at `:174-176`: "rows stuck 'pending' are the loss measure for a frozen/crashed runtime".
- Nothing ever reaps it. The only writers are `pos-emission.service.ts` (`:194`, `:209`, `:300`, `:359`).

**What "retry" does.** "Reintentar" is `POST /api/pos/shifts/[id]/emit` (`src/routes/api/pos/shifts/[id]/emit/+server.ts:12-22`), which calls `emitShiftTickets`. That is the same function `closeShift` calls (`src/server/services/pos.service.ts:424-425`).
- `listUnemittedTickets` (`pos.service.ts:438-456`) admits only tickets whose rows are all `error`:
  ```ts
  sql`not exists (select 1 from pos_emissions e where e.org_id = ${ctx.tenantId} and e.ticket_id = ${posTickets.id} and e.status <> 'error')`,
  ```
- So a stuck `pending` ticket is **excluded from retry permanently**.
- It also counts as "emitted": the tender-correction check at `pos.service.ts:2110-2119` (`emitted: emissions.some((e) => e.status !== 'error')`) treats it as emitted, so the ticket can no longer be corrected.

**Double live rows.** Both callers read first and insert later, in separate transactions, with no lock:
- `emitShiftTickets` (`:465-496`) reads at `:468` and inserts per ticket at `:492`.
- `emitTicketNow` (`:501-523`) checks at `:510-512` via `emissionStatusByTicket`, then calls `triggerShadowEmission` at `:521`.
- Close and Reintentar running together, a double click, or Reintentar plus "Emitir ahora" can each insert their own `pending` row, each with a **different correlativo**. Nothing in the schema stops it.

**The "serialized gate"** is `betaGate` / `betaRateLimit` (`pos-emission.service.ts:143-161`). It is a module-level promise chain that keeps beta calls about 3 s apart within one serverless instance. It does not deduplicate tickets, does not lock across requests or processes, and runs only after the row is already committed.

**Smallest fixes:**
- **Uniqueness.** Add a migration with a partial unique index `on pos_emissions (org_id, ticket_id) where status <> 'error'`.
  - A duplicate insert then fails inside the same transaction as `allocateNumber`, so the correlativo rolls back (the allocator's contract, `:55-57`).
  - The existing catch at `:317-327` swallows the error. `isUniqueViolation` is already imported (`:19`).
  - The migration must first clean up existing duplicates, or the index build fails.
- **Reaper.** At the top of `emitShiftTickets`, run `update pos_emissions set status='error', response_description='stale_pending' where org_id=… and status='pending' and updated_at < now() - interval '15 minutes'`. Two cautions:
  - This removes the "stuck pending = loss measure" signal the spec relies on (`:174-176`). Keep a distinct description so the signal survives.
  - If the beta call actually succeeded before the crash, the retry emits a second correlativo.

---

## 4. Join requests: MOSTLY REFUTED (approve is guarded; deny is not)

**Approve is fully guarded.** `approveRequest` (`src/server/services/join/requests.service.ts:89-96`) delegates to `approveOrganizationRequest` (`src/server/services/join/organization-admission.ts:443-481`):
- org advisory lock (`:135-138` via `:453`)
- profile locks (`:452`)
- `FOR UPDATE` on the request row, plus an early return if it is not pending:
```ts
    const [request] = await tx<RequestRow[]>`select supabase_id,status from ${tx(tables.requests)}
      where id=${id}::uuid and organization_id=${opts.organizationId} for update`;
    ...
    if (request.status !== 'pending') return;
```

**Approve's side effects** are all in `admit()` (`:265-307`):
- deletes stale `member_roles` rows
- inserts into `organization_members`
- inserts into `member_roles`
- writes a `doc_audit_log` row
- then sets `status='approved'` (`:477-478`) and calls `invalidateRbac` (`:480`)

They are idempotent: `admit` returns early if `memberExists` (`:276`), and a second approve hits `status !== 'pending'`. **So "approve twice" is wrong.**

**Deny is unguarded** (`requests.service.ts:104-112`):
```ts
    .from('join_request')
    .update({ status: 'denied', reviewed_by: opts.reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', opts.organizationId);
```
- Deny after approve, or deny racing approve (deny waits on approve's row lock, then overwrites), flips the row to `denied` **while the membership stays in place**.
- Approve after deny is a no-op, which is correct.
- There is no transition trigger on `join_request` in `supabase/migrations`.

**Smallest fix.** Add `.eq('status', 'pending')` after `:112`. Under READ COMMITTED, the waiting UPDATE re-checks its WHERE clause after approve commits and then matches 0 rows. The existing comment already says 0 rows is a no-op.

---

## 5. Sales order gateway route bypasses the workflow engine: CONFIRMED

**Gateway path** (`src/routes/api/gateway/actions/order-update-status/+server.ts:28-30`). No 6th argument is passed, so `workflowActor` is undefined:
```ts
	const actor = await agentActor(principalId);
	try {
		const order = await setOrderStatus(ctx, b.orderId, b.status as (typeof ORDER_STATUSES)[number], actor, b.expectedUpdatedAt);
```

**UI paths:**
- `PATCH /api/sales/orders/[id]` (`src/routes/api/sales/orders/[id]/+server.ts:24-27`) passes `{ ...actor, role: locals.user?.role ?? null }`.
- Action buttons go to `POST /api/workflow/apply` (`src/routes/api/workflow/apply/+server.ts:18-22`), which calls `applyTransition`. The UI calls both: `src/routes/(app)/sales/[id]/PageBody.svelte:42` and `:57`.

**What is skipped** (`src/server/services/sales.service.ts:222-223`):
```ts
    if (workflowActor)
      await assertStatusChangeInTx(tx, ctx, 'sales_order', cur, status, workflowActor);
```
`assertStatusChangeInTx` (`src/server/services/workflow.service.ts:214-253`) does the following:
- Loads the enabled `workflow_defs` row `FOR SHARE`.
- Requires the target status to be reachable from the current one via `isStatusChangeAllowed` / `availableTransitions` (`:45-58`, `:202-211`).
- Enforces the transition's `role` gate.
- Enforces `allowSelfApprove:false`: the owner cannot take that transition.
- Narrows authority under role simulation.

On failure it throws 409. Without it, the agent can make any jump in `ORDER_STATUSES` (for example `invoiced → draft`). Capability (`sales:edit`), row lock, stale guard and audit still apply.

**Same bypass elsewhere:** `src/routes/api/gateway/actions/ticket-update/+server.ts:47-53` omits `workflowActor` for `updateIssue` (`support.service.ts:252-253`).

**Smallest fix.** Pass a 6th argument, `{ ...actor, role: null }`. The agent then gets no admin bypass and no role-gated transitions, only open ones. A better role would be the org-membership role that `resolveMemberPrincipal` already reads (`src/server/auth/assistant-principal.ts:213`), but `requireAssistantCapability` drops it (`src/routes/api/gateway/_shared/action-auth.ts:32`). Note that role is not the same kind of role the UI passes (`locals.user.role`), so using it is a design choice. Apply the same change to `ticket-update`.

---

## 6. Leave decisions: race CONFIRMED, double deduction REFUTED

**Code** (`src/server/services/hr.service.ts:693-711`):
```ts
    const [row] = await tx
      .select({ req: hrLeaveRequests, profileId: hrEmployees.profileId })
      ...
      .where(and(eq(hrLeaveRequests.id, id), eq(hrLeaveRequests.orgId, ctx.tenantId)))
      .limit(1);
    if (!canTransition(row.req.status as LeaveStatus, status)) throw ...
    ...
      .update(hrLeaveRequests)
      .set({ status, decidedBy: ctx.profileId ?? null, decidedAt: new Date() })
      .where(eq(hrLeaveRequests.id, id))
```
- There is no `FOR UPDATE` and no status predicate.
- `canTransition` is at `src/server/hr/leave-rules.ts:94-98`.
- Two concurrent decisions on a `pending` request both pass the check, and the last write wins. For example, approve returns success and the stored state ends up `rejected`, or `decided_by` is overwritten.

**Side effects: none.** The balance is computed from request rows: `balanceFor` (`hr.service.ts:515-558`) feeds `leaveBalance` (`leave-rules.ts:62-79`), which sums approved and pending days. There is no ledger or deduction write. Scheduling day-offs also read approved leave dynamically (`loadDayOffOverrides`, `hr.service.ts:721`). **Nothing can be applied twice.** The only caller is `src/routes/api/scheduling/hr/leave-requests/[id]/+server.ts:13`.

**Adjacent real race:** `createLeaveRequest` checks the balance and overlap and then inserts (`:630-682`) with no lock. Two concurrent creates can overdraw the balance or overlap each other.

**Smallest fix.** Use compare-and-set like `workflow.service.ts:174-183`: add `eq(hrLeaveRequests.status, row.req.status)` to the UPDATE's WHERE at `:708`, and throw `HrRuleError('bad_transition', …)` when `updated` is undefined. (Using `.for('update')` like `sales.service.ts:219` would also lock the joined `hr_employees` row unless you pass `{ of: hrLeaveRequests }`.)

---

## Patterns you can reuse

**`bg_jobs` lease.** Schema at `src/server/db/pg-schema/bg-jobs.ts:20-26`:
- columns `status` (queued|running|done|failed|cancelled), `attempts`, `lease_generation`, `next_attempt_at`, `lease_until`
- all times are epoch milliseconds stored as `bigint`, not timestamptz
- `lease_generation` was added in `supabase/migrations/20260909090100_bg_job_lease_generation.sql:4-6`

In `src/server/services/bg-runtime.ts`:
- `LEASE_MS = 60_000` and `HEARTBEAT_MS = LEASE_MS/3` (`:97-98`).
- Conditional claim (`:160-196`) increments the generation and requires the generation seen at read time:
  ```ts
        or(
          eq(bgJobs.status, 'queued'),
          and(eq(bgJobs.status, 'running'), lte(bgJobs.leaseUntil, now)),
        ),
  ```
- Ownership check `ownsLease` (`:199-207`): `status='running' AND lease_generation=… AND lease_until > now`. It is used by `finish` (`:209-215`), `persistProgress` (`:217-229`) and `heartbeat` (`:231-267`).
- `withOwnership` (`:331-355`) re-checks the lease under `FOR UPDATE`.
- **There is no separate reaper.** An expired lease is detected and reclaimed by the same predicate in `claim` and in `runTick`'s selection (`:487-500`). Reclaiming is the reaping.

**Tick entrypoints:**
- `src/routes/api/jobs/tick/+server.ts:34-60`:
  - `runTick` advances bg_jobs only when `?jobs=1` (`:41-44`; Vercel's 5-minute call does not pass it).
  - `evaluateInboxRules` (`:45-51`) and `runDoorFollowUps` (`:52-58`) run on every call, each in its own try/catch.
  - **This is the natural place for a generic reaper sweep, using the same isolated try/catch shape.**
- `src/routes/api/scheduling/reminders/tick/+server.ts:17-49`: per-org loop, the natural place for the reminders reaper.
- There are about 15 other `*/tick/+server.ts` routes (notifications, pulse, memberships and others).
- No `vercel.json` is in the snapshot, so the schedules above come from code comments only.

**Lock helpers:**
- `pg_advisory_xact_lock(hashtextextended(…))`: e.g. `organization-admission.ts:138`, `src/server/services/nav-policy-lock.ts:5`.
- Try-lock form: `src/server/services/crm-conversation-analysis.service.ts:182`.

**Existing tests:**

| Area | Tests | Kind |
|---|---|---|
| Reminders | `src/server/scheduling/reminders.test.ts` | pure unit |
| | `src/server/services/reminder-compose.test.ts` | unit |
| | `src/server/db/pg-reminders-schema.test.ts` | schema |
| | `src/server/db/notification-legacy-reconciliation.sql.integration.test.ts` | real PG, covers the trigger and RLS |
| | **No `reminders.service` test** | |
| Reschedule | `src/server/services/scheduling-bookings-reschedule.test.ts`, `scheduling-bookings-assistant-reschedule.test.ts` | unit, mocks |
| Doors | `src/server/services/doors-followup.service.test.ts` | unit, mocked db with PgDialect; has "failed never retried" and "overlapping ticks" cases |
| | `doors-hardening.sql.integration.test.ts` | real PG |
| POS | `src/server/services/pos-emission.service.test.ts`, `pos.service.emission.test.ts`, `pos-service-boundaries.test.ts`, `pos.shifts.test.ts`, `src/server/db/pg-pos-schema.test.ts` | unit, mocks |
| | `src/routes/api/pos/shifts/close/server.test.ts` | route |
| | **No POS emission sql.integration test** | |
| Join | `src/server/services/join/requests.service.test.ts` | unit, mocks |
| | `organization-admission.sql.integration.test.ts`, `pending.repository.sql.integration.test.ts` | real PG |
| | `src/routes/api/join-requests/[id]/{approve,deny}/server.test.ts` | route unit |
| Sales / workflow | `src/server/services/direct-status-workflow.test.ts` | PGlite, calls `setOrderStatus` with `workflowActor` |
| | `workflow.service.test.ts` | pure |
| | `workflow.owner-simulation.test.ts`, `workflow.simulation.test.ts`, `optimistic-locking.test.ts` | |
| | **No test for `order-update-status`** (`actions.server.test.ts` does not mention it) | |
| HR | `src/server/hr/leave-rules.test.ts` | pure |
| | `src/server/services/hr.service.enrol.test.ts` | `createMockDb` |
| | **No `decideLeaveRequest` test** | |
| bg runtime | `src/server/services/bg-runtime.test.ts` | PGlite |
| | `bg-runtime.selection.test.ts` | unit |
| | `job-effects.sql.integration.test.ts`, `job-effect-pages.sql.integration.test.ts`, `job-stock-concurrency.sql.integration.test.ts` | real PG, gated on `MINION_QC_DATABASE_URL` |
| | `src/routes/api/jobs/tick/server.test.ts` | route unit, mocks |

---

Not checked: whether the gateway's `channels.send` deduplicates on `idempotencyKey` (`reminders.service.ts:248`, `door-fu-…` at `doors-followup.service.ts:229`). That decides whether a reaper could safely mark rows for re-send instead of `failed`. I also did not check how `join_request` is defined outside `supabase/migrations`.

Risks: the partial unique index for POS fails to build if duplicates already exist in production. Reaping `pending` POS rows erases the "loss measure" the spec relies on.