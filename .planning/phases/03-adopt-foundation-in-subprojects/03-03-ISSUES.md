# 03-03 Execution Issues

Captured during minion_site adoption (2026-04-21).

## Strict-Mode Fallout

### Transitional overrides applied

`minion_site/tsconfig.json` layers two transitional overrides on top of `@minion-stack/tsconfig/svelte.json` (which inherits from `base.json`):

- `"noUncheckedIndexedAccess": false` — the shared base sets this to `true`. Enabling it in minion_site produces **53 new errors** (count went from 0 pre-adoption → 53 post-adoption without override).
- `"noImplicitOverride": false` — defensive override mirroring the 03-01/03-02/03-04 precedent; no explicit override annotations exist in site's class hierarchies.

### Rationale

- Phase 3 scope (per 03-03-PLAN.md Task 1 step 4): "If >30 errors → create ISSUES.md listing errors by file + layer transitional override + add entry to deferred-items.md".
- Mirrors exactly the 03-01 minion + 03-02 hub + 03-04 paperclip-minion adoption pattern.
- The fallout is fixable but strictly out-of-scope for Phase 3 (adoption is config-only).
- Applying the overrides preserves the extends array contract (`@minion-stack/tsconfig/svelte.json` first, `./.svelte-kit/tsconfig.json` last) while keeping svelte-check buildable.

### Heavy-hitter files (error distribution with override OFF)

All 53 new errors are concentrated in 8 files, dominated by `noUncheckedIndexedAccess`:

- `src/lib/components/sections/Channels.svelte` — ~32 errors (`p` / `ic` array-index lookups in channel-row rendering)
- `src/lib/components/sections/DashboardPreview.svelte` — 7 errors (array index access in preview shimmer data)
- `src/lib/components/effects/HeroParticles.svelte` — 3 errors (particle array mutation)
- `src/routes/(app)/members/+page.svelte` — 3 errors (`server` possibly undefined after array lookup)
- `src/routes/api/device-identity/sign/+server.ts` — 1 error (object possibly undefined)
- (+ a few more scattered files)

Primary patterns: `.map((p, i) => ...)` callbacks where `p` is inferred as `T | undefined` under `noUncheckedIndexedAccess`, and direct `arr[i]` access without null-guards.

### Pre-existing errors (NOT caused by adoption)

With the transitional override applied, `bun run check` reports **0 errors, 1 warning** — exactly matching the pre-adoption baseline (`git stash` A/B confirmed). The 1 pre-existing warning is:

- `src/lib/components/ui/LeadFormDialog.svelte:11:5` — a11y `click_events_have_key_events` on a non-interactive visible element.

None are adoption-caused. `git stash` experiment before adoption confirmed identical 0 errors + 1 warning on master HEAD.

## Follow-up plan (Phase 8 Polish)

1. Remove both transitional overrides from `minion_site/tsconfig.json`.
2. Fix the 53 `noUncheckedIndexedAccess` warnings in a focused refactor plan — primarily array-iteration null-guards in the `Channels.svelte` rows. Expected effort: <0.5 day given the tight concentration (1 file = ~60% of errors).
3. Keep 03-01 / 03-02 / 03-04 precedent: a single codemod-ish fix pass per subproject, not trickled in.

## Verification evidence (2026-04-21)

```bash
cd /home/nikolas/Documents/CODE/AI/minion_site
# With override on (adopted state):
bun run check 2>&1 | tail -2
# → COMPLETED 4808 FILES 0 ERRORS 1 WARNINGS 1 FILES_WITH_PROBLEMS

# With override off (tested intermediate, reverted):
# → 53 ERRORS

# With pre-adoption tsconfig (git stash):
# → 0 ERRORS 1 WARNINGS (exact match)
```

Conclusion: adoption adds ZERO new type errors when the transitional overrides are applied. The overrides preserve the shared tsconfig extension without forcing a scope-creep refactor, following the 03-01 / 03-02 / 03-04 precedents. Site's fallout (53) is dramatically smaller than hub's (408) because site is a much thinner codebase.
