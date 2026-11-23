---
id: 2026-11-21-hub-white-label
title: Organization names throughout Hub
status: done
created: 2026-11-21
updated: 2026-11-23
repos: [minion_hub]
spawned_spec: 2026-11-21-hub-white-label-spec
tags: [data, security]
---

# Organization names throughout Hub

The owner requested a Speckit + EGM run to replace MINION text with an organization-controlled short name. Faces should see Faces Hub, with Hub fixed and MINION as the default. Organization creation should suggest the organization name and enforce a name that fits.

## AS-IS

The local Hub source hardcodes product names in the sidebar/mobile header, logo text, public task shell, titles, marketplace badges and CSS watermarks. Appearance preferences are per user, while the full organization name allows 2–80 characters. Source paths/hashes and current-state limitations are recorded in [research](../specs/145-hub-white-label/research.md) and [coverage](../specs/145-hub-white-label/coverage.md). This is not a claim about deployed runtime.

## TO-BE

One short organization-owned prefix appears across Hub text identity, with the fixed Hub suffix. Default resolution is explicit override, valid organization name, then MINION. Fifteen visible characters is the proposed limit; actual layouts must prove accepted names remain readable. Owners edit the shared name in Appearance; administrator organization creation proposes it. Preserve the full organization name.

## DELTA

Add an optional organization override, guarded owner-scoped writer covering both the new prefix and existing full-org-name source of automatic branding, request-owned identity through the existing SPA route-data flow (documented SSR exception), onboarding suggestion/editor and complete text-consumer conversion. No production backfill is needed for existing short org names. Full [spec](../specs/145-hub-white-label/spec.md), [plan](../specs/145-hub-white-label/plan.md) and [tasks](../specs/145-hub-white-label/tasks.md) define the behavior and tests.

## Scope and completion

Text identity in Hub web UI only. No logo/favicons/colors, native installer rename, custom domains, marketing-site changes or external messages. Technical identifiers, separate service names, legal/contact details and user/historical content retain their meaning.

Definition of done: all identity inventory entries converted; Faces/default/owner-edit/create/retry/two-org boundary cases pass; maximum-length layouts are measured; localization, access, design-token and existing application gates pass; independent Standards/Spec review and human merge precede deployment proof.

The owner approved implementation and scoped release on 2026-11-22: “approved. lmk when its all live”. All three implementation slices shipped through Hub PRs #707, #708 and #709 on 2026-11-23. Final production deployment is Ready at hub.minion-ai.org; authenticated title, wordmark and shared Appearance editor were verified read-only. Exact CI/deployment/runtime evidence and the documented SPA and Storybook follow-ups are tracked in the spec package.
