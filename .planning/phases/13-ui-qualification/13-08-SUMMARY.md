---
phase: 13-ui-qualification
plan: "08"
requirements: ["UI-03", "UI-06", "UI-07"]
requirements-completed: []
status: locally-qualified-awaiting-font-recheck
---

# Site graph, files and native tooling

The ordinary Site candidate is `/tmp/minion-13-08-dn7zbntf/minion_site`. The original twelve-file freeze is `checks/final.json`, SHA256 `fc12f596865e7d91363ec2ccc44302f4ca86ca4e54de64cec0e3dd6b97148667`. Frozen copies are in `checks/frozen-source/`. A bounded formatter supplement extended ownership to thirteen files; its receipt is `checks/formatter/final.json`, SHA256 `d58b9aec5b098304b072f05517d300a3cbf1ca0cd923184c9e7ffaa80b5509ac`.

Graph lifecycle now fences agent/connection/lifetime changes, disposes late imports and observers, offers explicit retry, uses DOM text for untrusted tooltip content, and follows live reduced-motion/theme changes. Its text summary and Retry control meet the measured touch-target requirement. The actual gateway snapshot returns relationships with `fromId`, `toId` and `relType`; the old Site expected `source`, `target` and `relation`. The display adapter accepts the canonical shape and valid legacy shape, rejects conflicting mixtures, and preserves the wire object. Null labels are invalid; omitted/empty legacy labels can fall back to the node ID.

Files fences list and content requests by lifetime, selection, agent and connection. Old data cannot publish under a new file or agent, and disconnect/unmount clear ownership. No real file requests or mutations were performed.

The combined native Site suite passes **40/40 cases**: Graph 12, Files 5, AppBar 8, logout 13 and existing identity 2. Both guarded native execution and the normal declared test command pass. Browser qualification passes **18/18 cases** across Chromium 149, Firefox 151 and Linux WebKit 26.5. These exercise real components, canonical relationships, late chunk loading, themes, motion and AppBar failure/retry at 390/1280 widths. Scoped Svelte reports zero errors/warnings; the existing csrf configuration deprecation is recorded separately.

**Evidence correction:** the original standalone browser artifact omitted Google's Barlow font stylesheet. Its geometry used fallback fonts. Plan 13-12 self-hosts the existing product families and repeats the affected matrix with actual loaded-face proof. These original behavior results do not close actual-font parity or authenticated application routing.

Native Vitest 2 introduced nested Vite 5 types incompatible with the installed Svelte plugin's Vite 6 requirement. The candidate uses Vitest 3.2.6, retains Vite 6.4.2/Svelte 5.55.9/plugin 5.1.1, and removes duplicate Vite 5/esbuild. Happy DOM and Playwright are declared development tools. The existing ws 8.20.0 optional-peer resolution is preserved. No cast or replacement compiler hides the mismatch. Better Auth's existing optional Vitest peer can materialize testing packages during production-only Bun installs; that is not proof of browser bundle inclusion.

The formatter supplement declares prettier-plugin-svelte 4.1.1 and extends the installed shared preset. Focused files pass. Global format check reports 289 style warnings in files byte-identical to the active baseline, with zero Svelte parser errors. Root added a separate comment-only handoff in prettier.config.cjs and a matching platform proposal; no mass formatting occurred.

Site has no canonical lint:tokens script; direct installed-token reference resolution passed and is labelled accordingly. Original active source inputs and preserved dependency links were checked; private installs use a fresh local node_modules tree. No full pre-change byte inventory of external dependencies is claimed. Chat now exclusively owns messages and vitest.workspace.ts; fonts owns its admitted package/lock/CSS/head/fixture subset. Original frozen receipts remain historical identities.
