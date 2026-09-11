---
phase: 13-ui-qualification
plan: "01"
verified: 2026-09-09T05:38:48Z
status: gaps_found
slice_status: passed
score: 3/6 roadmap truths verified to this slice boundary
slice_score: 4/4 plan truths verified
requirements_verified_in_scope: [UI-01, UI-02, UI-03]
requirements_completed: []
gaps:
  - truth: "Critical journeys work across supported viewports, inputs and accessibility settings."
    status: partial
    reason: "Two mounted overlays and the tooltip formatter are qualified; broad Home/Calendar, release journeys and chart/canvas accessibility are separate uncompleted scopes."
    artifacts:
      - path: .planning/phases/13-ui-qualification/13-02-PLAN.md
        issue: "UI-04 and the remaining UI-03 mobile composition gate."
      - path: .planning/phases/13-ui-qualification/13-03-PLAN.md
        issue: "UI-05 and actual critical-route/browser acceptance beyond the isolated overlay fixture."
      - path: .planning/phases/13-ui-qualification/13-04-PLAN.md
        issue: "UI-06 reduced motion and nonvisual chart/canvas acceptance."
    missing:
      - "Evidence from remaining phase-13 plans before full mobile/accessibility or UI-03 closure."
---

# Phase 13, slice 01: Independent verification

**Phase goal:** Critical user journeys remain readable and operable across supported viewports, input methods and accessibility settings.

**Result:** 4/4 slice truths pass. Full phase remains open. This report does not establish whole-app mobile compatibility, accessibility certification, a clean global design-debt baseline or deployment.

The existing phase-wide `13-VERIFICATION.md` retains the remaining UI scope. This report independently inspects the source, real callers, fixture, raw verification logs and a new native browser run. It does not replace the phase-wide ledger.

## Observable truths

| Truth | Result | Evidence |
|---|---|---|
| Secret/image dialogs isolate focus, allow Escape and return focus | Verified in slice | Real Chromium `:modal` state, password initial focus, Tab/Shift-Tab exclusion of background controls and Escape focus return were independently exercised. |
| Saving prevents dismissal/duplicate submit and allows retry | Verified | Callback counter remains one across Escape, backdrop and repeated save clicks; failed callback renders its alert, retry reaches count two, success remains visible, then Escape closes once. |
| Tooltip renders localized sample counts and hostile labels as text | Verified | Actual formatter is wired into ECharts options with the existing Paraglide count. Independent parsed-DOM assertions cover EN/ES, signed output and hostile text. |
| Focused changes follow existing Dialog/token regression contract | Verified to slice boundary | Native foundation is reused, modified foundation logic has a targeted regression fixture, raw token log has zero violations, and existing design debt is disclosed. |
| Home/Calendar mobile composition | Not established | Separate 13-02 scope. |
| Critical seeded browser release journeys | Not established | Separate 13-03 scope; the isolated fixture has no authenticated app shell or gateway. |
| Reduced motion and nonvisual chart/canvas content | Not established | Separate 13-04 scope. |

## Artifacts, wiring and data flow

| Artifact | Exists / substantive / wired | Upstream → visible behavior |
|---|---|---|
| `SecretEditModal.svelte` | Verified | `SecretsSection` selects a real static/scoped secret and calls `handleModalSave`; that dispatches to gateway set methods and returns probe status/message. The modal renders that result or caught error. |
| `ImageLightbox.svelte` | Verified | NotesPanel and ZenMode receive an image source from `NoteImageStrip.onopen`, pass it to the lightbox and clear it on close. No hardcoded replacement image is present in product code. |
| `Dialog.svelte` | Verified | Consumers import the actual foundation. `showModal`, cancel/close handlers and scroll/focus lifecycle are substantive. Controlled close releases the old opening immediately; queued close events are ignored while a new opening is active. |
| `sentiment-tooltip.ts` | Verified | `CrmSentimentTrend` derives a day record from `points`, calls Paraglide with `rec.n`, formats date and passes score into the escaped formatter. CRM insights renders the trend component. |
| `tests/fixtures/overlay-native/` | Verified | Build imports actual source components through `$lib`, deduplicates Svelte and uses a production bundle. Only localization and save/image data are synthetic. It does not substitute an imitation Dialog. |

GSD artifact checks pass 4/4. The generic key-link check reports 0/3 because it expects repository paths where source uses `$lib` aliases/relative imports. All three imports and executable call sites were checked manually. These are heuristic false negatives, not missing connections.

The fixture's use of controlled callbacks is deliberate: saving is held pending, then explicitly rejected or resolved to observe UI state. It proves client interactions while avoiding any credential or business-data operation. It does not prove the gateway save endpoint itself.

## Independent behavioral evidence

`MINION_OVERLAY_FIXTURE_URL=http://127.0.0.1:5295 MINION_OVERLAY_EVIDENCE=/tmp/minion-360-independent-overlay BU_NAME=minion-360-final-verify BU_CDP_URL=http://127.0.0.1:9223 browser-harness` executed the durable `verify.py` against the already-running fixture.

**Six native groups passed:** initial focus/modal semantics; rapid close/reopen retaining the new opening; Tab and Shift-Tab exclusion of inert background controls; pending-save dismissal/duplicate resistance; failure retry/success/one close/focus return; mobile image bounds and focus return.

Desktop viewport was 1440×1000. At 390×844, the image dialog bounds were left16/right374/top262.5/bottom581.5; document width remained390. Independent screenshots of the pending secret save and mobile image dialog were visually inspected. No clipping or overflow was observed in those two fixtures.

Evidence: `/tmp/minion-360-independent-overlay/results.json`, `secret-saving-desktop.png`, `image-dialog-desktop.png`, `image-dialog-mobile.png`, `fixture-desktop.png`. The reusable source runner lives in the repository; screenshots are local ephemeral evidence.

Four additional Node assertions transpiled the actual tooltip module in memory and parsed its output through installed happy-dom: EN count, ES count, hostile date/count markup and signed negative score all passed. No source file was changed.

## Regression gates and test quality

The verifier's capped `timeout 9s node node_modules/vitest/vitest.mjs run src/lib/components/settings/overlay-contract.test.ts src/lib/components/crm/sentiment-tooltip.test.ts` ended with124 during startup, before test results. This is **not** reported as a passing rerun or a failing assertion.

The root's raw final logs were then inspected directly:

| Log | Recorded result |
|---|---|
| `/tmp/minion-360-2026-09-09/hub-final-ui.log` | 7 tests / 2 files passed; duration38.17s. |
| `/tmp/minion-360-2026-09-09/hub-final-check.log` | svelte-check0 errors,0 warnings. |
| `/tmp/minion-360-2026-09-09/hub-final-tokens.log` | Zero token violations. |
| `/tmp/minion-360-2026-09-09/hub-final-design.log` | Existing/unrelated dirty-file debt increases remain visible; no globally clean verdict. |

Scoped `git diff --check` passes. The foundation diff is seven added lines and one removed line, confined to focus capture, immediate release and stale-close handling. Native rerun verifies the current bundle rather than relying on SSR tests for browser semantics.

**Fixture limits:** SSR tests establish markup only. The browser fixture adds native focus and input behavior, but permits BODY as an active element during browser-chrome traversal and checks three known background controls; it is not a general accessibility scanner. Fixed80ms settling is adequate for this observed local run but can be timing-sensitive on slower hosts. These limits are carried into 13-03, not hidden as whole-app evidence.

## Requirements and review axes

UI-01 and UI-02 have direct source/fixture evidence. UI-03 is verified only for this slice and must remain globally open until its other three plans are qualified. UI-04/05/06 remain assigned to plans in this same phase, so they cannot be filtered out as later-phase deferrals. All six roadmap requirements have plan ownership; none is orphaned.

**Standards:** No new scoped blocker. Shared primitives and existing semantics are preserved. Legacy compatibility token names in the extracted formatter existed in its original inline implementation; this is not a new global design-system cleanup. No dependencies or product source were changed by this verifier.

**Spec:** All four scoped truths pass. The scoped result must not be promoted into a full phase pass.

**Anti-pattern scan:** No placeholder product callback or hardcoded empty chart source found. Synthetic values occur in the intentionally isolated fixture. Best-effort focus restoration checks target connectivity. The new stale native-close guard is wired into the real close event.

## Human verification boundaries

The native fixture checks are sufficient for this slice's automated contract. Actual authenticated secret/image workflows, supported browser/OS combinations, screen-reader behavior, touch usability and broader visual feel still require the assigned13-03 acceptance work. No user-facing production save or external browser login was attempted.

## Candidate identity

Hub HEAD at inspection: `a25528b603dfe25f7ea9c0900d271060e5394f35`; checkout contains other WIP.

| File | SHA-256 |
|---|---|
| `src/lib/components/ui/foundations/Dialog.svelte` | `c65f60e3abd7d8bf51ad4417640f030021920800adaf8a45e46637d6a1440b2f` |
| `tests/fixtures/overlay-native/verify.py` | `27286873067012d96b772a6cab645994546a01e00ad3576640e9f1caf9ff5222` |

Verified by independent GSD verifier. Browser ownership was returned to root; no browser process/server was stopped and no commit was made.
