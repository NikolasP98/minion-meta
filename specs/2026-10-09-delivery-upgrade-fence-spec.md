---
id: 2026-10-09-delivery-upgrade-fence-spec
title: Withhold ambiguous delivery state across upgrades and rollback
stage: dev
status: implementing
pass: 3
verdict: approved
created: 2026-10-09
updated: 2026-10-09
repos: [minion, minion-meta]
tags: [logic, security, data, test]
type: fix
proposal: 2026-10-09-performance-release-qualification
findings: [GW-015, FACES-001, FACES-004]
---

# Delivery upgrade and rollback fence

This is a required release-safety amendment discovered during the owner's authorized
performance deployment. The runtime/logging correction itself is sound; restarting
the old delivery reader is unsafe with the actual persisted queue. The owner's implementation/deployment authorization covers this required safety correction; no additional implementation permission is needed. No production
payload is a test fixture and no real provider send is required for qualification.

## 0. Product

Gateway upgrades must never turn ambiguous persisted delivery state into an unreviewed resend. This amendment defines a forward-compatible first release, holds legacy state without provider effects, and binds deployment to an exact reviewed image so recovery and rollback remain explicit.

## AS-IS at qualification start

Read-only 9 October production metadata found 51 unversioned V1 queue entries on
the default gateway (47 WhatsApp, four Telegram) and none on FACES. Current readers
retry legacy entries on startup; backoff can defer them accidentally but is not a
safety guarantee. GW015 migrates these entries into legacyAtLeastOnce state and
also retries them. Pre-GW015 code accepts V2 wrappers as legacy payloads and ignores
heartbeatDeliveryAttempts, making rollback unsafe after the V2 writer activates.
The public qualification ledger records the sanitized release state; raw operational evidence remains private.

## TO-BE

1. The first safe image contains the already-qualified full GW015 V2 delivery and
   heartbeat implementation, the FACES runtime/logging corrections, and the host
   controller floor. A separate compatibility heartbeat implementation is rejected:
   its generic session lock can be reclaimed after 30 seconds, permits unrelated
   same-process reentrancy and has a watchdog release during provider I/O.
2. GW015 startup recovery classifies every `legacyAtLeastOnce` entry as held BEFORE
   any backoff, provider call, recovery lease, fail/ACK, move or persistence action.
   Leave original legacy V1 files byte-identical in place, including mode/mtime.
   Aggregate diagnostics expose count/reason only, never recipient or message data.
3. Existing V2 recovery remains valid: proven safe pending work may recover;
   in-flight or uncertain provider outcomes stay withheld. Preserve per-payload
   checkpoint identity, fenced recovery ownership and the durable heartbeat ledger.
4. New direct sends remain functional, including successful ACK and failure
   persistence. Do not disable channels or suppress unrelated normal customer work.
5. Legacy operator disposition requires an explicit exact entry/payload/generation
   transition and acknowledgement of duplicate risk. If existing operator tooling
   cannot safely migrate a legacy entry, reject it clearly and track the migration
   tool as an explicit open item. Do not fabricate permission to retry.
6. This first full V2 safe image becomes the minimum supported rollback reader.
   Older images remain prohibited. A failure before its first healthy start pauses
   for forward repair; it does not require an unsafe old-format rollback image.

## DELTA / executable qualification

- Use 51 generated disposable V1 queue fixture files with varied age and retry metadata; run
  recovery twice. Assert zero provider calls and byte/mode/mtime preservation.
- Retain malformed/unsupported envelope refusal and bounded diagnostic tests.
- Prove V2 safe-pending recovery, recovered in-flight/uncertain withholding,
  direct send/ACK/failure persistence and existing heartbeat A/B/A regressions.
- Retain the qualified GW015 strict-lock and cross-process recovery coverage.
  Do not introduce a parallel heartbeat marker/schema solely for this upgrade.
- Bind the Docker capability label, immutable source identity and controller floor
  tests to the exact combined candidate. Independent source and caller review,
  hosted CI and read-only production postflight remain mandatory.
- Record queue hashes/metadata privately before and after restart. Never generate
  a live provider send or modify customer data as a qualification fixture.

## Release order and operational invariants

Qualify and release one combined candidate through DEV then main. The final scoped release will carry
runtime + durable delivery + read-only legacy hold + controller floor. At qualification
start, PR298 was to be superseded only when this combined source qualified. PR298 is
now closed; preserve the earlier
experimental compatibility branch without shipping its invalid locking protocol.

The first safe V2 release deliberately chooses fail-closed availability:
if it cannot start, the affected service stays paused/unavailable for forward
repair rather than restarting an older image that can replay customer messages.
This is an explicit safety requirement, not a claim of seamless rollback.

The controller must enforce this before the first task replacement:

1. Persist a release floor/hold in root-owned controller state, independently of
   the gateway process. Mark compatible images with an artifact capability that
   the controller checks before selecting an image. Reject older/unmarked images
   before any service mutation when the floor exists. Treat corrupt floor state
   as a closed gate, never as absence. Do not infer safety from mutable tags.
2. Set service update failure action to pause for this transition; never invoke
   automatic Swarm rollback or the controller's explicit reverse rollback into
   the unsafe pre-compatibility image. An image pull/start failure and a crash after
   start must both leave the old reader unlaunched. Existing already-running old
   processes may continue until replacement; do not restart them as compensation.
3. Later rollback to an exact known compatible digest is allowed only after the
   image capability/floor check. The floor cannot be removed as an automatic
   recovery action. A downgrade below it requires a separately reviewed offline
   state migration, outside this deployment.
4. The normal automatic deployment workflow must select this policy for the
   compatibility transition. All controller entry points, including manual
   Swarm Rollout and subsequent automatic deployments, must honor the persisted
   floor so another path cannot accidentally restore the old reader.
5. Executable controller tests inject failure before new start and after start,
   assert no old-image update/restart command, and prove forward repair to the
   compatible digest succeeds. Preserve the existing safe-rollback tests for
   releases whose predecessor and target both meet the compatibility floor.

Postflight must prove the controller floor, service failure policy, exact image
identity, HTTP/WebSocket health, core/log limits and unchanged held queue files.
Do not resume provider recovery merely to make the deployment look healthy.
Pass 1 was independently blocked on rollback and fresh heartbeat admission.
Pass 2 approved the floor but source review rejected the separate compatibility
heartbeat locking. Pass 3 adopts the already-qualified GW015 protocol plus a
read-only legacy hold; independent reviewer approved this narrower architecture.

Independent pass 3 design review: Standards PASS / Spec PASS. Implementation and
hosted/runtime evidence remain separate gates. Reviewer: qualify_gateway_perf.

## DEV plain-Docker deployment amendment

The enabled dev-protopi target also persists delivery state and auto-deploys on
DEV merge. It must not run the old compose rollback path after V2 activation.
The versioned deployment registry declares the minimum capability. Validate the
required value, resolve and pin the candidate image identity, and reject an
unmarked image before stopping services. Rollback must resolve and check its
exact image capability before any compose down/up; an incompatible predecessor
stays unlaunched and the run fails with forward-repair guidance. The same rule
applies on later invocations, not just the first upgrade. A manual host compose
operation is outside this workflow authority and remains an operator boundary.

Negative qualification: missing/corrupt registry floor, old candidate, first V2
health failure with old rollback, later retagged old candidate; all must refuse
unsafe starts. A compatible predecessor may roll back. Tests execute the actual
workflow/helper seam with mocked Docker, never a production provider or host.

## Exact automatic release identity amendment

AS-IS at amendment start: the automatic DEV and production paths checked out moving branch names and
resolve moving image tags. Capability and rollback fences cannot prove that the
image belongs to the Docker Release which triggered deployment. Independent
review found this after PR300 merged into DEV (56535668); production promotion
remains withheld.

TO-BE: every automatic deployment consumes a successful build receipt containing
the exact source SHA and immutable multi-platform image digest. DEV passes these
through workflow_call; production reads the receipt from the triggering successful
Docker Release run and validates its run identity, source SHA, channel and digest.
Check out controller/helpers/registry from that exact SHA. Pull by digest, verify
OCI revision before any replacement, and require the existing capability/floor.
Moving tags may be convenience labels but never deployment authority. Missing,
malformed, mismatched or unavailable receipts fail before host service mutation.
Manual entry points must require equivalent exact identity or fail closed.

DELTA: wire manifest output and bounded release receipt, exact workflow checkout,
plain-Docker identity validation and Swarm EXPECTED_IMAGE/expected revision. Test
valid receipts plus stale run, wrong SHA/channel/repository, invalid digest, missing
artifact, and image-revision mismatch; rejected cases must perform zero service
mutations. Retain floor, rollback, forward-repair, and lifecycle semantics.
Independent design and exact-source reviews plus hosted CI remain release gates.

Independent amendment design review: PASS. Parent review agrees. Exact receipt
download must bind workflow run ID and attempt to the triggering head SHA and
repository before any SSH action; at amendment review time, source and runtime proofs remained pending.

## Current state

The merged DEV lifecycle source at `eb40b998c45d305385d5dbfcb37537545a10f226` passed its hosted build and read-only DEV runtime observation. Windows durability and script-tree qualification continues in PR307; production promotion remains a separate held gate. The compact public state is maintained in `.planning/operations/readiness-2026-10-03/performance-release-2026-10-09/QUALIFICATION.md`.

Manual compatibility boundary: the existing explicit Swarm rollout contract
authorizes an immutable digest, requested version and controller identity. Keep
that caller contract working; it does not inherit the automatic receipt's source
SHA assertion. The controller validates a supplied expected revision and rejects
a mismatch, while the automatic workflow must always supply that revision. A
manual digest-only invocation remains explicitly authorized by its reviewed
contract. Do not add a new required dispatch input that breaks runtime callers.

## Out of scope

- Reconstructing provider acceptance for legacy entries or replaying them.
- Changing provider payloads, recipient selection, or normal delivery semantics.
- Using production queues, credentials, or provider calls as test fixtures.
- Treating an older incompatible reader as a valid rollback target.

## Verification

Run the repository checks and focused recovery, controller, and workflow tests on the exact candidate. Hosted CI must prove held legacy bytes remain unchanged, provider-call counters remain zero, malformed or mismatched release receipts fail before mutation, and the admitted forward and rollback floors match this contract.
