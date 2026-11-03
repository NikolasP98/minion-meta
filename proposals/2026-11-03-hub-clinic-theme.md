---
id: 2026-11-03-hub-clinic-theme
title: Clinic Light and Clinic Dark themes for Hub
status: in-spec
created: 2026-11-03
updated: 2026-11-03
repos: [minion-meta, minion_hub]
spawned_spec: 2026-11-03-hub-clinic-theme-spec
---

# Clinic Light and Clinic Dark themes for Hub

## AS-IS

The user supplied Cliniko scheduling, Clinic landing/dashboard, and Cosmasol
billing references and requested a new Hub theme covering every design token in
light and dark modes. The pre-change baseline and historical Hub checkpoint are
recorded in the [specification](../specs/2026-11-03-hub-clinic-theme-spec.md#1-as-is).

## TO-BE

Offer Clinic Light and Clinic Dark in the existing appearance picker. Match the
references with cool blue surfaces, cobalt actions, rounded panels, soft shadows,
and complementary lilac/cyan/rose/mint data colors. Keep all tokens resolved,
readable text, preference persistence, accent customization, and older themes.

## DELTA

1. Extend the shared contract with a complete Clinic pair, optional status recipe
   selection, and complete categorical overrides with reset behavior, as defined
   in the [package reference](../packages/design-tokens/README.md#clinic-themes).
2. Generate and package CSS; update Hub's pinned artifact and expose the modes.
3. Verify contrast, installed-artifact parity, theme switching, and rendered
   production components at desktop and mobile widths.

## Out of scope

No dashboard restructuring, medical data features, default-theme change, merge,
deployment, or npm publication. Preserve concurrent work in both checkouts.

## Definition of done

The paired themes are selectable and persist through the existing preference
system. Every token resolves; design gates and focused theme tests pass. Record
browser evidence and broader validation outcomes in the linked specification.

## Inherited validation findings

These findings came from the validation tool's default-branch history range;
they are separate follow-up work. Neither auditor semantics nor Shells security
behavior is changed by this theme implementation. Both sites carry matching
`TODO(handoff)` comments.

- **R5 — token producers.** AS-IS: `packages/design-tokens/audit.mjs` treats
  contract JSON keys as declarations, so a key such as `--page-max` can mask a
  missing CSS producer. TO-BE: accept shared tokens only when emitted CSS defines
  them. DELTA: add a package-consumer regression with a JSON-only token, reject
  it, and retain valid alias/cross-file resolution. The Clinic proof independently
  checks all 169 computed properties and does not depend on this inference.
- **R6 — durable journal containment.** AS-IS:
  `packages/shells-bridge/src/config.ts` compares the unnormalized harness workdir;
  `/srv/agent/./state` can admit `/srv/agent/state/journal.db` inside the tree that
  a restore replaces. TO-BE: reject journal paths within the canonical restorable
  tree. DELTA: obtain the required human security approval, normalize paths and
  existing directory aliases, and test dot segments, symlinks, parent aliases,
  and an accepted external journal before a separately reviewed merge.
