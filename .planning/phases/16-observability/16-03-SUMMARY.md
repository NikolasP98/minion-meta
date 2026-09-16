---
phase: 16-observability
plan: "03"
status: partial
requirements: ["OBS-03"]
requirements-completed: []
completed: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/16-03-45fd6671/MINION
base: meta origin/dev 5b498439acaeaaf40f3f6dc43500753984e571ef
owned_files:
  - path: scripts/qc/incident-query-contract.mjs
    before: absent
    after: ca829aa5d0d7ecafe7096aa91947c4cafefc2da433443799c19cfa0c5e66324b
  - path: scripts/qc/incident-query-contract.test.mjs
    before: absent
    after: 04edd1433534708601f5cae45240164c420ed536fb399f0da2103385b81b982e
  - path: scripts/qc/alert-routing-contract.test.mjs
    before: absent
    after: 85fb0f5e31506c0fa8718e4382049266e3581750cd447cf7ee8056bcf2205fea
  - path: .planning/phases/16-observability/16-INCIDENT-VIEWS.md
    before: absent
    after: 33e81b472df100588c43b1d3d5ea23f668d583b6900cae78817d05686b6b2173
  - path: .planning/phases/16-observability/16-ALERT-ROUTING.md
    before: absent
    after: 9bbeb18be31ac367b08252867552daba3f3c94297f7d7076948072106ab2eb30
---

# 16-03 attributable incident views and alert routes (OBS-03) — partial

Status **partial**: both tasks' local halves are delivered and gated green; the
remote halves (a live PostHog/Sentry rule inventory and a routed synthetic receipt)
are pending on access and on authorizations this executor does not hold. No rate,
threshold or recipient was invented; `requirements-completed` stays empty by the
plan's closure policy.

## Identities and discipline

- Snapshot: detached meta worktree at `origin/dev` `5b498439` under
  `/home/nikolas/.cache/claude-tmp/16-03-45fd6671/MINION` (the three `scripts/qc`
  files live there, untracked). The two `.planning` docs are written in the main
  checkout's phase directory, as 16-02 did (that directory is untracked in both).
  Nothing committed, staged, pushed, stashed or branched; other worktrees untouched.
- Read-only sources: hub `origin/master` `1df0a921` via `git show`/`git grep`; PR #246
  worktree `hub-16-01-15-02` (`observability-context.ts`, `posthog.ts`); gateway
  `minion/src/health/*`, `gateway-request-metrics.ts`, `infra/sentry.ts` (local
  `db83e075`, origin/DEV `5ff1c51d`); `.lavish/minion-qc-2026-09-08/telemetry.json`
  read by absolute path (not in the snapshot). No `.env`, no Infisical, no remote call.
- Deps: none installed — the scripts use only `node:test`, `node:assert`,
  `node:crypto`, `node:fs` (`checks/freeze.json`: Node v22.23.2).
- Receipts under `/home/nikolas/.cache/claude-tmp/16-03-45fd6671/`: `checks/before.txt`,
  `checks/after.txt`, `checks/freeze.json`, `checks/01-…04-*.log` (each ends `exit=<n>`),
  `artifacts/views.json`.

## Task 1 — queries with valid denominators and environment filters (local: done)

`scripts/qc/incident-query-contract.mjs` (+ test, 19 cases):

- Schema discovery from source, per producer revision (`16-INCIDENT-VIEWS.md` §1):
  `server_error@master` has **no environment, no release, raw `error`/`message`/`path`**;
  `server_error@obs-01` (PR #246) has environment/release/request_id and a digest;
  client events have no environment except PostHog's auto `$host`; `server_timing` is
  **sampled** (`sample_reason`), so a request denominator is an estimate.
- `buildIncidentQuery` produces HogQL with environment + release + window filters, a
  projection allowlist (raw fields excluded and listed under `excluded_raw_fields`),
  and an explicit `attribution` block (`filtered` | `missing (…)`; `unknown` as its own
  bucket). Ratios are admitted only for same transport + matching units; refusals are
  coded: `mixed-transport`, `unit-mismatch`, `denominator-refused` (unattributable
  numerator), `sample-rate-required`, `host-map-required`, `environment-required`,
  `release-not-sha`, `release-unattributable`, `unit-missing`.
- `combineCounts` refuses to add distinct kinds or mixed kinds; `presentRate` shows
  n/N under 20 units and labels estimates; `validateViewManifest` rejects incomplete
  manifests (missing keys, unlisted environment, rate without denominator, unlabelled
  estimate, raw field in projection, mixed transport) and unsafe ones (DSN,
  `sntrys_`/`sntryu_`, `phc_`/`phx_`, `sk-`, bearer strings anywhere).
- `assessSnapshot` on the 2026-09-08 export: **no admissible rate** — 248 server 500s
  are status-only and environment-less; 244 pageviews are a different transport; the 8
  browser issues' sessions/users are not summable; issue descriptions are raw messages
  and are excluded (the test asserts the raw text is not echoed).
- Red evidence during development: a dangling-`else` in `validateViewManifest` made
  every built view fail as "projection must be an array" (2 failing tests, fixed with
  braces); the estimate-label check matched the kind name `estimated_requests` itself
  (1 failing test; now requires a literal `(estimate)` suffix).

## Task 2 — alert recipient path (local: done; remote: pending)

- `16-ALERT-ROUTING.md`: 8 rules inventoried from source with environment, trigger,
  threshold source, dedup and destination (names only). Verified in source: hub finance
  daily-sync failure → gateway `channels.send` to `FINANCE_ALERT_CHANNEL`/`FINANCE_ALERT_TO`
  and a factory webhook `FINANCE_ALERT_WEBHOOK_URL` (no dedup; silently degrades to
  `console.error` when unset); gateway `AgentHealthTracker` 10 %/50 % code defaults
  with **no consumer** of `renderHealthAlerts()`; gateway perf snapshot error rate
  (display only). Unverified-remote: Sentry (hub, gateway), PostHog 129899 alerts,
  Vercel deploy-failure notifications. Every rule carries ≥ 1 open gate.
- `validateAlertRule` rejects guessed/inferred/absent threshold sources, non-numeric
  thresholds, literal recipients (email/URL/phone; env var NAMES only), asserted
  `sendAuthorized`, unlisted environment/status, missing dedup statement, credential
  shapes, and ratio triggers that fail the incident denominator contract. It returns
  the pending gates (`recipient-authority`, `threshold-policy`, `remote-verification`).
- `buildSyntheticAlertPacket` prepares `MINION_OBS03_<16 hex>` packets with no I/O
  (test stubs `fetch` to fail); `send: true` is refused without a recorded
  authorization scoped to the rule **and** a configured recipient, and even then only
  returns the packet. No packet was sent.
- Five decision requests recorded (`16-ALERT-ROUTING.md` §4): DR-16-03-01 recipient
  env values/configured state, -02 paging threshold/SLO, -03 gateway health routing,
  -04 root read-only remote inventory (PostHog/Sentry/Vercel), -05 one authorized
  synthetic send with recipient consent.

## Gates

| Gate | Result | Log |
|---|---|---|
| `node --test scripts/qc/incident-query-contract.test.mjs` (env -i) | **19 passed / 19, 0 failed, exit 0** | `checks/01-incident-query-test.log` |
| `node --test scripts/qc/alert-routing-contract.test.mjs` (env -i) | **10 passed / 10, 0 failed, exit 0** | `checks/02-alert-routing-test.log` |
| `node scripts/qc/incident-query-contract.mjs <telemetry.json>` (env -i) | exit 0; 5 views + 5 findings, no raw description in output | `checks/03-cli.log`, `artifacts/views.json` |
| `git diff --check` (snapshot) | clean, exit 0 | `checks/04-diff-check.log` |
| `node --check` on the module | ok | — |

## Deviations

- The alert-route contract functions live in `incident-query-contract.mjs` (the plan
  lists no implementation file for Task 2, only the test); the inventory is data in
  the test file mirroring the doc. One module instead of two — no new file outside
  `files_modified`.
- `telemetry.json` is not on `origin/dev`; the CLI takes the path as an argument and
  the gate read the main checkout's copy read-only.
- Brief rule 3 (no external calls) vs. the plan's "PostHog/Sentry read-only schema
  discovery": discovery was done from source and the recorded export; the live
  remote inventory is handed to root as DR-16-03-04 rather than performed here.
- The 16-02 plan's Sentry gap stands: no org/project/token, so Sentry alert rules
  are `unverified-remote`, not "none".

## Gaps / blocked (precise)

| Id | Gap | Blocked on | Unblock |
|---|---|---|---|
| R-2 | Routed synthetic receipt (marker delivered to a named recipient) | recipient authority + send authorization (DR-16-03-01, -05) | owner confirms env names → values set (names only recorded), authorizes one send; recipient records marker/timestamp in `16-ALERT-ROUTING.md` §6 |
| R-3 | Live alert-rule inventory for PostHog 129899, Sentry, Vercel | brief rule 3 / Sentry access (16-02 R-1) | root runs read-only listings (DR-16-03-04), records name/threshold/destination-name only |
| G-6 | Production incident views need `obs-01` events | PR #246 not deployed (16-01/16-04 candidate) | deploy #246; then the `server_error.*` views apply; until then only the `master-unattributed` count view is honest |
| G-7 | Contract does not filter by producer/`$lib` — if the gateway's `POSTHOG_API_KEY` targets project 129899, server views would mix gateway and hub events | project identity of the gateway key unverified | root confirms via DR-16-03-04; if shared, add a `$lib`/producer filter to `EVENTS` (bounded follow-up in this module) |
| G-8 | No SLO/threshold exists for any paging rule | policy (DR-16-03-02, -03) | owner decision; the contract will accept `slo`/`recorded-observation` sources once recorded |
| — | Proposal entry for DR-16-03-* / G-6..G-8 | `proposals/` is root-owned (brief rule 4) | root files it from this summary |

## Next gated plan

DR-16-03-01/-05 → one authorized synthetic send with recipient evidence → R-2
recorded. In parallel DR-16-03-04 (root, read-only) closes R-3. OBS-03 cannot close
before both, and not before #246 makes production server errors attributable (G-6).
