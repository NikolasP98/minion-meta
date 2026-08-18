---
id: 2026-08-18-memory-sync-repo-bootstrap
title: Bootstrap the private minion-agent-memory repo (Slice 1 manual step)
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
tags: [infra]
source: factory-run-a0315a16
value: medium
---

# minion-agent-memory doesn't exist yet — someone has to create it

`specs/2026-08-17-cloud-agent-memory-sync-spec.md` Slice 1 ("Create private
repo, initial push of the MINION memory dir, README contract,
`memory-sync.sh`") is explicitly scoped in the spec's own slice table as
"manual/interactive (done by orchestrator)" — not something a headless
factory dev-agent run should do, because it means creating a brand-new
persistent private GitHub repo and choosing what real curated memory content
(currently only mounted read-only at `/memory/MINION/` inside factory
containers) to publish into it. That's a hard-to-reverse, external-system
action; it belongs in front of a human, not inside an unattended run.

Factory run `a0315a16` (2026-08-18) implemented everything that IS safe to
build headlessly: the seed content for the new repo (README consumer
contract, `.gitattributes` union-merge policy for `.md` conflicts,
`.gitignore` secret backstop, `scripts/memory-sync.sh`) staged at
`ops/memory-sync/repo/` in this meta-repo, plus the exact manual bootstrap
steps at `ops/memory-sync/BOOTSTRAP.md`. It deliberately did NOT create the
GitHub repo, did NOT copy any real memory content anywhere, and did NOT run
`git push` against anything outside this branch.

## Definition of done

- `gh repo create NikolasP98/minion-agent-memory --private` run by a human.
- `ops/memory-sync/repo/` contents pushed as its initial commit, plus a real
  copy of the local `MINION/` memory dir (per `ops/memory-sync/BOOTSTRAP.md`
  steps 1–2).
- `memory-sync` installed at `~/.local/bin/memory-sync` and smoke-tested
  (step 4 of the bootstrap doc) on the primary machine.
- This proposal flips to `done`; `ops/memory-sync/BOOTSTRAP.md`'s
  `TODO(handoff)` comment is removed in the same pass.

## Out of scope

Slices 2–5 of the spec (hook wiring on the local machine, factory
`spec.sh`/`run.sh` memory-index injection in `minion-factory`, the
claude-mem bulk B2/rclone job, and the B2 bucket/key user action) — each
gets its own proposal/spec pass once this bootstrap exists.
