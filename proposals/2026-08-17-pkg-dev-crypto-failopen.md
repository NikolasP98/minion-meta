---
id: 2026-08-17-pkg-dev-crypto-failopen
title: Dev crypto key silently activates outside exact NODE_ENV=production
status: approved
created: 2026-08-17
updated: 2026-08-17
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
