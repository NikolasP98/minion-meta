---
id: 2026-10-09-native-formatting-coverage
title: Establish meaningful iOS and shared Swift formatting coverage
status: draft
findings: [TQ-009]
created: 2026-10-09
updated: 2026-10-09
repos: [minion]
tags: [test]
---

# Establish meaningful iOS and shared Swift formatting coverage

## AS-IS at proposal start

The checked-in iOS Xcode SwiftFormat phase passes a file list containing iOS/shared files to root `.swiftformat`, which excludes both trees. A verified run exited zero while formatting no files, so the phase did not provide meaningful coverage.

GW030's release-gate correction removes the no-op phase and makes the package command's actual macOS scope explicit. Native SwiftLint/build/tests must remain. This removes a false-green claim; it does not establish iOS/shared formatter coverage.

## TO-BE

A separately reviewed native formatting contract processes the intended handwritten iOS/shared sources with the same pinned formatter. Generated sources remain protected by protocol-generation checks. The gate must fail if the intended target set is empty or a representative malformed source is accepted.

## DELTA

Inventory the intended source set and legacy formatting debt, define an explicit iOS/shared profile, apply a coherent formatting-only migration with review, then enable a gate that proves nonzero coverage. Include a malformed-file mutant and generated-file exclusion assertions. Preserve native build/test behavior and cross-platform protocol generation. Do not restore the former empty Xcode phase or turn a formatter failure into a success through catch/skip handling. The exact-site TODO in the iOS project file points here until the meaningful replacement is qualified.
