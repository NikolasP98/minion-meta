# 17 Runtime identity record (OPS-01, plan 17-01 Task 1)

Read-only. No host was contacted in this plan. Every live value below is quoted from `.planning/research/360-infrastructure-verification.md` (sampled 2026-09-09 over the public Netcup address with the `niko` SSH identity; Tailscale was `Stopped`, so cached peer status is not connectivity) and is therefore **stale by construction**. Re-observation is blocked until an operator runs the collector commands on the host; the exact commands are listed under "Blocked: live re-observation".

## Collector

`scripts/qc/runtime-posture.mjs` (snapshot `/home/nikolas/.cache/claude-tmp/17-01-d9de7bf3/MINION`, not yet in a checkout; root adopts it).

| Command | Does | Never does |
|---|---|---|
| `node scripts/qc/runtime-posture.mjs commands` | prints the read-only host commands whose outputs feed `evaluate` | executes them, opens SSH |
| `node scripts/qc/runtime-posture.mjs evaluate <capture-dir> [expected.json]` | parses `docker inspect`, `/proc/<pid>/status`, `/trigger-health`, host marker/HEAD/candidate and a key-filtered `.env` grep; emits allowlisted JSON; exit 2 when identity drifts | emits `Config.Env`, `Cmd`, run titles, tokens; repairs, restarts, edits |
| `node scripts/qc/runtime-posture.mjs gate <17-OPERATOR-GATE.md>` | validates the Task 2 packet | authorizes anything |

Allowlisted output: container id/name/created/status/pid; `image.id` (actual `.Image`), `image.configured` (`Config.Image`, flagged as a *warning* when it is a mutable tag), `image.revision` (`org.opencontainers.image.revision` label); `configUser` **and separately** `process.processUid/processGid` from `/proc/<pid>/status` with `root:true|false` and `matchesConfigUser` (numeric Config.User only; names stay `null`); the six policy flags (`FACTORY_AUTOMERGE`, `FACTORY_AUTOPROMOTE`, `FACTORY_DISPATCH_PAUSED`, `FACTORY_CONTAINMENT_V2`, `FACTORY_MEMORY_GOVERNANCE_V2`, `FACTORY_LINEAGE_ORCHESTRATOR_V1`; any value other than `0`/`1`/unset is rejected); `FACTORY_GIT_SHA`, `FACTORY_RUNNER_IMAGE`, `FACTORY_AGENT_IMAGE`, `MINION_RUNTIME_KIND`; privileged/readonlyRootfs/capAdd/capDrop/securityOpt/pidsLimit/memory/nanoCpus/restartPolicy; mounts (type/source/destination/rw) and a `dockerSocket` boolean; `/trigger-health` runningSha, pausedForOperator, bootedAt, lane counts, sweep in-flight/failed booleans. `env-flags.txt` is rejected outright if it contains any non-allowlisted key, so a full `.env` can never be ingested.

Admission (`identity.admitted`) requires at least two identity sources and full agreement among: `/trigger-health.runningSha`, host `HEAD`, `.deploy-marker`, `.promotion-state/candidate-sha`, container `FACTORY_GIT_SHA`, image revision label and (if supplied) `expected.runningSha`; plus `expected.imageId == image.id`, container flags == `.env` flags for every key present in the grep (edited-but-not-recreated `.env` is drift, not a pause), and per-service expected image ID / revision. Drift blocks; nothing is repaired.

Verification: `node --test scripts/qc/runtime-posture.test.mjs` → 9/9 pass (secret exclusion with three synthetic tokens; malformed/incomplete inspect rejected; invalid flag rejected; unsafe env value withheld; uid 0 vs empty Config.User; uid 1000 vs empty Config.User (gateway gosu case); declared `1000:1000` but actual root → `matchesConfigUser:false`; disallowed `.env` key rejected; sha drift / image drift / flag drift / single-source all block; clean synthetic capture admitted with exit 0, drifted capture exit 2). Log: `checks/runtime-posture.test.log`.

## Recorded identities (2026-09-09 sample — not re-observed)

| Component | Identity | Posture | Source of record |
|---|---|---|---|
| Factory runner container `factory-runner` | image ID `sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea`; RepoDigest `minion-factory-runner@sha256:c072333e…`; `Config.Image` = mutable tag `minion-factory-runner`; runningSha = host checkout = `.deploy-marker` = candidate-sha = release receipt = `02900306a1fcc7b182bae726a24260d08467f81e`; previous-sha `3cd200bd4a25e57107febf7542e9eb8cb65e4de2`; state-kind `release`; process created 2026-09-02T10:02:49Z | actual process `node` **uid/gid 0** (Dockerfile has no `USER`; `Config.User` empty); writable `/var/run/docker.sock`; ReadonlyRootfs=false; Privileged=false; no CapDrop/SecurityOpt/PidsLimit/Memory/NanoCpus; `FACTORY_AUTOMERGE=1 FACTORY_AUTOPROMOTE=1 FACTORY_CONTAINMENT_V2=0 FACTORY_MEMORY_GOVERNANCE_V2=0 FACTORY_LINEAGE_ORCHESTRATOR_V1=0` (container env, matched by `/opt/factory/.env` 0600 uid/gid 1000) | research §"Verified live identity"; `minion_factory/runner/Dockerfile`; `minion_factory/docker-compose.yml` (mounts, ports `100.80.222.29:3210`, `127.0.0.1:3211`) |
| Gateway default + FACES | `ghcr.io/nikolasp98/minion-ai@sha256:368c3b4c30a34d931a38d96456155eab41839861c93d384c047017d9a75586d9`; revision `d42a7a8d186fc460963fa72a6b6508d57a7eca7f` | writable rootfs; no memory/CPU/PID limits; writable `tailscaled.sock` mount; `Config.User` empty — **actual uid not inspected**. Source fact: `minion/docker/entrypoint.sh:95-107` `exec gosu node …` drops to uid 1000 after `chown`, so root is expected only for the entrypoint; the collector's `process.root` field is what closes this | research; `minion/Dockerfile` (no `USER`, `ENTRYPOINT /app/docker/entrypoint.sh`); `minion/deploy/swarm/stack.yml` (2G/1cpu reservations are Swarm `resources`, not the inspected container limits) |
| Vector worker | digest `f2039955fc640705f421900793412db2ea50a36d2e9e31006d55a298614796c5`; revision `66c91f474c473266660067691788c7ea2fa23729` | user=node; 512MiB / 1 CPU | research; `minion/deploy/swarm/brain-vector-stack.yml` |
| NATS / Qdrant / Valkey | running | existence is not an approved event-plane decision | research |
| Queue at sample | no running lane; 2 queued dev + 13 queued spec; `pausedForOperator=false`; no worker containers; `.promotion.lock` present, not held | a snapshot, **not a drain proof** | research §"Recovery evidence" |

Source-vs-deployment: local `minion_factory` checkout is `174d0e6b` (older than deployed `02900306`); gateway runtime `d42a7a8d` is newer than the audited DEV `1d40d9a`. Nothing local is asserted as deployed.

## Blocked: live re-observation (operator, read-only)

Run on the Factory host as the host operator, in a private `0700` directory, then hand the directory to `evaluate` with `expected.json = {"runningSha":"02900306a1fcc7b182bae726a24260d08467f81e","imageId":"sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea","services":{"minion_default_gateway":{"revision":"d42a7a8d186fc460963fa72a6b6508d57a7eca7f"}}}` (service names must match the `<name>.inspect.json` file names):

```
docker inspect factory-runner > factory-runner.inspect.json
sudo cat /proc/$(docker inspect -f '{{.State.Pid}}' factory-runner)/status | grep -E '^(Name|Uid|Gid):' > factory-runner.proc-status.txt
curl -fsS -H "Authorization: Bearer $FACTORY_ADMIN_TOKEN" http://127.0.0.1:3211/trigger-health > trigger-health.json
{ printf 'head=%s\n' "$(git -C /opt/factory rev-parse HEAD)"; printf 'marker=%s\n' "$(tr -d '\r\n' < /opt/factory/.deploy-marker)"; printf 'candidate=%s\n' "$(tr -d '\r\n' < /opt/factory/.promotion-state/candidate-sha)"; printf 'previous=%s\n' "$(tr -d '\r\n' < /opt/factory/.promotion-state/previous-sha)"; printf 'state-kind=%s\n' "$(tr -d '\r\n' < /opt/factory/.promotion-state/state-kind)"; } > host-identity.txt
grep -E '^FACTORY_(AUTOMERGE|AUTOPROMOTE|DISPATCH_PAUSED|CONTAINMENT_V2|MEMORY_GOVERNANCE_V2|LINEAGE_ORCHESTRATOR_V1|RUNNER_IMAGE|AGENT_IMAGE)=' /opt/factory/.env > env-flags.txt
# gateway/vector: docker ps --format '{{.Names}}' then docker inspect <name> > <name>.inspect.json and the same /proc status line per container
```

Blocked items and what unblocks them:

| Item | Status | Unblock |
|---|---|---|
| Fresh runner identity/flags/uid/limits | blocked (no SSH in 17-01 by root gate) | operator runs the commands above; root reviews `evaluate` output |
| Gateway actual process uid | blocked; expected 1000 per entrypoint source | same, `<gateway>.proc-status.txt` |
| Whether the engine accepts `image: sha256:<id>` in a Compose override | unknown; packet requires stop-and-use-digest if not | `docker compose … config --services` dry resolution under operator authority (Task 2 packet preflight) |
| Drain barrier | none exists in deployed source (`dispatch-policy.ts` reads `process.env` at load) | a new bounded source slice, or explicit acceptance of the disclosed race |
