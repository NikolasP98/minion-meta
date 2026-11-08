---
id: 2026-11-06-hub-personal-navigation-and-settings-layer
title: Personal navigation and a separate Settings layer
status: in-spec
created: 2026-11-06
updated: 2026-11-08
repos: [minion_hub, minion-meta]
source: owner-request-2026-11-06
tags: [ui, permissions]
---

# Personal navigation and Settings layer

## AS-IS

The picker omits empty sections. Everyone can pick the full development-oriented sidebar. Settings competes with module navigation in a second column. Evidence and affected files are in `../specs/2026-11-06-hub-personal-navigation-spec.md`.

## TO-BE

Complete permission-filtered section discovery and personal navigation are deployed. Todas las secciones is restricted to owner/admin/manager. The Settings workshop in the existing FigCraft project was reviewed and approved; implement its separate primary navigation layer.

## DELTA

Navigation implementation/qualification follows the linked personal-navigation spec. The approved Settings layer adds an avatar menu entry, a settings-only primary sidebar, and Back restoring prior context, following `../specs/2026-11-07-hub-settings-navigation-layer-spec.md`. Existing views were copied into a new page of `.local/figcraft/minion-hub.figcraft` for the completed workshop.

## Cross-check

Overlaps the 2026-10-28 org/module/nav-home proposal and open Hub PRs #602, #626, #628, #630. This change leaves the /home → /chat rename and dynamic landing resolution untouched. Personal home uses /account/home. Existing permission and shared organization configuration writes remain authoritative.

## Settings workshop

Page: Settings · AS-IS → TO-BE · 2026-11-06. Prototype Avatar → Settings → Back. The owner reviewed the UI and approved implementation/deployment; the Settings implementation spec now owns verification and release.

## Navigation release

Hub #639 merged as fac6ad07ffe51c152c1f59626ad3147d8723ba1c after the owner explicitly approved the GitHub admin merge override. Vercel dpl_GR8N6BkUrJoNPuDysTQmcGWdZQWE is READY and serves hub.minion-ai.org. The linked spec and evidence manifest record 9018 passing tests, independent review and 18 passing local QA browser assertions. This navigation release preceded the approved Settings implementation. Settings release state is recorded in its own linked spec.

## Settings workshop approved

The owner reviewed the proposal UI and explicitly requested “apply and deploy” on 2026-11-07. This supersedes the earlier Settings deferral. Implementation and verification follow `../specs/2026-11-07-hub-settings-navigation-layer-spec.md`. The existing deployed personal navigation remains in scope only as a compatibility boundary.
