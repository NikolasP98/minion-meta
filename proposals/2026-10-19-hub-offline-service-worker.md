---
id: 2026-10-19-hub-offline-service-worker
title: Offline shell for the installed hub (service worker that survives deploys)
status: draft
created: 2026-10-19
updated: 2026-10-19
repos: [minion_hub]
tags: [infra, ux]
value: 4
effort: M
source: specs/028-hub-app-feel-shell
---

# Offline-capable installed hub

## AS-IS
Spec 028 made the hub installable with no service worker on purpose: a cached HTML shell could serve a stale deploy and fight the deploy-skew reload guard. Offline, the installed app shows the browser's error page.

## TO-BE
The installed hub shows a branded "you're offline" shell and recovers automatically; it never serves stale application HTML after a deploy and never caches authenticated API responses.

## DELTA
SvelteKit `src/service-worker.ts` caching only versioned immutable assets + an offline fallback page, network-first for navigations, versioned by `$service-worker` `version`; proof across a deploy boundary on a preview.
