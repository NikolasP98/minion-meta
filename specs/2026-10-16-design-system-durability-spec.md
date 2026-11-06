---
id: 2026-10-16-design-system-durability-spec
title: Durable design-system contracts and consumer deployment
stage: deploy
status: shipped
pass: 2
created: 2026-10-16
updated: 2026-10-16
repos: [minion-meta, minion_hub, minion_site]
proposal: 2026-10-16-design-system-durability
verdict: approved
tags: [ui, test, data]
---

# Durable design-system contracts and consumer deployment

## 0. Product

Owner authorized implementing and fully deploying all eight recommended audit initiatives on 2026-10-16. Spec Kit source of truth: [feature 012](012-design-system-durability/spec.md), [plan](012-design-system-durability/plan.md), [tasks](012-design-system-durability/tasks.md).

## AS-IS

Fresh base and exact source evidence are recorded in feature 012. Current gaps affect tokens, preference integrity, keyboard customization, mutation outcome fidelity, API contracts and per-file enforcement. Site token gates are already present and both consumer archives match; do not reimplement them.

## TO-BE

Retain existing system; implement eight reviewed initiatives with identified artifacts, semantic/interaction guarantees, scoped persistence, truthful recovery, executable recipes and deployed receipts. Scope authorization includes the recommended preference isolation and stale-write protection, with no production data script.

## DELTA

Four bounded workstreams implement feature requirements FR-001–FR-010. Every task has evidence in the feature directory; source, installed, rendered and deployed proof stay separate. New wrapper extraction is conditional on two pilots showing missing common responsibility.

## Out of scope

Framework replacement, every-route redesign, paused readiness program, speculative SDK, production data mutation and exhaustive screen-reader/cross-browser certification.

## Verification

Feature tasks specify token/mounted/endpoint/negative lint tests, repository gates, installed-component browser fixtures and actual production identity/smoke checks. Two-pass review precedes source implementation; independent code review precedes release. The owner has requested full deployment, including prescribed integration-to-release promotion.
