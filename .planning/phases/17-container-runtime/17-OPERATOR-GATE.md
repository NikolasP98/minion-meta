# 17 Operator gate packet — exact-image runner pause/recreation (NOT EXECUTED)

Plan 17-01 Task 2. Refreshes the reviewable packet from `.planning/research/360-infrastructure-verification.md` (2026-09-09) against Factory source at `minion_factory` `174d0e6b` (local) and the deployed identity recorded there. Validated by `node scripts/qc/runtime-posture.mjs gate <this file>` and `scripts/qc/operator-gate-contract.test.mjs`. This packet grants nothing: `authority.granted` is `false` by contract and the validator rejects any packet that says otherwise (D360-03: no runtime change is authorized by silence).

## What the flags mean (do not conflate)

| Flag | Read at | Effect | Not |
|---|---|---|---|
| `FACTORY_AUTOPROMOTE` | `runner/src/lifecycle.ts:485` (`!== '1'` → return) | proposal/spec lifecycle **admission** sweep | GitHub dev→production deployment promotion (`.github/workflows/promote-dev-daily.yml`, `scripts/promotion/*`) |
| `FACTORY_AUTOMERGE` | `runner/src/automerge.ts:735` | PR merge sweep | release/main advancement |
| `FACTORY_DISPATCH_PAUSED` | `runner/src/dispatch-policy.ts` at module load; `queue.ts` before admission | exact `1` = operator brake: queued runs preserved, no new dispatch/auto-fix/spec-promotion/unstick remedies; API, health, budget, monitor intake stay up | a drain of in-flight work; any value other than `0`/`1`/empty makes the runner refuse to start |

All three are read from `process.env` of the running process. Editing `/opt/factory/.env` or `docker restart` does not change an existing container's env; only recreation does. There is no HTTP endpoint, signal handler or persisted control to pause the running process (research, `dispatch-policy.ts`, `queue.ts`).

## Packet

```json
{
  "version": 1,
  "service": "runner",
  "composeFile": "/opt/factory/docker-compose.yml",
  "envFile": "/opt/factory/.env",
  "lock": "/opt/factory/.promotion.lock",
  "lockMode": "flock-exclusive-nonblocking-held-throughout",
  "expected": {
    "runningSha": "02900306a1fcc7b182bae726a24260d08467f81e",
    "imageId": "sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea",
    "hostCheckout": "/opt/factory",
    "observedAt": "2026-09-09 research sample; re-observe with scripts/qc/runtime-posture.mjs before action"
  },
  "flags": {
    "FACTORY_AUTOMERGE": "0",
    "FACTORY_AUTOPROMOTE": "0",
    "FACTORY_DISPATCH_PAUSED": "1"
  },
  "forbiddenFlags": ["FACTORY_CONTAINMENT_V2", "FACTORY_MEMORY_GOVERNANCE_V2", "FACTORY_LINEAGE_ORCHESTRATOR_V1"],
  "autopromoteSemantics": "spec-lifecycle-admission-not-deployment-promotion",
  "preflight": [
    "hold exclusive nonblocking flock on /opt/factory/.promotion.lock (exec 9>LOCK; flock -n 9) for preflight, env edit, recreation and postvalidation",
    "verify no legacy scripts/self-update.sh cron and no other unmanaged writer (crontab -l; ps)",
    "run scripts/qc/runtime-posture.mjs commands on the host, then evaluate: admitted must be true with runningSha == expected.runningSha and image.id == expected.imageId",
    "query /trigger-health lanes: any status=running lane, any sweep with finishedAt=null, or a release in progress → defer and re-evaluate; never kill workers to emulate a drain",
    "record queued lane counts and IDs (private, 0600) for post-recreation reconciliation"
  ],
  "change": {
    "rollbackRecord": "private 0600 file: selected old flag values + sha256/mtime/mode of /opt/factory/.env",
    "envEdit": "update only the three flag keys atomically (temp file + rename), preserve mode 0600, owner 1000:1000 and every other line",
    "overrideFile": "private 0600 compose override outside the repo checkout; path recorded because Compose labels will reference it"
  },
  "recreate": {
    "override": { "services": { "runner": { "image": "sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea" } } },
    "command": "docker compose --env-file /opt/factory/.env -f /opt/factory/docker-compose.yml -f <private-override> up -d --no-deps --no-build --pull never runner",
    "ifEngineRejectsLocalImageId": "stop; use an independently validated immutable repository@sha256 digest; never fall back to the mutable minion-factory-runner tag"
  },
  "queue": {
    "preserve": true,
    "drainBarrier": "none",
    "emptySnapshotIsDrainProof": false,
    "reconcile": "post-recreation queued counts/IDs must equal the preflight record; nothing silently deleted"
  },
  "race": {
    "disclosed": true,
    "window": "check-to-stop interval: enabled automerge/spec/promote sweeps and dispatch keep running until the old container stops; a worker or sweep may start after preflight and be interrupted by recreation. Startup adopts surviving worker containers but that is not proof of uninterrupted sweep/worker supervision."
  },
  "authority": {
    "granted": false,
    "required": "explicit owner acceptance of a bounded maintenance interruption (the race above) plus authorization for runner-only recreation with these exact flags and image; request it only when preflight is clean and an operator is attached"
  },
  "rollback": {
    "keysOnly": true,
    "wholeEnvRestore": false,
    "sameImageOverride": true,
    "underSameLock": true,
    "trigger": "health or identity postcondition fails",
    "note": "rollback re-enables the old automatic authority; use only for verified service recovery and report it explicitly"
  },
  "postconditions": ["imageId", "runningSha", "pausedForOperator", "queueCounts", "sweepTimers", "health", "noOtherContainerChanged"],
  "postconditionDetail": {
    "imageId": "docker inspect factory-runner .Image == expected.imageId",
    "runningSha": "/trigger-health runningSha == expected.runningSha and /opt/factory HEAD/.deploy-marker/candidate-sha unchanged",
    "pausedForOperator": "/health and /trigger-health report pausedForOperator=true",
    "queueCounts": "queued lanes reconcile to the preflight record",
    "sweepTimers": "observe through the initial 90/120 s sweep windows: no automerge/spec/promote sweep entries appear in /trigger-health sweeps",
    "health": "/health 200 {ok:true}",
    "noOtherContainerChanged": "caddy, gateway and vector container IDs/images unchanged"
  },
  "persistence": "deploy.sh preserves box AUTOMERGE/AUTOPROMOTE/DISPATCH_PAUSED during env rewrite; a committed operations policy must keep them off until the disposable-repo containment/effect drill (17-03) passes"
}
```

## Explicit limits

- Not executed, not dry-run validated on any host. No SSH, env mutation, recreation or containment activation happened in 17-01.
- An interruption-free packet is blocked: the deployed runner has no in-process drain barrier. The owner must either accept the disclosed race as a bounded maintenance interruption or first fund an independently verified runtime pause (a new bounded source slice, not this plan).
- The empty running lane observed on 2026-09-09 is a snapshot, not a drain proof; the validator refuses any packet that claims otherwise.
- Do not invoke `deploy.sh`, print the full resolved Compose configuration, restore an entire old `.env`, or touch `.promotion-state`.
- Lock semantics: the flock serializes trusted release operations only (`deploy-exact.sh`, `rollback-previous.sh`); it does not stop runner dispatch or sweeps.
