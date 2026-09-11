# 16-PRODUCER-MATRIX — telemetry producers and identity coverage

Produced by GSD 16-01 (OBS-01), 2026-09-10. **This is an inventory of source, not a
deployment or receipt certificate.** No telemetry endpoint was called and no project
credential was used to produce it; every row is read from current source in this
checkout at the identity recorded below.

Source identities read: `minion_hub` `origin/master` `1df0a921`; meta-repo working
tree at `feat/curated-engineering-skills` for `minion/`, `minion_factory/`, `drone/`,
`packages/shells-bridge/`.

## Why this document exists

16-01's second done-criterion is that *every required agent producer is either verified
or named in an executable gap plan*. Hub instrumentation does **not** cover agents: a
Factory run, a Drone call and a Shells bridge run each execute outside a SvelteKit
request, so nothing in `src/hooks.server.ts` can observe them. The matrix records that
explicitly rather than letting Hub coverage imply platform coverage.

## Matrix

| Producer | Source | Runtime identity | Telemetry today | Identity attached | Secret handling | Disposition |
|---|---|---|---|---|---|---|
| Hub request errors | `minion_hub/src/hooks.server.ts` `serverErrorHandler` | Vercel serverless function, per request | PostHog `server_error`; Sentry via `handleErrorWithSentry` | **Fixed by 16-01**: org / actor / request / trace / agent-run ids, route template, release, environment, deployment, region | **Fixed by 16-01**: message replaced by sha-256 digest; allowlisted keys; sensitive keys and credential/address/SQL-shaped values dropped | Verified in source; runtime receipt still open |
| Hub request metrics | `minion_hub/src/lib/server/server-timing.ts` → `captureServerEvent` | same | PostHog `server_timing` | Already route-template + `org_id`; now passes the same property filter | Filter applied at the single capture path | Verified in source |
| Hub Sentry transport | `minion_hub/src/hooks.server.ts` `Sentry.init` | same | Sentry (no-op without `SENTRY_DSN`) | `release` now a validated commit sha or `undefined`; `environment` unchanged | **GAP** — Sentry still receives the raw exception (message, stack, and whatever `setExtras` carries). No `beforeSend` scrubbing. | **Gap: needs a child plan** (see G-1) |
| Gateway (`minion`) errors | `minion/src/infra/sentry.ts` `captureError` | long-lived Node process (Netcup / Docker) | Sentry, opt-in via `SENTRY_DSN` | `environment` from `NODE_ENV`; `release` from `npm_package_version` — **a package version is not a release**; no org/actor/session/run id | `scope.setExtras(context)` ships an arbitrary caller-supplied bag unfiltered | **Gap: needs a child plan** (see G-2) |
| Gateway analytics | `minion/src/infra/posthog.ts` `trackEvent` | same | PostHog, opt-in via `POSTHOG_API_KEY` | caller-supplied `distinctId`; no sanitizer between caller and client | properties passed through verbatim | **Gap: needs a child plan** (see G-2) |
| Factory runner | `minion_factory/runner/src/containment-effects.ts` and siblings | container per run; `runId` validated by `RUN_RE` | **none** — no PostHog, no Sentry, no OTel import anywhere in `minion_factory/` | `runId` exists in the effect binding but is never emitted as telemetry | n/a (nothing emitted) | **Gap: needs a child plan** (see G-3) |
| Drone | `drone/src/types.ts` and siblings | invoked per agent call | **none** | job `id` only | n/a | **Gap: needs a child plan** (see G-3) |
| Shells bridge | `packages/shells-bridge/src/run-journal.ts`, `bridge.ts` | per bridge process; SQLite journal | **none** — durable journal only, no capture client | `runId` / `invocationId` / `sessionId` / `shellId` in the journal, never exported to telemetry | journal stores admissions and outcomes locally | **Gap: needs a child plan** (see G-3) |

## The correlation seam

`requestIdentity` accepts `x-minion-run-id` as an **opaque, charset-validated
correlation hint**, never as authority — org and actor always come from
server-resolved `event.locals`. Nothing stamps that header today. It is the seam an
agent producer would use to make an agent run and the Hub requests it triggers appear
in one trace; until G-3 lands, `agent_run_id` is `null` on every Hub event and that is
the honest value.

## Named gaps — each needs its own bounded child plan before OBS-01 can close

- **G-1 — Hub Sentry payload scrubbing.** Add a `beforeSend`/`beforeSendTransaction`
  that applies the same allowlist to `exception.value`, `extra`, `request.headers`,
  `request.data` and breadcrumbs. Owned file `minion_hub/src/hooks.server.ts` plus a
  new scrubber module. Out of 16-01's scope: 16-01 owns the *event property* boundary,
  not the Sentry transport contract.
- **G-2 — Gateway telemetry identity and sanitization.** `minion/src/infra/sentry.ts`
  and `minion/src/infra/posthog.ts` need (a) a real release identity instead of
  `npm_package_version`, (b) a sanitizer between callers and both clients, (c) session
  / org / channel ids as opaque values. Separate repository, separate ownership — must
  not be folded into a Hub plan.
- **G-3 — Agent-run producers.** Factory, Drone and the Shells bridge emit no telemetry
  at all. A child plan must decide, with evidence, whether they emit to the same
  PostHog project, a separate one, or only to their existing durable journals — and
  must stamp `x-minion-run-id` on outbound Hub calls so the correlation seam is real.
  Choosing a destination is a policy decision that no current evidence settles.

## Evidence limits

- Source inventory only. Whether any of these producers is configured, reachable, or
  actually receiving events in production is **not** established here. The first-wave
  re-audit's finding stands: present access cannot prove release association, uploaded
  source maps, event receipt or alerts.
- The gap rows are derived from absence of an import (`posthog`, `@sentry/*`,
  OpenTelemetry) in those trees. Absence of an import is strong evidence of no
  producer; it is not proof that no sidecar or platform agent collects anything.
