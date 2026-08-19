---
id: 2026-08-17-factory-agent-cli-unpinned-spec
title: "minion-factory agent image — pin the harness toolchain so the JSON parser contract stops floating"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-factory-agent-cli-unpinned
verdict: approved
repos: [minion-factory, minion-meta]
tags: [deps, infra]
type: fix
---

# Pin the agent image's harness toolchain

**Owner surface:** implementation is in `minion-factory` (`NikolasP98/minion-factory`, private, default
branch `main`) — `agent/Dockerfile`, the five `agent/*.sh` scripts, `scripts/`, `README.md`, and
`playbooks/minion-factory.md`. The only `minion-meta` artifact is the separate runner-image follow-up
proposal required by the open-items ledger (§5); it is coordination work, not part of S1 or S2.

**Design ancestors:**
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md) §"Image"
— *"Image: `node:22-bookworm-slim` + git + gh + ripgrep + bun + `@anthropic-ai/claude-code`"* — the
image this spec pins, and the source of the no-docker-socket constraint that shapes the DoD tiers (⚠️ A1).
[`2026-08-13-minion-factory-staged-harness-spec`](2026-08-13-minion-factory-staged-harness-spec.md) —
shipped the per-stage claude/codex picker and the provider-fallback logic that reads `.subtype`; that
logic is the *consumer* of the contract this spec protects. Neither ancestor changes.
[`2026-08-17-factory-compose-tailnet-hardcode-spec`](2026-08-17-factory-compose-tailnet-hardcode-spec.md)
— same repo, same box, disjoint files (compose/setup/deploy port binds). The two can land in either order;
the only shared file is `README.md`, in different sections.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `deps` (+ `infra` on S2). §4b's `deps` lane calls for a *"lockfile-consistency gate"*
and a *"changelog/breaking-change scan"*: there is no lockfile for global npm installs, so the honest analog
is the build-time version assertion (S1) and the changelog-scan step baked into the bump procedure (S2).
`infra` calls for workflow lint; **this repo has no `.github/` directory at all** (verified: the root tree is
`.env.example .gitignore Caddyfile README.md agent cli deploy.sh deploy docker-compose.yml playbooks
repos.example.json runner scripts setup.sh`), so the analog is `bash -n` + `shellcheck` + a `docker build`,
and all three are in the DoDs. Zero `.svelte` files ⇒ **no UI-governance checks**.

---

## 0. Product

From the approved proposal `2026-08-17-factory-agent-cli-unpinned`, verbatim:

> ## Problem
>
> agent/Dockerfile:17 npm install -g without versions; the pipeline parses --output-format json fields
> (.subtype/.num_turns) from whatever ships that day.
>
> ## Definition of done
>
> Exact versions pinned; deliberate bump procedure noted; two builds on different days produce identical
> CLI versions.
>
> ## Out of scope
>
> Auto-update tooling.

## 1. What the repo actually says today

`minion-factory` is **not checked out in this workspace** (the meta-repo `.gitignore` excludes subprojects,
and this is a different repo). Every line quoted below was read from `main` via
`gh api repos/NikolasP98/minion-factory/contents/<path>` during spec authoring; the repo's `pushed_at` at
that moment was `2026-08-17T13:37:55Z`. **Re-read each file before editing** — line numbers are as-of that
read, not a guarantee (Slice 0).

`agent/Dockerfile:15-17` — the whole bug:

```dockerfile
# bun (hub/site/base repos) + both harnesses: claude code + codex CLI
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash \
	&& npm install -g @anthropic-ai/claude-code @openai/codex pnpm
```

Four unpinned installs, not two: `bun` (the installer defaults to the newest GitHub release when no tag
argument is given — verified by reading `https://bun.sh/install`, which branches on `$1` at its line 132),
plus `@anthropic-ai/claude-code`, `@openai/codex` and `pnpm` at whatever `latest` resolves to.

**The parser contract this floats under.** Every consumer, found by grep over `agent/` — this is the exact
list the bump procedure has to protect:

| Site | Reads | Consequence if the field moves |
|---|---|---|
| `agent/run.sh:44`, `run.sh:189`, `spec.sh:24` | `.subtype == "error_max_turns"` | provider-fallback fires on a turn-budget exhaustion (wrong harness, wasted quota), **and** `run.sh:190` discards a salvageable attempt's work — the exact regression the `pilot e1b4a63d` comment says cost 14 files |
| `run.sh:61`, `chat.sh:55`, `spec.sh:45`, `reconcile.sh:144`, `unstick.sh:101` | `.is_error` | a failed agent turn reads as success; `run.sh`'s no-op gate is the only thing left standing between that and a green PR |
| `run.sh:62`, `chat.sh:54`, `reconcile.sh:111`, `unstick.sh:107` | `.result` | `chat.sh:54` writes `/out/reply.md` from it — an empty reply is what the user sees in the request-agent chat |
| `run.sh:65` | `.num_turns`, `.total_cost_usd` | cosmetic (logs `?`) — listed for completeness |
| `chat.sh:46-50` | `--session-id <uuid>` / `--resume <uuid>` accepting a **caller-supplied** UUID | chat session continuity dies silently; every turn starts cold |
| `run.sh:55-59`, `chat.sh:39-45`, `spec.sh:41-43`, `reconcile.sh:110-112`, `unstick.sh:99` | flags `-p --dangerously-skip-permissions --model --max-turns --output-format --append-system-prompt` | a renamed flag is a hard exit, i.e. the loud failure mode; the quiet ones are above |
| `run.sh:72-74`, `spec.sh:52-54`, `reconcile.sh:157`, `unstick.sh:103` | `codex exec --dangerously-bypass-approvals-and-sandbox`, `-m`, `-c model_reasoning_effort="..."` | no JSON is parsed from codex (log tail only) — the contract is flag acceptance and exit code |

Note the failure shape: only the flag renames are loud. `.subtype` and `.is_error` moving are **silent** —
they fail open into "keep going", which is why the proposal's title says *silently*.

Five facts found while reading that change the work:

1. **Three call sites build this image, none of them passes a build argument.** `setup.sh:34`,
   `deploy.sh:69` and `scripts/self-update.sh:23` all run a bare `docker build ... -f agent/Dockerfile .`.
   `self-update.sh` is the unattended one — box cron, `set -euo pipefail`. Any pin mechanism that lives
   outside the Dockerfile and needs a `--build-arg` is therefore inert on at least the cron path. This
   decides §2's design.
2. **Docker layer cache means the box and a fresh host already disagree today.** The `npm install -g` layer
   is only rebuilt when an earlier layer changes, so `/opt/factory`'s image may be carrying a months-old
   `claude` while `./setup.sh` on a new host installs today's. Nobody can currently answer "which CLI
   produced this run?" from the run log — there is no version line in any of the five scripts.
3. **`latest` is not `stable` for `@anthropic-ai/claude-code`.** As of 2026-08-17 the dist-tags read
   `stable: 2.1.224`, `latest: 2.1.233` (`npm view @anthropic-ai/claude-code dist-tags --json`). A bare
   `npm install -g` takes `latest` — the pipeline has been riding the bleeding-edge tag by default.
   **Treat those two numbers as as-of-read, not as the values to type in** (Slice 0 re-reads them).
4. **`pnpm@latest` is a major ahead of what a registered repo declares.** `npm view pnpm version` → `11.22.0`;
   `minion-meta`'s root `package.json:7` declares `"packageManager": "pnpm@10.15.0"` with
   `engines.pnpm: ">=10.0.0"`. The global `pnpm` in this image is what runs each repo's `FACTORY_SETUP` and
   `selfTest`, so an unpinned rebuild can hand a pnpm-10 workspace a pnpm-11 binary without anyone choosing it.
   This is the single strongest argument for §2's "pin what the box runs today, not what npm serves today".
5. **The runner image has the same disease in a milder form** — `runner/Dockerfile:9` runs
   `npm install --omit=dev` while a `runner/package-lock.json` is committed right next to it (`npm ci` is the
   command that honours it), and `runner/Dockerfile:15` is `npx tsx`. Same class, different image, **not this
   proposal's scope** — §5 says what to do with it instead of absorbing it.

## 1b. Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

Nothing here changes a file. Its output is the pin values S1 types in.

```bash
git clone https://github.com/NikolasP98/minion-factory /tmp/factory && cd /tmp/factory
sed -n '1,29p' agent/Dockerfile                      # confirm the line numbers in §1
grep -rn 'docker build' setup.sh deploy.sh scripts/  # → expect exactly 3, none with --build-arg
grep -rn 'jq -r' agent/*.sh                          # → re-derive the §1 parser table; add any new reader

# THE pin values — what production is actually running right now (fact 2):
ssh netcup 'docker run --rm --entrypoint bash minion-factory-agent -lc \
  "npm ls -g --depth 0 --json; bun --version; node --version"'

# What an unpinned build would install instead (this is the drift, measured):
npm view @anthropic-ai/claude-code dist-tags --json && npm view @openai/codex version && npm view pnpm version
curl -s https://api.github.com/repos/oven-sh/bun/releases/latest | jq -r .tag_name

# Red-state proof — build the CURRENT Dockerfile with a cold cache and diff against the box:
docker build --no-cache --pull -t fx-drift-probe -f agent/Dockerfile .
docker run --rm --entrypoint bash fx-drift-probe -lc 'npm ls -g --depth 0 --json | jq -r ".dependencies|to_entries[]|\"\(.key)=\(.value.version)\""; echo bun=$(bun --version)'
#   ^ paste this next to the box output in the PR. If ANY line differs, the proposal's premise is
#     demonstrated empirically rather than argued. If none differ, say so — it is still a real
#     time-bomb (fact 3), but the PR should not claim a drift it did not observe.

# Corepack: does the base image ship/enable it? (decides whether `packageManager` overrides the global pnpm)
docker run --rm node:22-bookworm-slim bash -lc 'corepack --version || echo "no corepack"; corepack enable 2>&1 | head -2'
```

## 2. Approach — two slices

```
S0 (recon) ─▶ S1 (pin the four installs; the build proves its own versions)
                      └─▶ S2 (the bump procedure + the parser-contract check that makes a bump safe)
```

S1 satisfies the proposal's first and third DoD clauses; S2 satisfies the second. **S1 is a safe resting
state on its own** (it strictly removes drift and changes no behaviour — see its no-op proof), so unlike its
sibling spec the two need not merge together. Both are required to close the proposal. Prefer one PR; if
they split, S1 first.

**The three real decisions, made here rather than left to the implementer:**

**D1 — the pins live as `ARG` defaults inside `agent/Dockerfile`, not in a versions file or a `--build-arg`.**
Three call sites build this image and none passes an argument (§1 fact 1); the cron path is unattended. An
`ARG NAME=value` default is read by every one of them with zero call-site edits, stays overridable
(`docker build --build-arg CLAUDE_CODE_VERSION=... `) for the bump script's dry runs, and keeps the pin in the
same diff as the code that consumes it. Rejected: `agent/versions.env` + `--build-arg` at each site (three
edits, and `self-update.sh` silently drifts the day someone adds a fourth build site); rejected: a lockfile
(npm has no lockfile for `-g` installs).

**D2 — pin to the versions the production box is running today, not to `latest`, and not to `stable`.**
The pin must be a *provable no-op* on production: the box has been running some specific set for weeks and
the pipeline works with it. Pinning to today's registry `latest` would silently upgrade production inside a
"pin the versions" PR — and per fact 4 could hand a pnpm-10 workspace pnpm 11. So S1 freezes reality. A
subsequent, separately reviewed PR may use S2's procedure for the first deliberate bump; S1 and S2 themselves
must not change the selected harness versions. **Fallback if the box values cannot be
read** (no SSH, image rebuilt in the meantime): pin to `@anthropic-ai/claude-code@<stable dist-tag>`,
`pnpm@10.x` matching `minion-meta`'s `packageManager`, and codex/bun at their current `latest`; in that case
S1 is a behaviour change and **must not be deployed before S2's contract check is green** — say which path
was taken, in the PR body.

**D3 — the build asserts what it actually installed, and records it in the image.** A pinned `ARG` is a
claim; `npm ls -g` after the install is evidence. The build fails if they disagree, and writes
`/etc/factory-toolchain.json` from the resolved values so the manifest can never drift from the binaries. That
file is what S2's DoD diffs across two builds, and what the run logs echo.

---

### S1 — Pin the four installs, and make the build prove it

**Tags:** `deps` · **Estimate:** 4–6 h

**Goal:** `docker build -f agent/Dockerfile .` installs exactly the versions named in the file, on any host,
on any day; the build fails loudly rather than quietly installing something else; the image can be
interrogated for what it holds.

**Do:**

- Declare four `ARG`s **immediately above** the existing `RUN` at `agent/Dockerfile:16` — not at the top of
  the file. An `ARG` invalidates the cache from its declaration point down, so placing them here keeps the
  apt and gh-CLI layers cached and makes a version bump rebuild exactly one layer:
  `ARG CLAUDE_CODE_VERSION=`, `ARG CODEX_VERSION=`, `ARG PNPM_VERSION=`, `ARG BUN_VERSION=` — values from
  Slice 0 per D2. Keep a one-line comment above them pointing at the bump procedure (S2 writes it) and saying
  **why** they exist: the pipeline parses this CLI's JSON envelope.
- Pin the npm installs: `npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"
  "@openai/codex@${CODEX_VERSION}" "pnpm@${PNPM_VERSION}"`. Exact versions only — no `^`, no `~`, no dist-tag
  names; a range pin is the same bug with more steps.
- Pin bun: the installer takes a release tag as `$1`, so
  `curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"`. **Verify this
  invocation in the build before believing it** — the argument is passed through a pipe to `bash -s`, and the
  installer errors on a bad tag rather than falling back to latest (which is the behaviour we want, but
  confirm rather than assume).
- Add an assertion + manifest step as its own `RUN`, before `USER agent`:
  read `npm ls -g --depth 0 --json` and `bun --version`, compare each against its `ARG`, `exit 1` with the
  offending name on any mismatch, and write the resolved four to `/etc/factory-toolchain.json` (world-readable;
  it contains no secret). Derive the manifest from the *resolved* values, never by echoing the `ARG`s — an
  echo cannot detect the mismatch it is supposed to prove absent. Use `npm ls -g` rather than `claude --version`
  for the npm packages: `--version` output formatting is itself an upstream contract this spec should not add
  a dependency on.
- Do not touch `USER`/`WORKDIR`/`COPY`/`ENTRYPOINT`, the apt layers, the gh-CLI block, the base image tag, or
  any file outside `agent/Dockerfile`.

**Files:** `agent/Dockerfile`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A: no Docker required (an agent container can run this; ⚠️ A1) ---
grep -c 'ARG \(CLAUDE_CODE\|CODEX\|PNPM\|BUN\)_VERSION=' agent/Dockerfile          # → 4
grep -cE 'ARG (CLAUDE_CODE|CODEX|PNPM|BUN)_VERSION=[0-9]' agent/Dockerfile         # → 4 (no empty defaults)
grep -E 'npm install -g' agent/Dockerfile | grep -cE '@\^|@~|@latest|@stable'      # → 0 (no ranges/tags)
grep -c 'bun-v\${BUN_VERSION}' agent/Dockerfile                                    # → 1
grep -c 'factory-toolchain.json' agent/Dockerfile                                  # → 1

# --- Tier B: needs a Docker host — the proposal's third DoD clause ---
docker build --no-cache --pull -t fx-a -f agent/Dockerfile .   # → succeeds
docker build --no-cache --pull -t fx-b -f agent/Dockerfile .   # → succeeds
docker run --rm --entrypoint cat fx-a /etc/factory-toolchain.json > /tmp/a.json
docker run --rm --entrypoint cat fx-b /etc/factory-toolchain.json > /tmp/b.json
diff /tmp/a.json /tmp/b.json          # → NO DIFF ← "two builds produce identical CLI versions"
#   --no-cache --pull is the point: it removes the layer cache as the reason for sameness, which is the
#   falsifiable proxy for "different days". A literal two-day rerun is a calendar wait, not a check —
#   if the PR sits long enough, rerun it and paste both dates (⚠️ A3 bounds what this proves).

# Overrides are exact, and an unavailable pin fails the build rather than falling back:
docker build --no-cache --build-arg PNPM_VERSION=10.15.0 -t fx-c -f agent/Dockerfile . \
  && docker run --rm --entrypoint bash fx-c -lc 'pnpm --version'      # → 10.15.0, manifest agrees
docker build --no-cache --build-arg CODEX_VERSION=0.0.0-nope -f agent/Dockerfile . ; echo "exit=$?"
#   → non-zero: npm refuses the version OR the assertion catches it. A build that SUCCEEDS here is a bug.

# --- No-op proof on production (D2): the pin must not change what the box runs ---
ssh netcup 'docker run --rm --entrypoint bash minion-factory-agent -lc "npm ls -g --depth 0 --json"' \
  | jq -S '.dependencies|to_entries|map({(.key):.value.version})|add' > /tmp/box.before.json
jq -S '{"@anthropic-ai/claude-code":.claudeCode,"@openai/codex":.codex,"pnpm":.pnpm}' /tmp/a.json \
  | diff - /tmp/box.before.json      # → no diff, OR the PR states the D2-fallback path was taken and why
```

---

### S2 — The deliberate bump procedure, and the check that makes a bump safe

**Tags:** `deps`, `infra` · **Estimate:** 5–8 h

**Goal:** bumping the toolchain is a documented, repeatable act with a pass/fail gate over the §1 parser
table — not an unnoticed side effect of a rebuild. Every run log records which CLI produced it.

**Do:**

- **`scripts/check-agent-contract.sh` (new).** Takes an image tag (default `minion-factory-agent`), runs the
  probes in that image, exits
  non-zero on the first violation, prints one line per assertion. Three tiers, each skippable by flag and
  each announcing loudly when skipped — a skipped tier must never read as a pass:
  - *manifest*: `/etc/factory-toolchain.json` exists and matches the `ARG` defaults in `agent/Dockerfile`
    (catches "image is stale vs the file").
  - *flag surface, no credential needed*: `claude --help` contains each of `-p`,
    `--dangerously-skip-permissions`, `--model`, `--max-turns`, `--output-format`, `--append-system-prompt`,
    `--resume`, `--session-id`; `codex exec --help` contains `--dangerously-bypass-approvals-and-sandbox`,
    `-m`, `-c`. Source the list from §1's table; a missing flag is a hard fail.
  - *live envelope, needs a credential (⚠️ A2)*: forward exactly one supported host credential
    (`CLAUDE_CODE_OAUTH_TOKEN` preferred, otherwise `ANTHROPIC_API_KEY`) into the probe container without
    printing it, then run one `claude -p 'reply with the single word ok'
    --dangerously-skip-permissions --model haiku --max-turns 1 --output-format json` turn, asserting with
    `jq -e` that `.is_error` is a boolean, `.subtype` a string, `.result` a string, `.num_turns` a number and
    `.total_cost_usd` a number. Then a `--session-id <fresh-uuid>` turn followed by a `--resume <same-uuid>`
    turn, asserting the second exits 0 — that is `chat.sh`'s contract and nothing else covers it.
  - *best-effort probe, reported not enforced*: attempt to provoke `.subtype == "error_max_turns"` (a prompt
    needing several tool calls, run at `--max-turns 1`) and print what came back. **Do not fail the script on
    it** — it is not reliably forceable, and a flaky gate gets disabled. Print it loudly enough that the human
    running a bump reads it, and say in the README that the `subtype` enum is a changelog-read item, not an
    automated one.
- **`scripts/bump-agent-toolchain.sh` (new).** Read-only by default: prints, for each npm package, the pinned
  value from `agent/Dockerfile` vs every available `stable`/`latest` dist-tag (printing `unavailable` when a
  tag is absent), and prints the Bun pin vs GitHub's latest Bun release tag. For the three npm packages,
  derive the repository/release URL from `npm view <pkg> repository.url`; for Bun, derive it from the
  `html_url` returned by the GitHub latest-release response already used to obtain the tag. Do not hardcode
  project URLs.
  `--set <name>=<version>` rewrites exactly that one `ARG` default and nothing else, **after verifying the
  version exists on the registry** (⚠️ A4), then prints the remaining steps rather than doing them. It must
  never build, never deploy, never commit, never touch `.env`.
- **One version line per agent script.** At the top of `run.sh`, `spec.sh`, `chat.sh`, `reconcile.sh` and
  `unstick.sh`, echo the toolchain manifest to stdout (the runner pipes container stdout into
  `/opt/factory/runs/<id>/run.log`), guarded so a missing file cannot abort the run:
  `cat /etc/factory-toolchain.json 2>/dev/null | tr -d '\n'` behind a `[factory] toolchain:` prefix. This is
  the answer to §1 fact 2 — "which CLI produced this run?" becomes greppable. **Change nothing else in these
  files**; they are the parser and they are shipped, working code. In particular `chat.sh` must keep writing
  only `/out/reply.md` for the user-visible reply — the echo goes to stdout, not to that file.
- **`README.md` — a short "Agent toolchain" section** under Layout: the four pins live in `agent/Dockerfile`;
  they exist because the pipeline parses the CLI JSON envelope; the bump procedure is
  `scripts/bump-agent-toolchain.sh` → `--set` → rebuild → `scripts/check-agent-contract.sh` → read the
  upstream changelog for `subtype`/flag changes → PR → deploy; **and the standing obligation to check monthly**
  (⚠️ A4 — a pin that is never bumped trades silent breakage for silent staleness, which is a worse trade if
  nobody writes it down). Also name the failure signature from ⚠️ A5 so the next person recognises it.
- **`playbooks/minion-factory.md` — one bullet**, next to the existing *"never change those contracts casually"*
  line: the agent toolchain versions in `agent/Dockerfile` are pinned deliberately; changing them requires the
  bump procedure, never an incidental edit.

**Files:** `scripts/check-agent-contract.sh` (new), `scripts/bump-agent-toolchain.sh` (new), `agent/run.sh`,
`agent/spec.sh`, `agent/chat.sh`, `agent/reconcile.sh`, `agent/unstick.sh`, `README.md`,
`playbooks/minion-factory.md`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A: no Docker, no credential ---
shellcheck scripts/check-agent-contract.sh scripts/bump-agent-toolchain.sh    # → clean (blocking)
bash -n agent/*.sh scripts/*.sh                                               # → clean
test -x scripts/check-agent-contract.sh && test -x scripts/bump-agent-toolchain.sh   # → mode 755, both
grep -c 'factory-toolchain' agent/run.sh agent/spec.sh agent/chat.sh agent/reconcile.sh agent/unstick.sh
#   → 1 per file, 5 files
git diff --stat main -- agent/run.sh agent/spec.sh agent/chat.sh agent/reconcile.sh agent/unstick.sh
#   → 5 files, +1/-0 each. Any other line changed in a parser script is out of scope for this slice.
grep -qi 'bump' README.md && grep -q 'agent/Dockerfile' playbooks/minion-factory.md   # → both hit
grep -cE 'https://github\.com/(anthropics|openai|oven-sh)' scripts/bump-agent-toolchain.sh  # → 0 (no hardcoded project URLs)

# --- Tier B: Docker, no credential ---
./scripts/bump-agent-toolchain.sh                       # → prints pinned vs stable vs latest, exits 0
./scripts/bump-agent-toolchain.sh --set pnpm=0.0.0-nope ; echo "exit=$?"   # → non-zero, file UNCHANGED
git diff --exit-code agent/Dockerfile                   # → clean after that attempt
./scripts/check-agent-contract.sh --no-credential       # → manifest + flag-surface tiers pass; prints
                                                        #   "SKIPPED: live envelope" unmissably
# Negative control — the check must be able to fail:
docker build --no-cache --build-arg CLAUDE_CODE_VERSION=<an older release> -t fx-old -f agent/Dockerfile .
./scripts/check-agent-contract.sh fx-old                # → non-zero on the manifest-vs-Dockerfile assertion

# --- Tier C: Docker + a live Claude credential (⚠️ A2 — human/box-run, costs a few cents) ---
CLAUDE_CODE_OAUTH_TOKEN=… ./scripts/check-agent-contract.sh     # → credential is forwarded to the
                                                                #   probe container; all tiers pass
#   Run this once against the S1 pin (expected: green, since it is what production runs). For the first
#   separately reviewed bump PR, run it again against that PR's candidate and paste both outputs.
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `agent/Dockerfile` | S1 | 4 `ARG`s above the install `RUN`; pinned npm + bun installs; assert-and-manifest layer |
| `scripts/check-agent-contract.sh` | S2 | new — manifest / flag-surface / live-envelope tiers over the §1 table |
| `scripts/bump-agent-toolchain.sh` | S2 | new — read-only report + guarded single-`ARG` `--set`; never builds or deploys |
| `agent/run.sh`, `spec.sh`, `chat.sh`, `reconcile.sh`, `unstick.sh` | S2 | **one** echo line each; the parser logic is untouched |
| `README.md` | S2 | "Agent toolchain" section: why pinned, how to bump, monthly obligation |
| `playbooks/minion-factory.md` | S2 | one binding bullet: pins change only via the procedure |
| `proposals/2026-08-17-factory-runner-dependency-locking.md` (`minion-meta`) | prerequisite ledger item | records the explicitly deferred `runner/Dockerfile` finding; no implementation in this spec |

**Zero runner TypeScript. Zero compose/deploy/setup changes. Zero `.svelte` files. No secret value is added
to any committed file** — `/etc/factory-toolchain.json` holds version strings only.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones": **no functional row matches** — no gateway protocol,
DB schema, agent-definition format, auth, or UI. The AGENTS.md open-items ledger does apply: the deferred
runner-image finding requires the `minion-meta` proposal named in §3 before implementation starts. The runtime
blast radius is also broader than one repo because this image is the execution environment of the whole SDLC
pipeline. That is why D2 exists.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion-factory` production box | **None if S1 is correct** — the pins are the versions already running | S1's no-op proof diffs the built manifest against `npm ls -g` on the box |
| `minion-meta` (this repo) | The `spec`/`reconcile`/`chat` runs that write `specs/` and `proposals/` execute in this image. A bad pin stalls the board itself, not just one target repo | Pin = today's versions (D2); S2 Tier C exercised before any bump deploys; `chat.sh`'s `--resume` contract explicitly asserted |
| `minion`, `minion_hub`, `minion_site`, `minion-base`, `paperclip`, `pixel-agents` — every registered repo | **Real, and the reason `pnpm`/`bun` are in scope rather than left floating**: the global `pnpm`/`bun` here run each repo's `FACTORY_SETUP` and `selfTest`. Unpinned, a rebuild can hand a pnpm-10 workspace pnpm 11 (§1 fact 4) | Pinning to the box's current version freezes the toolchain those repos are already green against; any future bump goes through S2's procedure, where a broken `selfTest` shows up as a red factory run |
| `base.minion-ai.org` (minion-base board) | **None directly** — it reads `specs/index.json` / `proposals/index.json` from git. Indirect only: a stalled pipeline means a stale board | No file in minion-base is touched |
| Runs in flight at deploy time | None from S1/S2 themselves — the image is rebuilt, and `docker run` picks the new image only for the *next* container | Existing deploy behaviour, unchanged by this spec |
| `runner/` service and its Dockerfile | **None** — untouched (§1 fact 5, §5) | `git diff --stat` over `runner/` is empty in both slices |

### ⚠️ A1 — the DoDs need Docker, and a factory agent container does not have it

Tiers B and C need a Docker daemon. Per `2026-08-12-minion-factory-agent-pipeline-spec` §"Image" agent
containers deliberately get **no docker socket** (confirmed in `runner/src/queue.ts:56-65`: `baseDockerArgs`
mounts `/out` and `/opt/factory/codex` and nothing else) — so an agent implementing this spec can satisfy
Tier A and nothing more. That is not a reason to weaken the DoD: Tier A catches a wrong edit, and Tiers B/C
are run by a human at the merge gate (any laptop with Docker) or on the box. **State plainly in the PR which
tiers were executed and by whom.** A DoD block that was never run is an unverified claim, not a green check.

### ⚠️ A2 — the contract check needs a live credential, so it cannot be CI

The live-envelope tier makes a real 1-turn model call: it needs `CLAUDE_CODE_OAUTH_TOKEN` or
`ANTHROPIC_API_KEY`, costs a few cents, and cannot run unauthenticated. It is a **human/box gate in the bump
procedure**, not an automated one — the `--no-credential` mode exists so the cheap tiers can still run
anywhere. Do not let the existence of the script imply continuous verification that nothing performs.

### ⚠️ A3 — a pinned CLI version is not a reproducible image

`npm install -g pkg@x.y.z` fixes the CLI's own version; it does **not** lock its transitive dependency tree
(npm has no lockfile for global installs), and this spec does not pin `node:22-bookworm-slim`, the apt
packages, or the gh-CLI apt repo. Bun additionally selects a `-baseline` build variant by probing the *build
host's* CPU for AVX2 (visible at `https://bun.sh/install` lines 108-118), so the same `BUN_VERSION` can yield
a different binary variant on an older host — same version, different bytes. The proposal's DoD says
*"identical CLI versions"*, which is exactly what is delivered and exactly what the parser contract depends
on. **Do not report this as byte-reproducible builds.** Full image reproducibility is §5.

### ⚠️ A4 — a pin that is never bumped is a different silent failure

This fix converts "silently changes" into "silently stays". A pinned agent CLI will eventually meet a
server-side change it is too old for — a retired model alias, a deprecated endpoint — and the symptom will be
a pipeline-wide failure with a stale binary at the bottom of it. There is no auto-update (the proposal
excludes it) and this spec adds no monitor, so the only counterweight is the README's monthly-check obligation
and the fact that `bump-agent-toolchain.sh` makes the check a 10-second command. If that proves insufficient in
practice, a scheduled staleness check is its own proposal, not a widening of this one.

### ⚠️ A5 — a yanked pin breaks the unattended rebuild path, quietly

`scripts/self-update.sh:23` builds the agent image under `set -euo pipefail` from cron. If a pinned version is
ever unpublished from npm, that build fails, the script aborts **before** `docker compose up -d runner`, and the
box silently stops taking new commits while continuing to serve on the old image. Mitigations in scope:
`bump-agent-toolchain.sh` verifies a version exists before writing it, and the README names this failure
signature (factory looks healthy, but stops picking up main). Alerting on it is out of scope — do not invent a
monitor here.

## 5. Out of scope (explicit)

- **Auto-update tooling** — the proposal's own exclusion. No Renovate/Dependabot, no cron bump, no
  auto-PR-on-new-release. `bump-agent-toolchain.sh` is a human-run reporter with a manual `--set`; if it ever
  grows a scheduler, that is a new proposal.
- **`runner/Dockerfile`'s `npm install --omit=dev` beside a committed `runner/package-lock.json`, and its
  `npx tsx` entrypoint** (§1 fact 5). Same class, different image, different failure mode (the runner does not
  parse model output). **Do not fix it here. Before implementation starts, create
  `minion-meta/proposals/2026-08-17-factory-runner-dependency-locking.md` with the finding and its own DoD**, per
  the AGENTS.md open-items ledger clause.
- **Pinning `node:22-bookworm-slim` by digest, the apt packages, or the gh-CLI apt repo.** Necessary for
  byte-reproducible images (⚠️ A3), irrelevant to the parsed JSON contract, and it carries a real maintenance
  cost (a digest pin that nobody rotates silently freezes security updates). Separate decision, separate
  proposal.
- **Changing which model or CLI version the pipeline uses.** S1 freezes what exists; the first *bump* is an
  exercise of S2's procedure with its own PR, not a smuggled payload in this one.
- **The parser logic itself** — `.subtype`/`.is_error` handling, the provider-fallback heuristic, the
  `error_max_turns` salvage gate, the harness set. This spec protects that contract; it does not touch it.
  (`2026-08-17-factory-providers-put-harness-check` is the open proposal in that neighbourhood — unrelated files.)
- **A private image registry / shipping prebuilt agent images** instead of building on each host. That would
  make reproducibility trivial and is a genuinely better end state — and a much larger change to three build
  sites, the deploy path, and credential handling.
- **Adding CI to `minion-factory`.** No `.github/` directory exists; a `shellcheck` + `docker build` workflow
  is a good follow-up and a different piece of work.
- **Monitoring or alerting** on stale pins (⚠️ A4) or failed self-updates (⚠️ A5).
- **Any UI.** No `.svelte` file in any repo ⇒ the `ui` tag and its governance gates do not apply, per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.

## 6. End-to-end verification

Run with S1 + S2 merged to `main` in `minion-factory`, on a host with Docker and a Claude credential.

```bash
# 1. The proposal's DoD, clause by clause
git clone https://github.com/NikolasP98/minion-factory /tmp/fx && cd /tmp/fx
grep -A4 'ARG CLAUDE_CODE_VERSION' agent/Dockerfile        # → "exact versions pinned", all four
docker build --no-cache --pull -t fx-1 -f agent/Dockerfile . \
  && docker build --no-cache --pull -t fx-2 -f agent/Dockerfile .
diff <(docker run --rm --entrypoint cat fx-1 /etc/factory-toolchain.json) \
     <(docker run --rm --entrypoint cat fx-2 /etc/factory-toolchain.json)   # → no diff
sed -n '/Agent toolchain/,/^## /p' README.md               # → "deliberate bump procedure noted"

# 2. The contract the pin exists to protect
CLAUDE_CODE_OAUTH_TOKEN=… ./scripts/check-agent-contract.sh fx-1     # → all tiers green

# 3. Production: pin deploys as a no-op, and self-update stays healthy
./deploy.sh netcup                                          # ends on its own health curl → 200
ssh netcup 'docker run --rm --entrypoint cat minion-factory-agent /etc/factory-toolchain.json'
ssh netcup 'sudo bash /opt/factory/scripts/self-update.sh; echo "exit=$?"'   # → 0 (⚠️ A5 path exercised)

# 4. The pipeline still works end to end, and now says what ran it
factory run <a registered repo> "no-op smoke"               # → draft PR opens, self-test loop runs
grep -m1 'toolchain' /opt/factory/runs/<id>/run.log         # → the pinned versions, in the run log
curl -s -X POST $FACTORY_URL/pipeline/reconcile -H "Authorization: Bearer $FACTORY_SECRET"
#   → proposal sweep completes (reconcile.sh's .is_error / .result path exercised on the real pin)
# request-agent chat, two turns — the --session-id/--resume contract in production:
curl -s -X POST $FACTORY_URL/chat -H "Authorization: Bearer $FACTORY_SECRET"    # → {id}
curl -s -X POST $FACTORY_URL/chat/<id>/message -d '{"text":"say ok"}' -H …      # → non-empty reply
curl -s -X POST $FACTORY_URL/chat/<id>/message -d '{"text":"what did I just ask?"}' -H …
#   → answers from session memory. An amnesiac reply here means --resume broke; that is the silent
#     failure this whole spec exists to make loud.

# 5. Bump procedure dry run — prove it is usable, without changing anything
./scripts/bump-agent-toolchain.sh                           # → pinned vs stable vs latest + changelog URLs
git diff --exit-code                                        # → clean (a reporter must not mutate)
```

**Ship gate:** §6 steps 1–5 green; the proposal's DoD checked clause by clause (exact versions pinned —
§6 step 1; bump procedure noted — the README section; two builds identical — the `diff` in §6 step 1); Slice 0's
drift measurement pasted (box versions vs a cold unpinned build), or an explicit statement that no drift was
observed; S1's no-op diff against the box pasted as empty **or** the D2-fallback path declared with its reason;
the negative controls pasted (a nonexistent-version `--build-arg` fails the build;
`check-agent-contract.sh` fails on a deliberately stale image) — a check that has never been seen to fail is
not known to work; **and it is stated
explicitly which DoD tiers were run, on what host, by whom** (⚠️ A1, ⚠️ A2). The `runner/Dockerfile` finding
(§1 fact 5) exists at the exact `minion-meta` proposal path named in §3 before implementation starts.
