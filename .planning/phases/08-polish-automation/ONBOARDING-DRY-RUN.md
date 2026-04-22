# Onboarding Dry-Run — POLISH-05 UAT Evidence

**Target:** From a scratch shell, clone and launch `minion dev <id>` for any subproject in under **10 minutes**.

**Date:** {TBD — filled during dry-run}
**Host:** {maintainer machine hostname — e.g. `arch-laptop`}
**Shell:** `env -i HOME=/tmp/minion-dry-run-home PATH=/usr/bin:/bin bash --noprofile --norc`

## Assumed pre-installed

Per README.md Prerequisites:
- [ ] Node.js >= 22 (`node -v`)
- [ ] pnpm >= 10 (`pnpm -v`)
- [ ] infisical CLI (`infisical --version`)
- [ ] gh CLI (`gh --version`)
- [ ] SSH keys registered with GitHub (`ssh -T git@github.com` returns success)

If any prerequisite is missing, STOP and document the gap in README.md Prerequisites before timing.

## Timed steps

Start the stopwatch at step 1. Record wall-clock time for each step. Stop at the moment `minion dev <id>` is observed serving traffic (or equivalent success signal per subproject).

| # | Step | Expected output | Time (mm:ss) |
|---|------|-----------------|--------------|
| 1 | `cd /tmp && rm -rf minion-meta && git clone git@github.com:NikolasP98/minion-meta.git && cd minion-meta` | Cloned repo | |
| 2 | `npm install -g @minion-stack/cli` (or `pnpm add -g`) | `minion` bin on PATH | |
| 3 | `minion --version` | Prints CLI version | |
| 4 | Configure Infisical auth: either export `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` + `_CLIENT_SECRET` or write `~/.config/minion/infisical-auth.json` (mode 0600) | `minion doctor` reports `infisical-cli-ok` + no INFISICAL auth warnings | |
| 5 | `minion doctor` | Table prints, all subprojects show `(not cloned — skip)` in warnings | |
| 6 | Choose one subproject to clone (e.g., `minion_site`): `git clone git@github.com:NikolasP98/minion-site.git minion_site` | Clone succeeds | |
| 7 | Install subproject deps per its package manager (`cd minion_site && bun install && cd ..`) | Install completes | |
| 8 | `minion dev site` | Subproject dev server running | |
| **Total** | — | — | **{fill in}** |

## Pass/fail criteria

- [ ] Total time < 10:00 → **PASS**
- [ ] Each step's `Expected output` observed
- [ ] No undocumented manual steps required
- [ ] No Claude intervention needed (the maintainer performs all steps themselves)

## Observed issues

{TBD — maintainer fills this in during dry-run. Examples of what to capture:}
- Was any README instruction ambiguous?
- Did any tool print unexpected prompts (npm login, gh auth)?
- Did the Infisical auth flow require dashboard clicks that weren't documented?
- Were any SSH permissions wrong (did git clone fail the first time)?

## README.md patches applied

{TBD — if issues were found, list the README.md diff here and re-run the dry-run. If re-run was needed, note the iteration count. Up to 2 iterations expected.}

## Final verdict

{TBD — PASS / FAIL with total time}
