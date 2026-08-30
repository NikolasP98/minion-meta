---
id: 2026-08-17-pkg-infisical-cache-plaintext
title: Infisical secret cache stored plaintext on disk (0600 only)
status: in-spec
spawned_spec: 2026-08-17-pkg-infisical-cache-plaintext-spec
created: 2026-08-17
updated: 2026-08-20
repos: [minion-meta]
tags: [infra, security]
value: 4
effort: M
source: debt-sweep-2-2026-08-17
---

# Infisical secret cache stored plaintext on disk (0600 only)

## Problem

packages/env/src/cache.ts:32-36 resolved secret VALUES cached to ~/.config/minion/infisical-cache.json.

## Definition of done

Machine-local-key encryption at rest, or an explicit documented acceptance of the tradeoff.

## Out of scope

Vault redesign.

## Handoff — 2026-08-20 (S1 shipped without S2 in this dev run)

Dev run `c8e7c2b2` implemented S0 (recon) + S1 only, per the spec's per-run slice scoping
(`2026-08-17-pkg-infisical-cache-plaintext-spec.md` §2). S1 is merged/mergeable on its own: the
plaintext file is deleted on first use, the legacy shape is never migrated, and nothing lands on disk
in any `MINION_ENV_CACHE` mode (`off` | `memory` | `disk` — `disk` still degrades to `memory` with a
warning, exactly as the spec's interim behavior specifies). See `TODO(handoff)` at
`packages/env/src/cache.ts` next to `resolveCacheMode()`.

**Open end while S2 is outstanding:** every `minion` invocation now shells out to `infisical` on every
process (no cross-process cache), so a flaky/offline machine loses `MINION_SECRETS_KEY` with only a
warning (⚠️A1 in the spec). The spec requires S1+S2 to ship in the *same release*, or the changeset to
be `major` and name this regression explicitly — that changeset is S3 work and was not created in this
run (no later slice was started, so nothing merges to `main` off this branch yet; the "same release"
gate applies at that point, not at this PR).

**S0 recon (2026-08-20), per §1 Slice 0, one line per target:**

- **Factory box (this sandbox):** checked directly. No `~/.config/minion` directory exists
  (`$XDG_CONFIG_HOME` unset, `$HOME/.config/minion` absent) and neither the `minion` nor `infisical`
  binary is on `PATH`. The box has never run the CLI, so it holds no plaintext cache and contributes
  no evidence either way about a synced/backed-up copy. **Zero, confirmed.**
- **Dev laptop:** **unreachable — recorded as unknown, not zero.** Concrete reason: this factory run
  executes in an isolated container with no SSH keys, no `~/.ssh/config`, and no network path to any
  operator machine (verified: `~/.ssh` does not exist in this sandbox). There is no mechanism available
  in this run to reach a personal laptop; a future run with operator-provided access (or the operator
  running the §1 checklist by hand) is required to close this out.
- **Netcup gateway box:** **unreachable — recorded as unknown, not zero.** Same concrete reason as the
  laptop (no SSH credentials/config/network path in this sandbox to `100.80.222.29` or any gateway
  host). Not settled by this run.
- **CI image: resolved, not unknown.** Read `.github/workflows/ci.yml` directly: the only job
  (`verify`) runs on ephemeral GitHub-hosted `ubuntu-latest` runners and its steps are
  `pnpm install`, `repo-policy:validate`/`repo-policy:test`, then `build-all`/`typecheck-all`/
  `lint-all`/`test-all` — it never invokes `infisical` or `minion sync-env`/`minion dev`. The `minion`
  CLI does not run in CI at all, so no cache file (legacy or new) is ever created there; independently,
  GitHub-hosted runners are destroyed after every run, so nothing could persist across runs even if it
  were created. **CI is not a vector for this issue.**

**Item 3 — how deployed boxes obtain `MINION_SECRETS_KEY` (§1 item 3): partially settled by repo
evidence, not by live-box access (still blocked by the same unreachability above).** Two findings:
`ops/compose.yml`'s `gateway` service `environment:` block declares only `OPENCLAW_GATEWAY_TOKEN` and
`PORT` — `MINION_SECRETS_KEY` is not referenced anywhere in that file, so this repo's own deploy
manifest does not wire it through `minion`/Infisical at container-start time. Separately,
`specs/2026-05-29-flow-testrun-prod.md:60-62` documents the production gateway/runner as systemd
services whose credentials are set via "systemd Environment or via infisical" directly, not by running
`minion sync-env` and consuming its output — `sync-env` itself is documented (`README.md:84`,
`packages/cli/README.md:27`) as a local-dev command that writes to `<subproject>/.env.local`, not part
of any deploy step in this repo. This is consistent with, but does not by itself confirm, operator
memory's note that the factory's `deploy.sh` rewrites a box's `.env` wholesale rather than shelling out
to `minion`. **Leaning "deployed boxes do not go through this cache path" (⚠️A1 impact low in
production), but not closed** — no live box was reachable this run to confirm no deployed host ever
invokes the `minion` CLI. Confirmed from `package.json` grep: `@minion-stack/env` has exactly one
consumer in this repo, `packages/cli` (§4 assumption verified, not assumed).

**Next step:** a follow-up dev run for S2 (sealed on-disk cache, `packages/env/src/cache-crypto.ts`)
and S3 (README/changeset/doctor probe/anti-recurrence test) against this same spec, then release S1+S2
together per §2's "must ship in the same release" rule.
