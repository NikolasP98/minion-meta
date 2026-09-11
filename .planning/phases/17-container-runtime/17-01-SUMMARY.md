---
phase: 17-container-runtime
plan: "01"
requirements: ["OPS-01"]
requirements-completed: []
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/17-01-d9de7bf3/MINION
base: origin/dev 96e5ceeb25a7544e47fb9f3362c4d2b6849fcc5f
completed: 2026-09-11
owned_files:
  - path: scripts/qc/runtime-posture.mjs
    before: absent
    after: 912ab47fc95dc34b9b9229101fa1bf545754b19caa28a4173d8cedf6ff32e0dd
  - path: scripts/qc/runtime-posture.test.mjs
    before: absent
    after: d4b0d74434f78730044dd5b6651222005aa826e4cca66b7fd5c40c50bc260526
  - path: scripts/qc/operator-gate-contract.test.mjs
    before: absent
    after: 59c4a32e48c58d39d00aefab9ea02bf090e51c2e8166c1544e0062357e2e54ae
  - path: .planning/phases/17-container-runtime/17-RUNTIME-IDENTITY.md
    before: absent
    after: e545438cf24d7a5d948b2377fc1061aa1dc0b723fb307a980dfaa644893f9c5e
  - path: .planning/phases/17-container-runtime/17-OPERATOR-GATE.md
    before: absent
    after: 2f55807edfc42fe72e7c462e0e03c6b65575a5b1223a9e00ab87484990584ef0
decisions: [D360-01, D360-03, D360-04, D360-06]
---

# 17-01 Runtime posture collector + operator gate packet (OPS-01)

`status: partial`: both tasks are delivered and locally gated, but OPS-01 ("exact live source/image/flags and container privilege/resource posture are recorded") is only recorded from the 2026-09-09 research sample. The root gate for this plan forbade SSH to any real host, so no fresh observation exists; `requirements-completed` stays empty.

## Where things are

- Scripts live only in the private snapshot `/home/nikolas/.cache/claude-tmp/17-01-d9de7bf3/MINION` (detached worktree of meta `origin/dev`; `pnpm install --frozen-lockfile --ignore-scripts` exit 0). They are untracked there; nothing was staged, committed or pushed. The main meta checkout was not touched except for the three `.planning/phases/17-container-runtime/` documents this plan owns (byte-identical copies sit in the snapshot so the gate test resolves its relative path).
- Receipts: `/home/nikolas/.cache/claude-tmp/17-01-d9de7bf3/checks/` (`before.txt`, `after.txt`, `freeze.json`, `install.log`, `runtime-posture.test.log`, `operator-gate-contract.test.log`, `operator-gate-red.log`, `commands.log`, `gate-broken.md`).
- Runtime: Node v22.23.2, pnpm 10.15.0; node builtins only, no new dependency.

## Task 1 — allowlisted runtime identity collector

`scripts/qc/runtime-posture.mjs` (`commands | evaluate <dir> [expected.json] | gate <md>`) plus `17-RUNTIME-IDENTITY.md`.

- Parses `docker inspect`, `/proc/<pid>/status`, `/trigger-health`, host `HEAD`/marker/candidate and a key-filtered `.env` grep from a capture directory; emits allowlisted JSON only. `Config.Env`, `Cmd`, `waiting`/`oldestWaiting` run rows and any non-allowlisted key are never emitted; a capture file carrying a non-allowlisted key is rejected, not filtered.
- Distinguishes `configUser` from `process.processUid` (`/proc` effective uid) with `root` and `matchesConfigUser` (numeric Config.User only). The gateway `gosu node` drop (`minion/docker/entrypoint.sh:95-107`) with empty `Config.User` is the tested case.
- `identity.admitted` needs ≥2 identity sources in full agreement (runningSha, HEAD, marker, candidate, `FACTORY_GIT_SHA`, revision label, expected) plus image-ID, per-service revision/image and container-vs-`.env` flag agreement. Any drift → `admitted:false`, exit 2; nothing repairs. A mutable `Config.Image` tag is a warning, not drift (the current production state).
- Gate: `node --test scripts/qc/runtime-posture.test.mjs` → **9 tests, 9 pass, 0 fail, 0 skipped, exit 0** (`checks/runtime-posture.test.log`). Negative cases: missing `Id`, tag as `.Image`, array record, `FACTORY_DISPATCH_PAUSED=yes`, shell-metachar env value withheld, disallowed `.env` key, duplicate key, `$(…)` host value, malformed runningSha, sha/image/flag drift, single source, two-container inspect, missing directory.
- Identity doc records the research-sample identities verbatim (Factory `02900306…` / image `sha256:c072333e…` / uid 0 / AUTOMERGE=1 AUTOPROMOTE=1 / docker.sock rw / no limits; gateway `ghcr.io/nikolasp98/minion-ai@sha256:368c3b4c…` rev `d42a7a8d…`; vector `f2039955…` rev `66c91f47…`), labelled stale, with the exact operator commands and an `expected.json` for re-observation.

## Task 2 — exact-image pause/recreation packet

`17-OPERATOR-GATE.md` carries a machine-checked `json` packet; `validateGatePacket` in the collector enforces it; `scripts/qc/operator-gate-contract.test.mjs` exercises it.

- Fixes target image `sha256:c072333e…` (override may only be that ID or a `repo@sha256:` digest, never the `minion-factory-runner` tag), expected SHA `02900306…`, flags exactly `AUTOMERGE=0 AUTOPROMOTE=0 DISPATCH_PAUSED=1`, activation flags forbidden, `flock` on `/opt/factory/.promotion.lock` held throughout, `docker compose … up -d --no-deps --no-build --pull never runner`, keys-only 0600 rollback under the same lock/override, postconditions (imageId, runningSha, pausedForOperator, queueCounts, sweepTimers, health, noOtherContainerChanged).
- Preserves queued work (`queue.preserve:true`), declares `drainBarrier:"none"`, refuses `emptySnapshotIsDrainProof:true`, discloses the check-to-stop race, and requires `authority.granted:false` with a stated maintenance-interruption authority — the packet cannot self-authorize. AUTOPROMOTE = spec-lifecycle admission (`lifecycle.ts:485`), not deployment promotion (`promote-dev-daily.yml`), stated in prose and enforced in JSON.
- Gate: `node --test scripts/qc/operator-gate-contract.test.mjs` → **28 tests, 28 pass, 0 fail, 0 skipped, exit 0** (`checks/operator-gate-contract.test.log`): 1 acceptance, 1 prose-anchor, 25 named rejections (mutable tag, second service in override, containment flag, automerge on, pause omitted, forbidden list short, deploy.sh, `--no-deps`/`--pull never`/`--no-build` removed, empty-snapshot drain claim, invented drain barrier, queue not preserved, race hidden, self-authorized, maintenance unstated, whole-env rollback, rollback outside lock, wrong lock path/mode, malformed sha/image, postconditions short, semantics conflated, wrong service), 1 missing-block/non-object.
- Red proof: the same suite against a copy with `emptySnapshotIsDrainProof:true` → 27 pass, 1 fail, exit 1 (`checks/operator-gate-red.log`); CLI `gate` on it reports `empty-snapshot-claimed-as-drain`.

## Deviations

- No SSH/live observation (root gate). Plan text "use approved SSH identity/host from verified evidence" is satisfied only as the recorded command list; the host address and identity are not embedded in the script.
- Scripts were not placed in the main checkout (brief rule 2); root must adopt them from the snapshot or re-create the worktree files.
- `git diff --check` has nothing to check for untracked files; a trailing-whitespace grep over the five files is clean.

## Gaps / blocked (decision or access needed)

| Item | Blocked on |
|---|---|
| Fresh runner/gateway/vector identity, flags, actual uid, limits (OPS-01 closure) | operator runs the read-only commands in `17-RUNTIME-IDENTITY.md` on the host and root reviews `evaluate` output; no credential needed beyond existing host operator + `FACTORY_ADMIN_TOKEN` on-box |
| Engine acceptance of `image: sha256:<id>` in a Compose override | operator-authorized dry resolution during packet preflight; otherwise use a validated digest ref |
| Interruption-free pause | deployed runner has no drain barrier; either owner accepts the disclosed maintenance race (D360-03 approval still pending) or a new bounded source slice adds a verified runtime pause |
| Executing the packet | explicit owner authorization for runner-only recreation; not requested by this plan |

Next gated plan: 17-02 (disposable profile), then 17-03 (drills, activation packet) which consumes this packet.
