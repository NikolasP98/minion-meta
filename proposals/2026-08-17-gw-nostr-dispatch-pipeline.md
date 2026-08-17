---
id: 2026-08-17-gw-nostr-dispatch-pipeline
title: Nostr channel bypasses the shared reply-dispatch pipeline via optional chaining
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, unwired]
value: 5
effort: S
source: debt-sweep-2026-08-17
---

# Nostr channel bypasses the shared reply-dispatch pipeline via optional chaining

## Problem

extensions/nostr/src/channel.ts:217 calls a loosely-typed handleInboundMessage?.() instead of dispatchReplyWithBufferedBlockDispatcher — silently no-ops if the method is renamed and skips the buffering/block-dispatch every other channel gets.

## Definition of done

Nostr uses the standard dispatcher; integration test round-trips a nostr DM through the shared pipeline.

## Out of scope

Other nostr features.
