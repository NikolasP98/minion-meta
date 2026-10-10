---
id: 2026-10-09-hub-notification-worker-production-activation
title: Qualify and activate a separately owned production notification worker
status: in-spec
created: 2026-10-09
updated: 2026-10-09
repos: [minion_hub, minion-meta]
tags: [logic, security, data, test]
effort: M
---

# Production notification worker activation

## AS-IS at qualification start

Hub compatibility PR453 is deployed as `9e812b6f`. Read-only production metadata
at the release checkpoint shows generation/admission generation zero and null
build, heartbeat and admission fields in `notification_worker_runtime`. Vercel
runs adapter-vercel and intentionally starts no notification worker. Adapter-node
requires DESKTOP=1 and NOTIFICATION_WORKER=1. The source has a disposable compiled
qualification harness, but no production artifact publisher, owned service unit,
installer or deployment controller was found. No host installation is asserted
absent merely because those files are missing from this repository.

## Current state

Hub PR456 now contains the reviewed disabled-artifact implementation, and its hosted disabled-artifact gate passes. The worker remains disabled and credential-free. A fail-closed repository-privacy guard now blocks build, attestation and upload from the public Hub repository; no artifact has been published. A reviewed private publication destination remains open work. GitHub documents private-repository artifact attestations as an Enterprise Cloud capability, and the required entitlement has not been established; a future design must qualify both the private archive store and its provenance mechanism rather than assuming that a private repository is sufficient. Two isolated exact-source builds and the remaining full Hub checks are still required, and production activation remains outside this release.

Primary source: [GitHub artifact attestation availability](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

The prior manual worker runbook assumes an existing host worker/cron transition
without a matching verified deployment receipt. This is the remaining NOTIF-003
activation and degraded-health closure gate, not a reason to restore notification
cron routes. See the exact-anchor recon in the performance release evidence.

## TO-BE

One immutable reviewed worker artifact runs under an unprivileged owned service,
with secure configuration, durable lease ownership, bounded resource admission,
graceful drain, exact build/catalog/projector health and a compatible rollback
floor. A disabled staging state permits qualification before production work is
admitted. Keep DESKTOP's HTTP listener loopback-only because that mode bypasses
normal request authentication. Evaluate a dedicated worker entry point in the
implementation spec if it removes that exposure without duplicating runtime code.

## DELTA

1. Correct the runbook and write/review the production deployment spec with exact
   host, service, listener, writable paths, runtime and secret-source boundaries.
2. Implement immutable artifact manifest/publication, service unit, root-owned
   installer/controller and a rollback floor. Prove negative artifact, authority,
   failed-start, duplicate-owner and drain cases without production effects.
3. Qualify the actual compiled artifact against marked disposable PG17/18 and
   stage with NOTIFICATION_WORKER=0. Verify artifact identity and protected-route
   denial; do not call an authorized production tick as a health check.
4. Before activation, verify production migration/catalog/identity contracts,
   pending workload aggregates and runtime singleton, then apply the reviewed
   effect window. Starting the worker can process existing real outbox work;
   rollback must not erase leases or retry ambiguous sends.
5. Record exact process/build/catalog/projector heartbeat and degraded-health UI.
   Use aggregate-only production observation; no synthetic provider messages.

Handoff comment: `scripts/ops/hub-worker-release.md` in the corrected candidate.
This proposal records missing deployment work; it does not claim implementation,
worker activation, notification delivery, or production latency proof.

## Disabled artifact slice

The two-pass reviewed spec `2026-10-09-notification-worker-disabled-artifact-spec` narrows the
first implementation to a host-independent immutable Node artifact, shared
validator, disabled/inactive loopback systemd unit and root-owned installer. The
slice requires no production credentials and never starts the adapter, opens a
listener, accesses PostgreSQL/cache or calls a provider. A 401 or 403 response is
not health evidence.

The disabled installer may stage and atomically select only a verified artifact;
it must not enable, start or restart the service. The full minimum startup
credential inventory, `NOTIFICATION_WORKER=1`, singleton admission, real health,
drain and rollback floor remain a future security/data-gated activation slice.
Until that slice is approved and verified, NOTIF-003 remains open.

Pass-2 review tightened this boundary: the archive requires GitHub artifact
attestation bound to externally expected repository/workflow/source/run identity,
and the builder pins its image digest plus exact Node ABI/patch. The installer
accepts only regular files/directories through race-resistant descriptor-relative
extraction, while a launcher rejects environment overrides of listener, DESKTOP,
worker-admission and Node loader settings. An actual disposable-systemd test must
prove the absent activation marker prevents `ExecStart`. Because the disabled
smoke never runs the worker entrypoint, runtime closure and startup functionality remain explicitly
unproven until compiled disposable qualification in the activation slice.


## Implementation review checkpoint

The disabled artifact source now exists on an isolated signed branch; publication,
installation and activation are distinct gates. Parent review required a dangling
unit-symlink rejection and worker-only source-bound SvelteKit version to make builds
reproducible. Neither the ordinary web deployment version nor worker admission is
changed by that build identity.

The unit initially included `MemoryDenyWriteExecute=true` while its launcher used
ordinary Node/V8. Systemd documents incompatibility with dynamic code generation;
remove that incompatible unit option while retaining the other hardening controls.
Do not silently force `--jitless`, which changes execution/performance and WebAssembly
support. The disabled systemd sentinel does not establish real Node compatibility;
actual compiled startup remains a required isolated activation qualification.
Primary source: [systemd execution sandbox documentation](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml).
