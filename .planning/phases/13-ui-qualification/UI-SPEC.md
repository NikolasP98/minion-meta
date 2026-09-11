# UI qualification contracts

Initial13-01 scope: Hub SecretEditModal, ImageLightbox and CrmSentimentTrend only. Preserve unrelated dirty work, route layouts and package manifests. Authority: existing `packages/design-tokens/contract.json`, UI governance skill and shared `src/lib/components/ui/foundations/Dialog.svelte`.

- Secret editor uses the native Dialog foundation: named by the existing secret label, description exposes secret key, initial focus enters password input, Escape/backdrop/cancel/close use one close callback. While saving, all user dismissal paths are unavailable. Existing save-and-probe success/error output remains visible, and failed save permits retry. No automatic dismissal after save.
- Image preview uses the same native Dialog foundation with existing localized title, visible close control, native background isolation, Escape and focus return. Preserve source image, constrain to viewport, add optional alt text for future callers without inventing image descriptions.
- Sentiment tooltip keeps date/score/sample count, interpolates the existing translation, closes valid HTML attributes and escapes localized/display strings. No API/data semantic changes.
- Use semantic surfaces, spacing, typography, radius and focus; remove obsolete global `.close` styling and ad-hoc modal backdrop. Shared foundation owns overlay layout and scrolling.
- Acceptance: rendered named dialogs; opened/closed states; Escape from focused input; focus return; no dismissal or duplicate save while saving; failure retry; localized sample count and escaped string content in parsed tooltip DOM. Run focused tests, UI gates and an isolated local component browser fixture. This does not certify full Hub mobile compatibility.

- Native lifecycle regression: closing and reopening across a Svelte tick must keep the new opening modal; an old queued close event cannot dismiss it. Capture the focus-return element before clearing modal state.

## UI-first implementation contract —2026-09-11

Authority remains the shared token contract and native/Zag primitives. These additions specify bounded13-02/04/05/06 work, without claiming all routes are covered.

| Surface | Required behavior | Acceptance boundary |
| --- | --- | --- |
| Home | Closed notes rail occupies real layout space; open notes drawer does not hide composer controls. Narrow composer wraps when needed. | Actual route composition at360/390/768/1440; synthetic data and desktop layout control. |
| Call controls | Compact/coarse targets use `--control-height-touch` (44px). Language name includes selected language. Start/mute/end remain reachable and distinct; reduced motion suppresses pulse. | Native keyboard/callback and overlap tests; real microphone/provider calls excluded. Fine-pointer desktop gets a separate control. |
| Calendar | Readable staff lanes scroll intentionally within the calendar, preserving day/week/month/agenda controls. Original instants project to the viewer's displayed local time. | Actual calendar rendering plus installed-core DST/drag/resize tests. Repeated-hour rendering and overlap-query policy remain explicit gaps. |
| Shared chart | Actual scalar Cartesian data has a named, keyboard-operable table disclosure; formatted values match axis units. Wide tables stay within the page and can be reached by keyboard. | Real model/browser checks; ambiguous data shapes are omitted rather than misrepresented. Consumer action alternatives remain separate. |
| Motion and callbacks | Preferences work at mount and after live changes, including merged ECharts options; changed callback props are honored. | Real ECharts model and rendered engine evidence; specialized effects/workshop physics are not certified by this contract. |
| Critical journeys | Actual components and installed gateway client perform connection/recovery transitions through a deterministic synthetic transport. | Mandatory engine/case manifest with zero silent skips; Chromium/Firefox/WebKit. Authenticated routes, full app navigation and real server connections remain13-03. |

Capture actual fonts, engine/version, source hashes, viewport, pointer mode, focus, occlusion and failures. Use dark/light semantic tokens; do not infer theme parity from unchanged CSS alone. Device emulation and Linux WebKit are browser-engine coverage, not a claim of native iOS/Android hardware testing. Missing local authentication infrastructure remains a failed/unexecuted gate and cannot become a green synthetic login.
