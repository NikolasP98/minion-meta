# Quickstart (validation)

## S1 — keys (hub QA stack, `bun run dev:local`)
1. Sign in as an org admin, open Settings → Developers, create a key, copy it. Reload: the secret is gone, `mk_` + eight characters remain.
2. `curl` twenty submissions within a minute to a QA form door with the key: all `200`. The stored submissions carry the key's id.
3. Without a key from the same machine: the sixth within a minute is `429` (unchanged).
4. Same call with the last character changed: `401`. With the key of the second QA organization: `401`, and step 3's limit for this machine is not affected.
5. Sixty-one submissions with the key within a minute: the last is `429`.
6. Revoke the key: next call `401`; the list shows when and by whom.
7. Sign in as a member without settings management: page and endpoints refuse with the role message.

## S2 — domains (real host; after T001)
1. Add `prueba.<a domain you control>`: one record is shown.
2. Create the record at the DNS provider. Keep the page open: the status reaches active without a click.
3. Open `https://<host>/d/<slug of your org>`: the form loads with a valid certificate; submit it and find the submission in the CRM. The browser shows no analytics request and no service worker for that host.
4. On the same host request `/`, `/login`, `/api/health`, `/api/crm/doors`, `/ingest/decide`, and `/d/<slug of another org>`: all `404`. Note what `/robots.txt` and `/service-worker.js` answer (static files; expected to be served).
5. Add the same host from a second organization: it stays waiting. Remove that second request: the first organization's host keeps serving.
6. Remove the domain: the form on that host answers `404` on the next request.
7. The hub's own address and the FACES forms behave as before (SC-006).
