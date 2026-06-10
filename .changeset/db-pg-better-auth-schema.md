---
"@minion-stack/db": minor
---

Add the Better Auth schema (Postgres) under `@minion-stack/db/pg` — `user`, `session`, `account`, `verification`, `jwks`, `organization`, `member`, `invitation`, `oauthApplication`, `oauthAccessToken`, `oauthConsent`. A faithful 1:1 port of the existing sqlite Better Auth schema (text ids preserved, `integer{timestamp}`→`timestamptz`, `integer{boolean}`→`boolean`) for the Turso→Supabase Better Auth cutover (Stage 5 / Track B). Export names mirror Better Auth's model names so the auth factory can pass the module straight to `drizzleAdapter({ provider: 'pg' })`. Additive — existing exports unchanged.
