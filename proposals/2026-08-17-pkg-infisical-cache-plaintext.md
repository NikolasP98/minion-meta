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

## Handoff — 2026-08-28 (S2 shipped in this dev run; S3 still outstanding)

Dev run `85be1556` implemented S2 only, per this spec's per-run slice scoping (§2). `MINION_ENV_CACHE`
now defaults to `disk`: cross-process caching is back, sealed to this machine+user with AES-256-GCM
(key ladder: `MINION_ENV_CACHE_KEY` if set and valid, else a concurrency-safe machine-local
`cache.key`; HKDF-SHA256 derivation; atomic `rename`-based write enforcing mode `0600` even over a
pre-existing looser file; cache directory tightened to `0700`). `memory` and `off` are unchanged from
S1. Every decrypt failure (tamper, foreign-machine binding, unsupported envelope version) is a cache
miss with at most one categorical warning per process — never a throw — except an operator-supplied
`MINION_ENV_CACHE_KEY` that is the wrong length or not valid base64, which throws a named
`InvalidCacheKeyError` rather than silently falling back to the machine key file. New file:
`packages/env/src/cache-crypto.ts` (key ladder, HKDF, seal/open, binding fingerprint) plus
`packages/env/test/cache-crypto.test.ts`; `packages/env/src/cache.ts` gained the disk read/write path
in front of which the S1 process memo still sits (a memo hit never touches disk). 106 tests green in
`packages/env` (was 65 before this slice); root `build-all`/`typecheck-all`/`lint-all`/`test-all` all
green. S1's red-state proof and this slice's test additions are in the PR description, not repeated
here.

**S1+S2 now ship together, satisfying §2's same-release rule** — the A1 offline/latency regression
this proposal's S1-only handoff (2026-08-20) flagged no longer applies once this PR merges: a
cross-process, sealed cache is back by default.

**Not done in this run (S3, out of this run's scope by explicit instruction):** the `packages/env/`
README `## Cache`/`## Security` rewrite (still describes the pre-S1 plaintext-file behavior — now
factually wrong in a *different* way, since a file exists again but the README doesn't say it's
sealed), the release changeset (`.changeset/*.md` for `@minion-stack/env` — needed before this can
reach `main`/npm per the meta-repo release flow), the `minion doctor` `(meta)` row cache-mode probe,
root `.env.example` entries for `MINION_ENV_CACHE`/`MINION_ENV_CACHE_KEY`, and the behavioral
anti-recurrence guard test (`packages/env/test/no-plaintext-write.test.ts`). See `TODO(handoff)` at
the top of `packages/env/src/cache.ts`. **This PR should not be released to npm without S3's
changeset** — the version-bump rule (`minor` for S1+S2 together) is decided in the spec's §S3 but not
yet executed.

**Next step:** a follow-up dev run for S3 against this same spec.

## Handoff — 2026-08-29 (S2 review round 3: the commit primitive changed)

Review of run `85be1556` found the disk write's final step was still check-then-act: the destination
was re-verified and then replaced with `renameSync`, which clobbers unconditionally, so a
sync/restore/editor writing between the two calls lost its file. The cross-process lock does not
close that window — it only serializes this library's own writers.

`packages/env/src/cache.ts` therefore no longer replaces the cache file at all. It commits with
`link(2)` (`EEXIST` instead of clobbering) and, when an authenticated file has to be superseded,
*displaces* it first with `rename(2)` to a same-directory sidecar and only then verifies the
displaced bytes against what was authenticated — restoring them (no-clobber) if they turn out to be a
substitute. This supersedes the "atomic `rename`-based write" phrasing in the 2026-08-28 handoff
above; mode `0600` is still enforced, now via the staged inode the link shares.
`packages/env/test/cache-commit-race.test.ts` mocks `node:fs` to inject at those syscall boundaries;
4 of its 6 cases fail against the previous implementation (the other two are the uncontested happy
path and a guard against reusing a crash-left sidecar name, both green either way).

**Open end (documented, not fixed — `TODO(handoff)` in `commitSealedFile`):** a process that dies
mid-commit leaves a `<cache>.<pid>.<n>.displaced` sidecar or a `.tmp` staging file behind, and nothing
reaps them. A sidecar can hold either this package's own superseded envelope or deliberately preserved
unauthenticated evidence; distinguishing them requires re-deriving the machine key, so an automatic
sweep would risk destroying exactly what the protocol protects. This wants an operator-facing surface
— fold it into S3's `minion doctor` cache-mode probe (list sidecars, let a human decide) rather than a
silent cleanup.

**Second open end:** `link(2)` is the only no-clobber commit primitive Node exposes, so on a
filesystem without hard-link support the disk cache degrades to memory-only with one warning per
process (fail-soft, never a destructive `rename` fallback). No consumer environment in this repo is
such a filesystem; if one appears, the answer is `renameat2(RENAME_NOREPLACE)` via a native binding,
not a fallback that clobbers.

## Handoff — 2026-08-30 (S2 review round 4: existing paths are immutable)

The round-3 link-plus-unlink displacement was also unsafe: an uncooperative writer can replace the
cache pathname after the hard link is created but before the pathname unlink, causing that unlink to
delete bytes this process never authenticated. The supported-runtime protocol is now conservative:
`link(2)` publishes only when the cache path was absent, and an existing cache object is never
replaced or unlinked. A refetched value remains available in the process memo. The focused regression
hooks entry to `unlinkSync(cachePath())` and fails if that boundary is ever reached.

**Open end (also `TODO(handoff)` in `commitSealedFile`):** an expired existing envelope cannot be
refreshed on disk under this protocol, so later processes refetch until an operator removes the stale
authenticated cache. S3's `minion doctor` cache row must expose that cleanup/disposition. A future
automatic replacement requires a supported atomic exchange/no-replace primitive (for example a
carefully wrapped `renameat2`), not a check-then-act or link-plus-unlink fallback.
