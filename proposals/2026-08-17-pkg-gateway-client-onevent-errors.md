---
id: 2026-08-17-pkg-gateway-client-onevent-errors
title: GatewayClient discards exceptions thrown in consumer onEvent handlers
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta]
tags: [logic]
value: 4
effort: S
source: debt-sweep-2-2026-08-17
---

# GatewayClient discards exceptions thrown in consumer onEvent handlers

## Problem

packages/shared/src/gateway/client.ts:263 bare empty catch turns UI-handler bugs invisible.

## Definition of done

onEventError hook or console.error fallback; unit test observes a thrown handler error.

## Out of scope

Event replay.
