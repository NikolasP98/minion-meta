---
plan: 02-02
phase: 02-foundation
decision_date: 2026-04-19
updated: 2026-04-20
scope_chosen: "@nikolasp98"
package_name_pattern: "@nikolasp98/minion-<name>"
fallback_used: true
fallback_trigger: "@minion org name taken when user attempted creation"
npm_org_created: not_required
github_repo_created: true
---

# NPM Scope Decision — `@nikolasp98/minion-*` (FALLBACK USED)

## Resolution summary

- **Intended scope:** `@minion` (public org)
- **Actual scope:** `@nikolasp98` (user's personal scope, already registered)
- **Package name pattern:** `@nikolasp98/minion-<name>` (e.g. `@nikolasp98/minion-cli`, `@nikolasp98/minion-env`)
- **Why fallback:** User attempted org creation at `npmjs.com/org/create` on 2026-04-20; `minion` name was unavailable (rejected by npm).
- **Advantage:** No org creation needed — `@nikolasp98` is the user's personal scope, publish works after `npm login` alone.

## Timeline

**2026-04-19 (initial probe):** Public `curl` probes returned 404 on `@minion` scope + example packages, suggesting availability. Decision doc locked `@minion`.

**2026-04-20 (first npm CLI attempt):** User ran `npm org set minion --role owner NikolasP98` — errored. Corrected the instructions: npm CLI cannot create orgs; web UI only.

**2026-04-20 (user attempts web creation):** User reported "minion is not available" — the org name is reserved/taken even though the public API probe returned 404. Likely cause: npm reserves some common names; the 404 on `/org/minion` probe was a negative signal that didn't reflect reserved-name status.

**2026-04-20 (fallback cascade executed):** All 5 `package.json` files renamed from `@minion/<name>` → `@nikolasp98/minion-<name>`. `pnpm install` confirmed workspace resolution still works. No other references to update (the `minion` CLI bin name, the `minion.schema.json` `$id` GitHub URL, `minion.json` registry file — none are npm-scope-dependent; they remain unchanged).

## Cascade applied (5 files)

| File | Old name | New name |
|---|---|---|
| `/package.json` | `@minion/root` | `@nikolasp98/minion-root` |
| `/packages/cli/package.json` | `@minion/cli` | `@nikolasp98/minion-cli` |
| `/packages/env/package.json` | `@minion/env` | `@nikolasp98/minion-env` |
| `/packages/tsconfig/package.json` | `@minion/tsconfig` | `@nikolasp98/minion-tsconfig` |
| `/packages/lint-config/package.json` | `@minion/lint-config` | `@nikolasp98/minion-lint-config` |

Also updated `packages/cli/package.json` description ("via minion.json registry and @nikolasp98/minion-env").

## Unchanged (intentionally)

- `bin: { "minion": "dist/index.js" }` — the CLI binary is still invoked as `minion`, not `nikolasp98-minion`
- `minion.schema.json` `$id` URL points to `github.com/NikolasP98/minion-meta/packages/cli/minion.schema.json` — GitHub path, not npm, unaffected
- `minion.json` filename and all `infisicalProject: "minion-<name>"` references — internal, not npm-scoped
- Root CLAUDE.md / README.md / code / scripts referring to "minion" as the product — product name is unchanged, only the npm package distribution name changes
- `.changeset/config.json` `access: public` — still applies

## Human-action steps (simplified — NO org creation needed)

`@nikolasp98` scope already exists as your personal npm user scope. Just:

```bash
# 1. Log in (if not already)
npm login

# 2. Verify
npm whoami                                     # NikolasP98
npm access list packages @nikolasp98           # your existing packages (may include @nikolasp98/minion if already published)

# 3. (Recommended) Enable 2FA on publish
npm profile enable-2fa auth-and-writes
```

Once `npm whoami` returns `NikolasP98`, Wave 3 can publish `@nikolasp98/minion-tsconfig`, `@nikolasp98/minion-lint-config`, `@nikolasp98/minion-env`.

## Phase 2 progress impact

- FOUND-01 (meta-repo at remote `NikolasP98/minion-meta`) — **SATISFIED** (GitHub repo live, push succeeded)
- FOUND-03 (publishable scope registered) — **SATISFIED** once user confirms `npm whoami` works. No org creation blocker. Effectively unblocks Wave 3.

## If the scope must change again

`@nikolasp98` is the final fallback — it's the user's personal scope, inherently available. If for some reason publishing fails (e.g., user decides to create a different org later), the cascade pattern is:
1. Edit 5 `package.json` `name:` fields
2. Run `pnpm install` to re-resolve workspace
3. Update any intra-package `dependencies` / `peerDependencies` that reference the old name (none currently; `@minion/cli` would depend on `@minion/env` in 02-06 — that task must use the current scope, whatever it is)
