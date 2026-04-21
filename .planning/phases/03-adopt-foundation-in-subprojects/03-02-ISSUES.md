# 03-02 Execution Issues

Captured during minion_hub adoption (2026-04-21).

## Strict-Mode Fallout

### Transitional overrides applied

`minion_hub/tsconfig.json` layers two transitional overrides on top of `@minion-stack/tsconfig/svelte.json` (which inherits from `base.json` via `extends`):

- `"noUncheckedIndexedAccess": false` — the shared base sets this to `true`. Enabling it in minion_hub produces **~408 new errors** (count went from 18 pre-adoption → 426 post-adoption without override).
- `"noImplicitOverride": false` — defensive override mirroring the 03-01 and 03-04 precedent; no explicit override annotations exist in hub's class hierarchies.

### Rationale

- Phase 3 scope (per 03-02-PLAN.md Task 1 step 4): "If noUncheckedIndexedAccess fallout exceeds 50 errors → create ISSUES.md listing errors by file + layer transitional override + add entry to deferred-items.md".
- Mirrors exactly the 03-01 minion + 03-04 paperclip-minion adoption pattern.
- The fallout is fixable but strictly out-of-scope for Phase 3 (adoption is config-only).
- Applying the overrides preserves the extends array contract (`@minion-stack/tsconfig/svelte.json` first, `./.svelte-kit/tsconfig.json` last) while keeping svelte-check buildable.

### Heavy-hitter files (error distribution with override OFF)

Top files contributing to the 408 new errors (dominated by `noUncheckedIndexedAccess`):

- `src/lib/components/layout/MinionLogo.svelte` — ~24 errors (`currentPreset` array/map lookups)
- `src/lib/components/workshop/WorkshopCanvas.svelte` — multiple index lookups
- `src/lib/components/reliability/*.svelte` — `IncidentTable`, `SkillStatsPanel`, `CredentialHealthPanel`
- `src/lib/components/sessions/TranscriptViewer.svelte`
- `src/lib/components/settings/PatternSettings.svelte`
- `src/lib/components/users/BindingsTab.svelte`
- `src/routes/+layout.svelte`, `src/routes/(app)/config/+page.svelte`, `src/routes/(app)/reliability/+page.svelte`, etc.
- `src/routes/(app)/marketplace/agents/[slug]/+page.svelte`
- `src/routes/invite/accept/+layout.svelte`, `src/routes/login/+layout.svelte`

Primary patterns: array index access (`arr[i]` typed as `T | undefined`) + `Record<string, T>` property lookups + `theme.preset` (optional) unwrapping.

### Pre-existing errors (NOT caused by adoption)

With the transitional override applied, `bun run check` reports **18 errors** — exactly matching the pre-adoption baseline (`git stash` A/B confirmed). These 18 are **pre-existing** and out-of-scope for Phase 3:

- `src/lib/auth/auth.ts:38` — `BetterAuthOptions` missing `accountLinking` property (better-auth version drift)
- `src/routes/api/builder/skills/+server.ts:11` — `status` narrow-string mismatch
- `src/lib/components/builder/AgentCreateWizard.svelte:94,98` — Zag.js `Machine<MachineSchema>` / `Service<StepsService>` generic incompat (2 errors)
- `src/lib/components/channels/ChannelsTab.svelte:43–48` — 13 errors for properties `bot`, `application`, `self`, `tokenSource`, `dmPolicy` not on channel schema type (schema drift after channel-management feature shipped)
- `src/routes/(app)/builder/tools/[id]/+page.svelte:533` — `autocorrect` attribute not in HTMLProps<"textarea">

None are adoption-caused. `git stash` experiment before adoption confirmed identical 18 errors on dev HEAD.

## Follow-up plan (Phase 8 Polish)

1. Remove both transitional overrides from `minion_hub/tsconfig.json`.
2. Fix the ~408 `noUncheckedIndexedAccess` warnings in a dedicated refactor plan — primarily null-guards on Record/array lookups and theme preset unwrapping. Expected effort: ~2 days given the concentration in MinionLogo + workshop + reliability components.
3. Keep 03-01 and 03-04 precedent: a single codemod-ish fix pass per subproject, not trickled in.

## Verification evidence (2026-04-21)

```bash
cd /home/nikolas/Documents/CODE/AI/minion_hub
# With override on (adopted state):
bun run check 2>&1 | tail -2
# → COMPLETED 7696 FILES 18 ERRORS 29 WARNINGS 19 FILES_WITH_PROBLEMS

# With override off (tested intermediate, reverted):
# → 426 ERRORS

# With pre-adoption tsconfig (git stash):
# → 18 ERRORS (exact match)
```

Conclusion: adoption adds ZERO new type errors when the transitional overrides are applied. The overrides preserve the shared tsconfig extension without forcing a scope-creep refactor, following the 03-01 minion + 03-04 paperclip patterns.
