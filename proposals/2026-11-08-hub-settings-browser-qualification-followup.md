---
id: 2026-11-08-hub-settings-browser-qualification-followup
title: Complete Settings browser qualification after owner release override
status: review
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub]
source: owner-approved-check-skip
tags: [ui]
---

# Settings browser qualification follow-up

## AS-IS

The owner explicitly requested “skip the check and merge” on 2026-11-08. Hub #640 has independent Standards/Spec review, 9047 passing tests and passing typecheck/build on candidate 32e7dbc7, plus a READY preview. Its QA job failed before database bootstrap because runner port 54422 was occupied. The earlier browser run passed desktop entry, search, gateway selection and dirty Cancel, then Back returned the safe home fallback instead of the original query/hash. It also reported a stale Vite inspector import. Prebundling/readiness and reload diagnostics address that suspected development reload, but the replacement browser flow has not passed. A final comment-only handoff commit records this outstanding check at the assertion site.

## TO-BE

Run the seeded Settings browser flow on the released application source. Establish whether inspector stabilization resolves the prior return-memory failure. Back must restore the original query/hash and collapsed rail after Discard; history, direct reload fallback, 1024px vertical navigation and staff mobile entry/Back must pass. Retain screenshots and document-generation/Back-href receipts. Fix any reproduced product defect through a reviewed PR.

## DELTA

Retry QA on a runner with its required database port available, or qualify a stable isolated QA stack. Run `scripts/qa/settings-navigation-smoke.ts` and the existing conformance gate. Update this proposal and the Settings implementation spec with exact-source results; remove the matching `TODO(handoff)` only after completion. This records an explicit release exception, not a passing browser result.

Spec: `../specs/2026-11-07-hub-settings-navigation-layer-spec.md`.
