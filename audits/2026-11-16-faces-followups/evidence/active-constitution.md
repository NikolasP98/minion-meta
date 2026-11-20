# Minion Constitution

Owner directive (2026-10-15, verbatim): "from now on, I need all MINION sessions to spec
features/changes/fixes (all implementations) using spec-kit". This constitution binds every
Spec Kit artifact (`spec.md`, `plan.md`, `tasks.md`) produced in this workspace to the
Minion SDLC contract in `AGENTS.md`. Where the two disagree, `AGENTS.md` wins.

## Core Principles

### I. Spec before code (NON-NEGOTIABLE)
Every implementation — feature, change, or fix, in any subproject — starts with
`/speckit-specify`, then `/speckit-plan`, then `/speckit-tasks`, then `/speckit-implement`.
A hotfix may compress the cycle but must still produce a `spec.md` that names what it
bypassed and why. Work that exists only in chat, memory, or a dashboard does not exist.

### II. AS-IS → TO-BE → DELTA, with evidence
A spec states the current observable behavior with anchors (file:line, query, screenshot,
transcript), the desired observable behavior with its invariants, and the exact transitions
with the test that proves each one. Numbers are measured and their source named; "I believe"
is written as such. A spec with unverified claims is not ready for `/speckit-plan`.

### III. Slice-scoped delivery
A plan decomposes into slices that each ship as one PR against the repository's registered
PR base (`node scripts/repo-policy.mjs show <id>`), from an isolated worktree, with the
repository's own gates run in the foreground before the PR is opened. Never commit to a
default or release branch; never mix package managers; never touch another agent's stash,
worktree, or branch.

### IV. Required build steps are spec requirements
For hub and site UI: the design-token contract and `lint:design && lint:tokens` (debt may
only decrease). For every new page, route, API endpoint, or nav link: RBAC wiring through
`rbac.service` (module/route gate, nav visibility, write-API gate, owner scope, field
masking). For every user-facing string: Paraglide `m.*()` + `i18n:compile`. For hub routes:
the route contract manifest. A spec that adds a surface and omits these is incomplete.

### V. Security and data work keeps human gates
Anything tagged security or data (auth, RBAC, credentials, tenant scoping, production data
mutation, migrations) requires owner approval of the spec before code AND owner merge.
Production data scripts are dry-run by default, reversible (undo in `finally`), run twice,
and assert an invariant rather than a statement count.

## Open-items ledger

Finishing a task while leaving any open end — unwired implementation, known bug,
hardcoded value, missing edge case, skipped or weak test — requires documenting it twice
before stopping: an in-code `TODO(handoff): <what, why, pointer>` at the exact site, and an
entry in `proposals/` (new file or append to the matching open one). Undocumented open ends
are defects. `/speckit-converge` output that lists remaining work is not a substitute for
the ledger; copy it there.

## Artifact layout and registration

Spec Kit features live in `specs/<NNN>-<slug>/` (`spec.md`, `plan.md`, `tasks.md`,
optional `research.md`, `data-model.md`, `contracts/`, `checklists/`). The meta-repo board
reads only top-level `specs/*.md` through `scripts/spec-index.mjs`; until that script learns
Spec Kit directories, a feature that must appear on the board also gets a top-level stub
`specs/<date>-<slug>-spec.md` with the `TEMPLATE.md` frontmatter and a pointer to its
Spec Kit directory. Proposals stay in `proposals/` with `id` equal to the filename.

## Governance

This constitution supersedes ad-hoc practice; `AGENTS.md` and each subproject's own
`CLAUDE.md`/`AGENTS.md` supersede it where they are more specific. Amendments are a PR to
`minion-meta` `dev` that bumps the version below and states what changed. Every
`/speckit-plan` run re-checks compliance with Principles I–V; a violation is a blocker,
not a note. Runtime guidance for agents: `AGENTS.md` (meta), `minion_hub/CLAUDE.md`,
`minion/AGENTS.md`, `minion_site/CLAUDE.md`, `paperclip-minion/AGENTS.md`,
`pixel-agents/CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-15
