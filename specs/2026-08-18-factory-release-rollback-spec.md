---
id: 2026-08-18-factory-release-rollback-spec
title: "self-update.sh safety net — CI gate, image retention, DB snapshot, health-verified rollback"
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-release-rollback
verdict: pending
repos: [minion-factory]
tags: [infra]
type: fix
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
(approved, **not yet spec'd**) — the proposal this spec's own DoD calls out by name: *"only deploys
commits whose CI is green (requires the test-suite proposal)."* `minion-factory` has **zero
`.github/` workflows today** (verified: repo tree listing, confirmed independently by the tailnet
spec's own recon). See ⚠️A1.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — all three slices are tagged `infra`. §4b's `infra` lane calls for "workflow lint (actionlint) in
selfTest"; this repo has no `.github/` directory, so — per the precedent already set by the tailnet
spec — the honest analog is `shellcheck` + `bash -n`, both blocking in every slice's DoD. Zero
`.svelte` files ⇒ no UI-governance checks. No slice is tagged `security`: this spec does not change
what the runner exposes (that is the tailnet spec's surface) — it changes what code reaches the
already-existing bind. G3's red-state discipline (write the failing check first) is applied per slice
below via the "before" proof each DoD includes.

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

`scripts/self-update.sh`, current and complete:

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
4. **Neither `sqlite3` nor `jq` is proven present on the host.** Both `train.sh` and `self-update.sh`
   avoid them today (`train.sh` uses `gh ... --jq` off the box's `gh`-bundled jq only where `gh` itself
   pipes through `--jq`; nothing on the host shells out to a bare `jq` or `sqlite3` binary). This spec
   is the first to need an online, WAL-safe SQLite backup and a JSON-safe HTTP POST from the *host*
   process — Slice 1 makes the missing-binary case a **hard, loud, fail-closed skip**, not a silent gap
   (§ Slice 1 "Do").

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
cut -d= -f2-`), and never writes to `.env`.

## 1b. Slice 0 — recon (≤ 30 min, prepend to Slice 1, not counted as a slice)

```bash
# On the box (ssh netcup):
crontab -l | grep self-update.sh                       # confirm */5 cadence, exact invocation
command -v sqlite3 jq gh                                # note which are ALREADY present
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
S0 (recon) ─▶ S1 (CI gate — cheapest check, runs FIRST, before anything destructive)
                   └─▶ S2 (pre-deploy safety net: previous-tag + DB snapshot)
                              └─▶ S3 (build/up unchanged) ─▶ S4-in-S3 (health verify + rollback + monitor event)
```

Numbering matches the proposal's DoD clauses, but **execution order in the script is gate → snapshot →
deploy → verify**, not the DoD's listed order — a red/pending CI gate must skip the destructive steps
entirely (no retag, no backup, no reset --hard), so the working tree and images are simply untouched
and the next tick re-checks the same `REMOTE`. Each slice edits a distinct, easily-reviewable region of
the same file; they are ordered for a single implementer to build bottom-up and self-test incrementally,
but S1 has no dependency on S2/S3 and could ship alone (a no-op gate today, per ⚠️A1). **S3 hard-depends
on S2** (rollback needs the `:previous` tag S2 creates) — they must merge together or not at all.

**All edits stay inside `scripts/self-update.sh` (+ a `README.md` note in S3). Nothing in
`docker-compose.yml`, `deploy.sh`, `.env`, `.env.example`, `runner/`, or `agent/` changes.** The
`/health` and `/hooks/monitor` endpoints and `factory.db`'s WAL mode are consumed as-is; none are
modified.

---

### S1 — CI gate before any deploy step

**Tags:** `infra` · **Estimate:** 4–6 h

**Goal:** a commit whose latest-completed CI run on `main` is red is never deployed; a commit whose CI
hasn't reported yet is retried on the next tick instead of deployed blind; a repo with **no CI
configured at all** (true today) deploys exactly as it does now — the gate is inert, not blocking, in
that case (⚠️A1 explains why that is the correct default, not a loophole).

**Do:**

- Insert the gate between the existing `[ "$LOCAL" = "$REMOTE" ] && exit 0` line and the
  `echo "[self-update] ... -> ..."` line — i.e., **before** `git reset --hard FETCH_HEAD`.
- `export GH_TOKEN="$FACTORY_GH_TOKEN"` (already exported for askpass; `gh` reads the same var — no
  second read of `.env`).
- Query the latest completed run whose head SHA is `$REMOTE`:
  ```bash
  runs_json=$(gh run list -R NikolasP98/minion-factory --branch main --limit 30 \
      --json headSha,conclusion,status 2>/dev/null) || runs_json='[]'
  ```
  Reuses the exact `gh run list --json` shape `agent/reconcile.sh`'s CI-watch already relies on — same
  command, same repo's Actions API, proven live.
- Three-way branch on `runs_json`:
  - **`runs_json == '[]'` or the `gh` call failed (network/API error, not "no run for this SHA")** →
    treat as "no CI configured or API unreachable" → **proceed** (skip the gate, log
    `"[self-update] no CI signal — deploying ungated"`). This is the same branch for "repo has zero
    workflows" and "GitHub API had a blip" — see ⚠️A2 for why that conflation is deliberate.
  - **No entry with `headSha == REMOTE`** → CI hasn't reported for this exact commit yet (workflow
    queued/running, or push just landed) → **skip this tick**, `exit 0` without touching the tree.
    The next cron tick (≤5 min later) re-fetches and re-checks; this is the retry mechanism — no sleep,
    no blocking wait inside one invocation.
  - **Entry found, `status == "completed"`, `conclusion != "success"`** → **skip this tick**, log
    `"[self-update] CI red for ${REMOTE:0:8} (${conclusion}) — not deploying"` and `exit 0`. Also file
    a monitor event (S3's helper, called here too) — but only once per commit: dedupe on
    `fingerprint="self-update-ci-red-${REMOTE:0:8}"`, which the runner's own `/hooks/monitor` dedupe
    logic (`monitor_events` table, 24h TTL) already absorbs, so calling it every 5 minutes for the same
    red commit does not spam — confirmed by reading `app.post('/hooks/monitor', ...)`'s existing
    dedupe-by-fingerprint code, not assumed.
  - **Entry found, `conclusion == "success"`** → **proceed**.
- Multiple workflows on the same SHA (once orchestration-tests adds more than one): treat **any**
  non-success completed conclusion for that SHA as red (`jq` filter: select entries with that
  `headSha`, fail if any has a non-success completed conclusion, wait if any is not yet completed and
  none are failed).

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
# Red-state proof (BEFORE this slice): show today's script deploys regardless of CI —
git -C /opt/factory log -1 --format=%H origin/main   # note SHA S
# (on a scratch clone, pre-slice self-update.sh) — no CI check exists, so nothing to disprove by
# omission; instead prove the NEW gate actually gates, post-slice:

# 1. No CI configured (current real state) — gate must be inert:
gh run list -R NikolasP98/minion-factory --branch main --limit 5   # → empty (confirms today's baseline)
# run the updated script against a scratch clone pointed at a commit with no CI runs → deploys (exit 0,
# reaches the build step) — paste the log line "no CI signal — deploying ungated"

# 2. Simulated red (requires a throwaway repo OR minion-factory once orchestration-tests adds a
#    workflow — do not fabricate a red run on production minion-factory):
#    push a commit to a scratch fork with one failing GitHub Actions workflow, point
#    FACTORY_GH_TOKEN/GH_TOKEN at a PAT with read access, run the gate logic in isolation:
gh run list -R <scratch-fork> --branch main --limit 5 --json headSha,conclusion,status
#    → conclusion "failure" for the tip SHA; running self-update.sh's gate against that SHA must
#    exit 0 WITHOUT calling `git reset --hard` (assert via `git rev-parse HEAD` unchanged) and WITHOUT
#    calling `docker build` (assert via absence of a build log line)

# 3. Pending proof: a workflow still "in_progress" for the tip SHA → same assertions as #2 (skip,
#    no reset, no build) — distinguishes "wait" from "block", the two failure modes this slice must
#    not conflate with each other even though it conflates BOTH with "no CI" in the fail-open branch.
```

---

### S2 — Pre-deploy safety net: previous-image tag + DB snapshot

**Tags:** `infra` · **Estimate:** 5–7 h

**Goal:** immediately before `git reset --hard FETCH_HEAD`, the box captures everything needed to
undo the deploy: the currently-running images retagged as `:previous`, and a consistent snapshot of
`factory.db`. Both are best-effort-impossible-to-skip: if the DB backup tool is missing, the script
**fails loudly and does not deploy** rather than deploying without a safety net (the whole point of
this spec).

**Do:**

- Hard dependency check, right after the CI gate passes and before any retag/reset:
  ```bash
  command -v sqlite3 >/dev/null || { echo "[self-update] sqlite3 missing — install it (apt-get install -y sqlite3) — refusing to deploy without a DB snapshot capability"; exit 1; }
  ```
  This is a **fail-closed** design choice: a self-update tick that can't back up the DB must not touch
  the running system. It only fires once in practice — the human installs `sqlite3` on Netcup as a
  one-time step (§6 step 0), after which every subsequent tick passes silently.
- Retag current images as `:previous`, tolerating a first-ever run where they don't exist yet:
  ```bash
  for img in minion-factory-agent minion-factory-runner; do
      docker image inspect "${img}:latest" >/dev/null 2>&1 && docker tag "${img}:latest" "${img}:previous"
  done
  ```
  (`docker build -t minion-factory-agent .` and the compose `image:` line both resolve to the implicit
  `:latest` tag — confirmed in §1 fact 2 — so `:latest` is always the correct source to retag.)
- Snapshot `factory.db` via SQLite's online backup API (WAL-safe; §1), not a file copy:
  ```bash
  BACKUP_DIR=/opt/factory/data/backups
  mkdir -p "$BACKUP_DIR"
  sqlite3 /opt/factory/data/factory.db ".backup '${BACKUP_DIR}/pre-deploy-${LOCAL:0:8}-$(date -u +%Y%m%dT%H%M%SZ).db'"
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
grep -n "command -v sqlite3" scripts/self-update.sh          # → present, before the first `docker tag`
grep -n "docker tag.*:previous" scripts/self-update.sh       # → both images
grep -n '\.backup' scripts/self-update.sh                    # → sqlite3 online-backup invocation present
grep -n 'tail -n +21' scripts/self-update.sh                 # → retention prune present

# --- Tier B: needs the box (or a scratch /opt/factory clone with Docker + sqlite3) ---
# 0. Missing-tool fail-closed proof:
sudo mv "$(command -v sqlite3)" /tmp/sqlite3.bak             # simulate absence
./scripts/self-update.sh; echo "exit=$?"                     # → non-zero, "refusing to deploy" logged
git -C /opt/factory rev-parse HEAD                            # → UNCHANGED (no reset happened)
sudo mv /tmp/sqlite3.bak "$(dirname "$(command -v sqlite3 || echo /usr/bin/sqlite3)")/sqlite3" # restore

# 1. First-run tolerance (no :previous exists yet):
docker rmi minion-factory-agent:previous minion-factory-runner:previous 2>/dev/null || true
./scripts/self-update.sh                                     # → completes, no error from the retag loop

# 2. Retag + snapshot proof (push one harmless commit first so LOCAL != REMOTE):
BEFORE_RUNNER_ID=$(docker image inspect minion-factory-runner:latest --format '{{.Id}}')
./scripts/self-update.sh
docker image inspect minion-factory-runner:previous --format '{{.Id}}'   # → equals $BEFORE_RUNNER_ID
ls /opt/factory/data/backups/pre-deploy-*.db | tail -1                    # → a fresh file, timestamped now
sqlite3 /opt/factory/data/backups/pre-deploy-*.db "SELECT count(*) FROM runs;"  # → opens cleanly, not corrupt

# 3. Retention proof: seed 25 fake backup files, run the prune line in isolation, assert 20 remain
for i in $(seq 1 25); do touch -d "@$((1700000000+i))" /opt/factory/data/backups/pre-deploy-fake${i}.db; done
ls -1t /opt/factory/data/backups/pre-deploy-*.db | tail -n +21 | xargs -r rm -f
ls /opt/factory/data/backups/pre-deploy-*.db | wc -l          # → 20
rm -f /opt/factory/data/backups/pre-deploy-fake*.db            # cleanup fixture
```

---

### S3 — Post-restart health verification + automatic rollback + monitor event

**Tags:** `infra` · **Estimate:** 6–8 h · **Depends on S2** (rollback needs the `:previous` tag)

**Goal:** after `docker compose up -d runner`, the script proves the new deploy is actually healthy
before declaring victory. On failure, it retags `:previous` back to `:latest`, force-recreates the
runner, re-confirms health, and files exactly one monitor event either way (success is silent —
failure is the only case that pages anyone) so a human learns about it without watching cron logs.

**Do:**

- Replace the final `echo "[self-update] deployed ${REMOTE:0:8}"` line with a health-poll-then-decide
  block:
  ```bash
  HEALTH_URL=${FACTORY_HEALTH_URL:-http://127.0.0.1:3211/health}
  ok=0
  for _ in $(seq 1 12); do   # 12 x 5s = 60s budget — matches the existing setup.sh probe address
      curl -sf "$HEALTH_URL" >/dev/null 2>&1 && { ok=1; break; }
      sleep 5
  done
  ```
- On `ok=1`: log `"[self-update] deployed ${REMOTE:0:8}, health OK"`, done — no monitor event (success
  is not an alert).
- On `ok=0`: define and call a `file_monitor_event()` helper (JSON built with `printf`/parameter
  expansion — **no `jq` dependency on the host**, keeping this slice's tool footprint at `sqlite3` only,
  per §1 fact 4; escape only what the script itself doesn't already control: the two SHAs are
  git-hex, safe as-is):
  ```bash
  file_monitor_event() {   # $1=title $2=fingerprint $3=detail
      local secret; secret=$(grep ^FACTORY_SECRET= .env | cut -d= -f2-)
      curl -sf -X POST http://127.0.0.1:3211/hooks/monitor \
          -H "authorization: Bearer ${secret}" -H 'content-type: application/json' \
          -d "{\"source\":\"self-update\",\"title\":$(printf '%s' "$1" | sed 's/"/\\"/g;s/^/"/;s/$/"/'),\"fingerprint\":\"$2\",\"detail\":$(printf '%s' "$3" | sed 's/"/\\"/g;s/^/"/;s/$/"/')}" \
          >/dev/null 2>&1 || echo "[self-update] monitor event POST failed (best-effort, not fatal)"
  }
  ```
  Then:
  ```bash
  if docker image inspect minion-factory-runner:previous >/dev/null 2>&1; then
      for img in minion-factory-agent minion-factory-runner; do
          docker image inspect "${img}:previous" >/dev/null 2>&1 && docker tag "${img}:previous" "${img}:latest"
      done
      docker compose up -d --force-recreate runner
      rb_ok=0
      for _ in $(seq 1 12); do curl -sf "$HEALTH_URL" >/dev/null 2>&1 && { rb_ok=1; break; }; sleep 5; done
      if [ "$rb_ok" = 1 ]; then
          echo "[self-update] ${REMOTE:0:8} failed health check — rolled back to ${LOCAL:0:8}, runner healthy again"
          file_monitor_event "self-update rollback: ${REMOTE:0:8} unhealthy, reverted to ${LOCAL:0:8}" \
              "self-update-rollback-${REMOTE:0:8}" \
              "Deploy of ${REMOTE:0:8} failed the post-restart /health check within 60s. Rolled back images to the previous tag (${LOCAL:0:8}) and confirmed the runner is healthy again. The tracked source tree is still at ${REMOTE:0:8} -- a human fix must land as a NEW commit; this tick will not retry the same SHA."
      else
          echo "[self-update] ${REMOTE:0:8} failed health check AND rollback did not recover — MANUAL INTERVENTION REQUIRED"
          file_monitor_event "self-update rollback FAILED: runner unhealthy after reverting to ${LOCAL:0:8}" \
              "self-update-rollback-failed-${REMOTE:0:8}" \
              "Deploy of ${REMOTE:0:8} failed health, and after rolling back to ${LOCAL:0:8} the runner is STILL unhealthy. The factory queue is likely stalled. SSH in and inspect: docker compose logs runner."
      fi
  else
      echo "[self-update] ${REMOTE:0:8} failed health check — no :previous image exists, cannot roll back — MANUAL INTERVENTION REQUIRED"
      file_monitor_event "self-update: ${REMOTE:0:8} unhealthy, NO previous image to roll back to" \
          "self-update-no-previous-${REMOTE:0:8}" \
          "First-ever deploy under the new safety net, or :previous was pruned/missing. SSH in and inspect: docker compose logs runner."
  fi
  exit 1   # non-zero on any unhealthy outcome, rolled back or not — cron logs/alerting see the failure
  ```
- **Deliberately not attempted:** automatic `factory.db` restore from the S2 snapshot. The snapshot is
  a human-operated recovery tool (§5) — auto-restoring on every rollback risks discarding legitimate
  writes made in the window between snapshot and failure, for a DB whose schema changes are additive
  and rarely the actual cause of a health-check failure (image/code regressions are far more common
  per the audit's own framing). Restoring is a documented one-line runbook step, not automatic.
- `README.md`: append 3–4 lines to the "Layout" section's `scripts/train.sh` bullet area describing
  `scripts/self-update.sh`'s new behavior — CI gate, previous-tag retention, DB snapshot location, and
  that a failed health check rolls back and files a monitor-intake GitHub issue.

**Files:** `scripts/self-update.sh`, `README.md`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A ---
shellcheck scripts/self-update.sh
bash -n scripts/self-update.sh
grep -n 'file_monitor_event' scripts/self-update.sh
grep -n '/hooks/monitor' scripts/self-update.sh
grep -n 'exit 1' scripts/self-update.sh              # → unhealthy paths are non-zero exit
grep -c 'jq' scripts/self-update.sh                   # → 0 (no new host dependency introduced)

# --- Tier B: needs the box or a scratch /opt/factory clone (Docker + sqlite3 + a stub monitor
#     endpoint so the test doesn't file a real GitHub issue against minion-meta) ---

# 0. Stub the monitor endpoint so test runs don't create real GitHub issues:
python3 -m http.server 3211 --bind 127.0.0.1 &   # or any tiny 200-OK responder on :3211
STUB=$!

# 1. Success path (green/no-op case): deploy a harmless commit, confirm no monitor POST is attempted —
#    grep the stub's access log (or the script's own stdout) for the ABSENCE of a POST to /hooks/monitor.
./scripts/self-update.sh; echo "exit=$?"     # → 0, "health OK" logged, no rollback lines

# 2. Failure + successful rollback — force health to fail for the NEW deploy only:
FACTORY_HEALTH_URL=http://127.0.0.1:1/health ./scripts/self-update.sh; echo "exit=$?"
#    (port 1 refuses every connection — deterministic, no real service touched)
#    → exit=1; log shows "rolled back to ${LOCAL:8}, runner healthy again" IF the real runner (not the
#      stub) is what FACTORY_HEALTH_URL is later pointed back at for the rollback re-poll — since this
#      env override affects BOTH polls identically, this specific invocation instead proves the
#      "no-recovery" branch (#3 below); to prove SUCCESSFUL rollback recovery, use a wrapper that fails
#      the FIRST poll only (e.g. a stub that 500s once then 200s), or verify on the real box by
#      deliberately shipping one broken commit end-to-end (§6 step 3) — do not fake this proof away.
docker image inspect minion-factory-runner:latest --format '{{.Id}}'  # → equals the pre-test image ID
                                                                        #   (rollback restored :latest)

# 3. Failure + rollback also fails to recover (both polls fail):
FACTORY_HEALTH_URL=http://127.0.0.1:1/health ./scripts/self-update.sh; echo "exit=$?"
#    → exit=1; log shows "MANUAL INTERVENTION REQUIRED"; kill the stub, confirm a monitor event attempt
#    was made (curl to :3211/hooks/monitor observed in the stub's access log even though it 404s)

# 4. No-previous-image failure:
docker rmi minion-factory-runner:previous minion-factory-agent:previous 2>/dev/null || true
FACTORY_HEALTH_URL=http://127.0.0.1:1/health ./scripts/self-update.sh; echo "exit=$?"
#    → exit=1; log shows "no :previous image exists, cannot roll back"

kill $STUB
```

**⚠️ Tier B honesty note (mirrors the tailnet spec's ⚠️A1):** step 2 above is written out fully because
a health-poll-once-fails-then-recovers scenario is genuinely awkward to fake with a single static stub
server, and glossing over that would make the DoD look more automated than it is. **State plainly in the
PR which of steps 0–4 were run against a real runner container vs. a stub**, and if step 2's true
rollback-recovers path was only proven via the real end-to-end break-a-commit test in §6 step 3 rather
than in isolation, say so.

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `scripts/self-update.sh` | S1, S2, S3 | CI gate (new block, before reset) → retag+snapshot (new block, before reset) → health poll + rollback + monitor event (replaces the final echo) |
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
| Netcup production runner uptime | **Every future auto-deploy now costs an extra ~0–60s** (health poll) and, on failure, a further ~0–60s rollback poll — previously instantaneous (`up -d` returned immediately, health unverified) | Bounded and logged; queued/running work is unaffected either way (`adoptOrphans()` handles restarts regardless of who triggers them) |
| In-flight factory runs at deploy time | Unchanged — `docker compose up -d --force-recreate runner` (rollback path) recreates the same container `adoptOrphans()` already knows how to recover from on any restart | No new risk; this is the existing restart-recovery contract, exercised more often (up to 2x per tick: deploy + possible rollback) |
| Disk usage on `/opt/factory` | New: `:previous` image tags (≈ same size as `:latest`, transient — overwritten every deploy, not cumulative) + `backups/` (bounded to 20 files by the S2 prune) | Slice 0's `df -h /opt` recon step surfaces current headroom before this ships; 20 sqlite snapshots of a queue+chat DB are expected to be small (KB–low-MB range for this workload) |
| **The CI gate itself, until `2026-08-17-factory-orchestration-tests` ships** | **Inert.** `minion-factory` has zero `.github/workflows` today — S1's gate always takes the "no CI signal — deploying ungated" branch, i.e., current unsafe-by-default deploy behavior is UNCHANGED until that sibling proposal adds workflows | See ⚠️A1. This is not a bug in this spec — it is the proposal's own stated dependency, made forward-compatible so no further edit is needed here once CI lands |
| `base.minion-ai.org`, `factory.minion-ai.org`, workstation `cli/factory` | **None.** No route, no port, no public surface touched | Only `scripts/self-update.sh` (host-side cron script) and `README.md` change |
| `minion-meta`, `minion_hub`, `minion_site`, `minion`, `paperclip`, `pixel-agents` | **None** — no file in any of them references `self-update.sh` or is affected by its behavior | This spec's only meta-repo interaction is the (unchanged) `/hooks/monitor` → GitHub issue on `minion-meta`, which already exists and already accepts `source`-tagged events |

### ⚠️ A1 — the CI gate is real code with no CI to gate on, today

S1 ships a fully functional gate; `minion-factory` simply doesn't have a workflow yet for it to read.
This is *exactly* what the proposal's DoD sentence — "requires the test-suite proposal" — predicts, and
the design in §S1 is written so that landing `2026-08-17-factory-orchestration-tests` later requires
**zero changes to this spec's code**: the moment `gh run list` starts returning entries for `main`,
the gate activates on its own. Do not treat S1's DoD "no CI configured → deploy" branch as a loophole to
close in review — closing it (e.g., failing closed when no workflows exist) would permanently brick
self-update on every repo that hasn't added CI yet, which is worse than today's status quo.

### ⚠️ A2 — "no CI" and "API unreachable" are deliberately the same branch

A `gh run list` failure (rate-limited, GitHub outage, token issue) fails open to "deploy anyway,"
identical to "this repo has no workflows." An alternative fail-closed design (treat any `gh` error as
"CI must be red, don't deploy") was considered and rejected: it would turn a transient GitHub API blip
into a **hard stop on all future deploys** (the earlier branch in S1 already lets a genuinely red commit
skip forever until a human intervenes; making API errors do the same doubles the ways self-update goes
silent). The two failure modes are conflated on purpose; a future spec that wants to distinguish them
needs its own monitor-event alert for "gh unreachable N ticks in a row," which is out of scope here
(§5).

## 5. Out of scope (explicit)

- **Adding CI workflows to `minion-factory`.** That is `2026-08-17-factory-orchestration-tests`'s job
  (unspec'd as of this writing). This spec only makes `self-update.sh` *consume* CI status once it
  exists (⚠️A1).
- **`deploy.sh`** (the workstation-triggered one-shot deploy). The proposal's title and body name
  `self-update.sh` specifically; `deploy.sh` is human-run and human-observed in real time, a materially
  different risk profile. A safety net for `deploy.sh` is a separate, smaller proposal if it turns out
  to be needed.
- **Automatic `factory.db` restore on rollback.** Snapshot only (§S3 "Deliberately not attempted").
- **Canary/staging environments** — the proposal's own exclusion; single box, unchanged.
- **The `caddy` service/image.** Not built or retagged by `self-update.sh` today, and this spec adds no
  such step — caddy is pinned to the upstream `caddy:2-alpine` tag, orthogonal to this spec's images.
- **New `.env` variables or crontab changes.** Everything is a script-local constant, per the ancestor
  house rule (§ Design ancestors).
- **Distinguishing "GitHub API unreachable" from "no CI configured"** as separate monitor-event classes
  (⚠️A2) — both fail open identically in this spec.
- **Slack/email/other notification channels.** The existing `/hooks/monitor` → GitHub issue path is the
  only sink used, matching every other automated proposal source in the pipeline (CI-watch, auto-fix
  escalation).
- **Changing the 5-minute cron cadence** or the 60-second health-poll/rollback-poll budgets into
  operator-tunable values — both are script-local constants with a documented rationale, not settings.

## 6. End-to-end verification

Run after all three slices land on `main` in `minion-factory`. **Step 0 is a one-time box
prerequisite**, not part of the deploy path itself.

```bash
# 0. One-time box prerequisite (Netcup, before this spec's first real deploy):
ssh netcup 'command -v sqlite3 || sudo apt-get update -qq && sudo apt-get install -y sqlite3'

# 1. Baseline: confirm today's images and cron cadence (Slice 0's recon, re-run post-merge)
ssh netcup 'crontab -l | grep self-update.sh'
ssh netcup 'docker images minion-factory-runner minion-factory-agent --format "{{.Repository}}:{{.Tag}} {{.ID}}"'

# 2. Harmless commit (docs-only, e.g. this spec's own README note if not already merged) —
#    prove the gate is inert (no CI yet), the safety net fires, and health passes:
ssh netcup 'tail -20 /var/log/self-update.log 2>/dev/null || journalctl -u cron --since "-10min" | grep self-update'
ssh netcup 'ls -la /opt/factory/data/backups/'                                   # → new snapshot present
ssh netcup 'docker images minion-factory-runner --format "{{.Tag}} {{.ID}}"'     # → :latest AND :previous, different digests than before the push
ssh netcup 'curl -sf http://127.0.0.1:3211/health'                               # → 200

# 3. Deliberately broken commit — the real proof the DoD's rollback promise holds. Push a change that
#    makes the runner fail to start cleanly (e.g. a syntax error in runner/src/index.ts) to a SCRATCH
#    branch first, verify the failure mode locally with `docker compose up runner` (foreground, watch
#    it crash-loop or exit non-zero), THEN merge to main and let self-update.sh pick it up:
ssh netcup 'tail -40 /var/log/self-update.log'    # → "failed health check — rolled back to <old-sha>, runner healthy again"
ssh netcup 'curl -sf http://127.0.0.1:3211/health'  # → 200 (rolled back and recovered)
ssh netcup 'git -C /opt/factory rev-parse HEAD'     # → the BROKEN commit (tree stays put; only the running image reverted)
gh issue list -R NikolasP98/minion-meta --label monitor-intake --limit 5   # → new issue for the rollback, source self-update
# revert the broken commit on a follow-up push — confirm the NEXT tick deploys the fix normally and
# LOCAL == REMOTE afterward (no infinite retry loop on the old broken SHA):
ssh netcup 'git -C /opt/factory rev-parse HEAD'     # → the FIX commit, matches origin/main

# 4. (Only once 2026-08-17-factory-orchestration-tests ships and minion-factory has a real workflow)
#    push a commit whose CI run fails — confirm self-update never deploys it:
gh run list -R NikolasP98/minion-factory --branch main --limit 3 --json headSha,conclusion
ssh netcup 'git -C /opt/factory rev-parse HEAD'     # → still the LAST GREEN commit, not the red one
ssh netcup 'tail -5 /var/log/self-update.log'       # → "CI red for <sha> ... not deploying", repeating harmlessly every 5min
```

**Ship gate:** §6 steps 0–3 green on production Netcup (step 3's broken-commit drill is the one
non-negotiable proof — a rollback feature that has never been watched to actually roll back a real
broken deploy is an unverified claim); step 4 deferred and explicitly logged as "pending
`2026-08-17-factory-orchestration-tests`" rather than silently skipped; all three slices' Tier A
commands green; ⚠️A1 and ⚠️A2 acknowledged in the PR description in the implementer's own words, not
copy-pasted from this spec.
