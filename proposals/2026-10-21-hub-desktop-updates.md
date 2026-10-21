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
