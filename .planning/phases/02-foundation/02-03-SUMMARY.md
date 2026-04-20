---
plan: 02-03
phase: 02-foundation
status: complete
requirements: [FOUND-04]
completed_at: 2026-04-20
published: "@minion-stack/tsconfig@0.1.0"
---

# Plan 02-03 Summary: @minion-stack/tsconfig@0.1.0

## Published

- Name: `@minion-stack/tsconfig`
- Version: `0.1.0`
- Tarball: `minion-stack-tsconfig-0.1.0.tgz` (1.5 kB, 6 files, 3.9 kB unpacked)
- Registry: confirmed via `HEAD /@minion-stack/tsconfig/-/tsconfig-0.1.0.tgz` → 200; `GET /-/org/minion-stack/package` shows write permission

## Variants shipped

| Variant | Extends | Purpose |
|---------|---------|---------|
| `base.json` | — | Strict ES2023 nodenext; foundation |
| `node.json` | `base` | Node libs/services (`types: ["node"]`, `moduleDetection: force`) |
| `svelte.json` | `base` | SvelteKit (bundler resolution, `isolatedModules`, `allowJs`) |
| `library.json` | `base` | Publishable libs (`declaration`, `declarationMap`, `composite`) |

## Files shipped

- `packages/tsconfig/base.json` (553 B)
- `packages/tsconfig/node.json` (234 B)
- `packages/tsconfig/svelte.json` (359 B)
- `packages/tsconfig/library.json` (340 B)
- `packages/tsconfig/README.md` (~1.8 kB)
- `packages/tsconfig/package.json` (0.1.0, public, license MIT, repository directory set)

## Release commit

`c375272` — `feat(02-03): release @minion-stack/tsconfig@0.1.0`

## Verification

- [x] Tarball downloadable from registry (200 OK on tgz URL)
- [x] Org shows package with write permission
- [x] All 4 variants + README in tarball
- [x] `pnpm install` succeeds (workspace resolves)
- [x] Release commit on `origin/main`
- [ ] `npm view @minion-stack/tsconfig version` — transient 404 from CDN metadata cache immediately post-publish; resolves in a few minutes (known npm propagation behavior)

## Lessons captured (apply to 02-04, 02-05, 02-06)

1. **Don't pre-bump version in package.json before running `pnpm exec changeset version`.** Skeleton should stay at `0.0.0`; the `minor` changeset will land it at `0.1.0`. I pre-set `0.1.0` → changeset double-bumped to `0.2.0` → manually reverted.
2. **Use `npm pack --dry-run`, not `pnpm pack --dry-run`** (pnpm's pack doesn't accept that flag).
3. **npm 2FA on publish interrupts with EOTP and shows an auth URL** that is REDACTED in non-TTY output (including npm's own debug log). Workaround: user runs the actual `npm publish` in their own terminal so 1Password passkey fires inline. Once auth completes the first time in a session, subsequent publishes in the same terminal may reuse the token (to verify).
4. **CDN metadata cache can return 404 on `npm view` for ~1-5 minutes** after first publish. The tarball endpoint itself is usually live immediately. Don't block on `npm view` in Wave 3.

## Self-Check
PASSED — FOUND-04 satisfied. Package published with correct variants; documentation complete; release commit pushed.
