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

## Confirmed Back URL root cause — 2026-11-08

The owner supplied an authenticated error screenshot at `/es/es/pos/sell` and requested root-cause analysis. The remembered URL already includes `/es`; the shared Back Button is then automatically translated under the app's Paraglide provider, adding `/es` again. Executing the installed translation functions reproduces both `/es/es/pos/sell` and `/en/en/pos/sell`, including retained query/hash. The existing isolated Header test omits that provider, so it observes the correct stored href before the translation that breaks it.

Correct the Back-link translation boundary so remembered localized URLs retain one locale, and localize the direct-entry fallback once. Add integrated provider coverage for both languages, query/hash, fallback and dirty Cancel/Discard. The existing matching TODO remains at the Back-restoration assertion. This investigation made no product change or deployment.

PostHog access remains unavailable because its connector requires reauthentication. The malformed href is reproduced; the later automatic recovery described by the owner remains unverified. The post-merge QA attempt was separately blocked by the development inspector overlay before Settings entry and does not establish Back behavior.

Evidence and proof limits: `../evidence/2026-11-08-settings-back-locale/README.md` and `translation-probe.json` beside it.
