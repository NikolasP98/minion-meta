# 360 infrastructure verification — 2026-09-09

## Authority and scope

Read-only verification by infrastructure agent. No restart, flag edit, deployment, paid model call or production database change. Audit predecessor: `.lavish/minion-qc-2026-09-08/agents-infra.md`. Read current Factory AGENTS at dev 02900306: trusted workflow exclusively owns release/main advancement; configuration gating must preserve image/revision and must not bypass a release.

## Access recovery

Established `ssh netcup` (niko@100.80.222.29) timed out. Local Tailscale BackendState is **Stopped**. Cached peer Online=true is not connectivity proof. Public Netcup address already documented in the May flow spec works with the same niko SSH identity. No tailscale/service changes made.

## Verified live identity and posture

- Factory process, host checkout, `/trigger-health.runningSha`, candidate marker, release receipt and release manifest all identify **02900306a1fcc7b182bae726a24260d08467f81e**. Process created 2026-09-02T10:02:49Z.
- Runner configured image `minion-factory-runner`, actual image ID `sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea`; RepoDigest `minion-factory-runner@sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea`.
- **AUTOMERGE=1, AUTOPROMOTE=1; CONTAINMENT_V2=0, MEMORY_GOVERNANCE_V2=0, LINEAGE_ORCHESTRATOR_V1=0.** These are actual container env values, matched by `/opt/factory/.env` (0600, uid/gid1000). No secret values printed.
- Actual Factory PID is `node`, uid/gid **0**. Writable Docker socket mounted. ReadonlyRootfs=false, Privileged=false, no explicit CapDrop/SecurityOpt/PID/memory/CPU limits. Do not describe this as a contained agent runtime.
- Gateway default and FACES are healthy, pinned `ghcr.io/nikolasp98/minion-ai@sha256:368c3b4c30a34d931a38d96456155eab41839861c93d384c047017d9a75586d9`, image revision **d42a7a8d186fc460963fa72a6b6508d57a7eca7f**. Both have writable rootfs, no explicit memory/CPU/PID limits and a writable tailscaled socket. Config.User empty is not proof the running gateway stays root; actual gateway process uid not inspected.
- Vector worker is healthy and pinned digest `f2039955fc640705f421900793412db2ea50a36d2e9e31006d55a298614796c5`, revision `66c91f474c473266660067691788c7ea2fa23729`, user=node, 512MiB/1CPU. NATS, Qdrant, Valkey also running; existence is not a current approved event-plane architecture decision.
- Public `/health` returns 200 `{ok:true}`; this alone does not establish any above identity or policy.

## Recovery evidence and bounded status

`.promotion-state/candidate-sha` is 02900306; `previous-sha` is 3cd200bd4a25e57107febf7542e9eb8cb65e4de2. `state-kind=release`. Release receipt verdict is complete; deployment record/manifest match candidate. Database/environment backup directories exist. File hashes/restoration and external failure drills were NOT re-executed. `live-reconciliation.json` references older 6c054115, so do not use that historical record as a current restore proof.

At the sampled time `/trigger-health` has **no running lane**, 2 queued dev + 13 queued spec, pausedForOperator=false. Docker inventory shows no worker containers. `/runs` is paginated/recent (50 rows), so its smaller counts are not the complete backlog. No currently running workload observed; this is only a snapshot. Enabled admission can race a later config action, so it cannot prove interruption-free recreation. Queue policy admitted=0 at this moment; that is dynamic ranking state, not an operator safety gate.

## Reviewable minimal gating packet — NOT EXECUTED

Purpose: stop automatic PR merge and proposal/spec promotion while containment activation is unverified, retaining exact deployed code/image and queued work.

**Semantics:** `FACTORY_AUTOPROMOTE` controls proposal/spec lifecycle approval/admission (`runner/src/lifecycle.ts:527-532`), not the protected GitHub dev→production deployment workflow. `FACTORY_AUTOMERGE` arms the PR merge sweep (`runner/src/automerge.ts:785-790`). Both are checked when scheduling timers on process startup; editing `.env` or `docker restart` alone does not update an existing container's env. Container recreation is required.

**Config authority:** Compose labels prove working dir `/opt/factory`, file `/opt/factory/docker-compose.yml`, service `runner`; `env_file: .env`. The reviewed three-flag target is AUTOMERGE=0, AUTOPROMOTE=0 and DISPATCH_PAUSED=1. The first two alone do not pause admission of the 15 already queued legacy jobs. Do NOT activate containment/memory/lineage flags during this gating action.

**Lock/control contract:** hold an exclusive nonblocking flock on the existing `/opt/factory/.promotion.lock` file descriptor for the entire preflight, config update, recreation and postvalidation. This is the deployed `scripts/promotion/deploy-exact.sh:46-49` and `rollback-previous.sh:15-17` serialization contract, rather than an inode snapshot. It serializes trusted release operations only; it does NOT stop runner dispatch or sweeps. Verify no old updater or other unmanaged writer is active. Do not truncate or edit promotion state.

**Admission limitation:** deployed `runner/src/dispatch-policy.ts:1-10` reads process.env; `queue.ts:340-342` checks that value before admission. A scan of production runner source found no HTTP endpoint, signal handler or persisted control for changing the pause on the existing process (test-only env assignments excluded). Updating the env file therefore cannot pause the running process before recreation. Do NOT claim the empty snapshot is a drain barrier. An interruption-free packet is blocked unless an independently verified runtime pause is added; otherwise the operator must explicitly accept a bounded maintenance interruption and the possibility of a worker/sweep starting in the check-to-stop interval. Do not invent a DB pause column, use debugger injection, or kill worker jobs to emulate a drain. The post-recreation DISPATCH_PAUSED=1 gate prevents subsequent admission.

**Preflight immediately before an authorized maintenance action:** under the promotion lock, verify expected current SHA and exact image ID; query all queue lane counts, active Docker workers and in-flight sweep records. If a worker/sweep/release appears, defer recreation until it settles and re-evaluate the interval risk. Queue retention is required. Existing startup adopts surviving workers, but that is not proof of uninterrupted sweep/worker supervision.

**Concrete change:** make a private 0600 rollback record of only the selected old flag values and original file hash/mtime; update only those keys in `/opt/factory/.env` atomically, preserving mode/owner and all other content. Create a private temporary Compose override containing only service runner image `sha256:c072333e52302b8775e52341e3a225473b0615e39737dbb3a04203f4bebc2fea`. Resolve Compose in memory and print only allowlisted env/image fields. Validate that the engine and Compose accept this existing immutable local image ID; if they do not, stop and use an independently validated immutable digest reference. Do not fall back to the mutable `minion-factory-runner` tag.

Under the held lock, invoke `docker compose --env-file /opt/factory/.env -f /opt/factory/docker-compose.yml -f <private-image-override> up -d --no-deps --no-build --pull never runner`. The override removes the mutable-tag check/use race; no source Compose edits, build, pull or dependency recreation. Preserve the override through verification/rollback and record its location because Compose labels reference it. Do not invoke broad deploy.sh or print full resolved Compose configuration (both expose or alter unrelated state). This command remains a proposed action, not executed or dry-run validated on the host.

**Postconditions:** container actual Image ID remains c072333e; runningSha/host checkout remain 02900306; allowlisted env contains the intended zero flags (and dispatch pause if selected). `/health` and `/trigger-health` healthy. No new automerge/spec/promote sweep timers after boot; queued counts remain reconciled to recorded IDs, not silently deleted. Inspect through initial 90/120-second sweep windows to prove disabled timer behavior; if dispatch was paused, `pausedForOperator=true`. No frontend/gateway container should change.

**Rollback:** if health or identity validation fails, restore only the edited keys from rollback values after checking no other operator changed them; recreate runner with the same immutable-image override under the same promotion lock. Do not restore an entire old `.env` over concurrent secret/config changes. Rollback re-enables the old authority; use only for verified service recovery and report this explicitly.

**Persistence:** current `deploy.sh:218-228,317-319` preserves box AUTOMERGE/AUTOPROMOTE/DISPATCH_PAUSED values during env rewrite. A committed operations policy should require these gates to stay off until the existing disposable-repo containment/effect drill passes. Flag change/recreation needs root's execution authorization; this agent has only prepared evidence and packet.

## Source versus deployment

Factory current remote dev snapshot 02900306 matches runtime; local working checkout is older 174d0e6. Gateway runtime revision d42a7a8d is newer than old audit DEV 1d40d9a; do not assert a local patch is deployed. SEC-04/05 local SQL changes are being validated in separate scoped source edits. All release claims still require exact-candidate CI and runtime verification.

## Remaining evidence

- Credentialed disposable-repo restart/effect drills and containment activation remain unproven; existing current source explicitly records gate at queue.ts:1922-1926.
- No actual ACP harness/provider conformance or paid model calls; prior Shells absence of conformance evidence remains.
- No restore drill, backup integrity exercise, runtime tenant test, or current CVE scan.
- Resource limits, root/socket authority and environment flag posture are now directly verified and should drive the plan.

### Final read-only checks

- `/opt/factory/.promotion.lock` exists; matching inode was not held in `/proc/locks` at the second sample. All reported sweeps finished, with no recorded error; still no running queue lane. Recheck immediately before action because the enabled schedulers continue running.
- Downloaded gateway `extensions/flows/src/data-nodes.ts` at the actual deployed revision **d42a7a8d** through authenticated GitHub Contents API. It is byte-identical to the earlier audited DEV file. The unsafe CTE read predicate therefore exists in the exact source revision recorded by the running gateway image; local SEC-04 patch is not yet deployed.
