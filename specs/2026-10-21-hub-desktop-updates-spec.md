---
id: 2026-10-21-hub-desktop-updates-spec
title: Hub desktop automatic updates and Rust optimization
stage: test
status: implementing
pass: 1
verdict: pending
created: 2026-10-21
updated: 2026-10-21
repos: [minion_hub]
tags: [ui, infra, test, security]
proposal: 2026-10-21-hub-desktop-updates
---

# Hub desktop automatic updates and Rust optimization

## 0. Product

Implement the owner's request for automatic startup installation, low-cost
background checks, active-session notification and Rust optimization research.
Keep the Hub repository's Releases page as the installer download destination.

## AS-IS

Hub PR #575 shipped the hosted Tauri shell at desktop version 0.0.1. Native
updates require manual installer downloads. PR #576 prepares unsigned previews;
Apple Developer ID, notarization, Azure Authenticode and GPG remain optional.
The Rust release profile already uses `opt-level = "s"`, full LTO, stripping,
abort-on-panic and a single codegen unit. It also produces mobile library formats
although the supported distribution targets are desktop only.

## TO-BE

1. On startup, a local native window checks for a strictly newer semantic desktop
   version. If available, download, verify, install and restart before showing
   the hosted application. No source checkout or build tools are needed by users.
2. While active, check every six hours with per-process jitter. Present an update
   notification window and native menu entry. Closing the notice defers it;
   installation requires an explicit click or the next app start. Never restart
   an active editing session automatically.
3. A small static `latest.json` asset on the `desktop-updates` GitHub release is
   the only metadata endpoint. Use HTTPS, conditional ETag requests, a five-second
   metadata timeout and a 64 KiB response limit. No API token, user identity,
   application-server request, database or new hosted service is needed.
4. Native Rust owns the fixed endpoint, version policy and installation. Remote
   hosted content receives no updater commands or plugin permissions. A bundled
   local Svelte window uses shared UI primitives and design tokens; it has only
   narrowly scoped status, install and continue commands.
5. Tauri updater signatures are mandatory free integrity checks, separate from
   OS code signing. Require a cryptographically signed matching version and
   reject downgrades. Keep the private key out of source and PR jobs. Qualify PR
   artifacts with throwaway keys; release builds use one durable secret.
6. Linux AppImage, Windows NSIS and both macOS architectures receive updater
   artifacts. Debian installations receive the update notice and direct installer
   link without silently elevating or collecting an administrator password.
7. Failed checks or downloads leave the installed app usable. Show bounded,
   understandable failure text with Retry/Continue. Closing a startup window
   cancels its ability to install; no late download may restart an active app.
8. Publish a complete immutable versioned release first. Only an explicitly
   authorized publication updates the feed, after all target signatures and
   artifact digests pass validation. Drafts never advance the feed. Reject feed
   regression and serialize releases. Feed replacement failure preserves safety
   and causes a retryable check failure, never fallback to an unverified package.
9. Keep existing size optimizations; measure removal of unused mobile library
   outputs. Do not claim smaller installers or faster startup without evidence.

## DELTA and verification

| Boundary       | Change                                                                    | Required evidence                                                                                                              |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Native updater | Metadata admission, scheduler, single-flight install, signed verification | Rust tests for ETag/304, malformed/oversized responses, timeout, downgrade, artifact URL and signature rejection; native build |
| Local UI       | Startup progress, active notice, retry/continue, install action           | Actual local component browser checks, offline/error/available/progress states, keyboard and narrow viewport                   |
| Permissions    | Local update-window-only commands; fixed HTTPS endpoint                   | Generated ACL and remote capability inspection, hostile URL tests                                                              |
| Release        | Four target signatures, hashes, complete feed, monotonic publication      | Node contracts; four OS CI packaging jobs; no production key in PR jobs                                                        |
| Optimization   | Desktop-only Rust library format                                          | Before/after outputs and build measurement, no invented runtime improvement                                                    |
| Deployment     | First updater installer and subsequent update                             | Owner-approved release plus installed old-to-new proof; source/CI alone do not prove this                                      |

The owner requested the new bootstrap download after merging Hub #577. A
versioned unsigned preview may be published for manual installation and installed
qualification after its release receipts verify. The automatic update channel
must remain inactive until installed old-to-new replacement/relaunch is proven.
Publishing that bootstrap download alone does not satisfy the Deployment row or
establish automatic update runtime proof.

## Design and sources

GitHub Releases is the existing distribution service. Its documented release
bandwidth policy avoids a new download bill. Conditional metadata requests reduce
transferred bytes; they still make a request. Four background checks per day per
continuously running app plus startup checks bound normal traffic. The hosted
web app continues to deploy independently; web-only changes do not rebuild Rust.

- https://v2.tauri.app/plugin/updater/
- https://v2.tauri.app/release/@tauri-apps/cli/v2.12.0/
- https://docs.rs/tauri-plugin-updater/2.14.0/tauri_plugin_updater/
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

## Review

Standards pass 1: scoped desktop boundary, no DB/auth changes, unsigned OS policy
preserved, explicit release approval retained. Pass 2: the implementation preserves those boundaries; generated IPC tests deny hosted and external callers. No DB/auth, credential-admission or production web changes were introduced. Independent review and owner merge remain pending.

Spec pass 1: startup installation and active notification match the request;
metadata remains static and bounded. The one-time bootstrap and Debian package
manager boundary are explicit. Pass 2: ten native tests and eleven release contracts pass; actual-component UI qualification covers progress, retry/continue/download, keyboard access and narrow layout. Source is Hub PR #577. The web test run passed 7,843 tests (263 skipped), plus three architecture tests; the full production build and both client-boundary checks passed. Final candidate `c0528fed` passes all four native test/packaging targets and complete web CI. Downloaded candidates have five verified installer hashes and four verified updater signatures/signed versions; see `specs/evidence/hub-desktop-updates-2026-10-21/ci-artifacts.json`. Installed update/relaunch proof remains a separate, pending publication prerequisite.

## Out of scope

Paid OS publisher signing, notarization, binary delta patches, app-store delivery,
mobile shells, application/database migrations and automatic restart of an active
editing session are outside this change. Hosted web deployments remain independent.

## Live Linux qualification update

The owner explicitly requested installed automatic-update testing after
bootstrapping 0.0.2. The proposal records a bounded Linux-only feed activation
exception to the original all-target preactivation gate. Installed 0.0.2 → 0.0.3
download, integrity verification, AppImage replacement and restart passed.
Native available/current notices and Continue were exercised. Full receipts and
real native screenshots are in
`specs/evidence/hub-desktop-updates-2026-10-21/README.md`.
Windows/macOS native upgrade qualification, the six-hour timer observation and
the host's AT-SPI inspection abort remain explicitly unqualified. The source
installation TODO and proposal continue to track the operating-system gap; the
qualification observer has the matching native-accessibility handoff comment.
