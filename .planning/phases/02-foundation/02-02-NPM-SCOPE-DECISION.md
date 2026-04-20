---
plan: 02-02
phase: 02-foundation
decision_date: 2026-04-19
updated: 2026-04-20
scope_chosen: "@minion-stack"
package_name_pattern: "@minion-stack/<name>"
fallback_used: true
fallback_trigger: "@minion org name reserved by npm; user chose @minion-stack as dedicated org"
npm_org_created: true
npm_org_name: "minion-stack"
npm_org_tier: "Unlimited public packages (free)"
npm_org_owner: "nikolasp98"
github_repo_created: true
---

# NPM Scope Decision — `@minion-stack/*` (FINAL)

## Resolution summary

- **Intended scope:** `@minion` (public org)
- **Final scope:** `@minion-stack` (dedicated public org, created 2026-04-20)
- **Package name pattern:** `@minion-stack/<name>` (e.g. `@minion-stack/cli`, `@minion-stack/env`)
- **Org owner:** `nikolasp98`
- **Why this scope:** `@minion` was reserved/unavailable on npm. Instead of fallback to the personal `@nikolasp98` scope, user created a dedicated org `minion-stack` with free tier — cleaner branding (scope IS the product identity, no `minion-` prefix redundancy).

## Timeline

| Date | Event |
|---|---|
| 2026-04-19 | Public curl probe returned 404 for `@minion` — appeared available; locked initial decision |
| 2026-04-20 | User ran incorrect `npm org set` CLI command; corrected to web UI flow |
| 2026-04-20 | User attempted `npmjs.com/org/create` for `minion` — npm rejected (name reserved/taken) |
| 2026-04-20 | First fallback: cascaded to `@nikolasp98/minion-*` (commit `f4276ab`) |
| 2026-04-20 | User created `minion-stack` org instead — dedicated scope beats personal-prefixed name |
| 2026-04-20 | Second cascade: `@nikolasp98/minion-*` → `@minion-stack/*` (this commit) |

## Cascade applied (5 files, final state)

| File | Final name |
|---|---|
| `/package.json` | `@minion-stack/root` |
| `/packages/cli/package.json` | `@minion-stack/cli` |
| `/packages/env/package.json` | `@minion-stack/env` |
| `/packages/tsconfig/package.json` | `@minion-stack/tsconfig` |
| `/packages/lint-config/package.json` | `@minion-stack/lint-config` |

Also: `packages/cli/package.json` description updated ("…via minion.json registry and @minion-stack/env").

## Unchanged (intentionally)

- `bin: { "minion": "dist/index.js" }` — CLI binary still invoked as `minion`, NOT `minion-stack`
- `minion.schema.json` `$id` — points to `github.com/NikolasP98/minion-meta/...`, not npm
- `minion.json` registry filename — internal file, not npm-scoped
- `infisicalProject: "minion-<name>"` values in `minion.json` — Infisical project names stay `minion-*` per design spec D10
- Product branding "minion" at root (CLAUDE.md, README.md, scripts, CLI commands) — unchanged
- `.changeset/config.json` — `access: public` still applies

## Key insight captured

**Don't trust the public `/org/<name>` curl probe for scope availability.** It returned 404 for `@minion` on 2026-04-19 but the name was actually reserved/unavailable when the user tried to create the org on 2026-04-20. The registry endpoint doesn't reveal reservations. Always have the USER attempt creation before locking in a scope choice.

## Human-action status

- [x] `minion-stack` org created with free public tier, owner `nikolasp98`
- [ ] User to verify: `npm login` + `npm whoami` returns `nikolasp98`
- [ ] (Recommended) `npm profile enable-2fa auth-and-writes`
- [ ] (Recommended) Enable 2FA enforcement on `minion-stack` org via the "Enable 2FA Enforcement" button visible in the org dashboard

## Phase 2 progress impact

- FOUND-01 (meta-repo at remote `NikolasP98/minion-meta`) — **SATISFIED**
- FOUND-03 (publishable scope registered + usable) — **SATISFIED** once `npm whoami` works. Scope `@minion-stack` created, owned by user, Wave 3 publishes unblock.

## Rollback plan (if publishing breaks)

If a Wave 3 publish fails with permission error:
1. Check `npm access list packages @minion-stack` — confirm user has publish rights
2. Check `npm profile get`  — confirm 2FA mode (if `auth-and-writes`, need OTP at publish)
3. Worst case: fall back to `@nikolasp98` (personal scope, no permission issues) — run the cascade again via `find packages -name package.json -exec sed -i 's|@minion-stack/|@nikolasp98/minion-|g' {} +` plus root `package.json`
