---
id: 2026-11-06-agent-transcript-guardrails-release-spec
title: Correct skipped checks in assistant memory and business tools
stage: test
status: review
verdict: pending
pass: 2
created: 2026-11-06
updated: 2026-11-06
repos: [minion, minion_hub]
tags: [logic, data, security, test]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
---

# Agent transcript corrections and release qualification

## 0. Product

The user asked to inspect real agent chats for skipped checks or assumptions, find EGM approaches to each code finding, test them, and report when the changes are live. The source audit and tested-candidate exercise are complete. Release preparation now ports those candidates into isolated feature branches with fresh lockfile installs and repository checks. This artifact remains in review; human security/data approval and merge gates remain open. No production release is claimed.

EGM is the Elephant–Goldfish Model: an orchestrator retains context while fresh reviewers challenge an explicit document/source reading list. Nine reviewers completed five stages and three fresh reviewers completed one implementation re-audit. Original Blocker severities and subsequent closures are retained. Last acceptance-test additions were root-verified after that re-audit; no convergence claim is made.

## AS-IS

The findings are qualified against Gateway DEV d3e0fbf54fc657521df07c896ea7adce5ba1afcd and Hub master1f1ab6a327b347645aeff16f5bd675b8d9fbf54d. [Code anchors and reproduction limits](../audits/2026-11-06-agent-transcript-review/code-review/README.md) separate direct transcript matches from adjacent code defects.

| Finding | Current observable behavior |
| --- | --- |
| C01 | Attempt supplies at most2messages while durable extraction requires4; the default path never becomes eligible. Separate KG extraction still runs. |
| C08 | Eligible overlapping calls reserve no capacity and overwrite captured cursor state. Synthetic10calls under budget5 dispatch10and record1completion. |
| C02 | Mandatory personal onboarding and ordinary-task guidance contradict each other. |
| C03 | Booking preview echoes syntax-valid input without native semantic checks, omitting customer/resource identifiers. Commit already has further validation. |
| C04 | A default500-row list supplies no explicit coverage or total. Historical truncation is not asserted. |
| C05 | Invalid explicit finance dates can become the rolling default, including blanks erased by the Gateway adapter. |
| C06 | DSML protocol reaches egress, malformed finals may disappear, and surrounding prose can retain unsupported receipts. Speech is generated before final text dispatch. |
| C07 | Default persistence redaction is optional; egress misses supported named secrets/fine-grained PAT forms. Historical credential validity or misuse is not asserted. |

## TO-BE

1. Accumulate real settled windows, keep threshold4/budget5, reserve synchronously, serialize per retained generation and preserve separate attempt/completion accounting. Dedup by run identity and bounded authorized recall. Cap256retained states; lazily expire idle30minutes without evicting active work. Successful gateway RPC reset/delete clears old work after the run settles and before store mutation. Failed cleanup retains its budget.
2. Personal-agent assembled context permits authorized tasks without optional naming/setup interviews. Preserve unknown facts, real permissions and strict non-personal onboarding.
3. Reuse native read-only booking preparation for assistant preview and real commit. Reject invalid/scoped/inactive/unassigned/deleted/unavailable inputs. Preview has no mutation or reservation; commit revalidates. Preserve shared UI stale-contact fallback by confining strict references to the assistant flag.
4. Assistant booking reads return bounded rows plus {total,returned,truncated,limit,mode}; list/count use shared predicates. No continuation or full enumeration is promised. Preserve existing UI array/cap and field masking.
5. Agent periods use strict real calendar days and business-timezone inclusive-day/exclusive-next-midnight bounds; expose all-time and disclosed resolved semantics. Preserve missing versus explicitly invalid properties at the adapter. Preserve the shared UI parser/default.
6. Reject the entire DSML-contaminated response, including mixed success prose. Ordinary invocation-only terminal text gets an explicit failure through both disabled/enabled TTS and final dispatcher; control-only silence, intermediate blocks and media/channel-data remain distinct. Guard visible/spoken inputs before summary/synthesis and recheck model summaries.
7. Mandatory pure supported-pattern redaction runs after persistence transforms/hooks and at qualified text/speech boundaries. Preserve structural tool data, ordinary IDs and image bytes. Do not claim arbitrary-secret/media detection or protection of every bypass path.

## DELTA: implementation slices

The [exact approaches](../audits/2026-11-06-agent-transcript-review/egm/approaches.md), [manifest](../audits/2026-11-06-agent-transcript-review/egm/candidate-manifest.json) and exported patches define the selected mechanisms. Release integration may correct actual repository typing/tooling issues without weakening these outcomes; any behavioral change requires an explicit disposition and re-test.

### Slice1: Gateway

Modify the manifest's Gateway source files: memory runner/caller, bootstrap and identity, session persistence guard, shared redaction helper, outbound sanitizer, central dispatcher, TTS and gateway RPC cleanup, plus booking/finance tool adapters. Port synthetic boundary tests into the affected source directories with repository-compatible imports/types. Retain the corrected actual-message fixture in existing runner tests. Remove the artifact-only static wiring assertion from production tests; execute behavioral seams instead.

Definition of done: fresh pnpm frozen-lockfile install; focused tests including native SessionManager persistence suites and Gateway cleanup project; full build, TypeScript, formatting/lint/manifests and declared unit suites; independent standards/spec review. Provider/live-model evals are not required CI and are not authorized by this artifact. PR baseDEV, then release through the canonical DEV→main policy; do not push directly to protected branches.

### Slice2: Hub

Modify assistant booking action/list/finance routes, add agent-only period parser, factor native booking preparation and add bounded list/count service. Port native PGlite and actual route/parser tests to Hub-local tests; keep cross-repo adapter→route proof in the EGM evidence. Add exact leap/one-sided/default-calendar boundary tests in Hub. Preserve shared UI behavior and trusted capability-based masking.

Definition of done: fresh Bun frozen-lockfile install; new native preview/SQL and actual route/parser tests, nearby scheduling/period regression tests, declared Hub check/build/test and architecture checks; native authority/RLS/concurrency checks where required. Use synthetic CI public env, not production credentials. PR basemaster per repo-policy; it overrides older prose branch instructions. A merge can trigger deployment, so the human merge gate applies.

### Slice3: evidence and release

Commit proposal/spec state and sanitized candidate/review evidence to minion-meta. Raw ledgers, historical secrets and private exports remain outside Git. Independent reconstruction of the exported candidates passes253distinct tests:153new/100nearby, with18changed source-file hashes matching. Those prototype counts are separate from final repository/CI counts. Read [verification](../audits/2026-11-06-agent-transcript-review/egm/verification.json) and [all review dispositions](../audits/2026-11-06-agent-transcript-review/egm/goldfish_review_report.md).

Prepare concrete PRs and CI evidence. Human approval and merge remain mandatory for security/data. Verify exact merged/deployed commit and immutable Gateway image identity on the targeted fleet, Hub deployment identity, and safe read-only runtime probes. Builds/CI alone do not establish live behavior. Do not call the changes live until these checks pass.

## Verification and required acceptance cases

Memory: two exchanges→one extraction, replay, concurrent budget, failure/cancel accounting, clear/re-create, real caller construction/authorized recall, cap/expiry/active retention, successful and failed RPC cleanup, native SDK persistence.

Booking: valid read-only preview; missing/foreign/inactive/unassigned/deleted/occupied rejection; no mutation/event/contact/accrual effects; commit revalidation;501matches/500rows with exact total/truncation; count mode, stable ties, masking, empty/narrow ranges, shared UI contract.

Finance: blanks/wrong types rejected before transport, malformed/non-leap dates, leap day, one-sided bounds, conflicts/all-time, exact fixed-clock default, business midnight and DST, same period forwarded to aggregates.

Output: complete/incomplete/fenced/mixed DSML failure, ordinary terminal fallback through off/always/tagged TTS then dispatcher, generated-summary filtering, independent spoken text, response prefixes, control/media/channel-data/nonterminal controls. Synthetic credential assignments/JSON/PAT/URL and transformed/synthetic persistence results; IDs/images/schemas/receipts preserved.

## Open boundaries and rollout constraints

[The proposal handoff ledger](../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md) retains exact-site TODOs for provider timeout/abort, acknowledged/idempotent memory sink delivery, filesystem/plugin memory-write outcomes, non-RPC rotation, native role/RLS proof, direct speech/telephony/bypass delivery/export and unsupported dependency/runtime checks. These do not become completed by merging the bounded candidate. Restricting unnecessary environment access and booking prerequisite discovery remain separate unresolved backlog items.

## Out of scope

No schema migration, credential rotation, historical transcript rewrite, provider fine-tuning, per-request live evaluator, unrelated UI/repository work, or automatic permission grant is included. Optional resource selection can change between preview and commit; preview is advisory. If a required production safety check fails, retain a draft/unmerged state and record the concrete blocker rather than reporting a release.
