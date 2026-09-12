---
id: 2026-09-12-gateway-native-swift-qualification
title: 'Qualify the Gateway native Swift toolchain separately from server runtime'
status: draft
created: 2026-09-12
updated: 2026-09-12
repos: [minion]
---

# Native Swift qualification

DEVdd9dde24 macOS TypeScript tests passed13031 cases with nine existing skips, including all40 repaired cases. The consolidated job subsequently failed SwiftFormat0.63.0 against116 of208 untouched native files, spanning17 rules. Native Swift build/tests were not reached. Workflow and precommit use an unpinned PATH/Homebrew formatter; no declared version or known-good executed formatter baseline was found. The latest successful DEV workflow examined skipped macOS, and eight recent executed macOS jobs failed. Those facts do not justify inventing a downgrade pin or disabling formatting rules.

The authorized current deployment targets the Linux Gateway Docker services. It uses actual gateway/runtime/security/protocol/image checks and separately records the failed native-app job. The overall cross-platform CI run is not certified green, and no native macOS app release is made.

Bounded next scope: establish intended SwiftFormat/SwiftLint/Xcode versions from maintained native-app requirements and actual native qualification. Pin immutable verified tools where appropriate; review a native-only formatting change separately if needed; then run formatter, lint, native build and native tests at one exact source/toolchain identity. Keep changes outside the current gateway security packet. Do not use broad formatting, an arbitrary older version or disabled checks to make a runtime deployment appear fully qualified.

A separately committed, unadopted CI comment points to this proposal at the exact tool installation/qualification site; it changes no behavior and triggers no release. Record its source identity in the priority-delivery report before handoff. Completion requires reproducible native-app checks and explicit release qualification; passing TypeScript alone is insufficient.

Exact unadopted handoff: signed local commit1ed362a32db68aa1e58f36e8b9121b45108c380b, parentDEVdd9dde24. Four comments beside the macOS Homebrew tools step; parsed YAML is semantically identical to the parent. Patch and receipt are archived in.planning/operations/360/priority-delivery-2026-09-12. No push, PR or workflow trigger occurred.
