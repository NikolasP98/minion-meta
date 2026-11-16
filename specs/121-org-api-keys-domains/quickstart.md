# Quickstart (validation)

Prerequisites: hub QA stack (`bun run dev:local`) for S1; for S2 a built server and a real test subdomain (the host guard and the hosting calls cannot be proven on localhost alone).

## S1 — keys
1. Sign in as an org admin, open Settings → Developers, create a key, copy it. Reload: the secret is gone, the prefix remains.
2. `curl` six submissions to a QA form door with the key and six different `x-minion-visitor-ip` values: all `200`.
3. Six more with one visitor address: the sixth is `429`.
4. Same call with a changed last character: `401`. With a key of the second QA organization: `401`.
5. Revoke the key: next call `401`. Without any key: behaviour as before (five per minute per address).
6. Sign in as a member without settings management: page and endpoints refuse with the role message.

## S2 — domains (after the owner's one-time setup, T001)
1. Add `prueba.<a domain you control>`: one record is shown.
2. Create the record at the DNS provider. Keep the page open: the status reaches active without a click.
3. Open `https://<host>/d/<slug of your org>`: the form loads with a valid certificate; submit it and find the submission in the CRM.
4. On the same host request `/`, `/login`, `/api/health`, `/api/crm/doors`, and `/d/<slug of another org>`: all `404`.
5. Add the same host from a second organization: it stays waiting.
6. Remove the domain: the host stops serving within a minute.
7. The hub's own address and the FACES forms behave as before (repeat the 2026-11-14 live test).
