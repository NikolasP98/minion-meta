---
id: 2026-08-19-gateway-client-error-hook-consumer-adoption-spec
title: "Adopt the GatewayClient onEventError hook in hub, site and paperclip (S3 consumer handoff)"
stage: spec
status: approved
pass: 2
created: 2026-08-19
updated: 2026-08-19
proposal: 2026-08-17-gateway-client-error-hook-consumer-adoption
verdict: approved
repos: [minion_hub, minion_site, paperclip]
relationship: depends-on
related: [2026-08-17-pkg-gateway-client-onevent-errors-spec, 2026-08-17-site-member-gateway-swallowed-errors-spec, 2026-08-19-gateway-client-lifecycle-swallows-handoff-spec]
type: fix
---

# Adopt the `onEventError` hook in the three `@minion-stack/shared` consumers

## 1. Relationship recommendation

- **`2026-08-17-pkg-gateway-client-onevent-errors-spec`** (approved, pass 2, `repos: [minion-meta]`) —
  **depends-on**. That spec's S1 is the code this proposal exists to adopt; its S3 is the changeset
  and the very proposal this spec implements. This spec's Slice 0 is a hard gate on that code first
  reaching `main` and then having actually **published** (§2 AS-IS below) — not merely merging its
  implementation PR to `dev`. This spec supersedes
  nothing in the parent spec and edits none of its files (`packages/shared/**`); it starts exactly
  where that spec's §4 impact table left off ("nothing changes until a consumer bumps").
- **`2026-08-17-site-member-gateway-swallowed-errors-spec`** (approved, pass 2, `repos: [minion_site]`)
  — **related, not depends-on**. Its §4 ⚠️ A1 names `reportGatewayError` as "the obvious wiring
  target" for `minion_site`'s slice below, and its own status is `approved`/not yet `merged` — so
  `reportGatewayError` may not exist in `minion_site` yet when this spec's site slice starts. The site
  slice below treats that function's existence as a Slice-0 recon question, not an assumption, so this
  spec does not block on that one shipping first. If the sink is absent, accepting the default is one
  of this proposal's complete postures; this spec does not create an implicit rewiring follow-up.
- **`2026-08-19-gateway-client-lifecycle-swallows-handoff-spec`** (draft, pass 1,
  `repos: [minion-meta]`) — **related, not depends-on**. It implements S2 of the onEvent-errors spec
  (`onReconnectError` / `onSocketError`) and is explicitly out of this proposal's scope (proposal's own
  "Out of scope" section). Named here only so a future reader does not conflate the two hooks: if S2
  ships, it is a **second**, separate consumer-adoption pass, not an amendment to this one.

No existing spec already covers hub/site/paperclip adopting `onEventError` — this is new work, gated
on an external event (a real npm publish) rather than on another draft.

## 2. AS-IS

**The hook exists on `minion-meta`'s `dev` line and is not yet on `main` or published.** Verified in
this checkout and against GitHub
(`packages/shared/src/gateway/client.ts:38,289-304`; `packages/shared/package.json:3`;
`.changeset/gateway-client-event-error-hook.md`; PR #29 metadata and the `main` branch contents):

- S1 merged to **`dev`**, not `main`, via PR #29
  ("factory: auto: pkg-gateway-client-onevent-errors-spec S1") on 2026-08-19.
  `onEventError?: (err, frame) => void | Promise<void>` is a real option on the `dev`/checkout
  `GatewayClientOptions`, with the two-arm sync/async containment and the never-throw
  `reportEventError` private reporter, exactly as `2026-08-17-pkg-gateway-client-onevent-errors-spec`
  §S1 specified. GitHub `main` does not yet contain the option. Promotion to `main` is therefore part
  of S0's prerequisite chain, not an accomplished fact.
- **S2 has not shipped.** `client.ts:251-255` and `:330-335` still carry
  `// TODO(handoff): ... carried forward as S2 in proposals/2026-08-17-gateway-client-lifecycle-swallows-handoff.md`
  — `onReconnectError` / `onSocketError` do not exist yet. Irrelevant to this spec (§1), noted so a
  slice below does not accidentally assume they exist.
- **The changeset is written on `dev` but has not reached the release branch — the hook release has
  NOT published.**
  `.changeset/gateway-client-event-error-hook.md` exists on disk (`"@minion-stack/shared": minor`,
  proposal-quality release prose naming `onEventError`). This checkout's `package.json` reads
  `0.9.0`, but remote `main` and npm are already `0.10.0` from Version-Packages PR #18, merged
  2026-08-13 for an unrelated shared-package change. Thus the checkout version is not release-state
  evidence. No exact-title `chore: version packages` PR after #29 exists for this changeset. Per memory
  `/memory/MINION/minion-meta-changeset-release-flow.md` (★★★), publishing a
  changeset is **two merges to `main`**: (1) promote the feature + changeset from `dev` to `main` —
  not done by #29; (2) merge the automated "Version Packages" PR, after which the release workflow
  runs `changeset publish` — also not done. Per the same memory, a merged Version-Packages PR
  is necessary but is not alone proof of publication: the publish workflow has failed on npm auth in
  the past. Until the workflow succeeds and the registry artifact is verified, no consumer may assume
  that an npm version exports `onEventError`.
  - `@minion-stack/shared@0.10.0` is a valid earlier release: remote `main`'s changelog identifies its
    Unified Brains change, PR #18's release workflow succeeded, and its registry tarball does **not**
    contain `onEventError`. It must not be selected merely because it is the latest tag. Slice 0
    discovers and inspects the later exact version that contains this hook.
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
    `/memory/MINION/gateway-connect-error-ui-and-jwt-required.md` and
    `/memory/MINION/hub-connection-status-dot-popover.md`. Those surfaces map **connection health**,
    not `onEvent` handler failures. An event-handler failure must not set connect-error state or make a
    healthy socket appear disconnected; hub's Slice-0 recon must instead find a generic logger/sink or
    accept the default. Whether hub's own
    `onEvent` callback already wraps itself in `try`/`catch` is unverified — repo absent.
  - `minion_site` (`src/lib/services/member-gateway.svelte.ts`, ~373 LOC pre-migration per
    `specs/ws-duplication-audit.md:120`) is mid-remediation on the **same failure class**:
    `2026-08-17-site-member-gateway-swallowed-errors-spec` (approved, not yet merged) is building
    `src/lib/services/gateway-errors.ts` with a `reportGatewayError(op, value, onFailure)` sink and
    wrapping the module's own `onEvent` body in `try`/`catch`. §1 above states this spec's site slice
    does not block on that one merging first.
  - `paperclip-minion`'s adapter is carried in `specs/ws-duplication-audit.md` as
    `packages/adapters/minion-gateway`, package `@paperclipai/adapter-minion-gateway`, with a thin
    `gateway-client.ts` re-export shim using `@minion-stack/shared/node`; the audit also records a
    paperclip-specific `onLog` surface. Those are dated leads, not current facts, because the repo is
    absent. The actual `onEvent` shape, error sink, dependency range, and process behavior remain
    unverified. Parent spec §4 ⚠️ A3 says a sync throw **may** have affected the process and requires
    confirmation; it does not establish that a crash or restart occurred.

## 3. TO-BE

Each of the three consumers has a merged PR in its own repo whose manifest and lockfile resolve
`@minion-stack/shared` to a registry version whose published declarations contain `onEventError`.
Each PR either (a) wires the hook into a semantically appropriate existing error/reporting surface,
or (b) explicitly accepts the `console.error` fallback. The recon table in the parent proposal (the
"unverified — repo absent" grid) is filled in with real values for all three consumers.

**Invariants that must not change** (restated from the proposal, binding on every slice below):

1. No consumer starts logging full event payloads — the fallback names the event only; a consumer
   that chooses to log the whole frame via its own `onEventError` is making a deliberate, separate
   choice, not something this work does for it.
2. No consumer awaits, buffers, or reorders `onEvent` dispatch — `onEventError` is a reporting hook,
   not a delivery-semantics change.
3. No protocol, frame-type, or reconnect-timing behavior changes in any consumer.
4. No slice here edits `packages/shared/**` — that surface is owned and closed by the parent spec.
5. A reporting choice must not alter connection-health state: an `onEvent` handler failure does not
   imply that the WebSocket disconnected.

## 4. DELTA

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| 1 | The exact package version containing `onEventError` is published to npm | S0 | Version-Packages PR and successful release workflow are linked; `npm view @minion-stack/shared@<version>` succeeds with `--prefer-online`; that version's registry tarball contains `onEventError` in `dist/gateway/client.d.ts` |
| 2 | `minion_hub` adopts the published version and records its posture | S1 | merged hub PR; manifest + lockfile resolve the S0 version; PR records wired sink or accepted default; build/check pass |
| 3 | `minion_site` adopts the published version and records its posture | S2 | merged site PR; same dependency evidence and decision record, naming `reportGatewayError` only if it exists; check/build and applicable focused tests pass |
| 4 | `paperclip-minion` adopts the published version and records its posture | S3 | merged paperclip PR; same dependency evidence and decision record; focused adapter gate passes; PR records the observed, not presumed, result of the sync-throw probe |
| 5 | This proposal closes with all three consumers accounted for, no "unverified — repo absent" left | S4 | all three PRs are merged and linked; the parent proposal's Definition of Done is checked clause by clause in the proposal |

S1–S3 do not depend on each other and may run in parallel once S0 is satisfied; each is independently
shippable per-repo. S4 is a closeout that reads the other three, not new code.

---

## 5. Approach — five vertical slices

```
S0 (gate: confirm the release actually published) ─▶ S1 (hub) ─┐
                                                      S2 (site) ─┼─▶ S4 (closeout)
                                                      S3 (paperclip) ─┘
```

### S0 — Confirm publish; do not let anyone bump against an unpublished hook

**Tags:** `infra` · **Estimate:** ≤ 1 h · **Files:**
`proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` (record the verified version
and release evidence; verification commands run from `minion-meta`)

**Goal:** a hard, machine-checkable gate that stops S1–S3 from starting against a version of
`@minion-stack/shared` that does not actually export `onEventError` yet — the exact trap the AS-IS
section's `npm view` discrepancy flags.

**Do:**

```bash
cd /home/agent/work
gh api -X GET repos/NikolasP98/minion-meta/contents/packages/shared/src/gateway/client.ts \
  -f ref=main -H 'Accept: application/vnd.github.raw+json' | rg 'onEventError'
#   → promotion from dev to the release branch has happened
release_pr="$(gh pr list --repo NikolasP98/minion-meta --state merged --limit 100 \
  --json number,title,mergedAt,mergeCommit,url \
  -q '.[] | select(.title == "chore: version packages" and .mergedAt > "2026-08-19T03:11:35Z")')"
test -n "$release_pr"
printf '%s\n' "$release_pr"
#   → choose the exact-title Version-Packages PR after #29; --search alone also matches #29's body
#   → the chosen PR must touch packages/shared/package.json and CHANGELOG.md
gh pr view <that PR> --repo NikolasP98/minion-meta --json files \
  -q '.files[].path' | rg 'packages/shared/(package\.json|CHANGELOG\.md)'
gh api -X GET repos/NikolasP98/minion-meta/contents/packages/shared/CHANGELOG.md \
  -f ref=<that PR merge sha> -H 'Accept: application/vnd.github.raw+json' | rg -A3 'onEventError'
#   → the release entry names onEventError (it may also name hooks added before the same release)
gh api -X GET repos/NikolasP98/minion-meta/contents/packages/shared/package.json \
  -f ref=<that PR merge sha> -H 'Accept: application/vnd.github.raw+json' | rg '"version"'
#   → record <version>
gh run list --repo NikolasP98/minion-meta --workflow release.yml \
  --commit <that PR merge sha> --limit 10 --json conclusion,url \
  -q '.[] | select(.conclusion == "success") | .url' | rg -q .
#   → at least one successful publish workflow for the Version-Packages merge
npm view @minion-stack/shared@<version> version --prefer-online | rg -x '<version>'
tarball="$(npm view @minion-stack/shared@<version> dist.tarball --prefer-online)"
curl -fsSL "$tarball" | tar -xzO package/dist/gateway/client.d.ts | rg 'onEventError'
#   → the exact registry artifact, not only the source/changelog, exports the hook
```

**Definition of done (machine-checkable):** every command above succeeds, and the exact published
version is recorded in the proposal before any consumer bump. If the Version-Packages PR is absent,
the release workflow failed, or the registry artifact lacks the declaration, **stop** — S1–S3 do not
start. This is a polling gate, not a one-shot check; re-run the exact-version registry checks before
starting each of S1–S3 independently, since they may run days apart. This gate follows
`/memory/MINION/minion-meta-changeset-release-flow.md` (★★★): the second merge triggers publication,
but only a successful workflow plus registry inspection proves that publication completed.

---

### S1 — `minion_hub` adoption

**Tags:** `logic`, `docs` · **Estimate:** 4–6 h · **Files:** `minion_hub/package.json` and
`minion_hub/bun.lock` (dependency bump), `minion_hub/src/lib/services/gateway.svelte.ts` (only if
wired rather than accepted), an existing generic reporter/test file if recon identifies one, and the
PR description (the decision record).

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
  What version is currently pinned? Confirm whether `gateway-errors.ts` is still connection-specific
  and find any generic logger/reporting surface. Do not treat connection UI as generic merely because
  it already displays errors.
- **Bump** `@minion-stack/shared` so the manifest range and regenerated `bun.lock` resolve to at least
  the exact version S0 recorded.
- **Decide, in the PR description, one of:**
  - Pass `onEventError` to an existing generic logger/reporter that does not mutate connection status;
    record the sink and prove one failing handler produces one report without logging `frame.payload`;
    or
  - accept the `console.error` default explicitly, and say so, so the new console output is not later
    filed as a regression.
- **Do not** touch hub's connect/close error paths, connection-health state,
  `describeGatewayError`'s cases, or any `.svelte` UI. If no generic sink exists, accept the default;
  introducing a new UI/reporting subsystem is outside this slice (§7).

**Definition of done (machine-checkable, run inside `minion_hub`):**

```bash
rg -n '"@minion-stack/shared"' package.json                     # → range includes the S0 version
rg -n '@minion-stack/shared' bun.lock                            # → lockfile updated and committed
bun install --frozen-lockfile
node -p "require('./node_modules/@minion-stack/shared/package.json').version" # → >= S0 version
rg -n 'onEventError' node_modules/@minion-stack/shared/dist/gateway/client.d.ts
# Wired path: rg finds onEventError and the PR links focused test/probe evidence.
# Accepted-default path: rg has no match and the PR explicitly says accepted-default.
rg -n 'onEventError' src/lib/services/gateway.svelte.ts || true
bun run check && bun run build                                  # → check/build succeed
```

---

### S2 — `minion_site` adoption

**Tags:** `logic`, `docs` · **Estimate:** 4–6 h · **Files:** `minion_site/package.json`,
`minion_site/bun.lock`, `minion_site/src/lib/services/member-gateway.svelte.ts` (only if wired),
applicable existing gateway-error tests, and the PR description.

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
  If `reportGatewayError` exists (the sibling spec merged), it is the preferred wiring target named by
  that spec. If it does not exist, either wait or accept the default as this proposal already permits;
  accepting the default is a complete posture, not an implicit follow-up. State the chosen path.
- **Bump** `@minion-stack/shared` so the manifest range and regenerated `bun.lock` resolve to at least
  the exact version S0 recorded.
- **If wiring**, use `onEventError: (err) => reportGatewayError('event', err)` (or the equivalent
  stable `op` id the sibling spec settled on). Do not retain an unused `frame` parameter or log the
  frame/payload. Otherwise leave the option absent and record accepted-default.
- Do not duplicate `reportGatewayError`'s classification/dedupe logic inline in
  `member-gateway.svelte.ts` — call the sink, do not reimplement it (mirrors that spec's own S1 rule).

**Definition of done (machine-checkable, run inside `minion_site`):**

```bash
rg -n '"@minion-stack/shared"' package.json                     # → range includes the S0 version
rg -n '@minion-stack/shared' bun.lock                            # → lockfile updated and committed
bun install --frozen-lockfile
node -p "require('./node_modules/@minion-stack/shared/package.json').version" # → >= S0 version
rg -n 'onEventError' node_modules/@minion-stack/shared/dist/gateway/client.d.ts
# Wired path: onEventError is present and the existing gateway-errors test is run.
# Accepted-default path: onEventError is absent and the PR explicitly says accepted-default.
rg -n 'onEventError' src/lib/services/member-gateway.svelte.ts || true
bun run check && bun run build
test ! -f src/lib/services/gateway-errors.test.ts || bun x vitest run src/lib/services/gateway-errors.test.ts
```

---

### S3 — `paperclip-minion` adoption

**Tags:** `logic`, `docs` · **Estimate:** 5–7 h (most unverified consumer) · **Files:** the manifest
that owns `@paperclipai/adapter-minion-gateway`, `paperclip-minion/pnpm-lock.yaml`,
`packages/adapters/minion-gateway/src/server/**` only if wired, applicable adapter tests, and the PR
description. Slice-0 recon confirms the current paths before editing.

**Goal:** the paperclip adapter resolves a published `@minion-stack/shared` that exports
`onEventError`, records its reporting posture, and confirms whether the parent spec's conditional
Node-process impact actually applies; no crash/restart outcome is presumed.

**Do:**

- **Slice-0 recon inside `paperclip-minion`** (the paths below are dated leads from
  `specs/ws-duplication-audit.md`; confirm rather than assume them):
  ```bash
  rg -n 'onEvent|createNodeGatewayClient|GatewayClient|onLog' \
    paperclip-minion/packages/adapters/minion-gateway
  rg -n '"@minion-stack/shared"' paperclip-minion/package.json \
    paperclip-minion/packages/adapters/minion-gateway/package.json \
    paperclip-minion/packages/*/package.json
  rg -n '"(typecheck|test[^" ]*)"' paperclip-minion/package.json \
    paperclip-minion/packages/adapters/minion-gateway/package.json
  ```
  Record: which package/file constructs the `GatewayClient` (or calls `createNodeGatewayClient`), what
  its `onEvent` does today, whether it has its own `try`/`catch`, which existing log sink and focused
  test command apply, and whether repo-owned deployment configuration keys alerts/health to process
  exits. If runtime supervision is outside the repo and unavailable, record it as unverified rather
  than asserting that none exists.
- **Bump** `@minion-stack/shared` so the owning manifest range and regenerated `pnpm-lock.yaml`
  resolve to at least the exact version S0 recorded.
- **Decide and wire**, same two-option shape as S1/S2 — route `onEventError` into whatever error/log
  surface the adapter already uses (including its carried `onLog` surface if recon confirms it fits),
  or accept the default explicitly. Do not route an asynchronous WebSocket event through Express
  request middleware.
- **Confirm the conditional operational signature in the PR**, per parent spec ⚠️ A3. Using the
  existing adapter test harness or a local non-production probe, make the consumer `onEvent` throw
  synchronously and record whether the pre-bump consumer already contains it. Post-bump, assert one
  report and process/test survival. If no pre-bump crash occurs because the consumer already catches,
  state that the hypothesized crash-to-log delta does not apply. Record repo-owned supervision impact
  separately; do not infer external deployment state.

**Definition of done (machine-checkable, run inside `paperclip-minion`):**

```bash
rg -n '"@minion-stack/shared"' package.json packages/*/package.json
rg -n '@minion-stack/shared' pnpm-lock.yaml
pnpm install --frozen-lockfile
pnpm --filter @paperclipai/adapter-minion-gateway list @minion-stack/shared --depth 0
pnpm --filter @paperclipai/adapter-minion-gateway exec \
  rg -n 'onEventError' node_modules/@minion-stack/shared/dist/gateway/client.d.ts
# Wired path: onEventError is present under packages/adapters/minion-gateway and the probe sees the sink.
# Accepted-default path: onEventError is absent and the PR explicitly says accepted-default.
rg -n 'onEventError' packages/adapters/minion-gateway || true
pnpm typecheck
pnpm --filter @paperclipai/server test:run -- \
  src/__tests__/minion-gateway-adapter.test.ts                 # → sync-throw probe passes
# If recon finds that this dated audit path/script moved, record and run its exact replacement.
```

---

### S4 — Closeout

**Tags:** `docs` · **Estimate:** ≤ 1 h · **Files:**
`proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` (frontmatter + a closing note).

**Goal:** the proposal's Definition of Done is checked clause by clause against S1–S3's actual PRs and
closed on the record.

**Do:** once S1, S2, and S3 each have a linked, merged PR and their post-merge dependency/build
evidence is recorded, edit the proposal's frontmatter (`status`, `updated`) and append the three PR
links, resolved versions, and each consumer's final posture (wired / accepted-default) to the body.
An opened-but-unmerged PR does not make the proposal's "all three consumers are on" claim true. Do not edit
`proposals/index.json` — the generator owns it.

Set the proposal to `status: done`; `approved`/`in-spec` describe unfinished lifecycle states, while
`closed` is also used for non-implemented dispositions.

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
| `minion_hub` | Real: manifest + `bun.lock`; `gateway.svelte.ts` and generic reporter/test only if wired | S1; connection-error state is explicitly not a valid sink because handler failure does not imply disconnection |
| `minion_site` | Real: manifest + `bun.lock`; `member-gateway.svelte.ts` and existing gateway-error test only if wired; sequencing note with sibling spec (§1) | S2 |
| `paperclip-minion` | Real: owning manifest + `pnpm-lock.yaml`; adapter source/test only if wired; Node process delta conditional and unverified | S3; observed pre/post result required, no crash assumption |
| `minion/` gateway (server) | **None** — server-side frame handling is unchanged; this is purely client-side error-reporting wiring in three consumers | no file in `minion/` named by any slice |
| `@minion-stack/db`, `@minion-stack/auth` | **None** — no schema, query, or session-handling surface touched | — |
| `packages/design-tokens`, UI generally | **None.** S1/S2 forbid UI changes; a new visual surface is out of scope (§7) | no `.svelte` UI file is listed in any slice |

### ⚠️ Alert — this checkout cannot execute the three consumer slices

S1, S2, and S3 all edit repos absent from this workspace. Every "Definition of done" command in §5 for
those slices is written to be **run by whoever has that repo checked out** — it cannot be executed or
its output confirmed from here. S0 is executable here now; S4 becomes executable here only after the
three external PRs supply their evidence. This is the same structural condition the parent spec
(⚠️ A1) and the site spec (⚠️ A1) both already carried, restated here because the consumer work is
the entire remaining code surface rather than one flagged unknown inside a larger meta-repo change.

## 7. Out of scope (explicit)

- Everything the parent proposal's own "Out of scope" section excludes: event replay, awaiting
  `onEvent`, retry/backoff changes, the malformed-JSON discard, typed error classes, dedupe/throttling
  in the shared library, remote telemetry.
- **S2 of the onEvent-errors spec** (`onReconnectError` / `onSocketError`,
  `2026-08-19-gateway-client-lifecycle-swallows-handoff-spec`) — separate hooks and a separate future
  consumer-adoption pass, not this one (§1).
- **Editing `packages/shared`** — the shared-client specs own that surface; this spec only performs
  read-only GitHub/npm inspection against it (S0), never edits it.
- **UI for event-handler failures** in any consumer (a toast, banner, popover case, or repurposed
  connection-health state). If recon concludes the failure deserves UI, that is a separate proposal.
- **Fixing `minion_hub`'s or `paperclip-minion`'s empty-catch equivalents of the site's three swallows**
  (the site's own bug class, `2026-08-17-site-member-gateway-swallowed-errors-spec` ⚠️ A2 already flags
  hub as an open audit item). Out of scope here; a sweep is separate work.
- **Retrying S0 indefinitely as this spec's job.** If the Version-Packages PR does not appear, its
  release workflow does not succeed, or the registry artifact is absent, that is a release-pipeline
  problem for `2026-08-17-pkg-gateway-client-onevent-errors-spec`'s owner to chase. S1–S3 must not
  route around it with a git/tarball dependency.

## 8. End-to-end verification

```bash
# 1. The gate (runnable from minion-meta, no consumer repo needed): execute every S0 command,
# including successful release-workflow lookup and exact registry-tarball declaration inspection.

# 2. Per-consumer (run from inside each repo, once checked out — cannot run from here, see §6 alert)
#    minion_hub:            bun run check && bun run build
#    minion_site:            bun run check && bun run build; gateway-errors test when present
#    paperclip-minion:       pnpm typecheck + Slice-0-recorded focused adapter test
#    Each: frozen install + lockfile/resolved-version proof for the S0 version
#    Each: PR description states the onEventError decision (wired-to-<sink> | accepted-default)

# 3. Closeout
rg -n 'status:|unverified — repo absent|https://github.com/.*/pull/' \
  proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
# → status: done, zero unverified rows, three merged PR links
```

**Ship gate:**

1. S0 green before any of S1–S3 starts (or re-confirmed independently before each, if they start on
   different days).
2. Each of S1–S3 has a linked, merged PR recording an explicit `onEventError` decision — wired or
   accepted-default — plus manifest/lockfile resolution and the required consumer gate evidence.
3. Paperclip's PR (S3) records the observed pre/post sync-throw behavior per ⚠️ A3; it does not claim a
   crash-to-log change unless the pre-bump probe demonstrates one.
4. S4's proposal-closeout edit lands, and no consumer row still reads "unverified — repo absent."
5. No slice touches `packages/shared/**` or `proposals/index.json` / `specs/index.json`.
