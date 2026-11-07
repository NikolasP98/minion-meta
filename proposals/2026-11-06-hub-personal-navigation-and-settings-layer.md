---
id: 2026-11-06-hub-personal-navigation-and-settings-layer
title: Personal navigation and a separate Settings layer
status: in-spec
created: 2026-11-06
updated: 2026-11-06
repos: [minion_hub, minion-meta]
source: owner-request-2026-11-06
tags: [ui, permissions]
---

# Personal navigation and Settings layer

## AS-IS

The picker omits empty sections. Everyone can pick the full development-oriented sidebar. Settings competes with module navigation in a second column. Evidence and affected files are in `../specs/2026-11-06-hub-personal-navigation-spec.md`.

## TO-BE

Deploy complete permission-filtered section discovery and personal navigation. Restrict Todas las secciones to owner/admin/manager. Workshop Settings in the existing FigCraft project before any Settings implementation.

## DELTA

Navigation implementation/qualification follows the linked spec. Settings is deliberately design-only: avatar menu entry, a settings-only sidebar, and Back restoring prior context. Existing views copied into a new page of `.local/figcraft/minion-hub.figcraft`.

## Cross-check

Overlaps the 2026-10-28 org/module/nav-home proposal and open Hub PRs #602, #626, #628, #630. This change leaves the /home → /chat rename and dynamic landing resolution untouched. Personal home uses /account/home. Existing permission and shared organization configuration writes remain authoritative.

## Settings workshop

Page: Settings · AS-IS → TO-BE · 2026-11-06. Review-only, with prototype Avatar → Settings → Back. Implementation is intentionally excluded pending the owner's workshop feedback; this is an explicit stage boundary, not an unwired production change.
