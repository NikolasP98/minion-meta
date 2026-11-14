# Design critique: spec 118 (hub stuck states and unguarded decisions)

**Verdict: not implementation-ready.** Slice 1 is close. Slice 2's emission half does not reach its own primary scenario. Slice 3's proving test cannot prove its requirement. All three target files, the evidence file, the persona and both standards were read. Source paths below are relative to `/home/nikolas/.cache/claude-tmp/egm-116/hub/`. Nothing was executed; this is a static read.

## Blocker

### B1. The emission stale-pending sweep is unreachable in the scenario it exists for
Affected: spec.md US2 scenario 3, FR-006, I4, SC-002; plan.md Slice 2 third bullet.

- **The UI gate:** "Reintentar" renders only when `s.closedAt && c.retriable` (`src/routes/(app)/pos/history/PageBody.svelte:245`). `retriable` counts only `error` or no emission (`:139`), and `pending` is counted as `ok` (`:135`).
- **The consequence:** a redeploy mid-close leaves every ticket `pending`, so `retriable` is 0 and the button never appears. The spec also says "No UI change".
- **The only other caller** of `emitShiftTickets` is `closeShift` (`pos.service.ts:424-425`), which cannot run again on a closed shift.
- **Paths the sweep never covers:**
  - `emitTicketNow` throws `already_emitted` on a stuck row (`pos.service.ts:510-512`).
  - Tender correction treats it as emitted (`pos.service.ts:2119`). The spec's "Why" names this harm, but the plan only clears it if someone triggers a shift retry.
  - `emitShiftTickets` returns early when mode is not `shadow` (`pos.service.ts:467`), so rows stuck before emission was switched off are never swept.

**Change:** move the sweep out of `emitShiftTickets` into `/api/jobs/tick`.
- Use the existing isolated `try/catch` shape (`src/routes/api/jobs/tick/+server.ts:45-58`).
- Run one cross-org statement on `getCoreDb()`, the way `listFollowUpOrgIds` does (`doors-followup.service.ts:88`): `update pos_emissions set status='error', response_description='stale_pending', updated_at=now() where status='pending' and updated_at < now() - interval '15 minutes'`.
- The existing UI then shows the ticket as `error` and offers Reintentar with no UI change.
- Rewrite US2 scenario 3 and FR-006 to match, and add `src/routes/api/jobs/tick/server.test.ts` to the file list.

## Major

### M1. D7's proving test cannot prove FR-007 or SC-003
Affected: spec.md DELTA D7; plan.md "the one real-Postgres suite touched is none"; tasks T301.

- `pos-emission.service.test.ts:34-36` mocks `withOrgCore` as `fn(fakeTx)`. There is no transaction, no index and no rollback.
- A mocked insert that throws 23505 only shows that the catch swallows, which is already true today.
- "Number rolled back" and "one live row under concurrency" are database properties.
- The fake `update().set().where()` (`:23-25`) discards the predicate, so D6's "late result dropped" is also unobservable unless the test renders the `where` SQL.
- A real-Postgres POS harness exists (`src/server/services/pos-money.sql.integration.test.ts`, `pos-categories.sql.integration.test.ts`). The evidence file's "No POS emission sql.integration test" is true but misleading.

**Change:** add `C src/server/services/pos-emission.sql.integration.test.ts` on that harness with three cases:
- Two concurrent `triggerShadowEmission` calls for one ticket leave one non-error row, and `pos_series.next_number` advances by exactly 1.
- An `error` row plus a retry gives a new row.
- A late result write on a reaped row changes nothing.

### M2. Deny after approve still looks like success
Affected: spec.md US1 scenario 1, FR-001; plan.md Slice 1 first bullet.

- The client is supabase-js on the service role (`src/server/services/join/requests.service.ts:104-112`), not Drizzle.
- A filtered update that matches zero rows returns `error: null`, so `denyRequest` resolves and the route returns `{ ok: true }` (`src/routes/api/join-requests/[id]/deny/+server.ts:11-12`).
- The predicate does close the data hole, including the race: it is a single UPDATE that re-checks its WHERE after approve's lock releases.
- The admin is still told the denial worked while the member stays. That is the "wrong outcome that looks like success" the spec exists to remove, and it contradicts "each path refuses" in the Independent Test.

**Change:** append `.select('id')` to the update; if no row comes back, throw and map to 409 in the deny route. Alternatively, state in the spec that the silent no-op is accepted. Either way the plan must decide.

### M3. The plan claims a guard on the reminders final write that it never adds
Affected: plan.md Risks row 1; `src/server/services/reminders.service.ts:192-209`.

- The plan guards the door follow-up and emission writes only. Reminders `finalize` matches on the five-column key with no status predicate.
- If a reaped row is finalised late, the trigger raises 23514 because `old.status <> 'sending'` (`supabase/migrations/20261003140000_notification_legacy_reconciliation.sql:954-964`).
- That throw lands in the catch at `:286`, which calls `finalize('failed')`, which throws again and escapes `processOrgReminders`.
- The org's remaining reminders and its `scanConfirmationReplies` pass are skipped for that tick (`src/routes/api/scheduling/reminders/tick/+server.ts:33-45`). The row stays `failed/stale_claim` for a message that was delivered, and the ledger mirror at `:254` never runs.
- Likelihood is low: the adapter's `maxDuration` is 300 s (`src/routes/api/jobs/tick/+server.ts:31-32`), so no send outlives 15 minutes on Vercel.

**Change:** add `eq(schedReminders.status, 'sending')` to `finalize`, list it in Slice 2, and add a test case. State the 300 s ceiling as the reason 15 minutes is safe.

### M4. Slice 3's catch instruction is not actionable, and `isUniqueViolation` probably does not match
Affected: plan.md Slice 3 third bullet; `src/server/services/pos-emission.service.ts:317-327`; `src/server/services/pos/db-errors.ts:2-8`.

- The catch already swallows every error with `console.error` and writes no row. "Make sure the existing catch treats…" describes no code change.
- `isUniqueViolation` reads `code` on the top-level error only. The repo is on `drizzle-orm ^0.45.2`, and sibling code walks `.cause` to find the Postgres code (`pos-categories.service.ts:31-33`, `pos.service.ts:2560-2575`, `with-org-core.ts:108-116`). That suggests driver errors arrive wrapped; I could not confirm, as `node_modules` is absent from the snapshot.
- Two unique indexes can now fire in this transaction (document number and live-per-ticket). Telling them apart needs `constraint_name`.

**Change:** specify the branch exactly: walk `.cause` up to four levels; on `23505` with `constraint_name === 'pos_emissions_org_ticket_live_uniq'`, return silently; anything else keeps the existing `console.error`. Say whether the cause-walk goes into `isUniqueViolation` itself; note it is in the frozen export list at `pos-service-boundaries.test.ts:172`.

### M5. Zero-decision failures
Affected: plan.md Technical Plan and Detailed Implementation Plan.

- **"Confirm and add the mapping if the action route swallows it as 400."** Resolved by reading: `assertStatusChangeInTx` throws SvelteKit `error(409)` (`workflow.service.ts:252`) and both routes rethrow non-stale errors (`order-update-status/+server.ts:33-36`, `ticket-update/+server.ts:56-58`). Replace the conditional with "no mapping change".
- **`reminders-reaper.test.ts`.** No `reminders.service` test exists, and the plan does not say which harness to use or what to mock (`getReminderConfig`, `withOrgCore`, `gatewayCall`, `composeReminder`, `insertMessages`). A mock cannot show the trigger accepts the write; name a case in `src/server/db/notification-legacy-reconciliation.sql.integration.test.ts` for `sending → failed` with `error` set.
- **"Limited to the shift's tickets."** No SQL is given. This is moot if B1 is adopted.
- **"`pos.shifts.test.ts` if its mock sequences shift."** A conditional file. That file has no reference to `emitShiftTickets`, `execute` or `select`; drop it or state the edit.
- **"Update `pg-pos-schema.test.ts`."** That test asserts column sets only (`src/server/db/pg-pos-schema.test.ts:29-126`) and has no index assertion. Either drop it from the list or specify the new assertion.
- **Migration `<timestamp>`.** It must sort after the newest file in `supabase/migrations`; give the literal name.
- **`requests.service.test.ts`.** The `update` mock returns a Promise after one `.eq()` (`:48-53`), so today's two-`.eq()` deny would already throw against it. No deny test exists there. The plan must say to rebuild the mock as a chainable thenable that records filters.
- **`actions.server.test.ts`.** It does not import `order-update-status` and does not mock `$server/services/sales.service` (`:75-80`). The plan must say to add the mock (including `ORDER_STATUSES`) and what to assert: the sixth argument equals `{ id, name, email, role: null }`, and a rejected `{ status: 409 }` propagates.
- **Constant names** ("one exported constant per service") and the `HrRuleError` message ("…") are unspecified.

## Minor

- **Reapers skip organisations that are switched off.** I4 says "no reminder, follow-up or emission stays in progress", but:
  - The reminders reaper sits after `if (!config.enabled) return` (`reminders.service.ts:87`), and the tick lists only enabled orgs.
  - The follow-up reaper runs only for orgs returned by `listFollowUpOrgIds` (`doors-followup.service.ts:87-93`) and is skipped once the 25-send or 40 s budget breaks the loop (`:258`).
  - Either narrow I4 or run both reapers cross-org in the tick like B1.
- **`queued` over-reports.** `emitShiftTickets` increments it whatever `triggerShadowEmission` did (`pos.service.ts:492-493`). After slice 3 a swallowed duplicate is still counted and shown in the close dialog. Accept this in the spec or return a boolean.
- **Two meanings of 409 for the assistant.** A stale write returns `{ error: 'stale', current }` and the route comment tells the agent to re-read and retry (`ticket-update/+server.ts:25-26`). A workflow refusal returns a different body under the same status. State that the agent must not retry on the second.
- **"Role-gated only" understates the change.** Wherever a workflow is enabled, the assistant also loses every jump that is not a defined transition. That is the intent (I3), but the Risks row says "only role-gated ones".
- **"Production has no evidence of such use" has no number.** Add the count of enabled `workflow_defs` for `sales_order` and `support_issue` to the production read.
- **Slice 3 PR base.** It branches from slice 2 but targets `master`, so its diff includes slice 2 until that merges. State the merge order in T303/T304.
- **The follow-up reap is not proven against the real schema.** Mention `doors-hardening.sql.integration.test.ts` or accept the mock.

## Verified as sound

- **Leave compare-and-set.** The join in the read is irrelevant: the update targets `hr_leave_requests` only. Adding `status = row.req.status` and the org predicate with `.returning()` is correct under READ COMMITTED. `hrTry` already maps `HrRuleError` (`src/routes/api/scheduling/hr/_shared.ts:22`).
- **`{ ...actor, role: null }` is never treated as admin.** `isAdmin = actor.adminBypass ?? actor.role === 'admin'` evaluates to false (`workflow.service.ts:51`), and `workflowAdmission` is not on this path.
- **The self-approve rule works.** `agentActor` returns `id: principalId` (`action-auth.ts:50`), and `current.ownerId` comes from the locked row, so the member's assistant is blocked exactly as the member is.
- **No workflow defined means unchanged behaviour** (`workflow.service.ts:242-243`). `updateIssue` checks only when `status` is supplied (`support.service.ts:252`).
- **No existing test or fixture exercises a confirmed assistant status change.** `actions.server.test.ts:165-205` covers only the 403 and the preview. Nothing goes red.
- **`created_at` is the claim time on both tables.**
  - Reminders: the trigger forces every insert to `sending` and freezes `created_at`, and the claim insert is immediately before the send (`reminders.service.ts:167-189`).
  - Follow-ups: `claim()` is the only insert and runs immediately before the send (`doors-followup.service.ts:216`); `skipped` rows are inserted in their final state.
- **The trigger accepts the reaper's write.** `sending → failed` changing only `status` and `error` passes; `error` is not a frozen column, and the CHECK allows null `sent_at`.
- **15 minutes versus cadence.** Ticks run every 1 or 5 minutes and functions are capped at 300 s, so a row older than 15 minutes belongs to a dead invocation. This assumes the hub runs on Vercel.
- **`pos_emissions.updated_at`.** It defaults to `now()` at insert and is bumped only by `runBetaEmission`'s own writes (`pos-emission.service.ts:200`, `:210`), so for a `pending` row it equals the insert time.
- **Marking `error` keeps the number consumed.** The row stays under the document-number unique index. That is already the behaviour for every error row (`pos-emission.service.ts:342-344`) and affects only the beta series; legality for live numbering was not assessed.
- **The partial index matches today's semantics.** `rejected` is already never re-emitted (`pos.service.ts:448`, `:564`; `PageBody.svelte:127-128`). The `error` insert in `recordUnemittableTicket` falls outside the index, and no code moves a row out of `error`.
- **RLS is unaffected by the index**, and `org_id` leads it.
- **Rollback of the number is real.** `privateOrgTx` runs `db.transaction` (`with-org-core.ts:201-204`), and `allocateNumber` and the insert share that transaction (`pos-emission.service.ts:288-315`). The second trigger blocks on the `pos_series` row lock, then fails on the index and rolls back.
- **Feature-spec standard.** Problem, goals and non-goals, alternatives with reasons, and risks are all present.

Not checked: whether drizzle 0.45 actually wraps driver errors, the deployment target, and whether the gateway's `channels.send` deduplicates on the idempotency key. The risk to carry forward is B1: as written, slice 2 would ship an emission sweep that staff cannot trigger.