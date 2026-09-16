---
phase: 16-observability
plan: "01"
status: delivered_pending_independent_review
plan_sha256: cf0cc2026d1f4108883fdb3ab4248f6289cbfd533743fc25dcc0fdd80fb71c0a
requirements_completed: []
completed: 2026-09-10
pr: NikolasP98/minion_hub#246
key-files:
  created:
    - minion_hub/src/lib/server/observability-context.ts
    - minion_hub/src/lib/server/observability-context.test.ts
    - .planning/phases/16-observability/16-PRODUCER-MATRIX.md
  modified:
    - minion_hub/src/hooks.server.ts
    - minion_hub/src/lib/server/posthog.ts
---

# 16-01 sanitized observability identity (OBS-01)

Hub server events now carry an allowlisted execution-identity envelope and no longer
carry error content. `requirements_completed` is empty: OBS-01 additionally needs the
runtime receipt gate and the agent-producer child plans named in the producer matrix.

## Identities

- Base: `minion_hub` `origin/master` `1df0a921` (`fix(ui): native Dialog consumers …` #245).
- Branch: `feat/observability-identity-finance-parser-bounds`, commit `99715f50109fe5785009d23544166e3d79bc0ce2`, authored `Nikolas Pinon <nikolas.pinon98@gmail.com>`.
- Worktree: `/home/nikolas/.cache/claude-tmp/hub-16-01-15-02` (private, detached from `origin/master`). No branch, stash or worktree operation touched the primary `minion_hub` checkout; its concurrent WIP was not read or modified.
- Runtime: Node 22.23.2, Bun 1.3.4, Vitest 4.1.10.
- Decisions honored: D360-01 (WIP preserved, before-images recorded), D360-04 (no paid provider calls), D360-06 (exclusive file ownership).

## Owned files and hashes

| File (relative to minion_hub) | Before | After |
|---|---|---|
| src/lib/server/observability-context.ts | new | 0d2c80bccc5c061a47c497da4b9a2cd14d90de98e04453069d67108cc495f698 |
| src/lib/server/observability-context.test.ts | new | fe6ed0829b3cbcc51eb4690a922594c4de4de533c4e56039128bad181aafcc52 |
| src/lib/server/posthog.ts | dfa72e6a4c8eac5f5054081b6a6ba0aa5b1a085e106ecb62e4301300f1253bb6 | 3446f6684826243eea26e6238779fb93bb5589f2850c8a1a9dd6cdd758d1a37e |
| src/hooks.server.ts | 3951df0e68f5d3864b2d80330111e1a15ad0651fbc1e59ff0c1d66e5d31f241e | aac2b11558d0d985f386008508f792f46a0e2e6afaa6adf555d9081420166e6a |

Meta repo: `.planning/phases/16-observability/16-PRODUCER-MATRIX.md` (new).

## What was wrong on master

`serverErrorHandler` captured `{ error: error.message, status, message, path: event.url.pathname }`
with `distinctId: 'server'`. Three defects, all reproduced before the fix:

1. The raw error message shipped. Hub error messages routinely embed SQL text
   (`column "x" does not exist: SELECT … WHERE email = '…'`), upstream response
   bodies and tokens.
2. `event.url.pathname` shipped. A resolved `/crm/customers/<uuid>` **is** a customer
   identifier; the route template is the safe form.
3. No attribution at all — every event was `server`, so no org, actor, request, trace
   or agent run could be recovered from an event.

## Task 1 — sanitizer and request identity contract

`src/lib/server/observability-context.ts` exports:

- `releaseContext()` — environment restricted to a four-value allowlist, release
  accepted only as a 7–40 hex commit sha, deployment id and region as opaque tokens.
  Anything else is the explicit string `'unknown'`. A package version is **never** read
  as a release (tested).
- `requestIdentity(input)` — pure, total, never throws (it runs on the error path,
  where a second failure would mask the first). Route template only; HTTP method from
  a verb allowlist; `org_id`/`actor_id` from server-resolved `locals` as opaque ids;
  `trace_id` from a validated W3C `traceparent` (zero trace id rejected); `request_id`
  from `x-vercel-id`/`x-request-id`; `agent_run_id` from `x-minion-run-id`. Every
  header-derived value is a **correlation hint only** — a header can never claim a
  tenant or an actor, and that is a test.
- `distinctIdFor(identity)` — `org:<id>` → `user:<id>` → `server`. Opaque, never an
  email or a display name.
- `sanitizeEventProperties(bag)` — open-shape filter for metric events: scalars only,
  snake_case keys, sensitive key names dropped, credential/address/SQL-shaped values
  dropped, 256-char string cap, 48-property cap. Non-scalars are dropped, not
  stringified.
- `sanitizeErrorProperties({error, status, identity})` — closed shape. The message is
  replaced by `error_digest` (sha-256, 16 hex) plus `error_length`; type, `code` (only
  if it passes the opaque-id charset) and a cause chain of **types only**, bounded to
  four links so a hostile cause cycle terminates.

The module reads `process.env` directly, like `server-timing.ts`, so it is unit-testable
without the SvelteKit `$env` shims.

## Task 2 — wiring and producer inventory

- `posthog.ts` gains `captureServerEvent()`, now the single server capture path. It
  applies `sanitizeEventProperties` **itself**, so sanitization is structural rather
  than by convention — a caller cannot ship an unsanitized bag by forgetting to call
  the sanitizer. Fire-and-forget with a non-blocking `flush()`; the M8 batching
  (`flushAt: 20` / `flushInterval: 10_000`) and bounded retry (`fetchRetryCount: 0`,
  `requestTimeout: 3000`) are untouched.
- `hooks.server.ts`: the error handler builds the identity, captures the sanitized
  bag, and does it all **synchronously inside a `try`** — no await was added anywhere
  in a hook (an unguarded await in a layout/hook turns one failing request into a
  failing subtree). `console.error` still logs the full error: that stays on the host.
  The `server_timing` capture now routes through the same helper. `Sentry.init` gains a
  validated `release` (or `undefined`) and its `environment` line is untouched.
- `.planning/phases/16-observability/16-PRODUCER-MATRIX.md` inventories every
  telemetry producer with source and runtime identity and names three gaps: **G-1**
  Hub Sentry payload scrubbing, **G-2** gateway telemetry identity/sanitization
  (`minion/src/infra/{sentry,posthog}.ts` — release derived from
  `npm_package_version`, `setExtras` unfiltered), **G-3** agent-run producers
  (`minion_factory/`, `drone/`, `packages/shells-bridge/` emit **no telemetry at
  all**). Each needs its own bounded child plan; none is folded into this one.

## Commands and results

All from the private worktree. `svelte-kit sync` is required first in a fresh
worktree — without the generated `.svelte-kit/tsconfig.json`, Vitest 4 fails at
dependency optimization with `Could not resolve 'node:module' … Tsconfig not found`,
which is an environment fault and not a test failure.

| Command | Result |
|---|---|
| `node node_modules/vitest/vitest.mjs run src/lib/server/observability-context.test.ts` | 24 passed, exit 0 |
| `node node_modules/vitest/vitest.mjs run` (three focused files together) | 85 passed / 3 files, exit 0 |
| `bun run check` | 10772 files, **0 errors 0 warnings**, exit 0 |
| `DESIGN_LINT_BASE_REF=origin/master bun run lint:design` | exit 0, "no changed file increased governed debt" |
| `bun run lint:tokens` | exit 0, **0 violations** |
| `bunx prettier --plugin=prettier-plugin-svelte --check` (6 files) | exit 0 |
| `node node_modules/vitest/vitest.mjs run src/lib/routes/ src/server/ui-audit/` | 14 files / 120 passed, exit 0 |
| `git diff --check` | clean |
| PR #246 CI (`test`, `check-and-build`, `crm-deposit-rule-postgres`, `crm-funnel-concurrent-postgres`, Vercel preview) | all **SUCCESS** |

Red evidence: adding `message` back into `sanitizeErrorProperties` output turned
3 of 24 cases red (`attaches identity and never ships the message`, `survives a
hostile cause cycle and an oversized message`, `rejects a hostile error code and a
non-Error throw`). Reverted before the final run; the failing run is not acceptance
evidence.

Hostile-payload coverage proving no leak: an error whose message carries an email,
a `sk-live-…` token and a `SELECT … FROM crm_customers`; a nested `Error.cause`
chain whose leaf message holds `sb-access-token=`; a self-referential cause cycle;
a 2,000,000-character message (serialized event stays under 2 KB); a spoofed
`code: 'Bearer sk-live-…'`; a raw non-Error string throw; `null`/`undefined`
throws; a header bag whose `get()` throws.

## Evidence limits

- **No telemetry endpoint was contacted.** Every test uses in-process fixtures; the
  PostHog client is never constructed (`PUBLIC_POSTHOG_KEY` is absent under vitest).
  This slice proves what *would* be sent, not that anything is received.
- Source fix only. It does not establish deployment, a PostHog project receipt, a
  Sentry release association or an uploaded source map — the first-wave re-audit's
  open items on all four stand.
- `bun run check` is a whole-source check at this candidate; it is not a packaging or
  build acceptance.
- Sentry still transports the raw exception (G-1). Sanitizing the analytics property
  boundary does not sanitize the crash-reporting transport, and this summary does not
  claim it does.
- `agent_run_id` is `null` on every Hub event today because nothing stamps the header
  (G-3). The seam exists; the producers do not.

## Next gated plans

G-1, G-2 and G-3 in the producer matrix, each as its own admitted child plan. OBS-01
stays open until all three are accounted for and a runtime receipt gate exists.
