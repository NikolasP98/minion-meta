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

Final default-policy inspection confirmed an additional practical consequence of
the known parity gap: ordinary Hub provisioning sends only name/workspace and
marks an agent active without sandbox/tool preflight. Gateway defaults to sandbox
off, which the internal runtime rejects. Its standard policy also includes
process/session tools and other capabilities outside the qualified surface.
This draft is therefore not activatable for an ordinary newly provisioned personal
agent. Shared isolation/delegation remains substantive implementation work; it is
not merely a deployment checkbox. See the proposal's default-provisioning entry.

Two final boundary fixes were independently inspected by the orchestrator. Tool
qualification now uses the same authoritative L1 permission filter before checking
the original plugin/channel tool objects, and still runs before relevance filtering.
Denied tools cannot reject a turn or reappear through dynamic loading; permitted
unqualified tools still fail closed. Ordinary Hub tool construction gains no extra
lookup. Separately, exec/process and the low-level process runner now refuse
admitted execution: killing a host Docker client cannot prove its in-container
descendants stopped. The shared qualified surface excludes shell execution until
admission-owned process isolation and revocation are implemented.

Focused results for those corrections: 25 tests across four permission/runtime/
catalog files passed; 17 process-boundary tests passed. The existing five real
background/PTY/yield/timeout cases passed with `/usr/bin` first in PATH. Their first
run failed because the mise node shim rejected the test HOME's config trust; no
ordinary Hub behavior was changed to address that environment issue.

The combined post-review unit selection passed 106 tests across 19 files. The
post-review production build passed, including extension bundles and SDK type
declarations. Meta verification and Hub application/native QA CI passed at the
previous documented heads; new commits require their own checks. Gateway's
scanner baseline prerequisite and the full-parity activation blockers remain open.

Final gateway combined `pnpm check` passed after correcting a test fixture's
literal result type: format, TypeScript, lint (57 existing warnings, zero errors),
manifest validation and all 161 capability entries. The product runtime was
unchanged by that test-only correction. Gateway feature head is `87e6810590c`;
Hub feature head is `787eb035`. Final pushes require fresh CI; no green-CI or
release-readiness claim is made for an unobserved head.

### Activation follow-up review (2026-10-16)

Standards review kept the fresh preflight independent of tool factories, models,
Hub callbacks and configuration writes. Hub uses current RBAC and published-tool
metadata in the same admission transaction, avoiding a second pool checkout or a
callback while its locks are held. Separate account-status pagination and bounded
activation scans preserve completeness information. Identity, freshness, schema
and report consistency are checked before accepting gateway readiness.

Independent review corrected false-ready cases involving saved model/host/elevation
settings, SDK auto-discovered extensions, plugin lifecycle hooks and custom names
shadowing native tools. Ordinary SDK MCP discovery was traced separately: the
built-in factory is supplied by codemode, so the existing codemode blocker covers
that path; the implementation does not assert that every unused MCP file executes.
The SDK environment-settings parser was extracted without behavior changes so
readiness can inspect it without importing the SDK executor.

The process primitive in gateway commit `032d9812612` passed 20 tests, including
11 using real Docker containers. Review covered protected root-owned leases,
finite grant expiries, immutable owners and callbacks, bounded freshly authorized
output, detached descendants, cancellation acknowledgement and completion reasons.
No concrete defect remained in that unintegrated primitive. This is not approval
for exec/process activation: durable derived grants, registry ownership, restart
reconciliation and scoped completion/outbox integration remain absent.

Spec review remains incomplete for full capability parity. Safe session inspection
is limited to the admitted current conversation, while the Hub's historical-session
and delegation semantics require persisted provenance and signed scope. The
ordinary status/visibility E2E suites also failed on the archived pre-change
`87e6810590c9021c8fdb9572f33a745d88e34c90` source: six failures and four passes,
including timeouts and leaked unmocked RPC. Separate focused ordinary-factory
regressions do not turn those baseline suites into passing release evidence.
No merge, deployment, production migration, pairing or live WhatsApp send occurred.

Frozen follow-up focused evidence: readiness passed 15 tests in the dedicated
process-isolated unit group; the runtime unit file passed 13 tests in its normal
group. Policy/codemode files passed 11 tests and the administrative RPC boundary
passed four. Session inspection passed 25 tests, including 23 admitted-boundary
cases and ordinary list/history/status behavior. Protocol JSON and both generated
Swift outputs regenerated byte-identically. The new preflight test uses the
repository's `*.forks.test.ts` convention after its plugin metadata mock was found
to leak into a neighboring vmForks test; the normal runtime unit group passes
with that separation. These focused counts are distinct selections, not a full
Gateway test-suite claim. Whole-repository checks are recorded separately below.
