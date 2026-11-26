---
id: 2026-11-25-hub-sandbox-custom-element-exfiltration
title: Sandbox custom elements can send the viewing admin's data out by navigating their own frame
status: approved
created: 2026-11-25
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, test]
value: 7
effort: M
source: automated-security-review-2026-11-25
---

# Sandbox custom elements can exfiltrate data by frame navigation

## Problem

An automated security review (2026-11-25, on a read-only snapshot of hub master `133c4154`) flagged
the custom-element iframe. Verified by reading the code; **not fixed, not exploited, not tested live**.

## AS-IS

| Fact | Anchor |
|---|---|
| A custom element's stored `html`/`js` runs inside `<iframe sandbox="allow-scripts">`. | `src/lib/components/sandbox/ElementFrame.svelte:114`; `src/lib/sandbox/srcdoc.ts:121-124` |
| Its CSP sets `connect-src 'none'`, which blocks fetch/XHR/WebSocket, but CSP does not stop the frame from navigating itself (`location.href = 'https://…?d=' + data`). | `src/lib/sandbox/srcdoc.ts:111` |
| The bridge answers the frame's data queries with the **viewing user's** permissions and org scope. | `src/lib/sandbox/bridge.ts`; `/api/sandbox/query` |
| Since spec 136, an MCP caller holding an org API key with the `sandbox` scope can write `html`/`js` (`sandbox_element_write`), and so can any admin. | `src/server/mcp/sandbox-tools.ts:68-77,117-152` |

So code written by one party (an API key, or another admin) can read data as whoever opens
`/sandbox` and send it out in a navigation. Today `/sandbox` is admin-only, which limits who views
it, not who can be read from.

## TO-BE

Stored element code cannot move data out of the frame, and code written by a key or another user
does not run with the viewer's data access until the viewer has approved that version.

## DELTA (options, to be decided in a spec)

1. Detect navigation of a registered frame (its `load` fires again after the first load) and tear it
   down / stop answering its bridge queries.
2. Do not answer bridge queries for elements written by an API key (`written_by_key is not null`) or
   by another user until the viewer approves that code version.
3. Restrict key callers to block specs (data only, rendered natively, no code) — the block kit and
   synced pages (spec 150) already cover most dashboard needs.
4. Longer term: serve element documents from a separate sandbox origin with response-header CSP
   (`form-action 'none'`, navigation limits where supported).

Proof for each: a hostile fixture element that tries `location.href`, `window.open`, form submit and
`<a target>` navigation, asserting no request leaves the frame with query data.

## Out of scope

Synced pages (spec 150) does not touch custom elements; this is a separate fix.

## Definition of done

A spec chooses among 1–4; a hostile-element test fails on master and passes after the fix.
