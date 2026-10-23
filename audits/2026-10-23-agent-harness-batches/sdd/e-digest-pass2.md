# E Digest SDD — independent technical pass 2

Date: 2026-10-23. Reviewer: `/root/astra_pulse_digest_pass2_recovery` (Astra). **Standards: APPROVED. Spec: APPROVED.** No required E artifact revisions. One installed-adapter qualification note reinforces existing T002/T012/T013, without expanding scope.

## Evidence identity and limits

Reviewed all `specs/109-harness-digest/` artifacts and its board stub, approved parent A21–A25/A32, D's shared transaction/worker contract and the actual Hub source. The reviewer did not author these artifacts, spawned no children, and changed no spec, package, index, runtime, branch or commit. Prior pass-one reports were read as context; the source and installed-adapter checks below are independent.

Hub source is `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; E branch `feature/agent-harness-e-digest`. `bun.lock` SHA-256 is `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`. All 19 authored D/E files still match `pulse-digest-report.md`; the exact nine E hashes are below. D and E working trees were clean at inspection. The artifact identity is their frozen hashes, independently of parent-owned meta commits.

This approves the implementation contract, not runtime readiness. No digest implementation, SQL migration/concurrency suite, application/browser test, real source fetch, live model call, provider billing qualification, cron installation or production operation was performed. The one SDK probe used a supplied in-memory `fetch`; it performed zero network requests and zero paid inference.

## Standards

Approved. E reuses the existing job ownership and metered model boundary, adds narrow domain records rather than a general orchestration service, pairs schema work with guarded QA seeds, and requires real PostgreSQL/RLS/crash tests and actual mounted/browser evidence. Current owner/capability gates, immutable provenance, EN/ES, UI primitives, route contracts and scoped export are explicit. Disabled/zero-spend configuration and separate activation/live-provider/claim-support gates preserve the approved parent scope.

E remains one dependency-marked draft PR against canonical Hub `master`, stacked on D's verified implementation commit, with D...E change review and combined-tree regression evidence. Shared runtime/schema/seed/UI/localization ownership serializes after D. D pass two currently requires D2-01 for an omitted existing notifications-page Pulse consumer; this does not invalidate E's unchanged domain contract, but E runtime work remains held behind the revised D approvals and verified implementation dependency.

## Spec

Approved. The contract provides viable owned transitions and observable tests for every assigned acceptance:

| Acceptance / challenged boundary | Evidence and resolution |
|---|---|
| A21 strict connection-bound source fetch | Existing `ssrf-guard.ts:169–174` permits operator suffix bypass; `:195–211` resolves before the later fetch at `:235–241`; the image helper reads the full body before its actual size check at `:264–266`. E deliberately does not inherit those semantics. `contracts/digest.md:13–17` requires exact allowlisted HTTPS endpoints, all-address rejection, request-local lookup, validated socket destination, original hostname certificate/SNI, no ambient proxy/private bypass, bounded redirects and original total byte/deadline budgets. Tests cover mixed/rebound/mapped addresses, compressed/stalled bodies and aggregate concurrency. No general SSRF subsystem rewrite is needed. |
| A21 identity and limits | Policy fixes present-dependency anchors, repository/lock identity and at most five sources. Evidence is deterministically ordered, capped at 20 items/49,152 UTF-8 bytes, with full request capped at 65,536 bytes. Fetch timestamps do not create new logical input. Failed/partial or 304-without-retained-evidence cases cannot advance cursors or be treated as unchanged. Deterministic no-signal uses the same run/job settlement path with zero model calls. |
| A22 durable admission | Stable org/owner/budget namespace is independent of policy revision; domain unique lookup and enqueue use the same transaction. Namespace locking enforces one active attempt, five admitted calls/day, approved integer exposure and outstanding unknown fence across midnight/revision. Exact run/attempt/generation/admitted-day settlement cannot release a successor. Real independent connections, restricted roles and retired-namespace replay cases are explicitly required by T003–T005/T010/T011/T014/T027. |
| A23 one real metered request | Current `llm.ts:29–50` exposes a fetch shim, and `:65–110,122–123` wraps accounting, but it supplies neither durable receipts nor this pilot's bounds. Installed SDK supports the required opt-in transport and request controls; probe details below. E T002/T012/T013 require exact wire qualification, one no-tools request, 1,024 output tokens, 30s total timeout, no automatic retry/fallback, bounded response and raw terminal receipt before parser loss. Unknown bill is not estimated or relabeled zero; it fences the namespace and does not publish. Known invalid response retains its bill. Received recovery validates stored bytes without another call. |
| A24 publication atomicity | Current `pulse.service.ts:22–40` opens its own transaction and skips conflicts without immutable readback. E's `pulse-publication.ts` contract replaces that for internal cards with a transaction-taking helper and complete org/owner/run/policy/input/result/content binding. `contracts/digest.md:47` places card, all source CAS, terminal run and job in one owned transaction. A rollback leaves no partial card/cursor; newer cursor commits superseded only. `plan.md:55` explicitly makes the runtime's later finish a no-op after terminal commit. D's role-restoration seam is already present in `with-org-core.ts:25–60` and demonstrated by `job-effects.service.ts:375–400,423–430`. |
| A24 internal ingress | Existing `pulse-ingest-contract.ts:105–143` admits user dedup keys and arbitrary JSON payload. T017 expressly owns rejecting the reserved prefix/internal authority fields through the actual Gateway ingestion route, while preserving ordinary external information. Decided/internal card content remains immutable. Structural citation validity stays separate from factual entailment/pilot promotion. |
| A25 feedback and export | `contracts/digest.md:51–55` binds exact rendered content revision, owner/actor/run/policy/source and client action ID; correction appends one successor with scoped constraints. Six reasons and 500 Unicode characters are explicit, independent of approve/dismiss. Existing RBAC already models `export` (`rbac.service.ts:69–70,245–258`); E requires owner plus Pulse export capability, keyset <=100 rows/256 KiB JSONL and factual-error/preference distinction. Real routes/SQL, concurrent corrections, stale/cross-owner denial, retained draft and one-write refresh recovery are assigned to T019–T022/T029. |
| A32 real scheduled empty-queue producer | Global `/api/jobs/tick/+server.ts:32–42` authenticates the secret but skips background jobs unless opted in. E extends D's distinct exact-auth/fixed-scope tick and explicit handler registration. Durable poll due/generation/30s lease, first immediate poll, 15min success/5min failure, <=15s collection, concurrency two and <=50s total are specified. The selected worker starts inference only with >=32s remaining, avoiding the existing global 25s clamp. T023–T026 call the shipped script/template against the actual local route from an empty queue with clients closed, duplicate ticks/restart and >20 unrelated older jobs. Template existence alone is not activation proof. |
| Revocation, retention and authority | Actual membership deletion/reconciliation callers are `user.service.ts:205–215,280–315`. E extends D's scoped cancellation, fences job and collection generations together, and independently rereads current membership/module/grants before admission/publication. Thirty-day raw evidence/response/comment redaction is wired into bounded <=100-row housekeeping inside the tick budget. Minimal cost/admission/hash identity survives and tombstones cannot be deleted before namespace retirement. Late work cannot release or publish through a successor's generation. |

The same-origin feedback mutation guard is already normative at `contracts/digest.md:51` and must be tested at the actual JSON handler. Existing hooks should not be mistaken for that guard. A source 304 after raw evidence retention expiry must fail explicitly or use a newly bounded full fetch; no evidence may be invented. These are existing obligations, not new SDD findings.

## Installed adapter challenge — nonblocking E2-N1

Verified installed Node `22.23.3`, `ai` `7.0.18`, `@ai-sdk/openai` `4.0.9`, and `@minion-stack/shared` `0.9.0`. OpenAI package `dist/index.js` SHA-256 `650573fcc0a2bd0573fc9bf044aaf3bc713f2c251dd75e71ce1114e554427d50`; OpenAI `dist/index.d.ts` `9d7f30b4c02361ffe0c3be76dad748979600b08150b0471bdc6270472b5e4d23`; AI `dist/index.d.ts` `c0e37215dd20dcd6cc8d5873c442ff8d65841c0c2d73bc91d4d3177d3a868a3f`.

Executed an inline Node module importing the installed `createOpenAI` and `generateText`. A caller-supplied in-memory fetch recorded the request and returned a synthetic 429. Both paths used `maxOutputTokens:1024`, `maxRetries:0`, no tools and a local abort signal:

| Model constructor | Recorded synthetic endpoint | Serialized output field | Requests after synthetic 429 |
|---|---|---|---:|
| `provider('fixture-model')` | `https://fixture.invalid/v1/responses` | `max_output_tokens:1024` | 1 |
| `provider.chat('fixture-model')` | `https://fixture.invalid/v1/chat/completions` | `max_tokens:1024` | 1 |

This independently confirms pass one's API distinction: the current `getOpenRouterModel` bare provider call selects Responses (`OpenAI dist/index.js:8326–8342`); `.chat` is a separately available API (`dist/index.d.ts:1129`). The probe proves local serialization and zero SDK retry for this synthetic 429 only. It does not prove OpenRouter fallback control, real model output enforcement, resolved-model identity, authoritative billing, durable response storage or the future Hub digest adapter.

T002's provider-contract fixture must therefore select the exact approved API/endpoint/body; T013 must configure the opt-in factory and fetch shim accordingly while retaining metering and leaving ordinary callers unchanged. T012 must inspect the resulting wire routing/no-fallback fields and raw usage capture. Unsupported profiles fail closed, as already required. No dependency upgrade or unrelated LLM repair is needed to make this contract implementable. An initial package-version query hit `ERR_PACKAGE_PATH_NOT_EXPORTED` for shared/package.json; direct read of the installed package manifest then confirmed 0.9.0 without changing packages.

## Canonical G2 scores

Scored over original bounded slices 21–25 and 32 grouped into one E PR by the owner, rather than treating the entire group as one short slice.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Six coherent slices; provider, crash and scheduled proof are substantial. |
| dod_verifiability | 9 | Every acceptance names actual SQL, route, request-count or mounted observable outcomes. |
| scope_containment | 9 | One personal owner/policy; existing jobs/metering/Pulse; no activation or general platform. |
| impact_zones | 9 | Source transport, SQL, provider, ingest, UI, scheduler and D seams have explicit owners. |
| collisions | 8 | D prerequisite and shared file/fixture/localization serialization are explicit. |
| testability | 9 | Actual installed adapter, disposable SQL, process crashes, script-to-route scheduler and component tests are specified. |

Equal-weight mean: **8.5 / 10, pass**. Scores do not claim implementation or operational evidence.

## Documentation validation

All 19 authored hashes match at review and report creation. Actual exported frontmatter, required-heading, scalar/array and slice-topic checks report no errors for both board stubs. All local artifact Markdown targets exist. E tasks are sequential T001–T030 and remain unchecked; D tasks are T001–T026. Confirmed the declared Hub check/test/build/i18n/design/token/critical-journey/seed-verification entrypoints exist. No full index regeneration or repository-wide gate is claimed; parent owns registration.

## Exact reviewed E artifacts

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

**Pass 2 approves these exact E artifacts.** E2-N1 belongs to already-required installed-wire qualification, not an author revision. E runtime development remains gated by D's corrected two-pass approval and verified implementation commit. Human merge, production migration, schedule installation, owner activation, live/paid inference and sampled factual-support promotion retain their separate authorization/evidence requirements.
