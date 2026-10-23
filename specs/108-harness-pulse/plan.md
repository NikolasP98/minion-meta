# Implementation Plan: Pulse approval and dispatch receipts

**Branch**: `feature/agent-harness-d-pulse` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Approved parent A17–A20; batch D contains all Hub changes in one PR against Hub `master`. Source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`.

## Summary

Add versioned approval transactions, owner-bound dispatch receipts, and a selected due-job runner to the current Pulse services. A strict worker freezes the exact personal-agent/gateway target before one admitted `cron.add` attempt. UI reads authoritative receipts after reconnect. Batch C qualifies explicit gateway binding; batch E stacks on D for digest additions.

## Technical Context

**Language/Version**: Strict TypeScript; Svelte 5/SvelteKit 2; exact versions from frozen `bun.lock` during implementation.

**Primary Dependencies**: Drizzle PostgreSQL, Supabase Auth, existing WebSocket RPC, action runtime, shared UI and Paraglide. No SDK upgrade or new scheduler.

**Storage**: Real PostgreSQL domain tables plus `bg_jobs`; legacy compatibility rows are not authority.

**Testing**: Vitest actual route/service callers; disposable PostgreSQL two-connection/process crash tests; critical-journeys mounted fixture and browser-harness.

**Target Platform / Project Type**: Hub web application and trusted server tick.

**Performance Goals**: Tick total at most 50s; selected candidates at most 20; no unbounded queue scan, RPC in DB transaction, or infinite retry.

**Constraints**: Default disabled worker scope; strict personal owner; current authority; no paid/production tests; remote uncertainty never retried; frozen-lock qualification.

**Scale/Scope**: Existing Pulse surfaces, one configured owner/org selected worker; existing general cron consumers preserve omitted-agent behavior.

## Constitution Check

I: specification → plan → tasks → independent two-pass review before code. II: source anchors and AS-IS/TO-BE/DELTA trace A17–A20. III: owner explicitly batches four slices in one D PR; this is the sole packaging exception, not permission to mix repositories. IV: existing Pulse view/write/nav gates, owner privacy, route contract, all changed copy through `m.*()`, i18n compilation and UI lint required. V: approved parent plus explicit continuation covers implementation; human merge and deployment/live gates persist. Check repeated after design: no unresolved violation.

## Project Structure and exclusive ownership

| Area | D-owned paths |
|---|---|
| Domain schema/migration/seed | `src/server/db/pg-schema/pulse.ts`, new `pulse-dispatches.ts`, `bg-jobs.ts`; `supabase/migrations/20261023010000_pulse_dispatch_receipts.sql`; `scripts/qa/seed/{pulse,index,matrix,ids}.ts` |
| Decisions and receipts | `src/server/services/pulse.service.ts`, new `pulse-dispatch.store.ts`, `pulse-dispatch.authority.ts`, `pulse-action-contract.ts`; `src/routes/api/pulse/proposals/[id]/+server.ts`; new `.../[id]/receipt/+server.ts`; existing proposals/count endpoints |
| Worker and strict transport | `src/server/services/bg-runtime.ts`, new `pulse-dispatch.worker.ts`, `pulse-worker-config.ts`, `pulse-tick.ts`; `src/lib/server/gateway-rpc.ts`; new `/api/pulse/tick/+server.ts`; `src/lib/server/cron-auth-path.ts` |
| Current authority / cleanup | Narrow helper in `src/server/services/rbac.service.ts` sharing current role semantics; cancellation hooks in `src/server/services/user.service.ts`; no unrelated auth refactor |
| UI/current callers | `src/routes/(app)/pulse/+page.{server.ts,svelte}`, `src/lib/state/features/pulse.svelte.ts`, `src/lib/components/layout/NotificationsPopup.svelte`; new `src/lib/components/pulse/PulseReceipt.svelte`; `messages/{en,es}.json` |
| Governance/proof | Pulse entries in `src/lib/routes/{route-design-manifest,route-access-registry,capture-fixtures}.ts` as needed; existing nav gate verified; focused tests named in tasks; `tests/fixtures/critical-journeys/PulseFixture.svelte`, fixture build/serve and E2E suite; `docs/pulse-dispatch.md` |

No D changes in Gateway; C owns [cron-binding.md](../107-harness-gateway/contracts/cron-binding.md). No E implementation until parent stacks E on the D commit. E may subsequently extend D-owned page/schema/tick/seed/localization files; one owner at a time. D publishes [shared.md](contracts/shared.md) as the stable seam. Internal publication implementation belongs to E in a new file, avoiding duplicate D service edits.

## Phase 0: Source-backed design

Read [research.md](research.md). Record hashes of current source, lock and relevant tool schemas. Audit all `pulse.approve/dismiss`, `editPayload`, `markApproved`, `runTick`, and `advanceJob` callers. Check exact installed SDK/runtime types and current route access manifest. Preserve existing work and package-manager choice.

## Phase 1: Transactional foundation

Implement [data-model.md](data-model.md) with migration+seed, apply twice to marked disposable PostgreSQL and compare invariants. Add transaction-taking enqueue without granting global job access to domain roles. Proposal decision locks first; freeze authority/action after checks; insert dispatch and job in the same transaction; decision status commits last within that transaction. Lock order is job (for worker), then proposal/dispatch and current authority rows in a consistent order. External resolution occurs outside; reread row bindings inside before admission. Avoid lock cycles by making routes acquire the same domain order and never lock a job while holding a domain lock already owned by another worker.

## Phase 2: User journeys

US1: atomic edit/approve/dismiss with expected revision; validate installed calendar/reminder contracts and personal-org eligibility; stable receipt returned.

US2: owner-scoped receipts and recent decisions, current state callers including popup, EN/ES localized status, keyboard controls, committed-refresh recovery. Keep pending-count semantics; owner filtering is applied consistently to feed/count/detail. Reuse current action runtime and semantic primitives.

US3: selected type/org/owner/due SQL before limit, same claim predicates/generation, explicit `postponeUntil`, truthful advancement result, strict credential path and registered dispatch handler. D tick authenticates through existing cron path and only runs configured dispatch family. E extends it later; no production schedule is installed. Qualification record pins assigned gateway ID/channel/build and evidence revision; missing/mismatch disables executable admission. No generic fallback or version guess.

## Phase 3: Verification and handoff

Follow [contracts/validation.md](contracts/validation.md), then full Hub gates and browser proof. Record red-before/green-after for useful seams, actual SQL isolation, migration rerun, runtime crash points, source/dependency/build hashes and review results. Deliver one D PR; keep Gateway qualification/deployed identity separate from fixture checks. If an approved acceptance is not met, implement it or escalate with concrete evidence; do not label a helper-only pass complete. Parent owns open-item proposal/indices if an unavoidable gap remains, and implementation must place `TODO(handoff)` at the exact site.

## Complexity Tracking

Only owner-directed PR grouping differs from the constitution. Small domain receipts plus existing runtime are sufficient. No global authority-version service, distributed limiter, generalized workflow engine or new scheduler is introduced.
