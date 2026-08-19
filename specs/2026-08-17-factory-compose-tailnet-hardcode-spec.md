---
id: 2026-08-17-factory-compose-tailnet-hardcode-spec
title: "minion-factory compose — parameterize the tailnet bind so setup.sh's any-Docker-host promise is true"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-factory-compose-tailnet-hardcode
verdict: approved
repos: [minion-factory]
tags: [infra, security]
type: fix
---

# Parameterize the factory runner's tailnet bind

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`docker-compose.yml`, `setup.sh`, `deploy.sh`, `.env.example`, `README.md`. No other repo has a file
in this spec.
**Design ancestors:**
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md) §2 —
the decision this spec makes portable: "Runner listens on tailnet interface only (`100.80.222.29:3210`)
— no public exposure". The *policy* (never public, bearer fail-closed) is correct and unchanged; only
the *literal* moves into a variable.
[`2026-08-13-minion-factory-staged-harness-spec`](2026-08-13-minion-factory-staged-harness-spec.md) —
same box, same compose file; nothing here touches stages or harnesses.
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slice tags below are `infra` (+ `security` on S2). `infra` calls for workflow lint in the
self-test; this repo has **no `.github/` directory at all** (verified in the tree listing), so the
honest analog is `shellcheck` + `docker compose config`, and both are in the DoDs. Zero `.svelte`
files ⇒ **no UI-governance checks**. S2 is additionally tagged `security` because it decides what
interface the runner is reachable on — per §4b that means the score may warn but **never auto-pass**;
a human reads the S2 diff regardless of how green the commands come back.

---

## 0. Product

From the approved proposal `2026-08-17-factory-compose-tailnet-hardcode`, verbatim:

> ## Problem
>
> docker-compose.yml:12 literal 100.80.222.29 port bind vs setup.sh's any-Docker-host promise —
> compose up fails elsewhere.
>
> ## Definition of done
>
> ${FACTORY_TAILNET_IP:-100.80.222.29} interpolation mirroring FACTORY_PUBLIC_IP; docker compose
> config shows override.
>
> ## Out of scope
>
> Multi-host orchestration.

## 1. What the repo actually says today

`minion-factory` is **not checked out in this workspace** (the meta-repo `.gitignore` excludes
subprojects, and this is a different repo entirely). Every line quoted below was read from
`main` via `gh api repos/NikolasP98/minion-factory/contents/<path>` during spec authoring; the repo's
`pushed_at` at that moment was `2026-08-17T06:20:43Z`. **Re-read each file before editing** — line
numbers are as-of that read, not a guarantee (Slice 0).

`docker-compose.yml:9-14`:

```yaml
    # Tailnet bind + localhost for the Caddy public proxy (factory.minion-ai.org).
    # Auth stays fail-closed bearer either way; never bind 0.0.0.0.
    ports:
      - '100.80.222.29:3210:3210'
      # 3211 because /opt/minion-hub-cron already owns localhost:3210
      - '127.0.0.1:3211:3210'
```

`docker-compose.yml:37-41` — the pattern the proposal says to mirror, already present in the same
file for the caddy service:

```yaml
    # Public IP only: tailscaled (funnel) owns 443 on the tailnet IP, so a
    # wildcard bind is EADDRINUSE. Override FACTORY_PUBLIC_IP per box.
    ports:
      - '${FACTORY_PUBLIC_IP:-0.0.0.0}:80:80'
      - '${FACTORY_PUBLIC_IP:-0.0.0.0}:443:443'
```

`setup.sh:2` makes the promise the proposal cites — *"Single-command setup for a fresh factory host
(any Docker-capable Linux box)"* — and `README.md:15` repeats it as a heading. `setup.sh:36` then runs
`docker compose up -d runner`. On any host that is not the Netcup box, the Docker daemon cannot bind
an address the host does not own, so that line fails (`cannot assign requested address`), `set -euo
pipefail` aborts, and the single command does not complete. **That is the whole bug, and it is real,
not theoretical.**

Four facts found while reading that change the work, and would otherwise be found the hard way:

1. **`deploy.sh` rewrites `/opt/factory/.env` wholesale on every deploy** (`deploy.sh:27-40`), and its
   own comment says so: *"deploy.sh rewrites .env wholesale; anything hand-added on the box is lost,
   so this line must live here."* A new variable that only lives in the box's `.env` is therefore
   deleted by the next deploy. The variable must be added to that heredoc — this is S1 work, not a
   nicety.
2. **There is a second hardcoded copy of the same literal**: `deploy.sh:71` ends the deploy with
   `curl -sf http://100.80.222.29:3210/health`. Parameterizing compose while leaving this pinned means
   the deploy path still only works against Netcup — the variable would exist and the promise would
   still be false.
3. **`.env.example` does not document `FACTORY_PUBLIC_IP`** even though `setup.sh:41` and
   `README.md:47` both instruct the operator to set it. The mirror this spec is asked to follow is
   itself half-documented; S1 fixes both lines in one edit rather than adding a second undocumented
   variable next to the first.
4. **The host port bind is the entire exposure boundary.** `runner/src/index.ts:387-388` is
   `app.listen(PORT, ...)` with no host argument — inside the container the runner listens on all
   interfaces. Nothing but the compose `ports:` entry keeps it off the public IP. That is why
   `FACTORY_TAILNET_IP` is not a cosmetic variable, and why S2 carries a `security` tag and a guard.

**The default value is the one real design decision here, so it is made explicitly.** Mirroring
`FACTORY_PUBLIC_IP` *in form* (`${VAR:-<default>}`) is what the proposal asks for; mirroring it in
*substance* is impossible, because `FACTORY_PUBLIC_IP`'s default (`0.0.0.0`) is portable and a tailnet
IP is not. The choice:

- **Chosen — keep `100.80.222.29` as the compose default.** Netcup's resolved config is byte-identical
  before and after S1 (a machine-checkable claim; see S1's DoD), so the production box cannot be
  broken by this slice. The fresh-host path is then fixed properly in S2, where `setup.sh` *detects
  and writes* the right value instead of hoping for a default.
- **Rejected — default to `127.0.0.1`.** Portable, but it changes Netcup's bind the moment any deploy
  writes an `.env` without the line, silently dropping every tailnet client (the workstation CLI, whose
  default URL is `http://100.80.222.29:3210`, `cli/factory:8`). A fail-quiet regression on the one
  environment that exists today is a worse trade than a default that is merely non-portable.

## 1b. Slice 0 — recon (≤ 30 min, prepend to S1, not counted as a slice)

```bash
git clone https://github.com/NikolasP98/minion-factory /tmp/factory && cd /tmp/factory
grep -n '100\.80\.222\.29' -r .            # → expect: docker-compose.yml, deploy.sh (x2), cli/factory
sed -n '1,50p' docker-compose.yml          # confirm the line numbers quoted in §1
grep -rn 'FACTORY_PUBLIC_IP' . ; grep -n 'PORT' runner/src/index.ts
docker compose version || echo "NO DOCKER — DoD tier B must be run elsewhere (⚠️ A1)"
# on the box, BEFORE any change — this is the regression baseline S1 is measured against:
ssh netcup 'cd /opt/factory && docker compose config' > /tmp/compose-config.before
```

Paste `compose-config.before` (or its `sha256sum`) into the PR. Nothing in Slice 0 changes a file.

## 2. Approach — two slices

```
S0 (recon) ─▶ S1 (compose interpolation + the .env plumbing that survives a deploy)
                                  └─▶ S2 (setup.sh detects the bind; the any-host promise becomes true)
```

S1 satisfies the proposal's DoD sentence literally and is a **zero-resolved-change** edit on Netcup.
S2 is what makes the proposal's *problem statement* go away, and it is the slice that needs a second
Docker host to verify. They are split for review and rollback clarity: S1 is verifiable without any
host at all, while S2 changes the setup path and touches the exposure boundary. They are
implementation slices, not independent ship units: **S1 and S2 must merge together.** S1 alone both
leaves the any-host promise false and makes the exposure boundary operator-controlled without the S2
guard, so it is not a safe resting state.

**Both slices edit deploy/CI-adjacent config, which `playbooks/generic.md` tells factory agents never
to touch "unless the task says so". The task says so:** `docker-compose.yml`, `setup.sh`, `deploy.sh`
and `.env.example` are the intended surface of this spec. Nothing else in the repo may be edited.

---

### S1 — The interpolation, and the plumbing that makes it survive a deploy

**Tags:** `infra` · **Estimate:** 3–5 h (small end; §2 says why it is not merged into S2)

**Goal:** the runner's tailnet bind becomes an operator-settable variable, documented in the two
places an operator looks, and written by the deploy path that would otherwise erase it — with the
resolved configuration on Netcup provably unchanged.

**Do:**

- `docker-compose.yml:12` → `- '${FACTORY_TAILNET_IP:-100.80.222.29}:3210:3210'`. Use `:-` (not `-`)
  so an empty value falls back to the default rather than producing `:3210:3210`, which compose reads
  as a wildcard bind — the exact outcome the file's own comment forbids.
- Update the comment block at `docker-compose.yml:9-10` to name the variable and keep the standing
  rule: bind the tailnet (or loopback) address, **never `0.0.0.0`**; auth is fail-closed bearer either
  way, but the runner's process listens on all interfaces inside the container (§1 fact 4), so this
  line is the boundary.
- Leave `- '127.0.0.1:3211:3210'` **exactly as is.** `127.0.0.1` is portable, and the `3211` host port
  is odd-but-harmless off Netcup (§5).
- `deploy.sh:28-40` heredoc: add `FACTORY_TAILNET_IP=${FACTORY_TAILNET_IP:-100.80.222.29}` next to the
  existing `FACTORY_PUBLIC_IP` line, under the same comment explaining why box-side edits do not
  survive. Same expansion semantics as its neighbour — resolved on the workstation at deploy time.
- `.env.example`: add `FACTORY_TAILNET_IP=` and `FACTORY_PUBLIC_IP=` with one-line comments (the
  latter is missing today, §1 fact 3). Say what each one binds and that the tailnet value must not be
  `0.0.0.0`. Do **not** put real IPs in the example file — the comment names the shape, not the value.
- Do not touch `cli/factory:8`, `Caddyfile`, `deploy/stack.yml`, `deploy/k8s.yml` (§5).

**Files:** `docker-compose.yml`, `deploy.sh`, `.env.example`.

**Definition of done (machine-checkable):**

```bash
# --- Tier A: no Docker required (runs anywhere, including a factory agent container) ---
grep -c "'\${FACTORY_TAILNET_IP:-100\.80\.222\.29}:3210:3210'" docker-compose.yml   # → 1
grep -n '100\.80\.222\.29' docker-compose.yml       # → exactly ONE hit, inside the ${...:-} default
grep -n 'FACTORY_TAILNET_IP' deploy.sh .env.example # → ≥1 hit in each file
grep -n '0\.0\.0\.0' docker-compose.yml             # → only the caddy FACTORY_PUBLIC_IP default

# --- Tier B: needs a Docker host (the proposal's literal DoD) ---
# `env_file: .env` means compose refuses to run without one — create an empty file in a scratch clone.
cd /tmp/factory && : > .env
docker compose config | grep -n '100\.80\.222\.29'                    # → default still resolves
FACTORY_TAILNET_IP=10.9.8.7 docker compose config | grep -n '10\.9\.8\.7'   # → OVERRIDE VISIBLE ← DoD
printf 'FACTORY_TAILNET_IP=10.9.8.7\n' >> .env && docker compose config | grep -n '10\.9\.8\.7'
#   ^ proves the override also works from the .env file, which is how the box actually sets it
FACTORY_TAILNET_IP= docker compose config | grep -n '100\.80\.222\.29'  # → empty falls back, no ':3210:3210'

# --- Red-state proof (tag `infra`, so this is the analog of G3) ---
git stash && FACTORY_TAILNET_IP=10.9.8.7 docker compose config | grep -c '10\.9\.8\.7'  # → 0
git stash pop                                # paste that 0 in the PR: the override was inert before

# --- Netcup regression proof: resolved config is byte-identical ---
ssh netcup 'cd /opt/factory && docker compose config' | diff - /tmp/compose-config.before  # → no diff
#   (run after deploying S1; the .env line added by deploy.sh resolves to the same value)
bash -n deploy.sh && shellcheck deploy.sh || true    # shellcheck advisory here; blocking in S2
```

---

### S2 — Make the any-host promise true

**Tags:** `infra`, `security` · **Estimate:** 4–6 h

**Goal:** `git clone && ./setup.sh` completes on a Docker host that has never heard of this tailnet,
and the resulting bind is loopback or a real tailnet address — never the public internet.

**Do:**

- **`setup.sh` resolves the bind before starting anything.** Order: a non-empty, already-exported
  `FACTORY_TAILNET_IP` wins; else the single existing `FACTORY_TAILNET_IP=` assignment in `.env`;
  else `tailscale ip -4 2>/dev/null | head -1`; else `127.0.0.1`. Read the existing assignment as
  data; do not source `.env`. Reject an explicitly exported empty value, an empty existing assignment,
  or duplicate assignments rather than silently falling through to the compose default. Write the
  resolved value into a newly generated `.env`, or append it only when an existing `.env` has no
  assignment. Print which branch was taken and why — an operator who gets loopback because
  `tailscale` was missing must be told, not left to discover it from a refused connection.
- **Append-if-missing on an existing `.env`.** `setup.sh:11` only writes `.env` when it is absent, so
  an already-installed host would never receive the new variable. Add an idempotent append for
  `FACTORY_TAILNET_IP` (and nothing else) that leaves every existing line, including all secrets,
  untouched. Re-running `setup.sh` twice must produce the same file.
- **Refuse a wildcard bind.** If the resolved or supplied value is `0.0.0.0` (or empty, or `::`),
  exit non-zero with a message naming the risk: the runner listens on all interfaces inside the
  container, so this would publish the API to the internet behind nothing but the bearer check. There
  is no escape hatch: the ancestor's "never public" policy is explicitly unchanged by this spec.
- **Fix the health check and the printed instructions.** `setup.sh:38` currently probes
  `127.0.0.1:3211` then `localhost:3210`; make it probe the resolved bind and report a real failure
  instead of `|| true` swallowing it. Print the base URL and the exact `export FACTORY_URL=...` line
  the workstation CLI needs (`cli/factory:8` defaults to the Netcup URL, which is wrong on any other
  host — telling the operator is the mitigation, changing that default is §5).
- **`deploy.sh:71`**: replace the literal in the final health curl with
  `http://${FACTORY_TAILNET_IP:-100.80.222.29}:3210/health`, matching the value written into the
  `.env` heredoc by S1.
- **`README.md` §"Single-command setup"**: three or four lines — what `FACTORY_TAILNET_IP` and
  `FACTORY_PUBLIC_IP` do, that a host without Tailscale gets a loopback bind and needs
  `FACTORY_URL` set on any client, and that `0.0.0.0` is refused by design.

**Files:** `setup.sh`, `deploy.sh`, `README.md`.

**Definition of done (machine-checkable):**

```bash
shellcheck setup.sh deploy.sh          # → clean (blocking in this slice; the `infra` self-test analog)
bash -n setup.sh deploy.sh
grep -n 'FACTORY_TAILNET_IP' setup.sh README.md         # → ≥1 hit in each
grep -n '100\.80\.222\.29' deploy.sh                    # → only inside ${FACTORY_TAILNET_IP:-...}

# Fresh-host proof — any Docker box with NO tailscale (throwaway VM, cloud instance, ⚠️ A1):
git clone https://github.com/NikolasP98/minion-factory /opt/factory && cd /opt/factory
./setup.sh                                               # → exits 0  ← the proposal's problem, gone
grep '^FACTORY_TAILNET_IP=' .env                         # → 127.0.0.1
curl -sf http://127.0.0.1:3210/health                    # → 200
docker compose ps --format '{{.Ports}}' | grep -c '0\.0\.0\.0:3210' # → 0 (Caddy may bind 80/443 publicly)

# Guard + idempotence:
FACTORY_TAILNET_IP=0.0.0.0 ./setup.sh                    # → non-zero exit, message names the exposure
cp .env /tmp/env.1 && ./setup.sh && diff /tmp/env.1 .env # → no diff (idempotent, secrets preserved)
sed -i '/^FACTORY_TAILNET_IP=/d' .env && ./setup.sh && grep -c '^FACTORY_TAILNET_IP=' .env  # → 1
FACTORY_TAILNET_IP= ./setup.sh                    # → non-zero; empty override is not defaulted
printf 'FACTORY_TAILNET_IP=127.0.0.1\n' >> .env && ./setup.sh # → non-zero; duplicates are ambiguous
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `docker-compose.yml` | S1 | one `ports:` line → `${FACTORY_TAILNET_IP:-100.80.222.29}`; comment names the variable and the never-`0.0.0.0` rule |
| `deploy.sh` | S1, S2 | `.env` heredoc gains the variable (it is erased otherwise); health curl stops hardcoding the box |
| `.env.example` | S1 | document `FACTORY_TAILNET_IP` **and** `FACTORY_PUBLIC_IP` (the latter was never documented) |
| `setup.sh` | S2 | preserve existing value or detect → write/append-if-missing; refuse wildcard/empty/duplicate binds; real health probe; print `FACTORY_URL` |
| `README.md` | S2 | setup section states both variables and the no-Tailscale path |

**Zero application code. Zero runner/agent source. Zero `.svelte` files. No secret value is added to
any committed file** — `.env.example` gains variable names and comments only.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". None of its rows match: this touches no
gateway protocol, no DB schema, no agent-definition format, no auth, no UI. The blast radius is one
box's port bindings.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| Netcup production runner | **None if S1 is correct.** Resolved compose config identical before/after | S1 DoD's `docker compose config \| diff` against the Slice 0 baseline; default value unchanged |
| `base.minion-ai.org` (minion-base) | **None.** The public path is `factory.minion-ai.org` → the `caddy` service → `reverse_proxy runner:3210` (`Caddyfile:4`) over the compose network — it never traverses a host port bind | Verified in `Caddyfile`; caddy's own bind (`FACTORY_PUBLIC_IP`) is untouched |
| Workstation CLI (`cli/factory`) | **None by default** — `URL=${FACTORY_URL:-http://100.80.222.29:3210}` still resolves to the same address. It *would* break if an operator changed Netcup's `FACTORY_TAILNET_IP` | S2 prints the `export FACTORY_URL=` line; changing the CLI default is §5 |
| Tailscale funnel / `tailscaled` on 443 | **None.** Only the runner's 3210 bind moves behind a variable; the funnel-vs-caddy 443 conflict is `FACTORY_PUBLIC_IP`'s problem and is untouched | `docker-compose.yml:37-41` unchanged |
| `deploy/stack.yml`, `deploy/k8s.yml` | **None** — neither contains the literal (verified); Swarm uses host-mode publish, k8s uses a Service | Out of scope, §5 |
| `minion-meta`, `minion_hub`, `minion_site`, `minion`, `paperclip`, `pixel-agents` | **None** — no file in any of them references the runner's bind | Verified: `grep -rn '3210' ` over this checkout returns only spec prose and one unrelated hex constant |
| In-flight factory runs at deploy time | `docker compose up -d` recreates the runner container when the resolved ports change; queued/running work is interrupted | Deploy is human-run from the workstation. Deploy when `GET /runs` shows nothing active — this is the existing deploy risk, not one this spec creates |

### ⚠️ A1 — the DoDs need Docker, and a factory agent container does not have it

Tier B of S1 and all of S2's fresh-host proof require a Docker daemon. Per
`2026-08-12-minion-factory-agent-pipeline-spec` §1, agent containers deliberately get **no docker
socket** — so an agent implementing this spec can satisfy Tier A and nothing more. That is not a
reason to weaken the DoD: Tier A is genuinely machine-checkable and catches a wrong edit, and Tier B is
run by the human at the merge gate (a scratch clone on any laptop with Docker takes two minutes) or on
the box itself. **State plainly in the PR which tiers were actually executed and by whom.** A DoD
block that was never run is an unverified claim, not a green check.

### ⚠️ A2 — `docker compose config` is not `docker compose up`

`config` proves interpolation, which is exactly what the proposal asks for. It does **not** prove the
address is bindable — that only fails at `up`, in the daemon. S2's fresh-host proof is therefore the
only step that closes the proposal's actual problem statement; S1's Tier B is necessary and not
sufficient. Do not report the proposal as fixed on the strength of a `config` grep alone.

### ⚠️ A3 — S1 hands the exposure boundary to an operator-supplied string

Before this spec, the runner could only ever bind one hardcoded private address. After S1, whatever is
in `.env` is what gets published, and the process inside the container listens on all interfaces
(`runner/src/index.ts:388`). S2's refusal of `0.0.0.0`/empty/`::` is the floor. This is why §2 and the
ship gate require S1 and S2 to merge together rather than allowing S1 to ship alone.

## 5. Out of scope (explicit)

- **Multi-host orchestration** (the proposal's own exclusion). `deploy/stack.yml` and `deploy/k8s.yml`
  exist and are untouched; neither contains the literal.
- **Changing the host port numbers** (`3210`, and the `3211` loopback port whose comment cites
  `/opt/minion-hub-cron` on Netcup). `3211` is unusual but functional on any host; parameterizing port
  numbers is a second variable, a second default, and a second way to collide. If a fresh host turns
  out to have 3210 or 3211 occupied, S2's pre-flight names it and that becomes its own proposal.
- **The `cli/factory` default URL** (`http://100.80.222.29:3210`). Already overridable via
  `FACTORY_URL`; changing the default would break every existing workstation for the benefit of hosts
  that do not exist yet. S2 prints the correct export instead.
- **The public/Caddy exposure model** — `FACTORY_PUBLIC_IP`, the Caddyfile domain, TLS, the funnel-vs-443
  conflict. Documented in S1's `.env.example` line; behaviorally untouched.
- **The runner's own listen address** (`app.listen(PORT)` binding all interfaces inside the container).
  Defense in depth would add a host argument; it is a `runner/src/` change with its own testing, and the
  compose bind is the boundary that actually holds today.
- **Auth, secrets, and the bearer model.** `FACTORY_SECRET` fail-closed behavior is unchanged. No
  rotation, no new credential, no change to `.env` file mode (600).
- **The Infisical literal in this meta-repo** (`.env.defaults:7`,
  `MINION_DEFAULT_INFISICAL_DOMAIN=http://100.80.222.29:8080/api`). Same host, same problem class,
  different service and different repo — file it separately if it matters; do not absorb it here.
- **Adding CI to `minion-factory`.** The repo has no `.github/` directory; a shellcheck/compose-config
  workflow would be a genuinely good follow-up and is a different piece of work from this fix.
- **Updating shipped specs' prose** that quotes `100.80.222.29:3210` as the bind
  (`2026-08-12-minion-factory-agent-pipeline-spec` §2). Those are historical records of a decision that
  still stands; the address is now the default, not a constant.
- **Any UI.** No `.svelte` file in any repo ⇒ the `ui` tag and its governance gates do not apply, per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.

## 6. End-to-end verification

Run with S1 + S2 merged to `main` in `minion-factory`.

```bash
# 1. Fresh host — the proposal's problem statement, closed (any Docker box, no tailscale)
git clone https://github.com/NikolasP98/minion-factory /opt/factory && cd /opt/factory
./setup.sh                                   # → completes; before this spec it died at `compose up`
curl -sf http://127.0.0.1:3210/health        # → 200
curl -s  http://127.0.0.1:3210/runs          # → 401/503 (bearer still fail-closed — unchanged)
docker compose ps --format '{{.Ports}}' | grep -c '0\.0\.0\.0:3210' # → 0

# 2. Separate fresh clone on a host WITH tailscale — the detection path
tailscale ip -4                              # note the address
./setup.sh && grep '^FACTORY_TAILNET_IP=' .env    # → that same address
curl -sf http://$(tailscale ip -4 | head -1):3210/health   # → 200

# 3. Explicit override, from the environment and from .env (the proposal's DoD, both routes)
FACTORY_TAILNET_IP=10.9.8.7 docker compose config | grep '10\.9\.8\.7'
sed -i 's/^FACTORY_TAILNET_IP=.*/FACTORY_TAILNET_IP=10.9.8.7/' .env
docker compose config | grep '10\.9\.8\.7'

# 4. Guard holds
FACTORY_TAILNET_IP=0.0.0.0 ./setup.sh        # → refuses, names the exposure, exits non-zero

# 5. Netcup: no behavior change, and the variable survives a deploy
./deploy.sh netcup                           # ends on its own health curl → 200
ssh netcup 'grep ^FACTORY_TAILNET_IP= /opt/factory/.env'          # → 100.80.222.29
ssh netcup 'cd /opt/factory && docker compose config' | diff - /tmp/compose-config.before  # → no diff
ssh netcup 'curl -sf http://100.80.222.29:3210/health'            # → 200
factory run <any registered repo> "no-op smoke"                   # → CLI still reaches the runner
curl -sfI https://factory.minion-ai.org/health                    # → 200 (public path unaffected)
```

**Ship gate:** §6 steps 1–5 green; the proposal's DoD checked clause by clause (`${FACTORY_TAILNET_IP:-100.80.222.29}`
interpolation present — S1 Tier A; `docker compose config` shows the override — §6 step 3);
S1's red-state `0` pasted (proving the override was inert before the change); the Netcup
`docker compose config` diff pasted as empty; **and it is stated explicitly which DoD tiers were run,
on what host, by whom** (⚠️ A1). Per §4b's `security` rule for S2, a human approval is on the record —
a green command list is evidence, not a decision. S1 and S2 are merged in the same PR; neither is
reported shipped independently.
