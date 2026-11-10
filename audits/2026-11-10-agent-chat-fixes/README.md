# Agent-chat fix qualification — 10 November 2026

Status: implemented in isolated feature checkouts; publication is blocked by the configured Git signer. These fixes are not live. The [qualification ledger](qualification.json) records exact source trees and completed local checks. The [reviewed spec](../../specs/2026-11-10-agent-chat-contracts-followups-spec.md) defines scope and acceptance; the [proposal](../../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md) retains remaining boundaries. Historical conversation evidence still ends November 3; this work does not establish a current model-quality score.

## Implemented behavior

- Stock forms and direct tools preserve currency and per-unit versus line-total meaning, use native conversion and expose valuation provenance.
- Assistant rescheduling moves the same booking atomically, preserves duration/funding links, requires a current version and reconciles retries. Assistant moves serialize on the target resource; legacy human/create/group writers remain outside that guarantee.
- Booking reads provide same-statement status aggregates. Finance rankings select the requested metric before limiting, preserve currency/source boundaries and mask sensitive values. Missing margin attribution remains explicitly unavailable.
- Typed reads discover authorized service/resource/local-day slot references and bounded Minion Hub release notes.
- Automatic memory writes require bounded acknowledgment and attributed user evidence. Memory ingest, recall and delete carry the configured authenticated server identity. Internal/inter-session and assistant-only claims do not become automatic user facts.
- Supported credential and malformed-output guards include real native persistence after message, content and details serialization transforms. An interrupted UI run retains bounded owner-scoped receipt/unknown-effect metadata and never replays writes.

## Qualification and release state

| Surface | Verified locally | Still required |
| --- | --- | --- |
| Hub | 9,389 ordinary tests pass; zero failures; 301 skipped/pending. Type check: zero errors/warnings. Production Vercel packaging and client-boundary/canary checks pass. Design/token gates pass. | Signed commit, pipeline, GitHub CI, merge, deployment and runtime proof. |
| Native database | 13 actual PostgreSQL17 service/role/GUC cases pass under explicit task FORCE-RLS policies. Deliberate removal of the target-resource lock makes the race assertion fail. | Deployed policies/migration catalog and global calendar-writer policy are not qualified by this fixture. |
| Notice UI | Actual component passes 10 desktop/mobile synthetic owner/receipt checks; tested source hashes match. | Full authenticated/deployed composition remains separate. |
| Gateway feature | Final check and full build pass; 49 extensions compile and plugin SDK declarations succeed. Independent serialization probes: 3/3; native guard cases: 31/31. | 14,005 configured-lane tests pass, zero fail, 16 skipped/pending after the three-file tenant-identity correction; protocol check passes. Pipeline/GitHub CI/release remain pending. |
| Gateway main projection | All 89 runtime paths match the reviewed projection; unrelated DEV JWT/backup changes are excluded. Exact source-bound production CI policy passes independent review and 84 executable consumer cases. Final check, production build and protocol check pass. | 13,971 configured-lane tests pass, zero fail, 16 skipped/pending. Signed commit, actual full-shard GitHub CI and release proof remain pending. |
| Meta evidence | Local aggregate CI command passes with synthetic Git fixture signing isolated; normal source signing stays enabled. Historical public-bundle hashes and spec/proposal indexes pass. | Signed commit and gate rebase onto newer dev ranking/checkpoint commits; actual GitHub CI and merge. |
| Live configuration | Read-only canonical config/manifests and immutable production pure policy resolution qualified. Production still uses the previous revision. | Owner must identify intended business-only agents; no restriction is inferred from personal IDs or public context. |

Local source, binary patches, exact manifests, test reports, native fixture evidence, browser screenshots, independent reviews and resume state are retained privately under `.local/agent-chat-fixes-2026-11-10/`. No raw transcripts, credentials, business fixtures, model evaluations or outbound messages are published here. The report must be updated from actual receipts before any live claim.
