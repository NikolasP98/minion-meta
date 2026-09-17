---
id: 2026-09-16-hub-minion-run-dev-switcher
title: "`minion run hub [--prd]` with a DEV-only user switcher in the avatar menu"
status: approved
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub, minion-meta]
tags: [infra, auth, ui, test]
effort: M
spawned_spec: 2026-09-16-hub-minion-run-dev-switcher-spec
---

# `minion run hub [--prd]` with a DEV-only user switcher

**Owner request (verbatim, 2026-09-16):** see the spec's brief block. Summary: `minion run` starts a dev server on the containerized, pre-seeded backend; `--prd` connects the local frontend to production; on the DEV backend a custom "local dev" UI in the top-right avatar menu switches between existing users; the UI detects DEV vs PRD; everything else works as normal.

## AS-IS

- `minion run <id> <cmd...>` is a bare passthrough with no options (`packages/cli/src/commands/run.ts`); `minion dev hub` runs `bun run dev`, which reads the developer's `.env.local` and therefore, by default, the hosted Supabase project.
- The local QA stack (`bun run qa:up`, spec `2026-09-16-hub-local-qa-stack-spec`) gives a seeded loopback backend but runs the app inside a container without hot reload, and is aimed at QA agents.
- Changing user means signing out and signing in with a persona password from `.env.qa.local`.
- The shell has no environment indicator; nothing distinguishes "local app on production data" from "local app on local data".
- Auth is Supabase GoTrue; `CLAUDE.md` still describes Better Auth (stale since `6227f3b1`).

## TO-BE

- `minion run hub` = host Vite dev server + containerized seeded backend, DEV badge, **Switch user…** in the profile menu listing every user of the DEV database, instant password-less switch.
- `minion run hub --prd` = today's `bun run dev` with a PRD badge and no switcher; `/api/dev/*` answer 404 whenever the database is not on loopback, so the feature cannot exist in any deployed environment.
- Invariants: mode is derived server-side from the database URL only; the switch produces a real GoTrue session and clears the `active_org` cookie; every other feature is unchanged.

## DELTA

Slices S1–S5 in the spec (server endpoints + mode → UI → host dev script → CLI → verification), with unit tests, a CI smoke on the live local stack, and a production 404 smoke.

## Ambiguities resolved with the owner (2026-09-16)

1. `--prd` = local app + production DB/gateway (not a proxy).
2. Switcher scope = every user in the DEV database.
3. Mechanics = instant switch through a DEV-only endpoint.
4. Home = `@minion-stack/cli` `run` command.

## Defaults taken without asking (say so if any is wrong)

- The dev server runs on the **host** (hot reload) while only Supabase runs in containers; the fully containerized app stays available as `qa:up` for agents. Port stays 5199 so the same URL works in both.
- No switcher on the login page; the first login is a real login with the seed password printed by the command.
- Switching to a user with no organization lands on `/join`, exactly as that user would.
- A user created in the session appears in the switcher on next open (the list is fetched when the dialog opens).
- The TTL still applies to the Supabase stack in DEV mode (default 2 h, `--ttl` to extend); Ctrl-C stops only the dev server.
