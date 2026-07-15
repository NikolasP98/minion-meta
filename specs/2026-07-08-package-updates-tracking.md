# Package Update Campaign — Tracking Table

**Started:** 2026-07-08 · **Repos:** `minion_hub/` (Bun/SvelteKit), `minion/` (pnpm gateway monorepo)
**Method:** `bun outdated` / `pnpm outdated -r` → grep blast radius → phased upgrades. Update this file between phases.

**Status legend:** ⬜ pending · 🔄 in progress · ✅ done · ⏸️ held/deferred · ❌ blocked · ⏭️ skipped

**Phases:**
- **P0** — Cleanup (remove deprecated)
- **P1** — Safe batch: in-range / same-major minor+patch. Zero source churn, run updater + checks.
- **P2** — Low-blast majors: 1–3 import sites, mechanical.
- **P3** — Contained-extension majors: isolated subsystem, wider within it.
- **P4** — Heavy / lockstep / preview: own PR each, never bundled.

---

## P0 — Cleanup

| Repo | Package | Current | Action | Complexity | Status | Result |
|---|---|---|---|---|---|---|
| gw | `@types/libsodium-wrappers` | 0.8.2 | Remove (deprecated; lib self-types) | trivial | ✅ | Removed. Confirmed `libsodium-wrappers` ships own `.d.ts`. Commit `eea32a931`. |

---

## P1 — Safe batch (in-range, same-major)

> **hub P1 ✅ DONE** (commit `4e8dbe1d`) — `bun update`, all rows below bumped. check 0/0 · 1513 tests ✅ · build ✅.
> Two compat fixes the batch forced: (1) tiptap 3.27 hoisted `prosemirror-view@1.42`+`prosemirror-model@1.25.10`, splitting them from nested copies → added dedupe overrides (`prosemirror-model 1.25.7`, `prosemirror-view 1.41.8`); (2) `@zag-js/progress` 1.42 stricter types → `as unknown as` cast in FinanceSyncBadge + finances/settings.
>
> **gw P0+P1 ✅ DONE** (commits `eea32a931` deps, `e6aad4597` node_modules symlink sync) — `pnpm -r update`. `pnpm tsgo` exit 0. `minimumReleaseAge:2880` (48h) held back grammy 1.44 + others; `oxlint` pinned exact so stayed 1.48. Two compat fixes: (1) `@grammyjs/types` pulled 3.28 vs grammy's exact 3.24 → pinned devDep `^3.24.0` + override `3.24.0`; (2) stripe 22.3 apiVersion literal → billing test `2026-06-24.dahlia`.
> **Pre-existing, NOT from update** (verified vs baseline): 175 type-aware lint findings (curly/no-unused-vars debt); telegram e2e suite flaky/red at baseline (55 fails pre vs 64 post, varying test counts — `@grammyjs/types` is type-only, cannot touch runtime).
> **Repo wart flagged:** `extensions/*/node_modules` pnpm symlinks are tracked in git → recommend gitignoring.

### hub — `bun update` ✅ (all done, commit `4e8dbe1d`)

| Package | Current | Target | Status | Result |
|---|---|---|---|---|
| `@aws-sdk/client-s3` | 3.1053.0 | 3.1083.0 | ⬜ | |
| `@aws-sdk/s3-request-presigner` | 3.1053.0 | 3.1083.0 | ⬜ | |
| `@libsql/client` | 0.17.3 | 0.17.4 | ⬜ | |
| `@supabase/supabase-js` | 2.106.2 | 2.110.1 | ⬜ | |
| `@tailwindcss/vite` | 4.3.0 | 4.3.2 | ⬜ | |
| `tailwindcss` | 4.3.0 | 4.3.2 | ⬜ | |
| `@tiptap/*` (core, pm, starter-kit, ext-highlight, ext-image) | 3.25–3.26 | 3.27.3 | ⬜ | |
| `@xyflow/svelte` | 1.5.2 | 1.6.2 | ⬜ | |
| `@zag-js/*` (17 pkgs: combobox, dialog, editable, file-upload, image-cropper, menu, popover, progress, qr-code, slider, splitter, steps, svelte, switch, toast, tooltip, tree-view) | 1.41.x | 1.42.0 | ⬜ | |
| `dompurify` | 3.4.5 | 3.4.11 | ⬜ | |
| `fuse.js` | 7.3.0 | 7.4.2 | ⬜ | |
| `msedge-tts` | 2.0.5 | 2.0.6 | ⬜ | |
| `pixi.js` | 8.18.1 | 8.19.0 | ⬜ | |
| `posthog-js` | 1.376.0 | 1.399.0 | ⬜ | |
| `posthog-node` | 5.35.1 | 5.40.0 | ⬜ | |
| `resend` | 6.12.3 | 6.17.2 | ⬜ | |
| `@minion-stack/lint-config` (dev) | 0.1.1 | 0.1.2 | ⬜ | |
| `@playwright/test` (dev) | 1.60.0 | 1.61.1 | ⬜ | |
| `@sveltejs/adapter-node` (dev) | 5.5.4 | 5.5.7 | ⬜ | |
| `@sveltejs/kit` (dev) | 2.61.0 | 2.69.2 | ⬜ | |
| `@tauri-apps/cli` (dev) | 2.11.2 | 2.11.4 | ⬜ | |
| `@testing-library/svelte` (dev) | 5.3.1 | 5.4.2 | ⬜ | |
| `prettier` (dev) | 3.8.3 | 3.9.4 | ⬜ | |
| `svelte` (dev) | 5.55.9 | 5.56.4 | ⬜ | |
| `svelte-check` (dev) | 4.4.8 | 4.7.2 | ⬜ | |
| `vitest` (dev) | 4.1.7 | 4.1.10 | ⬜ | |

### gw — `pnpm -r update` ✅ (done, commit `eea32a931`; grammy/oxlint held by 48h release-age gate)

| Package | Current | Target | Status | Result |
|---|---|---|---|---|
| `@homebridge/ciao` | 1.3.5 | 1.3.10 | ⬜ | |
| `@opentelemetry/api` | 1.9.0 | 1.9.1 | ⬜ | |
| `@opentelemetry/*` (resources, sdk-metrics, sdk-trace-base) | 2.5.1 | 2.9.0 | ⬜ | |
| `@opentelemetry/semantic-conventions` | 1.39.0 | 1.42.0 | ⬜ | |
| `@slack/bolt` | 4.7.2 | 4.7.3 | ⬜ | |
| `@slack/web-api` | 7.16.0 | 7.19.0 | ⬜ | |
| `@tailwindcss/postcss` (dev) | 4.3.0 | 4.3.2 | ⬜ | |
| `tailwindcss` (dev) | 4.3.0 | 4.3.2 | ⬜ | |
| `autoprefixer` (dev) | 10.5.0 | 10.5.2 | ⬜ | |
| `postcss` (dev) | 8.5.14 | 8.5.16 | ⬜ | |
| `@vitest/coverage-v8` (dev) | 4.1.7 | 4.1.10 | ⬜ | |
| `vitest` (dev) | 4.1.7 | 4.1.10 | ⬜ | |
| `playwright-core` | 1.60.0 | 1.61.1 | ⬜ | |
| `fast-check` (dev) | 4.8.0 | 4.9.0 | ⬜ | |
| `ioredis` (opt) | 5.11.0 | 5.11.1 | ⬜ | |
| `lit` (dev) | 3.3.2 | 3.3.3 | ⬜ | |
| `nostr-tools` | 2.23.1 | 2.23.9 | ⬜ | |
| `tar` | 7.5.9 | 7.5.19 | ⬜ | |
| `yjs` | 13.6.30 | 13.6.31 | ⬜ | |
| `@aws-sdk/client-bedrock` | 3.1053.0 | 3.1083.0 | ⬜ | |
| `@clack/prompts` | 1.0.1 | 1.7.0 | ⬜ | |
| `@grammyjs/types` (dev) | 3.24.0 | 3.28.0 | ⬜ | |
| `grammy` | 1.40.0 | 1.44.0 | ⬜ | |
| `@inlang/paraglide-js` (dev) | 2.19.0 | 2.20.2 | ⬜ | |
| `@larksuiteoapi/node-sdk` | 1.59.0 | 1.70.0 | ⬜ | |
| `@sentry/node` | 10.53.1 | 10.64.0 | ⬜ | |
| `@twurple/*` (api, auth, chat) | 8.0.3 | 8.1.4 | ⬜ | |
| `better-sqlite3` | 12.10.0 | 12.11.1 | ⬜ | |
| `echarts` | 6.0.0 | 6.1.0 | ⬜ | |
| `google-auth-library` | 10.5.0 | 10.9.0 | ⬜ | |
| `jiti` | 2.6.1 | 2.7.0 | ⬜ | |
| `jsonrepair` | 3.14.0 | 3.15.0 | ⬜ | |
| `just-bash` | 3.0.1 | 3.1.0 | ⬜ | |
| `livekit-server-sdk` | 2.15.3 | 2.17.0 | ⬜ | |
| `markdown-it` | 14.1.1 | 14.3.0 | ⬜ | |
| `music-metadata` | 11.12.1 | 11.13.0 | ⬜ | |
| `openai` | 6.39.0 | 6.45.0 | ⬜ | |
| `posthog-node` | 5.35.1 | 5.40.0 | ⬜ | |
| `rolldown` (dev) | 1.0.3 | 1.1.5 | ⬜ | |
| `stripe` | 22.1.1 | 22.3.0 | ⬜ | |
| `svelte` | 5.55.5 | 5.56.4 | ⬜ | |
| `svelte-check` (dev) | 4.4.8 | 4.7.2 | ⬜ | |
| `tslog` | 4.10.2 | 4.11.0 | ⬜ | |
| `tsx` (dev) | 4.22.3 | 4.23.0 | ⬜ | |
| `typebox` | 1.1.38 | 1.3.6 | ⬜ | |
| `ws` | 8.19.0 | 8.21.0 | ⬜ | |
| `oxlint` (dev) ⚠️ | 1.48.0 | 1.73.0 | ⬜ | lint-only; may surface new warnings in `pnpm check` |

---

## P2 — Low-blast majors (1–3 sites, mechanical)

| Repo | Package | Jump | Sites | Complexity | Test after | Status | Result |
|---|---|---|---|---|---|---|---|
| hub | `jose` | 5.10→6.2.3 | 2 (`gateway-jwt.service.ts`+test) | low | JWT sign/verify | ✅ `640db8b9` | no code changes — v6 API-compatible for our sites; check 0/0, targeted 5/5 |
| hub | `@vercel/analytics` | 1.6.1→2.0.1 | 2 (`+layout.ts`, `+layout.svelte`) | low | `/sveltekit` subpath resolves | ✅ `f884dbf4` | no code changes; subpath exports unchanged in v2 |
| hub | `@vercel/speed-insights` | 1.3.1→2.0.0 | 1 (`+layout.svelte`) | low | subpath resolves | ✅ `f884dbf4` | paired with analytics, same commit |
| hub | `@supabase/ssr` ⚠️ | 0.10.3→0.12.0 | 2 (client+server) | low-med | **login e2e** | ✅ `ef5c103e` | no code changes (already getAll/setAll; 0.12 additive-only); check 0/0 + build exit 0. ✅ **live login QA confirmed by user 2026-07-08** |
| hub | `@minion-stack/cache` | 0.2.1→0.3.0 | internal | unknown | read changeset | ✅ `c53dbe5f` | 0.3.0 removes `remember`/`invalidateKey`/`mget` — grep of 26 call sites: none used. 1513/1513 tests |
| gw | `file-type` | 21.3→22.0.1 | 1 (`media/mime.ts`) | trivial | mime detect | ✅ `e78e80549` | no code changes |
| gw | `comment-json` | 4.6→5.0.0 | 1 (`config/comment-preserve.ts`) | trivial-low | `config/io.test.ts` | ✅ `b876704bb` | no code changes; round-trip test in final gate |
| gw | `https-proxy-agent` | 7.0→9.1.0 | 1 (discord monitor) | low | discord proxy path | ✅ `ecd027f24` | no code changes — call site already matches v9 ctor |
| gw | `commander` | 14.0→15.0.0 | 131 refs (mostly `import type`) | low-med | CLI smoke | ✅ `b6bc50a15` | no code changes; CLI boot smoke in final gate |
| gw | `pdfjs-dist` | 5.7→6.1.200 | 2 modules + 1 `.d.ts` | low-med | PDF extract | ✅ `93ad8b052` | no code changes; local `.d.ts` still matches |
| gw | `@types/node` (dev) | 25.9→26.1.1 | types | low | `tsgo` | ✅ `423110679`+`b972aba2e` | tsgo exit 0; follow-up restored caret range (agent pinned exact) |

---

## P3 — Contained-extension majors

| Repo | Package | Jump | Scope | Complexity | Status | Result |
|---|---|---|---|---|---|---|
| gw | `@line/bot-sdk` | 10.8→11.2.0 | `channels/impl/line/*` (23 files) | med (read v11 changelog) | ✅ `56a6ec6c8` | REAL migration: webhook types moved to `webhook.*` namespace + renames (`WebhookRequestBody`→`webhook.CallbackRequest` etc.), `Event.source` now optional. 11 files touched; tsgo 0, line tests 115/115 |
| gw | `@microsoft/agents-hosting*` (3 pkgs) | 1.2.3→1.6.1 | `extensions/msteams` | med (preview SDK, 4-minor) | ✅ (via P1 `eea32a931`) | `^1.2.3` range already allowed 1.6.1 — P1 update pulled it in. All 1.3–1.6 breaks checked vs sdk.ts/sdk-types.ts: zero symbols affected. msteams tests 148/148 |
| gw | `@google-cloud/pubsub` (opt) | 4.11→5.3.1 | 3 gmail hooks | low-med | ✅ `2008b88a0` | no code changes — only stable core pull API used behind lazy `import()`. Runtime smoke vs installed v5 prototypes passed; gmail-* tests 39/39 |

---

## P4 — Heavy / lockstep / preview (own PR each)

| Repo | Package(s) | Jump | Sites | Complexity | Status | Result |
|---|---|---|---|---|---|---|
| hub | **Vite toolchain**: `vite` + `@sveltejs/vite-plugin-svelte` + `@sveltejs/adapter-vercel` | 5.4→8.1.3 / 4→7.2.0 / 5→6.3.4 | build config | med — lockstep, whole-build regression surface | ✅ `f4db0b02` | Full stable-set support for vite 8 (kit 2.69 + vitest 4 + tailwind/vite all in peer range — ZERO companion bumps). 2 config fixes: vitest `hot:false`→`compilerOptions.hmr:false`; paraglide link preprocessor re-registered manually in svelte.config.js (plugin-svelte 7 removed `api.sveltePreprocess` auto-registration). Gates: check 0/0, 1513/1513, build 0, dev-boot smoke on :5199 OK |
| gw | `@sveltejs/vite-plugin-svelte` + `vite` | 5.1→7.2.0 / 6.4→8.1.3 | 7 extension UIs | med — same Vite lockstep | ✅ `5d09432b7` | plugin-svelte 7 requires vite 8 (no vite-7 combo exists). Zero config changes (rolldown-based vite 8 still accepts our `rollupOptions.input` etc.). All 7 UI builds + tsgo + root build exit 0; tracked dist/ + symlinks committed with lockfile. Oddity: 7.2.0 resolved despite being ~37h old (minimumReleaseAge didn't hold it) |
| hub | **AI SDK**: `ai` + `@ai-sdk/openai` | 6→7.0.18 / 3→4.0.9 | 23 files (server-only core) | med — ~15 endpoints to retest | ✅ `3d1c1fc6` | ZERO code changes — code already on v7-era surface (`stepCountIs`, `inputSchema`, `usage.inputTokens`); online migration guide's renames NOT enforced by 7.0.18 (verified vs installed types). check 0/0, 1513/1513, build 0. ⚠️ AI endpoints smoke-test pending human |
| hub | `lucide-svelte` | 0.575→1.0.1 | 288 files | low-if-stable / find-replace-if-renamed | ✅ `05c4e638` | 1.0 = milestone bump, API stable, pkg name unchanged. ONE break: `Facebook`/`Instagram` brand icons REMOVED (trademark cleanup) → new `socials/PlatformIcon.svelte` inlining the 0.577 SVG paths, used in 2 socials pages. check 0/0, build 0 |
| hub | `typescript` (dev) | 5.9→7.0.2 | ecosystem | HOLD — 7.0 native port, GA status uncertain | ⏸️ | wait for confirmed-stable + tooling support |
| hub | `happy-dom` (dev) | 15.11→20.10 | tests | low stakes, expect test tweaks | ⏸️ | do only if a test needs it |

---

## Progress log

- **2026-07-08** — Recon complete, tracker created.
- **2026-07-08** — **P0 + P1 shipped, both repos.**
  - hub: `bun update` (in-range only; majors correctly held). Baseline was 0 errors → batch introduced 4 type errors, all root-caused to duplicated prosemirror packages (tiptap 3.27) + zag 1.42 stricter Progress types. Fixed via 2 dedupe overrides + 2 casts. Verified check 0/0, 1513 tests, build. Commit `4e8dbe1d`. Committed scoped (never swept the concurrent session's chat WIP, which they committed themselves as `694fb4bf`).
  - gw: removed deprecated `@types/libsodium-wrappers` (P0); `pnpm -r update` (P1). 48h `minimumReleaseAge` gate held grammy 1.44 + several; oxlint pinned exact held 1.48. Batch introduced `@grammyjs/types` duplicate-instance errors (telegram) + a stripe apiVersion literal error (billing test) — both fixed. `pnpm tsgo` exit 0. Rigorously baselined the telegram e2e failures via patch round-trip: **pre-existing** (55 fails before update). Commits `eea32a931` (deps) + `e6aad4597` (tracked node_modules symlink sync).
  - **Not pushed / not deployed.** Held items (P4) untouched.
  - **Follow-ups surfaced:** (a) gitignore `extensions/*/node_modules` (tracked symlinks); (b) gw has 175 pre-existing type-aware lint findings + a flaky/red telegram e2e suite — both independent of this campaign.
- **2026-07-08** — **P2 shipped, both repos, 10/10 packages, ZERO source-code changes needed.** Executed by 2 parallel Sonnet subagents (one per repo, packages sequential, revert-on-red), orchestrated with per-package specs.
  - hub (4): jose 6.2.3 `640db8b9` · @vercel/analytics 2.0.1 + speed-insights 2.0.0 `f884dbf4` · @supabase/ssr 0.12.0 `ef5c103e` · @minion-stack/cache 0.3.0 `c53dbe5f`. All drop-in — sites already on the new APIs; cache 0.3.0's removed exports (`remember`/`invalidateKey`/`mget`) unused across all 26 call sites. Gates: check 0/0 per package, build exit 0, final test run 1513/1513. Intermittent full-suite timeouts confirmed = pre-existing aci-backend flake pool (verified via pre-bump baseline run). Concurrent session's `8917c99c` untouched.
  - gw (6): file-type 22.0.1 `e78e80549` · comment-json 5.0.0 `b876704bb` · https-proxy-agent 9.1.0 `ecd027f24` · commander 15.0.0 `b6bc50a15` · pdfjs-dist 6.1.200 `93ad8b052` · @types/node 26.1.1 `423110679`+`b972aba2e` (orchestrator follow-up: agent pinned exact, restored caret so future `pnpm -r update` can move it). Every commit = package.json+lockfile only; no extension symlink churn. Gates: `pnpm tsgo` exit 0, `pnpm build` exit 0, CLI boot smoke exit 0, targeted vitest (config io round-trip + media) 275/275.
  - The gw subagent was orphaned mid-verification by a session restart; its 6 commits were verified intact and the final gate re-run by the orchestrator.
  - **Not pushed / not deployed.** ⚠️ hub live-login QA (supabase/ssr) pending human.
- **2026-07-08** — **P3 shipped (gw), 3/3.** One Sonnet subagent, changelog-first.
  - `@line/bot-sdk` 11.2.0 `56a6ec6c8` — the only real source migration of the campaign so far: v11 moved webhook event/type exports into a `webhook.*` namespace with renames (`WebhookRequestBody`→`webhook.CallbackRequest`, `WebhookEvent`→`webhook.Event`, `StickerEventMessage`→`webhook.StickerMessageContent`, …) and made `Event.source` optional. 11 line-channel files updated; tsgo 0, 115/115 line tests. Note: the namespace move was NOT in the public release notes — found by reading the package's `dist/index.d.ts`.
  - `@microsoft/agents-hosting` ×3 → 1.6.1 — already landed via P1 (`^1.2.3` range admitted 1.6.1). All documented 1.3–1.6 breaks audited against the msteams extension: zero affected symbols. 148/148 msteams tests.
  - `@google-cloud/pubsub` 5.3.1 `2008b88a0` — no code changes (lazy-imported stable pull API only); runtime smoke against installed v5 prototypes + 39/39 gmail-hook tests.
  - Full `pnpm build` exit 0. **Follow-up surfaced:** `pnpm build` regenerates `src/agents/embedded-*-templates.generated.ts` + 2 `minion.plugin.json` files with environment-dependent drift (regeneration DROPS templates not present locally, e.g. `AGENTS.dev.md`) — restored to HEAD after the gate; these generated files should be made deterministic or gitignored.
- **2026-07-08** — **P4 actionable items shipped (hub), 2/2.** One Opus subagent.
  - `lucide-svelte` 1.0.1 `05c4e638` — 1.0 is a milestone continuation of 0.x (1.0.0 published accidentally; 1.0.1 canonical), package name unchanged. One real break: `Facebook`/`Instagram` brand icons removed (trademark cleanup) → new `src/lib/components/socials/PlatformIcon.svelte` inlining the lucide-0.577 SVG paths, replacing 3 branch sites across the 2 socials pages. check 0/0, build 0; 2 full-suite fails = documented aci-backend flake (26/26 isolated).
  - AI SDK `ai` 7.0.18 + `@ai-sdk/openai` 4.0.9 `3d1c1fc6` — zero code changes. Key finding: **the online v7 migration guide's renames (`system`→`instructions`, `onFinish`→`onEnd`, `fullStream`→`stream`) are NOT enforced by the installed 7.0.18 types** — the agent used installed types as ground truth over the docs. Our 20 files were already on the v7-era surface (`stepCountIs`, `tool`/`inputSchema`, `usage.inputTokens/outputTokens`). Silent-shape greps clean (the one raw `promptTokens` access reads a stored DB record, not SDK usage). check 0/0, 1513/1513, build 0.
  - ⚠️ **Human smoke-test list for AI SDK** (server endpoints): `/api/builder/ai/*` (suggest-chapter|suggest-skill|suggest-prompts|dry-run|analyze-run), `/api/marketplace/generate-agent`, `/api/flows/[id]/copilot`, `/api/structured-stream`, `/api/notes/autocomplete|polish|refine`, `/api/crm/contacts/[id]/funnel/analyze`, `/api/crm/tags/[id]/evaluate`, `/api/crm/cleanup/review`, reminder-compose, CRM journey/insights/similarity services.
  - **Campaign status: all actionable phases (P0–P4) complete.** Still ⏸️ held by design: Vite toolchain lockstep (hub `vite` 8 + plugin-svelte 7 + adapter-vercel 6; gw plugin-svelte 7.2), `typescript` 7 (GA uncertainty), `happy-dom` 20. **Nothing pushed/deployed.** Pending human QA: hub login (supabase/ssr 0.12) + AI endpoints smoke.
- **2026-07-08** — ✅ **Login QA passed** (user-confirmed) — supabase/ssr 0.12 fully cleared. User green-lit the held isolated bumps → **Vite toolchain lockstep dispatched** (Opus on hub: vite 8 + plugin-svelte 7 + adapter-vercel 6, compat-matrix-first with vitest peer check, dev-server boot smoke on alt port; Sonnet on gw: plugin-svelte 7 across the 7 extension UIs). `typescript` 7 stays HELD (GA uncertainty); `happy-dom` only if a vitest bump forces it. AI-endpoints smoke still pending.
- **2026-07-08** — **Vite toolchain lockstep shipped, both repos.**
  - hub `f4db0b02` — vite 8.1.3 + plugin-svelte 7.2.0 + adapter-vercel 6.3.4 in one commit. Whole stable set already supported vite 8 (kit 2.69, vitest 4, @tailwindcss/vite peer ranges) → zero companion bumps. Two real config changes: (1) vitest.config `svelte({hot:false})`→`compilerOptions.hmr:false` (option removed in plugin-svelte 7); (2) plugin-svelte 7 removed `api.sveltePreprocess` auto-registration that the deprecated `@inlang/paraglide-sveltekit` link-translation preprocessor relied on → re-registered manually in svelte.config.js + filtered its dead register-plugin from vite.config.ts. Gates: check 0/0, 1513/1513 (no flakes), build 0, dev-boot smoke `VITE v8.1.3 ready` + /login HTML on :5199. **Follow-up option:** hub locale is localStorage-driven (no URL prefixes), so the paraglide link preprocessor is effectively redundant — could be dropped in a separate cleanup.
  - gw `5d09432b7` — plugin-svelte 7.2.0 + vite 8.1.3 across all 7 extension UIs (discord, telegram, voice-call, whatsapp, alert-watcher, studio, meta-graph). plugin-svelte 7 requires vite 8 (no vite-7 combo exists). Zero config changes (vite 8's rolldown build accepts our `rollupOptions.input` alias). Tracked dist/ rebuilds + node_modules symlinks committed with the lockfile; generator-drift files restored pre-commit. Gates: tsgo 0, 7/7 UI builds, root build 0. **Oddity flagged:** plugin-svelte 7.2.0 resolved despite being ~37h old — `minimumReleaseAge: 2880` did not hold it as expected.
  - Vite/Rolldown note: vite 8 swaps Rollup/esbuild→Rolldown/Oxc; both repos' builds ran through it transparently.
  - **Remaining held:** `typescript` 7 (GA uncertainty), `happy-dom` 20 (not forced). **Campaign fully complete otherwise.** Pending human: AI-endpoints smoke.
- **2026-07-08** — **DEPLOYED, both repos, level.** hub: `dev:master` FF → dev==master==`f4db0b02`, Vercel production READY (migration-gated build passed). gw: local DEV had been rewritten by the pre-push hook's auto version-bump → reset to origin/DEV; `main` merged via the repo's standard pattern (`b16ca14c2`), pushed; netcup prod deployed via `setup/utilities/deploy-bot-prd.sh` — backup `20260708-234038`, dep-sync installed the campaign majors (45 added/65 removed/75 changed), service active(running) NRestarts=0. Post-checks: 2/3 WhatsApp sessions reconnected without QR; +51906090526 401 = known pre-existing (FACES OFICIAL); free-tier ENOENT pre-existing. **Only remaining human QA: AI-endpoints smoke (now live on prod).**
- **2026-07-08** — **PUSHED, both repos.** hub `b1d7e994..f4db0b02` → origin/dev clean. gw needed two interventions: (1) remote DEV had gained `fcaed52e3` (concurrent session re-pushed their agents fix with a different SHA; local copy also carried the pre-push hook's version bump 2026.7.2→7.4-dev) → rebased onto origin/DEV, tree byte-identical, the duplicate fix commit correctly reduced to the version-bump line; (2) pre-push CI gate caught a P1 leftover — `@grammyjs/types` devDep `^3.24.0` vs lockfile specifier `3.24.0` (rewritten by the pnpm override) fails `test/ci/lockfile-consistency.test.ts` → pinned the devDep exact to match the override (`4062b9dca`), consistency test 3/3, pushed `fcaed52e3..4062b9dca` → origin/DEV. **Lesson: a pnpm override on a package that is ALSO a direct dep must use the same exact specifier in both places or gw's lockfile-consistency CI fails.**
