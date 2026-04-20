# Infisical Rename Cascade — RUNBOOK (executed)

**Phase:** 02-foundation
**Plan:** 07
**Date:** 2026-04-20
**Decision from Task 2 checkpoint:** `proceed-now` (user approved mutation plan; Netcup grep deferred to Task 5 because Tailscale SSH required re-auth)
**Discovery reference:** `.planning/phases/02-foundation/02-07-RENAME-DISCOVERY.md` (committed `1c13c61`)

---

## Step log

### Step 1 — Infisical create/rename (COMPLETE)

**Method:** Dashboard (user-driven). The Infisical CLI v0.43.76 installed on both workstation and Netcup has NO `projects` subcommand, so slug renames and project creation must be performed through http://100.80.222.29:8080 (Project Settings → Rename) or via the REST API with an authenticated service token. User chose dashboard.

**minion-core-strategy: renamed** (B3 Option (a))

The existing UUID `dd71e710-4e1a-48f6-afea-5502bae5a574` (formerly slug `ai-providers`) was renamed in the dashboard to slug `minion-core` + display-name `Minion — Core (shared AI keys)`. UUID preserved across the rename.

**minion-core secret count (verification):** **6 secrets** in `minion-core` (dev env). Pre-rename baseline was 6 (captured during Discovery Task 1). Count MATCH confirms the rename preserved data.

**CLI verification post-rename (2026-04-20):**

```sh
$ infisical secrets --projectId 5d7bbcef-4691-4e5e-bd51-4c527603a52e --env prod --domain http://100.80.222.29:8080/api -o dotenv --silent | grep -cE "^[A-Z_]+="
17
```

Gateway prod project (`minion-gateway`, formerly `minion-gateway-prod`) resolves identically post-rename — UUID is the stable key; slug is cosmetic.

### Rename / creation operations executed (dashboard)

| # | Operation | Slug (pre) | Slug (post) | UUID | Env | Secret count | Verified |
|---|---|---|---|---|---|---|---|
| 1 | RENAME | `ai-providers` | `minion-core` | `dd71e710-4e1a-48f6-afea-5502bae5a574` | dev | 6 | ✓ |
| 2 | RENAME | `paperclip` | `minion-paperclip` | `99490998-0582-4ddf-961b-bce71becba6b` | dev | 19 | ✓ |
| 3 | RENAME | `minion-gateway-prod` | `minion-gateway` | `5d7bbcef-4691-4e5e-bd51-4c527603a52e` | prod (+ dev future) | 17 (prod) | ✓ |
| 4 | UNCHANGED | `minion-hub` | `minion-hub` | `8e6ad0f2-f853-41c8-9b18-7b3f52f241b7` | dev | 10 | ✓ |
| 5 | UNCHANGED | `minion-site` | `minion-site` | `85e69031-5f09-49c6-8c4d-b3189b3d04d2` | dev | 5 | ✓ |
| 6 | CREATE | (none) | `minion-plugins` | *capture on first use* | dev | 0 | ✓ (placeholder) |
| 7 | CREATE | (none) | `minion-pixel-agents` | *capture on first use* | dev | 0 | ✓ (placeholder) |

**NOTE vs original D10 mapping:** The original CONTEXT §D10 listed `minion-gateway-prod` as UNCHANGED and `minion-gateway` as a new dev-side placeholder (parallel-project model). The user chose to consolidate into a single `minion-gateway` project with native `dev` + `prod` environments (per Infisical convention) — the new model captured in `reference_infisical_setup.md`. `minion-gateway-prod` was renamed to `minion-gateway` and its existing `prod` env preserved; the `dev` env will be populated on first dev-side consumption. This is a model-level improvement over D10 and does not affect downstream consumers because they target UUIDs.

### Final Infisical project list (dashboard inventory, post-rename)

Seven projects, all matching `minion-<name>` convention:

- `minion-core` (dd71e710-..., dev: 6)
- `minion-gateway` (5d7bbcef-..., prod: 17, dev: 0)
- `minion-paperclip` (99490998-..., dev: 19)
- `minion-hub` (8e6ad0f2-..., dev: 10)
- `minion-site` (85e69031-..., dev: 5)
- `minion-plugins` (UUID TBD, dev: 0)
- `minion-pixel-agents` (UUID TBD, dev: 0)

### Step 2 — Netcup paperclip docker-compose update (PENDING — Task 5 checkpoint)

**Status:** BLOCKED on Tailscale SSH re-auth. `ssh niko@100.80.222.29` returns:

```
# Tailscale SSH requires an additional check.
# To authenticate, visit: https://login.tailscale.com/a/l5703f8d35a6b5
```

Expected finding based on memory (`reference_paperclip_netcup_auth.md`, `project_paperclip_infisical_integration.md`): `docker-compose.deploy.yml` passes `INFISICAL_PROJECT_ID=99490998-0582-4ddf-961b-bce71becba6b` (UUID, not slug). **The UUID is stable across the slug rename, so no docker-compose edit is required for functional correctness.** Cosmetic changes (comments, logging references) may still be desirable but are not breaking.

### Step 3 — bot-prd verification (PENDING — Task 5 checkpoint)

**Status:** Also BLOCKED on Tailscale SSH re-auth.

Expected finding based on memory (`reference_voice_call_deployment.md`): bot-prd systemd unit ExecStart uses `infisical run --projectId 5d7bbcef-4691-4e5e-bd51-4c527603a52e --env prod --silent -- node entry.js gateway --port 18789`. UUID-based; unaffected by the `minion-gateway-prod` → `minion-gateway` slug rename.

### Step 4 — Memory updates (COMPLETE — Task 4)

Updates applied to the 6 memory files per Discovery §6:

| # | File | State | Update |
|---|---|---|---|
| 1 | `reference_infisical_setup.md` | DONE (prior commit) | Full rename table with UUIDs, env-model correction, CLI limitation note |
| 2 | `project_paperclip_infisical_integration.md` | DONE (prior commit) | Slugs updated (paperclip → minion-paperclip, ai-providers → minion-core); UUIDs preserved |
| 3 | `project_twilio_voice_call_secrets.md` | DONE (prior commit) | Location slug updated (minion-paperclip) |
| 4 | `project_paperclip_netcup_deployment.md` | DONE (this plan) | Appended rename footer |
| 5 | `reference_voice_call_deployment.md` | DONE (this plan) | Appended rename footer |
| 6 | `reference_paperclip_gateway_access.md` | DONE (this plan) | Appended rename footer |

Memory files are NOT git-tracked in the meta-repo (they live under `~/.claude/projects/…/memory/`), so they appear as inline edits without commit hashes. Each updated file has a trailing rename footer per Task 4 template.

---

## Rollback

### If a slug-based client breaks post-rename

1. In the Infisical dashboard, rename the project back to its old slug (reversible operation; UUID preserved).
2. OR migrate the affected client to UUID targeting (`--projectId <UUID>` instead of `--projectSlug <slug>`). UUID targeting is preferable long-term because it survives future renames.

Known slug-based clients that COULD have broken: **none** per Discovery §5. All known production consumers (bot-prd gateway systemd, paperclip container entrypoint, `@minion-stack/env` machine-identity flow) target UUIDs.

### If dashboard-rename itself is reverted

1. No-op — the UUIDs never change, so the rename is a cosmetic dashboard operation only.
2. Restore memory entries if they drifted:
   ```sh
   # Memory dir is NOT git-tracked, so revert is by hand
   vim ~/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/<file>
   ```

### If placeholder projects cause issues

`minion-plugins` and `minion-pixel-agents` are empty (zero secrets). Delete them in the dashboard with zero downstream impact — they will be re-created on first real need.

### If `infisical-dev.sh` breaks

No action needed — the file is scheduled for deprecation shim in Plan 02-08 regardless.

---

## Outstanding items before Phase 2 can close (Wave 5 exit criteria)

1. **User re-auth Tailscale** at https://login.tailscale.com/a/l5703f8d35a6b5 so Claude can complete Task 5 on-host grep + verification.
2. **User voice-call smoke test** from a real phone through the gateway (Task 6).
3. After both: Claude writes `02-07-RENAME-VALIDATION.md` capturing `minion doctor` output + smoke-test result + commits + SUMMARY.md + advances STATE.md.

---

## Commits captured as part of this plan

| Commit | Message |
|---|---|
| `1c13c61` | `docs(02-07): Infisical rename cascade — discovery report` |
| `2b81544` | `docs(02-07): partial progress — discovery done, dashboard + smoke test pending` |
| `200396e` | `docs(02-07): Infisical rename cascade — dashboard ops complete, CLI verified` |
| (this) | `docs(02-07): Infisical rename cascade — runbook + memory updates (Task 3+4 complete)` |
