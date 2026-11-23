# Implementation and release evidence

Owner approval received 2026-11-22: “approved. lmk when its all live”.

Implementation base: Hub master `5347ff0148a3600fd3963d94db57e95c8e5a2779`. Compared with reviewed source `3d39cbb640da894c9d78bc840af6153b5d896724`, six changed files contain accessibility fixes to DataTable, public wordmark contrast and the accessibility ledger. No creation/authority/layout architecture drift was found. The public contrast fix and its regression test must be preserved.

Separate private clones own data/server, shared shell/setup/editor and remaining identity consumers. The shared checkout and the frozen EGM source remain untouched. Dependencies installed with the frozen Bun lockfile; application implementation and qualification are in progress. No deployment or runtime completion is claimed.

## Release ledger

| Slice | Implementation | Qualification | PR / merge | Deployment / runtime |
|---|---|---|---|---|
| Data and guarded service | In progress | Pending | Pending | Pending |
| Shared delivery, shell, creation and editor | In progress | Pending | Pending | Pending |
| Remaining identity consumers and final qualification | In progress | Pending | Pending | Pending |

## First-document architecture amendment

Runtime inspection on the clean implementation base found `src/routes/+layout.ts:17` exports `ssr = false`. An unauthenticated initial document is a 1,994-byte empty application shell; loaders run through route-data requests. Root telemetry imports also rely on client-only execution. The reviewed spec overlooked this existing architecture.

Do not enable global SSR, inject an artificial no-JavaScript wordmark, or add a second branding query in hooks as part of this naming feature. Preserve the existing client-only application. Qualify the first authenticated route-data response, visible first mount and hydration, request isolation, and layout read budget. No JavaScript-disabled full-HTML branding claim is made. Whole-application SSR needs its own compatibility audit and migration, tracked in proposal `2026-11-22-hub-first-document-ssr`. This is a documented exception to T008's JavaScript-disabled assertion, not a passing SSR test. All owner naming/authority/layout requirements remain in scope.

## Implementation checkpoint (2026-11-23)

- Data: Hub PR707, head `8403fdc9d2c19eb1d77cdae6af927c7c781ee8e6`; independent findings fixed.136 focused tests,19 native PostgreSQL tests (including real PATCH/committed state),0/0 type check, additive seed twice. No-mistakes review/test/document/lint/push passed; PR/CI steps skipped due its subprocess GitHub authentication. Executor opened PR707 with its functioning GitHub CLI. Hosted CI remains pending; no merge or live claim.
- Setup: commits183df27e,48104cc5,db097a2b,339214a3. Independent review corrected long-name silent MINION fallback, shared/public casing, adaptive mobile rows and unavailable/complexity feedback. Pipeline run `01M83CBD141QAJVQT3RDXPY4TJ` is active; it owns the release checkout. Current master advanced to calendar release `e98e86ec410764646dd82faef65d69471be7b9c8`; pipeline preserved both message sets in the rebase.
- Localization dependency: the five existing parameterized message callers move into slice2 atomically with their EN/ES signature changes so that slice builds independently. The remaining identity consumers stay in slice3. This changes delivery order only.
- Consumers: commits7c901bdf and7f9ba8c4;32 consumer paths,33 identity inventory rows,5 localized callers;11 mounted tests. Full check caught a Storybook/svelte2tsx instance-script issue; moving the getter import into the existing module script fixed actual preprocessing and retained authored samples.
- Integrated QA `/tmp/minion-white-label-145-qa`: current source includes all three slices plus data pipeline corrections. Full check returned0errors/0warnings. Full ordinary tests and browser layout matrix are running; build/accessibility/full release proof remain pending.
- Actual owner browser flow saved Clínica Faces and refreshed shell identity successfully on loopback5199.430px browser proof caught inherited uppercase on the mobile prefix; shared CSS now explicitly preserves prefix/suffix casing and actual browser reports `text-transform:none`, document width430.
- QA setup corrected stale synthetic local gateway ciphertext with the current QA encryption key and moved synthetic endpoints to the closed local port18799; no external gateway/model/workforce action was used. Local browser service-worker caches were cleared for the checkout switch. Hidden headless-tab animation throttling initially interrupted one matrix run; activating only that headless tab restored measurement. No failed/blank capture is counted as passing layout proof.

Private clone paths and local evidence are restart checkpoints, not deployed behavior. See implementation/ for source receipts and independent review.

### Browser qualification update

Actual shell/editor:144 measured combinations (6names ×2locales ×2themes ×6widths320/390/401/430/768/1280),0clipping/overflow/casing/header-row/touch-target failures. Names include15wide letters,15CJK,15accented characters and15emoji graphemes near the256-byte envelope. Public wordmark maximum emoji case separately passes all6widths and retains prefix casing. The200-percent equivalent capture uses640CSSpx/DPR2 on1280physicalpx; it is not described as native browser menu zoom.

Actual16-character Spanish draft disables Save; forced form submission leaves committed state unchanged. Staff can load personal Appearance preferences and read shared shell identity, cannot see the shared editor, and receives403from both branding and full-org-name PATCH; full name and saved prefix remain unchanged. Detailed numeric receipts are in implementation/browser/.
