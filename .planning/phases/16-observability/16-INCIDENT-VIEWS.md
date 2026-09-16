# 16-INCIDENT-VIEWS — attributable incident queries with valid denominators (OBS-03)

Produced by GSD 16-03 Task 1, 2026-09-11. **Contract and findings from source and
from the recorded 2026-09-08 PostHog export only.** No PostHog, Sentry or Vercel
API was called; no dashboard was saved; no query was run against a project. The
executable contract is `scripts/qc/incident-query-contract.mjs` (meta,
`node --test scripts/qc/incident-query-contract.test.mjs`, 18/18).

Source identities read: hub `origin/master` `1df0a921` (`src/hooks.server.ts`,
`src/hooks.client.ts`, `src/routes/+layout.svelte`, `src/lib/server/server-timing.ts`,
`src/lib/server/posthog.ts`); hub PR #246 candidate (`/home/nikolas/.cache/claude-tmp/hub-16-01-15-02`,
`src/lib/server/observability-context.ts`, `src/lib/server/posthog.ts`); gateway
`minion/src/health/agent-health-tracker.ts`, `minion/src/gateway/gateway-request-metrics.ts`
(local `db83e075`, origin/DEV `5ff1c51d`); `.lavish/minion-qc-2026-09-08/telemetry.json`
(PostHog project 129899, window 2026-09-02 → 2026-09-09 UTC).

## 1. What the producers actually carry (schema discovery, from source)

| Event | Transport | Producer revision | Environment field | Release field | Distinct-unit fields | Raw fields present |
|---|---|---|---|---|---|---|
| `server_error` | server (Vercel fn) | `master` | **none** | **none** | none | `error` (raw message), `message`, `path` (raw pathname) |
| `server_error` | server | `obs-01` (PR #246) | `environment` ∈ production/preview/development/test/unknown | `release` (7–40 hex sha or `unknown`) | `request_id`, `org_id`, `actor_id`, `trace_id`, `agent_run_id` | none — message replaced by `error_digest` (sha-256/16), route = template |
| `server_timing` | server, **sampled** | `master` | none | none (`commitSha` only in the persisted sample, not the event) | `org_id` | none |
| `server_timing` | server, sampled | `obs-01` | `environment` | `release`, `commit_sha` | `request_id`, `org_id`, `actor_id` | none |
| `$pageview`, `nav_timing`, `$exception`, `$web_vitals` | client (`posthog-js`) | `master` | **none** — no `posthog.register`; only PostHog's auto `$host`/`$current_url` | **none** | `$session_id`, `distinct_id` | `$current_url`, `$pathname`, `$exception_message`/`$exception_list` |
| gateway `AgentHealthTracker` | in-process counters | `master` | none (process-local) | none | per-agent `totalRequests`/`totalErrors` | none |

Consequences the contract enforces:

- **Master server events cannot be attributed to an environment at all.** Every
  `server_error` that PostHog holds today from the current production build is
  indistinguishable from a preview or a local dev run with `PUBLIC_POSTHOG_KEY` set.
  The 248 "500" occurrences in the export are exactly such a mixed count.
- **Client events attribute only through a host map.** `$host` is the only
  environment signal; the contract requires an operator-supplied
  `{ production: ['hub.minion-ai.org'], preview: [...] }` list and refuses a client
  query without it. Production host `hub.minion-ai.org` is the one host known from
  source/docs; preview hosts are not recorded anywhere and stay an operator input.
- **`server_timing` is not a request count.** `createServerTimingHandle` captures
  every isolate-cold / cache-miss / slow request and only `SERVER_TIMING_SAMPLE_RATE`
  (default 0.1) of warm ones (`sample_reason`). A request denominator is therefore an
  **estimate**: `sum(if(sample_reason = 'sampled-warm', 1/rate, 1))`, labelled
  `(estimate)`, and the configured rate must be supplied — the contract refuses the
  kind without it.
- **Release attribution exists only for `obs-01` server events.** Client bundles carry
  no release (no `SENTRY_RELEASE` injection on the client, no `register`).

## 2. Count kinds and admissible ratios

| Kind | Unit | Transport | HogQL |
|---|---|---|---|
| `occurrences` | event | any | `count()` |
| `distinct_requests` | request | server (`obs-01` only — needs `request_id`) | `count(DISTINCT properties.request_id)` |
| `estimated_requests` | request (estimate) | server, sampled event | `sum(if(properties.sample_reason = 'sampled-warm', 1 / <rate>, 1))` |
| `requests` | request (exact) | gateway in-process | `totalRequests` |
| `distinct_sessions` | session | client | `count(DISTINCT properties.$session_id)` |
| `distinct_users` | user | any | `count(DISTINCT distinct_id)` |
| `pageviews` | pageview | client, `$pageview` only | `count()` |

A ratio is admitted only when numerator and denominator share a transport **and**
units pair as: event→request or event→pageview, request→request, session→session,
user→user. Everything else is refused with a coded error:

| Refused | Code |
|---|---|
| server errors ÷ client pageviews | `mixed-transport` |
| occurrences ÷ distinct sessions | `unit-mismatch` |
| any ratio whose numerator or denominator has no environment filter (master server events) | `denominator-refused` |
| `estimated_requests` without the configured sample rate | `sample-rate-required` |
| client query without a host list | `host-map-required` |
| environment outside the allowlist, or absent | `environment-required` |
| release that is not a commit sha | `release-not-sha`; release filter on a producer without one → `release-unattributable` |
| adding distinct counts across groups (sessions/users/requests) or adding different kinds | `sum-of-distinct-counts` / `sum-of-mixed-kinds` |

## 3. Presentation rules

- **Missing attribution is shown, never filled.** `attribution.environment` is
  `filtered` or `missing (<event>@<revision> carries no environment)`; `unknown` is
  its own bucket (`environment = 'unknown'`), never merged into production.
- **Raw data is excluded from every saved view.** Projection allowlist per event;
  `error`, `message`, `path`, `description`, `$current_url`, `$pathname`,
  `$exception_message`, `$exception_list`, `$ip`, `email`, … are never projected. The
  PostHog issue `description` (the raw exception message, e.g. "Object captured as
  exception with keys: error, status, type") stays on the access-controlled issue
  page and is not copied into dashboards, reports or this repo.
- **Sparse counts:** a distinct count below 5 is still shown as the number (no
  suppression policy exists to cite) but a *rate* over a denominator below 20 is
  presented as "n/N (insufficient denominator)" rather than a percentage. This is a
  presentation default, not a policy; a policy decision may replace it.
- **Credential shapes are rejected anywhere in a manifest** (DSN, `sntrys_`/`sntryu_`,
  `phc_`/`phx_`, `sk-`, bearer strings).

## 4. The view set (built by the CLI; `artifacts/views.json` in the 16-03 snapshot)

| View | Numerator | Denominator | Requires | Status |
|---|---|---|---|---|
| `server_error.occurrences.production` | `server_error` occurrences, `environment='production'` | — | `obs-01` producer deployed | ready once #246 is in production |
| `server_error.per_request.production` | same | `server_timing` `estimated_requests` at the configured sample rate | `obs-01` + `SERVER_TIMING_SAMPLE_RATE` value | ready once #246 is deployed; **estimate** |
| `server_error.occurrences.unknown` | `environment='unknown'` bucket | — | `obs-01` | shows what still fails attribution |
| `client_exception.per_pageview.production` | `$exception` occurrences, `$host IN (production hosts)` | `$pageview` pageviews, same hosts | operator host map | ready now |
| `server_error.occurrences.master-unattributed` | `server_error` at `master` | refused | — | the honest view of today's data: count only, attribution `missing` |

Per-release views add `properties.release = '<sha>'` to both sides; only `obs-01`
server events admit them.

## 5. Findings against the 2026-09-08 export (`assessSnapshot`)

| Id | Finding | Rate admitted |
|---|---|---|
| `server-errors-unattributable` | `serverErrors` rows are `status` only (500: 248, 404: 13); the master producer emits no environment/release → cannot be split by environment | no |
| `pageviews-not-a-server-denominator` | 244 client pageviews (214 desktop + 30 mobile, no `$host` breakdown) vs 248 server 500s: different transports; a "500 per pageview" figure (≈1.0) is refused as `mixed-transport` | no |
| `browser-error-kinds` | 8 issues: occurrences sum to 27; `sessions` and `users` are per-issue distinct counts and are **not** summed (the same session can hit several issues) | no |
| `browser-error-description-excluded` | issue `description` = raw exception message; excluded from every view | — |
| `client-environment-unknown` | client events carry no environment; the export has no host breakdown, so even the browser errors are environment-unknown | no |

Net: **no rate in the export is admissible under the contract**, which is
consistent with the PROGRAM exclusion "interpreting mixed-project 500 counts as
production error rate".

## 6. Evidence limits

- Schema discovery is from source, not from the PostHog project's live property
  definitions; whether project 129899 also receives gateway events
  (`minion/src/infra/posthog.ts`, `POSTHOG_API_KEY`) is **unverified** — if it does,
  server-side views must also filter `$lib`/producer, which the contract does not yet
  express (recorded as a gap in the summary).
- HogQL text is generated but never executed here; cardinality was validated on
  fixtures (unit tests), not on live data.
- Nothing here establishes that `obs-01` events are being received in any
  environment (16-02 R-1 remains pending).
