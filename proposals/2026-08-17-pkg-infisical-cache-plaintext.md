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

**S0 recon, run from this factory box (2026-08-20):** no `~/.config/minion` directory exists here (the
box has never run the `minion` CLI), so this machine contributes no evidence either way for whether the
plaintext file, or a synced/backed-up copy of it, exists elsewhere. The dev laptop, Netcup gateway box,
and any CI image remain **unknown** — not zero — and still need the §1 Slice 0 checklist run against
them before A2 can be closed out. Confirmed from `package.json` grep: `@minion-stack/env` has exactly
one consumer in this repo, `packages/cli` (§4 assumption verified, not assumed).

**Next step:** a follow-up dev run for S2 (sealed on-disk cache, `packages/env/src/cache-crypto.ts`)
and S3 (README/changeset/doctor probe/anti-recurrence test) against this same spec, then release S1+S2
together per §2's "must ship in the same release" rule.
