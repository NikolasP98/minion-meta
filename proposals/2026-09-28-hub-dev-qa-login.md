---
id: 2026-09-28-hub-dev-qa-login
title: Direct QA profile login on local development servers
status: approved
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
