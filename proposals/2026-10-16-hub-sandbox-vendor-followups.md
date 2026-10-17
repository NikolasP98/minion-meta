---
id: 2026-10-16-hub-sandbox-vendor-followups
title: Sandbox vendors — open ends after slim d3 and ECharts GL
status: draft
created: 2026-10-16
updated: 2026-10-16
repos: [minion_hub, minion-meta]
tags: [logic]
value: 5
effort: S
---

# Sandbox vendors — follow-ups (open-items ledger for spec 018)

Spec: `specs/018-sandbox-d3-and-3d-vendors/`. Hub branch `feat/sandbox-d3-3d` → `feat/sandbox-pages-poc` (POC, owner gate). The measured sizes and memory table live in that spec's `plan.md`.

## Open ends (each has a `TODO(handoff)` at its site unless noted)

1. **WebGL-context budget** (`src/lib/sandbox/bridge.ts`, `TODO(handoff)`). Chromium keeps ~16 live WebGL contexts per renderer and silently loses the oldest; 20 bar3D elements left 4 blank in the benchmark. The host should count elements whose JS reads `minion.echartsGl` (the canvas map already parses element JS) and warn in the canvas map / refuse `upsert_element` past ~12.
2. **Slim-d3 artifact caching** (no code site). `static/vendor/d3-slim.min.js` is served `max-age=0, must-revalidate`, unlike the hashed echarts asset; add a content-hash or version suffix to the filename (and to `VENDOR.d3`) if revalidation shows up in waterfalls.
3. **GL timings on real hardware** (no code site). The 6.5 s bar3D first paint is SwiftShader (headless software GL). Measure once on a GPU-backed browser before deciding on `autoRotate` defaults or a loading state for 3D elements.
4. **Spec 010 contract §4** still prints the CSP without `'unsafe-eval'`; amend `specs/010-hub-sandbox-pages/contracts/query-and-bridge.md` when #808 is next revised.
5. **Per-element memory budget** (no code site). Numbers now exist (≈1.4 MB heap + 11 MB RSS per ECharts element, ≈2.8 MB + 13 MB + GPU per bar3D); nothing enforces a board-level cap. Candidate: the canvas map tells the agent the board's estimated cost and the tier-2 rules say when to merge visuals instead of adding one.
