---
id: 2026-10-21-hub-desktop-updates
title: Hub desktop automatic updates
status: in-spec
created: 2026-10-21
updated: 2026-10-21
repos: [minion_hub]
tags: [ui, infra, test, security]
value: 8
effort: M
spawned_spec: 2026-10-21-hub-desktop-updates-spec
source: owner-request-2026-10-21
---

# Hub desktop automatic updates

## AS-IS

Published `desktop-v0.0.1` loads the hosted Hub but has no native updater.
`src-tauri/src/lib.rs` initializes deep links and native menus only.
PR #576 removes platform signing gates; its unsigned installer policy remains in force.
Cargo already enables size optimization, stripping, one codegen unit and full LTO.

## TO-BE

Install a newer desktop binary automatically at startup, with visible progress and
offline recovery. Check cheaply while running; notify without interrupting work.
Keep downloads in the Hub repository's Releases page. No paid signing account,
new service, database, application API or bundled server is required.

## DELTA

Implement the linked spec, including free updater integrity signatures, static
GitHub metadata, bounded conditional requests, isolated native update UI, release
assembly contracts and measured Rust build optimization. Version 0.0.1 requires
one manual bootstrap install; it cannot update code it does not contain.

## Qualification

Implementation and four-target packaging CI are complete; installed update
qualification remains open. Do not advertise an
automatic update as deployed before an approved updater-enabled release and
installed old-to-new update proof exist.

## Implementation and remaining qualification

[Hub PR #577](https://github.com/NikolasP98/minion_hub/pull/577) contains startup
installation, active checks and notices, a static GitHub feed, integrity-key
configuration, local-only updater IPC and the release workflows. It merged as
`b7990051`; [Hub PR #576](https://github.com/NikolasP98/minion_hub/pull/576)
was closed as superseded because #577 already included its unsigned-installer
changes. The merged tree matches the qualified candidate exactly. Post-merge
[Hub CI](https://github.com/NikolasP98/minion_hub/actions/runs/39555999713) passes.

Ten Rust tests pass on all four targets and eleven release contracts pass.
The full Hub CI run also passes. Downloaded CI candidates have five verified
installer hashes and four verified updater signatures/signed versions; evidence
is in `specs/evidence/hub-desktop-updates-2026-10-21/ci-artifacts.json`.
Source/CI qualification
is separate from installed old-to-new package replacement and relaunch on Linux,
Windows and both macOS targets. That installed proof remains required before the
first automatic update-channel activation. The exact native installation site
carries `TODO(handoff)` with this proposal's ID.

## Bootstrap download requested after merge

The owner requested the new version's download after merging #577. Version 0.0.2
was built from `b7990051` by
[the desktop release workflow](https://github.com/NikolasP98/minion_hub/actions/runs/39560245259).
The complete draft was downloaded and verified before publication. The unsigned
[0.0.2 bootstrap preview](https://github.com/NikolasP98/minion_hub/releases/tag/desktop-v0.0.2)
is public for manual installation and installed qualification. All 15 public
assets return HTTP 200 without authentication and match their recorded digests;
five installers and four updater payload signatures/signed versions verify
against the production public key. Source is exactly
`b7990051ac54d88d6c55c7b3c8a76904fed040bc`. Evidence is in
`specs/evidence/hub-desktop-updates-2026-10-21/bootstrap-release.json`.

This publication does not advance `desktop-updates/latest.json` or advertise
automatic updates as deployed. The public notes state that the channel remains
inactive. Keep it inactive until installed replacement/relaunch proof is complete.

## Owner-requested live Linux qualification

The owner installed 0.0.2 and explicitly requested a new release to exercise the
client's automatic download, replacement and restart. This authorizes a bounded
first channel activation for installed qualification: build 0.0.3 from the same
approved source, verify every versioned asset, publish the immutable preview,
and advertise only `linux-x86_64` in the mutable channel during this test.
Windows and both macOS targets remain excluded until installed qualification.
The versioned release retains its complete four-target manifest. Expanding the
channel later requires a newer version because publication rejects changes at
the same version. This is a qualification exception to the previously inactive
channel gate, not a claim that every operating system is qualified.

The installed 0.0.2 AppImage and launcher have private rollback copies before
activation. Evidence must distinguish client-driven installation from operator
file replacement. Capture the installed hash before and after, native process
replacement, updater state, launcher/profile continuity and public feed identity.
If installation fails, stop channel rollout and retain the original package.

## Native accessibility compatibility

During installed Linux qualification, requesting the native AT-SPI tree caused
two AppImage processes to abort. PID 1451691 exited with SIGABRT; its journal
reports `atk-bridge: get_device_events_reply: unknown signature`, followed by a
libdbus message-signature assertion (`a(sss)`). Systemd's trace ends in bundled
`libdbus-1.so.3`; this establishes an abort in that dependency path, not its root
cause. Available memory was 11 GiB when checked. No profile reset or data write
was performed. The system-managed core remains private and was not extracted.

Visible-window update qualification temporarily launches the unchanged package
with `NO_AT_BRIDGE=1` in a transient user service. The permanent desktop launcher
and system accessibility settings remain unchanged. Therefore this exercise
cannot qualify assistive-technology compatibility. Reproduce and repair the
AppImage/host accessibility interaction, then repeat native tree assertions on
the regular launcher. The qualification observer contains the matching
`TODO(handoff)` at the missing native-accessibility assertion site.
