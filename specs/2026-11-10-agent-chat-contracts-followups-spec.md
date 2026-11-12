---
id: 2026-11-10-agent-chat-contracts-followups-spec
title: Deliver remaining transcript-backed assistant contracts
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-10
updated: 2026-11-10
repos: [minion, minion_hub, minion-meta]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
tags: [security, data]
---

# Deliver remaining transcript-backed assistant contracts

## 0. Product

Owner: “ok, proceed with fixes, and lmk when they're live.” This follows the [November 10 recon](../audits/2026-11-10-agent-chat-recon/README.md), which identifies N01–N03 and reconciles R01–R07 with current code. Deliver the remaining fixes, qualify exact source, and report verified production status. Preserve prior authorization for the scoped Gateway guardrail release and its production exception; unrelated JWT/backups must not enter that production delta.

This spec extends the existing transcript proposal and earlier guardrail design; it does not replace their preserved evidence.

**Out of scope:** Raw transcripts, paid model evaluation, real outbound business messages, production business fixtures, historical rewrites, credential rotation, dependency patching, version bumps and npm publication are outside scope. Normal independent review, signed commits, CI and applicable human security/data gates remain. The owner's authorization covers implementation and intended live delivery; gate-specific unresolved consequential decisions must be reported with the exact concrete evidence.

## 1. AS-IS and source identity

- Gateway canonical DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd` lacks the reviewed guardrail candidate. Main is `50a3036ad7fac23710943e7eeadfe66b38d96fcd`. The preserved signed candidate HEAD is `17493538871eaca2a76c41c1ece8b947066b247c`; its nine-file R18 patch recreates tree `5aa9f415000e96ca09c9079211e3c8287829673e` exactly. Restore that work, preserving ancestry and fixes.
- Hub master `206d9ae218efd4bf682d6c4063797c7441f4d52a` already contains validated booking creation, exact booking counts/truncation, strict finance periods/local buckets and pending-run recovery. Preserve those fixes.
- N01: assistant stock catalog/adapter/Gateway/action omit currency even though the native UI supports PEN/USD. Actual-route probes show the action strips USD and passes unconverted rates.
- N02: assistant reschedule creates then independently cancels; preview is syntax-only. Native transactional in-place reschedule exists, but its human policy permits availability overrides, so blindly reusing it would weaken assistant preflight.
- N03: retained receipts contain 11 distinct booking IDs and 4 no-shows; the stored final reports 10 and 3. Duplicate IDs agree and all rows lie in the requested local day. This is historical summarization loss, not a current model replay.
- R02/R06: memory dispatch has no durable acknowledgment; created telemetry can precede sink delivery. Trusted provenance distinguishes external user, inter-session and internal system inputs. Existing scope-removal policy is a hard ceiling; all personal agents cannot safely be inferred business-only.
- R03: finance revenue top15 cannot establish complete quantity winners or margins without costs.
- R04: typed booking creation requires event/resource references that dedicated discovery does not supply.
- R05: claimed UI work is invalidated on reconnect and its result can be silently discarded.
- R07: current changelog guidance already rejects upstream substitution, but on-demand Hub release content remains unavailable to the Gateway tool.

Evidence anchors and executable reproductions are in `audits/2026-11-10-agent-chat-recon/findings.json` and its probe results. Deployment identity/configuration and newer chats remain inaccessible until machine Tailscale reconnects; configured signing must work before publication.

## 2. TO-BE and invariants

An authorized assistant preserves monetary meaning, uses the requested metric and local scope, previews the effect it will commit, reports only receipt-backed outcomes, and makes aggregates agree with authoritative records. It uses typed org-scoped references and reads the correct product's release notes. Interruption exposes confirmed versus unknown effects and never replays a possibly committed write automatically.

Keep organization/principal/field-level authorization, confirmation, local UI effect leases, media/control payloads, native tool calls, cancellation, capped-list disclosure, honest abstentions, tied maxima and business-local dates. No new SQL execution or secret/environment discovery capability is introduced. Changes are additive except rejecting previously unsafe or ambiguous assistant input explicitly.

## 3. DELTA and acceptance by slice

### S1 — Recover and qualify Gateway guardrails (R01)

Restore exact saved candidate state before new edits. Preserve buffered settled windows, synchronous extraction reservations and generation fences; optional personal onboarding; whole-response malformed-protocol uncertainty; mandatory supported-secret redaction after transforms/hooks and at protected text/speech boundaries. Never execute narrated protocol. Keep prior exact-site limitations until executable proof closes them.

Acceptance: native SDK/disk-session recovery, reset/delete lifecycle, concurrent budget, disabled/enabled TTS, controls/media, classic and fine-grained synthetic credentials, supported named secret fields, DSML examples and no false success speech. Run current exact-candidate check/build/typecheck/configured test lanes and actual CI. Qualify the production-main delta independently; exclude DEV-only JWT/backups.

### S2 — Stock currency and rate-basis parity (N01)

Wire fields: optional `currency: PEN|USD`, optional `rateMode: unit|total`. Legacy omitted wire basis is per-unit. Legacy omitted currency preserves the previous org/base valuation meaning; it must not invent USD. Validate enum values, positive finite quantities, nonnegative finite rates and FX availability. Normalize line totals by quantity before calling the existing native `convertEntryRates` with trusted org Finance settings. Preview and confirm use the same normalization/conversion service. Preview `lines` always mean valuation-currency per-unit rates, identified by `valuationCurrency` and `rateMode: unit`; `inputCurrency` and `inputRateMode` identify the user inputs. Direct assistant action drafts persist those input facts alongside native FX provenance. The form-fill path keeps native manual submission unchanged: it submits normalized unit rates and native currency/FX provenance; it does not invent the original input basis after normalization. Confirm still creates a DRAFT only; posting stays a separate human action.

Expose both fields in the assistant fill catalog/adapter. An omitted fill basis retains per-unit input meaning even when the UI is currently displaying totals: convert the newly supplied value into the current display basis. Explicit basis changes use the existing amount-preserving conversion for earlier rows. Reject a currency switch when existing rows already contain rates, before mutating the draft. Empty/unvalued drafts may adopt the requested currency. Reject missing-FX monetary fills visibly. Recheck currency/basis and current effect ownership after asynchronous entity resolution so late results cannot reinterpret user changes.

Acceptance: actual routes and mounted form adapter; PEN/USD, unit/line-total, default compatibility, unsupported enums, missing FX, previous valued rows, async user currency/basis changes, no preview effects, confirmation and draft-only receipts.

### S3 — Atomic assistant reschedule (N02)

Reschedule means move the SAME booking ID, preserving duration, payment/package/series links and existing metadata. Reject conflicting supplied immutable event/contact/attendee/notes fields instead of silently overwriting them. Resource may change through a validated explicit choice. Reject grouped member moves with a clear group-flow error; no partial group operation is invented.

Use shared strict assistant availability preflight, excluding the original booking from busy rows, plus the native in-transaction raw-conflict check. Preserve original duration even if the event-type default changed. Preview validates original/org/contact/resource and HR/hours rules, returns resolved old/new slot/resource/timezone and version `expectedUpdatedAt`, and reserves nothing. Receipt projections whitelist scheduling fields and field-level masked PII; no raw metadata or linked payment details. Confirm requires `expectedUpdatedAt` from preview, locks/revalidates the original and moves atomically. Successful assistant moves advance the timestamp monotonically, including moves in one clock millisecond. Stale versions reject409. Exact same-ID/same-target/resource replay returns persisted no-op success even with the pre-move version. Missing guard is explicit invalid input, prompting preview before another confirm.

Acceptance: actual native-service transaction tests, denied/missing/foreign original, invalid contact, grouped member, overlap-with-self and another booking, hours/holiday/leave, concurrent/stale mutation, rollback on injected failure, same-target retry, preserved duration and linked fields. Native PostgreSQL role/GUC/RLS qualification remains separate from PGlite SQL.

### S4 — Authoritative booking summaries and typed prerequisites (N03/R04)

Extend booking reads additively with total/status aggregates from the SAME filtered SQL statement/snapshot as rows. Count stable booking IDs, not repeated tool windows; expose total across capped data and all statuses, plus clear coverage semantics. Do not turn display names into person identities. Gateway descriptions must direct callers to authoritative aggregates and preserve truncation/count semantics. Add a sanitized synthetic equivalent of the 11-versus-10 retained counterexample; no model-quality claim follows from a deterministic test.

Add `query/booking-options`: authorized scheduling-view principal, explicit bounded list of active event types and eligible active resources with product/event mapping and timezone. Optional selected eventType/date/resource returns existing native availability slots; validate real dates and bound windows/results, disclose caps. Whitelist output fields; no resource email, arbitrary DB read or cross-org fallback. A read is not a reservation; creation/reschedule still revalidates. Gateway exposes the corresponding typed tool and discovers it through its existing manifest/catalog.

Acceptance: same snapshot/status sum, duplicate windows, cap and count-only, inactive/foreign references, ambiguous search labels, resource eligibility, local-day slots/closed days, missing/no slots and authorization denial. Person counts require stable authorized identity or an unavailable statement.

### S5 — Exact metric selection (R03)

Extend assistant finance read with explicit `metric: revenue|quantity|margin` and bounded `limit`, retaining existing fields for old callers. Rank quantity before limiting when quantity is requested; do not sort the revenue-limited subset. Disclose invoice-derived source scope, period, currency grouping, total population, returned/truncated and ties at boundary. Do not combine different currencies as money. Margin is explicitly unavailable when per-product cost attribution is insufficient; do not substitute sale price, revenue or org-wide costs. Preserve field masking and sensitive-cost restrictions, including per-bucket `series.opCost` (not only the summary). Blank/whitespace codes without a product ID cannot create a shared product identity; disclose unidentified item-row exclusions and do not claim whole-business coverage from identifiable invoice items.

Acceptance: low-price quantity winner outside revenue top15, revenue control, zero/missing product cost, mixed currencies, ties/caps, empty scope, void exclusions, period semantics and field-level masking. Tests execute native SQL where practical, not just SQL substring checks.

### S6 — Durable memory outcomes and provenance (R02/R06)

Use stable memory source IDs derived from trusted agent/session/window/memory identity. Await bounded sink acknowledgment and represent confirmed, rejected, unknown, disabled and partial outcomes explicitly. Only confirmed delivery produces created telemetry/local confirmed-memory context. Require the expected accepted count; partial acceptance cannot masquerade as complete success. Unknown effects are not automatically retried. Propagate AbortSignal/deadline settlement so hung providers/sinks do not retain active capacity indefinitely; generation fences still suppress stale completion. Existing Hub upsert identity supports idempotent sink delivery without a migration.

Carry the configured server identity on Hub memory ingest, recall and delete requests through the existing `x-minion-server-id` contract. A body `gatewayId` is provenance, not the authenticated tenant selector; supported shared-token configurations must resolve the configured server rather than the first matching row. Preserve optional legacy identity absence and existing server authorization policy. Qualify the actual emitted request through Hub's authentication and ingest interfaces, including cached identity and invalid-hint controls.

Exclude trusted internal-system/inter-session/workshop auto-extraction from user durable facts; preserve explicit authorized memory tools and user corrections. Automatic KG admission receives only the stripped eligible user prompt, never assistant-only context; explicit remember and diagnostic/custom extractor interfaces remain separate. Automatic durable candidates must identify exact quoted evidence and an eligible external-user message index. Validate the quote against that message deterministically, persist only the attributed user statement rather than an assistant-generated factual paraphrase, and carry `user_statement` provenance. User plans/claims remain attributed statements, never confirmed tool effects. Reject candidates with no verified user quote; explicit memory-tool writes retain their separate receipt-backed contract. This does not claim that a quote is true or that deterministic checks prove model interpretation. Enforce existing explicit scope-removal policy as a hard ceiling. Any additive business profile is opt-in from trusted config, never inferred from an untrusted orgId or all personal-agent IDs. Live business-profile changes require identifying the actual intended agents from current configuration; no blanket developer-agent restriction.

Acceptance: success/rejected/disabled/partial/timeout-after-commit, stable retry source IDs, no false created event, provider/sink abort, concurrent reservations, reset/delete, internal/system inputs, unexecuted promises, explicit memories, existing developer scope and hard-deny precedence. Live configuration restriction is separately verified before calling that item fixed.

### S7 — Interrupted effect visibility and release-note reads (R05/R07)

Keep pending-run recovery intact. When a claimed invocation loses its transport/identity lease, retain only bounded receipt/unknown-effect metadata and expose an interruption notice to the same actor/org/agent/session/host. A later receipt can resolve known outcome for that same owner; it cannot restore a revoked execution capability. User/org/host changes discard/hide the record. Never automatically replay UI effects or send a fresh write-bearing continuation from retained history. Read-only reconciliation or a new user-authorized request may verify actual state.

Add `query/releases` and Gateway `hub_releases` for on-demand bounded global Minion Hub release notes. Resolve a valid assigned assistant principal; global notes are visible to any authenticated Hub user, so do not introduce an unrelated business-module permission requirement. Return only version/date/sections/PR links with bounds/coverage. Existing changelog manifest points to this read; do not fetch on every turn or use upstream product notes. Installed Gateway version remains a separate runtime receipt.

Acceptance: disconnect before/after tool effect, late result, same/different owner, multiple effects, no automatic replay, visible unknown state, explicit receipt resolution; release read denied assignment, bounds, empty content, source identity and tool discovery. Use mounted/browser evidence for changed UI and required semantic design lint/token gates.

## 4. Delivery and evidence

**Verification:** Develop on isolated feature checkouts, root manages scoped commits and no-mistakes gates; workers never edit gate-owned trees. Independent technical review uses separate Standards and Spec axes, plus two spec review passes before implementation. Required checks cannot be replaced by mock tests. Hub requires zero check errors/warnings, all ordinary tests and build; Gateway requires check/typecheck/build/configured lanes. Exercise local QA with synthetic data and native roles where available.

Draft PRs use canonical bases: Gateway DEV, Hub master, meta dev. Sign source normally. After qualification and applicable human gates, Hub deploys from its merged branch; Gateway production-main qualification excludes unrelated DEV changes and deployment uses immutable image identity. Verify exact deployed SHA/image, service health, safe authenticated reads and no-secret/malformed-output boundary checks. No real business writes/messages or live model evaluation are necessary for the smoke. Report source, local tests, CI, merge, deployment and runtime status separately until every authorized item is complete.

The owner's previously selected one-time Gateway production exception is bound to same-repository branch `hotfix/agent-chat-guardrails-20261110` targeting exact main base `50a3036ad7fac23710943e7eeadfe66b38d96fcd`. Retain normal DEV promotion. Admit security entry jobs and require full runtime scope, successful build artifacts, lane resolution and both Node validation jobs for this exception; reject forked or mismatched branches, missing/moved base and incomplete qualification. The exact source-bound hotfix PR runs the complete Node test shards: ordinary feature PR smoke tests cannot stand in for them because this main projection has no DEV push. Preserve ordinary feature PR smoke selection, DEV push full shards and protocol validation. A later main base makes the exception inert. This replaces the retained recovery patch's old branch/date and missing spec pointer without broadening its authority. The production diff and executable workflow consumer tests require independent review.

Any remaining limitation needs exact-site `TODO(handoff)` plus this proposal ledger before stopping. It cannot be described as fixed or live merely because the branch merged.
