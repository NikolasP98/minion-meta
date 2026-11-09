# Quickstart: validating the JIT tool-selection fixes

All commands run inside the `minion` gateway repo (a separate checkout from this spec's
`minion-meta` worktree — see plan.md's Repo note). Replace `<gw>` with that checkout's root.

## Prerequisites

- `minion` repo checked out on a feature branch off `DEV` (per repo-policy), `pnpm install` run.
- No external services needed — the index is in-process; tests use the lexical fallback scorer
  (no embedding provider credentials required).

## Slice 1 — query stripping + all-zero fallback

```bash
cd <gw> && pnpm vitest run src/agents/tool-search/strip-envelope.test.ts src/agents/tool-search/select-tools.test.ts src/agents/tool-search/apply-selection.test.ts
```
**Expect**: a test asserting `stripContextEnvelope("<text>\n\n[In-app assistant context ...
Don't restate this context.]")` returns `"<text>"`, and a test asserting
`applyJitToolGate` with an envelope-only prompt (post-strip empty) returns the full `l1Tools` set
in `mode: "on"`, not a `TOOL_ORDER`-tie-broken top-20.

## Slice 2 — per-caller index

```bash
cd <gw> && pnpm vitest run src/agents/tool-search/tool-index.test.ts
```
**Expect**: a test that builds two indices for two different `agentId`s with different catalogs
concurrently (`Promise.all`), then asserts each agent's `rankTools`/`listIndexedIds` only ever see
their own catalog's ids.

## Slice 3 — explicit disabled result

```bash
cd <gw> && pnpm vitest run src/agents/tools/meta/search-tools-tool.test.ts
```
**Expect**: `mode: "off"` → `{ results: [], disabled: true, message: <non-empty> }`; a genuine
zero-match query in `on`/`shadow` → `{ results: [], hint: <string> }` (no `disabled` field).

## Slice 4 — custom tool recovery

```bash
cd <gw> && pnpm vitest run src/agents/tools/meta/load-tools-tool.test.ts
```
**Expect**: a custom tool id present in the per-agent index but absent from `TOOL_REGISTRY` is
accepted by `load_tools` (appears in `loaded`, not `unknown`).

## Slice 5 — default flip (after 1–4 are merged)

```bash
cd <gw> && pnpm vitest run src/agents/tool-search src/agents/tools/hub
```
**Expect**: full scoped suite green (same command the audit used), plus the new
`resolveSelectionConfig(undefined, agentId).mode === "on"` assertion.

Then, manually (not automated — SC-006): pull a sample of production `[jit-select]` log lines from
before the flip, re-run `rankTools` offline against the fixed stripping/fallback logic for each
sampled turn, and confirm the tool that was actually called in that turn would still be in
`activeIds`. Record the sample size and pass rate in the PR description for Slice 5.

## End-to-end manual check (optional, requires a running gateway + hub-linked agent)

1. Start a hub personal-agent chat session with `tools.selection.mode: "on"` set explicitly for
   that agent (config override — don't wait for the global default).
2. Send a concrete hub-data turn (e.g. "what's on my calendar today"); confirm the relevant hub
   tool's schema is present in the model request (gateway debug log `[jit-select]` `activeIds`).
3. Send a vague/empty follow-up turn; confirm `activeIds` still contains the full L1 set (not the
   static `TOOL_ORDER` prefix of browser/web tools).
