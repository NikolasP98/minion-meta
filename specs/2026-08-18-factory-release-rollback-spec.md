---
id: 2026-08-18-factory-release-rollback-spec
title: "self-update.sh safety net — CI gate, image retention, DB snapshot, health-verified rollback"
stage: done
status: shipped
pass: 2
created: 2026-08-18
updated: 2026-08-28
proposal: 2026-08-17-factory-release-rollback
verdict: approved
repos: [minion-factory]
tags: [infra]
type: fix
reconcile_ignore: true
reconcile_ignore_reason: "Flag evidence was S1/S2 merges only — S3 rollback control flow verified ABSENT on main (no failure_reason path, no health poll, no previous-tag rollback). Implementation in flight by orchestrator."
---

# self-update.sh safety net

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`scripts/self-update.sh` is the only functional edit. `README.md` gets a short operational note.
No other repo has a file in this spec.

**Design ancestors:**
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md) —
the runner's `adoptOrphans()` boot recovery (§ "Boot recovery" in `runner/src/index.ts`) is why a
`docker compose up -d runner` restart is already loss-free for in-flight work; this spec does not
change that guarantee, only what happens to the *code* being deployed.
[`2026-08-17-factory-compose-tailnet-hardcode-spec`](2026-08-17-factory-compose-tailnet-hardcode-spec.md) —
same repo, same box, disjoint files (`docker-compose.yml`/`setup.sh`/`deploy.sh`/`.env.example`
vs. this spec's `scripts/self-update.sh`). Establishes the Tier A (no Docker) / Tier B (needs the box)
DoD split reused below, and the house rule this spec follows: **no new `.env` variable** — anything
added to `/opt/factory/.env` is erased by the next workstation `deploy.sh` run (its own comment says
so; `deploy.sh:27-40`), and `self-update.sh`'s own header comment is explicit: *"NEVER runs deploy.sh
and never edits .env or crontab."* This spec's config lives as script-local constants, overridable only
via ad-hoc shell env at invocation (for testing), never persisted.
[`2026-08-17-factory-orchestration-tests`](../proposals/2026-08-17-factory-orchestration-tests.md)
(approved, **not yet spec'd**) — a **release prerequisite**, because the proposal requires
`self-update.sh` to deploy only commits whose CI is green. That sibling must provide the first-party
test workflow at `.github/workflows/ci.yml` before this spec is activated on the box. `minion-factory`
has **zero `.github/` workflows today** (verified: repo tree listing, confirmed independently by the
tailnet spec's own recon), so an absent workflow or absent run must fail closed rather than preserve
today's unsafe ungated behavior. See ⚠️A1.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — all three slices are tagged `infra`. §4b's `infra` lane calls for "workflow lint (actionlint) in
selfTest"; this repo has no `.github/` directory, so — per the precedent already set by the tailnet
spec — the honest analog is `shellcheck` + `bash -n`, both blocking in every slice's DoD. Zero
`.svelte` files ⇒ no UI-governance checks. No slice is tagged `security`: this spec does not change
what the runner exposes (that is the tailnet spec's surface) — it changes what code reaches the
already-existing bind. G3's red-state discipline (write the failing check first) is applied per slice
below via the "before" proof each DoD includes. The prerequisite workflow itself remains owned by the
sibling test-suite proposal, but `actionlint .github/workflows/ci.yml` is an activation gate here once
that file exists.

---

## 0. Product

From the approved proposal `2026-08-17-factory-release-rollback`, verbatim:

> ## self-update.sh has no safety net
>
> Audit 2026-08-17 priority #5. The box hard-resets to origin/main, rebuilds and
> restarts every 5 minutes with no pre-deploy CI gate, no previous-image
> retention, no sqlite backup, no post-deploy verification and no rollback.
> A bad push bricks the factory until manually fixed.
>
> **Definition of done:** self-update only deploys commits whose CI is green
> (requires the test-suite proposal); keeps the previous image tag; snapshots
> /data/factory.db before restart; verifies runner /health after restart and
> rolls back to the previous image on failure, filing a monitor event.
>
> **Out of scope:** canary/staging environments (single box).

## 1. What the repo actually says today

`minion-factory` is **not checked out in this workspace** (meta-repo `.gitignore` excludes
subprojects). Every line below was read via `gh api repos/NikolasP98/minion-factory/contents/<path>`
during spec authoring; `pushed_at` at that moment was `2026-08-18T02:23:11Z` on `main`.
**Re-read each file before editing** — this is Slice 0.

`scripts/self-update.sh`, current executable flow (header/inline comments elided; re-read the file in
Slice 0 before editing):

```bash
#!/bin/bash
set -euo pipefail
cd /opt/factory
export FACTORY_GH_TOKEN=$(grep ^FACTORY_GH_TOKEN= .env | cut -d= -f2-)
ASKPASS=$(mktemp)
trap 'rm -f "$ASKPASS"' EXIT
printf '#!/bin/sh\necho "${FACTORY_GH_TOKEN}"\n' > "$ASKPASS"
chmod 700 "$ASKPASS"
{ [ -d /opt/factory/memory/.git ] && GIT_ASKPASS="$ASKPASS" timeout 30 git -C /opt/factory/memory pull -q --ff-only 2>/dev/null; } || true

GIT_ASKPASS="$ASKPASS" git fetch -q origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse FETCH_HEAD)
[ "$LOCAL" = "$REMOTE" ] && exit 0

echo "[self-update] $(date -u +%FT%TZ) ${LOCAL:0:8} -> ${REMOTE:0:8}"
git reset --hard FETCH_HEAD
docker build -q -f agent/Dockerfile -t minion-factory-agent .
docker compose build -q runner
docker compose up -d runner
echo "[self-update] deployed ${REMOTE:0:8}"
```

Four facts that shape the work:

1. **The box already runs a `git clone` (not `deploy.sh`)** at `/opt/factory`, cron-polled every 5
   minutes (crontab entry is **not tracked in this repo** — it was set up by hand on Netcup; Slice 0
   confirms it still reads `*/5 * * * * /opt/factory/scripts/self-update.sh`). This spec edits the
   tracked script only; it does not touch the crontab.
2. **Both images are built with an implicit `:latest` tag** — `docker build -t minion-factory-agent .`
   and `docker-compose.yml`'s `image: minion-factory-runner` (no tag suffix). A "keep the previous
   image" feature is therefore "retag the current `:latest` to `:previous` *before* the rebuild
   overwrites it" — Docker has no built-in image history for a floating tag.
3. **`gh` is already a bare-metal dependency of this box**, not just of agent containers:
   `scripts/train.sh` (also cron, also un-tracked crontab entry, also at `/opt/factory`) calls
   `gh api`/`gh pr list`/`gh pr create` directly on the host with `export GH_TOKEN=...`. The CI-gate
   slice reuses the same binary and the same `FACTORY_GH_TOKEN` (repo-scope PAT, already sufficient
   for reading Actions run status on a private repo) — no new credential, no new scope.
4. **Neither `sqlite3` nor a standalone `jq` is proven present on the host.** Both `train.sh` and
   `self-update.sh` avoid bare `jq` today; `gh --jq` is available inside the already-required `gh`
   binary. S1 therefore performs all run selection through `gh --jq`, while S2 makes a missing
   `sqlite3` binary a **hard, loud, fail-closed skip**, not a silent gap.

`runner/src/db.ts:1-8`: `better-sqlite3` opens `${FACTORY_DATA:-/data}/factory.db` with
`db.pragma('journal_mode = WAL')` — confirms the file self-update.sh must snapshot is WAL-mode, which
is exactly what `sqlite3 <file> ".backup <dest>"` is designed to copy consistently while the runner
keeps writing to it (SQLite's own online backup API; safe to run without stopping the container, unlike
a bare `cp`, which can race a WAL checkpoint mid-copy).

`runner/src/index.ts:22-24`: `app.get('/health', (_req, res) => res.json({ ok: true, service:
'minion-factory-runner' }))` — unauthenticated (mounted before the bearer middleware), so the poll
this spec adds needs no credential. `setup.sh:38` already probes it at `http://127.0.0.1:3211/health`
(the host-side port; `docker-compose.yml` maps `127.0.0.1:3211:3210`) — this spec's health poll reuses
that exact address rather than the tailnet bind, so it has zero coupling to the tailnet spec's
`FACTORY_TAILNET_IP` variable.

`runner/src/index.ts` (`app.post('/hooks/monitor', ...)`), described fully in the ancestor pipeline
spec's runtime-monitor intake: unauthenticated paths are fail-closed 401 *except* this one route and
`/pipeline/reconcile`, which additionally accept `FACTORY_HOOK_SECRET`. Self-update.sh already has the
**full** `FACTORY_SECRET` available on the box (`.env`, mode 600) — no need for the scoped hook secret;
this spec reads `FACTORY_SECRET` the same way it already reads `FACTORY_GH_TOKEN` (`grep ^KEY= .env |
cut -d= -f2-`), and never writes to `.env`. Because `/hooks/monitor` runs inside the runner being
recovered, S3 also requires a direct `gh issue create` fallback for the rollback-failed and
no-previous-image paths; otherwise the proposal's monitor-event requirement is impossible precisely
when the runner stays down.

## 1b. Slice 0 — recon (≤ 30 min, prepend to Slice 1, not counted as a slice)

```bash
# On the box (ssh netcup):
crontab -l | grep self-update.sh                       # confirm */5 cadence, exact invocation
command -v sqlite3 gh curl                              # note which are ALREADY present
docker images minion-factory-agent minion-factory-runner --format '{{.Repository}}:{{.Tag}} {{.ID}}'
ls -la /opt/factory/data/                               # confirm factory.db location + WAL siblings
cat /opt/factory/.env | grep -c FACTORY_SECRET           # confirm the key self-update.sh will read exists
df -h /opt                                               # disk headroom for image + backup retention
# In a scratch clone (any host), read the file fresh — line numbers below are as-of the read date:
gh api repos/NikolasP98/minion-factory/contents/scripts/self-update.sh --jq '.content' | base64 -d
```

Paste the crontab line and the `command -v` results into the PR — Slice 1's DoD depends on which
binaries are genuinely missing on production Netcup.

---

## 2. Approach — three slices, in the order the script executes them

```
S0 (recon) ─▶ prerequisite: .github/workflows/ci.yml is live
                   └─▶ S1 (exact-SHA CI gate, before anything destructive)
                              └─▶ S2 (previous tags + DB snapshot)
                                         └─▶ S3 (build/up + health verify + rollback + monitor event)
```

Numbering matches the proposal's DoD clauses, but **execution order in the script is gate → snapshot →
deploy → verify**, not the DoD's listed order — a red/pending CI gate must skip the destructive steps
entirely (no retag, no backup, no reset --hard), so the working tree and images are simply untouched
and the next tick re-checks the same `REMOTE`. The slices are ordered for a single implementer to
build and self-test incrementally; S3's shared monitor helper is defined near the top because S1 also
uses it.
**S1–S3 merge and activate together, only after `.github/workflows/ci.yml` is live**: S1 without the
workflow blocks every update, while S3 without S2 has nothing complete to roll back to.

**All edits stay inside `scripts/self-update.sh` (+ a `README.md` note in S3). Nothing in
`docker-compose.yml`, `deploy.sh`, `.env`, `.env.example`, `runner/`, or `agent/` changes.** The
`/health` and `/hooks/monitor` endpoints and `factory.db`'s WAL mode are consumed as-is; none are
modified.

---

### S1 — CI gate before any deploy step

**Tags:** `infra` · **Estimate:** 4–6 h

**Goal:** deploy `$REMOTE` only when the latest attempt of the required first-party CI workflow for
that exact SHA is completed successfully. Pending, missing, or unreadable CI state leaves the tree and
images untouched for the next tick. This is the proposal's literal "only deploys commits whose CI is
green" contract.

**Do:**

- Insert the gate between the existing `[ "$LOCAL" = "$REMOTE" ] && exit 0` line and the
  `echo "[self-update] ... -> ..."` line — i.e., **before** `git reset --hard FETCH_HEAD`.
- Split the existing command-substitution export into `FACTORY_GH_TOKEN=$(...)` followed by
  `export FACTORY_GH_TOKEN`; this preserves behavior and lets the blocking `shellcheck` gate observe
  a failed credential read instead of masking it (`SC2155`).
- Immediately after exporting `GH_TOKEN="$FACTORY_GH_TOKEN"`, define `file_monitor_event()` before
  the gate can call it. S3 specifies its hook-first/direct-GitHub-fallback behavior. Bash functions
  are unavailable until their definition has executed; placing the helper below the S1 call would
  make the CI-red path exit under `set -e` before reporting anything.
- Use one required workflow identity, with test-only invocation overrides that are never persisted:
  ```bash
  FACTORY_REPO=${FACTORY_REPO:-NikolasP98/minion-factory}
  FACTORY_CI_WORKFLOW=${FACTORY_CI_WORKFLOW:-ci.yml}
  ```
  `.github/workflows/ci.yml` is the handoff contract with
  `2026-08-17-factory-orchestration-tests`. Other unrelated workflows on `main` do not silently
  redefine this deploy gate.
- Query only `$REMOTE`, and select the highest attempt from the returned runs using `gh`'s bundled
  `--jq` support (no bare `jq` process):
  ```bash
  if ! ci_state=$(timeout 30 gh run list -R "$FACTORY_REPO" \
      --workflow "$FACTORY_CI_WORKFLOW" --commit "$REMOTE" --limit 20 \
      --json attempt,status,conclusion \
      --jq 'sort_by(.attempt) | last | if . == null then "" else [.status, (.conclusion // "")] | @tsv end'); then
      echo "[self-update] CI state unavailable for ${REMOTE:0:8} — refusing to deploy"
      file_monitor_event "self-update CI unavailable for ${REMOTE:0:8}" \
          "self-update-ci-unavailable-${REMOTE}" \
          "Could not read ${FACTORY_CI_WORKFLOW} for exact SHA ${REMOTE}; no deploy occurred." \
          || echo "[self-update] monitor reporting failed"
      exit 1
  fi
  ```
  The exact-SHA filter avoids the existing spec's `--branch main --limit 30` ambiguity, where a busy
  branch could evict the target SHA. Selecting the maximum `attempt` prevents an older failed retry
  from permanently overriding a newer successful rerun.
- Four-way branch on `ci_state`:
  - **empty** → the workflow has not created a run for this SHA (including misconfigured/missing
    workflow) → log `CI has no run ... refusing to deploy` and `exit 0`; the next cron tick retries.
  - **status other than `completed`** → log `CI <status> ... waiting` and `exit 0`.
  - **completed with conclusion other than `success`** → log the conclusion, file a deduped monitor
    event with fingerprint `self-update-ci-red-${REMOTE}`, and `exit 0`.
  - **`completed<TAB>success`** → proceed.
  Parse the two TSV fields with `IFS=$'\t' read -r ci_status ci_conclusion <<<"$ci_state"`; do not
  use whitespace word-splitting or a standalone JSON parser.
  Any `gh`/network/auth failure is distinct from an empty result and exits non-zero after attempting
  a monitor event; neither case deploys blind.

**Files:** `scripts/self-update.sh`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A: no Docker required ---
shellcheck scripts/self-update.sh              # → clean (infra self-test analog, blocking)
bash -n scripts/self-update.sh
grep -n 'gh run list' scripts/self-update.sh    # → present
grep -c "^git reset --hard FETCH_HEAD$" scripts/self-update.sh  # → the pre-existing line still exists,
                                                 #   now AFTER the gate block (grep -B for order, or a
                                                 #   line-number diff pasted in the PR)

# --- Tier B: needs the box (gh auth, a real repo) ---
# Every full-script negative control first proves LOCAL != REMOTE; otherwise the existing no-op exit
# occurs before the gate and the test proves nothing. Gate-only scratch tests inject REMOTE directly.
# Red-state proof (BEFORE this slice): show today's script deploys regardless of CI —
git -C /opt/factory log -1 --format=%H origin/main   # note SHA S
# (on a scratch clone, pre-slice self-update.sh) — no CI check exists, so nothing to disprove by
# omission; instead prove the NEW gate actually gates, post-slice:

# 1. Missing workflow/run (negative control):
FACTORY_CI_WORKFLOW=does-not-exist.yml ./scripts/self-update.sh; echo "exit=$?"
# → no reset and no build; non-zero if gh reports the missing workflow as an API error, otherwise
#   zero with "CI has no run ... refusing to deploy". In both cases HEAD stays unchanged.

# 2. Red in a throwaway private repo; use the invocation-only FACTORY_REPO/FACTORY_CI_WORKFLOW
#    overrides and run the gate block in isolation (do not fabricate a red production run):
gh run list -R <scratch-repo> --workflow ci.yml --commit <sha> --json attempt,status,conclusion
#    → conclusion "failure" for the tip SHA; running self-update.sh's gate against that SHA must
#    exit 0 WITHOUT calling `git reset --hard` (assert via `git rev-parse HEAD` unchanged) and WITHOUT
#    calling `docker build` (assert via absence of a build log line)

# 3. Pending proof: a workflow still "in_progress" for the tip SHA → same assertions as #2 (skip,
#    no reset, no build).

# 4. Retry proof: a failed attempt 1 plus successful attempt 2 for one SHA → selected state is
#    completed/success and the script proceeds; reversing the attempts must not change that result.
```

---

### S2 — Pre-deploy safety net: previous-image tag + DB snapshot

**Tags:** `infra` · **Estimate:** 5–7 h

**Goal:** immediately before `git reset --hard FETCH_HEAD`, the box captures everything needed to
undo the deploy: both currently-running images retagged as `:previous`, and a consistent snapshot of
`factory.db`. Every prerequisite is fail-closed: a missing current image, database, or backup tool
stops before the tree changes.

**Do:**

- Hard dependency checks, right after the CI gate passes and before any retag/reset. The binary name
  override is an invocation-only test seam, never an `.env` setting:
  ```bash
  FACTORY_SQLITE_BIN=${FACTORY_SQLITE_BIN:-sqlite3}
  command -v "$FACTORY_SQLITE_BIN" >/dev/null || { echo "[self-update] sqlite3 missing — install it (apt-get install -y sqlite3) — refusing to deploy without a DB snapshot capability"; exit 1; }
  [ -f /opt/factory/data/factory.db ] || { echo "[self-update] factory.db missing — refusing to deploy"; exit 1; }
  for img in minion-factory-agent minion-factory-runner; do
      docker image inspect "${img}:latest" >/dev/null 2>&1 || { echo "[self-update] ${img}:latest missing — refusing to deploy without a complete rollback pair"; exit 1; }
  done
  ```
  This is a **fail-closed** design choice: a self-update tick that can't back up the DB must not touch
  the running system. It only fires once in practice — the human installs `sqlite3` on Netcup as a
  one-time step (§6 step 0), after which every subsequent tick passes silently.
- Retag both current images as `:previous`:
  ```bash
  for img in minion-factory-agent minion-factory-runner; do
      docker tag "${img}:latest" "${img}:previous"
  done
  ```
  (`docker build -t minion-factory-agent .` and the compose `image:` line both resolve to the implicit
  `:latest` tag — confirmed in §1 fact 2 — so `:latest` is always the correct source to retag.) A
  first-ever host is bootstrapped by `setup.sh`/`deploy.sh`, not by the cron updater; allowing only one
  prior image would make the later "rollback succeeded" claim false for the other image.
- Snapshot `factory.db` via SQLite's online backup API (WAL-safe; §1), not a file copy:
  ```bash
  BACKUP_DIR=/opt/factory/data/backups
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="${BACKUP_DIR}/pre-deploy-${LOCAL:0:8}-$(date -u +%Y%m%dT%H%M%SZ).db"
  "$FACTORY_SQLITE_BIN" /opt/factory/data/factory.db ".backup '${BACKUP_FILE}'"
  [ -s "$BACKUP_FILE" ] && [ "$("$FACTORY_SQLITE_BIN" "$BACKUP_FILE" 'PRAGMA quick_check;')" = ok ] || {
      echo "[self-update] DB snapshot verification failed — refusing to deploy"; exit 1;
  }
  # Retention: keep the newest 20, prune the rest (backups only happen on real deploys, which are
  # naturally rate-limited by "new commits exist" — this is a disk-safety floor, not a tuning knob).
  ls -1t "${BACKUP_DIR}"/pre-deploy-*.db 2>/dev/null | tail -n +21 | xargs -r rm -f
  ```
  `/opt/factory/data` is already excluded from `deploy.sh`'s `rsync --delete` (§1 fact confirmed by
  reading `deploy.sh:16-19`), so backups placed there survive a workstation-triggered deploy too.
- These two blocks land **between** the existing `echo "[self-update] $(date -u +%FT%TZ) ..."` line and
  `git reset --hard FETCH_HEAD` — after the gate (S1) has already decided to proceed, before the tree
  changes.

**Files:** `scripts/self-update.sh`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A ---
shellcheck scripts/self-update.sh
bash -n scripts/self-update.sh
grep -n 'FACTORY_SQLITE_BIN' scripts/self-update.sh          # → dependency + test seam present
grep -n "docker tag.*:previous" scripts/self-update.sh       # → both images
grep -n '\.backup' scripts/self-update.sh                    # → sqlite3 online-backup invocation present
grep -n 'PRAGMA quick_check' scripts/self-update.sh          # → snapshot verified before reset
grep -n 'tail -n +21' scripts/self-update.sh                 # → retention prune present

# --- Tier B: needs the box (or a scratch /opt/factory clone with Docker + sqlite3) ---
# Every full-script test first proves LOCAL != REMOTE; otherwise the script exits before S2.
# 0. Missing-tool fail-closed proof (does not rename a system binary):
FACTORY_SQLITE_BIN=definitely-not-installed ./scripts/self-update.sh; echo "exit=$?"
# → non-zero, "refusing to deploy" logged
git -C /opt/factory rev-parse HEAD                            # → UNCHANGED (no reset happened)

# 1. Missing-image fail-closed proof: run in a disposable Docker context/VM with either required
#    :latest tag absent; assert non-zero and unchanged HEAD. Never remove production tags for this test.

# 2. Retag + snapshot proof (push one harmless commit first so LOCAL != REMOTE):
BEFORE_AGENT_ID=$(docker image inspect minion-factory-agent:latest --format '{{.Id}}')
BEFORE_RUNNER_ID=$(docker image inspect minion-factory-runner:latest --format '{{.Id}}')
./scripts/self-update.sh
docker image inspect minion-factory-agent:previous --format '{{.Id}}'    # → equals $BEFORE_AGENT_ID
docker image inspect minion-factory-runner:previous --format '{{.Id}}'   # → equals $BEFORE_RUNNER_ID
LATEST_BACKUP=$(ls -1t /opt/factory/data/backups/pre-deploy-*.db | head -1)
sqlite3 "$LATEST_BACKUP" 'PRAGMA quick_check;'                           # → exactly `ok`
sqlite3 "$LATEST_BACKUP" "SELECT count(*) FROM runs;"                   # → opens the one selected file

# 3. Retention proof in an isolated temp directory; never seed/prune production backups:
RETENTION_FIXTURE=$(mktemp -d)
for i in $(seq 1 25); do touch -d "@$((1700000000+i))" "$RETENTION_FIXTURE/pre-deploy-fake${i}.db"; done
ls -1t "$RETENTION_FIXTURE"/pre-deploy-*.db | tail -n +21 | xargs -r rm -f
find "$RETENTION_FIXTURE" -maxdepth 1 -name 'pre-deploy-*.db' | wc -l   # → 20
find "$RETENTION_FIXTURE" -maxdepth 1 -type f -delete && rmdir "$RETENTION_FIXTURE"
```

---

### S3 — Post-restart health verification + automatic rollback + monitor event

**Tags:** `infra` · **Estimate:** 6–8 h · **Depends on S2** (rollback needs the `:previous` tag)

**Goal:** a failed agent build, runner build, Compose restart, or post-restart health check restores
both `:previous` tags to `:latest`, force-recreates the previous runner, and verifies recovery before
returning non-zero. Every failed deploy surfaces a monitor-intake issue; success is silent.

**Do:**

- Define the monitor helper near the top of the script, before S1 can call it. It first POSTs to the
  existing runner endpoint and, if that endpoint is unavailable, falls back to `gh issue create -R
  NikolasP98/minion-meta --label monitor-intake`. The fallback body includes `source: self-update` and
  the fingerprint, and searches existing issues for that fingerprint before creating one so a broken
  hook cannot turn the 5-minute CI-red retry into issue spam. `FACTORY_MONITOR_URL` may override the
  default only for an ad-hoc test invocation; it is not persisted:
  ```bash
  MONITOR_URL=${FACTORY_MONITOR_URL:-http://127.0.0.1:3211/hooks/monitor}
  file_monitor_event() { # $1=title $2=fingerprint $3=detail
      local secret payload existing body
      secret=$(grep '^FACTORY_SECRET=' .env | cut -d= -f2-) || secret=''
      payload="{\"source\":\"self-update\",\"title\":$(printf '%s' "$1" | sed 's/"/\\"/g;s/^/"/;s/$/"/'),\"fingerprint\":\"$2\",\"detail\":$(printf '%s' "$3" | sed 's/"/\\"/g;s/^/"/;s/$/"/')}"
      if curl -sf --connect-timeout 2 --max-time 10 -X POST "$MONITOR_URL" \
          --config <(printf 'header = "authorization: Bearer %s"\n' "$secret") \
          -H 'content-type: application/json' -d "$payload" >/dev/null; then
          return 0
      fi
      body=$(printf 'Automated runtime-monitor intake.\n\n- source: `self-update`\n- fingerprint: `%s`\n\n```text\n%s\n```\n' "$2" "$3")
      existing=$(gh issue list -R NikolasP98/minion-meta --state all --search "$2 in:body" \
          --limit 1 --json number --jq 'length' 2>/dev/null) || existing=0
      [ "$existing" -gt 0 ] || gh issue create -R NikolasP98/minion-meta \
          --label monitor-intake --title "[monitor:self-update] $1" --body "$body" >/dev/null
  }
  ```
  Titles/details are script-owned fixed strings plus hex SHAs; no untrusted payload is interpolated.
  The authorization header is supplied through Bash process substitution rather than a `curl -H`
  argument so the full factory secret does not appear in the host process list.
  Every call site uses `file_monitor_event ... || echo "[self-update] monitor reporting failed"`, so
  a reporting failure cannot trigger `set -e` before the intended skip/exit. This direct fallback is
  required because `/hooks/monitor` is hosted by the runner that may remain unhealthy.
- Do not let `set -e` bypass rollback. Run each mutation in explicit conditional control flow and
  retain a `failure_reason`: agent-image build failure, runner-image build failure, `compose up`
  failure, or health timeout. Only start the health poll when all three deploy commands succeed.
  The control flow is explicit, not a bare sequence under `set -e`:
  ```bash
  failure_reason=''
  if ! docker build -q -f agent/Dockerfile -t minion-factory-agent .; then
      failure_reason='agent image build failed'
  elif ! docker compose build -q runner; then
      failure_reason='runner image build failed'
  elif ! docker compose up -d runner; then
      failure_reason='docker compose up failed'
  else
      # run the initial health poll; set failure_reason='post-restart health timeout' unless ok=1
      :
  fi
  ```
- Use separate initial and rollback probe URLs so the recovery path is deterministically testable,
  while production defaults remain identical:
  ```bash
  HEALTH_URL=${FACTORY_HEALTH_URL:-http://127.0.0.1:3211/health}
  ROLLBACK_HEALTH_URL=${FACTORY_ROLLBACK_HEALTH_URL:-$HEALTH_URL}
  ok=0
  for _ in $(seq 1 12); do   # each failed attempt is bounded to 2s + 3s sleep = 60s worst case
      curl -sf --connect-timeout 1 --max-time 2 "$HEALTH_URL" >/dev/null 2>&1 && { ok=1; break; }
      sleep 3
  done
  ```
- On `ok=1`: log `"[self-update] deployed ${REMOTE:0:8}, health OK"`, done — no monitor event (success
  is not an alert).
- On any captured failure, require **both** previous tags, retag both back to `:latest`, and run
  `docker compose up -d --force-recreate runner`. Every inspect/tag/up command is guarded so one
  failure cannot exit before reporting. Poll `ROLLBACK_HEALTH_URL` for the same 60-second budget:
  ```bash
  rollback_ready=1
  for img in minion-factory-agent minion-factory-runner; do
      docker image inspect "${img}:previous" >/dev/null 2>&1 || rollback_ready=0
  done
  if [ "$rollback_ready" = 1 ]; then
      for img in minion-factory-agent minion-factory-runner; do
          docker tag "${img}:previous" "${img}:latest" || rollback_ready=0
      done
      [ "$rollback_ready" = 1 ] && docker compose up -d --force-recreate runner || rollback_ready=0
      rb_ok=0
      if [ "$rollback_ready" = 1 ]; then
          for _ in $(seq 1 12); do
              curl -sf --connect-timeout 1 --max-time 2 "$ROLLBACK_HEALTH_URL" >/dev/null 2>&1 && { rb_ok=1; break; }
              sleep 3
          done
      fi
      if [ "$rb_ok" = 1 ]; then
          echo "[self-update] ${REMOTE:0:8} failed (${failure_reason}) — rolled back to ${LOCAL:0:8}, runner healthy again"
          file_monitor_event "self-update rollback: ${REMOTE:0:8} failed, reverted to ${LOCAL:0:8}" \
              "self-update-rollback-${REMOTE}" \
              "Deploy of ${REMOTE:0:8} failed: ${failure_reason}. Restored both images from ${LOCAL:0:8} and confirmed runner health. The tracked tree remains at ${REMOTE:0:8}; a fix must land as a new commit." \
              || echo "[self-update] monitor reporting failed"
      else
          echo "[self-update] ${REMOTE:0:8} failed (${failure_reason}) AND rollback did not recover — MANUAL INTERVENTION REQUIRED"
          file_monitor_event "self-update rollback FAILED: runner unhealthy after reverting to ${LOCAL:0:8}" \
              "self-update-rollback-failed-${REMOTE}" \
              "Deploy of ${REMOTE:0:8} failed: ${failure_reason}. The rollback to ${LOCAL:0:8} did not restore health. SSH in and inspect docker compose logs runner." \
              || echo "[self-update] monitor reporting failed"
      fi
  else
      echo "[self-update] ${REMOTE:0:8} failed (${failure_reason}) — incomplete :previous pair, cannot roll back — MANUAL INTERVENTION REQUIRED"
      file_monitor_event "self-update: ${REMOTE:0:8} failed, incomplete previous-image pair" \
          "self-update-no-previous-${REMOTE}" \
          "Deploy failed: ${failure_reason}. One or both required :previous tags disappeared after preflight. SSH in and inspect Docker state." \
          || echo "[self-update] monitor reporting failed"
  fi
  exit 1
  ```
- **Deliberately not attempted:** automatic `factory.db` restore from the S2 snapshot. The snapshot is
  a human-operated recovery tool (§5) — auto-restoring on every rollback risks discarding legitimate
  writes made in the window between snapshot and failure, for a DB whose schema changes are additive
  and rarely the actual cause of a health-check failure (image/code regressions are far more common
  per the audit's own framing). Restoring is a documented one-line runbook step, not automatic.
- `README.md`: append 3–4 lines to the "Layout" section's `scripts/train.sh` bullet area describing
  `scripts/self-update.sh`'s new behavior — CI gate, previous-tag retention, DB snapshot location, and
  that any build/up/health failure rolls back and files a monitor-intake GitHub issue.

**Files:** `scripts/self-update.sh`, `README.md`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A ---
shellcheck scripts/self-update.sh
bash -n scripts/self-update.sh
grep -n 'file_monitor_event' scripts/self-update.sh
grep -n '/hooks/monitor' scripts/self-update.sh
grep -n 'gh issue create' scripts/self-update.sh       # → runner-down fallback present
grep -n 'FACTORY_ROLLBACK_HEALTH_URL' scripts/self-update.sh
grep -n 'exit 1' scripts/self-update.sh              # → unhealthy paths are non-zero exit
! grep -nE '(^|[;&|[:space:]])jq([[:space:]]|$)' scripts/self-update.sh # → no bare jq process

# --- Tier B: Docker + sqlite3; destructive/missing-tag cases use a disposable Docker context/VM ---
# Every full-script test first proves LOCAL != REMOTE; otherwise the script exits before S3.
# 0. Point FACTORY_MONITOR_URL at a tiny local responder that records POST bodies and returns 201.
#    Do not bind 3211: the real runner owns it. Confirm each failure below records one fingerprint.

# 1. Success path: deploy a harmless green commit and confirm no monitor POST is attempted.
./scripts/self-update.sh; echo "exit=$?"     # → 0, "health OK" logged, no rollback lines

# 2. Health failure + successful rollback, without merging broken production code:
FACTORY_HEALTH_URL=http://127.0.0.1:1/health \
FACTORY_ROLLBACK_HEALTH_URL=http://127.0.0.1:3211/health \
FACTORY_MONITOR_URL=http://127.0.0.1:<stub-port>/hooks/monitor \
./scripts/self-update.sh; echo "exit=$?"
# → exit=1; both :latest IDs equal the IDs recorded before the deploy; rollback health is 200;
#   exactly one self-update-rollback-<sha> payload reached the stub.

# 3. Rollback also fails health (scratch host): set both health URLs to a closed port; assert exit 1,
#    MANUAL INTERVENTION REQUIRED, and one rollback-failed fingerprint at the stub.

# 4. Build failure after the agent tag changes (scratch host): make runner/Dockerfile fail, run against
#    a harmless green scratch SHA, and assert both :latest IDs are restored plus one rollback event.

# 5. Delete one :previous tag only in a disposable Docker context after S2 preflight; assert the
#    incomplete-pair branch exits 1 and the direct GitHub fallback is exercised when the hook is down.
```

**Tier B evidence rule:** state which steps used the production runner, a scratch host, and a monitor
stub. Production proof must not remove image tags or merge intentionally broken code.

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `scripts/self-update.sh` | S1, S2, S3 | Exact-SHA CI gate → complete previous-image pair + verified snapshot → guarded build/up + health poll + rollback + hook/direct monitor reporting |
| `README.md` | S3 | 3–4 line note on the new self-update behavior |

**Zero application code. Zero runner/agent source. Zero `.env`/`.env.example`/`deploy.sh`/
`docker-compose.yml` changes.** No new secret, no new `.env` variable (§ Design ancestors — the
wholesale-rewrite trap this spec deliberately avoids).

## 4. Cross-repo impact

Checked against AGENTS.md's "Cross-Project Impact Zones" table: none of its rows match (no gateway
protocol, no channel extension, no DB schema in `minion_hub`/`minion_site`, no agent-definition format,
no auth, no UI, no paperclip adapter). `minion-factory` is not one of the meta-repo's seven tracked
subprojects at all. The blast radius is one script on one box.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| Netcup production runner uptime | Every deploy adds up to 60s of health verification and a failed deploy adds up to 60s of rollback verification | Bounded and logged; `adoptOrphans()` preserves the surviving in-flight agent containers across each runner restart (memory: `/memory/MINION/sdlc-board-triage-and-phase-gates.md`) |
| In-flight factory runs at deploy time | Surviving `factory-run-*` containers are re-adopted after either restart | Existing `adoptOrphans()` contract; the updater does not kill them |
| Queued work during the 60s health window | The restarted runner calls `enqueue()` at boot and may start queued work with the new agent image before runner health is accepted; a later rollback restores tags but does not replace already-started containers | Explicit residual risk: the approved proposal asks for runner `/health`, not an agent-container canary. Do not claim queued work is unaffected or that this probe validates the agent image |
| Disk usage on `/opt/factory` | New: immediate-previous image layers remain referenced and `backups/` retains 20 verified SQLite snapshots | Slice 0 records actual headroom; retention is bounded by count, and image layers shared by the two tags are not duplicated |
| CI workflow availability | **Hard release dependency.** Missing run, missing workflow, auth error, rate limit, and API outage all prevent a deploy | See ⚠️A1; no status other than exact-SHA `completed/success` reaches reset/build |
| `base.minion-ai.org`, `factory.minion-ai.org`, workstation `cli/factory` | **None.** No route, no port, no public surface touched | Only `scripts/self-update.sh` (host-side cron script) and `README.md` change |
| `minion-meta` monitor-intake issues | Failed deploys normally use the existing runner hook; when the runner is unavailable, the host creates the same labeled issue directly | Direct fallback is deduped by fingerprint search and uses the already-present repo-scoped token; no meta-repo file changes |
| `minion_hub`, `minion_site`, `minion`, `paperclip`, `pixel-agents` | None | No protocol, schema, auth, UI, channel, or adapter surface changes |

### ⚠️ A1 — CI must land first

`minion-factory` has no workflow today. The approved source proposal explicitly says the green-CI
requirement "requires the test-suite proposal," so `.github/workflows/ci.yml` from
`2026-08-17-factory-orchestration-tests` is a prerequisite, not a future enhancement. Activating this
script first would intentionally stop all subsequent self-updates; failing open would contradict the
proposal and recreate the audited unsafe path. The implementer records the workflow file and one
successful exact-SHA run before enabling the new script. This also follows the hard memory constraint
that verification must be real rather than inferred from an absent/never-running workflow
(`/memory/MINION/test-suite-recon-2026-08-10.md`).

## 5. Out of scope (explicit)

- **Implementing the CI test suite/workflow.** That remains
  `2026-08-17-factory-orchestration-tests`'s job, but its `.github/workflows/ci.yml` output is a hard
  prerequisite for activating this spec (⚠️A1).
- **`deploy.sh`** (the workstation-triggered one-shot deploy). The proposal's title and body name
  `self-update.sh` specifically; `deploy.sh` is human-run and human-observed in real time, a materially
  different risk profile. A safety net for `deploy.sh` is a separate, smaller proposal if it turns out
  to be needed.
- **Automatic `factory.db` restore on rollback.** Snapshot only (§S3 "Deliberately not attempted").
- **An agent-container canary or queue pause during the runner health window.** The required probe is
  the existing runner `/health`; already-started sibling containers survive a runner rollback. This
  limitation is recorded in §4 rather than misrepresented as covered.
- **Canary/staging environments** — the proposal's own exclusion; single box, unchanged.
- **The `caddy` service/image.** Not built or retagged by `self-update.sh` today, and this spec adds no
  such step — caddy is pinned to the upstream `caddy:2-alpine` tag, orthogonal to this spec's images.
- **New `.env` variables or crontab changes.** Everything is a script-local constant, per the ancestor
  house rule (§ Design ancestors).
- **Retrying GitHub API calls inside one invocation.** API/auth failure and missing/pending runs have
  distinct logs, but all fail closed and the 5-minute cron is the retry mechanism.
- **Slack/email/other notification channels.** GitHub `monitor-intake` issues remain the only sink;
  the host uses either the existing runner hook or the direct GitHub fallback to reach that same sink.
- **Changing the 5-minute cron cadence** or the 60-second health-poll/rollback-poll budgets into
  operator-tunable values — both are script-local constants with a documented rationale, not settings.

## 6. End-to-end verification

Run after all three slices land on `main` in `minion-factory`. **Step 0 is a one-time box
prerequisite**, not part of the deploy path itself.

```bash
# 0. One-time box prerequisite (Netcup, before this spec's first real deploy):
ssh netcup 'command -v sqlite3 >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y sqlite3; }'

# 0b. Hard release dependency: the required workflow exists and has completed successfully for the
#     commit that will activate the updater. Do not activate S1–S3 before this is true.
gh run list -R NikolasP98/minion-factory --workflow ci.yml --commit <activation-sha> \
  --json attempt,status,conclusion --jq 'sort_by(.attempt) | last'
# → latest attempt has status=completed and conclusion=success
actionlint .github/workflows/ci.yml

# 1. Baseline: confirm today's images and cron cadence (Slice 0's recon, re-run post-merge)
ssh netcup 'crontab -l | grep self-update.sh'
ssh netcup 'docker images minion-factory-runner minion-factory-agent --format "{{.Repository}}:{{.Tag}} {{.ID}}"'

# 2. Record both current image IDs, then deploy a harmless green commit. Prove the exact-SHA gate,
#    safety net, and health path:
ssh netcup 'docker image inspect minion-factory-agent:latest minion-factory-runner:latest --format "{{.RepoTags}} {{.Id}}"'
ssh netcup 'tail -20 /var/log/self-update.log 2>/dev/null || journalctl -u cron --since "-10min" | grep self-update'
ssh netcup 'ls -la /opt/factory/data/backups/'                                   # → new snapshot present
ssh netcup 'docker image inspect minion-factory-agent:previous minion-factory-runner:previous --format "{{.RepoTags}} {{.Id}}"'
# → each :previous ID equals its recorded pre-deploy :latest ID; new :latest may legitimately have
#   the same digest for a docs-only or cache-identical build
ssh netcup 'curl -sf http://127.0.0.1:3211/health'                               # → 200

# 3. Controlled rollback drill on the next harmless green commit, while LOCAL != REMOTE (if cron has
#    already consumed it, use another harmless commit). Invoke once manually with the initial probe
#    forced closed and the rollback probe pointed at the real runner. This exercises real image
#    retag/recreate/recovery without merging intentionally broken code (which CI should reject):
ssh netcup 'cd /opt/factory; out=$(FACTORY_HEALTH_URL=http://127.0.0.1:1/health FACTORY_ROLLBACK_HEALTH_URL=http://127.0.0.1:3211/health ./scripts/self-update.sh 2>&1); rc=$?; printf "%s\n" "$out"; test "$rc" -eq 1'
# → stdout includes the failed reason and "rolled back to <old-sha>, runner healthy again"
ssh netcup 'curl -sf http://127.0.0.1:3211/health'  # → 200 (rolled back and recovered)
ssh netcup 'git -C /opt/factory rev-parse HEAD'     # → tested commit (tree stays put; only images revert)
gh issue list -R NikolasP98/minion-meta --label monitor-intake --limit 5   # → new issue for the rollback, source self-update

# 4. In a scratch repo/workflow, produce a failed exact-SHA run and confirm the S1 gate leaves HEAD and
#    both image IDs unchanged. Production main must not receive an intentionally red commit.
gh run list -R <scratch-repo> --workflow ci.yml --commit <red-sha> --json attempt,status,conclusion
```

**Ship gate:** `.github/workflows/ci.yml` exists and the activation SHA is green; §6 steps 0–3 are
green on production Netcup; S1's red, pending, missing-run, API-error, and rerun-attempt cases are
proven in a scratch repo; S3's build-failure, rollback-failure, and missing-tag cases are proven on a
disposable Docker host; `actionlint` and all Tier A commands are green. Record the actual workflow run
URL, image IDs, backup path/`quick_check`, monitor issue, and which Tier B steps ran on production
versus scratch.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
ADDRESSED: self-update.sh S1 exact-SHA CI gate (:65-98), S2 preflight/:previous retag/DB backup+retention (:111-154), S3 rollback+health poll (:159-191), plus .deploy-marker and /trigger-health running-SHA assertion beyond spec. Cosmetic misses (health-URL test seams, per-class fingerprints, README note) not worth a board slot.
