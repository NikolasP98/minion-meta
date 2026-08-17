---
id: 2026-08-17-site-member-gateway-swallowed-errors
title: Member dashboard gateway failures silently swallowed (3 empty catches)
status: in-spec
spawned_spec: 2026-08-17-site-member-gateway-swallowed-errors-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_site]
tags: [ui, logic]
value: 5
effort: S
source: debt-sweep-2-2026-08-17
---

# Member dashboard gateway failures silently swallowed (3 empty catches)

## Problem

src/lib/services/member-gateway.svelte.ts:236,254,322 .catch(() => {}) on session/chat/poll — outages look like empty data.

## Definition of done

console.error minimum (ideally surfaced state); killing WS mid-poll produces observable errors.

## Out of scope

Retry/backoff design.
