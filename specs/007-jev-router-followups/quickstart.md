# Quickstart: validating the JEV router follow-up fixes

All commands run from the `minion_hub` checkout (not this meta-repo worktree). `bunx svelte-kit
sync && bun run i18n:compile` first in a fresh checkout (per the audit's own note that the
envelope-size test suites otherwise fail on `$lib/paraglide/runtime`).

## D3 — `brain` wording improves separation (US1, SC-001)

```bash
bun run vitest run src/lib/assistant/turn-router.test.ts
LIVE_LLM=1 bun run vitest run src/lib/assistant/jev-probe-set.live.test.ts
```

Expected: unit tests pass unchanged in count/shape (new cases allowed, FR-011); the live probe
report shows the `brain` manifest's true/false score ranges no longer overlapping its
threshold — or, if they still do, a measured improvement over the audit's 0.57–0.92 / 0.08–0.85
baseline, with the gap quantified in the test's own output.

## D7 — follow-up turns keep context (US2, SC-002)

```bash
bun run vitest run src/server/services/assistant-router.service.test.ts
```

Expected: a new case constructs `buildState(text, locale, priorMode)` for each of the audited
follow-up strings ("sí", "viernes 3pm", "12") with a preceding `record_action`/`forms` mode,
and confirms the rendered `state` string contains the `prior_mode` line. A second case confirms
`buildState(text, locale)` (no third arg) renders identically to today's output — the
no-history path is unchanged (FR-004).

Manual/live check (optional, mirrors D1's manual check in hub #540):

```bash
LIVE_LLM=1 bun run vitest run src/lib/assistant/jev-probe-set.live.test.ts
```

Expected: the three follow-up probe rows (`fu-yes`, `fu-value`, `fu-qty`) no longer report
`STARVED` when run with their preceding turn's mode supplied.

## D5 — `hub.pages` flags weak-only matches (US4, SC-003)

```bash
bun run vitest run src/lib/assistant/global-tools.test.ts
```

Expected: a new case calls the `hub.pages` tool's `execute` with `{ query: 'planilla de
sueldos' }` (the audit's own example — a near-miss on `/team`'s `~planilla` keyword) and
asserts the returned hit for `/team` carries `moduleMissing: true`. A second case with a
strong-matching query (e.g. `{ query: 'inventario' }`) asserts `moduleMissing: false` on that
hit.

## D8 — rate limit fails open (US5, SC-004)

```bash
bun run vitest run src/routes/api/assistant/route/server.test.ts
```

Expected: a new case calls the route handler `21` times within the window for the same user id
and asserts the 21st response is still `{ decision: null }` at HTTP 200, with
`classifyAssistantTurn`/the fetch mock never invoked for that 21st call. A second case confirms
20 calls in the window all proceed to call the classifier normally (no false-positive
throttling at the boundary).

## D9 — server timeout strictly smaller (US5, SC-005)

```bash
grep -n "TIMEOUT_MS" src/lib/assistant/turn-router.ts src/server/services/assistant-router.service.ts
```

Expected: `turn-router.ts` shows `1500`, `assistant-router.service.ts` shows `1200` — diffable
in the same review, per SC-005.

## D10 — probe set runs on demand (US3, SC-006)

```bash
LIVE_LLM=1 bun run vitest run src/lib/assistant/jev-probe-set.live.test.ts
```

Expected: completes without requiring `OPENROUTER_API_KEY` to be absent-safe (skips cleanly
with a clear message if the key is missing, same as `prompt-contract.live.test.ts`); when the
key is present, reports a table/summary of per-manifest true/false score ranges and a
pass/fail per threshold, readable without opening `audits/2026-10-15-agent-harness/
B-jev-router.md`.

## Full regression (SC-007)

```bash
bun run vitest run src/lib/assistant src/lib/state/features src/server/services/assistant-router.service.test.ts src/routes/api/assistant
bunx prettier --plugin=prettier-plugin-svelte --check <changed files>
NODE_OPTIONS=--max-old-space-size=6144 bunx svelte-check --threshold error --output machine | grep ERROR | cut -d'"' -f2 | sort -u
DESIGN_LINT_BASE_REF=origin/master node scripts/design-lint.mjs
```

Expected: same four gates hub #540 ran, same pre-existing-error baseline (7 errors unrelated to
this feature's files, per hub #540's own PR body) — no new errors introduced.
