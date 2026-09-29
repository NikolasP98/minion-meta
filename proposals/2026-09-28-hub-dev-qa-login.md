---
id: 2026-09-28-hub-dev-qa-login
title: Direct QA profile login on local development servers
status: done
created: 2026-09-28
updated: 2026-09-28
repos: [minion_hub]
spawned_spec: 2026-09-28-hub-dev-qa-login-spec
tags: [ui, security]
---

# Development QA login

## AS-IS

The login page requests username/email and password. Its DEV hint points to the seed password file. Authenticated developers can already use `/api/dev/users` and `/api/dev/switch-user`; neither supports starting an anonymous QA session. `src/server/dev-backend.ts` identifies development only when the build is development and both backend URLs use the local QA loopback ports.

## TO-BE

The user requested a dev-exclusive toggle that replaces credentials with a QA profile dropdown and direct login. Selecting a profile and pressing Sign in creates a normal GoTrue session. Production and development servers connected to production backends do not expose the shortcut.

## DELTA

Add a guarded anonymous QA list/login endpoint, a lazy profile picker on the existing login page, bilingual states, negative security tests, and authenticated local browser qualification. Preserve ordinary authentication and existing authenticated dev switching. Session authorization covers implementation, independent Sol review, verified merge and deployment; the shortcut itself remains unavailable in production.

## Implementation status

Hub commit `1657141d2cb786d5d9bb8962817c082a5ee0550f` implements the guarded endpoint, QA profile picker, localized states, and production-negative smoke test. Independent security and UI review approved that exact commit. Focused backend tests passed 53 cases, and focused UI tests passed 4 cases. Formatting plus design and token gates passed.

Hosted CI run `36520020471` passed all jobs, including full check/build and production-preview denial. The local full check and build were stopped because the host reached 21 of 22 GiB memory, 30 GiB swap, and load 40; this is not recorded as a product failure. Browser owner sign-in and viewer session/RBAC qualification passed. Hub PR #404 merged as `b36f2191305113d4fe66d679c5659400a5922b3f`; the updated dev server runs at `http://127.0.0.1:5199/en/login`. Production deployment `6726610476` succeeded for that merge SHA at 2026-09-29 04:22:34 UTC. Fresh same-origin browser GET and POST requests to the canonical production QA-login endpoint both returned 404 after deployment. The local login page visibly rendered the picker on port 5199.
