# 16-ALERT-ROUTING — current alert rules, thresholds, recipients and the pending gates (OBS-03)

Produced by GSD 16-03 Task 2, 2026-09-11. **Read-only inventory from source.** No
notification was sent, no remote rule store (Sentry, PostHog, Vercel) was read, no
recipient or threshold was invented. The executable contract is
`scripts/qc/incident-query-contract.mjs` (`validateAlertRule`,
`buildSyntheticAlertPacket`) with the inventory mirrored as fixtures in
`scripts/qc/alert-routing-contract.test.mjs` (`node --test`, 10/10).

## 1. Authority status (the two truths this plan must not assume)

| Question | Answer today |
|---|---|
| Who receives an alert? | For the two hub finance rules: whatever `FINANCE_ALERT_CHANNEL` / `FINANCE_ALERT_TO` / `FINANCE_ALERT_WEBHOOK_URL` resolve to in the Vercel production env — **names known, values and whether they are set unknown** to this executor (memory from 2026-08-12: "inert until `FINANCE_ALERT_*`"). For every remote platform rule: **unknown**. |
| What threshold pages? | No SLO, error budget or paging threshold exists in any repository, spec or decision record. The only numeric thresholds in source are the gateway `AgentHealthTracker` code defaults (degraded ≥ 10 %, down ≥ 50 % per-agent error rate) and they page nobody. |
| May a test notification be sent? | **No.** Root gate (GSD-REMAINING-PLAN-INDEX "Alert recipients/thresholds"): sending external test notifications and inventing paging thresholds are gated. The synthetic packet is prepared, not sent. |

## 2. Inventory

| Rule id | Environment | Trigger | Threshold (source) | Suppression / dedup | Destination | Status | Gates |
|---|---|---|---|---|---|---|---|
| `hub.finance-sync.daily.channel` — `minion_hub/src/routes/api/finances/sync/daily/+server.ts` `alertSyncFailure` @ `1df0a921` | production (Vercel cron `0 8 * * *`, `vercel.json`; crons run on production only) | per enabled finance source: daily sync job read back as failed/stale | any failure (`none`) | none — one `channels.send` per failed org per run; when unset, `console.error` only (the alert silently degrades to a log line) | gateway `channels.send` → channel `FINANCE_ALERT_CHANNEL`, recipient `FINANCE_ALERT_TO` (env names) | verified-source | recipient-authority |
| `hub.finance-sync.daily.factory-webhook` — same file, `postFactoryMonitor` | production | same failure | `none` | none in hub (5 s timeout, errors logged); receiver-side dedup not recorded | `POST FINANCE_ALERT_WEBHOOK_URL` with `FINANCE_ALERT_WEBHOOK_TOKEN` (factory maintenance lane) | verified-source | recipient-authority |
| `gateway.agent-health.error-rate` — `minion/src/health/agent-health-tracker.ts` | unknown (process-local; the process's `NODE_ENV`) | ratio: per-agent `totalErrors / totalRequests` since process start | 10 % degraded / 50 % down (`code-default`) | n/a — status derived per snapshot | **none** — `renderHealthAlerts()` (`health/dashboard.ts`) has no non-test consumer in `src/` | verified-source | recipient-authority |
| `gateway.perf-snapshot.error-rate` — `minion/src/gateway/gateway-request-metrics.ts` (`gateway.perf_snapshot` every 60 s) | unknown | ratio: `errors / requests` (responses with `ok:false`) per snapshot | none (display only) | n/a | hub `/reliability` LatencyPanel (display) | verified-source | threshold-policy, recipient-authority |
| `sentry.hub.alert-rules` | unknown | unknown | unknown | unknown | unknown | **unverified-remote** — no org/project/token (16-SENTRY-ACCESS.md §1) | recipient-authority, remote-verification |
| `sentry.gateway.alert-rules` — `minion/src/infra/sentry.ts` (DSN opt-in) | unknown | unknown | unknown | unknown | unknown | unverified-remote | recipient-authority, remote-verification |
| `posthog.129899.alerts` | unknown | unknown | unknown | unknown | unknown | unverified-remote — the alert list was **not** read (brief rule 3: no external calls); a read-only listing is a root decision (§4) | recipient-authority, remote-verification |
| `vercel.minion_hub.deploy-failure` | unknown | platform default "deployment failed" | n/a | platform | platform default recipients (project members' email) — not confirmed | unverified-remote | recipient-authority, remote-verification |

Not alerts (checked and excluded): GitHub `factory-notify.yml` in hub and gateway
(pokes `factory.minion-ai.org/pipeline/reconcile`, no recipient); gateway
`npm-publish.yml` "Notify gateway of prd release" (deploy trigger); the gateway
`alert-watcher` extension and hub "Triage" agent (customer-message triage kernel,
not an operational alert); Netcup crontab health-gated ticks (no destination).

**Every rule in the inventory carries at least one open gate; none is closed.**

## 3. Denominator contract for thresholds

A ratio trigger must pass the same admissibility as an incident view
(`16-INCIDENT-VIEWS.md` §2): same transport, matching units, attributable
environment. The gateway ratios pass (`occurrences` per exact in-process `requests`).
A future hub error-rate alert on PostHog data would have to be
`server_error.occurrences / server_timing.estimated_requests` **per environment** on
`obs-01` events with the configured sample rate — i.e. it cannot be created before
PR #246 is deployed, and it will be an estimate. An alert on the master-era
`server_error` count would page on preview and local traffic; the contract refuses it.

## 4. Decision requests (recorded, not decided here)

| Id | Decision needed | Who | Why it is not decided here |
|---|---|---|---|
| DR-16-03-01 | Are `FINANCE_ALERT_CHANNEL` / `FINANCE_ALERT_TO` / `FINANCE_ALERT_WEBHOOK_URL` / `FINANCE_ALERT_WEBHOOK_TOKEN` set in the Vercel production env, and to which channel/recipient? (names only in any record) | owner / Vercel project admin | executor has no env access (brief rule 3); recording a recipient without confirmation would assert authority that does not exist |
| DR-16-03-02 | Paging threshold and error budget for hub server errors (per environment, estimated-request denominator) | owner | no SLO exists (PROGRAM: "No fixed SLO … is inferred from these plans") |
| DR-16-03-03 | Whether gateway agent-health degraded/down states should route anywhere (and where) | owner | today they render nowhere; choosing a destination is policy |
| DR-16-03-04 | Read-only listing of PostHog project 129899 alerts (`alert` list) and Sentry alert rules by root with its own credentials, recorded by name/threshold/destination-name only | root | read-only remote calls are outside this executor's brief; root's gate note allows the *inventory* to proceed |
| DR-16-03-05 | Authorization to send ONE synthetic packet (`MINION_OBS03_<16 hex>`) through the finance channel route to a named recipient, with the recipient's consent | owner + recipient | PROGRAM exclusion: no test notifications to other people without authorization |

## 5. Synthetic test packet (prepared, dry-run)

`buildSyntheticAlertPacket(rule)` returns
`{ marker: 'MINION_OBS03_<16 hex>', rule, producer, environment, synthetic: true, dry_run: true, recipientNames: [...env names], text: '<marker> synthetic alert routing test for rule <id> — ignore' }`
and performs no I/O (the test replaces `fetch` with a failing stub while building it).
`send: true` is refused unless (a) a recorded authorization `{ by, recordedAt, scope: <rule id> }`
is supplied **and** (b) the rule's recipient gate is closed (`recipient.configured === true`).
Even then the function only returns the packet; delivery is a separate operator act
that must be evidenced by the recipient (message id / timestamp / marker), never by
the sender's exit code.

## 6. Remote receipt — PENDING

| Receipt | Status | Unblocks |
|---|---|---|
| Finance channel alert reaches a named recipient | pending | DR-16-03-01 + DR-16-03-05, then send the packet and record marker + delivery evidence here |
| Factory webhook accepts the monitor packet | pending | DR-16-03-01 (URL/token set) + a dry-run POST authorized by the factory owner |
| Sentry alert rules exist / fire | pending | Sentry access (16-02 R-1) |
| PostHog alerts inventory | pending | DR-16-03-04 |
| Vercel deploy-failure recipients | pending | DR-16-03-04 (Vercel project settings, names only) |

OBS-03 stays open until at least one routed synthetic receipt is recorded above with
its marker, or the owner records that no external routing is required.
