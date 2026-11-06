# FACES backend and integration production recon

**Verdict:** action required. The gateway process is live on the expected immutable image, but channel and Workforce readiness are degraded and two host controls do not protect the persistent runtime as intended.

This was a read-only production pass. It performed bounded health, status, aggregate database and network probes. It sent no customer messages, made no payment, triggered no sync or job, changed no configuration, restarted nothing and deployed nothing. The business mutation count is **zero**. No credentials, customer bodies or raw customer identifiers are retained. The 4.62 GB core file was not opened.

## Runtime identity

- Service: `minion_gateway-faces`; observed container `c2fc7d31949c`.
- Image: `sha256:26ca10558b46b902085fb828c1db928e77eab5eb4bed9b85c2fc316d65787bbb`.
- OCI revision: `7a1501e969014ec2fcfb69021bda843d0f90d23b`; version `2026.8.7-dev`; protocol 3.
- Started `2026-09-30T08:20:17Z`, healthy, with zero container restarts.
- The active configuration is `/home/node/.minion/gateway.json`, SHA-256 `ad67ba7c117a549b178e8941e833d996daa3b4ead138a109082c0a1912788bff`. The previously inventoried `minion.json` is a thin compatibility file and does not describe the running agents, channels or plugins.
- The deployed commit and the audit commit have the same Git tree, `a61dc1769f5737ed3c18ef196257d4a1d763c3c2`. The 20 original `GW-*` source findings therefore remain present in the deployed image; this pass did not run destructive or adversarial triggers against them.

## New findings

| ID | Priority | Finding | Production evidence | Safe remediation |
|---|---:|---|---|---|
| FACES-001 | P1 | A 4.62 GB core dump is retained in the durable state volume. | `agents/panik/workspace/core.47` is 4,620,193,792 bytes, mode 0600; container core limit is unlimited and host `core_pattern` is `core`. It accounts for about 89% of observed state-volume bytes. Contents were not read. | Handle it as a restricted incident artifact, rotate potentially resident credentials as appropriate, and remove/quarantine only through an approved change. Set `ulimit -c 0` before Node starts or route approved crash captures outside the state volume. Add a non-production crash canary and volume alert. |
| FACES-002 | P1 | Raw public port 18790 bypasses the intended edge. | An external GET to `http://152.53.91.108:18790/health` returned 200 while the public TLS edge returned 403. The active firewall service installs IPv4/IPv6 INPUT drops, but Docker DNAT traverses FORWARD and there are no matching `DOCKER-USER` original-destination drops. | Add idempotent IPv4/IPv6 `DOCKER-USER` conntrack drops for original ports 18789/18790, make deployment preflight require both INPUT and DOCKER-USER rules, then prove raw access is blocked and approved proxy/Tailscale paths still work. |
| FACES-003 | P1 | Both configured WhatsApp accounts are unauthorized while liveness remains green. | Both accounts are enabled and credential files are detected as linked, but authenticated `channels.status` reports neither running nor connected, with no connection/inbound/outbound timestamp and an unauthorized failure class. `/health` remains `ok:true`. | Add a separate authenticated integration-readiness surface with reason and last success; keep Docker liveness independent to avoid provider-outage restart loops. Reconcile which Meta connection the user meant, then perform any relink only under an explicit write plan. |
| FACES-004 | P2 | The explicit persistent debug log has grown to 475 MB without retention. | `logs/minion.log` is 475,051,577 bytes and growing. Active logging is `debug` with `redactSensitive: tools`; no retention key is configured. Docker's 50 MB × 5 rotation covers stdout, not this application file. | Use `info` in production outside bounded diagnostics. Move to the dated/pruned application log path or add tested size/day retention for explicit paths, and alert on log and volume growth. |
| FACES-005 | P1 | Workforce/Paperclip points to an unavailable upstream. | `MINION_WORKFORCE_UPSTREAM_URL` and `PAPERCLIP_API_URL` resolve to the same configured public-IP target on port 3200. Credential-free `/health` and `/api/health` probes both failed immediately with connection refused (`errno 111`). | Confirm the intended Paperclip deployment/listener, restore it or correct the runtime secret through an approved change, and add reason-class/last-success readiness. Qualify the repair first with authenticated read-only identity and issue-list calls. |

## Meta scope and evidence limit

The running gateway has the `meta-graph` plugin enabled with an app secret and verify token, but no access token. Its active channel configuration has no Instagram, Messenger or WhatsApp Cloud channel. The current Hub channel mirror was hydrated, so this is not explained by disabled hydration.

This does **not** prove that the separate Hub Meta Business OAuth connection is absent. The FACES runtime exposes only its configured Turso telemetry database, which contains no `meta_connections`, `meta_assets` or `meta_sync_jobs` tables. It has neither a Hub PostgreSQL read credential nor a tenant-authenticated Meta status endpoint. Hub PostgreSQL connection status and provider-side token validity remain unavailable in this pass. The user’s statement that “Meta is connected” can therefore coexist with the observed gateway messaging configuration.

## Operational aggregates

- Event store: 19,469 rows, current through `2026-10-03T02:51:05.255Z`; 44 high, 11 medium and 19,414 info events. This proves current local telemetry, not low-privilege access safety.
- Message ledger: 59,205 rows, all marked synced, zero pending and zero attempts. Its last row was created on July 19, so it does not prove current channel delivery.
- Gateway cron: zero jobs.
- JEV shadow: expiry worked. There were 519 calls, 518 successes and one unknown provider transport/parse result; zero calls occurred after the September 29 deadline and customer-visible writes remain zero. The reporting timer continues by design. The promised human quality review remains incomplete: zero labels, `unmeasured-no-human-labels`, and the pilot remains halted. This is a known review residual rather than a new expiry defect.

## Original 97 comparison

All 20 original gateway findings (`GW-001` through `GW-020`) are present in the deployed source tree. None was refuted. Runtime context narrows a few triggers: cron has no jobs; the message outbox has no backlog; browser relay, Hub metrics, event storage and memory sync are active; no low-privilege, cross-tenant, shutdown, provider-failure or fault-injection exploit was attempted. `GW-018` and `GW-019` are CI/deployment-governance findings rather than runtime checks. The other 77 Hub/meta findings were outside this backend probe and remain unread here.

Source and deployment anchors used for remediation:

- `deploy/swarm/README.md:26-38`, `deploy/swarm/stack.yml:137-162`, `deploy/swarm/minion-swarm-firewall.service:1-13`, `deploy/swarm/deploy-brain-vector.sh:25-38`
- `src/config/paths.ts:139-195`, `src/config/types.base.ts:134-143`, `src/logging/logger.ts:53-70,102-123`
- `src/channels/whatsapp/accounts.ts:89-149`, `src/channels/whatsapp/auth-store.ts:30-40`, `src/gateway/server-core/server-channels.ts:334-354`
- `src/gateway/workforce-proxy.ts:23-143`, `extensions/paperclip/minion.plugin.json:1-24`, `extensions/paperclip/src/tool.ts:81-94`

The machine-readable report is [`faces-backend-recon.json`](./faces-backend-recon.json).
