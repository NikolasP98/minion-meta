# minion-base — Development Lifecycle Dashboard

**Status: SHIPPED 2026-08-12** · Repo: `NikolasP98/minion-base` (private) · Dir: `minion_base/` · Prod: https://base.minion-ai.org (Vercel project `minion-base`)

## What

Single-page dashboard monitoring MINION as a project across all 7 subproject repos. Five lifecycle stages, each fed live from the GitHub REST API:

1. **Proposal / Idea** — open issues across repos
2. **Spec / Design** — `specs/*.md` in minion-meta (contents API)
3. **Development** — open PRs + recent commits per repo (one `/issues` call yields both issues and PRs)
4. **Testing** — latest workflow runs with pass/fail
5. **Deployment** — the deployment rules established locally (static data in `src/lib/rules.ts`: gateway DEV→`:dev`/main→`:prd` cherry-picks, hub PR→master only, site dev→master, meta changesets→npm, shared conventions)

## Architecture

- SvelteKit 2 + Svelte 5 runes, Bun, `@sveltejs/adapter-vercel` (`runtime: 'nodejs22.x'` — Node 26 guard).
- No database. One `+page.server.ts` load fans out ~22 GitHub API calls with `s-maxage=300, stale-while-revalidate` edge caching.
- Repo registry: `src/lib/repos.ts`. Errors per-fetch degrade to "unreachable" badges, never 500.
- Access gate: `hooks.server.ts` basic auth (user `minion`, `DASH_PASSWORD` env) because private-repo activity renders here. Unset the env to go public.
- Env: `GITHUB_TOKEN` (PAT, server-side only), `DASH_PASSWORD`. Both `.trim()`ed — Vercel-stored values can carry trailing newlines.

## Ops

- Vercel project `minion-base` (team nikolasp98s-projects), git-connected — push to `main` deploys prod.
- Domain `base.minion-ai.org` attached via `vercel api /v10/projects/minion-base/domains -f name=…` (CLI `domains add <domain> <project>` no longer accepts two args).
- DNS: Cloudflare CNAME `base` → `cname.vercel-dns.com` (zone is Cloudflare-managed; no CF API token available to agents).

## Deferred

- Vercel deploy status per repo (needs Vercel API wiring) — add if the CI section proves insufficient.
- Idea intake (proposals currently = GitHub issues only).
- Per-stage drill-down pages — single page is enough at current scale.
