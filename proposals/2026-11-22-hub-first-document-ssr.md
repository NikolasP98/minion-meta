---
id: 2026-11-22-hub-first-document-ssr
title: Render verified Hub identity in the first HTML document
status: draft
created: 2026-11-22
updated: 2026-11-22
repos: [minion_hub]
tags: [ui]
---

# Render verified Hub identity in the first HTML document

## AS-IS

Hub master `5347ff0148a3600fd3963d94db57e95c8e5a2779` exports `ssr = false` in `src/routes/+layout.ts:17`; its telemetry imports rely on browser execution. The first `/en/login` HTML document contains an empty application shell, and authenticated data/rendering is client initialized. Spec 145 overlooked this when requiring JavaScript-disabled branding proof.

## TO-BE

Render verified tenant identity in actual initial HTML with request isolation and no tenant information inferred from untrusted URL/cookie hints. Preserve telemetry, browser-only components and route behavior.

## DELTA

Audit browser globals and imports across root/layout/route components, define SSR-compatible loading boundaries, then enable real rendering with JS-disabled and hydrated two-org tests. Do not substitute an injected title or artificial noscript wordmark for server-rendered application qualification. Keep the existing SPA naming delivery qualified independently.

Source handoff: `src/routes/+layout.ts` TODO(handoff). Discovered during approved `145-hub-white-label` implementation; current naming release retains the pre-existing SPA architecture.
