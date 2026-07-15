# Org-Agnostic Minion Service Fabric

**Date:** 2026-07-13  
**Status:** implementation-ready for Phases 0–4; Phase 5 requires provider qualification  
**Scope:** gateway ingress, agent runtimes, org storage, Paperclip, shared dependencies,
Docker Swarm, and external traffic routing  
**Related:**
[`2026-07-13-minion-gateway-swarm-cutover.md`](./2026-07-13-minion-gateway-swarm-cutover.md),
[`2026-07-10-per-org-volume-tenancy.md`](./2026-07-10-per-org-volume-tenancy.md), and
[`2026-07-11-ws-failover-eager-reconnect.md`](./2026-07-11-ws-failover-eager-reconnect.md)

## 1. Executive decision

Minion will run as an org-agnostic service fabric. Organizations own data, not
gateway instances:

- Supabase is the canonical store for org identity, membership, routing metadata,
  leases, chat/session records, the message ledger, and structured memory.
- Provider-backed, single-attach volumes qualified by this spec remain the store
  for state that still requires a filesystem: legacy SQLite/WAL, channel
  credentials, agent workspaces, browser profiles, indexes, and local media
  awaiting upload. Local Docker volumes are transitional only.
- `gateway-router` is a stateless, active-active WebSocket/API pool. Every replica
  accepts every organization and mounts no org volume.
- `runtime-worker` is a generic image. A running task temporarily leases one org
  volume and owns that org's stateful channels, cron, SQLite, and agent processes.
- `fleet-controller` creates, drains, fences, and replaces runtime leases. It is
  independent of Paperclip so Paperclip can itself be managed as a workload.
- Docker resources use role names or opaque IDs. Organization names and IDs never
  appear in service names, container names, node labels, or image tags.
- Paperclip is split into replicated API, leased scheduler, and worker services;
  its durable database moves off a single local Compose container.

This is a deliberate split of the current monolith, not a feature reduction. The
single active writer per org remains until all SQLite/channel state supports safe
multi-writer operation. Reliability comes from active-active ingress plus fenced,
automatic active-passive runtime replacement.

## 2. Confirmed live baseline

The following was verified on the production host on 2026-07-13 while this spec
was written.

| Area | Confirmed state |
|---|---|
| Swarm | One Ready/Active manager and no additional nodes |
| Gateway services | `minion_gateway-default` and `minion_gateway-faces`, each 1/1 healthy |
| Gateway image | Both pinned to `ghcr.io/nikolasp98/minion-ai@sha256:3f844c661641d29754adfd3b8ba621fd5d2fc32ba818615659bf8375682064d8` |
| Public path | `wss://gateway.minion-ai.org` reached the container and returned 25 agents |
| Faces path | `wss://netcup.donkey-agama.ts.net:10000` reached the container and returned 4 agents |
| OS gateway | Legacy `minion-gateway.service` inactive; ports 18789/18790 owned by Docker |
| Durable state | `minion_default_state`, `minion_faces_state`, and `minion_runtime_config` Docker volumes present |
| Paperclip | One Compose API container plus Postgres and vault-sync; image uses mutable `latest` |
| Legacy Paperclip | Two additional host Node process trees still listen on 127.0.0.1:3101 and :3102 |
| Shared dependencies | Infisical, Valkey, 1Password Connect, and Omnisearch remain single-host Compose workloads |
| Valkey exposure | A single container is bound on host port `0.0.0.0:6379` |

Therefore, the container cutover is live and serving production traffic. It is
not yet an HA deployment: one server, one manager, local volumes, one replica per
org, and single-instance dependencies leave multiple single points of failure.

## 3. Invariants

The implementation is complete only while all of these remain true:

1. **Org ownership:** an org owns Supabase rows and a storage-volume record, never
   a gateway or host.
2. **Stateless ingress:** a router can be killed and replaced without migrating
   org data or changing an org-specific URL.
3. **Generic compute:** images contain product code and capabilities only; no org
   config, credentials, workspace, memory, or org-derived layer.
4. **Layered single writer:** a valid fencing token gates routing, runtime startup,
   lease renewal, cron/channels, and secret renewal. Runtime self-quiescing reduces
   risk, but only verified provider/node fencing proves that old filesystem and
   cached-credential effects are revoked before cross-node replacement.
5. **Fail closed:** missing org mappings, invalid leases, and stale fencing tokens
   deny access. They never fall back to cross-org visibility.
6. **Opaque infrastructure identity:** an operator needs Supabase authorization to
   map an opaque runtime/service ID back to an org.
7. **Durability before availability:** a replacement does not start if the old
   volume attachment or writer cannot be fenced conclusively.
8. **No circular control plane:** Paperclip may request work, but gateway/runtime
   recovery does not depend on Paperclip being available.
9. **Pinned releases:** production services use immutable digests, never `latest`.
10. **Revocable credentials:** Swarm secrets contain bootstrap material only.
    Lease-bound org credentials are short-lived and rejected server-side after
    expiry; removing a Swarm secret is not treated as revocation from a running or
    partitioned task.
11. **Feature parity:** all existing channels, tools, cron, browser/runtime tools,
    memory, sessions, and workspaces remain supported through explicit services or
    images.

## 4. Target topology

```text
Clients / Hub / Site / Paperclip adapter
                  |
          canonical WSS/API hostname
                  |
       multi-origin external load balancer
              /           \
       node edge A       node edge B       ...
              \           /
        gateway-router (2+ active replicas)
                  |
       orgId from verified JWT, never URL
                  |
      runtime directory + request transport
        /              |               \
runtime-7f2c      runtime-a91e      runtime-31bd
(opaque lease)    (opaque lease)    (opaque lease)
     |                 |                 |
portable RWO       portable RWO      portable RWO
org volume         org volume        org volume

          fleet-controller (2+ tasks, one elected writer)
                  |
    Supabase lease/fence state + Docker API proxy

Paperclip API (2+) -- Paperclip workers (N) -- Supabase/Postgres
Valkey HA/managed cache and queue -- secret broker -- observability
```

### 4.1 Why the process must be split

The current gateway owns both request ingress and stateful runtime behavior. The
two halves have different scaling rules:

| Capability | Desired scaling | Reason |
|---|---|---|
| WebSocket/API ingress, auth, routing | Active-active | No org filesystem ownership required |
| Agent execution | Horizontal across orgs/jobs | CPU/memory isolation and independent replacement |
| SQLite/WAL and filesystem state | One active writer per org | Current storage engines are not multi-writer safe |
| Telegram/WhatsApp/channel sockets | One active owner per account | Duplicate consumers conflict or duplicate effects |
| Cron/hooks/ledger consumers | One active owner or fenced jobs | Duplicate execution is unsafe without idempotency |

Calling every process a gateway obscures this. After the split, only the routers
are gateways; filesystem/channel owners are runtime workers.

### 4.2 Service catalog

| Service | State | Scale | Privilege |
|---|---|---|---|
| `gateway-router` | Stateless | 2+ active replicas | Network access; no org volumes or Docker API |
| `fleet-controller` | Supabase-backed lease state | 2+ replicas, one elected writer | Narrow Docker API proxy; no org secrets |
| `runtime-<opaque-id>` | One leased org volume | One active task per leased volume | Org-scoped secret capability and RWO mount |
| `paperclip-api` | Stateless | 2+ active replicas | Paperclip DB only |
| `paperclip-scheduler` | Leased singleton | Active-passive | Job scheduling, no Docker socket |
| `paperclip-worker` | Ephemeral job state | N replicas | Explicit runtime/tool capabilities |
| `valkey` | Ephemeral coordination | Managed HA or replicated/Sentinel | Private overlay only |
| `edge` | TLS/proxy config | Global or 1+ per ingress node | Published 443 only |

Swarm cannot assign a different dynamic volume to each replica of one service.
During the filesystem-backed phase, the controller therefore creates one
single-replica service per active runtime lease. The service name contains only a
random lease identifier. Once legacy filesystem databases move to Supabase/object
storage, runtime workers can become a conventional shared replica pool.

The controller keeps one live service per active org, removes stopped services after
recording terminal evidence, and retains lease history only in Supabase. Its
reconciler is paginated, rate-limited against the Docker API, and capacity-tested at
projected org counts before onboarding raises the fleet limit. A saturated fleet
queues or rejects activation explicitly; it does not create an unbounded burst of
Swarm mutations.

## 5. Identity, routing, and request lifecycle

### 5.1 Identities

- `org_id`: canonical Supabase organization ID; present in verified JWTs and data
  rows, absent from Docker naming.
- `instance_id`: random identity for a router, controller, or worker process.
- `runtime_id`: durable logical runtime record for an org, not a container name.
- `lease_id`: random ID for one ownership term.
- `fencing_token`: monotonically increasing integer for each successful takeover.
- `request_id`: globally unique request ID used for tracing and deduplication.
- `idempotency_key`: stable key for retryable side effects.

Container/task IDs remain Docker-generated. Runtime service names use a truncated
random lease ID such as `runtime-7f2ce18d`; the org mapping exists only in protected
Supabase rows. Docker volume names and provider references are opaque as well, for
example `vol-4c91b812`; the protected `org_storage_volume` row is the only org map.

### 5.2 Client request path

1. Client connects to the canonical gateway hostname.
2. Router verifies the OIDC/JWT signature, audience, expiry, user, role, agent
   allowlist, and `orgId`.
3. Router ignores any caller-supplied org that disagrees with the verified claim.
4. Router resolves the current runtime lease from a short cache backed by the
   authoritative Supabase lease row.
5. Router forwards a request envelope containing `request_id`, authenticated
   `org_id`, agent/session IDs, deadline, and optional `idempotency_key`.
6. Runtime verifies that its lease is active and its fencing token matches before
   accepting work.
7. Responses/events return through the connected router. Durable chat/session
   branches are written to Supabase so reconnecting through another router can
   resume the same tree.
8. On router loss, the client performs eager reconnect and sends its session and
   last acknowledged event cursor. The new router resumes or reports a bounded
   replay gap explicitly.

The Hub, Site, and Paperclip adapter stop selecting an org-specific gateway URL.
They use one endpoint and let authenticated org identity drive routing.

### 5.3 Internal transport

Phase 1 may reuse authenticated WebSocket RPC over an encrypted overlay to avoid a
protocol rewrite. The abstraction must support a later queue/stream transport.
Requirements are transport-independent:

- per-request deadline and cancellation;
- bounded queues and backpressure;
- request and trace IDs propagated end to end;
- at-least-once delivery only where an idempotency key exists;
- no silent retry of non-idempotent tool or channel actions;
- session/event replay cursor with a documented retention window;
- mTLS or workload credentials between routers and runtimes.

### 5.4 Transport and directory contract

Phase 1 uses versioned authenticated WebSocket RPC over the encrypted runtime
overlay. The boundary is explicit so the transport can change later without
changing tenant or lease semantics.

- A runtime starts with only its opaque `lease_id`, expected fence, workload
  bootstrap identity, and opaque volume reference. It resolves protected org/config
  data after authenticating; no org ID or org secret is embedded in its Docker name,
  labels, or image.
- After mounting and validation, it registers an internal endpoint, protocol
  version, capabilities, current fence, and readiness in `service_instance` and the
  active lease row.
- Routers cache the directory for at most five seconds initially. A control-plane
  notification invalidates it earlier. A stale-fence rejection forces an immediate
  authoritative refresh; it is never retried blindly.
- Every envelope negotiates a protocol version and carries the expected fence. A
  runtime that is draining, incompatible, overloaded, or stale returns a distinct
  code and retry-safety flag.
- Requests accepted before drain either finish before `drain_deadline` or are marked
  durably interrupted. Non-idempotent effects are not moved to a new lease
  automatically.
- Per-runtime and per-org queues have byte, item, concurrency, and age limits.
  Exceeding them returns explicit backpressure with a retry-after value rather than
  accumulating unbounded memory.
- Unsolicited channel/runtime events publish a low-latency notification through
  Valkey when available. Durable message boundaries, tool results, and chat/session
  changes receive a monotonically increasing session sequence in Supabase first (or
  enter the existing durable local outbox until Supabase accepts them). Streaming
  token fragments are best-effort; reconnect reconstructs the canonical completed
  message and reports any replay gap.
- The first implementation retains session events for at least the longest current
  reconnect window; the exact duration and byte limit are measured and then made a
  configured policy before Phase 2 exits.

### 5.5 Active-organization token semantics

Membership in multiple orgs is represented by one active org per access token:

- selecting/switching an org mints or refreshes a token whose `orgId`, membership
  version, role, and agent allowlist are server-derived;
- routers validate token issue/expiry and compare the membership version against a
  short-lived revocation cache backed by Supabase;
- membership removal or org suspension increments the membership version and
  invalidates router caches; short token lifetimes bound stale access if invalidation
  delivery fails;
- support impersonation uses a separate audited claim, short expiry, explicit
  operator identity, and cannot be synthesized from a caller-supplied org ID;
- Paperclip and service-to-service tokens name both the workload identity and the
  authorized org scope; they do not reuse browser credentials.

## 6. Control plane and lease protocol

### 6.1 Authority

Supabase/Postgres is authoritative for assignments and fencing. Valkey is only a
fast cache, presence signal, and optional queue. Losing Valkey must not grant or
transfer a lease.

The controller uses compare-and-swap database updates. Multiple controller tasks
may run, but only the task holding the controller leadership lease mutates Swarm
services. Leadership and runtime ownership use separate leases.

### 6.2 Runtime lease state machine

```text
unassigned -> provisioning -> attaching -> starting -> healthy
                  |             |            |
                  +-----------> failed <------+

healthy -> draining -> checkpointing -> detached -> unassigned
   |
   +-> suspect -> fencing -> replacing -> attaching -> starting -> healthy
```

Initial tuning values are a 15-second heartbeat and 45-second lease TTL. They are
design defaults, not production guarantees; failure drills must tune them against
provider detach/attach time and false-positive risk.

### 6.3 Takeover algorithm

1. Mark the old lease `suspect`; stop routing new work to it.
2. Attempt a graceful drain when the old worker is reachable.
3. Stop channel consumers, cron, hooks, and new agent turns.
4. Wait for bounded in-flight work; record interrupted turns durably.
5. Checkpoint SQLite/WAL and flush pending ledger/outbox records.
6. Stop the old task and verify the old block attachment is revoked.
7. If the node is partitioned, fence or quarantine the node before continuing.
8. Increment `fencing_token` transactionally and create a new lease.
9. Attach the RWO volume to the selected healthy node.
10. Start `runtime-<opaque-lease-id>` and validate the storage manifest: provider
    volume ID, attachment generation, filesystem UUID, required paths, schema
    versions, SQLite integrity, and selected sentinel-file checksums.
11. Start stateful channels only after the worker owns the current fence.
12. Publish the healthy assignment and resume routing.

If steps 6 or 7 cannot prove single-writer safety, the org remains unavailable.
The controller must never trade possible data corruption or duplicate messages for
a faster recovery.

### 6.4 Normative Swarm scheduling and fencing contract

Swarm desired-state reconciliation must not bypass the controller's fencing
sequence.

1. Every stateful runtime service has a hard
   `node.id == <currently-attached-node>` placement constraint. A spread preference
   is not sufficient.
2. Swarm may restart that task on the same node. Swarm may never relocate the old
   service to another node under its existing lease/fence.
3. Cross-node relocation is controller-only: stop routing, scale/remove the old
   service, confirm there is no running task, obtain provider/node fencing evidence,
   increment the fence with a database CAS, then create a new service hard-pinned to
   the newly attached node.
4. A named volume absent on another node must never be allowed to become an empty
   local volume with the same name. The controller resolves an opaque provider
   volume ID and verifies its attachment generation before task creation.
5. Lease renewal keeps the same `lease_id`, service, and fence. A takeover creates a
   new lease ID, a new opaque service, and a higher fence. The stopped service is
   removed after evidence is recorded; terminal lease rows remain for audit and
   incident retention.
6. Reconciliation is idempotent. Service create/update/remove operations carry an
   operation ID, expected prior state, and bounded retry policy. Orphan cleanup can
   remove only a service whose lease is terminal and which has no running task or
   attached write volume.
7. If manager quorum is lost, existing tasks may continue but no controller action
   that requires Swarm mutation can complete. Runtime replacement waits for quorum
   recovery and fencing proof.

Acceptable cross-node fencing evidence is provider-specific and must include the
detach/fence operation ID, attachment generation, absence of the old attachment,
and either confirmed node shutdown/quarantine or a provider guarantee that the old
host can no longer write. A worker heartbeat timeout, application exit request, or
lease expiry alone is not fencing evidence.

The runtime also runs a lease guard in the parent process:

- expiry uses database time, with a local monotonic deadline and safety margin;
- the parent renews before TTL and supervises every child process in one killable
  cgroup/process group;
- renewal loss stops new requests, cron, hooks, and channel sends, then terminates
  children before the local deadline;
- request acceptance and channel/cron startup compare the current fence;
- short-lived org credentials expire at the broker/provider even if cached locally.

This application guard limits damage. It does not replace infrastructure fencing.

### 6.5 Dependency outage behavior

| Failure | Required behavior |
|---|---|
| Supabase unavailable | No new lease, renewal, or takeover. At lease expiry the runtime stops stateful writes/channels. |
| Valkey unavailable | Routers fall back to bounded Supabase lookups; no ownership changes derive from cache state. |
| Controller leader lost | Standby acquires leadership lease; existing runtimes continue while their own leases renew. |
| Swarm manager quorum lost | Existing tasks may run, but replacement/deployment waits because Swarm cannot be mutated safely. |
| Router task lost | Clients reconnect to another replica; runtime ownership does not change. |
| Runtime task lost | Router stops routing to it; controller follows the fenced takeover sequence. |
| Storage driver uncertain | Do not attach elsewhere; alert and require fencing evidence. |
| External load balancer origin lost | Remove unhealthy origin and reconnect clients to another node. |

## 7. Supabase data model

Implement in `@minion-stack/db` with migrations, foreign keys, indexes, audit
timestamps, and org-scoped RLS. Names may be adjusted to existing conventions, but
the semantics are required.

RLS protects authenticated user paths. Supabase service-role credentials bypass
RLS, so controllers and server workloads also require separate least-privilege
credentials, explicit org authorization in their database/RPC boundary, and tests
that do not assume RLS will constrain a service-role client.

### 7.1 `service_instance`

| Column | Purpose |
|---|---|
| `id` | Random instance identity |
| `kind` | router, controller, runtime, paperclip-api, paperclip-worker |
| `version` / `image_digest` | Immutable deployed artifact |
| `node_id` / `failure_domain` | Scheduling and incident context; opaque externally |
| `started_at` / `heartbeat_at` / `status` | Presence and health |
| `capabilities` | Versioned JSON capability manifest |

No `org_id` belongs on router or controller instances.

### 7.2 `org_storage_volume`

| Column | Purpose |
|---|---|
| `id` / `org_id` | Protected org-volume mapping |
| `provider` / `provider_volume_ref` | Portable volume driver identity; encrypted/protected as needed |
| `filesystem` / `mount_policy` | Expected mount and RWO behavior |
| `capacity_bytes` / `expand_threshold` | Capacity and automatic growth policy |
| `attachment_state` / `attached_node_id` | Current control-plane observation |
| `last_snapshot_at` / `last_restore_test_at` | Recovery evidence |
| `generation` | Detect stale attachment/config operations |

One active primary volume exists per org. Snapshot/replica records are separate and
cannot be mounted read-write concurrently.

### 7.3 `org_runtime_lease`

| Column | Purpose |
|---|---|
| `id` / `org_id` / `runtime_id` | Ownership term and logical target |
| `instance_id` | Current worker instance, nullable while provisioning |
| `volume_id` | Volume being owned |
| `status` | State-machine status |
| `fencing_token` | Monotonic single-writer token |
| `acquired_at` / `heartbeat_at` / `expires_at` | Lease timing |
| `drain_deadline` | Bounded graceful handoff |
| `failure_reason` | Operator-visible failure without secrets |
| `service_ref` | Opaque Swarm service/task reference |

Enforce one nonterminal lease per org with a partial unique index. Lease mutation
uses transactions that compare prior fence, status, and expiry.

### 7.4 `runtime_request`

Only requests that need recovery/deduplication are stored.

| Column | Purpose |
|---|---|
| `request_id` / `org_id` / `session_id` | Durable identity and tenant scope |
| `idempotency_key` | Unique within operation/org where retry is allowed |
| `lease_id` / `fencing_token` | Executor evidence |
| `status` / `attempt` / `deadline_at` | Recovery state |
| `result_ref` / `error_code` | Bounded result metadata, not secret payload dumps |

### 7.5 `session_event`

| Column | Purpose |
|---|---|
| `org_id` / `session_id` / `sequence` | Tenant-scoped replay cursor; unique and monotonic per session |
| `request_id` / `lease_id` / `fencing_token` | Origin and ownership evidence |
| `kind` / `payload_ref` | Durable event type and bounded payload/reference |
| `created_at` / `expires_at` | Ordering and retention |
| `idempotency_key` | Deduplicates outbox replay where applicable |

Completed chat messages and response-tree nodes remain in their canonical session
tables. `session_event` is the reconnect/replay log, not a second transcript.

### 7.6 Existing schema migration

- Deprecate `gateway.orgId` as instance assignment. A gateway row may represent a
  logical endpoint/pool during compatibility, but org ownership moves to runtime
  and volume tables.
- Deprecate `user_gateway` as the primary routing selector. Users connect to the
  canonical pool; org membership and JWT claims authorize routing.
- Preserve read compatibility until Hub, Site, and Paperclip consumers use the new
  directory.
- Backfill current default/Faces volume and runtime rows in a transaction before
  enabling controller writes.
- Backfill every active org mapping and prove shadow resolution before disabling the
  old shared/default fallback. After that security cutover, missing mappings fail
  closed.
- Add RLS tests proving one org cannot enumerate another org's volume, lease,
  request, session, or service mapping.

## 8. Storage design

### 8.1 Data placement

| Data | Canonical store |
|---|---|
| Users, orgs, memberships, RBAC | Supabase |
| Service directory, leases, fencing, audit | Supabase |
| Chat sessions, response trees, prompts/attempts | Supabase |
| Structured memory and message ledger | Supabase; local durable outbox allowed |
| Legacy SQLite/WAL | Portable single-writer volume |
| Agent workspaces and generated files | Volume, with immutable/large artifacts mirrored to object storage |
| Channel/OAuth credential material | Secret broker or encrypted org volume; never image or plain DB field |
| Browser profiles and local indexes | Volume until a dedicated service replaces them |
| Logs, metrics, traces | Central observability backend, not org volume as the sole copy |

### 8.2 Volume requirements

Local Docker volumes grow with the host filesystem but are not portable and do not
provide host failover. The multi-node gate requires a Docker-compatible volume
plugin or provider integration that passes all of these tests:

1. dynamic create, attach, detach, reattach, snapshot, restore, and expansion;
2. strict RWO attachment plus stale-node fencing under network partition;
3. SQLite WAL locking, fsync, crash recovery, and integrity checks;
4. automatic filesystem growth after provider expansion;
5. reschedule to a different node without path or symlink assumptions;
6. encryption at rest and in transit where the provider supports it;
7. volume and snapshot inventory reconciliation;
8. measured recovery time and a successful restore drill.

NFS/shared-write storage is not approved for active SQLite. Swarm does not make a
local Docker volume portable by itself. The storage provider is intentionally a
phase gate rather than an assumed vendor choice.

### 8.3 Capacity policy

- Warn at 70%, expand at 80%, and page at 90% of allocated capacity after real
  growth-rate measurements validate the thresholds.
- Expansion is additive and audited; automatic shrinking is prohibited.
- A controller must verify provider capacity and filesystem capacity separately.
- Quotas are org policy in Supabase, not encoded into service names or images.
- Garbage collection deletes only classified cache/temp data automatically.
  Workspaces, memory, sessions, credentials, and ledgers require retention policy
  or explicit archival.

### 8.4 Consistent backup and recovery points

A database snapshot and volume snapshot taken independently may describe different
application moments. The backup controller therefore creates a recovery manifest:

1. stop or fence new org mutations briefly, or establish an application checkpoint;
2. flush SQLite WAL and the local Supabase/message outbox;
3. record the last canonical Supabase transaction/event watermark;
4. take the provider volume snapshot and record its operation/snapshot ID;
5. persist a manifest containing org, volume generation, fence, database watermark,
   schema versions, integrity results, and snapshot ID;
6. resume writes only after the manifest is durable;
7. restore Supabase rows and the volume to a compatible manifest during drills.

Until this mechanism runs on a measured schedule and repeatedly restores cleanly,
the volume-state RPO is “since the last verified consistent recovery manifest.” A
15-minute RPO becomes a production claim only after a <=15-minute schedule and
restore evidence exist.

## 9. Networking and load balancing

### 9.1 Node network

- Swarm control/data traffic uses private Tailscale addresses.
- Permit 2377/tcp, 7946/tcp+udp, and 4789/udp only between approved Swarm nodes.
- Permit IP protocol 50 (IPsec ESP) between nodes when encrypted overlays are used;
  keep the VXLAN data port unreachable from untrusted networks.
- Encrypt application overlays and separate edge, control, runtime, data, and
  observability networks where practical.
- Do not publish internal runtime, Docker API proxy, database, Valkey, or secret
  service ports on `0.0.0.0`.
- Remove the current public Valkey host binding as an early hardening task.

### 9.2 External ingress

The final public path is one canonical gateway hostname with at least two healthy
origins in distinct server failure domains. Each origin terminates or forwards TLS
to a local `edge` task.

Health is split deliberately:

- liveness proves the process/event loop can answer;
- ingress readiness proves the router can accept/authenticate a connection and has
  loaded a nonexpired directory snapshot;
- dependency health reports Supabase, Valkey, runtime, and replay degradation
  independently and is not the external load balancer's sole origin-removal signal.

A shared dependency outage must not mark every live origin dead and turn a bounded
degraded mode into a forced global disconnect.

The current per-org Faces URL remains only during compatibility. It is removed
after clients use JWT org routing and the default/Faces parity tests pass.

WebSockets cannot make an abruptly lost TCP connection seamless. Reliability means
fast detection, eager reconnect, authenticated session resume, replay cursors, and
idempotent recovery—not pretending the connection never broke.

### 9.3 Swarm quorum and placement

- Target three managers across three failure domains; an odd quorum is required.
- Target at least two nodes capable of running routers and attaching org volumes.
- Apply CPU/memory reservations and limits. Swarm spread preferences are best-effort;
  combine them with hard failure-domain/node constraints and capacity tests when a
  replica must survive a node loss.
- Managers may initially run workloads, but dedicated/drained managers are preferred
  once enough servers exist.
- A one-node Swarm remains the supported transitional environment, not the HA
  completion state.

## 10. Secrets and privilege boundaries

- Routers receive only trust roots, workload identity, and transport credentials.
  They never receive all org provider/channel secrets.
- A runtime exchanges its active lease identity for short-lived, org-scoped secret
  access. The broker/provider rejects renewal after lease loss. Already mounted
  Swarm secrets or cached credentials are not assumed revoked, which is why their
  lifetime is bounded and infrastructure fencing remains mandatory.
- Infisical/1Password bootstrap credentials remain outside application images and
  are rotated through versioned Swarm secrets or workload identity.
- No gateway/router/runtime gets the host Docker socket.
- Only `fleet-controller` calls a narrow authenticated Docker API proxy restricted
  to approved service, secret-reference, network, and volume operations.
- Runtime containers run non-root, drop Linux capabilities, use a read-only root
  filesystem where compatible, and mount only their leased volume paths.
- Org IDs are acceptable in authorized application data and logs where necessary,
  but not in Docker names/labels exposed to infrastructure-wide operators.
- Audit every lease, fence, secret grant, volume attach, deployment, and manual
  override without logging secret values.

## 11. Paperclip and dependency migration

### 11.1 Paperclip

Replace the current Compose/API-plus-local-Postgres shape with:

- `paperclip-api`: two or more stateless replicas pinned by digest;
- `paperclip-scheduler`: one active leaseholder with a standby, or jobs claimed
  transactionally from the database;
- `paperclip-worker`: a generic horizontally scalable worker pool;
- Supabase/Postgres or a separately HA Postgres service after extension/migration
  compatibility tests;
- `vault-sync`: a leased singleton/global service with idempotent sync;
- company/org-scoped records and explicit mapping to Minion `org_id`;
- idempotent job claims so worker loss can retry without duplicate side effects.

Paperclip requests runtime work through the same canonical router or an internal
authenticated transport. It does not assign Docker containers directly and is not
the gateway fleet's source of truth.

After parity validation, stop and disable the two host `paperclipai run` process
trees on ports 3101/3102. The existing container on 3100 must first be pinned to an
immutable digest and covered by a health check and rollback procedure.

### 11.2 Shared dependencies

| Dependency | Target |
|---|---|
| Valkey | Managed HA or tested replication/Sentinel; private network; cache/queue only |
| Infisical | External/HA secret control plane or replicated app with durable HA Postgres/Redis |
| 1Password Connect | Replicated/read-only where supported; bootstrap independent of application secrets |
| Omnisearch | Replicate only after its state/cache contract is audited; persist indexes explicitly |
| Databases | Prefer managed/Supabase HA; do not label a single Swarm database task “HA” |
| Object backups | External provider with versioning, retention, encryption, and restore drills |
| Observability | Central metrics/logs/traces outside the failed node being diagnosed |

Moving a singleton database into Swarm without database replication does not create
database HA. Stateful dependencies have independent quorum, backup, and recovery
requirements.

## 12. Image and build decomposition

Use independent build targets and images so a router change does not rebuild the
full agent toolbox:

| Image | Contents |
|---|---|
| `minion-gateway-router` | Node runtime, protocol/auth/router code, health and telemetry |
| `minion-fleet-controller` | Lease reconciler and narrow Docker API client |
| `minion-runtime-base` | Core agent runtime and common tools needed by every org |
| `minion-runtime-browser` | Chromium/browser capability layered from the same pinned base |
| `minion-runtime-media` | ffmpeg/poppler/PDF/media tooling layered from the same pinned base |
| `minion-paperclip-api` | Paperclip server/API only |
| `minion-paperclip-worker` | Paperclip adapters and execution tools |

Feature parity is capability-driven. An org runtime is scheduled with the image or
sidecar capability set its agents need; unsupported combinations fail scheduling
with a clear reason. Shared lockfiles, BuildKit cache mounts, immutable base digests,
and an image SBOM keep layers reusable and auditable.

Do not force every tool into the router. Do not remove a capability merely to reduce
image size. A compatibility suite proves that every current agent profile maps to a
supported runtime capability set before the monolithic image is retired.

## 13. Reliability targets

These are implementation targets to validate under load; they are not claims about
the current one-node deployment.

| Event | Initial target |
|---|---|
| Router task loss | Client reconnect/resume in <=15 seconds p95 |
| Entire ingress node loss | Healthy-origin reconnect in <=60 seconds p95 |
| Runtime task loss, same node | Org runtime healthy in <=90 seconds p95 |
| Runtime node loss with portable volume | Org runtime healthy in <=5 minutes p95 |
| Supabase-acknowledged canonical writes | RPO 0 within the database's contracted durability |
| Volume-only state before qualified backup schedule | RPO since last verified consistent recovery manifest |
| Volume-only state after backup qualification | <=15 minutes only if measured snapshot/restore evidence proves it |
| Snapshot restore | Demonstrated quarterly; target RTO recorded per volume size |

Track availability separately for router connectivity, org runtime readiness,
channel readiness, Paperclip API, queue delay, and storage recovery. A healthy HTTP
process with an unavailable org runtime is degraded, not healthy.

## 14. Implementation workstreams

### 14.1 Shared contracts and database

**Repos:** root `packages/shared`, `packages/db`

- Add service, runtime, lease, fence, request-envelope, capability, resume-cursor,
  and health contracts.
- Add the Supabase tables/migrations/RLS described in section 7.
- Add compatibility types so Hub, Site, gateway, and Paperclip can migrate in
  lockstep.
- Define error codes for runtime unavailable, stale fence, retry unsafe, replay gap,
  drain, and storage fencing failure.

### 14.2 Gateway/router/runtime split

**Repo:** `minion/` (`DEV` integration path)

- Extract transport/auth/routing from channel/runtime initialization.
- Add `gateway-router`, `runtime-worker`, and drain/checkpoint entrypoints.
- Replace host-local locking as the authority with Supabase lease/fence validation;
  retain the local lock as defense in depth.
- Make missing org/account mappings fail closed.
- Add capability manifests and runtime readiness details.
- Add session resume/event replay and idempotency enforcement.
- Preserve all existing agent/channel/tool behavior in runtime compatibility tests.

### 14.3 Hub and Site clients

**Repos:** `minion_hub/` (`dev`), `minion_site/` (`master` integration via feature branch)

- Use one canonical gateway endpoint rather than org-assigned hosts.
- Send verified org-scoped auth and resume cursors.
- Surface reconnect, runtime-draining, and runtime-unavailable states accurately.
- Remove `gateway.orgId`/`user_gateway` as client routing dependencies after backfill.
- Keep chat/session response-tree history canonical across router/runtime replacement.

### 14.4 Paperclip

**Repo:** `paperclip-minion/` (`minion-integration`)

- Split API, scheduler, and worker processes/images.
- Move job claims and singleton work to database-backed leases.
- Migrate durable Postgres data to the selected HA target.
- Update the Minion adapter to the canonical router and shared resume/idempotency
  contracts.
- Add health/readiness and graceful drain for every process type.

### 14.5 Deployment and operations

**Repos:** `minion/deploy`, root operational specs/scripts

- Replace org-named gateway services with generic router/controller services and
  controller-created opaque runtime services.
- Add private overlays, resource policy, hard placement constraints plus best-effort
  spread preferences, secrets, immutable digests, and deployment/rollback
  automation.
- Select and qualify portable RWO storage.
- Add nodes, external multi-origin load balancing, backups, alerts, and chaos drills.
- Migrate dependencies only after their state/HA contract is documented.

## 15. Authority and cutover matrix

Before changing a domain, an `authority_cutover` record captures its old authority,
backfill watermark, reconciliation result, cutover time/fence, new authority, last
safe rollback point, and whether recovery has become forward-fix-only. A domain that
is already canonical in Supabase records evidence and a no-op migration rather than
assuming parity.

| Domain | Old/current authority | Shadow and cutover | New authority | Rollback rule |
|---|---|---|---|---|
| Org routing | `gateway.orgId`, `user_gateway`, compatibility URLs | Backfill every org; compare old/new resolution; mint active-org tokens; atomically enable canonical routing only at zero unresolved orgs | Supabase runtime directory + verified JWT org | Re-enable old URL only while its runtime/credentials remain fenced and new-only routing writes are replayable |
| Runtime ownership | Org-named Swarm service/static volume mount | Create static lease/fence rows; observe; drain old task; start opaque node-constrained task at next fence | `org_runtime_lease` + controller | Old task may restart only after new task stops, volume is fenced back, and post-cutover writes are checkpointed |
| Chat/session trees | Inventory actual local/Hub/Supabase sources per org | Backfill IDs/parents/attempts; establish session sequence watermark; dual-read compare; freeze briefly for final delta | Supabase chat/session/tree tables | Reverse-sync events after watermark or declare forward-fix-only; never discard new branches |
| Structured memory | Existing local DB/index plus current Supabase sink where enabled | Reconcile by durable IDs/checksums; flush local outbox; record canonical high-water mark | Supabase structured memory; volume index is rebuildable cache | Restore canonical rows first, then rebuild local index; do not promote a stale index |
| Message ledger | Existing local durable outbox plus Supabase sink | Drain/replay by idempotency key; compare counts and last sequence | Supabase ledger; local outbox only for outage buffering | Replay remaining outbox; never dual-send external effects |
| Credentials/channels | Current org volume/Swarm runtime secrets | Issue short-lived broker credentials; stop old channels; revoke/expire; start new owner at current fence | Secret broker + encrypted volume only where required | Reactivate old owner only after new credentials/connections are revoked and task fenced |
| Workspaces/SQLite | Current named local Docker volume | Checkpoint/integrity manifest; copy once if provider changes; final delta under write stop; verify filesystem identity | Same logical org volume on qualified provider | Reverse-copy only under exclusive ownership; after retention/format migration use forward repair |
| Paperclip data | Compose Postgres/local service | Logical backup/restore or replication; checksum/schema/job watermark; shadow reads | Selected HA Postgres/Supabase target | Preserve old DB read-only until validation; reverse replication or forward-fix-only after cutoff |

Cutover is not “additive” once writers, channels, client routing, or canonical stores
switch. Every phase names its authority transition and rollback window explicitly.
No compatibility service or local copy is deleted until rollback from the immediately
preceding phase has been rehearsed.

## 16. Delivery phases and gates

### Phase 0 — Preserve and instrument the live baseline

**Deliverables**

- Export current Swarm/service/volume configuration and record image digests.
- Verify default and Faces volume backups plus a test restore.
- Add alerts for gateway health, disk/inodes, restart loops, and backup age.
- Pin Paperclip by digest; firewall Valkey from public interfaces.
- Identify and then remove duplicate OS Paperclip only after container parity.

**Exit gate:** current container routes, memory, sessions, channels, and rollback are
reproducibly verified. No architecture rename occurs in this phase.

### Phase 1 — Canonical control-plane model

**Deliverables**

- Ship shared contracts and Supabase schema/RLS.
- Backfill service, storage, runtime, and lease records for default and Faces.
- Inventory the real authority for chat/session trees, memory, ledger, credentials,
  and workspaces per org; create `authority_cutover` evidence and migrate/backfill
  any domain that is not already canonical where this phase depends on it.
- Issue org-scoped JWTs consistently across Hub/Site/Paperclip.
- Add audit events, capability manifests, and fail-closed org enforcement.

**Exit gate:** shadow routing resolves the same current target for every tested org;
cross-org and stale-fence tests fail closed.

### Phase 2 — Split router and runtime on the current server

**Deliverables**

- Run at least two stateless router replicas behind the existing edge.
- Run current org state through generic runtime-worker entrypoints with opaque lease
  service IDs.
- Use an operator-driven migration command to create `mode=static` lease rows,
  fence generation 1, and node-constrained runtime services. Static leases do not
  expire into automated takeover; the current single-node rollback/runbook remains
  authoritative.
- Run `fleet-controller` in observe-only mode to compare desired and actual state,
  detect orphans, and emit plans without mutating Swarm.
- Preserve compatibility URLs while clients migrate to the canonical endpoint.
- Exercise router kill/reconnect without restarting the runtime.

**Exit gate:** current feature-parity suite passes; router replacement preserves
sessions; Docker names/labels contain no org identity; router mounts no org volume;
and a killed runtime service cannot autonomously relocate to another node.

### Phase 3 — Automated leases and fenced replacement

**Deliverables**

- Deploy replicated fleet-controller with one elected writer.
- Convert one test org at a time from static ownership to renewable TTL leases; the
  controller becomes authoritative only through an audited compare-and-swap.
- Automate drain, checkpoint, stop, fence, reattach, start, health, and route update.
- Add stale task, delayed heartbeat, controller failover, and network-partition tests.
- Remove per-org gateway URL selection from clients.

**Exit gate:** repeated same-node runtime replacements retain memory/session/channel
state and never produce two active channel owners.

### Phase 4 — Paperclip and shared workload convergence

**Deliverables**

- Deploy replicated Paperclip API and worker pool in Swarm with pinned digests.
- Move Paperclip durable DB to the selected HA Postgres/Supabase target.
- Eliminate OS Paperclip process trees and the mutable `latest` deployment.
- Privatize/HA-enable Valkey and define Infisical/1Password/Omnisearch placement.

**Exit gate:** Paperclip API task loss and worker loss pass retry/idempotency tests;
there is one declared production path for each service.

### Phase 5 — Portable storage and multi-node HA

**Deliverables**

- Qualify the RWO volume provider against section 8.2.
- Add two servers to form a three-manager, multi-failure-domain Swarm.
- Spread routers/controllers/Paperclip and prove volume failover to another node.
- Configure at least two external load-balancer origins.

**Exit gate:** router-node and runtime-node failure drills meet the section 13
targets, including fencing proof and restore evidence.

### Phase 6 — Decommission transitional topology

**Deliverables**

- Remove `minion_gateway-default`, `minion_gateway-faces`, ports 18789/18790 as
  org selectors, compatibility DB routing, and unused local volume copies.
- Retain encrypted backups for the approved rollback/retention window.
- Make the controller directory and runbooks the only supported provisioning path.

**Exit gate:** inventory of services, containers, volumes, secrets, configs,
networks, labels, environment, and provider metadata finds no org names/IDs outside
authorized application data; there are no active legacy OS services, mutable
production image tags, or clients using per-org URLs.

### Phase 7 — Reduce filesystem coupling

Migrate remaining SQLite/credentials/artifacts to Supabase, secret storage, and
object storage where correctness and performance permit. Each migration removes a
reason for an org-affined worker. The long-term target is pooled, stateless runtime
workers, but only after feature-parity and recovery tests prove it safe.

## 17. Acceptance and failure tests

### Tenancy and naming

- Router image/config/filesystem contains no org data.
- Router has no org volume mount and serves requests for default and Faces.
- Docker service/container names and labels contain no org name or org ID.
- JWT org mismatch, missing mapping, cross-org agent ID, and stale fence are denied.
- Supabase RLS prevents cross-org lease/storage/session enumeration.

### Reliability

- Kill one of two routers during an active chat; client resumes on the other.
- Kill the active runtime; controller creates exactly one replacement.
- Inspect every runtime service and prove its hard node constraint prevents Swarm
  from autonomously relocating the old lease.
- Partition the old runtime node while its parent, child agent process, SQLite
  connection, and Telegram/WhatsApp connection remain active; no replacement writes
  until old attachment/node fencing evidence is recorded.
- Kill the controller leader; a standby reconciles without duplicating services.
- Pause the controller, trigger GC delay, race two leadership acquisitions, submit a
  stale CAS, and lose Supabase immediately before and after renewal; database time
  and fence monotonicity remain authoritative.
- Lose manager quorum separately from controller leadership; running tasks remain
  observed and no replacement is attempted until quorum returns.
- Disable Valkey; no split brain and bounded degraded routing.
- Disable Supabase; no new leases and expired workers stop stateful effects.
- Lose one external origin; clients reconnect to a different server.
- Fail after new-volume attachment but before directory publication, and after
  directory publication but before channel readiness; rollback leaves one owner.
- Run at least ten same-node replacement drills and three cross-node partition/
  fencing drills for storage qualification, archiving logs, database transitions,
  and provider operation IDs for every run.

### Durability and feature parity

- Compare memory/session/workspace/channel credential checksums across handoff.
- Run every current agent profile and declared capability.
- Verify Telegram/WhatsApp have one owner and no duplicate outbound message.
- Crash during SQLite write and pass integrity/WAL recovery checks.
- Expand a live test volume and verify filesystem capacity.
- Restore a snapshot into an isolated org and validate application-level records.
- Restore Supabase and volume state from the same recovery manifest and verify its
  watermark/fence before any channel starts.
- Edit/retry a chat branch, replace router/runtime, refresh the UI, and retain the
  full response tree.
- Saturate request/event queues and verify configured byte/item/concurrency/age
  limits, backpressure codes, retry-after behavior, and no unbounded memory growth.
- Partition a runtime after it caches credentials; the secret broker rejects renewal
  or use after server-enforced expiry, independent of the mounted Swarm secret.

### Paperclip and dependencies

- Kill one Paperclip API replica while requests continue.
- Kill a worker mid-job; safe jobs retry once, unsafe jobs require explicit review.
- Prove scheduler/vault sync singleton behavior under partition.
- Confirm no production service depends on ports 3101/3102 or public 6379.

Every drill records commands, timestamps, expected/observed state transitions,
integrity queries, active channel-owner count, replay-gap measurement, provider
operation IDs, and cleanup result. Passing once without retained evidence is not an
exit gate.

## 18. Rollback strategy

Each phase uses shadow comparison where safe, then an explicit writer/authority
cutover. The cutover record defines whether rollback is reverse-syncable or has
become forward-fix-only.

- Keep the current org-named Swarm services stopped but recoverable during router
  and runtime shadowing.
- Take a final volume snapshot/checkpoint before each ownership-model cutover.
- Use dual-read/shadow-read for directory migrations; avoid dual-write unless an
  idempotent reconciler exists.
- Roll back clients to compatibility URLs without rolling back persisted lease
  schema.
- A runtime rollback may start only after the newer runtime is drained and fenced.
- Multi-node rollback returns placement to the known storage node; it never mounts a
  volume concurrently on old and new nodes.
- Preserve old OS state only for the approved retention window, then archive/delete
  it to avoid an ambiguous authority.
- Store phase-specific rollback commands and maximum rollback window in the cutover
  record. Rehearse them before deleting the preceding authority.
- Credential rollback is ordered: stop and fence the new runtime, revoke/expire its
  channel credentials, prove zero active connections, then reactivate the old owner.
- Once reverse synchronization can no longer reconstruct post-cutover writes, mark
  the domain forward-fix-only rather than presenting stale rollback as safe.

## 19. Gains, losses, and explicit limits

### Gains

- gateway replicas become truly fungible and active-active;
- org identity and data placement are explicit, audited, and fail closed;
- router, runtime, Paperclip, and tooling changes rebuild/deploy independently;
- a server failure can be survived once multi-node storage and ingress gates pass;
- org volume capacity can expand independently of container/image lifecycle;
- smaller privilege domains and no Docker socket in agent-facing processes;
- one canonical endpoint replaces org-specific routing and lost-assignment failure
  modes.

### Costs and losses

- more services, schemas, leases, health states, and operational runbooks;
- portable block storage and external load balancing add provider cost;
- stateful runtime failover has a visible reconnect/recovery window;
- strict fencing may prefer temporary unavailability over an unsafe takeover;
- Supabase/control-plane availability becomes part of lease availability;
- capability images and queues require compatibility/version management;
- three servers and HA dependencies consume more baseline resources than one VPS.

### What this design does not promise

- A one-node Swarm is not HA.
- Two replicas on one server do not survive a server blackout.
- Swarm does not make local Docker volumes portable.
- Multiple active workers cannot safely share current org SQLite/channel state.
- WebSocket failover cannot preserve the original TCP connection.
- Putting a singleton database in a container does not make it highly available.

## 20. Decisions required before Phase 5

These choices do not block Phases 0–4, but they are hard gates for multi-host HA:

1. server/failure-domain provider and private network layout;
2. qualified Docker volume plugin/provider with enforceable RWO fencing;
3. external multi-origin load-balancer provider and health policy;
4. managed Supabase versus self-hosted Postgres responsibility/SLA;
5. managed Valkey versus self-operated replication/Sentinel;
6. observability and paging backend;
7. backup retention, restore RTO, and acceptable volume RPO by org tier;
8. whether managers remain schedulable or become control-plane-only.

No decision should be accepted from a feature matrix alone. Each provider must pass
the failure and restore tests in this spec before production state depends on it.

## 21. Authoritative implementation references

- [Docker: deploy services to a swarm](https://docs.docker.com/engine/swarm/services/)
  — replicated/global tasks, placement, resource policy, rollback, and volume-driver
  behavior.
- [Docker: administer and maintain a swarm](https://docs.docker.com/engine/swarm/admin_guide/)
  — manager quorum, failure tolerance, Raft backup, and recovery.
- [Docker: Swarm networking](https://docs.docker.com/engine/swarm/networking/)
  and [Swarm tutorial prerequisites](https://docs.docker.com/engine/swarm/swarm-tutorial/)
  — node ports, trusted VXLAN boundaries, and encrypted overlay requirements.
- [Docker: manage sensitive data with Swarm secrets](https://docs.docker.com/engine/swarm/secrets/)
  — secret distribution and the limits of treating mounted secrets as lease-bound
  credentials.
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
  — tenant policies, indexing guidance, and the service-role bypass caveat.
