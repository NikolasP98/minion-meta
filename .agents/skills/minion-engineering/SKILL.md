---
name: minion-engineering
description: Apply MINION engineering discipline when implementing, debugging, testing, reviewing, migrating, or verifying code. Covers tight repro loops, hybrid TDD, separate standards/spec review, blast-radius proof, TypeScript and boundary discipline, runtime verification, idempotency, verifiable sequencing, and structural prevention of recurring failures.
---

# MINION engineering

Follow the nearest `AGENTS.md`, `CLAUDE.md`, approved spec, and repository tooling first. Local instructions override this skill. Do not invent framework rules.

## Core workflow

1. Define the observable outcome and the smallest affected boundary.
2. Inspect the real code, callers, data contracts, local instructions, and approved spec before editing.
3. Choose a tight executable signal. Prefer a focused failing test when the seam is useful; otherwise use the closest deterministic runtime check.
4. Change one verifiable unit at a time. Run the narrow signal after each unit.
5. Check indirect consumers and the safety fact on which the change depends.
6. Run focused checks, then broader repository checks, then exercise the actual runtime path.
7. Review **Standards** and **Spec** separately. Report evidence and remaining uncertainty.

Inside unattended Factory work, do not ask for human confirmation when an approved spec already settles the seam or choice. Ask only for unresolved, consequential ambiguity or an action that requires explicit authorization. This skill grants no ownership of commits, branches, pull requests, merges, or releases.

## Load only the needed reference

- For bugs, flakes, and regressions, read [debugging.md](references/debugging.md).
- For feature tests, regression tests, or review, read [testing-and-review.md](references/testing-and-review.md).
- For cross-module risk and completion proof, read [change-safety.md](references/change-safety.md).
- For TypeScript models, external input, and adapters, read [typescript-and-boundaries.md](references/typescript-and-boundaries.md).
- For retries, migrations, repeated work, or recurring mistakes, read [operations-and-learning.md](references/operations-and-learning.md).

## Completion evidence

Return the commands run, their outcomes, the runtime path exercised, the two review-axis results, and any unproven safety fact. Never present compilation alone as runtime proof.
