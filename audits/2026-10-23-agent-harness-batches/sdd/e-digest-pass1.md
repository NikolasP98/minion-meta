# E digest SDD — independent technical pass 1

Date: 2026-10-23. Reviewer: `/root/astra_sdd_chat_evals` (Astra). **Standards: APPROVED. Spec: APPROVED.** No blocking or required SDD-revision findings; one nonblocking installed-SDK implementation note below.

## Evidence identity and scope

Source review is against Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; D/E branches are `feature/agent-harness-d-pulse` and `feature/agent-harness-e-digest`. Both have `bun.lock` SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` and identical Hub AGENTS SHA-256 `782e8f2c953134200af218064c46a4f6231864ecc6d0c050936e00314c7ec8a4`. Meta artifacts are in the delegated `f-evals` checkout. The approved parent §§0–12 governs scope; source changes in other groups were not edited. This reviewer did not author D or E, did not consult the other independent review, and spawned no children.

Read Hub instructions, MINION engineering/testing/change-safety and technical-writing guidance, UI governance, the complete assigned SDD artifacts and normative parent requirements. Revalidated all 19 authored hashes against `pulse-digest-report.md` at entry and before disposition. Actual repository metadata/heading/topic helpers, local-link/placeholder checks and sequential task checks passed. No runtime tests, database migrations, source fetch, provider request, browser acceptance, branch operation or commit was performed. This is approval of the reviewable implementation contract, not proof that its planned tests pass.

Review covers A21–A25/A32 and D's provider contract. E is one dependency-marked draft PR against canonical Hub `master`, built on D's implementation commit with D...E scope review and combined-tree tests. Shared schema/runtime/UI/seed/localization changes serialize after D. This approval does not permit merging the dependency, installing the schedule, activating the owner policy or making a paid call.

Installed source was checked directly: `ai` **7.0.18**, `@ai-sdk/openai` **4.0.9**, `@minion-stack/shared` **0.9.0**, Node **22.23.3**. SHA-256: OpenAI `dist/index.js` `650573fcc0a2bd0573fc9bf044aaf3bc713f2c251dd75e71ce1114e554427d50`; OpenAI `dist/index.d.ts` `9d7f30b4c02361ffe0c3be76dad748979600b08150b0471bdc6270472b5e4d23`; AI `dist/index.d.ts` `c0e37215dd20dcd6cc8d5873c442ff8d65841c0c2d73bc91d4d3177d3a868a3f`. These establish available adapter seams, not live provider qualification.

## Standards

Approved. The 30 tasks map every assigned acceptance to owned software and actual integration proof. The design uses existing PostgreSQL/runtime/metering/UI facilities, new narrow domain records and no general crawler, scheduler service or preference/learning engine. Schema changes pair with QA seeds; real restricted-role/migration/SQL tests, current owner/capability gates, EN/ES primitives/action runtime and browser evidence remain mandatory. Disabled/zero-spend defaults, local provider/source fixtures and distinct activation/provider/claim-support gates preserve the approved scope.

D's `withOwnership` → `withOrgCoreTransaction` → restored bookkeeping role is viable in existing code (`bg-runtime.ts:263–289`, `with-org-core.ts:25–65`, `job-effects.service.ts:375,423`). E's publication contract explicitly uses the same transaction for card/checkpoint/run/job. Its plan also handles the runtime's later finish as a no-op after terminal commit; no second independent transaction is mistaken for atomic publication.

## Spec

Approved. No assigned acceptance was replaced by helper-only evidence or deferred software:

| Acceptance / boundary | Reviewed source-backed behavior and proof |
|---|---|
| A21 policy and strict source transport | Existing `src/server/services/ssrf-guard.ts:147–219` allows operator suffix bypass and checks DNS before a separate fetch; image fetch has different limits. E intentionally supplies a narrow request-local HTTPS lookup/validated socket/SNI path without those bypasses, with exact endpoint allowlist, all-address rejection, bounded redirects/bytes/time and two-request concurrency. T006–T009 test actual collector/transport including mixed/rebound/mapped addresses, stalled/compressed bodies, conditional 304, unchanged timestamp-independent content, and no cursor advance on partial failure. |
| A22 admission and budget | Domain unique input lookup precedes D transaction-taking enqueue. Namespace row lock atomically admits one attempt/active slot with integer upper exposure and daily count. Identity survives policy revision and UTC rollover; old attempt/day/generation cannot release successor spend. T003–T005/T010–T011/T014 use real competing connections, schema/RLS and unknown/retired-state cases. No inference occurs inside SQL locks. |
| A23 real metered single request | Existing `src/server/llm.ts:29–50,63–102,122–123` centralizes transport/metering but lacks the proposed bounds and durable receipt. Installed SDK offers injected fetch, maxOutputTokens, maxRetries and AbortSignal. T002/T012–T014 explicitly implement and qualify the opt-in wire path, one no-tools request/1024 tokens/30 seconds/no retry/fallback, bounded request/response and receipt before custom/SDK parse loss. Unknown cost is indeterminate and fences the namespace; known invalid response keeps the bill; received recovery makes no second call. Counted child-process/stub tests are required by T018. |
| A24 atomic publication and ingress | Current `pulse.service.ts:22–40` starts its own transaction and skips conflicts without immutable readback; E adds the transaction-taking helper instead. Complete org/owner/run/policy/input/result/content binding, source CAS, card and terminal run/job commit together. Conflict rolls back or terminalizes superseded with no stale card/cursor; decided content stays immutable. Actual `pulse-ingest-contract.ts` and Gateway ingest route reject reserved prefix/internal authority fields. T015–T018 inject faults around real SQL/route boundaries. |
| A25 feedback/UI/export | Explicit same-owner content revision/client action binding, append-only correction with one successor, strict six-reason enum and 500-character comment, bounded owner+export-capability JSONL output. T019–T022/T029 exercise actual SQL/routes and current card/receipt components, including concurrent corrections, stale/cross-owner denial, keyboard EN/ES, failed-save retention and committed-refresh reconciliation without second write. Export is read-only and separates fact_error from preferences. |
| A32 genuine closed-client producer | Current `/api/jobs/tick/+server.ts:42–53` skips background jobs by default and has no collector. E extends D's separately authenticated fixed-scope route: first due poll/15-minute cadence, 30-second generation lease, 15-second aggregate public fetch, failure retry after 5 minutes, then selected drain within 50 seconds. Require 30 seconds plus 2-second settlement allowance before model admission; no generic 25-second clamp or hot loop. T023–T026 invoke the shipped script/template against the actual route from an empty queue with clients closed; duplicate ticks/restart, visible card and untouched older unrelated backlog are observed. Template ships uninstalled. |
| Retention/revocation and D/E seam | T027 wires actual user/config cancellation to job/collection generations and bounded 100-row/tick housekeeping. Raw evidence/response/comments expire without erasing admission/cost/retirement identity. Worker rereads authority independent of cleanup. D's shared helper signatures, budget signal and transaction role restoration are explicit; E stacks before editing shared files. |

### E1-N1 — nonblocking: pin the installed provider API in T002/T013

The current metered factory calls `openrouter()(modelId)` (`src/server/llm.ts:122–123`). In installed `@ai-sdk/openai` 4.0.9, `dist/index.js:8326–8342` makes that default the **Responses** model; `.chat(modelId)` is separately available (`dist/index.d.ts:1129`, factory assignment near `index.js:8373`). Thus a test asserting only JavaScript `maxOutputTokens`/`maxRetries` options could miss a different endpoint/body from the intended profile.

Smallest implementation action: T002's frozen provider-contract fixture must name exact endpoint and serialized body; T013 chooses the matching existing opt-in adapter (for a Chat Completions profile, `.chat(modelId)`) and keeps ordinary callers unchanged. T012 must count the actual request and inspect output/fallback/no-tools fields plus raw usage retention through the injected transport. The contract already requires that wire qualification and denies unsupported profiles, so this is **not a blocker or a request to repair unrelated LLM callers**. Live endpoint/billing claims remain a separately approved operational qualification.

The same-origin guard already required by `contracts/digest.md:51` belongs in the actual JSON feedback handler and route negatives, not an assumption about generic hooks. Recovery from a 304 after retained evidence was redacted must remain explicit failure or a newly bounded full fetch; it cannot invent unchanged evidence. Both are existing contract obligations for implementation review.

## Canonical G2 scores

Assessed over original bounded Slices 21, 22, 23, 24, 25 and 32, packaged in one authorized E PR. The entire batch is not scored as a single 4–8-hour slice.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Original source/admission/reasoning/publication/UI/collection slices remain separable; exact SDK and scheduler/crash qualification are substantial. |
| dod_verifiability | 9 | Complete acceptance matrix uses observable request counts, SQL invariants, source limits and closed-client card proof. |
| scope_containment | 9 | One owner/policy, existing jobs/metering/UI, no autonomous expansion or activation. |
| impact_zones | 9 | Hub SQL/API/LLM/UI plus D interfaces and deployment template ownership are explicit. |
| collisions | 8 | D dependency and shared schema/tick/page/seed/localization/fixture edits are identified and parent-serialized. |
| testability | 9 | Exact focused commands cover actual DNS/HTTPS/provider adapters, real SQL, process failures and shipped scheduler script. |

Equal-weight mean: **8.5 / 10, pass**. These scores assess the SDD, not runtime readiness.

## Exact reviewed artifacts

| Meta-relative file | SHA-256 |
|---|---|
| `specs/109-harness-digest/checklists/requirements.md` | `459007f7ab5f9c0c083d4964cbb4cb595fb19d46b31b30abe81b78654fe6d50a` |
| `specs/109-harness-digest/contracts/digest.md` | `8f857d926b91127dfb4a903cd7d76ed2a0e51b494797f77d377aee573195d837` |
| `specs/109-harness-digest/contracts/validation.md` | `04ecc81d86b6cba2be3a289fbb7327de67c02e9b646c19449bca80a5cfee5ccf` |
| `specs/109-harness-digest/data-model.md` | `49e8df968841c8781fd06599e4ecc767074a450e9880430940be0a932c4d945b` |
| `specs/109-harness-digest/plan.md` | `496056737f51b774a0c7b55a8b2aedce67b572d56c3d277682648c793a4b80b9` |
| `specs/109-harness-digest/research.md` | `181e2cd87b2e60889f5c88e29ab5b809e1118ffb50340369e1bda70d1270fd5f` |
| `specs/109-harness-digest/spec.md` | `cc06e7bff979aba0bf9f2d5ea27c2cab2e965ee99541f5a7b4e403f5ebc91fb7` |
| `specs/109-harness-digest/tasks.md` | `6964546c73968567f4e6f4e738a061fad08e4bbcd47949c4550d2ba3241532fc` |
| `specs/2026-10-23-harness-digest-spec.md` | `af3c2f9a73e342dd17377e051e4f8193eec9edcc31258349378062de98f390fc` |

## Disposition

**Pass 1 approved at these exact hashes.** No author revision is required by this pass. Carry E1-N1 into the already-required installed-wire qualification. The second independent approval and verified D implementation commit remain prerequisites to E runtime work. No merge, paid call, schedule installation, activation or deployed factual-quality claim follows from this review.
