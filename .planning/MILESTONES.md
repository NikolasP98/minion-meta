# Milestones

## v1.0 Minion Meta-Repo Foundation (Shipped: 2026-04-23)

**Phases completed:** 8 phases, 42 plans, 68 tasks

**Key accomplishments:**

- minion/ (DEV branch, 5 new commits):
- Branch:
- GitHub side (complete):
- Found during:
- One-liner:
- Seven Infisical projects renamed/created to `minion-<name>` convention (ai-providers → minion-core, paperclip → minion-paperclip, +5 new placeholders + 2 already-correct) via dashboard; zero Netcup edits required because production services target Infisical by UUID, not slug.
- One-liner:
- minion/ now extends `@minion-stack/tsconfig/node.json` + `@minion-stack/lint-config/oxlint-preset.json`, ships `.env.defaults`, and has adoption PR #77 open on NikolasP98/minion-ai@DEV.
- minion_hub/ now extends `@minion-stack/tsconfig/svelte.json` via the TS 5.0 extends array (with `./.svelte-kit/tsconfig.json` last-wins), wires Prettier directly to `@minion-stack/lint-config@0.1.1/prettier.config.cjs` (no shim), ships `.env.defaults`, adds net-new `.github/workflows/ci.yml`, and has adoption PR #16 open on NikolasP98/minion_hub@dev.
- minion_site/ now extends `@minion-stack/tsconfig/svelte.json` via the TS 5.0 extends array (with `./.svelte-kit/tsconfig.json` last-wins), wires Prettier directly to `@minion-stack/lint-config@0.1.1/prettier.config.cjs` (no shim), ships `.env.defaults`, adds net-new `.github/workflows/ci.yml`, adds `.prettierignore`, and has adoption PR #2 open on NikolasP98/minion-site@master.
- paperclip-minion now extends `@minion-stack/tsconfig/node.json` via `tsconfig.base.json` (inheritance-root pattern), wires Prettier via a local CJS shim, ships `.env.defaults`, expands `.env.example` from 4 to 85+ vars, and has adoption PR #1 open on NikolasP98/paperclip@minion-integration.
- pixel-agents/ now extends `@minion-stack/tsconfig/node.json` (extension) + `@minion-stack/tsconfig/base.json` (webview React), wires both ESLint configs to spread `@minion-stack/lint-config/eslint.config.js` while preserving the local `eslint-plugin-pixel-agents`, migrates Prettier to `package.json → @minion-stack/lint-config/prettier.config.cjs`, ships net-new `.env.defaults` + `.env.example`, and has adoption PR #246 open on pablodelucca/pixel-agents@main (pushed via NikolasP98 fork).
- Full D-27 deferral of minion_plugins from Phase 3 adoption — markdown+YAML catalog with zero TS/JS/package.json and a 0-secret placeholder Infisical project means nothing exists to adopt. ADOPT-06 and ADOPT-07 closed as N/A with Phase 8 revisit triggers documented.
- `@minion-stack/shared@0.1.0` workspace package scaffolded from minion-shared/src/ with tsc build producing full dist/ including gateway protocol types and WS connection utilities
- `@minion-stack/shared@0.1.0` published to npm and `minion-shared@0.2.0` deployed as a deprecation shim with console.warn + npm registry deprecation notice, enabling zero-breakage consumer migration
- minion_site migrated off deprecated `minion-shared` onto `@minion-stack/shared` — 3 import sites updated, bun install resolved, bun run check passes with 0 errors, PR #3 open on NikolasP98/minion-site
- minion-shared/ deleted from disk, removed from .gitignore, and 04-VERIFICATION.md written documenting all 5 SHARE requirements — phase 04 complete
- 38 Drizzle schema files extracted from minion_hub into packages/db, tsc-built, published as @minion-stack/db@0.2.0. A1 verification FAILED — plan 05-03 uses Option B (local re-export stubs).
- minion_site local schema deleted (6 files) and replaced with @minion-stack/db imports across 6 files; bun run check passes 0 errors; PR #4 open on minion-site.
- minion_hub app code migrated to @minion-stack/db — 56 import sites updated across client.ts, auth.ts, seed.ts, hooks.server.ts, 14 API routes, and 26 services. Local schema files retained for drizzle-kit. bun run check: 18 pre-existing errors. bun run db:push: exits 0. PR #17 open on NikolasP98/minion_hub.
- drizzle.config.ts created at meta-repo root pointing at packages/db/src/schema. Staging dry-run against SQLite clone: "No changes detected" (56 tables, zero DDL). A2 CONFIRMED. Checkpoint gate awaiting human approval for production cutover.
- Hub migration scripts removed (PR #18). Production Turso push: "No changes detected", exit 0. Phase 5 COMPLETE — all DB-01..DB-07 requirements satisfied. VERIFICATION.md written.
- `@minion-stack/auth@0.2.0` workspace package with `createAuth()` factory: jwt(EdDSA/1h/openclaw-gateway) + accountLinking hardcoded; callers inject organization/oidcProvider via plugins param (D-02 revised)
- minion_hub/src/lib/auth/auth.ts migrated from inline betterAuth() to createAuth() factory; $server/db/schema import fixed to @minion-stack/db/schema; PR #19 open on NikolasP98/minion_hub
- minion_site/src/lib/auth/auth.ts migrated from inline betterAuth() to createAuth() factory; JWT audience drift bug eliminated; PR #5 open on NikolasP98/minion-site targeting master
- Pre-flight checks run; CI failures found on both PRs; exact fixes documented; checkpoint returned for human action — merge PRs after applying fixes, then run Task 2 smoke tests.
- Phase 6 closed: `@minion-stack/auth@0.2.0` live on hub (minionhub.admin-console.dev) + site (minionsite.vercel.app) with identical JWKS kid `gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc`; AUTH-01..04 all Complete
- 315-LOC grep-sourced audit at `specs/ws-duplication-audit.md` inventorying 3 WS implementations (hub 920 LOC, site 373 LOC, paperclip 355 LOC) with exact import sites, per-export disposition tables, and target GatewayClient API surface for plan 07-02
- One-liner:
- One-liner:
- One-liner:
- GitHub Actions CI pipeline with pnpm workspace fanout scripts (lint-all, typecheck-all, build-all, test-all) gating every PR against main via oxlint + tsc + vitest + changesets
- One-liner:
- `minion doctor` extended with seven-package link-drift coverage (shared/db/auth) and a new git-status column that shows clean/N-dirty/(not cloned) per subproject, with clone-presence guard preventing auth-failure masking
- Root CLAUDE.md rewritten: zero minion-shared/ directory refs, all 7 @minion-stack packages documented, CI & Release Automation section added; README updated with CI workflow, full package table, and removed stale "future phases" language.
- Timed UAT dry-run confirmed README.md onboarding goes from scratch shell to `minion dev` in under 10 minutes — POLISH-05 PASS

---
