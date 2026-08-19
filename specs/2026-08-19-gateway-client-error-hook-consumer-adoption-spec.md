---
id: 2026-08-19-gateway-client-error-hook-consumer-adoption-spec
title: "Adopt the GatewayClient onEventError hook in hub, site and paperclip (S3 consumer handoff)"
stage: spec
status: draft
pass: 1
created: 2026-08-19
updated: 2026-08-19
proposal: 2026-08-17-gateway-client-error-hook-consumer-adoption
verdict: pending
repos: [minion_hub, minion_site, paperclip]
relationship: depends-on
related: [2026-08-17-pkg-gateway-client-onevent-errors-spec, 2026-08-17-site-member-gateway-swallowed-errors-spec, 2026-08-17-gateway-client-lifecycle-swallows-handoff]
type: fix
---

# Adopt the `onEventError` hook in the three `@minion-stack/shared` consumers

## 1. Relationship recommendation

- **`2026-08-17-pkg-gateway-client-onevent-errors-spec`** (approved, pass 2, `repos: [minion-meta]`) —
  **depends-on**. That spec's S1 is the code this proposal exists to adopt; its S3 is the changeset
  and the very proposal this spec implements. This spec's Slice 0 is a hard gate on that changeset
  having actually **published** (§2 AS-IS below) — not merely merged to `main`. This spec supersedes
  nothing in the parent spec and edits none of its files (`packages/shared/**`); it starts exactly
  where that spec's §4 impact table left off ("nothing changes until a consumer bumps").
- **`2026-08-17-site-member-gateway-swallowed-errors-spec`** (approved, pass 2, `repos: [minion_site]`)
  — **related, not depends-on**. Its §4 ⚠️ A1 names `reportGatewayError` as "the obvious wiring
  target" for `minion_site`'s slice below, and its own status is `approved`/not yet `merged` — so
  `reportGatewayError` may not exist in `minion_site` yet when this spec's site slice starts. The site
  slice below treats that function's existence as a Slice-0 recon question, not an assumption, so this
  spec does not block on that one shipping first — worst case the site slice's `onEventError` wiring
  target is `console.error`-passthrough today and gets rewired to `reportGatewayError` in a small
  follow-up once that spec lands.
- **`2026-08-17-gateway-client-lifecycle-swallows-handoff`** (approved, `repos: [minion-meta]`, not
  yet spawned into a spec) — **related, not depends-on**. It is S2 of the onEvent-errors spec
  (`onReconnectError` / `onSocketError`) and is explicitly out of this proposal's scope (proposal's own
  "Out of scope" section). Named here only so a future reader does not conflate the two hooks: if S2
  ships, it is a **second**, separate consumer-adoption pass, not an amendment to this one.

No existing spec already covers hub/site/paperclip adopting `onEventError` — this is new work, gated
on an external event (a real npm publish) rather than on another draft.

## 2. AS-IS

**The hook exists in `minion-meta` and is not yet published.** Verified in this checkout
(`packages/shared/src/gateway/client.ts:38,289-304`; `packages/shared/package.json:3`;
`.changeset/gateway-client-event-error-hook.md`; `git log --oneline` for PR #29):

- S1 shipped to `main` via PR #29 ("factory: auto: pkg-gateway-client-onevent-errors-spec S1"),
  merged 2026-08-17. `onEventError?: (err, frame) => void | Promise<void>` is a real option on
  `GatewayClientOptions`, with the two-arm sync/async containment and the never-throw
  `reportEventError` private reporter, exactly as `2026-08-17-pkg-gateway-client-onevent-errors-spec`
  §S1 specified.
- **S2 has not shipped.** `client.ts:251-255` and `:330-335` still carry
  `// TODO(handoff): ... carried forward as S2 in proposals/2026-08-17-gateway-client-lifecycle-swallows-handoff.md`
  — `onReconnectError` / `onSocketError` do not exist yet. Irrelevant to this spec (§1), noted so a
  slice below does not accidentally assume they exist.
- **The changeset is written but unconsumed — the release has NOT published.**
  `.changeset/gateway-client-event-error-hook.md` exists on disk (`"@minion-stack/shared": minor`,
  proposal-quality release prose naming `onEventError`). `packages/shared/package.json` still reads
  `"version": "0.9.0"` — no version bump has landed. `gh pr list --state merged` shows no
  `chore: version packages` PR since 2026-07-13 (#18), i.e. **no Version-Packages PR has been opened
  or merged for this changeset yet.** Per memory
  [`minion-meta-changeset-release-flow`](minion-meta-changeset-release-flow.md) (★★★), publishing a
  changeset is **two merges to `main`**: (1) the feature PR carrying the changeset — done (#29); (2)
  the automated "Version Packages" PR that `changeset publish`es to npm — **not yet opened/merged**.
  Until (2) lands, `@minion-stack/shared` on npm does not export `onEventError` at all, and any
  consumer that "bumps" today gets nothing to wire up.
  - `npm view @minion-stack/shared version` returned `0.10.0` during this spec's recon, which
    **cannot be reconciled** against the local `package.json` (`0.9.0`) or `CHANGELOG.md` (latest
    entry `0.9.0`, the traceparent feature — no `0.10.0` entry anywhere in this repo). Treat this
    npm-registry read as **unverified/unreliable** for gating purposes; it is flagged, not trusted.
    Slice 0 below re-checks the authoritative signal (a merged Version-Packages PR + a `CHANGELOG.md`
    entry naming `onEventError`) rather than trusting a bare `npm view`.
- **The three consumer repos are absent from this workspace** (`.gitignore`:
  `minion_hub/`, `minion_site/`, `paperclip-minion/`; verified `ls -d` → three "No such file or
  directory"). This is the same ⚠️ A1 condition the parent spec and the site spec both recorded. Every
  consumer-repo claim below is a **carried lead**, not a fact read from that repo's source, and each
  slice's Slice-0 recon is mandatory before any code changes in that repo.
- **What is known about each consumer, and from where** (carried, not verified in this checkout):
  - `minion_hub` (`src/lib/services/gateway.svelte.ts`, ~920 LOC per
    `specs/ws-duplication-audit.md:45`) already ships its own gateway-error surface:
    `src/lib/services/gateway-errors.ts` (`describeGatewayError`) plus `connection.svelte.ts` state
    (`connectErrorHint`/`connectErrorRaw`/`connectErrorCta`) and a status-dot popover UI, shipped
    2026-06-10 / 2026-07-11 per operator memory
    [`gateway-connect-error-ui-and-jwt-required`](gateway-connect-error-ui-and-jwt-required.md) and
    [`hub-connection-status-dot-popover`](hub-connection-status-dot-popover.md). That module maps
    **connect/close failures**, not `onEvent` handler failures — it is not automatically the right
    sink for `onEventError`, but it is the natural place to extend or to route a new "event handler
    failed" case into, and hub's Slice-0 recon must read it before deciding. Whether hub's own
    `onEvent` callback already wraps itself in `try`/`catch` is unverified — repo absent.
  - `minion_site` (`src/lib/services/member-gateway.svelte.ts`, ~373 LOC pre-migration per
    `specs/ws-duplication-audit.md:120`) is mid-remediation on the **same failure class**:
    `2026-08-17-site-member-gateway-swallowed-errors-spec` (approved, not yet merged) is building
    `src/lib/services/gateway-errors.ts` with a `reportGatewayError(op, value, onFailure)` sink and
    wrapping the module's own `onEvent` body in `try`/`catch`. §1 above states this spec's site slice
    does not block on that one merging first.
  - `paperclip-minion`'s `minion_gateway` adapter (via `@minion-stack/shared`'s `./node` subpath,
    `createNodeGatewayClient`) has **no operator-memory hit** for its `onEvent` handler shape or its
    own error-reporting pattern. Fully unverified — repo absent, and no carried lead beyond "it is a
    long-lived Node process" (parent spec §4 ⚠️ A3: a synchronous throw there was previously an
    uncaught-exception candidate; S1 already fixed that regardless of whether paperclip ever bumps).

## 3. TO-BE

Each of the three consumers has, on the record (a linked PR in that consumer's own repo), either:
(a) bumped `@minion-stack/shared` to the first published version containing `onEventError` **and**
wired it into that consumer's own error/reporting surface, or (b) bumped and explicitly accepted the
`console.error` fallback default in the PR description. The recon table in the parent proposal (the
"unverified — repo absent" grid) is filled in with real values for all three consumers.

**Invariants that must not change** (restated from the proposal, binding on every slice below):

1. No consumer starts logging full event payloads — the fallback names the event only; a consumer
   that chooses to log the whole frame via its own `onEventError` is making a deliberate, separate
   choice, not something this work does for it.
2. No consumer awaits, buffers, or reorders `onEvent` dispatch — `onEventError` is a reporting hook,
   not a delivery-semantics change.
3. No protocol, frame-type, or reconnect-timing behavior changes in any consumer.
4. No slice here edits `packages/shared/**` — that surface is owned and closed by the parent spec.

## 4. DELTA

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| 1 | The changeset publishes to npm (Version-Packages PR merged) | S0 | `gh pr list --state merged --search "version packages"` shows a PR merged **after** #29, AND that PR's diff bumps `packages/shared/package.json` past `0.9.0` with a `CHANGELOG.md` entry naming `onEventError` |
| 2 | `minion_hub` decides + records its `onEventError` posture | S1 | linked hub PR; PR description states bump target version and either the sink it wired into or the explicit accept-default statement |
| 3 | `minion_site` decides + records its `onEventError` posture | S2 | linked site PR; same two conditions, naming `reportGatewayError` if that spec has landed by then, else the accept-default statement |
| 4 | `paperclip-minion` decides + records its `onEventError` posture | S3 | linked paperclip PR; same two conditions, plus explicit confirmation of ⚠️ A3 (does a synchronous handler throw still crash the process pre-bump, and is that resolved post-bump) |
| 5 | This proposal closes with all three consumers accounted for, no "unverified — repo absent" left | S4 | the parent proposal's Definition of Done, checked clause by clause, recorded in the proposal file or a closing comment |

S1–S3 do not depend on each other and may run in parallel once S0 is satisfied; each is independently
shippable per-repo. S4 is a closeout that reads the other three, not new code.

---

## 5. Approach — four vertical slices

```
S0 (gate: confirm the release actually published) ─▶ S1 (hub) ─┐
                                                      S2 (site) ─┼─▶ S4 (closeout)
                                                      S3 (paperclip) ─┘
```

### S0 — Confirm publish; do not let anyone bump against an unpublished hook

**Tags:** `infra` · **Estimate:** ≤ 1 h · **Files:** none (verification only, run from `minion-meta`)

**Goal:** a hard, machine-checkable gate that stops S1–S3 from starting against a version of
`@minion-stack/shared` that does not actually export `onEventError` yet — the exact trap the AS-IS
section's `npm view` discrepancy flags.

**Do:**

```bash
cd /home/agent/work
gh pr list --state merged --search "version packages" --limit 5
#   → must show a PR merged AFTER #29 (2026-08-17) that touches packages/shared/package.json
gh pr view <that PR> --json files -q '.files[].path' | rg 'packages/shared/(package\.json|CHANGELOG\.md)'
git show <that PR merge sha>:packages/shared/CHANGELOG.md | rg -A3 'onEventError'
#   → the changeset's release prose appears verbatim in the published CHANGELOG
git show <that PR merge sha>:packages/shared/package.json | rg '"version"'
#   → the version consumers should pin (record it — this is the exact string S1–S3's bumps target)
```

**Definition of done (machine-checkable):** the three commands above all succeed and the recorded
version string is written into this proposal's tracking (or the PR bodies of S1–S3, whichever lands
first). If S0 fails (no Version-Packages PR yet), **stop** — S1–S3 do not start. This is a polling
gate, not a one-shot check; re-run it before starting each of S1–S3 independently, since they may run
days apart.

---

### S1 — `minion_hub` adoption

**Tags:** `logic`, `docs` · **Estimate:** 4–6 h · **Files:** `minion_hub/package.json` (dependency
bump), `minion_hub/src/lib/services/gateway.svelte.ts` (wiring, if wired rather than accepted), PR
description (the decision record).

**Goal:** hub runs a published `@minion-stack/shared` that exports `onEventError`, and has made an
explicit, recorded choice about it.

**Do:**

- **Slice-0 recon inside `minion_hub`** (this repo is absent here — run wherever it is checked out):
  ```bash
  rg -n 'onEvent' minion_hub/src/lib/services/gateway.svelte.ts
  rg -n '"@minion-stack/shared"' minion_hub/package.json
  rg -n 'describeGatewayError|gateway-errors' minion_hub/src/lib/services/gateway.svelte.ts
  ```
  Record: is `onEvent` already wrapped in its own `try`/`catch` (§2 AS-IS says this is unverified)?
  What version is currently pinned? Does `gateway-errors.ts` (§2 AS-IS: `describeGatewayError`,
  shipped 2026-06-10/2026-07-11) already have a shape that fits an event-handler failure, or is it
  connect-error-specific and would need a new case?
- **Bump** `@minion-stack/shared` to the version S0 recorded.
- **Decide, in the PR description, one of:**
  - Pass `onEventError` and route it through `gateway-errors.ts`/the connection-status-dot surface
    (extend `describeGatewayError`'s shape, or add a sibling reporter — hub's Slice-0 recon decides
    which fits without duplicating that module's existing mapping pattern), so an event-handler bug
    surfaces the same way a connect failure already does; or
  - accept the `console.error` default explicitly, and say so, so the new console output is not later
    filed as a regression.
- **Do not** touch hub's connect/close error paths, `describeGatewayError`'s existing cases, or any
  `.svelte` UI beyond what wiring `onEventError` strictly requires (a new reporter call, not a new
  banner) — if hub decides the failure deserves UI surfacing beyond a console line, that is a
  follow-up proposal, not this slice (§6 out-of-scope).

**Definition of done (machine-checkable, run inside `minion_hub`):**

```bash
rg -n '"@minion-stack/shared"' package.json                    # → the S0-recorded version, not 0.9.x
rg -n 'onEventError' src/lib/services/gateway.svelte.ts         # → present if wired, absent + PR says so if not
bun run check && bun run build                                  # → 0 errors, build succeeds
```

---

### S2 — `minion_site` adoption

**Tags:** `logic`, `docs` · **Estimate:** 4–6 h · **Files:** `minion_site/package.json`,
`minion_site/src/lib/services/member-gateway.svelte.ts`, PR description.

**Goal:** site runs a published `@minion-stack/shared` that exports `onEventError`, and has made an
explicit, recorded choice — preferring `reportGatewayError` if `2026-08-17-site-member-gateway-swallowed-errors-spec`
has shipped by the time this slice starts.

**Do:**

- **Slice-0 recon inside `minion_site`:**
  ```bash
  rg -n 'onEvent' minion_site/src/lib/services/member-gateway.svelte.ts
  rg -n '"@minion-stack/shared"' minion_site/package.json
  rg -n 'reportGatewayError' minion_site/src/lib/services/gateway-errors.ts 2>/dev/null
  ```
  If `reportGatewayError` exists (the sibling spec merged): that is the wiring target, per that
  spec's §4 ⚠️ A1 which named it explicitly. If it does not exist yet: either wait for that spec to
  land (parallelizable across the two proposals, not a hard block — §1), or accept the
  `console.error` default now and file a small follow-up to rewire once `reportGatewayError` exists.
  State which path was taken in the PR.
- **Bump** `@minion-stack/shared` to the S0-recorded version.
- **Wire** `onEventError: (err, frame) => reportGatewayError('event', err)` (or the equivalent stable
  `op` id the sibling spec settled on) if the sink exists; otherwise accept-and-record per above.
- Do not duplicate `reportGatewayError`'s classification/dedupe logic inline in
  `member-gateway.svelte.ts` — call the sink, do not reimplement it (mirrors that spec's own S1 rule).

**Definition of done (machine-checkable, run inside `minion_site`):**

```bash
rg -n '"@minion-stack/shared"' package.json
rg -n 'onEventError' src/lib/services/member-gateway.svelte.ts
bun run check
bun x vitest run src/lib/services   # site's existing gateway-errors suite (if present) stays green
```

---

### S3 — `paperclip-minion` adoption

**Tags:** `logic`, `docs` · **Estimate:** 5–7 h (largest — most unverified, largest behavioral delta
per the parent spec's ⚠️ A3) · **Files:** `paperclip-minion` adapter package manifest,
`packages/adapters/**` `minion_gateway` adapter file(s) (exact path is a Slice-0 output), PR
description.

**Goal:** the paperclip adapter runs a published `@minion-stack/shared` that exports `onEventError`,
and — because this is the consumer with the largest confirmed behavioral delta (§2 AS-IS: a
synchronous `onEvent` throw was previously an uncaught-exception candidate in a long-lived Node
process, and S1 already contains that regardless of whether paperclip bumps) — the PR explicitly
confirms the pre/post process behavior, not just the wiring.

**Do:**

- **Slice-0 recon inside `paperclip-minion`** (zero operator-memory leads exist for this repo's
  adapter shape — treat every line below as genuinely unknown, not "probably X"):
  ```bash
  rg -n 'onEvent|createNodeGatewayClient' paperclip-minion/packages/adapters -g '*minion_gateway*'
  rg -n '"@minion-stack/shared"' paperclip-minion/package.json paperclip-minion/packages/*/package.json
  ```
  Record: which package/file constructs the `GatewayClient` (or calls `createNodeGatewayClient`), what
  its `onEvent` does today, whether it has its own `try`/`catch`, and whether the adapter process has
  any existing crash/restart supervision (a systemd unit, PM2, `nodemon`, a k8s liveness probe) that
  would currently interpret "process exits" as a signal — because post-bump that signal changes to a
  log line (parent spec ⚠️ A3).
- **Bump** `@minion-stack/shared` to the S0-recorded version.
- **Decide and wire**, same two-option shape as S1/S2 — route `onEventError` into whatever error/log
  surface the adapter or its host process already uses (structured logger, plain `console.error`,
  Express error middleware if the adapter is on that request path), or accept the default explicitly.
- **Confirm the operational-signature change in the PR**, per parent spec ⚠️ A3: if a synchronous
  `onEvent` throw previously crashed/restarted the process, demonstrate (pre-bump vs post-bump, a
  deliberate throw in a dev/staging run — never production) that it now logs and survives instead.
  If nothing currently supervises this process for crashes, say so — the confirmation is still
  required, its content is just "no supervisor exists to be surprised."

**Definition of done (machine-checkable, run inside `paperclip-minion`):**

```bash
rg -n '"@minion-stack/shared"' package.json packages/*/package.json
rg -n 'onEventError' packages/adapters -g '*minion_gateway*'
pnpm typecheck   # or the adapter package's own typecheck script — Slice 0 confirms which
```

---

### S4 — Closeout

**Tags:** `docs` · **Estimate:** ≤ 1 h · **Files:**
`proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` (frontmatter + a closing note).

**Goal:** the proposal's Definition of Done is checked clause by clause against S1–S3's actual PRs and
closed on the record.

**Do:** once S1, S2, and S3 each have a linked, merged (or at minimum opened with a stated decision)
PR, edit the proposal's frontmatter (`status`, `updated`) and append the three PR links plus each
consumer's final posture (wired / accepted-default) to the body. Do not edit
`proposals/index.json` — the generator owns it.

**Definition of done:** the parent proposal's own three-line Definition of Done section reads true
with links, not placeholders; no consumer row still says "unverified — repo absent."

## 6. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This spec sits entirely in the row it names
itself: *"Gateway protocol (frame types, events) → `packages/shared/` → `minion_hub` + `minion_site` +
`paperclip-minion`"* — except no protocol surface changes here (§3 invariant 3); only each consumer's
local dependency pin and its own error-reporting wiring change.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `packages/shared` (this repo) | **None.** No file under `packages/shared/**` is touched by any slice | §3 invariant 4; §6 verification step 1 |
| `minion_hub` | Real, scoped to `package.json` + `gateway.svelte.ts` (+ optionally `gateway-errors.ts`) | S1; hub's existing `describeGatewayError` surface is the known extension point (§2 AS-IS, cited memory) |
| `minion_site` | Real, scoped to `package.json` + `member-gateway.svelte.ts`; sequencing note with the sibling swallowed-errors spec (§1) | S2 |
| `paperclip-minion` | Real, largest behavioral delta (process-crash → log-line), unverified adapter internals | S3; explicit pre/post confirmation required in the PR, not assumed from the shared client's containment alone |
| `minion/` gateway (server) | **None** — server-side frame handling is unchanged; this is purely client-side error-reporting wiring in three consumers | no file in `minion/` named by any slice |
| `@minion-stack/db`, `@minion-stack/auth` | **None** — no schema, query, or session-handling surface touched | — |
| `packages/design-tokens`, UI generally | **None** intended. S1/S2 explicitly forbid adding UI beyond a reporter call-site (§ S1, S2 "Do not"); if a consumer's Slice-0 recon decides a failure deserves UI surfacing, that is out of scope here (§7) | S1/S2 DoD checks stay to `.ts`/`.svelte.ts` files, no new `.svelte` file listed |

### ⚠️ Alert — this spec cannot itself verify anything in three of its four slices

S1, S2, and S3 all edit repos absent from this workspace. Every "Definition of done" command in §5 for
those slices is written to be **run by whoever has that repo checked out** — it cannot be executed or
its output confirmed from here. This spec's own runnable, verifiable slice is S0. This is not a defect
in the spec; it is the same structural condition the parent spec (⚠️ A1) and the site spec (⚠️ A1)
both already carried, restated here because it is now the *entire* remaining surface rather than one
flagged unknown inside a larger meta-repo change.

## 7. Out of scope (explicit)

- Everything the parent proposal's own "Out of scope" section excludes: event replay, awaiting
  `onEvent`, retry/backoff changes, the malformed-JSON discard, typed error classes, dedupe/throttling
  in the shared library, remote telemetry.
- **S2 of the onEvent-errors spec** (`onReconnectError` / `onSocketError`,
  `2026-08-17-gateway-client-lifecycle-swallows-handoff`) — a separate hook, a separate future
  consumer-adoption pass, not this one (§1).
- **Editing `packages/shared`** — S1–S3 of the parent spec already closed that surface; this spec only
  ever runs `git show`/`gh pr view` against it (S0), never edits it.
- **New UI for event-handler failures** in any consumer (a toast, a banner, a new popover case) beyond
  wiring the hook into an existing sink. If a consumer's own recon concludes the failure deserves new
  UI, that is a follow-up proposal in that consumer's own pipeline, not a rider on this bump.
- **Fixing `minion_hub`'s or `paperclip-minion`'s empty-catch equivalents of the site's three swallows**
  (the site's own bug class, `2026-08-17-site-member-gateway-swallowed-errors-spec` ⚠️ A2 already flags
  hub as an open audit item). Out of scope here; a sweep is separate work.
- **Retrying S0 indefinitely as this spec's job.** If the Version-Packages PR does not appear within a
  reasonable window, that is a release-pipeline problem for `2026-08-17-pkg-gateway-client-onevent-errors-spec`'s
  owner to chase, not something S1–S3 route around by pinning an unpublished version (e.g. a git/tarball
  dependency) — no slice here does that.

## 8. End-to-end verification

```bash
# 1. The gate (runnable from minion-meta, no consumer repo needed)
cd /home/agent/work
gh pr list --state merged --search "version packages" --limit 5 | rg -q . \
  && echo "S0: a Version-Packages PR history exists — confirm ONE post-dates #29 (2026-08-17) per §5 S0" \
  || { echo "S0 FAIL: no Version-Packages PR yet — do not proceed to S1-S3"; exit 1; }

# 2. Per-consumer (run from inside each repo, once checked out — cannot run from here, see §6 alert)
#    minion_hub:            bun run check && bun run build
#    minion_site:            bun run check && bun x vitest run src/lib/services
#    paperclip-minion:       pnpm typecheck (adapter package)
#    Each: rg -n '"@minion-stack/shared"' package.json  → the S0-recorded version, not 0.9.x
#    Each: PR description states the onEventError decision (wired-to-<sink> | accepted-default)

# 3. Closeout
rg -n 'status:' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md   # → updated, not "approved"
```

**Ship gate:**

1. S0 green before any of S1–S3 starts (or re-confirmed independently before each, if they start on
   different days).
2. Each of S1–S3 has a linked PR in its own repo recording an explicit `onEventError` decision — wired
   or accepted-default — never a silent bump.
3. Paperclip's PR (S3) additionally confirms the pre/post process-crash behavior per ⚠️ A3.
4. S4's proposal-closeout edit lands, and no consumer row still reads "unverified — repo absent."
5. No slice touches `packages/shared/**` or `proposals/index.json` / `specs/index.json`.
