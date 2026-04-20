---
plan: 02-02
phase: 02-foundation
decision_date: 2026-04-19
scope_chosen: "@minion"
fallback_used: false
npm_org_created: pending_human_action
github_repo_created: true
---

# NPM Scope Decision — `@minion`

## Availability check (2026-04-19)

Public npm registry probe:

```
curl -sI https://registry.npmjs.org/-/org/minion → 404
curl -sI https://registry.npmjs.org/@minion%2Fcli  → 404
curl -sI https://registry.npmjs.org/@minion%2Fenv  → 404
```

**All three 404 → `@minion` scope is available for registration.** No fallback needed.

## Locked choice

**Scope:** `@minion` (public)
**Fallback (if scope creation fails at user step):** `@nikolasp98` — already registered to NikolasP98. In that case, all 5 `package.json` files are renamed from `@minion/<name>` → `@nikolasp98/minion-<name>`; `bin: minion` unchanged; `minion.schema.json` `$id` URL unchanged (it's a GitHub path, not an npm reference).

## Human-action steps (for user to run locally)

The npm org creation cannot be automated — it requires your npm login + (optionally) 2FA. Run these at your convenience:

```bash
# 1. Log in to npm (opens browser for OAuth or prompts for OTP)
npm login

# 2. Create the organization
# Option A: CLI (recommended)
npm org set minion --role owner NikolasP98

# Option B: Web UI (if CLI org-create is not supported in your npm version)
# Visit https://www.npmjs.com/org/create, name the org "minion", pick the "Unlimited public packages (free)" tier

# 3. Verify access
npm access list packages @minion    # should not error with ENOSCOPE
npm whoami                           # should print NikolasP98

# 4. (Recommended) Enable 2FA on publish
npm profile enable-2fa auth-and-writes
```

## Impact

- **Waves 3–6 (package publishing)** require the `@minion` npm org to exist. If you run the commands above before executing Wave 3, publishing will work unchanged.
- **If you decide to use the fallback scope (`@nikolasp98`)**, tell me before Wave 3 and I'll run the rename cascade across all 5 `package.json` files (root + 4 packages).
- **Waves 1, 2 (except npm portion), 7, 8** do NOT require the npm scope. The GitHub repo + first push succeed independently.

## Phase 2 progress impact

- FOUND-01 (meta-repo at remote `NikolasP98/minion-meta`) — **SATISFIED** after Task 2 below
- FOUND-03 (`@minion/*` scope registered + publishable) — **PENDING USER ACTION**; unblocks Wave 3
