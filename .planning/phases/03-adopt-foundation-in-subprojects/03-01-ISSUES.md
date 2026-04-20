# 03-01 Execution Issues

Captured during minion adoption (2026-04-20).

## Strict-Mode Fallout

### Transitional overrides applied

`minion/tsconfig.json` layers two transitional overrides on top of `@minion-stack/tsconfig/node.json` (which inherits from `base.json`):

- `"noUncheckedIndexedAccess": false` — the shared base sets this to `true`. Enabling it in minion produces **1,616 new errors** across the codebase (counted: 1643 total with override off vs 27 with override on).
- `"noImplicitOverride": false` — the shared base sets this to `true`. Minion's TUI class hierarchy (e.g. `src/tui/components/custom-editor.ts`) does not currently annotate overrides.

### Rationale

- Phase 3 scope (per 03-01-PLAN.md Task 1 step 3): "If error count exceeds 30 → layer transitional override + log deferred".
- The fallout is fixable but strictly out-of-scope for Phase 3 (adoption is config-only).
- Applying the overrides preserves the `extends: "@minion-stack/tsconfig/node.json"` contract while keeping the subproject buildable.

### Pre-existing errors (NOT caused by adoption)

With the transitional override applied, `pnpm tsgo` still reports **27 errors**. A `git stash` experiment confirmed these 27 errors exist in the pre-adoption tsconfig.json too — they are **pre-existing** and out-of-scope for Phase 3.

Most are `TS2307 Cannot find module` from optional peer deps that aren't installed by default:

- `@sentry/node`, `posthog-node`, `jsonrepair`, `stripe`, `livekit-server-sdk`
- `@libsql/client`, `yjs`, `y-protocols/*`, `lib0/*`

A few are real bugs (not adoption-related):

- `extensions/paperclip/src/tool.ts` — type mismatch on tool signature
- `extensions/weixin/src/outbound.ts` — missing `messageId` in OutboundDeliveryResult
- `src/cli/gateway-cli/run.ts:264` — `Cannot find name 'env'`
- `src/gateway/server-methods/dream-history.ts:27` — arity mismatch
- `src/agents/identity/personal-agent-migration.test.ts` — spread on unknown

Memory cross-reference: `project_minion_ai_ci_patterns.md` documents that minion-ai's `install-smoke.yml` and CI workflows already fail on the base DEV branch for unrelated reasons — the adoption PR will not make things worse.

## Follow-up plan (Phase 8 Polish)

1. Remove both transitional overrides from `minion/tsconfig.json`.
2. Fix the 1,616 `noUncheckedIndexedAccess` warnings in a dedicated refactor plan.
3. Add `override` keyword in TUI class hierarchy for `noImplicitOverride`.
4. Install or properly opt out the 9 optional peer-dep modules behind feature flags.

## Verification evidence (2026-04-20)

```bash
cd /home/nikolas/Documents/CODE/AI/minion
# With override on (adopted state):
pnpm tsgo 2>&1 | grep -cE "^src/.*: error TS"  # → 27

# With override off:
# (edited tsconfig temporarily, reverted) → 1643 errors

# With pre-adoption tsconfig (git stash):
pnpm tsgo 2>&1 | grep -cE "^src/.*: error TS"  # → 27 (same as adopted)
```

Conclusion: the adoption adds ZERO new type errors when the transitional override is in place. The override exists to preserve the shared tsconfig extension without forcing a scope-creep refactor.
