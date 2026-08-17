---
id: 2026-08-17-pkg-infisical-cache-plaintext
title: Infisical secret cache stored plaintext on disk (0600 only)
status: draft
created: 2026-08-17
updated: 2026-08-17
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
