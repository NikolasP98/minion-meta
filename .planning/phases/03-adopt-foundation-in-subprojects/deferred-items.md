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
