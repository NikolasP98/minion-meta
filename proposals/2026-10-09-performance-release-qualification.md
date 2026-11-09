---
id: 2026-10-09-performance-release-qualification
title: Qualify and release the most progressed performance corrections
status: approved
created: 2026-10-09
updated: 2026-10-09
repos: [minion, minion_hub, minion-meta]
tags: [logic, security, data, test]
effort: M
---

# Performance release qualification

The owner requested implementation and deployment, using subagents, starting with
the most progressed items in the reviewed performance inventory. This supersedes
the review-only boundary for this work. It does not waive failed safety checks or
authorize unrelated changes in the preserved implementation checkouts.

## AS-IS at qualification start

- Gateway PR296 is open and draft at `44d2d0d45f903cef89df3ce2a16e45fb0f211bf3`.
  Its current hosted checks have 20 successes and 10 skips. GW009/GW010/GW015
  have local qualification, but the combined release retains the GW024 security hold.
- FACES001/FACES004 core-dump and persistent-log controls have local qualification;
  the actual production image, resource state, and smallest safe release need checking.
- NOTIF019 has ten staged files in `hub-n19-wt`, based on `14b3ec90`, including
  a policy migration. They are absent from Hub master `aa4b5900`.
- The dated review and raw operational inventory remain private. This repository
  publishes only sanitized qualification state and canonical source/CI references;
  some referenced repositories remain access-controlled.

## Current state

The notification compatibility and optimized-policy release merged through Hub PR455 as `304a63a5b0d667696925cbbd26905ef5f1f37fd4` and was deployed. The bounded production verification and remaining Gateway and disabled-worker gates are recorded in `.planning/operations/readiness-2026-10-03/performance-release-2026-10-09/QUALIFICATION.md`.

## TO-BE

Each admitted release names its exact source, executable qualification, independent
review, blast radius, rollback, and observed production result. No old green test
or merged commit is treated as deployment proof. FACES evidence collection is
read-only until the concrete operations have been reviewed. Local database tests
use disposable resources and leave no production fixtures.

## DELTA

1. Qualify Gateway lifecycle/delivery on the exact candidate and assess whether a
   smaller release can preserve security without deploying the held bundle.
2. Inspect FACES resource controls and prepare bounded, reversible deployment steps.
   Preserve any crash evidence before destructive cleanup; do not blanket-delete logs.
3. Rebase a copy of NOTIF019 onto current Hub master, enforce real migration pairing,
   preserve authority behavior, and run native PostgreSQL qualification. The original
   staged files remain untouched.
4. Record independent standards/spec reviews before release; update the inventory
   with the actual result, including any failed or blocked gates.

Contract: `specs/2026-10-09-notification-performance-qualification-spec.md`.

## Legacy delivery disposition handoff

GW015 remains partial for old V1 queue entries. Recovery now holds ambiguous
legacy files unchanged; the operator API explicitly rejects their disposition
with `effect=none`. A migration/disposition tool is not implemented because
prior provider acceptance cannot be reconstructed safely. Design an explicit
per-entry operator transition with preview, authority, generation fence, audit,
provider correlation, and duplicate-risk acknowledgement before any replay.
The exact-site TODO is in `src/infra/outbound/delivery-queue-recovery.ts`.
The 51 production legacy entries remain preserved and no replay is authorized.

The approved first release is the combined full durable-delivery implementation
with a narrow read-only legacy hold, image capability, and host controller floor.
The experimental heartbeat compatibility bridge was rejected and is not shipped.
The first upgrade may require compatible forward repair; an old reader is not a
safe rollback. See `specs/2026-10-09-delivery-upgrade-fence-spec.md`.

## DEV startup heap forward recovery

AS-IS at qualification start: the first safe image `56535668` exceeded its former V8 heap allowance before gateway listen. Source allocation attribution remains open; raising the heap is recovery, not proof of a resolved leak.

TO-BE: retain the exact safe image and state volumes, provide a bounded service-specific heap override, and verify stable startup plus HTTP and WebSocket health. Do not roll back to the old delivery reader. Production promotion remains held until DEV qualification passes.

DELTA: verify the exact image digest, revision, and capability; apply only the reviewed heap setting; then recreate only the affected DEV service. Preserve existing state and record a sanitized health result. Startup allocation profiling and a durable fleet resource policy remain separate work.
