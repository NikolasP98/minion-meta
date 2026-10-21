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
executable and passes Rust deep-link tests. Installed OS-webview provider login,
code signing and installer distribution have not been exercised.
`TODO(handoff)` at the native navigation policy in `src-tauri/src/lib.rs` tracks
the installed-login check before distributing installers.
