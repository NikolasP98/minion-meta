---
id: 2026-08-17-factory-workitem-handoff-schema
title: Typed WorkItem + signed handoff bundle across factory stages
status: in-spec
spawned_spec: 2026-08-18-factory-workitem-handoff-schema-spec
created: 2026-08-17
updated: 2026-10-17
repos: [minion-factory]
tags: [logic]
source: audit-2026-08-17
value: medium
---

# Handoffs are mutable IDs, not contracts

Audit 2026-08-17 P1. Specs are fetched by mutable id+branch (not commit SHA);
reviewer output is grep-parsed markdown; multi-repo specs map to the FIRST
recognized repo only (`queue.ts` repo resolution); intake normalizes into two
different shapes (issues vs proposals).

**Definition of done:** one typed WorkItem record (source trust, risk class,
priority, owner, lifecycle state) for all intake paths; dev runs pin the spec
by commit SHA and record it; review emits a structured JSON verdict artifact
(findings, severity, head SHA) alongside the markdown; multi-repo specs either
fan out per repo or fail loudly.

**Out of scope:** priority scheduling policy (separate decision).

## AS-IS — reassessed 2026-10-17

Factory production `43a174b2e87c4d572ffd2ba030269db22a0b7bd2` has commit-pinned
spec handoffs, structured review artifacts and multi-repo dispatch refusal.
Those are regression boundaries, not requests for duplicate implementation.
WorkItem trust fields are still absent from the new approval/admission gates;
monitor intake still uses legacy issues. The closed meta PR #273 is not shipment
evidence for the complete goal.

## TO-BE

All intake paths retain the full WorkItem goal. Trusted low-risk automation may
follow automatic approval; human/external/legacy/unclassified work keeps its
required gate. Existing queue authority, ranking and ordering are preserved.

## DELTA and remaining work

Deploy the strict S5 consumer gate before S4 schema/producer backfill, prove the
runtime refusal cases, then apply a reviewed inventory of current proposals
excluding review sidecars. S6 typed monitor intake follows complete corpus
validation. The parent spec and Spec Kit feature
`specs/104-workitem-consumer-first/` retain exact tasks and acceptance evidence.
Security approval and merge require the owner. No implementation or completion
is inferred from a historical PR closure.

## S5 implementation evidence — 2026-10-17, not deployed

Owner NikolasP98 merged the reviewed S5 plan in meta PR #835 (`0dc0ece6`)
and confirmed execution. Approval was recorded in meta commit `329c87dc`
before Factory code. Manual execution uses the isolated Factory branch
`feat/workitem-consumer-gates`, based on deployed `43a174b2`; it did not submit
an automated `/runs` request or change any production hold.

Factory [implementation PR #199](https://github.com/NikolasP98/minion-factory/pull/199)
at `12b6afbf` (source reviewed at `6a18c54`, followed only by README clarification;
including initial implementation `9a5c03b` and
preserved gate-fix commits) adds one strict WorkItem parser and one shared
commit-pinned source/revision helper, applies them to proposal approval,
automatic spec admission and the existing HTTP endpoint, and refuses new
automatic retries whose current canonical authority differs from their stored
manifest. Local red-to-green tests covered legacy acceptance, stale-index
admission, cached-policy outages, concurrent retry creation, commented-null
owners and retryable approval-source failures. The final local runner suite
passed 1,266 tests without failures or skips. Typecheck and
`bash -n agent/spec.sh` passed. Fresh independent full-feature no-mistakes
review of `6a18c54` completed with zero findings. Hosted CI is pending; these
are local source/fixture results, not production proof. Final local gate run
`01M564W5J3B6KG5YTZVMJ7QQF8` completed with zero outstanding findings and
preserved every prior fix. PR #199 is security-labelled and owner-gated.

The first validation run fixed stale policy fallback, the automatic unstick
spec-retry bypass, duplicate retry races, comment-only controls, quoted draft
status handling, retry-lineage restart proof and a test-fixture type error. Its
post-fix review still had two blocking findings; those were reproduced and fixed
in `f448ae5` before the fresh review. That run's `passed` label is not a clean
review or CI claim: PR/CI steps were skipped because the daemon's GitHub CLI
was unauthenticated. Hosted checks must be verified separately through the
authenticated GitHub interface; no credential settings were changed.

Subsequent review also closed retry races in which a lifecycle child errored
during an unstick authority read or the existing circuit breaker opened during
that read. Existing immutable child-lineage evidence is checked transactionally,
and the unchanged breaker read is shared without a circular dependency.
The final response-contract regression verifies proposal approval CAS conflicts
return retryable `503`, while legacy terminal conflict responses stay `502`.

The known open content boundary is retained at `agent/spec.sh:PROPOSAL_FILE`:
the execution checkout still supplies proposal bytes, not the admission-time
commit. This slice does not implement or promise immutable proposal execution.
Factory producer retrofit, reviewed meta index/schema/corpus migration (S4),
and typed monitor intake (S6) remain separate work. Owner merge of the security
implementation, trusted exact-SHA promotion, deployed-module isolated fixtures
and a retained-production-queue comparison are still required before S4 review
may proceed. No blanket approval or backfill is authorized by these local tests.
