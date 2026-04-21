# Phase 03 — Deferred Items

Tracks out-of-scope findings surfaced during Phase 3 adoption work.

## From Plan 03-01 (minion adoption)

### Item: Strict-mode fallout in minion requires follow-up refactor

- **Surfaced:** 2026-04-20 during Task 1
- **Detail:** Extending `@minion-stack/tsconfig/node.json` enables `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`, producing 1616 new type errors in minion (count went from 27 pre-adoption → 1643 post-adoption without transitional override).
- **Workaround applied:** `minion/tsconfig.json` layers `noUncheckedIndexedAccess: false` + `noImplicitOverride: false` as transitional overrides.
- **Detailed triage:** `.planning/phases/03-adopt-foundation-in-subprojects/03-01-ISSUES.md`
- **Recommended resolution:** Phase 8 (Polish) plan — incremental refactor to remove both overrides. Expected effort: ~2–3 days of codemod + targeted fixes, since most violations are pattern-based (array/object index access).
- **Severity:** Low — the shared base contract is preserved (extends works, overrides are explicit and documented), and the 27 pre-existing errors are unchanged.

### Item: 27 pre-existing type errors on minion DEV (not adoption-caused)

- **Surfaced:** 2026-04-20 (verified via `git stash` comparison during Task 1)
- **Detail:** `pnpm tsgo` reports 27 errors on DEV branch regardless of whether `@minion-stack/tsconfig` adoption is applied. Most are `TS2307 Cannot find module` from optional deps (@sentry/node, stripe, yjs, @libsql/client, posthog-node, livekit-server-sdk, jsonrepair) plus a few real bugs (extensions/paperclip, extensions/weixin, src/cli/gateway-cli/run.ts, src/gateway/server-methods/dream-history.ts).
- **Cross-reference:** memory `project_minion_ai_ci_patterns.md` confirms systemic CI failures on DEV.
- **Scope:** NOT Phase 3. The adoption PR will preserve this pre-existing state, not fix it.
- **Recommended resolution:** Dedicated minion-maintenance plan post-Phase 3. Not blocking.

## From Plan 03-04 (paperclip-minion adoption)

### Item: Strict-mode fallout in paperclip-minion requires follow-up refactor

- **Surfaced:** 2026-04-20 during Task 1
- **Detail:** Extending `@minion-stack/tsconfig/node.json` enables `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`, producing 428 new type errors across 13 of 21 workspace packages in paperclip.
- **Workaround applied:** `paperclip-minion/tsconfig.base.json` layers both flags as `false` (transitional overrides).
- **Detailed triage:** `.planning/phases/03-adopt-foundation-in-subprojects/03-04-ISSUES.md`
- **Recommended resolution:** Phase 8 (Polish) plan — incremental refactor. Primary error patterns are null-guards on drizzle `.returning()` results and class hierarchy override annotations. Expected effort: ~2–3 days codemod + targeted fixes.
- **Severity:** Low — `extends` contract preserved, overrides explicit and documented.

### Item: @minion-stack/lint-config Prettier CJS/ESM mismatch

- **Surfaced:** 2026-04-20 during 03-04 Task 2
- **Detail:** `@minion-stack/lint-config@0.1.0/prettier.config.js` uses CJS (`module.exports`) but the package is `type: "module"`. Loading fails with _"module is not defined in ES module scope"_ on ESM-typed consumers (paperclip, likely hub + site too).
- **Workaround applied (paperclip):** local `prettier.config.cjs` shim that inlines the shared config values byte-for-byte.
- **Recommended resolution:** Upstream fix in `@minion-stack/lint-config@0.2.0` — ship `prettier.config.cjs` explicitly (or dual CJS/ESM build). Once fixed, remove the local shim in paperclip and likely also in hub+site (when they adopt).
- **Severity:** Low — workaround is 30 lines, but the fallout will repeat in every ESM-typed consumer (03-02 hub and 03-03 site will likely need the same shim).
- **Action:** Bump `@minion-stack/lint-config` to 0.1.1 with a CJS Prettier entrypoint BEFORE starting 03-02 hub adoption, to avoid repeating the shim.

### Item: paperclip CI doesn't run on `minion-integration` base

- **Surfaced:** 2026-04-20 during 03-04 Task 3
- **Detail:** All paperclip GitHub Actions workflows (pr.yml, docker.yml, release.yml, refresh-lockfile.yml) trigger only on `master`. PRs to `minion-integration` get zero automated verification.
- **Scope:** NOT Phase 3. The `minion-integration` branch is paperclip's long-lived integration branch for the minion gateway fork work; CI gap pre-existed this phase.
- **Recommended resolution:** Either (a) retarget the adoption PR to `master` (requires rebasing + separate lockfile PR first, per §Pitfall 7), (b) add a copy of pr.yml that triggers on `minion-integration` PRs too. Not blocking for adoption — local verification passed.

## From Plan 03-02 (minion_hub adoption)

### Item: Strict-mode fallout in minion_hub requires follow-up refactor

- **Surfaced:** 2026-04-21 during 03-02 Task 1
- **Detail:** Extending `@minion-stack/tsconfig/svelte.json` (which inherits `base.json`'s `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`) produces 408 new type errors in minion_hub (count went from 18 pre-adoption → 426 post-adoption without transitional override).
- **Workaround applied:** `minion_hub/tsconfig.json` layers both as `false` (transitional overrides).
- **Detailed triage:** `.planning/phases/03-adopt-foundation-in-subprojects/03-02-ISSUES.md`
- **Recommended resolution:** Phase 8 (Polish) plan — incremental refactor. Primary heavy-hitter files: `MinionLogo.svelte`, `WorkshopCanvas.svelte`, `reliability/*.svelte`, multiple `(app)/*/+page.svelte`. Expected effort: ~2 days of null-guards + theme preset unwrapping.
- **Severity:** Low — `extends` contract preserved, overrides explicit and documented. Matches 03-01 + 03-04 precedent.

### Item: 18 pre-existing type errors on minion_hub dev (not adoption-caused)

- **Surfaced:** 2026-04-21 (verified via `git stash` comparison during 03-02 Task 1)
- **Detail:** `bun run check` reports 18 errors on dev branch regardless of whether `@minion-stack/tsconfig` adoption is applied. Mix of Better Auth `accountLinking` schema drift, Zag.js generic mismatches in `AgentCreateWizard`, channel schema drift in `ChannelsTab`, and a stray `autocorrect` textarea attribute.
- **Scope:** NOT Phase 3. The adoption PR preserves this pre-existing state, not fix it.
- **Recommended resolution:** Dedicated hub-maintenance plan post-Phase 3. Not blocking.
