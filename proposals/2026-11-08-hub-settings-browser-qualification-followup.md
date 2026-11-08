---
id: 2026-11-08-hub-settings-browser-qualification-followup
title: Complete Settings browser qualification after owner release override
status: done
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

PostHog access was restored after the owner reauthenticated. Read-only Hub navigation events were found around the Settings/POS transitions, but the recording tool reports no replay available for that session. No completed doubled-locale pageview appeared in the bounded post-release query. The malformed href is independently reproduced; the later automatic recovery described by the owner remains unverified. The post-merge QA attempt was separately blocked by the development inspector overlay before Settings entry and does not establish Back behavior.

Evidence and proof limits: `../evidence/2026-11-08-settings-back-locale/README.md` and `translation-probe.json` beside it.

## Owner-authorized patch

The owner requested “Please proceed with the patch”. Implementation and exact-head verification now follow `../specs/2026-11-08-hub-settings-back-locale-patch-spec.md`. The patch preserves remembered locale/query/hash, localizes the direct fallback once, and opts the complete Back URL out of automatic anchor translation. The real provider regression failed before the patch and the expanded focused run passed all 28 tests afterward. Full CI/runtime and release verification remain pending.

## Release and completion

All ten jobs in exact-source CI 42461195432 passed: 9053 unit tests (289 skipped), zero type-check errors/warnings, clean build, nine Settings browser checkpoints and 245 cross-browser cases across five projects. Independent Standards and scoped Spec/runtime review passed. The existing general page-conformance comparison remains unqualified because its initial ledger is absent; CI intentionally exits zero in that condition. It is not counted as a page-conformance pass.

Hub #641 merged as 8259be3a4710cb5461453f4ddb420fac9e823436 at 2026-11-08T08:31:13Z using the owner's existing merge-override authorization. Its Git tree equals the tested candidate/CI merge tree: 00feda2fbf787d7efb02a2d305783c94ef41ccab. No branch-protection settings changed.

Vercel production dpl_8MzvbaPk8fMeNEJY39fQzBPXktxD is READY for that exact merge revision. Both deployment metadata and the domain alias API identify hub.minion-ai.org as assigned to this deployment. At 08:35:38Z, anonymous read-only runtime checks returned the protected Settings document redirect (302), a separate Settings loader redirect payload (HTTP200), and /api/me401. Authenticated functionality was qualified against disposable seeded QA; no authenticated production mutation was used.

The Settings browser-qualification follow-up is resolved by this patch. Its legacy in-code TODO points to this now-completed record; the earlier release's waived browser gate is not retroactively marked passing. Exact receipts, nine screenshots and telemetry proof limits are in ../evidence/2026-11-08-settings-back-locale/qualification.json and its sibling files.
