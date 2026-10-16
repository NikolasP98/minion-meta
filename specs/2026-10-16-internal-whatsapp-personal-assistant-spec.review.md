---
spec: 2026-10-16-internal-whatsapp-personal-assistant-spec
pass: 3
verdict: pending
reviewer: codex-author-review
created: 2026-10-16
---

# Internal WhatsApp assistant specification review

These are two sequential author review passes followed by a reviewed owner
clarification, not an independent review or a
human approval of the technical specification. The scope was approved by the
owner; Baileys persistence and one-org-per-account were subsequently required.
The executable spec gate remains pending. No scores are asserted for a pending
gate and no implementation/runtime qualification is claimed.

## Pass 1 — source, authority, and failure boundaries

Input spec SHA-256:
`bfc9a35fb7dbced6045b8ea67699bf0049d0b5fe72016b99b3250a85e3817c1d`.

Standards findings:

- Confirmed canonical channel schema is in `packages/db`, within minion-meta,
  with Hub migrations and downstream dependency versions to coordinate. The
  spec uses the existing registry and explicit impact zones.
- The one-org requirement conflicts with current `owner_profile_id` visibility.
  Section 2 and Slices 1–2 explicitly close that path for WhatsApp and preserve
  other channel behavior. A tenant-scoped account-alias index is insufficient.
- Confirmed `job_effects` validates vector-ingest receipts. Section 6 uses
  feature/shared action receipts instead of declaring that table generic.
- Confirmed `vitest.e2e.config.ts` exists. Removed the unresolved path caveat;
  preserved the statement that no runtime tests were executed during spec work.

Specification findings:

- Pairing could discover a duplicate number only after opening a competing
  socket. Revised §2 to reserve the intended canonical number and auth reference
  before pairing, then require provider proof before activation. A reservation
  does not grant identity authority.
- Current 30-minute no-message reconnect is not transport health. Section 3
  explicitly rejects quiet-message timers as readiness signals and coordinates
  all three existing recovery layers.
- Database lease expiry alone cannot fence filesystem writes or an already sent
  provider request. Section 3 requires exclusive auth ownership and limits the
  first deployment to one host per auth store. Section 6 records the in-flight
  revocation/send limitation and ambiguous outcomes.
- At pass 1 the conversation question was unanswered and Section 10 kept the
  dependent execution slice blocked. The owner subsequently settled it; see the
  pass-3 clarification below.

## Pass 2 — revised contract and acceptance coverage

Reviewed the revised spec against the approved proposal plus both owner
requirements. Reviewed the source paths used to define account identity,
personal-agent assignment, socket health, ingestion hooks, claim/unlink and
durable worker ownership.

Standards result: the artifact has AS-IS, TO-BE, DELTA, canonical per-slice topics,
out-of-scope, verification and impact sections. No application source, production
state, unrelated drafts, or dependency pins were edited. Metadata checks are
recorded separately below; they do not satisfy independent implementation review.

Specification result: the draft covers claimed-member admission, same-agent
authorization, organization isolation, persistent Baileys sessions, independent
health signals, revocation, durable effects and replies, and rollback. The
remaining technical prerequisites below prevent an executable approval.

## Pass 3 — owner clarification on memory and WhatsApp history

The owner requires the same memory across Hub and WhatsApp, with WhatsApp's
continuous history and no past-chat picker. The updated §10 specifies one stable
WhatsApp conversation per org/profile/agent/receiving account and the same
canonical personal-agent memory service across channels. Hub chat selection does
not change that binding. Memory access, corrections, deletions, provenance and
scope remain shared; confirmations and reply destinations remain conversation
bound. Added acceptance cases for bidirectional recall, deletion, Hub chat
switching, reconnect continuity, and cross-user/org isolation. This resolves the
product question without claiming implementation or independent approval.

## Design-stage validation record

The initial author-review checkout had unrelated proposal/spec metadata errors.
Those errors are historical context only: the implementation worktree is based
on the newer heads in the specification and both index checks now pass. The
original design review did not qualify runtime behavior.

## Independent architecture review and implementation authorization

On 2026-10-16, a separate `security_review` agent reviewed the specification and
current sources. Standards: PASS for canonical ownership and explicit rollout
gates. Specification design: PASS, with no unresolved product decisions. Source
readiness: not qualified. Findings require fresh credential checks, atomic claim
verification, GoTrue account state validation, immutable run authority, credential
API scoping, no internal debounce, uncertain-effect reconciliation, and durable
credential/key saves. These findings are being implemented and tested.

The owner then explicitly directed "ok, implement asap". Local development is
authorized; release gates remain. The frontmatter verdict stays pending until
implementation and runtime evidence support an executable readiness judgement.

## Implementation evidence (2026-10-16)

The following are local results, not deployed or live-account evidence:

- Shared DB package build, typecheck and lint pass (one existing unused-import
  warning); 32 tests pass. Spec index (287 entries) and proposal index (804) pass.
- Hub focused authority/credential/memory boundary suite passed 182 tests;
  native PostgreSQL integration exercises real leases, claim revisions, RLS,
  deduplication, memory migration and delete tombstones. Final results appear below.
- Gateway focused authority/business/credential suite passed 156 tests; executor
  and canonical memory suite passed 24 tests. Supervisor/status tests passed 22,
  including stale-heartbeat recovery, teardown order and unchanged legacy cadence.
- Independent runtime review found and gated unisolated host/custom/plugin/CLI
  execution and unsigned session delegation. These remain capability-parity
  gaps. No release-readiness verdict is claimed.

Live pairing, delivery/media/role parity, 24-hour idle and host-restart tests are
still required before activation. Unknown action receipts need manual domain
reconciliation until business transactions and receipt updates are atomic.
The source TODOs and proposal ledger track these open boundaries.

## Final independent qualified-slice review

A separate reviewer assessed the assembled implementation after SDK construction
was tested against the installed SDK. Standards: PASS for the reviewed qualified
internal slice. Specification: PARTIAL / NOT READY. Full capability parity,
target-data migration proof, live role/media/idle/restart traces and transactional
coupling of business effects remain open. The implementation does not claim
exactly-once external delivery or guaranteed uninterrupted connectivity.

Meta draft PR 810 passed its full CI verification. Hub draft PR 544 is open.
Gateway SDK regression tests verify that native host bash and workspace extensions
cannot be restored after the checked tool surface; tool search isolation is
also applies to ordinary Hub conversations. Canonical heuristic automatic
saves now run through the shared service and are awaited, with cancellation and
uncertain-effect fencing. The inherited LLM extraction threshold is preserved
and tracked separately in the proposal ledger.

The orchestrator separately inspected the reviewer's final SDK and catalog fixes,
including checked-name selection, sandbox project trust, static internal resources
and snapshot handles retained through tool wrappers. No additional bypass was
found. The reviewer then independently inspected the canonical automatic-extraction
implementation: no additional scope leak found; cancellation/ambiguous SQL commits
and completed-inference memory failures are explicitly recorded in the ledger.

Latest local evidence: Hub full suite passed 7,254 tests (260 skipped) across 836
passing files (five skipped), plus three architecture checks; 22 native PostgreSQL
integration tests passed. Exact-tree Hub check passed with zero errors/warnings.
Gateway changed-test selection passed 111 tests across 20 files, with six additional
CUID/UUID channel-ID validation cases. Gateway build including SDK declarations and combined check passed after the
CUID schema fix. Built CLI help smoke passed. The subsequent lost-acknowledgement
local-authority fence passed 16 focused tests and the final build, including SDK
declarations. Hub production build and client-boundary checks passed. Hub CI
test/check-and-build and native QA now pass after correcting fixture role/vector
schema assumptions; all 22 native tests also passed locally against both
public.vector and extensions.vector layouts. The Vercel preview remains pending.
These facts do not close live-account or full-capability parity gates.

Gateway CI build, check, Linux test partitions, protocol and Windows checks passed.
Its secrets job and dependent Linux-required aggregate failed on false positives:
environment-variable names and the generated WhatsApp manifest checksum. Narrow
inline annotations identify the variable names. The checksum requires the separate
[audited baseline PR #331](https://github.com/NikolasP98/minion-ai/pull/331); it
contains the derivation and positive/negative scanner evidence. Existing policy
intentionally rejects baseline changes in a feature PR, including the audit PR
until independently reviewed and explicitly accepted. No scanner guard was
weakened. Gateway #330 must inherit the accepted baseline and pass CI before merge.

Review branches: [meta #810](https://github.com/NikolasP98/minion-meta/pull/810),
[Hub #544](https://github.com/NikolasP98/minion_hub/pull/544), and
[gateway #330](https://github.com/NikolasP98/minion-ai/pull/330). All remain drafts.
No merge, production migration, activation, pairing or live send was performed.
