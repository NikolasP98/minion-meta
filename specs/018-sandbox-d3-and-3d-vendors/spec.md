# Feature Specification: Sandbox vendors — slim d3 and ECharts GL (3D), with the memory bill

**Feature Branch**: `docs/spec-018-sandbox-d3-and-3d-vendors` | **Repos & PR bases**: minion_hub → `feat/sandbox-pages-poc` (hub branch `feat/sandbox-d3-3d`, lands inside the sandbox POC, hub #542) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic + security (one CSP keyword added inside the element frame; same admin gate, same data) | **Human gates**: spec 010's owner gate still applies to the POC PR as a whole

**Input**: Owner, 2026-10-16 (verbatim): "implement d3. Find a way to optimize tree shaking for it, but I want 3d visuals as well. I need to know what the memory impact is if we depend on a new library, unless we're implementing our own engine that handles memory optimizations."

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `feat/sandbox-pages-poc` @ `7b65bcdb`).
- One vendor library. `src/lib/sandbox/vendor.ts:9-11` imports `echarts/dist/echarts.min.js?url` and exports `VENDOR = { echarts }`; `ElementFrame.svelte:45` hands that map to `buildSrcdoc`. The bridge resolves `minion.load(name)` against it and expects the library on `window[name]` (`bridge.ts:65-73`); `minion.echarts` is the only lazy promise (`bridge.ts:98`). Elements run in `<iframe sandbox="allow-scripts">` (`ElementFrame.svelte:104`) under `script-src 'unsafe-inline' <hub origin>` with `connect-src 'none'` (`srcdoc.ts:106`).
- Tree-shaking is already answered for the APP: a `?url` import ships the library whole as a hashed asset, so nothing of the hub bundle is exposed and nothing an element needs is shaken away (spec 010 plan D3). It is NOT answered for the FRAME: whatever library is allowlisted is loaded whole by every element that reads it. Full `d3.min.js` is 280 KB / 93 KB gz; half of it (geo, brush, contour, delaunay, chord, dsv, fetch) is useless in a frame that cannot fetch map or CSV data.
- No 3D. The model is told about `minion.echarts` only (`tools.ts:111,173`; `turn-router.ts:174,178`). `d3-force`, `d3-cloud` and eight transitive `d3-*` packages are already in `node_modules` (`package.json:71,110`) but nothing reaches the frame.
- No memory figure exists for "one more element" or "one more library": the only sizing rule the model has is `w`/`h` in grid units.

**TO-BE.**
- **`minion.d3`** (lazy promise) resolves a slim d3: 14 modules — array, axis, drag, force, format, hierarchy, interpolate, scale, scale-chromatic, selection, shape, time-format, transition, zoom — assembled by `src/lib/sandbox/vendor/d3-slim.ts` and prebuilt into `static/vendor/d3-slim.min.js` by `bun run vendor:d3` (bun's bundler, `--format=iife --minify`; the entry assigns `window.d3`). 196 KB / 64 KB gz, i.e. 70 % of full d3 (69 % gzipped). The app bundle and the Vite pipeline are untouched; the asset is committed and reproducible. Left out on purpose: `d3-geo`/`d3-fetch`/`d3-dsv` (no network in the frame), `d3-brush`/`d3-contour`/`d3-delaunay`/`d3-chord` (rare; one import line each when an element asks).
- **`minion.echartsGl`** (lazy promise) awaits `minion.echarts`, then loads `echarts-gl.min.js` (640 KB / 175 KB gz; a UMD that registers bar3D, scatter3D, line3D, surface, globe into the existing echarts global) and resolves to the SAME echarts object. One API family for the model, one engine in the frame, GPU-accelerated through WebGL. three.js is not shipped: it would be a second engine and a second vocabulary for a model that already knows ECharts options, with no 3D chart primitive of its own (bars/axes/grids would have to be hand-built).
- **CSP**: `script-src` gains `'unsafe-eval'`. claygl (inside echarts-gl) parses its compositor parameters with `new Function` and throws `Invalid expression.` without it — bar3D never painted in the first benchmark run. It adds no capability the element's own inline script lacks; sources (hub origin only) and `connect-src 'none'` are unchanged.
- **Model-facing text**: `ELEMENT_FIELDS.js`, the `upsert_element` description and the `sandbox` manifest name the three promises and the rule — ECharts by default; d3 for bespoke marks, trees, force graphs; echarts-gl for 3D. Manifest stays at 1,617 bytes (was 1,453).
- **The bill** (measured, see the table in `plan.md`): a plain element costs ~0.4 MB JS heap and ~5 MB renderer RSS; an ECharts element ~1.4 MB / ~11 MB; a slim-d3 element ~0.6 MB / ~7 MB; a bar3D element ~2.8 MB / ~13 MB plus ~20 MB in the GPU process (software GL in the headless run). Each frame parses its library again (separate realm), so the first-element cost of a library (3.8 MB echarts, 1.6 MB d3, 6.0 MB echarts-gl on top of echarts) is paid per element, not per board. Chromium keeps ~16 live WebGL contexts per renderer and silently loses the oldest beyond that: 20 bar3D elements ⇒ 4 blank. No own engine is warranted: the per-element overhead is the iframe + library parse, which an in-house renderer would not remove while elements stay isolated documents.
- Removing: nothing.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 d3 | `vendor/d3-slim.ts` + `vendor:d3` script + committed `static/vendor/d3-slim.min.js`; `VENDOR.d3 = '/vendor/d3-slim.min.js'`; `minion.d3` getter; 13 `d3-*` deps added | `srcdoc.test.ts`: allowlist = {d3, echarts, echarts-gl}; the prebuilt file runs in a VM and defines the promised modules (`select`, `scaleLinear`, `forceSimulation`, `hierarchy`, `transition`, `zoom`, …) and NOT `geoPath`; size < 250 KB |
| S2 3D | `echarts-gl` dep + `?url` import; `minion.echartsGl` getter; CSP `'unsafe-eval'` | `srcdoc.test.ts` pins the new CSP line; real-hub Playwright: bar3D paints, `canvas.getContext('webgl')` live, no `pre.minion-error` (`018-echartsGl.png`) |
| S3 model text | `tools.ts` js field + upsert description; `turn-router.ts` sandbox inject | `tools.test.ts` asserts the three promises are taught; manifest-size and SC-004 tests stay green |
| S4 benchmark | harness of REAL `buildSrcdoc` output, N = 0/1/5 per case, plus N = 20 bar3D | tables in `plan.md`; method stated there |

## User Scenarios & Testing

1. **"Make a treemap of stock value by category"** → the agent awaits `minion.d3`, uses `d3.hierarchy` + `d3.treemap`; the frame fetches `/vendor/d3-slim.min.js` once, nothing else.
2. **"Show revenue by service and channel in 3D"** → the agent awaits `minion.echartsGl`, sets `grid3D`/`xAxis3D`/`bar3D` on the echarts it already knows; the frame fetches echarts then echarts-gl; WebGL renders inside the sandboxed, null-origin frame.
3. **A plain KPI card** → pays nothing new: no library is fetched unless its promise is read.
4. **A board with 20 three-D elements** → the four oldest go blank (WebGL cap); ledger item, not fixed here.

## Requirements
- FR-001 A library is loaded only when its `minion.<lib>` promise is read; `vendorScriptTags` stays the eager exception.
- FR-002 `minion.echartsGl` MUST resolve to the same object as `minion.echarts` (one instance, GL series registered).
- FR-003 The slim d3 MUST be rebuilt from `d3-slim.ts` by `bun run vendor:d3` and committed; the test that loads the committed file is the staleness guard.
- FR-004 The frame CSP keeps `default-src 'none'`, hub-origin-only `script-src` and `connect-src 'none'`; `'unsafe-eval'` is the only addition.
- FR-005 The `sandbox` manifest stays ≤ ~1.6 KB; SC-004 (+200 chars on a chat turn) still holds.

## Out of scope / open ends (ledger)
- **Out of scope:** three.js (second engine; revisit only for non-chart 3D such as product models); `d3-geo` maps (needs inline GeoJSON — a dataset endpoint for shapes first); a per-element memory budget enforced by the host; gzip/brotli for `static/` on the dev server (Vercel compresses in production).
- The WebGL-context cap is unguarded (`TODO(handoff)` in `bridge.ts`): the host should count 3D elements and warn or refuse past ~12.
- echarts-gl paint times were measured under SwiftShader (headless software GL: 6.5 s for one bar3D); on a real GPU expect sub-second, not measured.
- `static/vendor/d3-slim.min.js` is served by `adapter-vercel` with `max-age=0, must-revalidate`, not the immutable hashed path echarts gets; a version suffix in the filename is the upgrade if cache churn shows.
- Spec 010 `contracts/query-and-bridge.md` §4 still states the old CSP line; amend when #808 is revised.
