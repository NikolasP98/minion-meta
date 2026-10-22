---
id: 2026-10-21-ci-lane-auto-followups
title: Bound auto-lane request state and attest resolver success in the named gate
status: draft
created: 2026-10-21
updated: 2026-10-22
repos: [minion]
tags: [infra, test]
source: owner-credit-efficient-redeployment-review
---

# Bound auto-lane request state and attest resolver success in the named gate

## AS-IS

Gateway #350 source `eb6b77ae8dce49fcad7b362de65d82b9249e8826` implements owner-approved off/on/auto CI lane modes. Defaults disable Windows/macOS and allow Android. Off/on resolve without Jev calls. That selected mode passed Standards and Spec review for the immediate Linux Gateway release.

Two follow-ups remain outside that selected mode. `boundedState` caps file names at400, and can exceed24KB when names alone exceed the budget. This does not fully implement spec030's byte-bound/all-filenames contract. The named `Linux required` gate also does not directly attest the resolver job result; whole-workflow success still exposes a failed resolver. The release operator therefore requires successful overall CI, not only that named gate.

## TO-BE

Every outbound auto request fits its actual UTF-8 encoded byte limit. If mandatory file names cannot fit, fall back to deterministic path scope instead of silently omitting evidence or sending an oversized request. The named gate must reject resolver failure where that job is applicable, preserving explicit promotion/docs conditions. Off/on must continue making zero Jev requests.

## DELTA

A separate implementation should test long/many/unicode/escaped file names, overflow fallback before any request, absent/failed/cancelled resolver outputs and valid off/on/promotion/docs cases. It must preserve source identity and Linux validation gates. Exact-site TODO(handoff) comments retain this ledger pointer. This follow-up is not a new release gate for the already reviewed off/on defaults; full auto compliance remains unqualified until fixed.

## Merged content

From `handoff-minion-ai-20271324` (factory handoff-ledger sweep, 2026-10-22): the open end is
anchored at `NikolasP98/minion-ai@DEV scripts/ci/lane-flags.mjs:15` — "Bound actual UTF-8 state
bytes including filenames, or fall back."
https://github.com/NikolasP98/minion-ai/blob/DEV/scripts/ci/lane-flags.mjs#L15
