---
phase: 3
slug: adopt-foundation-in-subprojects
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during adoption execution.

Each subproject has its own test/build toolchain (pnpm/bun/npm). Validation runs per subproject with that subproject's own scripts — no meta-repo test harness.

---

## Test Infrastructure

| Subproject | Quick Command | Full Command | Runtime |
|-----------|---------------|--------------|---------|
| minion | `pnpm tsgo` | `pnpm check && pnpm build && pnpm test` | ~60s |
| minion_hub | `bun run check` | `bun run check && bun run build` | ~45s |
| minion_site | `bun run check` | `bun run check && bun run build` | ~30s |
| paperclip-minion | `pnpm typecheck` | `pnpm typecheck && pnpm build && pnpm test:run` | ~90s |
| pixel-agents | `npm run compile` | `npm run compile && npm test` | ~60s |
| minion_plugins | n/a (no TS) | env-only adoption: `minion doctor plugins` | ~5s |

**Cross-cutting check (meta-repo):** `node packages/cli/dist/index.js doctor --all --json` — must report all 6 healthy at phase close.

---

## Sampling Rate

- **After every task commit:** Run the subproject's quick command (e.g., `pnpm tsgo` after editing minion/tsconfig.json)
- **After each plan's final commit:** Run the subproject's full command
- **After each wave completes:** Run `minion doctor --all` from meta-repo
- **Before `/gsd-verify-work`:** All 6 subproject PRs must be green in their own CI
- **Max feedback latency:** ~90s (paperclip's full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | minion tsconfig | 1 | ADOPT-01 | No secret leak in adopted env defaults | Static | `grep -q '@minion-stack/tsconfig/node' minion/tsconfig.json` | — | pending |
| 03-01-T2 | minion lint-config | 1 | ADOPT-01 | — | Static | `grep -q '@minion-stack/lint-config/oxlint' minion/.oxlintrc.json` | — | pending |
| 03-01-T3 | minion env files | 1 | ADOPT-01 | `.env.defaults` contains no secrets | Static | `test -f minion/.env.defaults && test -f minion/.env.example` | — | pending |
| 03-01-T4 | minion CI | 1 | ADOPT-07 | — | CI | subproject's own GHA workflow passes | — | pending |
| 03-02..06 | analogous | 2,3 | ADOPT-02..06 | analogous | Static + CI | per subproject | — | pending |
| 03-XX | minion doctor | Final | ADOPT-07 cross-cut | — | Integration | `node packages/cli/dist/index.js doctor --all --json` | — | pending |

(Detailed per-task map is filled in during planning — above is the template each plan fills.)

---

## Validation Dimensions (Nyquist)

### Dimension 1: Unit coverage
Each subproject retains its existing test suite. No new unit tests required (adoption = config change, not code change).

### Dimension 2: Integration
Each subproject's own build pipeline validates the adopted configs resolve and compile. The build IS the integration test.

### Dimension 3: Contract
`@minion-stack/tsconfig` variants and `@minion-stack/lint-config` entrypoints are the contract. If a subproject's existing code relies on TSConfig options that the shared variant doesn't set, the subproject's tsconfig layers them in — documented per plan.

### Dimension 4: Static analysis
- `tsc --noEmit` per subproject (or equivalent: `svelte-check`, `tsgo`)
- Subproject lint runs (oxlint / eslint) with adopted presets
- Verify extends path resolves: `node -e "console.log(require.resolve('@minion-stack/tsconfig/package.json'))"` per subproject

### Dimension 5: Performance
N/A for this phase — no runtime code changes. Build time may fluctuate; not a regression target.

### Dimension 6: Security
- `.env.defaults` must contain zero secrets (grep gate: no `_KEY=`, `_SECRET=`, `_TOKEN=`, `_PASSWORD=` with actual values, only placeholders/booleans/urls)
- `.env.example` must contain var NAMES only, never values
- No API keys or credentials in adopted configs

### Dimension 7: Regression
Each subproject's existing test suite must still pass post-adoption. If strict-mode fallout (`noUncheckedIndexedAccess`) causes test failures, log in `03-0X-ISSUES.md` per research §Execution Risk and decide per-subproject whether to fix or layer an override.

### Dimension 8: Cross-phase integrity
- `minion doctor --all` reports all 6 subprojects healthy
- `packages/cli/src/lib/link-drift.ts` detects no forbidden local-link drift (D-20: published versions only)
- `minion.json → subprojects.<id>.commands` matches what the subproject's CI actually runs

---

## Wave-level Gates

| Wave | Plans | Gate | Pass Condition |
|------|-------|------|----------------|
| 1 | 03-01, 03-04 | pnpm/Node adoption pattern proven | Both subprojects: tsconfig extends resolves, lint preset resolves, env files committed, CI green on adoption PR |
| 2 | 03-02, 03-03 | SvelteKit + bun pattern proven | Both subprojects: extends array works with `.svelte-kit/tsconfig.json`, no `svelte-kit sync` regressions, env files committed. **Open Q#2 decides ESLint vs Prettier-only scope.** |
| 3 | 03-05, 03-06 | npm outliers handled | pixel-agents: dual tsconfig adopted, local `eslint-plugin-pixel-agents` preserved, CI final gate still enforces. minion_plugins: env-only OR full D-27 deferral decision logged. |
| Final | cross-cut | `minion doctor --all` | All 6 subprojects report healthy OR deferrals are explicit in `deferred-items.md` |

---

## Open Questions (gate resolution)

Per RESEARCH.md Open Questions — resolve before or during planning:

1. Does Infisical `minion-plugins` have any vars? → Run `minion infisical plugins` as pre-plan check.
2. Should hub/site adopt full ESLint or Prettier-only in this phase? → **Recommendation: Prettier-only in Phase 3; ESLint in Phase 8.** Planner should honor unless user overrides.
3. `paperclip-minion/ui/tsconfig.json` scope? → **Recommendation: stay untouched** until a `react` variant ships (Phase 8 backlog).
4. Net-new CI for hub + site + minion_plugins? → **Recommendation: minimal CI workflow added during adoption** to satisfy ADOPT-07 literal reading. If user defers, log as D-27.

---

## Canonical Links

- Research: `.planning/phases/03-adopt-foundation-in-subprojects/03-RESEARCH.md`
- Context: `.planning/phases/03-adopt-foundation-in-subprojects/03-CONTEXT.md`
- Requirements: `.planning/REQUIREMENTS.md` §ADOPT-01..07
- Roadmap: `.planning/ROADMAP.md` §Phase 3

---

*Last updated: 2026-04-20 (draft)*
