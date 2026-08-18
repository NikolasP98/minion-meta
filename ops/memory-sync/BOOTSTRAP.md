# Bootstrapping minion-agent-memory (manual, one-time)

Slice 1 of `specs/2026-08-17-cloud-agent-memory-sync-spec.md` is staged here as
seed content (`ops/memory-sync/repo/`), but creating the actual private GitHub
repo and pushing real memory content into it is deliberately **not** done by
an automated run — see `TODO(handoff)` below. The spec itself scopes this slice
as "manual/interactive (done by orchestrator)"; it involves choosing what real
curated memory content to publish and creating a new persistent external repo,
which is exactly the class of hard-to-reverse, credential-adjacent action that
belongs to an interactive session with a human watching, not a headless
factory dev-agent run.

<!-- TODO(handoff): the private repo `minion-agent-memory` does not exist yet.
     An interactive orchestrator session (not a factory run) must run the
     steps below. Tracked in proposals/2026-08-18-memory-sync-repo-bootstrap.md. -->

## Steps

1. Create the private repo:
   ```bash
   gh repo create NikolasP98/minion-agent-memory --private --description \
     "Git-backed durable agent memory, shared by claude/codex/factory"
   ```
2. Seed it from this staging dir:
   ```bash
   git clone git@github.com:NikolasP98/minion-agent-memory.git /tmp/mam
   cp -r ops/memory-sync/repo/. /tmp/mam/
   cp -r ~/.claude/projects/-home-nikolas-Documents-CODE-MINION/memory /tmp/mam/MINION
   cd /tmp/mam
   git add -A && git commit -m "bootstrap: seed MINION memory + sync tooling"
   git push -u origin main
   ```
3. Install the sync script:
   ```bash
   mkdir -p ~/.local/bin
   ln -s /tmp/mam/scripts/memory-sync.sh ~/.local/bin/memory-sync
   # (or `install -m 755` a copy instead of a symlink, either works)
   ```
   Then move the clone itself to `~/minion-agent-memory` (the script's default
   `MEMORY_SYNC_DIR`), or export `MEMORY_SYNC_DIR` in your shell profile if you
   keep it elsewhere.
4. Smoke-test:
   ```bash
   memory-sync pull   # fast-forward pull, should be a no-op right after clone
   echo test >> ~/minion-agent-memory/MINION/MEMORY.md
   memory-sync push   # commits, rebases, pushes
   ```

## Not in this slice

Hook wiring (Claude Code SessionStart/Stop, `~/.codex/hooks.json`), factory
prompt injection (`spec.sh`/`run.sh` in `minion-factory`), and the claude-mem
bulk B2/rclone job are slices 2–5 of the spec — out of scope here.
