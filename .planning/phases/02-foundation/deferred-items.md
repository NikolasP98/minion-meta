# Phase 02 — Deferred Items

Out-of-scope discoveries during plan execution. Each item is logged here instead of auto-fixed per GSD scope boundary rules.

## From 02-06 (CLI execution)

### Infisical CLI flag drift in `@minion-stack/env`

**Found during:** 02-06 Task 4 integration smoke test (`minion doctor`).

**Issue:** `@minion-stack/env`'s `fetchInfisicalSecrets` invokes `infisical secrets --projectSlug <slug>`. The installed Infisical CLI (run via `which infisical` on this machine, 2026-04-20) reports `Error: unknown flag: --projectSlug`. The current CLI expects a different flag name (likely `--projectId` with slug-to-id resolution, or `--project`).

**Impact:** Every subproject in `minion doctor` shows `Infisical layer minion-core unavailable`. The resolver still returns successfully (warnings path, not throw). Commands like `minion dev <id>` still work — they just don't pick up Infisical values.

**Why deferred:** The flag is owned by `packages/env/src/infisical.ts`, not `packages/cli/`. Belongs in a follow-up to 02-05 (env package) or a new plan that refreshes the Infisical wrapper against the current CLI.

**Suggested fix:** Re-check `infisical secrets --help` output, update flag wiring in `packages/env/src/infisical.ts`, bump `@minion-stack/env` to `0.1.1`, republish.

**Evidence:** `doctor` output at commit (to be filled) shows `unknown flag: --projectSlug` in warnings column for all 6 subprojects.

## From 02-07 (Infisical rename cascade)

### Plan 02-07 Task 6 gateway-ping URL is wrong

**Found during:** 02-07 Task 6 automated health check.

**Issue:** Plan line 651 specifies `curl http://100.80.222.29:8080/ping` as the gateway health probe. Port 8080 on the Netcup Tailscale host is the **Infisical web dashboard**, not the minion gateway. The gateway listens on `localhost:18789` on Netcup and is externally reachable only via the Tailscale funnel at `https://netcup.donkey-agama.ts.net/`.

**Impact:** Cosmetic — the wrong URL happened to return HTTP 200 (Infisical SPA serves every path) so a naive reader could have mistaken it for a healthy gateway.

**Workaround used during 02-07 Task 6:** Probed `https://netcup.donkey-agama.ts.net/voice/webhook` instead. Returns HTTP 401 Unauthorized, which authoritatively proves the gateway is running, the voice-call extension is listening, and signature verification is enforcing.

**Why deferred:** Plan-authoring defect; editing the plan text retroactively is out of scope for execution. Logged for future rename-cascade-style plans so authors know the correct gateway health signal on Netcup.

**Suggested fix:** When next authoring a plan that probes the gateway, reference memory `reference_gateway_netcup.md` + `reference_voice_call_deployment.md` for the correct funnel URL.
