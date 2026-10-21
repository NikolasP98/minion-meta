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
configuration, local-only updater IPC and the release workflows. It depends on
[Hub PR #576](https://github.com/NikolasP98/minion_hub/pull/576).

Ten Rust tests pass on all four targets and eleven release contracts pass.
The full Hub CI run also passes. Downloaded CI candidates have five verified
installer hashes and four verified updater signatures/signed versions; evidence
is in `specs/evidence/hub-desktop-updates-2026-10-21/ci-artifacts.json`.
Source/CI qualification
is separate from installed old-to-new package replacement and relaunch on Linux,
Windows and both macOS targets. That installed proof remains required before the
first updater publication. The exact native installation site carries
`TODO(handoff)` with this proposal's ID. No new desktop release is published by
this implementation task. Version 0.0.1 remains the public bootstrap limitation.
