# Implementation Plan: Bounded dependency digest in Pulse

**Branch**: `feature/agent-harness-e-digest` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Stack E on D's verified implementation commit. Add one owner-scoped digest policy, safe public source snapshots, domain admission/budget receipts, one bounded metered request, atomic Pulse publication, reasoned feedback and durable source polling in the existing Pulse tick. Ship one E PR; no activation or paid test.

## Technical Context

**Language/Version**: Strict TypeScript, Svelte 5/SvelteKit 2, Node 22.23.3/Bun 1.3.4 parent setup receipts; verify current checkout identity.

**Dependencies**: Existing Drizzle/PostgreSQL/Supabase, AI SDK and OpenAI adapter through `$server/llm`, Node HTTPS/DNS APIs, shared UI/action runtime/Paraglide. `bun.lock` exact install; no dependency upgrade assumed.

**Storage**: Four narrow domain tables plus D proposal metadata and existing bg_jobs. No vector effect table or general trace store.

**Testing**: Vitest real route/collector/worker; marked disposable PostgreSQL; stub DNS/HTTP/provider; child-process crash recovery; local scheduler fixture; browser-harness and critical journeys.

**Platform/type**: Hub web app and trusted HTTP scheduled worker.

**Bounds**: 5 sources/20 items/48 KiB normalized input; 1 MiB fetch response, 10s each/15s collection total, 2 concurrent fetches; one 30s model request/1024 output tokens; 5 calls/day and approved budget; tick 50s; poll lease 30s/cadence 15min/failure 5min; 30-day raw retention.

## Constitution Check

I/II: source-backed spec/plan/tasks and independent two-pass review before runtime changes. III: one E PR for six parent slices is owner's explicit grouping exception; E stacks on D, then targets registered `master` once D base is reconciled. Parent handles stacking/retargeting; never duplicate D changes as E-owned work. IV: same Pulse module/view/write/nav/owner gates; EN/ES Paraglide and design/token lint; route manifest/fixtures updated. V: approved-parent implementation authority applies; merge/production migration/schedule installation/pilot activation/live inference remain gated. Post-design: no new scope or unresolved product choice.

## Project Structure and ownership

| Responsibility | E-owned paths |
|---|---|
| Domain schema | New `src/server/db/pg-schema/pulse-digest.ts`, `pulse-feedback.ts`; `supabase/migrations/20261023020000_pulse_digest.sql`; extend `scripts/qa/seed/{pulse,index,matrix,ids}.ts` after D |
| Policy/sources | New `src/server/services/pulse-digest.policy.ts`, `pulse-digest.sources.ts`, `pulse-digest.fetch.ts`; `src/server/pulse/digest-policy.example.json`, source/dependency fixtures under `src/server/test-utils/fixtures/pulse-digest/` |
| Admission/reasoning/publication | New `pulse-digest.store.ts`, `pulse-digest.worker.ts`, `pulse-digest.reasoning.ts`, `pulse-publication.ts` in services; narrow opt-in factory options in `src/server/llm.ts`; reserved ingress validation in `pulse-ingest-contract.ts` |
| Feedback/export | New `pulse-feedback.service.ts`; `src/routes/api/pulse/proposals/[id]/feedback/+server.ts`; `src/routes/api/pulse/feedback/export/+server.ts`; `src/lib/components/pulse/PulseFeedback.svelte`; existing Pulse page/receipt integration |
| Collection/scheduler | New `pulse-digest.collection.ts`; extend D `pulse-tick.ts`, `pulse-worker-config.ts`, `/api/pulse/tick/+server.ts`; new `deploy/pulse-tick.cron.example`, `scripts/ops/pulse-tick.sh`, `docs/pulse-digest.md` |
| Retention/cancellation | Extend D scoped cancellation helper for digest rows/collection generations; current `user.service.ts` hooks remain one shared caller path; policy reconciliation and bounded tick housekeeping |
| Governance/proof | `messages/{en,es}.json`, Pulse route/capture manifest as needed; new focused test files named in tasks; existing critical-journeys actual component fixture; scheduler fixture test |

D owns selected runtime, strict dispatch and shared schema/read interfaces; E consumes [D/E contract](../108-harness-pulse/contracts/shared.md). E does not rewrite D background runtime or duplicate its migration. If exact installed interface differs, align contracts with D author/parent before using it. Source policy lives in server-only files; no secrets in repository policy examples or browser bundles.

## Phase 0: Qualification

Confirm D commit/source-lock provenance and exact declared dependencies. Inspect installed AI SDK option/result types and current OpenRouter adapter wire shape locally; test actual wire payload through a stub. A model call with unproven output/retry/fallback/price bound is denied. Verify calendar dispatch work is outside E. Read [research](research.md), [data model](data-model.md) and [runtime](contracts/digest.md).

## Phase 1: Source and domain foundation

Add strict policy parsing and a repository-managed disabled official-source template. Build normalized evidence against a pinned dependency manifest. Use a connection-bound Node HTTPS lookup/stream reader for exact endpoints; enforce all IP classes, SNI, byte/deadline limits and no implicit proxy/private exception. Tests replace transport inside the module under fixture mode, never a production config bypass.

Apply migration+seed twice locally. Unique run lookup precedes enqueue; lock stable admission namespace for current policy/owner/retirement. D transaction-taking enqueue inserts only new runs. Polling state persists in the admission row. No source cursor advances during collection.

## Phase 2: One-request processing and atomic publication

Under D `JobExecution.withOwnership`, reread current authority, freeze attempt and reserve approved exposure before external dispatch. Use the existing metered model factory with opt-in bounded transport settings; no parallel unmetered SDK. Return from external call, persist bounded terminal receipt and usage in a short owned transaction before schema/reference validation. Schema-invalid known receipt fails without recall; unknown receipt/bill fences namespace and becomes indeterminate. Recovery of received result uses stored bytes only.

Publication uses E's `insertInternalPulseProposalTx` within the same ownership transaction: domain RLS scope, full binding readback, checkpoint CAS, run terminal write, restore bookkeeping role, update matching bg job terminal/cursor. Any failure rolls all back. The runtime's later finish write may be a no-op after the committed terminal state; it cannot overwrite it. No-signal commits checkpoints/run/job with bounded reason and no card. Stale cursor terminalizes superseded without a card or cursor write.

## Phase 3: Owner review and cold-start operation

Add owner-scoped feedback with idempotent action IDs and append-only correction, explicit reason independent of decision, localized controls and recovery. Export is owner+`pulse:export` gated and separates factual-error and preference/relevance records.

Extend D's tick to collect due policy first, then drain configured dispatch/digest families with remaining time. A minute cron template invokes the authenticated route from a script reading existing secret configuration. Template remains uninstalled. Local scheduler fixture starts with empty queue and no client producer; authenticated ticks create work from a changed stub source and produce one card. Full deployment schedule proof is separate. The 30s model bound must fit remaining 50s tick with local settlement allowance; otherwise leave queued for the next minute rather than falsely timeout or hot-loop.

## Phase 4: Validation and handoff

Run [validation procedure](contracts/validation.md), all Hub gates and actual browser UX evidence. Record migration/seed hashes, base D commit, source/lock/installed SDK versions, fixture cron command/logs, every crash point and acceptance trace. Independent Standards and Spec code reviews must inspect actual route/worker/publication callers. Parent creates one stacked E PR and later retargets after D; no merge/deploy/live operations follow automatically.

## Complexity Tracking

One owner, one policy namespace, existing runtime, one metered model request, one card and reasoned feedback. No generalized workflow, crawler, automatic learning, preference database or new scheduler daemon. Shared interface work stays in D; E's new helpers are domain-specific.
