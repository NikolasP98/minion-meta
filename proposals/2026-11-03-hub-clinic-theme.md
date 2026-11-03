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
light and dark modes. `packages/design-tokens/contract.json` has 18 theme modes;
Hub's `src/lib/themes/presets.ts` lists 16 and installs an older pinned tarball.
Categorical colors are global; status recipes vary only by mode.

## TO-BE

Offer Clinic Light and Clinic Dark in the existing appearance picker. Match the
references with cool blue surfaces, cobalt actions, rounded panels, soft shadows,
and complementary lilac/cyan/rose/mint data colors. Keep all tokens resolved,
readable text, preference persistence, accent customization, and older themes.

## DELTA

1. Extend the shared contract with a complete Clinic pair, optional status recipe
   selection, and complete categorical overrides with reset behavior.
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
