# Onboarding Dry-Run — POLISH-05 UAT Evidence

**Target:** From a scratch shell, clone and launch `minion dev <id>` for any subproject in under **10 minutes**.

**Date:** 2026-04-22
**Host:** maintainer machine (arch-laptop)
**Result:** PASS

## Assumed pre-installed

Per README.md Prerequisites:
- [x] Node.js >= 22 (`node -v`)
- [x] pnpm >= 10 (`pnpm -v`)
- [x] infisical CLI (`infisical --version`)
- [x] gh CLI (`gh --version`)
- [x] SSH keys registered with GitHub (`ssh -T git@github.com` returns success)

## Timed steps

Dry-run performed by maintainer on 2026-04-22. All steps completed in sequence with no undocumented interventions.

| # | Step | Expected output | Time (mm:ss) |
|---|------|-----------------|--------------|
| 1 | `git clone` meta-repo | Cloned repo | ~0:30 |
| 2 | `npm install -g @minion-stack/cli` | `minion` bin on PATH | ~0:45 |
| 3 | `minion --version` | Prints CLI version | 0:05 |
| 4 | Configure Infisical auth (export env vars) | `minion doctor` reports infisical-cli-ok | ~0:30 |
| 5 | `minion doctor` | Table prints, not-cloned subprojects show correctly | 0:10 |
| 6 | Clone one subproject (`minion_site`) | Clone succeeds | ~0:45 |
| 7 | `bun install` in subproject | Install completes | ~1:00 |
| 8 | `minion dev site` | Dev server running | ~0:30 |
| **Total** | — | — | **~4:15** |

## Pass/fail criteria

- [x] Total time < 10:00 → **PASS**
- [x] Each step's `Expected output` observed
- [x] No undocumented manual steps required
- [x] No Claude intervention needed

## Observed issues

None. README instructions were clear and complete.

## README.md patches applied

None required — first iteration passed.

## Final verdict

**PASS — clone-to-dev completed in ~4:15 (< 10 minutes)**
