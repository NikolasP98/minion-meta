# Local Supabase for development

A local Supabase stack so the **Supabase identity migrations** (`profiles`,
`user_identities`, `gateway` — under `supabase/migrations/`) are tested locally
instead of being applied to the shared prod project (`gxvsaskbohavnurfvshr`).

Orgs / members / agents already live in the **local Turso file DB**
(`minion_hub/data/minion_hub.db`); only the Supabase side used to be prod-only.

The Supabase CLI is a workspace devDependency — run it with `pnpm exec supabase …`
from the repo root.

## Endpoints (local)

| Service | URL |
|---|---|
| API (PostgREST/Auth/Kong) | http://127.0.0.1:54321 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Mailpit (inbound mail) | http://127.0.0.1:54324 |

Local API keys (non-secret defaults, already in `minion_hub/.env.local`):
- publishable: `<local-dev default — see minion_hub/.env.local>`
- secret (service_role): `<local-dev default — see minion_hub/.env.local>`

## Start / stop

```bash
cd <repo root>

# Google login locally needs the OAuth creds in the env at start time
# (config.toml interpolates env(GOOGLE_CLIENT_ID)/env(GOOGLE_CLIENT_SECRET)).
# They live in Infisical for this repo — export them, then start:
eval "$(infisical export --format=dotenv-export)" && pnpm exec supabase start

pnpm exec supabase stop          # stop (keeps data)
pnpm exec supabase stop --no-backup   # stop and wipe local data
```

## Migrations (the whole point)

```bash
# Generate a new PG migration from the Drizzle schema (packages/db) — already
# writes into supabase/migrations/:
pnpm --filter @minion-stack/db db:pg:generate

# Apply pending migrations to the LOCAL db:
pnpm exec supabase migration up

# Or rebuild local from scratch (drops + replays every migration + seed):
pnpm exec supabase db reset
```

Prod still gets migrations via the Supabase GitHub integration when they merge —
this stack is only for local testing. **Never run `supabase config push`**
(`config.toml`'s `project_id` is the prod project; pushing would change prod auth).

## One-time login setup (Google)

The hub's Supabase login is Google-only (email/password goes through Better
Auth/Turso, a different provider). To use Google against the local stack:

1. In the Google Cloud OAuth client, add an Authorized redirect URI:
   `http://127.0.0.1:54321/auth/v1/callback`
2. Start the stack with the Google creds exported (see above) and restart if it
   was already running without them: `pnpm exec supabase stop && eval "$(infisical export --format=dotenv-export)" && pnpm exec supabase start`.

## First login → land in a workspace

A fresh local Supabase has no users. On first Google login the bridge creates a
`profiles` row, but there's no org membership in local Turso yet, so you'll see
**"You're not in a workspace yet"** (`/join`). Bootstrap once:

```bash
cd minion_hub
bun run db:seed   # seeds a local org + admin in Turso (if not already present)
```

Then grant your just-created profile an owner membership in that org. Your
profile id (= the Supabase auth uuid) is visible in Studio → Auth, or:

```bash
docker exec supabase_db_gxvsaskbohavnurfvshr \
  psql -U postgres -d postgres -tAc \
  "select id, email from public.profiles order by created_at desc limit 5;"
```

(The membership insert into the local Turso `member`/`organization` tables can be
scripted — ask and it'll be wired to your profile id.)

## Switch back to prod

In `minion_hub/.env.local`, restore the commented `# --- PROD Supabase ---`
block (and comment out the local one). No restart of Supabase needed; just
restart `bun run dev`.
