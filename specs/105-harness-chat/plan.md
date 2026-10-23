# Implementation Plan: Owned chat callbacks and decision evidence

**Branch**: `feature/agent-harness-a-chat` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: `specs/105-harness-chat/spec.md`, approved parent A03/A04/A05 and A26 Hub seam.

## Summary

Deliver one Hub PR containing bounded accepted-run ownership, actual router/client evidence, safe self-observation ingestion and the disposable evaluation adapter. Keep all SDD records in the one meta F PR. A is the sole editor of Home, Floating, gateway final handling, chat-rpc and the critical-journeys adapter.

## Technical Context

**Language/Version**: strict TypeScript, Svelte 5/SvelteKit 2, installed Bun 1.3.4 and Node 22.23.3.

**Primary Dependencies**: existing shared gateway SDK, WebMCP-shaped registry, Supabase auth/CoreCtx, server PostHog sanitizer, Vitest and installed browser fixture tooling.

**Storage**: bounded client memory only; analytics is best effort; evaluation files belong to F. No migration or shared-package release.

**Testing**: real route/capture integration; actual gateway/runner/tool seams; mounted Home/Floating; existing critical-journeys browsers and browser-harness inspection.

**Target Platform**: browser client and current SvelteKit deployment runtime; adapter is private local test infrastructure.

**Project Type**: application repair and evaluation fixture support.

**Performance Goals**: retain current 1,500ms client/server router deadlines with separate measurements; no telemetry await blocks chat. Map ≤256 entries/two hours; buffer ≤20 events, ingress ≤20/16KiB/120 events per minute.

**Constraints**: no paid calls, no provider mode activation, no new wire authority. All strings via Paraglide, semantic tokens and current RBAC. Bounds are from parent except documented field-shape implementation choices.

**Scale/Scope**: three remaining chat slices and A26 adapter in one A PR; F has report/corpus/live transport ownership.

## Constitution Check

| Principle | Before research | After design |
|---|---|---|
| I Spec before code | Parent approved; this refinement authored before implementation. | Spec, plan, tasks, contracts complete; two independent passes required before development. |
| II AS-IS/TO-BE/DELTA | Source revalidated at pinned Hub SHA. | Every FR/SC maps to actual runtime seams and tasks. |
| III Slice-scoped delivery | Owner explicitly says one PR per group, six total. | Three implementation slices plus required adapter are serialized in one isolated Hub branch/PR; no branch operations by this author. |
| IV Build/UI/RBAC/i18n | Hub instructions and governance read. | Self-only route wired/tested in RBAC; route inventory disposition checked; UI strings localized; design/token/check/test/build gates required. |
| V Security/data human gates | Parent two-pass approval and explicit implementation authorization recorded. | Refinement gets independent technical review; owner merge/deploy/paid gates remain. |

No constitution waiver is inferred from convenience. One-PR-per-group is the explicit owner's override. Plan's data model and quickstart are stored under `contracts/` to stay within delegated file ownership, not omitted.

## Project Structure

### Documentation (meta F PR)

`specs/105-harness-chat/{spec.md,plan.md,tasks.md,research.md,checklists/requirements.md,contracts/chat-evidence.md,contracts/eval-adapter.md,contracts/quickstart.md}` plus the top-level board stub.

### Source Code (Hub A PR)

- Existing: `src/lib/assistant/{pending-submission,dispatch,runner,model-context,page-context,turn-router}.ts`, `src/lib/services/gateway.svelte.ts`, `src/lib/services/gateway/chat-rpc.ts`, Home/Floating and callback renderers.
- Narrow context producer: `src/lib/sandbox/{tools.ts,host.svelte.ts}` and `src/routes/(app)/sandbox/+page.svelte`; local acknowledged mutation/reload callback and page-owner lease, with existing UI/window reloads unqualified.
- New: `src/lib/assistant/{accepted-runs,decision-events,decision-lineage}.ts` with focused integration tests.
- Existing server: `src/server/services/assistant-router.service.ts`, `src/routes/api/assistant/route/+server.ts`, `src/lib/server/{observability-context,posthog}.ts`, `src/server/auth/rate-limit.ts`, `src/server/services/rbac.service.ts` and tests.
- New route: `src/routes/api/assistant/decision-events/+server.ts`, endpoint test beside it.
- Fixture: `tests/fixtures/critical-journeys/{eval-adapter.mjs,eval-protocol.ts,EvalFixture.svelte,gateway-transport.ts,build.mjs}` plus existing browser journey tests/runner config as needed.

**Structure Decision**: one small accepted-run store, one typed observation buffer/schema and existing production callsites. Contracts are local; do not add a general event bus/queue or duplicate shared protocol types.

## Phase 0 - Revalidation

Use [research](research.md). Inventory all `runAssistantUiCalls`, `sendAssistantTurn`, `requestRouteDecision`, `onChoice` and `onArtifactCallback` callers. Record old callers without optional binding as unjoined compatibility cases. Confirm actual installed SDK `beginRequest` and dependency lock. Identify any already-satisfied acceptance using source plus tests, never merely old audit prose.

## Phase 1 - Design and implementation order

1. A03: implement accepted binding and final-claim integration first. Use red tests that emit actual gateway events, hold `waitForTool/executeTool`, change current owner/page and deliver duplicate/delayed finals. Give accepted runs a controller separate from preparation cleanup; extend signal support additively. Add the private bounded invocation handoff through the actual sandbox tools, host reload and stable page-context lease. Prove positive acknowledged handoff and negative concurrent/reordered user or registry transitions; no global executing flag or DOM-event attribution. Preserve navigation and callback bypass. Update Home/Floating Stop/teardown and explicit callback origin/parent wiring together.
2. A04: introduce service attempt envelope, early header, requested/resolved identity and canonical revisions; change real route/sanitizer together. Keep old nullable decision callers compatible. Test all successful/failure dispositions and unknown cost with the real capture sink boundary.
3. A05: define flat observation schema and bounded client buffer; wire prepared/applied/discarded, transport and run-relation producers. Add strict self-only ingress, current-org/auth/origin/body/weighted-limit checks. Bound only the new observation namespace to 4,096 keys/60-second idle expiry; reject unseen keys at capacity without evicting charged budgets. Record analytics loss separately from fixture receipts.
4. A26-Hub: build the versioned adapter on actual critical-journeys components/transport; reset all disposable state per arm, deny external requests, expose actual envelopes/provider bridge and independent domain receipts. F implements the subprocess client and accounting. Add source hashes and no-reuse proof to builder manifest.

Each phase is independently testable but all deliver in the one A PR. A03 is the first useful increment; it does not replace the remaining required work.

## Cross-group dependencies and collision control

A depends on already-present Slices1–2. F depends on A03/A05 and the versioned adapter; basic F fixture work has no Factory/Pulse prerequisite. C owns complaint producers, F owns their analysis. D/E may also touch critical-journeys builder/browser cases; serialize those shared files through the orchestrator, or add dedicated fixture entry files and integrate builder changes once. A must not overwrite D/E scenarios/report case counts. If a shared type needs change, consult the parent before broad package edits; this design requires none.

## Verification and release evidence

Use [quickstart](contracts/quickstart.md). Focused tests run red before meaningful repairs and green afterward; one deliberate ownership-fence mutation must fail the real gateway/mounted scenario. Endpoint tests execute actual authorization and sanitizer path; synthetic page data is not proof of server RBAC. Installed critical-journeys and separate browser-harness captures cover EN/ES, duplicate/delayed final, Stop, callbacks and context transitions at desktop/compact widths. Run all Hub required checks and design/token lint; zero errors/warnings. No production visit or deployment claim.

F integration records A source/lock/adapter hashes and real subprocess smoke. Missing F integration is an explicitly open acceptance item, not silently marked complete. Implementation open ends require TODO(handoff) at code site plus parent proposal entry before stopping; this SDD author leaves implementation entirely to the assigned developer.

## Complexity Tracking

| Explicit deviation | Authority / reason | Boundary |
|---|---|---|
| One PR for Slices3–5 plus Hub fixture support | Owner's one-PR-per-group directive | Six total PRs; no extra patch-only handoff. |
| Data model/quickstart under contracts | Delegated author owns contracts/*, not extra top-level files | Same required content and executable guide retained. |
