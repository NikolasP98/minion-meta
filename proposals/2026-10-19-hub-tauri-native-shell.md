---
id: 2026-10-19-hub-tauri-native-shell
title: Hub desktop app with a real native shell (custom titlebar, menus, no bundled Node server)
status: in-spec
created: 2026-10-19
updated: 2026-10-20
repos: [minion_hub]
tags: [ui, infra]
value: 5
effort: L
source: specs/028-hub-app-feel-shell
---

# Native desktop shell

## AS-IS
`minion_hub/src-tauri/` exists but uses default OS decorations, `plugins: {}` (no menus, tray, deep links) and spawns `node build/index.js` on :5959 behind a loading page — a website inside a browser frame. Spec 028 made the web app installable as a PWA, which covers most of the "own window" need.

## TO-BE
If a desktop build is still wanted: the Topbar is the titlebar (`decorations:false` + `data-tauri-drag-region`, as ArtCraft does), native app menu + tray + `minion://` deep links, and the window loads the hosted hub instead of a bundled Node server.

## DELTA
Decide first whether the PWA is enough; if not, a spec for titlebar/menus/remote-URL loading and its auth (cookie scope) implications.

## Implementation

Implementation and qualification are tracked in
`specs/2026-10-20-hub-app-backlog-spec.md`. The candidate is [Hub PR #575](https://github.com/NikolasP98/minion_hub/pull/575)
on `feat/app-backlog`. Merge and deployment remain owner-gated.

## Release qualification

The owner selected Tauri on 2026-10-20. The candidate builds a native Linux
executable and passes Rust deep-link tests. Installed OS-webview provider login and native HTML5 file-drop delivery,
code signing and installer distribution have not been exercised.
`TODO(handoff)` at the native navigation policy in `src-tauri/src/lib.rs` tracks
the installed-login and file-drop checks before distributing installers.


## Signed GitHub release preparation

The owner requested installation links on the Hub repository's Releases page
and required signed installers on 2026-10-20. The candidate now has a
`desktop-release.yml` workflow that runs only from `master` and assembles a draft
`desktop-vX.Y.Z` release. It collects Linux x64 DEB/AppImage, Windows x64 NSIS,
and macOS Apple Silicon/Intel DMG installers, source identity and checksums.
The draft's notes contain direct download links. Publication remains a separate
owner action; generated web changelog tags remain under `hub-v*`.

Signing is mandatory: Apple Developer ID plus notarization/stapled tickets,
trusted timestamped Windows Authenticode signatures on the app and installer,
and detached OpenPGP signatures on Linux installers/checksums. Missing signing
credentials or failed verification prevents draft assembly. Pull-request builds
are labeled unsigned Actions qualification artifacts and cannot enter releases.

Open release gates: configure the protected `desktop-signing` environment and
its Apple/Azure/OpenPGP credentials using `src-tauri/README.md`; qualify the signed
builds, installed provider login/restart persistence, native controls, deep links
and HTML5 file drops on each OS; deploy the matching hosted titlebar code with
source-identity evidence; obtain independent PR review and owner approval before
merge/publication. Repository secrets inspected before preparation contained no
signing credentials. No private keys were created or requested in chat.
The exact workflow signing step has `TODO(handoff)` pointing here. Linux signing
is tested with a temporary fixture key; this does not qualify real release keys
or Apple/Windows signing. Cross-platform installer checks are running on PR #575.
