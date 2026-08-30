---
id: 2026-08-17-pkg-dev-crypto-failopen
title: Dev crypto key silently activates outside exact NODE_ENV=production
status: in-spec
spawned_spec: 2026-08-17-pkg-dev-crypto-failopen-spec
created: 2026-08-17
updated: 2026-08-29
repos: [minion-meta]
tags: [logic, security]
value: 9
effort: S
source: debt-sweep-2-2026-08-17
---

# Dev crypto key silently activates outside exact NODE_ENV=production

## Problem

packages/db/src/crypto.ts:22-28 — any env where NODE_ENV isn't literally 'production' (staging, preview, misconfig) silently encrypts all secrets under a hardcoded source-visible key, consumed by hub AND site.

## Definition of done

Explicit MINION_ALLOW_DEV_CRYPTO_KEY=1 opt-in required for the dev key; otherwise sealSecret() throws when ENCRYPTION_KEY is unset. Test proves both paths.

## Out of scope

Key rotation; changing prod behavior.

## Open-items ledger (appended 2026-08-20, revised 2026-08-29)

Spec `2026-08-17-pkg-dev-crypto-failopen-spec` S1 (fail-closed key resolver) and S2 (early
failure + release contract) are landed in `packages/db` on `dev`. One end stays open — S3 — and
it is matched by the single remaining `TODO(handoff):` in `packages/db/src/crypto.ts`.

### Still open 2026-08-29 — the S2 at-rest audit is partial, not settled

[`2026-08-20-dev-key-at-rest-audit`](2026-08-20-dev-key-at-rest-audit.md) ran 2026-08-20 against
hub's production Supabase — the database hub and site share — but a 2026-08-29 cross-provider
review of a downstream branch caught that its results do not support a "zero rows sealed under
the dev key" conclusion: only 3 of the 8 non-null `user_identities.secret_ciphertext` rows in that
production database were sampled, the other 5 were never test-decrypted under any key, and the
audit's own required A1 environment inventory and unchecked-database list were never produced.
That proposal has been reopened rather than closed. ⚠️ A3 therefore **still applies** — the
in-code `TODO(handoff):` marker continues to say the at-rest question is unknown, not zero, and
this proposal is not resolved. Databases outside hub's shared prod Supabase remain unaudited, and
an unverified environment remains an unknown rather than a zero.

### Still open — S3 (consumer rollout): preparation is allowed, activation is gated

`minion_hub` and `minion_site` have neither the boot-time `assertCryptoKeyConfigured()` call nor a
bumped `@minion-stack/db`; neither repo is checked out in the meta-repo workspace (spec ⚠️ A2). The
apps are therefore still on the fail-open path, which is the safe resting state only because
nothing has changed under them.

The consumer-side *work* is not blocked, and must not be read as blocked: it is precondition 2's
convergence spec **S3b** ("Consumer boot wiring and breaking-call-site migration"), which that spec
deliberately orders *before* its S4/S5 migration slices. What is gated is the moment that work
starts affecting a running system. Separate the two:

- **Preparation — permitted, and is exactly S3b.** On a *held* branch in each consumer (a branch or
  draft PR that is not merged, not deployed, and changes no environment's key material): migrate
  every `sealSecret` / `openSecret` / `encryptToken` / `decryptToken` call site to the new contract,
  wire `assertCryptoKeyConfigured()` — and the convergence spec's attestation call — into each
  server-only boot path, update both `.env.example` files, and run each repo's own `check` + `test`.
  None of that touches a deployed environment, so none of it can strand a row.
- **Activation — forbidden until the three preconditions below hold.** Merging or deploying a
  bumped consumer; setting, rotating or converging a real `ENCRYPTION_KEY` in any environment that
  reads the shared database; and the convergence spec's S7 cutover — which additionally waits on the
  unmade **human** rollout-contract decision recorded in that spec's S7 (⚠️ *Human decision required
  before approval*). In short: prepare freely, activate nothing.

Which precondition gates what:

1. **A release carries the fix** — gates the *version pin only*, not the migration work. Verified
   2026-08-29 from this checkout: the published `latest` is `@minion-stack/db@0.10.0` (published
   2026-08-13), and its `src`/`dist` `crypto.ts` still contains the silent dev-key fallback — a
   `node` call against the published tarball seals with no key set and no opt-in. The fix and its
   changeset (`.changeset/db-crypto-fail-closed-dev-key.md`) exist on `dev` only; `origin/main`
   carries neither. Until a `dev` → `main` release publishes it there is nothing for a consumer to
   pin *to*, and the public package still ships the source-visible key. That is a mechanical
   constraint on one line of `package.json`, not on S3b: the call-site migration and boot wiring can
   be developed and tested against a locally packed/linked build (`npm pack` in `packages/db`), and
   the pin lands when the version carrying the contract S3b targets — the convergence spec's S2 API,
   which supersedes this package's — is published.
2. **The shared-database key split is resolved** — gates activation, not preparation. The same audit
   found hub and site carry **different** `ENCRYPTION_KEY` values against that one shared database
   (2 of 5 `gateway.token_ciphertext` rows open only under site's key; 3 open under neither). S3
   step 1's "one mode and one key per shared-DB group" is therefore not a plain environment change —
   naively converging the two keys makes the site-written rows unreadable. That convergence is owned
   by [`2026-08-28-shared-db-encryption-key-convergence-spec`](../specs/2026-08-28-shared-db-encryption-key-convergence-spec.md),
   which `extends` this spec and whose **S3b** carries exactly the consumer boot wiring
   (`assertCryptoKeyConfigured()` in each server-only boot path) that S3 describes, plus the key-id
   and legacy-ring machinery the split now requires. S3b may therefore *build* that machinery into
   both apps on held branches; what it may not do is converge a real key in a live environment.
3. **The at-rest audit is actually complete** — gates activation, not preparation. See "Still open
   2026-08-29" above — [`2026-08-20-dev-key-at-rest-audit`](2026-08-20-dev-key-at-rest-audit.md) is
   reopened until every `user_identities.secret_ciphertext` row in hub prod is classified under the
   dev key, and the A1 inventory and unchecked-database list are attached. Until it is, no
   environment that reads that database may have its key changed and no bumped consumer may deploy
   against it.

**On spec ⚠️ A2's "file one proposal per consumer repo".** Not done as two new proposals, on
purpose: the convergence spec above (filed 2026-08-28, after this spec was written) already owns
the hub and site work in one place, and duplicating it per repo would put three competing items in
the pipeline for one change. **If that spec is abandoned or descoped below its S3b, S3 must be
re-filed as one proposal per consumer repo** covering the spec's S3 steps 1–4 — otherwise the
consumer work has no owner.
