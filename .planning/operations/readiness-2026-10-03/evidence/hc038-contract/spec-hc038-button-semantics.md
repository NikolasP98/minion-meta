---
id: 2026-10-03-readiness-button-consumer-semantics-spec
title: Preserve shared Button consumer roles and roving focus
stage: spec
status: draft
pass: 1
verdict: pending
created: 2026-10-03
updated: 2026-10-03
repos: [minion-meta, minion_hub, minion_site]
tags: [ui, logic, test]
type: fix
proposal: 2026-10-03-readiness-shared-ui-boundaries
---

# Shared Button consumer semantics

## 0. Product

A consumer that renders a switch, menu item, option or radio through Button must retain its accessible role and roving tabindex. Disabled and loading controls must still prevent activation. This is HC-038, discovered through the actual FlowExports mounted test during HC-026 verification.

## AS-IS

`meta/packages/ui/src/lib/Button.svelte` spreads rest props, then unconditionally writes role and tabindex. Enabled controls receive undefined values, erasing consumer role and tabindex. Disabled links are forced to role link and tabindex -1. The same Button bytes are packed in Hub `deps/minion-stack-ui-0.1.0-ui-coherence-6b21ce0e.tgz` and Site `deps/minion-stack-ui-0.1.0-r2.tgz`; parent inspection found no Button differences across these baselines. Their other package files are not assumed identical.

`hub/src/lib/components/flow-editor/FlowExports.svelte` renders the Report action as role switch. The baseline actual mounted test fails to find that role. Captured output is `hc026-route-panels-v1.log`; its separate mention-cache rejection is HC-039, not evidence of this Button defect.

Current native disabled buttons use the disabled property. Disabled or loading links retain an anchor, remove href, add aria-disabled and tabindex -1, and the click handler prevents default and propagation. Existing aria-busy and styling behavior must remain intact.

## TO-BE

Explicit role and tabindex are typed public props using Svelte's HTML attribute types, destructured before the rest spread. Attribute precedence is exact:

| Element/state | role | tabindex | activation |
| --- | --- | --- | --- |
| Enabled native button | supplied role, otherwise native button semantics | supplied tabindex, otherwise native default | existing native click/form behavior |
| Disabled/loading native button | supplied role, otherwise native button semantics | supplied tabindex; native disabled still prevents focus/activation | blocked by native disabled and handler |
| Enabled link | supplied role, otherwise native link semantics | supplied tabindex, otherwise native default | existing native navigation/click |
| Disabled/loading link | supplied role, otherwise explicit link fallback after href removal | always -1, even when consumer supplied 0 | no href; handler blocks click, propagation and default |

Loading continues to set aria-busy. Disabled/loading links continue to set aria-disabled. No keyboard handler is added to emulate a button on anchors. No key aliases, arbitrary roles, or new design tokens are introduced. Caller aria-label, aria-checked, aria-selected and event callbacks remain intact. Button type remains button by default and explicit submit/reset behavior is unchanged.

## DELTA

1. Change only typed role/tabindex props, their destructuring and the two final attributes in the canonical Button. Remove the HC-038 handoff comment only once this behavior is implemented and qualified.
2. Add real SSR and mounted/native tests for supplied switch/menuitem/option/radio roles, tabindex -1/0, ordinary native defaults, and reactive enabled/disabled/loading transitions. The original Button must fail role/roving-focus assertions.
3. Build canonical UI with its pnpm package commands. Produce bounded local package overlays for each exact Hub/Site baseline. Only built Button.svelte, its declarations, and necessary package-version metadata may differ; all other tar members remain byte-identical to that consumer's baseline. Bind source, baseline, overlay and packed/installed bytes in a pinned receipt; verify metadata, removals and added files explicitly. No npm publication.
4. Adopt reviewed artifacts and lockfiles in Hub/Site. Restore the FlowExports role-based query in the actual mounted integration test after the corrected artifact is installed; it must execute the real switch action and preserve exact request behavior. Add the durable lesson to both canonical and Hub UI governance: shared primitives must preserve consumer semantics while disabled state owns activation and focus exclusion.

## Verification

- SSR inspects the actual rendered control, not source substrings, for all table rows. Meaningful original-artifact failure is retained.
- Mounted tests prove supplied attributes update after rerender, callbacks execute exactly once while enabled, disabled/loading clicks cannot invoke callbacks or submit, and re-enable recovers. Native button default type and explicit submit retain their intended form behavior.
- Chromium evidence uses the actual packed Button and actual FlowExports control with synthetic data/HTTP. Real Tab skips roving -1, reaches roving 0, and excludes disabled/loading anchors; Enter/Space follows native element semantics. No production session or data writes. Capture before/after accessibility and focus screenshots plus exact source/package hashes.
- Exact consumer artifact tests fail on missing/changed/extra overlay member, stale package or lockfile, altered runtime/declaration, and altered receipt allowlist. A checksum-only test that allows an empty expected member list is insufficient.
- Canonical package build/type/test and Hub/Site targeted tests, configured checks/builds and design/token gates pass. Review adjacent menu, option, radio and switch consumers plus href, loading, forms, focus and event forwarding; no unrelated primitive upgrade may ride in the artifacts.

## Out of scope

HC-039 mention-cache ownership, generic keyboard behavior for non-native ARIA widgets, changing any consumer's intended role or selected state, redesigning buttons, new notification UI, package publication, merge or deployment. Newly exposed preexisting consumer defects must be recorded in the register and fixed under their own bounded scope; they cannot be hidden by weakening these assertions.
