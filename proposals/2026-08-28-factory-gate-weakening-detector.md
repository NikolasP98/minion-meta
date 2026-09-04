---
id: 2026-08-28-factory-gate-weakening-detector
title: Deterministic gate-weakening diff detector for factory runs
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory]
tags: [security]
---

# Deterministic gate-weakening diff detector for factory runs

## Problem (audit 2026-08-28, finding #2)

`repo.selfTest` command strings are runner-owned (repos.ts), but every one of
them dereferences repo-owned config: `bun run build`, `pnpm check`,
`bunx vitest run`. A develop agent can edit `package.json` scripts, vitest/CI
config, or delete test files and make the gate trivially green. Only the LLM
reviewer stands in the way, and for `risk: low` manifests the reviewer is
explicitly told hardening findings are "never FAIL grounds". SWE-bench-style
harnesses solve this structurally (tests immutable to the agent), not by
prompt.

## Proposed implementation

A deterministic pre-review gate in the harness (not a model judgment):

- Refuse (stay draft, distinct note) when the diff touches any of:
  `package.json` `scripts.*` referenced by the repo's selfTest string,
  test-runner config (`vitest.config.*`, `playwright.config.*`,
  `svelte.config.*` test blocks), `.github/workflows/**`, or deletes files
  matching the repo's declared test globs — unless the run's manifest topics
  explicitly allow it (e.g. a `ci` / `test-infra` topic that forces
  `risk: high` review strictness and human merge).
- Emit the refusal as a PR comment naming the exact files, so a legitimate
  workflow change escalates to a human instead of silently passing.

This complements, not replaces, the reviewer: the reviewer judges semantics,
the detector makes the cheap mechanical cheat impossible.

Related: [[2026-08-28-factory-reviewer-instruction-isolation]].
