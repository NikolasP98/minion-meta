---
id: 2026-08-17-gw-nextcloud-talk-dm-misclassified
title: Nextcloud Talk: every webhook message is classified as group chat
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, edge-case]
value: 6
effort: S
source: debt-sweep-2026-08-17
---

# Nextcloud Talk: every webhook message is classified as group chat

## Problem

extensions/nextcloud-talk/src/monitor.ts:57 hardcodes isGroupChat = true with a comment 'let inbound handler refine' — nothing downstream refines it (grep: only read, never reassigned). 1:1 DMs get group semantics: mention-gating and group auto-reply policy misapply.

## Definition of done

payloadToInboundMessage decides from payload.target.type (or a room-info lookup); unit test feeds a one-to-one fixture and asserts isGroupChat === false.

## Out of scope

Any other Talk feature work.
