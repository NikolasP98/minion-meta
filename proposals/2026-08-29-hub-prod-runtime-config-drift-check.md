---
id: 2026-08-29-hub-prod-runtime-config-drift-check
title: "Hub prod runtime config has no drift check — a pool-size fix sat unapplied in production for a month"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion_hub]
tags: [infra, hardcoded]
source: 2026-08-22-hub-load-nav-performance-spec pass-2 review
---

# Hub prod runtime config drift check

## Problem

Nothing compares the hub's *intended* production runtime configuration against what
Vercel actually serves. The performance program's Slice 1 depends on three env values
being right in production, and its definition of done is "an operator ran
`vercel env pull` and looked" — which no CI job, no test, and no factory agent can do.

## AS-IS (evidenced)

- `2026-07-17-hub-performance-optimization-plan` identified `SUPABASE_DB_RLS_POOL_SIZE=1`
  as a root cause (523 `withOrgCore` call sites serializing through one pooler connection
  per isolate). A Vercel production env pull on 2026-08-22 still showed
  `SUPABASE_DB_RLS_POOL_SIZE="1"` and `SUPABASE_DB_POOL_SIZE="2"` — the fix had been
  designed a month earlier and never reached prod, and nothing anywhere reported that.
- The values were corrected on 2026-08-22 (session record in
  `specs/2026-08-22-hub-load-nav-performance-spec` §0.1). Re-verifying them from an
  automated environment is currently impossible: the factory runner has no Vercel
  credentials, so the pass-2 review of that spec could confirm the *code* half of Slice 1
  on master (`with-org-core.ts:61-64`, `pg-pool.ts` `DEFAULT_POOL_SIZE = 5`,
  `idle_timeout: 120`) but had to take the *env* half on trust.
- Vercel env changes also need a redeploy to take effect, so "the dashboard shows 5" and
  "the running function reads 5" are two different facts, and only the second one matters.

## TO-BE

The running production deployment reports its own effective runtime config, and a
divergence from the intended values is visible without anyone running a CLI. Invariant:
no secret values are exposed — this is about sizes, timeouts, and backend selection, never
URLs, tokens, or keys.

## DELTA

1. Add the effective values (`SUPABASE_DB_POOL_SIZE`, `SUPABASE_DB_RLS_POOL_SIZE`,
   resolved `idle_timeout`, `CACHE_BACKEND`, `SERVER_TIMING_SAMPLE_RATE`) to an existing
   admin-only health/diagnostics surface, read from the same resolver the pools use — not
   from a copy of the defaults, or the check reports the intention rather than the reality.
2. Declare the intended production values in one committed place (a small typed manifest)
   and have the endpoint mark each as match/drift against it.
3. Decide the alerting edge: a periodic check that captures a PostHog event on drift is
   probably enough; a hard startup failure risks taking prod down over a tuning value.

## Out of scope

- Secret rotation, Infisical layering, and anything that would print a credential.
- The performance work itself (`2026-08-22-hub-load-nav-performance-spec` slices 5–8).

## Definition of done

An admin request to the diagnostics surface on production returns the effective pool
sizes / idle timeout / cache backend, each flagged against the committed intended values,
and a deliberately wrong value in a preview deployment shows up as drift.
