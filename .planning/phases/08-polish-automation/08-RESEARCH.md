# Phase 8: Polish & Automation - Research

**Researched:** 2026-04-21
**Domain:** Meta-repo CI + changesets release automation + `minion doctor` polish + onboarding docs for a pnpm workspace publishing `@minion-stack/*` packages to npm
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 8.** This phase was spawned without a `/gsd-discuss-phase` pass. The planner should either run `/gsd-discuss-phase` first or treat this research as the scoping basis. Phase 8 is low-risk (CI + docs) and the success criteria are already well-defined in ROADMAP.md / REQUIREMENTS.md, so skipping discuss and planning directly from research is reasonable.

Scope inferred from the roadmap + success criteria:

- **Scope:** Meta-repo only (`/home/nikolas/Documents/CODE/AI/` root). Subproject CI is out of scope — Phase 3 already stood up hub/site/minion/paperclip/pixel-agents CI against published `@minion-stack/*` versions and those workflows are owned by the respective subproject repos.
- **Packages in scope:** The seven workspace packages under `packages/*` — `@minion-stack/cli`, `@minion-stack/env`, `@minion-stack/tsconfig`, `@minion-stack/lint-config`, `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth`.
- **Branch model:** single `main` branch (meta-repo already set `baseBranch: main` in `.changeset/config.json`), PRs against `main`, merges to `main` trigger publish.
- **npm scope:** `@minion-stack` (already registered and all seven packages already published). Access: `public` (already set in changeset config).
- **Publish strategy:** changesets-driven, per-package independent semver. **Not** fixed / linked groups.
- **Onboarding target:** <10 minutes from `git clone` to `minion dev <id>` successfully launching a subproject.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-01 | Meta-repo CI runs lint-all, typecheck-all, and changesets-status on every PR | No `.github/workflows/` directory exists yet [VERIFIED: `ls -la /home/nikolas/Documents/CODE/AI/` shows no `.github` entry]. Need to scaffold from scratch. Pattern: GitHub Actions + pnpm 10 + Node 22 setup + workspace-aware scripts. Current root `package.json` has `changeset:status` script but no `lint-all` / `typecheck-all`. |
| POLISH-02 | Changesets release automation publishes `@minion-stack/*` packages on merge to main | `@changesets/cli@^2.27.0` already configured (v2.31.0 latest) [VERIFIED: `npm view @changesets/cli version`]. `.changeset/config.json` present, one open changeset staged (`ws-consolidation-0.3.0.md`). Standard pattern: `changesets/action@v1.7.0` with `publish: pnpm release:publish` env `NPM_TOKEN` + `GITHUB_TOKEN`. |
| POLISH-03 | `minion doctor` surfaces env validation, link drift, and subproject health in a single report | `doctor.ts` already implements env resolution + Infisical-CLI check + INFISICAL_* auth-var check + link-drift via `detectLinkDrift` + pm-binary check [VERIFIED: `packages/cli/src/commands/doctor.ts`]. Gap: link-drift scans only the old 4 packages (`MINION_PKGS = ['tsconfig', 'lint-config', 'env', 'cli']`) — missing `shared`, `db`, `auth`. Also missing: git status summary, CI status, subproject clone-presence (currently prints warnings on missing subprojects). |
| POLISH-04 | Root `CLAUDE.md` final rewrite reflects the steady-state workflow (not the migration narrative) | Current `CLAUDE.md` still references `minion-shared/` as its own directory (line 12 of Project Map) despite it being folded into `packages/shared` in Phase 4. Still lists "Future phases (M3+) add `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth`" (line 62) despite all three being published. Also lists old ai-studio/docs scope and pre-meta-repo conventions. Needs full rewrite. |
| POLISH-05 | Developer onboarding: clone → `minion dev` in under 10 minutes for a new dev | Current `README.md` has a 7-step quickstart that is mostly accurate. Unverified steps: npm install global CLI (network + 2FA?), Infisical Universal Auth configuration (requires dashboard visit), subproject clone (requires SSH keys set up for NikolasP98 or HTTPS auth), `minion doctor`. Need a timed dry-run with a scratch user or fresh shell profile to verify. |

</phase_requirements>

---

## Summary

Phase 8 is the final "make the system production-ready and self-serve" milestone. The meta-repo has been under heavy migration across Phases 1–7 and now has seven published `@minion-stack/*` packages, a working `minion` CLI, a functioning 6-layer env system, and green tests across all subprojects. **None of the automation that would keep this state from drifting exists yet.** Specifically: no `.github/workflows/` directory at the meta-repo root, `minion doctor`'s link-drift scanner is missing the three packages added in Phases 4–6, and the root `CLAUDE.md` is frozen at its Phase-2 shape with stale "future phases" language.

Phase 8 is **low technical risk, high clarity, low surprise**. Every piece is a well-trodden pattern: GitHub Actions + pnpm + changesets is the standard monorepo publish story ([VERIFIED: pnpm.io docs]), `minion doctor` extensions are pure code-adds against existing infrastructure, and the docs are a rewrite of already-understood material. The main execution risk is the onboarding timing test (POLISH-05) — which depends on human factors (SSH keys, npm login, Infisical dashboard access) that the research can only document, not pre-verify.

**Primary recommendation:**
1. Create `.github/workflows/ci.yml` (lint + typecheck + build + test + `changeset status`) triggered on PR to main. Use `pnpm/action-setup@v4.4.0` + `actions/setup-node@v4` with `node-version: 22`.
2. Create `.github/workflows/release.yml` (changesets publish) triggered on push to main. Use `changesets/action@v1.7.0` with `publish: pnpm release:publish` + `NPM_TOKEN` + `GITHUB_TOKEN`. Because npm requires 2FA on the `@minion-stack` scope, decide now: either generate an automation token (bypasses 2FA for publish) or switch to npm trusted publishing / OIDC (`id-token: write` permission — public packages only, which is our case).
3. Add workspace-aware root scripts: `lint-all` (ruby: `pnpm -r --parallel run lint` — but no package currently has a `lint` script, so actually use `pnpm -r --parallel exec oxlint .` or add per-package `lint` scripts), `typecheck-all` (`pnpm -r --parallel --if-present run typecheck`), `test-all` (`pnpm -r --parallel --if-present run test`), `build-all` (`pnpm -r --parallel run build`).
4. Extend `doctor.ts`: update `MINION_PKGS` to include `shared`, `db`, `auth`; add `git status --porcelain` summary row per subproject; add clone-presence detection so missing subprojects are clearly flagged (not auth-failure-masked).
5. Rewrite root `CLAUDE.md` in "steady state" voice — remove migration narrative, update Project Map (minion-shared folded), update shared-packages list (add shared/db/auth with versions), clarify what lives at the root vs what lives in subprojects.
6. Run a literal timed dry-run of the `README.md` quickstart from a fresh shell profile (empty `~/.config/minion/`, unset `INFISICAL_*` env, use `bash --noprofile --norc`). Record each step's wall time. If any step exceeds budget (e.g., `npm install -g` is slow, or Infisical dashboard UX is unclear), add a doc patch.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@changesets/cli` | 2.31.0 (repo has 2.27.0) | Local changeset authoring + versioning + publish CLI | Already adopted repo-wide; 2.31.0 current [VERIFIED: `npm view @changesets/cli version`] |
| `changesets/action` | v1.7.0 | GitHub Action that opens a "Version Packages" PR and publishes on merge | Canonical pattern for changesets + GHA [VERIFIED: https://github.com/changesets/action/releases — v1.7.0 released Feb 12, v1.6.0 Jan 21] |
| `actions/checkout` | v4 | Standard checkout action | Universal |
| `actions/setup-node` | v4 | Sets up Node.js with optional cache integration | Universal |
| `pnpm/action-setup` | v4.4.0 | Installs pnpm — required because meta-repo is pnpm workspace | v4.4.0 latest [VERIFIED: https://github.com/pnpm/action-setup/releases — v4.4.0 released March 13]. Pattern: pin major (`@v4`) or minor (`@v4.4.0`); pinning minor is safer for reproducible CI |
| `@changesets/changelog-github` | 0.6.0 | Optional: richer changelog format with PR links | Current changelog uses `@changesets/cli/changelog` (plain) — can upgrade but not required for POLISH-01/02 [VERIFIED: `npm view @changesets/changelog-github version`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `concurrently` | 9.2.1 | Parallel script runner | Already a `@minion-stack/cli` dep (for `minion <cmd> --all`) — can reuse for root `*-all` scripts, though `pnpm -r --parallel` is the idiomatic alternative [VERIFIED] |
| `oxlint` | peer in `@minion-stack/lint-config` | Fast Rust-based linter | Already the project-wide choice per `@minion-stack/lint-config` [VERIFIED: `packages/lint-config/package.json`] |
| `prettier` | peer | Formatter | Already in use; can be wired into CI `lint` step |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pnpm -r --parallel` for fanout | root-level `concurrently` scripts | `pnpm -r --parallel` is the idiomatic pnpm monorepo pattern and automatically respects workspace topology. Use it. `concurrently` stays for the `minion` CLI's cross-subproject fanout where each subproject has a different PM. |
| `changesets/action@v1` (unpinned major) | Pin to `v1.7.0` | Unpinned major survives future non-breaking updates; pinned minor/patch survives breaking ones. GitHub's own Actions docs recommend pinning to a full SHA for maximal security, minor for balance. Recommendation: pin to `@v1.7.0` (matches other actions in the workflow). |
| npm trusted publishing / OIDC (id-token: write) | Long-lived `NPM_TOKEN` secret | OIDC removes the need to rotate a leaked token; requires public packages (✓ all our packages are public). OIDC requires npm CLI >= 11.5 and trusted publisher config in npmjs.com UI. If 2FA is enforced on the scope, classic tokens need an **automation** token flavor (which bypasses 2FA for publish only). Phase 8 should pick one; OIDC is forward-looking but adds web-UI configuration burden — `NPM_TOKEN` is pragmatic. [CITED: https://pnpm.io/using-changesets, https://docs.npmjs.com/trusted-publishers] |
| Separate per-package CI | Single meta-repo CI matrix | Meta-repo is tiny (7 packages, all TS, all tested with vitest); single workflow with `pnpm -r` fanout is simpler and faster than matrix expansion. |
| Release-Please (Google) | changesets | changesets already live in this repo with staged changeset files + dependent phases (03–07) used it. Switching tools is out of scope. |

**Installation / scripts to add:**

Root `package.json` additions:
```json
"scripts": {
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:studio": "drizzle-kit studio",
  "changeset": "changeset",
  "changeset:status": "changeset status --since=origin/main",
  "release:publish": "changeset publish",
  "release:version": "changeset version",
  "lint-all": "pnpm -r --parallel --if-present run lint",
  "typecheck-all": "pnpm -r --parallel --if-present run typecheck",
  "test-all": "pnpm -r --parallel --if-present run test",
  "build-all": "pnpm -r run build",
  "ci": "pnpm run typecheck-all && pnpm run test-all && pnpm run build-all && pnpm run changeset:status"
}
```

Per-package `lint` script additions (where missing) — **none of the seven packages currently define `lint`**:
```json
"lint": "oxlint ."
```
[VERIFIED: `grep -r '\"lint\"' packages/*/package.json` returns zero matches — a real gap that POLISH-01 must address]

---

## Architecture Patterns

### Recommended Project Structure

```
/home/nikolas/Documents/CODE/AI/
├── .github/                       ← NEW
│   └── workflows/
│       ├── ci.yml                 ← on: pull_request (lint-all, typecheck-all, build-all, test-all, changeset-status)
│       └── release.yml            ← on: push to main (changesets/action → version PR or publish)
├── .changeset/
│   ├── config.json                ← already correct (baseBranch: main, access: public)
│   ├── README.md
│   └── *.md                       ← staged changesets (ws-consolidation-0.3.0.md present)
├── package.json                   ← add lint-all / typecheck-all / test-all / release:version / ci scripts
├── pnpm-workspace.yaml            ← unchanged
├── packages/
│   ├── cli/                       ← existing; add "lint" script; extend doctor.ts
│   ├── env/                       ← existing; add "lint" script
│   ├── tsconfig/                  ← existing; no lint/test possible (JSON-only), ensure CI skips gracefully via --if-present
│   ├── lint-config/               ← existing; add self-lint script
│   ├── shared/                    ← existing; add "typecheck"/"lint" scripts
│   ├── db/                        ← existing; add "typecheck"/"lint" scripts
│   └── auth/                      ← existing; add "typecheck"/"lint" scripts
├── minion.json                    ← unchanged; already authoritative subproject registry
├── CLAUDE.md                      ← REWRITE for steady-state
└── README.md                      ← UPDATE with verified timings + exact prerequisites
```

### Pattern 1: CI workflow (`.github/workflows/ci.yml`)

**What:** Runs on every PR against `main`; gates merges.
**When to use:** This is the canonical pattern for a pnpm workspace publishing to npm.

```yaml
# .github/workflows/ci.yml
# Source: pnpm.io/using-changesets + pattern adopted in hub/site/paperclip CI
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # changesets needs history for --since=origin/main

      - uses: pnpm/action-setup@v4.4.0
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm run build-all

      - name: Typecheck
        run: pnpm run typecheck-all

      - name: Lint
        run: pnpm run lint-all

      - name: Test
        run: pnpm run test-all

      - name: Changesets status (block PRs missing a changeset)
        if: github.event_name == 'pull_request'
        run: pnpm run changeset:status
```

**Why this shape:**
- `fetch-depth: 0` is required for `changeset status --since=origin/main` to diff against history [CITED: changesets FAQ].
- `cache: 'pnpm'` uses pnpm's content-addressable store for warm-cache installs.
- `concurrency` cancels stale runs on force-push, saving minutes.
- `build-all` runs **before** typecheck because `@minion-stack/auth`'s dev deps include `@minion-stack/db` as workspace — downstream packages need upstream dists to typecheck cleanly.

### Pattern 2: Release workflow (`.github/workflows/release.yml`)

```yaml
# .github/workflows/release.yml
# Source: changesets/action README, pnpm.io/using-changesets
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false   # don't cancel an in-flight publish

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write          # for creating the Version Packages PR
      pull-requests: write     # same
      id-token: write          # OPTIONAL: for npm trusted publishing / OIDC
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4.4.0
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm run build-all

      - name: Create Release PR or Publish
        uses: changesets/action@v1.7.0
        with:
          version: pnpm run release:version
          publish: pnpm run release:publish
          commit: "chore: release @minion-stack packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**How changesets/action@v1.7.0 works** [CITED: https://github.com/changesets/action]:
1. Scans `.changeset/*.md` on every push to main.
2. If changesets are present → opens (or updates) a "Version Packages" PR that runs `release:version` (which consumes the `.md` files and bumps `package.json` versions + appends `CHANGELOG.md`).
3. When that PR is merged → the action re-triggers, detects no remaining changesets, runs `release:publish` (which runs `changeset publish` → `npm publish` per package with bumped version).
4. It automatically uses `secrets.GITHUB_TOKEN` as of v1.7.0 even if not explicitly passed.

### Pattern 3: Doctor polish (extending `packages/cli/src/commands/doctor.ts`)

**What:** Make `minion doctor` the one-stop health check mandated by POLISH-03.

**Gaps in current implementation** [VERIFIED: `packages/cli/src/commands/doctor.ts` + `packages/cli/src/lib/link-drift.ts`]:

1. **`MINION_PKGS` array is stale** (`['tsconfig', 'lint-config', 'env', 'cli']`). Must add `'shared', 'db', 'auth'` — all three are now published and consumed by subprojects. Without this, hub's `@minion-stack/shared` and `@minion-stack/db` installs are invisible to link-drift detection.

2. **Missing subprojects are misclassified.** If a subproject hasn't been cloned (legitimate — the README tells new devs to clone only what they need), `resolveEnv()` may fail, and the row gets an `err` vars column and a generic warning. Distinguish **not-cloned** (expected, → `-` row) from **cloned but broken** (→ actionable warning).

3. **No git status summary in the doctor table.** `minion status` already shows this separately; POLISH-03 specifies a **single command** — fold a column like `git: clean|5-dirty|3-ahead` into the doctor table (reuse code from `status.ts`).

4. **No CI status.** The roadmap's POLISH-03 line says "CI status" as one of the four columns (env validation, link drift, subproject git status, CI status). The minimum impl: `gh run list --repo <remote> -L 1 --json conclusion,status` per subproject — optional because it requires `gh` + network. Probably gate behind `--ci` flag or `MINION_DOCTOR_CI=1` env.

### Pattern 4: Lint script standardization

**Current state:** Zero packages define `lint`. `lint-config` package defines presets but nothing is wired up.

**Fix:** Add a `lint` script to each package:

| Package | Proposed `lint` | Rationale |
|---------|-----------------|-----------|
| `cli` | `oxlint src test` | oxlint already a peer dep of lint-config |
| `env` | `oxlint src test` | same |
| `shared` | `oxlint src` | same |
| `db` | `oxlint src` | same |
| `auth` | `oxlint src` | same |
| `tsconfig` | (no source) — skip via `--if-present` | JSON-only package, no TS to lint |
| `lint-config` | (self-config) — skip via `--if-present` | config package; would be lint-itself recursion |

Running `pnpm -r --parallel --if-present run lint` at the root skips packages without the script.

### Anti-Patterns to Avoid

- **Running `pnpm recursive install` in CI instead of `pnpm install --frozen-lockfile`** — drops the lockfile consistency check and silently updates transitive versions in CI.
- **Publishing without `--frozen-lockfile`** — can produce drift between CI tests and published artifacts.
- **Omitting `fetch-depth: 0` from checkout** — `changeset status` fails with cryptic errors because it can't diff against `origin/main`.
- **Using `GITHUB_TOKEN` to push to protected main** — if main is branch-protected with required reviews, even the action's PR can't auto-merge without a dedicated bot/PAT. Either disable protection on the "Version Packages" PR or use a dedicated GitHub App token. Meta-repo main does **not** appear to be protected yet (single-maintainer solo repo) — confirm with user before enabling protection.
- **Coupling CI to `minion` CLI** — CI should use raw `pnpm` commands, not `minion dev`, because `minion dev` depends on `@minion-stack/env` being built + Infisical auth configured in CI. Subprojects use the CLI; the meta-repo itself does not.
- **Missing `packageManager` field drift** — `package.json` pins `pnpm@10.15.0` but action-setup uses `version: 10`. Either align (pin `10.15.0` in action), or use `packageManager` auto-detection (set `version: latest` and let Corepack / action-setup pick up `packageManager`). Recommendation: pin `version: 10` (matches `engines.pnpm: ">=10.0.0"`) — don't sub-pin unless reproducibility requires it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo version bumps + changelog generation | A custom script that reads `packages/*/package.json` and bumps versions | `changeset version` (already wired) | Handles internal dep version updates (`updateInternalDependencies: "patch"` in config), semver logic, changelog merging |
| Parallel workspace scripts | A bash `for` loop iterating `packages/*` | `pnpm -r --parallel --if-present run <script>` | Built-in; respects workspace topology; handles missing scripts via `--if-present` |
| "Version Packages" auto-PR | A custom workflow that diffs `.changeset/` and opens PRs | `changesets/action@v1.7.0` | Solved problem; maintained; handles idempotent PR updates |
| Detecting missing changesets in PRs | A regex over commit messages | `changeset status --since=origin/main` | Official; understands package dependencies |
| Linting a TS monorepo | A custom oxlint wrapper | `oxlint` + standardized `lint` script per package | Already the project choice; `pnpm -r` dispatches |
| CI matrix for Node versions | A matrix strategy with multiple Node versions | Single Node 22 job | `engines.node: ">=22.0.0"` everywhere; matrix is wasted |
| Detecting stale link-drift across subprojects | A custom PM-scanning script | `detectLinkDrift()` in `packages/cli/src/lib/link-drift.ts` | Already built, just needs the `MINION_PKGS` list updated |
| Timing onboarding automatically | A Playwright test that runs `git clone` | Manual timed dry-run with a stopwatch | The 10-min criterion is a one-shot verification, not continuous. Automating introduces flakiness for zero ongoing value. Record timings in a markdown proof. |

**Key insight:** Every Phase 8 task except the `doctor` extensions and docs is built on top of tools we've already committed to (changesets, pnpm workspaces, GitHub Actions). The research here is mostly configuration + verification, not library selection.

---

## Runtime State Inventory

Phase 8 is **not** a rename/refactor phase — it's an additive automation phase. No runtime state migration is required. For completeness:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — phase only adds CI files + script edits + doctor code changes | None |
| Live service config | **GitHub repo settings**: secrets `NPM_TOKEN` + Actions permissions (read + write needed for Release PR creation) must be set via repo settings UI at github.com/NikolasP98/minion-meta/settings | Human action — document in README / phase plan |
| OS-registered state | None | None |
| Secrets/env vars | `NPM_TOKEN` (new GitHub repo secret — generate on npmjs.com with "automation" scope to bypass 2FA at publish time); `GITHUB_TOKEN` (auto-provided by Actions) | Human action — capture in plan |
| Build artifacts / installed packages | `pnpm-lock.yaml` will update when `lint-all`/`typecheck-all` scripts are added + per-package `lint` scripts added — commit the new lockfile; `dist/` regenerated on next build | Commit lockfile in same PR |

**Nothing found in category:** Stored data, OS-registered state — verified by inspection.

---

## Common Pitfalls

### Pitfall 1: npm 2FA blocks automated publish

**What goes wrong:** `pnpm publish` during `changesets/action` fails with `EOTP` because the `@minion-stack` scope has 2FA enforced.
**Why it happens:** Default npm tokens (classic or granular) trigger 2FA on publish. Automation tokens are specifically designed to bypass 2FA for CI use.
**How to avoid:** Generate an npm token with type = **automation** at https://www.npmjs.com/settings/NikolasP98/tokens. Store as `NPM_TOKEN` GitHub secret.
**Warning signs:** Publish step logs show `npm notice This command requires you to provide a one-time password` or HTTP 401 with 2FA challenge.
[VERIFIED: user memory confirms 2FA pattern — `project_minion_meta_repo_design.md` references checkpoint: "user must run 'cd packages/cli && npm publish --access public' to ship @minion-stack/cli@0.1.0 (2FA)". Phase 8 eliminates that by using automation tokens.]

### Pitfall 2: `changeset status` fails on CI with "not a git repository" / history errors

**What goes wrong:** `changeset status --since=origin/main` errors because CI checkout is shallow (`fetch-depth: 1` default).
**Why it happens:** changesets diffs against a git ref; shallow checkout has no `origin/main` ref.
**How to avoid:** `uses: actions/checkout@v4` + `with: { fetch-depth: 0 }`.
**Warning signs:** Error strings containing `fatal: ambiguous argument 'origin/main'` or `cannot find --since reference`.

### Pitfall 3: GitHub Actions cannot push to protected `main`

**What goes wrong:** `changesets/action` tries to open the Version PR but the push fails because `main` requires PR reviews or status checks.
**Why it happens:** By default `GITHUB_TOKEN` cannot bypass branch protection.
**How to avoid:** Either (a) allow the default Actions token to bypass protection on "Version Packages" branches, or (b) configure a dedicated GitHub App with `bypass` permissions and pass its token as `githubToken:` input.
**Warning signs:** Action fails with `refusing to allow a GitHub App to create or update workflow ... without workflows permission`, or 403 pushing to branch.
**Current state:** `NikolasP98/minion-meta` is a solo repo with no branch protection visible — verify with `gh api repos/NikolasP98/minion-meta/branches/main/protection` before enabling protection. **Recommend: don't enable protection until Phase 8 release workflow is confirmed green.**

### Pitfall 4: `pnpm install --frozen-lockfile` fails when scripts added without lockfile refresh

**What goes wrong:** Adding devDependencies or script-invoked binaries (e.g., oxlint as peer) without running `pnpm install` locally first → lockfile mismatch → CI fails.
**Why it happens:** `--frozen-lockfile` refuses any discrepancy; adding a peer or dev dep updates lockfile.
**How to avoid:** Run `pnpm install` locally after every `package.json` edit; commit the lockfile in the same PR.
**Warning signs:** `ERR_PNPM_OUTDATED_LOCKFILE`.

### Pitfall 5: `--if-present` still errors on typed violations

**What goes wrong:** `pnpm -r --parallel --if-present run lint` with a broken `lint` script in one package fails the whole run, not just that package.
**Why it happens:** `--if-present` skips **missing** scripts, not **failing** ones.
**How to avoid:** `--if-present` is correct behavior — failures should surface. Ensure every `lint` script is known-green before the first CI run.
**Warning signs:** CI red on a random package.

### Pitfall 6: oxlint defaults are too permissive for CI gating

**What goes wrong:** oxlint with no config passes trivially because it only checks a narrow default ruleset.
**Why it happens:** oxlint is fast-and-friendly by default.
**How to avoid:** Point per-package `lint` script at `@minion-stack/lint-config/oxlint-preset.json`: `oxlint -c node_modules/@minion-stack/lint-config/oxlint-preset.json src` (or simpler: copy the preset to each package's `.oxlintrc.json` as a one-liner `{ "extends": ["@minion-stack/lint-config/oxlint-preset.json"] }` if that syntax is supported; oxlint's `extends` behavior should be verified with a test run).
**Warning signs:** CI green but obviously broken code slips through locally.

### Pitfall 7: `fetch-depth: 0` pulls extremely deep history and slows CI

**What goes wrong:** Large repos waste minutes on full clone.
**Why it happens:** `fetch-depth: 0` means "all history."
**How to avoid:** Meta-repo history is small (single-maintainer since 2026-04-19). Impact is negligible. If history ever grows, switch to `fetch-depth: 50` + `git fetch origin main --depth=50` as a targeted workaround.
**Warning signs:** Checkout step takes > 30s.

### Pitfall 8: Onboarding dry-run hides installed state

**What goes wrong:** Timed dry-run runs on the maintainer's workstation where `infisical`, `gh`, `node 22`, `pnpm 10` are already installed, SSH keys exist, npm login cached. Result: "4 minutes" — but a real new dev takes 30 minutes.
**Why it happens:** The maintainer's env is pre-warmed.
**How to avoid:** Run the dry-run on (a) a fresh VM or container, OR (b) a guest shell profile (`bash --noprofile --norc`, empty `~/.config/minion/`, `PATH=/usr/bin:/bin`), OR (c) document assumptions explicitly (e.g., "assumes Node 22 / pnpm 10 / infisical CLI / gh CLI pre-installed"). Option (c) is the pragmatic compromise — match README prerequisites exactly.
**Warning signs:** The timing is suspiciously fast.

### Pitfall 9: Root CLAUDE.md contradicts deleted state

**What goes wrong:** Current root `CLAUDE.md` references `minion-shared/` as a standalone directory in Project Map (line 12) and describes its build process separately (lines 162–164), but the directory was deleted in Phase 4 and its contents folded into `packages/shared`.
**Why it happens:** Migration docs tend to accumulate stale references.
**How to avoid:** Grep for explicit stale strings before submitting: `grep -n "minion-shared" CLAUDE.md`, `grep -n "Future phases" CLAUDE.md`, `grep -n "M3+" CLAUDE.md`, `grep -n "Phase [4-8]" CLAUDE.md`.
**Warning signs:** Search results > 0 for any of the above.

---

## Code Examples

### Example 1: Full CI workflow

See Pattern 1 above (`.github/workflows/ci.yml`).

### Example 2: Full release workflow

See Pattern 2 above (`.github/workflows/release.yml`).

### Example 3: Doctor extension — updated `MINION_PKGS`

```typescript
// packages/cli/src/lib/link-drift.ts (line 19)
// Source: local code + Phase 5/6 manifests
const MINION_PKGS = [
  'tsconfig',
  'lint-config',
  'env',
  'cli',
  'shared',    // added Phase 4
  'db',        // added Phase 5
  'auth',      // added Phase 6
];
```

### Example 4: Doctor extension — clone-presence and git status

```typescript
// packages/cli/src/commands/doctor.ts — extended sketch
// Source: local code + packages/cli/src/commands/status.ts pattern
import * as fs from 'node:fs';
import * as path from 'node:path';

function subprojectPresence(metaRoot: string, subprojectPath: string): 'cloned' | 'missing' {
  return fs.existsSync(path.join(metaRoot, subprojectPath, '.git')) ? 'cloned' : 'missing';
}

async function gitSummary(subPath: string): Promise<string> {
  if (!fs.existsSync(path.join(subPath, '.git'))) return '(not cloned)';
  const porcelain = await safeExec('git', ['-C', subPath, 'status', '--porcelain']);
  const dirty = porcelain.trim() ? `${porcelain.trim().split('\n').length}-dirty` : 'clean';
  return dirty;
}

// In the main loop, handle missing subprojects as a clean row (not an error):
for (const [id, entry] of Object.entries(reg.subprojects)) {
  const subPath = path.join(metaRoot, entry.path);
  if (subprojectPresence(metaRoot, entry.path) === 'missing') {
    rows.push({ id, vars: '-', warnings: '(not cloned — skip)', links: '-', git: '-' });
    continue;
  }
  // ...existing logic + new `git` column
}
```

### Example 5: CI workflow minimal smoke on fresh clone

```bash
# What CI does end-to-end — verifiable locally:
cd /tmp && git clone git@github.com:NikolasP98/minion-meta.git && cd minion-meta
pnpm install --frozen-lockfile
pnpm run build-all
pnpm run typecheck-all
pnpm run lint-all
pnpm run test-all
pnpm run changeset:status
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Classic long-lived `NPM_TOKEN` in GitHub secrets | npm trusted publishing / OIDC with `id-token: write` | npm rolled out trusted publishing mid-2025, expanded 2026 | For **public** packages, eliminates token rotation. Meta-repo's `@minion-stack/*` are all public → eligible. POLISH-02 can choose either; `NPM_TOKEN` is faster to wire, OIDC is forward-looking. |
| `pnpm/action-setup@v2` with explicit `run_install` | `pnpm/action-setup@v4` with separate `pnpm install` step | action v3+ deprecated `run_install` option | Use `v4` (v4.4.0 current) without `run_install`; run `pnpm install --frozen-lockfile` explicitly. [VERIFIED] |
| `actions/checkout@v3` | `actions/checkout@v4` | Node 20 runtime standard | Use `v4` — same interface. |
| Multi-package repo with Lerna | Changesets + pnpm workspaces | 2022–2024 industry shift | Already adopted. |
| Manual `npm publish` from local workstation | `changesets/action` from main-branch CI | 2024+ | Eliminates "forgot to bump version" / "forgot to publish dep first" class of errors. |

**Deprecated/outdated:**
- `npm --access public` flag per publish: handled globally via `.changeset/config.json` `"access": "public"` — no per-publish flag needed.
- `pnpm recursive`: use `pnpm -r`.
- Explicit `GITHUB_TOKEN` on `changesets/action@v1.7.0`: auto-detected in v1.7.0.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | [ASSUMED] `@minion-stack` npm scope has 2FA enforced on publish (hence need for automation token) | Common Pitfalls #1 | If 2FA is **not** enforced, any granular token works and no automation-token generation is needed. Low risk — easy to adjust. |
| A2 | [ASSUMED] The meta-repo's `main` branch has no branch protection rules currently | Common Pitfalls #3 + release workflow planning | If protection is on and not configured for bypass, the release workflow's auto-PR will fail. Verify with `gh api repos/NikolasP98/minion-meta/branches/main/protection` before rolling out POLISH-02. |
| A3 | [ASSUMED] oxlint supports `extends` of a JSON preset via `.oxlintrc.json` or `-c` flag | Pattern 4 + Pitfall #6 | If extension syntax doesn't work as described, per-package lint configs need a different wiring (e.g., full preset copy). Verify in a single package before rolling to all seven. |
| A4 | [ASSUMED] `changeset status --since=origin/main` requires `fetch-depth: 0` in CI | Pitfall #2 | Could need only `fetch-depth: 2` for the merge-base compare. If depth 0 is too slow, experiment. Low risk — full depth is cheap for this repo. |
| A5 | [ASSUMED] All seven packages will be fine with a single shared oxlint preset (per `@minion-stack/lint-config`) | Pattern 4 | If any package's source has domain-specific lint exemptions (e.g., vitest globals in tests), preset may need per-package overrides. Expect to iterate. |
| A6 | [ASSUMED] `packageManager: pnpm@10.15.0` + action `version: 10` auto-resolves via Corepack to 10.15.x | Pattern 1 + Anti-Patterns | If the action doesn't honor `packageManager` field, must hardcode `version: 10.15.0` in workflow. Verify on first CI run. |
| A7 | [ASSUMED] Onboarding dry-run is credibly measured in <10 min with pre-installed prereqs (Node 22, pnpm 10, infisical, gh, SSH keys) | POLISH-05 + Pitfall #8 | "Under 10 minutes" is ambiguous. If the criterion includes installing Node, pnpm, etc., budget blows out. Planner should get explicit user confirmation on what's "pre-installed" vs "part of the clock." |
| A8 | [ASSUMED] Root CLAUDE.md rewrite does **not** need to preserve the Cross-Project Impact Zones / Orchestration Guide sections as-is — they're steady-state content that stays | POLISH-04 | If user wants a minimal CLAUDE.md focused only on meta-repo ops (not subproject orchestration), scope grows. Planner should confirm intended audience: "orchestrator agent" (keep subproject tables) vs "meta-repo maintainer" (trim). |

**User confirmations to collect before execution:**
- A1, A2: check npm 2FA setting and `gh` branch protection state
- A7: define what "fresh clone to `minion dev` in <10 min" includes
- A8: who reads the rewritten CLAUDE.md?

---

## Open Questions

1. **npm trusted publishing vs classic `NPM_TOKEN`?**
   - What we know: All packages are public (eligible); trusted publishing requires configuration in npmjs.com UI; action v1.7.0 supports both paths.
   - What's unclear: Does the user want to invest in OIDC now, or defer to a follow-up? Classic token is faster.
   - Recommendation: Use classic `NPM_TOKEN` (automation type) for Phase 8. File a v2 requirement (`REL-03`?) for future OIDC migration.

2. **Should CI also run on the release workflow branches (Version Packages PRs)?**
   - What we know: `changesets/action` opens a PR; if CI is required for merge, CI must also pass on that PR.
   - What's unclear: Is main branch-protected? See A2.
   - Recommendation: Keep CI on `pull_request` + `push: main`. The Version PR will run CI identically. No special-casing needed.

3. **How aggressive should `minion doctor --ci` be?**
   - What we know: Fetching CI status requires `gh` + network + potentially a PAT.
   - What's unclear: Is this worth the UX complexity, given Phase 3 already set up per-subproject CI that reports visibly on GitHub?
   - Recommendation: Make CI-status reporting **opt-in** (`--ci` flag) and omit from default output. Keep the happy-path `doctor` invocation fast and local.

4. **Onboarding dry-run — which host?**
   - What we know: Ideally a VM with nothing installed. Pragmatically, the maintainer's machine with a scratch shell.
   - What's unclear: Do we have access to a VM (Netcup? Tailscale node?) that we can spin up for this?
   - Recommendation: Use `bash --noprofile --norc` with explicit PATH + empty `~/.config/minion/`, document exact assumptions in README, proceed on maintainer's machine. Add a test account SSH key to NikolasP98 repos for the git-clone step.

5. **What about `packages/tsconfig` and `packages/lint-config` — do they need `typecheck`/`lint` scripts?**
   - What we know: They're JSON-only (no TS source). `--if-present` will skip cleanly.
   - What's unclear: Should they have at least a `test` that validates the JSON is valid?
   - Recommendation: Add a minimal `test` that `node -e "JSON.parse(require('fs').readFileSync('base.json'))"` for each config file. Low cost, catches accidental JSON corruption.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All work | ✓ | `node -v` (expected ≥22 per engines) | — |
| pnpm | All work | ✓ | `pnpm -v` (expected ≥10 per engines — root is 10.15.0) | — |
| `gh` CLI | Verifying branch protection, opening release PRs locally, testing onboarding | ✓ (assumed; used heavily in prior phases) | — | `curl` + PAT against GitHub REST |
| `infisical` CLI | Testing `minion doctor` + onboarding dry-run | ✓ (per user memory: `reference_infisical_setup.md`) | ≥0.33 | — |
| `oxlint` | Per-package `lint` script | Workspace peer — installed via `pnpm install` | — | `eslint` via lint-config preset (slower) |
| `prettier` | Optional `format:check` in CI | Workspace peer | — | — |
| `act` (nektos) | Local GitHub Actions dry-run | **Unknown** — not in user memory | — | Push to a test branch + observe real CI |
| GitHub repo write access | Creating `.github/workflows/`, adding secrets | ✓ (maintainer = repo owner) | — | — |
| npm publish rights to `@minion-stack` | POLISH-02 end-to-end | ✓ (previous phases published 7 packages) | — | — |

**Missing dependencies with no fallback:**
- None identified.

**Missing dependencies with fallback:**
- `act`: local GH Actions runner. Fallback = push to a feature branch and iterate on real CI. Acceptable; CI cycles are cheap.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^2.1.9` in `cli`, `env`, `shared`, `auth`; no test runner in `tsconfig`, `lint-config`, `db`. YAML lint for workflows via `actionlint` (optional). |
| Config file | Each package has `vitest` implicit defaults (no `vitest.config.ts` at root); tests live under `packages/<pkg>/test/` or co-located `*.test.ts` |
| Quick run command | `pnpm -r --parallel --if-present run test` (root) or `pnpm --filter @minion-stack/cli test` |
| Full suite command | `pnpm run ci` (new root script: `typecheck-all && test-all && build-all && changeset:status`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-01 | CI workflow runs lint-all on PR | integration (CI self-test) | Push test branch, observe `.github/workflows/ci.yml` runs `lint-all` step green | ❌ Wave 0 — needs `.github/workflows/ci.yml` + per-package `lint` scripts + lockfile refresh |
| POLISH-01 | CI workflow runs typecheck-all on PR | integration | Same — observe `typecheck-all` step green | ❌ Wave 0 — needs root `typecheck-all` script |
| POLISH-01 | CI workflow runs `changeset status` on PR | integration | Test: open PR with no changeset → expect CI fail; add changeset → CI pass | ❌ Wave 0 — workflow file |
| POLISH-02 | Merge to main with staged changeset opens "Version Packages" PR | integration (GH Actions) | Manually merge a feature PR containing a changeset to main; verify changesets/action opens a follow-up PR with version bumps + changelog | ❌ Wave 0 — needs `.github/workflows/release.yml` + `NPM_TOKEN` secret |
| POLISH-02 | Merge of "Version Packages" PR publishes bumped packages to npm | integration (npm registry assertion) | After merge, `npm view @minion-stack/shared version` matches the bumped version | ❌ Wave 0 — same |
| POLISH-03 | `minion doctor` reports all three new packages in link-drift | unit | `pnpm --filter @minion-stack/cli test` — add test case covering `shared`/`db`/`auth` | ✅ extend `packages/cli/test/` — new test file `test/doctor-link-drift.test.ts` |
| POLISH-03 | `minion doctor` reports git-dirty count per subproject | unit | Same — test stubs an fs + execa to verify git column | ✅ extend existing |
| POLISH-03 | `minion doctor` handles missing subproject (not cloned) gracefully | unit | Test: rm a subproject path, run `doctor`, assert row is `-` / "not cloned", not `err` | ✅ extend existing |
| POLISH-04 | Root `CLAUDE.md` grep shows no stale strings | smoke (grep) | `grep -nE 'minion-shared|Future phases|M3\+' CLAUDE.md` returns 0 matches | ❌ Wave 0 — new script or manual check |
| POLISH-05 | Onboarding timing is under 10 minutes | manual UAT | Human-timed dry-run; record times in `.planning/phases/08-polish-automation/ONBOARDING-DRY-RUN.md` | ❌ Wave 0 — UAT artifact, not automated |

### Sampling Rate
- **Per task commit:** `pnpm -r --parallel --if-present run test` (fast vitest across all packages)
- **Per wave merge:** `pnpm run ci` (typecheck + test + build + changeset:status)
- **Phase gate:** Full suite green **on GitHub Actions**, plus manual onboarding dry-run recorded.

### Wave 0 Gaps
- [ ] `.github/workflows/ci.yml` — covers POLISH-01
- [ ] `.github/workflows/release.yml` — covers POLISH-02
- [ ] Root scripts `lint-all`, `typecheck-all`, `test-all`, `build-all`, `release:version`, `ci` added to `package.json`
- [ ] Per-package `lint` scripts added to `cli`, `env`, `shared`, `db`, `auth` (skip `tsconfig`, `lint-config` via `--if-present`)
- [ ] Per-package `typecheck` scripts added to `shared`, `db`, `auth` (currently only `cli`, `env` have explicit typecheck via `tsconfig.test.json`)
- [ ] `packages/cli/test/doctor-link-drift.test.ts` — covers POLISH-03 link-drift extension
- [ ] `packages/cli/test/doctor-integration.test.ts` — covers POLISH-03 missing-subproject handling and git-status column
- [ ] `NPM_TOKEN` secret set in GitHub repo settings (human action, covered in release workflow PR checklist)
- [ ] `.planning/phases/08-polish-automation/ONBOARDING-DRY-RUN.md` — covers POLISH-05 UAT evidence

*(None of these exist today; all are net-new.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — meta-repo CI only |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | GitHub repo permissions: `contents: write` + `pull-requests: write` for release workflow; `id-token: write` only if OIDC; no broader permissions. |
| V5 Input Validation | no | No user input on CI surface |
| V6 Cryptography | yes | `NPM_TOKEN` storage: GitHub repo secret only — never in code or logs. Changesets action auto-redacts tokens in logs. |
| V14 Configuration | yes | `pnpm install --frozen-lockfile` in CI (integrity); pin GitHub Action versions (`@v4.4.0` not `@main`); use `secrets.NPM_TOKEN` not env interpolation. |

### Known Threat Patterns for {CI + npm publish stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Leaked `NPM_TOKEN` via CI log | Information Disclosure | Use automation token (not granular PAT); rotate yearly; prefer trusted publishing / OIDC if feasible. GitHub Actions masks secrets automatically. |
| Supply-chain injection via malicious transitive dep | Tampering | `pnpm install --frozen-lockfile`; `.npmrc` does NOT set `enable-pre-post-scripts: true` (default is false in pnpm 10+); consider adding `ignore-scripts: true` to CI environment for the install step (but this breaks legitimate postinstall scripts — defer to v2). |
| Compromised GitHub Action version (e.g., `changesets/action@v1` gets typosquatted) | Tampering | Pin to minor version `@v1.7.0` minimum; optionally pin to a commit SHA. |
| Branch bypass via a compromised reviewer account | Elevation of Privilege | Not applicable to single-maintainer repo; document as an accepted risk in v2. |
| Stale `INFISICAL_*` env vars linger in doctor output | Information Disclosure | `doctor.ts` already does not print secret values — only presence/absence. Verify no new columns leak values. |

**No cryptography is hand-rolled in Phase 8.** All publishing is via npm's existing token / OIDC stack. All secret handling is via GitHub's secret store.

---

## Sources

### Primary (HIGH confidence)
- Local codebase inspection: `packages/cli/src/commands/doctor.ts`, `packages/cli/src/lib/link-drift.ts`, `.changeset/config.json`, `package.json`, `pnpm-workspace.yaml`, all seven `packages/*/package.json`, `minion.json`, `CLAUDE.md`, `README.md`, `.gitignore` — all verified
- npm registry versions via `npm view`: `@changesets/cli@2.31.0`, `@changesets/changelog-github@0.6.0`, `concurrently@9.2.1`, `ws@8.20.0`, `vitest@4.1.5`, `pnpm@10.33.0` — verified 2026-04-21
- `git remote -v` + `git branch --show-current` — confirmed `origin = git@github.com:NikolasP98/minion-meta.git`, branch = `main`
- Phase 07 RESEARCH.md (adjacent phase, same domain) — style + confidence tagging pattern
- `.planning/STATE.md` — confirms phase status, completed phases, and decisions
- `.planning/ROADMAP.md` + `.planning/REQUIREMENTS.md` — mandatory reading

### Secondary (MEDIUM confidence)
- https://github.com/changesets/action/releases — latest v1.7.0 (Feb 12), v1.6.0, v1.5.3 [verified via WebFetch 2026-04-21]
- https://github.com/pnpm/action-setup/releases — latest v4.4.0 (March 13) [verified via WebFetch 2026-04-21]
- https://pnpm.io/using-changesets — canonical YAML pattern [verified via WebFetch]

### Tertiary (LOW confidence — training knowledge)
- [ASSUMED] Exact behavior of `oxlint --extends` vs `.oxlintrc.json` `extends` field — needs a local test before relying on
- [ASSUMED] npm 2FA status on the `@minion-stack` scope — inferred from memory + publish friction in prior phases
- [ASSUMED] Branch protection status on `main` — not checked in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack (changesets/action, pnpm/action-setup, setup-node, checkout): **HIGH** — all verified via official sources + version queries
- CI workflow shape: **HIGH** — matches pnpm.io official guidance + mirrors what hub/site/paperclip already run (Phase 3 precedent)
- Release workflow (changesets/action): **HIGH** for v1.7.0 behavior; **MEDIUM** for NPM_TOKEN vs OIDC choice (user preference pending)
- `minion doctor` extensions: **HIGH** — pure code-add against read code, no external dependencies
- Onboarding timing: **LOW** confidence on the actual time — must be measured, not predicted
- CLAUDE.md rewrite scope: **MEDIUM** — concrete stale strings identified, but scope depends on audience (A8 question)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable tooling; `changesets/action` and `pnpm/action-setup` have infrequent releases)
