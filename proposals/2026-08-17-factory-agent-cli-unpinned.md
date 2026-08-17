---
id: 2026-08-17-factory-agent-cli-unpinned
title: Agent image installs claude-code/codex unpinned — parser contract can break silently
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [infra, deps]
value: 5
effort: S
source: debt-sweep-2-2026-08-17
---

# Agent image installs claude-code/codex unpinned — parser contract can break silently

## Problem

agent/Dockerfile:17 npm install -g without versions; the pipeline parses --output-format json fields (.subtype/.num_turns) from whatever ships that day.

## Definition of done

Exact versions pinned; deliberate bump procedure noted; two builds on different days produce identical CLI versions.

## Out of scope

Auto-update tooling.
