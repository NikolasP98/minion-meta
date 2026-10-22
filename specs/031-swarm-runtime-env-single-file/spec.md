# Feature Specification: One runtime env file per gateway tenant

**Feature Branch**: `fix/swarm-runtime-env-single-file` (minion-ai PR #351)
**Created**: 2026-10-22
**Status**: Implemented (PR open)
**Input**: Owner: "make it point to a single file, and any older versions should be backups instead of newer ones changing names."

## AS-IS

- `deploy/swarm/stack.yml` mounts `minion_<tenant>_runtime_env_v1` as `/run/secrets/runtime_env`.
- On 2026-10-22 the OpenRouter keys were rotated on netcup by creating new immutable secrets (`minion_faces_runtime_env_v2`, `minion_default_runtime_env_v3`) and hand-editing the box's `stack.yml`. The repo still says `_v1`, so a stack deploy from the repo would restore the old keys.
- A rotation also hung: `docker service update` on the 0-replica `-b` standby waits for convergence forever.

## TO-BE

- Each tenant's runtime env is a single root-only (0600) file, `/opt/minion-swarm/secrets/<tenant>.runtime_env`. That path is the only name an operator needs.
- The Swarm secret is named from the file's content hash (`minion_<tenant>_runtime_env_<sha256[:12]>`). `deploy.sh` and `set-runtime-env.sh` derive the same name from the same file through `runtime-env.sh`.
- Changing a value keeps the previous file as `<tenant>.runtime_env.bak-<UTC stamp>`; no version suffix is ever hand-edited.
- A rotation rolls only that tenant and never runs a full stack deploy.

## Requirements

- **FR-001**: `stack.yml` reads each tenant's runtime env from `${MINION_SWARM_SECRETS_DIR}/<tenant>.runtime_env` and names the secret with `${MINION_<TENANT>_RUNTIME_ENV_REV}`. Both variables are required (`:?`).
- **FR-002**: `deploy.sh` fails if either tenant file is missing, and exports the revs.
- **FR-003**: `set-runtime-env.sh <default|faces> <VAR>` reads the value from stdin (hidden on a TTY) and rejects empty values or characters that need shell quoting. It backs up the old file, creates the secret if absent, and updates `-b` with `--detach`, then the live service with `--detach=false`.
- **FR-004**: Re-setting an identical value writes nothing and calls no Docker write.
- **FR-005**: Secret values are never printed.

## Invariants

- The other tenant is never touched by a rotation.
- The same file content always maps to the same secret name, so a later `deploy.sh` is a no-op for an unchanged tenant. Swarm accepts a re-create of identical data under an existing name.

## DELTA and tests (`deploy/swarm/set-runtime-env.test.sh`, Docker stubbed, run in the CI `shellcheck` job)

| Transition | Test |
|---|---|
| replace in place + backup holds old content + mode 0600 | first block |
| exact `secret create` / `service update` calls; faces untouched | first block |
| identical value → no backup, no Docker calls | second block |
| missing variable appended | third block |
| unsafe values and unknown tenant refused before any write | fourth block |
| `deploy.sh` derives the same revs; refuses a missing file | last blocks |

## Rollout (owner, after merge)

Seed both files from the live mounted secrets and copy the two scripts to the box. Then switch each tenant once: same content, new name, so one stop-first restart per tenant. The box's `/opt/minion-swarm/deploy/` copy (July, stale `current-image`) must be refreshed before its `deploy.sh` is ever run.

## Out of scope

- Pruning old secrets: the `-b` slot may still reference them.
- Valkey public exposure and agent `auth-profiles.json` keys (see `proposals/2026-10-21-gateway-macos-ci-pause.md` / memory).
