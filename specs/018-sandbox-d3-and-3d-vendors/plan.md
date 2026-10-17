# Implementation Plan: Sandbox vendors — slim d3 and ECharts GL

**Spec**: `spec.md` | **Date**: 2026-10-16 | **Repo**: minion_hub, branch `feat/sandbox-d3-3d` → `feat/sandbox-pages-poc` (hub #542), worktree `~/.cache/claude-tmp/hub-d3`; live proof from `~/.cache/claude-tmp/hub-sb` (`dev:local`, :5199)

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS |
| II AS-IS/TO-BE/DELTA with evidence | PASS |
| III Slice-scoped | PASS — S1 d3, S2 3D (+CSP), S3 model text, S4 benchmark; three commits on one branch |
| IV Required build steps | prettier; `vitest run src/lib/sandbox src/lib/assistant src/lib/state/features/assistant-context.test.ts`; `bun run check` (6 GB); `bun run build` once (asset emission); no `.svelte` change ⇒ no design lint |
| V Security gates | tagged: one CSP keyword (`'unsafe-eval'`) inside the sandboxed frame; owner gate of #542 covers it |

## Design decisions
- **D1 Prebuilt slim d3 in `static/`, not a Vite chunk.** A `?url` import of a TS entry ships the file untransformed (ESM with bare imports) — a classic `<script src>` in the frame cannot run it, and in `vite dev` it would be served through the transform pipeline. `bun build --format=iife --minify` (bun is the package manager, nothing new) produces one self-contained file that assigns `window.d3`, which is exactly what `minion.load` expects. Trade: a committed 196 KB artifact and a `must-revalidate` URL instead of a hashed immutable one; the vitest that executes the committed file is the staleness guard.
- **D2 Module set = what a bespoke chart needs and nothing the frame cannot feed.** Kept: selection, scale, scale-chromatic, shape, axis, array, format, time-format, hierarchy, force, transition, interpolate, drag, zoom. Dropped: geo/fetch/dsv (no network), brush/contour/delaunay/chord (rare). `d3-scale-chromatic` costs 20 KB raw / 7 KB gz and was kept because the theme has no sequential ramp for heatmaps.
- **D3 echarts-gl over three.js.** Same option vocabulary the model already uses, same instance (`echartsGl` resolves to `echarts`), 3D chart primitives built in (bar3D, scatter3D, line3D, surface, globe), WebGL. three.js would be a second engine, a second mental model and hand-built axes.
- **D4 `'unsafe-eval'` in the frame CSP.** Required by claygl's `expr(...)` parameters (`new Function`). The element's inline script is already arbitrary JS; the policy's job here is sources and `connect-src 'none'`, both unchanged.
- **D5 Benchmark on real srcdocs, outside the hub shell.** The owner's board holds 19 elements; measuring there put 20 iframes and Vite's 6.5 MB dev-transformed `echarts.min.js` in every number. The harness feeds the exact `buildSrcdoc` output (same bridge, same CSP) into `sandbox="allow-scripts"` iframes on a static server with the production-size assets, N = 0/1/5 per case, forced GC, then reads the renderer isolate heap (`Performance.getMetrics`) and the RSS of the browser's own process tree. The real hub is still exercised for correctness (elements created through `POST /api/sandbox/elements`, painted, WebGL live, deleted).

## Asset sizes (production bytes)
| Asset | Raw | Gzip | Note |
|---|---|---|---|
| `echarts.min.js` | 1,121,883 | 368,997 | already shipped |
| `echarts-gl.min.js` | 639,846 | 175,203 | new; loads after echarts |
| `d3-slim.min.js` | 195,729 | 63,758 | new; 70 % / 69 % of full d3 |
| full `d3.min.js` (not shipped) | 279,706 | 92,605 | reference |
| slim without `d3-scale-chromatic` (not shipped) | 176,068 | 56,384 | reference |

## Memory and first paint (headless Chromium via Playwright, 2026-10-16)
Per element = (N=5 − N=1) / 4 after `HeapProfiler.collectGarbage`; "first" = N=1 − N=0 (library parse + first document). RSS from `ps` over the browser's process tree. Software WebGL (SwiftShader) in headless — the GPU-process column is CPU memory here.

| Element | JS heap, first | JS heap, each extra | Renderer RSS, each extra | GPU-process RSS, each extra | In-frame first paint, N=1 |
|---|---|---|---|---|---|
| plain HTML KPI | +1.0 MB | 0.38 MB | 4.8 MB | 3.4 MB | 96 ms |
| ECharts bar | +3.8 MB | 1.40 MB | 10.6 MB | 7.0 MB | 250 ms |
| slim d3 bar (SVG) | +1.6 MB | 0.59 MB | 6.9 MB | 4.6 MB | 93 ms |
| echarts-gl bar3D | +6.0 MB | 2.83 MB | 13.4 MB | 19.7 MB | 6,505 ms (software GL) |

Totals at N=5: HTML 3.5 MB heap / 116 MB renderer; ECharts 10.4 / 155; d3 4.9 / 134; bar3D 18.3 / 179 + 188 MB GPU process. Empty harness page: 1.0 MB heap / 86 MB renderer / 65 MB GPU process.

**WebGL cap**: 20 bar3D elements ⇒ 64 MB heap, 237 MB renderer, 176 MB GPU process, and **4 of 20 contexts lost** (Chromium's ~16 live contexts per renderer; the oldest are dropped first). A board with more than ~16 3D elements silently blanks its oldest ones; every sandboxed frame of the page shares one renderer here, so the cap is per board, not per element.

Reading: the cost of "one more library" is paid per element that reads it (each iframe is its own realm and parses the script again), so echarts ≈ 1.4 MB heap + 11 MB RSS per chart and bar3D ≈ 2.8 MB + 13 MB + GPU memory per chart. An in-house engine would not change the iframe-per-element structure that dominates these numbers; it would only trade a parsed library for a parsed engine.

## Files
```
src/lib/sandbox/vendor/d3-slim.ts (new)        · static/vendor/d3-slim.min.js (built, committed)
src/lib/sandbox/vendor.ts (allowlist + notes)   · src/lib/sandbox/bridge.ts (echartsGl, d3 getters; TODO(handoff))
src/lib/sandbox/srcdoc.ts (+'unsafe-eval')      · src/lib/sandbox/srcdoc.test.ts · src/lib/sandbox/tools.ts · tools.test.ts
src/lib/assistant/turn-router.ts (manifest)     · package.json (deps, devDeps @types/d3-*, vendor:d3) · .prettierignore
```
