# Phase 02 — Deferred Items

Out-of-scope discoveries during plan execution. Each item is logged here instead of auto-fixed per GSD scope boundary rules.

## From 02-06 (CLI execution)

### Infisical CLI flag drift in `@minion-stack/env`

**Found during:** 02-06 Task 4 integration smoke test (`minion doctor`).

**Issue:** `@minion-stack/env`'s `fetchInfisicalSecrets` invokes `infisical secrets --projectSlug <slug>`. The installed Infisical CLI (run via `which infisical` on this machine, 2026-04-20) reports `Error: unknown flag: --projectSlug`. The current CLI expects a different flag name (likely `--projectId` with slug-to-id resolution, or `--project`).

**Impact:** Every subproject in `minion doctor` shows `Infisical layer minion-core unavailable`. The resolver still returns successfully (warnings path, not throw). Commands like `minion dev <id>` still work — they just don't pick up Infisical values.

**Why deferred:** The flag is owned by `packages/env/src/infisical.ts`, not `packages/cli/`. Belongs in a follow-up to 02-05 (env package) or a new plan that refreshes the Infisical wrapper against the current CLI.

**Suggested fix:** Re-check `infisical secrets --help` output, update flag wiring in `packages/env/src/infisical.ts`, bump `@minion-stack/env` to `0.1.1`, republish.

**Evidence:** `doctor` output at commit (to be filled) shows `unknown flag: --projectSlug` in warnings column for all 6 subprojects.
