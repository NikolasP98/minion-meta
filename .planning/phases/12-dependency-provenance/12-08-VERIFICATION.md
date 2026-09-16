# Shared package clean emission verification (12-08)

Scope: four-file private candidate in /tmp/minion-12-08-fa2dci45/workspace/packages/shared only. Nothing in the active repo changed (41 recorded inputs byte/mtime identical; `git status` for packages/shared and packages/tsconfig unchanged from session start).

Root independently reran the frozen lifecycle with the lane's exact environment allowlist (runner.py ENV) into a fresh root-owned directory `cases/root-rerun/`: `node scripts/build.mjs` exit 0 (compiler /tmp/…/deps/…/typescript/bin/tsc 5.9.3), `pnpm run typecheck` exit 0, `pnpm pack --pack-destination … --json` exit 0. The tarball is byte-identical to both executor builds: `d01a528579e7b0877d05565b9d3ad2747ab45610d634948f51b6a25b4bf4f756`, 44 ordinary members (42 dist JS/d.ts + package.json + README.md), 0 maps, 0 test-derived files. Receipt: `cases/root-rerun/root-rerun.json`. A formatter is not resolvable at the meta root or in the staged closure, so scoped format/lint was not run (recorded, not worked around).

Root reviewed build.mjs (argv[1] link check before import.meta.url, lstat ancestor validation twice, rmSync on validated tree only, real installed compiler, exit/signal/spawn propagation, public-entry existence), tsconfig.build.json (maps/composite/incremental off, noEmitOnError, excludes only *.test.ts), the package.json script diff (build/prepack → builder, prepublishOnly → noEmit) and the README TODO(handoff). Executor matrix 12/12 (`receipts/matrix.json`), 26 strace'd commands with zero network syscalls.

Candidate identities:

- `packages/shared/tsconfig.build.json`: `e163e1e545272ed5ded8e5d32b7f0b65573167982062b29d9fcb0179c51e6530`
- `packages/shared/scripts/build.mjs`: `81ccb5fa7359f05edcf3f5de2c6e07caaec01011c6ee5ab7dc92e3d430276877`
- `packages/shared/package.json`: `4d2f5218d47a6b88cf3d827b4d1d4722ec46349af892a3a694b94e79bf8df07b`
- `packages/shared/README.md`: `28834b1ec05a0e2cfb0836b85a5ef899e914af72dbc178b961558d9a5b5499e6`

Accepted deviations: runner.py allowlist gained /usr/bin/ps (pnpm's read-only lifecycle process scan; strace shows no network/writes) — accepted by root after review. The two-build determinism proof shares one staged closure; a second setup.py root would strengthen it (not required for this candidate).

Not closed: license text/attribution (release gate), immutable release version (still 0.9.0), installed consumer qualification (hub/site/paperclip), oxlint (not in staged closure), source-level debugging. DEP-03 and phase 12 stay open. Adoption into active packages/shared is a separate owner decision.
