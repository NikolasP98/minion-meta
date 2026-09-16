# 360 UI, dependency and Sentry verification — 2026-09-09

## Implemented scope

- SecretEditModal now uses existing native Dialog with secret label/name, secret-key description, initial password focus, guarded dismissal and hidden close trigger during save. Save result/error/retry behavior remains. Error output gains role=alert.
- ImageLightbox uses native Dialog, localized title and optional alt text. Removed ineffective aria-modal-only overlay and global close CSS. Shared foundation owns isolation, cancel handling and focus return.
- CrmSentimentTrend delegates to a typed HTML formatter, interpolates real localized sample count and escapes all display labels. Numeric sign/decimal output remains.
- No Home/Calendar/server edits, manifest edits, branch/worktree/stash/commit/deploy.

## Verified evidence and limits

- Focused red baseline: overlay-contract.test.ts failed because old secret editor rendered divs rather than native dialog; initial mixed run 1 failed / 2 passed.
- After implementation: 3 focused/nearby test files passed, 17 tests total (64.87s). Includes render contracts, parsed tooltip EN/ES labels, signed values, hostile HTML escaping and 10 existing foundation checks.
- Final focused rerun after the canonical Button import: **2 files / 7 tests passed**, 57.96s; scoped Prettier check passed.
- Direct Svelte compilation of all 3 edited components: zero warnings.
- Token integrity: 2,204 files / 13,460 consumers / zero violations. Design lint remained informational exit0 with inherited/global reason-coded debt and unrelated dirty-file icon increases; changed lightbox removes an icon-size occurrence. No clean-global claim.
- Native browser fixture attempted through browser-harness with exclusive dedicated 9223 session BU_NAME=minion-360-ui. Credential-free fixture served only on 127.0.0.1:5293. Development fixture failed to reach a usable mounted state: initial duplicate raw/optimized Svelte runtime raised get_first_child error, later reload/optimizer instability and runtime-evaluate timeouts persisted. **No native Escape/Tab/return-focus/save interaction acceptance is claimed.** SSR tests do not prove these behaviors.
- Fixture and server files remain under `/tmp/minion-360-ui-fixture` for debugging; only owned fixture browser tabs were closed and owned server stopped. Dedicated browser itself remains available to root.
- Resolved implementation TODOs replaced with explicit native-consumer qualification TODOs at both Dialog consumers, linked to the existing remediation proposal. Parent owns proposal/requirement disposition and independent verification.
- Execution deviation: an initial `bunx vitest` accidentally ran from meta root, resolved/downloaded temporary Vitest5 in Bun cache and was interrupted (exit130). Root manifests/locks unchanged; Hub manifests/lock have only existing staged changes and no new unstaged manifest/lock diff. Subsequent commands use installed Hub node_modules/.bin tools. No package install into the project occurred.

## Sentry availability

No callable Sentry tool in ALL_TOOLS; no shell Sentry variables; no ~/.sentryclirc or root/Hub .sentryclirc; no Sentry key values in inspected root/Hub local env files. Only key existence/nonempty booleans were inspected; no secrets printed. No authenticated Sentry org/project can be identified from this available metadata, so releases, uploaded source maps, alert rules and event receipt remain **unverified**, not absent.

Source evidence: Hub hooks.server.ts:458-470 contains conditional Sentry.init (`enabled: !!env.SENTRY_DSN`), 0.1 default sampling and environment assignment; init has no explicit release field. Its comment explicitly leaves instrumentation.server.ts and sentrySvelteKit Vite source-map/request-tracing integration as an upgrade path. Current Vite/CI inspection finds no source-map upload integration. Client errors go to PostHog, not Sentry. Root should close OPS qualification only after legitimate project access provides release-to-commit, map upload and alert delivery evidence; do not invent a Sentry setup or emit synthetic production errors merely to prove access.

## Dependency graph and minimal remediation sequence

Current remote audit snapshot: Hub master d1c5d8022b2887f60fa0c3ef6e96f9f017902b57, bun.lock SHA256 ebc14272d106ebd486bedc7128fbaa5e775b15f1f675c026c33d5c9507c2963d. Dirty worktree lock SHA256 at this check: 94171a4b10056fe4bfc6243fa78bbac6d4676d9bd17d0083a358b19e9e873df8. Fifteen package records differ; do not replace the entire dirty lock with remote lock.

Current remote and worktree both resolve SvelteKit2.69.2, Tiptap3.27.3, xmldom0.8.13, DOMPurify3.4.11, Vitest4.1.10, TanStackTable9.0.0-alpha.10 and Paraglide adapter0.16.1. Current remote happy-dom is20.11.6 versus local15.11.7, so local old happy-dom is not a production-current claim.

Source/import/config plus dependency/optional/peer graph review:

- d3-scale, d3-shape and their types: no active imports/config or other locked dependent edges; current sentiment chart uses ECharts. Strong removal candidates. d3-cloud is active and stays.
- @codemirror/lang-sql: no active import/config or locked dependent edges. Confirm product language support then remove/wire intentionally.
- @types/dompurify: deprecated stub and no dependent edge; DOMPurify supplies own types. Remove direct stub in a scoped package transaction with typecheck.
- @tiptap/extension-node-range: **keep**, exact peer of extension-drag-handle3.27.3 despite no direct app import.
- Site postgres: **keep**, CRM SDK tarball peer requires ^3.4.0; drizzle also declares postgres peer. Regex-unused would be wrong.
- Site @node-rs/argon2 and @paper-design/shaders remain removal candidates after shared package peer and old configuration checks. No deletion is applied here. Site Vercel telemetry declarations require product decision: wire intentional telemetry or remove unused imports/declarations; installed package is not evidence of event collection.

Minimal patch order for the dependency owner: (1) lock-compatible security updates SvelteKit, Tiptap family together, DOMPurify, xmldom parents/resolution and Vitest4 patch; rerun native runtime/XML/signature/markdown fixtures; (2) remove proven unused direct declarations/types as a separate lock transaction; (3) migrate deprecated Paraglide adapter with locale/SSR/build parity; (4) stable TanStackTable migration or table consolidation; (5) publish distinct immutable shared package versions with explicit digests and license files. No automatic update-all or wholesale lock replacement.

The existing current-remote advisory inventory remains at `.lavish/minion-qc-2026-09-08/ui-dependencies.md`: 32 unique GHSAs, 33 package/advisory rows; these are inventory matches, not 33 demonstrated exploits. No additional dependency installation/removal was authorized to this lane.

GSD `verify plan-structure` for 13-01: valid=true, zero errors/warnings, three tasks. Scoped `git diff --check` passed.

## Root native qualification follow-up

The failed development fixture above is retained as historical evidence. A production Vite bundle of the real components now mounts reliably, without app routes or credentials. Permanent source and commands: `minion_hub/tests/fixtures/overlay-native/README.md`. Native Chromium on dedicated CDP9223 passed six grouped checks; four screenshots and machine-readable results are in `.lavish/minion-360-implementation/overlay-evidence/`. Desktop1440×1000 and mobile390×844 were checked. Focus initialization, inert background Tab traversal, guarded save/duplicate/Escape/backdrop, error retry, result visibility, focus return, and mobile image bounds passed. The fixture uses a short English adapter and synthetic callbacks; no actual credential save or authenticated route was exercised.

A rapid-close/reopen fixture reproduced a shared Dialog race: a queued close event dismissed the new opening. The fix ignores that stale event while native open is true, releases modal state before controlled close and captures the focus-return target. The same fixture now keeps the new dialog modal with zero close callbacks. Consumer qualification TODOs are resolved; broad browser/route qualification stays open. No claim of Safari/Firefox/assistive technology qualification follows from this Chromium run.
