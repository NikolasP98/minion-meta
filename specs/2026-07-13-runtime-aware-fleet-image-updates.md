# Runtime-Aware Fleet and Swarm Image Updates

**Date:** 2026-07-13  
**Status:** Production verified
**Supersedes for containers:** the npm self-update path in `2026-07-10-gateway-update-system.md` and the per-process rollout unit in `2026-07-11-fleet-update-orchestration.md`  
**Preserves:** legacy systemd/package updates and the existing drain/reconnect behavior

## 1. Incident and root cause

The production fleet is now mixed-runtime: older installations are host-managed systemd processes, while the current production gateways are Docker Swarm services. The existing update protocol assumes every gateway owns its executable and can replace it with `npm install -g`.

Live inspection on 2026-07-13 established all of the following:

1. `minion_gateway-default` and `minion_gateway-faces` are Swarm services on a single manager node.
2. `gateway-default` was deployed from mutable `ghcr.io/nikolasp98/minion-ai:prd`; `gateway-faces` remained pinned to an older immutable digest.
3. Both containers report package version `2026.7.12-dev`, even though the release notification target is the timestamped npm build `2026.7.12-dev.20260713103358`.
4. The Faces container accepted `update.run` and returned success in about three seconds, but no Swarm service image or task changed. Both persistent state volumes retained a package-oriented `update-pending.json`.
5. Hub consequently waited 240 seconds for a package version that the image could never report, producing the observed failed/pending fleet state.
6. Recent failed Swarm tasks exited because of an unrelated unhandled provider-credit rejection. This is a runtime reliability defect, but not the update timeout's primary cause.

The invariant violated by the old design is simple: **an immutable container must never claim that an in-container package install updated its deployment artifact**.

## 2. Goals

- Infer whether a gateway is package-managed or externally image-managed, with an explicit override for production.
- Preserve the existing systemd/npm updater unchanged for legacy hosts.
- Make a container's identity the immutable image digest (plus revision/version metadata), not only `package.json` version.
- Roll a Swarm deployment to the newest resolved `prd` image digest through a host-side controller.
- Treat all services owned by one deployment controller as one rollout unit, while verifying every gateway independently.
- Keep Docker control authority out of gateway containers and out of the public Hub runtime.
- Serialize updates, roll services sequentially, verify health/convergence, and roll back a partially advanced fleet on failure.
- Expose enough state for the Hub UI to say whether it is checking a package release or an image rollout.

## 3. Non-goals

- No Docker socket mount in a gateway container.
- No unauthenticated/public Docker management endpoint.
- No attempt to make two replicas of the same single-writer org active simultaneously.
- No removal of the npm/systemd updater during the mixed-fleet migration.
- No inference from display version alone when an immutable digest is available.

## 4. Runtime and artifact contract

`update.status` remains backward compatible and adds a `runtime` object:

```ts
type GatewayUpdateRuntime = {
  kind: 'systemd' | 'container' | 'unknown';
  updateStrategy: 'self-update' | 'external-image';
  inferredFrom: 'env' | 'container-marker' | 'systemd' | 'fallback';
  controllerId?: string;
  artifact: {
    kind: 'npm' | 'container-image' | 'unknown';
    version: string;
    image?: string;
    digest?: string;
    revision?: string;
  };
};
```

The current top-level `current`, `pending`, `connections`, and `draining` fields remain available to old Hub builds.

### 4.1 Inference precedence

1. Explicit environment metadata wins:
   - `MINION_RUNTIME_KIND=systemd|container`
   - `MINION_UPDATE_STRATEGY=self-update|external-image`
   - `MINION_UPDATE_CONTROLLER_ID`
   - `MINION_IMAGE_REF`
   - `MINION_IMAGE_DIGEST`
   - `MINION_IMAGE_REVISION`
2. `/.dockerenv`, `/run/.containerenv`, or standard container environment markers imply `container` plus `external-image`.
3. systemd markers such as `INVOCATION_ID`, `JOURNAL_STREAM`, or the configured systemd unit imply `systemd` plus `self-update`.
4. An unknown native runtime falls back to `self-update` for compatibility.

Production Swarm must set explicit metadata; marker inference is the safe migration fallback, not the desired steady state.

### 4.2 Update behavior

- `self-update`: `update.check` and `update.run` retain npm dist-tag semantics, watchdog, drain, restart, and version verification.
- `external-image`: `update.run` performs no install, watchdog, or process restart. It returns a typed delegated result (`EXTERNAL_CONTROLLER_REQUIRED`) containing the controller/artifact identity. Hub must dispatch the external controller instead.
- An image-managed gateway may still expose npm notification state for compatibility, but that state cannot be used as rollout truth.

## 5. Desired image resolution

The desired artifact is the immutable digest currently referenced by the configured release tag, initially `ghcr.io/nikolasp98/minion-ai:prd`.

The host controller:

1. pulls/resolves the configured tag;
2. records its `repo@sha256:...` identity;
3. compares that digest with every controlled service;
4. returns a no-op success when all services already converge;
5. otherwise rolls the services to that exact digest.

The mutable tag is a discovery pointer only. It must never be stored as the steady-state service image. The image build must publish OCI version and revision labels, and the Swarm task must receive the resolved image ref/digest/revision as explicit runtime metadata so `update.status` can report what actually runs.

## 6. Controller architecture

The Docker manager owns a host-only `deploy/swarm/update-controller.sh` interface:

```text
update-controller.sh resolve   # tag -> immutable desired artifact
update-controller.sh status    # last operation + current convergence
update-controller.sh update    # serialized, sequential rollout and verification
```

Properties:

- root/manager execution only; gateway tasks never receive the Docker socket;
- `flock` serialization;
- atomic status and `current-image` writes;
- stop-first service updates because each org has a single-writer persistent volume;
- bounded service convergence checks;
- previous digest captured for every service;
- rollback of the failed service and any service advanced earlier in the same operation;
- structured status suitable for polling and audit logs.

Hub's external-controller adapter dispatches a dedicated GitHub Actions `workflow_dispatch`. The workflow uses the existing protected SSH deployment credentials to run the host controller, then polls/reports the controller result. Hub receives only GitHub workflow authority scoped to this repository/workflow; it receives neither SSH private keys nor Docker access.

`controllerId` is stable across controlled services, for example `swarm:production/minion`. A single Hub advance dispatches the controller once for all pending members with that ID.

## 7. Orchestration state machine

At job start, Hub snapshots `update.status` from all gateways and normalizes old and new contracts.

### Package unit

`pending -> draining -> updating -> verifying(version) -> done|failed`

This is the existing least-connections-first, per-instance behavior.

### External-image controller unit

`pending -> controller-dispatch -> image-rollout -> verifying(digest + health per member) -> done|failed`

Rules:

1. Group pending external-image instances by `controllerId`.
2. Resolve the target artifact before rejecting a missing gateway-side target; image discovery belongs to the controller.
3. Dispatch once per controller group with an idempotency key/job ID.
4. Poll controller progress without holding a Vercel request for the entire rollout.
5. Verify each gateway independently after reconnect. Digest equality is authoritative; artifact version/revision are diagnostic fallbacks only when digest reporting is temporarily unavailable.
6. Do not use the fixed package-update 240-second deadline. External controller jobs use a renewable lease/heartbeat and a bounded deployment deadline (initially 15 minutes).
7. Stop the fleet job on rollback or any member that fails health/convergence.

Existing rows created under package semantics are historical. A new check/start must reconcile stale failures against current runtime/artifact truth rather than retrying their timestamped npm target against containers.

## 8. Hub UI behavior

- Show **Package update** for self-managed gateways and **Container image update** for externally managed gateways.
- For image rollouts, display abbreviated current and target digests plus revision/version metadata when available.
- Replace per-container `Install & restart` wording with `Roll out latest image`.
- Show controller phases: resolving, queued, rolling service, verifying gateways, rolling back, complete.
- Preserve connection counts and drain/cutover messaging. A controller rollout still causes a deliberate 1012/reconnect cycle as each task is replaced.
- A failed legacy job whose target type is incompatible with the current runtime is retired instead of resurrected by Retry.

## 9. Security and operations

- Pin service specs to immutable digests after every successful rollout.
- GitHub environment protection and least-privilege repository workflow permission gate production dispatch.
- Do not log gateway tokens, SSH material, Docker secrets, or full service environments.
- Controller status contains operation ID, controller ID, image/digest, service, timestamps, phase, and sanitized error only.
- Retain Swarm update/rollback configuration and health checks as a second safety layer.
- Separately fix uncaught model-provider promise rejections so an external 402 cannot terminate a gateway task during rollout.

## 10. Migration and rollout plan

1. **Gateway capability:** ship runtime inference, artifact identity, typed external delegation, and tests.
2. **Image metadata:** add OCI build labels and inject explicit runtime/controller/artifact environment into Swarm services.
3. **Host controller:** install and dry-run `resolve`/`status`; verify no service mutation on an already-current digest.
4. **Hub orchestration:** deploy mixed-runtime normalization, controller grouping/dispatch, digest verification, stale-job retirement, and UI copy.
5. **Controller integration:** enable protected workflow dispatch and configure Hub's narrowly scoped workflow credentials.
6. **Canary:** roll the lower-connection service to the resolved digest, verify health/reconnect/state, then the other service.
7. **Production proof:** confirm both service specs contain the same immutable desired digest, both gateways report it, Hub shows 2/2 complete, and no npm install occurred in either task.
8. **Cleanup:** clear obsolete package-oriented pending files for image-managed instances only after the new Hub is live; retain historical result logs.

## 11. Acceptance tests

- Unit: explicit env overrides marker inference; container marker fails safe to external-image; systemd and fallback retain self-update.
- Unit: external `update.run` is non-mutating and never calls the npm runner, drain, watchdog, or restart scheduler.
- Unit: Hub normalizes both old status and the new nested runtime/artifact contract.
- Unit: two instances with one controller cause exactly one external dispatch.
- Unit: digest match plus healthy completes each image member; package version mismatch cannot fail a digest-matched member.
- Unit: partial controller failure marks the unit failed and surfaces rollback.
- Script: resolve always produces `repo@sha256`; concurrent update is rejected/serialized; no-op is idempotent; partial failure rolls all touched services back.
- Integration: mixed systemd + Swarm fleet takes the correct path for each group.
- Live: latest tag digest, service spec digest, local image content digest, and gateway-reported digest agree for both production services.

## 12. Exit criteria

The incident is closed only when Hub no longer sends npm `update.run` to an image-managed gateway, production services are pinned to the newest resolved `prd` digest, progress is controller-aware, and a legacy systemd gateway can still complete its existing package update path.

## 13. Production verification

Production verification completed on 2026-07-13 (America/Lima):

- Gateway runtime inference, external-image delegation, image metadata, the host controller, and the dedicated Swarm rollout workflow shipped to `minion-ai` main.
- Mixed-runtime orchestration and container-image rollout state shipped to `minion_hub` master and deployed successfully on Vercel.
- `minion_gateway-default` and `minion_gateway-faces` converged sequentially with 1/1 replicas to `ghcr.io/nikolasp98/minion-ai@sha256:cf3e6be49d501d0d653291ae009520162c77a3cf657e003a0afcf76e29421bf9` (OCI revision `f3852fe46e434d7ca5e3282330e6a0f3cdbddb1c`).
- Both live `update.status` RPCs reported `kind=container`, `updateStrategy=external-image`, controller `swarm:production/minion`, the exact digest above, healthy connections, and `draining=false`.
- Obsolete package-oriented pending state was cleared only after digest convergence; both gateways then reported `pending=null`.
- Dedicated workflow run `29304917349` validated the protected SSH/controller path and completed successfully as an idempotent exact-digest no-op.

These checks satisfy the exit criteria. Future container releases use the image controller; legacy systemd installations retain the npm self-update path.
