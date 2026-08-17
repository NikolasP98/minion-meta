---
id: 2026-08-17-gw-whatsapp-cloud-template-fallback
title: WhatsApp Cloud: auto-fallback to template when the 24h window is closed
status: in-spec
spawned_spec: 2026-08-17-gw-whatsapp-cloud-template-fallback-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, edge-case]
value: 5
effort: M
source: debt-sweep-2026-08-17
---

# WhatsApp Cloud: auto-fallback to template when the 24h window is closed

## Problem

extensions/meta-graph/src/channels/whatsapp-cloud/api.ts:5 — sendWhatsAppTemplate exists as a manual escape hatch; no automatic catch of the window-closed error code with template retry (the Phase 3 TODO).

## Definition of done

Wrapper catches the window-closed error from graphSend and retries via sendWhatsAppTemplate; unit test mocks the error and asserts the fallback fires.

## Out of scope

Template management UI.
