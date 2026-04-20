# Infisical Rename Cascade — DISCOVERY

**Phase:** 02-foundation
**Plan:** 07
**Date:** 2026-04-19
**Status:** read-only investigation complete; NO mutations performed
**Task:** Plan 02-07 Task 1 (discovery); awaiting user approval at Checkpoint 1 before any mutation work.

---

## 1. Infisical CLI rename capability

**CLI version:** `infisical` **v0.43.76** (Arch, AUR `infisical-bin`)

**Project management commands — VERDICT: NONE.**

```
$ infisical projects --help
Error: unknown command "projects" for "infisical"

$ infisical projects update --help
Error: unknown command "projects" for "infisical"

$ infisical projects create --help
Error: unknown command "projects" for "infisical"
```

Available top-level subcommands (from `infisical --help`): `agent, bootstrap, cert-manager, dynamic-secrets, export, gateway, help, init, kmip, login, pam, proxy, relay, reset, run, scan, secrets, service-token, ssh, token, user, vault`.

**No `projects` command at any level.** The `secrets` command accepts `--projectId` and `--projectSlug` flags for targeting, but creation/rename/deletion of projects themselves is NOT exposed via CLI. `infisical init` only *connects* a local directory to an existing project — it does not create one.

**`minion-core-strategy` field (B3 decision):** **DASHBOARD-ONLY.**

The Plan's Option (a) — renaming the UUID `dd71e710-…` project's slug to `minion-core` via CLI — is **impossible with the current CLI version**. The rename must be performed through either:

1. **Infisical Web Dashboard** at http://100.80.222.29:8080 (Project Settings → Rename) — recommended, zero-risk, preserves secrets.
2. **Infisical REST API** at `http://100.80.222.29:8080/api/v1/workspace/:workspaceId` (PATCH) — possible with an OAuth/service token, but requires auth token acquisition first; no clear win over dashboard.
3. **Migrate path (B3 Option b):** Export from old UUID project, create new `minion-core` project, re-import secrets, verify count match. Only needed if dashboard rename is blocked for some reason.

**Recommendation locked for Task 2+:** Use **dashboard rename** (B3 Option (a), human-action checkpoint). The current plan's Task 3 CLI-rename path must be rewritten as a human-action checkpoint against the dashboard before execution — this is a scope note for the orchestrator.

### REST API probe

- `http://100.80.222.29:8080/api/status` → HTTP 200 (instance reachable)
- `http://100.80.222.29:8080/api/v1/workspace` → 401 Token missing (authenticated endpoint exists)
- `http://100.80.222.29:8080/api/v2/workspace` → 404 Not Found (v2 renamed or unused)

---

## 2. D10 target state + current pre-rename baseline

### Target mapping (from 02-CONTEXT.md §D10)

| Current name / UUID | New name | Action | Pre-rename secret count |
|---|---|---|---|
| `ai-providers` (UUID `dd71e710-4e1a-48f6-afea-5502bae5a574`) | `minion-core` | **rename slug (dashboard)** OR migrate | **6** |
| `paperclip` (UUID `99490998-0582-4ddf-961b-bce71becba6b`) | `minion-paperclip` | **rename slug (dashboard)** | 19 |
| `minion-gateway-prod` (UUID `5d7bbcef-4691-4e5e-bd51-4c527603a52e`) | `minion-gateway-prod` | **UNCHANGED** | 17 |
| (none) | `minion-gateway` | create (dev-side split from prod) | 0 (new) |
| `minion-hub` (UUID `8e6ad0f2-f853-41c8-9b18-7b3f52f241b7`) | `minion-hub` | **already correctly named** | 10 |
| `minion-site` (UUID `85e69031-5f09-49c6-8c4d-b3189b3d04d2`) | `minion-site` | **already correctly named** | 5 |
| (none) | `minion-plugins` | create (placeholder) | 0 (new) |
| (none) | `minion-pixel-agents` | create (placeholder) | 0 (new) |

### Key correction vs original CONTEXT §D10

The original D10 implied `minion-hub` and `minion-site` needed to be *created* as placeholders. **Reality:** both exist already with dev-env secrets (per `reference_infisical_setup.md` and verified via `infisical secrets --projectId ... -o dotenv --silent`). They are in D10 final state and require NO action in Task 3.

**Projects actually needing creation:** `minion-gateway` (dev-side), `minion-plugins`, `minion-pixel-agents`. Three new projects, not the five the plan assumed.

**Projects actually needing rename:** 2 (`ai-providers` → `minion-core`; `paperclip` → `minion-paperclip`).

### Pre-rename secret-count baseline (for post-rename verification)

Captured 2026-04-19 via `infisical secrets --projectId <UUID> --env <env> --domain http://100.80.222.29:8080/api -o dotenv --silent | grep -cE "^[A-Z_]+="`:

- `ai-providers` dev: **6 secrets** (target `minion-core` after rename — count MUST match 6)
- `paperclip` dev: **19 secrets** (target `minion-paperclip` after rename — count MUST match 19)
- `minion-gateway-prod` prod: **17 secrets** (baseline only, no rename)
- `minion-hub` dev: **10 secrets** (baseline only, no rename)
- `minion-site` dev: **5 secrets** (baseline only, no rename)

---

## 3. Meta-repo references to update

Grep run: `grep -rn {pattern} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=<all subprojects> --exclude-dir=docs --exclude-dir=ai-studio .` at `/home/nikolas/Documents/CODE/AI/`.

Filtered to **active source/config files only** (excluding `.planning/` self-references which are the plan documents themselves; those are planning artifacts, not config to update).

### Active source files with old-name references

| File | Line | Match | Proposed action | Owner |
|---|---|---|---|---|
| `infisical-dev.sh` | 2 | comment: "secrets from both ai-providers and the current project" | REMOVE — 02-08 replaces this file with a deprecation shim | 02-08 |
| `infisical-dev.sh` | 6 | comment: "ai-providers shared secrets" | REMOVE — 02-08 | 02-08 |
| `infisical-dev.sh` | 9 | `AI_PROJECT="dd71e710-4e1a-48f6-afea-5502bae5a574"` | REMOVE — 02-08 shim replaces the whole file | 02-08 |
| `infisical-dev.sh` | 14 | `infisical secrets --projectId "$AI_PROJECT" --env dev ...` | REMOVE — 02-08 | 02-08 |
| `mempalace.yaml` | 23-24 | `name: paperclip_minion` / `description: Files from paperclip-minion/` | **NO-OP** — this is a mempalace scope name referring to the subproject directory, NOT an Infisical project slug | (none) |

### Active config files confirmed CLEAN

- `.env.defaults` — already references `minion-core` (line 8: `MINION_DEFAULT_INFISICAL_CORE_PROJECT=minion-core`). Nothing to change.
- `.env.example` — no Infisical project-name refs (only `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/SECRET`). Clean.
- `minion.json` — all `infisicalProject` fields already use D10 names (`minion-gateway`, `minion-hub`, `minion-site`, `minion-paperclip`, `minion-pixel-agents`, `minion-plugins`). Clean.
- `packages/cli/minion.schema.json` — pattern `^minion-[a-z0-9-]+$` on `infisicalProject` field. Clean.
- `packages/cli/test/registry.test.ts` — test fixtures use `minion-hub`. Clean.
- `packages/env/src/*.ts` — all references use `projectSlug` variable; no hardcoded old names. Clean.

### Planning artifacts (not config — reference only)

The grep also surfaced matches in `.planning/phases/02-foundation/02-*-PLAN.md`, `.planning/phases/02-foundation/02-CONTEXT.md`, `.planning/PROJECT.md`, `specs/2026-04-19-minion-meta-repo-design.md`. These are **documentation describing the rename** and are expected to contain both old and new names. **No action needed** — they are historical planning documents.

### Conclusion on meta-repo grep

**Only `infisical-dev.sh` has active old-name references, and 02-08 already owns replacing that file with a deprecation shim.** The meta-repo itself has ZERO independent references to update in this plan. Task 3 "update every downstream reference" in the meta-repo is a no-op for active config.

---

## 4. Subproject CI references (B2 — D10 scope)

Grep run per subproject via `git -C <subproject> grep -n -E "paperclip|minion-gateway-prod|ai-providers|dd71e710-4e1a-48f6-afea-5502bae5a574|INFISICAL|infisical" -- ".github/workflows/"`.

| Subproject | `.github/workflows/` dir present | Matches | Action |
|---|---|---|---|
| `minion` | yes | **none** for our patterns | NO-OP |
| `minion_hub` | **no** | n/a | NO-OP (no CI yet) |
| `minion_site` | **no** | n/a | NO-OP (no CI yet) |
| `minion_plugins` | **no** | n/a | NO-OP (no CI yet) |
| `paperclip-minion` | yes | see below | **needs review** |
| `pixel-agents` | yes | **none** for our patterns | NO-OP |

### paperclip-minion CI matches

```
.github/workflows/pr.yml:56:  search_roots="$(grep '^ *- ' pnpm-workspace.yaml | ... | grep -v 'create-paperclip-plugin' | ...)"
.github/workflows/pr.yml:64:  for pkg in $(find $search_roots -maxdepth 2 -name package.json -not -path '*/examples/*' -not -path '*/create-paperclip-plugin/*' ...)
.github/workflows/pr.yml:160: mkdir -p ~/.paperclip/instances/default
.github/workflows/pr.yml:161: cat > ~/.paperclip/instances/default/config.json << 'CONF'
.github/workflows/release-smoke.yml:6:  paperclip_version:
.github/workflows/release-smoke.yml:26:  paperclip_version:
.github/workflows/release-smoke.yml:69: PAPERCLIPAI_VERSION="${{ inputs.paperclip_version }}" \
```

**Assessment:** All matches for `paperclip` are **NOT Infisical project slug references**. They are:
- Monorepo path filters (`create-paperclip-plugin` package name, `~/.paperclip` config dir)
- CLI input parameter names (`paperclip_version`, `PAPERCLIPAI_VERSION` env var)
- No `INFISICAL_*` or project-slug strings at all

**Action: NO-OP.** paperclip-minion CI does not reference any Infisical project name.

### Conclusion on B2

**No subproject CI workflow references any Infisical project slug that needs renaming.** The B2 concern (CI workflows in subproject repos leaking old names) is resolved with zero changes required. This is captured here per D10's explicit scope-inclusion requirement so that the user/orchestrator can confirm the null result.

---

## 5. Netcup references (SSH_UNAVAILABLE)

**Status:** **SSH_UNAVAILABLE** — Tailscale SSH to `niko@100.80.222.29` requires interactive re-authentication via the browser at `https://login.tailscale.com/a/...`. Without user-side re-auth, Claude cannot complete the grep of systemd unit files or docker-compose on Netcup.

```
$ ssh -o ConnectTimeout=5 -o BatchMode=yes niko@100.80.222.29 "echo SSH_OK; uname -a"
# Tailscale SSH requires an additional check.
# To authenticate, visit: https://login.tailscale.com/a/l343849835de4d
```

Per plan directive ("If SSH fails, document the failure in DISCOVERY and treat Netcup investigation as a user-driven checkpoint"): **this DISCOVERY logs SSH as unavailable and defers Netcup grep to Task 5** (which is already a human-action checkpoint). The user will either:
1. Re-authenticate Tailscale SSH before Task 2 and allow Claude to complete the grep, OR
2. Run the greps themselves during the Task 5 SSH session and report back.

### Expected Netcup findings (from memory — NOT verified on-host in this discovery)

Per `reference_gateway_netcup.md`, `reference_paperclip_netcup_auth.md`, `project_paperclip_infisical_integration.md`, `reference_voice_call_deployment.md`:

| Host path | Memory-indicated content | Proposed action |
|---|---|---|
| `netcup:/home/bot-prd/.config/systemd/user/minion-gateway.service` (ExecStart) | `infisical run --projectId 5d7bbcef-4691-4e5e-bd51-4c527603a52e --env prod --silent -- node entry.js gateway --port 18789` | **NO-OP** — uses UUID, not slug, and project is `minion-gateway-prod` which is UNCHANGED. May optionally migrate to `--projectSlug minion-gateway-prod` for readability, but not required for correctness. |
| `netcup:/home/bot-prd/.minion/gateway.json` | Twilio creds baked inline under `plugins.entries.voice-call.config`; also pulls from Infisical `minion-gateway-prod` via `infisical run` wrapper | **NO-OP** — `minion-gateway-prod` UNCHANGED |
| `netcup:/home/niko/docker/paperclip/docker-compose.deploy.yml` | `INFISICAL_PROJECT_ID=99490998-0582-4ddf-961b-bce71becba6b` (paperclip UUID); Machine Identity client id `8dd1820b-dad3-46b6-b6f1-ee3879425fa8` with access to paperclip + ai-providers projects | **UUID reference is slug-agnostic — rename is safe without compose edit.** Optional cosmetic update to add `INFISICAL_PROJECT_SLUG=minion-paperclip` if desired. |
| `netcup:/home/niko/docker/paperclip/.env` | `INFISICAL_CLIENT_SECRET=<redacted>` only | NO-OP — no project name |
| `netcup:/home/niko/docker/paperclip/docker-entrypoint.sh` | Calls Infisical API with client ID/secret; passes token to `infisical run --token` | Need to verify — likely no hardcoded project slug, but SSH needed to confirm |

### Critical insight (from memory)

**Paperclip + gateway services use UUID-based `--projectId`, NOT slug-based `--projectSlug`.** Renaming the slug in Infisical does NOT break these services because the UUID is stable across renames. This means:

- **Zero-downtime rename is possible** for both `paperclip → minion-paperclip` and `ai-providers → minion-core` *provided* the services truly use UUID targeting (verified via memory; needs on-host SSH confirmation).
- The "coordinate docker-compose update with Infisical rename to avoid secrets-fetch failure" risk from the plan is **likely over-stated** for UUID-based clients. Slug-based clients would break; UUID-based clients would not.
- The Machine Identity `paperclip-server` has project membership scoped to both `paperclip` UUID and `ai-providers` UUID. Renaming the slug does NOT remove the membership. Confirmed safe.

**Risk verdict:** Low. The paperclip container will continue to fetch secrets even mid-rename because it targets the UUID. Systemd bot-prd gateway is unchanged. Only a full dashboard delete-and-recreate would cause an outage, and that is NOT the operation D10 requires.

---

## 6. Memory references to update

Grep: `grep -rn "ai-providers\|dd71e710-4e1a-48f6-afea-5502bae5a574" /home/nikolas/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/`

### Files with old-UUID or `ai-providers` mentions

| File | Lines | Context | Action |
|---|---|---|---|
| `reference_infisical_setup.md` | 16, 28, 32, 43 | project list (line 16), wrapper description (28, 32), machine identity project membership (43) | Replace `ai-providers` → `minion-core` (6 refs), UUID → `minion-core` label; add rename date footer |
| `project_paperclip_infisical_integration.md` | 13 | "Projects granted: paperclip + ai-providers" | Replace `paperclip` → `minion-paperclip`; `ai-providers` → `minion-core`; add footer |
| `project_paperclip_pi_openrouter_fallback.md` | 200 | infra note about paperclip/ai-providers dual OPENROUTER_API_KEY | Replace `ai-providers` → `minion-core`, `paperclip's Infisical project` → `minion-paperclip's Infisical project`; add footer |
| `project_minion_meta_repo_design.md` | 61, 62, 299, 377 | design doc discussing the rename itself | **NO-OP** — this is the authoritative rename design document; keep old names as historical context |

### Files mentioning `paperclip` (47 files) — relevant ones per plan scope

Per the plan's `files_modified` list, the 6 memory files explicitly marked for update in Task 4:

1. `reference_infisical_setup.md` — ✅ confirmed has `ai-providers`/UUID refs above
2. `project_paperclip_netcup_deployment.md` — scan result: contains `paperclip` refs, needs inspection to identify Infisical-project-name instances
3. `project_paperclip_infisical_integration.md` — ✅ confirmed has old refs (line 13)
4. `project_twilio_voice_call_secrets.md` — contains `paperclip dev`/`minion-gateway prod` references (both match pre- and post-rename; only update cosmetic labels if needed)
5. `reference_voice_call_deployment.md` — contains `paperclip dev`/`minion-gateway prod` references (same as above)
6. `reference_paperclip_gateway_access.md` — contains `paperclip` in many places, mostly referring to the container/project as a whole, NOT Infisical project slug

**Precise per-file edits** will be determined by Task 4 (after user approves mutation plan). This discovery confirms the targets exist and sizes the scope.

### Memory NOT to touch

- `reference_gateway_netcup.md` — references `minion-gateway-prod` (UNCHANGED)
- All other `paperclip*.md` files that mention paperclip as the subproject/product name (not as an Infisical project slug) — no-op
- `project_minion_meta_repo_design.md` — historical design doc; keep as-is

---

## 7. Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| CLI does not support project rename | **High** (blocks auto-execution) | Switch to dashboard-only rename path; Task 3 becomes a human-action checkpoint |
| Voice-call production breaks mid-rename | **Low** | `minion-gateway-prod` UNCHANGED; services use UUID targeting |
| Paperclip container fails to fetch secrets mid-rename | **Low** | Container uses UUID (`99490998-...`) targeting; rename is UUID-stable |
| `infisical-dev.sh` breaks after rename | **None** | File is deprecated in 02-08 regardless; no-op for this plan |
| Memory drift (stale project names in future AI queries) | **Medium** | Task 4 updates all 6 flagged memory files + adds rename date footer |
| Off-plan reference slips through | **Medium** | This grep is authoritative for the meta-repo; subproject CI is clean; only Netcup needs on-host verification |

---

## 8. Proposed mutation order (for RUNBOOK)

Recommended updates to the plan's original Task 3 sequence:

1. **User (Task 2 checkpoint):** approve dashboard-rename path (CLI doesn't support rename).
2. **User (dashboard):** CREATE new placeholder projects: `minion-gateway` (dev-side), `minion-plugins`, `minion-pixel-agents`. (NOT 5 — `minion-hub` and `minion-site` already exist per corrected mapping above.)
3. **User (dashboard):** RENAME `ai-providers` → `minion-core` (slug + display name). Verify secret count remains 6.
4. **User (dashboard):** RENAME `paperclip` → `minion-paperclip` (slug + display name). Verify secret count remains 19.
5. **Claude (Task 4):** Update 6 memory files per Section 6 of this discovery.
6. **User or Claude (Task 5 checkpoint — requires Netcup SSH re-auth):** Verify docker-compose / systemd still function after rename. Because services target UUIDs, expected outcome is zero-change (optional cosmetic slug upgrade).
7. **User (Task 6 checkpoint):** Run `minion doctor` + production voice-call smoke test. Report results. Commit VALIDATION doc.

### Rollback

- **If dashboard rename breaks something:** Rename back in dashboard (reversible operation). Projects are UUID-stable; slug rename is cosmetic from the API consumer's perspective when they target UUIDs.
- **If a slug-based client breaks:** Add back the old slug OR migrate the client to UUID targeting (preferable long-term).
- **Memory drift:** `git checkout <SHA> -- /path/to/memory/file.md` to restore, though memory dir is outside meta-repo git.

---

## 9. Summary — key decisions made by this discovery

1. **Infisical CLI does NOT support project management.** Rename via dashboard OR REST API. Plan Task 3's CLI-rename path is infeasible as written.
2. **`minion-core-strategy = manual`** (dashboard rename via user action). B3 Option (a) slug rename is the chosen approach, but executed by the user via dashboard, not Claude via CLI.
3. **UUID project (ai-providers) has 6 secrets.** Post-rename count must match 6.
4. **Only 2 projects need renaming** (`ai-providers`, `paperclip`), **3 need creation** (`minion-gateway`, `minion-plugins`, `minion-pixel-agents`), **3 are already correctly named** (`minion-gateway-prod`, `minion-hub`, `minion-site`). Plan's original "5 projects to create" was based on stale assumption.
5. **Meta-repo active source is already clean.** Only `infisical-dev.sh` references old names, and that file is 02-08's problem.
6. **Subproject CI workflows are clean** — zero Infisical-project-slug references across all 6 subprojects.
7. **Netcup investigation deferred to Task 5** (SSH blocked by Tailscale re-auth). Expected findings based on memory show UUID-based targeting → rename is safe.
8. **Risk of production downtime is LOW** because all known service clients (bot-prd gateway, paperclip container) use UUID targeting, which is stable across slug renames.

---

## 10. Open questions for user at Checkpoint 1

1. **Do you want to re-auth Tailscale SSH now** so Claude can complete Section 5 Netcup grep before Task 2, or defer to Task 5?
2. **Do you want to rename `ai-providers` → `minion-core` via dashboard yourself**, or should Task 3 be refactored into a human-action checkpoint with explicit click-by-click instructions?
3. **Should `minion-gateway-prod` be renamed to plain `minion-gateway` (prod env)** as part of the split, or is the dual-project model (`minion-gateway` dev + `minion-gateway-prod` prod) the final D10 state? (CONTEXT §D10 says "kept" but the split naming is unusual.)
4. **Do you want the 3 new placeholder projects (`minion-gateway`, `minion-plugins`, `minion-pixel-agents`) created now or deferred** until the subprojects actually need per-project secrets? Creating empty placeholders costs nothing but clutters the Infisical dashboard.
5. **`paperclip-minion` CI workflows are clean** — do you want anything else grepped there, or is the null result acceptable?
