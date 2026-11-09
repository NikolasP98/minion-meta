# Plan

Modify only the reported scripts, gateway connection initialization and focused
regressions. Keep retirement authority separate from scoring eligibility; reuse
the provenance digest check before npm installation. Use a compiled Svelte
fixture through the public component exports, without changing UI behavior.

Run the two targeted Node test files and the gateway/client and primitive Vitest
files in one final focused round. No repository-wide gates, branch changes,
commits, pushes, PR operations or CI actions belong to this phase.
