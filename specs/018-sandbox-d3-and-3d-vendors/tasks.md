# Tasks: Sandbox vendors — slim d3 and ECharts GL

- [X] T001 Spec/plan (this dir).
- [X] T002 S1 d3: `vendor/d3-slim.ts`, `bun run vendor:d3`, committed `static/vendor/d3-slim.min.js`, `VENDOR.d3`, `minion.d3`; deps + `@types/d3-*`; `.prettierignore` for the artifact.
- [X] T003 S2 3D: `echarts-gl` dep + `?url`, `minion.echartsGl` (resolves to the same echarts), CSP `'unsafe-eval'` (claygl `new Function`).
- [X] T004 S3 model text: `ELEMENT_FIELDS.js`, `upsert_element` description, `sandbox` manifest (1,617 B); tests in `srcdoc.test.ts` (allowlist, CSP, prebuilt bundle executes) and `tools.test.ts`.
- [X] T005 S4 benchmark: harness of real srcdocs (`~/.cache/claude-tmp/d3-bench/`), N = 0/1/5 × 4 cases + N = 20 bar3D; tables in `plan.md`. Real-hub proof: three elements created through the API, painted, WebGL live, deleted; `~/.cache/claude-tmp/hub-sb-proof/018-{d3,echartsGl,echarts,board}.png`.
- [X] T006 Gates: prettier, vitest (sandbox + assistant + assistant-context), `bun run check`, `bun run build` (see PR body for exit codes).
- [X] T007 Ledger: `TODO(handoff)` for the WebGL cap in `bridge.ts`; proposal `2026-10-16-hub-sandbox-vendor-followups`.
