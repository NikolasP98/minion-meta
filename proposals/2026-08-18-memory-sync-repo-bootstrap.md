---
id: 2026-08-18-memory-sync-repo-bootstrap
title: "Reconcile minion-agent-memory Slice 1 staging with the already-live repo"
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
tags: [infra]
source: factory-run-a0315a16
value: medium
---

# minion-agent-memory already exists — this branch's original premise was stale

Factory run `a0315a16` originally staged this proposal (and a now-deleted
`ops/memory-sync/BOOTSTRAP.md`) on the assumption that
`specs/2026-08-17-cloud-agent-memory-sync-spec.md` Slice 1 ("create private
repo, initial push of the MINION memory dir, README contract,
`memory-sync.sh`") had not happened yet. That assumption was false: a
cross-provider review of this branch verified with `gh repo view
NikolasP98/minion-agent-memory` that the repo already exists (private,
created 2026-08-17, default branch `main`) and its root already contains
`MINION/`, `README.md`, `.gitattributes`, and `scripts/memory-sync.sh`.
Operator memory (`/memory/MINION/sdlc-board-triage-and-phase-gates.md`,
"CLOUD MEMORY LIVE" / "THREE-TIER AGENT MEMORY LIVE") independently confirms
Slice 1 — and slices 2–5 (hooks, factory read path, nightly bulk sync) —
are already live on the primary machine. The stale bootstrap doc has been
removed from this branch; it described creating a repo that exists and,
followed as written, would have failed at step 1 or duplicated the live
`MINION/` tree at step 2.

## What this proposal is now

Not a bootstrap — a proposed **update** to the live repo's tooling, for an
interactive session to apply (never a factory run; writing to
`minion-agent-memory` is single-writer/interactive by the spec's own rule,
§3 in `FACTORY_SPEC.md`). This branch's `ops/memory-sync/repo/` staging
diverged from what actually shipped and has two fixes worth carrying over:

1. **`scripts/memory-sync.sh` — file/secret boundary.** The live script
   (`scripts/memory-sync.sh` in `minion-agent-memory`) stages the push
   commit with `git add -A` and there is no root `.gitignore` in the live
   repo at all. That means any file an operator happens to leave in the
   clone — a scratch note, a stray `*.env`, the claude-mem bulk store if it
   were ever mounted alongside — can be swept into a sync commit and
   pushed. The spec's invariant is explicit: "sync NEVER adds new files
   outside the memory dirs" (`FACTORY_SPEC.md` §2). This branch's staged
   script instead stages an explicit allowlist of memory-root directories
   (`MEMORY_SYNC_ROOTS`, default `MINION`) and its `.gitignore` blocks
   `*.env` (not just `.env`/`.env.*`) plus key-shaped filenames. See
   `ops/memory-sync/repo/scripts/test-memory-sync.sh` for an isolated
   (no-network) integration test proving root files, a bulk-store
   directory, and credential-shaped filenames never reach the remote.
2. **Pull timeout.** The spec sets a 2-second SessionStart pull timeout
   (`FACTORY_SPEC.md` §2). The staged script now defaults
   `MEMORY_SYNC_PULL_TIMEOUT=2` and separates it from a longer
   `MEMORY_SYNC_PUSH_TIMEOUT` (default 5) for the end-of-session path,
   which has no such bound in the spec.

The live script is simpler (`MEMORY_REPO_DIR`, no allowlist, no
`.gitignore`) and has been running without incident, so this is a
hardening proposal, not a bug report against something broken today.

## Definition of done

- A human reviews `ops/memory-sync/repo/scripts/memory-sync.sh` and
  `ops/memory-sync/repo/.gitignore` in this branch against the live
  `minion-agent-memory` repo and decides whether to adopt the allowlist +
  timeout split (in whole or in part).
- If adopted: pushed to `minion-agent-memory` directly (not via this
  meta-repo), `~/.local/bin/memory-sync` re-tested per the live repo's own
  README, and this proposal flips to `done`.
- If not adopted: this proposal flips to `closed` with a one-line reason
  (e.g. "live script's simplicity is intentional, boundary risk accepted").

## Out of scope

Slices 2–5 of the spec are already live per operator memory — no further
proposal needed for them here. Any *changes* to the live hook wiring,
factory prompt injection, or the B2/rclone bulk job belong in their own
proposal against the current state of those systems, not this one.
