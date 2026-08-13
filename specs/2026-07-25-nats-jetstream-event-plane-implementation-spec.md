---
id: 2026-07-25-nats-jetstream-event-plane-implementation-spec
title: NATS JetStream event plane — implementation and production rollout
stage: spec
status: approved
pass: 1
created: 2026-07-25
updated: 2026-07-30
repos: [minion]
---

# NATS JetStream event plane — implementation and production rollout

**Date:** 2026-07-25  
**Status:** Approved for autonomous dark-infrastructure deployment; application cutover remains gate-driven  
**Primary objective:** Deploy a durable, authenticated, private JetStream instance and move MINION background work onto bounded persistent consumers so serverless concurrency cannot overload Supabase.  
**Repos:** meta-repo (`dev`), `minion_hub` (`dev`), `minion` (`DEV`)  
**Production host:** Netcup Docker Swarm, single storage node labeled `minion.storage=netcup-local`

## 1. Executive decision

MINION will use NATS JetStream as an external event and wake plane.

The initial production integration is:

```text
Hub transaction atomically creates/updates bg_jobs + queue_outbox
  -> one bounded Netcup outbox relay publishes a job pointer
  -> durable JetStream pull consumer on Netcup
  -> existing DB lease/advanceJob code
  -> bounded Supabase worker pool
```

Postgres remains the authoritative job state, cursor, lease, and tenant ledger during
the first migration. JetStream provides burst absorption, replay, delivery state,
backpressure, and bounded dispatch. It does not replace transactional database
correctness.

The initial broker is one file-backed JetStream server on the existing single-node
Swarm. It is fully functional but not highly available. Three replicas on one VPS
would not improve the failure domain. Gateways retain their local SQLite outboxes
during broker downtime; a future R3 deployment must span three independent hosts.

Do not begin with raw gateway message ingestion. The current gateway only marks local
rows synced after Hub returns exact `acceptedClientIds`, which means the canonical
Postgres commit succeeded. A JetStream publish acknowledgment is not equivalent.
Raw ingestion requires a later receipt protocol described in Phase 5.

## 2. Problem statement and verified production evidence

The scaling incident is caused primarily by how work reaches Postgres:

- Vercel isolates create independent postgres-js pools.
- Local configuration permits eight general plus five RLS connections per isolate.
- Minute-aligned jobs and module-level schedulers can multiply those pools.
- `/api/jobs/tick` can scan and advance work for up to 50 seconds.
- message ingestion can immediately advance corpus jobs using `waitUntil`, keeping
  heavy corpus work in the serverless request runtime.
- live production logs on 2026-07-25 showed pool checkout, authentication, and
  statement timeouts across scheduling, finance, notifications, jobs, Meta, identity,
  and corpus paths.
- the existing `bg_jobs` implementation already has durable state and database leases,
  so it is a safe correctness boundary during migration.

Current hosting evidence:

- Netcup is a one-node Swarm manager.
- the storage node has `minion.storage=netcup-local`.
- at the deployment audit it had approximately 128 GiB free disk and 9 GiB available
  memory;
- the current application and Brains overlays are encrypted and attachable;
- raw ports 4222, 6222, and 8222 were unused;
- gateway services converged 1/1 after a transient restart;
- the Brains vector worker was scaled to 0/0, so broker health cannot be confused with
  end-to-end application readiness.

The current shared `minion_hub` checkout is extensively dirty and behind its remote.
Application integration agents must use a freshly verified remote branch and isolated
worktree after the owners of overlapping files have landed their work. The dark
broker deployment is intentionally isolated from those files.

## 3. Goals

1. A private, TLS-protected, authenticated JetStream instance runs in Swarm with
   persistent file storage and an immutable image digest.
2. No NATS client, route, or monitoring port is public.
3. A bootstrap identity can idempotently create the approved streams and consumers.
4. Restricted publisher and worker identities pass positive ACL tests and fail
   cross-role/administrative access tests.
5. A published message survives a broker restart and is consumed once by the durable
   consumer.
6. A duplicate `Nats-Msg-Id` is stored once inside the configured duplicate window.
7. Hub background jobs move one job type at a time from inline/Vercel advancement to
   a bounded Netcup worker.
8. Supabase worker connections have an explicit global ceiling independent of org
   count.
9. New organizations receive queue placement and credentials through an idempotent
   provisioning workflow.
10. Rollback preserves both JetStream and Postgres state.
11. Vercel never needs a NATS credential or direct network path to the private
    messaging overlay.

## 4. Non-goals

- Replacing Postgres as the canonical chat or job ledger.
- Marking gateway SQLite rows synced after only a JetStream publish acknowledgment.
- Creating one stream, durable consumer, database, or schema per organization.
- Exposing NATS directly to Vercel or the public Internet.
- Claiming high availability from multiple containers on one VPS.
- Deleting the current database job tables or vector outbox.
- Moving media or large message bodies through JetStream; use B2 references.
- Adding Kafka. Kafka can be reconsidered when long event retention, many independent
  consumer groups, or its connector ecosystem becomes a core requirement.

## 5. Architecture

### 5.1 Dark infrastructure

```text
Netcup Swarm
┌───────────────────────────────────────────────────────────────┐
│ minion-messaging stack                                       │
│                                                               │
│  nats-server R1                                               │
│  - private encrypted overlay: minion_messaging_net            │
│  - local external volume: minion_nats_jetstream_data          │
│  - TLS + multi-user auth                                      │
│  - encrypted file-backed JetStream                            │
│  - monitoring 8222 internal only                              │
│                                                               │
│  bootstrap/canary job                                         │
│  - normally replicas=0                                        │
│  - creates stream/consumer and tests publisher + worker ACLs  │
└───────────────────────────────────────────────────────────────┘
```

The broker is a separate stack so gateway, Brains, and broker rollouts have independent
lifecycles. The dedicated overlay is not shared with unrelated services. Later, only
the approved worker and gateway services join it.

### 5.2 Phase-one application path

```text
web request / scheduler
  -> one Postgres transaction commits bg_jobs row + queue_outbox row
  -> bounded Netcup relay claims queue_outbox row
  -> relay publishes QueueEnvelopeV1 { jobId, orgId, jobType, generation }
  -> MINION_JOBS
  -> HUB_BG_V1 durable pull consumer
  -> fetch and re-validate bg_jobs row
  -> existing database lease
  -> advanceJob(jobId)
  -> commit terminal state or next generation + outbox row
  -> ACK only after that database commit
```

This design intentionally avoids a public NATS ingress. Vercel writes only to
Postgres. A singleton relay on Netcup owns one small database pool, claims outbox rows
in bounded batches, publishes over the private overlay, and marks rows published.
A failed publish never rolls back the job row. A crash after publish but before the
published marker can duplicate a wake; the stable message ID, DB lease, and handler
idempotency make that safe.

`queue_outbox` is the repair state model:

```text
id uuid primary key
event_id text unique not null
kind text not null
subject text not null
org_id uuid not null
aggregate_id uuid not null
generation integer not null
payload jsonb not null
status pending|claimed|published|dead
available_at timestamptz not null
claim_owner text null
claim_until timestamptz null
attempts integer not null default 0
published_at timestamptz null
last_error_code text null
created_at / updated_at timestamptz
unique (kind, aggregate_id, generation)
```

Whenever a job becomes eligible for another bounded advancement, the same
transaction increments `bg_jobs.queue_generation` and inserts the matching outbox
row. The relay claims at most 100 rows for 30 seconds using `FOR UPDATE SKIP LOCKED`,
commits the claim before network I/O, publishes, then marks success in a second short
transaction. It polls every second while work exists and uses jittered exponential
backoff up to 30 seconds while idle or disconnected. A once-per-minute reconciler,
guarded by one Postgres advisory lock, inserts missing outbox rows for eligible
allowlisted jobs in batches of 100. Eligibility is an explicit job state predicate,
not a timestamp heuristic: `status = 'queued'` or
`status = 'running' AND lease_until < now()`, intersected with the active org/type
allowlists. A relay claim is eligible when `available_at <= now()` and either status
is `pending` or status is `claimed` with an expired `claim_until`. Publish/network
failure returns the row to `pending` with capped backoff; only deterministic
validation failures become `dead`, and any such transition emits an alert.

### 5.3 Future gateway ledger path

```text
gateway SQLite outbox
  -> MINION_LEDGER
  -> persistent ledger worker
  -> Postgres transaction
  -> receipt stream
  -> gateway receives exact commit receipt
  -> gateway marks exact local rows synced
```

The worker publishes the receipt and receives its JetStream publish acknowledgment
before acknowledging the input message. A crash after Postgres commit but before
input ACK causes redelivery; unique `(org_id, client_id)` remains the final
idempotency fence.

## 6. Broker topology and limits

### 6.1 Server

- stack: `minion-messaging`
- service: `minion-messaging_nats`
- image: `nats:2.14.3-alpine`, pinned by tested digest
  `sha256:c11af972c99ae542de8925e6a7d9c533aa1eb039660420d2074beed6089b3bf0`
- replicas: 1
- placement: `node.labels.minion.storage == netcup-local`
- network: external encrypted overlay `minion_messaging_net`
- volume: external local volume `minion_nats_jetstream_data`
- no published ports
- client port: 4222, overlay only
- cluster port: disabled in the R1 deployment
- monitoring port: 8222, overlay only and never published
- server memory store ceiling: 256 MiB
- server file store ceiling: 20 GiB
- max payload: 64 KiB for the job plane
- stop grace period: 2 minutes
- update order: stop-first
- Swarm failure action: rollback

Twenty GiB is below 16% of the observed free disk at the audit. Re-check free space
before every deploy and require at least 30% filesystem headroom outside NATS limits.

### 6.2 Authentication phase

Dark deployment uses separate versioned Swarm secrets for:

- system password;
- bootstrap/admin password;
- scheduler publisher password;
- bounded worker password;
- TLS CA, server certificate, and server key; and
- JetStream at-rest encryption key.

The server config contains no credentials. Its entrypoint reads secret files into
environment variables immediately before `exec nats-server` and never logs values.
Swarm mounts every secret as mode `0400`, owned by runtime UID/GID `1000:1000`.
The current server certificate SANs are `nats`, `minion-messaging_nats`, and
`minion-messaging_nats.minion_messaging_net`; clients must verify the CA and use one
of those server names.

Static multi-user authentication is acceptable for the internal job-plane canary.
Before the gateway-ledger phase, move runtime gateway identities to operator/account
JWT and NKey credentials so one connector can be revoked without reloading the
server. Keep the operator root seed offline and the account signing key inside the
provisioning boundary.

### 6.3 Accounts and principals

Initial accounts:

| Account | Purpose | JetStream |
|---|---|---:|
| `SYS` | server events and internal monitoring | disabled |
| `MINION` | cell-local job/event plane | enabled |

Initial users:

| User | Rights |
|---|---|
| `minion_system` | system account only |
| `minion_admin` | bootstrap/inspect approved assets; not used by applications |
| `minion_scheduler` | publish `minion.v1.job.>` and `minion.v1.tick.>`; receive only its request inbox |
| `minion_worker` | pull `HUB_BG_V1`, publish ACK/NAK, and use only required info subjects |

No runtime identity receives `>` access.

The dark bootstrap identity currently receives publish and subscribe `>` inside the
`MINION` account because it must create and inspect the locked assets. It is mounted
only into the normally-zero `bootstrap` service, never an application service.
Before application shadow traffic, replace it with an offline/one-shot administrative
workflow or a JWT account signer and rotate the bootstrap credential. Monitoring
8222 is unauthenticated by NATS, so it remains unpublished and reachable only by
services explicitly attached to `minion_messaging_net`. Docker/Swarm manager access
is therefore part of the trusted operations boundary.

Future gateway principals receive exact permissions for:

```text
minion.v1.ledger.<cell>.<org_uuid>.<gateway_uuid>
minion.v1.receipt.ledger.<cell>.<org_uuid>.<gateway_uuid>
```

Subjects contain opaque UUIDs only. Phone numbers, handles, chat IDs, names, and
emails are forbidden in subjects.

## 7. Subjects and envelopes

### 7.1 Subjects

```text
minion.v1.job.<cell>.<org_uuid>.<job_type>
minion.v1.tick.<cell>.<domain>
minion.v1.ledger.<cell>.<org_uuid>.<gateway_uuid>
minion.v1.receipt.ledger.<cell>.<org_uuid>.<gateway_uuid>
minion.v1.dlq.<lane>.<cell>.org.<org_uuid>
minion.v1.dlq.<lane>.<cell>.unscoped
```

Token grammar is closed and testable:

- `cell`: registered value matching `[a-z][a-z0-9-]{1,31}`; phase one registry is
  exactly `lim1`;
- `job_type`, `domain`, and `lane`: registered enum value matching
  `[a-z][a-z0-9_]{1,63}`;
- UUID tokens: canonical lowercase RFC 4122/9562 textual form, including a valid
  version nibble and variant nibble;
- subject constructors accept typed registry values and UUIDs, never arbitrary user
  strings;
- parsers reject wildcards, uppercase, empty tokens, Unicode, extra tokens, and
  unregistered values.

There is no heuristic “PII-like” detector. PII is excluded structurally because the
only free identifiers permitted in subjects are validated UUIDs and closed registry
tokens.

WP-1 registry values are locked to current implementation seams:

```text
job_type:
  groupchat
  brain_corpus_conversations
  brain_ingest
  brain_corpus_business
  statement_ingest

domain:
  generic
  finance
  meta
  notifications
  reminders
  backups
  maintenance

lane:
  jobs
  ticks
  ledger
```

Adding a value requires a shared-package change and test; runtime code may not accept
an arbitrary string merely because it matches the token regex.

### 7.2 Shared envelope

Add a new `@minion-stack/shared/queue` export. The union is discriminated because a
cell-wide scheduler tick is intentionally not organization-scoped:

```ts
interface QueueEnvelopeBaseV1 {
  version: 1;
  eventId: string;
  cellId: string;
  createdAt: string;
  producer: {
    service: string;
    instanceId: string;
    gatewayId?: string;
  };
  traceparent?: string;
}

interface JobWakeEnvelopeV1 extends QueueEnvelopeBaseV1 {
  kind: 'job.wake';
  orgId: string;
  payload: {
    jobId: string;
    jobType: JobTypeV1;
    generation: number;
  };
}

interface SchedulerTickEnvelopeV1 extends QueueEnvelopeBaseV1 {
  kind: 'scheduler.tick';
  payload: {
    domain: SchedulerDomainV1;
    windowStart: string;
  };
}

export type QueueEnvelopeV1 =
  | JobWakeEnvelopeV1
  | SchedulerTickEnvelopeV1;
```

WP-5 adds separately versioned ledger batch/receipt envelopes after its receipt
protocol is approved; WP-1 must not invent their fields. Scheduler tick event IDs are
exactly
`scheduler.tick:v1:<cell>:<domain>:<RFC3339-minute-window>`. `windowStart` must be UTC,
second and fractional-second fields must be zero, and the timestamp must end in `Z`.
Job wake payload:

```ts
interface JobWakeV1 {
  jobId: string;
  jobType: JobTypeV1;
  generation: number;
}
```

Rules:

- set `Nats-Msg-Id` to `eventId`;
- compute a job wake ID exactly as
  `job.wake:v1:<canonical-job-uuid>:<unsigned-generation>`;
- encode with `JSON.stringify` after runtime validation and reject when the resulting
  UTF-8 byte length exceeds 65,536;
- validate the subject and payload independently;
- compare subject cell/org/type to the fetched DB row;
- never put full message content into job wakes;
- invalid or cross-org envelopes are terminal and create a redacted security/DLQ
  event. Use the scoped DLQ subject only after subject and DB org agree; malformed or
  ambiguous identity goes to the `unscoped` quarantine subject;
- transient DB failures use delayed NAK/redelivery.

## 8. Streams and consumers

### 8.1 `MINION_JOBS`

```text
subjects:
  minion.v1.job.>
  minion.v1.tick.>
storage: file
retention: limits
replicas: 1
max_age: 24h
max_bytes: 2 GiB
max_msg_size: 64 KiB
discard: old
duplicate_window: 10m
```

Job wakes point to durable DB records, so 24-hour retention is sufficient when a
repair scan exists. The stream is not the canonical job history.

### 8.2 `HUB_BG_V1`

```text
type: durable pull
filter: minion.v1.job.lim1.>
deliver: all
ack: explicit
ack_wait: 90s
max_ack_pending: 4
max_deliver: 8
backoff: 1s, 5s, 30s, 2m, 10m
```

The consumer controls database pressure. Start with one worker replica and maximum
four in-flight jobs. The worker's total Supabase pool ceiling is four connections:
two general and two RLS. The outbox relay shares that process-wide pool. If relay and
worker are split into processes later, their combined configured ceilings must still
sum to four until a measured capacity review changes the budget. Do not create pools
per organization.

### 8.3 Scheduler tick consumer

WP-4 adds durable pull consumer `HUB_TICKS_LIM1_V1` before any tick publisher is
enabled:

```text
filter: minion.v1.tick.lim1.>
ack: explicit
ack_wait: 30s
max_ack_pending: 1
max_deliver: 8
```

It converts a deterministic tick into the appropriate job and outbox rows in one
database transaction, then ACKs. There is exactly one tick consumer per cell,
covering the closed domain registry, never one per domain or organization. A future
cell uses `HUB_TICKS_<CELL>_V1` and an exact cell filter. Until
`HUB_TICKS_LIM1_V1` exists and passes its canary, no production publisher may emit
`minion.v1.tick.>`.

### 8.4 DLQ and later streams

Before shadow application traffic, WP-3 creates `MINION_DLQ` with a 7-day/512 MiB
limit and a write-only worker permission. Its envelope contains event ID, reason
code, subject hash, org UUID when safely parsed, producer, and timestamps—never the
original payload or secret. A fully validated org uses
`minion.v1.dlq.<lane>.<cell>.org.<org_uuid>`; malformed or conflicting identity uses
`minion.v1.dlq.<lane>.<cell>.unscoped`. Read access is limited to the operations
identity.

`MINION_LEDGER` is deferred until Phase 5. Do not create empty per-org streams.

## 9. Runtime modes

```text
QUEUE_DISPATCH_MODE=legacy|shadow|active|hold
QUEUE_ALLOWED_JOB_TYPES=brain_corpus_conversations,...
QUEUE_ALLOWED_ORG_IDS=<uuid>,...
HUB_RUNTIME_ROLE=web|queue-worker
BG_INLINE_ADVANCE_ENABLED=true|false
LEDGER_TRANSPORT=http|shadow|jetstream|hold
```

- `legacy`: current paths are authoritative; NATS is dark.
- `shadow`: write/relay/consume/validate outbox events, but do not advance work.
- `active`: only the intersection of allowed job types and allowed org IDs advances
  through the worker.
- `hold`: continue committing DB jobs/outbox rows, but stop relay publishing and new
  pulls; this is the broker-maintenance state.
- `QUEUE_ALLOWED_ORG_IDS` is mandatory in `active`; an empty value means no orgs.
  The literal `*` is rejected until the 100-org load gate and an explicit production
  configuration migration enable it.

Unknown or missing values fail closed to `legacy` for job dispatch and `http` for the
unchanged gateway path.

Flag precedence is locked:

| Mode | Outbox write | Relay publish | Worker advance | Legacy cron/inline |
|---|---:|---:|---:|---:|
| `legacy` | optional telemetry only | no | no | yes |
| `shadow` | yes | yes | no | yes |
| `active`, not allowlisted | yes | yes | no | yes |
| `active`, allowlisted | yes | yes | yes | no for that exact org/type |
| `hold` | yes | no | no | no new queue pulls; operator chooses legacy only after DB-headroom check |

`BG_INLINE_ADVANCE_ENABLED` is evaluated only for legacy/non-allowlisted work. A
startup validator rejects configurations that would allow both inline and queue
advancement for the same org/type.

## 10. Work packages for subagents

Every implementation agent must:

1. read root `AGENTS.md`;
2. read the target subproject's `CLAUDE.md` or `AGENTS.md`;
3. verify the current remote branch and dirty tree;
4. work from a clean isolated worktree based on the verified remote;
5. avoid secrets and production payloads in fixtures/logs;
6. end its package with the listed tests and an atomic scoped commit;
7. not deploy until the orchestrator verifies the package gates.

Dependency DAG:

```text
WP-0 complete ──> WP-0H pre-shadow hardening ────────────────┐
WP-1 shared contract ──────────────> WP-2 DB outbox ──────────┼─> WP-3 relay + job worker
                                                               │       ├─> WP-4 schedulers
                                                               │       └─> WP-7 observability/DR
WP-6 credentials/cells ────────────────────────────────────────┴─> WP-5 gateway ledger
                                                                      (after WP-0..4 soak)
```

WP-7 telemetry required by a rollout gate must land before that gate. WP-5 cannot
start production traffic until WP-6 NKey/JWT provisioning is complete.

### WP-0 — dark broker infrastructure

**Owner repo:** `minion`  
**Files:**

```text
deploy/swarm/messaging/stack.yml
deploy/swarm/messaging/nats-server.conf
deploy/swarm/messaging/nats-entrypoint.sh
deploy/swarm/messaging/bootstrap.sh
deploy/swarm/messaging/deploy.sh
deploy/swarm/messaging/smoke.sh
deploy/swarm/messaging/*.test.sh
```

Deliver:

- dedicated network and volume creation;
- versioned secret creation without printing values;
- TLS issuance/rotation scaffolding;
- config validation;
- idempotent stream/consumer bootstrap;
- restricted publisher and consumer ACL canaries;
- restart persistence and duplicate-ID tests;
- live status and rollback commands.

Done when all local tests pass and the production dark deployment passes Section 12.

### WP-0H — pre-shadow broker hardening

**Owner repo:** `minion/deploy/swarm/messaging`  
**Prerequisite:** WP-0 dark deployment; **required before Phase 1 shadow traffic**.

Deliver:

- replace the bootstrap account's publish/subscribe `>` with only the JetStream API
  subjects needed to create, update, and inspect the locked streams/consumers plus
  `_INBOX.>` replies;
- leave synthetic data publication to the scheduler canary identity, not admin;
- create a new versioned bootstrap credential and immutable Swarm config;
- deploy, rerun all positive/negative ACL and persistence canaries, scale bootstrap
  to zero, then revoke/delete the old bootstrap secret only after the new config is
  healthy;
- record the exact new ACL, config hash, task ID, and rotation evidence.

No application credential may mount the bootstrap secret. WP-0H stops after the dark
canaries; it does not connect Hub traffic.

### WP-1 — shared queue contract

**Owner repo:** meta-repo  
**Files:**

```text
packages/shared/src/queue/envelope.ts
packages/shared/src/queue/subjects.ts
packages/shared/src/queue/index.ts
packages/shared/src/index.ts
packages/shared/test/queue-*.test.ts
```

Deliver:

- runtime validator and TypeScript types;
- subject constructors/parsers;
- UUID/cell/token restrictions;
- maximum serialized size;
- trace metadata;
- fixtures shared by Hub and gateway.

Tests:

- subject/envelope round trip;
- wildcard, uppercase, Unicode, extra-token, and unregistered-token rejection;
- cell/org/type mismatch rejection;
- version mismatch;
- oversized envelope;
- stable job wake ID for exact `<job UUID, generation>`;
- stable scheduler tick ID and rejection of non-minute/non-UTC windows;
- scoped and unscoped DLQ subject round trips;
- UTF-8 byte boundary at 65,536/65,537 bytes;
- package build, typecheck, lint, and root consumer compatibility.

WP-1 ends with a versioned `@minion-stack/shared` package artifact. Hub and gateway
must consume the same published/local-workspace version; copied contract code is not
accepted.

### WP-2 — Hub transactional outbox

**Owner repo:** `minion_hub`  
**Clean initial seams:**

```text
src/server/db/schema/queue-outbox.ts
src/server/db/migrations/<timestamp>_queue_outbox.sql
src/server/queue/config.ts
src/server/queue/outbox.ts
src/server/services/bg-runtime.ts
```

Deliver:

- `queue_outbox` schema and migration from Section 5.2;
- `bg_jobs.queue_generation` with a safe default and check constraint;
- one transaction that updates job eligibility/generation and inserts its outbox row;
- deterministic event/subject construction using WP-1;
- `legacy|shadow|active` modes;
- allowed job-type and org intersection;
- structured outbox telemetry without payloads;
- singleton bounded reconciler implementation and tests.

Rules:

- DB job and outbox intent commit atomically;
- Vercel has no NATS client, credential, or network path;
- no import-time connection or scheduler;
- initially store job pointers only;
- migration is backward compatible with legacy processing and needs no historical
  payload backfill.

Tests:

- NATS disabled is a no-op;
- job/outbox atomic commit and rollback;
- generation increment and unique `(kind, aggregate_id, generation)`;
- one-org/one-type active allowlist;
- non-canary org remains legacy;
- conflicting inline/worker flag configuration fails startup;
- crash simulation cannot produce a job without its required outbox row;
- bounded reconciler, advisory-lock singleton, and stable repair event ID.

### WP-3 — persistent Hub relay and worker

**Owner repo:** `minion_hub`  
**New deployment:** queue worker image from the same Hub commit

Deliver:

- adapter-node build selected independently from Vercel build;
- `HUB_RUNTIME_ROLE=queue-worker`;
- one singleton outbox relay using the claim/publish/mark protocol in Section 5.2;
- optional separate relay/worker processes sharing the same image;
- NATS client created only inside the Netcup runtime;
- durable pull consumer bound to `HUB_BG_V1`;
- fetch and validate DB row before execution;
- existing DB lease plus `advanceJob(jobId)`;
- max four in-flight jobs;
- two general plus two RLS DB connections;
- SIGTERM drain: stop pulls, finish or NAK in-flight, drain NATS, close PG;
- private health/readiness endpoint.

Remove `startBackupScheduler()` from the serverless web role. Backup work becomes a
future worker lane.

Worker outcome contract:

| Outcome after re-validation/claim | JetStream action | DB/security action |
|---|---|---|
| job completed or cancelled | ACK | no mutation |
| job missing | TERM | redacted `job_missing` event + DLQ pointer |
| subject/envelope/DB org or type mismatch | TERM | no job mutation; `scope_mismatch` event + DLQ pointer |
| lease held by another healthy worker | delayed NAK with jitter | no mutation |
| transient DB/NATS dependency error | NAK using configured backoff | increment telemetry only |
| bounded advancement commits terminal state | ACK | commit result |
| bounded advancement commits next generation/outbox row | ACK | next wake is a new event |
| handler terminal error | TERM after handler marks failed | redacted DLQ pointer |
| process receives SIGTERM before commit | no ACK; drain or connection close | DB transaction rolls back |
| commit succeeds but ACK is lost | redelivery then ACK as already-completed generation | idempotent no-op |

Long handlers must either complete within 60 seconds or call JetStream
`inProgress()` before half of the 90-second `ack_wait`; the DB lease must be renewed
in the same cadence. A hard per-attempt execution timeout is 10 minutes. Exceeding it
causes a controlled NAK and releases/expires the DB lease.

Initial active type: `brain_corpus_conversations`.

Do not modify the current dirty shared checkout. Relevant overlapping files include:

- `src/hooks.server.ts`;
- `src/routes/api/jobs/tick/+server.ts`;
- `src/server/services/messages.service.ts`;
- `src/server/services/brain-corpus-jobs.service.ts`;
- `src/server/services/brain-corpus.service.ts`;
- `src/server/services/meta/meta-sync.service.ts`.

Merge only after those owners' changes land, then rerun the full test matrix.

### WP-4 — scheduler migration

**Owner repo:** `minion_hub`

Move lanes in this order:

1. generic `bg_jobs`;
2. finance resumable jobs;
3. Meta resumable jobs;
4. notifications;
5. reminders;
6. backups and low-frequency maintenance.

A singleton scheduler publishes deterministic tick envelopes. NATS is not itself a
calendar scheduler. For example, use the exact canonical `eventId` and
`Nats-Msg-Id`
`scheduler.tick:v1:lim1:notifications:2026-07-25T21:43:00Z` to collapse duplicate
scheduler starts.

WP-4 owns creation and bootstrap of `HUB_TICKS_LIM1_V1`, its tick router, and a test
that the same deterministic tick produces one set of job/outbox rows. The scheduler
and tick consumer run only in the Netcup worker role. Serverless Vercel code contains
no module-level timer.

No stream, consumer, cron, or process is created per org.

### WP-5 — gateway ledger transport and receipt protocol

**Owner repo:** `minion` plus Hub worker

Prerequisite: WP-0 through WP-4 production soak, WP-6 NKey/JWT gateway identity
provisioning, and a clean refreshed `DEV` worktree.

Gateway changes:

- retain SQLite as first durability boundary;
- add dispatch ID and published/receipt timestamps;
- publish batches to exact org/gateway subjects;
- keep rows unsynced until exact Postgres receipts return;
- reconnect with jitter;
- on NATS unavailability enter `hold`, not direct DB surge;
- enforce a configurable local outbox ceiling with warning/critical disk thresholds;
  stop channel intake or spill media references safely before the host filesystem is
  endangered;
- prune synced rows after a bounded 1–7 day replay window;
- canonicalize account aliases so `default` and later configured account identities
  do not duplicate source history.

Worker changes:

- pull 100–500 messages;
- validate subject/envelope org;
- one org-scoped DB transaction per batch;
- insert/upsert using canonical idempotency;
- commit;
- publish exact accepted-client-ID receipt and wait for pub-ack;
- ACK input only after receipt pub-ack;
- redacted DLQ for poison/cross-org messages.

### WP-6 — provisioning, credentials, and cells

**Owner repo:** meta-repo provisioning package plus `minion_hub` admin API. The
orchestrator must name the exact package/route after inspecting the then-current
control-plane implementation; do not invent a second provisioner.

Extend the idempotent org provisioner with:

1. cell assignment;
2. exact subject prefix;
3. per-gateway NKey/JWT credential issuance;
4. Swarm or gateway secret reference;
5. positive publish canary;
6. cross-org denial canary;
7. credential fingerprint and expiry audit record;
8. retry-safe revocation/rotation.

Do not store seed material in Postgres. Store only identifiers, fingerprints, status,
and secret-manager references.

Rotation uses an overlap window: issue the new credential, pass positive and
cross-org negative canaries, update the target service, observe the new fingerprint,
then revoke the old credential. Compromise response skips overlap after affected
publishers enter `hold`. Record issue/revoke time and require a 15-minute revocation
objective for online gateways.

### WP-7 — observability, backup, and restore

**Owner repo:** `minion/deploy/swarm/messaging` for collector/backup jobs and the
meta-repo operations docs/dashboard definition.

Deliver:

- internal-only monitoring collector or Surveyor;
- queue lag, oldest pending, ACK latency, redelivery, max-delivery, auth failure,
  disk, and backup-age alerts;
- daily account/stream backup encrypted before B2 upload;
- SHA-256 manifest;
- monthly isolated restore drill;
- runbook for R1 node loss;
- capacity dashboard by cell and lane, not payload/org content.

The collector is the only service besides NATS/bootstrap allowed to reach 8222.
Backups use authenticated encryption with an operations-managed key distinct from
the JetStream at-rest key; the concrete B2/KMS boundary and restore approvers must be
recorded before the first production backup job is enabled.

## 11. Required local tests

### 11.1 Broker/config

- config validates with the pinned server image;
- no secret value exists in Git, image, logs, or process arguments;
- plaintext connection fails;
- wrong CA fails;
- admin, scheduler, and worker authenticate independently;
- scheduler cannot subscribe to work subjects;
- worker cannot publish job subjects;
- scheduler/worker cannot access `$SYS.>`;
- monitoring is not published.

### 11.2 JetStream semantics

- bootstrap is idempotent;
- stream and consumer match the locked config;
- publish acknowledgment succeeds;
- message survives server restart before consumption;
- duplicate `Nats-Msg-Id` creates one stored message;
- durable consumer resumes after client restart;
- ACK removes the message from that consumer's pending state; limits-retention keeps
  the stream message until its age/byte limit removes it;
- failed/unacked work redelivers;
- max payload is enforced.

### 11.3 Application unit/integration

- envelope/subject validator suite;
- atomic job/outbox transaction;
- crash after outbox claim before publish makes the claim eligible again;
- crash after publish before outbox mark republishes the same message ID safely;
- reconciliation is singleton, bounded, and stable beyond the 10-minute duplicate
  window;
- worker/web runtime role isolation;
- DB lease prevents concurrent advancement;
- crash before DB commit redelivers;
- crash after DB commit before ACK is idempotent;
- invalid envelope is terminal;
- cross-org scope mismatch writes nothing;
- completed, cancelled, missing, lease-held, terminal-error, and transient-error
  outcomes follow the Section 10 action table;
- long work renews ACK progress and DB lease; SIGTERM is tested before claim, during
  DB work, after commit, and before ACK;
- shadow mode produces no application side effect;
- the active one-org canary leaves every non-canary org on legacy execution;
- every mode/allowlist/inline flag transition is tested;
- DB unavailable grows backlog without a busy loop;
- NATS unavailable leaves the DB job queued or gateway row local.
- full stream/disk pressure fails visibly without bypassing `hold`;
- TLS and credential rotation overlap succeeds, and revoked credentials fail;
- rollback never permits queue and legacy paths to perform the same external side
  effect concurrently.

### 11.4 Full repo gates

Hub:

```bash
bun run check
bun run test
bun run build
```

Run focused tests for queue, bg runtime, corpus jobs, message ingest, finance, Meta,
notifications, and reminders before the full suite.

Gateway phase:

```bash
pnpm tsgo
pnpm test
pnpm build
```

Shared package gate:

```bash
pnpm --filter @minion-stack/shared build
pnpm --filter @minion-stack/shared test
pnpm run typecheck-all
pnpm run lint-all
```

## 12. Production dark-deployment gates

Do not connect real application traffic until every item passes:

1. resolve the exact production host and Swarm manager identity;
2. verify node label and at least 30% disk headroom after the configured NATS limit;
3. verify 4222/6222/8222 are not already in use;
4. pull the exact digest and record the resulting image ID;
5. create encrypted overlay and external volume;
6. create versioned secrets without displaying their contents;
7. render and validate the stack;
8. deploy with NATS only;
9. verify service 1/1 and health endpoint reports JetStream enabled;
10. prove no NATS port is published;
11. bootstrap `MINION_JOBS` and `HUB_BG_V1`;
12. scheduler credential publishes a synthetic job;
13. worker credential consumes and ACKs it;
14. scheduler credential is denied worker/admin operations;
15. worker credential is denied scheduler/admin operations;
16. publish a message, restart the broker, and consume it afterward;
17. publish the same message ID twice and prove a one-message stream delta;
18. inspect logs for secret values and authentication/config errors;
19. record stream, consumer, disk, image digest, and task identity;
20. leave application modes in `legacy` and bootstrap replicas at zero.

## 13. Application rollout

### Phase 0 — dark broker

- deploy and pass Section 12;
- no application traffic;
- soak server process and disk telemetry.

### Phase 1 — shadow job wakes

- Hub atomically writes job/outbox rows;
- the Netcup relay publishes job wakes over the private overlay;
- worker validates messages and DB rows but does not advance;
- legacy cron/inline paths remain authoritative;
- compare outbox-created, published, delivered, validated, and DB job counts.

Gate:

- zero cross-org or unknown-type acceptance;
- zero eligible DB jobs without an outbox row after bounded reconciliation;
- crash-after-claim and crash-after-publish tests recover without lost work;
- stable NATS and DB connections.

### Phase 2 — one active job type

- enable `brain_corpus_conversations` for one test org;
- set the exact org UUID in `QUEUE_ALLOWED_ORG_IDS`; wildcard is forbidden;
- consumer advances with maximum four in-flight;
- keep the singleton bounded outbox reconciler;
- disable inline advancement only for the allowlisted type after the canary.

Gate:

- zero pool checkout timeouts caused by the worker;
- DB connections never exceed configured global cap;
- queue drain rate exceeds arrival rate;
- corpus job state and Qdrant receipts converge;
- rollback drill succeeds.

### Phase 3 — expand jobs

Add finance, Meta, notifications, reminders, and backups one lane at a time. Each lane
must pass duplicate/redelivery and external-side-effect idempotency tests.

### Phase 4 — provision all new orgs

Enable cell placement and credential/ACL provisioning. Existing orgs migrate with
positive and negative subject canaries.

### Phase 5 — gateway ledger

Deploy the receipt protocol. Start with a synthetic org, then the smallest
non-sensitive org. Soak before PINONITE or FACES. Do not combine initial cutover with
a historical import.

## 14. Capacity and alert policy

Initial warning/critical thresholds:

| Signal | Warning | Critical |
|---|---:|---:|
| host filesystem | 70% | 80% |
| configured JetStream bytes | 70% | 85% |
| oldest pending job wake | 5 min | 30 min |
| publish ACK latency | p95 250 ms | p99 1 s |
| publish error rate | 0.1% | 1% |
| redelivery ratio | 1% | 5% |
| max-delivery advisory | — | any |
| auth/permission failure | sustained | unexpected identity |
| backup age | 26 h | 48 h |
| TLS expiry | 30 days | 7 days |
| worker DB connections | 75% cap | cap exceeded |
| sustained drain rate | <1.25× arrival | <= arrival |

Load gate before 100-org activation:

- 10,000 synthetic job-pointer events across 100 org UUIDs;
- worker concurrency four;
- zero event loss;
- zero cross-org acceptance;
- zero Supabase checkout timeouts;
- NATS restart during load;
- DB outage and recovery;
- backlog drains after recovery;
- record p50/p95/p99 queue wait and handler duration.

## 15. Backup and disaster recovery

R1 backup:

- daily JetStream account/stream backup including durable consumer state;
- validate the backup and fail on critical warnings;
- encrypt before upload to the existing B2 backup boundary;
- store SHA-256, config, image digest, and timestamp;
- retain 7 daily, 4 weekly, and 3 monthly copies initially;
- alert when the newest verified backup is older than 26 hours.

Monthly restore drill:

1. create an isolated network and volume;
2. start the pinned server without production routes;
3. restore the newest backup;
4. verify stream config, counts, timestamps, and consumer state;
5. consume a bounded sample without any Supabase connection;
6. record recovery time and evidence;
7. remove the isolated environment only after evidence is saved.

Future HA requires three JetStream nodes in independent failure domains with R3
streams, route TLS, and quorum-loss testing.

## 16. Rollback

Broker rollback:

1. set `QUEUE_DISPATCH_MODE=hold`, verify the relay stops publishing, and verify
   workers stop new pulls;
2. stop new pulls;
3. allow in-flight DB transactions to complete;
4. record stream and consumer state;
5. verify the target image/config can read the current JetStream store format; if
   not, restore to an isolated volume instead of in-place rollback;
6. use Swarm rollback to the previous immutable image/config;
7. rerun TLS, publisher, worker, persistence, and ACL canaries;
8. resume the relay/worker from durable state or move to `legacy` only after the
   application rollback sequence below.

Application rollback:

1. set `QUEUE_DISPATCH_MODE=hold`;
2. wait for or NAK in-flight queue work and verify zero ACK-pending;
3. scale queue relay/worker to zero;
4. verify DB pool headroom and singleton ownership of every legacy scheduler;
5. set `QUEUE_DISPATCH_MODE=legacy`;
6. restore low-frequency or previous cron advancement;
7. re-enable inline advancement only for the exact rolled-back org/type set;
8. verify no queue worker remains capable of the same external side effect;
9. keep `bg_jobs`, `queue_outbox`, stream, volume, credentials, and backups intact.

Never purge JetStream or delete DB queue state during rollback. Do not automatically
fall back from gateway `hold` to direct DB writes; that can recreate the pool incident.
Credential/TLS rotation rollback keeps both versions only for the bounded overlap
window, restores the last verified client fingerprint, and revokes the failed version.
The JetStream encryption key is never rotated in-place without a separately tested
backup/restore procedure.

## 17. Definition of done

Infrastructure is done when:

- the dark broker is deployed 1/1;
- TLS, auth, ACL, persistence, restart, dedupe, and private-exposure gates pass;
- exact immutable image and live state are recorded;
- no application cutover occurred implicitly.

The event-plane project is done when:

- serverless runtimes do not own recurring background consumers or module-level
  schedulers;
- all active background lanes use bounded persistent workers;
- Supabase connection count is globally capped independent of org count;
- 100-org synthetic load passes;
- queue placement and credentials are idempotently provisioned;
- gateway ledger receipts preserve the Postgres-commit contract;
- backup and restore drills pass;
- production telemetry shows no queue-induced pool checkout timeouts during the soak.

## 18. Primary references

- [NATS JetStream concepts](https://docs.nats.io/nats-concepts/jetstream)
- [JetStream Docker deployment](https://docs.nats.io/running-a-nats-service/nats_docker/jetstream_docker)
- [NATS server configuration](https://docs.nats.io/running-a-nats-service/configuration)
- [JetStream resource management](https://docs.nats.io/running-a-nats-service/configuration/resource_management)
- [NATS accounts](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/accounts)
- [NATS authorization](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization)
- [NKey authentication](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/nkey_auth)
- [NATS TLS](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls)
- [JetStream consumers](https://docs.nats.io/nats-concepts/jetstream/consumers)
- [JetStream deduplication and ACK semantics](https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive)
- [NATS monitoring](https://docs.nats.io/running-a-nats-service/nats_admin/monitoring)
- [JetStream disaster recovery](https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/disaster_recovery)
- [JetStream encryption at rest](https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/encryption_at_rest)
- [Docker Swarm secrets](https://docs.docker.com/engine/swarm/secrets/)

## 19. Production execution record

WP-0 was executed on 2026-07-25. This is an infrastructure dark deployment:
the broker is live and connected to the restricted canary publisher and worker,
but Hub and gateway production traffic have **not** been cut over.

```text
Host identity: root@152.53.91.108 / v2202603342963439612
Swarm node ID: iaok5pq4g8hoxaz1ksuy7hh41
Node labels: minion.region=eu-west, minion.storage=netcup-local
Pre-deploy disk/RAM: 128 GiB filesystem free; approximately 9.4 GiB RAM available
NATS image digest: nats:2.14.3-alpine@sha256:c11af972c99ae542de8925e6a7d9c533aa1eb039660420d2074beed6089b3bf0
NATS server version: 2.14.3
Source config hash: ec82954cbc07efbe64a7dc856428e69845cbecd27163549236242f3024d21838
Rendered runtime config hash: a393cf64e9d93fee94a9d2d781fd9613bda76683ccc0cddf3e17e50998872222
Stack hash: 5ff66a3c2db7744b286586137b5b4b1c829065aa17b7b979ead2cabe652c62b4
Volume: minion_nats_jetstream_data, local driver
Network: minion_messaging_net, encrypted attachable overlay
Service task: ogs6stfeq6o1aduiqt61la1v7, healthy, 1/1
TLS test: PASS; trusted CA succeeds and plaintext/untrusted TLS fails
ACL tests: PASS; scheduler cannot inspect streams and worker cannot publish jobs
Restart persistence test: PASS; prod-persist-20260725T231749Z-2371828 survived a forced broker restart
Duplicate-ID test: PASS; the second publish retained stream sequence 4 and returned Duplicate=true
Public exposure test: PASS; no Swarm published ports, host listeners, or externally reachable 4222/6222/8222
Stream/consumer state: MINION_JOBS has 4 canary messages / 1,953 bytes; HUB_BG_V1 has 0 pending, 0 ACK-pending, 0 redelivered
Post-deploy disk/RAM: 128 GiB filesystem free; 9.3 GiB RAM available
Rollback command: docker service rollback minion-messaging_nats
Deployment outcome: PASS - dark JetStream infrastructure and canary connection only; no application cutover
```

The first Swarm start failed closed before accepting traffic because the
read-only root filesystem prevented writing a configured PID file under
`/tmp`. The unnecessary PID setting was removed, the complete local test suite
was rerun, the immutable Swarm config key was advanced to v2, and the
deployment then passed. Historical failed tasks remain visible in Swarm task
history; the current task is healthy.
