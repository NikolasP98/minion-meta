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
scripts/memory-sync.sh        ← stage memory roots → commit → pull --rebase → push
```

## Read order (consumer contract)

1. Read `<project>/MEMORY.md` first — it's the index, kept small on purpose.
2. From the index, pick the 1–3 topic files whose lines mention the repo,
   subsystem, or failure class you're working on.
3. Treat `★★★` items as hard constraints, not suggestions.
4. Cite the memory file when it shapes a decision.

## Write rules

- **Interactive sessions own curated memory.** Only Claude Code / Codex
  sessions run by a human write the topic files and `MEMORY.md` index here,
  via `scripts/memory-sync.sh`. That keeps one credential/trust domain
  writing the content other agents treat as authoritative.
- **Factory agents are a separate, lower-trust lane.** They read this repo;
  their only write-back is a per-run `MEMORY_NOTE.md` observation that lands
  under `<project>/factory/`, never in the curated topic files or the index.
  Those notes are agent-authored evidence, not operator policy — read them
  as such, and fold anything durable into a topic file from an interactive
  session. `specs/2026-08-18-factory-memory-governance-spec.md` in
  `minion-meta` governs that lane (quarantined candidate area, separate
  credential, schema/secret/injection validation, human promotion, pinned
  per-run snapshot); until it lands, treat `factory/` as unreviewed.
  Anything a factory run needs *fixed* stays a proposal in the consuming
  repo's `proposals/` dir, per that repo's handoff-ledger convention.
- Never write secrets, raw credentials, or unrelated transcript bulk here.
  `.gitignore` blocks `*.env` and key-shaped files as a backstop — it is not
  a substitute for not writing secrets in the first place.
- Sync via `scripts/memory-sync.sh` (installed at `~/.local/bin/memory-sync`,
  with the clone at `~/.minion-agent-memory` by default), not ad hoc
  `git push`. On a rebase conflict in a `.md` file the repo's
  `.gitattributes` union-merges both sides (append-biased): memory loss is
  worse than duplication, and de-duplication is the index's job, not the
  sync script's. That is git's built-in `union` driver, so it also protects
  a human who runs a plain `git pull --rebase` without the script.

## Consumers

- **Claude Code** (primary machine): SessionStart hook pulls (fast-forward
  only, short timeout, offline-safe no-op); Stop/PreCompact auto-save flow
  pushes.
- **Codex**: same script wired into `~/.codex/hooks.json` lifecycle hooks.
- **Factory spec/dev containers**: a box-side clone of this repo is mounted
  read-only into each agent container (`/memory`), alongside a read-only-by-
  contract mirror of the claude-mem bulk store; agents read `MINION/MEMORY.md`
  first and then the cited topic files. See
  `specs/2026-08-17-cloud-agent-memory-sync-spec.md` §3 and
  `specs/2026-08-18-factory-memory-governance-spec.md` in `minion-meta`.
