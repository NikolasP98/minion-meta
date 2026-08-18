# minion-agent-memory

Private git repo backing durable cross-machine, cross-harness agent memory
for the Minion stack. Design: `specs/2026-08-17-cloud-agent-memory-sync-spec.md`
in `minion-meta` (§§1–3).

Git, not object storage, because this content is curated markdown that
benefits from versioning, merge, and blame-as-provenance — see the spec's
storage evaluation. The claude-mem bulk store (sqlite + chroma, ~2.4 GB,
single-writer) is a separate tier synced to Backblaze B2 / rclone, not here.

## Layout

```
MINION/                       ← mirrors ~/.claude/projects/<slug>/memory/ on the primary machine
  MEMORY.md                   ← index, always read first
  *.md                        ← topic files
<other-project-slug>/...      ← same pattern per project dir that opts in
scripts/memory-sync.sh        ← commit-all → pull --rebase → push
```

## Read order (consumer contract)

1. Read `<project>/MEMORY.md` first — it's the index, kept small on purpose.
2. From the index, pick the 1–3 topic files whose lines mention the repo,
   subsystem, or failure class you're working on.
3. Treat `★★★` items as hard constraints, not suggestions.
4. Cite the memory file when it shapes a decision.

## Write rules

- **Single-writer discipline.** Only interactive sessions (Claude Code /
  Codex sessions run by a human) write memory here. Automated factory
  dev-agent runs are **read-only** against this repo — an open end they hit
  becomes a proposal in the consuming repo's `proposals/` dir instead of a
  memory write, per that repo's handoff-ledger convention. This keeps a
  single credential/trust domain writing curated memory.
- Never write secrets, raw credentials, or unrelated transcript bulk here.
  `.gitignore` blocks `*.env` and key-shaped files as a backstop — it is not
  a substitute for not writing secrets in the first place.
- Sync via `scripts/memory-sync.sh` (installed at `~/.local/bin/memory-sync`),
  not ad hoc `git push`. On a rebase conflict in a `.md` file the repo's
  `.gitattributes` union-merges both sides (append-biased): memory loss is
  worse than duplication, and de-duplication is the index's job, not the
  sync script's.

## Consumers

- **Claude Code** (this machine): SessionStart hook pulls (fast-forward
  only, short timeout, offline-safe no-op); Stop/PreCompact auto-save flow
  pushes.
- **Codex**: same script wired into `~/.codex/hooks.json` lifecycle hooks.
- **Factory spec/dev containers**: fetch `MINION/MEMORY.md` (and cited topic
  files) read-only via the GitHub contents API — see
  `specs/2026-08-17-cloud-agent-memory-sync-spec.md` §3 in `minion-meta`.
