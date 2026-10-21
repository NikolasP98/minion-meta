---
id: 2026-10-20-hub-app-backlog-spec
title: Hub module continuity, immediate edits, record gestures, desktop and offline shell
stage: deploy
pass: 1
status: merged
verdict: pending
created: 2026-10-20
updated: 2026-10-20
repos: [minion_hub]
tags: [ui, ux, infra]
---

# Hub app backlog

## 0. Product

Owner request: implement the five `2026-10-19-hub-*` proposals in PR #849.
Owner confirmed Tauri rather than closing that proposal in favor of the PWA.
The five proposals remain the acceptance criteria. This spec supersedes spec
028's no-service-worker invariant only for the narrowly scoped offline worker.

## AS-IS

Hub baseline: `d42a14a26bc34f81876defd8d3bf3fdf9ccb2001` (`master`).
The app shell stays mounted; route components unmount. DataTable owns transient
filters/selection/expansion. `RecordPeek` uses shallow history. `createOptimistic`
uses a single pending map without overlapping-request fencing. ContextMenu exists,
but DataTable's rowActions is an opaque Svelte snippet. Tauri spawns Node on 5959.
There is a manifest but no offline navigation fallback.

## TO-BE

- Remember transient views within this app session, bounded and scoped to actor
  and organization; discard on owner change. Preserve explicit deep links and
  browser history. Only sidebar/module-picker actions opt into last-route
  resumption; ordinary links and assistant navigation keep their exact URLs. Restore shared table selection/filter/expansion and scroll,
  and reopen peeks through authorized fresh loads.
- Reversible controls show intent before their network request settles. Keep
  pending and rollback feedback. Inventory remaining controls and enforce a CI
  ratchet; consequential operations keep explicit confirmation and receipts.
- Reuse one typed action catalog for pointer, keyboard, and visible record menus.
  Global file drop offers only currently available registered destinations;
  upload uses existing validated and permission-checked transports. No upload
  starts just because a file was dropped. Preserve local drop targets.
- Tauri loads the hosted Hub, has a custom draggable titlebar, native menus,
  tray and validated `minion://` links. No server or credentials bundled.
  Remote content receives only the window-control capability it needs.
  Signed installers are required by the owner. Prepare a master-only workflow
  that verifies Apple/Windows signatures, signs Linux installers/checksums, and
  assembles all supported platforms as a draft GitHub Release with install links.
  Unsigned PR qualification artifacts must never enter release assembly.
- Navigations always use the network. Cache only current immutable build assets
  and a public branded offline document. Never cache API, authenticated HTML,
  navigation errors, or version metadata. Offline recovery retries the actual
  requested URL. Worker activation retires only this worker's obsolete caches.

## DELTA and verification

1. Add scoped retained-view primitives and wire shared table/layout/peek state.
   Mounted leave/re-enter tests cover restore, owner retirement and deep links.
2. Inventory reversible controls, migrate uncovered handlers, fence overlapping
   optimistic operations and enforce newly introduced waiting controls in CI.
   Tests hold requests pending, reject them and complete them out of order.
3. Add typed row actions/context menus and a drop registry + shell chooser with
   real record/inbox/assistant adapters. Mounted tests exercise keyboard menus,
   disabled actions, target disposal, rejected uploads and cancellation.
4. Replace the Node sidecar with the remote Tauri shell. Rust tests validate
   origin/deep-link mapping; cargo check qualifies the actual Rust API surface.
   Add cross-platform installer qualification, fail-closed signing checks,
   complete-matrix/source/digest validation and draft-only release assembly.
   Exercise detached-signature verification with a temporary Linux fixture key.
5. Add offline worker and fallback. An executable worker harness proves no HTML
   or API caching, offline response, update cleanup, and build identity changes.
6. Run focused tests, design/token lint, check, tests and production build.
   Qualify browser behavior against loopback only. Record exact limitations.

## Out of scope

Production deployment/publication, acquisition of signing credentials, offline
business writes, background synchronization and a bundled application server are
outside this implementation. Preparing signed release automation is in scope. No authentication or authorization policy is expanded.

## Review and release

Standards pass: reviewed owner isolation, URL authority, transport reuse, token
contract and repository branch policy before development. Spec pass: separated
opaque snippet compatibility from typed action APIs and kept offline fallback
independent from the application shell. These are author reviews; independent
review and owner merge approval remain release gates. Work is isolated under
`~/.cache/codex-implementation/hub-app-backlog-2026-10-20/`.

## Review evidence

Author standards review checked identity retirement, request fencing,
permission-checked attachment transports, unknown upload acknowledgements,
semantic tokens, native IPC scope and immutable-only worker caching.
Author spec review found and corrected a deep-link conflict: general navigation
no longer rewrites module-root URLs; resumption belongs only to shell selectors.
Compiled Rust and focused mounted/browser evidence are recorded in the Hub
`docs/verification/2026-10-20-app-backlog/README.md`. The full-suite, build and gate receipts are recorded there. Authenticated
CRM/POS route qualification and installed desktop provider login/file drops remain explicit
release checks in their matching proposals and source TODO(handoff) comments.
Independent PR review remains separate from these author reviews.

## Implementation candidate

[Hub PR #575](https://github.com/NikolasP98/minion_hub/pull/575), source commit
`991b029ec1db6173b13d374714bdc45c13a8f94b`, contains all five implementations and the reproducible evidence
fixture. This meta change includes PR #849's source proposal/spec commit as a
prerequisite; #849 itself was not modified. No merge or deployment is authorized
by these candidate receipts.


## Installer release review

The owner's follow-up requires signed installers and GitHub Releases installation
links. Author standards review separates pull-request builds (no credentials,
read-only token) from master-only protected signing jobs and a draft-only writer.
Author spec review checks all five installer assets, exact source SHA/digests,
mandatory OS signature verification and rejection of unsigned qualification
receipts. Release preparation does not authorize merge, hosted deployment or
publication. Signing credential setup and installed runtime qualification remain
tracked in the native-shell proposal and the source workflow TODO(handoff).


## Cross-platform build receipt

Hub candidate `991b029ec1db6173b13d374714bdc45c13a8f94b` passed all five jobs in
[Desktop qualification 39531728582](https://github.com/NikolasP98/minion_hub/actions/runs/39531728582):
release-contract tests and native Rust tests/packaging on Linux x64, Windows x64,
macOS Apple Silicon and Intel. Five unsigned qualification installers were
retained as Actions artifacts, never Releases assets. This proves cross-platform
compilation and packaging; Apple/Windows signing and installed runtime remain
unproven until credentials and OS qualification are available.

The same candidate passed the web CI check-and-build job, including typecheck,
formatting, design/token gates and production build. The ordinary test job,
browser/database jobs and full seeded QA-stack conformance job also passed.
All GitHub CI jobs were green; only the Vercel preview remained pending.
Current status remains visible on [CI run 39531728687](https://github.com/NikolasP98/minion_hub/actions/runs/39531728687).
At the pre-merge receipt above, no owner merge, deployment or installer publication had occurred.


## Owner merge and deployment qualification

The owner merged [Hub PR #575](https://github.com/NikolasP98/minion_hub/pull/575)
on 2026-10-21 at 03:45:38 UTC (2026-10-20 in America/Lima), producing
`26e82cfc90f8279875dfa64b89e9a50a6f1323fe`. The merged application, desktop and
release-workflow sources match the qualified `991b029e` candidate. The spec now
tracks `stage: deploy`, `status: merged`; it is not marked shipped.

[Post-merge CI 39540341303](https://github.com/NikolasP98/minion_hub/actions/runs/39540341303)
started on the merged revision. [Release notes 39540341274](https://github.com/NikolasP98/minion_hub/actions/runs/39540341274)
completed successfully. Vercel metadata identifies the corresponding production
build as `minion-799ebxtat-nikolasp98s-projects.vercel.app`, with
`githubCommitSha=26e82cfc90f8279875dfa64b89e9a50a6f1323fe`. Its first observed
state was BUILDING; the live alias initially pointed to the preceding deployment.
Vercel reported successful deployment at 03:49:30 UTC. A fresh alias inspection
then verified `hub.minion-ai.org` points to READY production deployment
`dpl_6gFMkr5WqURf174VEzM1j59ERizp`, the same exact-commit build above. This is
deployment identity and alias evidence, not authenticated feature/OS runtime QA.
Post-merge CI was still running at that verification; its completed jobs had no
failures. The earlier exact-candidate qualification remains linked above.

The signed desktop workflow is now present on `master`. The repository still
has no `desktop-signing` environment or Apple/Azure/OpenPGP signing secrets.
No desktop workflow was dispatched without those credentials, and the Hub
Releases page still has no installer release. Installed OS-webview sign-in,
restart persistence, native controls, deep links and file drops remain release
gates. Source merge does not establish those runtime results.

The companion metadata PR #850 remains a separate owner-controlled merge.
