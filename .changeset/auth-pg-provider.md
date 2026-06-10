---
"@minion-stack/auth": minor
---

`createAuth` accepts an optional `provider: 'sqlite' | 'pg' | 'mysql'` param (default `'sqlite'`) passed through to the Better Auth drizzle adapter. Enables the Postgres Better Auth store for the Turso→Supabase cutover (Track B) — pass `provider: 'pg'` with a Postgres `db` + the `@minion-stack/db/pg` Better Auth schema. Backward compatible: existing callers omit it and keep sqlite.
