---
id: 2026-08-17-pkg-dev-crypto-failopen
title: Dev crypto key silently activates outside exact NODE_ENV=production
status: in-spec
spawned_spec: 2026-08-17-pkg-dev-crypto-failopen-spec
created: 2026-08-17
updated: 2026-08-20
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

## Open-items ledger (appended 2026-08-20)

Spec `2026-08-17-pkg-dev-crypto-failopen-spec` S1 (fail-closed key resolver) and S2 (early
failure + release contract) are landed in `packages/db`. Two ends stay open, both matched by a
`TODO(handoff):` in `packages/db/src/crypto.ts`:

1. **S3 is unlanded.** `minion_hub` and `minion_site` have neither the boot-time
   `assertCryptoKeyConfigured()` call nor a bumped `@minion-stack/db` — neither repo is
   checked out in the meta-repo workspace (spec ⚠️ A2). The published package is therefore inert
   for both apps, which is the safe resting state. **Do not bump the dependency in either
   consumer** before S3 steps 1–4 (environment classification, `ENCRYPTION_KEY` provisioning
   per shared-DB group, boot assertion) are done and verified: the bump PR is the real deploy of
   this fix, and an un-keyed environment on the new version stops sealing secrets.
2. **The S2 at-rest audit was not run** — no database is reachable from this workspace. Column
   inventory and the exact read-only procedure:
   [`2026-08-20-dev-key-at-rest-audit`](2026-08-20-dev-key-at-rest-audit.md). Its result gates
   S3 step 5 (⚠️ A3): a database holding dev-key ciphertext must not be given a real
   `ENCRYPTION_KEY` without a rotation plan.
