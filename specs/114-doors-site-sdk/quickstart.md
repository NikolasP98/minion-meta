# Quickstart: verifying the Doors site SDK

1. **Link a site**: hub → Settings → Sites & API keys → add `http://localhost:5241`.
2. **Blank page test**: serve an HTML file on that port containing the two lines from `contracts/public-api.md` with a test door's slug; fill, attach a photo, submit; the contact, submission and attachment appear in the CRM.
3. **Unlinked origin**: serve the same file on another port; the element shows "this site is not allowed to use this form"; `select count(*)` of submissions is unchanged.
4. **Rich form**: in the door editor add two sections, a field shown only for one option, a phone with country picker, a document field and a guided photo; check the hosted page `/d/<slug>` and the embed look and store the same.
5. **Key**: create a key; `curl -H "authorization: Bearer mk_…" -H "x-minion-visitor-ip: 203.0.113.9" -H "content-type: application/json" -d '{"values":{…},"consent":true}' …/submit` → `200`; revoke; repeat → `401`.
6. **Old doors**: `/d/faces-historia-clinica` renders and submits as before.
7. **FACES**: `/modelos` in es, en, pt; submit; compare the stored row with one from before the migration.

Gates per hub slice (foreground): `bun run i18n:compile && bun run check`, targeted `bunx vitest run <paths>` with `SUPABASE_DB_URL` unset, `bun run lint:design && bun run lint:tokens`, `bunx prettier --check <changed files>`. Never the full hub suite with a production `.env` present.
