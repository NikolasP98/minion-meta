# Plugin Distribution, Compatibility & CI/CD — Design Spec

**Date:** 2026-06-15
**Status:** Draft for review
**Author:** orchestrator (grounded in code recon, see Appendix A for citations)
**Related:** [`specs/2026-06-14-plugin-ui-cdn-caching-design.md`](2026-06-14-plugin-ui-cdn-caching-design.md) (the CDN/caching seam this builds on)

---

## 0. TL;DR

1. **Decouple the plugin UI from the gateway artifact.** Today the npm package `@nikolasp98/minion` bundles every plugin's runtime **and** built UI (`files: ["extensions/", "extensions/*/ui/dist/**"]`). "Deploying the gateway" ships all plugins. We split distribution.
2. **CDN vs NPM is a false binary — use both, for different jobs.**
   - **NPM = the versioning, compatibility, and update backbone** (semver + lockfiles + Renovate). This is what "maximize compatibility" and "promote updates" actually require.
   - **CDN = an optional serving/caching layer** in front of whoever holds the bytes. Orthogonal to versioning.
3. **Add the compatibility layer that doesn't exist today:** a versioned **bridge protocol**, a **`minGatewayVersion`/capability** field in manifests, handshake **negotiation**, and **graceful degradation** instead of silent RPC failure.
4. **Add an update layer:** a registry of `installed` vs `available` plugin versions, surfaced in the hub as "update available → promote," driven by automated dependency PRs.
5. **Unify CI/CD** across gateway / hub / plugins / shared packages: one release model (changesets), a cross-repo **compatibility matrix** gate, automated + **zero-downtime** gateway deploy (blue-green via the Caddy layer we just stood up, which sidesteps the boot embed-storm), and Renovate-driven promotion.

---

## 1. Problem statement

Three independently-deployed surfaces — **gateway** (`minion`, CalVer, netcup global-install), **hub** (`minion_hub`, SvelteKit/Vercel), and **plugins** (`extensions/*`) — share an implicit contract (the bridge protocol + gateway RPC methods) with **zero version enforcement**. The result:

- A plugin UI update can only ship by rebuilding+redeploying the whole gateway (they're bundled).
- A gateway RPC change can silently break a plugin UI with no detection (the bridge has no version, the loader has no compat check).
- There is no way to know a plugin update exists, or to promote it safely.
- CI/CD is three disjoint pipelines with drifting shared-package versions and a manual prod deploy.

Goal: a rigorous, mostly-automated pipeline where gateway, hub, and plugins **stay up to date, prove compatibility before promotion, and surface/apply updates whenever available.**

---

## 2. Current architecture (ground truth)

### 2.1 What a "plugin" is

A plugin = **runtime** (server-side: `register(api)`, RPC handlers, channels — runs *inside* the gateway process) **+ UI** (`ui/dist/`, a static Svelte SPA in an iframe). See Appendix A.

| Part | Mobility | Why |
|---|---|---|
| Runtime (`extensions/<id>/index.ts` → `index.js`, manifest) | **Stays in gateway** | Executes in-process; registers RPC/channels/hooks |
| UI (`extensions/<id>/ui/dist/`) | **Decouplable** | Static SPA; talks only via postMessage bridge → host → gateway WS |

So "don't package the plugins" can only mean **don't package the plugin UI dist** — the runtime is inseparable from the gateway.

### 2.2 How it's coupled today

- **npm package** `@nikolasp98/minion` `files` includes `"extensions/"` + `"extensions/*/ui/dist/**"` → bundles all 8 plugin UIs (~6.3 MB) + runtimes into the gateway artifact.
- **Gateway serves UIs from disk** at runtime: `plugin-ui-static.ts` reads `<pluginInstallRoot>/extensions/<id>/ui/dist/`.
- **`deploy-bot-prd.sh`** ships **only `dist/`** (gateway code) — never `extensions/`. So incremental deploys leave plugins frozen at the last `npm i -g`; refreshing UIs needs a separate manual rsync. (Coupled at the package level, decoupled at the rsync level — the inconsistency behind past "STUDIO 404" incidents.)
- **Hub** discovers plugins **live** via gateway RPC `plugins.ui.list`; builds the iframe src from `PUBLIC_PLUGIN_UI_BASE_URL || gatewayUrl` (the seam we already shipped); groups nav by manifest `slot`/`category`; enables/disables via `plugins.config.set`. **No version awareness, no update detection.**

### 2.3 The (missing) contract

- **Bridge protocol** (`@nikolasp98/plugin-ui-bridge` v0.2.0, **unpublished**, **duplicated** in `minion_hub/src/lib/plugins/bridge-protocol.ts`): `host:hello` / `plugin:ready` / `host:rpc-response` / `plugin:rpc-request` / etc. **No `protocolVersion`, no negotiation, no capability list.** Only optional-field tolerance (e.g. `locale?`).
- **Gateway RPC methods** called by string name via `bridge.call(...)` — the real break surface. Remove/rename a method → plugin fails silently with an RPC error.
- **Loader** copies `manifest.version` to the runtime record but **never validates** it against the gateway.

### 2.4 CI/CD reality

| Surface | CI | Release | Deploy |
|---|---|---|---|
| Meta (`@minion-stack/*`) | `ci.yml` (build/typecheck/lint/test/changeset:status) | **Automated** — changesets → "Version Packages" PR → npm publish | n/a |
| Gateway (`minion`) | Comprehensive (`ci.yml`: protocol:check, multi-OS tests, docker digest pin); `plugin-ui-dist-check.yml` | `npm-publish.yml` semi-auto (main→`latest`, DEV→`dev` w/ timestamp); CalVer `stamp-version.ts` | **Manual** `deploy-bot-prd.sh` (netcup, dist/ only) **or** automated `deploy-production.yml` (Docker/GHCR, separate servers) |
| Hub (`minion_hub`) | `ci.yml` (check + build) | none | Vercel on git push |
| Plugins | folded into gateway CI | none independent | bundled in gateway |

**Drift:** shared `0.8.0`; gateway `@minion-stack/shared@^0.6.0`; hub `@minion-stack/shared@^0.5.0` + `@minion-stack/db` **pinned to a `.tgz` tarball** (`0.5.1-pg`). No compatibility matrix anywhere.

---

## 3. The distribution decision: CDN vs NPM

**They answer different questions. Don't pick one — layer them.**

| Question | Answered by |
|---|---|
| *Which exact version of a plugin UI is this, and is it compatible with this gateway?* | **NPM** (semver + lockfile + manifest compat field) |
| *How do updates propagate and get promoted?* | **NPM** (Renovate/Dependabot PRs + changesets) |
| *Who serves the static bytes, and how fast/cheap?* | **CDN** (edge cache in front of the serving origin) |
| *Where does the browser fetch the iframe from?* | **Hub seam** (`PUBLIC_PLUGIN_UI_BASE_URL`) → CDN **or** gateway |

### 3.1 Why NPM is the backbone (not CDN)

The user's explicit goals — *maximize compatibility* and *promote updates whenever available* — are **dependency-management problems**, and npm + semver + lockfiles + Renovate is the canonical, batteries-included solution:

- **Immutable, versioned artifacts** (`@minion-plugins/whatsapp-ui@1.4.2`) — reproducible, auditable, rollback-able.
- **Lockfile pinning** = the gateway/hub records the exact plugin UI versions it was tested against → compatibility is *pinned*, not hoped-for.
- **Semver ranges + Renovate** = automated update PRs, gated by CI, merged on green. This *is* the "plugin update layer."
- **No bespoke registry** — npm is the registry, GitHub is the audit trail, changesets is the release ritual we already run for `@minion-stack/*`.

A **raw CDN alone can't do versioning or compatibility** — it just holds the latest bytes at a path. (We also already hit operational friction making the CF free-tier zone cache at all — see the related spec. CDN is worth it for serving, but it cannot be the source of truth.)

### 3.2 Why CDN still earns its place

- **Edge caching** of immutable, content-hashed assets → fast first-paint globally, less origin load.
- **Serving origin flexibility** — the hub seam already lets assets come from a CDN host without touching the gateway WS.
- It sits **in front of** whatever serves the bytes (gateway, an R2 bucket, CF Pages). Versioning lives in npm; the CDN just accelerates delivery of a chosen version.

### 3.3 Recommended model — "NPM-pinned, CDN-served"

```
@minion-plugins/<id>            (npm pkg: runtime + manifest + ui dist; semver)
        │  published on changeset merge (CI)
        ├─► gateway depends on it (lockfile-pinned) ──► installs runtime + serves/optionally-uploads UI
        └─► UI dist also synced to CDN bucket at /plugins/<id>/<version>/ui/*  (versioned path)
                                                   │
hub  ── plugins.ui.list (gateway) gives {id, version, uiBaseUrl?} ──► PluginIframe loads
        PUBLIC_PLUGIN_UI_BASE_URL (CDN) + /plugins/<id>/<version>/ui/...  (version in path = cache-safe forever)
```

- **Distribution & version truth:** npm. The gateway's `package.json` + lockfile pins which plugin versions it ships → "deploying the gateway" pulls *those* versions, not the monorepo's working-tree dist.
- **Serving:** CDN (versioned path → trivially immutable; no cache-invalidation problem; sidesteps the `DYNAMIC` fight since each version is a new URL).
- **Compatibility:** enforced by the layer in §4, validated in CI by the matrix in §6.

> **Decision needed (Q1):** do plugins ship as **one package each** (runtime+UI together) or **split** (`@minion-plugins/<id>-runtime` + `@minion-plugins/<id>-ui`)? Recommendation: **one package, two export paths** — simplest version story (one number per plugin), UI dist is just files in the package the CDN-sync step uploads. Split only if a plugin's UI must update independently of its runtime *often*.

---

## 4. Compatibility layer (new — none exists today)

Four mechanisms, smallest-blast-radius first:

### 4.1 Versioned bridge protocol (foundational)

1. **Publish `@minion-stack/plugin-ui-bridge`** (currently v0.2.0, unpublished) and **delete the hub's inlined copy** — both sides import the one package. Kills the drift risk and makes the protocol a real, versioned contract.
2. Add `protocolVersion` (integer, bump on breaking change) to `host:hello`, and have plugins echo the version they were built against in `plugin:ready`.
3. **Negotiate:** host and plugin compare; on major mismatch the host renders a clear "this plugin needs a newer/older host" panel instead of a broken iframe.

### 4.2 Manifest compatibility field

Extend `define-manifest.ts` with:
```ts
compat?: {
  minGatewayVersion?: string;   // e.g. ">=2026.6.0"
  bridgeProtocol?: string;      // e.g. "^1"
  requiredRpc?: string[];       // gateway methods this UI calls
}
```
- **Gateway loader** validates `minGatewayVersion`/`bridgeProtocol` at load → records an `incompatible` status (not just `enabled`/`disabled`/`error`) instead of loading blindly.
- **Hub** reads compat from `plugins.ui.list` and **gates rendering** with an actionable message rather than letting RPC calls fail silently.

### 4.3 Capability advertisement (kills silent RPC failure)

- Gateway exposes a `capabilities` set (supported RPC methods + feature flags) via the connect handshake or a `system.capabilities` RPC.
- Plugin declares `requiredRpc`; host checks the intersection **before** mounting → "needs gateway ≥ X" instead of a spinner that never resolves.
- This is the single highest-value fix: today removing/renaming a gateway RPC silently breaks UIs with no signal.

### 4.4 Update detection & promotion (the "update layer")

- Extend `plugins.ui.list` to return `{ id, installedVersion, availableVersion?, compat }`. `availableVersion` comes from the npm dist-tag / CDN version index the release pipeline writes.
- Hub surfaces **"update available"** per plugin (settings + nav badge) and a **Promote** action that opens/*triggers* the dependency bump (or, for hub-served CDN, flips the version in the path) — gated on `compat` being satisfiable.
- This finally makes the mock marketplace real, backed by npm dist-tags rather than a hardcoded array.

---

## 5. The decoupling change (concrete)

Ordered so nothing breaks mid-flight:

1. **Publish the bridge** (`@minion-stack/plugin-ui-bridge`), repoint hub + plugins to the npm package, delete the inlined copy. *(Net-zero behavior; removes drift.)*
2. **Add the compat fields + negotiation** (§4.1–4.3), defaulting to permissive (absent compat = "assume compatible") so existing plugins keep working.
3. **Per-plugin packaging:** give each `extensions/<id>` a publishable `package.json` + changeset; CI builds UI + publishes `@minion-plugins/<id>` on merge. *(UI dist stays the build output — now an artifact, not committed source.)*
4. **CDN sync step:** release pipeline uploads `ui/dist` to `<cdn>/plugins/<id>/<version>/ui/*` (versioned path).
5. **Gateway consumes plugins as deps** (semver, lockfile-pinned) instead of monorepo-bundled; `plugins.ui.list` returns the installed version + a CDN `uiBaseUrl` (versioned).
6. **Trim the gateway artifact:** remove `"extensions/*/ui/dist/**"` from `files` and stop committing dist (drop/replace `plugin-ui-dist-check.yml`). Keep `plugin-ui-static.ts` only as a **localhost/dev fallback**.
7. **Flip the hub seam** to the CDN base once it's authoritative.

> **Ordering caveat (carried from the CDN spec):** the gateway is the default UI origin today. The CDN/npm path must be **live and authoritative before** the dist is removed from the package, or unconfigured hubs 404.

> **Decision needed (Q2):** keep UI dist **also** inside the gateway package as a built-in fallback (bigger artifact, always-works offline) vs **CDN-only** (lean artifact, hard dependency on CDN reachability)? Recommendation: **dev-fallback only** — gateway serves UIs from `node_modules` in local/offline mode; prod uses CDN.

---

## 6. Unified CI/CD pipeline

### 6.1 Principles

- **One release ritual:** extend the meta-repo **changesets** model to plugins (and align the gateway's CalVer as a *build stamp* layered over a semver-tracked compat contract — see Q3).
- **Compatibility is a gate, not a hope:** no artifact is promoted to prod until a **matrix job** proves the combination works.
- **Promotion is automated and observable:** Renovate opens the bumps; CI proves them; a promote workflow advances DEV → main → prod on green.
- **Deploys are zero-downtime:** never again take the prod gateway down into a 5-minute boot embed-storm during business hours (see the incident in §7).

### 6.2 Per-plugin pipeline (new)

```
PR touching extensions/<id>/**:
  build UI (vite) ─ unit tests ─ manifest validate (_schemaChecksum, compat fields)
  ─ bridge-protocol contract test (build against pinned @minion-stack/plugin-ui-bridge)
  ─ require a changeset
merge to main:
  changesets → version bump → publish @minion-plugins/<id> to npm
  → CDN-sync ui/dist to /plugins/<id>/<version>/ui/*
  → write version index (dist-tag) consumed by §4.4 update detection
```

### 6.3 Compatibility matrix (new — the centerpiece)

A workflow (triggered on any gateway / bridge / plugin release, plus nightly) that asserts the **deployable set** is mutually compatible:

```
for gateway in {current-prod, candidate}:
  for bridge protocolVersion in supported-range:
    for each plugin in lockfile:
      assert plugin.compat.bridgeProtocol  ⊇ gateway.bridgeProtocol
      assert plugin.compat.minGatewayVersion ≤ gateway.version
      assert plugin.requiredRpc ⊆ gateway.capabilities   # generated from the RPC registry
  → produce a COMPATIBILITY-REPORT; block promotion on any ✗
```
- `gateway.capabilities` is generated from the RPC registry (`api.rpc.define` + manifest `mcpTools`) at build → a machine-checkable list, not tribal knowledge.
- This is the gate that makes "maximize compatibility" real.

### 6.4 Gateway pipeline (evolve existing)

- Keep the comprehensive CI; **add** the compat-matrix gate and a `capabilities.json` emit step.
- **Automate the netcup deploy** (replace manual `deploy-bot-prd.sh`) with a GH Actions job on DEV/main → SSH deploy, **blue-green via Caddy**:
  1. install candidate gateway under a second versioned path / second port,
  2. start it, **wait for readiness** (memory/embed init settled — the §7 storm happens *off the serving path*),
  3. flip Caddy's `reverse_proxy` upstream to the new port (atomic, zero-downtime),
  4. health-check, keep the old instance for instant rollback, then retire it.
  *(This directly reuses the Caddy reverse-proxy layer stood up in the CDN work, and structurally prevents the incident in §7.)*
- Un-pin shared deps (consume `@minion-stack/*` from npm at aligned versions).

### 6.5 Hub pipeline (evolve existing)

- Keep `check` + `build`; **un-pin** `@minion-stack/db` from the `.tgz` tarball → consume from npm so Renovate can update it.
- Add a **contract test**: hub host built against the same `@minion-stack/plugin-ui-bridge` version range as plugins; fail build on protocol-major drift.
- Vercel preview per PR (already implicit) becomes the integration surface for the matrix.

### 6.6 Promotion & update propagation (Renovate + changesets)

- **Renovate** across all three repos: opens PRs to bump `@minion-stack/*`, `@minion-plugins/*`, and the bridge. CI (incl. the matrix) gates each.
- **Changesets** drive versioning/publish for `@minion-stack/*`, `@minion-plugins/*`, and the bridge.
- A **promote workflow** advances DEV → main → prod only when the compatibility report for the target set is green — and triggers the blue-green gateway deploy.

### 6.7 Version alignment (resolve the drift)

- Single source of truth via changesets; Renovate keeps gateway/hub caret ranges current (`shared@^0.8`, not `^0.5`/`^0.6`).
- **Q3 (decision):** does the **gateway** adopt semver for its *compat contract* (separate from its CalVer *build stamp*)? Recommendation: yes — CalVer stays the human/build label; a `bridgeProtocol` + `capabilities` semver is what the matrix actually checks. Decouples "when was this built" from "what does it promise."

---

## 7. Operational guardrail — the boot embed-storm (incident 2026-06-15)

Restarting the prod gateway re-runs **boot-time `qmd` memory embedding for every agent** (23 agents, each timing out ~60s, 4 concurrent), spiking load to ~19 and starving WS handshakes (`closed before hello`) for several minutes. Any automated deploy **must not** cut user traffic into a cold-booting gateway. The **blue-green via Caddy** design (§6.4) makes this structural: traffic only flips to the new instance after readiness, and the storm runs off the serving path. (Separately worth a follow-up: make boot embedding lazy/bounded so cold start isn't a thundering herd.)

---

## 8. Phased rollout

| Phase | Deliverable | Risk |
|---|---|---|
| **P0** | Publish `@minion-stack/plugin-ui-bridge`; delete hub inlined copy; both import it | Low (net-zero behavior) |
| **P1** | Compat fields + handshake `protocolVersion` + capability advertisement; permissive defaults | Low (back-compat by design) |
| **P2** | Per-plugin npm packaging + changesets + per-plugin CI; CDN versioned-path sync | Med (new publish surface) |
| **P3** | Gateway consumes plugins as pinned deps; trim `files`; flip hub seam to CDN | Med (the actual decoupling; needs CDN authoritative first) |
| **P4** | Compatibility-matrix gate + Renovate + promote workflow | Med (cross-repo orchestration) |
| **P5** | Blue-green Caddy gateway deploy (zero-downtime; kills the embed-storm exposure) | Med (deploy rewrite) |
| **P6** | Hub update-detection UI (installed vs available → Promote); real marketplace | Low (UI on existing data) |

P0–P1 are pure wins with no decoupling commitment and unblock everything else.

---

## 9. Open decisions (need your call)

- **Q1 — plugin packaging:** one package per plugin (runtime+UI) [recommended] vs split runtime/UI packages.
- **Q2 — gateway UI fallback:** dev-only fallback [recommended] vs always-bundled fallback (bigger artifact).
- **Q3 — gateway versioning:** add a semver compat contract alongside CalVer [recommended] vs keep CalVer only.
- **Q4 — CDN origin:** keep CF-in-front-of-gateway (current, versioned paths) vs a dedicated bucket (R2/CF Pages) the release pipeline writes to directly [recommended for clean decoupling].
- **Q5 — scope/sequencing:** ship P0–P1 now as standalone wins, or commit to the full P0–P6 program?

---

## Appendix A — Recon citations

**Manifest / loader / versioning (minion):**
- `src/plugin-sdk/define-manifest.ts:29-71` — manifest schema (no compat field).
- `scripts/generate-plugin-manifests.ts` — manifests generated from TS.
- `src/plugins/loader.ts:188-575` — discover/validate/load; **no gateway↔plugin version check** (version copied at ~278-299, never validated).
- `src/plugins/manifest.ts:55-74` — `PluginCategory` set; inferred when omitted.
- `scripts/sync-plugin-versions.ts` — stamps all plugins with the gateway CalVer; `scripts/stamp-version.ts` — `yyyy.M.d` + registry collision check.
- `package.json` `files: ["dist/","extensions/","extensions/*/ui/dist/**","skills/",…]`; UI dist committed; `plugin-ui-static.ts:62` serves `<pluginInstallRoot>/extensions/<id>/ui/dist/`.

**Bridge / contract (minion + minion_hub):**
- `minion/packages/plugin-ui-bridge/src/index.ts` (v0.2.0, **unpublished**) — messages: `host:hello`/`host:theme-change`/`host:locale-change`/`host:rpc-response`/`host:save`, `plugin:ready`/`plugin:resize`/`plugin:notify`/`plugin:rpc-request`/`plugin:dirty-changed`/`plugin:save-result`. **No `protocolVersion`/negotiation.**
- `minion_hub/src/lib/plugins/bridge-protocol.ts` — inlined duplicate ("until that package is published"); drops `safeClone()` (DataCloneError risk).
- `minion_hub/src/lib/plugins/PluginIframe.svelte:24-69,174-191,250-255` — `forwardRpc`; iframe src from `PUBLIC_PLUGIN_UI_BASE_URL || gatewayUrl`; per-method timeouts.

**Hub discovery / CI (minion_hub + meta):**
- `minion_hub/src/routes/api/plugins/ui-list/+server.ts` + `src/lib/server/gateway-rpc.ts:245-255` — live `plugins.ui.list`; **no caching/versioning**.
- `src/lib/state/plugin-nav.svelte.ts:3-46` — nav grouped by manifest `slot`; one-shot fetch, no re-poll.
- `src/routes/api/plugins/[id]/toggle/+server.ts` — enable/disable = gateway `plugins.config.set`.
- `src/routes/(app)/marketplace/plugins/+page.svelte` — **mock** (hardcoded array).
- meta `.github/workflows/{ci,release}.yml` — changesets publish for `@minion-stack/*`.
- gateway `.github/workflows/{ci,npm-publish,plugin-ui-dist-check,deploy-production}.yml`; `deploy-bot-prd.sh` (manual, dist/ only).
- Version drift: shared `0.8.0`; gateway `@minion-stack/shared@^0.6.0`; hub `^0.5.0` + `@minion-stack/db` `file:…0.5.1-pg.tgz`.
