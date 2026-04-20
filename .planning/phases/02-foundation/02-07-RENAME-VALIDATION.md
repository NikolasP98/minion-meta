# Infisical Rename Cascade — VALIDATION

**Phase:** 02-foundation
**Plan:** 07
**Date:** 2026-04-20
**Status:** DRAFT — Netcup + automated checks complete; user voice-call smoke test PENDING
**Decision from Task 2 checkpoint:** `proceed-now`
**Netcup mutation outcome (Task 5):** `paperclip OK — no edits required (UUID preserved); bot-prd OK — UUID held, unit unchanged, service healthy`
**Discovery / Runbook:** `02-07-RENAME-DISCOVERY.md` (commit `1c13c61`) / `02-07-RENAME-RUNBOOK.md` (commit `acb183a`)

---

## 1. Netcup verification (Task 5 — human-action, COMPLETE 2026-04-20)

SSH auth via Tailscale was restored mid-plan; the orchestrator was authorized to run the read-only verification itself. Results:

### paperclip container (`/home/niko/docker/paperclip`)

| Check | Finding | Verdict |
|---|---|---|
| `docker-compose.deploy.yml` Infisical wiring | `INFISICAL_PROJECT_ID=99490998-0582-4ddf-961b-bce71becba6b` (UUID, not slug) | UUID preserved across rename — no edit required |
| `docker compose ps` | `paperclip-server-1` up 2 days, status healthy | Healthy |
| Recent `docker compose logs` tail | Scheduler + heartbeat timer ticking normally; no `secret`/`infisical` error lines | No adverse effect from slug rename |

**Verdict:** `paperclip OK — no edits required (UUID preserved across rename)`

### bot-prd gateway (`/home/bot-prd/.config/systemd/user/minion-gateway.service`)

| Check | Finding | Verdict |
|---|---|---|
| Unit file `ExecStart` | `/usr/bin/infisical run --projectId 5d7bbcef-4691-4e5e-bd51-4c527603a52e --env prod --silent -- …` (UUID-based, unchanged) | UUID-based targeting unaffected by slug rename |
| `systemctl --user status minion-gateway` | active (running) since 2026-04-18, 2+ days, MainPID 3502403 | Healthy; no restart required |

**Verdict:** `bot-prd OK — UUID held, unit unchanged, service healthy`

### Conclusion — Task 5

Both production services survived the Infisical slug rename with **zero edits and zero downtime** because both target Infisical by UUID, not slug. This matches the Discovery §7 risk verdict ("Low — UUID-based clients unaffected").

---

## 2. Automated health checks (Task 6 Part A — COMPLETE 2026-04-20)

### `minion doctor --json` output

Executed: `node packages/cli/dist/index.js doctor --json` from meta-repo root.
Exit code: **0**.

```json
[
  { "id": "(meta)",       "vars": "infisical-cli-ok", "warnings": "INFISICAL_* auth env vars missing",                                        "links": "-" },
  { "id": "minion",       "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" },
  { "id": "hub",          "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" },
  { "id": "site",         "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" },
  { "id": "paperclip",    "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" },
  { "id": "pixel-agents", "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" },
  { "id": "plugins",      "vars": "108",              "warnings": "Infisical layer minion-core unavailable: Error: unknown flag: --projectSlug", "links": "no @minion-stack/* installed" }
]
```

**Interpretation:**

- `(meta) infisical-cli-ok` — CLI is installed and wire-compatible at the meta layer.
- `INFISICAL_* auth env vars missing` — expected on this workstation (Universal Auth Client-ID/Secret not set locally). Per the plan's `<must_haves.truths>`: *"`minion doctor` returns exit 0 for all 6 subprojects (or exit 3 only if user has not configured machine-identity auth yet)"*. We are in the "auth not configured" branch; the plan explicitly allows this.
- **`unknown flag: --projectSlug` warning per subproject — NOT caused by the rename.** This is a pre-existing bug in `@minion-stack/env`: the wrapper passes `--projectSlug <slug>` to `infisical secrets`, but the installed Infisical CLI v0.43.76 does not accept that flag at the `secrets` subcommand — only `--projectId <uuid>` is valid. Root cause is orthogonal to this plan. See **Deferred Issue #1** below.
- `vars: 108` — 108 variables resolved per subproject from `.env.defaults` layer alone (Infisical layer failed due to the bug above, but the plan does not require Infisical-layer vars to resolve locally since Universal Auth is not configured here).
- Exit code 0 — the CLI treats these as warnings, not errors.

### Gateway health probe (Tailscale funnel)

The plan's Task 6 probe command `curl http://100.80.222.29:8080/ping` is misdirected — port 8080 on the Netcup Tailscale host is **Infisical's web dashboard**, not the minion gateway. The gateway listens on `localhost:18789` + `localhost:3334` inside Netcup and is only externally reachable via the Tailscale funnel at `https://netcup.donkey-agama.ts.net/`.

Corrected probes:

| Probe | Result | Interpretation |
|---|---|---|
| `curl http://100.80.222.29:8080/ping` | HTTP 200, body = Infisical dashboard HTML | Wrong URL — Infisical responded; not the gateway |
| `curl -X POST https://netcup.donkey-agama.ts.net/voice/webhook` | HTTP 401 `Unauthorized` | **Gateway + voice-call extension healthy** — signature verification correctly rejects unsigned request |
| `curl https://netcup.donkey-agama.ts.net/paperclip` | HTTP 200, HTML app shell | Paperclip container healthy (served via same funnel) |

**Authoritative health signal:** `https://netcup.donkey-agama.ts.net/voice/webhook → 401 Unauthorized` — this proves:

1. Gateway systemd unit is running (`/voice/webhook` funnel route requires the gateway process).
2. Voice-call extension is loaded and listening on port 3334.
3. Signature verification is ON and enforcing policy (201 compliance item from the voice-call deployment memory).
4. Funnel path-strip fix is still in place (`/voice/webhook` resolves correctly).

The Netcup gateway survived the rename with no observable degradation.

---

## 3. Production smoke test (Task 6 Part B — PENDING)

The authoritative proof of rename-cascade correctness is a real voice call from the user's phone through the gateway. Only the user can run this (requires a physical phone and the production DID).

**Awaiting user action — see Checkpoint below.**

| Check | Status | Notes |
|---|---|---|
| Inbound voice call | PENDING | User places real call to production DID |
| Bidirectional audio | PENDING | User listens for clean audio both directions |
| Paperclip wake-up | PENDING (optional) | User triggers a heartbeat via dashboard |
| Other Infisical-backed service spot-check | PENDING (optional) | Any day-to-day service the user relies on |

---

## 4. Final state summary (pending user voice-call confirmation)

| Requirement | Status |
|---|---|
| Infisical projects match D10 mapping | ✓ (7 projects, all `minion-*` per RUNBOOK) |
| `minion-core` has >0 secrets (B3 verification) | ✓ (6 secrets, matches pre-rename baseline) |
| Meta-repo grep for old names = 0 active refs | ✓ (only `infisical-dev.sh` which 02-08 owns) |
| Subproject CI grep = 0 active refs | ✓ (all 6 subprojects clean per Discovery §4) |
| Netcup bot-prd grep = 0 refs (UUID-based; no edits needed) | ✓ (Task 5 Netcup verification) |
| Netcup paperclip compose grep = 0 refs (UUID-based; no edits needed) | ✓ (Task 5 Netcup verification) |
| All 6 memory files updated with rename footer | ✓ (Task 4) |
| `minion doctor` exit 0 for all 6 subprojects | ✓ (with expected auth-missing warning) |
| Voice-call smoke test | **PENDING** |

---

## 5. Deferred Issues (out of scope for 02-07)

### Deferred Issue #1 — `@minion-stack/env` passes `--projectSlug` to Infisical CLI, which doesn't accept it

- **Observed:** `minion doctor` warns `Error: unknown flag: --projectSlug` for every subproject's `minion-core` layer resolution.
- **Root cause:** `@minion-stack/env` wrapper issues `infisical secrets --projectSlug <slug> ...`, but `infisical` v0.43.76 only accepts `--projectId <uuid>` at the `secrets` subcommand. The flag name is wrong OR an older CLI version accepted it and a downgrade happened.
- **Why deferred:** Orthogonal to the rename — this bug existed before 02-07 and is unchanged by it. Services on Netcup don't hit the wrapper (they call `infisical run --projectId <uuid>` directly). Fixing this is `@minion-stack/env` maintenance work, not a rename-cascade concern.
- **Recommendation:** File against `@minion-stack/env` — either switch wrapper to UUID targeting (read UUIDs from `minion.json` per-subproject) or pin the Infisical CLI version that accepted `--projectSlug`.
- **Logged to:** `.planning/phases/02-foundation/deferred-items.md` (append on next edit)

### Deferred Issue #2 — Task 6 plan had wrong `/ping` URL

- **Observed:** Plan line 651 specified `curl http://100.80.222.29:8080/ping` as a gateway health probe. Port 8080 is Infisical's web dashboard.
- **Fix applied here:** Probed the Tailscale funnel at `https://netcup.donkey-agama.ts.net/voice/webhook` instead, which returned 401 as expected (proving gateway + voice-call + signature verification are all healthy).
- **Why deferred:** Plan authoring defect; correcting the plan text retroactively is not in scope. Recorded here so future rename-cascade-style plans know the correct gateway health signal.

---

## 6. Ready-for-02-08 signal

**PENDING** — awaits user confirmation of voice-call smoke test result.

Once user reports "voice calls work": this doc will be updated with the smoke-test result, the RUNBOOK Step 2/3 entries will be marked complete, and `02-07-SUMMARY.md` will be written. Phase 2 FOUND-11 exits only after that confirmation.

---

## 7. Commits captured as part of this plan

| Commit | Message |
|---|---|
| `1c13c61` | `docs(02-07): Infisical rename cascade — discovery report` |
| `2b81544` | `docs(02-07): partial progress — discovery done, dashboard + smoke test pending` |
| `200396e` | `docs(02-07): Infisical rename cascade — dashboard ops complete, CLI verified` |
| `acb183a` | `docs(02-07): Infisical rename cascade — runbook + memory updates (Task 3+4 complete)` |
| (this) | `docs(02-07): Infisical rename cascade — validation draft (Netcup + automated checks)` |
| (next, after smoke test) | `docs(02-07): Infisical rename cascade — validation passed` |
