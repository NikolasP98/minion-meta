---
id: 2026-11-25-hub-synced-pages-spec
title: Synced pages S1 — filters on a sandbox page drive the blocks that listen to them
stage: deploy
status: merged
verdict: approved
type: feature
pass: 3
created: 2026-11-25
updated: 2026-11-26
repos: [minion_hub, minion-meta]
tags: [ui, logic]
proposal: 2026-11-25-hub-synced-pages
---

# Synced pages S1

## 0. Product

Owner (2026-11-25): "I ask the agent to add items to the page and wire them up: connect visuals to live data, create filters that affect other elements. The idea is to create a synced page and being able to tweak how they behave with eachother."

Board stub for the Spec Kit feature **[`specs/150-synced-pages/`](150-synced-pages/spec.md)**: filter elements (date range, single/multi select) publish page values; every block lists what it listens to; values live in the URL; the agent tools build and rewire it.

**Out of scope:** click-to-filter (S2), chat draft + Apply (S3), Connections view (S4), streaming (S5), assistant snapshot (S6), other follow-ups (S7) — see the proposal.

**Verification:** SC-001–SC-005 in the Spec Kit spec (only listeners re-query; numbers equal direct queries; agent builds the page from tool descriptions 4/5; every refusal tested; no behavior change for existing pages).

## Delivery note (2026-11-26)

S1 merged to hub master as `456c90b5` (hub #735) on the owner's instruction ("please merge them for me"), CI 19/19 green after one re-run of a macOS runner flake (`hdiutil: couldn't eject`), Vercel production deploy succeeded; the production bundle contains `sandbox.block_filter` and `sandbox.wire`. Review: EGM stages 5–9 on the design and an independent code audit, all findings folded. Not verified live: the browser e2e (`tests/e2e/ui-audit/synced-pages.spec.ts`, local QA stack unusable since 11-23), the trend-query fix against real data, Safari 18, and the SC-003 agent trial. Follow-on slices now run through `proposals/2026-11-26-hub-apps-clinic-package.md` (see the amendment in the proposal).
