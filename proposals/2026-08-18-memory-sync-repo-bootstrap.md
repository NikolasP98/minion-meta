---
id: 2026-08-18-memory-sync-repo-bootstrap
title: "Reconcile minion-agent-memory Slice 1 staging with the already-live repo"
status: draft
created: 2026-08-18
updated: 2026-08-19
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
`memory-sync.sh`") had not happened yet. That assumption was false. The stale
bootstrap doc has been removed from this branch; it described creating a repo
that exists and, followed as written, would have failed at step 1 or
duplicated the live `MINION/` tree at step 2.

What remains is a proposed **update** to the live repo's tooling, for an
interactive session to apply — never a factory run, because writing to
`minion-agent-memory` is single-writer/interactive by the spec's own rule
(`specs/2026-08-17-cloud-agent-memory-sync-spec.md` §3).

## AS-IS (observable, evidenced 2026-08-19)

The live repo `NikolasP98/minion-agent-memory` (private, default branch
`main`) is mounted read-only into this factory container at `/memory`, so its
tracked tree can be read directly rather than assumed:

```
$ git --git-dir=/memory/.git ls-tree HEAD
100644 blob …  .gitattributes
040000 tree …  MINION
100644 blob …  README.md
040000 tree …  scripts        (scripts/memory-sync.sh)
```

Slice 1 is therefore live, and operator memory
(`/memory/MINION/sdlc-board-triage-and-phase-gates.md`, "CLOUD MEMORY LIVE" /
"THREE-TIER AGENT MEMORY LIVE") independently records Slices 2–4 as live on
the primary machine with Netcup as the interim bulk target. Slice 5 remains
blocked on the user creating a dedicated B2 bucket and scoped app key, exactly
as the spec records.

Three observable properties of the live tooling
(`git --git-dir=/memory/.git show HEAD:scripts/memory-sync.sh`):

1. **No file boundary on push.** The push path is `git add -A` over the whole
   clone, and the repo has no root `.gitignore` (absent from the `ls-tree`
   above). Any file an operator leaves in the clone — a scratch note, a stray
   `*.env`, the claude-mem bulk store if it were ever placed alongside — is
   swept into the sync commit and pushed. The spec's invariant is explicit:
   "sync NEVER adds new files outside the memory dirs" (§2).
2. **Pull timeout is 8s, not the spec's 2s.** `timeout 8 git pull -q --ff-only`
   on the SessionStart-safe path; the spec sets 2s for that path (§2) and puts
   no bound on the end-of-session push path.
3. **The conflict policy is correct as-is:** live `.gitattributes` is
   `*.md merge=union`, git's built-in driver, which needs no config and so
   applies to a plain `git pull --rebase` too.

The live script has been running without incident, so (1) and (2) are
hardening, not a bug report against something broken today.

## TO-BE

The live repo keeps its current behavior and layout, plus:

- Push stages an explicit allowlist of memory-root directories
  (`MEMORY_SYNC_ROOTS`, default `MINION`) instead of `git add -A`, and refuses
  — fail-closed, before any network call — to commit or push any path outside
  those roots, including paths already staged by something else, already
  committed locally, or present only in outgoing history via an add-then-delete.
- A root `.gitignore` backstops credential-shaped filenames (`*.env` as well as
  `.env`/`.env.*`, `*.pem`, `*.key`, `id_rsa*`, …).
- `MEMORY_SYNC_PULL_TIMEOUT` defaults to 2 (spec value) and is separate from
  `MEMORY_SYNC_PUSH_TIMEOUT` (default 5).

**Invariants that must NOT change:** the no-env live layout keeps working
(clone at `~/.minion-agent-memory`, `MEMORY_REPO_DIR` still honored); every
network path stays soft-fail so a hook never blocks or aborts a session; and
`.gitattributes` keeps the **built-in** `*.md merge=union` — an earlier
revision of this branch replaced it with a custom `mdunion` driver registered
by the script, which silently degrades to a normal three-way merge (conflict
markers) for anyone who pulls without running the script. That regression is
reverted here and is now covered by a test that fails if it returns.

## DELTA

| # | Transition | Where | Proof |
|---|---|---|---|
| 1 | `git add -A` → per-root staging + index/outgoing-history allowlist checks | `ops/memory-sync/repo/scripts/memory-sync.sh` | `test-memory-sync.sh`: pre-staged, already-committed, and add-then-delete out-of-root cases each fail closed with the remote unchanged |
| 2 | no `.gitignore` → credential-shaped-filename backstop | `ops/memory-sync/repo/.gitignore` | `test-memory-sync.sh`: `prod.env`, `secrets.env`, `MINION/id_rsa` never reach the remote |
| 3 | single 8s/20s/15s timeouts → `MEMORY_SYNC_PULL_TIMEOUT=2` / `MEMORY_SYNC_PUSH_TIMEOUT=5` | `ops/memory-sync/repo/scripts/memory-sync.sh` | script defaults; the pull path is `fetch` + `merge --ff-only`, never a rewrite |
| 4 | (regression fixed in-branch) custom `mdunion` driver → built-in `union` | `ops/memory-sync/repo/.gitattributes` | `test-memory-sync.sh`: divergent edits to `MINION/MEMORY.md` union-merge in a clone with **no** merge config; the case fails if `mdunion` is restored |
| — | not changed: push binds to the validated commit (`push <sha>:refs/heads/<branch>`) | `ops/memory-sync/repo/scripts/memory-sync.sh` | `test-memory-sync.sh` race case |

Run the whole set with `bash ops/memory-sync/repo/scripts/test-memory-sync.sh`
— it is network-free (origin is a local bare repo) and is the evidence behind
every row above.

## Definition of done

- A human diffs `ops/memory-sync/repo/` in this branch against the live
  `minion-agent-memory` repo and decides whether to adopt the allowlist,
  `.gitignore`, and timeout split (in whole or in part).
- If adopted: pushed to `minion-agent-memory` directly (not via this
  meta-repo), `~/.local/bin/memory-sync` re-tested per the live repo's own
  README plus `test-memory-sync.sh`, and this proposal flips to `done`.
- If not adopted: this proposal flips to `closed` with a one-line reason
  (e.g. "live script's simplicity is intentional, boundary risk accepted").

## Out of scope

Slices 2–4 of the spec are already live per operator memory. Slice 5 remains
blocked on the user's dedicated B2 bucket and scoped app key and is not closed
by this proposal. Factory-agent write-back governance (quarantine, promotion,
snapshot pinning) belongs to the approved
`specs/2026-08-18-factory-memory-governance-spec.md` against `minion-factory`
— this proposal only keeps the staged README's description of that lane
truthful. Any *changes* to the live hook wiring, factory prompt injection, or
the interim rclone bulk job belong in their own proposal against the current
state of those systems.
