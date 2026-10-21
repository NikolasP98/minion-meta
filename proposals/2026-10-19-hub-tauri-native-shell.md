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

The owner selected Tauri on 2026-10-20. Native Rust tests and installer builds
pass on Linux x64, Windows x64 and macOS Apple Silicon/Intel. The owner then
revoked the signed-installer requirement and explicitly requested immediate
unsigned downloads. Signing is not a current prerequisite.

The first [unsigned preview](https://github.com/NikolasP98/minion_hub/releases/tag/desktop-v0.0.1)
is public with all five installers, checksums and exact CI/source provenance.
The build's full Git tree matches approved merge `26e82cfc`; every uploaded asset
digest matched before publication, and the public checksum download was checked.
[Hub PR #576](https://github.com/NikolasP98/minion_hub/pull/576) removes signing
branches, credentials and the signing environment from future release workflows.

Installed OS-webview provider sign-in, restart persistence, native controls,
deep links and file-drop delivery remain runtime qualification work. The source
`TODO(handoff)` at native navigation and the release receipt track those gaps.
They are disclosed preview limitations, not requirements to obtain signing keys.

Linux archive inspection found and corrected an omitted URI argument in the
bundler's desktop entry. Its template now passes `%u`, checked against the actual
DEB in CI. AppImage OS protocol registration requires desktop integration.
